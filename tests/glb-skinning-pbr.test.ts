import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseGlb } from '../src/engine/assets/glb-loader.ts';
import {
  SkeletonAnimationMixer,
  applyFourBoneLbsToVertex,
} from '../src/engine/animation/skeleton-mixer.ts';
import {
  evaluateEnergyConservingPbr,
  applyTangentSpaceNormal,
} from '../src/engine/renderer/pbr-energy.ts';
import { Vec3 } from '../src/engine/math/vec3.ts';

const testGlbPath = path.resolve(
  process.cwd(),
  'public/assets/models/test-rigged-humanoid-walk-not-game-art.glb'
);

test('1. In-house GLB 2.0 binary loader parses meshes, PBR textures, 16-bone skeleton, 4-bone weights, and animation clips', () => {
  assert.ok(
    fs.existsSync(testGlbPath),
    'Headless Blender test humanoid GLB must exist at public/assets/models/test-rigged-humanoid-walk-not-game-art.glb'
  );

  const bytes = fs.readFileSync(testGlbPath);
  const asset = parseGlb(bytes);

  assert.ok(asset.meshes.length >= 1, 'Must parse at least 1 mesh primitive');
  const prim = asset.meshes[0];
  const geom = prim.geometry;

  assert.ok(geom.vertexCount >= 800, `Expected >= 800 vertices, got ${geom.vertexCount}`);
  assert.ok(geom.indexCount >= 1800, `Expected >= 1800 indices, got ${geom.indexCount}`);
  assert.equal(geom.tangents.length, geom.vertexCount * 4, 'Every vertex must have a vec4 tangent');
  assert.equal(geom.joints0.length, geom.vertexCount * 4, 'Every vertex must have 4 joint indices (JOINTS_0)');
  assert.equal(geom.weights0.length, geom.vertexCount * 4, 'Every vertex must have 4 skin weights (WEIGHTS_0)');

  // Verify 4-bone weights are normalized to 1.0 per vertex and multi-bone vertices exist
  let multiBoneVertexCount = 0;
  for (let v = 0; v < geom.vertexCount; v++) {
    const w0 = geom.weights0[v * 4 + 0];
    const w1 = geom.weights0[v * 4 + 1];
    const w2 = geom.weights0[v * 4 + 2];
    const w3 = geom.weights0[v * 4 + 3];
    const sum = w0 + w1 + w2 + w3;
    assert.ok(Math.abs(sum - 1.0) < 1e-4, `Vertex ${v} weights must sum to 1.0 (got ${sum})`);
    if (w1 > 0.05) multiBoneVertexCount++;
  }
  assert.ok(
    multiBoneVertexCount >= 200,
    `Expected >= 200 smoothly weighted multi-bone vertices across joints, got ${multiBoneVertexCount}`
  );

  // Verify decoded embedded PBR textures (BaseColor, Tangent Normal, Packed ORM)
  const mat = prim.material;
  assert.ok(mat.baseColorTexture, 'Material must have decoded baseColorTexture');
  assert.ok(mat.normalTexture, 'Material must have decoded normalTexture');
  assert.ok(mat.ormTexture, 'Material must have decoded packed ormTexture (Occlusion/Roughness/Metallic)');

  assert.equal(mat.baseColorTexture.width, 256);
  assert.equal(mat.baseColorTexture.height, 256);
  assert.equal(mat.baseColorTexture.data.length, 256 * 256 * 4);
  assert.equal(mat.normalTexture.data.length, 256 * 256 * 4);
  assert.equal(mat.ormTexture.data.length, 256 * 256 * 4);

  // Verify normal map has real tangent-space XY relief (not flat 128,128,255 everywhere)
  let perturbedNormalPixels = 0;
  for (let i = 0; i < mat.normalTexture.data.length; i += 4) {
    const nx = mat.normalTexture.data[i];
    const ny = mat.normalTexture.data[i + 1];
    if (Math.abs(nx - 128) > 6 || Math.abs(ny - 128) > 6) {
      perturbedNormalPixels++;
    }
  }
  assert.ok(
    perturbedNormalPixels > 4000,
    `Normal map must contain real bevel/rivet/flute relief (perturbed pixels=${perturbedNormalPixels})`
  );

  // Verify skeleton & inverseBindMatrices
  assert.ok(asset.skins.length >= 1, 'GLB must contain at least 1 skin');
  const skin = asset.skins[0];
  assert.equal(skin.joints.length, 16, 'Humanoid test rig must have 16 deform bones');
  assert.equal(skin.inverseBindMatrices.length, 16, 'Skin must have 16 inverseBindMatrices');
  assert.ok(skin.jointNames.includes('Hips') && skin.jointNames.includes('Thigh_L'), 'Skin must include Hips and Thigh_L');

  // Verify Walk and Idle animation clips
  const clipNames = asset.animations.map((a) => a.name);
  assert.ok(clipNames.includes('Walk'), `Animations must include Walk clip (found: ${clipNames.join(', ')})`);
  assert.ok(clipNames.includes('Idle'), `Animations must include Idle clip (found: ${clipNames.join(', ')})`);
});

