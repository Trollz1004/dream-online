#!/usr/bin/env node
/**
 * Section 2 Hook: SessionEnd
 *
 * Small Node script with no network.
 * Checks the signed-in Claude Code session marker first; does nothing and writes nothing when absent.
 * Writes the caveman Obsidian note required by AGENT-STANDARD.md section 5 directly from the
 * session's recorded observations and Stop summary so the note and the memory never disagree.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  JudgeMemoryStore,
  verifyJudgeSessionMarker,
  writeSessionEndObsidianNote,
} from '../store/index.ts';

/**
 * Runs the SessionEnd hook logic.
 * @param {Record<string, unknown>} payload
 * @param {{ env?: NodeJS.ProcessEnv, dbPath?: string, storeDir?: string, obsidianDir?: string, now?: Date, extraSecrets?: string[] }} [options]
 */
export function runSessionEndHook(payload = {}, options = {}) {
  const env = options.env ?? process.env;
  const markerCheck = verifyJudgeSessionMarker(env, payload);
  if (!markerCheck.allowed) {
    return {
      lockedOut: true,
      reason: markerCheck.reason,
      note: null,
    };
  }

  const sessionId =
    (typeof payload.session_id === 'string' && payload.session_id.trim()) ||
    (typeof payload.sessionId === 'string' && payload.sessionId.trim()) ||
    env.CLAUDE_SESSION_ID ||
    'session-default';

  const store = new JudgeMemoryStore({
    dbPath: options.dbPath,
    storeDir: options.storeDir,
    env,
    extraSecrets: options.extraSecrets,
  });

  try {
    const note = writeSessionEndObsidianNote(store, {
      sessionId,
      node: typeof payload.node === 'string' ? payload.node : undefined,
      agent: typeof payload.agent === 'string' ? payload.agent : 'fable',
      obsidianDir:
        options.obsidianDir ||
        (typeof payload.obsidian_dir === 'string' ? payload.obsidian_dir : undefined),
      now: options.now,
      env,
      extraSecrets: options.extraSecrets,
    });

    return {
      lockedOut: false,
      sessionId,
      note,
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
  runSessionEndHook(payload);
}
