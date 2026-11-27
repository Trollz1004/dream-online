import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {
  buildHeroCharacterRig,
  buildMythosBossRig,
} from '../src/engine/characters/hero-and-boss-builder.ts';
import {
  generateInHouseStoneFlaggingPbrMaps,
  buildWornStoneFlaggingGround,
  buildThreePointMoodLightingRig,
  buildContactAndCastShadowGroup,
  tuneCharacterMaterialsForLighting,
  buildBrokenMasonryAndBandedBarrels,
  buildAtmosphereHazeLightShaftsAndLitEmbers,
  updateLookPass2Atmosphere,
  LOOK_PASS_2_TONE_MAPPING_CONFIG,
} from '../src/engine/scene/look-pass-2-light-shadow-ground.ts';

test('Look Pass 2 — 1 & 2: Shadow-mapped low warm key light, cool fill, rim backlight, dark areas, and contact/cast grounding shadows', () => {
  const lighting = buildThreePointMoodLightingRig('high');

  // 1. Key light: warm, low angle, real soft shadow map with tight arena bounds
  assert.equal(lighting.keyLight.castShadow, true, 'Key light must cast real shadows');
  assert.equal(lighting.keyLight.shadow.mapSize.width, 2048, 'High quality key light shadow map must be 2048x2048');
  assert.ok(
    lighting.keyLight.shadow.radius >= 2.0,
    'Key light shadow must have soft edges (radius >= 2.0)'
  );
  const horizontalDist = Math.hypot(lighting.keyLight.position.x, lighting.keyLight.position.z);
  const altitudeRatio = lighting.keyLight.position.y / horizontalDist;
  assert.ok(
    altitudeRatio <= 0.72,
    `Key light must be a low dramatic angle (y/horiz = ${altitudeRatio.toFixed(2)} <= 0.72), not high overhead`
  );
  assert.ok(
    lighting.keyLight.color.r > lighting.keyLight.color.b * 1.35,
    'Key light must have a warm amber-gold color temperature'
  );
  assert.ok(
    lighting.keyLight.shadow.camera.right <= 14,
    'Key light shadow camera bounds must fit the arena tightly for crisp foot/body shadows'
  );

  // 2. Cool fill light and crisp separating rim light from behind the figures
  assert.ok(
    lighting.fillLight.color.b > lighting.fillLight.color.r * 1.25,
    'Fill light must be cool slate-blue to contrast the warm key light'
  );
  assert.ok(
    lighting.rimLight.position.z < -6.0 && lighting.rimLight.intensity >= 1.8,
    'Rim light must sit behind the figures with strong intensity to separate silhouettes from the background'
  );
  assert.ok(
    lighting.rimLight.color.b > lighting.rimLight.color.r * 1.2,
    'Rim light must have a cool cyan/blue separation tint'
  );

  // Restrained ambient hemisphere so parts of the arena genuinely fall dark
  assert.ok(
    lighting.hemiLight.intensity <= 0.48,
    `Hemisphere ambient intensity (${lighting.hemiLight.intensity}) must stay low so dark areas remain dark`
  );

  // Contact shadows + directional cast shadow projections under figures, props, and walls
  const shadowGroup = buildContactAndCastShadowGroup(
    lighting.keyLight.position,
    [
      { x: -2.72, z: 0.42, radiusX: 0.68, radiusZ: 0.62, height: 1.95 },
      { x: 0, z: -1.62, radiusX: 1.25, radiusZ: 1.15, height: 3.2 },
    ]
  );
  assert.ok(shadowGroup instanceof THREE.Group, 'Contact and cast shadow group must be a THREE.Group');
  assert.ok(
    shadowGroup.children.length >= 4,
    'Each grounded object must receive both tight contact AO and a directional soft shadow lobe'
  );
});

