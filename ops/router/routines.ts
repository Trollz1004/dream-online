/**
 * Routines in the runner (2026-11-24).
 *
 * A routine is a normal ticket file kept in the kitchen folder under orders\routines, with one
 * extra header line: `every: 6h` (units m, h, d) or `daily: 07:30` (local time). The inbox runner
 * calls RoutineScheduler.runDue() on each tick. When a routine is due and no copy of it is queued
 * or running, the scheduler copies it into inbox\queued with the date and time added to the file
 * name and the every or daily line removed, and records the run in a small state file in the
 * kitchen folder (never inside the repo).
 *
 * A malformed routine is skipped with one log line and never stops the runner. No routine runs
 * more often than every 30 minutes, whatever its header says.
 */

import fs from 'node:fs';
import path from 'node:path';

export const ROUTINE_MIN_INTERVAL_MS = 30 * 60 * 1000;
export const ROUTINES_STATE_FILE_NAME = 'routines-state.json';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Header keys a ticket may carry before its body (same set the ticket parser reads, plus the two schedule keys). */
const HEADER_KEY_PATTERN = /^(title|lane|model|repo|base|inbox|role|skills|every|daily)\s*:\s*(.*)$/i;
const EVERY_VALUE_PATTERN = /^(\d+)\s*([mhd])$/i;
const DAILY_VALUE_PATTERN = /^(\d{1,2}):(\d{2})$/;

export type RoutineSchedule =
  | { kind: 'every'; requestedMs: number; intervalMs: number }
  | { kind: 'daily'; hour: number; minute: number };

export type ParsedRoutine =
  | { ok: true; schedule: RoutineSchedule; content: string }
  | { ok: false; reason: string };

/** The kitchen folder's routine state file (last run per routine). Always beside the inbox, never in a repo. */
export function routinesStatePath(kitchenDir: string): string {
  return path.join(kitchenDir, ROUTINES_STATE_FILE_NAME);
}

/** The kitchen folder's routines folder: orders\routines. */
export function routinesDirPath(kitchenDir: string): string {
  return path.join(kitchenDir, 'orders', 'routines');
}

function unitMs(unit: string): number {
  switch (unit.toLowerCase()) {
    case 'm':
      return MINUTE_MS;
    case 'h':
      return HOUR_MS;
    default:
      return DAY_MS;
  }
}

/**
 * Reads the schedule line from a routine's header and returns the ticket content with that line removed.
 * The header is read the way the ticket parser reads it: a title line, then `key: value` lines, up to the
 * first blank line or the first line that is not a key.
 */
export function parseRoutine(rawContent: string): ParsedRoutine {
  const text = rawContent.replace(/^\uFEFF/, '');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);

  const scheduleLines: Array<{ index: number; key: string; value: string }> = [];
  let hasTitle = false;
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      if (hasTitle) break;
      continue;
    }
    const kv = trimmed.match(HEADER_KEY_PATTERN);
    if (kv) {
      const key = kv[1].toLowerCase();
      if (key === 'title') hasTitle = true;
      if (key === 'every' || key === 'daily') {
        scheduleLines.push({ index, key, value: kv[2].trim() });
      }
      continue;
    }
    if (!hasTitle) {
      hasTitle = true;
      continue;
    }
    break;
  }

  if (scheduleLines.length === 0) {
    return { ok: false, reason: 'no every: or daily: line in the header' };
  }
  if (scheduleLines.length > 1) {
    return { ok: false, reason: 'more than one every: or daily: line in the header' };
  }

  const [line] = scheduleLines;
  let schedule: RoutineSchedule;
  if (line.key === 'every') {
    const match = line.value.match(EVERY_VALUE_PATTERN);
    if (!match) {
      return { ok: false, reason: `every: needs a number and m, h or d, got "${line.value}"` };
    }
    const requestedMs = Number(match[1]) * unitMs(match[2]);
    if (!Number.isFinite(requestedMs) || requestedMs <= 0) {
      return { ok: false, reason: `every: must be above zero, got "${line.value}"` };
    }
    schedule = {
      kind: 'every',
      requestedMs,
      intervalMs: Math.max(requestedMs, ROUTINE_MIN_INTERVAL_MS),
    };
  } else {
    const match = line.value.match(DAILY_VALUE_PATTERN);
    const hour = match ? Number(match[1]) : NaN;
    const minute = match ? Number(match[2]) : NaN;
    if (!match || hour > 23 || minute > 59) {
      return { ok: false, reason: `daily: needs a local time like 07:30, got "${line.value}"` };
    }
    schedule = { kind: 'daily', hour, minute };
  }

  const kept = lines.filter((_, index) => index !== line.index);
  return { ok: true, schedule, content: kept.join(eol) };
}

/**
 * True when the routine should be queued now. `lastRun` is the last time it was queued (null if never).
 * Whatever the schedule says, a routine is never due again inside the 30-minute floor.
 */
export function isRoutineDue(schedule: RoutineSchedule, lastRun: Date | null, now: Date): boolean {
  if (schedule.kind === 'every') {
    if (!lastRun) return true;
    const elapsed = now.getTime() - lastRun.getTime();
    // A last run far in the future is a damaged record, not a reason to wait for years.
    if (elapsed < 0) return -elapsed > schedule.intervalMs;
    return elapsed >= schedule.intervalMs;
  }

  const slot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedule.hour, schedule.minute, 0, 0);
  if (now.getTime() < slot.getTime()) return false;
  if (!lastRun) return true;
  const elapsed = now.getTime() - lastRun.getTime();
  if (elapsed < 0) return -elapsed > DAY_MS;
  return lastRun.getTime() < slot.getTime() && elapsed >= ROUTINE_MIN_INTERVAL_MS;
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

