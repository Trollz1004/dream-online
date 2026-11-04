/**
 * Section 7: Privacy, deny-list, redaction, <private> tag, vault citation rule, and image rule.
 *
 * - Deny-list of paths never read and never stored: the vault file, every .env and env file,
 *   the payments folder, the Personal Vault, and the Obsidian memory of other lanes.
 * - Every stored line passes the router's sanitizeDecisionLogText redaction (user paths,
 *   private ranges, key shapes, env values) plus %LOCALAPPDATA% normalization.
 * - The <private> tag is honoured.
 * - Nothing from the vault file ever enters, even as a path citation beyond its name.
 * - No screenshot and no image ever enters the store; a look at a picture is recorded as
 *   "looked at <file name>, verdict <one line>".
 */

import os from 'node:os';
import path from 'node:path';
import { sanitizeDecisionLogText } from '../../router/dream-task-router.ts';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const VAULT_FILE_NAMES = [
  'SUP@-VAULT-FOUNDER-ONLY.md',
  'SUP@-VAULT-FOUNDER-ONLY-PHRASES.md',
] as const;

export const OTHER_LANE_OBSIDIAN_FILES = [
  'gemini-to-gemini.md',
  'hermes-to-hermes.md',
  'codex-to-codex.md',
  'buzz-to-buzz.md',
  'openclaw-to-openclaw.md',
  'opencode-to-opencode.md',
  'spark-to-spark.md',
  'argon-to-argon.md',
  'sonnet-to-sonnet.md',
  'flash-to-flash.md',
] as const;

export const OTHER_LANE_OBSIDIAN_FOLDERS = [
  'agy-argon',
  'agy-flash',
  'agy-sonnet',
  'agy-opus',
  'opsis',
  'hermes',
  'codex',
  'gemini',
  'spark',
  'buzz',
  'openclaw',
  'opencode',
  'free-claude-code',
  'fcc',
] as const;

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.svg',
  '.avif',
  '.ico',
  '.tiff',
]);

export interface DenyCheckResult {
  denied: boolean;
  reason: string | null;
  category:
    | 'vault'
    | 'env'
    | 'payments'
    | 'personal_vault'
    | 'other_lane_obsidian'
    | null;
}

/**
 * Checks whether a path is on the judge-memory deny-list and must never be read or stored.
 */
export function checkDeniedPath(rawPath: string): DenyCheckResult {
  if (!rawPath || typeof rawPath !== 'string') {
    return { denied: false, reason: null, category: null };
  }

  const normalized = rawPath.trim().replace(/\\/g, '/');
  const lower = normalized.toLowerCase();
  const segments = lower.split('/').filter(Boolean);
  const baseName = segments.length > 0 ? segments[segments.length - 1]! : lower;

  // 1. The founder vault file(s) and staging folders
  if (
    lower.includes('sup@-vault-founder-only') ||
    lower.includes('vault-staging') ||
    baseName === 'sup@-vault-founder-only.md' ||
    baseName === 'sup@-vault-founder-only-phrases.md'
  ) {
    return {
      denied: true,
      reason: 'Deny-list: founder vault file is never read or stored.',
      category: 'vault',
    };
  }

  // 2. The Personal Vault
  if (
    lower.includes('personal vault') ||
    lower.includes('personal-vault') ||
    lower.includes('personal_vault')
  ) {
    return {
      denied: true,
      reason: 'Deny-list: Personal Vault path is never read or stored.',
      category: 'personal_vault',
    };
  }

  // 3. Every .env and env file
  if (
    baseName === '.env' ||
    baseName.startsWith('.env.') ||
    baseName.endsWith('.env') ||
    baseName === 'joshuas.env' ||
    baseName.startsWith('env-inventory') ||
    segments.some((seg) => seg === '.env' || seg.startsWith('.env.') || seg.endsWith('.env'))
  ) {
    return {
      denied: true,
      reason: 'Deny-list: .env and environment files are never read or stored.',
      category: 'env',
    };
  }

  // 4. The payments folder
  if (
    segments.some(
      (seg) =>
        seg === 'payments' ||
        seg.startsWith('payments-private') ||
        seg.startsWith('payments_')
    ) ||
    lower.includes('payments-private-')
  ) {
    return {
      denied: true,
      reason: 'Deny-list: payments folder is never read or stored.',
      category: 'payments',
    };
  }

  // 5. The Obsidian memory of other lanes
  if (OTHER_LANE_OBSIDIAN_FILES.some((f) => baseName === f.toLowerCase())) {
    return {
      denied: true,
      reason: 'Deny-list: Obsidian memory of another lane is never read or stored.',
      category: 'other_lane_obsidian',
    };
  }

  const isObsidianPath = segments.some(
    (seg) => seg === 'obsidian' || seg === 'obsidian-vault'
  );
  if (isObsidianPath) {
    for (const laneFolder of OTHER_LANE_OBSIDIAN_FOLDERS) {
      if (segments.includes(laneFolder.toLowerCase())) {
        return {
          denied: true,
          reason: `Deny-list: Obsidian folder for lane "${laneFolder}" is never read or stored.`,
          category: 'other_lane_obsidian',
        };
      }
    }
    if (
      baseName.endsWith('.md') &&
      /-to-/.test(baseName) &&
      baseName !== 'claude-to-claude.md' &&
      baseName !== 'fable-to-fable.md'
    ) {
      return {
        denied: true,
        reason: 'Deny-list: non-judge Obsidian agent-to-agent file is never read or stored.',
        category: 'other_lane_obsidian',
      };
    }
  }

  return { denied: false, reason: null, category: null };
}

