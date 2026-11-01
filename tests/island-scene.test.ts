import test from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, TIER_ORDER, parseTier } from '../src/engine/island/quality.ts';
import {
  DECK_Y, WATER_Y, deckAt, grassPlacements, groundHeight, rockPlacements, terrainHeight, treePlacements,
} from '../src/engine/island/world.ts';
import { MeshBuilder, FLOATS_PER_VERTEX, MAT } from '../src/engine/island/geometry.ts';
import { buildFox, buildTerrain, buildStaticScene } from '../src/engine/island/scene.ts';

test('island world is persistent: height is a pure function of position', () => {
  const samples: [number, number][] = [[0, 0], [12.5, -40], [-80, -170], [35, 20], [-150, -228]];
  for (const [x, z] of samples) {
    assert.equal(terrainHeight(x, z), terrainHeight(x, z));
  }
  // The boardwalk start sits over water and the fox stands on the deck.
  assert.ok(terrainHeight(0, 8) < WATER_Y, 'start of boardwalk is over the lagoon');
  assert.ok(deckAt(0, 8));
  assert.equal(groundHeight(0, 8), DECK_Y);
});

test('quality tiers only take prefixes of the same seeded placement lists', () => {
  const trees = treePlacements();
  const again = treePlacements();
  assert.deepEqual(trees.slice(0, 50), again.slice(0, 50));
  const lowTrees = trees.slice(0, TIERS.low.treeCount);
  const ultraTrees = trees.slice(0, TIERS.ultra.treeCount);
  assert.deepEqual(lowTrees, ultraTrees.slice(0, lowTrees.length), 'a tree on Low is the same tree on Ultra');
  assert.ok(grassPlacements().length >= TIERS.ultra.grassCount);
  assert.ok(rockPlacements().length >= TIERS.ultra.rockCount);
});

test('tiers scale monotonically and Low stays integrated-GPU friendly', () => {
  for (let i = 1; i < TIER_ORDER.length; i++) {
    const a = TIERS[TIER_ORDER[i - 1]], b = TIERS[TIER_ORDER[i]];
    assert.ok(b.grassCount >= a.grassCount && b.treeCount >= a.treeCount && b.shadowMapSize >= a.shadowMapSize, `${b.name} >= ${a.name}`);
  }
  const low = TIERS.low;
  assert.ok(low.renderScale <= 0.7 && low.maxDpr === 1, 'Low renders at most 70% scale, no high-DPI');
  assert.equal(low.reflections, 0);
  assert.equal(low.bloom, false);
  assert.equal(low.sunShaftSamples, 0);
  assert.equal(parseTier('ULTRA'), 'ultra');
  assert.equal(parseTier('nonsense'), 'high');
});

test('mesh builder winds ellipsoids outward (back-face culling safe)', () => {
  const b = new MeshBuilder();
  b.ellipsoid([0, 0, 0], [1, 2, 1], 8, 12, [1, 1, 1], MAT.ROCK);
  const { vertices, indices } = b.build();
  let outward = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const p = (k: number) => [vertices[indices[i + k] * FLOATS_PER_VERTEX], vertices[indices[i + k] * FLOATS_PER_VERTEX + 1], vertices[indices[i + k] * FLOATS_PER_VERTEX + 2]];
    const [a, c, d] = [p(0), p(1), p(2)];
    const e1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const centroid = [(a[0] + c[0] + d[0]) / 3, (a[1] + c[1] + d[1]) / 3, (a[2] + c[2] + d[2]) / 3];
    if (n[0] * centroid[0] + n[1] * centroid[1] + n[2] * centroid[2] > 0) outward++;
  }
  assert.equal(outward, indices.length / 3);
});

test('scene builders produce real geometry for the fox, terrain and world', () => {
  const fox = buildFox();
  assert.ok(fox.vertexCount > 500, 'fox has a sculpted body, not a box');
  const terrain = buildTerrain(64);
  assert.equal(terrain.vertexCount, 65 * 65);
  const world = buildStaticScene(0);
  assert.ok(world.world.vertexCount > 20000, 'pier, turtle, village and windmills are built');
  assert.ok(world.windmills.length >= 4);
  assert.ok(world.lanterns.length >= 4);
});