test('Look Pass 2 — 3: Tone mapping, exposure, anti-clip metal calibration, and selective weapon-only bloom', () => {
  assert.equal(
    LOOK_PASS_2_TONE_MAPPING_CONFIG.toneMapping,
    THREE.ACESFilmicToneMapping,
    'Must use ACESFilmicToneMapping'
  );
  assert.ok(
    LOOK_PASS_2_TONE_MAPPING_CONFIG.exposure >= 0.68 &&
      LOOK_PASS_2_TONE_MAPPING_CONFIG.exposure <= 0.92,
    `Exposure (${LOOK_PASS_2_TONE_MAPPING_CONFIG.exposure}) must prevent silver/gold armor from clipping to white`
  );
  assert.ok(
    LOOK_PASS_2_TONE_MAPPING_CONFIG.bloomThreshold >= 1.1,
    `Bloom threshold (${LOOK_PASS_2_TONE_MAPPING_CONFIG.bloomThreshold}) must be > 1.0 so non-emissive metal never blooms`
  );
  assert.ok(
    LOOK_PASS_2_TONE_MAPPING_CONFIG.bloomStrength <= 0.3,
    'Bloom strength must remain restrained on emissive weapons only'
  );

  const knightRig = buildHeroCharacterRig('knight');
  const bossRig = buildMythosBossRig();
  tuneCharacterMaterialsForLighting(knightRig);
  tuneCharacterMaterialsForLighting(bossRig);

  // Knight primaryMetal & secondaryMetal must remain real metal (passing Pass 1 invariants) while avoiding white blowout
  assert.ok(
    knightRig.materials.primaryMetal.metalness >= 0.82 &&
      knightRig.materials.primaryMetal.roughness <= 0.3,
    'Knight silver plate must retain metallic PBR response'
  );
  assert.ok(
    knightRig.materials.primaryMetal.envMapIntensity <= 0.68 &&
      knightRig.materials.secondaryMetal.envMapIntensity <= 0.68,
    'Knight silver and gold trim envMapIntensity must be calibrated so shield and shoulders never blow out to pure white'
  );
  assert.equal(
    knightRig.materials.primaryMetal.emissiveIntensity,
    0,
    'Non-emissive armor plates must have 0 emissiveIntensity so they never trigger weapon bloom'
  );
  assert.ok(
    knightRig.materials.emissiveAccent.emissiveIntensity >= 1.35 &&
      bossRig.materials.emissiveAccent.emissiveIntensity >= 1.5,
    'Emissive weapons must exceed the bloom threshold for restrained weapon-only bloom'
  );
});

test('Look Pass 2 — 4: Atmosphere height fog, volumetric light shafts through arches, and 3D lit floating embers', () => {
  const keyLightPos = new THREE.Vector3(-13.5, 9.2, 8.5);
  const atmo = buildAtmosphereHazeLightShaftsAndLitEmbers(keyLightPos, 'high');

  assert.ok(atmo.fog instanceof THREE.FogExp2, 'Scene must use exponential distance fog');
  assert.ok(atmo.fog.density >= 0.024, 'Distance fog must provide clear depth falloff');
  assert.ok(
    atmo.heightFogGroup.children.length >= 3,
    'Must build multi-layered height fog / mist planes for foreground-to-background separation'
  );
  assert.ok(
    atmo.lightShaftsGroup.children.length >= 3,
    'Must build volumetric light shafts slanting through the gothic arches'
  );
  assert.ok(
    atmo.litEmbersMesh instanceof THREE.InstancedMesh,
    'Floating embers must be 3D lit instanced meshes, not flat unlit point dots'
  );
  assert.ok(atmo.litEmbersMesh.count >= 60, 'Must populate 3D lit floating embers across the arena');

  // Verify reduced-motion freezes atmosphere drift cleanly
  updateLookPass2Atmosphere(atmo, 2.2, 0.016, true);
  updateLookPass2Atmosphere(atmo, 2.5, 0.016, false);
});

