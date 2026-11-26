#!/usr/bin/env node
// House MCP / Starter Kit MCP JSON-RPC 2.0 server (dependency-free Node ESM).
// Default transport: stdio. Optional streamable HTTP transport (HOUSE_MCP_HTTP=1) requires HOUSE_MCP_KEY and binds Alienware LAN address from ops/fleet/fleet-map.json.
// Exposes: map_search, map_section, memory_search, memory_add, role_get, method_get, house_index, house_search, skills_list, skills_get, wheel_status, wheel_queue.

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getNodeHost, getServiceUrl, loadFleetMap } from '../fleet/fleet-map.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const METHOD_CARD_PATH = path.join(__dirname, 'METHOD.md');
const DEFAULT_HTTP_TIMEOUT_MS = 1500;

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.venv',
  'venv',
  'dist',
  'build',
  'out',
  'coverage',
  'archive',
]);

const VAULT_DIR_RE = /(?:obsidian|vault|claude-to-claude|onedrive|dream-online$)/i;
const SAFE_NAME_RE = /^[A-Za-z0-9._-]+$/;

const SECRET_RULES = Object.freeze([
  { id: 'sk-key', re: /(?<![A-Za-z0-9])sk-(?:ant-|proj-)?[A-Za-z0-9_-]{8,}/ },
  { id: 'google-aiza', re: /(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{12,}/ },
  { id: 'github-pat', re: /(?<![A-Za-z0-9])(?:gh[opsur]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,})/ },
  { id: 'square-eaaa', re: /(?<![A-Za-z0-9_-])(?:EAAA[A-Za-z0-9_-]{16,}|(?:sandbox-)?sq0(?:atp|atb|csp)-[A-Za-z0-9_-]{12,})/ },
  { id: 'paypal-token', re: /(?<![A-Za-z0-9_-])A21AA[A-Za-z0-9_-]{16,}/ },
  { id: 'dotenv-ref', re: /(?:^|[\s"'`=/\\])\.env(?:\.[A-Za-z0-9._-]+)?(?=$|[\s"'`/:,;)])/i },
  { id: 'vault-path', re: /(?:obsidian-vault|claude-to-claude|vault-staging|onedrive|\.obsidian|vault[\\/]|[\\/]vault\b)/i },
  { id: 'user-folder-path', re: /(?<![A-Za-z0-9])[a-zA-Z]:[\\/]+Users[\\/]+[^\\/\s"'`|)\]]+|\/Users\/[^/\s"'`|)\]]+/i },
  { id: 'secret-assignment', re: /\b(?:api[_-]?key|apikey|token|secret|password|passwd)\s*[=:]\s*['"]?[A-Za-z0-9_.-]{8,}/i },
  { id: 'loopback-reach', re: /(?:https?|wss?):\/\/(?:localhost|127\.0\.0\.1)\b|\b(?:localhost|127\.0\.0\.1):\d{2,5}\b/i },
]);

export const KIT_TOOLS = Object.freeze([
  {
    name: 'map_search',
    description: 'Search a repository codemap (JSON/MD) under .fable-kitchen/codemap or fall back to walking the repo tree.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name (e.g. dream-online, ANTIGRAVITY, swarm-command).' },
        query: { type: 'string', description: 'Search terms.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'map_section',
    description: 'Return a named section from a repository codemap (JSON/MD).',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name (default: dream-online).' },
        name: { type: 'string', description: 'Section name (e.g. Top folders, HTTP routes, Tests).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'memory_search',
    description: 'Query the fleet ai-memory server with 1500ms timeout and fall back to local kit-memory.jsonl.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'memory_add',
    description: 'Store a non-secret memory note locally in kit-memory.jsonl and post to fleet ai-memory when reachable.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Note text (secrets, .env refs, and vault paths are rejected).' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'role_get',
    description: 'Read a role definition from .fable-kitchen/roster and optional roles-local/<id>.md override.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Role identifier.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'method_get',
    description: 'Return the Starter Kit Method Card (ops/kit/METHOD.md).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'house_index',
    description: 'Return docs/house/INDEX.md (read-only).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'house_search',
    description: 'Search across docs/house and docs/standards (read-only).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms across docs/house and docs/standards.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'skills_list',
    description: 'List skills from .agents/skills in this repo and from the AGENCY SKILLS folder in OneDrive when present (read-only).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional filter terms.' },
        source: { type: 'string', description: 'Optional source filter (.agents/skills or agency-skills).' },
      },
    },
  },
  {
    name: 'skills_get',
    description: 'Read a skill SKILL.md from .agents/skills or OneDrive AGENCY SKILLS by id or name (read-only).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Skill identifier or name.' },
        source: { type: 'string', description: 'Optional source filter (.agents/skills or agency-skills).' },
      },
      required: ['id'],
    },
  },
  {
    name: 'wheel_status',
    description: 'Return counts and names of tickets in queued, running, done today, and failed under .fable-kitchen/inbox (read-only).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'wheel_queue',
    description: 'Write one ticket to .fable-kitchen/inbox/queued from title, lane, repo, and body via staging file and move (UTF-8 without BOM); refuses unknown lane or repo.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Optional ticket filename stem (defaults to a slug derived from title).' },
        title: { type: 'string', description: 'Ticket title (first heading line).' },
        lane: { type: 'string', description: 'Executor lane or job class listed in ops/router/lanes.json.' },
        repo: { type: 'string', description: 'Repository listed in ops/router/lanes.json or ops/router/repos.json.' },
        body: { type: 'string', description: 'Ticket body instructions.' },
        base: { type: 'string', description: 'Optional base branch (default: main).' },
      },
      required: ['title', 'lane', 'repo', 'body'],
    },
  },
]);

