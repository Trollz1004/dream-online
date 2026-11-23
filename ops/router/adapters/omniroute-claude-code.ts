/**
 * Last-resort lane: the Claude Code program pointed at OmniRoute's own messages
 * endpoint, with model "auto" so OmniRoute's router picks. An executor lane only:
 * PR only, never merges, never the tools reserved for the trusted three.
 *
 * The signed-in login is never forwarded. ANTHROPIC_AUTH_TOKEN is a placeholder.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  type CommandExecRequest,
  type CommandRunner,
  type DispatchHandle,
  type DispatchJobInput,
  parsePrUrlFromOutput,
} from './types.ts';

export const LAST_RESORT_MODEL = 'auto';
export const LAST_RESORT_CONCURRENCY = 2;
export const LAST_RESORT_TIMEOUT_MS = 40 * 60 * 1000;
export const LAST_RESORT_AUTH_TOKEN = 'omniroute-local';
export const LAST_RESORT_MARK = 'built by the last-resort lane';

const EXECUTOR_RULES = [
  'PR only. Never merge, never force push, never push to main.',
  'Work only inside this folder. Never open, print or edit any env file.',
  'Never use remake, reverse-engineer-anything, Agent-Reach or last30days. No web browsing or scraping.',
  'Failing test first, then make it pass.',
].join(' ');

const ALLOWED_TOOLS = 'Bash Read Edit Write Glob Grep';

export interface BuiltLastResortCommand {
  command: string;
  args: string[];
  cwd: string | undefined;
  env: NodeJS.ProcessEnv;
  stdin: 'ignore';
  windowsHide: true;
  timeoutMs: number;
}

export function resolveLastResortEnabled(env: NodeJS.ProcessEnv): boolean {
  const raw = (env.LAST_RESORT_ENABLED ?? '').trim().toLowerCase();
  return raw !== 'false' && raw !== '0' && raw !== 'off';
}

/** OmniRoute's address from ops/fleet/fleet-map.json, falling back to the known one. */
export function readOmnirouteBaseUrl(fleetMapPath: string): string {
  const fallback = 'http://192.168.0.15:20128';
  try {
    const parsed = JSON.parse(fs.readFileSync(fleetMapPath, 'utf8'));
    const services: Array<{ id?: string; protocol?: string; host?: string; port?: number }> =
      parsed?.services ?? [];
    const omni = services.find((s) => s.id === 'omniroute');
    if (omni?.host && omni?.port) {
      return `${omni.protocol ?? 'http'}://${omni.host}:${omni.port}`;
    }
  } catch {
    // The map is missing or unreadable; the known address still works.
  }
  return fallback;
}

export function buildOmnirouteClaudeCodeCommand(input: {
  prompt: string;
  cwd?: string;
  baseUrl: string;
}): BuiltLastResortCommand {
  const prompt = `${EXECUTOR_RULES} ${LAST_RESORT_MARK}. ${input.prompt}`;
  return {
    command: 'claude',
    args: [
      '-p',
      prompt,
      '--model',
      LAST_RESORT_MODEL,
      '--permission-mode',
      'acceptEdits',
      '--allowedTools',
      ALLOWED_TOOLS,
    ],
    cwd: input.cwd,
    env: {
      ANTHROPIC_BASE_URL: input.baseUrl,
      ANTHROPIC_AUTH_TOKEN: LAST_RESORT_AUTH_TOKEN,
      ANTHROPIC_MODEL: LAST_RESORT_MODEL,
      ANTHROPIC_SMALL_FAST_MODEL: 'auto/best-fast',
    },
    stdin: 'ignore',
    windowsHide: true,
    timeoutMs: LAST_RESORT_TIMEOUT_MS,
  };
}

export class OmnirouteClaudeCodeAdapter {
  readonly name = 'omniroute-claude-code' as const;
  private running = 0;
  private readonly waiters: Array<() => void> = [];
  private readonly runner: CommandRunner;
  private readonly baseUrl: string;
  private readonly kitchenDir: string;

  constructor(options: {
    commandRunner: CommandRunner;
    fleetMapPath: string;
    kitchenDir?: string;
    env?: NodeJS.ProcessEnv;
  }) {
    this.runner = options.commandRunner;
    this.baseUrl = readOmnirouteBaseUrl(options.fleetMapPath);
    this.kitchenDir = options.kitchenDir ?? path.join(os.homedir(), 'antigravity', '.fable-kitchen');
  }

  private async acquire(): Promise<void> {
    if (this.running < LAST_RESORT_CONCURRENCY) {
      this.running += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.running += 1;
  }

  private release(): void {
    this.running -= 1;
    this.waiters.shift()?.();
  }

  async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
    const jobId = input.jobId ?? 'last-resort';
    const built = buildOmnirouteClaudeCodeCommand({
      prompt: input.prompt,
      cwd: input.cwd,
      baseUrl: this.baseUrl,
    });
    const logPath = path.join(this.kitchenDir, `${jobId}.log`);
    const req: CommandExecRequest = {
      command: built.command,
      args: built.args,
      cwd: built.cwd,
      env: built.env,
      timeoutMs: built.timeoutMs,
    };

    const resultPromise = (async () => {
      await this.acquire();
      try {
        return await this.runner(req);
      } finally {
        this.release();
      }
    })();

    return {
      jobId,
      adapter: 'omniroute-claude-code',
      lane: input.lane,
      harness: input.harness,
      promptPath: path.join(this.kitchenDir, `${jobId}.txt`),
      logPath,
      sanitizedPrompt: input.prompt,
      command: built.command,
      args: built.args,
      mode: 'headless-cli',
      httpSessionSupported: false,
      note: LAST_RESORT_MARK,
      poll: async () => {
        const result = await resultPromise;
        const output = `${LAST_RESORT_MARK}\n${result.stdout}`;
        fs.mkdirSync(this.kitchenDir, { recursive: true });
        fs.writeFileSync(logPath, output, 'utf8');
        return {
          done: true,
          prUrl: parsePrUrlFromOutput(output),
          output,
          exitCode: result.exitCode,
          error: result.stderr || null,
        };
      },
    };
  }
}
