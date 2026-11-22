import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKINGS_SCRIPT = path.join(__dirname, "bookings-watch.mjs");
const SUPPORT_SCRIPT = path.join(__dirname, "support-audit.mjs");

function makeTempOutDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const TEST_BIND_HOST = "127.0.0.1";

function startFakeServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, TEST_BIND_HOST, () => {
      const addr = server.address();
      resolve({
        server,
        baseUrl: `http://${TEST_BIND_HOST}:${addr.port}`,
        close: () => new Promise((res) => server.close(res)),
      });
    });
    server.on("error", reject);
  });
}

test("bookings-watch: healthy response (bookingNotices off < 24h, unnotifiedBookings 0) writes REPORT-SHAPE with needs the judge: no and archives >14d reports to older", async () => {
  const outDir = makeTempOutDir("bookings-healthy-");

  // Seed a 15-day-old report to verify 14-day move to 'older'
  const oldFileName = "2026-11-01T0805-onlinerecycle-bookings-watch.md";
  const oldFilePath = path.join(outDir, oldFileName);
  fs.writeFileSync(
    oldFilePath,
    "outcome: old report\nneeds the judge: no\nevidence: https://onlinerecycle.net/health\n\n1. bookingNotices: on\n",
    "utf8",
  );
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  fs.utimesSync(oldFilePath, fifteenDaysAgo, fifteenDaysAgo);

  const fake = await startFakeServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          service: "domains-server",
          bookingNotices: "off",
          bookingNoticesStatus: "booking notices: off",
          unnotifiedBookings: 0,
        }),
      );
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });

  try {
    execFileSync(
      process.execPath,
      [BOOKINGS_SCRIPT, "--url", `${fake.baseUrl}/health`, "--out-dir", outDir],
      { encoding: "utf8" },
    );

    const files = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith("-onlinerecycle-bookings-watch.md"));
    assert.equal(files.length, 1, "Expected one fresh bookings-watch report");

    const olderDir = path.join(outDir, "older");
    assert.ok(
      fs.existsSync(path.join(olderDir, oldFileName)),
      "Expected >14d report moved to older/",
    );

    const content = fs.readFileSync(path.join(outDir, files[0]), "utf8");
    const lines = content.split("\n");
    assert.match(lines[0], /^outcome: /);
    assert.equal(lines[1], "needs the judge: no");
    assert.match(lines[2], /^evidence: /);
    assert.equal(lines[3], "");
    assert.match(content, /bookingNotices: off/i);
    assert.match(content, /unnotifiedBookings: 0/);
  } finally {
    await fake.close();
  }
});

test("bookings-watch: failing page (HTTP 500) writes REPORT-SHAPE with needs the judge: yes", async () => {
  const outDir = makeTempOutDir("bookings-failing-");
  const fake = await startFakeServer((req, res) => {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Service Unavailable");
  });

  try {
    execFileSync(
      process.execPath,
      [BOOKINGS_SCRIPT, "--url", `${fake.baseUrl}/health`, "--out-dir", outDir],
      { encoding: "utf8" },
    );

    const files = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith("-onlinerecycle-bookings-watch.md"));
    assert.equal(files.length, 1);
    const content = fs.readFileSync(path.join(outDir, files[0]), "utf8");
    const lines = content.split("\n");
    assert.match(lines[0], /^outcome: .*503/);
    assert.equal(lines[1], "needs the judge: yes");
    assert.match(lines[2], /^evidence: /);
  } finally {
    await fake.close();
  }
});

test("bookings-watch: unnotifiedBookings above 0 writes REPORT-SHAPE with needs the judge: yes", async () => {
  const outDir = makeTempOutDir("bookings-unnotified-");
  const fake = await startFakeServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        service: "domains-server",
        bookingNotices: "on",
        unnotifiedBookings: 2,
        unnotifiedBookingIds: ["OR-20261122-AAAA", "OR-20261122-BBBB"],
      }),
    );
  });

  try {
    execFileSync(
      process.execPath,
      [BOOKINGS_SCRIPT, "--url", `${fake.baseUrl}/health`, "--out-dir", outDir],
      { encoding: "utf8" },
    );

    const files = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith("-onlinerecycle-bookings-watch.md"));
    assert.equal(files.length, 1);
    const content = fs.readFileSync(path.join(outDir, files[0]), "utf8");
    const lines = content.split("\n");
    assert.equal(lines[1], "needs the judge: yes");
    assert.match(content, /unnotifiedBookings: 2/);
    assert.match(content, /OR-20261122-AAAA/);
  } finally {
    await fake.close();
  }
});

