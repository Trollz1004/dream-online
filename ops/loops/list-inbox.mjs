#!/usr/bin/env node
/**
 * ops/loops/list-inbox.mjs
 *
 * Prints unread small-wheel loop reports from
 * %USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\{fcc,hermes-t5500,freebuff}
 * newest first with their first three lines.
 * With --mark-read, moves each listed report to the read folder (move, never delete).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_WORKERS = ["fcc", "hermes-t5500", "freebuff"];

export function maskUserPath(input) {
  let out = String(input ?? "");
  const localAppData = process.env.LOCALAPPDATA;
  const userProfile = process.env.USERPROFILE || os.homedir();
  if (localAppData) {
    out = out.split(localAppData).join("%LOCALAPPDATA%");
  }
  if (userProfile) {
    out = out.split(userProfile).join("%USERPROFILE%");
  }
  return out;
}

export function parseArgs(argv) {
  let markRead = false;
  let root = path.join(os.homedir(), "antigravity", ".fable-kitchen", "loops");

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--mark-read") {
      markRead = true;
    } else if (arg === "--root" && argv[i + 1]) {
      root = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith("--root=")) {
      root = path.resolve(arg.slice("--root=".length));
    }
  }

  return { root, markRead };
}

export function collectUnreadReports(loopsRoot) {
  const inboxDir = path.join(loopsRoot, "inbox");
  if (!fs.existsSync(inboxDir)) {
    return [];
  }

  const reports = [];

  for (const worker of ALLOWED_WORKERS) {
    const workerDir = path.join(inboxDir, worker);
    if (!fs.existsSync(workerDir) || !fs.statSync(workerDir).isDirectory()) {
      continue;
    }
    const entries = fs.readdirSync(workerDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
        continue;
      }
      const fullPath = path.join(workerDir, entry.name);
      const stat = fs.statSync(fullPath);
      const raw = fs.readFileSync(fullPath, "utf8");
      const firstThreeLines = raw
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0)
        .slice(0, 3);

      reports.push({
        worker,
        fileName: entry.name,
        fullPath,
        mtimeMs: stat.mtimeMs,
        firstThreeLines,
      });
    }
  }

  // Sort newest first by timestamped filename (YYYY-MM-DDTHHMM-<routine>.md), then mtime descending
  reports.sort((a, b) => {
    const byName = b.fileName.localeCompare(a.fileName);
    if (byName !== 0) {
      return byName;
    }
    if (b.mtimeMs !== a.mtimeMs) {
      return b.mtimeMs - a.mtimeMs;
    }
    return a.worker.localeCompare(b.worker);
  });

  return reports;
}

export function moveReportToRead(loopsRoot, report) {
  const readDir = path.join(loopsRoot, "read");
  fs.mkdirSync(readDir, { recursive: true });

  let destPath = path.join(readDir, report.fileName);
  if (fs.existsSync(destPath)) {
    destPath = path.join(readDir, `${report.worker}-${report.fileName}`);
  }

  fs.renameSync(report.fullPath, destPath);
  return destPath;
}

export function runListInbox(
  argv = process.argv.slice(2),
  outStream = process.stdout,
) {
  const { root, markRead } = parseArgs(argv);
  const reports = collectUnreadReports(root);

  if (reports.length === 0) {
    outStream.write("No unread reports.\n");
    return { count: 0, moved: 0 };
  }

  let moved = 0;
  for (let i = 0; i < reports.length; i += 1) {
    const report = reports[i];
    if (i > 0) {
      outStream.write("\n");
    }
    outStream.write(`=== [${report.worker}] ${report.fileName} ===\n`);
    for (const line of report.firstThreeLines) {
      outStream.write(`${maskUserPath(line)}\n`);
    }
    if (markRead) {
      const destPath = moveReportToRead(root, report);
      moved += 1;
      outStream.write(`moved to read: ${maskUserPath(destPath)}\n`);
    }
  }

  return { count: reports.length, moved };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  runListInbox();
}
