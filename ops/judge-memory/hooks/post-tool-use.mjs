#!/usr/bin/env node
/**
 * Section 2 & 3 Hook: PostToolUse
 *
 * Small Node script with no network.
 * Checks the signed-in Claude Code session marker first; does nothing and writes nothing when absent.
 * Records one rules-compressed observation per meaningful tool call:
 * the tool, the target (with %USERPROFILE% / %LOCALAPPDATA% normalization, repo#PR, or node name),
 * and the one-line outcome. Also populates verdicts and lane_facts when applicable.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  compressToolUseToObservation,
  JudgeMemoryStore,
  verifyJudgeSessionMarker,
} from '../store/index.ts';

/**
 * Runs the PostToolUse hook logic.
 * @param {Record<string, unknown>} payload
 * @param {{ env?: NodeJS.ProcessEnv, dbPath?: string, storeDir?: string, extraSecrets?: string[] }} [options]
 */
export function runPostToolUseHook(payload = {}, options = {}) {
  const env = options.env ?? process.env;
  const markerCheck = verifyJudgeSessionMarker(env, payload);
  if (!markerCheck.allowed) {
    return {
      lockedOut: true,
      reason: markerCheck.reason,
      recorded: false,
      observation: null,
    };
  }

  const compressed = compressToolUseToObservation(payload, {
    defaultNode: env.COMPUTERNAME || 'Alienware',
    extraSecrets: options.extraSecrets,
  });

  if (compressed.skipped || !compressed.observation) {
    return {
      lockedOut: false,
      recorded: false,
      skipped: true,
      skipReason: compressed.skipReason || 'Skipped tool call.',
      deniedCategory: compressed.deniedCategory ?? null,
      observation: null,
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
    const obsRecord = store.recordObservation({
      session_id: sessionId,
      kind: compressed.observation.kind,
      tool: compressed.observation.tool,
      target: compressed.observation.target,
      outcome: compressed.observation.outcome,
      pr_number: compressed.observation.pr_number,
      repo: compressed.observation.repo,
      node: compressed.observation.node,
      created_at: typeof payload.created_at === 'string' ? payload.created_at : undefined,
    });

    let verdictRecord = null;
    if (compressed.verdictRecord) {
      verdictRecord = store.recordVerdict({
        session_id: sessionId,
        ...compressed.verdictRecord,
        created_at: typeof payload.created_at === 'string' ? payload.created_at : undefined,
      });
    }

    let laneFactRecord = null;
    if (compressed.laneFactRecord) {
      laneFactRecord = store.recordLaneFact({
        session_id: sessionId,
        ...compressed.laneFactRecord,
        created_at: typeof payload.created_at === 'string' ? payload.created_at : undefined,
      });
    }

    return {
      lockedOut: false,
      recorded: Boolean(obsRecord),
      skipped: !obsRecord,
      observation: obsRecord,
      verdict: verdictRecord,
      laneFact: laneFactRecord,
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
  runPostToolUseHook(payload);
}
