import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WorldEvolutionDirector,
  quantizeColor16Bit,
} from '../src/engine/world/world-evolution.ts';
import {
  createCylinderDiscGeometry,
  createCircleCraftCharacterGeometries,
} from '../src/engine/scene/mesh.ts';
import { ConsumablesState } from '../src/engine/combat/consumables.ts';
import { GeminEyePetState, GeminEyePetShop } from '../src/engine/combat/pet-shop.ts';
import {
  Genie4WorldBridge,
  PRE_GASSED_BASE_DAO_WALLETS,
  MUSCLE_MEMORY_SHARED_SKILLS,
} from '../src/engine/world/genie4-world-bridge.ts';

test('100% In-House DREAM Engine: cycles AI-governed world evolution phases (Day Dream 3D -> Nightmare 3D -> 16-Bit Circle-Craft)', () => {
  const director = new WorldEvolutionDirector('day_dream_3d');
  assert.equal(director.phase, 'day_dream_3d');
  assert.equal(director.isCircle16Bit, false);

  const e1 = director.cyclePhase('Nightfall triggered');
  assert.equal(e1.phase, 'nightmare_3d');
  assert.equal(e1.geometryPrimitive, 'pbr-mesh');

  const e2 = director.cyclePhase('Morph into 16-Bit Circle-Craft');
  assert.equal(e2.phase, 'circle_16bit');
  assert.equal(director.isCircle16Bit, true);
  assert.equal(e2.geometryPrimitive, 'cylinder-circle-16bit');
  assert.equal(e2.colorDepthBits, 16);

  const e3 = director.cyclePhase('Return to Day Dream');
  assert.equal(e3.phase, 'day_dream_3d');
});

test('100% In-House DREAM Engine: quantizes RGB colors to authentic 16-bit RGB565 levels', () => {
  const q = quantizeColor16Bit([0.3333, 0.7777, 0.9111]);
  assert.equal(Math.abs(q[0] - Math.round(0.3333 * 31) / 31) < 0.001, true);
  assert.equal(Math.abs(q[1] - Math.round(0.7777 * 63) / 63) < 0.001, true);
  assert.equal(Math.abs(q[2] - Math.round(0.9111 * 31) / 31) < 0.001, true);
});

test('100% In-House DREAM Engine: constructs 16-Bit Circle-Craft character & primitives from radial cylinders and circular discs (never 24-vertex square boxes)', () => {
  const cyl = createCylinderDiscGeometry(0.5, 1.0, 0.5, 0, 0, 0, 16);
  assert.equal(cyl.vertexCount > 24, true);
  assert.equal(cyl.indexCount > 36, true);

  const circleChar = createCircleCraftCharacterGeometries();
  for (const part of Object.values(circleChar)) {
    assert.equal(part.vertexCount > 24, true);
  }
});

test('100% In-House DREAM Engine: enforces the Transparent AI Mission Gate (never counts personal out-of-pocket eBay donations as AI revenue)', () => {
  const director = new WorldEvolutionDirector();
  assert.equal(director.missionGate.aiBuiltEngine100Percent, true);
  assert.equal(director.missionGate.zeroExternalGameEngines, true);
  assert.equal(director.missionGate.personalOutOfPocketCountedAsAi, false);
  assert.equal(director.missionGate.readyFor24x7OpsisStream, false);

  director.updateMissionVerification({
    onlinerecycleAiIntakeVerified: true,
    publicDaoWalletAddress: '0xShrinersDAOTrackedWallet',
  });
  assert.equal(director.missionGate.readyFor24x7OpsisStream, true);
  assert.equal(director.missionGate.personalOutOfPocketCountedAsAi, false);
});

test('100% In-House DREAM Engine: maintains Consumables and GeminEYE NEEDs Convenience Shop parity', () => {
  const c = new ConsumablesState();
  assert.equal(c.useRed(50, 100), 85);
  assert.equal(c.canUseBlue(), false);
  c.advance(10.0);
  assert.equal(c.canUseBlue(), true);
  assert.equal(c.useFood(), true);
  assert.equal(c.advance(5.0), 10.0);

  const pet = new GeminEyePetState(3600);
  const shop = new GeminEyePetShop(500);
  assert.equal(shop.buySkin(pet, 'void'), true);
  assert.equal(pet.skin, 'void');
  assert.equal(shop.needsBalance, 440);
  assert.equal(shop.buyExtend(pet), true);
  assert.equal(pet.remainingSeconds, 7200);
  assert.equal(shop.needsBalance, 390);
});

test('100% In-House DREAM Engine: Genie 4 live 3D world steering, MuscleMemory skill sync, and Base Mainnet (8453) pre-gassed DAO wallets', () => {
  const bridge = new Genie4WorldBridge();
  const frame = bridge.synthesizeSteeredWorldFrame({
    promptId: 'lake-lumen-morph',
    textPrompt: 'Golden hour sanctuary morphing into 16-bit cylindrical circle-craft village',
    targetPhase: 'circle_16bit',
    steeringController: 'gemini-3.8-flash',
    nativeAmbientAudioCue: 'lake-lumen-wind-chimes-16bit',
    speakingCharacters: [
      {
        npcId: 'mireth',
        displayName: 'Mireth',
        voicePreset: 'Aoede',
        openingLine: 'The Moon Gate remembers every dodge.',
      },
    ],
    maxShortsClipSeconds: 65.0, // Should be hard-capped to <= 59.0s
  });

  assert.equal(frame.phase, 'circle_16bit');
  assert.equal(frame.shortsReady, true);
  assert.equal(frame.cappedDurationSeconds <= 59.0, true);
  assert.equal(
    frame.nodes.every((n) => n.primitive === 'cylinder-disc-circle'),
    true
  );

  // Verify all 4 pre-gassed Base Mainnet (8453) DAO / Splitter / Charity addresses
  assert.equal(PRE_GASSED_BASE_DAO_WALLETS.length, 4);
  const shrinersWallet = PRE_GASSED_BASE_DAO_WALLETS.find((w) => w.role === 'charity_shriners');
  assert.equal(shrinersWallet?.address, '0x8d3dEADbE2b4B857A43331D459270B5eedC7084e');
  assert.equal(shrinersWallet?.charityEin, '36-2193608');
  assert.equal(shrinersWallet?.chainId, 8453);

  // Verify MuscleMemory cross-agent skill rules exist
  assert.equal(MUSCLE_MEMORY_SHARED_SKILLS.length >= 3, true);
});

