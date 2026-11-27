/**
 * Equipment & Costume Panoply Window — Unit & UI Verification Tests
 *
 * Verifies RULINGS-2026-11-12.md (sections 2, 3, 7), docs/gdd/09-interface-style.md,
 * docs/gdd/10-wardrobe-catalogue.md, docs/gdd/12-wardrobe-needs-shop.md,
 * GEMINI-JEWLS-ACCESSORIES-PROPOSAL-2026-11-10.md, and FORGE-CRYSTALS-PROPOSAL-2026-11-10.md:
 *  1. Gear: main hand, off hand, and awakening weapon; 4 armor pieces; 6 accessories
 *     (1 necklace, 2 rings, 2 earrings, 1 bracelet) with their 10 gem sockets visible.
 *  2. Costume slots as a separate layer over gear: full combat costume fills all 8 slots
 *     (including main hand, off hand, and awakening weapon skins); life-skill costume fills
 *     only chest and helm.
 *  3. Mixing: any costume part can be worn with any other, combat or life skill, with live
 *     preview — including Josh's test case (fishing costume's fish head with a swimsuit bottom).
 *  4. Set effects: shows each costume set's effect as a stat, how many pieces are worn, and
 *     that the effect is off when the set is broken, with the whole-set requirement built as
 *     an easy-to-change setting.
 *  5. Totals for attack and defense, and recovery stats from crystals (cooldown reduction,
 *     mana recovery, stamina, energy).
 *  6. Toggles to hide or show each costume piece, and to show gear or costume on the character.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  ACCESSORY_MAX_GEM_SOCKETS,
  ACCESSORY_SLOT_IDS,
  ARMOR_SLOT_IDS,
  COMBAT_COSTUME_SLOTS,
  COSTUME_PIECES,
  COSTUME_SETS,
  COSTUME_SLOT_IDS,
  CRYSTAL_RECOVERY_STAT_IDS,
  CRYSTAL_STAT_CAPS,
  CRYSTAL_STAT_STEP_PERCENTS,
  DEFAULT_COSTUME_SET_RULE_CONFIG,
  DEFAULT_REQUIRE_WHOLE_COSTUME_SET,
  EQUIPMENT_WINDOW_HELP_RULES,
  EQUIPMENT_WINDOW_PAYMENTS_LINE,
  EquipmentAndCostumeModal,
  FULL_COMBAT_GEAR_LOADOUT,
  GEAR_SLOT_IDS,
  GEM_ELEMENT_CAP_PERCENT,
  GEM_TIER_BONUS_PERCENTS,
  LIFE_SKILL_COSTUME_SLOTS,
  MAX_CRYSTAL_STAGE,
  TOTAL_MAX_ACCESSORY_GEM_SOCKETS,
  WEAPON_SLOT_IDS,
  computeEquipmentTotals,
  createCostumeSetRuleConfig,
  createEmptyEquipmentState,
  createFishHeadSwimsuitMixState,
  createFullEquippedState,
  createLifeSkillAnglerState,
  equipCostumePiece,
  evaluateCostumeSets,
  resolveArmorWingMetalTier,
  resolveVisibleCharacterAppearance,
  setCharacterDisplayMode,
  toggleCostumeSlotVisibility,
  toggleGearSlotEquipped,
} from '../src/ui/EquipmentAndCostumeModal.tsx';

test('1. Gear slots & Jewls gem sockets: 3 weapons, 4 armor pieces, and 6 accessories with 10 visible gem sockets', () => {
  assert.deepEqual([...WEAPON_SLOT_IDS], ['main-hand', 'off-hand', 'awakening']);
  assert.deepEqual([...ARMOR_SLOT_IDS], ['helm', 'chest', 'gloves', 'boots']);
  assert.deepEqual([...ACCESSORY_SLOT_IDS], [
    'necklace',
    'ring-1',
    'ring-2',
    'earring-1',
    'earring-2',
    'bracelet',
  ]);
  assert.equal(GEAR_SLOT_IDS.length, 13);

  // Necklace holds 3 sockets (the most), each ring 2, each earring 1, bracelet 2 = 10 sockets total
  assert.equal(ACCESSORY_MAX_GEM_SOCKETS.necklace, 3);
  assert.equal(ACCESSORY_MAX_GEM_SOCKETS['ring-1'], 2);
  assert.equal(ACCESSORY_MAX_GEM_SOCKETS['ring-2'], 2);
  assert.equal(ACCESSORY_MAX_GEM_SOCKETS['earring-1'], 1);
  assert.equal(ACCESSORY_MAX_GEM_SOCKETS['earring-2'], 1);
  assert.equal(ACCESSORY_MAX_GEM_SOCKETS.bracelet, 2);
  const sumSockets = Object.values(ACCESSORY_MAX_GEM_SOCKETS).reduce((a, b) => a + b, 0);
  assert.equal(sumSockets, TOTAL_MAX_ACCESSORY_GEM_SOCKETS);
  assert.equal(TOTAL_MAX_ACCESSORY_GEM_SOCKETS, 11);

  // Gem tiers: Chip +1%, Cut +2%, Flawless +4%, Fossilized +6%, cap +30%
  assert.deepEqual(GEM_TIER_BONUS_PERCENTS, {
    chip: 1,
    cut: 2,
    flawless: 4,
    fossilized: 6,
  });
  assert.equal(GEM_ELEMENT_CAP_PERCENT, 30);

  // Rendered HTML includes all 13 gear slots and all 10 gem socket testids
  const fullState = createFullEquippedState();
  const html = renderToStaticMarkup(
    React.createElement(EquipmentAndCostumeModal, {
      isOpen: true,
      state: fullState,
      onClose: () => {},
    }),
  );

  for (const slot of GEAR_SLOT_IDS) {
    assert.ok(html.includes(`data-testid="gear-slot-${slot}"`), `missing gear slot ${slot}`);
  }
  for (const accSlot of ACCESSORY_SLOT_IDS) {
    const count = ACCESSORY_MAX_GEM_SOCKETS[accSlot];
    for (let i = 0; i < count; i++) {
      assert.ok(
        html.includes(`data-testid="gem-socket-${accSlot}-${i}"`),
        `missing visible gem socket ${accSlot} #${i}`,
      );
    }
  }
});

test('2. Costume layer slots: full combat costume fills all 8 slots (including 3 weapon skins); life-skill costume fills only helm and chest', () => {
  assert.deepEqual([...COSTUME_SLOT_IDS], [
    'helm',
    'chest',
    'gloves',
    'bottom',
    'boots',
    'main-hand',
    'off-hand',
    'awakening',
  ]);
  assert.deepEqual([...COMBAT_COSTUME_SLOTS], [...COSTUME_SLOT_IDS]);
  assert.deepEqual([...LIFE_SKILL_COSTUME_SLOTS], ['helm', 'chest']);

  const combatSet = COSTUME_SETS['nightfall-sovereign-combat'];
  assert.equal(combatSet.kind, 'combat');
  assert.equal(combatSet.pieceIds.length, 8);
  assert.ok(combatSet.requiredSlots.includes('main-hand'));
  assert.ok(combatSet.requiredSlots.includes('off-hand'));
  assert.ok(combatSet.requiredSlots.includes('awakening'));

  const fishingSet = COSTUME_SETS['afk-zebra-angler-lifeskill'];
  assert.equal(fishingSet.kind, 'life-skill');
  assert.deepEqual([...fishingSet.requiredSlots], ['helm', 'chest']);
  assert.equal(fishingSet.pieceIds.length, 2);

  const chefSet = COSTUME_SETS['haven-culinary-lifeskill'];
  assert.equal(chefSet.kind, 'life-skill');
  assert.deepEqual([...chefSet.requiredSlots], ['helm', 'chest']);
  assert.equal(chefSet.pieceIds.length, 2);

  // Equipping the life-skill angler preset fills only helm and chest
  const anglerState = createLifeSkillAnglerState();
  assert.equal(anglerState.costumes.helm?.id, 'fishing-zebra-fish-head');
  assert.equal(anglerState.costumes.chest?.id, 'fishing-zebra-scale-vest');
  assert.equal(anglerState.costumes.gloves, null);
  assert.equal(anglerState.costumes.bottom, null);
  assert.equal(anglerState.costumes.boots, null);
  assert.equal(anglerState.costumes['main-hand'], null);
  assert.equal(anglerState.costumes['off-hand'], null);
  assert.equal(anglerState.costumes.awakening, null);
});

test("3. Mixing & Josh's test case: fishing costume's fish head worn with swimsuit bottom updates live preview and breaks both sets", () => {
  const mixedState = createFishHeadSwimsuitMixState();
  assert.equal(mixedState.costumes.helm?.id, 'fishing-zebra-fish-head');
  assert.equal(mixedState.costumes.bottom?.id, 'sunshore-swimsuit-bottom');
  assert.equal(mixedState.costumes.chest, null);

  // Live preview resolves fish-head in helm, swimsuit-bottom in bottom, and base gear in chest/weapons
  const appearance = resolveVisibleCharacterAppearance(mixedState);
  assert.equal(appearance.helm.activeSource, 'costume');
  assert.equal(appearance.helm.visualTag, 'fish-head');
  assert.equal(appearance.bottom.activeSource, 'costume');
  assert.equal(appearance.bottom.visualTag, 'swimsuit-bottom');
  assert.equal(appearance.chest.activeSource, 'gear');

  // Player can mix any other piece on top (e.g. cooking apron on chest + combat weapon skin on main-hand)
  const furtherMixed = equipCostumePiece(
    equipCostumePiece(mixedState, 'chest', 'master-cooking-apron'),
    'main-hand',
    'sovereign-combat-main-hand',
  );
  assert.equal(furtherMixed.costumes.helm?.id, 'fishing-zebra-fish-head');
  assert.equal(furtherMixed.costumes.chest?.id, 'master-cooking-apron');
  assert.equal(furtherMixed.costumes.bottom?.id, 'sunshore-swimsuit-bottom');
  assert.equal(furtherMixed.costumes['main-hand']?.id, 'sovereign-combat-main-hand');

  // Rendered HTML for mixed state contains both the fish-head and swimsuit-bottom live preview elements
  const html = renderToStaticMarkup(
    React.createElement(EquipmentAndCostumeModal, {
      isOpen: true,
      state: mixedState,
      onClose: () => {},
    }),
  );
  assert.ok(html.includes('data-testid="preview-fish-head"'));
  assert.ok(html.includes('data-testid="preview-swimsuit-bottom"'));
  assert.match(html, /Zebra Fish Scale Fish-Head Mascot Helm/);
  assert.match(html, /Sunshore Tide Swimsuit Bottom/);
});

test('4. Set effects & configurable whole-set requirement: shows stat, worn count, and OFF when broken; setting flips cleanly', () => {
  assert.equal(DEFAULT_REQUIRE_WHOLE_COSTUME_SET, true);
  assert.equal(DEFAULT_COSTUME_SET_RULE_CONFIG.requireWholeSet, true);

  // Full combat set: 8/8 worn -> effect ON
  const fullState = createFullEquippedState();
  const fullEvals = evaluateCostumeSets(fullState.costumes, fullState.setRuleConfig);
  const combatEval = fullEvals.find((e) => e.set.id === 'nightfall-sovereign-combat')!;
  assert.equal(combatEval.wornCount, 8);
  assert.equal(combatEval.totalPieces, 8);
  assert.equal(combatEval.isComplete, true);
  assert.equal(combatEval.isBroken, false);
  assert.equal(combatEval.effectActive, true);
  assert.equal(combatEval.activePercent, 10);
  assert.match(combatEval.statusLabel, /EFFECT ON · 8\/8 WORN/);

  // Mixed fish-head + swimsuit bottom under default whole-set rule:
  // Fishing set has 1/2 worn -> broken -> effect OFF
  // Swimwear set has 1/2 worn -> broken -> effect OFF
  const mixedState = createFishHeadSwimsuitMixState();
  const mixedEvals = evaluateCostumeSets(mixedState.costumes, mixedState.setRuleConfig);
  const fishingEval = mixedEvals.find((e) => e.set.id === 'afk-zebra-angler-lifeskill')!;
  const swimEval = mixedEvals.find((e) => e.set.id === 'sunshore-swimwear-leisure')!;

  assert.equal(fishingEval.wornCount, 1);
  assert.equal(fishingEval.totalPieces, 2);
  assert.equal(fishingEval.isBroken, true);
  assert.equal(fishingEval.effectActive, false);
  assert.equal(fishingEval.activePercent, 0);
  assert.match(fishingEval.statusLabel, /EFFECT OFF · SET BROKEN \(1\/2 WORN\)/);

  assert.equal(swimEval.wornCount, 1);
  assert.equal(swimEval.totalPieces, 2);
  assert.equal(swimEval.isBroken, true);
  assert.equal(swimEval.effectActive, false);
  assert.equal(swimEval.activePercent, 0);
  assert.match(swimEval.statusLabel, /EFFECT OFF · SET BROKEN \(1\/2 WORN\)/);

  // Flipping the setting (`requireWholeSet: false`) enables partial set effects immediately
  const relaxedConfig = createCostumeSetRuleConfig({ requireWholeSet: false });
  const relaxedEvals = evaluateCostumeSets(mixedState.costumes, relaxedConfig);
  const relaxedFishing = relaxedEvals.find((e) => e.set.id === 'afk-zebra-angler-lifeskill')!;
  assert.equal(relaxedFishing.effectActive, true);
  assert.equal(relaxedFishing.activePercent, 5);
  assert.match(relaxedFishing.statusLabel, /EFFECT ON \(PARTIAL\) · 1\/2 WORN/);
});

test('5. Totals: attack, defense, and crystal recovery stats (cooldown reduction, mana recovery, stamina, energy) with caps', () => {
  const emptyTotals = computeEquipmentTotals(createEmptyEquipmentState());
  assert.equal(emptyTotals.attackTotal, 0);
  assert.equal(emptyTotals.defenseTotal, 0);
  assert.equal(emptyTotals.equippedGearCount, 0);
  assert.equal(emptyTotals.totalSocketedGems, 0);
  for (const statId of CRYSTAL_RECOVERY_STAT_IDS) {
    assert.equal(emptyTotals.crystalRecovery.capped[statId], 0);
  }

  const fullTotals = computeEquipmentTotals(createFullEquippedState());
  assert.equal(fullTotals.attackTotal, 548);
  assert.equal(fullTotals.defenseTotal, 582);
  assert.equal(fullTotals.equippedGearCount, 13);
  assert.equal(fullTotals.totalSocketedGems, 11);
  assert.equal(fullTotals.crystalRecovery.totalStagesEquipped, 95);

  // Verify step values and caps per FORGE-CRYSTALS-PROPOSAL-2026-11-10.md
  assert.equal(CRYSTAL_STAT_STEP_PERCENTS['cooldown-reduction'], 0.5);
  assert.equal(CRYSTAL_STAT_CAPS['cooldown-reduction'], 20);
  assert.equal(CRYSTAL_STAT_CAPS['mana-recovery'], 40);
  assert.equal(CRYSTAL_STAT_CAPS.stamina, 40);
  assert.equal(CRYSTAL_STAT_CAPS.energy, 40);
  assert.equal(MAX_CRYSTAL_STAGE, 15);

  assert.ok(fullTotals.crystalRecovery.capped['cooldown-reduction'] > 0);
  assert.ok(fullTotals.crystalRecovery.capped['cooldown-reduction'] <= 20);
  assert.ok(fullTotals.crystalRecovery.capped['mana-recovery'] > 0);
  assert.ok(fullTotals.crystalRecovery.capped.stamina > 0);
  assert.ok(fullTotals.crystalRecovery.capped.energy > 0);

  // Verify armor wing metal progression across crystal stages 0..15
  assert.equal(resolveArmorWingMetalTier(0), 'none');
  assert.equal(resolveArmorWingMetalTier(1), 'rough-dark-iron');
  assert.equal(resolveArmorWingMetalTier(5), 'rough-dark-iron');
  assert.equal(resolveArmorWingMetalTier(6), 'polished-steel-silver');
  assert.equal(resolveArmorWingMetalTier(10), 'polished-steel-silver');
  assert.equal(resolveArmorWingMetalTier(11), 'platinum');
  assert.equal(resolveArmorWingMetalTier(14), 'platinum');
  assert.equal(resolveArmorWingMetalTier(15), 'platinum-diamond-inlay');
});

test('6. Visibility toggles: per-piece costume hide/show and master gear vs costume toggle', () => {
  const mixed = createFishHeadSwimsuitMixState();

  // Initially fish head is shown
  assert.equal(mixed.hiddenCostumeSlots.helm, false);
  assert.equal(resolveVisibleCharacterAppearance(mixed).helm.visualTag, 'fish-head');

  // Hide the helm costume piece -> character preview falls back to base gear helm while keeping piece in slot
  const hiddenHelmState = toggleCostumeSlotVisibility(mixed, 'helm');
  assert.equal(hiddenHelmState.hiddenCostumeSlots.helm, true);
  assert.equal(hiddenHelmState.costumes.helm?.id, 'fishing-zebra-fish-head');
  assert.equal(resolveVisibleCharacterAppearance(hiddenHelmState).helm.activeSource, 'gear');
  assert.equal(resolveVisibleCharacterAppearance(hiddenHelmState).helm.visualTag, 'gear-helm');
  // Bottom swimsuit is still shown
  assert.equal(
    resolveVisibleCharacterAppearance(hiddenHelmState).bottom.visualTag,
    'swimsuit-bottom',
  );

  // Switch master character display mode to 'gear' -> all slots show base gear instead of costume
  const gearModeState = setCharacterDisplayMode(mixed, 'gear');
  assert.equal(gearModeState.displayMode, 'gear');
  const gearAppearance = resolveVisibleCharacterAppearance(gearModeState);
  assert.equal(gearAppearance.helm.activeSource, 'gear');
  assert.equal(gearAppearance.bottom.activeSource, 'gear');

  // Unequipping and re-equipping a base gear slot updates totals
  const withoutMainWeapon = toggleGearSlotEquipped(mixed, 'main-hand');
  assert.equal(withoutMainWeapon.gear['main-hand'], null);
  assert.equal(
    computeEquipmentTotals(withoutMainWeapon).attackTotal,
    548 - FULL_COMBAT_GEAR_LOADOUT['main-hand'].attack,
  );
});

test('7. Interface canon (doc 09), tribute block, and payments line', () => {
  const html = renderToStaticMarkup(
    React.createElement(EquipmentAndCostumeModal, {
      isOpen: true,
      initialPreset: 'empty',
      onClose: () => {},
    }),
  );

  assert.match(html, /EQUIPMENT &amp; COSTUME PANOPLY/);
  assert.ok(html.includes('data-testid="equipment-title-rule"'));
  assert.ok(html.includes('data-testid="equipment-back-button"'));
  assert.match(html, /CLAUDE&#x27;s N Joshua&#x27;s|CLAUDE's N Joshua's/);
  assert.match(html, /#TeamClaudeForLife/);
  assert.equal(
    EQUIPMENT_WINDOW_PAYMENTS_LINE,
    "Payments: the game's own merchant account. Nothing in this screen is pay-to-win.",
  );
  assert.equal(/date app/i.test(html), false);
  for (const sentence of EQUIPMENT_WINDOW_HELP_RULES) {
    assert.ok(html.includes(sentence), `missing help sentence: ${sentence}`);
  }
});