const SKILL_HELPER_DIRS = new Set([
  '.git',
  '.github',
  'node_modules',
  'references',
  'reference',
  'scripts',
  'assets',
  'templates',
  'examples',
  'data',
  'agents',
]);

function resolvePaths(options = {}) {
  const env = options.env ?? process.env;
  const userProfile = options.userProfile || env.USERPROFILE || os.homedir();
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : REPO_ROOT;
  const kitchenRoot = options.kitchenRoot || path.join(userProfile, 'antigravity', '.fable-kitchen');
  const oneDriveDir =
    options.oneDriveDir ??
    env.OneDrive ??
    env.ONEDRIVE ??
    env.OneDriveConsumer ??
    env.OneDriveCommercial ??
    '';
  const agencySkillsDir =
    options.agencySkillsDir ??
    env.KIT_AGENCY_SKILLS_DIR ??
    (oneDriveDir ? path.join(oneDriveDir, 'AGENCY SKILLS') : '');
  return {
    env,
    userProfile,
    repoRoot,
    kitchenRoot,
    codemapDir: options.codemapDir || env.KIT_CODEMAP_DIR || path.join(kitchenRoot, 'codemap'),
    rosterDir: options.rosterDir || env.KIT_ROSTER_DIR || path.join(kitchenRoot, 'roster'),
    rolesLocalDir: options.rolesLocalDir || env.KIT_ROLES_LOCAL_DIR || path.join(kitchenRoot, 'roles-local'),
    memoryFile: options.memoryFile || env.KIT_MEMORY_FILE || path.join(kitchenRoot, 'memory', 'kit-memory.jsonl'),
    repoLocalRolesDir: path.join(repoRoot, '.fable-kitchen', 'roles-local'),
    inboxDir: options.inboxDir || env.KIT_INBOX_DIR || path.join(kitchenRoot, 'inbox'),
    repoSkillsDir: options.repoSkillsDir || env.KIT_REPO_SKILLS_DIR || path.join(repoRoot, '.agents', 'skills'),
    oneDriveDir,
    agencySkillsDir,
    lanesPath: options.lanesPath || path.join(repoRoot, 'ops', 'router', 'lanes.json'),
    reposPath: options.reposPath || path.join(repoRoot, 'ops', 'router', 'repos.json'),
    houseIndexPath: options.houseIndexPath || path.join(repoRoot, 'docs', 'house', 'INDEX.md'),
    fleetMapPath: options.fleetMapPath || path.join(repoRoot, 'ops', 'fleet', 'fleet-map.json'),
  };
}

function redactOutput(text) {
  let out = String(text ?? '');
  out = out.replace(/[a-zA-Z]:[\\/]+Users[\\/]+[^\\/\s"'`|)\]]+/gi, '%USERPROFILE%');
  out = out.replace(/\/Users\/[^/\s"'`|)\]]+/gi, '~');
  out = out.replace(/(?<![A-Za-z0-9])sk-(?:ant-|proj-)?[A-Za-z0-9_-]{8,}/g, 'XXXX');
  out = out.replace(/(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{12,}/g, 'XXXX');
  out = out.replace(/(?<![A-Za-z0-9])(?:gh[opsur]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,})/g, 'XXXX');
  out = out.replace(/(?<![A-Za-z0-9_-])(?:EAAA[A-Za-z0-9_-]{16,}|(?:sandbox-)?sq0(?:atp|atb|csp)-[A-Za-z0-9_-]{12,})/g, 'XXXX');
  return out;
}

function validateSafeToken(raw, label) {
  const value = String(raw ?? '').trim();
  if (!value || !SAFE_NAME_RE.test(value) || value.includes('..')) {
    throw new Error(`Invalid ${label}: "${value}"`);
  }
  return value;
}

function resolveAiMemoryBaseUrl(options = {}) {
  const env = options.env ?? process.env;
  if (options.aiMemoryUrl !== undefined) {
    return String(options.aiMemoryUrl).trim();
  }
  if (env.KIT_AI_MEMORY_URL !== undefined) {
    const val = String(env.KIT_AI_MEMORY_URL).trim();
    return val.toLowerCase() === 'off' ? '' : val;
  }
  try {
    const mapPath = options.fleetMapPath || path.join(REPO_ROOT, 'ops', 'fleet', 'fleet-map.json');
    const map = loadFleetMap(mapPath);
    return getServiceUrl('ai-memory', '', map);
  } catch {
    return '';
  }
}

function findSecretRule(text) {
  const content = String(text ?? '');
  for (const rule of SECRET_RULES) {
    if (rule.re.test(content)) {
      return rule.id;
    }
  }
  return null;
}

function matchesTerms(haystack, terms) {
  const lower = String(haystack).toLowerCase();
  return terms.every((t) => lower.includes(t));
}

function parseTerms(query) {
  const terms = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) throw new Error('query must be a non-empty string');
  return terms;
}

function isRestrictedRelPath(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  const base = path.posix.basename(norm).toLowerCase();
  if (base.startsWith('.env')) return true;
  return VAULT_DIR_RE.test(norm);
}

function parseMarkdownSections(mdText) {
  const sections = new Map();
  let current = 'Overview';
  let buf = [];
  for (const line of String(mdText).split(/\r?\n/)) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      if (buf.length > 0 || current !== 'Overview') {
        sections.set(current, buf.join('\n').trim());
      }
      current = heading[1].trim();
      buf = [];
    } else {
      buf.push(line);
    }
  }
  if (buf.length > 0 || !sections.has(current)) {
    sections.set(current, buf.join('\n').trim());
  }
  return sections;
}

function resolveCodemapFile(codemapDir, repo) {
  if (!fs.existsSync(codemapDir)) return null;
  const target = repo ? validateSafeToken(repo, 'repo') : null;
  if (target) {
    const jsonPath = path.join(codemapDir, `${target}.json`);
    if (fs.existsSync(jsonPath)) return { type: 'json', repo: target, filePath: jsonPath };
    const mdPath = path.join(codemapDir, `${target}.md`);
    if (fs.existsSync(mdPath)) return { type: 'md', repo: target, filePath: mdPath };
    return null;
  }
  const entries = fs.readdirSync(codemapDir).sort();
  for (const name of entries) {
    if (name.endsWith('.json')) return { type: 'json', repo: name.slice(0, -5), filePath: path.join(codemapDir, name) };
    if (name.endsWith('.md')) return { type: 'md', repo: name.slice(0, -3), filePath: path.join(codemapDir, name) };
  }
  return null;
}

function resolveRepoDirForFallback(repo, options, userProfile) {
  if (options.repoDir && fs.existsSync(options.repoDir)) {
    return path.resolve(options.repoDir);
  }
  if (!repo || repo === path.basename(REPO_ROOT) || repo === 'dream-online') {
    return REPO_ROOT;
  }
  const safeRepo = validateSafeToken(repo, 'repo');
  const candidates = [
    path.join(userProfile, 'antigravity', safeRepo),
    path.join(userProfile, 'antigravity', 'build', safeRepo),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function walkRepoFiles(repoDir, limit = 5000) {
  const results = [];
  const stack = [['']];
  while (stack.length > 0 && results.length < limit) {
    const [rel] = stack.pop();
    const abs = rel ? path.join(repoDir, rel) : repoDir;
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || VAULT_DIR_RE.test(entry.name)) continue;
        stack.push([childRel]);
      } else if (entry.isFile()) {
        if (isRestrictedRelPath(childRel)) continue;
        results.push(childRel);
        if (results.length >= limit) break;
      }
    }
  }
  return results.sort();
}

