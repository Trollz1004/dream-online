import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateClassWeaponLoadout,
  evaluateMoldBreakerBuild,
  forgeUpgradeItemDeterministic,
  getForgeVisualForRarity,
  calculatePvpHierarchyScore,
  resolveOceanVesselForWorldPhase,
  type MarketplaceLootItem,
} from '../src/engine/combat/mold-breaker-classes-forge-pvp.ts';

test('Mold-Breaker Class & Weapon Matrix: Ranger bow/xbow exclusivity, no swords ever, and Endgame STR Dagger Hidden Gem', () => {
  // Only Rangers can use Bows or 1H/Dual Crossbows
  assert.equal(validateClassWeaponLoadout('ranger', '2h_bow').allowed, true);
  assert.equal(validateClassWeaponLoadout('ranger', 'dual_crossbow').allowed, true);
  assert.equal(validateClassWeaponLoadout('human_warrior', 'dual_crossbow').allowed, false);

  // Rangers can NEVER equip swords or dual-wield swords
  assert.equal(validateClassWeaponLoadout('ranger', '1h_sword').allowed, false);
  assert.equal(validateClassWeaponLoadout('ranger', '2h_sword').allowed, false);
  assert.equal(validateClassWeaponLoadout('ranger', 'dagger', '1h_sword').allowed, false);

  // Fast Dual Crossbow DPS === Slower 2H Bow Heavy-Shot DPS
  const dexBowRanger = evaluateMoldBreakerBuild({
    classId: 'ranger',
    level: 45,
    awakenedSkillTreeLevel: 10,
    stats: { str: 20, dex: 120, int: 30, psy: 20, vitality: 40 },
    mainHand: '2h_bow',
    offHand: 'none',
    awakenedThirdWeaponUnlocked: true,
    equippedHpPercentBonus: 15,
    activePartyBuffCount: 2,
    canCastCrossArchetypeSkill: 'tornado_whirlwind',
  });
  const dexXbowRanger = evaluateMoldBreakerBuild({
    ...dexBowRanger,
    classId: 'ranger',
    level: 45,
    awakenedSkillTreeLevel: 10,
    stats: { str: 20, dex: 120, int: 30, psy: 20, vitality: 40 },
    mainHand: 'dual_crossbow',
    offHand: 'none',
    awakenedThirdWeaponUnlocked: true,
    equippedHpPercentBonus: 15,
    activePartyBuffCount: 2,
    canCastCrossArchetypeSkill: 'tornado_whirlwind',
  });
  assert.equal(
    dexBowRanger.effectiveRangedDps,
    dexXbowRanger.effectiveRangedDps,
    'Dual Crossbow fast-animation DPS must equal 2H Bow slower heavy-shot DPS'
  );
  assert.ok(dexBowRanger.effectiveMagicDps > 0, 'Ranger must be able to cast Tornado Whirlwind with weapon/skill-tree modifiers');

  // Low-level Dagger Ranger is weak ("silly"), whereas Endgame Lv45+ Awakened STR Dagger Ranger beats DEX Bow!
  const lowLevelDaggerRanger = evaluateMoldBreakerBuild({
    classId: 'ranger',
    level: 20,
    awakenedSkillTreeLevel: 2,
    stats: { str: 50, dex: 30, int: 10, psy: 10, vitality: 20 },
    mainHand: 'dagger',
    offHand: 'none',
    awakenedThirdWeaponUnlocked: false,
    equippedHpPercentBonus: 0,
    activePartyBuffCount: 2,
  });
  assert.equal(lowLevelDaggerRanger.isHiddenEndgameGemActive, false);
  assert.ok(lowLevelDaggerRanger.effectiveMeleeDps < dexBowRanger.effectiveRangedDps);

  const endgameStrDaggerRanger = evaluateMoldBreakerBuild({
    classId: 'ranger',
    level: 50,
    awakenedSkillTreeLevel: 10,
    stats: { str: 120, dex: 25, int: 20, psy: 20, vitality: 40 },
    mainHand: 'dagger',
    offHand: 'none',
    awakenedThirdWeaponUnlocked: true,
    equippedHpPercentBonus: 20,
    activePartyBuffCount: 2,
  });
  assert.equal(endgameStrDaggerRanger.isHiddenEndgameGemActive, true);
  assert.ok(
    endgameStrDaggerRanger.effectiveMeleeDps > dexBowRanger.effectiveRangedDps,
    'Endgame Awakened STR + Dagger Ranger hidden Easter Egg must out-damage standard DEX Bow build'
  );
});

