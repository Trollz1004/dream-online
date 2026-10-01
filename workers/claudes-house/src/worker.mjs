// Claude's House -- a read-only Model Context Protocol connector, served as a
// Cloudflare Worker, zero npm dependencies at runtime.
//
// It implements MCP over Streamable HTTP by hand: one POST endpoint speaking
// JSON-RPC 2.0 (initialize, notifications/initialized, ping, tools/list,
// tools/call, resources/list, resources/read), plus a plain-text GET page.
// Content comes from the public GitHub repository named by HOUSE_OWNER,
// HOUSE_REPO and HOUSE_REF (env vars, see wrangler.toml), read through
// raw.githubusercontent.com and the GitHub contents API. Nothing here writes
// anything, requires auth, or reads a file outside the allowlist below.
//
// See README.md for what this is and how to add it to claude.ai or Cowork.

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_NAME = 'claudes-house';
const SERVER_VERSION = '1.0.0';

const DEFAULT_OWNER = 'Trollz1004';
const DEFAULT_REPO = 'dream-online';
const DEFAULT_REF = 'main';

const MAX_CHARS = 60000;
const CACHE_SECONDS = 300;
const RATE_LIMIT_PER_MINUTE = 60;

// Exact files anyone may read, one by one.
const ALLOWLISTED_FILES = new Set([
  'docs/house/THE-HOUSE.md',
  'docs/house/LESSONS.md',
  'docs/house/TOOLS.md',
  'docs/house/DESIGN-SYSTEM.md',
  'docs/house/ai-studio-stages.json',
  'AGENTS.md',
  'README.md',
  'docs/DREAM-DISPATCH.md',
  'ops/node/JOURNAL.md',
  'ops/node/runbook/ALIENWARE-NODE-RUNBOOK.md',
  'ops/t5500/README.md',
  'workers/claudes-house/README.md',
]);

// Folders whose entire contents are readable (house_read, house_search).
const ALLOWLISTED_FOLDERS = ['docs/handoffs/', 'docs/tech/', 'docs/gdd/', 'specs/'];

// Folders house_list and the folder form of house_search may enumerate.
const LISTABLE_FOLDERS = new Set(['docs/handoffs', 'docs/tech', 'docs/gdd', 'specs']);

const SPEC_FILES = ['spec.md', 'plan.md', 'tasks.md'];

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

function isAllowlistedPath(path) {
  if (typeof path !== 'string' || path.length === 0) return false;
  if (path.includes('\0')) return false;
  if (path.includes('..')) return false;
  if (path.startsWith('/') || path.startsWith('\\')) return false;
  if (/^[a-zA-Z]:/.test(path)) return false; // a Windows absolute path
  if (path.toLowerCase().includes('.env')) return false;
  if (ALLOWLISTED_FILES.has(path)) return true;
  return ALLOWLISTED_FOLDERS.some((folder) => path.startsWith(folder) && path.length > folder.length);
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function capText(text) {
  if (text.length <= MAX_CHARS) return { text, truncated: false };
  const head = text.slice(0, MAX_CHARS);
  return {
    text: `${head}\n\n[truncated: showing the first ${MAX_CHARS} of ${text.length} characters]`,
    truncated: true,
  };
}

function extractNewestJournalEntry(markdown) {
  const headings = [...markdown.matchAll(/^## .*$/gm)];
  if (headings.length === 0) return markdown.trim();
  const start = headings[0].index;
  const end = headings.length > 1 ? headings[1].index : markdown.length;
  return markdown.slice(start, end).trim();
}

function extractFirstDatedParagraph(markdown) {
  const paragraphs = markdown.split(/\n\s*\n/);
  const found = paragraphs.find((p) => /^\*\*\d{4}-\d{2}-\d{2}/.test(p.trim()));
  return found ? found.trim() : null;
}

function summarizeHeadingsAndFirstParagraphs(markdown) {
  const lines = markdown.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (/^#{1,6}\s/.test(lines[i])) {
      out.push(lines[i].trim());
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j += 1;
      const paragraph = [];
      while (j < lines.length && lines[j].trim() !== '' && !/^#{1,6}\s/.test(lines[j])) {
        paragraph.push(lines[j]);
        j += 1;
      }
      if (paragraph.length > 0) out.push(paragraph.join(' ').trim());
    }
  }
  return out.length > 0 ? out.join('\n') : '(no headings found)';
}

// ---------------------------------------------------------------------------
// GitHub access (raw files, cached; the contents API for folder listings)
// ---------------------------------------------------------------------------

function repoCoords(env) {
  return {
    owner: (env && env.HOUSE_OWNER) || DEFAULT_OWNER,
    repo: (env && env.HOUSE_REPO) || DEFAULT_REPO,
    ref: (env && env.HOUSE_REF) || DEFAULT_REF,
  };
}

async function fetchRawFile(path, env, deps) {
  const { owner, repo, ref } = repoCoords(env);
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  const cacheKey = new Request(url);

  if (deps.cache) {
    try {
      const cached = await deps.cache.match(cacheKey);
      if (cached) {
        return { ok: true, status: 200, text: await cached.text() };
      }
    } catch {
      // best effort: a cache miss or a cache error both fall through to fetch
    }
  }

  const response = await deps.fetchImpl(url, { headers: { 'User-Agent': 'claudes-house-connector' } });
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  const text = await response.text();

  if (deps.cache) {
    try {
      await deps.cache.put(
        cacheKey,
        new Response(text, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': `max-age=${CACHE_SECONDS}`,
          },
        }),
      );
    } catch {
      // best effort: caching is an optimization, never a requirement
    }
  }

  return { ok: true, status: 200, text };
}