export function mapSearch({ repo = '', query }, options = {}) {
  const terms = parseTerms(query);
  const paths = resolvePaths(options);
  const codemap = resolveCodemapFile(paths.codemapDir, repo);

  if (codemap?.type === 'json') {
    const parsed = JSON.parse(fs.readFileSync(codemap.filePath, 'utf8'));
    const matches = [];
    const sections = parsed.sections && typeof parsed.sections === 'object' ? parsed.sections : parsed;
    for (const [secName, val] of Object.entries(sections)) {
      const lines = Array.isArray(val) ? val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))) : JSON.stringify(val, null, 2).split(/\r?\n/);
      for (const line of lines) {
        if (!isRestrictedRelPath(line) && matchesTerms(`${secName} ${line}`, terms)) {
          matches.push({ repo: codemap.repo, section: secName, line: redactOutput(line.trim()) });
          if (matches.length >= 30) break;
        }
      }
      if (matches.length >= 30) break;
    }
    return { source: 'codemap-json', repo: codemap.repo, matches };
  }

  if (codemap?.type === 'md') {
    const raw = fs.readFileSync(codemap.filePath, 'utf8');
    const sections = parseMarkdownSections(raw);
    const matches = [];
    for (const [secName, body] of sections.entries()) {
      for (const line of body.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || isRestrictedRelPath(trimmed)) continue;
        if (matchesTerms(`${secName} ${trimmed}`, terms)) {
          matches.push({ repo: codemap.repo, section: secName, line: redactOutput(trimmed) });
          if (matches.length >= 30) break;
        }
      }
      if (matches.length >= 30) break;
    }
    return { source: 'codemap', repo: codemap.repo, matches };
  }

  const repoDir = resolveRepoDirForFallback(repo, options, paths.userProfile);
  if (!repoDir) {
    return { source: 'none', repo: repo || 'unknown', matches: [] };
  }
  const files = walkRepoFiles(repoDir);
  const matches = [];
  for (const rel of files) {
    if (matchesTerms(rel, terms)) {
      matches.push({ repo: repo || path.basename(repoDir), section: 'Files', line: redactOutput(rel) });
      if (matches.length >= 50) break;
    }
  }
  return { source: 'repo-tree', repo: repo || path.basename(repoDir), matches };
}

export function mapSection({ repo = 'dream-online', name }, options = {}) {
  const requested = String(name ?? '').trim();
  if (!requested) throw new Error('name must be a non-empty string');
  const paths = resolvePaths(options);
  const codemap = resolveCodemapFile(paths.codemapDir, repo);

  if (codemap?.type === 'json') {
    const parsed = JSON.parse(fs.readFileSync(codemap.filePath, 'utf8'));
    const sections = parsed.sections && typeof parsed.sections === 'object' ? parsed.sections : parsed;
    const keys = Object.keys(sections);
    const matchKey =
      keys.find((k) => k.toLowerCase() === requested.toLowerCase()) ||
      keys.find((k) => k.toLowerCase().includes(requested.toLowerCase()));
    if (!matchKey) {
      return { found: false, repo: codemap.repo, availableSections: keys };
    }
    const content = typeof sections[matchKey] === 'string'
      ? sections[matchKey]
      : JSON.stringify(sections[matchKey], null, 2);
    return { found: true, repo: codemap.repo, section: matchKey, content: redactOutput(content) };
  }

  if (codemap?.type === 'md') {
    const raw = fs.readFileSync(codemap.filePath, 'utf8');
    const sections = parseMarkdownSections(raw);
    const keys = Array.from(sections.keys());
    const matchKey =
      keys.find((k) => k.toLowerCase() === requested.toLowerCase()) ||
      keys.find((k) => k.toLowerCase().includes(requested.toLowerCase()));
    if (!matchKey) {
      return { found: false, repo: codemap.repo, availableSections: keys };
    }
    return {
      found: true,
      repo: codemap.repo,
      section: matchKey,
      content: redactOutput(sections.get(matchKey)),
    };
  }

  const repoDir = resolveRepoDirForFallback(repo, options, paths.userProfile);
  if (!repoDir) {
    return { found: false, repo, availableSections: [] };
  }
  const files = walkRepoFiles(repoDir, 500);
  return {
    found: true,
    repo,
    section: 'Files',
    content: redactOutput(files.slice(0, 60).join('\n')),
  };
}

