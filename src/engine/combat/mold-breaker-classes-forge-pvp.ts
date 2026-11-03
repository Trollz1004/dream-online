/**
 * DREAM ONLINE — Mold-Breaker Classes, Weapon Matrix, Hidden Awakened Skill-Tree Gems,
 * Non-Gambling Deterministic Forge, 7-Factor PvP Hierarchy & Dual-Era Ocean Sailing Engine
 *
 * Ruled by Founder Joshua Coleman (2026-11-01):
 * 1. Strict Class & Weapon Matrix + Awakened 3rd Class-Specific Weapon (in-game farmed only).
 * 2. Hidden Level-Based, Weapon-Specific, Skill-Tree Easter Eggs (never hand-held):
 *    - Ranger: Standard DEX + 2H Bow / 1H or Dual Crossbows (equal DPS: fast xbow vs heavy bow).
 *      Never dual-wields swords. Hidden Endgame Gem: Level 45+ Awakened Skill Tree + STR + Dagger.
 *    - Priest / Healer: Standard PSY + 2H Staff / Club healer. Hidden Endgame Gem: Level 45+ Awakened
 *      Skill Tree + INT + 1H Mace (never Club, never 2H Staff) + Shield + Full Party Buffs =
 *      Highest Achievable Melee Damage in the entire game.
 *    - Human Defender: Vitality/HP tank that absorbs party damage and scales solo/PvP damage off
 *      dropped +HP% gear + full Vitality skill points.
 *    - Dragon (Dekan / Velmaravex): Exclusive `Zhen` weapon (2H or Split Dual-Wield). Standard INT
 *      Sage or STR Split-Zhen. Can heal self/party on long CD off Full HP. Hidden Endgame Gem:
 *      Full Vitality / Max HP + Awakened Zhen Skill Tree unlocks massive AoE & single-target HP-scaled
 *      damage that counters even Human Defenders.
 *    - Monk: Cannot use caster staff; uses 2H Martial Long-Staff or Dual Swords. Spends `Energy`
 *      (the exact same Energy pool used for Sprint and Dash, never Mana or PSY).
 * 3. Marketplace Loot Drops with Random Stat Rolls (+HP%, +Melee ATK, +Magic ATK, +Ranged ATK)
 *    & 100% Non-Gambling Deterministic Forge (Common -> Uncommon -> Rare -> Legend -> Mythos)
 *    with progressive 3D weapon visuals (Growing Blue Flame, Orbiting Staff/Weapon Orbs).
 *    ZERO breaking, ZERO fail-stacks, ZERO real-money purchases ever.
 * 4. 7-Factor PvP Damage & Outcome Hierarchy:
 *    Real #1: Coordinated Team Target-Focus Execution ->
 *    1) Level > 2) Party-Up Group Auras > 3) Skill Paths & Hidden Gems >
 *    4) Weapon Base & Random Stat Rolls > 5) Forge Enhancement Tier >
 *    6) Player PvP Skill + Gear + Active Free Pet > 7) Crafted Elixirs & Party Food Buffs.
 * 5. Shipbuilding & Dual-Era Ocean Sailing:
 *    Day Dream (`day_dream_3d`) Wind-Powered Tall Ships (sails, no engines) <->
 *    Nightfall (`nightmare_3d`) High-Speed Neon Speedboats & Yachts to islands.
 */

export type DreamClassId =
  | 'human_warrior'
  | 'human_defender'
  | 'human_assassin'
  | 'ranger'
  | 'mage_warlock'
  | 'healer_priest'
  | 'monk'
  | 'dragon_velmaravex';

export type ResourcePoolType = 'mana' | 'psy' | 'sprint_dash_energy';

export type WeaponSubType =
  | '1h_sword'
  | '2h_sword'
  | '1h_mace'
  | '1h_club'
  | '1h_axe'
  | '2h_spear'
  | 'dagger'
  | 'shield'
  | '2h_bow'
  | '1h_crossbow'
  | 'dual_crossbow'
  | '2h_caster_staff'
  | '2h_monk_martial_staff'
  | '2h_zhen'
  | 'split_dual_zhen'
  | 'awakened_class_artifact';

export type LootRarityTier = 'common' | 'uncommon' | 'rare' | 'legend' | 'mythos';

export interface WeaponEquipValidation {
  allowed: boolean;
  reason: string;
  dpsParityNote?: string;
}

export interface CharacterSkillBuild {
  classId: DreamClassId;
  level: number;
  awakenedSkillTreeLevel: number; // 0..10 (10 = max awakened node)
  stats: {
    str: number;
    dex: number;
    int: number;
    psy: number;
    vitality: number;
  };
  mainHand: WeaponSubType;
  offHand: WeaponSubType | 'none';
  awakenedThirdWeaponUnlocked: boolean;
  equippedHpPercentBonus: number; // From random-stat marketplace/loot drops
  activePartyBuffCount: number; // e.g., Empower (+30% DMG), Priest +20% HP, Obli (60% DR), Sanctum Aura
  canCastCrossArchetypeSkill?: 'tornado_whirlwind' | null;
}