test('Mold-Breaker Priest Hidden Gem: Endgame INT + 1H Mace (never Club or 2H Staff) + Shield + Full Party Buffs = Highest Melee DPS in Game', () => {
  // Staff exclusivity: only Mage/Warlock and Healer/Priest can equip 2H Caster Staff (Monk cannot)
  assert.equal(validateClassWeaponLoadout('healer_priest', '2h_caster_staff').allowed, true);
  assert.equal(validateClassWeaponLoadout('mage_warlock', '2h_caster_staff').allowed, true);
  assert.equal(validateClassWeaponLoadout('monk', '2h_caster_staff').allowed, false);

  // Priest with 1H Club + Shield does NOT trigger the hidden melee gem
  const clubPriest = evaluateMoldBreakerBuild({
    classId: 'healer_priest',
    level: 50,
    awakenedSkillTreeLevel: 10,
    stats: { str: 30, dex: 20, int: 140, psy: 40, vitality: 50 },
    mainHand: '1h_club',
    offHand: 'shield',
    awakenedThirdWeaponUnlocked: true,
    equippedHpPercentBonus: 25,
    activePartyBuffCount: 4,
  });
  assert.equal(clubPriest.isHiddenEndgameGemActive, false);
  assert.equal(clubPriest.isHighestAchievableMeleeInGame, false);

  // Priest with 1H Mace + Shield + INT + Awakened Skill Tree Lv10 + Full Party Buffs triggers Highest Achievable Melee DPS!
  const maceShieldIntPriest = evaluateMoldBreakerBuild({
    classId: 'healer_priest',
    level: 50,
    awakenedSkillTreeLevel: 10,
    stats: { str: 30, dex: 20, int: 140, psy: 40, vitality: 50 },
    mainHand: '1h_mace',
    offHand: 'shield',
    awakenedThirdWeaponUnlocked: true,
    equippedHpPercentBonus: 25,
    activePartyBuffCount: 4,
  });
  assert.equal(maceShieldIntPriest.isHiddenEndgameGemActive, true);
  assert.equal(maceShieldIntPriest.isHighestAchievableMeleeInGame, true);
  assert.ok(maceShieldIntPriest.effectiveMeleeDps > 2500);
});

