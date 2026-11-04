/**
 * Character Creator v1 (Recipe 9) — Unit & Integration Tests
 *
 * Covers docs/gdd/07-character-creation.md, docs/gdd/09-interface-style.md,
 * and docs/gdd/12-wardrobe-needs-shop.md:
 *  1. The creator shapes a body only (silhouette, facePreset, skinTone, hairShape,
 *     hairColor, eyeStyle, voiceStyle) plus starter combatPath and lifeSkillInterest.
 *  2. The creator never emits an outfit or skin field (nor shop or stat fields).
 *  3. The exit state is always the three-piece kid-safe basics set
 *     (Plain Tee, Plain Trousers, Plain Sneakers).
 *  4. Every body slider has a reset that restores its default value and updates
 *     the live 3D scene body parameters.
 *  5. VRM import parses standard VRM 0.x / 1.0 glTF binaries without embedding VRoid.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  APPEARANCE_PRESETS,
  BODY_SILHOUETTES,
  FACE_PRESETS,
  SKIN_TONES,
  HAIR_SHAPES,
  HAIR_COLORS,
  EYE_STYLES,
  VOICE_STYLES,
  STARTER_COMBAT_PATHS,
  STARTER_LIFE_SKILLS,
  CREATOR_SLIDER_SPECS,
  CREATOR_ROWS,
  DEFAULT_CREATOR_STATE,
  KID_SAFE_BASICS,
  KID_SAFE_BASIC_IDS,
  createDefaultBasicsSet,
  isKidSafeBasicsSet,
  createInitialCreatorState,
  applyAppearancePreset,
  updateCreatorSlider,
  resetCreatorSlider,
  resetAllCreatorSliders,
  emitCharacterBodyProfile,
  leaveCharacterCreator,
  computeCreatorBody3dParams,
  parseVrmBinary,
  buildSampleMinimalVrmBinary,
  type CreatorSliderKey,
  type CharacterCreatorState,
} from '../src/ui/characterCreatorConfig.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('creator scope: defines 5 starter combat paths, 10 appearance presets, and voice styles per doc 07', () => {
  assert.equal(STARTER_COMBAT_PATHS.length, 5);
  assert.deepEqual(
    STARTER_COMBAT_PATHS.map((p) => p.id),
    ['blade', 'hammer', 'spear', 'bow', 'focus'],
  );
  assert.equal(APPEARANCE_PRESETS.length, 10);
  assert.equal(FACE_PRESETS.length, 10);
  assert.ok(VOICE_STYLES.length >= 2);
  assert.ok(BODY_SILHOUETTES.length >= 4);
  assert.ok(SKIN_TONES.length >= 6);
  assert.ok(HAIR_SHAPES.length >= 5);
  assert.ok(HAIR_COLORS.length >= 5);
  assert.ok(EYE_STYLES.length >= 4);
  assert.ok(STARTER_LIFE_SKILLS.length >= 5);
});

test('never emits outfit or skin: emitted profile and exit state never contain outfit, skin, shop, or stat fields', () => {
  const state = createInitialCreatorState();
  const dirtyInput = {
    ...state,
    outfit: { top: 'cyber-armor' },
    skin: 'neon-assassin',
    skins: ['neon-assassin'],
    shop: 'needs-shop',
    cosmetics: ['wings'],
    attack: 999,
    damage: 500,
  } as unknown as CharacterCreatorState;

  const emitted = emitCharacterBodyProfile(dirtyInput);
  const exitState = leaveCharacterCreator(dirtyInput);

  const bannedKeys = [
    'outfit',
    'outfits',
    'skin',
    'skins',
    'shop',
    'cosmetic',
    'cosmetics',
    'armor',
    'weapon',
    'attack',
    'damage',
    'defense',
    'hp',
    'stats',
  ];

  const collectKeys = (obj: unknown): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    const own = Object.keys(obj as Record<string, unknown>);
    const nested = own.flatMap((k) => collectKeys((obj as Record<string, unknown>)[k]));
    return [...own, ...nested];
  };

  const emittedKeys = collectKeys(emitted);
  const exitKeys = collectKeys(exitState);

  for (const forbidden of bannedKeys) {
    assert.equal(
      emittedKeys.includes(forbidden),
      false,
      `emitted profile must never contain "${forbidden}"`,
    );
    assert.equal(
      exitKeys.includes(forbidden),
      false,
      `exit state must never contain "${forbidden}"`,
    );
  }

  assert.deepEqual(
    Object.keys(emitted).sort(),
    [
      'combatPath',
      'eyeStyle',
      'facePreset',
      'hairColor',
      'hairLength',
      'hairShape',
      'headScale',
      'heightScale',
      'lifeSkillInterest',
      'silhouette',
      'shoulderWidth',
      'skinTone',
      'torsoBuild',
      'voiceStyle',
    ].sort(),
  );
  assert.equal(Object.isFrozen(emitted), true);
  assert.equal(Object.isFrozen(exitState), true);
});

test('exit state: every character leaves the creator in the kid-safe basics set', () => {
  assert.deepEqual(KID_SAFE_BASIC_IDS, ['basics-top', 'basics-bottom', 'basics-shoes']);
  assert.equal(KID_SAFE_BASICS.top.id, 'basics-top');
  assert.equal(KID_SAFE_BASICS.top.name, 'Plain Tee');
  assert.equal(KID_SAFE_BASICS.bottom.id, 'basics-bottom');
  assert.equal(KID_SAFE_BASICS.bottom.name, 'Plain Trousers');
  assert.equal(KID_SAFE_BASICS.shoes.id, 'basics-shoes');
  assert.equal(KID_SAFE_BASICS.shoes.name, 'Plain Sneakers');

  const basics = createDefaultBasicsSet();
  assert.deepEqual(basics, {
    top: 'basics-top',
    bottom: 'basics-bottom',
    shoes: 'basics-shoes',
  });
  assert.equal(isKidSafeBasicsSet(basics), true);

  // Verify across all 10 appearance presets that leaving the creator always produces the exact kid-safe basics set
  for (const preset of APPEARANCE_PRESETS) {
    const s = applyAppearancePreset(createInitialCreatorState(), preset.id);
    const exit = leaveCharacterCreator(s);
    assert.equal(isKidSafeBasicsSet(exit.basics), true, `preset ${preset.id} must exit in kid-safe basics`);
    assert.deepEqual(exit.basics, {
      top: 'basics-top',
      bottom: 'basics-bottom',
      shoes: 'basics-shoes',
    });
  }

  // Tampered basics sets are rejected
  assert.equal(isKidSafeBasicsSet({ top: 'basics-top', bottom: 'basics-bottom' }), false);
  assert.equal(
    isKidSafeBasicsSet({ top: 'basics-top', bottom: 'basics-bottom', shoes: 'shop-boots' }),
    false,
  );
  assert.equal(
    isKidSafeBasicsSet({
      top: 'basics-top',
      bottom: 'basics-bottom',
      shoes: 'basics-shoes',
      cape: 'moonlit-cloak',
    }),
    false,
  );
  assert.equal(isKidSafeBasicsSet(null), false);
});

test('sliders: every slider has a reset and clamps to its range', () => {
  const sliderKeys = Object.keys(CREATOR_SLIDER_SPECS) as CreatorSliderKey[];
  assert.ok(sliderKeys.length >= 6, 'expected at least 6 body sliders');

  const sliderRows = CREATOR_ROWS.filter((r) => r.kind === 'slider');
  assert.equal(sliderRows.length, sliderKeys.length, 'every slider spec is represented in the creator rows');

  for (const row of sliderRows) {
    assert.equal(row.hasReset, true, `slider row ${row.id} must have a reset control`);
  }

  let state = createInitialCreatorState();
  for (const key of sliderKeys) {
    const spec = CREATOR_SLIDER_SPECS[key];
    assert.equal(state[key], spec.defaultValue, `${key} starts at defaultValue`);

    // Move slider away from default
    const changedVal = spec.defaultValue === spec.max ? spec.min : spec.max;
    state = updateCreatorSlider(state, key, changedVal);
    assert.equal(state[key], changedVal, `${key} updates to ${changedVal}`);

    // Out-of-range values clamp cleanly
    const overMax = updateCreatorSlider(state, key, spec.max + 999);
    assert.equal(overMax[key], spec.max);
    const underMin = updateCreatorSlider(state, key, spec.min - 999);
    assert.equal(underMin[key], spec.min);

    // Individual slider reset restores exact default value
    const resetOne = resetCreatorSlider(state, key);
    assert.equal(resetOne[key], spec.defaultValue, `resetCreatorSlider restores ${key} to default`);
  }

  // Reset all sliders at once
  const resetAll = resetAllCreatorSliders(state);
  for (const key of sliderKeys) {
    assert.equal(resetAll[key], CREATOR_SLIDER_SPECS[key].defaultValue);
  }
});

test('live 3D scene link: body sliders and presets change 3D model parameters immediately', () => {
  const baseState = DEFAULT_CREATOR_STATE;
  const base3d = computeCreatorBody3dParams(baseState);

  const taller = updateCreatorSlider(baseState, 'heightScale', 1.14);
  const taller3d = computeCreatorBody3dParams(taller);
  assert.notEqual(taller3d.rootScaleY, base3d.rootScaleY);
  assert.ok(taller3d.rootScaleY > base3d.rootScaleY);

  const broader = updateCreatorSlider(baseState, 'shoulderWidth', 1.18);
  const broader3d = computeCreatorBody3dParams(broader);
  assert.ok(broader3d.shoulderSpanX > base3d.shoulderSpanX);

  const turned = updateCreatorSlider(baseState, 'previewYawDeg', 45);
  const turned3d = computeCreatorBody3dParams(turned);
  assert.notEqual(turned3d.yawRad, base3d.yawRad);

  const resetTurn = resetCreatorSlider(turned, 'previewYawDeg');
  const resetTurn3d = computeCreatorBody3dParams(resetTurn);
  assert.equal(resetTurn3d.yawRad, base3d.yawRad);
});

test('missing value rejects', () => {
  const missingCommBytes = buildSampleMinimalVrmBinary({
    title: 'Missing Commercial',
    author: 'External',
    allowRedistribution: true,
  });
  const missingComm = parseVrmBinary(missingCommBytes, 'missing-comm.vrm');
  assert.equal(missingComm.ok, false);
  assert.equal(missingComm.allowsCommercialAndRedistribution, false);
  assert.match(missingComm.reason ?? '', /commercial use/i);

  const missingRedistBytes = buildSampleMinimalVrmBinary({
    title: 'Missing Redistribution',
    author: 'External',
    commercialUsage: 'corporation',
  });
  const missingRedist = parseVrmBinary(missingRedistBytes, 'missing-redist.vrm');
  assert.equal(missingRedist.ok, false);
  assert.equal(missingRedist.allowsCommercialAndRedistribution, false);
  assert.match(missingRedist.reason ?? '', /redistribution/i);

  const missingBothBytes = buildSampleMinimalVrmBinary({
    title: 'Missing Both',
    author: 'External',
  });
  const missingBoth = parseVrmBinary(missingBothBytes, 'missing-both.vrm');
  assert.equal(missingBoth.ok, false);
  assert.equal(missingBoth.allowsCommercialAndRedistribution, false);
  assert.match(missingBoth.reason ?? '', /commercial use and redistribution/i);

  // never read otherPermissionUrl as a permission value
  const otherUrlOnlyBytes = buildSampleMinimalVrmBinary({
    title: 'Other Permission URL Only',
    author: 'External',
    commercialUsage: 'corporation',
    otherPermissionUrl: 'https://example.com/allow-commercial-and-redistribution',
  });
  const otherUrlOnly = parseVrmBinary(otherUrlOnlyBytes, 'other-url.vrm');
  assert.equal(otherUrlOnly.ok, false);
  assert.equal(otherUrlOnly.allowsCommercialAndRedistribution, false);
  assert.match(otherUrlOnly.reason ?? '', /redistribution/i);
});

test('unknown value rejects', () => {
  const unknownBytes = buildSampleMinimalVrmBinary({
    title: 'Unknown Licence Avatar',
    author: 'External',
    commercialUsage: 'unknown',
    allowRedistribution: true,
  });
  const unknownParsed = parseVrmBinary(unknownBytes, 'unknown.vrm');
  assert.equal(unknownParsed.ok, false);
  assert.equal(unknownParsed.allowsCommercialAndRedistribution, false);
  assert.match(unknownParsed.reason ?? '', /commercial use/i);

  const unusualBytes = buildSampleMinimalVrmBinary({
    title: 'Unusual Value Avatar',
    author: 'External',
    commercialUsage: 'corporation',
    redistribution: 'conditional-ask-author',
  });
  const unusualParsed = parseVrmBinary(unusualBytes, 'unusual.vrm');
  assert.equal(unusualParsed.ok, false);
  assert.equal(unusualParsed.allowsCommercialAndRedistribution, false);
  assert.match(unusualParsed.reason ?? '', /redistribution/i);

  const restrictedBytes = buildSampleMinimalVrmBinary({
    title: 'Restricted Avatar',
    author: 'External',
    commercialUsage: 'Disallow',
    redistribution: 'Disallow',
  });
  const restricted = parseVrmBinary(restrictedBytes, 'restricted.vrm');
  assert.equal(restricted.ok, false);
  assert.equal(restricted.allowsCommercialAndRedistribution, false);
  assert.match(restricted.reason ?? '', /commercial use and redistribution/i);
});

test('VRM 0.x Allow passes', () => {
  const vrm0Bytes = buildSampleMinimalVrmBinary({
    title: 'Dreamer 0.x Body',
    author: 'DREAM Studio',
    version: '0.x',
    commercialUssageName: 'Allow',
    redistribution: 'Allow',
  });
  const parsed = parseVrmBinary(vrm0Bytes, 'dreamer-0x.vrm');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.title, 'Dreamer 0.x Body');
  assert.equal(parsed.author, 'DREAM Studio');
  assert.equal(parsed.version, '0.x');
  assert.equal(parsed.allowsCommercialAndRedistribution, true);
  assert.equal(parsed.reason, undefined);
});

test('VRM 1.0 corporation with allowRedistribution true passes', () => {
  const vrm1Bytes = buildSampleMinimalVrmBinary({
    title: 'Dreamer 1.0 Corp Body',
    author: 'DREAM Studio',
    version: '1.0',
    commercialUsage: 'corporation',
    allowRedistribution: true,
  });
  const parsed = parseVrmBinary(vrm1Bytes, 'dreamer-10-corp.vrm');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.title, 'Dreamer 1.0 Corp Body');
  assert.equal(parsed.author, 'DREAM Studio');
  assert.equal(parsed.version, '1.0');
  assert.equal(parsed.allowsCommercialAndRedistribution, true);
  assert.equal(parsed.reason, undefined);

  // personalProfit together with allowRedistribution: true also passes
  const vrm1ProfitBytes = buildSampleMinimalVrmBinary({
    title: 'Dreamer 1.0 Profit Body',
    author: 'DREAM Studio',
    version: '1.0',
    commercialUsage: 'personalProfit',
    allowRedistribution: true,
  });
  const parsedProfit = parseVrmBinary(vrm1ProfitBytes, 'dreamer-10-profit.vrm');
  assert.equal(parsedProfit.ok, true);
  assert.equal(parsedProfit.allowsCommercialAndRedistribution, true);
});

test('VRM 1.0 personalNonProfit rejects', () => {
  const nonProfitBytes = buildSampleMinimalVrmBinary({
    title: 'Non-Profit Avatar',
    author: 'External',
    version: '1.0',
    commercialUsage: 'personalNonProfit',
    allowRedistribution: true,
  });
  const parsed = parseVrmBinary(nonProfitBytes, 'non-profit.vrm');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.version, '1.0');
  assert.equal(parsed.allowsCommercialAndRedistribution, false);
  assert.match(parsed.reason ?? '', /commercial use/i);
});

test('VRM import: never embeds VRoid Studio', () => {
  const uiPath = path.resolve(__dirname, '../src/ui/CharacterCreatorModal.tsx');
  const uiCode = readFileSync(uiPath, 'utf8');
  assert.equal(/<iframe[^>]*vroid/i.test(uiCode), false, 'must never embed VRoid');
});
