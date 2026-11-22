#!/usr/bin/env node
/**
 * ops/loops/scripts/support-audit.mjs
 *
 * Deterministic script-first routine for T5500 Hermes (`support-audit`).
 * Runs a fixed list of HTTP checks for onlinerecycle.net and youandinotai.com:
 * - Each visible support page answers and contains its expected heading
 * - Each contact address or phone shown on those pages is listed
 * - The booking route and the date app health answer
 * - Every finding line is 'checked: result' or 'not checked: reason'
 * - eBay stays one 'not checked' line
 * - Moves reports older than 14 days to `<outDir>/older` (never deletes)
 * - Sends no Telegram message
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { archiveOlderReports, formatTimestampSlug } from "./bookings-watch.mjs";

const DEFAULT_ORC_BASE = "https://onlinerecycle.net";
const DEFAULT_DATE_BASE = "https://youandinotai.com";
const DEFAULT_DATE_API_BASE = "https://api.youandinotai.com";
const DEFAULT_OUT_DIR = "C:\\ANTIGRAVITY\\logs\\loop-reports\\hermes-t5500";
const DEFAULT_TIMEOUT_MS = 10_000;

const IGNORED_PLACEHOLDER_EMAILS = new Set([
  "you@example.com",
  "test@example.com",
]);
const IGNORED_PLACEHOLDER_PHONES = new Set(["(321) 555-0199"]);

export function parseArgs(argv) {
  let orcBase = DEFAULT_ORC_BASE;
  let dateBase = DEFAULT_DATE_BASE;
  let dateApiBase = DEFAULT_DATE_API_BASE;
  let outDir = DEFAULT_OUT_DIR;
  let timeoutMs = DEFAULT_TIMEOUT_MS;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--orc-base" && argv[i + 1]) {
      orcBase = argv[i + 1].replace(/\/+$/, "");
      i += 1;
    } else if (arg.startsWith("--orc-base=")) {
      orcBase = arg.slice("--orc-base=".length).replace(/\/+$/, "");
    } else if (arg === "--date-base" && argv[i + 1]) {
      dateBase = argv[i + 1].replace(/\/+$/, "");
      i += 1;
    } else if (arg.startsWith("--date-base=")) {
      dateBase = arg.slice("--date-base=".length).replace(/\/+$/, "");
    } else if (arg === "--date-api-base" && argv[i + 1]) {
      dateApiBase = argv[i + 1].replace(/\/+$/, "");
      i += 1;
    } else if (arg.startsWith("--date-api-base=")) {
      dateApiBase = arg.slice("--date-api-base=".length).replace(/\/+$/, "");
    } else if (arg === "--out-dir" && argv[i + 1]) {
      outDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith("--out-dir=")) {
      outDir = path.resolve(arg.slice("--out-dir=".length));
    } else if (arg === "--timeout-ms" && argv[i + 1]) {
      timeoutMs = Number(argv[i + 1]) || DEFAULT_TIMEOUT_MS;
      i += 1;
    } else if (arg.startsWith("--timeout-ms=")) {
      timeoutMs =
        Number(arg.slice("--timeout-ms=".length)) || DEFAULT_TIMEOUT_MS;
    }
  }

  return { orcBase, dateBase, dateApiBase, outDir, timeoutMs };
}

export function decodeCfEmail(hex) {
  if (!hex || hex.length < 4 || hex.length % 2 !== 0) {
    return "";
  }
  const key = parseInt(hex.slice(0, 2), 16);
  if (Number.isNaN(key)) {
    return "";
  }
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      return "";
    }
    out += String.fromCharCode(byte ^ key);
  }
  return out;
}

export function normalizeHtmlText(rawHtml) {
  let text = String(rawHtml ?? "");
  text = text.replace(/data-cfemail="([0-9a-fA-F]+)"/g, (_m, hex) => {
    const decoded = decodeCfEmail(hex);
    return decoded ? ` ${decoded} ` : "";
  });
  text = text
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&middot;|&#183;/gi, "·");
  return text;
}

export function extractContacts(rawText) {
  const normalized = normalizeHtmlText(rawText);

  const emailMatches =
    normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const emails = [...new Set(emailMatches)].filter(
    (e) => !IGNORED_PLACEHOLDER_EMAILS.has(e.toLowerCase()),
  );

  const phoneMatches = normalized.match(/\(\d{3}\)\s*\d{3}-\d{4}/g) || [];
  const phones = [
    ...new Set(phoneMatches.map((p) => p.replace(/\s+/g, " ").trim())),
  ].filter((p) => !IGNORED_PLACEHOLDER_PHONES.has(p));

  const locations = [];
  if (/Sorrento,\s*FL\s*32776/i.test(normalized)) {
    locations.push("Sorrento, FL 32776");
  } else if (/Sorrento,\s*(?:FL|Florida)/i.test(normalized)) {
    locations.push("Sorrento, FL");
  }

  const parts = [];
  if (phones.length > 0) {
    parts.push(`phone ${phones.join(", ")}`);
  }
  if (emails.length > 0) {
    parts.push(`email ${emails.join(", ")}`);
  }
  if (locations.length > 0) {
    parts.push(`address ${locations.join(", ")}`);
  }

  return parts.length > 0 ? parts.join("; ") : "none listed on page";
}

async function checkSupportPage({ url, expectedHeading, timeoutMs }) {
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.text();
    const normalized = normalizeHtmlText(body).replace(/\s+/g, " ");
    const contacts = extractContacts(body);

    if (res.status !== 200) {
      return {
        ok: false,
        line: `checked: ${url} failed with HTTP ${res.status} (expected 200 OK and heading "${expectedHeading}").`,
      };
    }

    if (!normalized.includes(expectedHeading)) {
      return {
        ok: false,
        line: `checked: ${url} answered HTTP 200 but missing expected heading "${expectedHeading}"; contacts shown: ${contacts}.`,
      };
    }

    return {
      ok: true,
      line: `checked: ${url} answered HTTP 200 with expected heading "${expectedHeading}"; contacts shown: ${contacts}.`,
    };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return {
      ok: false,
      line: `checked: ${url} failed (${msg}).`,
    };
  }
}

async function checkBookingConfigRoute({ url, timeoutMs }) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status !== 200) {
      return {
        ok: false,
        line: `checked: ${url} booking route failed with HTTP ${res.status}.`,
      };
    }
    const data = JSON.parse(await res.text());
    if (!data || data.ok !== true) {
      return {
        ok: false,
        line: `checked: ${url} booking route answered HTTP 200 but ok !== true.`,
      };
    }
    return {
      ok: true,
      line: `checked: ${url} booking route answered HTTP 200 (ok=true, timezone=${data.timezone || "unknown"}).`,
    };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return {
      ok: false,
      line: `checked: ${url} booking route failed (${msg}).`,
    };
  }
}

async function checkOrcHealth({ url, timeoutMs }) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status !== 200) {
      return {
        ok: false,
        line: `checked: ${url} OnlineRecycle health failed with HTTP ${res.status}.`,
      };
    }
    const data = JSON.parse(await res.text());
    const unnotified = Number(data?.unnotifiedBookings ?? -1);
    const notices = String(data?.bookingNotices ?? "unknown");
    if (data?.service !== "domains-server" || unnotified !== 0) {
      return {
        ok: false,
        line: `checked: ${url} answered HTTP 200 with service=${data?.service || "unknown"}, bookingNotices=${notices}, unnotifiedBookings=${unnotified} (needs judge).`,
      };
    }
    return {
      ok: true,
      line: `checked: ${url} answered HTTP 200 (service=domains-server, bookingNotices=${notices}, unnotifiedBookings=0).`,
    };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return {
      ok: false,
      line: `checked: ${url} OnlineRecycle health failed (${msg}).`,
    };
  }
}

async function checkDateAppHealth({ url, label, requireDb, timeoutMs }) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status !== 200) {
      return {
        ok: false,
        line: `checked: ${url} (${label}) failed with HTTP ${res.status}.`,
      };
    }
    const data = JSON.parse(await res.text());
    if (data?.status !== "ok" || (requireDb && data?.db_connected !== true)) {
      return {
        ok: false,
        line: `checked: ${url} (${label}) answered HTTP 200 with degraded state (status=${data?.status}, db_connected=${data?.db_connected}).`,
      };
    }
    const details = requireDb
      ? `status=ok, db_connected=${data.db_connected}, redis_connected=${data.redis_connected}, square_connected=${data.square_connected}`
      : `status=ok, service=${data.service || "dateapp-frontend"}`;
    return {
      ok: true,
      line: `checked: ${url} (${label}) answered HTTP 200 (${details}).`,
    };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return {
      ok: false,
      line: `checked: ${url} (${label}) failed (${msg}).`,
    };
  }
}

export async function runSupportAudit(options = {}) {
  const orcBase = (options.orcBase || DEFAULT_ORC_BASE).replace(/\/+$/, "");
  const dateBase = (options.dateBase || DEFAULT_DATE_BASE).replace(/\/+$/, "");
  const dateApiBase = (options.dateApiBase || DEFAULT_DATE_API_BASE).replace(
    /\/+$/,
    "",
  );
  const outDir = options.outDir || DEFAULT_OUT_DIR;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const now = options.now instanceof Date ? options.now : new Date();
  const nowMs = now.getTime();

  fs.mkdirSync(outDir, { recursive: true });
  archiveOlderReports(outDir, nowMs);

  const pageChecks = [
    {
      url: `${orcBase}/`,
      expectedHeading: "Florida Electronics Recycling & Free Pickup",
    },
    {
      url: `${orcBase}/service-areas.html`,
      expectedHeading:
        "Service Areas: Central Florida Electronics Recycling & Free Pickup",
    },
    {
      url: `${orcBase}/about.html`,
      expectedHeading: "About OnlineRecycle.net",
    },
    {
      url: `${orcBase}/terms.html`,
      expectedHeading: "Terms of Service",
    },
    {
      url: `${orcBase}/privacy.html`,
      expectedHeading: "Privacy Policy",
    },
    {
      url: `${orcBase}/disclaimer.html`,
      expectedHeading: "Disclaimer",
    },
    {
      url: `${dateBase}/`,
      expectedHeading:
        "YouAndINotAI | Verified Human Dating & Real-World Connection",
    },
    {
      url: `${dateBase}/support`,
      expectedHeading:
        "YouAndINotAI | Verified Human Dating & Real-World Connection",
    },
    {
      url: `${dateBase}/AGENTS.md`,
      expectedHeading: "# YouAndINotAI",
    },
  ];

  const results = [];
  for (const check of pageChecks) {
    results.push(
      await checkSupportPage({
        url: check.url,
        expectedHeading: check.expectedHeading,
        timeoutMs,
      }),
    );
  }

  results.push(
    await checkBookingConfigRoute({
      url: `${orcBase}/api/booking-config`,
      timeoutMs,
    }),
  );
  results.push(
    await checkOrcHealth({
      url: `${orcBase}/health`,
      timeoutMs,
    }),
  );
  results.push(
    await checkDateAppHealth({
      url: `${dateBase}/health`,
      label: "date app frontend health",
      requireDb: false,
      timeoutMs,
    }),
  );
  results.push(
    await checkDateAppHealth({
      url: `${dateApiBase}/health`,
      label: "date app backend health",
      requireDb: true,
      timeoutMs,
    }),
  );

  const failedCount = results.filter((r) => !r.ok).length;
  const needsJudge = failedCount > 0 ? "yes" : "no";

  const numberedLines = results.map((r, idx) => `${idx + 1}. ${r.line}`);
  numberedLines.push(
    `${numberedLines.length + 1}. not checked: mailbox and .env delivery destinations (routine is read-only and never opens mailboxes or .env files).`,
  );
  numberedLines.push(
    `${numberedLines.length + 1}. not checked: eBay store support pages and messages (placeholder — no official API or store access configured yet).`,
  );

  const outcome =
    failedCount === 0
      ? `Support audit passed all ${results.length} fixed checks across onlinerecycle.net and youandinotai.com (0 failures; eBay not checked).`
      : `Support audit found ${failedCount} failing check(s) out of ${results.length} across onlinerecycle.net and youandinotai.com.`;

  const evidence = `${orcBase}/, ${orcBase}/api/booking-config, ${orcBase}/health, ${dateBase}/support, ${dateBase}/health, ${dateApiBase}/health`;

  const reportLines = [
    `outcome: ${outcome}`,
    `needs the judge: ${needsJudge}`,
    `evidence: ${evidence}`,
    "",
    ...numberedLines,
    "",
  ];

  const reportText = reportLines.join("\n");
  const fileName = `${formatTimestampSlug(now)}-support-audit.md`;
  const reportPath = path.join(outDir, fileName);

  fs.writeFileSync(reportPath, reportText, { encoding: "utf8" });
  process.stdout.write(reportText);

  return { reportPath, needsJudge, outcome, reportText };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  runSupportAudit(args).catch((err) => {
    process.stderr.write(
      `support-audit fatal error: ${err && err.message ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  });
}