export interface BuildEvaluationResult {
  validEquipment: boolean;
  equipmentMessage: string;
  resourcePool: ResourcePoolType;
  isHiddenEndgameGemActive: boolean;
  hiddenGemName: string | null;
  effectiveMeleeDps: number;
  effectiveRangedDps: number;
  effectiveMagicDps: number;
  partyDamageAbsorptionPct: number;
  fullHpHealAmount: number;
  isHighestAchievableMeleeInGame: boolean;
}

/**
 * Validates strict class weapon & dual-wield rules ruled by Founder Joshua Coleman.
 */
export function validateClassWeaponLoadout(
  classId: DreamClassId,
  mainHand: WeaponSubType,
  offHand: WeaponSubType | 'none' = 'none'
): WeaponEquipValidation {
  // Rule 1: Universal Dagger rule — any class can use a dagger in off-hand or as a specialized primary
  if (mainHand === 'awakened_class_artifact') {
    return {
      allowed: true,
      reason: 'Class-specific 3rd Awakened Weapon unlocked via in-game farming and skill tree.',
    };
  }

  // Rule 2: Only Rangers can use Bows and 1H/Dual Crossbows
  if (mainHand === '2h_bow' || mainHand === '1h_crossbow' || mainHand === 'dual_crossbow') {
    if (classId !== 'ranger') {
      return {
        allowed: false,
        reason: 'Only Rangers can equip 2H Bows, 1H Crossbows, or Dual Crossbows.',
      };
    }
    if (mainHand === 'dual_crossbow' || mainHand === '1h_crossbow') {
      return {
        allowed: true,
        reason: 'Ranger Crossbow equipped: faster fire rate & animation speed, balanced to equal 2H Bow slower heavy-shot DPS.',
        dpsParityNote: 'FAST_ANIMATION_EQUAL_BOW_DPS',
      };
    }
    return {
      allowed: true,
      reason: 'Ranger 2H Bow equipped: slower draw animation with higher per-shot ranged skill damage, equal sustained DPS to Dual Crossbows.',
      dpsParityNote: 'HEAVY_SHOT_EQUAL_XBOW_DPS',
    };
  }

  // Rule 3: Rangers can NEVER use Swords or Dual Swords (only Bows, Crossbows, or Dagger)
  if (classId === 'ranger') {
    if (mainHand === '1h_sword' || mainHand === '2h_sword' || offHand === '1h_sword') {
      return {
        allowed: false,
        reason: 'Rangers cannot wield swords or dual-wield swords. Rangers use Bows, Crossbows, or an Endgame Awakened Dagger.',
      };
    }
    if (mainHand === 'dagger') {
      return {
        allowed: true,
        reason: 'Ranger Dagger equipped (requires Endgame Awakened STR Skill Tree to outperform DEX Bow/Crossbow).',
      };
    }
  }

  // Rule 4: Only Mage/Warlock and Healer/Priest can use 2H Caster Staffs (Monk cannot use caster staff)
  if (mainHand === '2h_caster_staff') {
    if (classId !== 'mage_warlock' && classId !== 'healer_priest') {
      return {
        allowed: false,
        reason: 'Only Mage, Wizard, Warlock, and Healer/Priest classes can wield a 2H Caster Staff.',
      };
    }
    if (offHand !== 'none') {
      return {
        allowed: false,
        reason: '2H Caster Staff occupies both hands and cannot be paired with a shield.',
      };
    }
    return { allowed: true, reason: '2H Caster Staff equipped.' };
  }

  // Rule 5: Monk uses 2H Martial Long-Staff, Dual Swords, or Dagger (never 2H Caster Staff)
  if (classId === 'monk') {
    if (mainHand === '2h_monk_martial_staff') {
      return {
        allowed: true,
        reason: 'Monk 2H Martial Long-Staff equipped (uses Sprint/Dash Energy pool).',
      };
    }
    if (mainHand === '1h_sword' && (offHand === '1h_sword' || offHand === 'dagger' || offHand === 'none')) {
      return {
        allowed: true,
        reason: 'Monk Dual Sword / Blade stance equipped (uses Sprint/Dash Energy pool).',
      };
    }
    if (mainHand === 'dagger') {
      return { allowed: true, reason: 'Monk Dagger equipped.' };
    }
    return {
      allowed: false,
      reason: 'Monk uses 2H Martial Long-Staff, Dual Swords, or Dagger.',
    };
  }

  // Rule 6: Only Dragon (Dekan / Velmaravex) can wield the Zhen (2H Zhen or Split Dual-Wield Zhen)
  if (mainHand === '2h_zhen' || mainHand === 'split_dual_zhen') {
    if (classId !== 'dragon_velmaravex') {
      return {
        allowed: false,
        reason: 'Only the Dragon (Dekan / Velmaravex) class can wield the Zhen.',
      };
    }
    return {
      allowed: true,
      reason:
        mainHand === 'split_dual_zhen'
          ? 'Dragon Split Dual-Wield Zhen equipped.'
          : 'Dragon 2H Zhen equipped.',
    };
  }

  // Rule 7: Human Dual-Wield & Off-Hand Rule — Must be 1H weapon (not xbow) with ONLY Dagger or Shield in off-hand
  if (
    classId === 'human_warrior' ||
    classId === 'human_defender' ||
    classId === 'human_assassin'
  ) {
    const validHumanMain: WeaponSubType[] = [
      '1h_sword',
      '2h_sword',
      '1h_mace',
      '1h_club',
      '1h_axe',
      '2h_spear',
      'dagger',
    ];
    if (!validHumanMain.includes(mainHand)) {
      return {
        allowed: false,
        reason: 'Invalid weapon type for Human melee class.',
      };
    }
    if (offHand !== 'none') {
      if (mainHand === '2h_sword' || mainHand === '2h_spear') {
        return {
          allowed: false,
          reason: 'Cannot equip an off-hand with a 2-handed weapon.',
        };
      }
      if (offHand !== 'dagger' && offHand !== 'shield') {
        return {
          allowed: false,
          reason: 'Humans using a 1H main-hand can only equip a Dagger or Shield in their off-hand.',
        };
      }
    }
    return {
      allowed: true,
      reason: 'Human 1H/2H weapon and Dagger/Shield off-hand validated.',
    };
  }

  // Rule 8: Healer / Priest with 1H Mace or 1H Club + Shield
  if (classId === 'healer_priest') {
    if (mainHand === '1h_mace' || mainHand === '1h_club' || mainHand === 'dagger') {
      if (offHand === 'none' || offHand === 'shield' || offHand === 'dagger') {
        return {
          allowed: true,
          reason: `Priest equipped ${mainHand} with ${offHand}.`,
        };
      }
    }
    return {
      allowed: false,
      reason: 'Healer/Priest can only wield 2H Caster Staff, 1H Mace, 1H Club, or Dagger (with Shield/Dagger off-hand).',
    };
  }

  // Rule 9: Mage / Warlock off-hand / dagger
  if (classId === 'mage_warlock' && mainHand === 'dagger') {
    return { allowed: true, reason: 'Mage/Warlock specialized Dagger equipped.' };
  }

  return { allowed: false, reason: 'Weapon combination not permitted for this class.' };
}

