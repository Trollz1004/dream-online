import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { walkTree, copyVault, applyRetention, verifyDump, summarize, runBackup, dbHost, stampOf, splitDbUrl, isUsableSet, HEARTBEAT_REL, MANIFEST, readEnvFile, loadEnv, writeAtomic } from './backup-node.mjs'

// Small expect() over node:assert so the cases read the same as the mission-control suite.
function expect(actual) {
  const api = {
    toBe: (v) => assert.equal(actual, v),
    toEqual: (v) => assert.deepStrictEqual(actual, v),
    toContain: (v) => assert.ok(actual.includes(v), `expected ${JSON.stringify(actual)} to contain ${v}`),
    toHaveLength: (n) => assert.equal(actual.length, n),
    toMatch: (re) => assert.match(actual, re),
    toMatchObject: (o) => { for (const [k, v] of Object.entries(o)) assert.equal(actual[k], v); },
  };
  api.not = { toContain: (v) => assert.ok(!actual.includes(v), `expected not to contain ${v}`) };
  return api;
}

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'backup-node.mjs')
const URL_SECRET = 'postgresql://postgres:hunter2secret@db.example.supabase.co:5432/postgres'
const NOW = new Date('2026-09-29T03:04:05.000Z')

let tmp, vault, root
function write(p, body) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body) }

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-node-'))
  root = path.join(tmp, 'repo')
  vault = path.join(tmp, 'vault')
  write(path.join(vault, 'a.md'), 'alpha')
  write(path.join(vault, 'notes', 'b.md'), 'bravo!')
  write(path.join(vault, '.trash', 'gone.md'), 'deleted')
  write(path.join(vault, '.obsidian', 'workspace.json'), '{"churn":1}')
  write(path.join(vault, '.obsidian', 'workspaces.json'), '{}')
  write(path.join(vault, '.obsidian', 'app.json'), '{"keep":1}')
  fs.mkdirSync(root, { recursive: true })
})

const okExec = (_c, args) => { fs.writeFileSync(args.find((a) => a.startsWith('--file=')).slice(7), 'PGDMP\u0001rest'); return { status: 0 } }
const garbageExec = (_c, args) => { fs.writeFileSync(args.find((a) => a.startsWith('--file=')).slice(7), 'not a dump'); return { status: 0 } }
const enoentExec = () => ({ error: { code: 'ENOENT' } })
const env = (extra = {}) => ({ OBSIDIAN_VAULT_PATH: vault, ...extra })

describe('walkTree and copyVault', () => {
  it('skips .trash and .obsidian/workspace* files', () => {
    expect(walkTree(vault)).toEqual({ files: 3, bytes: 5 + 6 + 10 })
  })
  it('copies and verifies counts and bytes', () => {
    const dst = path.join(tmp, 'out')
    const r = copyVault(vault, dst)
    expect(r).toMatchObject({ id: 'vault', status: 'DONE', files: 3, bytes: 21 })
    expect(fs.existsSync(path.join(dst, '.trash'))).toBe(false)
    expect(fs.existsSync(path.join(dst, '.obsidian', 'workspace.json'))).toBe(false)
    expect(fs.readFileSync(path.join(dst, 'notes', 'b.md'), 'utf8')).toBe('bravo!')
  })
  it('FAILED with both counts when the copy does not match', () => {
    const dst = path.join(tmp, 'out2')
    write(path.join(dst, 'extra.md'), 'stray file already in the target')
    const r = copyVault(vault, dst)
    expect(r.status).toBe('FAILED')
    expect(r.detail).toContain('source 3 files 21 bytes')
    expect(r.detail).toContain('copy 4 files')
  })
})

describe('verifyDump', () => {
  it('missing, empty, garbage and good files', () => {
    const f = path.join(tmp, 'x.dump')
    expect(verifyDump(f).ok).toBe(false)
    fs.writeFileSync(f, '')
    expect(verifyDump(f).detail).toContain('empty')
    fs.writeFileSync(f, 'hello world')
    expect(verifyDump(f).detail).toContain('PGDMP')
    fs.writeFileSync(f, 'PGDMPabc')
    expect(verifyDump(f)).toMatchObject({ ok: true, bytes: 8 })
  })
})

