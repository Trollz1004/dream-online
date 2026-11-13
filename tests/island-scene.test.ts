import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TIERS, TIER_ORDER, parseTier } from '../src/engine/island/quality.ts';
import {
  DECK_Y, WATER_Y, deckAt, grassPlacements, groundHeight, rockPlacements, terrainHeight, treePlacements,
} from '../src/engine/island/world.ts';
import { MeshBuilder, FLOATS_PER_VERTEX, MAT } from '../src/engine/island/geometry.ts';
import {
  buildArmorTruckMesh,
  buildFox,
  buildTerrain,
  buildStaticScene,
  resolveIslandSlicePlacement,
} from '../src/engine/island/scene.ts';
import {
  FABLE_SMITH_NPC,
  FABLE_SMITH_NPC_ID,
  NIGHT_ARMOR_TRUCK_ROUTE,
  SMITH_SERVICE_TABLE,
  TOWN_SMITH_PLACEMENT,
  quoteSmithService,
} from '../src/game/economy/smith/index.ts';
import {
  DEFAULT_SMITH_DEMO_GEAR,
  SmithServiceModal,
} from '../src/ui/SmithServiceModal.tsx';

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

test('town smith, night-route Armor Truck + pop-up camper, and summoned Anvil truck share the same smith and service table in the slice', () => {
  const townSlice = resolveIslandSlicePlacement('town');
  assert.equal(townSlice.worldPhase, 'day');
  assert.equal(townSlice.townSmith.smithNpc.npcId, FABLE_SMITH_NPC_ID);
  assert.equal(townSlice.activeSmithNpc, FABLE_SMITH_NPC);
  assert.equal(townSlice.activeServiceTable, SMITH_SERVICE_TABLE);
  assert.deepEqual(townSlice.townSmith.position, TOWN_SMITH_PLACEMENT.position);

  const nightMidway = resolveIslandSlicePlacement('night-midway');
  assert.equal(nightMidway.worldPhase, 'night');
  assert.equal(nightMidway.truckState.mode, 'night-route-parked-midway');
  assert.equal(nightMidway.truckState.towsPopupCamper, true);
  assert.equal(nightMidway.truckState.camperDeployed, true);
  assert.deepEqual(nightMidway.truckState.position, NIGHT_ARMOR_TRUCK_ROUTE.midwayParkPosition);
  assert.equal(nightMidway.activeSmithNpc, FABLE_SMITH_NPC);
  assert.equal(nightMidway.activeServiceTable, SMITH_SERVICE_TABLE);

  const summoned = resolveIslandSlicePlacement('summoned');
  assert.equal(summoned.truckState.mode, 'summoned-to-player');
  assert.equal(summoned.truckState.towsPopupCamper, true);
  assert.equal(summoned.truckState.camperDeployed, true);
  assert.ok(summoned.activeCamp && summoned.activeCamp.active);
  assert.equal(summoned.activeSmithNpc, FABLE_SMITH_NPC);
  assert.equal(summoned.activeServiceTable, SMITH_SERVICE_TABLE);

  // Build 3D mesh for both night midway and summoned states and verify real geometry + lanterns
  const midwayMesh = buildArmorTruckMesh(nightMidway.truckState);
  const summonedMesh = buildArmorTruckMesh(summoned.truckState);
  assert.ok(midwayMesh.mesh.vertexCount > 400, 'Armor Truck + pop-up camper builds real 3D geometry');
  assert.ok(summonedMesh.mesh.vertexCount > 400, 'Summoned Armor Truck + pop-up camper builds real 3D geometry');
  assert.equal(midwayMesh.lanterns.length, 2);
  assert.equal(summonedMesh.lanterns.length, 2);

  // Service quotes are identical across town, night route truck, and summoned camp
  for (const item of DEFAULT_SMITH_DEMO_GEAR) {
    for (const svc of ['repair', 'upgrade', 'enhance'] as const) {
      const qTown = quoteSmithService('town', svc, item);
      const qTruck = quoteSmithService('route-truck', svc, item);
      const qCamp = quoteSmithService('summoned-camp', svc, item);
      assert.equal(qTown.solsCost, qTruck.solsCost);
      assert.equal(qTown.solsCost, qCamp.solsCost);
      assert.equal(qTown.materialsCost, qTruck.materialsCost);
      assert.equal(qTown.catalystsCost, qCamp.catalystsCost);
    }
  }
});

test('SmithServiceModal renders calm dark see-through UI per docs/gdd/09-interface-style.md and anvil.ts / GDD pointer match spec', () => {
  const serviceSlice = resolveIslandSlicePlacement('service-table');
  assert.equal(serviceSlice.serviceTableOpen, true);
  const html = renderToStaticMarkup(
    React.createElement(SmithServiceModal, {
      isOpen: true,
      location: serviceSlice.truckState.location,
      anvilState: serviceSlice.anvilState,
      activeCamp: serviceSlice.activeCamp,
      truckState: serviceSlice.truckState,
      playerPosition: serviceSlice.playerPos,
      onClose: () => {},
    }),
  );
  assert.match(html, /FABLE&#x27;S FORGE · SMITH SERVICE TABLE/);
  assert.match(
    html,
    /<h1[^>]*>FABLE&#x27;S FORGE · SMITH SERVICE TABLE<\/h1><div[^>]*data-testid="smith-title-rule"/,
    'one thin fine rule sits directly under the FABLE\'S FORGE · SMITH SERVICE TABLE title',
  );
  assert.doesNotMatch(html, /#C7C7CC|#D1D1D6/i, 'low-contrast grey text tokens are lifted to white on dark');
  assert.doesNotMatch(html, /CLAUDE(?:'|&#x27;|&apos;)s N Joshua(?:'|&#x27;|&apos;)s/i);
  assert.doesNotMatch(html, /#?TeamClaudeForLife/i);
  assert.match(html, /fable-smith/);
  assert.match(html, /pop-up camper/i);
  assert.match(html, /Town/);
  assert.match(html, /Night truck/);
  assert.match(html, /Summoned/);
  assert.doesNotMatch(html, /smith-placement-readout/);
  assert.doesNotMatch(html, /haven_town_landing/);
  assert.doesNotMatch(html, /Active Truck State/);
  assert.doesNotMatch(html, /Position:\s*\[/);
  assert.match(html, /Back/);

  const anvilSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/game/economy/smith/anvil.ts'),
    'utf8',
  );
  assert.ok(anvilSource.includes('pop-up camper'), 'anvil.ts doc comment mentions pop-up camper');
  assert.ok(
    !anvilSource.includes('tow-behind triangle tent campsite'),
    'anvil.ts doc comment no longer says tow-behind triangle tent campsite',
  );

  const gddEconomy = fs.readFileSync(
    path.resolve(process.cwd(), 'docs/gdd/03-life-skills-economy.md'),
    'utf8',
  );
  assert.ok(gddEconomy.includes('src/game/economy/smith'), 'GDD economy doc points to src/game/economy/smith');
  assert.ok(gddEconomy.includes('docs/house'), 'GDD economy doc points to docs/house rulings');
});
