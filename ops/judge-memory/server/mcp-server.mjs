#!/usr/bin/env node
/**
 * Section 6: Local stdio MCP server for judge-memory retrieval.
 *
 * Exposes three progressive retrieval tools over JSON-RPC 2.0 stdio:
 * - search: full-text over everything (FTS5), returns ids and one line each
 * - timeline: what happened around a date or a PR
 * - get: full observations/records by id
 *
 * Checks the signed-in Claude Code session marker before opening the store;
 * does nothing when the marker is absent or a wrapper is detected.
 */

import { resolve } from 'node:path';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';
import {
  JudgeMemoryStore,
  verifyJudgeSessionMarker,
} from '../store/index.ts';

export const MCP_TOOLS = Object.freeze([
  {
    name: 'search',
    description:
      'Full-text search over everything in judge-memory (observations, verdicts, rulings, lane_facts, sessions). Returns ids and one line each.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Full-text search query.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of hits to return (default 20).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'timeline',
    description:
      'Chronological timeline of what happened around a date (YYYY-MM-DD or ISO timestamp) or a pull request number.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date (YYYY-MM-DD) or ISO timestamp to inspect around.',
        },
        pr: {
          type: 'number',
          description: 'Pull request number to inspect.',
        },
        repo: {
          type: 'string',
          description: 'Optional repository slug (e.g. Trollz1004/dream-online).',
        },
        windowHours: {
          type: 'number',
          description: 'Hours before and after the target date (default 24).',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of timeline entries (default 50).',
        },
      },
    },
  },
  {
    name: 'get',
    description:
      'Fetch full observations or records by id (e.g. [1, 2] or ["obs:1", "verdict:2", "ruling:1"]). Use after search or timeline.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: {
            anyOf: [{ type: 'number' }, { type: 'string' }],
          },
          description: 'List of observation or record IDs returned by search or timeline.',
        },
      },
      required: ['ids'],
    },
  },
]);

/**
 * Handles a single MCP JSON-RPC 2.0 message.
 * Never opens the SQLite store if the session marker check fails.
 *
 * @param {Record<string, unknown>} request
 * @param {{ env?: NodeJS.ProcessEnv, dbPath?: string, storeDir?: string, extraSecrets?: string[] }} [options]
 */
export function handleMcpJsonRpcRequest(request, options = {}) {
  const env = options.env ?? process.env;
  const markerCheck = verifyJudgeSessionMarker(env);
  const id = request?.id ?? null;
  const method = typeof request?.method === 'string' ? request.method : '';

  if (!markerCheck.allowed) {
    if (id === null || method.startsWith('notifications/')) {
      return null;
    }
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32001,
        message: 'Locked out: judge-memory is available only to the signed-in Claude Code judge lane.',
      },
    };
  }

  if (method.startsWith('notifications/')) {
    return null;
  }

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'dream-judge-memory',
          version: '1.0.0',
        },
      },
    };
  }

  if (method === 'ping') {
    return {
      jsonrpc: '2.0',
      id,
      result: {},
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS,
      },
    };
  }

  if (method === 'tools/call') {
    const params =
      request?.params && typeof request.params === 'object'
        ? /** @type {Record<string, unknown>} */ (request.params)
        : {};
    const toolName = typeof params.name === 'string' ? params.name : '';
    const args =
      params.arguments && typeof params.arguments === 'object'
        ? /** @type {Record<string, unknown>} */ (params.arguments)
        : {};

    const store = new JudgeMemoryStore({
      dbPath: options.dbPath,
      storeDir: options.storeDir,
      env,
      extraSecrets: options.extraSecrets,
    });

    try {
      if (toolName === 'search') {
        const query = typeof args.query === 'string' ? args.query : '';
        const limit = typeof args.limit === 'number' ? args.limit : 20;
        const hits = store.search(query, limit).map((h) => ({
          id: h.id,
          one_line: h.one_line,
        }));
        const textLines =
          hits.length > 0
            ? hits.map((h) => h.one_line).join('\n')
            : 'No matches found.';
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: textLines }],
            structuredContent: { hits },
          },
        };
      }

      if (toolName === 'timeline') {
        const entries = store.timeline({
          date: typeof args.date === 'string' ? args.date : undefined,
          pr: typeof args.pr === 'number' ? args.pr : undefined,
          repo: typeof args.repo === 'string' ? args.repo : undefined,
          windowHours: typeof args.windowHours === 'number' ? args.windowHours : undefined,
          limit: typeof args.limit === 'number' ? args.limit : undefined,
        });
        const textLines =
          entries.length > 0
            ? entries.map((e) => e.one_line).join('\n')
            : 'No timeline entries found.';
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: textLines }],
            structuredContent: { entries },
          },
        };
      }

      if (toolName === 'get') {
        const rawIds = Array.isArray(args.ids)
          ? args.ids
          : args.id !== undefined
            ? [args.id]
            : [];
        const records = store.get(rawIds);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(records, null, 2) }],
            structuredContent: { records },
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Unknown judge-memory tool: ${toolName}`,
        },
      };
    } finally {
      store.close();
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`,
    },
  };
}

/**
 * Starts the stdio MCP loop when invoked as a CLI server.
 */
export function startStdioMcpServer(options = {}) {
  const env = options.env ?? process.env;
  const markerCheck = verifyJudgeSessionMarker(env);
  if (!markerCheck.allowed) {
    // Do nothing and exit cleanly when session marker is absent so wrappers never load it.
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Content-Length:')) return;
    try {
      const parsed = JSON.parse(trimmed);
      const response = handleMcpJsonRpcRequest(parsed, options);
      if (response) {
        process.stdout.write(`${JSON.stringify(response)}\n`);
      }
    } catch {
      // Ignore malformed lines
    }
  });
}

const isCli =
  Boolean(process.argv[1]) &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  startStdioMcpServer();
}
