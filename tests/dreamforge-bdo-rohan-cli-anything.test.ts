import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createCyberKnightGeometries,
  createSculptedSentinelColossusGeometry,
  createSculptedObeliskGeometry,
  createCrescentSlashArcGeometry,
  createRingWaveGeometry,
  createSkillPillarSpikeGeometry,
  createAegisBarrierShieldGeometry,
} from '../src/engine/scene/mesh.ts';
import {
  ACTION_MMO_CLASSES,
  SKILL_VFX_THEMES,
  DREAMFORGE_MODES,
  DREAMFORGE_STYLES,
  SkillVfxDirector,
} from '../src/engine/combat/skill-vfx.ts';
import {
  DREAM_CLI_HELP_TEXT,
  WHALE_SECURITY_PATRON_TIERS,
  executeCliAnythingCommand,
  runKidsPlaygroundSecurityAudit,
} from '../src/engine/cli-anything/cli-anything-bridge.ts';

test('Sculpted Action-MMORPG Characters (BDO / Rohan: Blood Feud): replaces flat 24-vertex boxes with contoured multi-ring armor, greatsword, colossus, and obelisks', () => {
  const knight = createCyberKnightGeometries();
  // A simple box has 24 vertices (72 floats). Sculpted armor parts have multi-ring contoured vertices.
  assert.ok(knight.torso.positions.length > 200);
  assert.ok(knight.head.positions.length > 200);
  assert.ok(knight.visor.positions.length > 100);
  assert.ok(knight.blade.positions.length > 150);
  assert.ok(knight.spine.positions.length > 150);
  assert.ok(knight.horns.positions.length > 100);

  const sentinel = createSculptedSentinelColossusGeometry();
  assert.ok(sentinel.positions.length > 200);

  const obelisk = createSculptedObeliskGeometry();
  assert.ok(obelisk.positions.length > 150);
});

test('Real 3D Combat Skill Visuals: generates crescent slash ribbons, shockwave rings, awakening pillars, and Aegis barrier shields across 4 classes and 4 themes', () => {
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
  director.setClassAndTheme('crimson-dekan', 'rohan-blood-crimson', 'stylized-semi-real-3d-game');
  director.triggerAwakeningComboShowcase(0, 0, 0, 0);

  assert.ok(director.slashRibbons.length >= 6);
  assert.ok(director.shockwaveRings.length >= 4);
  assert.ok(director.pillarSpikes.length >= 10);
  assert.ok(director.phantomClones.length >= 3);
  assert.ok(director.callouts.length >= 4);
});

test('CLI-Anything Text-In / Text-Out AI Team Control & Red/Tag/Triple-Team Kids Playground Security', () => {
  assert.ok(DREAM_CLI_HELP_TEXT.includes('DREAM-CLI'));

  const helpRes = executeCliAnythingCommand('dream-cli --help');
  assert.equal(helpRes.ok, true);
  assert.equal(helpRes.mode, 'text-in-text-out');

  const charRes = executeCliAnythingCommand(
    'dream-cli char set --class abyssal-awakening --vfx bdo-black-spirit --style tenebrist-painterly --json'
  );
  assert.equal(charRes.ok, true);
  assert.equal(charRes.mutation?.type, 'set-character-class');

  const skillRes = executeCliAnythingCommand('dream-cli skill cast --move combo-all --json');
  assert.equal(skillRes.ok, true);
  assert.equal(skillRes.mutation?.type, 'cast-skill');

  const dfRes = executeCliAnythingCommand('dream-cli dreamforge generate --mode world-seed --style cel-shaded-3d-game --json');
  assert.equal(dfRes.ok, true);
  assert.equal(dfRes.mutation?.type, 'dreamforge-generate');

  for (const mode of ['red-team', 'tag-team', 'triple-team'] as const) {
    const report = runKidsPlaygroundSecurityAudit(mode);
    assert.equal(report.vectorsBlocked, report.vectorsTested);
    assert.equal(report.kidsPlaygroundSafetyScore, 100);
    assert.equal(report.payToWinViolationCount, 0);
  }

  for (const tier of Object.values(WHALE_SECURITY_PATRON_TIERS)) {
    assert.equal(tier.combatAdvantagePercent, 0);
  }

  const dfHtml = path.resolve(process.cwd(), 'dreamforge', 'index.html');
  assert.equal(fs.existsSync(dfHtml), true);
});
