/**
 * Wardrobe catalogue: Wave One items.
 * Ruled by Josh 2026-11-05 (NEEDs Shop v1.1 design sheet).
 * Docs: docs/gdd/10-wardrobe-catalogue.md and docs/gdd/12-wardrobe-needs-shop.md.
 *
 * Wave One items:
 *  - AFK Fishing Set in zebra fish scale (4 pieces, Square, coins May 2027)
 *  - Cooking Apron and Chef's Hat (any body, Square, coins May 2027)
 *  - Team Blue Baseball Uniform (4 pieces, number 00 to 99 at purchase, Square, coins May 2027)
 *  - Team Blue Ash Bat, Alloy Bat, Plastic T-Ball Bat (weapon skins, Square, coins May 2027)
 *  - Blu's Tee (oversized white pet tee, Blue Charge only, never in the coin store or through the game's own Square account)
 *  - TrollinlootNScoot (founder pet, never in coin store)
 *  - Kid-safe basics (always owned)
 *
 * The stat rule (docs/gdd/GAME-SYSTEMS-RULING-2026-11-07.md): every item in a tier carries the
 * same percentage, the player's choice is which stat, everything sold for cash can also be earned
 * in game, and cash buys time, never power. Each entry records its tier, its bonus (or null when
 * the item is cosmetic only) and its in-game acquisition path. The Skin record itself stays a
 * looks-only record; the bonus lives on the catalogue entry.
 *
 * "Square" below means the game's own Square account, kept separate from the date app's.
 * Prices remain [YOUR PRICE] placeholders until Josh says finalize.
 * Percentages Josh has not ruled stay as the [TIER %] placeholder, stats as [STAT].
 * Pure data and helper queries; no UI, no payments code.
 */

import { DEFAULT_WARDROBE_CONFIG, type WardrobeConfig } from './config.ts';
import { defineSkin } from './guard.ts';
import { FOUNDER_PET_SKIN_ID, isCurrencyStoreExcluded, isInCurrencyStore } from './release.ts';
import { KID_SAFE_BASICS, KID_SAFE_BASIC_IDS } from './basics.ts';
import type { BasicItem, BasicSlot, Skin, SkinSlot } from './types.ts';

export const BLUS_PET_TEE_ID = 'blus-pet-tee';

// --- Wave One Skin Definitions ---

export const AFK_FISHING_HAT: Skin = defineSkin({
  id: 'afk-fishing-hat',
  name: 'Zebra Fish Scale Hat',
  slot: 'headwear',
  firstSaleDate: '2026-11-05',
});

export const AFK_FISHING_TOP: Skin = defineSkin({
  id: 'afk-fishing-top',
  name: 'Zebra Fish Scale Vest',
  slot: 'top',
  firstSaleDate: '2026-11-05',
});

export const AFK_FISHING_BOTTOM: Skin = defineSkin({
  id: 'afk-fishing-bottom',
  name: 'Zebra Fish Scale Waders',
  slot: 'bottom',
  firstSaleDate: '2026-11-05',
});

export const AFK_FISHING_SHOES: Skin = defineSkin({
  id: 'afk-fishing-shoes',
  name: 'Zebra Fish Scale Boots',
  slot: 'shoes',
  firstSaleDate: '2026-11-05',
});

export const COOKING_APRON: Skin = defineSkin({
  id: 'cooking-apron',
  name: 'Cooking Apron',
  slot: 'top',
  firstSaleDate: '2026-11-05',
});

export const CHEFS_HAT: Skin = defineSkin({
  id: 'chefs-hat',
  name: "Chef's Hat",
  slot: 'headwear',
  firstSaleDate: '2026-11-05',
});

export const TEAM_BLUE_BASEBALL_CAP: Skin = defineSkin({
  id: 'team-blue-baseball-cap',
  name: 'Team Blue Baseball Cap',
  slot: 'headwear',
  firstSaleDate: '2026-11-05',
});

export const TEAM_BLUE_BASEBALL_JERSEY: Skin = defineSkin({
  id: 'team-blue-baseball-jersey',
  name: 'Team Blue Baseball Jersey',
  slot: 'top',
  firstSaleDate: '2026-11-05',
});

