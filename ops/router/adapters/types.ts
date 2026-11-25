/**
 * Shared types and output parsers for Jev router dispatch adapters
 * (agy headless, Free Claude Code outbox, Hermes over SSH/SCP, and Console-credit judge).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { JevJobClass } from '../dream-task-router.ts';

export const GITHUB_PR_URL_REGEX =
  /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+/i;

export interface CommandExecRequest {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface CommandExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type CommandRunner = (req: CommandExecRequest) => Promise<CommandExecResult>;

export interface DispatchJobInput {
  jobId?: string;
  prompt: string;
  jobClass: JevJobClass;
  lane: string;
  harness: string;
  node?: string;
  cwd?: string;
  /** Environment for the lane process. The adapter always strips the GitHub token variables from it. */
  env?: NodeJS.ProcessEnv;
}

/** Reasoning effort agy accepts for a lane. `none` means the lane rejects --effort and the flag is omitted. */
export type LaneEffort = 'low' | 'medium' | 'high' | 'none';

export const LANE_EFFORT_VALUES: readonly LaneEffort[] = ['low', 'medium', 'high', 'none'];

export interface LaneSetting {
  effort?: LaneEffort;
  note?: string;
}

/**
 * Returns the --effort value a lane accepts, or null when the lane has none (flag must be omitted).
 * A lane without an entry in laneSettings returns null as well: agy rejects --effort for some models,
 * so the flag is only passed for lanes that are listed as accepting it.
 */
export function resolveLaneEffort(
  table: { laneSettings?: Record<string, LaneSetting> },
  lane: string
): Exclude<LaneEffort, 'none'> | null {
  const effort = table.laneSettings?.[lane.trim()]?.effort;
  return effort === 'low' || effort === 'medium' || effort === 'high' ? effort : null;
}

/** GitHub token variables that never reach a lane: gh uses its own stored sign-in instead. */
export const LANE_SCRUBBED_ENV_NAMES = ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN'] as const;

/** Provider API key/token variables stripped so signed-in CLIs use only their stored login. */
export const PROVIDER_KEY_SCRUBBED_ENV_NAMES = [
  'OPENAI_API_KEY',
  'OPENAI_AUTH_TOKEN',
  'OPENAI_BEARER_TOKEN',
  'CODEX_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'ANTHROPIC_API_KEY',
] as const;

/**
 * Finds an executable on PATH from the given environment (falling back to process.env).
 * Returns the resolved full path when found on disk, or null when no matching file exists on PATH.
 */
export function findExecutableOnPath(
  binaryName: string,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const trimmed = binaryName.trim();
  if (!trimmed) return null;
  if (path.isAbsolute(trimmed) && fs.existsSync(trimmed)) {
    try {
      if (fs.statSync(trimmed).isFile()) return trimmed;
    } catch {
      // ignore
    }
  }

  const pathKey =
    Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ??
    Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH');
  const rawPath = (pathKey ? env[pathKey] ?? process.env[pathKey] : process.env.PATH) ?? '';
  const dirs = rawPath
    .split(path.delimiter)
    .map((d) => d.trim().replace(/^"+|"+$/g, ''))
    .filter(Boolean);

  const hasExt = Boolean(path.extname(trimmed));
  const extensions =
    process.platform === 'win32'
      ? hasExt
        ? ['']
        : ['.exe', '.cmd', '.bat', '']
      : hasExt
        ? ['']
        : ['', '.cmd', '.exe', '.sh'];

  for (const dir of dirs) {
    for (const ext of extensions) {
      const candidate = path.join(dir, `${trimmed}${ext}`);
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate;
        }
      } catch {
        // ignore unreadable entries
      }
    }
  }
  return null;
}

/** Portable path for the runner's dedicated gh config folder so no other lane on the machine can switch its account. */
export const RUNNER_GH_CONFIG_DIR_PORTABLE = '%USERPROFILE%\\antigravity\\.fable-kitchen\\gh-runner';

/** Default absolute path for the runner's dedicated gh config folder. */
export const DEFAULT_RUNNER_GH_CONFIG_DIR = path.join(
  os.homedir(),
  'antigravity',
  '.fable-kitchen',
  'gh-runner'
);

/**
 * Resolves the runner's dedicated gh config folder (%USERPROFILE%\antigravity\.fable-kitchen\gh-runner),
 * using explicitGhConfigDir when passed, otherwise USERPROFILE from env (falling back to os.homedir()).
 */