test('Mold-Breaker Monk (Sprint/Dash Energy), Human Defender (HP Damage & Absorption), and Dragon FingFangFoom (Zhen & Full-HP Vitality Gem)', () => {
  // Monk uses Sprint/Dash Energy pool (never Mana or PSY) and can use 2H Martial Staff or Dual Swords
  const monkBuild = evaluateMoldBreakerBuild({
    classId: 'monk',
    level: 45,
    awakenedSkillTreeLevel: 8,
    stats: { str: 90, dex: 90, int: 20, psy: 20, vitality: 50 },
    mainHand: '1h_sword',
    offHand: '1h_sword',
    awakenedThirdWeaponUnlocked: true,
    equippedHpPercentBonus: 18,
    activePartyBuffCount: 3,
  });
  assert.equal(monkBuild.validEquipment, true);
  assert.equal(monkBuild.resourcePool, 'sprint_dash_energy');

  // Human off-hand rule: 1H weapon can only pair with Dagger or Shield in off-hand
  assert.equal(validateClassWeaponLoadout('human_assassin', '1h_sword', 'dagger').allowed, true);
  assert.equal(validateClassWeaponLoadout('human_defender', '1h_mace', 'shield').allowed, true);
  assert.equal(validateClassWeaponLoadout('human_warrior', '1h_sword', '1h_club').allowed, false);

  // Human Defender absorbs party damage and scales damage off Vitality + equipped +HP% gear
  const defenderBuild = evaluateMoldBreakerBuild({
    classId: 'human_defender',
    level: 50,
    awakenedSkillTreeLevel: 10,
    stats: { str: 40, dex: 20, int: 20, psy: 20, vitality: 150 },
    mainHand: '1h_mace',
    offHand: 'shield',
    awakenedThirdWeaponUnlocked: true,
    equippedHpPercentBonus: 45,
    activePartyBuffCount: 3,
  });
  assert.ok(defenderBuild.partyDamageAbsorptionPct >= 40);
  assert.ok(defenderBuild.effectiveMeleeDps > 1500);

  // Dragon (FingFangFoom) exclusive Zhen weapon, Full-HP heal, and Full-Vitality Hidden Endgame Gem
  assert.equal(validateClassWeaponLoadout('human_warrior', '2h_zhen').allowed, false);
  assert.equal(validateClassWeaponLoadout('dragon_fingfangfoom', 'split_dual_zhen').allowed, true);

  const vitalityDragon = evaluateMoldBreakerBuild({
    classId: 'dragon_fingfangfoom',
    level: 50,
    awakenedSkillTreeLevel: 10,
    stats: { str: 40, dex: 20, int: 40, psy: 20, vitality: 165 },
    mainHand: 'split_dual_zhen',
    offHand: 'none',
    awakenedThirdWeaponUnlocked: true,
    equippedHpPercentBonus: 55,
    activePartyBuffCount: 3,
  });
  assert.equal(vitalityDragon.isHiddenEndgameGemActive, true);
  assert.ok(vitalityDragon.fullHpHealAmount > 5000, 'Dragon must heal off Full HP on long cooldown');
  assert.ok(
    vitalityDragon.effectiveMeleeDps > defenderBuild.effectiveMeleeDps,
    'Endgame Full-Vitality FingFangFoom Dragon must out-scale Human Defender in HP-based damage'
  );
});

test('Zero-Gambling Deterministic Forge, 7-Factor PvP Hierarchy, and Dual-Era Ocean Sailing (Day Sails vs Nightfall Speedboats)', () => {
  // 1. Deterministic Non-Gambling Forge (Common -> Mythos, zero break, zero fail-stacks, growing blue flame & orbiting orbs)
  let item: MarketplaceLootItem = {
    itemId: 'loot-assassin-blade-01',
    name: 'Shadowfang 1H Blade',
    weaponType: '1h_sword',
    rarity: 'common',
    randomStats: {
      hpPercentBonus: 12,
      meleeAttackBonus: 35,
      magicAttackBonus: 10,
      rangedAttackBonus: 0,
    },
    forgeVisualEffect: getForgeVisualForRarity('common'),
    canBreakOnForge: false,
    usesFailStacks: false,
    paidWithRealMoney: false,
  };

  for (let step = 0; step < 4; step++) {
    const res = forgeUpgradeItemDeterministic(item, 20, 5000);
    assert.equal(res.success, true);
    assert.ok(res.marketplaceTaxSols > 0);
    item = res.upgradedItem;
  }
  assert.equal(item.rarity, 'mythos');
  assert.equal(item.canBreakOnForge, false);
  assert.equal(item.usesFailStacks, false);
  assert.equal(item.paidWithRealMoney, false);
  assert.equal(item.forgeVisualEffect.flameColor, 'sovereign_blue_crimson_flame');
  assert.equal(item.forgeVisualEffect.orbitingOrbsCount, 4);

  // 2. 7-Factor PvP Hierarchy (Coordinated Focus + Level > Party Auras > Skill Paths > Weapon Stats > Forge > Pet > Elixirs)
  const soloNoPet = calculatePvpHierarchyScore({
    coordinatedSameTargetFocus: false,
    characterLevel: 45,
    activePartyAurasCount: 0,
    skillPathSynergyTier: 2,
    weaponRandomStatScore: 100,
    weaponForgeRarity: 'rare',
    pvpPlayerSkillAndArmorScore: 200,
    isFreePetSummoned: false,
    activeCraftedElixirAndFoodBuffs: 1,
  });
  const coordinatedPartyWithPet = calculatePvpHierarchyScore({
    coordinatedSameTargetFocus: true,
    characterLevel: 50,
    activePartyAurasCount: 4,
    skillPathSynergyTier: 5,
    weaponRandomStatScore: 180,
    weaponForgeRarity: 'mythos',
    pvpPlayerSkillAndArmorScore: 260,
    isFreePetSummoned: true,
    activeCraftedElixirAndFoodBuffs: 3,
  });
  assert.ok(coordinatedPartyWithPet.totalPvpPower > soloNoPet.totalPvpPower * 1.6);
  assert.ok(
    coordinatedPartyWithPet.factorBreakdown.levelWeight >
      coordinatedPartyWithPet.factorBreakdown.partyAuraWeight
  );
  assert.ok(
    coordinatedPartyWithPet.factorBreakdown.partyAuraWeight >
      coordinatedPartyWithPet.factorBreakdown.skillPathWeight
  );

  // 3. Dual-Era Ocean Sailing (Day Dream Sails with no engines vs Nightfall Speedboats & Yachts)
  const dayShip = resolveOceanVesselForWorldPhase('day_dream_3d', 'flagship');
  const nightYacht = resolveOceanVesselForWorldPhase('nightmare_3d', 'flagship');
  assert.equal(dayShip.propulsionType, 'wind_canvas_sails_no_engine');
  assert.equal(nightYacht.propulsionType, 'twin_plasma_hydro_turbines');
  assert.ok(nightYacht.topSpeedKnots > dayShip.topSpeedKnots);
});


