/**
 * Founder Pet (`TrollinlootNScoot`) Light Interaction around Fable, Fable's Armor Truck,
 * Sup@, and Cod3x / Mollama.
 *
 * Ruling (Josh, 2026-11-08 18:27):
 *  - The pet is star-struck around Sup@ and Fable above all, friendly to every NPC, and
 *    rolls up in its drift cart offering a tow, for example:
 *    "I can tow ya if you're ever stuck. Three-wheel drive!"
 *  - Keep its lines short and playful.
 *  - Sup@ almost never answers; on the rare occasion it does, the only reply ever is:
 *    "Keep Dreaming Trollz"
 *  - When the pet sees the NPCs Cod3x or Mollama it says:
 *    "If you ever get stuck in reverse, knee-deep in code, I can put this thing in three-wheel drive and do a Trollz Pull Request."
 *  - No new lore beyond this.
 */

import { FOUNDER_PET_SKIN_ID } from '../wardrobe/release.ts';
import { FABLE_SMITH_NPC_ID, FABLES_ARMOR_TRUCK_ID, type Vec3Tuple } from './types.ts';

export const TROLL_DRIFT_CART_TOW_LINE =
  "I can tow ya if you're ever stuck. Three-wheel drive!" as const;

export const TROLL_COD3X_MOLLAMA_LINE =
  'If you ever get stuck in reverse, knee-deep in code, I can put this thing in three-wheel drive and do a Trollz Pull Request.' as const;

export const SUP_ONLY_REPLY_TO_TROLL = 'Keep Dreaming Trollz' as const;

/** Sup@ almost never answers (5% deterministic roll threshold). */
export const SUP_RARE_REPLY_THRESHOLD = 0.05 as const;

/** Proximity radius (meters) within which the pet greets nearby targets. */
export const TROLL_PET_INTERACTION_RADIUS_M = 8.0 as const;

export type TrollInteractionTargetId =
  | typeof FABLE_SMITH_NPC_ID
  | typeof FABLES_ARMOR_TRUCK_ID
  | 'sup-companion'
  | 'Sup@'
  | 'cod3x'
  | 'c0d3x-rider'
  | 'mollama'
  | string;

export interface TrollPetInteractionInput {
  readonly petId?: string;
  readonly targetId: TrollInteractionTargetId;
  readonly petPosition?: Vec3Tuple;
  readonly targetPosition?: Vec3Tuple;
  /** Deterministic roll in [0, 1) used to decide if Sup@ gives its rare reply. */
  readonly supRareRoll01?: number;
}

export interface TrollPetInteractionResult {
  readonly triggered: boolean;
  readonly petId: typeof FOUNDER_PET_SKIN_ID;
  readonly targetId: string;
  readonly vehicle: 'three-wheel-drift-cart';
  readonly friendlyToAllNpcs: true;
  readonly starStruck: boolean;
  readonly offersTow: boolean;
  readonly petLine: string | null;
  readonly supReply: typeof SUP_ONLY_REPLY_TO_TROLL | null;
}

function isStarStruckTarget(normalizedId: string): boolean {
  return (
    normalizedId === FABLE_SMITH_NPC_ID ||
    normalizedId === 'fable' ||
    normalizedId === FABLES_ARMOR_TRUCK_ID ||
    normalizedId === 'sup@' ||
    normalizedId === 'sup-companion' ||
    normalizedId === 'supo'
  );
}

function isSupTarget(normalizedId: string): boolean {
  return normalizedId === 'sup@' || normalizedId === 'sup-companion' || normalizedId === 'supo';
}

function isCod3xOrMollamaTarget(normalizedId: string): boolean {
  return (
    normalizedId === 'cod3x' ||
    normalizedId === 'c0d3x' ||
    normalizedId === 'c0d3x-rider' ||
    normalizedId === 'mollama' ||
    normalizedId === 'mollma'
  );
}

/**
 * Evaluates the light interaction when the founder pet `TrollinlootNScoot` is near
 * Fable, Fable's Armor Truck, Sup@, Cod3x/Mollama, or any other NPC.
 */
export function evaluateFounderPetInteraction(
  input: TrollPetInteractionInput,
): TrollPetInteractionResult {
  const petId = input.petId ?? FOUNDER_PET_SKIN_ID;
  if (petId.toLowerCase() !== FOUNDER_PET_SKIN_ID.toLowerCase()) {
    return Object.freeze({
      triggered: false,
      petId: FOUNDER_PET_SKIN_ID,
      targetId: input.targetId,
      vehicle: 'three-wheel-drift-cart',
      friendlyToAllNpcs: true,
      starStruck: false,
      offersTow: false,
      petLine: null,
      supReply: null,
    });
  }

  if (input.petPosition && input.targetPosition) {
    const dist = Math.hypot(
      input.petPosition[0] - input.targetPosition[0],
      input.petPosition[1] - input.targetPosition[1],
      input.petPosition[2] - input.targetPosition[2],
    );
    if (dist > TROLL_PET_INTERACTION_RADIUS_M) {
      return Object.freeze({
        triggered: false,
        petId: FOUNDER_PET_SKIN_ID,
        targetId: input.targetId,
        vehicle: 'three-wheel-drift-cart',
        friendlyToAllNpcs: true,
        starStruck: false,
        offersTow: false,
        petLine: null,
        supReply: null,
      });
    }
  }

  const normalized = input.targetId.trim().toLowerCase();
  const starStruck = isStarStruckTarget(normalized);
  const seesCod3xOrMollama = isCod3xOrMollamaTarget(normalized);
  const seesSup = isSupTarget(normalized);

  const petLine = seesCod3xOrMollama
    ? TROLL_COD3X_MOLLAMA_LINE
    : TROLL_DRIFT_CART_TOW_LINE;

  let supReply: typeof SUP_ONLY_REPLY_TO_TROLL | null = null;
  if (seesSup) {
    const roll = input.supRareRoll01 ?? 0.5;
    if (roll >= 0 && roll < SUP_RARE_REPLY_THRESHOLD) {
      supReply = SUP_ONLY_REPLY_TO_TROLL;
    }
  }

  return Object.freeze({
    triggered: true,
    petId: FOUNDER_PET_SKIN_ID,
    targetId: input.targetId,
    vehicle: 'three-wheel-drift-cart',
    friendlyToAllNpcs: true,
    starStruck,
    offersTow: true,
    petLine,
    supReply,
  });
}