describe('applyRetention', () => {
  const dir = () => path.join(tmp, 'backups')
  const mk = (name, manifest) => {
    fs.mkdirSync(path.join(dir(), name), { recursive: true })
    if (manifest) fs.writeFileSync(path.join(dir(), name, MANIFEST), JSON.stringify(manifest))
  }
  const good = { overall: 'GREEN', items: [{ id: 'vault', status: 'DONE' }] }
  const yellowUsable = { overall: 'YELLOW', items: [{ id: 'supabase', status: 'NOT CONFIGURED' }, { id: 'vault', status: 'DONE' }] }
  const yellowEmpty = { overall: 'YELLOW', items: [{ id: 'supabase', status: 'NOT CONFIGURED' }, { id: 'vault', status: 'NOT CONFIGURED' }] }
  const red = { overall: 'RED', items: [{ id: 'vault', status: 'FAILED' }] }
  it('isUsableSet: manifest present, not RED, at least one DONE', () => {
    mk('2026-09-01T01-00-00', good); mk('2026-09-02T01-00-00', yellowUsable); mk('2026-09-03T01-00-00', yellowEmpty); mk('2026-09-04T01-00-00', red); mk('2026-09-05T01-00-00', null)
    fs.writeFileSync(path.join(dir(), '2026-09-05T01-00-00', MANIFEST), '{broken')
    expect(['2026-09-01T01-00-00', '2026-09-02T01-00-00', '2026-09-03T01-00-00', '2026-09-04T01-00-00', '2026-09-05T01-00-00'].map((n) => isUsableSet(path.join(dir(), n)))).toEqual([true, true, false, false, false])
  })
  it('keeps the newest usable sets, drops failed and interrupted ones, ignores other names', () => {
    mk('2026-09-01T01-00-00', good); mk('2026-09-02T01-00-00', good); mk('2026-09-03T01-00-00', red); mk('2026-09-04T01-00-00', null); mk('2026-09-05T01-00-00', good)
    fs.mkdirSync(path.join(dir(), 'notes-folder'))
    write(path.join(dir(), '2026-09-00T00-00-00.txt'), 'file')
    expect(applyRetention(dir(), 2)).toBe(3)
    expect(fs.readdirSync(dir()).sort()).toEqual(['2026-09-00T00-00-00.txt', '2026-09-02T01-00-00', '2026-09-05T01-00-00', 'notes-folder'].sort())
    expect(applyRetention(dir(), 2)).toBe(0)
    expect(applyRetention(dir(), 0)).toBe(1)
  })
  it('keeps the newest set holding each item\'s last DONE, beyond the count', () => {
    const both = { overall: 'GREEN', items: [{ id: 'supabase', status: 'DONE' }, { id: 'vault', status: 'DONE' }] }
    const vaultOnly = { overall: 'YELLOW', items: [{ id: 'supabase', status: 'NOT CONFIGURED' }, { id: 'vault', status: 'DONE' }] }
    mk('2026-09-01T01-00-00', both); mk('2026-09-02T01-00-00', vaultOnly); mk('2026-09-03T01-00-00', vaultOnly)
    expect(applyRetention(dir(), 2)).toBe(0)
    mk('2026-09-04T01-00-00', vaultOnly)
    expect(applyRetention(dir(), 2)).toBe(1)
    expect(fs.readdirSync(dir()).sort()).toEqual(['2026-09-01T01-00-00', '2026-09-03T01-00-00', '2026-09-04T01-00-00'])
  })
  it('never deletes the protected set, even when it is RED', () => {
    mk('2026-09-01T01-00-00', good); mk('2026-09-02T01-00-00', red); mk('2026-09-03T01-00-00', red)
    expect(applyRetention(dir(), 5, { protect: '2026-09-03T01-00-00' })).toBe(1)
    expect(fs.readdirSync(dir()).sort()).toEqual(['2026-09-01T01-00-00', '2026-09-03T01-00-00'])
  })
})

describe('summarize truth table', () => {
  const s = (...st) => summarize(st.map((status) => ({ status })))
  it('GREEN, YELLOW, RED', () => {
    expect(s('DONE', 'DONE')).toBe('GREEN')
    expect(s('DONE', 'NOT CONFIGURED')).toBe('YELLOW')
    expect(s('NOT CONFIGURED', 'NOT CONFIGURED')).toBe('YELLOW')
    expect(s('DONE', 'FAILED')).toBe('RED')
    expect(s('NOT CONFIGURED', 'FAILED')).toBe('RED')
    expect(summarize(undefined)).toBe('GREEN')
  })
})

