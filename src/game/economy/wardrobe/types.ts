/**
 * Wardrobe rules: shared types. Pure data, no UI, no I/O.
 * Founder ruling: docs/gdd/12-wardrobe-needs-shop.md
 *
 * Three rules are enforced by the SHAPE of these types, not by convention:
 *  1. Bought is owned. An owned skin record carries who, what, when and how it
 *     was acquired. It has no end date and no rental state, so none can exist.
 *  2. Pay-to-win never. Skins, convenience items and basics have no stat field.
 *     The compile-time assertion at the bottom of this file fails `npm run lint`
 *     if anyone adds one.
 *  3. Kid-safe basics are their own item kind and are never sold.
 */

/** A calendar day, `YYYY-MM-DD`, always read as UTC. */
export type IsoDate = string;

/** Where a skin can be worn. */
export const SKIN_SLOTS = ['top', 'bottom', 'shoes', 'headwear', 'outfit', 'back', 'pet', 'weapon'] as const;
export type SkinSlot = (typeof SKIN_SLOTS)[number];

/** The slots every character leaves the creator wearing. */
export const BASIC_SLOTS = ['top', 'bottom', 'shoes'] as const;
export type BasicSlot = (typeof BASIC_SLOTS)[number];

/** What a convenience item saves the player. Never combat power. */
export const CONVENIENCE_SAVES = ['walking', 'attention'] as const;
export type ConvenienceSaves = (typeof CONVENIENCE_SAVES)[number];

/** How a skin reached an account. Two doors only. */
export const ACQUIRE_CHANNELS = ['needs-shop', 'currency-store'] as const;
export type AcquireChannel = (typeof ACQUIRE_CHANNELS)[number];

/** A cosmetic skin sold in the NEEDs shop. Looks only. */
export interface Skin {
  readonly kind: 'skin';
  readonly id: string;
  readonly name: string;
  readonly slot: SkinSlot;
  /** The day the skin first went on sale. The currency store opens a set number of months later. */
  readonly firstSaleDate: IsoDate;
}

/** A shop item that saves walking or attention. Never combat power. */
export interface ConvenienceItem {
  readonly kind: 'convenience';
  readonly id: string;
  readonly name: string;
  readonly saves: ConvenienceSaves;
}

export type ShopItem = Skin | ConvenienceItem;

/** One piece of the kid-safe basics. Free, never sold, never in the catalog. */
export interface BasicItem {
  readonly kind: 'basic';
  readonly id: string;
  readonly name: string;
  readonly slot: BasicSlot;
}

/** One skin an account owns. Forever: there is no end date field. */
export interface OwnedSkin {
  readonly skinId: string;
  /** Full ISO timestamp of the moment the account got the skin. */
  readonly acquiredAt: string;
  readonly channel: AcquireChannel;
}

/** Everything one account owns. Only ever grows. */
export interface Wardrobe {
  readonly accountId: string;
  readonly owned: readonly OwnedSkin[];
}

/** One item per basic slot. What a character wears on leaving the creator. */
export type Outfit = Readonly<Partial<Record<BasicSlot, string>>>;

/**
 * Field names that read as combat or progression power. The runtime validator
 * uses this list to give a clear message; the real guard is that the validator
 * only accepts the exact allowed field names of each item kind.
 */
export const STAT_KEYS = [
  'stat', 'stats', 'attack', 'atk', 'damage', 'dmg', 'defense', 'defence', 'armor', 'armour',
  'health', 'hp', 'mana', 'mp', 'stamina', 'speed', 'crit', 'critChance', 'power', 'strength',
  'dexterity', 'intelligence', 'accuracy', 'evasion', 'lifesteal', 'resistance', 'penetration',
  'bonus', 'buff', 'modifier', 'boost', 'multiplier', 'xpBoost', 'dropRate', 'level', 'combat',
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

// Compile-time guard. If any item type gains a stat-like key, this line stops compiling
// and `npm run lint` fails. See tests/wardrobe-rules.test.ts for the matching runtime proofs.
type Assert<T extends true> = T;
export type NoStatKeysOnAnyItem = Assert<
  [Extract<keyof Skin | keyof ConvenienceItem | keyof BasicItem, StatKey>] extends [never] ? true : false
>;
