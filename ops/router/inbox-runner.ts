/**
 * Headless inbox runner ("the wheel") on the Alienware node.
 *
 * Turns a dropped Markdown task file in %USERPROFILE%\antigravity\.fable-kitchen\inbox\queued\
 * into a profiled Jev router decision, an isolated git worktree on branch ai/inbox/<id>,
 * a headless agy lane run with the cookbook's common rules prepended, a judge check
 * (PR URL present, plus Eyes PASS for design-visual), a PR comment starting with
 * "Router report: <lane> on Alienware", and a completed task file in done\ or failed\
 * with its log beside it.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  AgyDispatchAdapter,
  type CommandExecRequest,
  type CommandExecResult,
  type CommandRunner,
  defaultCommandRunner,
  detectQuotaOr429Error,
  type DispatchAdapter,
  type DispatchPollResult,
  parseEyesGateVerdictFromOutput,
  parsePrUrlFromOutput,
} from './adapters/index.ts';
import {
  appendDecisionRecord,
  type DecisionRecord,
  DEFAULT_DECISIONS_LOG_PATH,
  DEFAULT_LANES_PATH,
  DEFAULT_RANKINGS_DIR,
  hashTaskDescription,
  type JevJobClass,
  JevRouter,
  type LaneTable,
  loadLaneTable,
  loadNewestWeeklyRanking,
  profileTask,
  sanitizeDecisionLogText,
} from './dream-task-router.ts';

const ROUTER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = path.resolve(ROUTER_DIR, '..', '..');
export const DEFAULT_INBOX_DIR = path.join(os.homedir(), 'antigravity', '.fable-kitchen', 'inbox');
export const DEFAULT_WORKTREE_PARENT_DIR = path.join(os.homedir(), 'antigravity');
export const DEFAULT_INBOX_CONFIG_PATH = path.join(ROUTER_DIR, 'INBOX.md');
export const DEFAULT_BASE_BRANCH = 'origin/ai/stack2/2026-11-04';
export const MAX_CONSECUTIVE_FAILURES = 3;

export const INBOX_SUBFOLDERS = ['queued', 'running', 'done', 'failed'] as const;
export type InboxSubfolder = (typeof INBOX_SUBFOLDERS)[number];

export interface InboxFolders {
  root: string;
  queued: string;
  running: string;
  done: string;
  failed: string;
}

export interface ParsedInboxTask {
  id: string;
  fileName: string;
  title: string;
  forcedLane: string | null;
  repo: string;
  baseOverride: string | null;
  inboxHeader: string | null;
  taskText: string;
  rawContent: string;
}

export interface InboxAttemptRecord {
  attemptNumber: number;
  lane: string;
  jobClass: JevJobClass;
  decisionHash: string;
  prompt: string;
  prUrl: string | null;
  eyesReportFirstLine: string | null;
  quotaError: boolean;
  passedJudge: boolean;
  failureReason: string | null;
  output: string;
}

export type InboxTickStatus =
  | 'idle'
  | 'busy'
  | 'done'
  | 'failed'
  | 'stopped-three-failures'
  | 'refused-gh-auth'
  | 'refused-onedrive-inbox';

export interface InboxTickResult {
  status: InboxTickStatus;
  taskId: string | null;
  fileName: string | null;
  repo: string | null;
  lane: string | null;
  jobClass: JevJobClass | null;
  decisionHash: string | null;
  reason: string;
  prUrl: string | null;
  prCommentBody: string | null;
  requeued: boolean;
  requeueCount: number;
  quotaFallbackTriggered: boolean;
  forcedLaneRequested: string | null;
  forcedLaneHonoured: boolean;
  worktreePath: string | null;
  branchName: string | null;
  baseBranch: string | null;
  worktreeRemoved: boolean;
  taskFinalPath: string | null;
  logFinalPath: string | null;
  transitions: string[];
  attempts: InboxAttemptRecord[];
}

export interface InboxRunnerOptions {
  inboxDir?: string;
  worktreeParentDir?: string;
  repoRoot?: string;
  configPath?: string;
  baseBranch?: string;
  lanesPath?: string;
  rankingsDir?: string;
  decisionsLogPath?: string;
  router?: JevRouter;
  adapter?: DispatchAdapter;
  commandRunner?: CommandRunner;
  now?: () => Date;
  extraSecretsToRedact?: string[];
}

/**
 * Ensures the local inbox folder and its four required subfolders (queued, running, done, failed) exist.
 * Refuses any inbox path under OneDrive.
 */
export function ensureInboxFolders(inboxDir: string = DEFAULT_INBOX_DIR): InboxFolders {
  if (isOneDrivePath(inboxDir)) {
    throw new Error(
      'Inbox runner refused: inbox path must be a local folder under %USERPROFILE%\\antigravity\\.fable-kitchen\\inbox\\ and never under OneDrive.'
    );
  }
  const folders: InboxFolders = {
    root: inboxDir,
    queued: path.join(inboxDir, 'queued'),
    running: path.join(inboxDir, 'running'),
    done: path.join(inboxDir, 'done'),
    failed: path.join(inboxDir, 'failed'),
  };
  for (const dir of [folders.root, folders.queued, folders.running, folders.done, folders.failed]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return folders;
}

export function isOneDrivePath(candidatePath: string): boolean {
  return /onedrive/i.test(candidatePath);
}

/**
 * Checks whether a task file names a path under OneDrive as its inbox.
 */
export function taskNamesOneDriveInbox(
  rawContent: string,
  inboxHeader?: string | null
): boolean {
  if (inboxHeader && isOneDrivePath(inboxHeader)) {
    return true;
  }
  const lines = rawContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^inbox\s*:/i.test(trimmed) && isOneDrivePath(trimmed)) {
      return true;
    }
    if (/\binbox\b[^\r\n]*\bonedrive\b|\bonedrive\b[^\r\n]*\binbox\b/i.test(trimmed)) {
      return true;
    }
  }
  return false;
}