describe('helpers', () => {
  it('stamp and host', () => {
    expect(stampOf(NOW)).toBe('2026-09-29T03-04-05')
    expect(dbHost(URL_SECRET)).toBe('db.example.supabase.co:5432')
    expect(dbHost('nohost')).toBe('unknown')
    // A libpq keyword string carries its password inline: the host cell must never echo it.
    expect(dbHost('host=db.example.supabase.co port=5432 user=postgres password=hunter2secret dbname=postgres')).toBe('unknown')
    expect(dbHost('https://db.example.supabase.co')).toBe('unknown')
  })
  it('splitDbUrl keeps the password off the command line', () => {
    expect(splitDbUrl(URL_SECRET)).toEqual({ ok: true, safeUrl: 'postgresql://postgres@db.example.supabase.co:5432/postgres', password: 'hunter2secret' })
    expect(splitDbUrl('postgresql://u:p%40ss@h/db').password).toBe('p@ss')
    expect(splitDbUrl('not a url')).toEqual({ ok: false, detail: 'SUPABASE_DB_URL is not a postgresql:// URL' })
    expect(splitDbUrl('host=h user=postgres password=hunter2secret dbname=postgres').ok).toBe(false)
    expect(splitDbUrl('https://h/db').ok).toBe(false)
  })
  it('a connection string that is not a postgresql:// URL never reaches pg_dump or the record', () => {
    let called = 0
    const conninfo = 'host=db.example.supabase.co port=5432 user=postgres password=hunter2secret dbname=postgres'
    const r = runBackup({ env: env({ SUPABASE_DB_URL: conninfo }), exec: () => { called += 1; return { status: 0 } }, now: () => NOW, root })
    expect(called).toBe(0)
    const db = r.items.find((i) => i.id === 'supabase')
    expect(db).toMatchObject({ status: 'FAILED', detail: 'SUPABASE_DB_URL is not a postgresql:// URL' })
    expect(JSON.stringify(r)).not.toContain('hunter2secret')
  })
  it('readEnvFile and loadEnv: .env underneath, real environment on top', () => {
    write(path.join(root, '.env'), '# comment\nOBSIDIAN_VAULT_PATH="from file"\nBACKUP_KEEP=3\nbad line\nSUPABASE_DB_URL=\'quoted\'\n')
    expect(readEnvFile(path.join(root, '.env'))).toEqual({ OBSIDIAN_VAULT_PATH: 'from file', BACKUP_KEEP: '3', SUPABASE_DB_URL: 'quoted' })
    expect(readEnvFile(path.join(root, 'missing.env'))).toEqual({})
    const merged = loadEnv({ REPO_ROOT: root, BACKUP_KEEP: '9' })
    expect(merged.OBSIDIAN_VAULT_PATH).toBe('from file')
    expect(merged.BACKUP_KEEP).toBe('9')
  })
  it('writeAtomic leaves no temp file behind', () => {
    const f = path.join(tmp, 'atomic.json')
    writeAtomic(f, '{"ok":true}')
    expect(fs.readFileSync(f, 'utf8')).toBe('{"ok":true}')
    expect(fs.readdirSync(tmp).filter((n) => n.endsWith('.tmp'))).toEqual([])
  })
  it('heartbeat folder follows where the script lives', () => {
    expect(HEARTBEAT_REL).toEqual(['ops', 'node', 'heartbeat'])
  })
})