export function resolveRunnerGhConfigDir(
  env: NodeJS.ProcessEnv = process.env,
  explicitGhConfigDir?: string
): string {
  if (explicitGhConfigDir && explicitGhConfigDir.trim()) {
    return explicitGhConfigDir.trim();
  }
  const userProfileKey = Object.keys(env).find((key) => key.toUpperCase() === 'USERPROFILE');
  const userProfile = userProfileKey ? env[userProfileKey]?.trim() : undefined;
  const home = userProfile || os.homedir();
  return path.join(home, 'antigravity', '.fable-kitchen', 'gh-runner');
}

/**
 * Returns a copy of the environment without the GitHub token variables (matched case-insensitively,
 * as Windows environment names are) and with GH_CONFIG_DIR set to the runner's dedicated gh config folder
 * (%USERPROFILE%\antigravity\.fable-kitchen\gh-runner). The input object is never modified.
 */
export function scrubLaneEnv(
  env: NodeJS.ProcessEnv = process.env,
  ghConfigDir?: string
): NodeJS.ProcessEnv {
  const scrubbed = new Set<string>(LANE_SCRUBBED_ENV_NAMES);
  const clean: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    const upper = key.toUpperCase();
    if (!scrubbed.has(upper) && upper !== 'GH_CONFIG_DIR') {
      clean[key] = value;
    }
  }
  clean.GH_CONFIG_DIR = resolveRunnerGhConfigDir(env, ghConfigDir);
  return clean;
}

/**
 * Scrubs both GitHub tokens and provider API keys/tokens so official signed-in CLIs
 * (codex-cli, gemini-cli) never use an environment key or copied token.
 */
export function scrubSignedInCliEnv(
  env: NodeJS.ProcessEnv = process.env,
  ghConfigDir?: string
): NodeJS.ProcessEnv {
  const clean = scrubLaneEnv(env, ghConfigDir);
  const forbidden = new Set<string>(PROVIDER_KEY_SCRUBBED_ENV_NAMES);
  for (const key of Object.keys(clean)) {
    if (forbidden.has(key.toUpperCase())) {
      delete clean[key];
    }
  }
  return clean;
}

export type DispatchAdapterName =
  | 'agy'
  | 'codex-cli'
  | 'gemini-cli'
  | 'free-claude-code'
  | 'hermes'
  | 'omniroute-claude-code';

export interface DispatchPollResult {
  done: boolean;
  prUrl: string | null;
  output: string;
  exitCode: number | null;
  eyesReportFirstLine?: string | null;
  error?: string | null;
}

export interface DispatchHandle {
  jobId: string;
  adapter: DispatchAdapterName;
  lane: string;
  harness: string;
  promptPath: string;
  logPath?: string;
  remotePromptPath?: string;
  sanitizedPrompt: string;
  command?: string;
  args?: string[];
  scpArgs?: string[];
  sshArgs?: string[];
  mode: 'headless-cli' | 'outbox-paste-only' | 'ssh-scp-cli';
  httpSessionSupported: boolean;
  note: string;
  poll: () => Promise<DispatchPollResult>;
}

export interface DispatchAdapter {
  readonly name: DispatchAdapterName;
  dispatch(input: DispatchJobInput): Promise<DispatchHandle>;
}

/**
 * Replaces double quotes with single quotes before passing a prompt to a CLI argument,
 * matching the cookbook's harness rule so double quotes never break Windows or SSH arguments.
 */
