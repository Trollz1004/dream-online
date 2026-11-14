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
  DEFAULT_RUNNER_GH_CONFIG_DIR,
  defaultCommandRunner,
  detectQuotaOr429Error,
  type DispatchAdapter,
  type DispatchPollResult,
  parseEyesGateVerdictFromOutput,
  parsePrUrlFromOutput,
  resolveRunnerGhConfigDir,
  RUNNER_GH_CONFIG_DIR_PORTABLE,
  scrubLaneEnv,
} from './adapters/index.ts';

export { DEFAULT_RUNNER_GH_CONFIG_DIR, resolveRunnerGhConfigDir, RUNNER_GH_CONFIG_DIR_PORTABLE };
import {
  appendDecisionRecord,
  type DecisionRecord,
  DEFAULT_DECISIONS_LOG_PATH,
  DEFAULT_LANES_PATH,
  DEFAULT_RANKINGS_DIR,
  type ExecutorJobClass,
  hashTaskDescription,
  isExecutorJobClass,
  type JevJobClass,
  JevRouter,
  JUDGE_HARNESS,
  type LaneTable,
  loadLaneTable,
  loadNewestWeeklyRanking,
  profileTask,
  resolveLaneHarness,
  sanitizeDecisionLogText,
} from './dream-task-router.ts';

const ROUTER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = path.resolve(ROUTER_DIR, '..', '..');
export const DEFAULT_INBOX_DIR = path.join(os.homedir(), 'antigravity', '.fable-kitchen', 'inbox');
export const DEFAULT_RUNNER_RESTART_LOG_PATH = path.join(
  os.homedir(),
  'antigravity',
  '.fable-kitchen',
  'runner-restart.log'
);
export const DEFAULT_WORKTREE_PARENT_DIR = path.join(os.homedir(), 'antigravity');
export const DEFAULT_INBOX_CONFIG_PATH = path.join(ROUTER_DIR, 'INBOX.md');
export const DEFAULT_BASE_BRANCH = 'origin/main';
export const DEFAULT_REPOS_PATH = path.join(ROUTER_DIR, 'repos.json');
export const DEFAULT_REPO_NAME = 'dream-online';
export const ANTIGRAVITY_REPO_ROOT_ENV = 'ANTIGRAVITY_REPO_ROOT';
export const DREAM_INTAKE_REPO_ROOT_ENV = 'DREAM_INTAKE_REPO_ROOT';
export const MAX_CONSECUTIVE_FAILURES = 3;
export const LANE_LIVENESS_TIMEOUT_MS = 10 * 60 * 1000;
export const LANE_PROCESS_MISSING_REASON = 'lane process missing';

export const INBOX_SUBFOLDERS = ['queued', 'running', 'done', 'failed', 'for-judge'] as const;
export type InboxSubfolder = (typeof INBOX_SUBFOLDERS)[number];

export interface InboxFolders {
  root: string;
  queued: string;
  running: string;
  done: string;
  failed: string;
  /** Tasks for the judge lane (a live Claude session). The runner parks them here and never starts agy. */
  forJudge: string;
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
  exitCode?: number | null;
}

export type InboxTickStatus =
  | 'idle'
  | 'busy'
  | 'done'
  | 'failed'
  | 'stopped-three-failures'
  | 'refused-gh-auth'
  | 'refused-gh-owner'
  | 'refused-onedrive-inbox'
  | 'refused-unknown-repo'
  | 'refused-repo-root-missing'
  | 'parked-for-judge';

export interface InboxTickResult {
  status: InboxTickStatus;
  taskId: string | null;
  fileName: string | null;
  repo: string | null;
  repoRoot: string | null;
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
  ghConfigDir?: string;
  worktreeParentDir?: string;
  repoRoot?: string;
  reposPath?: string;
  env?: NodeJS.ProcessEnv;
  configPath?: string;
  baseBranch?: string;
  lanesPath?: string;
  rankingsDir?: string;
  decisionsLogPath?: string;
  runnerRestartLogPath?: string;
  stoppedPollIntervalMs?: number;
  router?: JevRouter;
  adapter?: DispatchAdapter;
  commandRunner?: CommandRunner;
  now?: () => Date;
  extraSecretsToRedact?: string[];
  /** Optional liveness probe returning whether an agy child process is currently alive under the runner. */
  hasAgyChildProcess?: () => Promise<boolean> | boolean;
}

/**
 * Ensures the local inbox folder and its required subfolders (queued, running, done, failed, for-judge) exist.
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
    forJudge: path.join(inboxDir, 'for-judge'),
  };
  for (const dir of [
    folders.root,
    folders.queued,
    folders.running,
    folders.done,
    folders.failed,
    folders.forJudge,
  ]) {
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

export interface RepoMapEntry {
  /** `self` means the runner's own repo root. */
  root?: string;
  /** Name of the environment variable that holds the repo root folder. */
  rootEnv?: string;
  /** Root used when `rootEnv` is unset or empty; may contain %NAME% placeholders such as %USERPROFILE%. */
  defaultRoot?: string;
  /** Worktree folder prefix; the task id is appended. */
  worktreePrefix?: string;
}

export interface RepoMap {
  /** GitHub login gh must be signed in as before the runner makes any gh call. */
  expectedOwner: string;
  repos: Record<string, RepoMapEntry>;
}

export interface ResolvedRepoTarget {
  /** Canonical repo name as written in the repo map. */
  name: string;
  root: string;
  worktreePrefix: string;
  /** Human-readable origin of the root (for messages), never an env value. */
  rootSource: string;
}

export type RepoResolution =
  | { ok: true; target: ResolvedRepoTarget }
  | { ok: false; reason: string };

/**
 * Loads and validates the repo map (ops/router/repos.json) that backs the task file `repo:` selector.
 */
export function loadRepoMap(reposPath: string = DEFAULT_REPOS_PATH): RepoMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(reposPath, 'utf8'));
  } catch (err) {
    throw new Error(
      `Inbox runner cannot load the repo map at ${path.basename(reposPath)}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
  const repos = (parsed as { repos?: unknown } | null)?.repos;
  if (!repos || typeof repos !== 'object' || Array.isArray(repos)) {
    throw new Error('Inbox runner repo map must contain a "repos" object.');
  }
  const expectedOwner = (parsed as { expectedOwner?: unknown } | null)?.expectedOwner;
  if (typeof expectedOwner !== 'string' || !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(expectedOwner.trim())) {
    throw new Error('Inbox runner repo map must contain an "expectedOwner" GitHub login.');
  }
  const map: RepoMap = { expectedOwner: expectedOwner.trim(), repos: repos as Record<string, RepoMapEntry> };
  for (const [name, entry] of Object.entries(map.repos)) {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Inbox runner repo map entry ${name} must be an object.`);
    }
    if (entry.root !== 'self' && !entry.rootEnv && !entry.defaultRoot) {
      throw new Error(
        `Inbox runner repo map entry ${name} needs root "self", a rootEnv, or a defaultRoot.`
      );
    }
  }
  if (!Object.hasOwn(map.repos, DEFAULT_REPO_NAME)) {
    throw new Error(`Inbox runner repo map must contain the default repo ${DEFAULT_REPO_NAME}.`);
  }
  return map;
}

