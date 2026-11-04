/**
 * Section 4: SQLite store with FTS5 and the five tables (sessions, observations, verdicts,
 * rulings, lane_facts), plus daily_digests, oldest-first pruning after digest exists, and VACUUM.
 *
 * Uses Node's built-in node:sqlite (DatabaseSync).
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { resolveJudgeMemoryDbPath } from './lockout.ts';
import {
  checkDeniedPath,
  formatPictureObservation,
  isImageFilePath,
  sanitizeJudgeMemoryText,
  stripPrivateTags,
} from './privacy.ts';
import { buildRulesOnlyDailyDigest, type ObservationKind } from './rules.ts';

export interface SessionRecord {
  id: number;
  session_id: string;
  node: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  summary: string;
  next_step: string;
  blocked_by: string;
  obsidian_note_path: string | null;
}

export interface ObservationRecord {
  id: number;
  session_id: string;
  created_at: string;
  kind: ObservationKind;
  tool: string;
  target: string;
  outcome: string;
  pr_number: number | null;
  repo: string | null;
  node: string | null;
  digest_date: string | null;
}

export interface VerdictRecord {
  id: number;
  session_id: string | null;
  created_at: string;
  pr_number: number;
  repo: string;
  verdict: string;
  reasons: string;
  commit_judged: string;
  pr_state: string;
}

export interface RulingRecord {
  id: number;
  created_at: string;
  ruled_at: string;
  ruling: string;
  written_in: string;
}

export interface LaneFactRecord {
  id: number;
  session_id: string | null;
  created_at: string;
  lane: string;
  node: string;
  what_it_did: string;
  duration_seconds: number;
  what_it_broke: string;
}

export interface DailyDigestRecord {
  date: string;
  created_at: string;
  line_count: number;
  content: string;
  pushed_at: string | null;
}

export interface SearchHit {
  id: string;
  numeric_id: number;
  table_name: string;
  created_at: string;
  one_line: string;
}

export interface TimelineEntry {
  id: string;
  table_name: string;
  created_at: string;
  pr_ref: string | null;
  one_line: string;
}

export interface JudgeMemoryStoreOptions {
  dbPath?: string;
  storeDir?: string;
  env?: NodeJS.ProcessEnv;
  repoRoot?: string;
  extraSecrets?: string[];
  /** Default store size cap in bytes (default 32 MB). */
  maxSizeBytes?: number;
  /** Default observation row cap when pruning (default 5,000). */
  maxObservations?: number;
}

const DEFAULT_MAX_SIZE_BYTES = 32 * 1024 * 1024;
const DEFAULT_MAX_OBSERVATIONS = 5000;

