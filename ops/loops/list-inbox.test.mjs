import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, "list-inbox.mjs");

function makeTempLoopsRoot(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(root, "definitions"), { recursive: true });
  fs.mkdirSync(path.join(root, "inbox", "fcc"), { recursive: true });
  fs.mkdirSync(path.join(root, "inbox", "hermes-t5500"), { recursive: true });
  fs.mkdirSync(path.join(root, "inbox", "freebuff"), { recursive: true });
  fs.mkdirSync(path.join(root, "read"), { recursive: true });
  return root;
}

test("list-inbox prints unread reports newest first with their first three lines without moving them", () => {
  const root = makeTempLoopsRoot("fable-loops-list-");

  const olderReport = [
    "outcome: OnlineRecycle health answered 200 OK with 0 unnotified bookings.",
    "needs the judge: no",
    "evidence: https://onlinerecycle.net/health",
    "",
    "1. bookingNotices: all clear.",
    "2. unnotifiedBookings: 0.",
  ].join("\n");

  const middleReport = [
    "outcome: Support audit checked onlinerecycle.net and youandinotai.com; eBay store placeholder not checked.",
    "needs the judge: no",
    "evidence: https://onlinerecycle.net/health, https://youandinotai.com",
    "",
    "1. onlinerecycle.net contact and booking confirmation paths live.",
    "2. eBay store: not checked (placeholder).",
  ].join("\n");

  const newestReport = [
    "outcome: ANTIGRAVITY main scan found 1 unguarded route.",
    "needs the judge: yes",
    "evidence: backend/app/routers/admin.py:42",
    "",
    "1. High: backend/app/routers/admin.py:42 missing founder auth guard.",
  ].join("\n");

  fs.writeFileSync(
    path.join(
      root,
      "inbox",
      "fcc",
      "2026-11-22T0805-onlinerecycle-bookings-watch.md",
    ),
    olderReport,
    "utf8",
  );
  fs.writeFileSync(
    path.join(
      root,
      "inbox",
      "hermes-t5500",
      "2026-11-22T0820-support-audit.md",
    ),
    middleReport,
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, "inbox", "fcc", "2026-11-22T0915-security-audit-3day.md"),
    newestReport,
    "utf8",
  );

  const output = execFileSync(process.execPath, [SCRIPT_PATH, "--root", root], {
    encoding: "utf8",
  });

  const idxNewest = output.indexOf("2026-11-22T0915-security-audit-3day.md");
  const idxMiddle = output.indexOf("2026-11-22T0820-support-audit.md");
  const idxOlder = output.indexOf(
    "2026-11-22T0805-onlinerecycle-bookings-watch.md",
  );

  assert.ok(idxNewest !== -1, "Expected newest report in output");
  assert.ok(idxMiddle !== -1, "Expected middle report in output");
  assert.ok(idxOlder !== -1, "Expected older report in output");
  assert.ok(
    idxNewest < idxMiddle && idxMiddle < idxOlder,
    "Expected reports sorted newest first",
  );

  assert.match(
    output,
    /outcome: ANTIGRAVITY main scan found 1 unguarded route\./,
  );
  assert.match(output, /needs the judge: yes/);
  assert.match(output, /evidence: backend\/app\/routers\/admin\.py:42/);
  assert.doesNotMatch(output, /1\. High: backend\/app\/routers\/admin\.py:42/);

  // Files remain unread in inbox when --mark-read is not passed
  assert.equal(fs.readdirSync(path.join(root, "read")).length, 0);
  assert.equal(fs.readdirSync(path.join(root, "inbox", "fcc")).length, 2);
  assert.equal(
    fs.readdirSync(path.join(root, "inbox", "hermes-t5500")).length,
    1,
  );
});

test("list-inbox --mark-read prints unread reports and moves them to the read folder without deleting", () => {
  const root = makeTempLoopsRoot("fable-loops-mark-read-");

  const fccFile = "2026-11-22T1005-onlinerecycle-bookings-watch.md";
  const hermesFile = "2026-11-22T0950-storage-audit.md";

  fs.writeFileSync(
    path.join(root, "inbox", "fcc", fccFile),
    [
      "outcome: OnlineRecycle health reported 1 unnotified booking.",
      "needs the judge: yes",
      "evidence: https://onlinerecycle.net/health",
      "",
      "1. unnotifiedBookings: 1 (booking ID OR-2026-991).",
    ].join("\n"),
    "utf8",
  );

  fs.writeFileSync(
    path.join(root, "inbox", "hermes-t5500", hermesFile),
    [
      "outcome: T5500 fixed disk C: has 42% free space; proposed 2 archive steps.",
      "needs the judge: no",
      "evidence: 192.168.0.15 C:\\ANTIGRAVITY",
      "",
      "1. Skipped: .env files, OneDrive Personal Vault, DO-NOT-COMMIT, payments-private, hermes, grin-droid, GrinDroid, mira, trolly.",
    ].join("\n"),
    "utf8",
  );

  const output = execFileSync(
    process.execPath,
    [SCRIPT_PATH, "--root", root, "--mark-read"],
    {
      encoding: "utf8",
    },
  );

  assert.ok(
    output.indexOf(fccFile) < output.indexOf(hermesFile),
    "Expected newest report printed first during --mark-read",
  );
  assert.match(
    output,
    /outcome: OnlineRecycle health reported 1 unnotified booking\./,
  );
  assert.match(
    output,
    /outcome: T5500 fixed disk C: has 42% free space; proposed 2 archive steps\./,
  );

  // Moved out of inbox subfolders into read folder (never deleted)
  assert.equal(fs.readdirSync(path.join(root, "inbox", "fcc")).length, 0);
  assert.equal(
    fs.readdirSync(path.join(root, "inbox", "hermes-t5500")).length,
    0,
  );
  const readFiles = fs.readdirSync(path.join(root, "read")).sort();
  assert.deepEqual(readFiles, [hermesFile, fccFile].sort());

  // Second run sees no unread reports
  const secondOutput = execFileSync(
    process.execPath,
    [SCRIPT_PATH, "--root", root],
    {
      encoding: "utf8",
    },
  );
  assert.match(secondOutput, /No unread reports\./);
});
