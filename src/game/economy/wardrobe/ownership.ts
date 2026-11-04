/**
 * Wardrobe rules: bought is owned.
 *
 * A skin an account gets stays on that account forever. The records here carry no end
 * date and no rental state, and this module offers no way to take a skin away: it has
 * grow-only functions and nothing that removes, revokes or reverses an acquisition.
 * Every function returns a new frozen wardrobe and never mutates the old one.
 */

import { DEFAULT_WARDROBE_CONFIG, WardrobeRuleError, type WardrobeConfig } from './config.ts';
import { isCurrencyStoreExcluded, isInCurrencyStore, isOnNeedsShop } from './release.ts';
import { ACQUIRE_CHANNELS, type AcquireChannel, type OwnedSkin, type Skin, type Wardrobe } from './types.ts';

export type AcquireRefusal =
  | 'already-owned'
  | 'not-yet-on-sale'
  | 'not-in-currency-store-yet'
  | 'founder-pet-never-in-currency-store';

export type AcquireResult =
  | { readonly ok: true; readonly wardrobe: Wardrobe; readonly owned: OwnedSkin }
  | { readonly ok: false; readonly reason: AcquireRefusal };

const ACCOUNT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/** A new, empty wardrobe for an account. */
export function createWardrobe(accountId: string): Wardrobe {
  if (!ACCOUNT_ID.test(accountId)) throw new WardrobeRuleError('accountId must be 1-64 letters, digits, _ or -');
  return Object.freeze({ accountId, owned: Object.freeze([]) });
}

/** Does the account own the skin? No clock involved: owned is owned. */
export function ownsSkin(wardrobe: Wardrobe, skinId: string): boolean {
  return wardrobe.owned.some((o) => o.skinId === skinId);
}

/**
 * Get a skin through one of the two doors.
 *  - 'needs-shop': open from the skin's first-sale day on, for every skin including the founder pet.
 *  - 'currency-store': open once the configured delay has passed, never for the founder pet.
 * A skin the account already owns is refused so nobody is charged twice.
 */
export function acquireSkin(
  wardrobe: Wardrobe,
  skin: Skin,
  channel: AcquireChannel,
  now: Date,
  config: WardrobeConfig = DEFAULT_WARDROBE_CONFIG,
): AcquireResult {
  if (!(ACQUIRE_CHANNELS as readonly string[]).includes(channel)) {
    throw new WardrobeRuleError(`unknown acquire channel: ${String(channel)}`);
  }
  if (ownsSkin(wardrobe, skin.id)) return { ok: false, reason: 'already-owned' };
  if (!isOnNeedsShop(skin, now)) return { ok: false, reason: 'not-yet-on-sale' };
  if (channel === 'currency-store') {
    if (isCurrencyStoreExcluded(skin.id)) return { ok: false, reason: 'founder-pet-never-in-currency-store' };
    if (!isInCurrencyStore(skin, now, config)) return { ok: false, reason: 'not-in-currency-store-yet' };
  }
  const owned: OwnedSkin = Object.freeze({ skinId: skin.id, acquiredAt: now.toISOString(), channel });
  const next: Wardrobe = Object.freeze({
    accountId: wardrobe.accountId,
    owned: Object.freeze([...wardrobe.owned, owned]),
  });
  return { ok: true, wardrobe: next, owned };
}

const OWNED_FIELDS = ['skinId', 'acquiredAt', 'channel'] as const;
const WARDROBE_FIELDS = ['accountId', 'owned'] as const;

function hasExactKeys(obj: object, fields: readonly string[]): boolean {
  const keys = Reflect.ownKeys(obj);
  return keys.length === fields.length && fields.every((f) => keys.includes(f));
}

/**
 * Read a stored wardrobe back in. Strict: any field beyond the exact record shape
 * is refused, so a stored record cannot carry an end date or a rental flag.
 */
export function parseWardrobe(raw: unknown): Wardrobe {
  const bad = (why: string): never => {
    throw new WardrobeRuleError(`invalid wardrobe: ${why}`);
  };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return bad('not an object');
  if (!hasExactKeys(raw, WARDROBE_FIELDS)) return bad('fields must be exactly accountId and owned');
  const { accountId, owned } = raw as { accountId: unknown; owned: unknown };
  if (typeof accountId !== 'string') return bad('accountId must be a string');
  if (!Array.isArray(owned)) return bad('owned must be a list');
  const seen = new Set<string>();
  const records = owned.map((entry): OwnedSkin => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return bad('owned entry not an object');
    if (!hasExactKeys(entry, OWNED_FIELDS)) return bad('owned entry fields must be exactly skinId, acquiredAt, channel');
    const { skinId, acquiredAt, channel } = entry as Record<string, unknown>;
    if (typeof skinId !== 'string' || skinId === '') return bad('skinId must be a non-empty string');
    if (seen.has(skinId)) return bad(`skin ${skinId} listed twice`);
    seen.add(skinId);
    if (typeof acquiredAt !== 'string' || Number.isNaN(Date.parse(acquiredAt))) return bad('acquiredAt must be an ISO timestamp');
    if (typeof channel !== 'string' || !(ACQUIRE_CHANNELS as readonly string[]).includes(channel)) return bad('channel unknown');
    return Object.freeze({ skinId, acquiredAt, channel: channel as AcquireChannel });
  });
  const wardrobe = createWardrobe(accountId);
  return Object.freeze({ accountId: wardrobe.accountId, owned: Object.freeze(records) });
}
