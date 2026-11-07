/**
 * Ops routing for DREAM agents (Jev router core, lane table, weekly ranking, quota fallback,
 * :8082 isolation check, and clean-room studio roles).
 * Lives under ops/ on purpose: it is operations code, not game code, and must never be bundled
 * into the combat module that ships to players' browsers.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AgyDispatchAdapter,
  ConsoleCreditAdapter,
  type ConsoleCreditAdapterOptions,
  detectQuotaOr429Error,
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  type DispatchPollResult,
  FreeClaudeCodeDispatchAdapter,
  HermesDispatchAdapter,
  LANE_EFFORT_VALUES,
  type LaneSetting,
  parseEyesGateVerdictFromOutput,
  parsePrUrlFromOutput,
} from './adapters/index.ts';

export * from './adapters/index.ts';

const ROUTER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_LANES_PATH = path.join(ROUTER_DIR, 'lanes.json');
export const DEFAULT_RANKINGS_DIR = path.join(ROUTER_DIR, 'rankings');
export const DEFAULT_DECISIONS_LOG_PATH = path.join(ROUTER_DIR, 'decisions.log');
export const DEFAULT_RANK_MODELS_PROMPT_PATH = path.join(ROUTER_DIR, 'rank-models.md');

// ============================================================================
// 1. JEV ROUTER CORE — FIXED JOB CLASSES & TASK PROFILER
// ============================================================================

export const JEV_JOB_CLASSES = [
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
] as const;

export type JevJobClass = (typeof JEV_JOB_CLASSES)[number];

export interface TaskProfileOptions {
  files?: string[];
  screenshotRequired?: boolean;
}

export interface TaskProfile {
  jobClass: JevJobClass;
  reason: string;
  keywordsMatched: string[];
  fileTypesNamed: string[];
  screenshotRequired: boolean;
}

const FILE_EXT_REGEX = /\b[\w./-]+\.(wgsl|glsl|vert|frag|glb|gltf|blend|uasset|umap|gd|tscn|css|scss|less|html|svg|png|webp|jpg|jpeg|mp4|mov|mkv|ts|tsx|js|jsx|mjs|cjs|py|sql|json|md|txt|yaml|yml|sh|ps1)\b/gi;
const STANDALONE_EXT_REGEX = /(?:^|\s)\.(wgsl|glsl|vert|frag|glb|gltf|blend|uasset|umap|gd|tscn|css|scss|less|html|svg|png|webp|jpg|jpeg|mp4|mov|mkv|ts|tsx|js|jsx|mjs|cjs|py|sql|json|md|txt|yaml|yml|sh|ps1)\b/gi;

const ENGINE_EXTENSIONS = new Set([
  'wgsl',
  'glsl',
  'vert',
  'frag',
  'glb',
  'gltf',
  'blend',
  'uasset',
  'umap',
  'gd',
  'tscn',
]);

const VISUAL_EXTENSIONS = new Set([
  'css',
  'scss',
  'less',
  'html',
  'svg',
  'png',
  'webp',
  'jpg',
  'jpeg',
]);

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'mkv']);

const DOC_ONLY_EXTENSIONS = new Set(['md', 'txt']);

const CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'sql',
  'json',
  'yaml',
  'yml',
  'sh',
  'ps1',
]);

function extractFileTypes(taskDescription: string, explicitFiles: string[] = []): string[] {
  const combined = `${taskDescription} ${explicitFiles.join(' ')}`;
  const found = new Set<string>();

  for (const match of combined.matchAll(FILE_EXT_REGEX)) {
    if (match[1]) found.add(match[1].toLowerCase());
  }
  for (const match of combined.matchAll(STANDALONE_EXT_REGEX)) {
    if (match[1]) found.add(match[1].toLowerCase());
  }
  return Array.from(found);
}

function matchKeywordList(lowerText: string, candidates: readonly string[]): string[] {
  const matched: string[] = [];
  for (const kw of candidates) {
    if (lowerText.includes(kw)) {
      matched.push(kw.replace(/\./g, ' '));
    }
  }
  return matched;
}

/**
 * Ensures the returned reason is strictly a single sentence with no internal periods.
 */
