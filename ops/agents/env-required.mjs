import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cjs = require('./env-required.cjs');

/**
 * @typedef {import('./env-required.cjs').EnvRequiredManifest} EnvRequiredManifest
 * @typedef {import('./env-required.cjs').EnvRequiredResult} EnvRequiredResult
 */

/** @type {(manifestOrDir: string | EnvRequiredManifest) => EnvRequiredManifest} */
export const loadEnvRequiredManifest = cjs.loadEnvRequiredManifest;

/** @type {(manifestOrDir: string | EnvRequiredManifest, env?: Record<string, string | undefined>) => EnvRequiredResult} */
export const checkRequiredEnv = cjs.checkRequiredEnv;

/** @type {(manifestOrDir: string | EnvRequiredManifest, env?: Record<string, string | undefined>, warn?: (message: string) => void) => EnvRequiredResult} */
export const logStartupEnvCheck = cjs.logStartupEnvCheck;