export const TEAM_BLUE_BASEBALL_PANTS: Skin = defineSkin({
  id: 'team-blue-baseball-pants',
  name: 'Team Blue Baseball Pants',
  slot: 'bottom',
  firstSaleDate: '2026-11-05',
});

export const TEAM_BLUE_BASEBALL_CLEATS: Skin = defineSkin({
  id: 'team-blue-baseball-cleats',
  name: 'Team Blue Baseball Cleats',
  slot: 'shoes',
  firstSaleDate: '2026-11-05',
});

export const TEAM_BLUE_ASH_BAT: Skin = defineSkin({
  id: 'team-blue-ash-bat',
  name: 'Team Blue Ash Bat',
  slot: 'weapon',
  firstSaleDate: '2026-11-05',
});

export const TEAM_BLUE_ALLOY_BAT: Skin = defineSkin({
  id: 'team-blue-alloy-bat',
  name: 'Team Blue Alloy Bat',
  slot: 'weapon',
  firstSaleDate: '2026-11-05',
});

export const PLASTIC_T_BALL_BAT: Skin = defineSkin({
  id: 'plastic-t-ball-bat',
  name: 'Plastic T-Ball Bat',
  slot: 'weapon',
  firstSaleDate: '2026-11-05',
});

export const BLUS_PET_TEE: Skin = defineSkin({
  id: BLUS_PET_TEE_ID,
  name: "Blu's Tee",
  slot: 'pet',
  firstSaleDate: '2026-11-05',
});

export const WAVE_ONE_FOUNDER_PET: Skin = defineSkin({
  id: FOUNDER_PET_SKIN_ID,
  name: FOUNDER_PET_SKIN_ID,
  slot: 'pet',
  firstSaleDate: '2026-11-05',
});

export type WaveOneHowEarned = 'Square' | 'Blue Charge' | 'always owned';

/** Placeholder for a tier percentage Josh has not ruled yet. */
export const TIER_PERCENT_PLACEHOLDER = '[TIER %]' as const;
/** Placeholder for a stat choice Josh has not ruled yet. */
export const STAT_PLACEHOLDER = '[STAT]' as const;

/** Tiers in Wave One. Every item in a tier carries the same percentage. */
export type WaveOneTier = 'hat' | 'fishing-set' | 'cooking' | 'team-blue';

/** The stats a Wave One bonus can name. The choice is which stat, never how much. */
export type WaveOneStat = 'experience' | 'fishing-experience' | 'cooking-experience';

/** A tier bonus. `percent` is a whole percent, or the placeholder until Josh rules it. */
export interface WaveOneBonus {
  readonly stat: WaveOneStat | typeof STAT_PLACEHOLDER;
  readonly percent: number | typeof TIER_PERCENT_PLACEHOLDER;
}

/**
 * How a player can get the item without cash.
 *  - coins: reaches the in-game coin store (see coinStoreRelease)
 *  - craft: made in game from recipes
 *  - blue-charge: Blu's Tee, Blue Charge only (not sold for cash)
 *  - founder-exception: the founder pet, a cash-only founder edition that never reaches the coin store
 *  - always-owned: kid-safe basics
 */
export type WaveOneInGamePath = 'coins' | 'craft' | 'blue-charge' | 'founder-exception' | 'always-owned';

export interface WaveOneCatalogueEntry {
  readonly id: string;
  readonly name: string;
  readonly kind: 'skin' | 'basic';
  readonly slot: SkinSlot | BasicSlot;
  readonly howEarned: WaveOneHowEarned;
  readonly coinStoreRelease: string;
  readonly price: string;
  readonly note: string;
  /** Tier the item belongs to, or null for cosmetic-only items and basics. */
  readonly tier: WaveOneTier | null;
  /** The bonus this item gives, or null when the item is cosmetic only. */
  readonly bonus: WaveOneBonus | null;
  /** The in-game acquisition path, recorded on the entry. */
  readonly inGamePath: WaveOneInGamePath;
  readonly item: Skin | BasicItem;
}

