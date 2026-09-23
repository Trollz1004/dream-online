// DREAM brain core: the session memory file, recall, remember and the boot card.
// Shared by the MCP server (brain-mcp.mjs) and the session hooks (brain-hook.mjs).
// Zero dependencies. Every path can be overridden by an environment variable so
// the tests run in a sandbox and never touch the real vault.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const home = os.homedir();

export function paths() {
  const vault = process.env.DREAM_BRAIN_VAULT || 'C:\\DREAM\\dream-online\\DREAM-ONLINE';
  const graph = path.join(vault, 'memory-graph');
  return {
    vault,
    graph,
    hub: path.join(graph, 'Memory hub.md'),
    memoryFile: path.join(graph, 'Session memory.md'),
    autoMemory: process.env.DREAM_BRAIN_AUTOMEMORY || path.join(home, '.claude', 'projects', 'C--DREAM-dream-online', 'memory'),
    state: process.env.DREAM_BRAIN_STATE || path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'dream-brain'),
    repo: process.env.DREAM_BRAIN_REPO || 'C:\\DREAM\\dream-online',
    health: process.env.DREAM_BRAIN_HEALTH || 'C:\\DREAM\\dream-online\\ops\\node\\heartbeat\\alienware-health.json',
    bootCard: path.join(here, 'boot-card.md'),
  };
}

const ENTRY = '\n## ';
const MEMORY_HEADER = `---
title: Session memory
type: log
tags: [memory, sessions]
status: growing
summary: One entry per Claude session on the Alienware node, newest last. Read at session start, written at session end.
---
# Session memory

Part of [[Memory hub]]. Written by the DREAM brain (\`ops/node/brain\`): the session-end hook records the mechanical facts, and \`brain_session_end\` records what was decided.
`;

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function appendSession({ title, lines = [] }) {
  const { graph, memoryFile } = paths();
  fs.mkdirSync(graph, { recursive: true });
  if (!fs.existsSync(memoryFile)) fs.writeFileSync(memoryFile, MEMORY_HEADER);
  const body = lines.filter(Boolean).map((l) => `- ${String(l).replace(/\r?\n/g, ' ')}`).join('\n');
  fs.appendFileSync(memoryFile, `${ENTRY}${stamp()}, ${title}\n\n${body}\n`);
  return memoryFile;
}

export function recentSessions(n = 2) {
  const { memoryFile } = paths();
  if (!fs.existsSync(memoryFile)) return [];
  const parts = fs.readFileSync(memoryFile, 'utf8').split(ENTRY).slice(1);
  return parts.slice(-n).reverse().map((p) => `## ${p.trim()}`);
}

function listMarkdown(dir, depth = 2) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory() && depth > 0) out.push(...listMarkdown(full, depth - 1));
    else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

export function recall(query, limit = 20) {
  const terms = String(query || '').toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return [];
  const { graph, vault, autoMemory } = paths();
  const files = [...listMarkdown(graph), ...listMarkdown(path.join(vault, 'wiki')), ...listMarkdown(autoMemory, 0)];
  const hits = [];
  for (const file of new Set(files)) {
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    text.split(/\r?\n/).forEach((line, i) => {
      const low = line.toLowerCase();
      const score = terms.filter((t) => low.includes(t)).length;
      if (score) hits.push({ file, lineNo: i + 1, line: line.trim(), score });
    });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function remember({ title, text, tags = [] }) {
  if (!title || /[\\/:*?"<>|]|\.\./.test(title)) throw new Error('title must be a plain note name');
  const { graph, hub } = paths();
  fs.mkdirSync(graph, { recursive: true });
  const file = path.join(graph, `${title}.md`);
  if (fs.existsSync(file)) throw new Error(`note already exists: ${title}`);
  const day = stamp().slice(0, 10);
  const tagList = ['memory', ...tags].join(', ');
  fs.writeFileSync(file, `---\ntitle: ${title}\ntype: memory\ntags: [${tagList}]\ncreated: ${day}\n---\n# ${title}\n\n${text}\n\nPart of [[Memory hub]].\n`);
  if (fs.existsSync(hub)) {
    let h = fs.readFileSync(hub, 'utf8');
    if (!/\n## Remembered\n/.test(h)) h = h.replace(/\s*$/, '\n\n## Remembered\n');
    fs.writeFileSync(hub, `${h.replace(/\s*$/, '\n')}- [[${title}]] (${day})\n`);
  }
  return file;
}

function git(args) {
  try {
    return execFileSync('git', ['-C', paths().repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch { return null; }
}

export function repoFacts() {
  const branch = git(['branch', '--show-current']);
  if (branch === null) return { branch: null, head: null, dirty: null };
  const status = git(['status', '--porcelain']) || '';
  return { branch, head: git(['rev-parse', '--short', 'HEAD']), dirty: status ? status.split('\n').length : 0 };
}

export function commitsSince(head) {
  if (!head) return [];
  const log = git(['log', '--format=%h %s', `${head}..HEAD`]);
  return log ? log.split('\n') : [];
}

export function healthLine() {
  try {
    const h = JSON.parse(fs.readFileSync(paths().health, 'utf8').replace(/^\uFEFF/, ''));
    const down = [];
    for (const group of ['required', 'optional']) {
      for (const [name, v] of Object.entries(h[group] || {})) if (v.status !== 'UP') down.push(`${name} ${v.status}`);
    }
    return `node health ${h.overall || '?'} at ${h.ts || '?'}${down.length ? `; not UP: ${down.join(', ')}` : ''}`;
  } catch { return 'node health file not readable'; }
}

export function bootCard() {
  const p = paths();
  let card;
  try { card = fs.readFileSync(p.bootCard, 'utf8').trim(); } catch { card = '# DREAM boot card missing'; }
  const f = repoFacts();
  const repo = f.branch === null ? 'game repo not readable' : `game repo on ${f.branch} at ${f.head}, ${f.dirty} uncommitted`;
  const recent = recentSessions(2);
  return [
    card,
    '',
    '## Now',
    `- ${healthLine()}`,
    `- ${repo}`,
    '',
    '## Last sessions (from Session memory)',
    recent.length ? recent.join('\n\n') : '- none recorded yet',
  ].join('\n');
}

export function sessionStatePath(id) {
  return path.join(paths().state, 'sessions', `${String(id).replace(/[^\w-]/g, '_')}.json`);
}