import {
  GOOGLE_FLOW_VISION_ZONES,
  validateRemake100PercentYoursAndReaCleanRoom,
  UNIFIED_WORKSPACE_SHELL_SPEC,
  FIVE_HOUR_CAP_MODELS,
  swapModelOnFiveHourCap,
  redactWorkspaceSecrets,
} from '../src/engine/combat/mold-breaker-classes-forge-pvp.ts';

test('Remake 100% Yours Gate, REA Clean-Room, Google Flow Vision Zones, Unified 3-Pane Shell & 5-Hour Cap Model Switcher', () => {
  // 1. Google Flow Vision 4 Zones (extracted from epicsceneofdream.mp4)
  assert.equal(GOOGLE_FLOW_VISION_ZONES.length, 4);
  const zoneIds = GOOGLE_FLOW_VISION_ZONES.map((z) => z.zoneId);
  assert.deepEqual(zoneIds, [
    'storm_dunes_awakening',
    'day_dream_harbor_port',
    'neon_metropolis_raid_plaza',
    'nightfall_gothic_neon_street',
  ]);

  // 2. Remake 100% Yours + REA Clean-Room + Rule One Reference Screenshot Comparison Gate
  const passingGate = validateRemake100PercentYoursAndReaCleanRoom({
    reaCleanRoomStudied: true,
    thirdPartyGameEngineUsed: false,
    remakeSwapBoardPercent: 100,
    remakePixelParityPercent: 98.8,
    sourceBrandResidueCount: 0,
    beforeReferenceScreenshotCaptured: true,
    afterFeatureScreenshotCaptured: true,
    visualComparisonMatchesReference: true,
  });
  assert.equal(passingGate.passed, true);

  const failingScreenshotGate = validateRemake100PercentYoursAndReaCleanRoom({
    reaCleanRoomStudied: true,
    thirdPartyGameEngineUsed: false,
    remakeSwapBoardPercent: 100,
    remakePixelParityPercent: 98.8,
    sourceBrandResidueCount: 0,
    beforeReferenceScreenshotCaptured: true,
    afterFeatureScreenshotCaptured: true,
    visualComparisonMatchesReference: false,
  });
  assert.equal(failingScreenshotGate.passed, false);

  // 3. Unified 3-Pane Workspace Shell & 5-Hour Cap Model Switcher
  assert.deepEqual(UNIFIED_WORKSPACE_SHELL_SPEC.permanentRightInspectorTools, [
    'Review',
    'Open File',
    'Terminal',
    'Browser',
    'Artifacts',
    'Subagents',
  ]);
  assert.ok(FIVE_HOUR_CAP_MODELS.length >= 8);

  const swapped = swapModelOnFiveHourCap('claude-sonnet-5-5', 'gemini-4-argon-high');
  assert.equal(swapped.sessionPreserved, true);
  assert.equal(swapped.activeModel.id, 'gemini-4-argon-high');
  assert.ok(swapped.auditLogLine.includes('Model changed from Claude Sonnet 5.5 to Gemini 4 Argon High'));

  // 4. Automatic XXXX secret redaction across Open File / Terminal / Review / Browser
  const dirty = 'GEMINI_API_KEY=AIzaSyDummyKey12345678901234567890 and ghp_1234567890abcdefghijklmnopqrstuv';
  const redacted = redactWorkspaceSecrets(dirty);
  assert.ok(!redacted.includes('AIzaSy'));
  assert.ok(!redacted.includes('ghp_123'));
  assert.ok(redacted.includes('[REDACTED:XXXX]'));
});