export const WAVE_ONE_CATALOGUE: readonly WaveOneCatalogueEntry[] = Object.freeze([
  Object.freeze({
    id: AFK_FISHING_HAT.id,
    name: AFK_FISHING_HAT.name,
    kind: 'skin' as const,
    slot: AFK_FISHING_HAT.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'AFK Fishing Set in zebra fish scale (piece 1 of 4). 10 percent fishing experience.',
    tier: 'hat' as const,
    bonus: { stat: 'fishing-experience' as const, percent: 10 },
    inGamePath: 'coins' as const,
    item: AFK_FISHING_HAT,
  }),
  Object.freeze({
    id: AFK_FISHING_TOP.id,
    name: AFK_FISHING_TOP.name,
    kind: 'skin' as const,
    slot: AFK_FISHING_TOP.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'AFK Fishing Set in zebra fish scale (piece 2 of 4). 10 percent fishing experience.',
    tier: 'fishing-set' as const,
    bonus: { stat: 'fishing-experience' as const, percent: 10 },
    inGamePath: 'coins' as const,
    item: AFK_FISHING_TOP,
  }),
  Object.freeze({
    id: AFK_FISHING_BOTTOM.id,
    name: AFK_FISHING_BOTTOM.name,
    kind: 'skin' as const,
    slot: AFK_FISHING_BOTTOM.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'AFK Fishing Set in zebra fish scale (piece 3 of 4). 10 percent fishing experience.',
    tier: 'fishing-set' as const,
    bonus: { stat: 'fishing-experience' as const, percent: 10 },
    inGamePath: 'coins' as const,
    item: AFK_FISHING_BOTTOM,
  }),
  Object.freeze({
    id: AFK_FISHING_SHOES.id,
    name: AFK_FISHING_SHOES.name,
    kind: 'skin' as const,
    slot: AFK_FISHING_SHOES.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'AFK Fishing Set in zebra fish scale (piece 4 of 4). 10 percent fishing experience.',
    tier: 'fishing-set' as const,
    bonus: { stat: 'fishing-experience' as const, percent: 10 },
    inGamePath: 'coins' as const,
    item: AFK_FISHING_SHOES,
  }),
  Object.freeze({
    id: COOKING_APRON.id,
    name: COOKING_APRON.name,
    kind: 'skin' as const,
    slot: COOKING_APRON.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'Cooking Apron, fits any body. 10 percent cooking experience.',
    tier: 'cooking' as const,
    bonus: { stat: 'cooking-experience' as const, percent: 10 },
    inGamePath: 'coins' as const,
    item: COOKING_APRON,
  }),
  Object.freeze({
    id: CHEFS_HAT.id,
    name: CHEFS_HAT.name,
    kind: 'skin' as const,
    slot: CHEFS_HAT.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: "Chef's Hat, fits any body. 10 percent cooking experience.",
    tier: 'hat' as const,
    bonus: { stat: 'cooking-experience' as const, percent: 10 },
    inGamePath: 'coins' as const,
    item: CHEFS_HAT,
  }),
  Object.freeze({
    id: TEAM_BLUE_BASEBALL_CAP.id,
    name: TEAM_BLUE_BASEBALL_CAP.name,
    kind: 'skin' as const,
    slot: TEAM_BLUE_BASEBALL_CAP.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'Team Blue Baseball Uniform (piece 1 of 4). Number 00 to 99 at purchase. Same percentage as the other Team Blue choices, [TIER %].',
    tier: 'hat' as const,
    bonus: { stat: 'experience' as const, percent: 10 },
    inGamePath: 'coins' as const,
    item: TEAM_BLUE_BASEBALL_CAP,
  }),
  Object.freeze({
    id: TEAM_BLUE_BASEBALL_JERSEY.id,
    name: TEAM_BLUE_BASEBALL_JERSEY.name,
    kind: 'skin' as const,
    slot: TEAM_BLUE_BASEBALL_JERSEY.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'Team Blue Baseball Uniform (piece 2 of 4). Number 00 to 99 at purchase. Same percentage as the other Team Blue choices, [TIER %].',
    tier: 'team-blue' as const,
    bonus: { stat: STAT_PLACEHOLDER, percent: TIER_PERCENT_PLACEHOLDER },
    inGamePath: 'coins' as const,
    item: TEAM_BLUE_BASEBALL_JERSEY,
  }),
  Object.freeze({
    id: TEAM_BLUE_BASEBALL_PANTS.id,
    name: TEAM_BLUE_BASEBALL_PANTS.name,
    kind: 'skin' as const,
    slot: TEAM_BLUE_BASEBALL_PANTS.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'Team Blue Baseball Uniform (piece 3 of 4). Number 00 to 99 at purchase. Same percentage as the other Team Blue choices, [TIER %].',
    tier: 'team-blue' as const,
    bonus: { stat: STAT_PLACEHOLDER, percent: TIER_PERCENT_PLACEHOLDER },
    inGamePath: 'coins' as const,
    item: TEAM_BLUE_BASEBALL_PANTS,
  }),
  Object.freeze({
    id: TEAM_BLUE_BASEBALL_CLEATS.id,
    name: TEAM_BLUE_BASEBALL_CLEATS.name,
    kind: 'skin' as const,
    slot: TEAM_BLUE_BASEBALL_CLEATS.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'Team Blue Baseball Uniform (piece 4 of 4). Number 00 to 99 at purchase. Same percentage as the other Team Blue choices, [TIER %].',
    tier: 'team-blue' as const,
    bonus: { stat: STAT_PLACEHOLDER, percent: TIER_PERCENT_PLACEHOLDER },
    inGamePath: 'coins' as const,
    item: TEAM_BLUE_BASEBALL_CLEATS,
  }),
  Object.freeze({
    id: TEAM_BLUE_ASH_BAT.id,
    name: TEAM_BLUE_ASH_BAT.name,
    kind: 'skin' as const,
    slot: TEAM_BLUE_ASH_BAT.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'Weapon skin for any one-handed blunt weapon. Same percentage as the other Team Blue choices, [TIER %].',
    tier: 'team-blue' as const,
    bonus: { stat: STAT_PLACEHOLDER, percent: TIER_PERCENT_PLACEHOLDER },
    inGamePath: 'coins' as const,
    item: TEAM_BLUE_ASH_BAT,
  }),
  Object.freeze({
    id: TEAM_BLUE_ALLOY_BAT.id,
    name: TEAM_BLUE_ALLOY_BAT.name,
    kind: 'skin' as const,
    slot: TEAM_BLUE_ALLOY_BAT.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'Weapon skin for any one-handed blunt weapon. Same percentage as the other Team Blue choices, [TIER %].',
    tier: 'team-blue' as const,
    bonus: { stat: STAT_PLACEHOLDER, percent: TIER_PERCENT_PLACEHOLDER },
    inGamePath: 'coins' as const,
    item: TEAM_BLUE_ALLOY_BAT,
  }),
  Object.freeze({
    id: PLASTIC_T_BALL_BAT.id,
    name: PLASTIC_T_BALL_BAT.name,
    kind: 'skin' as const,
    slot: PLASTIC_T_BALL_BAT.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'May 2027',
    price: '[YOUR PRICE]',
    note: 'Weapon skin for any one-handed blunt weapon. Same percentage as the other Team Blue choices, [TIER %].',
    tier: 'team-blue' as const,
    bonus: { stat: STAT_PLACEHOLDER, percent: TIER_PERCENT_PLACEHOLDER },
    inGamePath: 'coins' as const,
    item: PLASTIC_T_BALL_BAT,
  }),
  Object.freeze({
    id: BLUS_PET_TEE.id,
    name: BLUS_PET_TEE.name,
    kind: 'skin' as const,
    slot: BLUS_PET_TEE.slot,
    howEarned: 'Blue Charge' as const,
    coinStoreRelease: 'Never',
    price: '[YOUR PRICE]',
    note: "Oversized white pet tee printed \"You're my boy blue!!!\". Bought with Blue Charge only, never in the coin store or through the game's own Square account. Cosmetic only.",
    tier: null,
    bonus: null,
    inGamePath: 'blue-charge' as const,
    item: BLUS_PET_TEE,
  }),
  Object.freeze({
    id: WAVE_ONE_FOUNDER_PET.id,
    name: WAVE_ONE_FOUNDER_PET.name,
    kind: 'skin' as const,
    slot: WAVE_ONE_FOUNDER_PET.slot,
    howEarned: 'Square' as const,
    coinStoreRelease: 'Never',
    price: '[YOUR PRICE]',
    note: 'Founder pet; troll riding a drift cart with Live NPC memory and clean dad jokes. Never in the coin store. Cosmetic only.',
    tier: null,
    bonus: null,
    inGamePath: 'founder-exception' as const,
    item: WAVE_ONE_FOUNDER_PET,
  }),
  Object.freeze({
    id: KID_SAFE_BASICS.top.id,
    name: KID_SAFE_BASICS.top.name,
    kind: 'basic' as const,
    slot: KID_SAFE_BASICS.top.slot,
    howEarned: 'always owned' as const,
    coinStoreRelease: 'Never',
    price: 'Free / Always Owned',
    note: 'Plain tee from the kid-safe basics default set. Always owned by every character.',
    tier: null,
    bonus: null,
    inGamePath: 'always-owned' as const,
    item: KID_SAFE_BASICS.top,
  }),
  Object.freeze({
    id: KID_SAFE_BASICS.bottom.id,
    name: KID_SAFE_BASICS.bottom.name,
    kind: 'basic' as const,
    slot: KID_SAFE_BASICS.bottom.slot,
    howEarned: 'always owned' as const,
    coinStoreRelease: 'Never',
    price: 'Free / Always Owned',
    note: 'Plain trousers from the kid-safe basics default set. Always owned by every character.',
    tier: null,
    bonus: null,
    inGamePath: 'always-owned' as const,
    item: KID_SAFE_BASICS.bottom,
  }),
  Object.freeze({
    id: KID_SAFE_BASICS.shoes.id,
    name: KID_SAFE_BASICS.shoes.name,
    kind: 'basic' as const,
    slot: KID_SAFE_BASICS.shoes.slot,
    howEarned: 'always owned' as const,
    coinStoreRelease: 'Never',
    price: 'Free / Always Owned',
    note: 'Plain sneakers from the kid-safe basics default set. Always owned by every character.',
    tier: null,
    bonus: null,
    inGamePath: 'always-owned' as const,
    item: KID_SAFE_BASICS.shoes,
  }),
]);

