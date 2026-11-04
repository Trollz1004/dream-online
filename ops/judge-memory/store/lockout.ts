/**
 * Section 1: Where judge-memory runs and who may touch it (Wrapper lockout by session marker).
 *
 * The store lives on the node the judge lane runs on, under %LOCALAPPDATA%\dream-judge-memory\,
 * never in a repo and never in the drop box.
 * Every hook and the MCP server check for the signed-in Claude Code's own session marker and do
 * nothing when it is absent or when any wrapper/API-key indicator is present.
 */

import os from 'node:os';
import path from 'node:path';

export const JUDGE_SESSION_MARKER_ENV = 'DREAM_JUDGE_LANE_SESSION';
export const JUDGE_SESSION_MARKER_VALUE = 'claude-code-signed-in';

/**
 * Environment variables that indicate a wrapper, third-party harness, or API-key session
 * rather than the signed-in Claude Code judge lane.
 */
export const WRAPPER_LOCKOUT_ENV_KEYS = [
  'FREE_CLAUDE_CODE',
  'FCC_SESSION',
  'FCC_PORT',
  'HERMES_SESSION',
  'HERMES_HOME',
  'OPSIS_SESSION',
  'AGY_SESSION',
  'ANTIGRAVITY_AGENT',
  'ANTIGRAVITY_CLI',
  'OMNIROUTE_SESSION',
  'OLLAMA_WRAPPER_SESSION',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
] as const;

export interface SessionMarkerCheckResult {
  allowed: boolean;
  reason: string;
}

/**
 * Verifies that the current process belongs to the signed-in Claude Code judge lane
 * and is not Free Claude Code (:8082), Hermes, agy, OmniRoute, or any API-key/base-URL wrapper.
 */
export function verifyJudgeSessionMarker(
  env: NodeJS.ProcessEnv = process.env,
  payload?: Record<string, unknown> | null
): SessionMarkerCheckResult {
  for (const wrapperKey of WRAPPER_LOCKOUT_ENV_KEYS) {
    const val = env[wrapperKey];
    if (typeof val === 'string' && val.trim().length > 0 && val.trim() !== '0' && val.trim().toLowerCase() !== 'false') {
      return {
        allowed: false,
        reason: `Wrapper lockout: disallowed environment variable ${wrapperKey} is set.`,
      };
    }
  }

  if (env.PORT === '8082' || env.FCC_SERVER_PORT === '8082') {
    return {
      allowed: false,
      reason: 'Wrapper lockout: Free Claude Code port 8082 detected.',
    };
  }

  const payloadHarness = typeof payload?.harness === 'string' ? payload.harness.trim().toLowerCase() : '';
  if (
    payloadHarness &&
    payloadHarness !== 'claude-code-signed-in' &&
    (payloadHarness.includes('free-claude') ||
      payloadHarness.includes('fcc') ||
      payloadHarness.includes('hermes') ||
      payloadHarness.includes('agy') ||
      payloadHarness.includes('antigravity') ||
      payloadHarness.includes('omniroute') ||
      payloadHarness.includes('ollama'))
  ) {
    return {
      allowed: false,
      reason: `Wrapper lockout: payload harness "${payloadHarness}" is not signed-in Claude Code.`,
    };
  }

  const envMarker = typeof env[JUDGE_SESSION_MARKER_ENV] === 'string' ? env[JUDGE_SESSION_MARKER_ENV]!.trim() : '';
  const payloadMarker =
    typeof payload?.judge_session_marker === 'string' ? payload.judge_session_marker.trim() : '';

  const effectiveMarker = envMarker || payloadMarker;
  if (effectiveMarker !== JUDGE_SESSION_MARKER_VALUE) {
    return {
      allowed: false,
      reason: `Session marker ${JUDGE_SESSION_MARKER_ENV} is absent or invalid.`,
    };
  }

  return {
    allowed: true,
    reason: 'Signed-in Claude Code judge session marker verified.',
  };
}

/**
 * Resolves the default store directory under %LOCALAPPDATA%\dream-judge-memory\.
 */
export function getDefaultJudgeMemoryDir(env: NodeJS.ProcessEnv = process.env): string {
  const localAppData =
    env.LOCALAPPDATA && env.LOCALAPPDATA.trim().length > 0
      ? env.LOCALAPPDATA.trim()
      : path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'dream-judge-memory');
}

/**
 * Validates that a SQLite store path is never inside a repository or the OneDrive claude-to-claude drop box.
 */
export function validateStoreLocation(
  dbFilePath: string,
  options?: { repoRoot?: string }
): { valid: boolean; reason: string } {
  const resolved = path.resolve(dbFilePath);
  const normalizedLower = resolved.replace(/\\/g, '/').toLowerCase();

  if (
    normalizedLower.includes('/claude-to-claude/') ||
    normalizedLower.endsWith('/claude-to-claude') ||
    normalizedLower.includes('/onedrive/')
  ) {
    return {
      valid: false,
      reason: 'Store path may never live inside OneDrive or the claude-to-claude drop box.',
    };
  }

  const repoRoot = options?.repoRoot ? path.resolve(options.repoRoot) : null;
  if (repoRoot) {
    const repoLower = repoRoot.replace(/\\/g, '/').toLowerCase();
    if (normalizedLower === repoLower || normalizedLower.startsWith(`${repoLower}/`)) {
      return {
        valid: false,
        reason: 'Store path may never live inside a git repository.',
      };
    }
  }

  return { valid: true, reason: 'Store path is outside repositories and the drop box.' };
}

/**
 * Resolves the SQLite file path for the judge memory store.
 */
export function resolveJudgeMemoryDbPath(options?: {
  dbPath?: string;
  storeDir?: string;
  env?: NodeJS.ProcessEnv;
  repoRoot?: string;
}): string {
  const env = options?.env ?? process.env;
  const explicitPath =
    options?.dbPath ??
    (env.JUDGE_MEMORY_DB_PATH && env.JUDGE_MEMORY_DB_PATH.trim().length > 0
      ? env.JUDGE_MEMORY_DB_PATH.trim()
      : undefined);

  const dir =
    options?.storeDir ??
    (env.JUDGE_MEMORY_DIR && env.JUDGE_MEMORY_DIR.trim().length > 0
      ? env.JUDGE_MEMORY_DIR.trim()
      : getDefaultJudgeMemoryDir(env));

  const target = explicitPath ? path.resolve(explicitPath) : path.resolve(dir, 'judge-memory.sqlite');
  const check = validateStoreLocation(target, { repoRoot: options?.repoRoot });
  if (!check.valid) {
    throw new Error(check.reason);
  }
  return target;
}
