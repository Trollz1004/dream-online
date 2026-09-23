// Tests for the DREAM brain: memory file, recall, remember, session hooks, MCP server.
// Run: node --test ops/node/brain/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dream-brain-'));
  const vault = path.join(root, 'vault');
  const graph = path.join(vault, 'memory-graph');
  const auto = path.join(root, 'auto');
  const state = path.join(root, 'state');
  fs.mkdirSync(graph, { recursive: true });
  fs.mkdirSync(auto, { recursive: true });
  fs.writeFileSync(path.join(graph, 'Memory hub.md'), '# Memory hub\n\n## Remembered\n');
  fs.writeFileSync(path.join(auto, 'godot-note.md'), 'Godot 4.7.2 is the engine.\nUnrelated line.\n');
  const env = {
    DREAM_BRAIN_VAULT: vault,
    DREAM_BRAIN_AUTOMEMORY: auto,
    DREAM_BRAIN_STATE: state,
    DREAM_BRAIN_REPO: root, // not a git repo: git facts must degrade, not throw
    DREAM_BRAIN_HEALTH: path.join(root, 'missing-health.json'),
  };
  return { root, vault, graph, auto, state, env };
}

async function core(env) {
  Object.assign(process.env, env);
  const mod = await import(`./brain-core.mjs?${Math.random()}`);
  return mod;
}

test('session memory: appending an entry creates the file and reads back newest first', async () => {
  const s = sandbox();
  const b = await core(s.env);
  b.appendSession({ title: 'first', lines: ['did a'] });
  b.appendSession({ title: 'second', lines: ['did b'] });
  const recent = b.recentSessions(1);
  assert.equal(recent.length, 1);
  assert.match(recent[0], /second/);
  assert.match(fs.readFileSync(b.paths().memoryFile, 'utf8'), /\[\[Memory hub\]\]/);
});

test('recall finds lines across the vault graph and the auto-memory, ranked by term hits', async () => {
  const s = sandbox();
  const b = await core(s.env);
  fs.writeFileSync(path.join(s.graph, 'combat.md'), 'Godot combat uses a dash.\nGodot engine note.\n');
  const hits = b.recall('godot engine');
  assert.ok(hits.length >= 2);
  assert.match(hits[0].line, /engine/i);
  assert.ok(hits.some((h) => h.file.endsWith('godot-note.md')));
  assert.deepEqual(b.recall('zzzz-nothing'), []);
});

test('remember writes a linked note and lists it on the hub; refuses to overwrite', async () => {
  const s = sandbox();
  const b = await core(s.env);
  const file = b.remember({ title: 'Sprint chord ruling', text: 'Sprint is a double tap.', tags: ['combat'] });
  const body = fs.readFileSync(file, 'utf8');
  assert.match(body, /\[\[Memory hub\]\]/);
  assert.match(body, /tags: \[memory, combat\]/);
  assert.match(fs.readFileSync(path.join(s.graph, 'Memory hub.md'), 'utf8'), /\[\[Sprint chord ruling\]\]/);
  assert.throws(() => b.remember({ title: 'Sprint chord ruling', text: 'again' }), /exists/);
  assert.throws(() => b.remember({ title: '../escape', text: 'x' }), /title/);
});

test('boot card names the core skills and the last session', async () => {
  const s = sandbox();
  const b = await core(s.env);
  b.appendSession({ title: 'earlier', lines: ['merged spec 002'] });
  const card = b.bootCard();
  for (const skill of ['find-skills', 'skill-creator', 'dream-research', 'game-development', 'claude-obsidian', 'superpowers', 'comfyui', 'brain_session_end']) {
    assert.match(card, new RegExp(skill));
  }
  assert.match(card, /merged spec 002/);
  assert.ok(card.length < 6000, `boot card too long: ${card.length}`);
});

function runHook(env, arg, stdin) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(here, 'brain-hook.mjs'), arg], { env: { ...process.env, ...env } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
    p.stdin.end(stdin);
  });
}

test('start hook prints SessionStart context; end hook records the session', async () => {
  const s = sandbox();
  const start = await runHook(s.env, 'start', JSON.stringify({ session_id: 'abc', cwd: s.root, source: 'startup' }));
  assert.equal(start.code, 0);
  const json = JSON.parse(start.out);
  assert.equal(json.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(json.hookSpecificOutput.additionalContext, /find-skills/);
  const end = await runHook(s.env, 'end', JSON.stringify({ session_id: 'abc', cwd: s.root, reason: 'logout' }));
  assert.equal(end.code, 0);
  const mem = fs.readFileSync(path.join(s.graph, 'Session memory.md'), 'utf8');
  assert.match(mem, /session abc ended \(logout\)/);
});

test('start hook accepts input that begins with a byte-order mark', async () => {
  const s = sandbox();
  await runHook(s.env, 'start', '﻿' + JSON.stringify({ session_id: 'bom', cwd: s.root, source: 'startup' }));
  assert.ok(fs.existsSync(path.join(s.state, 'sessions', 'bom.json')));
});

test('end hook never fails the session, even on bad input', async () => {
  const s = sandbox();
  const r = await runHook(s.env, 'end', 'not json');
  assert.equal(r.code, 0);
});

function rpc(env, messages) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(here, 'brain-mcp.mjs')], { env: { ...process.env, ...env } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', () => resolve(out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))));
    for (const m of messages) p.stdin.write(JSON.stringify(m) + '\n');
    p.stdin.end();
  });
}

test('MCP server: initialize, list tools, call recall and session_end', async () => {
  const s = sandbox();
  const replies = await rpc(s.env, [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'brain_recall', arguments: { query: 'godot' } } },
    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'brain_session_end', arguments: { summary: 'built the brain', next: ['wire hooks'] } } },
    { jsonrpc: '2.0', id: 5, method: 'nope' },
  ]);
  const byId = Object.fromEntries(replies.map((r) => [r.id, r]));
  assert.equal(replies.length, 5, 'notification must get no reply');
  assert.equal(byId[1].result.serverInfo.name, 'dream-brain');
  const names = byId[2].result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ['brain_boot', 'brain_recall', 'brain_remember', 'brain_session_end']);
  assert.match(byId[3].result.content[0].text, /Godot 4.7.2/);
  assert.match(fs.readFileSync(path.join(s.graph, 'Session memory.md'), 'utf8'), /built the brain/);
  assert.equal(byId[5].error.code, -32601);
});
