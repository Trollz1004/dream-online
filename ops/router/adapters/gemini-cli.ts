/**
 * Jev router dispatch adapter for the official signed-in Gemini CLI (gemini on PATH)
 * run headless in the ticket's worktree. Its quota is separate from agy's.
 *
 * - Finds the gemini executable on PATH.
 * - Never uses a key or a token copied from anywhere (scrubs GitHub and provider key env vars).
 * - Sanitizes double quotes to single quotes and writes <jobId>.txt and <jobId>.log in .fable-kitchen.
 * - Reports a quota or sign-in failure in the same shape agy does so the ladder walks on.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defaultCommandRunner, getDefaultFableKitchenDir } from './agy.ts';
import {
  type CommandExecResult,
  type CommandRunner,
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  findExecutableOnPath,
  formatCliQuotaOrSignInFailure,
  parseEyesGateVerdictFromOutput,
  parsePrUrlFromOutput,
  replaceDoubleQuotesWithSingle,
  scrubSignedInCliEnv,
} from './types.ts';

export interface BuildGeminiCliCommandInput {
  prompt: string;
  lane?: string;
  model?: string | null;
  geminiExecutable?: string;
  env?: NodeJS.ProcessEnv;
}

export interface BuiltGeminiCliCommand {
  command: string;
  args: string[];
  sanitizedPrompt: string;
}

/**
 * Pure command builder for headless Gemini CLI (`gemini -y --output-format text -p <prompt>`) execution.
 */
export function buildGeminiCliCommand(input: BuildGeminiCliCommandInput): BuiltGeminiCliCommand {
  const sanitizedPrompt = replaceDoubleQuotesWithSingle(input.prompt).replace(/\0/g, '');
  const resolvedCommand =
    input.geminiExecutable ?? findExecutableOnPath('gemini', input.env ?? process.env) ?? 'gemini';
  const explicitModel =
    input.model?.trim() || (input.lane && input.lane !== 'gemini-cli' ? input.lane.trim() : '');
  const args = [
    ...(explicitModel ? ['-m', explicitModel] : []),
    '-y',
    '--output-format',
    'text',
    '-p',
    sanitizedPrompt,
  ];
  return {
    command: resolvedCommand,
    args,
    sanitizedPrompt,
  };
}

export function extractPromptFromGeminiArgs(args: readonly string[]): string | null {
  for (let i = 0; i < args.length; i += 1) {
    if ((args[i] === '-p' || args[i] === '--prompt') && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return null;
}

export interface GeminiCliAdapterOptions {
  kitchenDir?: string;
  ghConfigDir?: string;
  geminiExecutable?: string;
  model?: string | null;
  runner?: CommandRunner;
  now?: () => Date;
}

export class GeminiCliDispatchAdapter implements DispatchAdapter {
  public readonly name = 'gemini-cli' as const;
  private readonly kitchenDir: string;
  private readonly ghConfigDir?: string;
  private readonly geminiExecutable?: string;
  private readonly model?: string | null;
  private readonly runner: CommandRunner;
  private readonly now: () => Date;

  constructor(options?: GeminiCliAdapterOptions) {
    this.kitchenDir = options?.kitchenDir ?? getDefaultFableKitchenDir();
    this.ghConfigDir = options?.ghConfigDir;
    this.geminiExecutable = options?.geminiExecutable;
    this.model = options?.model;
    this.runner = options?.runner ?? defaultCommandRunner;
    this.now = options?.now ?? (() => new Date());
  }

  public async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
    fs.mkdirSync(this.kitchenDir, { recursive: true });

    const jobId =
      input.jobId ??
      `gemini-cli-${input.jobClass}-${crypto.createHash('sha256').update(input.prompt).digest('hex').slice(0, 10)}`;

    const promptPath = path.join(this.kitchenDir, `${jobId}.txt`);
    const logPath = path.join(this.kitchenDir, `${jobId}.log`);

    const sourceEnv = input.env ?? process.env;
    const built = buildGeminiCliCommand({
      prompt: input.prompt,
      lane: input.lane,
      model: this.model,
      geminiExecutable: this.geminiExecutable,
      env: sourceEnv,
    });
    const { command, args, sanitizedPrompt } = built;
    fs.writeFileSync(promptPath, sanitizedPrompt, 'utf8');

    const startedIso = this.now().toISOString();
    fs.writeFileSync(logPath, `started ${startedIso}\n`, 'utf8');

    let execResult: CommandExecResult | null = null;
    const targetCwd = input.cwd ?? process.cwd();
    const cleanEnv = scrubSignedInCliEnv(sourceEnv, this.ghConfigDir);

    const runPromise = this.runner({
      command,
      args,
      cwd: targetCwd,
      env: cleanEnv,
    }).then((res) => {
      execResult = res;
      const combined = [res.stdout, res.stderr].filter(Boolean).join('\n');
      const fallbackDiagnostic =
        !combined && res.exitCode !== 0
          ? `gemini-cli exited with code ${res.exitCode} without stdout/stderr output`
          : '';
      const rawBody = combined || fallbackDiagnostic;
      const normalizedQuotaLine = formatCliQuotaOrSignInFailure(
        'gemini-cli',
        rawBody,
        res.stderr,
        res.exitCode
      );
      const bodyToLog = [rawBody, normalizedQuotaLine].filter(Boolean).join('\n');
      const finishedIso = this.now().toISOString();
      fs.appendFileSync(
        logPath,
        `${bodyToLog ? `${bodyToLog}\n` : ''}gemini-cli exit ${res.exitCode} at ${finishedIso}\n`,
        'utf8'
      );
      return res;
    });

    return {
      jobId,
      adapter: 'gemini-cli',
      lane: input.lane,
      harness: 'gemini-cli',
      promptPath,
      logPath,
      sanitizedPrompt,
      command,
      args,
      mode: 'headless-cli',
      httpSessionSupported: false,
      note: 'Dispatched headless via signed-in Gemini CLI (gemini -p) with prompt and log in .fable-kitchen.',
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
          error:
            res.exitCode !== 0
              ? res.stderr || `gemini-cli exited with code ${res.exitCode}`
              : null,
        };
      },
    };
  }
}

export function createGeminiCliAdapter(options?: GeminiCliAdapterOptions): GeminiCliDispatchAdapter {
  return new GeminiCliDispatchAdapter(options);
}
