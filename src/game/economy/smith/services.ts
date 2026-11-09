/**
 * Town Smith (Fable) — Single Service Table & Deterministic Repair / Upgrade / Enhance.
 *
 * Town smith, Fable's Armor Truck on its night route, and the summoned Fable's Anvil camp
 * all reference the exact same frozen `SMITH_SERVICE_TABLE` and `SMITH_PRICE_LIST`.
 */

import {
  ENHANCEMENT_BONUS_PERCENTS,
  ENHANCEMENT_TRACK,
  FABLE_SMITH_NPC_ID,
  GEAR_STAT_CHOICES,
  SMITH_LOCATIONS,
  SMITH_SERVICE_IDS,
  TIER_STEPS,
  TIER_STEP_PERCENTS,
  type EnhancementRarity,
  type GearStatChoice,
  type SmithGearItem,
  type SmithLocationKind,
  type SmithNpcDefinition,
  type SmithPlayerWallet,
  type SmithPriceList,
  type SmithServiceId,
  type SmithServicePriceQuote,
  type SmithServiceResult,
  type SmithServiceTable,
  type TierStep,
} from './types.ts';
import type { SkinSlot } from '../wardrobe/types.ts';

export const SMITH_PRICE_LIST: SmithPriceList = Object.freeze({
  repairSolsPerDurabilityPoint: 2,
  upgradeCosts: Object.freeze({
    2: Object.freeze({
      targetTierStep: 2 as const,
      solsCost: 250,
      materialsCost: 2,
      statPercent: TIER_STEP_PERCENTS[2],
    }),
    3: Object.freeze({
      targetTierStep: 3 as const,
      solsCost: 500,
      materialsCost: 4,
      statPercent: TIER_STEP_PERCENTS[3],
    }),
  }),
  enhanceCosts: Object.freeze({
    uncommon: Object.freeze({
      targetEnhancement: 'uncommon' as const,
      solsCost: 200,
      catalystsCost: 2,
      enhancementBonusPercent: ENHANCEMENT_BONUS_PERCENTS.uncommon,
    }),
    rare: Object.freeze({
      targetEnhancement: 'rare' as const,
      solsCost: 400,
      catalystsCost: 4,
      enhancementBonusPercent: ENHANCEMENT_BONUS_PERCENTS.rare,
    }),
    legend: Object.freeze({
      targetEnhancement: 'legend' as const,
      solsCost: 650,
      catalystsCost: 6,
      enhancementBonusPercent: ENHANCEMENT_BONUS_PERCENTS.legend,
    }),
    mythos: Object.freeze({
      targetEnhancement: 'mythos' as const,
      solsCost: 950,
      catalystsCost: 8,
      enhancementBonusPercent: ENHANCEMENT_BONUS_PERCENTS.mythos,
    }),
  }),
});

export const SMITH_SERVICE_TABLE: SmithServiceTable = Object.freeze({
  smithNpcId: FABLE_SMITH_NPC_ID,
  serviceOrder: SMITH_SERVICE_IDS,
  services: Object.freeze({
    repair: Object.freeze({
      id: 'repair' as const,
      label: 'Repair Gear',
      summary: 'Restores item durability to full at a flat Sols rate per missing point.',
    }),
    upgrade: Object.freeze({
      id: 'upgrade' as const,
      label: 'Upgrade Tier Step',
      summary: 'Raises an item one tier step while enforcing the same-percentage-per-tier rule.',
    }),
    enhance: Object.freeze({
      id: 'enhance' as const,
      label: 'Enhance Gear',
      summary: 'Advances an item one step along the deterministic non-gambling enhancement track.',
    }),
  }),
  prices: SMITH_PRICE_LIST,
});

export const FABLE_SMITH_NPC: SmithNpcDefinition = Object.freeze({
  npcId: FABLE_SMITH_NPC_ID,
  name: 'Fable',
  title: "Fable — Haven's Blacksmith",
  zoneId: 'haven_town_landing',
  memoryScopes: Object.freeze(['player', 'npc', 'zone', 'world_event'] as const),
  approvedActions: Object.freeze(['suggest_hint', 'suggest_marker', 'suggest_quest_note'] as const),
  serviceTable: SMITH_SERVICE_TABLE,
});

export function assertValidSmithLocation(location: string): asserts location is SmithLocationKind {
  if (!(SMITH_LOCATIONS as readonly string[]).includes(location)) {
    throw new Error(`Invalid smith location "${location}". Expected one of: ${SMITH_LOCATIONS.join(', ')}`);
  }
}

export function assertValidSmithService(serviceId: string): asserts serviceId is SmithServiceId {
  if (!(SMITH_SERVICE_IDS as readonly string[]).includes(serviceId)) {
    throw new Error(`Invalid smith service "${serviceId}". Expected one of: ${SMITH_SERVICE_IDS.join(', ')}`);
  }
}

