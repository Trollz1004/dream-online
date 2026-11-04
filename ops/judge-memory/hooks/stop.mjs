#!/usr/bin/env node
/**
 * Section 2 Hook: Stop
 *
 * Small Node script with no network.
 * Checks the signed-in Claude Code session marker first; does nothing and writes nothing when absent.
 * Records the session's last reply as the judge's own summary, along with NEXT and BLOCKED lines.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  JudgeMemoryStore,
  verifyJudgeSessionMarker,
} from '../store/index.ts';

/**
 * Runs the Stop hook logic.
 * @param {Record<string, unknown>} payload
 * @param {{ env?: NodeJS.ProcessEnv, dbPath?: string, storeDir?: string, extraSecrets?: string[] }} [options]
 */
export function runStopHook(payload = {}, options = {}) {
  const env = options.env ?? process.env;
  const markerCheck = verifyJudgeSessionMarker(env, payload);
  if (!markerCheck.allowed) {
    return {
      lockedOut: true,
      reason: markerCheck.reason,
      recorded: false,
      session: null,
    };
  }

  const sessionId =
    (typeof payload.session_id === 'string' && payload.session_id.trim()) ||
    (typeof payload.sessionId === 'string' && payload.sessionId.trim()) ||
    env.CLAUDE_SESSION_ID ||
    'session-default';

  const lastReply =
    (typeof payload.last_assistant_message === 'string' && payload.last_assistant_message) ||
    (typeof payload.last_reply === 'string' && payload.last_reply) ||
    (typeof payload.reply === 'string' && payload.reply) ||
    (typeof payload.summary === 'string' && payload.summary) ||
    '';

  const nextStep =
    typeof payload.next_step === 'string'
      ? payload.next_step
      : typeof payload.next === 'string'
        ? payload.next
        : undefined;

  const blockedBy =
    typeof payload.blocked_by === 'string'
      ? payload.blocked_by
      : typeof payload.blocked === 'string'
        ? payload.blocked
        : undefined;

  const store = new JudgeMemoryStore({
    dbPath: options.dbPath,
    storeDir: options.storeDir,
    env,
    extraSecrets: options.extraSecrets,
  });

  try {
    const updatedSession = store.recordStopSummary({
      session_id: sessionId,
      last_reply: lastReply,
      next_step: nextStep,
      blocked_by: blockedBy,
      node: typeof payload.node === 'string' ? payload.node : undefined,
    });

    return {
      lockedOut: false,
      recorded: Boolean(updatedSession),
      session: updatedSession,
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
  runStopHook(payload);
}
