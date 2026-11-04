/**
 * Section 3: Rules-only observation compression (no model call in version 1).
 *
 * Observations are made by deterministic rules, never by calling a model:
 * - file_touched
 * - command_run
 * - pr_commented
 * - verdict_posted
 * - lane_dispatched
 * - picture_looked_at
 *
 * Also builds the ten-line daily digest by rules (default rules-only until Josh says otherwise).
 */

import {
  checkDeniedPath,
  formatPictureObservation,
  isImageFilePath,
  sanitizeJudgeMemoryText,
  stripPrivateTags,
} from './privacy.ts';

export const OBSERVATION_KINDS = [
  'file_touched',
  'command_run',
  'pr_commented',
  'verdict_posted',
  'lane_dispatched',
  'picture_looked_at',
] as const;

export type ObservationKind = (typeof OBSERVATION_KINDS)[number];

export interface RawToolUsePayload {
  session_id?: string;
  sessionId?: string;
  node?: string;
  tool_name?: string;
  tool?: string;
  tool_input?: Record<string, unknown> | string;
  input?: Record<string, unknown> | string;
  tool_response?: Record<string, unknown> | string;
  output?: Record<string, unknown> | string;
  result?: Record<string, unknown> | string;
  judge_session_marker?: string;
  harness?: string;
}

export interface ExtractedVerdictInfo {
  pr_number: number;
  repo: string;
  verdict: string;
  reasons: string;
  commit_judged: string;
  pr_state: 'open' | 'merged' | 'closed';
}

export interface ExtractedLaneFactInfo {
  lane: string;
  node: string;
  what_it_did: string;
  duration_seconds: number;
  what_it_broke: string;
}

export interface CompressedObservationResult {
  skipped: boolean;
  skipReason?: string;
  deniedCategory?: string | null;
  observation?: {
    kind: ObservationKind;
    tool: string;
    target: string;
    outcome: string;
    pr_number: number | null;
    repo: string | null;
    node: string | null;
  };
  verdictRecord?: ExtractedVerdictInfo;
  laneFactRecord?: ExtractedLaneFactInfo;
}

function toOneLine(text: string, maxChars = 200, extraSecrets: string[] = []): string {
  const clean = sanitizeJudgeMemoryText(text, extraSecrets);
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars - 3).trimEnd()}...`;
}

function extractStringField(
  obj: Record<string, unknown> | null | undefined,
  keys: string[]
): string {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

function collectCandidatePaths(
  inputObj: Record<string, unknown> | null,
  commandText: string
): string[] {
  const candidates: string[] = [];
  if (inputObj) {
    for (const key of [
      'file_path',
      'path',
      'Path',
      'target',
      'target_file',
      'filePath',
      'notebook_path',
      'image_path',
      'reference',
    ]) {
      const val = inputObj[key];
      if (typeof val === 'string' && val.trim().length > 0) {
        candidates.push(val.trim());
      }
    }
  }

  if (commandText) {
    // Also check file tokens inside shell commands that might read denied files
    const tokens = commandText
      .split(/[\s"'`;|&<>()+]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    for (const tok of tokens) {
      if (
        tok.includes('/') ||
        tok.includes('\\') ||
        tok.startsWith('.env') ||
        tok.endsWith('.env') ||
        tok.toLowerCase().includes('sup@-vault') ||
        tok.toLowerCase().includes('payments-private') ||
        tok.toLowerCase().includes('personal vault') ||
        tok.toLowerCase().endsWith('-to-gemini.md') ||
        tok.toLowerCase().endsWith('-to-hermes.md') ||
        tok.toLowerCase().endsWith('-to-codex.md')
      ) {
        candidates.push(tok);
      }
    }
  }

  return candidates;
}