function readLocalMemoryRecords(memoryFile) {
  if (!fs.existsSync(memoryFile)) return [];
  const raw = fs.readFileSync(memoryFile, 'utf8');
  const records = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.text === 'string') {
        records.push(parsed);
      }
    } catch {
      // Skip malformed line without stopping search
    }
  }
  return records;
}

export async function memorySearch({ query }, options = {}) {
  const terms = parseTerms(query);
  const paths = resolvePaths(options);
  const aiMemoryUrl = resolveAiMemoryBaseUrl(options);
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_HTTP_TIMEOUT_MS;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;

  const hits = [];
  let remoteQueried = false;
  let remoteOk = false;

  if (aiMemoryUrl && typeof fetchFn === 'function') {
    remoteQueried = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `${aiMemoryUrl.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}`;
      const res = await fetchFn(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      if (res.ok) {
        remoteOk = true;
        const payload = await res.json();
        const items = Array.isArray(payload)
          ? payload
          : payload?.results || payload?.hits || payload?.items || [];
        for (const item of items) {
          const text = typeof item === 'string' ? item : item?.text || item?.content || JSON.stringify(item);
          if (findSecretRule(text)) continue;
          hits.push({
            source: 'ai-memory',
            text: redactOutput(text),
            tags: Array.isArray(item?.tags) ? item.tags : [],
          });
        }
      }
    } catch {
      remoteOk = false;
    } finally {
      clearTimeout(timer);
    }
  }

  const localRecords = readLocalMemoryRecords(paths.memoryFile);
  for (const rec of localRecords) {
    const combined = `${rec.text} ${(rec.tags || []).join(' ')}`;
    if (matchesTerms(combined, terms)) {
      hits.push({
        source: 'local-jsonl',
        timestamp: rec.timestamp || '',
        text: redactOutput(rec.text),
        tags: Array.isArray(rec.tags) ? rec.tags : [],
      });
    }
  }

  return {
    query,
    remoteQueried,
    remoteOk,
    usedFallback: !remoteOk,
    hits: hits.slice(0, 30),
  };
}

