/**
 * Jev router dispatch adapter for Antigravity (agy.exe) headless execution.
 *
 * Per the cookbook's harness section:
 * - Writes the prompt file under the local antigravity folder's .fable-kitchen
 *   (%USERPROFILE%\antigravity\.fable-kitchen\<jobId>.txt).
 * - Replaces all double quotes (") with single quotes (') before the call.
 * - Runs agy.exe headless from the repo folder with --model <lane>, --effort <per-lane effort from
 *   lanes.json> (omitted for lanes that reject it), --dangerously-skip-permissions, --output-format text,
 *   --print-timeout 20m,
 *   and "--print=<sanitizedPrompt>", writing output to <jobId>.log beside the prompt file.
 */

import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type CommandExecRequest,
  type CommandExecResult,
  type CommandRunner,
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  type LaneSetting,
  parseEyesGateVerdictFromOutput,
  parsePrUrlFromOutput,
  replaceDoubleQuotesWithSingle,
  resolveLaneEffort,
  scrubLaneEnv,
} from './types.ts';

export function getDefaultFableKitchenDir(): string {
  return path.join(os.homedir(), 'antigravity', '.fable-kitchen');
}

export interface BuildAgyCommandInput {
  lane: string;
  prompt: string;
  effort?: 'low' | 'medium' | 'high' | null;
  printTimeout?: string;
  agyExecutable?: string;
}

export interface BuiltAgyCommand {
  command: string;
  args: string[];
  sanitizedPrompt: string;
}

/**
 * Pure command builder for headless agy.exe execution.
 * Never spawns a process; used by both AgyDispatchAdapter.dispatch and dry-run round-trip tests.
 */
export function buildAgyCommand(input: BuildAgyCommandInput): BuiltAgyCommand {
  const sanitizedPrompt = replaceDoubleQuotesWithSingle(input.prompt).replace(/\0/g, '');
  const printTimeout = input.printTimeout ?? '20m';
  const args = [
    '--model',
    input.lane,
    ...(input.effort ? ['--effort', input.effort] : []),
    '--dangerously-skip-permissions',
    '--output-format',
    'text',
    '--print-timeout',
    printTimeout,
    `--print=${sanitizedPrompt}`,
  ];
  return {
    command: input.agyExecutable ?? 'agy.exe',
    args,
    sanitizedPrompt,
  };
}

/**
 * Extracts the prompt payload from an agy.exe argument vector built by buildAgyCommand.
 */
export function extractPromptFromAgyArgs(args: readonly string[]): string | null {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--print=')) {
      return arg.slice('--print='.length);
    }
    if ((arg === '--print' || arg === '-p' || arg === '--prompt') && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return null;
}

export const defaultCommandRunner: CommandRunner = (
  req: CommandExecRequest
): Promise<CommandExecResult> => {
  return new Promise((resolve) => {
    const effectiveArgs =
      req.command === 'git' && req.args[0] === 'worktree'
        ? ['-c', 'core.longpaths=true', ...req.args]
        : req.args;
    execFile(
      req.command,
      effectiveArgs,
      {
        cwd: req.cwd,
        env: req.env,
        timeout: req.timeoutMs ?? 22 * 60 * 1000,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        const rawCode = err ? (err as unknown as { code?: unknown }).code : 0;
        const exitCode = typeof rawCode === 'number' ? rawCode : err ? 1 : 0;
        const stdoutStr = String(stdout ?? '');
        const rawStderr = String(stderr ?? '');
        const cwdMissingNote =
          err && req.cwd && !fs.existsSync(req.cwd) ? ' (target cwd does not exist)' : '';
        const errMessage = err ? `${String(err.message || err)}${cwdMissingNote}` : '';
        const stderrStr =
          rawStderr.trim().length > 0
            ? rawStderr
            : errMessage;
        resolve({
          exitCode,
          stdout: stdoutStr,
          stderr: stderrStr,
        });
      }
    );
  });
};

export interface AgyAdapterOptions {
  kitchenDir?: string;
  ghConfigDir?: string;
  agyExecutable?: string;
  /**
   * Fallback --effort for a lane that has no entry in laneSettings. Lanes listed in lanes.json always use
   * their own setting (`none` omits the flag). Without this option an unlisted lane gets no --effort.
   */
  effort?: 'low' | 'medium' | 'high';
  /** Per-lane settings; defaults to the laneSettings block of ops/router/lanes.json. */
  laneSettings?: Record<string, LaneSetting>;
  /** lanes.json to read laneSettings from when laneSettings is not passed. */
  lanesPath?: string;
  printTimeout?: string;
  runner?: CommandRunner;
  now?: () => Date;
}

export const DEFAULT_AGY_LANES_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lanes.json'
);

/**
 * Reads the laneSettings block of lanes.json without importing the router core (which imports this adapter).
 * A missing or unreadable file yields no settings, so no lane gets --effort.
 */