/**
 * Evaluates a character build, including the Hidden Endgame Awakened Skill-Tree Easter Eggs:
 * 1. Ranger: DEX Bow/Crossbow (equal sustained DPS) vs. Endgame Level 45+ Awakened Tree Lv10 STR + Dagger.
 * 2. Priest: PSY 2H Staff Healer vs. Endgame Level 45+ Awakened Tree Lv10 INT + 1H Mace (NOT Club, NOT Staff) + Shield + Full Party Buffs = Highest Melee DPS in game.
 * 3. Human Defender: Vitality + HP% gear damage scaling + party damage absorption.
 * 4. Dragon (Velmaravex): INT Sage / STR Split-Zhen + Full-HP Long-CD Heal + Hidden Endgame Full-Vitality Max-HP AoE/Single-Target Nuke.
 * 5. Monk: Uses Sprint/Dash Energy pool instead of Mana/PSY.
 */
export function evaluateMoldBreakerBuild(build: CharacterSkillBuild): BuildEvaluationResult {
  const equipCheck = validateClassWeaponLoadout(build.classId, build.mainHand, build.offHand);

  let resourcePool: ResourcePoolType = 'mana';
  if (build.classId === 'healer_priest') resourcePool = 'psy';
  if (build.classId === 'monk') resourcePool = 'sprint_dash_energy';

  if (!equipCheck.allowed) {
    return {
      validEquipment: false,
      equipmentMessage: equipCheck.reason,
      resourcePool,
      isHiddenEndgameGemActive: false,
      hiddenGemName: null,
      effectiveMeleeDps: 0,
      effectiveRangedDps: 0,
      effectiveMagicDps: 0,
      partyDamageAbsorptionPct: 0,
      fullHpHealAmount: 0,
      isHighestAchievableMeleeInGame: false,
    };
  }

  const isEndgameAwakened = build.level >= 45 && build.awakenedSkillTreeLevel >= 10;
  const partyMultiplier = 1 + Math.min(4, build.activePartyBuffCount) * 0.22; // Party > Solo always

  let isHiddenEndgameGemActive = false;
  let hiddenGemName: string | null = null;
  let effectiveMeleeDps = 100;
  let effectiveRangedDps = 0;
  let effectiveMagicDps = 0;
  let partyDamageAbsorptionPct = 0;
  let fullHpHealAmount = 0;
  let isHighestAchievableMeleeInGame = false;

  // --- 1. RANGER ---
  if (build.classId === 'ranger') {
    if (
      build.mainHand === '2h_bow' ||
      build.mainHand === '1h_crossbow' ||
      build.mainHand === 'dual_crossbow'
    ) {
      // Fast Dual Crossbow animation DPS === Slower 2H Bow heavy-shot DPS
      effectiveRangedDps = Math.round((420 + build.stats.dex * 6.5) * partyMultiplier);
    } else if (build.mainHand === 'dagger') {
      if (isEndgameAwakened && build.stats.str > build.stats.dex) {
        // HIDDEN EASTER EGG #1: Endgame Awakened STR + Dagger Ranger out-damages standard DEX Bow/Crossbow!
        isHiddenEndgameGemActive = true;
        hiddenGemName = 'Awakened Viper Sovereign (STR Dagger Easter Egg)';
        effectiveMeleeDps = Math.round(
          (520 + build.stats.str * 8.2 * (build.awakenedSkillTreeLevel / 10)) * partyMultiplier
        );
      } else {
        // Below endgame awakening or without STR investment, Dagger on a Ranger is weak ("silly")
        effectiveMeleeDps = Math.round(140 + build.stats.dex * 1.5);
      }
    }
    // Cross-archetype skill option: Ranger casting Tornado Whirlwind scaled by weapon & skill tree
    if (build.canCastCrossArchetypeSkill === 'tornado_whirlwind') {
      effectiveMagicDps = Math.round(
        (260 + (build.stats.dex + build.stats.int) * 3.4) * (1 + build.awakenedSkillTreeLevel * 0.08)
      );
    }
  }

  // --- 2. HEALER / PRIEST ---
  else if (build.classId === 'healer_priest') {
    // Standard PSY Healer with 2H Staff or 1H Club
    fullHpHealAmount = Math.round(600 + build.stats.psy * 12);

    // HIDDEN EASTER EGG #2: Endgame Awakened Priest with INT + 1H Mace (NOT Club, NOT 2H Staff) + Shield
    if (
      isEndgameAwakened &&
      build.mainHand === '1h_mace' &&
      build.offHand === 'shield' &&
      build.stats.int > build.stats.psy
    ) {
      isHiddenEndgameGemActive = true;
      hiddenGemName = 'Sanctified Warlock-Priest Reckoning (INT + 1H Mace + Shield)';
      const awakenedScale = build.awakenedSkillTreeLevel * 1.35;
      effectiveMeleeDps = Math.round(
        (680 + build.stats.int * 9.5 * awakenedScale) * partyMultiplier
      );
      if (build.activePartyBuffCount >= 4) {
        isHighestAchievableMeleeInGame = true;
      }
    } else {
      // Club or 2H Staff does NOT trigger the hidden melee hyper-carry multiplier
      effectiveMeleeDps = Math.round((180 + build.stats.str * 2.5) * partyMultiplier);
      effectiveMagicDps = Math.round((310 + build.stats.psy * 4.8) * partyMultiplier);
    }
  }

  // --- 3. HUMAN DEFENDER ---
  else if (build.classId === 'human_defender') {
    const maxHpPool = Math.round(
      (2500 + build.stats.vitality * 45) * (1 + build.equippedHpPercentBonus / 100)
    );
    partyDamageAbsorptionPct = Math.min(60, 25 + Math.floor(build.stats.vitality / 10));
    // Defender scales farming/PvP damage off Vitality + equipped +HP% random-stat gear
    effectiveMeleeDps = Math.round((340 + maxHpPool * 0.085) * partyMultiplier);
  }

  // --- 4. DRAGON (DEKAN / VELMARAVEX) ---
  else if (build.classId === 'dragon_velmaravex') {
    const maxHpPool = Math.round(
      (2800 + build.stats.vitality * 52) * (1 + build.equippedHpPercentBonus / 100)
    );
    // Long-cooldown self/party heal scaled off Full HP
    fullHpHealAmount = Math.round(maxHpPool * 0.45);

    if (
      isEndgameAwakened &&
      (build.mainHand === '2h_zhen' || build.mainHand === 'split_dual_zhen') &&
      build.stats.vitality > build.stats.int &&
      build.stats.vitality > build.stats.str
    ) {
      // HIDDEN EASTER EGG #3: Endgame Full-Vitality / Max-HP Dragon with Zhen
      isHiddenEndgameGemActive = true;
      hiddenGemName = 'Velmaravex Sovereign Dragon (Full-HP Vitality Zhen Awakening)';
      effectiveMeleeDps = Math.round(
        (560 + maxHpPool * 0.135 * (build.awakenedSkillTreeLevel / 10)) * partyMultiplier
      );
      effectiveMagicDps = Math.round(maxHpPool * 0.12 * partyMultiplier); // Massive HP-scaled AoE breath
    } else if (build.mainHand === 'split_dual_zhen' && build.stats.str >= build.stats.int) {
      // Standard STR Split Dual-Wield Zhen
      effectiveMeleeDps = Math.round((470 + build.stats.str * 6.8) * partyMultiplier);
    } else {
      // Standard INT Sage Dragon (INT-based, not PSY)
      effectiveMagicDps = Math.round((460 + build.stats.int * 6.6) * partyMultiplier);
      effectiveMeleeDps = Math.round((320 + build.stats.int * 4.2) * partyMultiplier);
    }
  }

  // --- 5. HUMAN ASSASSIN / WARRIOR & MONK ---
  else {
    effectiveMeleeDps = Math.round(
      (450 + (build.stats.str + build.stats.dex) * 5.6) * partyMultiplier
    );
  }

  return {
    validEquipment: true,
    equipmentMessage: equipCheck.reason,
    resourcePool,
    isHiddenEndgameGemActive,
    hiddenGemName,
    effectiveMeleeDps,
    effectiveRangedDps,
    effectiveMagicDps,
    partyDamageAbsorptionPct,
    fullHpHealAmount,
    isHighestAchievableMeleeInGame,
  };
}

