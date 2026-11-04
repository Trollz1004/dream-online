/**
 * Jev router dispatch adapter for Free Claude Code (:8082).
 *
 * Free Claude Code's README documents the /admin web page (Providers, Model Config,
 * Messaging, Integrations, Code sessions) and Telegram/Discord commands (/stats, /stop, /clear),
 * and documents no HTTP way to start a code session.
 * Therefore this adapter writes a paste-ready job file under ops/router/outbox/
 * and returns a handle stating that no HTTP session endpoint exists.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  parseEyesGateVerdictFromOutput,
  parsePrUrlFromOutput,
  replaceDoubleQuotesWithSingle,
} from './types.ts';

const ADAPTERS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_OUTBOX_DIR = path.resolve(ADAPTERS_DIR, '..', 'outbox');

export const FREE_CLAUDE_CODE_NO_HTTP_NOTE =
  'Free Claude Code README documents no HTTP way to start a code session (only the /admin web page); wrote a paste-ready job file under ops/router/outbox/.';

export interface FreeClaudeCodeAdapterOptions {
  outboxDir?: string;
  /** Optional simulated completion output for testing poll() behavior. */
  simulatedOutput?: string;
}

export class FreeClaudeCodeDispatchAdapter implements DispatchAdapter {
  public readonly name = 'free-claude-code' as const;
  private readonly outboxDir: string;
  private readonly simulatedOutput?: string;

  constructor(options?: FreeClaudeCodeAdapterOptions) {
    this.outboxDir = options?.outboxDir ?? DEFAULT_OUTBOX_DIR;
    this.simulatedOutput = options?.simulatedOutput;
  }

  public async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
    fs.mkdirSync(this.outboxDir, { recursive: true });

    const jobId =
      input.jobId ??
      `fcc-${input.jobClass}-${crypto.createHash('sha256').update(input.prompt).digest('hex').slice(0, 10)}`;

    const promptPath = path.join(this.outboxDir, `${jobId}.txt`);
    const logPath = path.join(this.outboxDir, `${jobId}.log`);
    const sanitizedPrompt = replaceDoubleQuotesWithSingle(input.prompt);

    const pasteReadyContent = [
      `# Paste-ready job for Free Claude Code (:8082 /admin -> Code sessions)`,
      `# Note: ${FREE_CLAUDE_CODE_NO_HTTP_NOTE}`,
      `# Job ID: ${jobId}`,
      `# Job Class: ${input.jobClass}`,
      `# Lane: ${input.lane}`,
      `# Node: ${input.node ?? 'Alienware'}`,
      ``,
      input.prompt,
      ``,
    ].join('\n');

    fs.writeFileSync(promptPath, pasteReadyContent, 'utf8');

    return {
      jobId,
      adapter: 'free-claude-code',
      lane: input.lane,
      harness: 'free-claude-code',
      promptPath,
      logPath,
      sanitizedPrompt,
      mode: 'outbox-paste-only',
      httpSessionSupported: false,
      note: FREE_CLAUDE_CODE_NO_HTTP_NOTE,
      poll: async () => {
        const logExists = fs.existsSync(logPath);
        const output =
          this.simulatedOutput !== undefined
            ? this.simulatedOutput
            : logExists
              ? fs.readFileSync(logPath, 'utf8')
              : FREE_CLAUDE_CODE_NO_HTTP_NOTE;
        const prUrl = parsePrUrlFromOutput(output);
        const eyesCheck = parseEyesGateVerdictFromOutput(output);
        return {
          done: logExists || this.simulatedOutput !== undefined,
          prUrl,
          output,
          exitCode: logExists || this.simulatedOutput !== undefined ? 0 : null,
          eyesReportFirstLine: eyesCheck.firstLine,
          error: null,
        };
      },
    };
  }
}

export function createFreeClaudeCodeAdapter(
  options?: FreeClaudeCodeAdapterOptions
): FreeClaudeCodeDispatchAdapter {
  return new FreeClaudeCodeDispatchAdapter(options);
}
