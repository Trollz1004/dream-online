/**
 * Section 5: The brief at session start (1,500-token hard ceiling and configurable budget setting).
 *
 * SessionStart injects at most 1,500 tokens:
 * 1. The five newest rulings
 * 2. The open PRs with the judge's last verdict on each
 * 3. The last session's NEXT and BLOCKED lines
 * 4. The three newest lane_facts
 * 5. A one-line pointer to the state page and the cookbook
 * Nothing else.
 *
 * The budget is a setting (options.budgetTokens or JUDGE_MEMORY_BRIEF_TOKEN_BUDGET),
 * with 1,500 as the hard ceiling so a brief can never crowd out the work.
 */

import type { JudgeMemoryStore } from './database.ts';
import { sanitizeJudgeMemoryText } from './privacy.ts';

export const HARD_BRIEF_TOKEN_CEILING = 1500;
export const DEFAULT_BRIEF_TOKEN_BUDGET = 1500;

export const DEFAULT_STATE_PAGE_POINTER =
  'STATE.md (%USERPROFILE%/OneDrive/claude-to-claude/ALIENWARE-NODE-STATUS.md)';
export const DEFAULT_COOKBOOK_POINTER =
  '%USERPROFILE%/OneDrive/claude-to-claude/FABLES-KITCHEN-COOKBOOK-v2026-11-03.md';

export interface SessionStartBriefOptions {
  /** Requested token budget setting (clamped to HARD_BRIEF_TOKEN_CEILING = 1500). */
  budgetTokens?: number;
  currentSessionId?: string;
  statePagePath?: string;
  cookbookPath?: string;
  env?: NodeJS.ProcessEnv;
  extraSecrets?: string[];
}

export interface SessionStartBriefResult {
  brief: string;
  tokenCount: number;
  requestedBudget: number;
  effectiveBudget: number;
  ceilingApplied: boolean;
}

/**
 * Conservative token estimator: takes the larger of character-quarter count and whitespace/punctuation token count.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const charEstimate = Math.ceil(text.length / 4);
  const wordTokens = text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(charEstimate, wordTokens);
}

/**
 * Resolves the effective token budget from options or env, enforcing the 1,500-token hard ceiling.
 */
export function resolveBriefBudget(
  requestedBudget?: number,
  env: NodeJS.ProcessEnv = process.env
): { requestedBudget: number; effectiveBudget: number; ceilingApplied: boolean } {
  let raw = requestedBudget;
  if (raw === undefined || raw === null || !Number.isFinite(raw)) {
    const envVal = env.JUDGE_MEMORY_BRIEF_TOKEN_BUDGET
      ? Number(env.JUDGE_MEMORY_BRIEF_TOKEN_BUDGET)
      : NaN;
    raw = Number.isFinite(envVal) && envVal > 0 ? envVal : DEFAULT_BRIEF_TOKEN_BUDGET;
  }

  const normalizedRequested = Math.max(1, Math.floor(raw));
  const effectiveBudget = Math.min(normalizedRequested, HARD_BRIEF_TOKEN_CEILING);
  return {
    requestedBudget: normalizedRequested,
    effectiveBudget,
    ceilingApplied: normalizedRequested > HARD_BRIEF_TOKEN_CEILING,
  };
}

function truncateToTokenBudget(text: string, maxTokens: number): string {
  if (estimateTokens(text) <= maxTokens) {
    return text;
  }
  const maxChars = Math.max(4, maxTokens * 4 - 4);
  let sliced = text.slice(0, maxChars).trimEnd();
  while (sliced.length > 0 && estimateTokens(sliced) > maxTokens) {
    sliced = sliced.slice(0, Math.max(0, sliced.length - 8)).trimEnd();
  }
  return sliced;
}

/**
 * Builds the SessionStart brief containing strictly the five required sections within the token budget ceiling.
 */