export function readLaneSettingsFromFile(lanesPath: string = DEFAULT_AGY_LANES_PATH): Record<string, LaneSetting> {
  try {
    const parsed = JSON.parse(fs.readFileSync(lanesPath, 'utf8')) as {
      laneSettings?: Record<string, LaneSetting>;
    };
    return parsed.laneSettings && typeof parsed.laneSettings === 'object' ? parsed.laneSettings : {};
  } catch {
    return {};
  }
}

export class AgyDispatchAdapter implements DispatchAdapter {
  public readonly name = 'agy' as const;
  private readonly kitchenDir: string;
  private readonly ghConfigDir?: string;
  private readonly agyExecutable: string;
  private readonly fallbackEffort: 'low' | 'medium' | 'high' | null;
  private readonly laneSettings: Record<string, LaneSetting>;
  private readonly printTimeout: string;
  private readonly runner: CommandRunner;
  private readonly now: () => Date;

  constructor(options?: AgyAdapterOptions) {
    this.kitchenDir = options?.kitchenDir ?? getDefaultFableKitchenDir();
    this.ghConfigDir = options?.ghConfigDir;
    this.agyExecutable = options?.agyExecutable ?? 'agy.exe';
    this.fallbackEffort = options?.effort ?? null;
    this.laneSettings = options?.laneSettings ?? readLaneSettingsFromFile(options?.lanesPath);
    this.printTimeout = options?.printTimeout ?? '20m';
    this.runner = options?.runner ?? defaultCommandRunner;
    this.now = options?.now ?? (() => new Date());
  }

  /** The --effort value for a lane, or null when the lane has none and the flag must be omitted. */
  public effortForLane(lane: string): 'low' | 'medium' | 'high' | null {
    if (Object.hasOwn(this.laneSettings, lane.trim())) {
      return resolveLaneEffort({ laneSettings: this.laneSettings }, lane);
    }
    return this.fallbackEffort;
  }

  public async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
    fs.mkdirSync(this.kitchenDir, { recursive: true });

    const jobId =
      input.jobId ??
      `agy-${input.jobClass}-${crypto.createHash('sha256').update(input.prompt).digest('hex').slice(0, 10)}`;

    const promptPath = path.join(this.kitchenDir, `${jobId}.txt`);
    const logPath = path.join(this.kitchenDir, `${jobId}.log`);

    // agy 1.5.0 rejects --effort for some models, so the flag is passed only for lanes that accept it
    const effort = this.effortForLane(input.lane);
    const built = buildAgyCommand({
      lane: input.lane,
      prompt: input.prompt,
      effort,
      printTimeout: this.printTimeout,
      agyExecutable: this.agyExecutable,
    });
    const { sanitizedPrompt, args } = built;
    fs.writeFileSync(promptPath, sanitizedPrompt, 'utf8');

    const startedIso = this.now().toISOString();
    fs.writeFileSync(logPath, `started ${startedIso}\n`, 'utf8');

    let execResult: CommandExecResult | null = null;
    const targetCwd = input.cwd ?? process.cwd();
    const runPromise = this.runner({
      command: this.agyExecutable,
      args,
      cwd: targetCwd,
      // GH_TOKEN, GITHUB_TOKEN and GH_ENTERPRISE_TOKEN never reach a lane, GH_CONFIG_DIR is set to the runner's dedicated folder, and no .env file is loaded for it
      env: scrubLaneEnv(input.env ?? process.env, this.ghConfigDir),
    }).then((res) => {
      execResult = res;
      const combined = [res.stdout, res.stderr].filter(Boolean).join('\n');
      const fallbackDiagnostic =
        !combined && res.exitCode !== 0
          ? `agy exited with code ${res.exitCode} without stdout/stderr output`
          : '';
      const bodyToLog = combined || fallbackDiagnostic;
      const finishedIso = this.now().toISOString();
      fs.appendFileSync(
        logPath,
        `${bodyToLog ? `${bodyToLog}\n` : ''}agy exit ${res.exitCode} at ${finishedIso}\n`,
        'utf8'
      );
      return res;
    });

    return {
      jobId,
      adapter: 'agy',
      lane: input.lane,
      harness: 'agy',
      promptPath,
      logPath,
      sanitizedPrompt,
      command: this.agyExecutable,
      args,
      mode: 'headless-cli',
      httpSessionSupported: false,
      note: 'Dispatched headless via agy.exe with prompt and log in .fable-kitchen.',
      poll: async () => {
        const res = execResult ?? (await runPromise);
        const logText = fs.existsSync(logPath)
          ? fs.readFileSync(logPath, 'utf8')
          : [res.stdout, res.stderr].filter(Boolean).join('\n');
        const prUrl = parsePrUrlFromOutput(logText);
        const eyesCheck = parseEyesGateVerdictFromOutput(logText);
        return {
          done: true,
          prUrl,
          output: logText,
          exitCode: res.exitCode,
          eyesReportFirstLine: eyesCheck.firstLine,
          error: res.exitCode !== 0 ? res.stderr || `agy exited with code ${res.exitCode}` : null,
        };
      },
    };
  }
}

export function createAgyAdapter(options?: AgyAdapterOptions): AgyDispatchAdapter {
  return new AgyDispatchAdapter(options);
}