import {
  DREAM_STUDIO_CLEAN_ROOM_ROLES,
  validateGameStudiosHarnessIsolation,
  routeTaskToDreamAgent,
} from '../src/engine/combat/mold-breaker-classes-forge-pvp.ts';

test('Clean-Room Game Studios (:8082 Isolation) & Deterministic Task-to-Agent Router (REA + Remake 100% Yours)', () => {
  assert.ok(DREAM_STUDIO_CLEAN_ROOM_ROLES.length >= 3);
  for (const role of DREAM_STUDIO_CLEAN_ROOM_ROLES) {
    assert.equal(role.cleanRoomRemake100PercentYours, true);
    assert.equal(role.forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea, true);
    assert.deepEqual(role.rawClaudeCodeGameStudiosAllowedHarnesses, ['free-claude-code-8082']);
  }

  // Raw Claude-Code-Game-Studios allowed ONLY on Free Claude Code :8082, blocked on real Claude/Gemini
  const blockedRealClaude = validateGameStudiosHarnessIsolation({
    usingRawThirdPartyGameStudiosPrompts: true,
    targetHarnessId: 'claude-opus-5-5-ultrathink',
    remake100PercentYoursApplied: false,
    reaCleanRoomApplied: false,
  });
  assert.equal(blockedRealClaude.allowed, false);

  const allowedFreeClaude8082 = validateGameStudiosHarnessIsolation({
    usingRawThirdPartyGameStudiosPrompts: true,
    targetHarnessId: 'free-claude-code-8082',
    remake100PercentYoursApplied: false,
    reaCleanRoomApplied: false,
  });
  assert.equal(allowedFreeClaude8082.allowed, true);

  // Task-to-Agent Router routes YouTube/Podcast/Hermes tasks & escalates on 5-hour cap
  const podcastRoute = routeTaskToDreamAgent('Build Gemini SDK podcast radio female voice Aoede and Kore for Sabretooth Hermes YouTube Shorts');
  assert.equal(podcastRoute.category, 'youtube_podcast_leadgen');
  assert.equal(podcastRoute.selectedAgentId, 'gemini-4-argon-high');
  assert.equal(podcastRoute.cleanRoomProvenance, 'DREAM-TaskRouter-100PercentYours-REA');

  const cappedRoute = routeTaskToDreamAgent(
    'Review PR #60 and audit 30-line lean context router',
    { fiveHourCapReachedFor: ['claude-opus-5-5-ultrathink'] }
  );
  assert.equal(cappedRoute.selectedAgentId, 'gemini-4-argon-high');
  assert.ok(cappedRoute.escalationLadder.length >= 2);
});
