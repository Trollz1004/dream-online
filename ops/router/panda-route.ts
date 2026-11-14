/**
 * Panda Router client for step 1 of Jev router wiring:
 * POSTs the task text to http://127.0.0.1:8765/route with the pool from
 * %USERPROFILE%\antigravity\tools\panda-router\panda-pool.json,
 * mode cheapest_above_threshold, minimum success 0.6, and a 2 second limit,
 * returning the agy model string or null.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAULT_PANDA_ROUTE_URL = 'http://127.0.0.1:8765/route';
export const DEFAULT_PANDA_POOL_PATH = path.join(
  os.homedir(),
  'antigravity',
  'tools',
  'panda-router',
  'panda-pool.json'
);
export const PANDA_POOL_PORTABLE_PATH =
  '%USERPROFILE%\\antigravity\\tools\\panda-router\\panda-pool.json';
export const DEFAULT_PANDA_MODE = 'cheapest_above_threshold';
export const DEFAULT_PANDA_MIN_SUCCESS = 0.6;
export const DEFAULT_PANDA_TIMEOUT_MS = 2_000;

export const DEFAULT_PANDA_POOL: Readonly<Record<string, string>> = Object.freeze({
  'gemini-3.8-flash': 'openrouter-gemini-3.8-flash',
  'claude-sonnet-5-5': 'claude-sonnet-5.5',
  'claude-opus-5-5': 'claude-opus-5.5',
  'gemini-4-argon': 'openrouter-gemini-4-argon',
});

export const ENGINE_FLOOR_MODELS = ['claude-opus-5-5', 'gemini-4-argon'] as const;
export type EngineFloorModel = (typeof ENGINE_FLOOR_MODELS)[number];

export type ModelPickerSource = 'header' | 'floor' | 'panda' | 'fallback';

export interface PandaRouteOptions {
  url?: string;
  poolPath?: string;
  pool?: Record<string, string>;
  mode?: string;
  minSuccess?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface PandaRouteResult {
  model: string | null;
  pandaModelId: string | null;
  reason: string;
}

/**
 * Loads the agy-model -> panda-card pool map from disk (or returns the provided map).
 * Returns null if the pool file is unreadable or invalid.
 */
export function loadPandaPool(options?: {
  pool?: Record<string, string>;
  poolPath?: string;
}): Record<string, string> | null {
  if (options?.pool && typeof options.pool === 'object') {
    const entries = Object.entries(options.pool).filter(
      ([k, v]) => typeof k === 'string' && k.trim() && typeof v === 'string' && v.trim()
    );
    return entries.length > 0 ? Object.fromEntries(entries) : null;
  }

  const targetPath = options?.poolPath ?? DEFAULT_PANDA_POOL_PATH;
  if (!options?.poolPath && !fs.existsSync(targetPath)) {
    return { ...DEFAULT_PANDA_POOL };
  }

  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && k.trim() && typeof v === 'string' && v.trim()) {
        clean[k.trim()] = v.trim();
      }
    }
    return Object.keys(clean).length > 0 ? clean : null;
  } catch {
    return null;
  }
}

/**
 * Maps a Panda Router model_id back to the agy model string using the pool map.
 * Returns null when the model is not in the pool.
 */
export function resolveAgyModelFromPool(
  pandaModelId: string | null | undefined,
  pool: Record<string, string>
): string | null {
  const candidate = typeof pandaModelId === 'string' ? pandaModelId.trim() : '';
  if (!candidate) return null;

  for (const [agyModel, cardId] of Object.entries(pool)) {
    if (cardId === candidate) {
      return agyModel;
    }
  }
  if (Object.hasOwn(pool, candidate)) {
    return candidate;
  }
  return null;
}

/**
 * Returns true if the given agy model meets the engine lane floor
 * (never below claude-opus-5-5 or gemini-4-argon).
 */
export function isEngineFloorModel(model: string | null | undefined): boolean {
  if (!model) return false;
  return (ENGINE_FLOOR_MODELS as readonly string[]).includes(model.trim());
}

/**
 * Formats the mandatory first line of each task log: model picked and who picked it
 * (header, floor, panda, or fallback).
 */
export function formatTaskLogFirstLine(model: string, pickedBy: ModelPickerSource): string {
  return `model: ${model} (picked by: ${pickedBy})`;
}

/**
 * POSTs the task text to Panda Router /route with the pool, mode cheapest_above_threshold,
 * minimum success 0.6, and a 2 second limit. Never throws.
 */
export async function askPandaRouteDetailed(
  taskText: string,
  options?: PandaRouteOptions
): Promise<PandaRouteResult> {
  const pool = loadPandaPool({ pool: options?.pool, poolPath: options?.poolPath });
  if (!pool) {
    return {
      model: null,
      pandaModelId: null,
      reason: `Panda pool unavailable at ${PANDA_POOL_PORTABLE_PATH}`,
    };
  }

  const fetchFn = options?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    return {
      model: null,
      pandaModelId: null,
      reason: 'Panda fetch implementation unavailable',
    };
  }

  const url = options?.url ?? DEFAULT_PANDA_ROUTE_URL;
  const mode = options?.mode ?? DEFAULT_PANDA_MODE;
  const minSuccess = options?.minSuccess ?? DEFAULT_PANDA_MIN_SUCCESS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_PANDA_TIMEOUT_MS;
  const poolCards = Object.values(pool);

  const controller = new AbortController();
  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref?.();
  });

  try {
    const response = await Promise.race([
      fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: { text: taskText },
          pool: poolCards,
          mode,
          min_p_success: minSuccess,
          min_success: minSuccess,
          preferences: {
            mode,
            min_p_success: minSuccess,
            min_success: minSuccess,
          },
        }),
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);

    if (!response || !response.ok) {
      const status = response ? response.status : 'no-response';
      return {
        model: null,
        pandaModelId: null,
        reason: `Panda /route HTTP ${status}`,
      };
    }

    const body = (await Promise.race([response.json(), timeoutPromise])) as {
      choice?: { model_id?: unknown } | null;
      model_id?: unknown;
      model?: unknown;
    } | null;

    const rawModelId =
      typeof body?.choice?.model_id === 'string'
        ? body.choice.model_id
        : typeof body?.model_id === 'string'
          ? body.model_id
          : typeof body?.model === 'string'
            ? body.model
            : null;

    if (!rawModelId || !rawModelId.trim()) {
      return {
        model: null,
        pandaModelId: null,
        reason: 'Panda /route returned no model_id',
      };
    }

    const agyModel = resolveAgyModelFromPool(rawModelId, pool);
    if (!agyModel) {
      return {
        model: null,
        pandaModelId: rawModelId.trim(),
        reason: `Panda /route model "${rawModelId.trim()}" is not in pool`,
      };
    }

    return {
      model: agyModel,
      pandaModelId: rawModelId.trim(),
      reason: `Panda /route selected ${agyModel} (${rawModelId.trim()})`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = /abort|timeout/i.test(msg);
    return {
      model: null,
      pandaModelId: null,
      reason: isTimeout ? `Panda /route timed out (${timeoutMs}ms limit)` : `Panda /route unreachable (${msg})`,
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * POSTs the task text to /route with the pool, mode cheapest_above_threshold,
 * minimum success 0.6, and a 2 second limit, and returns the agy model string or null.
 */
export async function askPandaRoute(
  taskText: string,
  options?: PandaRouteOptions
): Promise<string | null> {
  const result = await askPandaRouteDetailed(taskText, options);
  return result.model;
}