export async function memoryAdd({ text, tags = [] }, options = {}) {
  const cleanText = String(text ?? '').trim();
  if (!cleanText) throw new Error('text must be a non-empty string');
  const cleanTags = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];

  const textRule = findSecretRule(cleanText);
  if (textRule) {
    throw new Error(`Refused: restricted pattern (${textRule}) detected; secrets, .env refs, and vault paths cannot be stored.`);
  }
  const tagRule = findSecretRule(cleanTags.join(' '));
  if (tagRule) {
    throw new Error(`Refused: restricted pattern (${tagRule}) detected in tags.`);
  }

  const paths = resolvePaths(options);
  fs.mkdirSync(path.dirname(paths.memoryFile), { recursive: true });
  const record = {
    id: `kit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    text: cleanText,
    tags: cleanTags,
  };
  fs.appendFileSync(paths.memoryFile, JSON.stringify(record) + '\n', 'utf8');

  let syncedRemote = false;
  const aiMemoryUrl = resolveAiMemoryBaseUrl(options);
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_HTTP_TIMEOUT_MS;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;

  if (aiMemoryUrl && typeof fetchFn === 'function') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `${aiMemoryUrl.replace(/\/$/, '')}/add`;
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
        signal: controller.signal,
      });
      syncedRemote = res.ok;
    } catch {
      syncedRemote = false;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    savedLocal: true,
    syncedRemote,
    id: record.id,
  };
}

export function roleGet({ id }, options = {}) {
  const safeId = validateSafeToken(id, 'role id');
  const paths = resolvePaths(options);

  let rosterEntry = null;
  const rosterMdPath = path.join(paths.rosterDir, `${safeId}.md`);
  const rosterJsonItemPath = path.join(paths.rosterDir, `${safeId}.json`);
  const rosterCatalogPath = path.join(paths.rosterDir, 'roster.json');

  if (fs.existsSync(rosterJsonItemPath)) {
    rosterEntry = JSON.parse(fs.readFileSync(rosterJsonItemPath, 'utf8'));
  } else if (fs.existsSync(rosterCatalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(rosterCatalogPath, 'utf8'));
    if (Array.isArray(catalog)) {
      rosterEntry =
        catalog.find((r) => r && r.id === safeId) ||
        catalog.find((r) => r && typeof r.name === 'string' && r.name.toLowerCase() === safeId.toLowerCase()) ||
        null;
    } else if (catalog && typeof catalog === 'object') {
      rosterEntry = catalog[safeId] || null;
    }
  }

  let rosterMarkdown = fs.existsSync(rosterMdPath)
    ? redactOutput(fs.readFileSync(rosterMdPath, 'utf8'))
    : '';

  let localMarkdown = '';
  for (const localDir of [paths.rolesLocalDir, paths.repoLocalRolesDir]) {
    const candidate = path.join(localDir, `${safeId}.md`);
    if (fs.existsSync(candidate)) {
      localMarkdown = redactOutput(fs.readFileSync(candidate, 'utf8'));
      break;
    }
  }

  const found = Boolean(rosterEntry || rosterMarkdown || localMarkdown);
  return {
    found,
    id: safeId,
    roster: rosterEntry ? JSON.parse(redactOutput(JSON.stringify(rosterEntry))) : null,
    rosterMarkdown,
    localMarkdown,
  };
}

export function methodGet(options = {}) {
  const methodPath = options.methodPath || METHOD_CARD_PATH;
  const text = fs.readFileSync(methodPath, 'utf8');
  return { text };
}

export function houseIndex(options = {}) {
  const paths = resolvePaths(options);
  const raw = fs.readFileSync(paths.houseIndexPath, 'utf8');
  return {
    path: 'docs/house/INDEX.md',
    text: redactOutput(raw),
  };
}

function walkMarkdownAndTextFiles(rootDir, relPrefix = '') {
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  const results = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const childAbs = path.join(rootDir, entry.name);
    const childRel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || VAULT_DIR_RE.test(entry.name)) continue;
      results.push(...walkMarkdownAndTextFiles(childAbs, childRel));
    } else if (entry.isFile() && /\.(?:md|json|txt)$/i.test(entry.name)) {
      if (!isRestrictedRelPath(childRel)) {
        results.push({ absPath: childAbs, relPath: childRel });
      }
    }
  }
  return results;
}

export function houseSearch({ query }, options = {}) {
  const terms = parseTerms(query);
  const paths = resolvePaths(options);
  const targetDirs = options.houseDirs || [
    { absDir: path.join(paths.repoRoot, 'docs', 'house'), relPrefix: 'docs/house' },
    { absDir: path.join(paths.repoRoot, 'docs', 'standards'), relPrefix: 'docs/standards' },
  ];

  const matches = [];
  const seen = new Set();

  for (const { absDir, relPrefix } of targetDirs) {
    const files = walkMarkdownAndTextFiles(absDir, relPrefix);
    for (const file of files) {
      let raw;
      try {
        raw = fs.readFileSync(file.absPath, 'utf8');
      } catch {
        continue;
      }
      const sections = parseMarkdownSections(raw);
      for (const [secName, body] of sections.entries()) {
        for (const line of body.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || isRestrictedRelPath(trimmed)) continue;
          if (matchesTerms(`${file.relPath} ${secName} ${trimmed}`, terms)) {
            const key = `${file.relPath}|${secName}|${trimmed}`;
            if (!seen.has(key)) {
              seen.add(key);
              matches.push({
                file: redactOutput(file.relPath),
                section: secName,
                line: redactOutput(trimmed),
              });
            }
            if (matches.length >= 50) break;
          }
        }
        if (matches.length >= 50) break;
      }
      if (matches.length >= 50) break;
    }
    if (matches.length >= 50) break;
  }

  if (matches.length < 50) {
    try {
      const codemapRes = mapSearch({ repo: 'dream-online', query }, options);
      for (const m of codemapRes.matches || []) {
        if (m.line.includes('docs/house') || m.line.includes('docs/standards')) {
          const key = `codemap|${m.section}|${m.line}`;
          if (!seen.has(key)) {
            seen.add(key);
            matches.push({
              file: 'codemap:dream-online',
              section: m.section,
              line: redactOutput(m.line),
            });
          }
          if (matches.length >= 50) break;
        }
      }
    } catch {
      // Ignore codemap fallback errors when house docs matched directly
    }
  }

  return {
    query,
    matches,
  };
}

function parseSkillFrontmatter(text) {
  const normalized = String(text ?? '').replace(/^\uFEFF/, '');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(normalized);
  if (!match) return { name: '', description: '' };
  let name = '';
  let description = '';
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const val = kv[2].trim().replace(/^["']|["']$/g, '').trim();
    if ((key === 'name' || key === 'title') && val && val !== '>' && val !== '|') {
      name = val;
    } else if (key === 'description' && val && val !== '>' && val !== '|') {
      description = val.slice(0, 200);
    }
  }
  return { name, description };
}

function scanSkillsDirectory(rootDir, sourceLabel) {
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  let topEntries;
  try {
    topEntries = fs.readdirSync(rootDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }

  const collected = [];
  const seenIds = new Set();

  function addSkillFile(id, filePath) {
    const key = id.toLowerCase();
    if (seenIds.has(key)) return;
    let raw;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }
    seenIds.add(key);
    const fm = parseSkillFrontmatter(raw);
    collected.push({
      id,
      name: fm.name || id,
      description: fm.description || '',
      source: sourceLabel,
      path: redactOutput(filePath),
      _filePath: filePath,
    });
  }

  let nestedSkillsDir = null;
  for (const entry of topEntries) {
    if (entry.name.startsWith('.') || /RETIRED/i.test(entry.name)) continue;
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() === 'skills') {
        nestedSkillsDir = path.join(rootDir, entry.name);
        continue;
      }
      if (SKILL_HELPER_DIRS.has(entry.name.toLowerCase())) continue;
      const skillFolder = path.join(rootDir, entry.name);
      const skillMd = path.join(skillFolder, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        addSkillFile(entry.name, skillMd);
      }
    }
  }

  if (nestedSkillsDir && fs.existsSync(nestedSkillsDir)) {
    try {
      const subEntries = fs
        .readdirSync(nestedSkillsDir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const sub of subEntries) {
        if (!sub.isDirectory() || sub.name.startsWith('.') || /RETIRED/i.test(sub.name)) continue;
        if (SKILL_HELPER_DIRS.has(sub.name.toLowerCase())) continue;
        const skillMd = path.join(nestedSkillsDir, sub.name, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          addSkillFile(sub.name, skillMd);
        }
      }
    } catch {
      // Ignore unreadable nested skills mirror
    }
  }

  return collected;
}

function collectAllSkills(options = {}) {
  const paths = resolvePaths(options);
  const repoSkills = scanSkillsDirectory(paths.repoSkillsDir, '.agents/skills');
  const agencySkills = paths.agencySkillsDir
    ? scanSkillsDirectory(paths.agencySkillsDir, 'agency-skills')
    : [];
  return [...repoSkills, ...agencySkills];
}

export function skillsList(args = {}, options = {}) {
  const all = collectAllSkills(options);
  const sourceFilter = args?.source ? String(args.source).trim().toLowerCase() : '';
  const queryTerms = args?.query && String(args.query).trim() ? parseTerms(args.query) : null;

  const filtered = all.filter((item) => {
    if (sourceFilter && item.source.toLowerCase() !== sourceFilter) return false;
    if (queryTerms && !matchesTerms(`${item.id} ${item.name} ${item.description} ${item.source}`, queryTerms)) {
      return false;
    }
    return true;
  });

  const skills = filtered.map(({ _filePath, ...publicFields }) => publicFields);
  return {
    count: skills.length,
    skills,
  };
}

export function skillsGet(args = {}, options = {}) {
  const rawId = args?.id ?? args?.name;
  const safeId = validateSafeToken(rawId, 'skill id');
  const sourceFilter = args?.source ? String(args.source).trim().toLowerCase() : '';
  const all = collectAllSkills(options).filter(
    (item) => !sourceFilter || item.source.toLowerCase() === sourceFilter,
  );

  const match =
    all.find((s) => s.id === safeId) ||
    all.find((s) => s.id.toLowerCase() === safeId.toLowerCase()) ||
    all.find((s) => s.name.toLowerCase() === safeId.toLowerCase()) ||
    null;

  if (!match) {
    return {
      found: false,
      id: safeId,
      text: '',
    };
  }

  const rawText = fs.readFileSync(match._filePath, 'utf8');
  return {
    found: true,
    id: match.id,
    name: match.name,
    source: match.source,
    path: match.path,
    text: redactOutput(rawText),
  };
}

function isSameLocalCalendarDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function listTicketMarkdownFiles(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return [];
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((e) => e.isFile() && !e.name.startsWith('.') && e.name.toLowerCase().endsWith('.md'))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function wheelStatus(options = {}) {
  const paths = resolvePaths(options);
  const now = typeof options.now === 'function' ? options.now() : new Date();

  const queuedDir = path.join(paths.inboxDir, 'queued');
  const runningDir = path.join(paths.inboxDir, 'running');
  const doneDir = path.join(paths.inboxDir, 'done');
  const failedDir = path.join(paths.inboxDir, 'failed');

  const queuedNames = listTicketMarkdownFiles(queuedDir);
  const runningNames = listTicketMarkdownFiles(runningDir);
  const failedNames = listTicketMarkdownFiles(failedDir);

  const allDoneMd = listTicketMarkdownFiles(doneDir);
  const doneTodayNames = allDoneMd.filter((name) => {
    try {
      const mdPath = path.join(doneDir, name);
      const mdStat = fs.statSync(mdPath);
      if (isSameLocalCalendarDay(mdStat.mtime, now)) return true;
      const logPath = path.join(doneDir, name.replace(/\.md$/i, '.log'));
      if (fs.existsSync(logPath)) {
        const logStat = fs.statSync(logPath);
        if (isSameLocalCalendarDay(logStat.mtime, now)) return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  return {
    queued: { count: queuedNames.length, names: queuedNames },
    running: { count: runningNames.length, names: runningNames },
    doneToday: { count: doneTodayNames.length, names: doneTodayNames },
    done_today: { count: doneTodayNames.length, names: doneTodayNames },
    failed: { count: failedNames.length, names: failedNames },
    counts: {
      queued: queuedNames.length,
      running: runningNames.length,
      doneToday: doneTodayNames.length,
      done_today: doneTodayNames.length,
      failed: failedNames.length,
    },
  };
}

function loadAllowedLanes(lanesPath) {
  if (!lanesPath || !fs.existsSync(lanesPath)) {
    throw new Error('ops/router/lanes.json could not be found.');
  }
  const parsed = JSON.parse(fs.readFileSync(lanesPath, 'utf8'));
  const allowed = new Set();
  if (parsed.lanes && typeof parsed.lanes === 'object') {
    for (const [jobClass, entry] of Object.entries(parsed.lanes)) {
      allowed.add(jobClass);
      if (entry && typeof entry.lane === 'string' && entry.lane.trim()) {
        allowed.add(entry.lane.trim());
      }
      if (entry && Array.isArray(entry.ladder)) {
        for (const rung of entry.ladder) {
          if (typeof rung === 'string' && rung.trim()) allowed.add(rung.trim());
        }
      }
    }
  }
  if (parsed.laneSettings && typeof parsed.laneSettings === 'object') {
    for (const key of Object.keys(parsed.laneSettings)) {
      if (key.trim()) allowed.add(key.trim());
    }
  }
  return { allowed, parsed };
}

function loadAllowedRepos(lanesParsed, reposPath) {
  const allowed = new Set();
  if (lanesParsed?.repos) {
    if (Array.isArray(lanesParsed.repos)) {
      for (const r of lanesParsed.repos) {
        if (typeof r === 'string' && r.trim()) allowed.add(r.trim().replace(/^Trollz1004\//i, ''));
      }
    } else if (typeof lanesParsed.repos === 'object') {
      for (const r of Object.keys(lanesParsed.repos)) {
        if (r.trim()) allowed.add(r.trim().replace(/^Trollz1004\//i, ''));
      }
    }
  }
  if (reposPath && fs.existsSync(reposPath)) {
    const parsedRepos = JSON.parse(fs.readFileSync(reposPath, 'utf8'));
    if (parsedRepos?.repos && typeof parsedRepos.repos === 'object') {
      for (const r of Object.keys(parsedRepos.repos)) {
        if (r.trim()) allowed.add(r.trim().replace(/^Trollz1004\//i, ''));
      }
    }
  }
  return allowed;
}

function slugifyTicketTitle(title) {
  const slug = String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return slug || `ticket-${Date.now()}`;
}

export function wheelQueue(args = {}, options = {}) {
  const paths = resolvePaths(options);
  if (/onedrive/i.test(paths.inboxDir)) {
    throw new Error('Refused: inbox folder cannot be under OneDrive.');
  }

  const rawTitle = String(args?.title ?? '').replace(/\r?\n/g, ' ').replace(/^#+\s*/, '').trim();
  if (!rawTitle) throw new Error('title must be a non-empty string');
  const titleRule = findSecretRule(rawTitle);
  if (titleRule) {
    throw new Error(`Refused: restricted pattern (${titleRule}) detected in title.`);
  }

  const rawBody = String(args?.body ?? '').trim();
  if (!rawBody) throw new Error('body must be a non-empty string');
  const bodyRule = findSecretRule(rawBody);
  if (bodyRule) {
    throw new Error(`Refused: restricted pattern (${bodyRule}) detected in body.`);
  }

  const cleanLane = String(args?.lane ?? '').trim();
  const { allowed: allowedLanes, parsed: lanesParsed } = loadAllowedLanes(paths.lanesPath);
  if (!cleanLane || !allowedLanes.has(cleanLane)) {
    throw new Error(`Refused: unknown lane "${cleanLane}" is not listed in ops/router/lanes.json.`);
  }

  const cleanRepo = String(args?.repo ?? '').trim();
  const allowedRepos = loadAllowedRepos(lanesParsed, paths.reposPath);
  if (!cleanRepo || !allowedRepos.has(cleanRepo)) {
    throw new Error(`Refused: unknown repo "${cleanRepo}" is not listed in ops/router/lanes.json or ops/router/repos.json.`);
  }

  const cleanBase = args?.base
    ? validateSafeToken(String(args.base).replace(/^origin\//, ''), 'base branch')
    : 'main';

  const stemInput = args?.id
    ? String(args.id).trim().replace(/\.md$/i, '')
    : slugifyTicketTitle(rawTitle);
  const ticketId = validateSafeToken(stemInput, 'ticket id');
  const fileName = `${ticketId}.md`;

  const queuedDir = path.join(paths.inboxDir, 'queued');
  const runningDir = path.join(paths.inboxDir, 'running');
  fs.mkdirSync(queuedDir, { recursive: true });

  const targetPath = path.join(queuedDir, fileName);
  if (fs.existsSync(targetPath) || (fs.existsSync(runningDir) && fs.existsSync(path.join(runningDir, fileName)))) {
    throw new Error(`Refused: ticket "${fileName}" already exists in queued or running.`);
  }

  const ticketText =
    [
      `# ${rawTitle}`,
      `lane: ${cleanLane}`,
      `repo: ${cleanRepo}`,
      `base: ${cleanBase}`,
      '',
      rawBody,
    ].join('\n') + '\n';

  const cleanUtf8Bytes = Buffer.from(ticketText.replace(/^\uFEFF/, ''), 'utf8');
  const stagingPath = path.join(queuedDir, `.stage-${ticketId}-${process.pid}-${Date.now()}.tmp`);
  fs.writeFileSync(stagingPath, cleanUtf8Bytes);
  fs.renameSync(stagingPath, targetPath);

  return {
    queued: true,
    id: ticketId,
    fileName,
    title: rawTitle,
    lane: cleanLane,
    repo: cleanRepo,
    base: cleanBase,
    path: redactOutput(targetPath),
  };
}

