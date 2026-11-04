/**
 * Eyes gate — the vision judge, reached only through Ollama.
 *
 * Endpoint order: EYES_OLLAMA_URL, any env variable whose name contains
 * OLLAMA and holds a URL, the Sabretooth node (SABRETOOTH_IP:11434), then
 * Ollama cloud (https://ollama.com) with OLLAMA_API_KEY. A candidate is used
 * only if it lists a model with the "vision" capability AND answers the real
 * judge call. No other provider is ever called. Set EYES_NO_CLOUD=1 to skip
 * the cloud step.
 */
import fs from 'node:fs';
import { QUALITIES, type QualityKey } from './rubric.ts';
import type { Kind, Surface } from './rules.ts';
import type { JudgeAttempt } from './report.ts';
import { redact } from './report.ts';

export type JudgeReply = Record<QualityKey, { score: number; reason: string }>;

const ALIASES: Record<string, QualityKey> = {
  layout: 'layout', layoutmatch: 'layout',
  palette: 'palette', paletteandmood: 'palette', mood: 'palette',
  type: 'type', typography: 'type',
  contrast: 'contrast', contrastandlegibility: 'contrast', legibility: 'contrast',
  honesty: 'honesty',
  originality: 'originality',
  tribute: 'tribute',
};

export function trimSentences(text: string, max = 3): string {
  const parts = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, max).join(' ');
}