/** Local date and time as YYYYMMDD-HHMM, added to the routine's file name for each copy. */
export function routineStamp(now: Date): string {
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/** The routine's file name without .md, cleaned the same way a ticket id is. */
function routineStem(fileName: string): string {
  const cleaned = fileName
    .replace(/\.md$/i, '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'routine';
}

export function routineCopyName(fileName: string, now: Date): string {
  return `${routineStem(fileName)}-${routineStamp(now)}.md`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function folderHasCopyOf(dirPath: string, stem: string): boolean {
  if (!fs.existsSync(dirPath)) return false;
  const pattern = new RegExp(`^${escapeRegExp(stem)}-\\d{8}-\\d{4}\\.md$`, 'i');
  return fs.readdirSync(dirPath).some((name) => pattern.test(name));
}

export interface RoutineSchedulerOptions {
  /** The kitchen folder: holds orders\routines and the state file. */
  kitchenDir: string;
  /** inbox\queued */
  queuedDir: string;
  /** inbox\running */
  runningDir: string;
  now?: () => Date;
  /** One call per log line. */
  log?: (line: string) => void;
  /** Override for the routines folder (default: orders\routines under the kitchen folder). */
  routinesDir?: string;
}

export class RoutineScheduler {
  private readonly kitchenDir: string;
  private readonly queuedDir: string;
  private readonly runningDir: string;
  private readonly routinesDir: string;
  private readonly statePath: string;
  private readonly now: () => Date;
  private readonly log: (line: string) => void;
  /** Lines already written, so a bad file or a damaged state file is reported once, not on every tick. */
  private readonly reported = new Set<string>();

  constructor(options: RoutineSchedulerOptions) {
    this.kitchenDir = options.kitchenDir;
    this.queuedDir = options.queuedDir;
    this.runningDir = options.runningDir;
    this.routinesDir = options.routinesDir ?? routinesDirPath(this.kitchenDir);
    this.statePath = routinesStatePath(this.kitchenDir);
    this.now = options.now ?? (() => new Date());
    this.log = options.log ?? (() => undefined);
  }

  private reportOnce(key: string, line: string): void {
    if (this.reported.has(key)) return;
    this.reported.add(key);
    try {
      this.log(line);
    } catch {
      // Logging must never stop the runner.
    }
  }

  private loadState(): Record<string, string> {
    if (!fs.existsSync(this.statePath)) return {};
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('not an object');
      }
      const state: Record<string, string> = {};
      for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'string') state[name] = value;
      }
      return state;
    } catch {
      this.reportOnce(
        `state:${ROUTINES_STATE_FILE_NAME}`,
        `Routine state file ${ROUTINES_STATE_FILE_NAME} is damaged; starting with no last runs.`
      );
      return {};
    }
  }

  private saveState(state: Record<string, string>): void {
    try {
      const tmpPath = `${this.statePath}.tmp`;
      fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
      fs.writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
      fs.renameSync(tmpPath, this.statePath);
    } catch {
      this.reportOnce(
        `state-write:${ROUTINES_STATE_FILE_NAME}`,
        `Routine state file ${ROUTINES_STATE_FILE_NAME} could not be written; last runs may repeat.`
      );
    }
  }

  /**
   * Queues every routine that is due and has no copy queued or running.
   * Returns the file names of the copies it put in queued\. Never throws.
   */
  public runDue(): string[] {
    const queuedNames: string[] = [];
    try {
      if (!fs.existsSync(this.routinesDir)) return queuedNames;
      const routineFiles = fs
        .readdirSync(this.routinesDir)
        .filter((name) => name.toLowerCase().endsWith('.md'))
        .sort((a, b) => a.localeCompare(b));
      if (routineFiles.length === 0) return queuedNames;

      const now = this.now();
      const state = this.loadState();
      let stateChanged = false;

      for (const fileName of routineFiles) {
        try {
          const filePath = path.join(this.routinesDir, fileName);
          const stat = fs.statSync(filePath);
          if (!stat.isFile()) continue;
          const reportKey = `routine:${fileName}:${stat.mtimeMs}:${stat.size}`;

          let parsed: ParsedRoutine;
          try {
            parsed = parseRoutine(fs.readFileSync(filePath, 'utf8'));
          } catch {
            parsed = { ok: false, reason: 'the file could not be read' };
          }
          if (!parsed.ok) {
            this.reportOnce(reportKey, `Routine skipped: ${fileName}: ${parsed.reason}.`);
            continue;
          }

          const lastRunText = state[fileName];
          const lastRunDate = lastRunText ? new Date(lastRunText) : null;
          const lastRun = lastRunDate && !Number.isNaN(lastRunDate.getTime()) ? lastRunDate : null;
          if (!isRoutineDue(parsed.schedule, lastRun, now)) continue;

          const stem = routineStem(fileName);
          if (folderHasCopyOf(this.queuedDir, stem) || folderHasCopyOf(this.runningDir, stem)) continue;

          const copyName = routineCopyName(fileName, now);
          const copyPath = path.join(this.queuedDir, copyName);
          if (fs.existsSync(copyPath)) continue;
          fs.mkdirSync(this.queuedDir, { recursive: true });
          const tmpPath = `${copyPath}.tmp`;
          fs.writeFileSync(tmpPath, parsed.content, 'utf8');
          fs.renameSync(tmpPath, copyPath);

          state[fileName] = now.toISOString();
          stateChanged = true;
          queuedNames.push(copyName);
        } catch {
          // One routine failing never stops the others or the runner.
        }
      }

      if (stateChanged) this.saveState(state);
    } catch {
      // The runner keeps running whatever happens here.
    }
    return queuedNames;
  }
}
