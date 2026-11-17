'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * @typedef {{
 *   service?: string,
 *   node?: string | string[],
 *   envFile?: string,
 *   required?: string[],
 *   alternatives?: Record<string, string[]>,
 *   optional?: string[]
 * }} EnvRequiredManifest
 */

/**
 * @typedef {{
 *   service: string,
 *   envFile: string,
 *   required: string[],
 *   missingEnv: string[],
 *   ok: boolean
 * }} EnvRequiredResult
 */

/**
 * Loads an env.required.json manifest from a directory, file path, or object.
 * Never reads any .env file.
 * @param {string | EnvRequiredManifest} manifestOrDir
 * @returns {EnvRequiredManifest}
 */
function loadEnvRequiredManifest(manifestOrDir) {
  if (manifestOrDir && typeof manifestOrDir === 'object' && !Array.isArray(manifestOrDir)) {
    return manifestOrDir;
  }
  if (typeof manifestOrDir !== 'string' || !manifestOrDir.trim()) {
    throw new Error('manifestOrDir must be a directory path, manifest file path, or manifest object');
  }
  const resolved = path.resolve(manifestOrDir);
  let targetFile = resolved;
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    targetFile = path.join(resolved, 'env.required.json');
  } else if (!resolved.toLowerCase().endsWith('.json')) {
    targetFile = path.join(resolved, 'env.required.json');
  }
  const raw = fs.readFileSync(targetFile, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

/**
 * Checks whether an env key has a non-empty value without ever copying or returning the value.
 * @param {Record<string, string | undefined>} env
 * @param {string} key
 * @returns {boolean}
 */
function hasNonEmptyEnvKey(env, key) {
  if (!env || typeof env !== 'object') return false;
  return String(env[key] || '').trim().length > 0;
}

/**
 * Checks required setting names (and alternatives) in memory only.
 * Returns setting names only, never values.
 * @param {string | EnvRequiredManifest} manifestOrDir
 * @param {Record<string, string | undefined>} [env]
 * @returns {EnvRequiredResult}
 */
function checkRequiredEnv(manifestOrDir, env = process.env) {
  const manifest = loadEnvRequiredManifest(manifestOrDir);
  const service = String(manifest.service || 'unknown').trim() || 'unknown';
  const envFile = String(manifest.envFile || '.env').trim() || '.env';
  const required = Array.isArray(manifest.required)
    ? manifest.required.map((name) => String(name).trim()).filter(Boolean)
    : [];
  const alternatives =
    manifest.alternatives && typeof manifest.alternatives === 'object' && !Array.isArray(manifest.alternatives)
      ? manifest.alternatives
      : {};

  const missingEnv = [];
  for (const key of required) {
    if (hasNonEmptyEnvKey(env, key)) continue;
    const alts = Array.isArray(alternatives[key]) ? alternatives[key] : [];
    const altSatisfied = alts.some((altKey) => hasNonEmptyEnvKey(env, String(altKey).trim()));
    if (!altSatisfied) {
      missingEnv.push(key);
    }
  }

  return {
    service,
    envFile,
    required,
    missingEnv,
    ok: missingEnv.length === 0,
  };
}

/**
 * Checks required env variable names on startup and logs missing setting names via warn.
 * Never throws or blocks startup, and never prints setting values.
 * @param {string | EnvRequiredManifest} manifestOrDir
 * @param {Record<string, string | undefined>} [env]
 * @param {(message: string) => void} [warn]
 * @returns {EnvRequiredResult}
 */
function logStartupEnvCheck(manifestOrDir, env = process.env, warn = console.warn) {
  const safeWarn = typeof warn === 'function' ? warn : console.warn;
  try {
    const result = checkRequiredEnv(manifestOrDir, env);
    if (result.missingEnv.length > 0) {
      safeWarn(
        `[${result.service}] Startup env check: missing required setting names: ${result.missingEnv.join(', ')}`,
      );
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    safeWarn(`[env-required] Startup env check skipped: ${msg}`);
    return {
      service: 'unknown',
      envFile: '.env',
      required: [],
      missingEnv: [],
      ok: false,
    };
  }
}

module.exports = {
  loadEnvRequiredManifest,
  checkRequiredEnv,
  logStartupEnvCheck,
};
