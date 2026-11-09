/**
 * Town Smith (Fable), Fable's Anvil & Fable's Armor Truck — Shared Types.
 *
 * Rulings:
 *  - docs/gdd/GAME-SYSTEMS-RULING-2026-11-07.md (stat rule: same percentage per tier;
 *    choice is which stat, never how much; Fable's Anvil is a cash convenience item capped
 *    at 3 to 5 charges by level and HP/mana/energy pool size).
 *  - Josh's 2026-11-08 rulings:
 *    1. One smith NPC (Fable, `fable-smith`) with three services: `repair`, `upgrade`, `enhance`.
 *    2. Town smith, Fable's Armor Truck on its night route, and the truck/campsite summoned by
 *       Fable's Anvil all share one service table and one price list.
 *    3. Nothing here buys power; the Anvil only saves the walk.
 */

import type { ConvenienceItem, SkinSlot } from '../wardrobe/types.ts';

export const FABLE_SMITH_NPC_ID = 'fable-smith' as const;
export const FABLES_ANVIL_ITEM_ID = 'fables-anvil' as const;
export const FABLES_ARMOR_TRUCK_ID = 'fables-armor-truck' as const;

export const SMITH_SERVICE_IDS = ['repair', 'upgrade', 'enhance'] as const;
export type SmithServiceId = (typeof SMITH_SERVICE_IDS)[number];

export const SMITH_LOCATIONS = ['town', 'route-truck', 'summoned-camp'] as const;
export type SmithLocationKind = (typeof SMITH_LOCATIONS)[number];

export const TIER_STEPS = [1, 2, 3] as const;
export type TierStep = (typeof TIER_STEPS)[number];

/**
 * Ruled tier percentages (docs/gdd/GAME-SYSTEMS-RULING-2026-11-07.md):
 * every item at a given tier step carries the exact same percentage.
 * The player's choice is which stat, never how much.
 */
export const TIER_STEP_PERCENTS: Readonly<Record<TierStep, number>> = Object.freeze({
  1: 5,
  2: 10,
  3: 15,
});

/**
 * Deterministic non-gambling enhancement track (zero break, zero fail-stacks).
 */
export const ENHANCEMENT_TRACK = ['common', 'uncommon', 'rare', 'legend', 'mythos'] as const;
export type EnhancementRarity = (typeof ENHANCEMENT_TRACK)[number];

export const ENHANCEMENT_BONUS_PERCENTS: Readonly<Record<EnhancementRarity, number>> = Object.freeze({
  common: 0,
  uncommon: 2,
  rare: 4,
  legend: 6,
  mythos: 8,
});

export const GEAR_STAT_CHOICES = [
  'experience',
  'fishing-experience',
  'cooking-experience',
  'vitality-hp',
  'melee-focus',
  'magic-focus',
  'ranged-focus',
] as const;
export type GearStatChoice = (typeof GEAR_STAT_CHOICES)[number];

export interface SmithGearItem {
  readonly id: string;
  readonly name: string;
  readonly slot: SkinSlot;
  readonly durability: number;
  readonly maxDurability: number;
  readonly tierStep: TierStep;
  readonly statChoice: GearStatChoice;
  /** Always equals TIER_STEP_PERCENTS[tierStep] per the same-percentage-per-tier rule. */
  readonly statPercent: number;
  readonly enhancement: EnhancementRarity;
  /** Always equals ENHANCEMENT_BONUS_PERCENTS[enhancement]. */
  readonly enhancementBonusPercent: number;
}

export interface UpgradeStepCost {
  readonly targetTierStep: TierStep;
  readonly solsCost: number;
  readonly materialsCost: number;
  readonly statPercent: number;
}

export interface EnhanceStepCost {
  readonly targetEnhancement: EnhancementRarity;
  readonly solsCost: number;
  readonly catalystsCost: number;
  readonly enhancementBonusPercent: number;
}

export interface SmithPriceList {
  readonly repairSolsPerDurabilityPoint: number;
  readonly upgradeCosts: Readonly<Record<2 | 3, UpgradeStepCost>>;
  readonly enhanceCosts: Readonly<Record<Exclude<EnhancementRarity, 'common'>, EnhanceStepCost>>;
}

export interface SmithServiceDefinition {
  readonly id: SmithServiceId;
  readonly label: string;
  readonly summary: string;
}

export interface SmithServiceTable {
  readonly smithNpcId: typeof FABLE_SMITH_NPC_ID;
  readonly services: Readonly<Record<SmithServiceId, SmithServiceDefinition>>;
  readonly serviceOrder: readonly SmithServiceId[];
  readonly prices: SmithPriceList;
}

export interface SmithPlayerWallet {
  readonly sols: number;
  readonly tierMaterials?: number;
  readonly forgeCatalysts?: number;
}

export interface SmithServicePriceQuote {
  readonly serviceId: SmithServiceId;
  readonly location: SmithLocationKind;
  readonly solsCost: number;
  readonly materialsCost: number;
  readonly catalystsCost: number;
  readonly canApply: boolean;
  readonly reason: string;
}

export interface SmithServiceResult {
  readonly ok: boolean;
  readonly reason: string;
  readonly location: SmithLocationKind;
  readonly serviceId: SmithServiceId;
  readonly item: SmithGearItem;
  readonly quote: SmithServicePriceQuote;
  readonly remainingSols: number;
  readonly remainingMaterials: number;
  readonly remainingCatalysts: number;
}

export interface SmithNpcDefinition {
  readonly npcId: typeof FABLE_SMITH_NPC_ID;
  readonly name: 'Fable';
  readonly title: string;
  readonly zoneId: string;
  readonly memoryScopes: readonly ('player' | 'npc' | 'zone' | 'world_event')[];
  readonly approvedActions: readonly ('suggest_hint' | 'suggest_marker' | 'suggest_quest_note')[];
  readonly serviceTable: SmithServiceTable;
}

export type Vec3Tuple = readonly [number, number, number];

export interface AnvilCapInput {
  readonly level: number;
  readonly hpPool?: number;
  readonly manaPool?: number;
  readonly energyPool?: number;
  readonly poolSize?: number;
}

export interface FablesAnvilState {
  readonly item: ConvenienceItem;
  readonly maxCharges: 3 | 4 | 5;
  readonly charges: number;
  readonly level: number;
  readonly effectivePoolSize: number;
}

export type CampDespawnReason = 'active' | 'player-walked-away' | 'timeout' | 'manual-pack';

export interface ActiveAnvilCamp {
  readonly campId: string;
  readonly active: boolean;
  readonly despawnReason: CampDespawnReason;
  readonly location: 'summoned-camp';
  readonly campShape: 'tow-behind-triangle-tent';
  readonly truckId: typeof FABLES_ARMOR_TRUCK_ID;
  readonly smithNpc: SmithNpcDefinition;
  readonly serviceTable: SmithServiceTable;
  readonly position: Vec3Tuple;
  readonly playerSpawnOrigin: Vec3Tuple;
  readonly spawnedAtSec: number;
  readonly timeoutSec: number;
  readonly despawnRadiusMeters: number;
}