function parseRepoAndPr(text: string, inputObj: Record<string, unknown> | null): {
  repo: string | null;
  prNumber: number | null;
} {
  let repo: string | null = null;
  let prNumber: number | null = null;

  if (inputObj) {
    if (typeof inputObj.repo === 'string' && inputObj.repo.trim()) {
      repo = inputObj.repo.trim();
    }
    if (typeof inputObj.pr_number === 'number' && Number.isFinite(inputObj.pr_number)) {
      prNumber = inputObj.pr_number;
    } else if (typeof inputObj.pr === 'number' && Number.isFinite(inputObj.pr)) {
      prNumber = inputObj.pr;
    } else if (typeof inputObj.pr === 'string' && /^\d+$/.test(inputObj.pr.trim())) {
      prNumber = Number(inputObj.pr.trim());
    }
  }

  if (!repo) {
    const repoFlagMatch = text.match(/(?:--repo|-R)\s+["']?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)["']?/);
    if (repoFlagMatch?.[1]) {
      repo = repoFlagMatch[1];
    } else {
      const slugMatch = text.match(/\b(Trollz1004\/[A-Za-z0-9_.-]+)\b/i);
      if (slugMatch?.[1]) {
        repo = slugMatch[1];
      }
    }
  }

  if (prNumber === null) {
    const ghPrMatch = text.match(/\bgh\s+pr\s+(?:comment|review|view|diff|checks|edit)\s+(\d+)\b/i);
    if (ghPrMatch?.[1]) {
      prNumber = Number(ghPrMatch[1]);
    } else {
      const hashPrMatch = text.match(/(?:PR\s*#|#)(\d{1,6})\b/i);
      if (hashPrMatch?.[1]) {
        prNumber = Number(hashPrMatch[1]);
      }
    }
  }

  return { repo, prNumber };
}

/**
 * Compresses a raw PostToolUse event into a single-line observation by rules only (no model call).
 */
export function compressToolUseToObservation(
  payload: RawToolUsePayload,
  options?: { defaultNode?: string; extraSecrets?: string[] }
): CompressedObservationResult {
  const extraSecrets = options?.extraSecrets ?? [];
  const rawTool = (payload.tool_name || payload.tool || '').trim();
  if (!rawTool) {
    return { skipped: true, skipReason: 'Missing tool name.' };
  }

  const inputRaw = payload.tool_input ?? payload.input ?? {};
  const inputObj =
    typeof inputRaw === 'object' && inputRaw !== null
      ? (inputRaw as Record<string, unknown>)
      : null;
  const inputStr = typeof inputRaw === 'string' ? inputRaw : JSON.stringify(inputRaw ?? {});

  const outputRaw = payload.tool_response ?? payload.output ?? payload.result ?? '';
  const outputObj =
    typeof outputRaw === 'object' && outputRaw !== null
      ? (outputRaw as Record<string, unknown>)
      : null;
  const outputStr =
    typeof outputRaw === 'string'
      ? outputRaw
      : outputObj
        ? extractStringField(outputObj, ['stdout', 'output', 'message', 'result', 'verdict', 'summary']) ||
          JSON.stringify(outputObj)
        : '';

  const commandText = extractStringField(inputObj, ['command', 'CommandLine', 'cmd']);

  // 1. Check <private> tag across input and output
  const inputPriv = stripPrivateTags(inputStr);
  const outputPriv = stripPrivateTags(outputStr);
  if (inputPriv.hadPrivateTag && inputPriv.emptyAfterStrip) {
    return { skipped: true, skipReason: 'Observation suppressed by <private> tag.' };
  }
  if (
    outputPriv.hadPrivateTag &&
    outputPriv.emptyAfterStrip &&
    commandText.trim().length === 0 &&
    !extractStringField(inputObj, ['file_path', 'path', 'Path', 'target'])
  ) {
    return { skipped: true, skipReason: 'Observation suppressed by <private> tag.' };
  }

  // 2. Enforce deny-list on all candidate paths in tool input and command
  const candidatePaths = collectCandidatePaths(inputObj, commandText);
  for (const candidate of candidatePaths) {
    const denyCheck = checkDeniedPath(candidate);
    if (denyCheck.denied) {
      return {
        skipped: true,
        skipReason: denyCheck.reason ?? 'Path is on the deny-list.',
        deniedCategory: denyCheck.category,
      };
    }
  }

  const node =
    (typeof payload.node === 'string' && payload.node.trim()) ||
    (inputObj && typeof inputObj.node === 'string' && inputObj.node.trim()) ||
    options?.defaultNode ||
    process.env.COMPUTERNAME ||
    'Alienware';

  const explicitTarget = extractStringField(inputObj, [
    'file_path',
    'path',
    'Path',
    'target',
    'target_file',
    'filePath',
    'image_path',
  ]);

  // 3. Rule: picture_looked_at (never store image bytes or directory path beyond file name)
  if (
    isImageFilePath(explicitTarget) ||
    /^(?:view_image|inspect_image|look_at_picture)$/i.test(rawTool) ||
    (commandText && /\bops[\\/]eyes\b/i.test(commandText) && isImageFilePath(commandText))
  ) {
    const imageRef = explicitTarget || candidatePaths.find((p) => isImageFilePath(p)) || 'image.png';
    const verdictHint =
      extractStringField(inputObj, ['verdict', 'reason']) ||
      extractStringField(outputObj, ['verdict', 'summary', 'firstLine', 'stdout']) ||
      outputPriv.cleaned ||
      'inspected reference comparison';
    const formatted = formatPictureObservation(imageRef, verdictHint, extraSecrets);
    return {
      skipped: false,
      observation: {
        kind: 'picture_looked_at',
        tool: toOneLine(rawTool, 60, extraSecrets),
        target: formatted.fileName,
        outcome: toOneLine(formatted.outcome, 200, extraSecrets),
        pr_number: null,
        repo: null,
        node: toOneLine(node, 60, extraSecrets),
      },
    };
  }

  const combinedText = `${commandText} ${inputPriv.cleaned} ${outputPriv.cleaned}`;
  const { repo, prNumber } = parseRepoAndPr(combinedText, inputObj);
  const effectiveRepo = repo || 'Trollz1004/dream-online';

  // 4. Rule: verdict_posted
  const verdictMatch = combinedText.match(
    /Claude judge verdict:\s*(APPROVE|CHANGES REQUESTED|REJECT|PASS|FAIL)/i
  );
  const explicitVerdict = extractStringField(inputObj, ['verdict']);
  if (verdictMatch || (explicitVerdict && prNumber !== null)) {
    const verdictValue = (verdictMatch?.[1] || explicitVerdict).toUpperCase();
    const prNum = prNumber ?? 0;
    const prTarget = prNum > 0 ? `${effectiveRepo}#${prNum}` : effectiveRepo;
    const rawReason =
      extractStringField(inputObj, ['reasons', 'reason', 'body']) ||
      outputPriv.cleaned ||
      commandText ||
      `Judge posted ${verdictValue}`;
    const cleanReason = toOneLine(
      rawReason.replace(/.*Claude judge verdict:\s*(?:APPROVE|CHANGES REQUESTED|REJECT|PASS|FAIL)[:.\s-]*/i, ''),
      160,
      extraSecrets
    ) || `Judge posted ${verdictValue}`;
    const commitJudged =
      extractStringField(inputObj, ['commit_judged', 'commit', 'sha']) ||
      (combinedText.match(/\b([0-9a-f]{7,40})\b/i)?.[1] ?? 'HEAD');

    return {
      skipped: false,
      observation: {
        kind: 'verdict_posted',
        tool: toOneLine(rawTool, 60, extraSecrets),
        target: toOneLine(prTarget, 120, extraSecrets),
        outcome: toOneLine(`verdict ${verdictValue} on ${prTarget}: ${cleanReason}`, 200, extraSecrets),
        pr_number: prNum > 0 ? prNum : null,
        repo: toOneLine(effectiveRepo, 100, extraSecrets),
        node: toOneLine(node, 60, extraSecrets),
      },
      verdictRecord:
        prNum > 0
          ? {
              pr_number: prNum,
              repo: toOneLine(effectiveRepo, 100, extraSecrets),
              verdict: verdictValue,
              reasons: cleanReason,
              commit_judged: toOneLine(commitJudged, 40, extraSecrets),
              pr_state:
                inputObj?.pr_state === 'merged' || inputObj?.pr_state === 'closed'
                  ? inputObj.pr_state
                  : 'open',
            }
          : undefined,
    };
  }

  // 5. Rule: pr_commented
  if (
    /\bgh\s+(?:pr|issue)\s+(?:comment|review)\b/i.test(commandText) ||
    /^pr_comment$/i.test(rawTool)
  ) {
    const prNum = prNumber ?? 0;
    const prTarget = prNum > 0 ? `${effectiveRepo}#${prNum}` : effectiveRepo;
    const commentSummary =
      extractStringField(inputObj, ['body', 'comment']) ||
      outputPriv.cleaned ||
      commandText;
    return {
      skipped: false,
      observation: {
        kind: 'pr_commented',
        tool: toOneLine(rawTool, 60, extraSecrets),
        target: toOneLine(prTarget, 120, extraSecrets),
        outcome: toOneLine(`commented on ${prTarget}: ${commentSummary}`, 200, extraSecrets),
        pr_number: prNum > 0 ? prNum : null,
        repo: toOneLine(effectiveRepo, 100, extraSecrets),
        node: toOneLine(node, 60, extraSecrets),
      },
    };
  }

  // 6. Rule: lane_dispatched
  const explicitLane = extractStringField(inputObj, ['lane', 'target_lane']);
  const commandLaneMatch = commandText.match(
    /\b(agy(?:\.exe)?|codex|fcc-codex|hermes|gemini-3\.8-flash|gemini-4-argon|claude-sonnet-5-5|claude-opus-5-5)\b/i
  );
  if (
    explicitLane ||
    /^dispatch/i.test(rawTool) ||
    (commandLaneMatch && /\b(exec|dispatch|--model|-z|--print)\b/i.test(commandText))
  ) {
    const laneName = toOneLine(explicitLane || commandLaneMatch?.[1] || 'worker-lane', 60, extraSecrets);
    const whatItDid = toOneLine(
      extractStringField(inputObj, ['what_it_did', 'task', 'prompt']) ||
        outputPriv.cleaned ||
        commandText ||
        `dispatched ${laneName}`,
      160,
      extraSecrets
    );
    const whatItBroke = toOneLine(
      extractStringField(inputObj, ['what_it_broke', 'broke', 'error']) ||
        extractStringField(outputObj, ['stderr', 'error']) ||
        'none',
      140,
      extraSecrets
    );
    const durationSeconds =
      typeof inputObj?.duration_seconds === 'number' && Number.isFinite(inputObj.duration_seconds)
        ? Math.max(0, Math.round(inputObj.duration_seconds))
        : typeof outputObj?.duration_seconds === 'number' && Number.isFinite(outputObj.duration_seconds)
          ? Math.max(0, Math.round(outputObj.duration_seconds))
          : 0;

    return {
      skipped: false,
      observation: {
        kind: 'lane_dispatched',
        tool: toOneLine(rawTool, 60, extraSecrets),
        target: toOneLine(`${laneName}@${node}`, 120, extraSecrets),
        outcome: toOneLine(
          `dispatched ${laneName} on ${node}: ${whatItDid}${whatItBroke !== 'none' ? ` (broke: ${whatItBroke})` : ''}`,
          200,
          extraSecrets
        ),
        pr_number: prNumber,
        repo: repo ? toOneLine(repo, 100, extraSecrets) : null,
        node: toOneLine(node, 60, extraSecrets),
      },
      laneFactRecord: {
        lane: laneName,
        node: toOneLine(node, 60, extraSecrets),
        what_it_did: whatItDid,
        duration_seconds: durationSeconds,
        what_it_broke: whatItBroke,
      },
    };
  }

  // 7. Rule: file_touched
  if (
    explicitTarget ||
    /^(?:Read|Write|Edit|MultiEdit|NotebookEdit|read_file|write_file|edit_file)$/i.test(rawTool)
  ) {
    const targetPath = toOneLine(explicitTarget || 'unknown-file', 160, extraSecrets);
    const verb = /^(?:Write|Edit|MultiEdit|NotebookEdit|write_file|edit_file)$/i.test(rawTool)
      ? 'modified'
      : 'read';
    const statusText = toOneLine(
      outputPriv.cleaned || `${verb} ${targetPath}`,
      140,
      extraSecrets
    );
    return {
      skipped: false,
      observation: {
        kind: 'file_touched',
        tool: toOneLine(rawTool, 60, extraSecrets),
        target: targetPath,
        outcome: toOneLine(`${verb} ${targetPath}: ${statusText}`, 200, extraSecrets),
        pr_number: prNumber,
        repo: repo ? toOneLine(repo, 100, extraSecrets) : null,
        node: toOneLine(node, 60, extraSecrets),
      },
    };
  }

  // 8. Rule: command_run (fallback for Bash / CLI / tool calls)
  const cmdTarget = toOneLine(commandText || rawTool, 120, extraSecrets);
  const cmdOutcome = toOneLine(
    outputPriv.cleaned || `ran ${cmdTarget}`,
    160,
    extraSecrets
  );
  return {
    skipped: false,
    observation: {
      kind: 'command_run',
      tool: toOneLine(rawTool, 60, extraSecrets),
      target: cmdTarget,
      outcome: toOneLine(`${cmdTarget} -> ${cmdOutcome}`, 200, extraSecrets),
      pr_number: prNumber,
      repo: repo ? toOneLine(repo, 100, extraSecrets) : null,
      node: toOneLine(node, 60, extraSecrets),
    },
  };
}

export interface DigestInputData {
  date: string;
  observations: Array<{
    kind: string;
    target: string;
    outcome: string;
  }>;
  verdicts: Array<{
    repo: string;
    pr_number: number;
    verdict: string;
    reasons: string;
  }>;
  rulings: Array<{
    ruled_at: string;
    ruling: string;
    written_in: string;
  }>;
  laneFacts: Array<{
    lane: string;
    node: string;
    what_it_did: string;
    what_it_broke: string;
  }>;
}

/**
 * Compresses a day's activity into at most 10 lines using deterministic rules only (zero model calls).
 */
export function buildRulesOnlyDailyDigest(
  data: DigestInputData,
  extraSecrets: string[] = []
): { lines: string[]; text: string } {
  const lines: string[] = [];

  lines.push(
    toOneLine(
      `Digest ${data.date}: ${data.observations.length} observations, ${data.verdicts.length} verdicts, ${data.rulings.length} rulings, ${data.laneFacts.length} lane runs.`,
      200,
      extraSecrets
    )
  );

  for (const v of data.verdicts.slice(0, 3)) {
    lines.push(
      toOneLine(
        `Verdict ${v.repo}#${v.pr_number}: ${v.verdict} — ${v.reasons}`,
        200,
        extraSecrets
      )
    );
  }

  for (const r of data.rulings.slice(0, 2)) {
    lines.push(
      toOneLine(
        `Ruling (${r.ruled_at} in ${r.written_in}): ${r.ruling}`,
        200,
        extraSecrets
      )
    );
  }

  for (const lf of data.laneFacts.slice(0, 2)) {
    lines.push(
      toOneLine(
        `Lane ${lf.lane} on ${lf.node}: ${lf.what_it_did} (broke: ${lf.what_it_broke})`,
        200,
        extraSecrets
      )
    );
  }

  const remainingSlots = 10 - lines.length;
  if (remainingSlots > 0) {
    const fileTouches = data.observations
      .filter((o) => o.kind === 'file_touched')
      .map((o) => o.target);
    const uniqueFiles = Array.from(new Set(fileTouches));
    if (uniqueFiles.length > 0) {
      lines.push(
        toOneLine(
          `Files touched (${uniqueFiles.length}): ${uniqueFiles.slice(0, 5).join(', ')}`,
          200,
          extraSecrets
        )
      );
    }
  }

  if (lines.length < 10) {
    const otherObs = data.observations.filter((o) => o.kind !== 'file_touched');
    for (const obs of otherObs.slice(0, 10 - lines.length)) {
      lines.push(
        toOneLine(`${obs.kind} ${obs.target}: ${obs.outcome}`, 200, extraSecrets)
      );
    }
  }

  const cappedLines = lines.slice(0, 10);
  return {
    lines: cappedLines,
    text: cappedLines.join('\n'),
  };
}