async function dispatchToolCall(name, args = {}, options = {}) {
  switch (name) {
    case 'map_search':
      return JSON.stringify(mapSearch(args, options), null, 2);
    case 'map_section': {
      const sec = mapSection(args, options);
      return sec.found ? sec.content : JSON.stringify(sec, null, 2);
    }
    case 'memory_search':
      return JSON.stringify(await memorySearch(args, options), null, 2);
    case 'memory_add':
      return JSON.stringify(await memoryAdd(args, options), null, 2);
    case 'role_get':
      return JSON.stringify(roleGet(args, options), null, 2);
    case 'method_get':
      return methodGet(options).text;
    case 'house_index':
      return houseIndex(options).text;
    case 'house_search':
      return JSON.stringify(houseSearch(args, options), null, 2);
    case 'skills_list':
      return JSON.stringify(skillsList(args, options), null, 2);
    case 'skills_get': {
      const skill = skillsGet(args, options);
      return skill.found ? skill.text : JSON.stringify(skill, null, 2);
    }
    case 'wheel_status':
      return JSON.stringify(wheelStatus(options), null, 2);
    case 'wheel_queue':
      return JSON.stringify(wheelQueue(args, options), null, 2);
    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { rpc: -32601 });
  }
}

export async function handleJsonRpcMessage(message, options = {}) {
  if (!message || typeof message !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request' },
    };
  }

  const id = message.id;
  const method = typeof message.method === 'string' ? message.method : '';
  const params = message.params && typeof message.params === 'object' ? message.params : {};

  if (id === undefined || method.startsWith('notifications/')) {
    return null;
  }

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'dream-kit', version: '1.0.0' },
        },
      };
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: KIT_TOOLS } };
    case 'tools/call':
      try {
        const text = await dispatchToolCall(params.name, params.arguments || {}, options);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text }],
          },
        };
      } catch (err) {
        if (err && err.rpc) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: err.rpc, message: err.message },
          };
        }
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
            isError: true,
          },
        };
      }
    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