/**
 * Returns the single shared service table for any valid smith location
 * (`'town'`, `'route-truck'`, or `'summoned-camp'`).
 */
export function getSmithServicesForLocation(location: SmithLocationKind): SmithServiceTable {
  assertValidSmithLocation(location);
  return SMITH_SERVICE_TABLE;
}

export interface CreateSmithGearInput {
  readonly id: string;
  readonly name: string;
  readonly slot?: SkinSlot;
  readonly durability: number;
  readonly maxDurability?: number;
  readonly tierStep?: TierStep;
  readonly statChoice?: GearStatChoice;
  readonly enhancement?: EnhancementRarity;
}

/**
 * Builds a frozen `SmithGearItem` whose `statPercent` always matches the canonical
 * percentage for its `tierStep` (same-percentage-per-tier rule).
 */
export function createSmithGearItem(input: CreateSmithGearInput): SmithGearItem {
  const maxDurability = Math.max(1, Math.round(input.maxDurability ?? 100));
  const durability = Math.max(0, Math.min(maxDurability, Math.round(input.durability)));
  const tierStep: TierStep = input.tierStep ?? 1;
  if (!TIER_STEPS.includes(tierStep)) {
    throw new Error(`Invalid tierStep: ${String(tierStep)}`);
  }
  const statChoice: GearStatChoice = input.statChoice ?? 'experience';
  if (!GEAR_STAT_CHOICES.includes(statChoice)) {
    throw new Error(`Invalid statChoice: ${String(statChoice)}`);
  }
  const enhancement: EnhancementRarity = input.enhancement ?? 'common';
  if (!ENHANCEMENT_TRACK.includes(enhancement)) {
    throw new Error(`Invalid enhancement: ${String(enhancement)}`);
  }

  return Object.freeze({
    id: input.id,
    name: input.name,
    slot: input.slot ?? 'weapon',
    durability,
    maxDurability,
    tierStep,
    statChoice,
    statPercent: TIER_STEP_PERCENTS[tierStep],
    enhancement,
    enhancementBonusPercent: ENHANCEMENT_BONUS_PERCENTS[enhancement],
  });
}

/**
 * Computes the price quote for a smith service at any location (`town`, `route-truck`, `summoned-camp`).
 * Because all three locations use `SMITH_SERVICE_TABLE`, the quote is identical across locations.
 */
export function quoteSmithService(
  location: SmithLocationKind,
  serviceId: SmithServiceId,
  item: SmithGearItem,
): SmithServicePriceQuote {
  const table = getSmithServicesForLocation(location);
  assertValidSmithService(serviceId);

  if (serviceId === 'repair') {
    const missing = Math.max(0, item.maxDurability - item.durability);
    if (missing === 0) {
      return Object.freeze({
        serviceId: 'repair',
        location,
        solsCost: 0,
        materialsCost: 0,
        catalystsCost: 0,
        canApply: false,
        reason: 'already-full-durability',
      });
    }
    return Object.freeze({
      serviceId: 'repair',
      location,
      solsCost: missing * table.prices.repairSolsPerDurabilityPoint,
      materialsCost: 0,
      catalystsCost: 0,
      canApply: true,
      reason: 'ready',
    });
  }

  if (serviceId === 'upgrade') {
    if (item.tierStep >= 3) {
      return Object.freeze({
        serviceId: 'upgrade',
        location,
        solsCost: 0,
        materialsCost: 0,
        catalystsCost: 0,
        canApply: false,
        reason: 'already-max-tier-step',
      });
    }
    const nextStep = (item.tierStep + 1) as 2 | 3;
    const stepCost = table.prices.upgradeCosts[nextStep];
    return Object.freeze({
      serviceId: 'upgrade',
      location,
      solsCost: stepCost.solsCost,
      materialsCost: stepCost.materialsCost,
      catalystsCost: 0,
      canApply: true,
      reason: 'ready',
    });
  }

  // serviceId === 'enhance'
  const currentIdx = ENHANCEMENT_TRACK.indexOf(item.enhancement);
  if (currentIdx < 0 || currentIdx >= ENHANCEMENT_TRACK.length - 1) {
    return Object.freeze({
      serviceId: 'enhance',
      location,
      solsCost: 0,
      materialsCost: 0,
      catalystsCost: 0,
      canApply: false,
      reason: 'already-max-enhancement',
    });
  }
  const nextRarity = ENHANCEMENT_TRACK[currentIdx + 1] as Exclude<EnhancementRarity, 'common'>;
  const enhanceCost = table.prices.enhanceCosts[nextRarity];
  return Object.freeze({
    serviceId: 'enhance',
    location,
    solsCost: enhanceCost.solsCost,
    materialsCost: 0,
    catalystsCost: enhanceCost.catalystsCost,
    canApply: true,
    reason: 'ready',
  });
}

