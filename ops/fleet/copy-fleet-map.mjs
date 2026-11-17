#!/usr/bin/env node
/**
 * Copies ops/fleet/fleet-map.json byte-for-byte into target repositories (such as swarm-command)
 * or verifies that existing copies match the single source of truth.
 *
 * Defaults to [DRY RUN] unless --apply is passed.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FLEET_MAP_PATH } from './fleet-map.mjs';

export function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function formatPortablePath(filePath) {
  const home = (process.env.USERPROFILE || os.homedir() || '').replace(/[\\/]+$/, '');
  const norm = path.resolve(filePath);
  if (home && norm.toLowerCase().startsWith(home.toLowerCase())) {
    return `%USERPROFILE%${norm.slice(home.length)}`;
  }
  return norm;
}

export function copyFleetMap({
  sourcePath = FLEET_MAP_PATH,
  targets = [],
  apply = false,
} = {}) {
  const srcBuf = fs.readFileSync(sourcePath);
  const srcHash = sha256Buffer(srcBuf);
  const results = [];

  for (const rawTarget of targets) {
    const destPath = path.resolve(rawTarget);
    const portableDest = formatPortablePath(destPath);
    if (!apply) {
      results.push({
        target: portableDest,
        applied: false,
        sha256: srcHash,
        message: `[DRY RUN] Would copy fleet-map.json (${srcHash.slice(0, 12)}) -> ${portableDest}`,
      });
      continue;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, srcBuf);
    const verifyHash = sha256Buffer(fs.readFileSync(destPath));
    if (verifyHash !== srcHash) {
      throw new Error(`SHA-256 mismatch after copying fleet-map.json to ${portableDest}`);
    }
    results.push({
      target: portableDest,
      applied: true,
      sha256: verifyHash,
      message: `[APPLIED] Copied fleet-map.json (${verifyHash.slice(0, 12)}) -> ${portableDest}`,
    });
  }

  return {
    source: formatPortablePath(sourcePath),
    sha256: srcHash,
    apply,
    results,
  };
}

function main(argv) {
  const apply = argv.includes('--apply');
  const targets = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--target' && argv[i + 1]) {
      targets.push(argv[i + 1]);
      i += 1;
    }
  }
  if (targets.length === 0) {
    const defaultTarget = path.join(
      process.env.USERPROFILE || os.homedir(),
      'antigravity',
      'tools',
      'swarm-command',
      'ops',
      'fleet',
      'fleet-map.json'
    );
    targets.push(defaultTarget);
  }

  const outcome = copyFleetMap({ targets, apply });
  for (const r of outcome.results) {
    process.stdout.write(`${r.message}\n`);
  }
  return 0;
}

const isCli =
  Boolean(process.argv[1]) &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  process.exitCode = main(process.argv.slice(2));
}