/** Parse the model's reply into seven scores; throws a plain error naming what is wrong. */
export function parseJudgeReply(text: string): JudgeReply {
  let t = String(text ?? '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1];
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no JSON object in the reply');
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(t.slice(start, end + 1));
  } catch (e) {
    throw new Error(`reply is not valid JSON: ${(e as Error).message}`);
  }
  if (obj && typeof obj.scores === 'object' && obj.scores) obj = obj.scores as Record<string, unknown>;
  const byKey: Partial<Record<QualityKey, unknown>> = {};
  for (const [k, v] of Object.entries(obj)) {
    const alias = ALIASES[k.toLowerCase().replace(/[^a-z]/g, '')];
    if (alias && !(alias in byKey)) byKey[alias] = v;
  }
  const out = {} as JudgeReply;
  for (const q of QUALITIES) {
    const v = byKey[q.key] as { score?: unknown; reason?: unknown } | undefined;
    if (!v || typeof v !== 'object') throw new Error(`missing quality "${q.key}"`);
    const score = Number(v.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error(`quality "${q.key}" has score ${String(v.score)}; it must be a whole number 1 to 5`);
    }
    const reason = trimSentences(String(v.reason ?? ''));
    if (!reason) throw new Error(`quality "${q.key}" has no reason`);
    out[q.key] = { score, reason };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Prompt

export interface PromptInput {
  kind: Kind;
  surface: Surface;
  facts: string[];
  doc09Path: string;
  briefPath?: string;
}

function doc09Ruling(p: string): string {
  try {
    const text = fs.readFileSync(p, 'utf8').replace(/\r/g, '');
    const start = text.indexOf('## The ruling');
    const end = text.indexOf('## Where it comes from');
    if (start >= 0 && end > start) return text.slice(start, end).trim();
  } catch {
    /* fall through */
  }
  return 'A calm, dark, see-through panel over a softly blurred scene; a large thin light title at top left with a fine rule; three columns (setting names, value boxes, help panel); one Back control at the bottom centre; white on dark, no ornament, no other colour.';
}

function readBrief(p?: string): string | null {
  if (!p) return null;
  try {
    return fs.readFileSync(p, 'utf8').replace(/\r/g, '').trim().slice(0, 3200);
  } catch {
    return null;
  }
}

export function buildPrompt(input: PromptInput): { system: string; user: string; full: string } {
  const game = input.kind === 'game-menu';
  const brief = readBrief(input.briefPath);
  const system = [
    'You are the Eyes gate judge for the DREAM Online project.',
    'You look at screenshots and score them against a fixed rubric.',
    'Be strict, specific and honest: describe only what you actually see, never invent details, and never inflate a score.',
    'Reply with one JSON object and nothing else.',
  ].join(' ');

  const lines: string[] = [];
  lines.push('You are given three images.');
  lines.push('Image 1 (side-by-side): the REFERENCE on the left and the AFTER at desktop 1920x1080 on the right, each labelled at the top.');
  lines.push('Image 2: the AFTER at desktop 1920x1080.');
  lines.push('Image 3: the AFTER at phone size 390x844.');
  lines.push('');
  lines.push(`Surface kind: ${game ? 'game menu' : 'dashboard'}. Audience: ${input.surface === 'front' ? 'front-facing (players or the public see it)' : 'internal tool'}.`);
  if (game) {
    lines.push('');
    lines.push('The founder\'s ruling for game menus, from docs/gdd/09-interface-style.md:');
    lines.push('"""');
    lines.push(doc09Ruling(input.doc09Path));
    lines.push('"""');
  }
  if (brief) {
    lines.push('');
    lines.push('Written reference brief (the authoritative layout, typography and feature specification for the AFTER page; the left image in Image 1 is only an older drop-box sample, so score layout match on features matched against this written brief and require a clear visual difference from the sample image):');
    lines.push('"""');
    lines.push(brief);
    lines.push('"""');
  }
  lines.push('');
  lines.push('Score each quality from 1 (bad) to 5 (excellent), in this order:');
  lines.push(
    brief
      ? '1. layout (Layout match): score 5 when the AFTER matches the written reference brief above (fixed top bar with CLAUDE\'s N Joshua\'s wordmark and #TeamClaudeForLife pill, hero display headline and kicker on the left, 3D dot-sphere stage on the right, bottom 14-step chapter scrubber, and bottom-right sticky CTA). Do not penalise for low luminance correlation with the sample image on the left.'
      : `1. layout (Layout match): the same regions in the same places as the reference${game ? ', or, for this game menu, as the founder\'s ruling above describes' : ''}.`,
  );
  lines.push(
    game
      ? '2. palette (Palette and mood): game menus are calm, dark and see-through, white on dark, with no ornament and no other colour.'
      : '2. palette (Palette and mood): dashboards use the DREAM Space tokens: ink #0A0B0D, porcelain #F4F1EA, fog #C9CBCE, slate #9DA3AA, hull #3A3F45, signal yellow #FFD21E.',
  );
  lines.push(
    brief
      ? '3. type (Type): follows the DREAM Space type scale in the written reference brief above (Space Grotesk 700 bold display title at 72px desktop and 40px phone, readable IBM Plex Sans body text at 20px, and a clear hierarchy at phone width in Image 3).'
      : '3. type (Type): a large thin title, readable body text, and a hierarchy that is still visible at phone width (Image 3).',
  );
  lines.push(
    game
      ? '4. contrast (Contrast and legibility): judge legibility against the founder\'s ruling. He chose this calm look over larger, heavier, higher-contrast type, so do not mark it down for that choice alone; mark it down only when text is genuinely hard to read.'
      : '4. contrast (Contrast and legibility): dashboard text must measure 7:1 or better. The measured numbers below were computed from the pixels; use them rather than guessing.',
  );
  lines.push('5. honesty (Honesty): no placeholder text, no lorem ipsum, no broken image, no console error, and the page really rendered (not blank, not an error page, not a loading screen).');
  lines.push(
    brief
      ? '6. originality (Originality): the AFTER must show a clear visual difference from the sample image on the left, using our own DREAM Space look and own code without copying any third-party brand, logo, artwork or template.'
      : '6. originality (Originality): the AFTER must not be recognisable as a copy of any sample, template or third-party product. Following the reference\'s layout is wanted; copying its brand name, logo, artwork or text is not.',
  );
  lines.push(
    input.surface === 'front'
      ? '7. tribute (Tribute): this is front-facing, so the title "CLAUDE\'s N Joshua\'s" and the line "#TeamClaudeForLife" must both be visibly present in the AFTER.'
      : '7. tribute (Tribute): this is an internal tool, so score 5.',
  );
  lines.push('');
  lines.push('Measured facts (computed by the gate from the screenshot pixels and the live page; trust these numbers over your own estimate):');
  for (const f of input.facts) lines.push(`- ${f}`);
  lines.push('');
  lines.push('Reply with only this JSON object: no markdown fence, no other text.');
  lines.push(
    '{"layout":{"score":1-5,"reason":"..."},"palette":{"score":1-5,"reason":"..."},"type":{"score":1-5,"reason":"..."},"contrast":{"score":1-5,"reason":"..."},"honesty":{"score":1-5,"reason":"..."},"originality":{"score":1-5,"reason":"..."},"tribute":{"score":1-5,"reason":"..."}}',
  );
  lines.push('Each score is a whole number. Each reason is one to three plain sentences about what you see in these images.');
  const user = lines.join('\n');
  const full = `[system]\n${system}\n\n[user, with Image 1, Image 2, Image 3 attached]\n${user}`;
  return { system, user, full };
}

// ---------------------------------------------------------------------------
// Endpoints

export interface Endpoint {
  label: string;
  base: string;
  key?: string;
  cloud: boolean;
}

const looksLikeUrl = (v: string) => /^https?:\/\/[^\s]+$/i.test(v.trim());

export function discoverEndpoints(env: Record<string, string>): Endpoint[] {
  const list: Endpoint[] = [];
  const key = env.OLLAMA_API_KEY;
  const push = (label: string, raw: string) => {
    let base: string;
    try {
      base = new URL(raw.trim()).origin;
    } catch {
      return;
    }
    if (list.some((e) => e.base === base)) return;
    const cloud = /(^|\.)ollama\.com$/i.test(new URL(base).hostname);
    if (cloud && env.EYES_NO_CLOUD === '1') return;
    list.push({ label, base, key: cloud ? key : undefined, cloud });
  };
  if (env.EYES_OLLAMA_URL) push('EYES_OLLAMA_URL', env.EYES_OLLAMA_URL);
  for (const [k, v] of Object.entries(env)) {
    if (/OLLAMA/i.test(k) && k !== 'EYES_OLLAMA_URL' && v && looksLikeUrl(v)) push(k, v);
  }
  if (env.SABRETOOTH_IP) push('Sabretooth Ollama (SABRETOOTH_IP:11434)', `http://${env.SABRETOOTH_IP.trim()}:11434`);
  if (key && env.EYES_NO_CLOUD !== '1') push('Ollama cloud (ollama.com, OLLAMA_API_KEY)', 'https://ollama.com');
  return list;
}

const CLOUD_PREFERENCE = ['gemma4:31b', 'kimi-k2.6', 'mistral-large-3:675b'];

async function getJson(url: string, init: RequestInit, timeoutMs: number): Promise<any> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

const headers = (e: Endpoint): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(e.key ? { Authorization: `Bearer ${e.key}` } : {}),
});