function toFtsSafeQuery(rawQuery: string): string {
  const tokens = rawQuery
    .replace(/[^\p{L}\p{N}_-]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return '';
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"*`).join(' AND ');
}

export class JudgeMemoryStore {
  public readonly dbPath: string;
  private readonly db: DatabaseSync;
  private readonly extraSecrets: string[];
  private readonly env: NodeJS.ProcessEnv;
  private readonly maxSizeBytes: number;
  private readonly maxObservations: number;
  private closed = false;

  constructor(options?: JudgeMemoryStoreOptions) {
    this.env = options?.env ?? process.env;
    this.extraSecrets = options?.extraSecrets ?? [];
    this.maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    this.maxObservations = options?.maxObservations ?? DEFAULT_MAX_OBSERVATIONS;
    this.dbPath = resolveJudgeMemoryDbPath({
      dbPath: options?.dbPath,
      storeDir: options?.storeDir,
      env: this.env,
      repoRoot: options?.repoRoot,
    });

    const parentDir = path.dirname(this.dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    this.db = new DatabaseSync(this.dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL UNIQUE,
        node TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        summary TEXT NOT NULL DEFAULT '',
        next_step TEXT NOT NULL DEFAULT '',
        blocked_by TEXT NOT NULL DEFAULT 'none',
        obsidian_note_path TEXT
      );

      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        kind TEXT NOT NULL,
        tool TEXT NOT NULL,
        target TEXT NOT NULL,
        outcome TEXT NOT NULL,
        pr_number INTEGER,
        repo TEXT,
        node TEXT,
        digest_date TEXT
      );

      CREATE TABLE IF NOT EXISTS verdicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        created_at TEXT NOT NULL,
        pr_number INTEGER NOT NULL,
        repo TEXT NOT NULL,
        verdict TEXT NOT NULL,
        reasons TEXT NOT NULL,
        commit_judged TEXT NOT NULL,
        pr_state TEXT NOT NULL DEFAULT 'open'
      );

      CREATE TABLE IF NOT EXISTS rulings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        ruled_at TEXT NOT NULL,
        ruling TEXT NOT NULL,
        written_in TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lane_facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        created_at TEXT NOT NULL,
        lane TEXT NOT NULL,
        node TEXT NOT NULL,
        what_it_did TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        what_it_broke TEXT NOT NULL DEFAULT 'none'
      );

      CREATE TABLE IF NOT EXISTS daily_digests (
        date TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        line_count INTEGER NOT NULL,
        content TEXT NOT NULL,
        pushed_at TEXT
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
        record_id UNINDEXED,
        table_name UNINDEXED,
        created_at UNINDEXED,
        pr_ref,
        one_line,
        searchable_text
      );
    `);
  }

  private sanitize(text: string): string {
    return sanitizeJudgeMemoryText(text, this.extraSecrets, this.env);
  }

  private upsertFts(
    recordId: string,
    tableName: string,
    createdAt: string,
    prRef: string,
    oneLine: string,
    searchableText: string
  ): void {
    this.db.prepare('DELETE FROM memory_fts WHERE record_id = ?').run(recordId);
    this.db
      .prepare(
        `INSERT INTO memory_fts (record_id, table_name, created_at, pr_ref, one_line, searchable_text)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(recordId, tableName, createdAt, prRef, oneLine, searchableText);
  }

  /**
   * Lists the user tables present in the SQLite file (for schema verification).
   */
  public listTables(): string[] {
    const rows = this.db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name ASC`
      )
      .all() as Array<{ name: string }>;
    return rows.map((r) => r.name);
  }

  /**
   * Starts or updates a session row in the sessions table.
   */
  public startSession(input: {
    session_id: string;
    node?: string;
    started_at?: string;
  }): SessionRecord {
    const sessionId = this.sanitize(input.session_id) || 'session-default';
    const node = this.sanitize(input.node || this.env.COMPUTERNAME || 'Alienware') || 'Alienware';
    const startedAt = input.started_at || new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO sessions (session_id, node, started_at, status)
         VALUES (?, ?, ?, 'active')
         ON CONFLICT(session_id) DO UPDATE SET
           node = excluded.node,
           status = 'active'`
      )
      .run(sessionId, node, startedAt);

    return this.getSession(sessionId)!;
  }

  public getSession(sessionId: string): SessionRecord | null {
    const cleanId = this.sanitize(sessionId);
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE session_id = ?')
      .get(cleanId) as SessionRecord | undefined;
    return row ? { ...row } : null;
  }

  /**
   * Records a single-line rules-compressed observation into the observations table and FTS5.
   * Refuses denied paths, <private>-only inputs, and converts image paths to "looked at <file name>, verdict <one line>".
   */
  public recordObservation(input: {
    session_id: string;
    kind: ObservationKind;
    tool: string;
    target: string;
    outcome: string;
    pr_number?: number | null;
    repo?: string | null;
    node?: string | null;
    created_at?: string;
    digest_date?: string | null;
  }): ObservationRecord | null {
    const denyTarget = checkDeniedPath(input.target);
    if (denyTarget.denied) {
      return null;
    }

    const privOutcome = stripPrivateTags(input.outcome);
    const privTarget = stripPrivateTags(input.target);
    if (
      (privOutcome.hadPrivateTag && privOutcome.emptyAfterStrip) ||
      (privTarget.hadPrivateTag && privTarget.emptyAfterStrip)
    ) {
      return null;
    }

    let kind = input.kind;
    let cleanTarget = this.sanitize(input.target);
    let cleanOutcome = this.sanitize(input.outcome);

    if (kind === 'picture_looked_at' || isImageFilePath(input.target)) {
      kind = 'picture_looked_at';
      const formatted = formatPictureObservation(input.target, input.outcome, this.extraSecrets);
      cleanTarget = formatted.fileName;
      cleanOutcome = this.sanitize(formatted.outcome);
    }

    if (!cleanTarget && !cleanOutcome) {
      return null;
    }

    const sessionId = this.sanitize(input.session_id) || 'session-default';
    const createdAt = input.created_at || new Date().toISOString();
    const tool = this.sanitize(input.tool) || 'tool';
    const prNumber =
      typeof input.pr_number === 'number' && Number.isFinite(input.pr_number)
        ? input.pr_number
        : null;
    const repo = input.repo ? this.sanitize(input.repo) : null;
    const node = input.node ? this.sanitize(input.node) : null;
    const digestDate = input.digest_date ? this.sanitize(input.digest_date) : null;

    const info = this.db
      .prepare(
        `INSERT INTO observations
         (session_id, created_at, kind, tool, target, outcome, pr_number, repo, node, digest_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        sessionId,
        createdAt,
        kind,
        tool,
        cleanTarget,
        cleanOutcome,
        prNumber,
        repo,
        node,
        digestDate
      );

    const id = Number(info.lastInsertRowid);
    const prRef = prNumber ? `${repo ? `${repo}#` : '#'}${prNumber}` : repo || '';
    const oneLine = `[obs:${id}] ${createdAt} ${kind} ${cleanTarget} — ${cleanOutcome}`;

    this.upsertFts(
      `obs:${id}`,
      'observations',
      createdAt,
      prRef,
      oneLine,
      `${kind} ${tool} ${cleanTarget} ${cleanOutcome} ${prRef} ${node || ''}`
    );

    return this.getObservationById(id);
  }

  public getObservationById(id: number): ObservationRecord | null {
    const row = this.db
      .prepare('SELECT * FROM observations WHERE id = ?')
      .get(id) as ObservationRecord | undefined;
    return row ? { ...row } : null;
  }

  /**
   * Records a PR verdict in the verdicts table and indexes it in FTS5.
   */
  public recordVerdict(input: {
    session_id?: string | null;
    pr_number: number;
    repo: string;
    verdict: string;
    reasons: string;
    commit_judged: string;
    pr_state?: 'open' | 'merged' | 'closed';
    created_at?: string;
  }): VerdictRecord | null {
    const privReasons = stripPrivateTags(input.reasons);
    if (privReasons.hadPrivateTag && privReasons.emptyAfterStrip) {
      return null;
    }

    const sessionId = input.session_id ? this.sanitize(input.session_id) : null;
    const createdAt = input.created_at || new Date().toISOString();
    const prNumber = Number(input.pr_number);
    const repo = this.sanitize(input.repo) || 'Trollz1004/dream-online';
    const verdict = this.sanitize(input.verdict).toUpperCase() || 'PENDING';
    const reasons = this.sanitize(input.reasons);
    const commitJudged = this.sanitize(input.commit_judged) || 'HEAD';
    const prState = input.pr_state || 'open';

    const info = this.db
      .prepare(
        `INSERT INTO verdicts
         (session_id, created_at, pr_number, repo, verdict, reasons, commit_judged, pr_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(sessionId, createdAt, prNumber, repo, verdict, reasons, commitJudged, prState);

    const id = Number(info.lastInsertRowid);
    const prRef = `${repo}#${prNumber}`;
    const oneLine = `[verdict:${id}] ${createdAt} ${prRef} ${verdict} (${commitJudged}) — ${reasons}`;

    this.upsertFts(
      `verdict:${id}`,
      'verdicts',
      createdAt,
      prRef,
      oneLine,
      `${prRef} ${verdict} ${reasons} ${commitJudged} ${prState}`
    );

    const row = this.db
      .prepare('SELECT * FROM verdicts WHERE id = ?')
      .get(id) as VerdictRecord | undefined;
    return row ? { ...row } : null;
  }

  /**
   * Records a founder ruling in the rulings table and indexes it in FTS5.
   */
  public recordRuling(input: {
    ruled_at: string;
    ruling: string;
    written_in: string;
    created_at?: string;
  }): RulingRecord | null {
    if (checkDeniedPath(input.written_in).denied && !input.written_in.toUpperCase().includes('SUP@-VAULT-FOUNDER-ONLY')) {
      return null;
    }

    const privRuling = stripPrivateTags(input.ruling);
    if (privRuling.hadPrivateTag && privRuling.emptyAfterStrip) {
      return null;
    }

    const createdAt = input.created_at || new Date().toISOString();
    const ruledAt = this.sanitize(input.ruled_at) || createdAt.slice(0, 10);
    const ruling = this.sanitize(input.ruling);
    const writtenIn = this.sanitize(input.written_in);
    if (!ruling) return null;

    const info = this.db
      .prepare(
        `INSERT INTO rulings (created_at, ruled_at, ruling, written_in)
         VALUES (?, ?, ?, ?)`
      )
      .run(createdAt, ruledAt, ruling, writtenIn);

    const id = Number(info.lastInsertRowid);
    const oneLine = `[ruling:${id}] ${ruledAt} (${writtenIn}) — ${ruling}`;

    this.upsertFts(
      `ruling:${id}`,
      'rulings',
      createdAt,
      '',
      oneLine,
      `${ruledAt} ${ruling} ${writtenIn}`
    );

    const row = this.db
      .prepare('SELECT * FROM rulings WHERE id = ?')
      .get(id) as RulingRecord | undefined;
    return row ? { ...row } : null;
  }

  /**
   * Records a lane performance / failure fact in the lane_facts table and indexes it in FTS5.
   */
  public recordLaneFact(input: {
    session_id?: string | null;
    lane: string;
    node: string;
    what_it_did: string;
    duration_seconds?: number;
    what_it_broke?: string;
    created_at?: string;
  }): LaneFactRecord | null {
    const privDid = stripPrivateTags(input.what_it_did);
    if (privDid.hadPrivateTag && privDid.emptyAfterStrip) {
      return null;
    }

    const sessionId = input.session_id ? this.sanitize(input.session_id) : null;
    const createdAt = input.created_at || new Date().toISOString();
    const lane = this.sanitize(input.lane);
    const node = this.sanitize(input.node || 'Alienware');
    const whatItDid = this.sanitize(input.what_it_did);
    const durationSeconds =
      typeof input.duration_seconds === 'number' && Number.isFinite(input.duration_seconds)
        ? Math.max(0, Math.round(input.duration_seconds))
        : 0;
    const whatItBroke = this.sanitize(input.what_it_broke || 'none') || 'none';
    if (!lane || !whatItDid) return null;

    const info = this.db
      .prepare(
        `INSERT INTO lane_facts
         (session_id, created_at, lane, node, what_it_did, duration_seconds, what_it_broke)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(sessionId, createdAt, lane, node, whatItDid, durationSeconds, whatItBroke);

    const id = Number(info.lastInsertRowid);
    const oneLine = `[lane:${id}] ${createdAt} ${lane}@${node} (${durationSeconds}s) — ${whatItDid}; broke: ${whatItBroke}`;

    this.upsertFts(
      `lane:${id}`,
      'lane_facts',
      createdAt,
      '',
      oneLine,
      `${lane} ${node} ${whatItDid} ${whatItBroke}`
    );

    const row = this.db
      .prepare('SELECT * FROM lane_facts WHERE id = ?')
      .get(id) as LaneFactRecord | undefined;
    return row ? { ...row } : null;
  }

  /**
   * Records the Stop hook summary (the session's last reply as the judge's own summary,
   * plus NEXT and BLOCKED lines).
   */
  public recordStopSummary(input: {
    session_id: string;
    last_reply: string;
    next_step?: string;
    blocked_by?: string;
    node?: string;
  }): SessionRecord | null {
    const privReply = stripPrivateTags(input.last_reply);
    if (privReply.hadPrivateTag && privReply.emptyAfterStrip && !input.next_step && !input.blocked_by) {
      return this.getSession(input.session_id);
    }

    const sessionId = this.sanitize(input.session_id) || 'session-default';
    if (!this.getSession(sessionId)) {
      this.startSession({ session_id: sessionId, node: input.node });
    }

    // Extract explicit NEXT: and BLOCKED: lines if present inside the reply
    let extractedNext = input.next_step || '';
    let extractedBlocked = input.blocked_by || '';

    const rawLines = input.last_reply.split(/\r?\n/);
    for (const line of rawLines) {
      const nextMatch = line.match(/^\s*NEXT\s*:\s*(.+)$/i);
      if (nextMatch?.[1] && !extractedNext) {
        extractedNext = nextMatch[1].trim();
      }
      const blockedMatch = line.match(/^\s*BLOCKED\s*:\s*(.+)$/i);
      if (blockedMatch?.[1] && !extractedBlocked) {
        extractedBlocked = blockedMatch[1].trim();
      }
    }

    const summary = this.sanitize(input.last_reply);
    const nextStep = this.sanitize(extractedNext || 'Resume from latest open PRs and state page.');
    const blockedBy = this.sanitize(extractedBlocked || 'none') || 'none';

    this.db
      .prepare(
        `UPDATE sessions
         SET summary = ?, next_step = ?, blocked_by = ?
         WHERE session_id = ?`
      )
      .run(summary, nextStep, blockedBy, sessionId);

    const updated = this.getSession(sessionId)!;
    const oneLine = `[session:${updated.id}] ${updated.started_at} ${updated.session_id} — ${summary}`;
    this.upsertFts(
      `session:${updated.id}`,
      'sessions',
      updated.started_at,
      '',
      oneLine,
      `${summary} NEXT ${nextStep} BLOCKED ${blockedBy}`
    );

    return updated;
  }

  /**
   * Marks a session ended and stores the path to its caveman Obsidian note.
   */
  public endSession(input: {
    session_id: string;
    ended_at?: string;
    obsidian_note_path?: string;
  }): SessionRecord | null {
    const sessionId = this.sanitize(input.session_id) || 'session-default';
    if (!this.getSession(sessionId)) {
      this.startSession({ session_id: sessionId });
    }
    const endedAt = input.ended_at || new Date().toISOString();
    const notePath = input.obsidian_note_path ? this.sanitize(input.obsidian_note_path) : null;

    this.db
      .prepare(
        `UPDATE sessions
         SET ended_at = ?, status = 'completed', obsidian_note_path = COALESCE(?, obsidian_note_path)
         WHERE session_id = ?`
      )
      .run(endedAt, notePath, sessionId);

    return this.getSession(sessionId);
  }

  public getSessionObservations(sessionId: string): ObservationRecord[] {
    const cleanId = this.sanitize(sessionId);
    const rows = this.db
      .prepare('SELECT * FROM observations WHERE session_id = ? ORDER BY id ASC')
      .all(cleanId) as unknown as ObservationRecord[];
    return rows.map((r) => ({ ...r }));
  }

  public getNewestRulings(limit = 5): RulingRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM rulings ORDER BY ruled_at DESC, id DESC LIMIT ?')
      .all(limit) as unknown as RulingRecord[];
    return rows.map((r) => ({ ...r }));
  }

  /**
   * Returns open PRs with the judge's latest verdict on each.
   */
  public getOpenPrVerdicts(limit = 10): VerdictRecord[] {
    const rows = this.db
      .prepare(
        `SELECT v.*
         FROM verdicts v
         INNER JOIN (
           SELECT repo, pr_number, MAX(id) AS max_id
           FROM verdicts
           GROUP BY repo, pr_number
         ) latest ON v.id = latest.max_id
         WHERE v.pr_state = 'open'
         ORDER BY v.id DESC
         LIMIT ?`
      )
      .all(limit) as unknown as VerdictRecord[];
    return rows.map((r) => ({ ...r }));
  }

  public getLastSessionWithSummary(excludeSessionId?: string): SessionRecord | null {
    if (excludeSessionId) {
      const cleanExclude = this.sanitize(excludeSessionId);
      const row = this.db
        .prepare(
          `SELECT * FROM sessions
           WHERE session_id != ? AND (summary != '' OR next_step != '' OR blocked_by != 'none')
           ORDER BY id DESC LIMIT 1`
        )
        .get(cleanExclude) as SessionRecord | undefined;
      if (row) return { ...row };
    }
    const fallback = this.db
      .prepare(
        `SELECT * FROM sessions
         WHERE summary != '' OR next_step != '' OR blocked_by != 'none'
         ORDER BY id DESC LIMIT 1`
      )
      .get() as SessionRecord | undefined;
    return fallback ? { ...fallback } : null;
  }

  public getNewestLaneFacts(limit = 3): LaneFactRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM lane_facts ORDER BY id DESC LIMIT ?')
      .all(limit) as unknown as LaneFactRecord[];
    return rows.map((r) => ({ ...r }));
  }

  /**
   * Section 6 Retrieval: full-text search over everything (returns ids and one line each).
   */
  public search(query: string, limit = 20): SearchHit[] {
    const ftsQuery = toFtsSafeQuery(query);
    if (!ftsQuery) return [];

    const rows = this.db
      .prepare(
        `SELECT record_id, table_name, created_at, one_line
         FROM memory_fts
         WHERE memory_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(ftsQuery, Math.max(1, Math.min(limit, 100))) as Array<{
      record_id: string;
      table_name: string;
      created_at: string;
      one_line: string;
    }>;

    return rows.map((r) => {
      const numPart = Number(r.record_id.split(':')[1] || 0);
      return {
        id: r.record_id,
        numeric_id: Number.isFinite(numPart) ? numPart : 0,
        table_name: r.table_name,
        created_at: r.created_at,
        one_line: r.one_line,
      };
    });
  }

  /**
   * Section 6 Retrieval: timeline around a date or a PR.
   */
  public timeline(options: {
    date?: string;
    pr?: number;
    repo?: string;
    windowHours?: number;
    limit?: number;
  }): TimelineEntry[] {
    const limit = Math.max(1, Math.min(options.limit ?? 50, 200));

    if (typeof options.pr === 'number' && Number.isFinite(options.pr)) {
      const prNum = options.pr;
      const prToken = options.repo ? `${this.sanitize(options.repo)}#${prNum}` : `#${prNum}`;
      const rows = this.db
        .prepare(
          `SELECT record_id AS id, table_name, created_at, pr_ref, one_line
           FROM memory_fts
           WHERE pr_ref = ? OR pr_ref LIKE ? OR one_line LIKE ?
           ORDER BY created_at ASC
           LIMIT ?`
        )
        .all(prToken, `%#${prNum}`, `%#${prNum}%`, limit) as unknown as TimelineEntry[];
      return rows.map((r) => ({ ...r }));
    }

    if (options.date && options.date.trim().length > 0) {
      const rawDate = options.date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const windowHours = options.windowHours ?? 24;
        const centerMs = Date.parse(`${rawDate}T12:00:00.000Z`);
        const minIso = new Date(centerMs - windowHours * 3_600_000).toISOString();
        const maxIso = new Date(centerMs + windowHours * 3_600_000).toISOString();
        const rows = this.db
          .prepare(
            `SELECT record_id AS id, table_name, created_at, pr_ref, one_line
             FROM memory_fts
             WHERE created_at LIKE ? OR (created_at >= ? AND created_at <= ?)
             ORDER BY created_at ASC
             LIMIT ?`
          )
          .all(`${rawDate}%`, minIso, maxIso, limit) as unknown as TimelineEntry[];
        return rows.map((r) => ({ ...r }));
      }

      const parsedMs = Date.parse(rawDate);
      if (!Number.isNaN(parsedMs)) {
        const windowHours = options.windowHours ?? 24;
        const minIso = new Date(parsedMs - windowHours * 3_600_000).toISOString();
        const maxIso = new Date(parsedMs + windowHours * 3_600_000).toISOString();
        const rows = this.db
          .prepare(
            `SELECT record_id AS id, table_name, created_at, pr_ref, one_line
             FROM memory_fts
             WHERE created_at >= ? AND created_at <= ?
             ORDER BY created_at ASC
             LIMIT ?`
          )
          .all(minIso, maxIso, limit) as unknown as TimelineEntry[];
        return rows.map((r) => ({ ...r }));
      }
    }

    const rows = this.db
      .prepare(
        `SELECT record_id AS id, table_name, created_at, pr_ref, one_line
         FROM memory_fts
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(limit) as unknown as TimelineEntry[];
    return rows.map((r) => ({ ...r }));
  }

  /**
   * Section 6 Retrieval: get full observations (or records) by id.
   * Accepts numeric observation IDs (e.g. 1, "1") or prefixed IDs ("obs:1", "verdict:2", "ruling:1", "lane:1", "session:1").
   */
  public get(ids: Array<number | string>): Array<Record<string, unknown>> {
    const results: Array<Record<string, unknown>> = [];

    for (const rawId of ids) {
      const str = String(rawId).trim();
      const prefixedMatch = str.match(/^(obs|verdict|ruling|lane|session):(\d+)$/i);
      const prefix = prefixedMatch ? prefixedMatch[1]!.toLowerCase() : 'obs';
      const numId = prefixedMatch ? Number(prefixedMatch[2]) : Number(str);
      if (!Number.isFinite(numId) || numId <= 0) continue;

      if (prefix === 'obs') {
        const obs = this.getObservationById(numId);
        if (obs) results.push({ record_id: `obs:${obs.id}`, table: 'observations', ...obs });
      } else if (prefix === 'verdict') {
        const row = this.db.prepare('SELECT * FROM verdicts WHERE id = ?').get(numId) as
          | VerdictRecord
          | undefined;
        if (row) results.push({ record_id: `verdict:${row.id}`, table: 'verdicts', ...row });
      } else if (prefix === 'ruling') {
        const row = this.db.prepare('SELECT * FROM rulings WHERE id = ?').get(numId) as
          | RulingRecord
          | undefined;
        if (row) results.push({ record_id: `ruling:${row.id}`, table: 'rulings', ...row });
      } else if (prefix === 'lane') {
        const row = this.db.prepare('SELECT * FROM lane_facts WHERE id = ?').get(numId) as
          | LaneFactRecord
          | undefined;
        if (row) results.push({ record_id: `lane:${row.id}`, table: 'lane_facts', ...row });
      } else if (prefix === 'session') {
        const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(numId) as
          | SessionRecord
          | undefined;
        if (row) results.push({ record_id: `session:${row.id}`, table: 'sessions', ...row });
      }
    }

    return results;
  }

  /**
   * Builds and persists the rules-only ten-line digest for a given YYYY-MM-DD date,
   * and marks that date's raw observations with digest_date so they are eligible for pruning.
   */
  public createDailyDigest(dateStr: string): DailyDigestRecord {
    const cleanDate = this.sanitize(dateStr).slice(0, 10);
    const observations = this.db
      .prepare('SELECT * FROM observations WHERE created_at LIKE ? ORDER BY id ASC')
      .all(`${cleanDate}%`) as unknown as ObservationRecord[];
    const verdicts = this.db
      .prepare('SELECT * FROM verdicts WHERE created_at LIKE ? ORDER BY id ASC')
      .all(`${cleanDate}%`) as unknown as VerdictRecord[];
    const rulings = this.db
      .prepare('SELECT * FROM rulings WHERE ruled_at = ? OR created_at LIKE ? ORDER BY id ASC')
      .all(cleanDate, `${cleanDate}%`) as unknown as RulingRecord[];
    const laneFacts = this.db
      .prepare('SELECT * FROM lane_facts WHERE created_at LIKE ? ORDER BY id ASC')
      .all(`${cleanDate}%`) as unknown as LaneFactRecord[];

    const built = buildRulesOnlyDailyDigest(
      {
        date: cleanDate,
        observations,
        verdicts,
        rulings,
        laneFacts,
      },
      this.extraSecrets
    );

    const nowIso = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO daily_digests (date, created_at, line_count, content)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET
           created_at = excluded.created_at,
           line_count = excluded.line_count,
           content = excluded.content`
      )
      .run(cleanDate, nowIso, built.lines.length, built.text);

    this.db
      .prepare('UPDATE observations SET digest_date = ? WHERE created_at LIKE ?')
      .run(cleanDate, `${cleanDate}%`);

    return this.getDailyDigest(cleanDate)!;
  }

  public getDailyDigest(dateStr: string): DailyDigestRecord | null {
    const row = this.db
      .prepare('SELECT * FROM daily_digests WHERE date = ?')
      .get(dateStr.slice(0, 10)) as DailyDigestRecord | undefined;
    return row ? { ...row } : null;
  }

  /**
   * Section 4 Maintenance: size cap with oldest-first pruning of raw observations
   * ONLY after their daily digest exists, followed by VACUUM.
   */
  public runNightlyMaintenance(options?: {
    maxObservations?: number;
    maxSizeBytes?: number;
    vacuum?: boolean;
  }): { prunedCount: number; vacuumed: boolean; remainingObservations: number } {
    const maxObs = options?.maxObservations ?? this.maxObservations;
    const maxBytes = options?.maxSizeBytes ?? this.maxSizeBytes;
    const shouldVacuum = options?.vacuum ?? true;

    const totalRow = this.db
      .prepare('SELECT COUNT(*) AS cnt FROM observations')
      .get() as { cnt: number };
    const totalObs = Number(totalRow.cnt);

    let fileSize = 0;
    try {
      fileSize = fs.statSync(this.dbPath).size;
    } catch {
      fileSize = 0;
    }

    let prunedCount = 0;
    const overObservationCap = totalObs > maxObs;
    const overByteCap = fileSize > maxBytes;

    if (overObservationCap || overByteCap) {
      const targetDeleteCount = overObservationCap
        ? totalObs - maxObs
        : Math.max(1, Math.ceil(totalObs * 0.25));

      // Only prune raw observations whose daily digest already exists in daily_digests
      const eligibleRows = this.db
        .prepare(
          `SELECT o.id
           FROM observations o
           INNER JOIN daily_digests d
             ON d.date = COALESCE(o.digest_date, substr(o.created_at, 1, 10))
           ORDER BY o.created_at ASC, o.id ASC
           LIMIT ?`
        )
        .all(targetDeleteCount) as Array<{ id: number }>;

      const deleteObsStmt = this.db.prepare('DELETE FROM observations WHERE id = ?');
      const deleteFtsStmt = this.db.prepare('DELETE FROM memory_fts WHERE record_id = ?');

      for (const row of eligibleRows) {
        deleteObsStmt.run(row.id);
        deleteFtsStmt.run(`obs:${row.id}`);
        prunedCount += 1;
      }
    }

    if (shouldVacuum) {
      this.db.exec('VACUUM;');
    }

    const afterRow = this.db
      .prepare('SELECT COUNT(*) AS cnt FROM observations')
      .get() as { cnt: number };

    return {
      prunedCount,
      vacuumed: shouldVacuum,
      remainingObservations: Number(afterRow.cnt),
    };
  }

  public checkpointWal(): void {
    this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  }

  public close(): void {
    if (!this.closed) {
      this.closed = true;
      this.db.close();
    }
  }
}