export function startStdioServer(options = {}) {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  let chain = Promise.resolve();

  rl.on('line', (rawLine) => {
    const line = rawLine.replace(/^\uFEFF/, '').trim();
    if (!line || line.startsWith('Content-Length:')) return;

    chain = chain.then(async () => {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        process.stdout.write(
          JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n',
        );
        return;
      }
      const response = await handleJsonRpcMessage(msg, options);
      if (response !== null) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    });
  });
}

export function resolveHttpBindHost(options = {}) {
  const paths = resolvePaths(options);
  const map = loadFleetMap(paths.fleetMapPath);
  const alienwareHost = getNodeHost('alienware', map);
  const candidate = String(options.host ?? paths.env.HOUSE_MCP_HOST ?? alienwareHost).trim();

  if (!candidate || candidate === '0.0.0.0' || candidate === '::' || candidate === '[::]') {
    throw new Error('Refused: House MCP HTTP transport never binds all interfaces (0.0.0.0 or ::).');
  }
  if (/^(?:localhost|127\.0\.0\.1|::1|\[::1\])$/i.test(candidate)) {
    throw new Error('Refused: House MCP HTTP transport never binds loopback; use the Alienware house address from ops/fleet/fleet-map.json.');
  }
  if (candidate !== alienwareHost) {
    throw new Error(`Refused: House MCP HTTP transport must bind the Alienware house address (${alienwareHost}) from ops/fleet/fleet-map.json.`);
  }
  return candidate;
}

