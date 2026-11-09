/**
 * Fable's Anvil — Cash Convenience Item, 3-to-5 Charge Cap & Portable Campsite Lifecycle.
 *
 * Rulings (Josh, 2026-11-07 & 2026-11-08):
 *  - Fable's Anvil is a cash convenience item (`saves: 'walking'`). Nothing here buys power.
 *  - Uses are capped at 3 to 5 by the player's level and the size of the HP, mana or energy pool.
 *  - Using it calls Fable's Armor Truck + pop-up camper next to the player
 *    and spawns the same smith NPC (`fable-smith`) with the same service table (`SMITH_SERVICE_TABLE`).
 *  - The camp despawns when the player walks away or after a timeout.
 */

import { defineConvenienceItem } from '../wardrobe/guard.ts';
import type { ConvenienceItem } from '../wardrobe/types.ts';
import {
  FABLE_SMITH_NPC,
  SMITH_SERVICE_TABLE,
  performSmithService,
} from './services.ts';
import {
  FABLES_ANVIL_ITEM_ID,
  FABLES_ARMOR_TRUCK_ID,
  type ActiveAnvilCamp,
  type AnvilCapInput,
  type FablesAnvilState,
  type SmithGearItem,
  type SmithPlayerWallet,
  type SmithServiceId,
  type SmithServiceResult,
  type Vec3Tuple,
} from './types.ts';

export const ANVIL_MIN_CHARGES = 3 as const;
export const ANVIL_MAX_CHARGES = 5 as const;

/** Player level threshold where the Anvil charge cap gains +1 charge. */
export const ANVIL_LEVEL_BONUS_THRESHOLD = 20 as const;

/**
 * Pool size threshold (across HP, mana, or energy pool) where the Anvil charge cap
 * gains +1 charge. Supports standard HP/mana builds as well as Monk energy builds.
 */
export const ANVIL_POOL_BONUS_THRESHOLD = 500 as const;

/** Default camp lifetime before automatic despawn (seconds). */
export const CAMP_DEFAULT_TIMEOUT_SEC = 180 as const;

/** Default maximum distance (meters) before the camp despawns when the player walks away. */
export const CAMP_DEFAULT_DESPAWN_RADIUS_M = 18 as const;

/**
 * Fable's Anvil item definition, validated through the wardrobe pay-to-win guard
 * (`saves: 'walking'`, zero combat stats).
 */
export const FABLES_ANVIL_ITEM: ConvenienceItem = defineConvenienceItem({
  id: FABLES_ANVIL_ITEM_ID,
  name: "Fable's Anvil",
  saves: 'walking',
});

/**
 * Resolves the largest active resource pool (HP, mana, or energy) for the charge cap rule.
 */
export function resolveEffectivePoolSize(input: AnvilCapInput): number {
  const candidates = [
    input.hpPool ?? 0,
    input.manaPool ?? 0,
    input.energyPool ?? 0,
    input.poolSize ?? 0,
  ].map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0));
  return Math.max(0, ...candidates);
}

/**
 * Computes the 3-to-5 consumable charge cap from the player's level and largest resource pool
 * (HP, mana, or energy).
 *
 * Boundaries:
 *  - Base cap is 3 (for level < 20 and pool < 500).
 *  - Level >= 20 adds +1 charge.
 *  - Pool (HP, mana, or energy) >= 500 adds +1 charge.
 *  - Clamped strictly to [3, 5].
 */
export function computeAnvilChargeCap(input: AnvilCapInput): 3 | 4 | 5 {
  const cleanLevel = Number.isFinite(input.level) ? Math.max(1, Math.floor(input.level)) : 1;
  const effectivePool = resolveEffectivePoolSize(input);

  const levelBonus = cleanLevel >= ANVIL_LEVEL_BONUS_THRESHOLD ? 1 : 0;
  const poolBonus = effectivePool >= ANVIL_POOL_BONUS_THRESHOLD ? 1 : 0;
  const total = Math.min(
    ANVIL_MAX_CHARGES,
    Math.max(ANVIL_MIN_CHARGES, ANVIL_MIN_CHARGES + levelBonus + poolBonus),
  );
  return total as 3 | 4 | 5;
}

/**
 * Creates a frozen `FablesAnvilState` with charges clamped to `[0, maxCharges]`.
 */
export function createAnvilState(
  input: AnvilCapInput,
  initialCharges?: number,
): FablesAnvilState {
  const maxCharges = computeAnvilChargeCap(input);
  const effectivePoolSize = resolveEffectivePoolSize(input);
  const level = Number.isFinite(input.level) ? Math.max(1, Math.floor(input.level)) : 1;
  const rawCharges = initialCharges === undefined ? maxCharges : Math.floor(initialCharges);
  const charges = Math.max(0, Math.min(maxCharges, Number.isFinite(rawCharges) ? rawCharges : 0));

  return Object.freeze({
    item: FABLES_ANVIL_ITEM,
    maxCharges,
    charges,
    level,
    effectivePoolSize,
  });
}

