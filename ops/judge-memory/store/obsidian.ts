/**
 * Section 2 (SessionEnd): Writes the caveman Obsidian note required by AGENT-STANDARD.md section 5
 * directly from the session's recorded observations and Stop summary so the note and the SQLite
 * memory never disagree.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { JudgeMemoryStore } from './database.ts';
import { normalizePortablePaths, sanitizeJudgeMemoryText } from './privacy.ts';

export interface WriteObsidianNoteOptions {
  sessionId: string;
  node?: string;
  agent?: string;
  obsidianDir?: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  extraSecrets?: string[];
}

export interface WrittenObsidianNote {
  filePath: string;
  portablePath: string;
  content: string;
}

function formatEasternTimestamp(now: Date): {
  headerStamp: string;
  fileStamp: string;
} {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour') === '24' ? '00' : get('hour');
    const minute = get('minute');

    return {
      headerStamp: `${year}-${month}-${day} ${hour}:${minute} ET`,
      fileStamp: `${year}-${month}-${day}_${hour}${minute}`,
    };
  } catch {
    const iso = now.toISOString();
    const datePart = iso.slice(0, 10);
    const timePart = iso.slice(11, 16);
    return {
      headerStamp: `${datePart} ${timePart} ET`,
      fileStamp: `${datePart}_${timePart.replace(':', '')}`,
    };
  }
}

/**
 * Generates and writes the session-end caveman Obsidian note from the session's stored observations.
 */
export function writeSessionEndObsidianNote(
  store: JudgeMemoryStore,
  options: WriteObsidianNoteOptions
): WrittenObsidianNote {
  const env = options.env ?? process.env;
  const extraSecrets = options.extraSecrets ?? [];
  const now = options.now ?? new Date();
  const sanitize = (s: string) => sanitizeJudgeMemoryText(s, extraSecrets, env);

  const session = store.getSession(options.sessionId);
  const observations = store.getSessionObservations(options.sessionId);

  const nodeName = sanitize(
    options.node || session?.node || env.COMPUTERNAME || 'Alienware'
  );
  const agentName = sanitize(options.agent || 'fable') || 'fable';

  const { headerStamp, fileStamp } = formatEasternTimestamp(now);

  // Build DID from observations and session summary
  const didParts: string[] = [];
  if (session?.summary) {
    didParts.push(sanitize(session.summary));
  }
  for (const obs of observations) {
    didParts.push(sanitize(`${obs.kind} ${obs.target} (${obs.outcome})`));
  }
  const didLine =
    didParts.length > 0 ? Array.from(new Set(didParts)).join('; ') : 'session completed with no tool observations';

  // Build BROKE from any observation outcome mentioning an error/failure
  const brokeObs = observations.filter((o) =>
    /\b(broke|failed|error|fail)\b/i.test(o.outcome)
  );
  const brokeLine =
    brokeObs.length > 0
      ? brokeObs.map((o) => sanitize(`${o.tool} ${o.target}: ${o.outcome}`)).join('; ')
      : 'none';

  const nextLine = sanitize(session?.next_step || 'Resume from open PRs and state page.');
  const blockedLine = sanitize(session?.blocked_by || 'none') || 'none';

  const touchedFiles = Array.from(
    new Set(
      observations
        .filter((o) => o.kind === 'file_touched')
        .map((o) => sanitize(o.target))
        .filter(Boolean)
    )
  );
  const filesLine = touchedFiles.length > 0 ? touchedFiles.join(', ') : 'none';

  const content = [
    `# ${headerStamp} · ${nodeName.toUpperCase()} · ${agentName}`,
    `DID: ${didLine}`,
    `BROKE: ${brokeLine}`,
    `NEXT: ${nextLine}`,
    `BLOCKED: ${blockedLine}`,
    `FILES: ${filesLine}`,
    '',
  ].join('\n');

  const userProfile = env.USERPROFILE || os.homedir();
  const defaultDir = path.join(userProfile, 'Obsidian', nodeName, agentName);
  const targetDir =
    options.obsidianDir ||
    (env.JUDGE_MEMORY_OBSIDIAN_DIR && env.JUDGE_MEMORY_OBSIDIAN_DIR.trim().length > 0
      ? env.JUDGE_MEMORY_OBSIDIAN_DIR.trim()
      : defaultDir);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const safeNode = nodeName.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const safeAgent = agentName.replace(/[^A-Za-z0-9_-]/g, '');
  const fileName = `${fileStamp}_${safeNode}_${safeAgent}.md`;
  const fullPath = path.join(targetDir, fileName);

  fs.writeFileSync(fullPath, content, 'utf8');

  const portablePath = normalizePortablePaths(fullPath, env);
  store.endSession({
    session_id: options.sessionId,
    ended_at: now.toISOString(),
    obsidian_note_path: portablePath,
  });

  return {
    filePath: fullPath,
    portablePath,
    content,
  };
}