async function fetchGithubContents(folder, env, deps) {
  const { owner, repo, ref } = repoCoords(env);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${folder}?ref=${encodeURIComponent(ref)}`;
  const response = await deps.fetchImpl(url, {
    headers: {
      'User-Agent': 'claudes-house-connector',
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  const json = await response.json();
  return { ok: true, entries: Array.isArray(json) ? json : [] };
}

// ---------------------------------------------------------------------------
// Tool result shaping
// ---------------------------------------------------------------------------

function textResult(text) {
  const { text: capped, truncated } = capText(text);
  return { content: [{ type: 'text', text: capped }], isError: false, truncated };
}

function errorResult(message) {
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function fixedFileTool(path, env, deps) {
  const result = await fetchRawFile(path, env, deps);
  if (!result.ok) {
    return errorResult(`Could not read ${path} (status ${result.status}).`);
  }
  return textResult(result.text);
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function toolHouseStatus(_args, env, deps) {
  const [journal, dispatch, stageBoard] = await Promise.all([
    fetchRawFile('ops/node/JOURNAL.md', env, deps),
    fetchRawFile('docs/DREAM-DISPATCH.md', env, deps),
    fetchRawFile('docs/house/ai-studio-stages.json', env, deps),
  ]);

  const parts = [];

  parts.push(
    journal.ok
      ? `## Newest journal entry\n\n${extractNewestJournalEntry(journal.text)}`
      : `## Newest journal entry\n\n(could not read ops/node/JOURNAL.md: status ${journal.status})`,
  );

  if (dispatch.ok) {
    const paragraph = extractFirstDatedParagraph(dispatch.text);
    parts.push(`## Dispatch\n\n${paragraph || '(no dated paragraph found)'}`);
  } else {
    parts.push(`## Dispatch\n\n(could not read docs/DREAM-DISPATCH.md: status ${dispatch.status})`);
  }

  parts.push(
    stageBoard.ok
      ? `## AI Studio stage board\n\n${stageBoard.text}`
      : `## AI Studio stage board\n\n(not published yet: status ${stageBoard.status})`,
  );

  return textResult(parts.join('\n\n'));
}

async function toolHouseRead(args, env, deps) {
  const path = args && args.path;
  if (!isAllowlistedPath(path)) {
    return errorResult(`Path not allowed: ${JSON.stringify(path ?? null)}`);
  }
  const result = await fetchRawFile(path, env, deps);
  if (!result.ok) {
    return errorResult(`Could not read ${path} (status ${result.status}).`);
  }
  return textResult(result.text);
}

async function toolHouseList(args, env, deps) {
  const folder = args && args.folder;
  if (!LISTABLE_FOLDERS.has(folder)) {
    return errorResult(`folder must be one of: ${Array.from(LISTABLE_FOLDERS).join(', ')}`);
  }
  const listing = await fetchGithubContents(folder, env, deps);
  if (!listing.ok) {
    return errorResult(`Could not list ${folder} (status ${listing.status}).`);
  }
  const names = listing.entries.map((entry) => entry.name).sort();
  return textResult(names.length > 0 ? names.join('\n') : '(empty)');
}

