/**
 * Section 8: Sharing and Backup.
 *
 * - The raw store is per node and private to the judge.
 * - The nightly digest and the rulings table are pushed to the fleet memory MCP on the T5500
 *   through the address in the node env file, behind JUDGE_MEMORY_FLEET_PUSH_ENABLED which
 *   defaults to off ('false'). Other lanes read the digest there, never the raw store.
 * - Backup is a nightly copy of the SQLite file to the Personal Vault staging folder
 *   (%USERPROFILE%\VAULT-STAGING-<YYYY-MM-DD>\) Josh empties into the vault, never to the drop box.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { JudgeMemoryStore } from './database.ts';
import { normalizePortablePaths, sanitizeJudgeMemoryText } from './privacy.ts';

export const FLEET_PUSH_FLAG_ENV = 'JUDGE_MEMORY_FLEET_PUSH_ENABLED';
export const DEFAULT_FLEET_MCP_URL_ENV = 'AI_MEMORY_MCP_URL';
export const FALLBACK_FLEET_MCP_URL_ENV = 'FLEET_MEMORY_MCP_URL';

export interface FleetDigestPushOptions {
  date?: string;
  env?: NodeJS.ProcessEnv;
  urlEnvName?: string;
  fetchImpl?: typeof fetch;
  extraSecrets?: string[];
}

export interface FleetDigestPushResult {
  pushed: boolean;
  reason: string;
  date: string;
  digestLineCount: number;
  rulingsCount: number;
  statusCode?: number;
}

/**
 * Pushes only the ten-line daily digest and the rulings table to the fleet memory MCP.
 * Guarded behind JUDGE_MEMORY_FLEET_PUSH_ENABLED === 'true' (defaults off).
 * Never prints or returns the fleet MCP URL value.
 */
export async function pushDigestAndRulingsToFleetMcp(
  store: JudgeMemoryStore,
  options?: FleetDigestPushOptions
): Promise<FleetDigestPushResult> {
  const env = options?.env ?? process.env;
  const extraSecrets = options?.extraSecrets ?? [];
  const dateStr = (options?.date || new Date().toISOString().slice(0, 10)).slice(0, 10);

  const flagVal = (env[FLEET_PUSH_FLAG_ENV] || 'false').trim().toLowerCase();
  if (flagVal !== 'true') {
    return {
      pushed: false,
      reason: `Fleet memory MCP push is off by default (${FLEET_PUSH_FLAG_ENV} is not true).`,
      date: dateStr,
      digestLineCount: 0,
      rulingsCount: 0,
    };
  }

  const primaryEnvKey = options?.urlEnvName || DEFAULT_FLEET_MCP_URL_ENV;
  const rawUrl =
    (env[primaryEnvKey] && env[primaryEnvKey]!.trim()) ||
    (env[FALLBACK_FLEET_MCP_URL_ENV] && env[FALLBACK_FLEET_MCP_URL_ENV]!.trim()) ||
    '';

  if (!rawUrl) {
    return {
      pushed: false,
      reason: `Fleet memory MCP URL env variable (${primaryEnvKey}) is not set.`,
      date: dateStr,
      digestLineCount: 0,
      rulingsCount: 0,
    };
  }

  const digest = store.getDailyDigest(dateStr) ?? store.createDailyDigest(dateStr);
  const rulings = store.getNewestRulings(50).map((r) => ({
    ruled_at: sanitizeJudgeMemoryText(r.ruled_at, extraSecrets, env),
    ruling: sanitizeJudgeMemoryText(r.ruling, extraSecrets, env),
    written_in: sanitizeJudgeMemoryText(r.written_in, extraSecrets, env),
  }));

  const payload = {
    source: 'dream-judge-memory',
    scope: 'global',
    date: dateStr,
    digest: sanitizeJudgeMemoryText(digest.content, extraSecrets, env),
    digest_lines: digest.content
      .split(/\r?\n/)
      .map((l) => sanitizeJudgeMemoryText(l, extraSecrets, env))
      .filter(Boolean)
      .slice(0, 10),
    rulings,
  };

  const fetchFn = options?.fetchImpl ?? globalThis.fetch;
  const response = await fetchFn(rawUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return {
      pushed: false,
      reason: `Fleet memory MCP returned HTTP ${response.status}.`,
      date: dateStr,
      digestLineCount: payload.digest_lines.length,
      rulingsCount: rulings.length,
      statusCode: response.status,
    };
  }

  return {
    pushed: true,
    reason: `Pushed daily digest (${payload.digest_lines.length} lines) and ${rulings.length} rulings to fleet memory MCP via env ${primaryEnvKey}.`,
    date: dateStr,
    digestLineCount: payload.digest_lines.length,
    rulingsCount: rulings.length,
    statusCode: response.status,
  };
}

export interface BackupToVaultStagingOptions {
  stagingDir?: string;
  date?: string;
  env?: NodeJS.ProcessEnv;
  repoRoot?: string;
}

export interface BackupToVaultStagingResult {
  backedUp: boolean;
  backupFilePath: string;
  portableBackupPath: string;
  bytesCopied: number;
}

/**
 * Copies the SQLite store file to the Personal Vault staging folder (%USERPROFILE%\VAULT-STAGING-<date>\)
 * outside OneDrive and outside any git repository. Refuses the claude-to-claude drop box.
 */
export function backupStoreToVaultStaging(
  store: JudgeMemoryStore,
  options?: BackupToVaultStagingOptions
): BackupToVaultStagingResult {
  const env = options?.env ?? process.env;
  const dateStr = (options?.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const userProfile = env.USERPROFILE || os.homedir();

  const targetDir = path.resolve(
    options?.stagingDir || path.join(userProfile, `VAULT-STAGING-${dateStr}`)
  );
  const lowerDir = targetDir.replace(/\\/g, '/').toLowerCase();

  if (
    lowerDir.includes('/claude-to-claude') ||
    lowerDir.includes('/onedrive/') ||
    lowerDir.endsWith('/onedrive')
  ) {
    throw new Error('Backup destination may never be inside OneDrive or the claude-to-claude drop box.');
  }

  if (options?.repoRoot) {
    const repoLower = path.resolve(options.repoRoot).replace(/\\/g, '/').toLowerCase();
    if (lowerDir === repoLower || lowerDir.startsWith(`${repoLower}/`)) {
      throw new Error('Backup destination may never be inside a git repository.');
    }
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  store.checkpointWal();

  const backupFilePath = path.join(targetDir, `judge-memory-${dateStr}.sqlite`);
  fs.copyFileSync(store.dbPath, backupFilePath);
  const bytesCopied = fs.statSync(backupFilePath).size;

  return {
    backedUp: true,
    backupFilePath,
    portableBackupPath: normalizePortablePaths(backupFilePath, env),
    bytesCopied,
  };
}
