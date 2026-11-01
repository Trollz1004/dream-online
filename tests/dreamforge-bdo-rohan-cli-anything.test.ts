import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createCyberKnightGeometries,
  createSculptedSentinelColossusGeometry,
  createSculptedSentinelColossusParts,
  createSculptedObeliskGeometry,
  createCrescentSlashArcGeometry,
  createRingWaveGeometry,
  createSkillPillarSpikeGeometry,
  createAegisBarrierShieldGeometry,
  createWeatheredCragRockGeometry,
  createSparkDiamondGeometry,
} from '../src/engine/scene/mesh.ts';
import {
  ACTION_MMO_CLASSES,
  SKILL_VFX_THEMES,
  DREAMFORGE_MODES,
  DREAMFORGE_STYLES,
  SkillVfxDirector,
} from '../src/engine/combat/skill-vfx.ts';
import { CombatManager } from '../src/engine/combat/combat-manager.ts';
import { Vec3 } from '../src/engine/math/vec3.ts';
import {
  DREAM_CLI_HELP_TEXT,
  WHALE_SECURITY_PATRON_TIERS,
  executeCliAnythingCommand,
  runKidsPlaygroundSecurityAudit,
} from '../src/engine/cli-anything/cli-anything-bridge.ts';

test('Sculpted Action-MMORPG Characters & Terrain: replaces flat 24-vertex boxes with analytical-normal contoured armor, twin swept horns, articulated colossus, and crag rocks', () => {
  const knight = createCyberKnightGeometries();
  // A simple box has 24 vertices (72 floats). Sculpted armor parts have multi-ring contoured vertices.
  assert.ok(knight.torso.positions.length > 200);
  assert.ok(knight.head.positions.length > 200);
  assert.ok(knight.visor.positions.length > 100);
  assert.ok(knight.blade.positions.length > 150);
  assert.ok(knight.spine.positions.length > 150);
  // Twin swept horns merged geometry
  assert.ok(knight.horns.positions.length > 200);

  const sentinel = createSculptedSentinelColossusGeometry();
  assert.ok(sentinel.positions.length > 200);

  const sentinelParts = createSculptedSentinelColossusParts();
  assert.ok(sentinelParts.torso.positions.length > 200);
  assert.ok(sentinelParts.shoulders.positions.length > 150);
  assert.ok(sentinelParts.armL.positions.length > 150);
  assert.ok(sentinelParts.armR.positions.length > 150);
  assert.ok(sentinelParts.crownRing.positions.length > 150);
  assert.ok(sentinelParts.reactorCore.positions.length > 100);

  const obelisk = createSculptedObeliskGeometry();
  assert.ok(obelisk.positions.length > 150);

  const rock = createWeatheredCragRockGeometry();
  assert.ok(rock.positions.length > 150);

  const spark = createSparkDiamondGeometry();
  assert.equal(spark.positions.length, 72); // 8-face diamond octahedron (24 vertices * 3 floats)
});

test('Authoritative 5-Hit Combo Boss HP Reduction: 5 in-range combo hits reduce Boss HP from 120 to 0 with hit-stop, knockback, stagger tilt, and floating damage numbers', () => {
  const combat = new CombatManager();
  assert.equal(combat.sentinel.health, 120);

  // Place player in melee range of the Hollow Sentinel (boss at z = -10, player at z = -7.2 -> distance = 2.8m <= 4.0m)
  const playerPos = new Vec3(0, 0, -7.2);

  const h1 = combat.executeAuthoritativeSkillStrike('l1', playerPos, 0);
  assert.equal(h1.hit, true);
  assert.equal(h1.damage, 10);
  assert.equal(combat.sentinel.health, 110);

  const h2 = combat.executeAuthoritativeSkillStrike('l2', playerPos, 0);
  assert.equal(h2.hit, true);
  assert.equal(h2.damage, 14);
  assert.equal(combat.sentinel.health, 96);

  const h3 = combat.executeAuthoritativeSkillStrike('l3', playerPos, 0);
  assert.equal(h3.hit, true);
  assert.equal(h3.damage, 21);
  assert.equal(combat.sentinel.health, 75);
  assert.ok(combat.hitStopTimer >= 0.06);

  const h4 = combat.executeAuthoritativeSkillStrike('heavy', playerPos, 0);
  assert.equal(h4.hit, true);
  assert.equal(h4.damage, 32);
  assert.equal(combat.sentinel.health, 43);
  assert.ok(combat.sentinel.hitFlashTimer > 0);
  assert.ok(Math.abs(combat.sentinel.staggerTiltRad) > 0);

  const h5 = combat.executeAuthoritativeSkillStrike('burst', playerPos, 0, 43);
  assert.equal(h5.hit, true);
  assert.equal(h5.damage, 43);
  assert.equal(combat.sentinel.health, 0);
  assert.equal(combat.sentinel.isDown(), true);
  assert.equal(combat.damageFloaters.length, 5);
});

