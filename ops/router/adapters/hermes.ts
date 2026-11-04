/**
 * Jev router dispatch adapter for Hermes (OPSis) on Sabretooth.
 *
 * Per the cookbook and AGENT-STANDARD.md:
 * - Writes the prompt to a local file first (replacing double quotes with single quotes).
 * - Copies the prompt file to Sabretooth using `scp <localPromptFile> sabretooth:<remotePromptPath>`.
 * - Runs `hermes -z --query-file <remotePromptPath>` over `ssh sabretooth`.
 * - Never scrapes (rejects any scraping flag or scraper tool invocation).
 * - Returns a handle the router can poll for done and a PR URL parsed from the lane's output.
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
  parseEyesGateVerdictFromOutput,
  parsePrUrlFromOutput,
  replaceDoubleQuotesWithSingle,
} from './types.ts';

const FORBIDDEN_SCRAPE_REGEX =
  /\b(?:yt-dlp|youtube-dl|scrape-youtube|browser-scrape|headless-scrape)\b/i;

const VALID_HERMES_JOB_ID_REGEX = /^[a-zA-Z0-9_-]{1,80}$/;

const KNOWN_HERMES_JOB_CLASSES: ReadonlySet<string> = new Set([
  'route',
  'mechanical',
  'code-bulk',
  'code-hard',
  'engine',
  'design-visual',
  'research',
  'judge',
  'post-x',
  'youtube-upload',
]);

export interface HermesAdapterOptions {
  stagingDir?: string;
  sshHost?: string;
  remoteDir?: string;
  runner?: CommandRunner;
  now?: () => Date;
}

export class HermesDispatchAdapter implements DispatchAdapter {
  public readonly name = 'hermes' as const;
  public readonly neverScrape = true as const;
  private readonly stagingDir: string;
  private readonly sshHost: string;
  private readonly remoteDir: string;
  private readonly runner: CommandRunner;
  private readonly now: () => Date;

  constructor(options?: HermesAdapterOptions) {
    this.stagingDir = options?.stagingDir ?? getDefaultFableKitchenDir();
    this.sshHost = options?.sshHost ?? 'sabretooth';
    this.remoteDir = options?.remoteDir ?? '~/.fable-kitchen';
    this.runner = options?.runner ?? defaultCommandRunner;
    this.now = options?.now ?? (() => new Date());
  }

  public async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
    if (FORBIDDEN_SCRAPE_REGEX.test(input.prompt)) {
      throw new Error(
        'Hermes adapter refuses to run scraping commands: Hermes on Sabretooth uses official CLIs and APIs only and never scrapes.'
      );
    }

    if (!input.jobClass || !KNOWN_HERMES_JOB_CLASSES.has(input.jobClass)) {
      throw new Error(
        `Hermes adapter refuses unknown jobClass "${String(input.jobClass)}": must be one of the known job classes.`
      );
    }

    const jobId =
      input.jobId ??
      `hermes-${input.jobClass}-${crypto.createHash('sha256').update(input.prompt).digest('hex').slice(0, 10)}`;

    if (!VALID_HERMES_JOB_ID_REGEX.test(jobId)) {
      throw new Error(
        `Hermes adapter refuses invalid jobId "${jobId}": must match /^[a-zA-Z0-9_-]{1,80}$/ (path traversal and shell injection are forbidden).`
      );
    }

    const resolvedStagingDir = path.resolve(this.stagingDir);
    const promptPath = path.resolve(resolvedStagingDir, `${jobId}.txt`);
    const logPath = path.resolve(resolvedStagingDir, `${jobId}.log`);

    const isWithinStagingDir = (candidatePath: string): boolean => {
      const rel = path.relative(resolvedStagingDir, candidatePath);
      return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
    };

    if (!isWithinStagingDir(promptPath) || !isWithinStagingDir(logPath)) {
      throw new Error(
        'Hermes adapter refuses dispatch: promptPath or logPath resolves outside stagingDir.'
      );
    }

    fs.mkdirSync(resolvedStagingDir, { recursive: true });

    const remotePromptPath = path.posix.join(this.remoteDir, [jobId, '.txt'].join(''));

    const sanitizedPrompt = replaceDoubleQuotesWithSingle(input.prompt);
    fs.writeFileSync(promptPath, sanitizedPrompt, 'utf8');

    const startedIso = this.now().toISOString();
    fs.writeFileSync(logPath, `started ${startedIso}\n`, 'utf8');

    const scpArgs = [promptPath, [this.sshHost, remotePromptPath].join(':')];
    const sshArgs = [this.sshHost, 'hermes', '-z', '--query-file', remotePromptPath];

    let finalResult: CommandExecResult | null = null;
    const runPromise = (async (): Promise<CommandExecResult> => {
      // Step 1: Copy prompt file to Sabretooth via scp
      const scpRes = await this.runner({
        command: 'scp',
        args: scpArgs,
        cwd: input.cwd ?? process.cwd(),
      });

      if (scpRes.exitCode !== 0) {
        const failRes: CommandExecResult = {
          exitCode: scpRes.exitCode,
          stdout: scpRes.stdout,
          stderr: scpRes.stderr || `scp to ${this.sshHost} failed with exit code ${scpRes.exitCode}`,
        };
        finalResult = failRes;
        fs.appendFileSync(
          logPath,
          `${failRes.stderr}\nhermes scp exit ${failRes.exitCode} at ${this.now().toISOString()}\n`,
          'utf8'
        );
        return failRes;
      }

      // Step 2: Run hermes -z over ssh sabretooth reading the copied file
      const sshRes = await this.runner({
        command: 'ssh',
        args: sshArgs,
        cwd: input.cwd ?? process.cwd(),
      });

      finalResult = sshRes;
      const combined = [sshRes.stdout, sshRes.stderr].filter(Boolean).join('\n');
      fs.appendFileSync(
        logPath,
        `${combined ? `${combined}\n` : ''}hermes exit ${sshRes.exitCode} at ${this.now().toISOString()}\n`,
        'utf8'
      );
      return sshRes;
    })();

    return {
      jobId,
      adapter: 'hermes',
      lane: input.lane,
      harness: 'hermes',
      promptPath,
      logPath,
      remotePromptPath,
      sanitizedPrompt,
      command: 'ssh',
      args: sshArgs,
      scpArgs,
      sshArgs,
      mode: 'ssh-scp-cli',
      httpSessionSupported: false,
      note: `Copied prompt via scp to ${this.sshHost}:${remotePromptPath} and executed hermes -z over ssh ${this.sshHost} (never scraping).`,
      poll: async () => {
        const res = finalResult ?? (await runPromise);
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
          error: res.exitCode !== 0 ? res.stderr || `hermes exited with code ${res.exitCode}` : null,
        };
      },
    };
  }
}

export function createHermesAdapter(options?: HermesAdapterOptions): HermesDispatchAdapter {
  return new HermesDispatchAdapter(options);
}