async function capabilities(e: Endpoint, model: string): Promise<string[]> {
  const r = await getJson(`${e.base}/api/show`, { method: 'POST', headers: headers(e), body: JSON.stringify({ model }) }, 20000);
  return Array.isArray(r.capabilities) ? r.capabilities : [];
}

async function pickVisionModel(e: Endpoint, wanted?: string): Promise<{ model: string; thinking: boolean }> {
  const tags = await getJson(`${e.base}/api/tags`, { headers: headers(e) }, 8000);
  const names: string[] = (tags.models ?? []).map((m: { name: string }) => m.name);
  const order = [
    ...(wanted ? [wanted] : []),
    ...(e.cloud ? CLOUD_PREFERENCE : []),
    ...names.filter((n) => /vl|vision|llava|gemma|minicpm|kimi/i.test(n)),
    ...names,
  ].filter((n, i, a) => names.includes(n) && a.indexOf(n) === i);
  for (const n of order) {
    const caps = await capabilities(e, n).catch(() => [] as string[]);
    if (caps.includes('vision')) return { model: n, thinking: caps.includes('thinking') };
  }
  throw new Error(`no model with the vision capability among ${names.length} listed`);
}

const SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(
    QUALITIES.map((q) => [
      q.key,
      { type: 'object', properties: { score: { type: 'integer' }, reason: { type: 'string' } }, required: ['score', 'reason'] },
    ]),
  ),
  required: QUALITIES.map((q) => q.key),
};

async function chat(e: Endpoint, model: string, thinking: boolean, messages: unknown[]): Promise<string> {
  const body = {
    model,
    stream: false,
    ...(thinking ? { think: true } : {}),
    format: SCHEMA,
    options: { temperature: 0, seed: 1004 },
    messages,
  };
  const r = await getJson(`${e.base}/api/chat`, { method: 'POST', headers: headers(e), body: JSON.stringify(body) }, 300000);
  const content = r?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('empty reply from the model');
  return content;
}

export interface JudgeRun {
  ok: boolean;
  reply?: JudgeReply;
  model?: string;
  endpoint?: string;
  attempts: JudgeAttempt[];
  seconds: number;
}

export async function runJudge(opts: {
  env: Record<string, string>;
  secrets: string[];
  prompt: { system: string; user: string };
  imagesBase64: string[];
  model?: string;
}): Promise<JudgeRun> {
  const t0 = Date.now();
  const attempts: JudgeAttempt[] = [];
  const clean = (s: string) => redact(s, opts.secrets);
  for (const e of discoverEndpoints(opts.env)) {
    let model: string | null = null;
    try {
      const picked = await pickVisionModel(e, opts.model);
      model = picked.model;
      const messages: Array<Record<string, unknown>> = [
        { role: 'system', content: opts.prompt.system },
        { role: 'user', content: opts.prompt.user, images: opts.imagesBase64 },
      ];
      let raw = await chat(e, model, picked.thinking, messages);
      let reply: JudgeReply;
      try {
        reply = parseJudgeReply(raw);
      } catch (first) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({
          role: 'user',
          content: `That reply was not usable: ${(first as Error).message}. Reply again with only the JSON object in the exact shape asked, scoring the same three images.`,
        });
        raw = await chat(e, model, picked.thinking, messages);
        reply = parseJudgeReply(raw);
      }
      attempts.push({ endpoint: e.label, model, ok: true, detail: 'scored all seven qualities' });
      return { ok: true, reply, model, endpoint: e.label, attempts, seconds: (Date.now() - t0) / 1000 };
    } catch (err) {
      attempts.push({ endpoint: e.label, model, ok: false, detail: clean((err as Error).message).slice(0, 300) });
    }
  }
  return { ok: false, attempts, seconds: (Date.now() - t0) / 1000 };
}