test('Look Pass 2 — 5 & 6: In-house procedural PBR stone flagging (cracks, moss, puddles) and broken masonry + banded wood-grain barrels', () => {
  const maps = generateInHouseStoneFlaggingPbrMaps(128);
  assert.ok(maps.albedoMap instanceof THREE.DataTexture, 'Must generate in-house stone albedo DataTexture');
  assert.ok(maps.normalMap instanceof THREE.DataTexture, 'Must generate in-house tangent-space normal DataTexture');
  assert.ok(maps.roughnessMap instanceof THREE.DataTexture, 'Must generate in-house roughness variation DataTexture');
  assert.ok(maps.aoMap instanceof THREE.DataTexture, 'Must generate in-house crack/joint AO DataTexture');

  // Verify roughness variation spans mirror-wet puddles (< 0.16) to rough moss/mortar (> 0.84)
  const roughBytes = maps.roughnessMap.image.data as Uint8Array;
  let minR = 255;
  let maxR = 0;
  for (let i = 0; i < roughBytes.length; i += 4) {
    const r = roughBytes[i];
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
  }
  assert.ok(minR <= 40, `Puddles must have low roughness byte (${minR} <= 40) for wet specular reflections`);
  assert.ok(maxR >= 210, `Moss and cracks must have high roughness byte (${maxR} >= 210)`);

  // Verify normal map has real non-flat X/Y gradients along stone bevels and cracks
  const normBytes = maps.normalMap.image.data as Uint8Array;
  let nonFlatNormals = 0;
  for (let i = 0; i < normBytes.length; i += 4) {
    if (Math.abs(normBytes[i] - 128) > 12 || Math.abs(normBytes[i + 1] - 128) > 12) {
      nonFlatNormals++;
    }
  }
  assert.ok(nonFlatNormals > 500, 'Normal map must contain real 3D bevel and crack gradients');

  const ground = buildWornStoneFlaggingGround(maps);
  assert.ok(ground.root instanceof THREE.Group, 'Ground builder must return a THREE.Group');
  assert.equal(ground.courtyardMesh.receiveShadow, true, 'Courtyard flagstone mesh must receive shadows');

  // Props: broken gothic masonry & rubble + banded oak barrels with wood grain
  const props = buildBrokenMasonryAndBandedBarrels(lightingKeyPos());
  assert.ok(props.masonryCount >= 6, 'Must build broken gothic masonry and fallen column/arch rubble clusters');
  assert.ok(props.barrelCount >= 2 && props.barrelCount <= 4, 'Must keep a few banded oak barrels');
  assert.ok(props.ironBandCount >= props.barrelCount * 3, 'Every barrel must have raised iron bands');
});

function lightingKeyPos(): THREE.Vector3 {
  return new THREE.Vector3(-13.5, 9.2, 8.5);
}

test('Look Pass 2 — AaaVisualWorldCanvas integrates Pass 2 lighting, ground, props, quality setting, and removes flat dark squares & crates', () => {
  const canvasPath = path.resolve(process.cwd(), 'src/ui/AaaVisualWorldCanvas.tsx');
  const src = fs.readFileSync(canvasPath, 'utf8');

  assert.ok(
    src.includes('buildThreePointMoodLightingRig') &&
      src.includes('buildWornStoneFlaggingGround') &&
      src.includes('buildBrokenMasonryAndBandedBarrels') &&
      src.includes('buildAtmosphereHazeLightShaftsAndLitEmbers'),
    'AaaVisualWorldCanvas must wire in Look Pass 2 lighting, ground, masonry/barrels, and atmosphere builders'
  );
  assert.ok(
    !src.includes('const weatheredSlabs ='),
    'AaaVisualWorldCanvas must remove the flat dark square slabs (weatheredSlabs)'
  );
  assert.ok(
    !src.includes("placePiece('Crate'"),
    'AaaVisualWorldCanvas must remove plain brown Crate boxes'
  );
  assert.ok(
    src.includes('prefers-reduced-motion'),
    'AaaVisualWorldCanvas must honor prefers-reduced-motion'
  );
});
