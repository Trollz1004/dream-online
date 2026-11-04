/**
 * Wardrobe rules: kid-safe basics.
 *
 * The character creator shapes a body only. Every character leaves it in this one plain
 * set, the same for everyone (docs/gdd/07-character-creation.md). It is defined here once.
 * The creator's exit test imports KID_SAFE_BASICS and isKidSafeBasicsOutfit from this file.
 * Basics are free, belong to every account, and are never in the shop catalog.
 */

import { BASIC_SLOTS, type BasicItem, type BasicSlot, type Outfit } from './types.ts';

function basic(id: string, name: string, slot: BasicSlot): BasicItem {
  return Object.freeze({ kind: 'basic' as const, id, name, slot });
}

/** The default wardrobe set, one plain item per basic slot. Frozen. */
export const KID_SAFE_BASICS: Readonly<Record<BasicSlot, BasicItem>> = Object.freeze({
  top: basic('basics-top', 'Plain Tee', 'top'),
  bottom: basic('basics-bottom', 'Plain Trousers', 'bottom'),
  shoes: basic('basics-shoes', 'Plain Sneakers', 'shoes'),
});

/** Ids of the basics, for quick membership checks. */
export const KID_SAFE_BASIC_IDS: readonly string[] = Object.freeze(BASIC_SLOTS.map((s) => KID_SAFE_BASICS[s].id));

/** A fresh outfit of the default set. This is what every character leaves the creator wearing. */
export function createDefaultOutfit(): Outfit {
  return Object.freeze(
    Object.fromEntries(BASIC_SLOTS.map((slot) => [slot, KID_SAFE_BASICS[slot].id])) as Record<BasicSlot, string>,
  );
}

/**
 * The creator's exit check. True only when the outfit is exactly the default set:
 * every basic slot filled with its basic item, and nothing else worn.
 */
export function isKidSafeBasicsOutfit(outfit: unknown): boolean {
  if (typeof outfit !== 'object' || outfit === null || Array.isArray(outfit)) return false;
  const keys = Reflect.ownKeys(outfit);
  if (keys.length !== BASIC_SLOTS.length) return false;
  const worn = outfit as Record<string, unknown>;
  return BASIC_SLOTS.every((slot) => keys.includes(slot) && worn[slot] === KID_SAFE_BASICS[slot].id);
}
