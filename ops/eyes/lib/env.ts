/**
 * Eyes gate — node env loading. Values are read by name and never printed.
 * Search order: EYES_ENV_FILE, <repo>/.env, then the main checkout's .env
 * (found through git's common dir, so git worktrees share one env file).
 * Process environment variables win over the file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';

export interface NodeEnv {
  values: Record<string, string>;
  /** Which file was used, already shown as a %USERPROFILE% path by the caller. */
  file: string | null;
}

function mainCheckoutRoot(repoRoot: string): string | null {
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return common ? path.dirname(common) : null;
  } catch {
    return null;
  }
}

export function loadNodeEnv(repoRoot: string): NodeEnv {
  const candidates = [
    process.env.EYES_ENV_FILE,
    path.join(repoRoot, '.env'),
    (() => {
      const main = mainCheckoutRoot(repoRoot);
      return main ? path.join(main, '.env') : undefined;
    })(),
  ].filter((p): p is string => Boolean(p));

  let values: Record<string, string> = {};
  let file: string | null = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      values = dotenv.parse(fs.readFileSync(c));
      file = c;
      break;
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && /OLLAMA|SABRETOOTH_IP|^EYES_/.test(k)) values[k] = v;
  }
  return { values, file };
}

/** Every value that must never appear in a report or log. */
export function secretValues(env: NodeEnv): string[] {
  return Object.entries(env.values)
    .filter(([k]) => /KEY|TOKEN|SECRET|PASSWORD|PASS\b/i.test(k))
    .map(([, v]) => v)
    .filter((v) => v && v.length >= 6);
}
