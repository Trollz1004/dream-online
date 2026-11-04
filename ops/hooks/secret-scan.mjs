#!/usr/bin/env node
// Pre-push secret-shape scan. Dependency-free on purpose: a hook that needs `npm install`
// first is a hook that gets skipped.
//
// It fails on the SHAPE of a credential, never on a known value, and it never prints the
// matched text (only rule name, file, line and commit), so a blocked push does not leak the
// key a second time into a terminal log or CI output.
//
// Modes:
//   --pre-push <remote> <url>   git pre-push mode; reads "<lref> <lsha> <rref> <rsha>" on stdin
//   --stdin                     scan text from stdin
//   --files <path...>           scan whole files
//
// A line carrying the marker `secret-scan:allow` is skipped (for redactor/test fixtures that
// are deliberately fake). Prefer building fake keys at runtime so the marker is not needed.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ALLOW_MARKER = 'secret-scan:allow';

/** @type {ReadonlyArray<{ id: string, label: string, re: RegExp }>} */
export const RULES = Object.freeze([
  { id: 'anthropic-key', label: 'Anthropic API key shape', re: /(?<![A-Za-z0-9])sk-ant-[A-Za-z0-9_-]{8,}/ },
  { id: 'github-token', label: 'GitHub token shape (gho_/ghp_/ghs_/ghu_/ghr_)', re: /(?<![A-Za-z0-9])gh[opsur]_[A-Za-z0-9]{20,}/ },
  { id: 'github-fine-grained-pat', label: 'GitHub fine-grained PAT shape', re: /(?<![A-Za-z0-9])github_pat_[A-Za-z0-9_]{20,}/ },
  { id: 'google-api-key', label: 'Google API key shape (AIza)', re: /(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{20,}/ },
  { id: 'square-access-token', label: 'Square access token shape', re: /(?<![A-Za-z0-9_-])EAAA[A-Za-z0-9_-]{40,}/ },
  { id: 'square-oauth-secret', label: 'Square OAuth/application secret shape', re: /(?<![A-Za-z0-9])(?:sandbox-)?sq0(?:atp|atb|csp)-[A-Za-z0-9_-]{20,}/ },
  { id: 'paypal-access-token', label: 'PayPal access token shape', re: /(?<![A-Za-z0-9_-])A21AA[A-Za-z0-9_-]{40,}/ },
  { id: 'paypal-braintree-token', label: 'PayPal/Braintree access token shape', re: /access_token\$(?:production|sandbox)\$[a-z0-9]{16}\$[a-f0-9]{32}/ },
  { id: 'paypal-secret-assignment', label: 'PayPal secret/token assigned a long value', re: /PAYPAL[A-Z0-9_]*(?:SECRET|TOKEN)\s*[=:]\s*["']?[A-Za-z0-9_-]{40,}/i },
  { id: 'generic-sk-key', label: 'Generic sk- API key shape', re: /(?<![A-Za-z0-9])sk-(?!ant-)[A-Za-z0-9_-]{20,}/ },
  { id: 'windows-user-path', label: 'Windows user folder path', re: /(?<![A-Za-z0-9])[cC]:[\\/]+[uU]sers[\\/]+[a-zA-Z0-9_.-]+/ },
  { id: 'private-ipv4', label: 'Private IPv4 address shape', re: /\b(?:192\.168|10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/ },
]);

/**
 * Scan text. Returns findings with rule id and 1-based line only. The matched value is
 * deliberately never returned.
 * @param {string} text
 * @returns {Array<{ rule: string, label: string, line: number }>}
 */
export function scanText(text) {
  const findings = [];
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes(ALLOW_MARKER)) continue;
    for (const rule of RULES) {
      if (rule.re.test(line)) findings.push({ rule: rule.id, label: rule.label, line: i + 1 });
    }
  }
  return findings;
}

const ZERO_SHA = /^0+$/;

function git(args) {
  return execFileSync('git', ['-c', 'core.quotepath=off', ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * Added lines (with file and commit) for a revision range, as `git log -p` shows them.
 * @param {string[]} revArgs
 * @returns {Array<{ commit: string, file: string, line: number, text: string }>}
 */
export function addedLines(revArgs) {
  const out = git(['log', '--no-color', '--no-ext-diff', '--no-textconv', '-U0', '--format=%x01%H', ...revArgs]);
  const added = [];
  let commit = '';
  let file = '';
  let inHeader = false;
  let newLine = 0;
  for (const raw of out.split('\n')) {
    if (raw.startsWith('\u0001')) {
      commit = raw.slice(1, 8);
      inHeader = false;
      continue;
    }
    if (raw.startsWith('diff --git ')) {
      inHeader = true;
      file = '';
      continue;
    }
    if (inHeader) {
      if (raw.startsWith('+++ ')) file = raw.slice(4).replace(/^b\//, '');
      else if (raw.startsWith('@@ ')) {
        inHeader = false;
        const m = /\+(\d+)/.exec(raw);
        newLine = m ? Number(m[1]) : 0;
      }
      continue;
    }
    if (raw.startsWith('@@ ')) {
      const m = /\+(\d+)/.exec(raw);
      newLine = m ? Number(m[1]) : 0;
      continue;
    }
    if (raw.startsWith('+')) {
      added.push({ commit, file, line: newLine, text: raw.slice(1) });
      newLine += 1;
    }
  }
  return added;
}

/**
 * Scan every line a push would add. `stdinText` is git's pre-push ref list.
 * @param {string} stdinText
 * @returns {Array<{ commit: string, file: string, line: number, rule: string, label: string }>}
 */
export function scanPush(stdinText) {
  const hits = [];
  const seen = new Set();
  for (const ref of stdinText.split(/\r?\n/).filter(Boolean)) {
    const [, localSha, , remoteSha] = ref.trim().split(/\s+/);
    if (!localSha || ZERO_SHA.test(localSha)) continue; // deleting a ref pushes no content
    let range;
    if (remoteSha && !ZERO_SHA.test(remoteSha)) {
      try {
        git(['cat-file', '-e', `${remoteSha}^{commit}`]);
        range = [localSha, '--not', remoteSha, '--remotes'];
      } catch {
        range = null; // remote tip not known locally (non-fast-forward): fall through
      }
    }
    if (!range) range = [localSha, '--not', '--remotes'];
    for (const a of addedLines(range)) {
      for (const f of scanText(a.text)) {
        const key = `${a.commit}|${a.file}|${a.line}|${f.rule}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ commit: a.commit, file: a.file, line: a.line, rule: f.rule, label: f.label });
      }
    }
  }
  return hits;
}

function report(hits) {
  process.stderr.write('\nsecret-scan: BLOCKED. Credential-shaped text found (values are not printed):\n');
  for (const h of hits) {
    const where = h.file ? `${h.file}:${h.line}` : `line ${h.line}`;
    process.stderr.write(`  [${h.rule}] ${where}${h.commit ? ` (commit ${h.commit})` : ''} - ${h.label}\n`);
  }
  process.stderr.write(
    '\nRemove the value, rotate it if it was real, and amend the commit before pushing.\n' +
      `A deliberately fake fixture can carry the marker "${ALLOW_MARKER}" on its line, but building the fake at runtime is preferred.\n`,
  );
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main(argv) {
  const mode = argv[0];
  if (mode === '--pre-push') {
    const hits = scanPush(readStdin());
    if (hits.length) {
      report(hits);
      return 1;
    }
    process.stderr.write('secret-scan: clean (no credential-shaped text in the commits being pushed).\n');
    return 0;
  }
  if (mode === '--stdin') {
    const hits = scanText(readStdin()).map((f) => ({ ...f, file: '', commit: '' }));
    if (hits.length) {
      report(hits);
      return 1;
    }
    process.stderr.write('secret-scan: clean.\n');
    return 0;
  }
  if (mode === '--files') {
    const hits = [];
    for (const file of argv.slice(1)) {
      for (const f of scanText(readFileSync(file, 'utf8'))) hits.push({ ...f, file, commit: '' });
    }
    if (hits.length) {
      report(hits);
      return 1;
    }
    process.stderr.write('secret-scan: clean.\n');
    return 0;
  }
  process.stderr.write('usage: secret-scan.mjs --pre-push <remote> <url> | --stdin | --files <path...>\n');
  return 2;
}

const isCli = Boolean(process.argv[1]) && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    // Fail closed: an unreadable range must not silently let a push through.
    process.stderr.write(`secret-scan: could not complete the scan (${err && err.message ? err.message.split('\n')[0] : 'unknown error'}). Push blocked.\n`);
    process.exitCode = 2;
  }
}
