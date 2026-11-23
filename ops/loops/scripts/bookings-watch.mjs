#!/usr/bin/env node
/**
 * ops/loops/scripts/bookings-watch.mjs
 *
 * Deterministic script-first routine for T5500 Hermes (`onlinerecycle-bookings-watch`).
 * Fetches https://onlinerecycle.net/health with a 10-second timeout, moves reports
 * older than 14 days into `<outDir>/older` (never deletes), and writes a UTF-8 (no BOM)
 * REPORT-SHAPE markdown file to `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_URL = "https://onlinerecycle.net/health";
const DEFAULT_OUT_DIR = "C:\\ANTIGRAVITY\\logs\\loop-reports\\hermes-t5500";
const DEFAULT_TIMEOUT_MS = 10_000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function parseArgs(argv) {
  let url = DEFAULT_URL;
  let outDir = DEFAULT_OUT_DIR;
  let timeoutMs = DEFAULT_TIMEOUT_MS;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url" && argv[i + 1]) {
      url = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--url=")) {
      url = arg.slice("--url=".length);
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

  return { url, outDir, timeoutMs };
}

export function formatTimestampSlug(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}${min}`;
}

export function archiveOlderReports(outDir, nowMs = Date.now()) {
  if (!fs.existsSync(outDir)) {
    return 0;
  }
  const olderDir = path.join(outDir, "older");
  const entries = fs.readdirSync(outDir, { withFileTypes: true });
  let moved = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }
    const fullPath = path.join(outDir, entry.name);
    const stat = fs.statSync(fullPath);
    if (nowMs - stat.mtimeMs > FOURTEEN_DAYS_MS) {
      fs.mkdirSync(olderDir, { recursive: true });
      const destPath = path.join(olderDir, entry.name);
      fs.renameSync(fullPath, destPath);
      moved += 1;
    }
  }

  return moved;
}

export function findBookingNoticesOffDurationMs(outDir, nowMs = Date.now()) {
  const dirs = [outDir, path.join(outDir, "older")];
  const reports = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        !entry.isFile() ||
        !entry.name.toLowerCase().endsWith("-onlinerecycle-bookings-watch.md")
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      const stat = fs.statSync(fullPath);
      reports.push({ fullPath, name: entry.name, mtimeMs: stat.mtimeMs });
    }
  }

  reports.sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));

  let earliestOffMs = nowMs;
  for (const report of reports) {
    const raw = fs.readFileSync(report.fullPath, "utf8");
    if (/bookingNotices:\s*on\b/i.test(raw)) {
      break;
    }
    if (/bookingNotices:\s*(?!on\b)[a-z0-9_-]+/i.test(raw)) {
      if (report.mtimeMs < earliestOffMs) {
        earliestOffMs = report.mtimeMs;
      }
    }
  }

  return Math.max(0, nowMs - earliestOffMs);
}

export async function runBookingsWatch(options = {}) {
  const url = options.url || DEFAULT_URL;
  const outDir = options.outDir || DEFAULT_OUT_DIR;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const now = options.now instanceof Date ? options.now : new Date();
  const nowMs = now.getTime();

  fs.mkdirSync(outDir, { recursive: true });
  archiveOlderReports(outDir, nowMs);

  let outcome = "";
  let needsJudge = "no";
  const findings = [];

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.status !== 200) {
      needsJudge = "yes";
      outcome = `OnlineRecycle health failed with HTTP ${res.status}.`;
      findings.push(
        `1. health endpoint: HTTP ${res.status} (expected 200 OK).`,
      );
      findings.push(
        "2. bookingNotices: unknown (health response did not succeed).",
      );
      findings.push("3. unnotifiedBookings: unknown.");
    } else {
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (
        !data ||
        typeof data !== "object" ||
        typeof data.bookingNotices !== "string" ||
        typeof data.unnotifiedBookings !== "number"
      ) {
        needsJudge = "yes";
        outcome =
          "OnlineRecycle health returned invalid JSON or omitted bookingNotices/unnotifiedBookings.";
        findings.push(
          "1. health endpoint: HTTP 200 but missing required bookingNotices or unnotifiedBookings fields.",
        );
        findings.push("2. bookingNotices: missing or invalid.");
        findings.push("3. unnotifiedBookings: missing or invalid.");
      } else {
        const bookingNotices = data.bookingNotices.trim();
        const unnotifiedBookings = data.unnotifiedBookings;
        const rawIds = Array.isArray(data.unnotifiedBookingIds)
          ? data.unnotifiedBookingIds
          : Array.isArray(data.unnotifiedIds)
            ? data.unnotifiedIds
            : [];
        const safeIds = rawIds
          .map((id) => String(id || "").trim())
          .filter((id) => /^[A-Za-z0-9_-]{3,64}$/.test(id));

        let noticesOffOver24h = false;
        let noticesFinding = "";

        if (bookingNotices === "on") {
          noticesFinding = "1. bookingNotices: on.";
        } else {
          const offDurationMs = findBookingNoticesOffDurationMs(outDir, nowMs);
          const offHours = (offDurationMs / (60 * 60 * 1000)).toFixed(1);
          noticesOffOver24h = offDurationMs > TWENTY_FOUR_HOURS_MS;
          if (noticesOffOver24h) {
            noticesFinding = `1. bookingNotices: ${bookingNotices} (not 'on' for more than 24 hours (${offHours}h) pending the founder's values; needs the judge: yes).`;
          } else {
            noticesFinding = `1. bookingNotices: ${bookingNotices} (off pending the founder's values for ${offHours}h, not more than 24 hours; needs the judge stays no for that alone).`;
          }
        }

        if (unnotifiedBookings > 0 || safeIds.length > 0 || noticesOffOver24h) {
          needsJudge = "yes";
        } else {
          needsJudge = "no";
        }

        if (unnotifiedBookings > 0 || safeIds.length > 0) {
          outcome = `OnlineRecycle health answered HTTP 200 with ${unnotifiedBookings} unnotified booking(s) and bookingNotices=${bookingNotices}.`;
        } else if (noticesOffOver24h) {
          outcome = `OnlineRecycle health answered HTTP 200 with 0 unnotified bookings, but bookingNotices has been ${bookingNotices} for more than 24 hours.`;
        } else {
          outcome = `OnlineRecycle health answered HTTP 200 with 0 unnotified bookings (bookingNotices=${bookingNotices} pending the founder's values).`;
        }

        findings.push(noticesFinding);
        findings.push(`2. unnotifiedBookings: ${unnotifiedBookings}.`);
        findings.push(
          `3. unnotified booking IDs: ${safeIds.length > 0 ? safeIds.join(", ") : "none"}.`,
        );
      }
    }
  } catch (err) {
    needsJudge = "yes";
    const msg = err && err.message ? err.message : String(err);
    outcome = `OnlineRecycle health request failed (${msg}).`;
    findings.push(`1. health endpoint: request failed (${msg}).`);
    findings.push("2. bookingNotices: unknown (request failed).");
    findings.push("3. unnotifiedBookings: unknown.");
  }

  const reportLines = [
    `outcome: ${outcome}`,
    `needs the judge: ${needsJudge}`,
    `evidence: ${url}`,
    "",
    ...findings,
    "",
  ];
  const reportText = reportLines.join("\n");
  const fileName = `${formatTimestampSlug(now)}-onlinerecycle-bookings-watch.md`;
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
  runBookingsWatch(args).catch((err) => {
    process.stderr.write(
      `bookings-watch fatal error: ${err && err.message ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  });
}
