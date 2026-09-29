#!/usr/bin/env node
/**
 * Node backup runner. One dated set per run under BACKUP_DIR: a pg_dump of the
 * database (when SUPABASE_DB_URL is set) and a verified copy of the Obsidian
 * vault. Writes backup-node.json plus one line in backup-node.log to the node's
 * heartbeat folder; JARVIS reads the JSON at /api/backup-health.
 *
 * The same file lives in two repositories and picks its heartbeat folder from
 * where it sits:
 *   ANTIGRAVITY  mission-control/scripts/backup-node.mjs  ->  ops/heartbeat/
 *   dream-online ops/node/backup-node.mjs                ->  ops/node/heartbeat/
 * HEARTBEAT_DIR overrides both. Run it nightly from the Hermes cron or Task
 * Scheduler with plain `node <path to this file>`.
 *
 * Honesty rules:
 *   - An item that is not set up says NOT CONFIGURED. It is never a fake DONE.
 *   - A database dump is DONE only when pg_dump exited 0 (a signal or a
 *     missing status is a failure) and the file is non-empty and starts with
 *     the custom-format magic "PGDMP".
 *   - A vault copy is DONE only when a re-walk of the copy matches the source
 *     file count and byte total.
 *   - The database password never reaches a command line: pg_dump gets the
 *     URL with the password removed and the password through PGPASSWORD in
 *     its own environment. Neither the URL nor the password is printed or
 *     logged; only the host after the @ is.
 *   - Every set carries a manifest.json. Retention keeps the newest
 *     BACKUP_KEEP usable sets (a manifest, not RED, at least one item DONE),
 *     deletes every other set except the one just written, so failed and
 *     interrupted sets never crowd out good ones and never pile up.
 *   - Retention also keeps, whatever the count, the newest set in which each
 *     item was DONE, so a source that goes NOT CONFIGURED for weeks never
 *     loses its last good copy to newer partial sets.
 *   - Exit code 1 on RED (any item FAILED). YELLOW and GREEN exit 0.
 *   - This is a local snapshot, not disaster recovery: by default the sets
 *     sit on the same disk as the vault. Point BACKUP_DIR at a second volume
 *     (external drive, another machine's share) so one disk loss does not take
 *     the vault and its copies together. An off-node copy stage is a separate
 *     ruling, not something this script pretends to do.
 *   - The heartbeat JSON and each set's manifest are written to a temp file
 *     and renamed into place, so a reader never sees a half-written file.
 *
 * Env: REPO_ROOT, BACKUP_DIR, BACKUP_KEEP (default 14), OBSIDIAN_VAULT_PATH,
 *      SUPABASE_DB_URL, HEARTBEAT_DIR. When run from the command line the
 *      repository's .env (REPO_ROOT/.env) is read first and real environment
 *      variables win over it, so the Hermes cron and Task Scheduler need no
 *      env of their own.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..', '..');
const UNDER_OPS_NODE = path.basename(HERE) === 'node' && path.basename(path.dirname(HERE)) === 'ops';
export const HEARTBEAT_REL = UNDER_OPS_NODE ? ['ops', 'node', 'heartbeat'] : ['ops', 'heartbeat'];
export const STAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/;
export const DUMP_MAGIC = 'PGDMP';
export const MANIFEST = 'manifest.json';
export const ITEM_IDS = ['supabase', 'vault'];

/** KEY=VALUE lines of a .env file, quotes stripped, comments and blanks skipped. Missing file: {}. */
export function readEnvFile(file) {
  const out = {};
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return out; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
  return out;
}

/** The env the command line runs with: REPO_ROOT/.env underneath, real environment variables on top. */
export function loadEnv(processEnv = process.env) {
  const repo = processEnv.REPO_ROOT || DEFAULT_ROOT;
  return { ...readEnvFile(path.join(repo, '.env')), ...processEnv };
}

/** Write text to a temp file beside the target and rename it into place. */
export function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

export function stampOf(date) {
  return date.toISOString().slice(0, 19).replace(/:/g, '-');
}

// Vault files that are skipped: anything in a .trash dir, and the churning
// .obsidian/workspace* files.
function skipEntry(relParts, isDir) {
  const name = relParts[relParts.length - 1];
  if (isDir) return name === '.trash';
  return relParts.includes('.obsidian') && name.startsWith('workspace');
}

/** Walk a tree with the vault skip rules applied. Returns { files, bytes }. */
export function walkTree(dir) {
  let files = 0;
  let bytes = 0;
  const visit = (abs, rel) => {
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const parts = [...rel, ent.name];
      if (ent.isDirectory()) {
        if (!skipEntry(parts, true)) visit(path.join(abs, ent.name), parts);
      } else if (ent.isFile() && !skipEntry(parts, false)) {
        files += 1;
        bytes += fs.statSync(path.join(abs, ent.name)).size;
      }
    }
  };
  visit(dir, []);
  return { files, bytes };
}

