#!/usr/bin/env node
/**
 * Node backup runner. One dated set per run under BACKUP_DIR: a pg_dump of the
 * database (when SUPABASE_DB_URL is set) and a verified copy of the Obsidian
 * vault. Writes ops/heartbeat/backup-node.json plus one line in
 * ops/heartbeat/backup-node.log. JARVIS reads the JSON at /api/backup-health.
 * Run it nightly from cron or Task Scheduler:
 *
 *   node C:\ANTIGRAVITY\mission-control\scripts\backup-node.mjs
 *
 * Honesty rules:
 *   - An item that is not set up says NOT CONFIGURED. It is never a fake DONE.
 *   - A database dump is DONE only when the file is non-empty and starts with
 *     the custom-format magic "PGDMP".
 *   - A vault copy is DONE only when a re-walk of the copy matches the source
 *     file count and byte total.
 *   - The database URL carries a password. It is never printed or logged;
 *     only the host after the @ is.
 *   - Exit code 1 on RED (any item FAILED). YELLOW and GREEN exit 0.
 *
 * Env: REPO_ROOT, BACKUP_DIR, BACKUP_KEEP (default 14), OBSIDIAN_VAULT_PATH,
 *      SUPABASE_DB_URL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..', '..');
export const STAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/;
export const DUMP_MAGIC = 'PGDMP';

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

/** Delete the oldest dated sets beyond keep. Returns how many were removed. */
export function applyRetention(dir, keep, fsMod = fs) {
  const limit = Math.max(1, Math.floor(Number(keep)) || 1);
  const sets = fsMod.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && STAMP_RE.test(e.name))
    .map((e) => e.name)
    .sort();
  const doomed = sets.slice(0, Math.max(0, sets.length - limit));
  for (const name of doomed) fsMod.rmSync(path.join(dir, name), { recursive: true, force: true });
  return doomed.length;
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

function scrub(text, url) {
  return String(text || '').split(url).join('<db url>').split('\n')[0].slice(0, 300);
}

function backupDatabase(url, setDir, exec) {
  const file = path.join(setDir, 'supabase.dump');
  const res = exec('pg_dump', ['--no-owner', '--no-privileges', '--format=custom', `--file=${file}`, url], { encoding: 'utf8' }) || {};
  if (res.error) {
    if (res.error.code === 'ENOENT') return { id: 'supabase', status: 'NOT CONFIGURED', detail: 'pg_dump not on PATH' };
    return { id: 'supabase', status: 'FAILED', detail: scrub(res.error.message || res.error.code, url) };
  }
  if (typeof res.status === 'number' && res.status !== 0) {
    return { id: 'supabase', status: 'FAILED', detail: `pg_dump exited ${res.status} for host ${dbHost(url)}: ${scrub(res.stderr, url)}` };
  }
  const v = verifyDump(file);
  return { id: 'supabase', status: v.ok ? 'DONE' : 'FAILED', detail: `${v.detail} (host ${dbHost(url)})`, bytes: v.bytes };
}

function vaultPath(env, root) {
  if (env.OBSIDIAN_VAULT_PATH) return env.OBSIDIAN_VAULT_PATH;
  return ['Antigravity', 'DREAM-ONLINE'].map((n) => path.join(root, n)).find((p) => fs.existsSync(p)) || null;
}

export function runBackup({ env = process.env, exec = spawnSync, now = () => new Date(), root } = {}) {
  const repo = root || env.REPO_ROOT || DEFAULT_ROOT;
  const backupDir = env.BACKUP_DIR || path.join(repo, 'ops', 'backups');
  const keep = env.BACKUP_KEEP === undefined || env.BACKUP_KEEP === '' ? 14 : Number(env.BACKUP_KEEP);
  const date = now();
  const at = date.toISOString();
  const setDir = path.join(backupDir, stampOf(date));
  fs.mkdirSync(setDir, { recursive: true });

  const items = [];
  if (env.SUPABASE_DB_URL) {
    items.push(backupDatabase(env.SUPABASE_DB_URL, setDir, exec));
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
  let removed = 0;
  if (overall !== 'RED') removed = applyRetention(backupDir, keep);

  const result = { at, overall, set: setDir, items, removed };
  const st = (id) => items.find((i) => i.id === id).status;
  const line = `${at} ${overall} supabase=${st('supabase')} vault=${st('vault')} set=${setDir}`;
  const hb = path.join(repo, 'ops', 'heartbeat');
  fs.mkdirSync(hb, { recursive: true });
  fs.writeFileSync(path.join(hb, 'backup-node.json'), JSON.stringify(result, null, 2) + '\n');
  fs.appendFileSync(path.join(hb, 'backup-node.log'), line + '\n');
  return { ...result, line };
}

function main() {
  const r = runBackup();
  console.log(r.line);
  if (r.overall === 'RED') process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error('backup-node failed:', (e && e.message) || e); process.exit(1); }
}
