#!/usr/bin/env node
// Starter Kit MCP JSON-RPC 2.0 stdio server (dependency-free Node ESM).
// Exposes: map_search, map_section, memory_search, memory_add, role_get, method_get.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getServiceUrl, loadFleetMap } from '../fleet/fleet-map.mjs';

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
]);

function resolvePaths(options = {}) {
  const env = options.env ?? process.env;
  const userProfile = options.userProfile || env.USERPROFILE || os.homedir();
  const kitchenRoot = path.join(userProfile, 'antigravity', '.fable-kitchen');
  return {
    env,
    userProfile,
    codemapDir: options.codemapDir || env.KIT_CODEMAP_DIR || path.join(kitchenRoot, 'codemap'),
    rosterDir: options.rosterDir || env.KIT_ROSTER_DIR || path.join(kitchenRoot, 'roster'),
    rolesLocalDir: options.rolesLocalDir || env.KIT_ROLES_LOCAL_DIR || path.join(kitchenRoot, 'roles-local'),
    memoryFile: options.memoryFile || env.KIT_MEMORY_FILE || path.join(kitchenRoot, 'memory', 'kit-memory.jsonl'),
    repoLocalRolesDir: path.join(REPO_ROOT, '.fable-kitchen', 'roles-local'),
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

const isCli = Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  startStdioServer();
}