/** Copy the vault into dst, then re-walk the copy and compare to the source. */
export function copyVault(src, dst) {
  const before = walkTree(src);
  const copy = (abs, out, rel) => {
    fs.mkdirSync(out, { recursive: true });
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const parts = [...rel, ent.name];
      if (ent.isDirectory()) {
        if (!skipEntry(parts, true)) copy(path.join(abs, ent.name), path.join(out, ent.name), parts);
      } else if (ent.isFile() && !skipEntry(parts, false)) {
        fs.copyFileSync(path.join(abs, ent.name), path.join(out, ent.name));
      }
    }
  };
  copy(src, dst, []);
  const after = walkTree(dst);
  const same = before.files === after.files && before.bytes === after.bytes;
  return {
    id: 'vault',
    status: same ? 'DONE' : 'FAILED',
    detail: same
      ? `copied ${after.files} files, ${after.bytes} bytes`
      : `copy does not match source: source ${before.files} files ${before.bytes} bytes, copy ${after.files} files ${after.bytes} bytes`,
    files: after.files,
    bytes: after.bytes,
  };
}

/** A set is usable when its manifest says so: not RED and at least one item DONE. */
export function readManifest(setDir, fsMod = fs) {
  try {
    const m = JSON.parse(fsMod.readFileSync(path.join(setDir, MANIFEST), 'utf8'));
    return m && typeof m === 'object' ? m : null;
  } catch {
    return null;
  }
}

export function isUsableSet(setDir, fsMod = fs) {
  const m = readManifest(setDir, fsMod);
  if (!m || m.overall === 'RED') return false;
  return Array.isArray(m.items) && m.items.some((i) => i && i.status === 'DONE');
}

/**
 * Keep the newest `keep` usable sets, plus the newest set in which each item
 * was DONE (so a source that is NOT CONFIGURED for a while keeps its last good
 * copy). Delete every other stamped set (older usable ones beyond keep, and
 * every set without a usable manifest: failed, interrupted, or written by an
 * older version) except `protect`, the set the current run just wrote.
 * Returns how many were removed.
 */