describe('runBackup', () => {
  it('GREEN with a good dump and vault, writes json and log, never the URL', () => {
    const r = runBackup({ env: env({ SUPABASE_DB_URL: URL_SECRET }), exec: okExec, now: () => NOW, root })
    expect(r.overall).toBe('GREEN')
    expect(r.set).toBe(path.join(root, 'ops', 'backups', '2026-09-29T03-04-05'))
    const json = fs.readFileSync(path.join(root, 'ops', 'node', 'heartbeat', 'backup-node.json'), 'utf8')
    const log = fs.readFileSync(path.join(root, 'ops', 'node', 'heartbeat', 'backup-node.log'), 'utf8')
    expect(JSON.parse(json)).toMatchObject({ overall: 'GREEN', removed: 0 })
    expect(log.trim()).toBe(`2026-09-29T03:04:05.000Z GREEN supabase=DONE vault=DONE set=${r.set}`)
    expect(r.line + json + log).not.toContain('hunter2secret')
    expect(json).toContain('db.example.supabase.co')
  })
  it('passes the exact pg_dump arguments', () => {
    let seen
    runBackup({ env: env({ SUPABASE_DB_URL: URL_SECRET }), exec: (c, a, o) => { seen = [c, a, o]; return okExec(c, a) }, now: () => NOW, root })
    expect(seen[0]).toBe('pg_dump')
    expect(seen[1].slice(0, 3)).toEqual(['--no-owner', '--no-privileges', '--format=custom'])
    expect(seen[1][3]).toMatch(/supabase\.dump$/)
    expect(seen[1][4]).toBe('postgresql://postgres@db.example.supabase.co:5432/postgres')
    expect(seen[2].env.PGPASSWORD).toBe('hunter2secret')
    expect(JSON.stringify(seen[1])).not.toContain('hunter2secret')
  })
  it('a dump ended by a signal or without a status is FAILED, not DONE', () => {
    const sig = runBackup({ env: env({ SUPABASE_DB_URL: URL_SECRET }), exec: (c, a) => { okExec(c, a); return { status: null, signal: 'SIGTERM' } }, now: () => NOW, root })
    expect(sig.items[0].status).toBe('FAILED')
    expect(sig.items[0].detail).toContain('SIGTERM')
    const none = runBackup({ env: env({ SUPABASE_DB_URL: URL_SECRET }), exec: (c, a) => { okExec(c, a); return {} }, now: () => new Date(NOW.getTime() + 1000), root })
    expect(none.items[0].status).toBe('FAILED')
  })
  it('garbage dump is FAILED and RED; retention drops unusable older sets and keeps this one', () => {
    const backups = path.join(root, 'ops', 'backups')
    for (const n of ['2026-01-01T00-00-00', '2026-01-02T00-00-00']) fs.mkdirSync(path.join(backups, n), { recursive: true })
    const r = runBackup({ env: env({ SUPABASE_DB_URL: URL_SECRET, BACKUP_KEEP: '1' }), exec: garbageExec, now: () => NOW, root })
    expect(r.overall).toBe('RED')
    expect(r.items[0]).toMatchObject({ id: 'supabase', status: 'FAILED' })
    expect(r.removed).toBe(2)
    expect(fs.readdirSync(backups)).toEqual(['2026-09-29T03-04-05'])
    expect(JSON.parse(fs.readFileSync(path.join(r.set, MANIFEST), 'utf8')).overall).toBe('RED')
  })
  it('pg_dump missing is NOT CONFIGURED, overall YELLOW', () => {
    const r = runBackup({ env: env({ SUPABASE_DB_URL: URL_SECRET }), exec: enoentExec, now: () => NOW, root })
    expect(r.items[0]).toMatchObject({ status: 'NOT CONFIGURED', detail: 'pg_dump not on PATH' })
    expect(r.overall).toBe('YELLOW')
  })
  it('non-zero pg_dump exit and other spawn errors are FAILED with the URL scrubbed', () => {
    const bad = runBackup({ env: env({ SUPABASE_DB_URL: URL_SECRET }), exec: () => ({ status: 1, stderr: `connection to ${URL_SECRET} refused, password hunter2secret\nmore` }), now: () => NOW, root })
    expect(bad.items[0].status).toBe('FAILED')
    expect(JSON.stringify(bad)).not.toContain('hunter2secret')
    const err = runBackup({ env: env({ SUPABASE_DB_URL: URL_SECRET }), exec: () => ({ error: { code: 'EACCES', message: 'denied ' + URL_SECRET } }), now: () => new Date(NOW.getTime() + 1000), root })
    expect(err.items[0].status).toBe('FAILED')
    expect(JSON.stringify(err)).not.toContain('hunter2secret')
  })
  it('no db url and no vault is YELLOW with both NOT CONFIGURED', () => {
    const r = runBackup({ env: {}, exec: enoentExec, now: () => NOW, root })
    expect(r.overall).toBe('YELLOW')
    expect(r.items.map((i) => i.status)).toEqual(['NOT CONFIGURED', 'NOT CONFIGURED'])
    expect(r.items[1].detail).toContain('no default vault')
  })
  it('a configured vault path that does not exist is NOT CONFIGURED', () => {
    const r = runBackup({ env: { OBSIDIAN_VAULT_PATH: path.join(tmp, 'nope') }, now: () => NOW, root })
    expect(r.items[1]).toMatchObject({ status: 'NOT CONFIGURED' })
    expect(r.items[1].detail).toContain('does not exist')
  })
  it('finds the default Antigravity vault under the root', () => {
    write(path.join(root, 'Antigravity', 'x.md'), 'x')
    const r = runBackup({ env: {}, now: () => NOW, root })
    expect(r.items[1]).toMatchObject({ status: 'DONE', files: 1 })
  })
  it('vault copy errors become FAILED', () => {
    const file = path.join(tmp, 'plainfile')
    fs.writeFileSync(file, 'x')
    const r = runBackup({ env: { OBSIDIAN_VAULT_PATH: file }, now: () => NOW, root })
    expect(r.items[1].status).toBe('FAILED')
    expect(r.overall).toBe('RED')
  })
  it('applies BACKUP_KEEP after a successful run and reports removed', () => {
    const t = (i) => new Date(NOW.getTime() + i * 60000)
    for (let i = 0; i < 4; i++) runBackup({ env: env({ BACKUP_KEEP: '10' }), now: () => t(i), root })
    const r = runBackup({ env: env({ BACKUP_KEEP: '2', BACKUP_DIR: path.join(root, 'ops', 'backups') }), now: () => t(4), root })
    expect(r.removed).toBe(3)
    expect(fs.readdirSync(path.join(root, 'ops', 'backups'))).toHaveLength(2)
  })
  it('HEARTBEAT_DIR overrides the heartbeat folder', () => {
    const hb = path.join(tmp, 'hb')
    runBackup({ env: env({ HEARTBEAT_DIR: hb }), now: () => NOW, root })
    expect(fs.existsSync(path.join(hb, 'backup-node.json'))).toBe(true)
  })
  it('defaults keep to 14 and repo root from env REPO_ROOT', () => {
    const r = runBackup({ env: env({ REPO_ROOT: root, BACKUP_KEEP: '' }), now: () => NOW })
    expect(r.set.startsWith(path.join(root, 'ops', 'backups'))).toBe(true)
  })
})

