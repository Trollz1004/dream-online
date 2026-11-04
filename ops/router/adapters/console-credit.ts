/**
 * Jev router Console-credit lane adapter.
 *
 * Strict rules enforced by this module:
 * 1. Ships switched OFF behind ROUTER_CONSOLE_ENABLED=false; refuses to run when false or unset.
 * 2. Used ONLY for the judge step's text checks (purpose === 'judge-text-check'), NEVER for routing decisions.
 * 3. Enforces a hard per-day call cap read from ROUTER_CONSOLE_DAILY_CAP in the env.
 * 4. Reads the single Console key from the node env file by key name and NEVER prints or logs its value.
 * 5. Logs every call's token count (input_tokens, output_tokens, total_tokens) to ops/router/decisions.log.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  appendDecisionRecord,
  DEFAULT_DECISIONS_LOG_PATH,
  hashTaskDescription,
  type JevJobClass,
  readDecisionLog,
  sanitizeDecisionLogText,
} from '../dream-task-router.ts';

export const DEFAULT_ROUTER_CONSOLE_ENABLED = false;
export const DEFAULT_CONSOLE_KEY_ENV_NAME = 'CLAUDE_CONSOLE_KEY';

export interface ConsoleJudgeCheckRequest {
  prompt: string;
  purpose: 'judge-text-check' | string;
  jobClass?: JevJobClass;
  now?: Date;
}

export interface ConsoleJudgeCheckResult {
  passed: boolean;
  verdictText: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  dailyCallNumber: number;
  dailyCap: number;
}

export type ConsoleFetchFn = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export interface ConsoleCreditAdapterOptions {
  env?: Record<string, string | undefined>;
  envFilePath?: string;
  consoleKeyEnvName?: string;
  decisionsLogPath?: string;
  model?: string;
  maxTokens?: number;
  fetchImpl?: ConsoleFetchFn;
}

/**
 * Parses a .env file on disk and returns the value for a single named key without ever printing or logging values.
 */