export function applyRetention(dir, keep, { fsMod = fs, protect = null } = {}) {
  const limit = Math.max(1, Math.floor(Number(keep)) || 1);
  const sets = fsMod.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && STAMP_RE.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse(); // newest first
  const kept = new Set();
  for (const name of sets) {
    if (kept.size >= limit) break;
    if (isUsableSet(path.join(dir, name), fsMod)) kept.add(name);
  }
  // Whatever the count, the newest set holding each item's last DONE stays.
  for (const id of ITEM_IDS) {
    const last = sets.find((name) => {
      const m = readManifest(path.join(dir, name), fsMod);
      return !!m && Array.isArray(m.items) && m.items.some((i) => i && i.id === id && i.status === 'DONE');
    });
    if (last) kept.add(last);
  }
  let removed = 0;
  for (const name of sets) {
    if (kept.has(name) || name === protect) continue;
    fsMod.rmSync(path.join(dir, name), { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

/** A dump is good only when non-empty and it starts with "PGDMP". */
export function verifyDump(file) {
  if (!fs.existsSync(file)) return { ok: false, detail: 'dump file was not written', bytes: 0 };
  const bytes = fs.statSync(file).size;
  if (bytes === 0) return { ok: false, detail: 'dump file is empty', bytes };
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(5);
  try { fs.readSync(fd, buf, 0, 5, 0); } finally { fs.closeSync(fd); }
  if (buf.toString('latin1') !== DUMP_MAGIC) return { ok: false, detail: 'dump file does not start with PGDMP', bytes };
  return { ok: true, detail: 'custom-format dump verified', bytes };
}

/** GREEN: all configured items DONE. YELLOW: none failed, some NOT CONFIGURED. RED: any FAILED. */
export function summarize(items) {
  const list = Array.isArray(items) ? items : [];
  if (list.some((i) => i.status === 'FAILED')) return 'RED';
  if (list.some((i) => i.status === 'NOT CONFIGURED')) return 'YELLOW';
  return 'GREEN';
}

// Host part after the @, never the credentials.
export function dbHost(url) {
  const after = String(url).split('@').pop();
  return after.split(/[/?]/)[0] || 'unknown';
}

/**
 * Split the password out of a connection URL. pg_dump gets `safeUrl` on its
 * command line and `password` through PGPASSWORD, so the secret is never in a
 * process list. A URL that does not parse is passed through untouched with no
 * password (pg_dump then fails on it, which is reported).
 */
export function splitDbUrl(url) {
  try {
    const u = new URL(String(url));
    const password = decodeURIComponent(u.password || '');
    u.password = '';
    return { safeUrl: u.toString(), password };
  } catch {
    return { safeUrl: String(url), password: '' };
  }
}

function scrub(text, ...secrets) {
  let out = String(text || '');
  for (const s of secrets) if (s) out = out.split(s).join('<redacted>');
  return out.split('\n')[0].slice(0, 300);
}

function backupDatabase(url, setDir, exec, baseEnv) {
  const file = path.join(setDir, 'supabase.dump');
  const { safeUrl, password } = splitDbUrl(url);
  const childEnv = { ...baseEnv };
  if (password) childEnv.PGPASSWORD = password;
  const res = exec('pg_dump', ['--no-owner', '--no-privileges', '--format=custom', `--file=${file}`, safeUrl], { encoding: 'utf8', env: childEnv }) || {};
  const host = dbHost(url);
  if (res.error) {
    if (res.error.code === 'ENOENT') return { id: 'supabase', status: 'NOT CONFIGURED', detail: 'pg_dump not on PATH' };
    return { id: 'supabase', status: 'FAILED', detail: scrub(res.error.message || res.error.code, url, password) };
  }
  if (res.status !== 0) {
    const how = typeof res.status === 'number' ? `exited ${res.status}` : `ended by signal ${res.signal || 'unknown'}`;
    return { id: 'supabase', status: 'FAILED', detail: `pg_dump ${how} for host ${host}: ${scrub(res.stderr, url, password)}` };
  }
  const v = verifyDump(file);
  return { id: 'supabase', status: v.ok ? 'DONE' : 'FAILED', detail: `${v.detail} (host ${host})`, bytes: v.bytes };
}

function vaultPath(env, root) {
  if (env.OBSIDIAN_VAULT_PATH) return env.OBSIDIAN_VAULT_PATH;
  return ['Antigravity', 'DREAM-ONLINE'].map((n) => path.join(root, n)).find((p) => fs.existsSync(p)) || null;
}

export function heartbeatDir(env, repo) {
  return env.HEARTBEAT_DIR || path.join(repo, ...HEARTBEAT_REL);
}

export function runBackup({ env = process.env, exec = spawnSync, now = () => new Date(), root } = {}) {
  const repo = root || env.REPO_ROOT || DEFAULT_ROOT;
  const backupDir = env.BACKUP_DIR || path.join(repo, 'ops', 'backups');
  const keep = env.BACKUP_KEEP === undefined || env.BACKUP_KEEP === '' ? 14 : Number(env.BACKUP_KEEP);
  const date = now();
  const at = date.toISOString();
  const setName = stampOf(date);
  const setDir = path.join(backupDir, setName);
  fs.mkdirSync(setDir, { recursive: true });

  const items = [];
  if (env.SUPABASE_DB_URL) {
    items.push(backupDatabase(env.SUPABASE_DB_URL, setDir, exec, env));
  } else {
    items.push({ id: 'supabase', status: 'NOT CONFIGURED', detail: 'SUPABASE_DB_URL is not set' });
  }

  const vault = vaultPath(env, repo);
  if (vault && fs.existsSync(vault)) {
    try { items.push(copyVault(vault, path.join(setDir, 'vault'))); }
    catch (e) { items.push({ id: 'vault', status: 'FAILED', detail: String((e && e.message) || e).split('\n')[0] }); }
  } else {
    items.push({ id: 'vault', status: 'NOT CONFIGURED', detail: vault ? `vault path does not exist: ${vault}` : 'no vault path set and no default vault found' });
  }

  const overall = summarize(items);
  writeAtomic(path.join(setDir, MANIFEST), JSON.stringify({ at, overall, items }, null, 2) + '\n');
  const removed = applyRetention(backupDir, keep, { protect: setName });

  const result = { at, overall, set: setDir, items, removed };
  const st = (id) => items.find((i) => i.id === id).status;
  const line = `${at} ${overall} supabase=${st('supabase')} vault=${st('vault')} set=${setDir}`;
  const hb = heartbeatDir(env, repo);
  fs.mkdirSync(hb, { recursive: true });
  writeAtomic(path.join(hb, 'backup-node.json'), JSON.stringify(result, null, 2) + '\n');
  fs.appendFileSync(path.join(hb, 'backup-node.log'), line + '\n');
  return { ...result, line };
}

function main() {
  const r = runBackup({ env: loadEnv() });
  console.log(r.line);
  if (r.overall === 'RED') process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error('backup-node failed:', (e && e.message) || e); process.exit(1); }
}
