import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const canvasPath = path.resolve(process.cwd(), 'src/ui/AaaVisualWorldCanvas.tsx');
const showcasePath = path.resolve(process.cwd(), 'public/dreamforge-showcase.html');
const bossKitPath = path.resolve(process.cwd(), 'public/assets/models/veynar-boss-armor-kit.glb');

test('Sunken Bastion Film-Set Arena & Mouse Camera Orbit: Clean-Room & Technical Verification', () => {
  const src = fs.readFileSync(canvasPath, 'utf8');
  const html = fs.readFileSync(showcasePath, 'utf8');

  // 1. Mouse Camera Orbit + Scroll Wheel Zoom + Smooth Follow + Raycast Wall Collision
  assert.ok(src.includes("addEventListener('pointerdown', onPointerDown)"), 'Must wire pointerdown for mouse drag orbit');
  assert.ok(src.includes("addEventListener('pointermove', onPointerMove)"), 'Must wire pointermove for mouse drag orbit');
  assert.ok(src.includes("addEventListener('wheel', onWheel"), 'Must wire scroll wheel zoom');
  assert.ok(src.includes('smoothFocus.lerp(desiredFocus'), 'Must smoothly follow the hero');
  assert.ok(src.includes('raycaster.intersectObjects(cameraColliders'), 'Must raycast against arena colliders so walls never block the view');

  // 2. Real Tiled CC0 PBR Ground, HDRI-Style Sky IBL, Animated Hero, and Myth@s Boss Kit
  assert.ok(src.includes('/assets/third_party/textures/facade/concrete_wall_003_diff_1k.jpg'), 'Must load Poly Haven CC0 flagstone PBR textures');
  assert.ok(src.includes('/assets/third_party/textures/rock/rock_face_03_diff_1k.jpg'), 'Must load Poly Haven CC0 crag rock PBR textures');
  assert.ok(src.includes('new THREE.PMREMGenerator(renderer)'), 'Must generate image-based lighting environment');
  assert.ok(src.includes('/assets/third_party/quaternius_outfits/Male_Ranger.gltf'), 'Must load animated CC0 Ranger hero');
  assert.ok(src.includes('entry.bone.quaternion.copy(entry.restQuat).multiply(deltaQ)'), 'Must post-multiply bone rest quaternions so arms are lowered from T-pose');
  assert.ok(fs.existsSync(bossKitPath), 'Blender-built polygonal boss armor & polearm kit must exist on disk');

  // 3. Soft Particle Sprites, Ribbon Slash Trail, Real Hit Detection & Obsidian Memory-Graph Witness
  assert.ok(src.includes('createSoftParticleTexture'), 'Must use soft radial particle textures');
  assert.ok(!src.includes('TorusGeometry'), 'Must not use wire-ring TorusGeometry');
  assert.ok(src.includes('spawnRealHitImpact'), 'Damage numbers must come from real hit impacts only');
  assert.ok(src.includes('MYTH@S'), 'Must feature canonical DREAM boss Myth@s from Obsidian memory-graph');
  assert.ok(src.includes('Mireth will remember'), 'Must log real combat hits to Mireth Memory-Graph witness feed');

  // 4. Zero External Game / Trademark Names Anywhere
  const forbiddenPattern = /\b(diablo|black desert|bdo|rohan|spider-man|spiderman|valencia|arreat|azmodan)\b/i;
  assert.ok(!forbiddenPattern.test(src), 'AaaVisualWorldCanvas.tsx must contain zero external trademark names');
  assert.ok(!forbiddenPattern.test(html), 'dreamforge-showcase.html must contain zero external trademark names');
});
