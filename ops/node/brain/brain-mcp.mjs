// DREAM brain MCP server: newline-delimited JSON-RPC over stdio, zero dependencies.
// Tools: brain_boot, brain_recall, brain_remember, brain_session_end.
import readline from 'node:readline';
import * as brain from './brain-core.mjs';

const TOOLS = [
  {
    name: 'brain_boot',
    description: 'The DREAM boot card: which skill to use for what, node health, repo state and the last two sessions. Call after a context loss.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'brain_recall',
    description: 'Search the Obsidian memory graph, the vault wiki and Claude auto-memory for lines matching the words in query. Use before re-deriving anything.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
  },
  {
    name: 'brain_remember',
    description: 'Save one durable fact as a new note in the vault memory graph, linked from the Memory hub. Fails if the title exists.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, text: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } },
      required: ['title', 'text'],
    },
  },
  {
    name: 'brain_session_end',
    description: 'Record what this session did, decided and leaves next in Session memory. Call before stopping after real work.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        decisions: { type: 'array', items: { type: 'string' } },
        next: { type: 'array', items: { type: 'string' } },
      },
      required: ['summary'],
    },
  },
];

function call(name, args = {}) {
  switch (name) {
    case 'brain_boot':
      return brain.bootCard();
    case 'brain_recall': {
      const hits = brain.recall(args.query, args.limit || 20);
      return hits.length ? hits.map((h) => `${h.file}:${h.lineNo}: ${h.line}`).join('\n') : 'no matches';
    }
    case 'brain_remember':
      return `saved ${brain.remember(args)}`;
    case 'brain_session_end': {
      const lines = [args.summary, ...(args.decisions || []).map((d) => `decided: ${d}`), ...(args.next || []).map((n) => `next: ${n}`)];
      return `recorded in ${brain.appendSession({ title: 'session record', lines })}`;
    }
    default:
      throw Object.assign(new Error(`unknown tool ${name}`), { rpc: -32602 });
  }
}

function handle(msg) {
  const { id, method, params = {} } = msg;
  if (id === undefined) return null; // notifications get no reply
  switch (method) {
    case 'initialize':
      return { protocolVersion: params.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'dream-brain', version: '1.0.0' } };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS };
    case 'tools/call':
      try {
        return { content: [{ type: 'text', text: call(params.name, params.arguments) }] };
      } catch (err) {
        if (err.rpc) throw err;
        return { content: [{ type: 'text', text: `error: ${err.message}` }], isError: true };
      }
    default:
      throw Object.assign(new Error(`method not found: ${method}`), { rpc: -32601 });
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  line = line.replace(/^﻿/, '');
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }) + '\n');
    return;
  }
  try {
    const result = handle(msg);
    if (result !== null) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: err.rpc || -32603, message: err.message } }) + '\n');
  }
});