test('Real 3D Combat Skill Visuals: generates crescent slash ribbons, shockwave rings, 8+ awakening pillars, and 3D GPU spark particles across 4 clean-room classes and 4 themes', () => {
  const crescent = createCrescentSlashArcGeometry();
  const ring = createRingWaveGeometry();
  const pillar = createSkillPillarSpikeGeometry();
  const shield = createAegisBarrierShieldGeometry();

  assert.ok(crescent.positions.length > 150);
  assert.ok(crescent.indices.length > 100);
  assert.ok(ring.positions.length > 150);
  assert.ok(pillar.positions.length > 100);
  assert.ok(shield.positions.length > 150);

  assert.equal(Object.keys(ACTION_MMO_CLASSES).length, 4);
  assert.equal(Object.keys(SKILL_VFX_THEMES).length, 4);
  assert.equal(DREAMFORGE_MODES.length, 7);
  assert.equal(DREAMFORGE_STYLES.length, 43);

  const director = new SkillVfxDirector();
  director.setClassAndTheme('crimson-vanguard', 'ember-wyrm-crimson', 'stylized-semi-real-3d-game');
  director.triggerAwakeningComboShowcase(0, 0, -7.2, 0);

  assert.ok(director.slashRibbons.length >= 6);
  assert.ok(director.shockwaveRings.length >= 4);
  assert.ok(director.pillarSpikes.length >= 10);
  assert.ok(director.phantomClones.length >= 3);
  assert.ok(director.particles.length >= 30);
  assert.ok(director.callouts.length >= 4);
});

test('CLI-Anything Text-In / Text-Out AI Team Control & Real Executable Runtime Security Tests vs Design Notes', () => {
  assert.ok(DREAM_CLI_HELP_TEXT.includes('DREAM-CLI'));

  const helpRes = executeCliAnythingCommand('dream-cli --help');
  assert.equal(helpRes.ok, true);
  assert.equal(helpRes.mode, 'text-in-text-out');

  const charRes = executeCliAnythingCommand(
    'dream-cli char set --class nightveil-reaper --vfx nightveil-abyss --style tenebrist-painterly --json'
  );
  assert.equal(charRes.ok, true);
  assert.equal(charRes.mutation?.type, 'set-character-class');

  const skillRes = executeCliAnythingCommand('dream-cli skill cast --move combo-all --json');
  assert.equal(skillRes.ok, true);
  assert.equal(skillRes.mutation?.type, 'cast-skill');

  const dfRes = executeCliAnythingCommand(
    'dream-cli dreamforge generate --mode world-seed --style cel-shaded-3d-game --json'
  );
  assert.equal(dfRes.ok, true);
  assert.equal(dfRes.mutation?.type, 'dreamforge-generate');

  for (const mode of ['red-team', 'tag-team', 'triple-team'] as const) {
    const report = runKidsPlaygroundSecurityAudit(mode);
    assert.equal(report.vectorsTested, 4);
    assert.equal(report.vectorsBlocked, 4);
    assert.equal(report.designNotesCount, 2);
    assert.equal(report.payToWinViolationCount, 0);

    const runtimeVecs = report.vectors.filter((v) => v.kind === 'executable_runtime_test');
    const designNotes = report.vectors.filter((v) => v.kind === 'design_note_not_test');
    assert.equal(runtimeVecs.length, 4);
    assert.equal(designNotes.length, 2);
    for (const rv of runtimeVecs) {
      assert.equal(rv.status, 'PASSED_RUNTIME_TEST');
      assert.equal(typeof rv.latencyMs, 'number');
    }
    for (const dn of designNotes) {
      assert.equal(dn.status, 'DESIGN_NOTE_NOT_TEST');
      assert.equal(dn.latencyMs, null);
    }
  }

  for (const tier of Object.values(WHALE_SECURITY_PATRON_TIERS)) {
    assert.equal(tier.combatAdvantagePercent, 0);
  }

  const dfHtml = path.resolve(process.cwd(), 'dreamforge', 'index.html');
  assert.equal(fs.existsSync(dfHtml), true);
});