/**
 * Executes a smith service (`repair`, `upgrade`, `enhance`) using the single shared
 * `SMITH_SERVICE_TABLE`. Produces identical item outcomes and wallet deductions at
 * `'town'`, `'route-truck'`, and `'summoned-camp'`.
 */
export function performSmithService(
  location: SmithLocationKind,
  serviceId: SmithServiceId,
  item: SmithGearItem,
  wallet: SmithPlayerWallet,
): SmithServiceResult {
  const quote = quoteSmithService(location, serviceId, item);
  const sols = wallet.sols;
  const materials = wallet.tierMaterials ?? 0;
  const catalysts = wallet.forgeCatalysts ?? 0;

  if (!quote.canApply) {
    return Object.freeze({
      ok: false,
      reason: quote.reason,
      location,
      serviceId,
      item,
      quote,
      remainingSols: sols,
      remainingMaterials: materials,
      remainingCatalysts: catalysts,
    });
  }

  if (sols < quote.solsCost) {
    return Object.freeze({
      ok: false,
      reason: 'insufficient-sols',
      location,
      serviceId,
      item,
      quote,
      remainingSols: sols,
      remainingMaterials: materials,
      remainingCatalysts: catalysts,
    });
  }

  if (materials < quote.materialsCost) {
    return Object.freeze({
      ok: false,
      reason: 'insufficient-materials',
      location,
      serviceId,
      item,
      quote,
      remainingSols: sols,
      remainingMaterials: materials,
      remainingCatalysts: catalysts,
    });
  }

  if (catalysts < quote.catalystsCost) {
    return Object.freeze({
      ok: false,
      reason: 'insufficient-catalysts',
      location,
      serviceId,
      item,
      quote,
      remainingSols: sols,
      remainingMaterials: materials,
      remainingCatalysts: catalysts,
    });
  }

  let updatedItem: SmithGearItem;
  if (serviceId === 'repair') {
    updatedItem = Object.freeze({
      ...item,
      durability: item.maxDurability,
    });
  } else if (serviceId === 'upgrade') {
    const nextStep = (item.tierStep + 1) as TierStep;
    updatedItem = Object.freeze({
      ...item,
      tierStep: nextStep,
      statPercent: TIER_STEP_PERCENTS[nextStep],
    });
  } else {
    const currentIdx = ENHANCEMENT_TRACK.indexOf(item.enhancement);
    const nextEnhancement = ENHANCEMENT_TRACK[currentIdx + 1]!;
    updatedItem = Object.freeze({
      ...item,
      enhancement: nextEnhancement,
      enhancementBonusPercent: ENHANCEMENT_BONUS_PERCENTS[nextEnhancement],
    });
  }

  return Object.freeze({
    ok: true,
    reason: 'applied',
    location,
    serviceId,
    item: updatedItem,
    quote,
    remainingSols: sols - quote.solsCost,
    remainingMaterials: materials - quote.materialsCost,
    remainingCatalysts: catalysts - quote.catalystsCost,
  });
}

/**
 * Builds a Live NPC Lab compatible context and proposal for Fable at any smith location
 * (matching `game/server/live-npc-lab/src/npcEngine.js` Four Laws of Every Live NPC).
 */
export function buildFableSmithNpcProposal(
  playerId: string,
  location: SmithLocationKind,
  item: SmithGearItem,
): {
  readonly npcId: typeof FABLE_SMITH_NPC_ID;
  readonly playerId: string;
  readonly location: SmithLocationKind;
  readonly reply: string;
  readonly proposedActions: readonly { readonly type: 'suggest_hint' | 'suggest_marker'; readonly label: string }[];
} {
  assertValidSmithLocation(location);
  const needsRepair = item.durability < item.maxDurability;
  const reply = needsRepair
    ? `Anvil's hot, ${playerId}. Your ${item.name} is down to ${item.durability}/${item.maxDurability} durability—same Sols price here as my town hearth.`
    : `Your ${item.name} is holding an edge. Ready for a tier step or a clean temper whenever you have the Sols.`;

  return Object.freeze({
    npcId: FABLE_SMITH_NPC_ID,
    playerId,
    location,
    reply,
    proposedActions: Object.freeze([
      Object.freeze({
        type: needsRepair ? ('suggest_hint' as const) : ('suggest_marker' as const),
        label: needsRepair
          ? `Repair ${item.name} with Fable (${quoteSmithService(location, 'repair', item).solsCost} Sols)`
          : `Inspect upgrade or enhance options for ${item.name}`,
      }),
    ]),
  });
}