test("bookings-watch: bookingNotices not 'on' for more than 24 hours writes needs the judge: yes", async () => {
  const outDir = makeTempOutDir("bookings-off-25h-");

  // Seed a report from 25 hours ago showing bookingNotices: off
  const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
  const priorFile = path.join(
    outDir,
    "2026-11-21T1505-onlinerecycle-bookings-watch.md",
  );
  fs.writeFileSync(
    priorFile,
    [
      "outcome: OnlineRecycle health answered HTTP 200 with unnotifiedBookings=0.",
      "needs the judge: no",
      "evidence: https://onlinerecycle.net/health",
      "",
      "1. bookingNotices: off (off pending founder's values; needs the judge stays no for that alone under 24h).",
      "2. unnotifiedBookings: 0.",
      "3. unnotified booking IDs: none.",
    ].join("\n"),
    "utf8",
  );
  fs.utimesSync(priorFile, twentyFiveHoursAgo, twentyFiveHoursAgo);

  const fake = await startFakeServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        service: "domains-server",
        bookingNotices: "off",
        unnotifiedBookings: 0,
      }),
    );
  });

  try {
    execFileSync(
      process.execPath,
      [BOOKINGS_SCRIPT, "--url", `${fake.baseUrl}/health`, "--out-dir", outDir],
      { encoding: "utf8" },
    );

    const files = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith("-onlinerecycle-bookings-watch.md"))
      .sort();
    const newestContent = fs.readFileSync(
      path.join(outDir, files[files.length - 1]),
      "utf8",
    );
    const lines = newestContent.split("\n");
    assert.equal(lines[1], "needs the judge: yes");
    assert.match(newestContent, /more than 24 hours/i);
  } finally {
    await fake.close();
  }
});

function createHealthySupportHandler(overrides = {}) {
  const pages = {
    "/orc/":
      "<html><head><title>OnlineRecycle.net</title></head><body><h1>Florida Electronics Recycling &amp; Free Pickup</h1><p>Call (321) 396-2008 or email collaboration@youandinotai.com · Sorrento, FL 32776</p></body></html>",
    "/orc/service-areas.html":
      "<html><head><title>Service Areas</title></head><body><h1>Service Areas: Central Florida Electronics Recycling &amp; Free Pickup</h1><p>Call (321) 396-2008 · Sorrento, FL</p></body></html>",
    "/orc/about.html":
      "<html><head><title>About</title></head><body><h1>About OnlineRecycle.net</h1><p>Call (321) 396-2008 · collaboration@youandinotai.com · Sorrento, Florida</p></body></html>",
    "/orc/terms.html":
      "<html><head><title>Terms</title></head><body><h1>Terms of Service</h1><p>Phone: (321) 396-2008 · Email: collaboration@youandinotai.com</p></body></html>",
    "/orc/privacy.html":
      "<html><head><title>Privacy</title></head><body><h1>Privacy Policy</h1><p>Phone: (321) 396-2008 · Email: collaboration@youandinotai.com</p></body></html>",
    "/orc/disclaimer.html":
      "<html><head><title>Disclaimer</title></head><body><h1>Disclaimer</h1><p>Phone: (321) 396-2008 · Email: collaboration@youandinotai.com</p></body></html>",
    "/orc/api/booking-config": JSON.stringify({
      ok: true,
      timezone: "America/New_York",
      bookedSlots: [],
    }),
    "/orc/health": JSON.stringify({
      service: "domains-server",
      bookingNotices: "off",
      unnotifiedBookings: 0,
    }),
    "/date/":
      '<html><head><title>YouAndINotAI | Verified Human Dating & Real-World Connection</title></head><body><script type="application/ld+json">{"email":"contact@youandinotai.com"}</script></body></html>',
    "/date/support":
      '<html><head><title>YouAndINotAI | Verified Human Dating & Real-World Connection</title></head><body><script type="application/ld+json">{"email":"contact@youandinotai.com"}</script></body></html>',
    "/date/AGENTS.md":
      "# YouAndINotAI\n## Contact\n- contact@youandinotai.com\n",
    "/date/health": JSON.stringify({
      status: "ok",
      service: "dateapp-frontend",
    }),
    "/date-api/health": JSON.stringify({
      status: "ok",
      db_connected: true,
      redis_connected: true,
      square_connected: true,
    }),
    ...overrides,
  };

  return (req, res) => {
    const val = pages[req.url];
    if (typeof val === "function") {
      val(req, res);
      return;
    }
    if (val === undefined) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(val);
  };
}

