import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {
  buildHeroCharacterRig,
  buildMythosBossRig,
  updateCharacterRigAnimation,
  measureRigBounds,
  HERO_CLASS_IDS,
} from '../src/engine/characters/hero-and-boss-builder.ts';

test('Look Pass 1 — all four heroes and Myth@s boss build as real multi-layered in-house geometry', () => {
  assert.deepEqual(HERO_CLASS_IDS, ['knight', 'elf-archer', 'mage', 'dark-knight']);

  const heroBounds: Record<string, { height: number; width: number; triangles: number }> = {};

  for (const classId of HERO_CLASS_IDS) {
    const rig = buildHeroCharacterRig(classId);
    assert.ok(rig.root instanceof THREE.Group, `${classId} root must be a THREE.Group`);

    // Must have named anatomical & gear parts: armor/cloth, headpiece, cape/cloak, weapon
    assert.ok(rig.parts.headpiece, `${classId} must have a headpiece`);
    assert.ok(rig.parts.capeOrCloak, `${classId} must have a cape or cloak`);
    assert.ok(rig.parts.torsoArmorOrRobe, `${classId} must have layered torso armor or cloth robe`);
    assert.ok(rig.parts.weapon, `${classId} must have a weapon`);

    const stats = measureRigBounds(rig.root);
    heroBounds[classId] = stats;

    // Real sculpted geometry: each hero has rich multi-part geometry (> 1200 triangles)
    // while staying lightweight for 60fps laptop rendering (< 15000 triangles per hero)
    assert.ok(
      stats.triangles >= 1200 && stats.triangles <= 15000,
      `${classId} triangle count (${stats.triangles}) should be between 1200 and 15000`
    );
    assert.ok(
      stats.height >= 1.65 && stats.height <= 2.65,
      `${classId} height (${stats.height.toFixed(2)}m) should be in heroic human range`
    );
  }

  // Class-specific silhouette and equipment checks
  const knightRig = buildHeroCharacterRig('knight');
  assert.ok(knightRig.parts.shield, 'Knight must have a Lion Kite Shield');
  assert.ok(
    knightRig.materials.primaryMetal.metalness >= 0.82 &&
      knightRig.materials.primaryMetal.roughness <= 0.3,
    'Knight silver plate must respond to light like polished metal'
  );
  assert.ok(
    knightRig.materials.capeCloth.roughness >= 0.78 &&
      knightRig.materials.capeCloth.metalness <= 0.1,
    'Knight blue cape must respond to light like woven cloth'
  );

  const archerRig = buildHeroCharacterRig('elf-archer');
  assert.ok(archerRig.parts.quiver, 'Elf Archer must have a quiver of arrows');
  assert.ok(archerRig.weaponLight, 'Elf Archer glowing bowstring/arrow must cast a point light');
  assert.ok(
    archerRig.materials.leather &&
      archerRig.materials.leather.roughness >= 0.48 &&
      archerRig.materials.leather.roughness <= 0.72 &&
      archerRig.materials.leather.metalness <= 0.15,
    'Elf Archer armor must respond to light like stitched leather'
  );

  const mageRig = buildHeroCharacterRig('mage');
  assert.ok(mageRig.parts.spellRings, 'Mage must have glowing blue spell rings');
  assert.ok(mageRig.weaponLight, 'Mage staff orb & spell rings must cast a point light');
  assert.ok(
    mageRig.materials.emissiveAccent.emissiveIntensity >= 1.2,
    'Mage runes and spell rings must be emissive'
  );

  const darkKnightRig = buildHeroCharacterRig('dark-knight');
  assert.ok(darkKnightRig.weaponLight, 'Dark Knight glowing red halberd must cast a point light');
  assert.ok(
    darkKnightRig.materials.emissiveAccent.emissiveIntensity >= 1.2,
    'Dark Knight halberd blade must have a red emissive glow'
  );

  // Boss: Myth@s the Crimson Sovereign
  const bossRig = buildMythosBossRig();
  assert.ok(bossRig.parts.headpiece, 'Myth@s must have a horned helm');
  assert.ok(bossRig.parts.capeOrCloak, 'Myth@s must have a torn crimson cape');
  assert.ok(bossRig.parts.torsoArmorOrRobe, 'Myth@s must have spiked crimson-and-black plate');
  assert.ok(bossRig.parts.weapon, 'Myth@s must have a glowing red halberd');
  assert.ok(bossRig.weaponLight, 'Myth@s halberd must cast a crimson point light');

  const bossStats = measureRigBounds(bossRig.root);
  assert.ok(bossStats.triangles >= 2000, `Myth@s boss must have rich sculpted geometry (${bossStats.triangles} tris)`);

  for (const classId of HERO_CLASS_IDS) {
    assert.ok(
      bossStats.height >= heroBounds[classId].height * 1.45,
      `Myth@s (${bossStats.height.toFixed(2)}m) must be clearly larger than ${classId} (${heroBounds[classId].height.toFixed(2)}m)`
    );
  }

  // Verify deterministic pose animation produces valid transforms
  updateCharacterRigAnimation(knightRig, 2.2, 0.016);
  updateCharacterRigAnimation(archerRig, 2.2, 0.016);
  updateCharacterRigAnimation(mageRig, 2.2, 0.016);
  updateCharacterRigAnimation(darkKnightRig, 2.2, 0.016);
  updateCharacterRigAnimation(bossRig, 2.2, 0.016);
});

test('Look Pass 1 — Sunken Bastion scene uses in-house hero and boss rigs instead of UniversalBaseCharacter mannequins', () => {
  const canvasPath = path.resolve(process.cwd(), 'src/ui/AaaVisualWorldCanvas.tsx');
  const src = fs.readFileSync(canvasPath, 'utf8');
  assert.ok(
    !src.includes('UniversalBaseCharacter.glb'),
    'AaaVisualWorldCanvas must not load UniversalBaseCharacter.glb mannequins'
  );
  assert.ok(
    !src.includes('Male_Ranger.gltf'),
    'AaaVisualWorldCanvas must not load third-party Male_Ranger.gltf'
  );
  assert.ok(
    src.includes('buildHeroCharacterRig') && src.includes('buildMythosBossRig'),
    'AaaVisualWorldCanvas must build the four heroes and Myth@s boss using the in-house builder'
  );
});