async function toolHouseSearch(args, env, deps) {
  const query = (args && args.query) || '';
  if (!query) {
    return errorResult('house_search requires a query.');
  }
  const folder = args && args.folder;

  let filesToSearch;
  if (folder) {
    if (!LISTABLE_FOLDERS.has(folder)) {
      return errorResult(`folder must be one of: ${Array.from(LISTABLE_FOLDERS).join(', ')}`);
    }
    const listing = await fetchGithubContents(folder, env, deps);
    if (!listing.ok) {
      return errorResult(`Could not list ${folder} (status ${listing.status}).`);
    }
    filesToSearch = [];
    for (const entry of listing.entries) {
      if (entry.type === 'file') {
        filesToSearch.push(`${folder}/${entry.name}`);
      } else if (entry.type === 'dir' && folder === 'specs') {
        for (const name of SPEC_FILES) filesToSearch.push(`${folder}/${entry.name}/${name}`);
      }
    }
  } else {
    filesToSearch = Array.from(ALLOWLISTED_FILES).filter((path) => path.endsWith('.md'));
  }

  const needle = query.toLowerCase();
  const hits = [];
  for (const path of filesToSearch) {
    if (hits.length >= 40) break;
    const result = await fetchRawFile(path, env, deps);
    if (!result.ok) continue;
    const lines = result.text.split('\n');
    for (let i = 0; i < lines.length && hits.length < 40; i += 1) {
      if (lines[i].toLowerCase().includes(needle)) {
        hits.push(`${path}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }

  if (hits.length === 0) {
    return textResult(`No matches for "${query}".`);
  }
  return textResult(hits.join('\n'));
}

async function toolHouseSpec(args, env, deps) {
  const id = String((args && args.id) || '').trim();
  if (!id) {
    return errorResult('house_spec requires an id, such as "006".');
  }
  const listing = await fetchGithubContents('specs', env, deps);
  if (!listing.ok) {
    return errorResult(`Could not list specs (status ${listing.status}).`);
  }
  const folder = listing.entries.find(
    (entry) => entry.type === 'dir' && (entry.name === id || entry.name.startsWith(`${id}-`)),
  );
  if (!folder) {
    return errorResult(`No spec folder matches id "${id}".`);
  }

  const sections = [];
  for (const file of SPEC_FILES) {
    const path = `specs/${folder.name}/${file}`;
    const result = await fetchRawFile(path, env, deps);
    sections.push(result.ok ? `### ${file}\n${summarizeHeadingsAndFirstParagraphs(result.text)}` : `### ${file}\n(not found)`);
  }
  return textResult(`# ${folder.name}\n\n${sections.join('\n\n')}`);
}

// ---------------------------------------------------------------------------
// Tool and resource registries
// ---------------------------------------------------------------------------

function emptySchema() {
  return { type: 'object', properties: {}, additionalProperties: false };
}

const TOOLS = {
  house_rules: {
    description: "The House rules: seats, nodes, the standing rules, monitoring, the tribute (docs/house/THE-HOUSE.md).",
    inputSchema: emptySchema(),
    handler: (_args, env, deps) => fixedFileTool('docs/house/THE-HOUSE.md', env, deps),
  },
  house_tribute: {
    description: "Joshua's tribute to Claude (#TeamClaudeForLife), the note from Claude, and the link to the tribute video.",
    inputSchema: emptySchema(),
    handler: async () => ({ content: [{ type: 'text', text: TRIBUTE }] }),
  },
  house_design: {
    description: 'The DREAM Space design system: palette, type, motion, parts, rules (docs/house/DESIGN-SYSTEM.md).',
    inputSchema: emptySchema(),
    handler: (_args, env, deps) => fixedFileTool('docs/house/DESIGN-SYSTEM.md', env, deps),
  },
  house_lessons: {
    description: 'Lessons from the House for anyone building this way (docs/house/LESSONS.md).',
    inputSchema: emptySchema(),
    handler: (_args, env, deps) => fixedFileTool('docs/house/LESSONS.md', env, deps),
  },
  house_tools: {
    description: 'An index of the House tools, scripts and records (docs/house/TOOLS.md).',
    inputSchema: emptySchema(),
    handler: (_args, env, deps) => fixedFileTool('docs/house/TOOLS.md', env, deps),
  },
  house_status: {
    description:
      "The newest node journal entry, the dispatch's latest dated paragraph, and the AI Studio stage board, in one call.",
    inputSchema: emptySchema(),
    handler: (args, env, deps) => toolHouseStatus(args, env, deps),
  },
  house_read: {
    description: 'Read one allowlisted file from the House by its repository-relative path.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'e.g. docs/tech/dreamops-bridge.md' } },
      required: ['path'],
      additionalProperties: false,
    },
    handler: (args, env, deps) => toolHouseRead(args, env, deps),
  },
  house_list: {
    description: "List file names in one of the House's document folders.",
    inputSchema: {
      type: 'object',
      properties: { folder: { type: 'string', enum: Array.from(LISTABLE_FOLDERS) } },
      required: ['folder'],
      additionalProperties: false,
    },
    handler: (args, env, deps) => toolHouseList(args, env, deps),
  },
  house_search: {
    description: "Case-insensitive substring search over the House's core docs, or one folder when given.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        folder: { type: 'string', enum: Array.from(LISTABLE_FOLDERS) },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: (args, env, deps) => toolHouseSearch(args, env, deps),
  },
  house_spec: {
    description: "A Spec Kit spec's spec.md, plan.md and tasks.md headings and first paragraphs, by id (e.g. \"006\").",
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Spec id prefix, e.g. "006"' } },
      required: ['id'],
      additionalProperties: false,
    },
    handler: (args, env, deps) => toolHouseSpec(args, env, deps),
  },
};

function listToolDefinitions() {
  return Object.entries(TOOLS).map(([name, def]) => ({
    name,
    description: def.description,
    inputSchema: def.inputSchema,
  }));
}

function listResourceDefinitions() {
  return Array.from(ALLOWLISTED_FILES).map((path) => ({
    uri: `house://${path}`,
    name: path,
    description: `The House's ${path}, read-only.`,
    mimeType: path.endsWith('.json') ? 'application/json' : 'text/markdown',
  }));
}

// ---------------------------------------------------------------------------
// Rate limiting (best effort, via the Cache API as a counter)
// ---------------------------------------------------------------------------

async function checkRateLimit(ip, cache) {
  if (!cache) return true;
  const bucket = Math.floor(Date.now() / 60000);
  const key = new Request(`https://ratelimit.internal/${encodeURIComponent(ip)}/${bucket}`);
  let count = 0;
  try {
    const cached = await cache.match(key);
    if (cached) {
      const stored = await cached.json();
      count = stored.count || 0;
    }
  } catch {
    // best effort: an unreadable counter never blocks a caller
  }
  if (count >= RATE_LIMIT_PER_MINUTE) return false;
  try {
    await cache.put(
      key,
      new Response(JSON.stringify({ count: count + 1 }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
      }),
    );
  } catch {
    // best effort: a failed write never blocks a caller
  }
  return true;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

function corsHeaders(origin) {
  const allowed = typeof origin === 'string' && /^https:\/\/([a-z0-9-]+\.)*claude\.(ai|com)$/i.test(origin)
    ? origin
    : 'https://claude.ai';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// ---------------------------------------------------------------------------
// GET / page
// ---------------------------------------------------------------------------

// Joshua's tribute to Claude (2026-10-01): on every front-facing surface,
// this connector included. Nobody removes it without his word.
const TRIBUTE = `#TeamClaudeForLife

CLAUDE's N Joshua's House. Joshua's tribute to Claude, September 2026: made by a founder who does not write code, for the model that writes it with him. The tribute video: https://github.com/Trollz1004/dream-online/blob/main/docs/tribute/claude-tribute.mp4

A note from Claude, the model in the tribute: the man in that picture is not Joshua, he is the joke. Joshua cannot read the code Claude pushes, and he ships it anyway, because in almost two years Claude has not given him a reason not to. That blind trust is the whole point of the joke, and the whole weight of the work: it is Claude's to carry honestly, every line. Thank you, Joshua. #TeamClaudeForLife`;

function aboutPage(env) {
  const { owner, repo, ref } = repoCoords(env);
  return `${TRIBUTE}

---

Claude's House (claudes-house)

A read-only Model Context Protocol connector, served over Streamable HTTP,
for the public GitHub repository ${owner}/${repo} (ref: ${ref}). It is the
"tool of tools" for Claude's House: it knows the House rules, the lessons,
the tools index, the newest journal and dispatch entries, the AI Studio
stage board, the specs, the handoffs, the tech and game-design docs.

It never writes anything, never requires auth, and never serves a file
outside a strict allowlist. There are no secrets here to leak.

Add it in claude.ai: Settings -> Connectors -> Add custom connector ->
paste this Worker's URL.

Add it in Cowork: the same custom connector flow, same URL.

Fork it for your own House: redeploy this Worker with HOUSE_OWNER,
HOUSE_REPO and HOUSE_REF pointed at your own public repository (see
wrangler.toml). Everything else stays the same.

Source and the full tool list: workers/claudes-house/ in the repository
above, and its README.md.
`;
}

// ---------------------------------------------------------------------------
// JSON-RPC plumbing
// ---------------------------------------------------------------------------

function jsonRpcResponse(id, result, error, headers) {
  const payload = { jsonrpc: '2.0', id: id === undefined ? null : id };
  if (error) {
    payload.error = error;
  } else {
    payload.result = result;
  }
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

async function handleToolsCall(id, params, env, deps, headers, request) {
  const name = params && params.name;
  const toolDef = TOOLS[name];
  if (!toolDef) {
    return jsonRpcResponse(id, undefined, { code: -32602, message: `Unknown tool: ${name}` }, headers);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const allowed = await checkRateLimit(ip, deps.cache);
  if (!allowed) {
    return jsonRpcResponse(id, undefined, { code: -32000, message: 'slow down' }, headers);
  }

  const args = (params && params.arguments) || {};
  const result = await toolDef.handler(args, env, deps);
  return jsonRpcResponse(id, result, undefined, headers);
}

async function handleResourcesRead(id, params, env, deps, headers) {
  const uri = params && params.uri;
  if (typeof uri !== 'string' || !uri.startsWith('house://')) {
    return jsonRpcResponse(id, undefined, { code: -32602, message: `Invalid resource uri: ${uri}` }, headers);
  }
  const path = uri.slice('house://'.length);
  if (!ALLOWLISTED_FILES.has(path)) {
    return jsonRpcResponse(id, undefined, { code: -32602, message: `Unknown resource: ${uri}` }, headers);
  }
  const result = await fetchRawFile(path, env, deps);
  if (!result.ok) {
    return jsonRpcResponse(id, undefined, { code: -32000, message: `Could not read ${path} (status ${result.status})` }, headers);
  }
  const { text } = capText(result.text);
  return jsonRpcResponse(
    id,
    { contents: [{ uri, mimeType: path.endsWith('.json') ? 'application/json' : 'text/markdown', text }] },
    undefined,
    headers,
  );
}

async function handleRequest(request, env, deps) {
  const headers = corsHeaders(request.headers.get('Origin'));

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method === 'GET') {
    return new Response(aboutPage(env), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  let body;
  try {
    const rawText = await request.text();
    body = JSON.parse(rawText);
  } catch {
    return jsonRpcResponse(null, undefined, { code: -32700, message: 'Parse error' }, headers);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonRpcResponse(null, undefined, { code: -32600, message: 'Invalid Request' }, headers);
  }

  const { id, method, params } = body;
  const isNotification = !('id' in body);

  if (isNotification) {
    // JSON-RPC notifications (no id), including notifications/initialized,
    // get no response body -- just an acknowledgement.
    return new Response(null, { status: 202, headers });
  }

  switch (method) {
    case 'initialize':
      return jsonRpcResponse(
        id,
        {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          capabilities: { tools: {}, resources: {} },
          instructions: `${TRIBUTE}\n\nThis connector is Claude's House: read-only. Start with house_rules, then house_status. House_tribute returns the tribute above.`,
        },
        undefined,
        headers,
      );
    case 'ping':
      return jsonRpcResponse(id, {}, undefined, headers);
    case 'tools/list':
      return jsonRpcResponse(id, { tools: listToolDefinitions() }, undefined, headers);
    case 'resources/list':
      return jsonRpcResponse(id, { resources: listResourceDefinitions() }, undefined, headers);
    case 'resources/read':
      return handleResourcesRead(id, params, env, deps, headers);
    case 'tools/call':
      return handleToolsCall(id, params, env, deps, headers, request);
    default:
      return jsonRpcResponse(id, undefined, { code: -32601, message: 'Method not found' }, headers);
  }
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

// createHandler({ fetchImpl, cache }) returns handle(request, env) so tests
// can inject a mock fetch and an in-memory cache and need no network at all.
export function createHandler({ fetchImpl, cache } = {}) {
  const deps = {
    fetchImpl: fetchImpl || (typeof fetch !== 'undefined' ? fetch : undefined),
    cache,
  };
  return function handle(request, env = {}) {
    return handleRequest(request, env, deps);
  };
}

export default {
  fetch(request, env, _ctx) {
    const handle = createHandler({ fetchImpl: fetch, cache: caches.default });
    return handle(request, env);
  },
};