export interface UseAnvilOptions {
  readonly nowSec?: number;
  readonly timeoutSec?: number;
  readonly despawnRadiusMeters?: number;
  readonly spawnOffset?: Vec3Tuple;
  readonly campId?: string;
}

export type UseAnvilResult =
  | {
      readonly ok: true;
      readonly state: FablesAnvilState;
      readonly camp: ActiveAnvilCamp;
    }
  | {
      readonly ok: false;
      readonly reason: 'no-charges-remaining';
      readonly state: FablesAnvilState;
      readonly camp: null;
    };

/**
 * Consumes 1 charge of Fable's Anvil to summon Fable's Armor Truck and its pop-up camper
 * next to the player, with the same smith NPC (`FABLE_SMITH_NPC`)
 * and the same service table (`SMITH_SERVICE_TABLE`).
 * Refuses when `state.charges <= 0`.
 */
export function useFablesAnvil(
  state: FablesAnvilState,
  playerPosition: Vec3Tuple,
  options: UseAnvilOptions = {},
): UseAnvilResult {
  if (state.charges <= 0) {
    return Object.freeze({
      ok: false,
      reason: 'no-charges-remaining',
      state,
      camp: null,
    });
  }

  const offset: Vec3Tuple = options.spawnOffset ?? [2.4, 0, -1.6];
  const campPos: Vec3Tuple = Object.freeze([
    playerPosition[0] + offset[0],
    playerPosition[1] + offset[1],
    playerPosition[2] + offset[2],
  ]);
  const originCopy: Vec3Tuple = Object.freeze([
    playerPosition[0],
    playerPosition[1],
    playerPosition[2],
  ]);

  const spawnedAtSec = options.nowSec ?? 0;
  const timeoutSec = Math.max(1, options.timeoutSec ?? CAMP_DEFAULT_TIMEOUT_SEC);
  const despawnRadiusMeters = Math.max(1, options.despawnRadiusMeters ?? CAMP_DEFAULT_DESPAWN_RADIUS_M);

  const nextState: FablesAnvilState = Object.freeze({
    ...state,
    charges: state.charges - 1,
  });

  const camp: ActiveAnvilCamp = Object.freeze({
    campId: options.campId ?? `anvil-camp-${spawnedAtSec}-${nextState.charges}`,
    active: true,
    despawnReason: 'active',
    location: 'summoned-camp',
    campShape: 'tow-behind-triangle-tent',
    truckId: FABLES_ARMOR_TRUCK_ID,
    smithNpc: FABLE_SMITH_NPC,
    serviceTable: SMITH_SERVICE_TABLE,
    position: campPos,
    playerSpawnOrigin: originCopy,
    spawnedAtSec,
    timeoutSec,
    despawnRadiusMeters,
  });

  return Object.freeze({
    ok: true,
    state: nextState,
    camp,
  });
}

/**
 * Updates an active campsite based on the player's current position and elapsed world time.
 * Despawns the camp when the player walks beyond `despawnRadiusMeters` or when `timeoutSec` elapses.
 */
export function updateAnvilCamp(
  camp: ActiveAnvilCamp,
  playerPosition: Vec3Tuple,
  currentTimeSec: number,
): ActiveAnvilCamp {
  if (!camp.active) {
    return camp;
  }

  const dx = playerPosition[0] - camp.position[0];
  const dy = playerPosition[1] - camp.position[1];
  const dz = playerPosition[2] - camp.position[2];
  const dist = Math.hypot(dx, dy, dz);

  if (dist > camp.despawnRadiusMeters) {
    return Object.freeze({
      ...camp,
      active: false,
      despawnReason: 'player-walked-away',
    });
  }

  if (currentTimeSec - camp.spawnedAtSec >= camp.timeoutSec) {
    return Object.freeze({
      ...camp,
      active: false,
      despawnReason: 'timeout',
    });
  }

  return camp;
}

/**
 * Runs a smith service at a summoned Fable's Anvil camp.
 * Refuses if the camp has despawned; otherwise delegates to the shared `performSmithService`.
 */
export function performCampSmithService(
  camp: ActiveAnvilCamp,
  serviceId: SmithServiceId,
  item: SmithGearItem,
  wallet: SmithPlayerWallet,
): SmithServiceResult {
  if (!camp.active) {
    return Object.freeze({
      ok: false,
      reason: 'camp-despawned',
      location: 'summoned-camp',
      serviceId,
      item,
      quote: Object.freeze({
        serviceId,
        location: 'summoned-camp',
        solsCost: 0,
        materialsCost: 0,
        catalystsCost: 0,
        canApply: false,
        reason: 'camp-despawned',
      }),
      remainingSols: wallet.sols,
      remainingMaterials: wallet.tierMaterials ?? 0,
      remainingCatalysts: wallet.forgeCatalysts ?? 0,
    });
  }

  return performSmithService('summoned-camp', serviceId, item, wallet);
}