test('2. Four-bone linear blend skinning, animation playback, clip blending, and dual render path parity', () => {
  const bytes = fs.readFileSync(testGlbPath);
  const asset = parseGlb(bytes);
  const geom = asset.meshes[0].geometry;
  const mixer = new SkeletonAnimationMixer(asset, 0);

  // Find a foot/shin vertex that swings during the Walk cycle
  let footVertIdx = 0;
  let minY = Infinity;
  for (let v = 0; v < geom.vertexCount; v++) {
    const y = geom.positions[v * 3 + 1];
    if (y < minY) {
      minY = y;
      footVertIdx = v;
    }
  }

  mixer.playClip('Walk');
  const jointsT0 = new Float32Array(mixer.evaluateAtTime(0.0));
  const posT0 = applyFourBoneLbsToVertex(geom, footVertIdx, jointsT0).position;

  const jointsTQuarter = new Float32Array(mixer.evaluateAtTime(0.25));
  const posTQuarter = applyFourBoneLbsToVertex(geom, footVertIdx, jointsTQuarter).position;

  const stepDisplacement = posT0.distanceTo(posTQuarter);
  assert.ok(
    stepDisplacement > 0.05,
    `4-bone LBS Walk animation must move foot vertices across the stride (displacement=${stepDisplacement.toFixed(4)}m)`
  );

  // Verify blending between Walk and Idle clips produces an intermediate pose
  mixer.playClip('Idle');
  const jointsIdle = new Float32Array(mixer.evaluateAtTime(0.25));
  const posIdle = applyFourBoneLbsToVertex(geom, footVertIdx, jointsIdle).position;

  mixer.setBlendClips('Walk', 'Idle', 0.5);
  const jointsBlended = new Float32Array(mixer.evaluateAtTime(0.25));
  const posBlended = applyFourBoneLbsToVertex(geom, footVertIdx, jointsBlended).position;

  const distToWalk = posBlended.distanceTo(posTQuarter);
  const distToIdle = posBlended.distanceTo(posIdle);
  assert.ok(
    distToWalk > 0.01 && distToIdle > 0.01,
    `50% Walk/Idle clip blend must produce an intermediate skinned vertex position (dWalk=${distToWalk.toFixed(4)}, dIdle=${distToIdle.toFixed(4)})`
  );

  // Verify both WebGPU and WebGL2 renderers implement 4-bone LBS, TBN normal maps, and ORM textures
  const webgpuSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/engine/renderer/webgpu-renderer.ts'),
    'utf8'
  );
  const webgl2Src = fs.readFileSync(
    path.resolve(process.cwd(), 'src/engine/renderer/webgl2-renderer.ts'),
    'utf8'
  );

  assert.ok(webgpuSrc.includes('skin.joints[j0]') && webgpuSrc.includes('in.weights0'), 'WebGPU WGSL must implement 4-bone LBS');
  assert.ok(webgl2Src.includes('uJointMatrices[j0]') && webgl2Src.includes('aWeights0'), 'WebGL2 GLSL must implement 4-bone LBS');
  assert.ok(webgpuSrc.includes('normalTex') && webgpuSrc.includes('ormTex'), 'WebGPU WGSL must sample normalTex and ormTex');
  assert.ok(webgl2Src.includes('uNormalTex') && webgl2Src.includes('uOrmTex'), 'WebGL2 GLSL must sample uNormalTex and uOrmTex');
});

test('3. Tangent-space normal mapping and energy-conserving PBR prevent bright metal from clipping to white', () => {
  const N = new Vec3(0, 1, 0);
  const T = new Vec3(1, 0, 0);
  const perturbed = applyTangentSpaceNormal(N, T, 1.0, new Vec3(0.45, -0.35, 0.82), 1.0);
  assert.ok(Math.abs(perturbed.length() - 1.0) < 1e-5, 'Perturbed world normal must be unit length');
  assert.ok(perturbed.x > 0.2 && Math.abs(perturbed.z) > 0.15, 'Tangent-space normal sample must tilt world normal along T and B');

  // Test bright silver armor plate under intense direct sunlight (the exact case that previously clipped to white)
  const silverPlate = evaluateEnergyConservingPbr({
    albedo: [0.95, 0.96, 0.98],
    roughness: 0.2,
    metallic: 0.92,
    occlusion: 1.0,
    normalWorld: new Vec3(0, 0.7071, 0.7071),
    viewDir: new Vec3(0, 0.7071, 0.7071),
    lightDir: new Vec3(0, 0.7071, 0.7071),
    lightColor: [1.35, 1.28, 1.18],
    skyAmbient: [0.36, 0.46, 0.62],
    groundBounce: [0.24, 0.19, 0.15],
    exposure: 1.05,
  });

  for (let c = 0; c < 3; c++) {
    assert.ok(
      silverPlate.energySum[c] <= 1.00001,
      `Channel ${c} kD + F (${silverPlate.energySum[c]}) must never exceed 1.0`
    );
    assert.ok(
      silverPlate.tonemappedSrgb[c] < 0.96,
      `Bright silver plate channel ${c} (${silverPlate.tonemappedSrgb[c].toFixed(4)}) must not clip to 1.0 white`
    );
  }
});

test('4. 30-copy skinned humanoid animation mixer benchmark runs well within 60 FPS frame budget', () => {
  const bytes = fs.readFileSync(testGlbPath);
  const asset = parseGlb(bytes);
  const mixers = Array.from({ length: 30 }, () => new SkeletonAnimationMixer(asset, 0));

  const frames = 60;
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) {
    const simTime = f / 60.0;
    for (let i = 0; i < 30; i++) {
      mixers[i].setBlendClips('Walk', 'Idle', (i % 5) * 0.1);
      mixers[i].evaluateAtTime(simTime + i * 0.15);
    }
  }
  const elapsedMs = performance.now() - t0;
  const avgMsPerFrame = elapsedMs / frames;

  assert.ok(
    avgMsPerFrame < 4.0,
    `30 animated skeletons must evaluate in < 4.0ms per frame to hold 60 FPS (measured ${avgMsPerFrame.toFixed(3)}ms/frame)`
  );
});