// ============================================================================
// 2. MARKETPLACE RANDOM-STAT LOOT DROPS & ZERO-GAMBLING DETERMINISTIC FORGE
// ============================================================================

export interface MarketplaceLootItem {
  itemId: string;
  name: string;
  weaponType: WeaponSubType;
  rarity: LootRarityTier;
  randomStats: {
    hpPercentBonus: number;
    meleeAttackBonus: number;
    magicAttackBonus: number;
    rangedAttackBonus: number;
  };
  forgeVisualEffect: {
    flameColor: 'none' | 'azure_spark' | 'growing_blue_flame' | 'sovereign_blue_crimson_flame';
    flameScale: number;
    orbitingOrbsCount: number;
  };
  canBreakOnForge: false; // NEVER breaks in DREAM ONLINE
  usesFailStacks: false; // NEVER uses fail-stacks in DREAM ONLINE
  paidWithRealMoney: false; // Strictly in-game Sols / farmed catalysts only
}

const RARITY_ORDER: LootRarityTier[] = ['common', 'uncommon', 'rare', 'legend', 'mythos'];

export function getForgeVisualForRarity(rarity: LootRarityTier): MarketplaceLootItem['forgeVisualEffect'] {
  switch (rarity) {
    case 'common':
      return { flameColor: 'none', flameScale: 0.0, orbitingOrbsCount: 0 };
    case 'uncommon':
      return { flameColor: 'azure_spark', flameScale: 0.35, orbitingOrbsCount: 0 };
    case 'rare':
      return { flameColor: 'growing_blue_flame', flameScale: 0.75, orbitingOrbsCount: 1 };
    case 'legend':
      return { flameColor: 'growing_blue_flame', flameScale: 1.25, orbitingOrbsCount: 2 };
    case 'mythos':
      return { flameColor: 'sovereign_blue_crimson_flame', flameScale: 1.85, orbitingOrbsCount: 4 };
  }
}