export function isDeniedPath(rawPath: string): boolean {
  return checkDeniedPath(rawPath).denied;
}

/**
 * Strips all <private>...</private> passages from text.
 * Also reports whether the input contained private tags and whether nothing remains after stripping.
 */
export function stripPrivateTags(input: string): {
  cleaned: string;
  hadPrivateTag: boolean;
  emptyAfterStrip: boolean;
} {
  if (!input) {
    return { cleaned: '', hadPrivateTag: false, emptyAfterStrip: true };
  }

  const privateBlockRegex = /<private\b[^>]*>[\s\S]*?<\/private>/gi;
  const selfClosingOrUnclosedRegex = /<\/?private\b[^>]*>/gi;

  const hadPrivateTag = privateBlockRegex.test(input) || selfClosingOrUnclosedRegex.test(input);
  privateBlockRegex.lastIndex = 0;
  selfClosingOrUnclosedRegex.lastIndex = 0;

  // If an unclosed <private> tag opens and never closes, strip from <private> to end of text
  const unclosedTailRegex = /<private\b[^>]*>[\s\S]*$/gi;

  const cleaned = input
    .replace(privateBlockRegex, '')
    .replace(unclosedTailRegex, '')
    .replace(selfClosingOrUnclosedRegex, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    cleaned,
    hadPrivateTag,
    emptyAfterStrip: cleaned.length === 0,
  };
}

/**
 * Enforces the vault citation rule:
 * "Nothing from the vault file ever enters, even as a path citation beyond its name."
 * Replaces any path ending in SUP@-VAULT-FOUNDER-ONLY.md or SUP@-VAULT-FOUNDER-ONLY-PHRASES.md
 * with its bare file name only.
 */