test("support-audit: healthy fake server writes REPORT-SHAPE with needs the judge: no, every body line checked/not checked, and one eBay not checked line", async () => {
  const outDir = makeTempOutDir("support-healthy-");
  const fake = await startFakeServer(createHealthySupportHandler());

  try {
    execFileSync(
      process.execPath,
      [
        SUPPORT_SCRIPT,
        "--orc-base",
        `${fake.baseUrl}/orc`,
        "--date-base",
        `${fake.baseUrl}/date`,
        "--date-api-base",
        `${fake.baseUrl}/date-api`,
        "--out-dir",
        outDir,
      ],
      { encoding: "utf8" },
    );

    const files = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith("-support-audit.md"));
    assert.equal(files.length, 1);

    const content = fs.readFileSync(path.join(outDir, files[0]), "utf8");
    const lines = content.trim().split("\n");
    assert.match(lines[0], /^outcome: /);
    assert.equal(lines[1], "needs the judge: no");
    assert.match(lines[2], /^evidence: /);
    assert.equal(lines[3], "");

    const bodyLines = lines.slice(4);
    assert.ok(bodyLines.length >= 10, "Expected numbered findings lines");
    let ebayLines = 0;
    for (const line of bodyLines) {
      assert.match(
        line,
        /^\d+\. (checked|not checked): /,
        `Every finding line must be 'checked: result' or 'not checked: reason', got: ${line}`,
      );
      if (/eBay/i.test(line)) {
        ebayLines += 1;
        assert.match(line, /^\d+\. not checked: eBay/i);
      }
    }
    assert.equal(ebayLines, 1, "eBay must stay one 'not checked' line");
    assert.match(content, /\(321\) 396-2008/);
    assert.match(content, /collaboration@youandinotai\.com/);
    assert.match(content, /contact@youandinotai\.com/);
  } finally {
    await fake.close();
  }
});

test("support-audit: missing expected heading on a support page sets needs the judge: yes", async () => {
  const outDir = makeTempOutDir("support-missing-heading-");
  const fake = await startFakeServer(
    createHealthySupportHandler({
      "/orc/about.html":
        "<html><head><title>About</title></head><body><h1>Wrong Heading Text</h1><p>Call (321) 396-2008</p></body></html>",
    }),
  );

  try {
    execFileSync(
      process.execPath,
      [
        SUPPORT_SCRIPT,
        "--orc-base",
        `${fake.baseUrl}/orc`,
        "--date-base",
        `${fake.baseUrl}/date`,
        "--date-api-base",
        `${fake.baseUrl}/date-api`,
        "--out-dir",
        outDir,
      ],
      { encoding: "utf8" },
    );

    const files = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith("-support-audit.md"));
    assert.equal(files.length, 1);
    const content = fs.readFileSync(path.join(outDir, files[0]), "utf8");
    const lines = content.trim().split("\n");
    assert.equal(lines[1], "needs the judge: yes");
    assert.match(content, /missing expected heading/i);
  } finally {
    await fake.close();
  }
});

test("support-audit: failing page (HTTP 500 on booking route or health) sets needs the judge: yes", async () => {
  const outDir = makeTempOutDir("support-failing-page-");
  const fake = await startFakeServer(
    createHealthySupportHandler({
      "/date-api/health": (_req, res) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error" }));
      },
    }),
  );

  try {
    execFileSync(
      process.execPath,
      [
        SUPPORT_SCRIPT,
        "--orc-base",
        `${fake.baseUrl}/orc`,
        "--date-base",
        `${fake.baseUrl}/date`,
        "--date-api-base",
        `${fake.baseUrl}/date-api`,
        "--out-dir",
        outDir,
      ],
      { encoding: "utf8" },
    );

    const files = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith("-support-audit.md"));
    assert.equal(files.length, 1);
    const content = fs.readFileSync(path.join(outDir, files[0]), "utf8");
    const lines = content.trim().split("\n");
    assert.equal(lines[1], "needs the judge: yes");
    assert.match(content, /HTTP 500/);
  } finally {
    await fake.close();
  }
});