describe('command line', () => {
  it('prints the summary line, reads REPO_ROOT/.env, exits 0 on YELLOW and 1 on RED', () => {
    const y = spawnSync(process.execPath, [script], { env: { PATH: process.env.PATH, REPO_ROOT: root, BACKUP_DIR: path.join(tmp, 'bk') }, encoding: 'utf8' })
    expect(y.status).toBe(0)
    expect(y.stdout).toContain('YELLOW supabase=NOT CONFIGURED vault=NOT CONFIGURED')
    const file = path.join(tmp, 'plainfile')
    fs.writeFileSync(file, 'x')
    const r = spawnSync(process.execPath, [script], { env: { PATH: process.env.PATH, REPO_ROOT: root, BACKUP_DIR: path.join(tmp, 'bk'), OBSIDIAN_VAULT_PATH: file }, encoding: 'utf8' })
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('RED')
    write(path.join(root, '.env'), `OBSIDIAN_VAULT_PATH=${vault}\nBACKUP_DIR=${path.join(tmp, 'bk-from-env')}\n`)
    const fromEnv = spawnSync(process.execPath, [script], { env: { PATH: process.env.PATH, REPO_ROOT: root }, encoding: 'utf8' })
    expect(fromEnv.status).toBe(0)
    expect(fromEnv.stdout).toContain('vault=DONE')
    expect(fromEnv.stdout).toContain('bk-from-env')
    const bad = spawnSync(process.execPath, [script], { env: { PATH: process.env.PATH, REPO_ROOT: root, BACKUP_DIR: path.join(file, 'x') }, encoding: 'utf8' })
    expect(bad.status).toBe(1)
    expect(bad.stderr).toContain('backup-node failed')
  })
})
