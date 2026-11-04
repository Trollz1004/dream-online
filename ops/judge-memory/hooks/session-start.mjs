#!/usr/bin/env node
/**
 * Section 2 & 5 Hook: SessionStart
 *
 * Small Node script with no network.
 * Checks the signed-in Claude Code session marker first; does nothing and writes nothing when absent.
 * Opens the local SQLite store, records the active session, and emits the budgeted SessionStart brief
 * (<= 1,500 tokens ceiling).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildSessionStartBrief,
  JudgeMemoryStore,
  verifyJudgeSessionMarker,
} from '../store/index.ts';

/**
 * Runs the SessionStart hook logic.
 * @param {Record<string, unknown>} payload
 * @param {{ env?: NodeJS.ProcessEnv, dbPath?: string, storeDir?: string, budgetTokens?: number }} [options]
 */
export function runSessionStartHook(payload = {}, options = {}) {
  const env = options.env ?? process.env;
  const markerCheck = verifyJudgeSessionMarker(env, payload);
  if (!markerCheck.allowed) {
    return {
      lockedOut: true,
      reason: markerCheck.reason,
      brief: '',
      tokenCount: 0,
    };
  }

  const sessionId =
    (typeof payload.session_id === 'string' && payload.session_id.trim()) ||
    (typeof payload.sessionId === 'string' && payload.sessionId.trim()) ||
    env.CLAUDE_SESSION_ID ||
    `judge-session-${Date.now()}`;

  const node =
    (typeof payload.node === 'string' && payload.node.trim()) ||
    env.COMPUTERNAME ||
    'Alienware';

  const store = new JudgeMemoryStore({
    dbPath: options.dbPath,
    storeDir: options.storeDir,
    env,
  });

  try {
    store.startSession({
      session_id: sessionId,
      node,
      started_at: typeof payload.started_at === 'string' ? payload.started_at : undefined,
    });

    const requestedBudget =
      typeof options.budgetTokens === 'number'
        ? options.budgetTokens
        : typeof payload.budget_tokens === 'number'
          ? payload.budget_tokens
          : undefined;

    const briefResult = buildSessionStartBrief(store, {
      budgetTokens: requestedBudget,
      currentSessionId: sessionId,
      env,
    });

    return {
      lockedOut: false,
      sessionId,
      brief: briefResult.brief,
      tokenCount: briefResult.tokenCount,
      effectiveBudget: briefResult.effectiveBudget,
      ceilingApplied: briefResult.ceilingApplied,
    };
  } finally {
    store.close();
  }
}

function readStdinJson() {
  try {
    const raw = readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const isCli =
  Boolean(process.argv[1]) &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  const payload = readStdinJson();
  const result = runSessionStartHook(payload);
  if (!result.lockedOut && result.brief) {
    process.stdout.write(`${result.brief}\n`);
  }
}