export function redactVaultPathCitations(text: string): string {
  let out = text;
  out = out.replace(
    /(?:%[A-Za-z0-9_]+%|[A-Za-z]:|\.{1,2})?[\\/][^\s"'`<>|]*?[\\/](SUP@-VAULT-FOUNDER-ONLY(?:-PHRASES)?\.md)\b/gi,
    '$1'
  );
  out = out.replace(
    /\b[^\s"'`<>|]+[\\/](SUP@-VAULT-FOUNDER-ONLY(?:-PHRASES)?\.md)\b/gi,
    '$1'
  );
  return out;
}

/**
 * Replaces Windows user profile and LocalAppData paths with %LOCALAPPDATA% and %USERPROFILE%.
 */
export function normalizePortablePaths(text: string, env: NodeJS.ProcessEnv = process.env): string {
  let out = text;

  const localAppData = env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  if (localAppData) {
    for (const variant of [localAppData, localAppData.replace(/\\/g, '/')]) {
      if (variant) {
        out = out.replace(new RegExp(escapeRegExp(variant), 'gi'), '%LOCALAPPDATA%');
      }
    }
  }
  out = out.replace(
    /[A-Za-z]:[\\/]{1,2}Users[\\/]{1,2}[^\\/\s"'`]+[\\/]{1,2}AppData[\\/]{1,2}Local/gi,
    '%LOCALAPPDATA%'
  );

  const userProfile = env.USERPROFILE || os.homedir();
  if (userProfile) {
    for (const variant of [userProfile, userProfile.replace(/\\/g, '/')]) {
      if (variant) {
        out = out.replace(new RegExp(escapeRegExp(variant), 'gi'), '%USERPROFILE%');
      }
    }
  }
  out = out.replace(/[A-Za-z]:[\\/]{1,2}Users[\\/]{1,2}[^\\/\s"'`]+/gi, '%USERPROFILE%');
  out = out.replace(/%USERPROFILE%[\\/]+AppData[\\/]+Local\b/gi, '%LOCALAPPDATA%');

  return out;
}

/**
 * Redacts all secret shapes (router sanitizeDecisionLogText + pre-push secret scan rules),
 * strips <private> passages, normalizes %USERPROFILE% / %LOCALAPPDATA%, strips inline image data,
 * and collapses vault path citations to bare file names.
 */
export function sanitizeJudgeMemoryText(
  rawText: string,
  extraSecrets: string[] = [],
  env: NodeJS.ProcessEnv = process.env
): string {
  if (!rawText) return '';

  // 1. Strip <private>...</private> blocks first
  const { cleaned } = stripPrivateTags(rawText);
  if (!cleaned) return '';

  let out = cleaned;

  // 2. Strip any embedded base64 or data:image payloads so no image data ever enters the store
  out = out.replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, '[IMAGE_OMITTED]');

  // 3. Normalize %LOCALAPPDATA% and %USERPROFILE% before calling router redaction
  out = normalizePortablePaths(out, env);

  // 4. Pass through the router's sanitizeDecisionLogText (handles %USERPROFILE%, LAN IPs, env secrets, keys)
  out = sanitizeDecisionLogText(out, extraSecrets);

  // 5. Additional credential shapes from ops/hooks/secret-scan.mjs (Square, PayPal, Braintree, Anthropic)
  out = out.replace(/(?<![A-Za-z0-9])sk-ant-[A-Za-z0-9_-]{8,}/g, '[REDACTED:XXXX]');
  out = out.replace(/(?<![A-Za-z0-9_-])EAAA[A-Za-z0-9_-]{20,}/g, '[REDACTED:XXXX]');
  out = out.replace(
    /(?<![A-Za-z0-9])(?:sandbox-)?sq0(?:atp|atb|csp)-[A-Za-z0-9_-]{12,}/g,
    '[REDACTED:XXXX]'
  );
  out = out.replace(/(?<![A-Za-z0-9_-])A21AA[A-Za-z0-9_-]{20,}/g, '[REDACTED:XXXX]');
  out = out.replace(
    /access_token\$(?:production|sandbox)\$[a-z0-9]{16}\$[a-f0-9]{32}/gi,
    '[REDACTED:XXXX]'
  );
  out = out.replace(
    /\b(PAYPAL[A-Z0-9_]*(?:SECRET|TOKEN))\s*([=:])\s*["']?[A-Za-z0-9_-]{12,}["']?/gi,
    '$1$2[REDACTED:XXXX]'
  );

  // 6. Collapse any vault file path citation to its bare filename only
  out = redactVaultPathCitations(out);

  // 7. Collapse to a single clean line
  out = out.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();

  return out;
}

/**
 * Checks whether a target path refers to a screenshot or image file.
 */
export function isImageFilePath(rawPath: string): boolean {
  if (!rawPath || typeof rawPath !== 'string') return false;
  const cleaned = rawPath.trim().replace(/[?#].*$/, '');
  const ext = path.extname(cleaned).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Formats an image inspection strictly as:
 * "looked at <file name>, verdict <one line>"
 * No image bytes and no directory path beyond the file name ever enter the store.
 */
export function formatPictureObservation(
  imagePathOrName: string,
  verdictText?: string,
  extraSecrets: string[] = []
): { fileName: string; outcome: string } {
  const normalized = (imagePathOrName || 'unknown-image.png').trim().replace(/\\/g, '/');
  const rawBaseName = path.posix.basename(normalized) || 'unknown-image.png';
  const fileName = sanitizeJudgeMemoryText(rawBaseName, extraSecrets) || 'unknown-image.png';

  const rawVerdict =
    verdictText && verdictText.trim().length > 0
      ? verdictText.trim()
      : 'inspected reference comparison';
  const cleanVerdict =
    sanitizeJudgeMemoryText(rawVerdict, extraSecrets).replace(/^verdict\s*[:=-]?\s*/i, '') ||
    'inspected reference comparison';

  return {
    fileName,
    outcome: `looked at ${fileName}, verdict ${cleanVerdict}`,
  };
}
