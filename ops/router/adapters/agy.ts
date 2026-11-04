/**
 * Jev router dispatch adapter for Antigravity (agy.exe) headless execution.
 *
 * Per the cookbook's harness section:
 * - Writes the prompt file under the local antigravity folder's .fable-kitchen
 *   (%USERPROFILE%\antigravity\.fable-kitchen\<jobId>.txt).
 * - Replaces all double quotes (") with single quotes (') before the call.
 * - Runs agy.exe headless from the repo folder with --model <lane>, --effort high,
 *   --dangerously-skip-permissions, --output-format text, --print-timeout 20m,
 *   and "--print=<sanitizedPrompt>", writing output to <jobId>.log beside the prompt file.
 */

import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  type CommandExecRequest,
  type CommandExecResult,
  type CommandRunner,
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  parseEyesGateVerdictFromOutput,
  parsePrUrlFromOutput,
  replaceDoubleQuotesWithSingle,
} from './types.ts';

export function getDefaultFableKitchenDir(): string {
  return path.join(os.homedir(), 'antigravity', '.fable-kitchen');
}

export const defaultCommandRunner: CommandRunner = (
  req: CommandExecRequest
): Promise<CommandExecResult> => {
  return new Promise((resolve) => {
    execFile(
      req.command,
      req.args,
      {
        cwd: req.cwd,
        env: req.env,
        timeout: req.timeoutMs ?? 20 * 60 * 1000,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        const rawCode = err ? (err as unknown as { code?: unknown }).code : 0;
        const exitCode = typeof rawCode === 'number' ? rawCode : err ? 1 : 0;
        resolve({
          exitCode,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? (err ? err.message : '')),
        });
      }
    );
  });
};

export interface AgyAdapterOptions {
  kitchenDir?: string;
  agyExecutable?: string;
  effort?: 'low' | 'medium' | 'high';
  printTimeout?: string;
  runner?: CommandRunner;
  now?: () => Date;
}

export class AgyDispatchAdapter implements DispatchAdapter {
  public readonly name = 'agy' as const;
  private readonly kitchenDir: string;
  private readonly agyExecutable: string;
  private readonly effort: 'low' | 'medium' | 'high';
  private readonly printTimeout: string;
  private readonly runner: CommandRunner;
  private readonly now: () => Date;

  constructor(options?: AgyAdapterOptions) {
    this.kitchenDir = options?.kitchenDir ?? getDefaultFableKitchenDir();
    this.agyExecutable = options?.agyExecutable ?? 'agy.exe';
    this.effort = options?.effort ?? 'high';
    this.printTimeout = options?.printTimeout ?? '20m';
    this.runner = options?.runner ?? defaultCommandRunner;
    this.now = options?.now ?? (() => new Date());
  }

  public async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
    fs.mkdirSync(this.kitchenDir, { recursive: true });

    const jobId =
      input.jobId ??
      `agy-${input.jobClass}-${crypto.createHash('sha256').update(input.prompt).digest('hex').slice(0, 10)}`;

    const promptPath = path.join(this.kitchenDir, `${jobId}.txt`);
    const logPath = path.join(this.kitchenDir, `${jobId}.log`);

    // Prompts have their double quotes replaced by single quotes before the call
    const sanitizedPrompt = replaceDoubleQuotesWithSingle(input.prompt);
    fs.writeFileSync(promptPath, sanitizedPrompt, 'utf8');

    const startedIso = this.now().toISOString();
    fs.writeFileSync(logPath, `started ${startedIso}\n`, 'utf8');

    const args = [
      '--model',
      input.lane,
      '--effort',
      this.effort,
      '--dangerously-skip-permissions',
      '--output-format',
      'text',
      '--print-timeout',
      this.printTimeout,
      `--print=${sanitizedPrompt}`,
    ];

    let execResult: CommandExecResult | null = null;
    const runPromise = this.runner({
      command: this.agyExecutable,
      args,
      cwd: input.cwd ?? process.cwd(),
    }).then((res) => {
      execResult = res;
      const combined = [res.stdout, res.stderr].filter(Boolean).join('\n');
      const finishedIso = this.now().toISOString();
      fs.appendFileSync(
        logPath,
        `${combined ? `${combined}\n` : ''}agy exit ${res.exitCode} at ${finishedIso}\n`,
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