export function replaceDoubleQuotesWithSingle(prompt: string): string {
  return prompt.replace(/"/g, "'");
}

/**
 * Parses the first GitHub pull request URL from a lane's log or stdout/stderr output.
 */
export function parsePrUrlFromOutput(output: string): string | null {
  if (!output) return null;
  const match = output.match(GITHUB_PR_URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Parses an Eyes gate report verdict from explicit report text or from lane output.
 * For design-visual jobs, the first line of the Eyes report must start with PASS.
 */
export function parseEyesGateVerdictFromOutput(
  output: string,
  explicitEyesReport?: string | null
): { found: boolean; passed: boolean; firstLine: string | null; reason: string } {
  const candidateSource = explicitEyesReport?.trim() ? explicitEyesReport : output;
  if (!candidateSource || !candidateSource.trim()) {
    return {
      found: false,
      passed: false,
      firstLine: null,
      reason: 'Missing Eyes gate report output for design-visual job.',
    };
  }

  const lines = candidateSource
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // If explicitEyesReport was provided, check its very first non-empty line.
  if (explicitEyesReport && explicitEyesReport.trim()) {
    const first = lines[0] ?? '';
    const passed = /^PASS\b/.test(first);
    return {
      found: true,
      passed,
      firstLine: first,
      reason: passed
        ? `Eyes gate passed: ${first}`
        : `Eyes gate report first line did not say PASS: "${first}"`,
    };
  }

  // Otherwise search output lines for an Eyes gate report header line (PASS or FAIL)
  for (const line of lines) {
    if (
      /^(PASS|FAIL)\b.*Eyes gate/i.test(line) ||
      /^Eyes gate report:\s*(PASS|FAIL)\b/i.test(line) ||
      (/Eyes gate/i.test(line) && /\b(PASS|FAIL)\b/i.test(line))
    ) {
      const match = line.match(/\b(PASS|FAIL)\b/i);
      const passed = match ? match[1].toUpperCase() === 'PASS' : false;
      const normalized = line.replace(/^Eyes gate report:\s*/i, '').replace(/^[-* \t]+/, '').trim();
      return {
        found: true,
        passed,
        firstLine: normalized,
        reason: passed
          ? `Eyes gate passed: ${normalized}`
          : `Eyes gate report failed: "${normalized}"`,
      };
    }
  }

  // Also check if the very first line of output itself starts with PASS or FAIL
  const firstLine = lines[0] ?? '';
  if (/^(PASS|FAIL)\b/.test(firstLine)) {
    const passed = /^PASS\b/.test(firstLine);
    return {
      found: true,
      passed,
      firstLine,
      reason: passed
        ? `Eyes gate passed: ${firstLine}`
        : `Eyes gate report failed: "${firstLine}"`,
    };
  }

  return {
    found: false,
    passed: false,
    firstLine: null,
    reason: 'Missing Eyes gate PASS report in design-visual job output.',
  };
}

/**
 * Detects whether lane output or error text reports an HTTP 429 or quota exhaustion error.
 */
export function detectQuotaOr429Error(
  output: string,
  errorText?: string | null,
  exitCode?: number | null
): { isQuotaError: boolean; errorSummary: string } {
  if (exitCode === 0) {
    return { isQuotaError: false, errorSummary: '' };
  }
  const combined = `${output ?? ''}\n${errorText ?? ''}`.trim();
  if (!combined && exitCode !== 429) {
    return { isQuotaError: false, errorSummary: '' };
  }

  const quotaRegex =
    /\b429\b|\b401\b|too many requests|quota exceeded|exceeded your current quota|insufficient_quota|usage[ _-]?limit|hit your usage limit|plan limit|rate[ -]?limit(?:ed| reached| exceeded)?|resource_exhausted|5-hour cap|cooldown|not logged in|not signed in|please (?:sign|log) in|login required|sign-in required|run codex login|run gemini|authentication (?:failed|required)|unauthenticated|unauthorized|credentials not found|session expired/i;
  if (exitCode === 429 || quotaRegex.test(combined)) {
    const matchingLine =
      combined
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => quotaRegex.test(l)) ?? combined.slice(0, 200);
    return {
      isQuotaError: true,
      errorSummary: matchingLine || 'HTTP 429 quota exceeded',
    };
  }

  return { isQuotaError: false, errorSummary: '' };
}

/**
 * Formats a CLI quota or sign-in failure in the same shape agy does so the router ladder walks on.
 */
export function formatCliQuotaOrSignInFailure(
  cliName: string,
  output: string,
  errorText?: string | null,
  exitCode?: number | null
): string | null {
  const detected = detectQuotaOr429Error(output, errorText, exitCode);
  if (!detected.isQuotaError) return null;
  if (/RESOURCE_EXHAUSTED\s*\(code 429\)/i.test(`${output}\n${errorText ?? ''}`)) {
    return null;
  }
  return `AGY_ERROR: {"short_error":"RESOURCE_EXHAUSTED (code 429): ${cliName} quota or sign-in failure: ${detected.errorSummary.replace(/"/g, "'")}"}`;
}