/**
 * Deterministically upgrades an item one tier in the Non-Gambling Forge using
 * in-game farmed or Marketplace-traded Forge Catalysts.
 * Never breaks items, never downgrades, and never uses fail-stacks.
 */
export function forgeUpgradeItemDeterministic(
  item: MarketplaceLootItem,
  inGameCatalystsProvided: number,
  inGameSolsProvided: number
): {
  upgradedItem: MarketplaceLootItem;
  marketplaceTaxSols: number;
  success: boolean;
} {
  const currentIdx = RARITY_ORDER.indexOf(item.rarity);
  const nextIdx = Math.min(RARITY_ORDER.length - 1, currentIdx + 1);
  const nextRarity = RARITY_ORDER[nextIdx];
  const requiredCatalysts = (currentIdx + 1) * 2;
  const requiredSols = (currentIdx + 1) * 250;

  if (inGameCatalystsProvided < requiredCatalysts || inGameSolsProvided < requiredSols) {
    return {
      upgradedItem: item,
      marketplaceTaxSols: 0,
      success: false,
    };
  }

  const tierBoost = 1.28;
  const upgradedItem: MarketplaceLootItem = {
    ...item,
    rarity: nextRarity,
    randomStats: {
      hpPercentBonus: Math.round(item.randomStats.hpPercentBonus * tierBoost * 10) / 10,
      meleeAttackBonus: Math.round(item.randomStats.meleeAttackBonus * tierBoost),
      magicAttackBonus: Math.round(item.randomStats.magicAttackBonus * tierBoost),
      rangedAttackBonus: Math.round(item.randomStats.rangedAttackBonus * tierBoost),
    },
    forgeVisualEffect: getForgeVisualForRarity(nextRarity),
    canBreakOnForge: false,
    usesFailStacks: false,
    paidWithRealMoney: false,
  };

  return {
    upgradedItem,
    marketplaceTaxSols: Math.round(requiredSols * 0.05), // 5% in-game Sols market sink
    success: true,
  };
}

// ============================================================================
// 3. THE 7-FACTOR PVP DAMAGE & OUTCOME HIERARCHY
// ============================================================================

export interface PvpCombatantState {
  coordinatedSameTargetFocus: boolean; // The REAL #1 factor in group PvP
  characterLevel: number; // Factor #1 in damage math
  activePartyAurasCount: number; // Factor #2 (Party > Solo always)
  skillPathSynergyTier: number; // Factor #3 (1..5, 5 = Hidden Endgame Gem unlocked)
  weaponRandomStatScore: number; // Factor #4 (+HP%, +Melee/Mag/Range ATK)
  weaponForgeRarity: LootRarityTier; // Factor #5 (Common -> Mythos)
  pvpPlayerSkillAndArmorScore: number; // Factor #6 (tied with active free Pet summoned)
  isFreePetSummoned: boolean; // Factor #6 (+10% class boost if out; your fault if you forget!)
  activeCraftedElixirAndFoodBuffs: number; // Factor #7 (0..3 from Fishing/Alchemy/Cooking)
}

/**
 * Computes authoritative PvP combat power strictly enforcing Founder Joshua Coleman's
 * 7-Factor Priority Hierarchy (where Level > Party Auras > Skill Paths > Weapon Stats >
 * Forge Tier > PvP Skill/Gear/Pet > Crafted Elixirs/Food, and Coordinated Target Focus
 * multiplies party strike effectiveness).
 */