/**
 * Reads the base branch from a `base: <branch>` config line in a file or raw text,
 * defaulting to `origin/ai/stack2/2026-11-04`.
 */
export function readBaseBranchFromConfig(
  configPathOrText: string = DEFAULT_INBOX_CONFIG_PATH
): string {
  let content = '';
  if (configPathOrText.includes('\n') || /^\s*base\s*:/im.test(configPathOrText)) {
    content = configPathOrText;
  } else if (fs.existsSync(configPathOrText)) {
    content = fs.readFileSync(configPathOrText, 'utf8');
  }
  const match = content.match(/^\s*base\s*:\s*([^\s#`]+)\s*$/im);
  if (match && match[1]) {
    return match[1].trim();
  }
  return DEFAULT_BASE_BRANCH;
}

/**
 * Sanitizes a filename stem into a safe git branch / worktree id.
 */
export function sanitizeTaskId(fileName: string): string {
  const stem = fileName.replace(/\.md$/i, '').trim();
  const cleaned = stem
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'task';
}

/**
 * Parses a small Markdown task file with a title line, optional `lane:` line,
 * optional `repo:` line (default `dream-online`), optional `base:` line, and task text.
 */
export function parseInboxTaskFile(rawContent: string, fileName: string): ParsedInboxTask {
  const id = sanitizeTaskId(fileName);
  const lines = rawContent.split(/\r?\n/);

  let title = '';
  let forcedLane: string | null = null;
  let repo = 'dream-online';
  let baseOverride: string | null = null;
  let inboxHeader: string | null = null;
  const bodyLines: string[] = [];

  let inHeader = true;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (inHeader) {
      if (!trimmed) {
        if (title) {
          inHeader = false;
        }
        continue;
      }
      const kvMatch = trimmed.match(/^(title|lane|repo|base|inbox)\s*:\s*(.*)$/i);
      if (kvMatch) {
        const key = kvMatch[1].toLowerCase();
        const val = kvMatch[2].trim();
        if (key === 'title' && val) title = val;
        else if (key === 'lane') forcedLane = val || null;
        else if (key === 'repo' && val) repo = val;
        else if (key === 'base' && val) baseOverride = val;
        else if (key === 'inbox' && val) inboxHeader = val;
        continue;
      }
      if (!title) {
        title = trimmed.replace(/^#+\s*/, '').trim();
        continue;
      }
      inHeader = false;
      bodyLines.push(rawLine);
    } else {
      bodyLines.push(rawLine);
    }
  }

  if (!title) {
    title = id;
  }
  const taskText = bodyLines.join('\n').trim() || title;

  return {
    id,
    fileName,
    title,
    forcedLane,
    repo,
    baseOverride,
    inboxHeader,
    taskText,
    rawContent,
  };
}

/**
 * Checks whether a candidate lane name exists in ops/router/lanes.json.
 */
export function isKnownLaneInTable(table: LaneTable, candidateLane: string): boolean {
  const normalized = candidateLane.trim();
  if (!normalized) return false;

  for (const row of Object.values(table.lanes)) {
    if (row.lane === normalized || row.fallback === normalized) {
      return true;
    }
    if (Array.isArray(row.ladder) && row.ladder.includes(normalized)) {
      return true;
    }
  }
  for (const group of Object.values(table.quotaGroups ?? {})) {
    if (Array.isArray(group.lanes) && group.lanes.includes(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Builds the cookbook's common rules preamble prepended to every inbox task:
 * PR only, no user folder names, no secrets, proof pasted, Obsidian note.
 */
export function buildCookbookCommonRulesPreamble(options?: {
  branchName?: string;
  baseBranch?: string;
}): string {
  const branchName = options?.branchName ?? 'ai/inbox/<id>';
  const prBase = (options?.baseBranch ?? DEFAULT_BASE_BRANCH).replace(/^origin\//, '');
  return [
    'Use your highest reasoning level. Read docs/standards/AGENT-STANDARD.md before anything else.',
    `PR only: work on branch ${branchName} and open a pull request with gh against base ${prBase}; never push to main or master, never merge, never use --no-verify or --force, never rewrite history.`,
    'No user folder names: never type a Windows user folder name in any file; write %USERPROFILE% and %LOCALAPPDATA%.',
    'No secrets: this repo is public; no private LAN addresses, no secrets, never print an environment value.',
    'Proof pasted: a passing exit code is not proof; paste real command output in the PR description.',
    'Obsidian note: finish with a caveman Obsidian note under %USERPROFILE%\\Obsidian\\Alienware\\ with DID, BROKE, NEXT, BLOCKED, FILES, and paste its path.',
  ].join('\n');
}

export function prependCookbookRulesToTask(
  task: ParsedInboxTask,
  options?: { branchName?: string; baseBranch?: string }
): string {
  const preamble = buildCookbookCommonRulesPreamble(options);
  return `${preamble}\n\n# ${task.title}\n\n${task.taskText}`;
}

/**
 * Extracts a concise test summary from a lane's log output.
 */
export function extractTestSummaryFromLog(logText: string): string {
  if (!logText || !logText.trim()) {
    return 'No test summary found in lane log.';
  }

  const lines = logText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const summaryLines = lines.filter((line) =>
    /^(?:ℹ\s*(?:tests|suites|pass|fail|duration_ms)\b|tests?\s+\d+|pass(?:ed)?\s*[:=]?\s*\d+|fail(?:ed)?\s*[:=]?\s*\d+|\d+\s+passing|\d+\/\d+\s+passed|Test Files\b|Tests\b)/i.test(
      line
    )
  );

  if (summaryLines.length > 0) {
    return summaryLines.join(' | ');
  }

  return 'No test summary found in lane log.';
}

/**
 * Formats the PR comment whose first line is `Router report: <lane> on Alienware`
 * with the lane, the job class, the reason, the decision hash, and the test summary.
 */
export function formatRouterPrComment(params: {
  lane: string;
  node?: string;
  jobClass: JevJobClass;
  reason: string;
  decisionHash: string;
  testSummary: string;
  extraSecretsToRedact?: string[];
}): string {
  const node = params.node || 'Alienware';
  const lines = [
    `Router report: ${params.lane} on ${node}`,
    `Lane: ${params.lane}`,
    `Job class: ${params.jobClass}`,
    `Reason: ${params.reason}`,
    `Decision hash: ${params.decisionHash}`,
    `Test summary: ${params.testSummary}`,
  ];
  return sanitizeDecisionLogText(lines.join('\n'), params.extraSecretsToRedact);
}

function listMarkdownTaskFilesSortedOldestFirst(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.md'));

  const withStats = entries.map((name) => {
    const full = path.join(dirPath, name);
    const stat = fs.statSync(full);
    return {
      name,
      mtimeMs: stat.mtimeMs,
      birthtimeMs: stat.birthtimeMs,
    };
  });

  withStats.sort((a, b) => {
    if (a.mtimeMs !== b.mtimeMs) return a.mtimeMs - b.mtimeMs;
    if (a.birthtimeMs !== b.birthtimeMs) return a.birthtimeMs - b.birthtimeMs;
    return a.name.localeCompare(b.name);
  });

  return withStats.map((item) => item.name);
}

/**
 * Headless inbox runner for the Alienware node.
 */
export class InboxRunner {
  private readonly inboxDir: string;
  private readonly worktreeParentDir: string;
  private readonly repoRoot: string;
  private readonly configPath: string;
  private readonly explicitBaseBranch?: string;
  private readonly lanesPath: string;
  private readonly rankingsDir: string;
  private readonly decisionsLogPath: string;
  private readonly router: JevRouter;
  private readonly adapter: DispatchAdapter;
  private readonly commandRunner: CommandRunner;
  private readonly now: () => Date;
  private readonly extraSecretsToRedact: string[];

  private isTickActive = false;
  private readonly activeRepos = new Set<string>();
  private consecutiveFailures = 0;
  private stoppedUntilFailedCleared = false;

  constructor(options?: InboxRunnerOptions) {
    this.inboxDir = options?.inboxDir ?? DEFAULT_INBOX_DIR;
    this.worktreeParentDir = options?.worktreeParentDir ?? DEFAULT_WORKTREE_PARENT_DIR;
    this.repoRoot = options?.repoRoot ?? DEFAULT_REPO_ROOT;
    this.configPath = options?.configPath ?? DEFAULT_INBOX_CONFIG_PATH;
    this.explicitBaseBranch = options?.baseBranch;
    this.lanesPath = options?.lanesPath ?? DEFAULT_LANES_PATH;
    this.rankingsDir = options?.rankingsDir ?? DEFAULT_RANKINGS_DIR;
    this.decisionsLogPath = options?.decisionsLogPath ?? DEFAULT_DECISIONS_LOG_PATH;
    this.router =
      options?.router ??
      new JevRouter({
        lanesPath: this.lanesPath,
        rankingsDir: this.rankingsDir,
        decisionsLogPath: this.decisionsLogPath,
      });
    this.commandRunner = options?.commandRunner ?? defaultCommandRunner;
    this.now = options?.now ?? (() => new Date());
    this.extraSecretsToRedact = options?.extraSecretsToRedact ?? [];
    this.adapter =
      options?.adapter ??
      new AgyDispatchAdapter({
        kitchenDir: path.dirname(this.inboxDir),
        runner: this.commandRunner,
        now: this.now,
      });

    // If failed/ already holds 3 or more failed task files on startup, start in stopped state
    const failedDir = path.join(this.inboxDir, 'failed');
    if (!isOneDrivePath(this.inboxDir) && fs.existsSync(failedDir)) {
      const existingFailed = listMarkdownTaskFilesSortedOldestFirst(failedDir).length;
      if (existingFailed >= MAX_CONSECUTIVE_FAILURES) {
        this.consecutiveFailures = existingFailed;
        this.stoppedUntilFailedCleared = true;
      }
    }
  }

  public getRouter(): JevRouter {
    return this.router;
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  private logSafetyDecision(reason: string, taskTextForHash: string): DecisionRecord {
    const now = this.now();
    const taskHash = hashTaskDescription(taskTextForHash);
    const sanitizedReason = sanitizeDecisionLogText(reason, this.extraSecretsToRedact);
    const record: DecisionRecord = {
      timestamp: now.toISOString(),
      task_hash: taskHash,
      taskHash,
      job_class: 'route',
      jobClass: 'route',
      lane: 'gemini-3.8-flash',
      node: 'Alienware',
      harness: 'agy',
      headless: true,
      post_gate: null,
      reason: sanitizedReason,
      ranking_date: 'safety-gate',
      rankingDateUsed: 'safety-gate',
      ranking_status: 'fresh ranking',
      stale_ranking: false,
      quota_fallback: false,
      cold_lanes: this.router.getActiveColdLanes(now),
      coldLaneState: this.router.getActiveColdLanes(now),
    };
    appendDecisionRecord(record, this.decisionsLogPath, this.extraSecretsToRedact);
    return record;
  }

  private routeTaskWithOptionalForcedLane(
    parsed: ParsedInboxTask
  ): {
    decision: DecisionRecord;
    forcedLaneHonoured: boolean;
  } {
    const now = this.now();
    const table = loadLaneTable(this.lanesPath);
    const profile = profileTask(parsed.taskText);
    const requestedLane = parsed.forcedLane?.trim() || null;

    if (requestedLane) {
      const existsInTable = isKnownLaneInTable(table, requestedLane);
      const isCold = existsInTable ? this.router.isLaneCold(requestedLane, now) : false;
      const forbiddenRouteToJudge =
        profile.jobClass === 'route' && (requestedLane === 'fable' || requestedLane === 'judge');

      if (existsInTable && !isCold && !forbiddenRouteToJudge) {
        const row = table.lanes[profile.jobClass];
        const rankingEval = loadNewestWeeklyRanking(this.rankingsDir, now);
        const activeCold = this.router.getActiveColdLanes(now);
        const taskHash = hashTaskDescription(parsed.taskText);
        const rankingDateUsed = rankingEval.stale
          ? `${rankingEval.rankingDate} (stale ranking, default ladder)`
          : rankingEval.rankingDate;
        const reason = sanitizeDecisionLogText(
          `Forced lane ${requestedLane} exists in lanes.json and was honoured. ${profile.reason}`,
          this.extraSecretsToRedact
        );

        const decision: DecisionRecord = {
          timestamp: now.toISOString(),
          task_hash: taskHash,
          taskHash,
          job_class: profile.jobClass,
          jobClass: profile.jobClass,
          lane: requestedLane,
          node: 'Alienware',
          harness: 'agy',
          headless: true,
          post_gate: row.postGate,
          reason,
          ranking_date: rankingDateUsed,
          rankingDateUsed,
          ranking_status: rankingEval.statusNote,
          stale_ranking: rankingEval.stale,
          quota_fallback: false,
          cold_lanes: activeCold,
          coldLaneState: activeCold,
        };
        appendDecisionRecord(decision, this.decisionsLogPath, this.extraSecretsToRedact);
        return { decision, forcedLaneHonoured: true };
      }

      // Forced lane does not exist in lanes.json (or is cold / forbidden): fall back to profiling
      const fallbackDecision = this.router.route(parsed.taskText, {
        now,
        lanesPath: this.lanesPath,
        rankingsDir: this.rankingsDir,
        decisionsLogPath: this.decisionsLogPath,
        extraSecretsToRedact: this.extraSecretsToRedact,
      });

      return { decision: fallbackDecision, forcedLaneHonoured: false };
    }

    const decision = this.router.route(parsed.taskText, {
      now,
      lanesPath: this.lanesPath,
      rankingsDir: this.rankingsDir,
      decisionsLogPath: this.decisionsLogPath,
      extraSecretsToRedact: this.extraSecretsToRedact,
    });
    return { decision, forcedLaneHonoured: false };
  }

  /**
   * Executes one tick of the headless inbox runner.
   */
  public async tick(): Promise<InboxTickResult> {
    // Safety 1: Refuse if inboxDir itself is under OneDrive
    if (isOneDrivePath(this.inboxDir)) {
      const rec = this.logSafetyDecision(
        'Inbox runner refused to run: configured inbox directory is under OneDrive.',
        'inbox-onedrive-guard'
      );
      return {
        status: 'refused-onedrive-inbox',
        taskId: null,
        fileName: null,
        repo: null,
        lane: null,
        jobClass: null,
        decisionHash: rec.task_hash,
        reason: rec.reason,
        prUrl: null,
        prCommentBody: null,
        requeued: false,
        requeueCount: 0,
        quotaFallbackTriggered: false,
        forcedLaneRequested: null,
        forcedLaneHonoured: false,
        worktreePath: null,
        branchName: null,
        baseBranch: null,
        worktreeRemoved: false,
        taskFinalPath: null,
        logFinalPath: null,
        transitions: [],
        attempts: [],
      };
    }

    const folders = ensureInboxFolders(this.inboxDir);

    // Concurrency guard: one task at a time, never two agy runs at once
    if (
      this.isTickActive ||
      listMarkdownTaskFilesSortedOldestFirst(folders.running).length > 0
    ) {
      return {
        status: 'busy',
        taskId: null,
        fileName: null,
        repo: null,
        lane: null,
        jobClass: null,
        decisionHash: null,
        reason: 'Inbox runner is busy: one task at a time, never two agy runs at once.',
        prUrl: null,
        prCommentBody: null,
        requeued: false,
        requeueCount: 0,
        quotaFallbackTriggered: false,
        forcedLaneRequested: null,
        forcedLaneHonoured: false,
        worktreePath: null,
        branchName: null,
        baseBranch: null,
        worktreeRemoved: false,
        taskFinalPath: null,
        logFinalPath: null,
        transitions: [],
        attempts: [],
      };
    }

    // Safety 2: Stop after three consecutive failures until a human clears failed/
    const failedFilesOnDisk = listMarkdownTaskFilesSortedOldestFirst(folders.failed);
    if (failedFilesOnDisk.length === 0) {
      this.consecutiveFailures = 0;
      this.stoppedUntilFailedCleared = false;
    } else if (
      this.stoppedUntilFailedCleared ||
      this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ||
      failedFilesOnDisk.length >= MAX_CONSECUTIVE_FAILURES
    ) {
      this.stoppedUntilFailedCleared = true;
      return {
        status: 'stopped-three-failures',
        taskId: null,
        fileName: null,
        repo: null,
        lane: null,
        jobClass: null,
        decisionHash: null,
        reason: `Inbox runner stopped after ${MAX_CONSECUTIVE_FAILURES} consecutive failures until a human clears failed/.`,
        prUrl: null,
        prCommentBody: null,
        requeued: false,
        requeueCount: 0,
        quotaFallbackTriggered: false,
        forcedLaneRequested: null,
        forcedLaneHonoured: false,
        worktreePath: null,
        branchName: null,
        baseBranch: null,
        worktreeRemoved: false,
        taskFinalPath: null,
        logFinalPath: null,
        transitions: [],
        attempts: [],
      };
    }

    // Check queued/ for the oldest markdown task file
    const queuedFiles = listMarkdownTaskFilesSortedOldestFirst(folders.queued);
    if (queuedFiles.length === 0) {
      return {
        status: 'idle',
        taskId: null,
        fileName: null,
        repo: null,
        lane: null,
        jobClass: null,
        decisionHash: null,
        reason: 'No task files in queued/.',
        prUrl: null,
        prCommentBody: null,
        requeued: false,
        requeueCount: 0,
        quotaFallbackTriggered: false,
        forcedLaneRequested: null,
        forcedLaneHonoured: false,
        worktreePath: null,
        branchName: null,
        baseBranch: null,
        worktreeRemoved: false,
        taskFinalPath: null,
        logFinalPath: null,
        transitions: [],
        attempts: [],
      };
    }

    // Safety 3: Refuse to run if gh is not signed in
    const ghAuthRes = await this.commandRunner({
      command: 'gh',
      args: ['auth', 'status'],
      cwd: this.repoRoot,
    });
    if (ghAuthRes.exitCode !== 0) {
      const rec = this.logSafetyDecision(
        'Inbox runner refused to run: gh CLI is not signed in (gh auth status failed).',
        queuedFiles[0]
      );
      return {
        status: 'refused-gh-auth',
        taskId: null,
        fileName: queuedFiles[0],
        repo: null,
        lane: null,
        jobClass: null,
        decisionHash: rec.task_hash,
        reason: rec.reason,
        prUrl: null,
        prCommentBody: null,
        requeued: false,
        requeueCount: 0,
        quotaFallbackTriggered: false,
        forcedLaneRequested: null,
        forcedLaneHonoured: false,
        worktreePath: null,
        branchName: null,
        baseBranch: null,
        worktreeRemoved: false,
        taskFinalPath: null,
        logFinalPath: null,
        transitions: [],
        attempts: [],
      };
    }

    const oldestFileName = queuedFiles[0];
    const queuedFilePath = path.join(folders.queued, oldestFileName);
    const runningFilePath = path.join(folders.running, oldestFileName);
    const transitions: string[] = [];

    this.isTickActive = true;
    try {
      // Move oldest file from queued/ to running/
      fs.renameSync(queuedFilePath, runningFilePath);
      transitions.push('queued -> running');

      const rawContent = fs.readFileSync(runningFilePath, 'utf8');
      const parsed = parseInboxTaskFile(rawContent, oldestFileName);

      // Repo-level concurrency guard: never two agy runs for the same repo at once
      if (this.activeRepos.has(parsed.repo)) {
        fs.renameSync(runningFilePath, queuedFilePath);
        transitions.push('running -> queued');
        return {
          status: 'busy',
          taskId: parsed.id,
          fileName: oldestFileName,
          repo: parsed.repo,
          lane: null,
          jobClass: null,
          decisionHash: null,
          reason: `Repo ${parsed.repo} already has an active agy run.`,
          prUrl: null,
          prCommentBody: null,
          requeued: false,
          requeueCount: 0,
          quotaFallbackTriggered: false,
          forcedLaneRequested: parsed.forcedLane,
          forcedLaneHonoured: false,
          worktreePath: null,
          branchName: null,
          baseBranch: null,
          worktreeRemoved: false,
          taskFinalPath: null,
          logFinalPath: null,
          transitions,
          attempts: [],
        };
      }

      this.activeRepos.add(parsed.repo);
      try {
        // Safety 4: Refuse a task file that names a path under OneDrive as its inbox
        if (taskNamesOneDriveInbox(rawContent, parsed.inboxHeader)) {
          const refusalRecord = this.logSafetyDecision(
            `Refused task ${parsed.id}: task file names a path under OneDrive as its inbox.`,
            rawContent
          );
          const failedTaskPath = path.join(folders.failed, oldestFileName);
          const failedLogPath = path.join(folders.failed, `${parsed.id}.log`);
          fs.renameSync(runningFilePath, failedTaskPath);
          fs.writeFileSync(
            failedLogPath,
            `${ sanitizeDecisionLogText(refusalRecord.reason, this.extraSecretsToRedact) }\n`,
            'utf8'
          );
          transitions.push('running -> failed');
          this.consecutiveFailures += 1;
          if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            this.stoppedUntilFailedCleared = true;
          }

          return {
            status: 'refused-onedrive-inbox',
            taskId: parsed.id,
            fileName: oldestFileName,
            repo: parsed.repo,
            lane: null,
            jobClass: null,
            decisionHash: refusalRecord.task_hash,
            reason: refusalRecord.reason,
            prUrl: null,
            prCommentBody: null,
            requeued: false,
            requeueCount: 0,
            quotaFallbackTriggered: false,
            forcedLaneRequested: parsed.forcedLane,
            forcedLaneHonoured: false,
            worktreePath: null,
            branchName: null,
            baseBranch: null,
            worktreeRemoved: false,
            taskFinalPath: failedTaskPath,
            logFinalPath: failedLogPath,
            transitions,
            attempts: [],
          };
        }

        // Resolve base branch from config line (or explicit override) and worktree paths
        const configuredBase =
          parsed.baseOverride ??
          this.explicitBaseBranch ??
          readBaseBranchFromConfig(this.configPath);
        const branchName = `ai/inbox/${parsed.id}`;
        if (branchName === 'main' || branchName === 'master') {
          throw new Error('Safety violation: inbox runner never checks out or touches main/master.');
        }

        const worktreePath = path.join(
          this.worktreeParentDir,
          `DREAM-Engine-wt-inbox-${parsed.id}`
        );

        // Create worktree under %USERPROFILE%\antigravity\DREAM-Engine-wt-inbox-<id> on branch ai/inbox/<id> from base
        await this.commandRunner({
          command: 'git',
          args: ['worktree', 'add', '-B', branchName, worktreePath, configuredBase],
          cwd: this.repoRoot,
        });

        // Profile task with core and select lane (honouring forced lane only if it exists in lanes.json)
        let { decision, forcedLaneHonoured } = this.routeTaskWithOptionalForcedLane(parsed);

        const basePromptWithRules = prependCookbookRulesToTask(parsed, {
          branchName,
          baseBranch: configuredBase,
        });

        let currentPrompt = basePromptWithRules;
        let requeueCount = 0;
        let quotaFallbackTriggered = false;
        const attempts: InboxAttemptRecord[] = [];
        const combinedLogs: string[] = [];

        const pollUntilDone = async (
          pollFn: () => Promise<DispatchPollResult>
        ): Promise<DispatchPollResult> => {
          let res = await pollFn();
          let polls = 1;
          while (!res.done && polls < 10) {
            res = await pollFn();
            polls += 1;
          }
          return res;
        };

        // Run first attempt
        let handle = await this.adapter.dispatch({
          jobId: `${parsed.id}-attempt-1`,
          prompt: currentPrompt,
          jobClass: decision.job_class,
          lane: decision.lane,
          harness: 'agy',
          node: 'Alienware',
          cwd: worktreePath,
        });
        let pollResult = await pollUntilDone(handle.poll);
        combinedLogs.push(pollResult.output);

        // Check for quota or 429 error on first attempt
        const quotaCheck = detectQuotaOr429Error(
          pollResult.output,
          pollResult.error,
          pollResult.exitCode
        );
        if (quotaCheck.isQuotaError) {
          attempts.push({
            attemptNumber: attempts.length + 1,
            lane: decision.lane,
            jobClass: decision.job_class,
            decisionHash: decision.task_hash,
            prompt: currentPrompt,
            prUrl: null,
            eyesReportFirstLine: null,
            quotaError: true,
            passedJudge: false,
            failureReason: `Quota or 429 error on ${decision.lane}: ${quotaCheck.errorSummary}`,
            output: pollResult.output,
          });

          // Mark the lane cold through the core and re-queue the task once on the fallback lane
          this.router.reportQuotaError(
            decision.lane,
            pollResult.output || pollResult.error || quotaCheck.errorSummary,
            this.now()
          );
          quotaFallbackTriggered = true;

          // Re-queue transition through queued/ -> running/
          fs.renameSync(runningFilePath, queuedFilePath);
          transitions.push('running -> queued (quota fallback)');
          fs.renameSync(queuedFilePath, runningFilePath);
          transitions.push('queued -> running (quota fallback)');

          decision = this.router.route(parsed.taskText, {
            now: this.now(),
            lanesPath: this.lanesPath,
            rankingsDir: this.rankingsDir,
            decisionsLogPath: this.decisionsLogPath,
            extraSecretsToRedact: this.extraSecretsToRedact,
          });

          handle = await this.adapter.dispatch({
            jobId: `${parsed.id}-fallback`,
            prompt: currentPrompt,
            jobClass: decision.job_class,
            lane: decision.lane,
            harness: 'agy',
            node: 'Alienware',
            cwd: worktreePath,
          });
          pollResult = await pollUntilDone(handle.poll);
          combinedLogs.push(pollResult.output);
        }

        // Judge evaluation helper (PR URL present, plus Eyes PASS for design-visual)
        const evaluateJudge = (
          res: DispatchPollResult,
          activeDecision: DecisionRecord
        ): {
          passed: boolean;
          prUrl: string | null;
          eyesFirstLine: string | null;
          failureReason: string | null;
        } => {
          const prUrl = res.prUrl ?? parsePrUrlFromOutput(res.output);
          const isDesignVisual =
            activeDecision.job_class === 'design-visual' || activeDecision.post_gate === 'eyes';
          const eyesVerdict = isDesignVisual
            ? parseEyesGateVerdictFromOutput(res.output, res.eyesReportFirstLine)
            : null;

          const failures: string[] = [];
          if (!prUrl) {
            failures.push('missing PR URL in lane output');
          }
          if (isDesignVisual && (!eyesVerdict || !eyesVerdict.passed)) {
            failures.push(
              eyesVerdict?.firstLine
                ? `Eyes gate report did not pass (first line: "${eyesVerdict.firstLine}")`
                : 'missing Eyes gate PASS report for design-visual task'
            );
          }

          return {
            passed: failures.length === 0 && Boolean(prUrl),
            prUrl: prUrl ?? null,
            eyesFirstLine: eyesVerdict?.firstLine ?? res.eyesReportFirstLine ?? null,
            failureReason:
              failures.length > 0 ? `Judge check failed: ${failures.join('; ')}.` : null,
          };
        };

        let judgeEval = evaluateJudge(pollResult, decision);
        attempts.push({
          attemptNumber: attempts.length + 1,
          lane: decision.lane,
          jobClass: decision.job_class,
          decisionHash: decision.task_hash,
          prompt: currentPrompt,
          prUrl: judgeEval.prUrl,
          eyesReportFirstLine: judgeEval.eyesFirstLine,
          quotaError: false,
          passedJudge: judgeEval.passed,
          failureReason: judgeEval.failureReason,
          output: pollResult.output,
        });

        // If judge step failed (e.g. task without a PR), re-queue once then fail if still missing
        if (!judgeEval.passed) {
          requeueCount = 1;
          fs.renameSync(runningFilePath, queuedFilePath);
          transitions.push('running -> queued (re-queue 1)');
          fs.renameSync(queuedFilePath, runningFilePath);
          transitions.push('queued -> running (re-queue 1)');

          currentPrompt = `${basePromptWithRules}\n\n[Re-queued after failure: ${judgeEval.failureReason}]`;
          const retryRoute = this.routeTaskWithOptionalForcedLane(parsed);
          decision = retryRoute.decision;

          handle = await this.adapter.dispatch({
            jobId: `${parsed.id}-requeue-1`,
            prompt: currentPrompt,
            jobClass: decision.job_class,
            lane: decision.lane,
            harness: 'agy',
            node: 'Alienware',
            cwd: worktreePath,
          });
          pollResult = await pollUntilDone(handle.poll);
          combinedLogs.push(pollResult.output);

          judgeEval = evaluateJudge(pollResult, decision);
          attempts.push({
            attemptNumber: attempts.length + 1,
            lane: decision.lane,
            jobClass: decision.job_class,
            decisionHash: decision.task_hash,
            prompt: currentPrompt,
            prUrl: judgeEval.prUrl,
            eyesReportFirstLine: judgeEval.eyesFirstLine,
            quotaError: false,
            passedJudge: judgeEval.passed,
            failureReason: judgeEval.failureReason,
            output: pollResult.output,
          });
        }

        const sanitizedLogContent = sanitizeDecisionLogText(
          combinedLogs.filter(Boolean).join('\n--- attempt ---\n'),
          this.extraSecretsToRedact
        );

        let prCommentBody: string | null = null;
        let taskFinalPath: string;
        let logFinalPath: string;
        let finalStatus: 'done' | 'failed';

        if (judgeEval.passed && judgeEval.prUrl) {
          finalStatus = 'done';
          const testSummary = extractTestSummaryFromLog(pollResult.output);
          prCommentBody = formatRouterPrComment({
            lane: decision.lane,
            node: 'Alienware',
            jobClass: decision.job_class,
            reason: decision.reason,
            decisionHash: decision.task_hash,
            testSummary,
            extraSecretsToRedact: this.extraSecretsToRedact,
          });

          // Post router report comment on the PR via gh
          await this.commandRunner({
            command: 'gh',
            args: ['pr', 'comment', judgeEval.prUrl, '--body', prCommentBody],
            cwd: this.repoRoot,
          });

          taskFinalPath = path.join(folders.done, oldestFileName);
          logFinalPath = path.join(folders.done, `${parsed.id}.log`);
          fs.renameSync(runningFilePath, taskFinalPath);
          fs.writeFileSync(logFinalPath, `${sanitizedLogContent}\n`, 'utf8');
          transitions.push('running -> done');
          this.consecutiveFailures = 0;
          this.stoppedUntilFailedCleared = false;
        } else {
          finalStatus = 'failed';
          taskFinalPath = path.join(folders.failed, oldestFileName);
          logFinalPath = path.join(folders.failed, `${parsed.id}.log`);
          fs.renameSync(runningFilePath, taskFinalPath);
          fs.writeFileSync(logFinalPath, `${sanitizedLogContent}\n`, 'utf8');
          transitions.push('running -> failed');
          this.consecutiveFailures += 1;
          if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            this.stoppedUntilFailedCleared = true;
          }
        }

        // Remove the worktree ONLY if the branch was pushed to origin
        const lsRemoteRes = await this.commandRunner({
          command: 'git',
          args: ['ls-remote', '--heads', 'origin', `refs/heads/${branchName}`],
          cwd: this.repoRoot,
        });
        const branchWasPushed =
          lsRemoteRes.exitCode === 0 && lsRemoteRes.stdout.trim().length > 0;
        let worktreeRemoved = false;
        if (branchWasPushed) {
          const rmRes = await this.commandRunner({
            command: 'git',
            args: ['worktree', 'remove', worktreePath, '--force'],
            cwd: this.repoRoot,
          });
          worktreeRemoved = rmRes.exitCode === 0;
        }

        return {
          status: finalStatus,
          taskId: parsed.id,
          fileName: oldestFileName,
          repo: parsed.repo,
          lane: decision.lane,
          jobClass: decision.job_class,
          decisionHash: decision.task_hash,
          reason: judgeEval.passed
            ? decision.reason
            : judgeEval.failureReason ?? 'Judge check failed.',
          prUrl: judgeEval.prUrl,
          prCommentBody,
          requeued: requeueCount > 0,
          requeueCount,
          quotaFallbackTriggered,
          forcedLaneRequested: parsed.forcedLane,
          forcedLaneHonoured,
          worktreePath,
          branchName,
          baseBranch: configuredBase,
          worktreeRemoved,
          taskFinalPath,
          logFinalPath,
          transitions,
          attempts,
        };
      } finally {
        this.activeRepos.delete(parsed.repo);
      }
    } finally {
      this.isTickActive = false;
    }
  }
}

/**
 * Helper for creating a mock CommandRunner in tests (simulating gh auth, git worktree, gh pr comment, git ls-remote).
 */
export function createMockInboxCommandRunner(options?: {
  ghSignedIn?: boolean;
  branchPushed?: boolean | ((branchName: string) => boolean);
  onCommand?: (req: CommandExecRequest) => void;
}): {
  runner: CommandRunner;
  commands: CommandExecRequest[];
} {
  const commands: CommandExecRequest[] = [];
  const ghSignedIn = options?.ghSignedIn ?? true;

  const runner: CommandRunner = async (req: CommandExecRequest): Promise<CommandExecResult> => {
    commands.push(req);
    options?.onCommand?.(req);

    if (req.command === 'gh' && req.args[0] === 'auth' && req.args[1] === 'status') {
      return ghSignedIn
        ? { exitCode: 0, stdout: 'Logged in to github.com', stderr: '' }
        : { exitCode: 1, stdout: '', stderr: 'You are not logged into any GitHub hosts.' };
    }

    if (req.command === 'git' && req.args[0] === 'ls-remote') {
      const refArg = req.args[3] ?? '';
      const branchName = refArg.replace(/^refs\/heads\//, '');
      const pushed =
        typeof options?.branchPushed === 'function'
          ? options.branchPushed(branchName)
          : (options?.branchPushed ?? true);
      return {
        exitCode: 0,
        stdout: pushed ? `deadbeef1234567890\trefs/heads/${branchName}\n` : '',
        stderr: '',
      };
    }

    return { exitCode: 0, stdout: 'ok', stderr: '' };
  };

  return { runner, commands };
}

// CLI entrypoint when invoked directly (e.g. by DreamRouterInbox scheduled task)
const isMainModule =
  Boolean(process.argv[1]) &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
  const once = process.argv.includes('--once');
  const intervalIdx = process.argv.indexOf('--interval-ms');
  const intervalMs =
    intervalIdx >= 0 && process.argv[intervalIdx + 1]
      ? Math.max(1000, Number(process.argv[intervalIdx + 1]) || 15_000)
      : 15_000;

  const runner = new InboxRunner();
  if (once) {
    runner.tick().catch((err) => {
      process.stderr.write(
        `${sanitizeDecisionLogText(err instanceof Error ? err.message : String(err))}\n`
      );
      process.exitCode = 1;
    });
  } else {
    const loop = async () => {
      try {
        await runner.tick();
      } catch (err) {
        process.stderr.write(
          `${sanitizeDecisionLogText(err instanceof Error ? err.message : String(err))}\n`
        );
      }
    };
    void loop();
    setInterval(() => {
      void loop();
    }, intervalMs);
  }
}