function readEnvValue(env: NodeJS.ProcessEnv, name: string): string | undefined {
  if (Object.hasOwn(env, name)) return env[name];
  const lower = name.toLowerCase();
  const key = Object.keys(env).find((candidate) => candidate.toLowerCase() === lower);
  return key === undefined ? undefined : env[key];
}

/**
 * Expands %NAME% placeholders from the environment (USERPROFILE falls back to the OS home folder).
 * Returns null when a placeholder cannot be resolved.
 */
export function expandEnvPlaceholders(value: string, env: NodeJS.ProcessEnv = process.env): string | null {
  let unresolved = false;
  const expanded = value.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (_match, name: string) => {
    let resolved = readEnvValue(env, name)?.trim();
    if (!resolved && name.toUpperCase() === 'USERPROFILE') {
      resolved = os.homedir();
    }
    if (!resolved) {
      unresolved = true;
      return '';
    }
    return resolved;
  });
  return unresolved ? null : expanded;
}

/**
 * Writes the user folder back as %USERPROFILE% so messages and logs never carry a user folder name.
 */
export function toPortablePath(absolutePath: string, env: NodeJS.ProcessEnv = process.env): string {
  const homes = [readEnvValue(env, 'USERPROFILE')?.trim(), os.homedir()].filter(
    (home): home is string => Boolean(home)
  );
  const normalizedTarget = absolutePath.replace(/\\/g, '/');
  for (const home of homes) {
    const trimmed = home.replace(/[\\/]+$/, '').replace(/\\/g, '/');
    if (trimmed && normalizedTarget.toLowerCase().startsWith(trimmed.toLowerCase())) {
      return `%USERPROFILE%${normalizedTarget.slice(trimmed.length).replace(/\//g, '\\')}`;
    }
  }
  return absolutePath;
}

/**
 * Resolves a task file `repo:` value through the repo map to a repo root folder.
 * `dream-online` is the runner's own repo root; `ANTIGRAVITY` is the folder named in the
 * ANTIGRAVITY_REPO_ROOT environment variable (default from the map). An unknown repo is refused.
 */