export function calculatePvpHierarchyScore(c: PvpCombatantState): {
  totalPvpPower: number;
  factorBreakdown: {
    levelWeight: number;
    partyAuraWeight: number;
    skillPathWeight: number;
    weaponStatsWeight: number;
    forgeTierWeight: number;
    skillArmorPetWeight: number;
    elixirFoodWeight: number;
    coordinatedFocusMultiplier: number;
  };
} {
  const rarityIdx = RARITY_ORDER.indexOf(c.weaponForgeRarity);

  // Strict descending weight scale so Factor N always outweighs Factor N+1:
  const levelWeight = c.characterLevel * 100; // #1: Level > All
  const partyAuraWeight = c.activePartyAurasCount * 420; // #2: Party Up > Solo Always
  const skillPathWeight = c.skillPathSynergyTier * 260; // #3: Skill Paths & Awakened Gems
  const weaponStatsWeight = c.weaponRandomStatScore * 1.8; // #4: Weapon Rolled Stats (+HP%, +ATK)
  const forgeTierWeight = (rarityIdx + 1) * 115; // #5: Forge Enhancement Tier
  const petBonus = c.isFreePetSummoned ? 85 : 0; // #6: Pet out (+10% edge if opponent forgets)
  const skillArmorPetWeight = c.pvpPlayerSkillAndArmorScore + petBonus; // #6
  const elixirFoodWeight = c.activeCraftedElixirAndFoodBuffs * 45; // #7: Crafted Elixirs & Feasts

  const baseSum =
    levelWeight +
    partyAuraWeight +
    skillPathWeight +
    weaponStatsWeight +
    forgeTierWeight +
    skillArmorPetWeight +
    elixirFoodWeight;

  // The REAL #1 in group PvP: Coordinated same-target focus
  const coordinatedFocusMultiplier = c.coordinatedSameTargetFocus ? 1.35 : 1.0;

  return {
    totalPvpPower: Math.round(baseSum * coordinatedFocusMultiplier),
    factorBreakdown: {
      levelWeight,
      partyAuraWeight,
      skillPathWeight,
      weaponStatsWeight,
      forgeTierWeight,
      skillArmorPetWeight,
      elixirFoodWeight,
      coordinatedFocusMultiplier,
    },
  };
}

// ============================================================================
// 4. DUAL-ERA OCEAN SAILING & ISLAND EXPLORATION (DAY DREAM SAILS <-> NIGHTFALL SPEEDBOATS/YACHTS)
// ============================================================================

export interface OceanVesselProfile {
  worldPhase: 'day_dream_3d' | 'nightmare_3d';
  vesselClass: 'sloop_sailboat' | 'galleon_tall_ship' | 'neon_speedboat' | 'cyber_yacht';
  propulsionType: 'wind_canvas_sails_no_engine' | 'twin_plasma_hydro_turbines';
  topSpeedKnots: number;
  canTravelToIslandsForFarmingAndLeveling: true;
  visualDescription: string;
}

export function resolveOceanVesselForWorldPhase(
  worldPhase: 'day_dream_3d' | 'nightmare_3d',
  sizeTier: 'scout' | 'flagship' = 'flagship'
): OceanVesselProfile {
  if (worldPhase === 'day_dream_3d') {
    return {
      worldPhase,
      vesselClass: sizeTier === 'flagship' ? 'galleon_tall_ship' : 'sloop_sailboat',
      propulsionType: 'wind_canvas_sails_no_engine',
      topSpeedKnots: sizeTier === 'flagship' ? 24 : 29,
      canTravelToIslandsForFarmingAndLeveling: true,
      visualDescription:
        'Old-school hand-crafted timber hull with billowing canvas sails, rope rigging, and zero engines.',
    };
  }
  return {
    worldPhase,
    vesselClass: sizeTier === 'flagship' ? 'cyber_yacht' : 'neon_speedboat',
    propulsionType: 'twin_plasma_hydro_turbines',
    topSpeedKnots: sizeTier === 'flagship' ? 54 : 68,
    canTravelToIslandsForFarmingAndLeveling: true,
    visualDescription:
      'Nightfall neon hydro-planing speedboat / luxury yacht slicing across dark bioluminescent ocean waves between island sanctuaries.',
  };
}


// ============================================================================
// 5. GOOGLE FLOW GAME VISION CANON ZONES (EXTRACTED FROM epicsceneofdream.mp4)
// ============================================================================

export interface GoogleFlowVisionZone {
  zoneId:
    | 'storm_dunes_awakening'
    | 'day_dream_harbor_port'
    | 'neon_metropolis_raid_plaza'
    | 'nightfall_gothic_neon_street';
  title: string;
  worldPhase: 'day_dream_3d' | 'nightmare_3d';
  signatureVisuals: string[];
  gameplayFeatures: string[];
}

