// Tests for the Claude's House MCP connector worker.
//
// No network calls: fetchImpl and cache are mocked in-memory and injected
// through createHandler({ fetchImpl, cache }), exactly as the worker exports it.
//
// RED first: this file was written before src/worker.mjs existed, so the
// import below failed and every test failed with it. GREEN: src/worker.mjs
// now implements createHandler and the default export.

import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { createHandler } from '../src/worker.mjs';

const OWNER = 'Trollz1004';
const REPO = 'dream-online';
const REF = 'main';
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${REF}/`;

const BIG_DOC = 'X'.repeat(70000);

// Fixture content for the raw-file fetches the worker is expected to make.
const FILES = {
  'docs/house/THE-HOUSE.md': '# The House\n\nSeats, nodes and the standing rules.\n',
  'docs/house/LESSONS.md': '# Lessons from the House\n\n1. Put it on screen first.\n',
  'docs/house/TOOLS.md': '# The tools of the House\n\nAn index.\n',
  'AGENTS.md': '# Agents\n\nzzzsearchtoken lives in this file.\n',
  'ops/node/JOURNAL.md':
    '# Alienware node journal\n\nIntro text, not an entry.\n\n' +
    '## 2026-10-01 newest entry\n\nDid stuff today.\n\n' +
    '## 2026-09-30 older entry\n\nOlder stuff, should not appear.\n',
  'docs/DREAM-DISPATCH.md':
    '# DREAM Dispatch\n\nLast updated: 2026-10-01\n\n' +
    '**2026-10-01 entry.** Something happened today.\n\n' +
    '**2026-09-30 entry.** Something else happened yesterday, should not appear.\n',
  'docs/tech/engine-decision-2026-09-30-own-engine.md': '# Engine decision\n\nfindme token lives here.\n',
  'docs/gdd/00-vision.md': BIG_DOC,
  'specs/006-mission-control-jarvis/spec.md': '# Spec\n\nGoal paragraph text.\n\n## Design\n\nDesign paragraph text.\n',
  'specs/006-mission-control-jarvis/plan.md': '# Plan\n\nPlan paragraph text.\n',
  'specs/006-mission-control-jarvis/tasks.md': '# Tasks\n\nTasks paragraph text.\n',
};

function jsonResponse(body, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

function mockFetch(input) {
  const url = typeof input === 'string' ? input : input.url;

  if (url.startsWith('https://api.github.com/repos/')) {
    if (url.includes('/contents/docs%2Ftech') || url.includes('/contents/docs/tech')) {
      return jsonResponse([{ name: 'engine-decision-2026-09-30-own-engine.md', type: 'file' }]);
    }
    if (url.includes('/contents/specs')) {
      return jsonResponse([{ name: '006-mission-control-jarvis', type: 'dir' }]);
    }
    return jsonResponse([]);
  }

  for (const [path, content] of Object.entries(FILES)) {
    if (url === RAW + path) {
      return Promise.resolve(new Response(content, { status: 200 }));
    }
  }

  return Promise.resolve(new Response('not found', { status: 404 }));
}

function makeCache() {
  const store = new Map();
  return {
    async match(req) {
      const key = typeof req === 'string' ? req : req.url;
      const hit = store.get(key);
      return hit ? hit.clone() : undefined;
    },
    async put(req, res) {
      const key = typeof req === 'string' ? req : req.url;
      store.set(key, res.clone());
    },
  };
}

function makeHandle() {
  return createHandler({ fetchImpl: mockFetch, cache: makeCache() });
}

function rpc(method, params, id = 1) {
  const body = { jsonrpc: '2.0', method };
  if (id !== undefined) body.id = id;
  if (params !== undefined) body.params = params;
  return new Request('https://example.test/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.5' },
    body: JSON.stringify(body),
  });
}

async function callTool(handle, env, name, args) {
  const res = await handle(rpc('tools/call', { name, arguments: args || {} }), env || {});
  const body = await res.json();
  return { res, body };
}

// ---------------------------------------------------------------------------
// Protocol basics
// ---------------------------------------------------------------------------

test('default export exposes a fetch function', () => {
  assert.equal(typeof worker.fetch, 'function');
});

test('initialize returns protocol version, server info and capabilities', async () => {
  const handle = makeHandle();
  const res = await handle(rpc('initialize', { protocolVersion: '2025-06-18' }), {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.jsonrpc, '2.0');
  assert.equal(body.result.protocolVersion, '2025-06-18');
  assert.equal(body.result.serverInfo.name, 'claudes-house');
  assert.ok(body.result.capabilities.tools);
  assert.ok(body.result.capabilities.resources);
});

test('notifications/initialized returns 202 with an empty body', async () => {
  const handle = makeHandle();
  const req = new Request('https://example.test/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
  });
  const res = await handle(req, {});
  assert.equal(res.status, 202);
  const text = await res.text();
  assert.equal(text, '');
});

test('ping returns an empty result', async () => {
  const handle = makeHandle();
  const res = await handle(rpc('ping'), {});
  const body = await res.json();
  assert.deepEqual(body.result, {});
});

test('unknown JSON-RPC method returns -32601', async () => {
  const handle = makeHandle();
  const res = await handle(rpc('not/a/real/method'), {});
  const body = await res.json();
  assert.equal(body.error.code, -32601);
});

test('malformed JSON returns -32700', async () => {
  const handle = makeHandle();
  const req = new Request('https://example.test/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ this is not json',
  });
  const res = await handle(req, {});
  const body = await res.json();
  assert.equal(body.error.code, -32700);
});

test('tools/call with an unknown tool name returns -32602', async () => {
  const handle = makeHandle();
  const res = await handle(rpc('tools/call', { name: 'house_nonexistent', arguments: {} }), {});
  const body = await res.json();
  assert.equal(body.error.code, -32602);
});

// ---------------------------------------------------------------------------
// tools/list and resources/list
// ---------------------------------------------------------------------------

test('tools/list returns all nine House tools', async () => {
  const handle = makeHandle();
  const res = await handle(rpc('tools/list'), {});
  const body = await res.json();
  const names = body.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    'house_design',
    'house_lessons',
    'house_list',
    'house_read',
    'house_rules',
    'house_search',
    'house_spec',
    'house_status',
    'house_tools',
  ]);
  for (const t of body.result.tools) {
    assert.equal(typeof t.description, 'string');
    assert.ok(t.inputSchema && t.inputSchema.type === 'object');
  }
});

test('resources/list returns one house:// resource per allowlisted file', async () => {
  const handle = makeHandle();
  const res = await handle(rpc('resources/list'), {});
  const body = await res.json();
  assert.ok(body.result.resources.length >= 10);
  for (const r of body.result.resources) {
    assert.ok(r.uri.startsWith('house://'));
  }
  const uris = body.result.resources.map((r) => r.uri);
  assert.ok(uris.includes('house://AGENTS.md'));
  assert.ok(uris.includes('house://docs/house/THE-HOUSE.md'));
});

test('resources/read returns the file for an allowlisted uri', async () => {
  const handle = makeHandle();
  const res = await handle(rpc('resources/read', { uri: 'house://AGENTS.md' }), {});
  const body = await res.json();
  assert.ok(body.result.contents[0].text.includes('zzzsearchtoken'));
});

test('resources/read rejects an unknown uri with -32602', async () => {
  const handle = makeHandle();
  const res = await handle(rpc('resources/read', { uri: 'house://not-allowlisted.md' }), {});
  const body = await res.json();
  assert.equal(body.error.code, -32602);
});

// ---------------------------------------------------------------------------
// Individual tools
// ---------------------------------------------------------------------------

test('house_rules returns THE-HOUSE.md', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_rules');
  assert.equal(body.result.isError, false);
  assert.ok(body.result.content[0].text.includes('The House'));
});

test('house_lessons returns LESSONS.md', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_lessons');
  assert.ok(body.result.content[0].text.includes('Lessons from the House'));
});

test('house_tools returns TOOLS.md', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_tools');
  assert.ok(body.result.content[0].text.includes('The tools of the House'));
});

test('house_status surfaces only the newest journal entry', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_status');
  const text = body.result.content[0].text;
  assert.ok(text.includes('Did stuff today'));
  assert.ok(!text.includes('Older stuff'));
});

test('house_status surfaces only the first dated dispatch paragraph', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_status');
  const text = body.result.content[0].text;
  assert.ok(text.includes('Something happened today'));
  assert.ok(!text.includes('Something else happened yesterday'));
});

test('house_status notes a missing stage board instead of failing', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_status');
  const text = body.result.content[0].text;
  assert.equal(body.result.isError, false);
  assert.ok(/not published|404/i.test(text));
});

test('house_read returns an allowlisted file', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_read', { path: 'AGENTS.md' });
  assert.equal(body.result.isError, false);
  assert.ok(body.result.content[0].text.includes('zzzsearchtoken'));
});

test('house_read truncates oversized files at 60000 characters', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_read', { path: 'docs/gdd/00-vision.md' });
  const text = body.result.content[0].text;
  assert.ok(text.length < BIG_DOC.length);
  assert.ok(text.includes('truncated'));
});

test('house_read rejects a path with ..', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_read', { path: '../ops/node/secret.txt' });
  assert.equal(body.result.isError, true);
});

test('house_read rejects an absolute path', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_read', { path: '/etc/passwd' });
  assert.equal(body.result.isError, true);
});

test('house_read rejects a .env path', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_read', { path: '.env' });
  assert.equal(body.result.isError, true);
});

test('house_read rejects a file outside the allowlist', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_read', { path: 'package.json' });
  assert.equal(body.result.isError, true);
});

test('house_list lists file names in an allowed folder', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_list', { folder: 'docs/tech' });
  assert.equal(body.result.isError, false);
  assert.ok(body.result.content[0].text.includes('engine-decision-2026-09-30-own-engine.md'));
});

test('house_list rejects a folder not on the list', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_list', { folder: 'docs/house' });
  assert.equal(body.result.isError, true);
});

test('house_search finds a hit in the default core docs', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_search', { query: 'zzzsearchtoken' });
  const text = body.result.content[0].text;
  assert.ok(text.includes('AGENTS.md'));
  assert.ok(text.includes('zzzsearchtoken'));
});

test('house_search finds a hit inside one named folder', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_search', { query: 'findme', folder: 'docs/tech' });
  const text = body.result.content[0].text;
  assert.ok(text.includes('docs/tech/engine-decision-2026-09-30-own-engine.md'));
});

test('house_search is case-insensitive and reports no matches plainly', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_search', { query: 'no-such-token-anywhere' });
  assert.ok(body.result.content[0].text.toLowerCase().includes('no matches'));
});

test('house_spec returns headings and first paragraphs for a known id', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_spec', { id: '006' });
  const text = body.result.content[0].text;
  assert.ok(text.includes('Design paragraph text'));
  assert.ok(text.includes('spec.md'));
  assert.ok(text.includes('plan.md'));
  assert.ok(text.includes('tasks.md'));
});

test('house_spec rejects an id with no matching folder', async () => {
  const handle = makeHandle();
  const { body } = await callTool(handle, {}, 'house_spec', { id: '999' });
  assert.equal(body.result.isError, true);
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

test('rate limit allows 60 tool calls per minute per IP and blocks the 61st', async () => {
  const handle = createHandler({ fetchImpl: mockFetch, cache: makeCache() });
  let lastBody;
  for (let i = 0; i < 61; i += 1) {
    const res = await handle(rpc('tools/call', { name: 'house_rules', arguments: {} }, 1000 + i), {});
    lastBody = await res.json();
    if (i < 60) {
      assert.equal(lastBody.error, undefined, `call ${i + 1} should not be rate limited`);
    }
  }
  assert.equal(lastBody.error.code, -32000);
});

// ---------------------------------------------------------------------------
// GET / and CORS
// ---------------------------------------------------------------------------

test('GET / returns a short plain-text description', async () => {
  const handle = makeHandle();
  const res = await handle(new Request('https://example.test/', { method: 'GET' }), {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Type') || '', /text\/plain/);
  const text = await res.text();
  assert.ok(text.includes("Claude's House"));
  assert.ok(/connector/i.test(text));
});

test('OPTIONS reflects an allowed claude.ai origin', async () => {
  const handle = makeHandle();
  const req = new Request('https://example.test/', {
    method: 'OPTIONS',
    headers: { Origin: 'https://claude.ai' },
  });
  const res = await handle(req, {});
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://claude.ai');
});

test('OPTIONS does not reflect an unrelated origin', async () => {
  const handle = makeHandle();
  const req = new Request('https://example.test/', {
    method: 'OPTIONS',
    headers: { Origin: 'https://evil.example' },
  });
  const res = await handle(req, {});
  assert.notEqual(res.headers.get('Access-Control-Allow-Origin'), 'https://evil.example');
});

// ---------------------------------------------------------------------------
// Env override (fork-for-your-own-House)
// ---------------------------------------------------------------------------

test('a forked deployment can point at a different owner/repo/ref via env', async () => {
  const forkRaw = 'https://raw.githubusercontent.com/someone-else/their-house/main/docs/house/THE-HOUSE.md';
  const handle = createHandler({
    fetchImpl: (input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === forkRaw) {
        return Promise.resolve(new Response('# Their House\n', { status: 200 }));
      }
      return mockFetch(input);
    },
    cache: makeCache(),
  });
  const { body } = await callTool(handle, { HOUSE_OWNER: 'someone-else', HOUSE_REPO: 'their-house' }, 'house_rules');
  assert.ok(body.result.content[0].text.includes('Their House'));
});
