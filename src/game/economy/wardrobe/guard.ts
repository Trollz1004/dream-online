/**
 * Wardrobe rules: the pay-to-win guard.
 *
 * Stat rule: items carry stats at the same percentage per tier on their catalogue entry (choice, never power; everything sold for cash is also earnable in game), while raw Skin and ConvenienceItem records carry no ad-hoc stat field. Two layers keep raw records clean:
 *  - Compile time: defineSkin / defineConvenienceItem reject any key that is not part of
 *    the item type, even when the object comes from a variable (excess-property checks
 *    alone only catch literals). The assertion in types.ts fails lint if a stat key is
 *    ever added to an item type.
 *  - Run time: validateShopItem accepts only the exact allowed field names, so data from
 *    JSON or a database cannot smuggle a stat in, and the defined items are frozen.
 */

import { WardrobeRuleError } from './config.ts';
import { KID_SAFE_BASIC_IDS } from './basics.ts';
import { isIsoDate } from './release.ts';
import {
  CONVENIENCE_SAVES,
  SKIN_SLOTS,
  STAT_KEYS,
  type ConvenienceItem,
  type ShopItem,
  type Skin,
} from './types.ts';

type SkinInput = Omit<Skin, 'kind'>;
type ConvenienceInput = Omit<ConvenienceItem, 'kind'>;
/** Turns every key that is not part of the allowed shape into `never`, so extras cannot compile. */
type NoExtraKeys<T, Shape> = { [K in Exclude<keyof T, keyof Shape>]: never };

const SKIN_FIELDS = ['kind', 'id', 'name', 'slot', 'firstSaleDate'] as const;
const CONVENIENCE_FIELDS = ['kind', 'id', 'name', 'saves'] as const;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const STAT_KEYS_LOWER: ReadonlySet<string> = new Set(STAT_KEYS.map((k) => k.toLowerCase()));

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

/** Check one raw object (for example parsed JSON) against the exact shop item shapes. */
export function validateShopItem(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['item must be a plain object'] };
  }
  const item = raw as Record<string, unknown>;
  const kind = item.kind;
  if (kind !== 'skin' && kind !== 'convenience') {
    return { ok: false, errors: ['kind must be "skin" or "convenience"'] };
  }
  const allowed: readonly string[] = kind === 'skin' ? SKIN_FIELDS : CONVENIENCE_FIELDS;

  for (const key of Reflect.ownKeys(item)) {
    if (typeof key === 'symbol') {
      errors.push('symbol keys are not allowed');
    } else if (!allowed.includes(key)) {
      errors.push(
        STAT_KEYS_LOWER.has(key.toLowerCase())
          ? `field "${key}" is a stat: items carry tier-shared stat percentages on the catalogue entry, never as a raw item field`
          : `unknown field "${key}"`,
      );
    }
  }
  for (const field of allowed) {
    if (typeof item[field] !== 'string') errors.push(`field "${field}" must be a string`);
  }

  if (typeof item.id === 'string' && !ID_PATTERN.test(item.id)) errors.push('id must be 1-64 letters, digits, _ or -');
  if (typeof item.id === 'string' && KID_SAFE_BASIC_IDS.some((b) => b.toLowerCase() === (item.id as string).toLowerCase())) {
    errors.push(`id "${item.id}" is reserved for the kid-safe basics`);
  }
  if (typeof item.name === 'string' && (item.name.trim() === '' || item.name.length > 80)) {
    errors.push('name must be 1-80 characters');
  }
  if (kind === 'skin') {
    if (typeof item.slot === 'string' && !(SKIN_SLOTS as readonly string[]).includes(item.slot)) {
      errors.push(`slot "${item.slot}" is not a skin slot`);
    }
    if (typeof item.firstSaleDate === 'string' && !isIsoDate(item.firstSaleDate)) {
      errors.push('firstSaleDate must be a real YYYY-MM-DD date');
    }
  } else if (
    typeof item.saves === 'string' &&
    !(CONVENIENCE_SAVES as readonly string[]).includes(item.saves)
  ) {
    errors.push(`saves "${item.saves}" must be one of ${CONVENIENCE_SAVES.join(', ')}`);
  }
  return { ok: errors.length === 0, errors };
}

function assertValid(raw: unknown): void {
  const result = validateShopItem(raw);
  if (!result.ok) throw new WardrobeRuleError(`invalid shop item: ${result.errors.join('; ')}`);
}

/** Build a frozen skin. A stat or any other extra key is a compile error and also throws at run time. */
export function defineSkin<T extends SkinInput>(input: T & NoExtraKeys<T, SkinInput>): Skin {
  const skin = { kind: 'skin' as const, ...input };
  assertValid(skin);
  return Object.freeze(skin) as Skin;
}

/** Build a frozen convenience item. A stat or any other extra key is a compile error and throws at run time. */
export function defineConvenienceItem<T extends ConvenienceInput>(
  input: T & NoExtraKeys<T, ConvenienceInput>,
): ConvenienceItem {
  const item = { kind: 'convenience' as const, ...input };
  assertValid(item);
  return Object.freeze(item) as ConvenienceItem;
}

/** Check a whole catalog: every item valid, no duplicate ids (letter case ignored). */
export function validateCatalog(raw: readonly unknown[]): ValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const result = validateShopItem(entry);
    for (const e of result.errors) errors.push(`item ${index}: ${e}`);
    const id = (entry as { id?: unknown } | null)?.id;
    if (typeof id === 'string') {
      const key = id.toLowerCase();
      if (seen.has(key)) errors.push(`item ${index}: duplicate id "${id}"`);
      seen.add(key);
    }
  });
  return { ok: errors.length === 0, errors };
}

export function isSkin(item: ShopItem): item is Skin {
  return item.kind === 'skin';
}