function verifyBearerToken(authHeader, expectedKey) {
  if (typeof authHeader !== 'string' || !expectedKey) return false;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) return false;
  const providedBuf = Buffer.from(match[1], 'utf8');
  const expectedBuf = Buffer.from(expectedKey, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

function readHttpRequestBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export async function startHttpServer(options = {}) {
  const paths = resolvePaths(options);
  const rawKey = paths.env.HOUSE_MCP_KEY;
  if (typeof rawKey !== 'string' || rawKey.trim().length === 0) {
    throw new Error('Refused to start HTTP transport: HOUSE_MCP_KEY environment variable is required.');
  }
  const expectedKey = rawKey.trim();
  const host = resolveHttpBindHost(options);
  const requestedPort =
    options.port !== undefined
      ? Number(options.port)
      : paths.env.HOUSE_MCP_PORT !== undefined
        ? Number(paths.env.HOUSE_MCP_PORT)
        : 8790;

  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
    throw new Error(`Invalid HTTP port: ${requestedPort}`);
  }

  const sessions = new Set();

  const server = http.createServer(async (req, res) => {
    if (!verifyBearerToken(req.headers.authorization, expectedKey)) {
      res.writeHead(401, {
        'content-type': 'application/json',
        'www-authenticate': 'Bearer',
      });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const reqUrl = new URL(req.url || '/', `http://${host}`);
    const pathname = reqUrl.pathname;

    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', name: 'dream-kit', transport: 'streamable-http' }));
      return;
    }

    if (pathname !== '/mcp' && pathname !== '/') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }

    if (req.method === 'DELETE') {
      const sid = req.headers['mcp-session-id'];
      if (typeof sid === 'string') sessions.delete(sid);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'GET') {
      const accept = String(req.headers.accept || '');
      if (accept.includes('text/event-stream')) {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        });
        res.write(': streamable-http ready\n\n');
        return;
      }
      res.writeHead(405, { 'content-type': 'application/json', allow: 'POST, GET, DELETE' });
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json', allow: 'POST, GET, DELETE' });
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    let rawBody;
    try {
      rawBody = await readHttpRequestBody(req);
    } catch {
      res.writeHead(413, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Payload too large' } }));
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
      return;
    }

    let sessionId = typeof req.headers['mcp-session-id'] === 'string' ? req.headers['mcp-session-id'] : '';
    const isBatch = Array.isArray(parsed);
    const messages = isBatch ? parsed : [parsed];

    if (messages.some((m) => m && m.method === 'initialize') && !sessionId) {
      sessionId = crypto.randomUUID();
      sessions.add(sessionId);
    }

    const responses = [];
    for (const msg of messages) {
      const resp = await handleJsonRpcMessage(msg, options);
      if (resp !== null) {
        responses.push(resp);
      }
    }

    const commonHeaders = {};
    if (sessionId) {
      commonHeaders['mcp-session-id'] = sessionId;
    }

    if (responses.length === 0) {
      res.writeHead(202, commonHeaders);
      res.end();
      return;
    }

    const accept = String(req.headers.accept || 'application/json');
    const prefersSseOnly = accept.includes('text/event-stream') && !accept.includes('application/json');

    if (prefersSseOnly) {
      res.writeHead(200, {
        ...commonHeaders,
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      });
      for (const r of responses) {
        res.write(`event: message\ndata: ${JSON.stringify(r)}\n\n`);
      }
      res.end();
      return;
    }

    const payload = isBatch ? responses : responses[0];
    res.writeHead(200, {
      ...commonHeaders,
      'content-type': 'application/json',
    });
    res.end(JSON.stringify(payload));
  });

  await new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(requestedPort, host);
  });

  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : requestedPort;

  return {
    server,
    host,
    port: actualPort,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

export function isHttpTransportEnabled(env = process.env, argv = process.argv) {
  if (Array.isArray(argv) && argv.includes('--http')) return true;
  const flag = String(env.HOUSE_MCP_HTTP ?? env.KIT_HTTP ?? '').trim().toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on') return true;
  const transport = String(env.HOUSE_MCP_TRANSPORT ?? env.KIT_TRANSPORT ?? '').trim().toLowerCase();
  return transport === 'http' || transport === 'streamable-http';
}

const isCli = Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  if (isHttpTransportEnabled(process.env, process.argv)) {
    startHttpServer().catch((err) => {
      process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    });
  } else {
    startStdioServer();
  }
}