export function buildSessionStartBrief(
  store: JudgeMemoryStore,
  options?: SessionStartBriefOptions
): SessionStartBriefResult {
  const env = options?.env ?? process.env;
  const extraSecrets = options?.extraSecrets ?? [];
  const { requestedBudget, effectiveBudget, ceilingApplied } = resolveBriefBudget(
    options?.budgetTokens,
    env
  );

  const sanitize = (s: string) => sanitizeJudgeMemoryText(s, extraSecrets, env);

  const rulings = store.getNewestRulings(5);
  const openPrs = store.getOpenPrVerdicts(10);
  const lastSession = store.getLastSessionWithSummary(options?.currentSessionId);
  const laneFacts = store.getNewestLaneFacts(3);

  const statePointer = sanitize(options?.statePagePath || DEFAULT_STATE_PAGE_POINTER);
  const cookbookPointer = sanitize(options?.cookbookPath || DEFAULT_COOKBOOK_POINTER);
  const pointerLine = `Pointers: State page at ${statePointer} and Cookbook at ${cookbookPointer}.`;

  const rulingLines =
    rulings.length > 0
      ? rulings.map(
          (r, idx) =>
            `${idx + 1}. [${sanitize(r.ruled_at)}] (${sanitize(r.written_in)}): ${sanitize(r.ruling)}`
        )
      : ['none recorded'];

  const openPrLines =
    openPrs.length > 0
      ? openPrs.map(
          (v) =>
            `- ${sanitize(v.repo)}#${v.pr_number}: ${sanitize(v.verdict)} (commit ${sanitize(v.commit_judged)}) — ${sanitize(v.reasons)}`
        )
      : ['- none open'];

  const nextLine = `NEXT: ${sanitize(lastSession?.next_step || 'none')}`;
  const blockedLine = `BLOCKED: ${sanitize(lastSession?.blocked_by || 'none')}`;

  const laneFactLines =
    laneFacts.length > 0
      ? laneFacts.map(
          (lf, idx) =>
            `${idx + 1}. ${sanitize(lf.lane)} on ${sanitize(lf.node)} (${lf.duration_seconds}s): ${sanitize(lf.what_it_did)} | broke: ${sanitize(lf.what_it_broke)}`
        )
      : ['none recorded'];

  const assemble = (
    rList: string[],
    prList: string[],
    lList: string[],
    lineCharCap = 240
  ): string => {
    const cap = (line: string) =>
      line.length <= lineCharCap ? line : `${line.slice(0, lineCharCap - 3).trimEnd()}...`;

    const sections = [
      '# Judge Memory Brief',
      '## 1. Five newest rulings',
      ...rList.map(cap),
      '## 2. Open PRs with last judge verdict',
      ...prList.map(cap),
      '## 3. Last session NEXT and BLOCKED',
      cap(nextLine),
      cap(blockedLine),
      '## 4. Three newest lane facts',
      ...lList.map(cap),
      '## 5. State page and cookbook pointer',
      pointerLine,
    ];
    return sections.join('\n');
  };

  let curRulings = [...rulingLines];
  let curPrs = [...openPrLines];
  let curLanes = [...laneFactLines];
  let brief = assemble(curRulings, curPrs, curLanes, 240);

  // Progressively tighten line lengths and list counts if over effectiveBudget
  for (const charCap of [160, 110, 80]) {
    if (estimateTokens(brief) <= effectiveBudget) break;
    brief = assemble(curRulings, curPrs, curLanes, charCap);
  }

  while (estimateTokens(brief) > effectiveBudget && curPrs.length > 1) {
    curPrs.pop();
    brief = assemble(curRulings, curPrs, curLanes, 80);
  }

  while (estimateTokens(brief) > effectiveBudget && curRulings.length > 1) {
    curRulings.pop();
    brief = assemble(curRulings, curPrs, curLanes, 80);
  }

  while (estimateTokens(brief) > effectiveBudget && curLanes.length > 1) {
    curLanes.pop();
    brief = assemble(curRulings, curPrs, curLanes, 80);
  }

  if (estimateTokens(brief) > effectiveBudget) {
    brief = truncateToTokenBudget(brief, effectiveBudget);
  }

  return {
    brief,
    tokenCount: estimateTokens(brief),
    requestedBudget,
    effectiveBudget,
    ceilingApplied,
  };
}