export function resolveRepoTarget(
  repoName: string,
  options: { map: RepoMap; env?: NodeJS.ProcessEnv; selfRoot?: string }
): RepoResolution {
  const env = options.env ?? process.env;
  const requested = (repoName ?? '').trim() || DEFAULT_REPO_NAME;
  const knownNames = Object.keys(options.map.repos);
  const canonical = knownNames.find((name) => name.toLowerCase() === requested.toLowerCase());
  if (!canonical) {
    return {
      ok: false,
      reason: `unknown repo "${requested}". Known repos: ${[...knownNames]
        .sort((a, b) => a.localeCompare(b))
        .join(', ')} (see ops/router/repos.json).`,
    };
  }

  const entry = options.map.repos[canonical];
  const worktreePrefix = entry.worktreePrefix?.trim() || `${canonical}-wt-inbox-`;

  if (entry.root === 'self') {
    return {
      ok: true,
      target: {
        name: canonical,
        root: path.resolve(options.selfRoot ?? DEFAULT_REPO_ROOT),
        worktreePrefix,
        rootSource: 'the runner repo root',
      },
    };
  }

  const fromEnv = entry.rootEnv ? readEnvValue(env, entry.rootEnv)?.trim() : undefined;
  const rawRoot = fromEnv || entry.defaultRoot;
  const rootSource = fromEnv
    ? `the ${entry.rootEnv} environment variable`
    : `the default root of repo ${canonical}${entry.rootEnv ? ` (set ${entry.rootEnv} to override)` : ''}`;
  if (!rawRoot) {
    return {
      ok: false,
      reason: `repo ${canonical} has no root; set ${entry.rootEnv ?? 'a root'} in the environment.`,
    };
  }
  const expanded = expandEnvPlaceholders(rawRoot, env);
  if (!expanded) {
    return {
      ok: false,
      reason: `the root of repo ${canonical} (${rootSource}) uses an environment variable that is not set.`,
    };
  }
  const root = path.resolve(path.normalize(expanded.replace(/[\\/]/g, path.sep)));
  return { ok: true, target: { name: canonical, root, worktreePrefix, rootSource } };
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
  let repo = DEFAULT_REPO_NAME;
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
  const lower = normalized.toLowerCase();

  if (isExecutorJobClass(lower)) {
    return Boolean(table.lanes[lower]);
  }

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
  public static readonly STOPPED_POLL_INTERVAL_MS = 60_000;

  private readonly inboxDir: string;
  private readonly ghConfigDir: string;
  private readonly worktreeParentDir: string;
  private readonly repoRoot: string;
  private readonly repoMap: RepoMap;
  private readonly env: NodeJS.ProcessEnv;
  /** The environment every lane and every runner git/gh call gets: GH_CONFIG_DIR set to the runner folder, GitHub token variables removed, no .env loaded. */
  private readonly laneEnv: NodeJS.ProcessEnv;
  private readonly configPath: string;
  private readonly explicitBaseBranch?: string;
  private readonly lanesPath: string;
  private readonly rankingsDir: string;
  private readonly decisionsLogPath: string;
  private readonly runnerRestartLogPath: string;
  private readonly stoppedPollIntervalMs: number;
  private readonly router: JevRouter;
  private readonly adapter: DispatchAdapter;
  private readonly commandRunner: CommandRunner;
  private readonly now: () => Date;
  private readonly extraSecretsToRedact: string[];
  private readonly customHasAgyChildProcess?: () => Promise<boolean> | boolean;

  private isTickActive = false;
  private startupGhChecked = false;
  private readonly activeRepos = new Set<string>();
  private readonly livenessRequeuedTaskIds = new Set<string>();
  private consecutiveFailures = 0;
  private stoppedUntilFailedCleared = false;
  private stoppedCheckTimer: NodeJS.Timeout | null = null;

  constructor(options?: InboxRunnerOptions) {
    this.inboxDir = options?.inboxDir ?? DEFAULT_INBOX_DIR;
    this.worktreeParentDir = options?.worktreeParentDir ?? DEFAULT_WORKTREE_PARENT_DIR;
    this.repoRoot = options?.repoRoot ?? DEFAULT_REPO_ROOT;
    this.env = options?.env ?? process.env;
    this.ghConfigDir = options?.ghConfigDir ?? resolveRunnerGhConfigDir(this.env);
    // GH_TOKEN, GITHUB_TOKEN and GH_ENTERPRISE_TOKEN are removed from everything handed to a lane,
    // and GH_CONFIG_DIR is set to %USERPROFILE%\antigravity\.fable-kitchen\gh-runner so no other lane can switch it.
    this.laneEnv = scrubLaneEnv(this.env, this.ghConfigDir);
    // Fail fast at startup (before any task file moves) if the repo map cannot be loaded
    this.repoMap = loadRepoMap(options?.reposPath ?? DEFAULT_REPOS_PATH);
    this.configPath = options?.configPath ?? DEFAULT_INBOX_CONFIG_PATH;
    this.explicitBaseBranch = options?.baseBranch;
    this.lanesPath = options?.lanesPath ?? DEFAULT_LANES_PATH;
    this.rankingsDir = options?.rankingsDir ?? DEFAULT_RANKINGS_DIR;
    this.decisionsLogPath = options?.decisionsLogPath ?? DEFAULT_DECISIONS_LOG_PATH;
    this.runnerRestartLogPath =
      options?.runnerRestartLogPath ??
      path.join(path.dirname(this.inboxDir), 'runner-restart.log');
    this.stoppedPollIntervalMs =
      options?.stoppedPollIntervalMs ?? InboxRunner.STOPPED_POLL_INTERVAL_MS;
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
    this.customHasAgyChildProcess = options?.hasAgyChildProcess;
    this.adapter =
      options?.adapter ??
      new AgyDispatchAdapter({
        kitchenDir: path.dirname(this.inboxDir),
        ghConfigDir: this.ghConfigDir,
        runner: this.commandRunner,
        lanesPath: this.lanesPath,
        now: this.now,
      });

    // If failed/ already holds 3 or more failed task files on startup, start in stopped state
    const failedDir = path.join(this.inboxDir, 'failed');
    if (!isOneDrivePath(this.inboxDir) && fs.existsSync(failedDir)) {
      const existingFailed = listMarkdownTaskFilesSortedOldestFirst(failedDir).length;
      if (existingFailed >= MAX_CONSECUTIVE_FAILURES) {
        this.consecutiveFailures = existingFailed;
        this.enterStoppedState(failedDir);
      }
    }
  }

  public getRouter(): JevRouter {
    return this.router;
  }

  public getGhConfigDir(): string {
    return this.ghConfigDir;
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  public isStopped(): boolean {
    return this.stoppedUntilFailedCleared;
  }

  public getRunnerRestartLogPath(): string {
    return this.runnerRestartLogPath;
  }

  /**
   * Checks failed\ while stopped and resumes on its own once fewer than 3 task files remain.
   */
  public checkFailedFolderAndResume(): boolean {
    if (!this.stoppedUntilFailedCleared) {
      return true;
    }
    const failedDir = path.join(this.inboxDir, 'failed');
    const failedCount = fs.existsSync(failedDir)
      ? listMarkdownTaskFilesSortedOldestFirst(failedDir).length
      : 0;
    if (failedCount < MAX_CONSECUTIVE_FAILURES) {
      this.consecutiveFailures = 0;
      this.stoppedUntilFailedCleared = false;
      this.stopFailedClearTimer();
      return true;
    }
    return false;
  }

  private startFailedClearTimer(): void {
    if (this.stoppedCheckTimer) return;
    this.stoppedCheckTimer = setInterval(() => {
      this.checkFailedFolderAndResume();
    }, this.stoppedPollIntervalMs);
    this.stoppedCheckTimer.unref?.();
  }

  private stopFailedClearTimer(): void {
    if (this.stoppedCheckTimer) {
      clearInterval(this.stoppedCheckTimer);
      this.stoppedCheckTimer = null;
    }
  }

  /**
   * Enters the stopped-until-failed-cleared state and writes one explanatory line to
   * ops/router/decisions.log and one line to runner-restart.log.
   */
  private enterStoppedState(failedDir: string): void {
    if (this.stoppedUntilFailedCleared) return;
    this.stoppedUntilFailedCleared = true;
    const failedFiles = listMarkdownTaskFilesSortedOldestFirst(failedDir);
    const fileList = failedFiles.length > 0 ? failedFiles.join(', ') : 'none';
    const msg = `Inbox runner stopped: ${failedFiles.length} failures in failed\\ (${fileList}). Move them to failed-cleared\\ to resume.`;
    const rec = this.logSafetyDecision(msg, 'stopped-three-failures');

    try {
      const restartLogDir = path.dirname(this.runnerRestartLogPath);
      if (!fs.existsSync(restartLogDir)) {
        fs.mkdirSync(restartLogDir, { recursive: true });
      }
      const iso = this.now().toISOString();
      const restartLogLine = `${iso} ${rec.reason}\n`;
      fs.appendFileSync(this.runnerRestartLogPath, restartLogLine, 'utf8');
    } catch {
      // Best-effort writing to runner-restart.log
    }
    this.startFailedClearTimer();
  }

  /** Runs a git or gh command with the scrubbed environment (dedicated GH_CONFIG_DIR, no GitHub token variables). */
  private runCommand(req: CommandExecRequest): Promise<CommandExecResult> {
    return this.commandRunner({ ...req, env: this.laneEnv });
  }

  /**
   * Checks whether an agy child process is currently alive under the runner process.
   */
  public async hasLiveAgyChildProcess(): Promise<boolean> {
    if (this.customHasAgyChildProcess) {
      return Boolean(await this.customHasAgyChildProcess());
    }
    if (process.platform === 'win32') {
      const res = await this.runCommand({
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `$p = ${process.pid}; Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $p -and $_.Name -match '^agy(\\.exe)?$' } | Select-Object -ExpandProperty Name`,
        ],
        cwd: this.repoRoot,
      });
      return res.exitCode === 0 && /\bagy(?:\.exe)?\b/i.test(res.stdout);
    }
    const res = await this.runCommand({
      command: 'ps',
      args: ['-o', 'comm=', '--ppid', String(process.pid)],
      cwd: this.repoRoot,
    });
    return res.exitCode === 0 && /\bagy(?:\.exe)?\b/i.test(res.stdout);
  }

  /**
   * Reads the signed-in GitHub login in the runner's dedicated GH_CONFIG_DIR with `gh api user`
   * and compares it to the expected owner from ops/router/repos.json.
   * Returns null when they match, otherwise the refusal to log and return.
   */
  private async checkGhOwner(): Promise<{ status: 'refused-gh-auth' | 'refused-gh-owner'; reason: string } | null> {
    const expected = this.repoMap.expectedOwner;
    const portableFolder = toPortablePath(this.ghConfigDir, this.env);
    const res = await this.runCommand({
      command: 'gh',
      args: ['api', 'user', '--jq', '.login'],
      cwd: this.repoRoot,
    });
    const login = res.stdout.trim();
    if (res.exitCode !== 0 || !login) {
      return {
        status: 'refused-gh-auth',
        reason: `runner gh config empty: run gh auth login with GH_CONFIG_DIR set to ${portableFolder}`,
      };
    }
    if (login.toLowerCase() !== expected.toLowerCase()) {
      return {
        status: 'refused-gh-owner',
        reason: `Inbox runner refused to run: gh is signed in as ${login} in ${portableFolder} but ops/router/repos.json expects ${expected}; run gh auth switch to ${expected} and the task will start on the next tick.`,
      };
    }
    return null;
  }

  /** True when branchName exists on origin in the given repo root. */
  private async isBranchPushed(repoRoot: string, branchName: string): Promise<boolean> {
    const res = await this.runCommand({
      command: 'git',
      args: ['ls-remote', '--heads', 'origin', `refs/heads/${branchName}`],
      cwd: repoRoot,
    });
    return res.exitCode === 0 && res.stdout.trim().length > 0;
  }

  /**
   * After a lane pushed its branch, makes sure a PR exists: returns the PR the lane opened, an already open
   * PR for the branch, or opens one itself with gh (title and body from the lane's report). A lane's own gh
   * trouble therefore never marks finished work as failed. Returns the failure line when it cannot.
   */
  private async ensurePullRequest(params: {
    repoRoot: string;
    branchName: string;
    baseBranch: string;
    taskTitle: string;
    laneOutput: string;
    laneName: string;
  }): Promise<{ prUrl: string | null; note: string | null }> {
    if (!(await this.isBranchPushed(params.repoRoot, params.branchName))) {
      return { prUrl: null, note: null };
    }
    const existing = await this.runCommand({
      command: 'gh',
      args: ['pr', 'view', params.branchName, '--json', 'url', '--jq', '.url'],
      cwd: params.repoRoot,
    });
    const existingUrl = existing.exitCode === 0 ? parsePrUrlFromOutput(existing.stdout) : null;
    if (existingUrl) {
      return { prUrl: existingUrl, note: 'PR already open for the pushed branch' };
    }

    const report = sanitizeDecisionLogText(params.laneOutput, this.extraSecretsToRedact);
    const titleLine = report
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^(?:PR title|Title)\s*:\s*\S/i.test(line));
    const title = (titleLine ? titleLine.replace(/^[^:]+:\s*/, '') : params.taskTitle).slice(0, 200);
    const reportTail = report.length > 20_000 ? `...${report.slice(-20_000)}` : report;
    const body = [
      `Opened by the inbox runner because lane ${params.laneName} pushed ${params.branchName} but did not open a pull request.`,
      '',
      "Lane report:",
      '',
      reportTail.trim() || '(the lane printed no report)',
    ].join('\n');

    const created = await this.runCommand({
      command: 'gh',
      args: [
        'pr',
        'create',
        '--base',
        params.baseBranch.replace(/^origin\//, ''),
        '--head',
        params.branchName,
        '--title',
        title,
        '--body',
        body,
      ],
      cwd: params.repoRoot,
    });
    const createdUrl = created.exitCode === 0 ? parsePrUrlFromOutput(created.stdout) : null;
    if (createdUrl) {
      return { prUrl: createdUrl, note: 'runner opened the PR with gh' };
    }
    const detail = sanitizeDecisionLogText(
      (created.stderr || created.stdout || `gh exited with code ${created.exitCode}`).trim().split(/\r?\n/)[0],
      this.extraSecretsToRedact
    );
    return { prUrl: null, note: `runner could not open the PR with gh: ${detail}` };
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

  /**
   * Moves a task that was refused before any run (unknown repo, missing repo root) from running/ to failed/
   * with a log beside it, records the safety decision, and counts it toward the three-failure stop.
   */
  private refuseTaskBeforeRun(params: {
    status: 'refused-unknown-repo' | 'refused-repo-root-missing';
    reason: string;
    parsed: ParsedInboxTask;
    oldestFileName: string;
    runningFilePath: string;
    failedDir: string;
    repoName: string;
    repoRoot: string | null;
    transitions: string[];
  }): InboxTickResult {
    const refusalRecord = this.logSafetyDecision(params.reason, params.parsed.rawContent);
    const failedTaskPath = path.join(params.failedDir, params.oldestFileName);
    const failedLogPath = path.join(params.failedDir, `${params.parsed.id}.log`);
    fs.renameSync(params.runningFilePath, failedTaskPath);
    fs.writeFileSync(failedLogPath, `${refusalRecord.reason}\n`, 'utf8');
    params.transitions.push('running -> failed');
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.enterStoppedState(params.failedDir);
    }
    return {
      status: params.status,
      taskId: params.parsed.id,
      fileName: params.oldestFileName,
      repo: sanitizeDecisionLogText(params.repoName, this.extraSecretsToRedact),
      repoRoot: params.repoRoot,
      lane: null,
      jobClass: null,
      decisionHash: refusalRecord.task_hash,
      reason: refusalRecord.reason,
      prUrl: null,
      prCommentBody: null,
      requeued: false,
      requeueCount: 0,
      quotaFallbackTriggered: false,
      forcedLaneRequested: params.parsed.forcedLane,
      forcedLaneHonoured: false,
      worktreePath: null,
      branchName: null,
      baseBranch: null,
      worktreeRemoved: false,
      taskFinalPath: failedTaskPath,
      logFinalPath: failedLogPath,
      transitions: params.transitions,
      attempts: [],
    };
  }

  private routeTaskWithOptionalForcedLane(
    parsed: ParsedInboxTask
  ): {
    decision: DecisionRecord;
    forcedLaneHonoured: boolean;
  } {
    const now = this.now();
    const table = loadLaneTable(this.lanesPath);
    const requestedLane = parsed.forcedLane?.trim() || null;

    if (requestedLane) {
      const lowerLane = requestedLane.toLowerCase();

      // 1. Explicit executor lane class name (engine, mechanical, code-bulk, code-hard, design-visual, research)
      if (isExecutorJobClass(lowerLane)) {
        const executorClass = lowerLane as ExecutorJobClass;
        const decision = this.router.route(parsed.taskText, {
          now,
          title: parsed.title,
          lane: executorClass,
          lanesPath: this.lanesPath,
          rankingsDir: this.rankingsDir,
          decisionsLogPath: this.decisionsLogPath,
          extraSecretsToRedact: this.extraSecretsToRedact,
        });
        return { decision, forcedLaneHonoured: true };
      }

      // 2. Explicit model lane in lanes.json (only 'lane: fable' parks a task)
      const existsInTable = isKnownLaneInTable(table, requestedLane);
      const profile = profileTask(parsed.taskText, {
        title: parsed.title,
        lane: existsInTable ? requestedLane : null,
      });
      const isCold = existsInTable ? this.router.isLaneCold(requestedLane, now) : false;
      const forbiddenRouteToJudge =
        profile.jobClass === 'route' && (lowerLane === 'fable' || lowerLane === 'judge');

      if (existsInTable && !isCold && !forbiddenRouteToJudge) {
        const effectiveJobClass: JevJobClass =
          lowerLane === 'fable' ? 'judge' : profile.jobClass;
        const row = table.lanes[effectiveJobClass];
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

        const forcedHarness = resolveLaneHarness(table, requestedLane);
        const decision: DecisionRecord = {
          timestamp: now.toISOString(),
          task_hash: taskHash,
          taskHash,
          job_class: effectiveJobClass,
          jobClass: effectiveJobClass,
          lane: requestedLane,
          node: 'Alienware',
          harness: forcedHarness,
          headless: forcedHarness !== JUDGE_HARNESS,
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
        title: parsed.title,
        lane: existsInTable && lowerLane !== 'fable' ? requestedLane : null,
        lanesPath: this.lanesPath,
        rankingsDir: this.rankingsDir,
        decisionsLogPath: this.decisionsLogPath,
        extraSecretsToRedact: this.extraSecretsToRedact,
      });

      return { decision: fallbackDecision, forcedLaneHonoured: false };
    }

    const decision = this.router.route(parsed.taskText, {
      now,
      title: parsed.title,
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
        repoRoot: null,
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

    // Concurrency guard and lane liveness check:
    // If a task sits in running\ for more than ten minutes with no agy child process under the runner,
    // the runner marks it failed with the reason 'lane process missing' and re-queues it once.
    if (this.isTickActive) {
      return {
        status: 'busy',
        taskId: null,
        fileName: null,
        repo: null,
        repoRoot: null,
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

    let livenessRequeuedFileName: string | null = null;
    const transitions: string[] = [];
    const runningFiles = listMarkdownTaskFilesSortedOldestFirst(folders.running);
    if (runningFiles.length > 0) {
      const runningFileName = runningFiles[0];
      const runningPath = path.join(folders.running, runningFileName);
      const stat = fs.statSync(runningPath);
      const runningAgeMs = this.now().getTime() - stat.mtimeMs;
      const isStale = runningAgeMs > LANE_LIVENESS_TIMEOUT_MS;
      const agyAlive = isStale ? await this.hasLiveAgyChildProcess() : true;

      if (!isStale || agyAlive) {
        return {
          status: 'busy',
          taskId: null,
          fileName: null,
          repo: null,
          repoRoot: null,
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

      const rawStuck = fs.readFileSync(runningPath, 'utf8');
      const parsedStuck = parseInboxTaskFile(rawStuck, runningFileName);
      if (this.livenessRequeuedTaskIds.has(parsedStuck.id)) {
        this.livenessRequeuedTaskIds.delete(parsedStuck.id);
        const livenessRecord = this.logSafetyDecision(LANE_PROCESS_MISSING_REASON, rawStuck);
        const failedTaskPath = path.join(folders.failed, runningFileName);
        const failedLogPath = path.join(folders.failed, `${parsedStuck.id}.log`);
        fs.renameSync(runningPath, failedTaskPath);
        fs.writeFileSync(failedLogPath, `${LANE_PROCESS_MISSING_REASON}\n`, 'utf8');
        transitions.push('running -> failed');
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          this.enterStoppedState(folders.failed);
        }
        return {
          status: 'failed',
          taskId: parsedStuck.id,
          fileName: runningFileName,
          repo: parsedStuck.repo,
          repoRoot: null,
          lane: null,
          jobClass: null,
          decisionHash: livenessRecord.task_hash,
          reason: LANE_PROCESS_MISSING_REASON,
          prUrl: null,
          prCommentBody: null,
          requeued: true,
          requeueCount: 1,
          quotaFallbackTriggered: false,
          forcedLaneRequested: parsedStuck.forcedLane,
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

      // Mark failed with reason 'lane process missing' and re-queue it once
      this.logSafetyDecision(LANE_PROCESS_MISSING_REASON, rawStuck);
      this.livenessRequeuedTaskIds.add(parsedStuck.id);
      fs.renameSync(runningPath, path.join(folders.queued, runningFileName));
      transitions.push('running -> queued (re-queue 1)');
      livenessRequeuedFileName = runningFileName;
    }

    // Safety 2: Stop after three consecutive failures until fewer than 3 task files remain in failed/
    this.checkFailedFolderAndResume();
    const failedFilesOnDisk = listMarkdownTaskFilesSortedOldestFirst(folders.failed);
    if (
      this.stoppedUntilFailedCleared ||
      this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ||
      failedFilesOnDisk.length >= MAX_CONSECUTIVE_FAILURES
    ) {
      if (!this.stoppedUntilFailedCleared) {
        this.enterStoppedState(folders.failed);
      }
      const fileList = failedFilesOnDisk.length > 0 ? failedFilesOnDisk.join(', ') : 'none';
      return {
        status: 'stopped-three-failures',
        taskId: null,
        fileName: null,
        repo: null,
        repoRoot: null,
        lane: null,
        jobClass: null,
        decisionHash: null,
        reason: `Inbox runner stopped: ${failedFilesOnDisk.length} failures in failed\\ (${fileList}). Move them to failed-cleared\\ to resume.`,
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
      if (!this.startupGhChecked) {
        this.startupGhChecked = true;
        const startupRefusal = await this.checkGhOwner();
        if (startupRefusal) {
          const rec = this.logSafetyDecision(startupRefusal.reason, 'startup-gh-config');
          return {
            status: startupRefusal.status,
            taskId: null,
            fileName: null,
            repo: null,
            repoRoot: null,
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
      }
      return {
        status: 'idle',
        taskId: null,
        fileName: null,
        repo: null,
        repoRoot: null,
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

    this.startupGhChecked = true;

    // Safety 3a: before any other gh call, gh api user must report the expected owner from repos.json.
    // An empty gh config folder or a wrong account stops the task with a clear log line instead of failing silently later.
    const ownerRefusal = await this.checkGhOwner();
    if (ownerRefusal) {
      const rec = this.logSafetyDecision(ownerRefusal.reason, queuedFiles[0]);
      return {
        status: ownerRefusal.status,
        taskId: null,
        fileName: queuedFiles[0],
        repo: null,
        repoRoot: null,
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

    // Safety 3b: Refuse to run if gh is not signed in
    const ghAuthRes = await this.runCommand({
      command: 'gh',
      args: ['auth', 'status'],
      cwd: this.repoRoot,
    });
    if (ghAuthRes.exitCode !== 0) {
      const portableFolder = toPortablePath(this.ghConfigDir, this.env);
      const rec = this.logSafetyDecision(
        `runner gh config empty: run gh auth login with GH_CONFIG_DIR set to ${portableFolder}`,
        queuedFiles[0]
      );
      return {
        status: 'refused-gh-auth',
        taskId: null,
        fileName: queuedFiles[0],
        repo: null,
        repoRoot: null,
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

    const oldestFileName =
      livenessRequeuedFileName && queuedFiles.includes(livenessRequeuedFileName)
        ? livenessRequeuedFileName
        : queuedFiles[0];
    const isLivenessRequeue = oldestFileName === livenessRequeuedFileName;
    const queuedFilePath = path.join(folders.queued, oldestFileName);
    const runningFilePath = path.join(folders.running, oldestFileName);

    this.isTickActive = true;
    try {
      // Move oldest file from queued/ to running/
      fs.renameSync(queuedFilePath, runningFilePath);
      transitions.push(isLivenessRequeue ? 'queued -> running (re-queue 1)' : 'queued -> running');

      const rawContent = fs.readFileSync(runningFilePath, 'utf8');
      const parsed = parseInboxTaskFile(rawContent, oldestFileName);

      // Resolve repo: through the repo map (ops/router/repos.json); an unknown repo or a missing root is refused
      const repoResolution = resolveRepoTarget(parsed.repo, {
        map: this.repoMap,
        env: this.env,
        selfRoot: this.repoRoot,
      });
      if (!repoResolution.ok) {
        return this.refuseTaskBeforeRun({
          status: 'refused-unknown-repo',
          reason: `Refused task ${parsed.id}: ${repoResolution.reason}`,
          parsed,
          oldestFileName,
          runningFilePath,
          failedDir: folders.failed,
          repoName: parsed.repo,
          repoRoot: null,
          transitions,
        });
      }
      const repoTarget = repoResolution.target;
      if (!fs.existsSync(repoTarget.root)) {
        return this.refuseTaskBeforeRun({
          status: 'refused-repo-root-missing',
          reason: `Refused task ${parsed.id}: root folder for repo ${repoTarget.name} does not exist (${toPortablePath(repoTarget.root, this.env)}); the root came from ${repoTarget.rootSource}.`,
          parsed,
          oldestFileName,
          runningFilePath,
          failedDir: folders.failed,
          repoName: repoTarget.name,
          repoRoot: repoTarget.root,
          transitions,
        });
      }

      // Repo-level concurrency guard: never two agy runs for the same repo at once
      if (this.activeRepos.has(repoTarget.name)) {
        fs.renameSync(runningFilePath, queuedFilePath);
        transitions.push('running -> queued');
        return {
          status: 'busy',
          taskId: parsed.id,
          fileName: oldestFileName,
          repo: repoTarget.name,
          repoRoot: repoTarget.root,
          lane: null,
          jobClass: null,
          decisionHash: null,
          reason: `Repo ${repoTarget.name} already has an active agy run.`,
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

      this.activeRepos.add(repoTarget.name);
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
            this.enterStoppedState(folders.failed);
          }

          return {
            status: 'refused-onedrive-inbox',
            taskId: parsed.id,
            fileName: oldestFileName,
            repo: repoTarget.name,
            repoRoot: repoTarget.root,
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

        // Profile the task with the core and select the lane (honouring a forced lane only if it exists in
        // lanes.json) before any worktree exists, so a judge task never costs a fetch or a branch.
        const routed = this.routeTaskWithOptionalForcedLane(parsed);
        const routedHarness = resolveLaneHarness(loadLaneTable(this.lanesPath), routed.decision.lane);
        if (
          routed.decision.job_class === 'judge' ||
          routed.decision.harness === JUDGE_HARNESS ||
          routedHarness === JUDGE_HARNESS
        ) {
          // The judge lane (a live signed-in Claude session) is not an executor: park the task for it and never start agy
          const parkNote = sanitizeDecisionLogText(
            `Parked ${parsed.id} for the judge lane in for-judge/: job class ${routed.decision.job_class}, lane ${routed.decision.lane} (${routedHarness}) is not an executor, so agy was not started.`,
            this.extraSecretsToRedact
          );
          const parkedTaskPath = path.join(folders.forJudge, oldestFileName);
          const parkedLogPath = path.join(folders.forJudge, `${parsed.id}.log`);
          fs.renameSync(runningFilePath, parkedTaskPath);
          fs.writeFileSync(parkedLogPath, `${parkNote}\n`, 'utf8');
          transitions.push('running -> for-judge');
          return {
            status: 'parked-for-judge',
            taskId: parsed.id,
            fileName: oldestFileName,
            repo: repoTarget.name,
            repoRoot: repoTarget.root,
            lane: routed.decision.lane,
            jobClass: routed.decision.job_class,
            decisionHash: routed.decision.task_hash,
            reason: parkNote,
            prUrl: null,
            prCommentBody: null,
            requeued: false,
            requeueCount: 0,
            quotaFallbackTriggered: false,
            forcedLaneRequested: parsed.forcedLane,
            forcedLaneHonoured: routed.forcedLaneHonoured,
            worktreePath: null,
            branchName: null,
            baseBranch: null,
            worktreeRemoved: false,
            taskFinalPath: parkedTaskPath,
            logFinalPath: parkedLogPath,
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
          `${repoTarget.worktreePrefix}${parsed.id}`
        );

        // Current beats existing: fetch origin in the target repo so the base (origin/main) is fresh
        await this.runCommand({
          command: 'git',
          args: ['fetch', 'origin'],
          cwd: repoTarget.root,
        });

        // Create worktree under %USERPROFILE%\antigravity\<repo prefix><id> on branch ai/inbox/<id> from base,
        // inside the target repo (dream-online or ANTIGRAVITY).
        const worktreeAddRes = await this.runCommand({
          command: 'git',
          args: ['worktree', 'add', '-B', branchName, worktreePath, configuredBase],
          cwd: repoTarget.root,
        });

        let decision = routed.decision;
        const forcedLaneHonoured = routed.forcedLaneHonoured;

        const basePromptWithRules = prependCookbookRulesToTask(parsed, {
          branchName,
          baseBranch: configuredBase,
        });

        let currentPrompt = isLivenessRequeue
          ? `${basePromptWithRules}\n\n[Re-queued after failure: ${LANE_PROCESS_MISSING_REASON}]`
          : basePromptWithRules;
        let requeueCount = isLivenessRequeue ? 1 : 0;
        let quotaFallbackTriggered = false;
        const attempts: InboxAttemptRecord[] = [];
        const combinedLogs: string[] = [];

        if (worktreeAddRes.exitCode !== 0) {
          const wtErr = [worktreeAddRes.stdout, worktreeAddRes.stderr].filter(Boolean).join('\n').trim();
          combinedLogs.push(
            `[runner] git worktree add exited with code ${worktreeAddRes.exitCode}${wtErr ? `:\n${wtErr}` : ''}`
          );
        }

        if (isLivenessRequeue) {
          attempts.push({
            attemptNumber: 1,
            lane: decision.lane,
            jobClass: decision.job_class,
            decisionHash: decision.task_hash,
            prompt: basePromptWithRules,
            prUrl: null,
            eyesReportFirstLine: null,
            quotaError: false,
            passedJudge: false,
            failureReason: LANE_PROCESS_MISSING_REASON,
            output: LANE_PROCESS_MISSING_REASON,
          });
          combinedLogs.push(LANE_PROCESS_MISSING_REASON);
        }

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

        // Run attempt
        let handle = await this.adapter.dispatch({
          jobId: isLivenessRequeue ? `${parsed.id}-requeue-1` : `${parsed.id}-attempt-1`,
          prompt: currentPrompt,
          jobClass: decision.job_class,
          lane: decision.lane,
          harness: 'agy',
          node: 'Alienware',
          cwd: worktreePath,
          env: this.laneEnv,
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
            exitCode: pollResult.exitCode,
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

          decision = this.routeTaskWithOptionalForcedLane(parsed).decision;

          handle = await this.adapter.dispatch({
            jobId: `${parsed.id}-fallback`,
            prompt: currentPrompt,
            jobClass: decision.job_class,
            lane: decision.lane,
            harness: 'agy',
            node: 'Alienware',
            cwd: worktreePath,
            env: this.laneEnv,
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
          if (typeof res.exitCode === 'number' && res.exitCode !== 0) {
            failures.push(`lane exited with code ${res.exitCode}`);
          }
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

        // When the lane pushed but did not open a PR (its own gh trouble), the runner opens it with gh
        // so finished work is never marked failed because of the lane's gh.
        const ensurePrForResult = async (
          res: DispatchPollResult,
          activeDecision: DecisionRecord
        ): Promise<DispatchPollResult> => {
          if (res.prUrl ?? parsePrUrlFromOutput(res.output)) return res;
          const ensured = await this.ensurePullRequest({
            repoRoot: repoTarget.root,
            branchName,
            baseBranch: configuredBase,
            taskTitle: parsed.title,
            laneOutput: res.output,
            laneName: activeDecision.lane,
          });
          if (ensured.note) {
            combinedLogs.push(`[runner] ${ensured.note}`);
          }
          return ensured.prUrl ? { ...res, prUrl: ensured.prUrl } : res;
        };

        pollResult = await ensurePrForResult(pollResult, decision);
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
          exitCode: pollResult.exitCode,
        });

        // If judge step failed (e.g. task without a PR or fallback exited non-zero), re-queue once then fail if still missing
        if (!judgeEval.passed && requeueCount === 0) {
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
            env: this.laneEnv,
          });
          pollResult = await pollUntilDone(handle.poll);
          combinedLogs.push(pollResult.output);

          pollResult = await ensurePrForResult(pollResult, decision);
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
            exitCode: pollResult.exitCode,
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
        this.livenessRequeuedTaskIds.delete(parsed.id);

        // The final state of a task comes from its last attempt.
        // If the last attempt (fallback or requeue) exits 0, the task goes to done\ and consecutiveFailures resets to 0.
        // Earlier failed attempts of that same task do not count toward the three-failure stop.
        const effectivePrUrl =
          judgeEval.prUrl ?? attempts.find((a) => Boolean(a.prUrl))?.prUrl ?? null;
        const isFallbackOrRequeue = quotaFallbackTriggered || requeueCount > 0;
        const lastAttemptExitedZero =
          pollResult.exitCode === 0 || /\bagy exit 0\b/i.test(pollResult.output);
        const hadPriorProcessOrQuotaFailure =
          quotaFallbackTriggered ||
          attempts
            .slice(0, -1)
            .some((a) => a.quotaError || (typeof a.exitCode === 'number' && a.exitCode !== 0));
        const succeeded =
          (judgeEval.passed && Boolean(effectivePrUrl)) ||
          (isFallbackOrRequeue &&
            lastAttemptExitedZero &&
            (Boolean(effectivePrUrl) ||
              hadPriorProcessOrQuotaFailure ||
              /\bagy exit 0\b/i.test(pollResult.output)));

        if (succeeded) {
          finalStatus = 'done';
          const lastAttempt = attempts[attempts.length - 1];
          if (lastAttempt) {
            lastAttempt.passedJudge = true;
            lastAttempt.failureReason = null;
            if (!lastAttempt.prUrl && effectivePrUrl) {
              lastAttempt.prUrl = effectivePrUrl;
            }
          }
          const testSummary = extractTestSummaryFromLog(pollResult.output);
          if (effectivePrUrl) {
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
            await this.runCommand({
              command: 'gh',
              args: ['pr', 'comment', effectivePrUrl, '--body', prCommentBody],
              cwd: repoTarget.root,
            });
          }

          taskFinalPath = path.join(folders.done, oldestFileName);
          logFinalPath = path.join(folders.done, `${parsed.id}.log`);
          fs.renameSync(runningFilePath, taskFinalPath);
          fs.writeFileSync(logFinalPath, `${sanitizedLogContent}\n`, 'utf8');
          transitions.push('running -> done');
          this.consecutiveFailures = 0;
          this.stoppedUntilFailedCleared = false;
          this.stopFailedClearTimer();
        } else {
          finalStatus = 'failed';
          taskFinalPath = path.join(folders.failed, oldestFileName);
          logFinalPath = path.join(folders.failed, `${parsed.id}.log`);
          fs.renameSync(runningFilePath, taskFinalPath);
          fs.writeFileSync(logFinalPath, `${sanitizedLogContent}\n`, 'utf8');
          transitions.push('running -> failed');
          this.consecutiveFailures += 1;
          if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            this.enterStoppedState(folders.failed);
          }
        }

        // Remove the worktree ONLY if the branch was pushed to origin
        const lsRemoteRes = await this.runCommand({
          command: 'git',
          args: ['ls-remote', '--heads', 'origin', `refs/heads/${branchName}`],
          cwd: repoTarget.root,
        });
        const branchWasPushed =
          lsRemoteRes.exitCode === 0 && lsRemoteRes.stdout.trim().length > 0;
        let worktreeRemoved = false;
        if (branchWasPushed) {
          const rmRes = await this.runCommand({
            command: 'git',
            args: ['worktree', 'remove', worktreePath, '--force'],
            cwd: repoTarget.root,
          });
          worktreeRemoved = rmRes.exitCode === 0;
        }

        return {
          status: finalStatus,
          taskId: parsed.id,
          fileName: oldestFileName,
          repo: repoTarget.name,
          repoRoot: repoTarget.root,
          lane: decision.lane,
          jobClass: decision.job_class,
          decisionHash: decision.task_hash,
          reason: succeeded
            ? decision.reason
            : isLivenessRequeue
              ? `${LANE_PROCESS_MISSING_REASON}; ${judgeEval.failureReason ?? 'Judge check failed.'}`
              : judgeEval.failureReason ?? 'Judge check failed.',
          prUrl: effectivePrUrl,
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
        this.activeRepos.delete(repoTarget.name);
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
  /** Login `gh api user` reports (default: the expected owner in ops/router/repos.json). */
  ghLogin?: string;
  branchPushed?: boolean | ((branchName: string) => boolean);
  /** Whether an agy child process is running under the runner (for lane liveness tests). */
  agyChildProcessRunning?: boolean | (() => boolean);
  onCommand?: (req: CommandExecRequest) => void;
  /** Answers a command before the defaults do; return undefined to fall through. */
  respond?: (req: CommandExecRequest) => CommandExecResult | undefined;
}): {
  runner: CommandRunner;
  commands: CommandExecRequest[];
} {
  const commands: CommandExecRequest[] = [];
  const ghSignedIn = options?.ghSignedIn ?? true;
  const ghLogin = options?.ghLogin ?? loadRepoMap().expectedOwner;

  const runner: CommandRunner = async (req: CommandExecRequest): Promise<CommandExecResult> => {
    commands.push(req);
    options?.onCommand?.(req);

    const custom = options?.respond?.(req);
    if (custom) return custom;

    if (
      (req.command === 'powershell.exe' && req.args.some((a) => a.includes('Win32_Process'))) ||
      (req.command === 'ps' && req.args.includes('--ppid'))
    ) {
      const alive =
        typeof options?.agyChildProcessRunning === 'function'
          ? options.agyChildProcessRunning()
          : Boolean(options?.agyChildProcessRunning);
      return {
        exitCode: 0,
        stdout: alive ? 'agy.exe\n' : '',
        stderr: '',
      };
    }

    if (req.command === 'gh' && req.args[0] === 'api' && req.args[1] === 'user') {
      return ghSignedIn
        ? { exitCode: 0, stdout: `${ghLogin}\n`, stderr: '' }
        : { exitCode: 1, stdout: '', stderr: 'You are not logged into any GitHub hosts.' };
    }

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

export interface InboxSupervisorOptions {
  /** Single runner invocation returning an exit code (and optional stop signal for testing). */
  runOnce: () => Promise<{ exitCode: number; stop?: boolean }>;
  /** Delay between restart attempts in milliseconds (default: 5000). */
  restartDelayMs?: number;
  /** Maximum number of restarts before returning (default: Infinity for continuous daemon supervision). */
  maxRestarts?: number;
  /** Sleep implementation (injectable for deterministic tests). */
  sleep?: (ms: number) => Promise<void>;
  /** Callback invoked whenever the runner throws or exits and is about to be restarted. */
  onRestart?: (errorOrReason: unknown, restartAttempt: number) => void;
}

/**
 * Supervising restart loop: brings the inbox runner back if its iteration throws an unhandled error
 * or exits unexpectedly, so the wheel never stays dead when the scheduled task is idle.
 */
export async function runInboxRunnerWithRestart(options: InboxSupervisorOptions): Promise<void> {
  const restartDelayMs = options.restartDelayMs ?? 5_000;
  const maxRestarts = options.maxRestarts ?? Number.POSITIVE_INFINITY;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let restarts = 0;
  while (true) {
    try {
      const res = await options.runOnce();
      if (res.stop) {
        return;
      }
      throw new Error(`runner exited with code ${res.exitCode}`);
    } catch (err) {
      restarts += 1;
      options.onRestart?.(err, restarts);
      if (restarts > maxRestarts) {
        return;
      }
      await sleep(restartDelayMs);
    }
  }
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

  const writeSanitizedError = (err: unknown): void => {
    process.stderr.write(
      `${sanitizeDecisionLogText(err instanceof Error ? err.message : String(err))}\n`
    );
  };

  const runner = new InboxRunner();
  if (once) {
    runner.tick().catch((err) => {
      writeSanitizedError(err);
      process.exitCode = 1;
    });
  } else {
    process.on('uncaughtException', (err) => {
      writeSanitizedError(err);
    });
    process.on('unhandledRejection', (reason) => {
      writeSanitizedError(reason);
    });

    let timer: NodeJS.Timeout | null = null;
    const scheduleNext = (delayMs: number) => {
      timer = setTimeout(async () => {
        try {
          const res = await runner.tick();
          const nextDelay =
            res.status === 'stopped-three-failures'
              ? InboxRunner.STOPPED_POLL_INTERVAL_MS
              : intervalMs;
          scheduleNext(nextDelay);
        } catch (err) {
          writeSanitizedError(err);
          scheduleNext(intervalMs);
        }
      }, delayMs);
    };
    scheduleNext(0);
  }
}
