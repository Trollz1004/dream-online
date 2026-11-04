/**
 * Wardrobe rules: when a skin reaches the in-game currency store.
 *
 * Every skin goes on sale in the NEEDs shop on its first-sale date and reaches the
 * in-game currency store a configurable number of months later (default 3, see config.ts).
 * One exception by id, never to be removed: TrollinlootNScoot, the founder pet.
 * It never reaches the currency store, at any date, under any config.
 */

import { DEFAULT_WARDROBE_CONFIG, WardrobeRuleError, type WardrobeConfig } from './config.ts';
import type { IsoDate, Skin } from './types.ts';

/** The founder pet skin. */
export const FOUNDER_PET_SKIN_ID = 'TrollinlootNScoot';

/** Skin ids that never reach the in-game currency store. Exactly one: the founder pet. */
export const CURRENCY_STORE_EXCLUDED_IDS: readonly string[] = Object.freeze([FOUNDER_PET_SKIN_ID]);

/** Id match ignores letter case so a re-cased id cannot slip past the exception. */
export function isCurrencyStoreExcluded(skinId: string): boolean {
  const wanted = skinId.toLowerCase();
  return CURRENCY_STORE_EXCLUDED_IDS.some((id) => id.toLowerCase() === wanted);
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written `YYYY-MM-DD`, years 2000 to 2999. */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2999) return false;
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

/** Add whole calendar months in UTC. A day past the end of the target month clamps to its last day. */
export function addMonthsUtc(date: IsoDate, months: number): IsoDate {
  if (!isIsoDate(date)) throw new WardrobeRuleError(`not a valid YYYY-MM-DD date: ${String(date)}`);
  if (!Number.isInteger(months) || months < 0) {
    throw new WardrobeRuleError(`months must be a whole number, zero or more, got ${String(months)}`);
  }
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (mo - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const daysInMonth = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const nd = Math.min(d, daysInMonth);
  return `${String(ny).padStart(4, '0')}-${String(nm + 1).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

/** The day a skin reaches the currency store, or null if it never does (the founder pet). */
export function currencyStoreReleaseDate(
  skin: Pick<Skin, 'id' | 'firstSaleDate'>,
  config: WardrobeConfig = DEFAULT_WARDROBE_CONFIG,
): IsoDate | null {
  if (isCurrencyStoreExcluded(skin.id)) return null;
  return addMonthsUtc(skin.firstSaleDate, config.currencyStoreDelayMonths);
}

function startOfDayUtc(date: IsoDate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function assertValidNow(now: Date): void {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new WardrobeRuleError('now must be a valid Date');
  }
}

/** True once the skin's first-sale day has started. The NEEDs shop keeps it for sale after that. */
export function isOnNeedsShop(skin: Pick<Skin, 'firstSaleDate'>, now: Date): boolean {
  assertValidNow(now);
  return now.getTime() >= startOfDayUtc(skin.firstSaleDate);
}

/** True once the skin can be earned with in-game currency. Always false for the founder pet. */
export function isInCurrencyStore(
  skin: Pick<Skin, 'id' | 'firstSaleDate'>,
  now: Date,
  config: WardrobeConfig = DEFAULT_WARDROBE_CONFIG,
): boolean {
  assertValidNow(now);
  const release = currencyStoreReleaseDate(skin, config);
  return release !== null && now.getTime() >= startOfDayUtc(release);
}

/** Every skin in the catalog that is in the currency store right now. */
export function listCurrencyStore(
  catalog: readonly Skin[],
  now: Date,
  config: WardrobeConfig = DEFAULT_WARDROBE_CONFIG,
): readonly Skin[] {
  return catalog.filter((skin) => isInCurrencyStore(skin, now, config));
}