export const GOOGLE_FLOW_VISION_ZONES: readonly GoogleFlowVisionZone[] = [
  {
    zoneId: 'storm_dunes_awakening',
    title: 'Storm-Lit Black Sand Dunes (Mythos Blue Rune Blade & Back Energy Core)',
    worldPhase: 'nightmare_3d',
    signatureVisuals: [
      'Glowing cyan-blue Mythos rune blade with electric arcs',
      'Back-mounted cyan plasma energy tube strapped to tactical vest',
      'Jet-trail sprint leap across black desert dunes toward storm lightning',
    ],
    gameplayFeatures: ['Sprint/Dash Energy propulsion', 'Mythos Non-Gambling Forge weapon aura'],
  },
  {
    zoneId: 'day_dream_harbor_port',
    title: 'Golden-Hour Cobblestone Harbor & Tall-Ship Port',
    worldPhase: 'day_dream_3d',
    signatureVisuals: [
      'Timber-frame medieval port shops with striped awnings and cherry-blossom trees',
      'Old-school wooden Tall Ships with canvas sails (wind_canvas_sails_no_engine) docked at stone pier',
      'Seagulls, harbor rowboats, and live AI townsfolk market stalls',
    ],
    gameplayFeatures: ['Shipbuilding & Ocean Sailing', 'Player-Driven Marketplace & AFK Dock Fishing'],
  },
  {
    zoneId: 'neon_metropolis_raid_plaza',
    title: 'Skyscraper DREAM ONLINE Neon Hologram Raid Plaza',
    worldPhase: 'nightmare_3d',
    signatureVisuals: [
      'Giant floating cyan neon DREAM ONLINE hologram between high-rise towers',
      '30+ coordinated party players firing red/cyan/gold skill beams in central city plaza',
      'Colossal horned Dragon / Raid Boss (Velmaravex) in the plaza center',
    ],
    gameplayFeatures: ['Coordinated Same-Target Party Raid', 'Dragon (Dekan / Velmaravex) Boss & Class Evolution'],
  },
  {
    zoneId: 'nightfall_gothic_neon_street',
    title: 'Rain-Slicked Nightfall Gothic-Neon Street & Goblin Treasure-Chest Trike Runner',
    worldPhase: 'nightmare_3d',
    signatureVisuals: [
      'Wet reflective flagstones with gothic cathedral spires and vertical cyan/magenta/gold neon signs',
      'Dual-Soul Founder/Hero in glowing-sigil trenchcoat & cyan visor with #UntilNoKidInNeed child-spirit link',
      'Floating GeminEYE water/plasma orb and Goblin Storage/Market Runner on a motorized treasure-chest trike',
    ],
    gameplayFeatures: ['GeminEYE Companion Orb', 'Storage Runner & Market Runner Treasure-Chest Trike Logistics'],
  },
];

// ============================================================================
// 6. REMAKE 100% YOURS + REA CLEAN-ROOM + RULE ONE SCREENSHOT COMPARISON GATE
// ============================================================================

/**
 * The `remake` "100% Yours" gate (Josh's ruling). It passes on three things:
 *   1. features matched: at least 98 percent of what the source does,
 *   2. a clear visual difference from the source,
 *   3. our own code.
 * It NEVER passes on likeness. There is deliberately no pixel-parity or visual-similarity
 * input here, and scrubbing brand or analytics strings out of copied code is not clean-room work.
 * Clean-room order: the lane that studies the source writes a feature spec only, a different lane
 * that never saw the source builds from that spec, and an independent judge runs this gate.
 */
export interface CleanRoomAndVisualGateCheck {
  reaCleanRoomStudied: boolean; // source studied through REA, output is a feature spec only
  builtByLaneThatNeverSawSource: boolean; // the builder worked from the spec, never the source
  thirdPartyGameEngineUsed: boolean;
  remakeSwapBoardPercent: number; // Must be 100%
  sourceBrandResidueCount: number; // Must be 0
  featureMatchPercent: number; // Must be >= 98 (share of the source's features the build covers)
  clearVisualDifferenceFromSource: boolean; // judged side by side; true means clearly different
  ownCode: boolean; // false if any source code was copied, even with brand strings scrubbed
  beforeReferenceScreenshotCaptured: boolean;
  afterFeatureScreenshotCaptured: boolean;
  independentJudgeSignedOff: boolean;
}

export function validateRemake100PercentYoursAndReaCleanRoom(
  check: CleanRoomAndVisualGateCheck
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!check.reaCleanRoomStudied) {
    reasons.push('Must study the source via REA (reverse-engineer-anything) and hand over a feature spec only.');
  }
  if (!check.builtByLaneThatNeverSawSource) {
    reasons.push('The build must come from a different lane that never saw the source, working from the feature spec.');
  }
  if (check.thirdPartyGameEngineUsed) {
    reasons.push('Third-party game engines (Unreal/Unity/Godot runtime) are forbidden; must use 100% in-house DREAM Engine.');
  }
  if (check.remakeSwapBoardPercent < 100 || check.sourceBrandResidueCount > 0) {
    reasons.push('Must pass Remake 100% Yours validation gate (100% swapped slots, 0 source-brand residue).');
  }
  if (!(check.featureMatchPercent >= 98)) {
    reasons.push('Features matched must be at least 98% of what the source does.');
  }
  if (!check.clearVisualDifferenceFromSource) {
    reasons.push('Must show a clear visual difference from the source. A close visual likeness never passes.');
  }
  if (!check.ownCode) {
    reasons.push('Must be our own code. Scrubbing brand or analytics strings out of copied code is not clean-room work.');
  }
  if (
    !check.beforeReferenceScreenshotCaptured ||
    !check.afterFeatureScreenshotCaptured
  ) {
    reasons.push(
      'Rule One Screenshot Comparison Gate failed: must capture the reference/before screenshot and the new feature screenshot (200 OK is not OK).'
    );
  }
  if (!check.independentJudgeSignedOff) {
    reasons.push('An independent judge must run the gate and sign off.');
  }
  return {
    passed: reasons.length === 0,
    reasons,
  };
}