function toSingleSentence(body: string): string {
  const cleaned = body
    .replace(/\r?\n+/g, ' ')
    .replace(/[.!?]+/g, '')
    .replace(/;/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  return `${cleaned}.`;
}

const ROUTE_KEYWORDS = [
  'route task',
  'task router',
  'routing decision',
  'classify task',
  'triage task',
  'pick a lane',
  'select a lane',
  'select lane',
  'which lane',
  'dispatch task',
  'assign lane',
  'jev router',
] as const;

const YOUTUBE_UPLOAD_KEYWORDS = [
  'youtube-upload',
  'youtube upload',
  'upload to youtube',
  'youtube data api',
  'youtube shorts upload',
  'youtube short upload',
  'private youtube',
  'upload video to youtube',
  'upload short to youtube',
] as const;

const POST_X_KEYWORDS = [
  'post-x',
  'post to x',
  'post on x',
  'publish on x',
  'x thread',
  'x post',
  'tweet',
  'twitter',
  'grok x',
] as const;

/**
 * Judge is only for ruling work: review, verdict, approve, merge and ruling jobs. These phrases are strong
 * signals on their own. A bare mention of the word "judge" or "fable" (a file name, a lane name in a
 * docs sentence) is not a ruling request and never profiles a task as judge.
 */
const JUDGE_KEYWORDS = [
  'lanes disagree',
  'ai lanes disagree',
  'disagreement',
  'tie-breaker',
  'tiebreaker',
  'merge authority',
  'final ruling',
  'supreme judge',
  'arbitrate',
  'approve merge',
] as const;

/** Judge verbs matched as whole words (review, verdict, approve, merge, ruling). */
const JUDGE_VERB_REGEX = /\b(review(?:s|ing)?|verdict|approve[sd]?|merge|ruling)\b/gi;

/** "never merge", "do not approve" and similar negations are rules in a task body, not a ruling request. */
const JUDGE_NEGATION_REGEX =
  /\b(?:never|not|don'?t|no|without|cannot|can'?t)\s+(?:\w+\s+){0,2}?(?:merg\w*|approv\w*)\b/gi;

/** Strong judge signals that outrank a docs or wording cleanup: a verdict, a ruling, or a stated disagreement. */
const STRONG_JUDGE_REGEX = /\b(verdict|ruling|approve merge)\b/i;

/**
 * Docs cleanup, wording, rename and reference-fix jobs are mechanical, never judge, even when the text
 * names a judge lane, a handoff file or an engine in passing.
 */
const DOC_MECHANICAL_REGEXES: readonly (readonly [string, RegExp])[] = [
  ['readme', /\breadme(?:\.md)?\b/i],
  ['docs', /\b(?:docs?|documentation)\b/i],
  ['wording', /\bwording\b/i],
  ['rename', /\brenam(?:e|es|ed|ing)\b/i],
  ['reference fix', /\breference[- ]fix(?:es)?\b/i],
  ['fix references', /\bfix(?:ing|es)?\s+(?:the\s+|all\s+|every\s+)?(?:stale\s+|broken\s+|old\s+)?references?\b/i],
  ['stale references', /\bstale\b[^.\n]{0,40}\breferences?\b/i],
  ['broken links', /\bbroken\s+links?\b/i],
];

/** Work that makes a docs mention incidental: real engine or implementation work goes to its own class. */
const DOC_GUARD_WORK_REGEX = /\b(optimi[sz]e|implement|rewrite|render|animate|simulate|benchmark)\b/i;

function matchJudgeSignals(lowerText: string): string[] {
  const phrases = matchKeywordList(lowerText, JUDGE_KEYWORDS);
  const withoutNegations = lowerText.replace(JUDGE_NEGATION_REGEX, ' ');
  const verbs = new Set<string>();
  for (const match of withoutNegations.matchAll(JUDGE_VERB_REGEX)) {
    verbs.add(match[1].toLowerCase());
  }
  return [...phrases, ...verbs];
}


const ENGINE_KEYWORDS = [
  'webgpu',
  'three.js',
  'threejs',
  'shader',
  'wgsl',
  'glsl',
  '3d engine',
  'ecs',
  'unreal',
  'godot',
  'blender',
  'voxel',
  'raycast',
  'rigidbody',
  'mesh',
  'sunken bastion',
  'combat window',
  'render pipeline',
  'frame data',
] as const;

const SCREENSHOT_KEYWORDS = [
  'screenshot',
  'eyes gate',
  'visual diff',
  'before-and-after',
  'side-by-side',
  'viewport capture',
  'pixel diff',
] as const;

const DESIGN_VISUAL_KEYWORDS = [
  'design-visual',
  'visual design',
  'ui design',
  'ux design',
  'layout',
  'tailwind',
  'stylesheet',
  'typography',
  'color contrast',
  'landing page',
  'hero section',
  'hud',
  'responsive ui',
  'component styling',
] as const;

const RESEARCH_KEYWORDS = [
  'research',
  'investigate',
  'literature survey',
  'feasibility study',
  'benchmark comparison',
  'deep dive',
  'whitepaper',
  'survey options',
  'analyze docs',
  'source study',
] as const;

const CODE_HARD_KEYWORDS = [
  'code-hard',
  'race condition',
  'deadlock',
  'concurrency',
  'cryptography',
  'security vulnerability',
  'memory leak',
  'distributed',
  'consensus',
  'compiler',
  'parser',
  'state machine',
  'protocol design',
  'root-cause',
  'architecture',
  'auth bypass',
] as const;

const MECHANICAL_KEYWORDS = [
  'mechanical',
  'typo',
  'rename',
  'format',
  'prettier',
  'eslint',
  'lint fix',
  'bump version',
  'sort imports',
  'whitespace',
  'fix comment',
  'remove unused',
  'gitignore',
] as const;

const CODE_BULK_KEYWORDS = [
  'code-bulk',
  'bulk',
  'scaffold',
  'crud',
  'boilerplate',
  'batch',
  'across files',
  'unit tests',
  'write tests',
  'implement',
  'refactor',
  'endpoints',
  'migration',
] as const;

/**
 * Profiles a task description into one of the 10 fixed Jev job classes using plain rules
 * (keywords, file types named, and whether a screenshot is required) and returns a single-sentence reason.
 */
export function profileTask(
  taskDescription: string,
  options?: TaskProfileOptions
): TaskProfile {
  const lower = taskDescription.toLowerCase();
  const fileTypesNamed = extractFileTypes(taskDescription, options?.files);
  const screenshotKeywords = matchKeywordList(lower, SCREENSHOT_KEYWORDS);
  const explicitScreenshot = Boolean(options?.screenshotRequired) || screenshotKeywords.length > 0;

  // 1. Route tasks (checked before judge so routing decisions never go to judge)
  const routeHits = matchKeywordList(lower, ROUTE_KEYWORDS);
  if (routeHits.length > 0 || /^\[?route\]?:/i.test(taskDescription.trim())) {
    const matched = routeHits.length > 0 ? routeHits : ['route prefix'];
    return {
      jobClass: 'route',
      reason: toSingleSentence(
        `The task matches routing keywords (${matched.join(', ')}) and is classified as route so the router never sends its own routing decisions to judge`
      ),
      keywordsMatched: matched,
      fileTypesNamed,
      screenshotRequired: false,
    };
  }

  // 2. YouTube upload (private YouTube Data API only, never a model)
  const ytHits = matchKeywordList(lower, YOUTUBE_UPLOAD_KEYWORDS);
  const hasVideoFile = fileTypesNamed.some((ext) => VIDEO_EXTENSIONS.has(ext));
  if (ytHits.length > 0 || (lower.includes('youtube') && (hasVideoFile || lower.includes('upload')))) {
    const matched = ytHits.length > 0 ? ytHits : ['youtube', 'upload'];
    return {
      jobClass: 'youtube-upload',
      reason: toSingleSentence(
        `The task matches YouTube upload rules (${matched.join(', ')}) and is classified as youtube-upload for private YouTube Data API delivery without calling a model`
      ),
      keywordsMatched: matched,
      fileTypesNamed,
      screenshotRequired: false,
    };
  }

  // 3. Post-X (Grok through Hermes)
  const postXHits = matchKeywordList(lower, POST_X_KEYWORDS);
  if (postXHits.length > 0) {
    return {
      jobClass: 'post-x',
      reason: toSingleSentence(
        `The task matches X publishing keywords (${postXHits.join(', ')}) and is classified as post-x for Grok through Hermes`
      ),
      keywordsMatched: postXHits,
      fileTypesNamed,
      screenshotRequired: false,
    };
  }

  // 4. Docs cleanup, wording, rename and reference-fix jobs are mechanical and never reach judge
  const docHits = DOC_MECHANICAL_REGEXES.filter(([, pattern]) => pattern.test(taskDescription)).map(
    ([label]) => label
  );
  if (docHits.length > 0) {
    const strongJudge =
      STRONG_JUDGE_REGEX.test(lower) || matchKeywordList(lower, JUDGE_KEYWORDS).length > 0;
    const hasImplementationWork =
      matchKeywordList(lower, CODE_BULK_KEYWORDS).length > 0 ||
      matchKeywordList(lower, RESEARCH_KEYWORDS).length > 0 ||
      DOC_GUARD_WORK_REGEX.test(lower);
    const namesNonDocFiles = fileTypesNamed.some(
      (ext) => ENGINE_EXTENSIONS.has(ext) || VISUAL_EXTENSIONS.has(ext) || CODE_EXTENSIONS.has(ext)
    );
    if (!strongJudge && !hasImplementationWork && !namesNonDocFiles && !explicitScreenshot) {
      return {
        jobClass: 'mechanical',
        reason: toSingleSentence(
          `The task is a docs, wording, rename or reference-fix cleanup (${docHits.join(', ')}) and is classified as mechanical for Gemini Flash in agy, never judge`
        ),
        keywordsMatched: docHits,
        fileTypesNamed,
        screenshotRequired: false,
      };
    }
  }

  // 5. Judge (Fable on signed-in Claude Code; review, verdict, approve, merge and ruling jobs only; never receives route tasks)
  const judgeHits = matchJudgeSignals(lower);
  if (judgeHits.length > 0) {
    return {
      jobClass: 'judge',
      reason: toSingleSentence(
        `The task requests an authoritative ruling (${judgeHits.join(', ')}) and is classified as judge for Fable on signed-in Claude Code`
      ),
      keywordsMatched: judgeHits,
      fileTypesNamed,
      screenshotRequired: false,
    };
  }

  // 6. Engine (3D engine, shaders, WebGPU, game simulation)
  const engineHits = matchKeywordList(lower, ENGINE_KEYWORDS);
  const engineExts = fileTypesNamed.filter((ext) => ENGINE_EXTENSIONS.has(ext));
  if (engineHits.length > 0 || engineExts.length > 0) {
    const signals = [...engineHits, ...engineExts.map((e) => `${e} file`)];
    return {
      jobClass: 'engine',
      reason: toSingleSentence(
        `The task targets 3D engine or shader work (${signals.join(', ')}) and is classified as engine for Gemini 4 Argon`
      ),
      keywordsMatched: engineHits,
      fileTypesNamed,
      screenshotRequired: explicitScreenshot,
    };
  }

  // 6. Design-Visual (UI/visual work, visual file types, or screenshot required; always followed by Eyes gate)
  const visualHits = matchKeywordList(lower, DESIGN_VISUAL_KEYWORDS);
  const visualExts = fileTypesNamed.filter((ext) => VISUAL_EXTENSIONS.has(ext));
  if (explicitScreenshot || visualHits.length > 0 || visualExts.length > 0) {
    const signals = [
      ...visualHits,
      ...screenshotKeywords,
      ...visualExts.map((e) => `${e} file`),
      ...(options?.screenshotRequired ? ['screenshot required'] : []),
    ];
    const uniqueSignals = Array.from(new Set(signals));
    return {
      jobClass: 'design-visual',
      reason: toSingleSentence(
        `The task involves visual presentation or requires a screenshot check (${uniqueSignals.join(', ')}) and is classified as design-visual followed by the Eyes gate`
      ),
      keywordsMatched: Array.from(new Set([...visualHits, ...screenshotKeywords])),
      fileTypesNamed,
      screenshotRequired: true,
    };
  }

  // 7. Research (official Opus or Argon lanes only)
  const researchHits = matchKeywordList(lower, RESEARCH_KEYWORDS);
  if (researchHits.length > 0) {
    return {
      jobClass: 'research',
      reason: toSingleSentence(
        `The task asks for investigation and source synthesis (${researchHits.join(', ')}) and is classified as research on official Opus or Argon lanes`
      ),
      keywordsMatched: researchHits,
      fileTypesNamed,
      screenshotRequired: false,
    };
  }

  // 8. Code-Hard (complex architecture, concurrency, security, deep debugging)
  const hardHits = matchKeywordList(lower, CODE_HARD_KEYWORDS);
  if (hardHits.length > 0) {
    return {
      jobClass: 'code-hard',
      reason: toSingleSentence(
        `The task involves high-complexity systems engineering (${hardHits.join(', ')}) and is classified as code-hard`
      ),
      keywordsMatched: hardHits,
      fileTypesNamed,
      screenshotRequired: false,
    };
  }

  // 9. Mechanical (typos, renames, formatting, lint fixes, simple doc tweaks)
  const mechanicalHits = matchKeywordList(lower, MECHANICAL_KEYWORDS);
  const onlyDocExts =
    fileTypesNamed.length > 0 && fileTypesNamed.every((ext) => DOC_ONLY_EXTENSIONS.has(ext));
  const bulkHits = matchKeywordList(lower, CODE_BULK_KEYWORDS);
  if (mechanicalHits.length > 0 || (onlyDocExts && bulkHits.length === 0)) {
    const signals =
      mechanicalHits.length > 0
        ? mechanicalHits
        : fileTypesNamed.map((e) => `${e} file`);
    return {
      jobClass: 'mechanical',
      reason: toSingleSentence(
        `The task is a routine mechanical edit (${signals.join(', ')}) and is classified as mechanical for Gemini Flash in agy`
      ),
      keywordsMatched: mechanicalHits,
      fileTypesNamed,
      screenshotRequired: false,
    };
  }

  // 10. Code-Bulk (multi-file implementation, tests, CRUD, scaffolding, or default coding work)
  const codeExts = fileTypesNamed.filter((ext) => CODE_EXTENSIONS.has(ext));
  const bulkSignals = [
    ...bulkHits,
    ...codeExts.map((e) => `${e} file`),
  ];
  const detail = bulkSignals.length > 0 ? bulkSignals.join(', ') : 'standard implementation';
  return {
    jobClass: 'code-bulk',
    reason: toSingleSentence(
      `The task covers standard implementation or bulk coding (${detail}) and is classified as code-bulk for Claude Sonnet in agy`
    ),
    keywordsMatched: bulkHits,
    fileTypesNamed,
    screenshotRequired: false,
  };
}

// ============================================================================
// 2. LANE TABLE (ops/router/lanes.json) & QUOTA / COLD-LANE RULES
// ============================================================================

export interface QuotaGroupSpec {
  harness: string;
  lanes: string[];
  sharedQuota: boolean;
  fallbackMustBeFamily: string;
  note: string;
}

export interface LaneRow {
  jobClass: JevJobClass;
  lane: string;
  ladder: string[];
  node: string;
  harness: string;
  headless: boolean;
  fallback: string;
  quotaGroup: string;
  postGate: 'eyes' | null;
  officialOnly: boolean;
  neverModel: boolean;
  visibility: 'private' | null;
  neverReceivesJobClasses: JevJobClass[];
}

export interface LaneTable {
  version: string;
  defaultCooldownHours: number;
  /** Optional per-lane settings keyed by lane id (for example the effort a lane accepts in agy). */
  laneSettings?: Record<string, LaneSetting>;
  quotaGroups: Record<string, QuotaGroupSpec>;
  lanes: Record<JevJobClass, LaneRow>;
}

/** Harness whose lane is a live signed-in Claude session; it is never an executor and never runs through agy. */
export const JUDGE_HARNESS = 'claude-code-signed-in';

/**
 * Resolves the harness a lane runs under from lanes.json (shared quota group first, then the row that
 * names the lane). Unknown lanes resolve to agy, the runner's executor harness.
 */
export function resolveLaneHarness(table: LaneTable, lane: string): string {
  const wanted = lane.trim();
  for (const group of Object.values(table.quotaGroups ?? {})) {
    if (Array.isArray(group.lanes) && group.lanes.includes(wanted)) {
      return group.harness;
    }
  }
  for (const row of Object.values(table.lanes ?? {})) {
    if (row.lane === wanted) return row.harness;
  }
  return 'agy';
}

export function isAgyClaudeLane(lane: string, harness = 'agy'): boolean {
  return harness === 'agy' && /^claude-/i.test(lane);
}

export function isGeminiLane(lane: string): boolean {
  return /^gemini-/i.test(lane);
}

export function loadLaneTable(lanesPath: string = DEFAULT_LANES_PATH): LaneTable {
  const raw = fs.readFileSync(lanesPath, 'utf8');
  const parsed = JSON.parse(raw) as LaneTable;
  const validation = validateLaneTable(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid lanes.json: ${validation.errors.join('; ')}`);
  }
  return parsed;
}

export function validateLaneTable(table: LaneTable): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!table || typeof table !== 'object' || !table.lanes) {
    return { valid: false, errors: ['Missing lanes object in lane table'] };
  }

  for (const jobClass of JEV_JOB_CLASSES) {
    const row = table.lanes[jobClass];
    if (!row) {
      errors.push(`Missing job class row: ${jobClass}`);
      continue;
    }
    if (!row.node || typeof row.node !== 'string') {
      errors.push(`Row ${jobClass} is missing node`);
    }
    if (!row.harness || typeof row.harness !== 'string') {
      errors.push(`Row ${jobClass} is missing harness`);
    }
    if (typeof row.headless !== 'boolean') {
      errors.push(`Row ${jobClass} must carry a boolean headless field`);
    }
    if (!row.fallback || typeof row.fallback !== 'string') {
      errors.push(`Row ${jobClass} is missing fallback lane`);
    }

    // Tonight's fact: Claude models inside agy share one quota separate from Gemini models,
    // so a Claude fallback in agy is always a Gemini lane and never another Claude lane in agy.
    if (isAgyClaudeLane(row.lane, row.harness)) {
      if (!isGeminiLane(row.fallback)) {
        errors.push(
          `Row ${jobClass} uses Claude lane ${row.lane} in agy so its fallback must be a Gemini lane, got ${row.fallback}`
        );
      }
      if (/^claude-/i.test(row.fallback)) {
        errors.push(
          `Row ${jobClass} cannot use another Claude lane (${row.fallback}) as fallback for ${row.lane} in agy`
        );
      }
    }
  }

  for (const [laneId, setting] of Object.entries(table.laneSettings ?? {})) {
    if (setting?.effort !== undefined && !LANE_EFFORT_VALUES.includes(setting.effort)) {
      errors.push(`laneSettings.${laneId}.effort must be one of ${LANE_EFFORT_VALUES.join(', ')}`);
    }
  }

  // Verify specific ladder assignments required by Recipe 6
  if (table.lanes.route?.lane !== 'gemini-3.8-flash' || table.lanes.route?.harness !== 'agy') {
    errors.push('route must go to gemini-3.8-flash in agy');
  }
  if (table.lanes.mechanical?.lane !== 'gemini-3.8-flash' || table.lanes.mechanical?.harness !== 'agy') {
    errors.push('mechanical must go to gemini-3.8-flash in agy');
  }
  if (table.lanes['code-bulk']?.lane !== 'claude-sonnet-5-5' || table.lanes['code-bulk']?.harness !== 'agy') {
    errors.push('code-bulk must go to claude-sonnet-5-5 in agy');
  }
  if (
    !['claude-opus-5-5', 'gemini-4-argon'].includes(table.lanes['code-hard']?.lane) ||
    table.lanes['code-hard']?.harness !== 'agy'
  ) {
    errors.push('code-hard must go to claude-opus-5-5 in agy or gemini-4-argon');
  }
  if (table.lanes.engine?.lane !== 'gemini-4-argon') {
    errors.push('engine must go to gemini-4-argon');
  }
  if (
    !['claude-opus-5-5', 'gemini-4-argon'].includes(table.lanes['design-visual']?.lane) ||
    table.lanes['design-visual']?.postGate !== 'eyes'
  ) {
    errors.push('design-visual must go to claude-opus-5-5 or gemini-4-argon and be followed by the Eyes gate');
  }
  if (
    !['claude-opus-5-5', 'gemini-4-argon'].includes(table.lanes.research?.lane) ||
    !table.lanes.research?.officialOnly
  ) {
    errors.push('research must go to Opus or Argon through official lanes only');
  }
  if (
    table.lanes.judge?.lane !== 'fable' ||
    table.lanes.judge?.harness !== 'claude-code-signed-in' ||
    !table.lanes.judge?.neverReceivesJobClasses?.includes('route')
  ) {
    errors.push('judge must go to Fable on signed-in Claude Code and never receive route tasks');
  }
  if (table.lanes['post-x']?.lane !== 'grok' || table.lanes['post-x']?.harness !== 'hermes') {
    errors.push('post-x must go to Grok through Hermes');
  }
  if (
    table.lanes['youtube-upload']?.lane !== 'youtube-data-api' ||
    table.lanes['youtube-upload']?.visibility !== 'private' ||
    table.lanes['youtube-upload']?.neverModel !== true
  ) {
    errors.push('youtube-upload must go to the YouTube Data API, private only, never a model');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parses the cooldown hours stated in a quota or 429 error (defaulting to 24 hours).
 */
export function parseQuotaCooldownHours(
  errorInput?: string | Error | { hours?: number; retryAfterHours?: number; message?: string; status?: number },
  defaultHours = 24
): number {
  if (!errorInput) return defaultHours;
  if (typeof errorInput === 'object' && !(errorInput instanceof Error)) {
    if (typeof errorInput.hours === 'number' && Number.isFinite(errorInput.hours) && errorInput.hours > 0) {
      return errorInput.hours;
    }
    if (
      typeof errorInput.retryAfterHours === 'number' &&
      Number.isFinite(errorInput.retryAfterHours) &&
      errorInput.retryAfterHours > 0
    ) {
      return errorInput.retryAfterHours;
    }
  }

  const rawMessage =
    typeof errorInput === 'string'
      ? errorInput
      : errorInput instanceof Error
        ? errorInput.message
        : errorInput.message ?? '';

  const match = rawMessage.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  if (match && match[1]) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return defaultHours;
}

// ============================================================================
// 3. WEEKLY RANKING (ops/router/rankings/<YYYY-MM-DD>.json) & 7-DAY RULE
// ============================================================================

export interface RankingClassEntry {
  ranked: string[];
  lane: string;
  reason: string;
  sources: string[];
}

export interface WeeklyRankingFile {
  date: string;
  generated_by: string;
  classes: Partial<Record<JevJobClass, RankingClassEntry>>;
}

export interface RankingEvaluation {
  filePath: string | null;
  rankingDate: string;
  ageInDays: number | null;
  stale: boolean;
  statusNote: 'fresh ranking' | 'stale ranking, default ladder';
  ranking: WeeklyRankingFile | null;
}

const RANKING_FILENAME_REGEX = /^(\d{4}-\d{2}-\d{2})\.json$/;

function parseIsoDateToUtcMidnightMs(dateStr: string): number | null {
  if (typeof dateStr !== 'string') return null;
  const m = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utcMs = Date.UTC(year, month - 1, day);
  const dt = new Date(utcMs);
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return utcMs;
}

/**
 * Validates a weekly ranking object, rejecting any ranking file with a bad date or with no sources.
 */
export function validateWeeklyRankingFile(
  rankingInput: unknown,
  options?: { expectedDateFromFilename?: string; requireAllClasses?: boolean }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!rankingInput || typeof rankingInput !== 'object') {
    return { valid: false, errors: ['Ranking file must be a JSON object.'] };
  }

  const ranking = rankingInput as Partial<WeeklyRankingFile>;

  if (typeof ranking.date !== 'string' || parseIsoDateToUtcMidnightMs(ranking.date) === null) {
    errors.push(
      `Ranking file has a bad or missing date "${String(ranking.date ?? '')}"; expected valid YYYY-MM-DD.`
    );
  } else if (
    options?.expectedDateFromFilename &&
    ranking.date.trim() !== options.expectedDateFromFilename.trim()
  ) {
    errors.push(
      `Ranking file date "${ranking.date}" does not match filename date "${options.expectedDateFromFilename}".`
    );
  }

  if (typeof ranking.generated_by !== 'string' || ranking.generated_by.trim().length === 0) {
    errors.push('Ranking file is missing generated_by.');
  } else if (/^(?:hermes|ollama|free-claude-code|omniroute)$/i.test(ranking.generated_by.trim())) {
    errors.push(
      `Ranking file generated_by "${ranking.generated_by}" is not allowed; must be run by Fable or Argon in a live session.`
    );
  }

  if (!ranking.classes || typeof ranking.classes !== 'object') {
    errors.push('Ranking file is missing classes object.');
    return { valid: false, errors };
  }

  const classEntries = Object.entries(ranking.classes);
  if (classEntries.length === 0) {
    errors.push('Ranking file classes object cannot be empty.');
  }

  if (options?.requireAllClasses) {
    for (const jobClass of JEV_JOB_CLASSES) {
      if (!ranking.classes[jobClass]) {
        errors.push(`Ranking file is missing job class "${jobClass}".`);
      }
    }
  }

  for (const [classKey, entry] of classEntries) {
    if (!JEV_JOB_CLASSES.includes(classKey as JevJobClass)) {
      errors.push(`Unknown job class "${classKey}" in ranking file.`);
      continue;
    }
    if (!entry || typeof entry !== 'object') {
      errors.push(`Class "${classKey}" entry must be an object.`);
      continue;
    }
    if (typeof entry.lane !== 'string' || entry.lane.trim().length === 0) {
      errors.push(`Class "${classKey}" is missing lane.`);
    }
    if (
      !Array.isArray(entry.ranked) ||
      entry.ranked.length === 0 ||
      entry.ranked.some((r) => typeof r !== 'string' || r.trim().length === 0)
    ) {
      errors.push(`Class "${classKey}" must carry a non-empty ranked model array.`);
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim().length === 0) {
      errors.push(`Class "${classKey}" is missing reason.`);
    }
    if (
      !Array.isArray(entry.sources) ||
      entry.sources.length === 0 ||
      entry.sources.some((s) => typeof s !== 'string' || s.trim().length === 0)
    ) {
      errors.push(`Class "${classKey}" has no sources; every ranked class must cite at least one source.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Reads and validates a weekly ranking JSON file on disk, checking both filename date and content.
 */
export function validateWeeklyRankingFileOnDisk(
  filePath: string,
  options?: { requireAllClasses?: boolean }
): { valid: boolean; errors: string[] } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`Ranking file does not exist: ${filePath}`] };
  }
  const baseName = path.basename(filePath);
  const m = baseName.match(RANKING_FILENAME_REGEX);
  if (!m || parseIsoDateToUtcMidnightMs(m[1]) === null) {
    return {
      valid: false,
      errors: [`Ranking filename "${baseName}" does not match valid <YYYY-MM-DD>.json.`],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return {
      valid: false,
      errors: [`Invalid JSON in ranking file: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
  return validateWeeklyRankingFile(parsed, {
    expectedDateFromFilename: m[1],
    requireAllClasses: options?.requireAllClasses,
  });
}

function normalizeNowToUtcMidnightMs(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * Finds and reads the newest ops/router/rankings/<YYYY-MM-DD>.json file and checks the 7-day rule.
 * If the newest ranking is older than 7 days (ageInDays > 7), marks it stale so the router falls back
 * to lanes.json and marks every decision "stale ranking, default ladder".
 */
export function loadNewestWeeklyRanking(
  rankingsDir: string = DEFAULT_RANKINGS_DIR,
  now: Date = new Date()
): RankingEvaluation {
  if (!fs.existsSync(rankingsDir)) {
    return {
      filePath: null,
      rankingDate: 'none',
      ageInDays: null,
      stale: true,
      statusNote: 'stale ranking, default ladder',
      ranking: null,
    };
  }

  const candidates = fs
    .readdirSync(rankingsDir)
    .map((name) => {
      const m = name.match(RANKING_FILENAME_REGEX);
      return m ? { name, dateStr: m[1] } : null;
    })
    .filter((item): item is { name: string; dateStr: string } => Boolean(item))
    .sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  if (candidates.length === 0) {
    return {
      filePath: null,
      rankingDate: 'none',
      ageInDays: null,
      stale: true,
      statusNote: 'stale ranking, default ladder',
      ranking: null,
    };
  }

  const newest = candidates[0];
  const fullPath = path.join(rankingsDir, newest.name);
  const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as WeeklyRankingFile;
  const effectiveDateStr = parsed.date || newest.dateStr;

  const validation = validateWeeklyRankingFile(parsed, {
    expectedDateFromFilename: newest.dateStr,
  });
  const rankingUtcMs = parseIsoDateToUtcMidnightMs(effectiveDateStr);
  const nowUtcMs = normalizeNowToUtcMidnightMs(now);

  if (rankingUtcMs === null || !validation.valid) {
    return {
      filePath: fullPath,
      rankingDate: effectiveDateStr,
      ageInDays: null,
      stale: true,
      statusNote: 'stale ranking, default ladder',
      ranking: null,
    };
  }

  const ageInDays = Math.floor((nowUtcMs - rankingUtcMs) / 86_400_000);
  // Older than seven days (> 7) is stale; 6 days and 7 days are within the 7-day window.
  const stale = ageInDays > 7;

  return {
    filePath: fullPath,
    rankingDate: effectiveDateStr,
    ageInDays,
    stale,
    statusNote: stale ? 'stale ranking, default ladder' : 'fresh ranking',
    ranking: parsed,
  };
}

// ============================================================================
// 4. SECRET REDACTION & DECISION LOGGING (ops/router/decisions.log)
// ============================================================================

export interface ColdLaneInfo {
  lane: string;
  quotaGroup: string;
  markedAt: string;
  until: string;
  hours: number;
  reason: string;
}

export interface DecisionRecord {
  timestamp: string;
  task_hash: string;
  taskHash: string;
  job_class: JevJobClass;
  jobClass: JevJobClass;
  lane: string;
  node: string;
  harness: string;
  headless: boolean;
  post_gate: 'eyes' | null;
  reason: string;
  ranking_date: string;
  rankingDateUsed: string;
  ranking_status: 'fresh ranking' | 'stale ranking, default ladder';
  stale_ranking: boolean;
  quota_fallback: boolean;
  cold_lanes: Record<string, { until: string; hours: number; quotaGroup: string; reason: string }>;
  coldLaneState: Record<string, { until: string; hours: number; quotaGroup: string; reason: string }>;
  token_count?: number;
  console_tokens?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Ensures nothing secret, no Windows user folder name, and no private LAN IP ever enters decisions.log.
 */
export function sanitizeDecisionLogText(text: string, extraSecrets: string[] = []): string {
  let out = text;

  for (const s of extraSecrets) {
    if (s && s.length >= 6) {
      out = out.split(s).join('[REDACTED:XXXX]');
    }
  }

  // Redact environment values for secret-like keys if present in process.env
  for (const [k, v] of Object.entries(process.env)) {
    if (v && v.length >= 6 && /KEY|TOKEN|SECRET|PASSWORD|PASS|CREDENTIAL|AUTH/i.test(k)) {
      out = out.split(v).join('[REDACTED:XXXX]');
    }
  }

  // Replace Windows user profile paths with %USERPROFILE%
  const home = os.homedir();
  if (home) {
    for (const variant of [home, home.replace(/\\/g, '/')]) {
      out = out.replace(new RegExp(escapeRegExp(variant), 'gi'), '%USERPROFILE%');
    }
  }
  out = out.replace(/[A-Za-z]:[\\/]{1,2}[U]sers[\\/]{1,2}[^\\/\s"'`]+/g, '%USERPROFILE%');

  // Redact private LAN IPv4 addresses
  out = out.replace(
    /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
    '[REDACTED:XXXX]'
  );

  // Redact common API key / token patterns
  out = out.replace(
    /\b(?:sk-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]{10,}|xox[baprs]-[A-Za-z0-9-]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]{8,})\b/g,
    '[REDACTED:XXXX]'
  );
  out = out.replace(
    /\b(api[_-]?key|token|secret|password|passwd)\s*([:=])\s*([^\s,;'"`]+)/gi,
    '$1$2[REDACTED:XXXX]'
  );

  return out;
}

export function hashTaskDescription(taskDescription: string): string {
  return crypto.createHash('sha256').update(taskDescription, 'utf8').digest('hex').slice(0, 16);
}

// ============================================================================
// 5. JEV ROUTER STATE & EXECUTION ENGINE
// ============================================================================

export interface RouteJevTaskOptions {
  now?: Date;
  files?: string[];
  screenshotRequired?: boolean;
  lanesPath?: string;
  rankingsDir?: string;
  decisionsLogPath?: string;
  /** Optional explicit jobClass override to test guard rules such as never sending route to judge. */
  requestedTargetLane?: string;
  /** Optional inline quota/429 error report before routing this task. */
  quotaError?: {
    lane: string;
    error?: string | Error | { hours?: number; message?: string; status?: number };
  };
  extraSecretsToRedact?: string[];
}

export class JevRouter {
  private readonly coldLanes = new Map<string, ColdLaneInfo>();
  private readonly lanesPath: string;
  private readonly rankingsDir: string;
  private readonly decisionsLogPath: string;

  constructor(config?: {
    lanesPath?: string;
    rankingsDir?: string;
    decisionsLogPath?: string;
  }) {
    this.lanesPath = config?.lanesPath ?? DEFAULT_LANES_PATH;
    this.rankingsDir = config?.rankingsDir ?? DEFAULT_RANKINGS_DIR;
    this.decisionsLogPath = config?.decisionsLogPath ?? DEFAULT_DECISIONS_LOG_PATH;
  }

  /**
   * Marks a lane cold when a quota or 429 error is reported.
   * Because Claude models inside agy share one quota separate from Gemini models,
   * reporting a quota/429 error on any Claude lane in agy marks all Claude lanes in agy cold.
   */
  public reportQuotaError(
    lane: string,
    errorInput?: string | Error | { hours?: number; retryAfterHours?: number; message?: string; status?: number },
    now: Date = new Date()
  ): { affectedLanes: string[]; hours: number; until: string; quotaGroup: string } {
    const table = loadLaneTable(this.lanesPath);
    const hours = parseQuotaCooldownHours(errorInput, table.defaultCooldownHours ?? 24);
    const untilDate = new Date(now.getTime() + hours * 3_600_000);
    const markedAt = now.toISOString();
    const until = untilDate.toISOString();

    const rawReason =
      typeof errorInput === 'string'
        ? errorInput
        : errorInput instanceof Error
          ? errorInput.message
          : errorInput?.message ?? `HTTP 429 quota cooldown (${hours}h)`;
    const cleanReason = sanitizeDecisionLogText(rawReason);

    // Determine whether this lane belongs to the shared agy-claude quota group
    const agyClaudeGroup = table.quotaGroups?.['agy-claude'];
    const isSharedAgyClaude =
      agyClaudeGroup?.sharedQuota && agyClaudeGroup.lanes.includes(lane);

    const affectedLanes = isSharedAgyClaude ? [...agyClaudeGroup.lanes] : [lane];
    const quotaGroup = isSharedAgyClaude ? 'agy-claude' : this.findQuotaGroupForLane(table, lane);

    for (const targetLane of affectedLanes) {
      this.coldLanes.set(targetLane, {
        lane: targetLane,
        quotaGroup,
        markedAt,
        until,
        hours,
        reason: cleanReason,
      });
    }

    return { affectedLanes, hours, until, quotaGroup };
  }

  private findQuotaGroupForLane(table: LaneTable, lane: string): string {
    for (const [groupName, group] of Object.entries(table.quotaGroups ?? {})) {
      if (group.lanes.includes(lane)) return groupName;
    }
    for (const row of Object.values(table.lanes)) {
      if (row.lane === lane) return row.quotaGroup;
    }
    return 'default';
  }

  public clearColdLanes(): void {
    this.coldLanes.clear();
  }

  public getActiveColdLanes(
    now: Date = new Date()
  ): Record<string, { until: string; hours: number; quotaGroup: string; reason: string }> {
    const active: Record<string, { until: string; hours: number; quotaGroup: string; reason: string }> = {};
    const nowMs = now.getTime();
    for (const [lane, info] of this.coldLanes.entries()) {
      if (Date.parse(info.until) > nowMs) {
        active[lane] = {
          until: info.until,
          hours: info.hours,
          quotaGroup: info.quotaGroup,
          reason: info.reason,
        };
      } else {
        this.coldLanes.delete(lane);
      }
    }
    return active;
  }

  public isLaneCold(lane: string, now: Date = new Date()): boolean {
    const active = this.getActiveColdLanes(now);
    return Boolean(active[lane]);
  }

  public route(taskDescription: string, options?: RouteJevTaskOptions): DecisionRecord {
    const now = options?.now ?? new Date();
    const lanesPath = options?.lanesPath ?? this.lanesPath;
    const rankingsDir = options?.rankingsDir ?? this.rankingsDir;
    const decisionsLogPath = options?.decisionsLogPath ?? this.decisionsLogPath;

    if (options?.quotaError) {
      this.reportQuotaError(options.quotaError.lane, options.quotaError.error, now);
    }

    const table = loadLaneTable(lanesPath);
    const profile = profileTask(taskDescription, {
      files: options?.files,
      screenshotRequired: options?.screenshotRequired,
    });
    const jobClass = profile.jobClass;
    const row = table.lanes[jobClass];

    const rankingEval = loadNewestWeeklyRanking(rankingsDir, now);
    const activeColdLanes = this.getActiveColdLanes(now);

    // Determine candidate primary lane from weekly ranking if fresh, otherwise from lanes.json
    let candidateLane = row.lane;
    const reasonParts: string[] = [profile.reason];

    if (!rankingEval.stale && rankingEval.ranking?.classes?.[jobClass]?.lane) {
      const rankedEntry = rankingEval.ranking.classes[jobClass]!;
      candidateLane = rankedEntry.lane;
      reasonParts.push(`Weekly ranking ${rankingEval.rankingDate} selected ${candidateLane}.`);
    } else if (rankingEval.stale) {
      candidateLane = row.lane;
      reasonParts.push('stale ranking, default ladder.');
    }

    // Enforce the rule that judge never receives a route task (or the router's own routing decisions)
    if (
      jobClass === 'route' &&
      (candidateLane === 'fable' ||
        options?.requestedTargetLane === 'fable' ||
        options?.requestedTargetLane === 'judge')
    ) {
      candidateLane = row.lane; // gemini-3.8-flash in agy
      reasonParts.push(
        'Guard enforced: judge (fable on signed-in Claude Code) never receives a route task or the router own routing decisions.'
      );
    }

    // Enforce youtube-upload is never a model and always private YouTube Data API
    if (jobClass === 'youtube-upload') {
      candidateLane = 'youtube-data-api';
    }

    // Enforce research uses official lanes only (claude-opus-5-5 or gemini-4-argon in agy)
    if (jobClass === 'research' && !['claude-opus-5-5', 'gemini-4-argon'].includes(candidateLane)) {
      candidateLane = row.lane;
      reasonParts.push('Guard enforced: research uses official Opus or Argon lanes only.');
    }

    // Check cold-lane state and quota fallback rule
    let selectedLane = candidateLane;
    let quotaFallbackUsed = false;
    const coldInfo = activeColdLanes[candidateLane];

    if (coldInfo) {
      quotaFallbackUsed = true;
      let fallbackLane = row.fallback;

      // Tonight's fact: Claude models inside agy share one quota separate from Gemini models,
      // so a Claude fallback is always a Gemini lane and never another Claude lane in agy.
      if (isAgyClaudeLane(candidateLane, row.harness) && !isGeminiLane(fallbackLane)) {
        fallbackLane = 'gemini-4-argon';
      }

      selectedLane = fallbackLane;
      reasonParts.push(
        `Quota fallback: ${candidateLane} (${coldInfo.quotaGroup}) is cold for ${coldInfo.hours}h until ${coldInfo.until}, routed to fallback ${selectedLane}.`
      );
    }

    if (row.postGate === 'eyes') {
      reasonParts.push('Followed by mandatory Eyes gate.');
    }

    const sanitizedReason = sanitizeDecisionLogText(
      reasonParts.join(' '),
      options?.extraSecretsToRedact
    );
    const taskHash = hashTaskDescription(taskDescription);
    const rankingDateUsed = rankingEval.stale
      ? `${rankingEval.rankingDate} (stale ranking, default ladder)`
      : rankingEval.rankingDate;

    const sanitizedColdLanes: Record<
      string,
      { until: string; hours: number; quotaGroup: string; reason: string }
    > = {};
    for (const [k, v] of Object.entries(activeColdLanes)) {
      sanitizedColdLanes[k] = {
        until: v.until,
        hours: v.hours,
        quotaGroup: v.quotaGroup,
        reason: sanitizeDecisionLogText(v.reason, options?.extraSecretsToRedact),
      };
    }

    const decision: DecisionRecord = {
      timestamp: now.toISOString(),
      task_hash: taskHash,
      taskHash,
      job_class: jobClass,
      jobClass,
      lane: selectedLane,
      node: row.node,
      harness: row.harness,
      headless: row.headless,
      post_gate: row.postGate,
      reason: sanitizedReason,
      ranking_date: rankingDateUsed,
      rankingDateUsed,
      ranking_status: rankingEval.statusNote,
      stale_ranking: rankingEval.stale,
      quota_fallback: quotaFallbackUsed,
      cold_lanes: sanitizedColdLanes,
      coldLaneState: sanitizedColdLanes,
    };

    appendDecisionRecord(decision, decisionsLogPath, options?.extraSecretsToRedact);
    return decision;
  }

  /**
   * Routes a task, dispatches it to the matching lane adapter, polls for done,
   * handles quota/429 errors by marking the lane cold through reportQuotaError and retrying
   * on the fallback lane, and runs the judge step (requiring a PR URL and, for design-visual
   * jobs, an Eyes gate report with PASS in its first line). Missing either marks the job failed
   * and re-queues it once with the failure appended to the prompt.
   */
  public async dispatchAndJudge(
    taskDescription: string,
    options?: DispatchAndJudgeOptions
  ): Promise<DispatchedJobOutcome> {
    const now = options?.now ?? new Date();
    const maxJudgeRequeues = options?.maxRequeues ?? 1;
    let currentPrompt = taskDescription;
    let requeueCount = 0;
    let quotaFallbackTriggered = false;
    const attempts: DispatchAttemptRecord[] = [];
    let lastFailureReason: string | null = null;
    let lastDecision: DecisionRecord | null = null;

    const resolveAdapter = (decision: DecisionRecord): DispatchAdapter => {
      if (options?.adapter) return options.adapter;
      if (options?.adapters?.[decision.lane]) return options.adapters[decision.lane]!;
      if (options?.adapters?.[decision.harness]) return options.adapters[decision.harness]!;
      if (decision.harness === 'hermes') {
        return new HermesDispatchAdapter();
      }
      if (
        decision.harness === 'free-claude-code' ||
        decision.harness === 'free-claude-code-8082' ||
        decision.harness === 'claude-code-signed-in'
      ) {
        return new FreeClaudeCodeDispatchAdapter();
      }
      return new AgyDispatchAdapter();
    };

    const pollHandleUntilDone = async (handle: DispatchHandle): Promise<DispatchPollResult> => {
      const maxPolls = options?.maxPollIterations ?? 5;
      let latest = await handle.poll();
      let polls = 1;
      while (!latest.done && polls < maxPolls) {
        latest = await handle.poll();
        polls += 1;
      }
      return latest;
    };

    while (requeueCount <= maxJudgeRequeues) {
      let decision = this.route(taskDescription, {
        now,
        files: options?.files,
        screenshotRequired: options?.screenshotRequired,
        lanesPath: options?.lanesPath,
        rankingsDir: options?.rankingsDir,
        decisionsLogPath: options?.decisionsLogPath,
        extraSecretsToRedact: options?.extraSecretsToRedact,
      });
      lastDecision = decision;

      let adapter = resolveAdapter(decision);
      let handle = await adapter.dispatch({
        prompt: currentPrompt,
        jobClass: decision.job_class,
        lane: decision.lane,
        harness: decision.harness,
        node: decision.node,
        cwd: options?.cwd,
      });
      let pollResult = await pollHandleUntilDone(handle);

      // Check for quota or 429 error in lane output
      const quotaCheck = detectQuotaOr429Error(
        pollResult.output,
        pollResult.error,
        pollResult.exitCode
      );
      if (quotaCheck.isQuotaError) {
        attempts.push({
          attemptNumber: attempts.length + 1,
          lane: decision.lane,
          harness: decision.harness,
          prompt: currentPrompt,
          prUrl: null,
          eyesReportFirstLine: null,
          quotaError: true,
          passedJudge: false,
          failureReason: `Lane ${decision.lane} returned quota/429 error: ${quotaCheck.errorSummary}`,
          output: pollResult.output,
        });

        // Mark lane cold through core's reportQuotaError and route retry to fallback lane
        this.reportQuotaError(
          decision.lane,
          pollResult.output || pollResult.error || quotaCheck.errorSummary,
          now
        );
        quotaFallbackTriggered = true;

        decision = this.route(taskDescription, {
          now,
          files: options?.files,
          screenshotRequired: options?.screenshotRequired,
          lanesPath: options?.lanesPath,
          rankingsDir: options?.rankingsDir,
          decisionsLogPath: options?.decisionsLogPath,
          extraSecretsToRedact: options?.extraSecretsToRedact,
        });
        lastDecision = decision;

        adapter = resolveAdapter(decision);
        handle = await adapter.dispatch({
          prompt: currentPrompt,
          jobClass: decision.job_class,
          lane: decision.lane,
          harness: decision.harness,
          node: decision.node,
          cwd: options?.cwd,
        });
        pollResult = await pollHandleUntilDone(handle);
      }

      // Judge step: check for PR URL and, for design-visual jobs, an Eyes gate report with PASS in its first line
      const prUrl = pollResult.prUrl ?? parsePrUrlFromOutput(pollResult.output);
      const isDesignVisual =
        decision.job_class === 'design-visual' || decision.post_gate === 'eyes';
      const eyesVerdict = isDesignVisual
        ? parseEyesGateVerdictFromOutput(pollResult.output, pollResult.eyesReportFirstLine)
        : null;

      const judgeFailures: string[] = [];
      if (!prUrl) {
        judgeFailures.push('missing PR URL in lane output');
      }
      if (isDesignVisual && (!eyesVerdict || !eyesVerdict.passed)) {
        judgeFailures.push(
          eyesVerdict?.firstLine
            ? `Eyes gate report did not pass (first line: "${eyesVerdict.firstLine}")`
            : 'missing Eyes gate report with PASS in its first line'
        );
      }

      if (options?.useConsoleJudge) {
        const consoleAdapter =
          options.consoleAdapter ??
          new ConsoleCreditAdapter({
            ...options.consoleAdapterOptions,
            decisionsLogPath: options.decisionsLogPath ?? this.decisionsLogPath,
          });
        const consoleCheck = await consoleAdapter.runJudgeTextCheck({
          prompt: `Judge check for job (${decision.job_class}): verify PR URL (${prUrl ?? 'none'}) and output:\n${pollResult.output}`,
          purpose: 'judge-text-check',
          jobClass: decision.job_class,
          now,
        });
        if (!consoleCheck.passed) {
          judgeFailures.push(`Console judge check failed: ${consoleCheck.verdictText}`);
        }
      }

      if (judgeFailures.length === 0 && prUrl) {
        attempts.push({
          attemptNumber: attempts.length + 1,
          lane: decision.lane,
          harness: decision.harness,
          prompt: currentPrompt,
          prUrl,
          eyesReportFirstLine: eyesVerdict?.firstLine ?? pollResult.eyesReportFirstLine ?? null,
          quotaError: false,
          passedJudge: true,
          failureReason: null,
          output: pollResult.output,
        });

        return {
          ok: true,
          status: 'passed',
          prUrl,
          eyesReportFirstLine: eyesVerdict?.firstLine ?? pollResult.eyesReportFirstLine ?? null,
          requeued: requeueCount > 0,
          requeueCount,
          quotaFallbackTriggered,
          failureReason: null,
          finalPrompt: currentPrompt,
          finalDecision: decision,
          attempts,
        };
      }

      const failureReason = `Missing required verification: ${judgeFailures.join('; ')}.`;
      lastFailureReason = failureReason;

      attempts.push({
        attemptNumber: attempts.length + 1,
        lane: decision.lane,
        harness: decision.harness,
        prompt: currentPrompt,
        prUrl: prUrl ?? null,
        eyesReportFirstLine: eyesVerdict?.firstLine ?? pollResult.eyesReportFirstLine ?? null,
        quotaError: false,
        passedJudge: false,
        failureReason,
        output: pollResult.output,
      });

      if (requeueCount < maxJudgeRequeues) {
        requeueCount += 1;
        currentPrompt = `${taskDescription}\n\n[Re-queued after failure: ${failureReason}]`;
      } else {
        break;
      }
    }

    return {
      ok: false,
      status: 'failed',
      prUrl: null,
      eyesReportFirstLine:
        attempts.length > 0 ? attempts[attempts.length - 1].eyesReportFirstLine : null,
      requeued: requeueCount > 0,
      requeueCount,
      quotaFallbackTriggered,
      failureReason: lastFailureReason ?? 'Judge step failed.',
      finalPrompt: currentPrompt,
      finalDecision: lastDecision!,
      attempts,
    };
  }

  public async dispatch(
    taskDescription: string,
    options?: DispatchAndJudgeOptions
  ): Promise<DispatchedJobOutcome> {
    return this.dispatchAndJudge(taskDescription, options);
  }
}

export interface DispatchAttemptRecord {
  attemptNumber: number;
  lane: string;
  harness: string;
  prompt: string;
  prUrl: string | null;
  eyesReportFirstLine: string | null;
  quotaError: boolean;
  passedJudge: boolean;
  failureReason: string | null;
  output: string;
}

export interface DispatchAndJudgeOptions extends RouteJevTaskOptions {
  adapter?: DispatchAdapter;
  adapters?: Partial<Record<string, DispatchAdapter>>;
  cwd?: string;
  maxRequeues?: number;
  maxPollIterations?: number;
  useConsoleJudge?: boolean;
  consoleAdapter?: ConsoleCreditAdapter;
  consoleAdapterOptions?: ConsoleCreditAdapterOptions;
}

export interface DispatchedJobOutcome {
  ok: boolean;
  status: 'passed' | 'failed';
  prUrl: string | null;
  eyesReportFirstLine: string | null;
  requeued: boolean;
  requeueCount: number;
  quotaFallbackTriggered: boolean;
  failureReason: string | null;
  finalPrompt: string;
  finalDecision: DecisionRecord;
  attempts: DispatchAttemptRecord[];
}

export function appendDecisionRecord(
  record: DecisionRecord,
  decisionsLogPath: string = DEFAULT_DECISIONS_LOG_PATH,
  extraSecrets: string[] = []
): void {
  const dir = path.dirname(decisionsLogPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const serialized = sanitizeDecisionLogText(JSON.stringify(record), extraSecrets);
  fs.appendFileSync(decisionsLogPath, `${serialized}\n`, 'utf8');
}

export function readDecisionLog(
  decisionsLogPath: string = DEFAULT_DECISIONS_LOG_PATH
): DecisionRecord[] {
  if (!fs.existsSync(decisionsLogPath)) return [];
  const lines = fs
    .readFileSync(decisionsLogPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => JSON.parse(line) as DecisionRecord);
}

const defaultJevRouter = new JevRouter();

export function routeJevTask(
  taskDescription: string,
  options?: RouteJevTaskOptions
): DecisionRecord {
  return defaultJevRouter.route(taskDescription, options);
}

export function dispatchJevTask(
  taskDescription: string,
  options?: DispatchAndJudgeOptions
): Promise<DispatchedJobOutcome> {
  return defaultJevRouter.dispatchAndJudge(taskDescription, options);
}

export function reportLaneQuotaError(
  lane: string,
  errorInput?: string | Error | { hours?: number; retryAfterHours?: number; message?: string; status?: number },
  now?: Date
): { affectedLanes: string[]; hours: number; until: string; quotaGroup: string } {
  return defaultJevRouter.reportQuotaError(lane, errorInput, now);
}

export function clearColdLanes(): void {
  defaultJevRouter.clearColdLanes();
}

export function getColdLaneState(
  now?: Date
): Record<string, { until: string; hours: number; quotaGroup: string; reason: string }> {
  return defaultJevRouter.getActiveColdLanes(now);
}

// ============================================================================
// EXISTING CLEAN-ROOM GAME STUDIO ROLES (:8082 ISOLATION) & LEGACY ROUTER
// ============================================================================

export type DreamTaskCategory =
  | 'implementation'
  | 'bugfix'
  | 'refactor'
  | 'test_writing'
  | 'code_review'
  | 'research'
  | 'planning'
  | 'docs_writing'
  | 'ui_frontend'
  | 'data_analysis'
  | 'devops_infra'
  | 'math_reasoning'
  | 'chat_simple'
  | 'game_design_mechanics'
  | 'youtube_podcast_leadgen';

export interface CleanRoomStudioRoleSpec {
  roleId:
    | 'dream-game-designer'
    | 'dream-combat-architect'
    | 'dream-economy-forge-architect'
    | 'dream-world-director'
    | 'dream-opsis-marketing-director';
  title: string;
  microLoop30s: string;
  mesoLoop10m: string;
  macroLoopSession: string;
  rawClaudeCodeGameStudiosAllowedHarnesses: readonly ['free-claude-code-8082'];
  forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea: true;
  cleanRoomRemake100PercentYours: true;
}

export const DREAM_STUDIO_CLEAN_ROOM_ROLES: readonly CleanRoomStudioRoleSpec[] = [
  {
    roleId: 'dream-game-designer',
    title: 'DREAM Clean-Room Game Designer (REA + Remake 100% Yours)',
    microLoop30s: '5-hit Shadowblade/Awakened combo + i-frame dash + face-to-face boss parry.',
    mesoLoop10m: 'Sunken Bastion boss kill -> random-stat Marketplace loot drop -> deterministic non-gambling Forge upgrade.',
    macroLoopSession: 'Coordinated 7-factor party PvP + hidden Level-50 Awakened weapon gems (STR Dagger Ranger, INT 1H Mace+Shield Priest, Vitality Zhen Dragon).',
    rawClaudeCodeGameStudiosAllowedHarnesses: ['free-claude-code-8082'],
    forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea: true,
    cleanRoomRemake100PercentYours: true,
  },
  {
    roleId: 'dream-combat-architect',
    title: 'DREAM Clean-Room Combat & 7-Factor PvP Architect',
    microLoop30s: 'Target lock + Shift+Right-Click party focus ping + weapon skill cadence.',
    mesoLoop10m: 'Rohan-style party aura stacking (Knight Empower, Priest Obli/Chrono, Monk Sprint/Dash Energy).',
    macroLoopSession: 'Township siege & Dual-Era Ocean Sailing (Day Sails vs Nightfall Speedboats/Yachts).',
    rawClaudeCodeGameStudiosAllowedHarnesses: ['free-claude-code-8082'],
    forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea: true,
    cleanRoomRemake100PercentYours: true,
  },
  {
    roleId: 'dream-opsis-marketing-director',
    title: 'DREAM & Sabretooth OPSis Podcast/Shorts & Harvey Lead-Gen Director',
    microLoop30s: 'Local Kokoro 2-host female voice (af_heart & af_bella) dialogue turn.',
    mesoLoop10m: 'ffprobe <= 59.0s YouTube Short render + Remake 100% Yours /gtm-studio/ swap check.',
    macroLoopSession: '3-channel YouTube Data API v3 private upload + Harvey 3-Type Lead Gen (cost_usd === 0 gate).',
    rawClaudeCodeGameStudiosAllowedHarnesses: ['free-claude-code-8082'],
    forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea: true,
    cleanRoomRemake100PercentYours: true,
  },
];

export function validateGameStudiosHarnessIsolation(params: {
  usingRawThirdPartyGameStudiosPrompts: boolean;
  targetHarnessId: string;
  remake100PercentYoursApplied: boolean;
  reaCleanRoomApplied: boolean;
}): { allowed: boolean; reason: string } {
  if (params.usingRawThirdPartyGameStudiosPrompts) {
    if (params.targetHarnessId === 'free-claude-code-8082') {
      return {
        allowed: true,
        reason: 'Raw Claude-Code-Game-Studios prompts are isolated inside Free Claude Code (:8082) only.',
      };
    }
    return {
      allowed: false,
      reason:
        'FORBIDDEN: Raw Claude-Code-Game-Studios prompts must NEVER run on real Claude (Fable OAuth) or real Antigravity Gemini (GM #1) unless converted via Remake 100% Yours + REA Clean-Room.',
    };
  }
  if (!params.remake100PercentYoursApplied || !params.reaCleanRoomApplied) {
    return {
      allowed: false,
      reason: 'Clean-room studio roles on real Claude/Gemini must pass Remake 100% Yours + REA Clean-Room.',
    };
  }
  return {
    allowed: true,
    reason: 'Clean-room REA + Remake 100% Yours studio role verified for real GM #1 Council.',
  };
}

export interface DreamTaskRouteDecision {
  taskText: string;
  category: DreamTaskCategory;
  difficulty: number;
  flags: string[];
  selectedAgentId: string;
  selectedStudioRole: string;
  calibratedPSuccess: number;
  escalationLadder: string[];
  cleanRoomProvenance: 'DREAM-TaskRouter-100PercentYours-REA';
}

export function routeTaskToDreamAgent(
  taskText: string,
  options?: { fiveHourCapReachedFor?: string[] }
): DreamTaskRouteDecision {
  const lower = taskText.toLowerCase();
  const capped = new Set(options?.fiveHourCapReachedFor ?? []);

  let category: DreamTaskCategory = 'implementation';
  let difficulty = 6;
  let primaryCandidates = [
    'gemini-4-argon-high',
    'claude-opus-5-5-ultrathink',
    'claude-sonnet-5-5',
    'gpt-5-3-codex',
    'free-claude-code-8082',
    'sabretooth-ollama-gemma4-12b',
  ];
  let selectedStudioRole = 'dream-combat-architect';
  const flags: string[] = ['needs_tools'];

  if (lower.includes('youtube') || lower.includes('podcast') || lower.includes('radio') || lower.includes('hermes') || lower.includes('lead')) {
    category = 'youtube_podcast_leadgen';
    difficulty = 7;
    selectedStudioRole = 'dream-opsis-marketing-director';
    flags.push('needs_web', 'multi_file');
    primaryCandidates = [
      'gemini-4-argon-high',
      'gemini-3-8-flash',
      'sabretooth-ollama-gemma4-12b',
      'free-claude-code-8082',
    ];
  } else if (lower.includes('game design') || lower.includes('skill tree') || lower.includes('class') || lower.includes('forge')) {
    category = 'game_design_mechanics';
    difficulty = 8;
    selectedStudioRole = 'dream-game-designer';
    flags.push('needs_review', 'multi_file');
    primaryCandidates = [
      'free-claude-code-8082',
      'gemini-4-argon-high',
      'claude-opus-5-5-ultrathink',
      'gpt-5-3-codex',
    ];
  } else if (lower.includes('review') || lower.includes('audit') || lower.includes('pr')) {
    category = 'code_review';
    difficulty = 8;
    flags.push('needs_review');
    primaryCandidates = [
      'claude-opus-5-5-ultrathink',
      'gemini-4-argon-high',
      'claude-sonnet-5-5',
      'gpt-5-3-codex',
    ];
  }

  const availableLadder = primaryCandidates.filter((id) => !capped.has(id));
  const selectedAgentId = availableLadder[0] ?? 'sabretooth-ollama-gemma4-12b';

  return {
    taskText,
    category,
    difficulty,
    flags,
    selectedAgentId,
    selectedStudioRole,
    calibratedPSuccess: 0.96,
    escalationLadder: availableLadder,
    cleanRoomProvenance: 'DREAM-TaskRouter-100PercentYours-REA',
  };
}