/** Find an entry in Wave One catalogue by id (letter case insensitive). */
export function getCatalogueEntry(itemId: string): WaveOneCatalogueEntry | undefined {
  const target = itemId.toLowerCase();
  return WAVE_ONE_CATALOGUE.find((e) => e.id.toLowerCase() === target);
}

/** True if the item is exclusive to Blue Charge (cannot be bought with coins or money). */
export function isBlueChargeOnly(itemId: string): boolean {
  return itemId.toLowerCase() === BLUS_PET_TEE_ID.toLowerCase();
}

/**
 * True if the item can be bought with in-game currency (coins/Sols).
 * Never true for:
 *  - Blu's Tee (bought with Blue Charge only)
 *  - Founder pet TrollinlootNScoot (never in the coin store)
 *  - Kid-safe basics (free, always owned)
 * For standard Square skins, true only after the currency-store release date.
 */
export function canBuyWithCoins(
  itemId: string,
  now?: Date,
  config: WardrobeConfig = DEFAULT_WARDROBE_CONFIG,
): boolean {
  if (isBlueChargeOnly(itemId)) return false;
  if (isCurrencyStoreExcluded(itemId)) return false;
  if (KID_SAFE_BASIC_IDS.some((b) => b.toLowerCase() === itemId.toLowerCase())) return false;

  const entry = getCatalogueEntry(itemId);
  if (!entry || entry.kind !== 'skin') return false;
  if (entry.howEarned !== 'Square') return false;
  if (!now) return true;
  return isInCurrencyStore(entry.item as Skin, now, config);
}

/**
 * True if the item can be purchased with real-world money (Square shop).
 * Never true for:
 *  - Blu's Tee (bought with Blue Charge only, never in the game's own Square account shop)
 *  - Kid-safe basics (always owned, never sold)
 */
export function canBuyWithMoney(itemId: string): boolean {
  if (isBlueChargeOnly(itemId)) return false;
  if (KID_SAFE_BASIC_IDS.some((b) => b.toLowerCase() === itemId.toLowerCase())) return false;

  const entry = getCatalogueEntry(itemId);
  if (!entry || entry.kind !== 'skin') return false;
  return entry.howEarned === 'Square';
}