// ============================================================================
// 7. UNIFIED 3-PANE WORKSPACE SHELL (GITHUB DESKTOP / CODEX / ANTIGRAVITY)
//    & 1-CLICK 5-HOUR RATE-LIMIT CAP MODEL SWITCHER ACROSS ALL NODES
// ============================================================================

export interface WorkspaceModelOption {
  id: string;
  label: string;
  provider: string;
  effort: 'Ultrathink' | 'High' | 'Medium';
  contextWindow: '1M' | '328K' | '256K' | '128K';
  fiveHourCapSafeFallback: boolean;
}

export const FIVE_HOUR_CAP_MODELS: readonly WorkspaceModelOption[] = [
  {
    id: 'claude-opus-5-5-ultrathink',
    label: 'Claude Opus 5.5',
    provider: 'Claude CLI OAuth (GM #1)',
    effort: 'Ultrathink',
    contextWindow: '328K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'claude-sonnet-5-5',
    label: 'Claude Sonnet 5.5',
    provider: 'GitHub Copilot / Claude CLI',
    effort: 'High',
    contextWindow: '328K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'gemini-4-argon-high',
    label: 'Gemini 4 Argon High',
    provider: 'Google AI Ultra (GM #1)',
    effort: 'Ultrathink',
    contextWindow: '1M',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'gemini-3-8-flash',
    label: 'Gemini 3.8 Flash',
    provider: 'Google AI Studio / Antigravity',
    effort: 'High',
    contextWindow: '1M',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'gpt-6-1-terra',
    label: 'GPT-6.1 Terra',
    provider: 'OpenAI Codex / Copilot (GM #3)',
    effort: 'High',
    contextWindow: '328K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'gpt-5-3-codex',
    label: 'GPT-5.3-Codex',
    provider: 'OpenAI Codex CLI',
    effort: 'Ultrathink',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'grok-4-7-reasoning',
    label: 'Grok 4.7',
    provider: 'xAI Unofficial Co-Founder (GM #2)',
    effort: 'Ultrathink',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'kimi-k3-cloud',
    label: 'Kimi K3',
    provider: 'Ollama Cloud / OmniRoute',
    effort: 'High',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'free-claude-code-8082',
    label: 'Free Claude Code (:8082)',
    provider: 'Local Admin Bridge (:8082/admin)',
    effort: 'High',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'sabretooth-ollama-gemma4-12b',
    label: 'Sabretooth Gemma4 12B ($0 Unlimited)',
    provider: 'Sabretooth .8 16GB AMD GPU (:11434)',
    effort: 'High',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
];

export const UNIFIED_WORKSPACE_SHELL_SPEC = {
  mandatoryRepositories: ['Trollz1004/dream-online', 'Trollz1004/ANTIGRAVITY'] as const,
  mandatoryNodeDashboards: [
    {
      node: 'Alienware (.40)',
      port: 9180,
      name: 'DREAM Engine Game Developer Dashboard',
      repo: 'Trollz1004/dream-online',
    },
    {
      node: 'Sabretooth (.8)',
      port: 8392,
      name: 'YouTube Studio (<=59s Shorts) & Hermes Lead-Gen Dashboard',
      repo: 'Trollz1004/ANTIGRAVITY',
    },
    {
      node: 'T5500 (.15)',
      port: 3130,
      name: 'Streamable Mission Control Dashboard',
      repo: 'Trollz1004/ANTIGRAVITY',
    },
  ] as const,
  leftSidebarSections: [
    'New Session',
    'Pull requests',
    'Issues',
    'Dashboards',
    'Automations',
    'Customizations / Rule Sets',
    'Repositories',
    'Sessions / Chats',
  ] as const,
  permanentRightInspectorTools: ['Review', 'Open File', 'Terminal', 'Browser', 'Artifacts', 'Subagents'] as const,
};

export function redactWorkspaceSecrets(rawText: string): string {
  return rawText
    .replace(/\b(AIza[0-9A-Za-z_-]{20,})\b/g, '[REDACTED:XXXX]')
    .replace(/\b(sk-[0-9A-Za-z_-]{16,})\b/g, '[REDACTED:XXXX]')
    .replace(/\b(ghp_[0-9A-Za-z]{20,})\b/g, '[REDACTED:XXXX]')
    .replace(/\b(github_pat_[0-9A-Za-z_]{20,})\b/g, '[REDACTED:XXXX]')
    .replace(/(GEMINI_API_KEY|OPENDESIGN_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)\s*=\s*[^\s"']+/gi, '$1=[REDACTED:XXXX]');
}

export function swapModelOnFiveHourCap(
  currentModelId: string,
  requestedModelId?: string
): {
  previousModelId: string;
  activeModel: WorkspaceModelOption;
  sessionPreserved: true;
  auditLogLine: string;
} {
  const target =
    FIVE_HOUR_CAP_MODELS.find((m) => m.id === requestedModelId) ||
    FIVE_HOUR_CAP_MODELS.find((m) => m.id !== currentModelId) ||
    FIVE_HOUR_CAP_MODELS[0];

  const prevLabel = FIVE_HOUR_CAP_MODELS.find((m) => m.id === currentModelId)?.label || currentModelId;
  return {
    previousModelId: currentModelId,
    activeModel: target,
    sessionPreserved: true,
    auditLogLine: `Model changed from ${prevLabel} to ${target.label} · ${target.provider} (${target.effort} · ${target.contextWindow})`,
  };
}