export function readNamedKeyFromEnvFile(
  keyName: string,
  envFilePath?: string,
  envMap?: Record<string, string | undefined>
): string | undefined {
  if (envMap && typeof envMap[keyName] === 'string' && envMap[keyName]!.trim().length > 0) {
    return envMap[keyName]!.trim();
  }

  const candidatePath = envFilePath ?? path.resolve(process.cwd(), '.env');
  if (fs.existsSync(candidatePath)) {
    const raw = fs.readFileSync(candidatePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const k = trimmed.slice(0, eqIdx).trim();
      if (k === keyName) {
        let v = trimmed.slice(eqIdx + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        return v;
      }
    }
  }

  const fromProcess = process.env[keyName];
  return typeof fromProcess === 'string' && fromProcess.trim().length > 0
    ? fromProcess.trim()
    : undefined;
}

export class ConsoleCreditAdapter {
  private readonly env?: Record<string, string | undefined>;
  private readonly envFilePath?: string;
  private readonly consoleKeyEnvName: string;
  private readonly decisionsLogPath: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly fetchImpl: ConsoleFetchFn;
  private readonly inMemoryDailyCounts = new Map<string, number>();

  constructor(options?: ConsoleCreditAdapterOptions) {
    this.env = options?.env;
    this.envFilePath = options?.envFilePath;
    this.consoleKeyEnvName =
      options?.consoleKeyEnvName ??
      readNamedKeyFromEnvFile('ROUTER_CONSOLE_KEY_ENV', options?.envFilePath, options?.env) ??
      DEFAULT_CONSOLE_KEY_ENV_NAME;
    this.decisionsLogPath = options?.decisionsLogPath ?? DEFAULT_DECISIONS_LOG_PATH;
    this.model = options?.model ?? 'claude-sonnet-4-20250514';
    this.maxTokens = options?.maxTokens ?? 512;
    this.fetchImpl = options?.fetchImpl ?? (globalThis.fetch as unknown as ConsoleFetchFn);
  }

  public isEnabled(): boolean {
    const raw =
      readNamedKeyFromEnvFile('ROUTER_CONSOLE_ENABLED', this.envFilePath, this.env) ?? 'false';
    return raw.trim().toLowerCase() === 'true';
  }

  public getDailyCap(): number {
    const raw =
      readNamedKeyFromEnvFile('ROUTER_CONSOLE_DAILY_CAP', this.envFilePath, this.env) ??
      readNamedKeyFromEnvFile('ROUTER_CONSOLE_MAX_CALLS_PER_DAY', this.envFilePath, this.env);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  }

  private getCallsMadeOnDate(utcDateStr: string): number {
    const memCount = this.inMemoryDailyCounts.get(utcDateStr) ?? 0;
    const logged = readDecisionLog(this.decisionsLogPath).filter(
      (entry) =>
        entry.lane === 'console-credit' &&
        typeof entry.timestamp === 'string' &&
        entry.timestamp.startsWith(utcDateStr)
    ).length;
    return Math.max(memCount, logged);
  }

  public async runJudgeTextCheck(
    request: ConsoleJudgeCheckRequest
  ): Promise<ConsoleJudgeCheckResult> {
    // 1. Refuse when ROUTER_CONSOLE_ENABLED is false or unset (nothing costs money)
    if (!this.isEnabled()) {
      throw new Error(
        'Console-credit lane refused to run: ROUTER_CONSOLE_ENABLED=false (ships switched off by default so nothing costs money).'
      );
    }

    // 2. Refuse any routing decision or non-judge check
    if (request.purpose !== 'judge-text-check' || request.jobClass === 'route') {
      throw new Error(
        'Console-credit lane refused to run: restricted to the judge step text checks only and never used for routing decisions.'
      );
    }

    // 3. Enforce hard per-day call cap in the env
    const dailyCap = this.getDailyCap();
    if (dailyCap <= 0) {
      throw new Error(
        'Console-credit lane refused to run: ROUTER_CONSOLE_DAILY_CAP must be set to a positive integer in the env.'
      );
    }

    const now = request.now ?? new Date();
    const utcDateStr = now.toISOString().slice(0, 10);
    const usedToday = this.getCallsMadeOnDate(utcDateStr);
    if (usedToday >= dailyCap) {
      throw new Error(
        `Console-credit lane refused to run: hard daily call cap (${dailyCap}) reached for ${utcDateStr}.`
      );
    }

    // 4. Read the single Console key by name from the node env file (never printed)
    const keyValue =
      readNamedKeyFromEnvFile(this.consoleKeyEnvName, this.envFilePath, this.env) ??
      readNamedKeyFromEnvFile('CLAUDE_CONSOLE_API_KEY', this.envFilePath, this.env);

    if (!keyValue) {
      throw new Error(
        `Console-credit lane refused to run: named Console key (${this.consoleKeyEnvName}) is not present in the node env.`
      );
    }

    // 5. Call the Claude Messages API for the judge text check
    const response = await this.fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': keyValue,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = sanitizeDecisionLogText(await response.text(), [keyValue]);
      throw new Error(`Console-credit judge API call failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const verdictText = (data.content ?? [])
      .map((block) => block.text ?? '')
      .join('\n')
      .trim();
    const inputTokens = Number(data.usage?.input_tokens ?? 0);
    const outputTokens = Number(data.usage?.output_tokens ?? 0);
    const totalTokens = inputTokens + outputTokens;

    const dailyCallNumber = usedToday + 1;
    this.inMemoryDailyCounts.set(utcDateStr, dailyCallNumber);

    // 6. Log every call's token count to decisions.log (with the key redacted if it ever appeared)
    const taskHash = hashTaskDescription(request.prompt);
    appendDecisionRecord(
      {
        timestamp: now.toISOString(),
        task_hash: taskHash,
        taskHash,
        job_class: 'judge',
        jobClass: 'judge',
        lane: 'console-credit',
        node: 'Alienware',
        harness: 'claude-console-api',
        headless: true,
        post_gate: null,
        reason: `Console-credit judge text check completed (${totalTokens} tokens: ${inputTokens} in, ${outputTokens} out; call ${dailyCallNumber}/${dailyCap} on ${utcDateStr}).`,
        ranking_date: utcDateStr,
        rankingDateUsed: utcDateStr,
        ranking_status: 'fresh ranking',
        stale_ranking: false,
        quota_fallback: false,
        cold_lanes: {},
        coldLaneState: {},
        token_count: totalTokens,
        console_tokens: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
        },
      },
      this.decisionsLogPath,
      [keyValue]
    );

    const passed = /^PASS\b/i.test(verdictText) || !/\bFAIL\b/i.test(verdictText);
    return {
      passed,
      verdictText: sanitizeDecisionLogText(verdictText, [keyValue]),
      inputTokens,
      outputTokens,
      totalTokens,
      dailyCallNumber,
      dailyCap,
    };
  }
}

export function createConsoleCreditAdapter(
  options?: ConsoleCreditAdapterOptions
): ConsoleCreditAdapter {
  return new ConsoleCreditAdapter(options);
}
