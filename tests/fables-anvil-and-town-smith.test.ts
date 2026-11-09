/**
 * Fable's Anvil, Town Smith, Fable's Armor Truck & Founder Pet Interaction Tests.
 *
 * Verifies Josh's rulings (2026-11-07 & 2026-11-08):
 *  1. Identical prices and results at town, night-route armor truck, and summoned camp
 *     across all three services (`repair`, `upgrade`, `enhance`).
 *  2. Same-percentage-per-tier rule preserved across every `upgrade` step.
 *  3. Charge cap (3 to 5) at the exact level and HP / mana / energy pool boundaries.
 *  4. Fable's Anvil unusable at zero charges, and camp despawns on walk-away or timeout.
 *  5. No service is available at the camp or route truck that the town smith lacks.
 *  6. Fable's Armor Truck night route, midway parking with tow-behind pop-up camper, and
 *     convenience summoning via Fable's Anvil.
 *  7. Founder pet `TrollinlootNScoot` drift-cart interaction with Fable, Sup@, Cod3x, and Mollama.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { validateShopItem } from '../src/game/economy/wardrobe/index.ts';
import {
  ANVIL_LEVEL_BONUS_THRESHOLD,
  ANVIL_MAX_CHARGES,
  ANVIL_MIN_CHARGES,
  ANVIL_POOL_BONUS_THRESHOLD,
  CAMP_DEFAULT_DESPAWN_RADIUS_M,
  CAMP_DEFAULT_TIMEOUT_SEC,
  ENHANCEMENT_BONUS_PERCENTS,
  ENHANCEMENT_TRACK,
  FABLES_ANVIL_ITEM,
  FABLES_ANVIL_ITEM_ID,
  FABLES_ARMOR_TRUCK_ID,
  FABLE_SMITH_NPC,
  FABLE_SMITH_NPC_ID,
  NIGHT_ARMOR_TRUCK_ROUTE,
  SMITH_LOCATIONS,
  SMITH_PRICE_LIST,
  SMITH_SERVICE_IDS,
  SMITH_SERVICE_TABLE,
  SUP_ONLY_REPLY_TO_TROLL,
  SUP_RARE_REPLY_THRESHOLD,
  TIER_STEP_PERCENTS,
  TOWN_SMITH_PLACEMENT,
  TROLL_COD3X_MOLLAMA_LINE,
  TROLL_DRIFT_CART_TOW_LINE,
  buildFableSmithNpcProposal,
  computeAnvilChargeCap,
  createAnvilState,
  createSmithGearItem,
  evaluateFounderPetInteraction,
  getSmithServicesForLocation,
  performCampSmithService,
  performSmithService,
  performTruckSmithService,
  quoteSmithService,
  resolveArmorTruckState,
  updateAnvilCamp,
  useFablesAnvil,
} from '../src/game/economy/smith/index.ts';

// ---------------------------------------------------------------- 1. Shared service table & no extra camp services
test('Smith service table: town, route-truck, and summoned-camp share one table and camp has no service town lacks', () => {
  assert.equal(FABLE_SMITH_NPC.npcId, FABLE_SMITH_NPC_ID);
  assert.deepEqual([...SMITH_SERVICE_IDS], ['repair', 'upgrade', 'enhance']);

  const townTable = getSmithServicesForLocation('town');
  const truckTable = getSmithServicesForLocation('route-truck');
  const campTable = getSmithServicesForLocation('summoned-camp');

  // Exact same frozen table reference and price list reference
  assert.equal(townTable, SMITH_SERVICE_TABLE);
  assert.equal(truckTable, SMITH_SERVICE_TABLE);
  assert.equal(campTable, SMITH_SERVICE_TABLE);
  assert.equal(townTable.prices, SMITH_PRICE_LIST);
  assert.equal(truckTable.prices, SMITH_PRICE_LIST);
  assert.equal(campTable.prices, SMITH_PRICE_LIST);
  assert.equal(TOWN_SMITH_PLACEMENT.serviceTable, SMITH_SERVICE_TABLE);
  assert.equal(NIGHT_ARMOR_TRUCK_ROUTE.serviceTable, SMITH_SERVICE_TABLE);

  // No service is available at the camp or truck that the town smith lacks
  const townServiceKeys = Object.keys(townTable.services).sort();
  const campServiceKeys = Object.keys(campTable.services).sort();
  const truckServiceKeys = Object.keys(truckTable.services).sort();
  assert.deepEqual(campServiceKeys, townServiceKeys);
  assert.deepEqual(truckServiceKeys, townServiceKeys);
  for (const campService of campServiceKeys) {
    assert.ok(
      townServiceKeys.includes(campService),
      `camp service "${campService}" must exist on town smith`,
    );
  }
});

// ---------------------------------------------------------------- 2. Identical prices and results across locations
test('Smith services: identical prices and identical results at town, route-truck, and summoned-camp', () => {
  const wallet = { sols: 5000, tierMaterials: 20, forgeCatalysts: 30 };

  for (const serviceId of SMITH_SERVICE_IDS) {
    const baseItem = createSmithGearItem({
      id: 'wayfarer-blade',
      name: 'Wayfarer Blade',
      slot: 'weapon',
      durability: 42,
      maxDurability: 100,
      tierStep: 1,
      statChoice: 'melee-focus',
      enhancement: 'common',
    });

    const townQuote = quoteSmithService('town', serviceId, baseItem);
    const truckQuote = quoteSmithService('route-truck', serviceId, baseItem);
    const campQuote = quoteSmithService('summoned-camp', serviceId, baseItem);

    assert.equal(townQuote.canApply, true);
    assert.equal(campQuote.solsCost, townQuote.solsCost, `${serviceId}: solsCost must match`);
    assert.equal(truckQuote.solsCost, townQuote.solsCost, `${serviceId}: truck solsCost must match`);
    assert.equal(campQuote.materialsCost, townQuote.materialsCost, `${serviceId}: materialsCost must match`);
    assert.equal(truckQuote.materialsCost, townQuote.materialsCost);
    assert.equal(campQuote.catalystsCost, townQuote.catalystsCost, `${serviceId}: catalystsCost must match`);
    assert.equal(truckQuote.catalystsCost, townQuote.catalystsCost);

    const townRes = performSmithService('town', serviceId, baseItem, wallet);
    const truckRes = performSmithService('route-truck', serviceId, baseItem, wallet);
    const campRes = performSmithService('summoned-camp', serviceId, baseItem, wallet);

    assert.equal(townRes.ok, true);
    assert.equal(truckRes.ok, true);
    assert.equal(campRes.ok, true);

    assert.deepEqual(campRes.item, townRes.item, `${serviceId}: camp item result must match town`);
    assert.deepEqual(truckRes.item, townRes.item, `${serviceId}: truck item result must match town`);
    assert.equal(campRes.remainingSols, townRes.remainingSols);
    assert.equal(truckRes.remainingSols, townRes.remainingSols);
    assert.equal(campRes.remainingMaterials, townRes.remainingMaterials);
    assert.equal(truckRes.remainingMaterials, townRes.remainingMaterials);
    assert.equal(campRes.remainingCatalysts, townRes.remainingCatalysts);
    assert.equal(truckRes.remainingCatalysts, townRes.remainingCatalysts);
  }

  // Verify specific service mechanics:
  // 1) Repair restores durability to maxDurability
  const worn = createSmithGearItem({
    id: 'iron-greaves',
    name: 'Iron Greaves',
    slot: 'shoes',
    durability: 35,
    maxDurability: 100,
  });
  const repaired = performSmithService('town', 'repair', worn, wallet);
  assert.equal(repaired.ok, true);
  assert.equal(repaired.item.durability, 100);
  assert.equal(repaired.quote.solsCost, (100 - 35) * SMITH_PRICE_LIST.repairSolsPerDurabilityPoint);

  // Repairing an item already at full durability is refused at 0 cost
  const alreadyFull = performSmithService('town', 'repair', repaired.item, wallet);
  assert.equal(alreadyFull.ok, false);
  assert.equal(alreadyFull.reason, 'already-full-durability');
  assert.equal(alreadyFull.remainingSols, wallet.sols);

  // 2) Upgrade raises tierStep within the same-percentage-per-tier rule
  const fishingHat = createSmithGearItem({
    id: 'angler-hat',
    name: 'Angler Hat',
    slot: 'headwear',
    durability: 100,
    tierStep: 1,
    statChoice: 'fishing-experience',
  });
  const chefApron = createSmithGearItem({
    id: 'chef-apron',
    name: 'Chef Apron',
    slot: 'top',
    durability: 100,
    tierStep: 1,
    statChoice: 'cooking-experience',
  });
  assert.equal(fishingHat.statPercent, TIER_STEP_PERCENTS[1]);
  assert.equal(chefApron.statPercent, TIER_STEP_PERCENTS[1]);
  assert.equal(fishingHat.statPercent, chefApron.statPercent, 'tier 1 items carry identical percentage');

  const upFish2 = performSmithService('town', 'upgrade', fishingHat, wallet);
  const upChef2 = performSmithService('summoned-camp', 'upgrade', chefApron, wallet);
  assert.equal(upFish2.item.tierStep, 2);
  assert.equal(upChef2.item.tierStep, 2);
  assert.equal(upFish2.item.statPercent, TIER_STEP_PERCENTS[2]);
  assert.equal(upChef2.item.statPercent, TIER_STEP_PERCENTS[2]);
  assert.equal(upFish2.item.statPercent, upChef2.item.statPercent, 'tier 2 items carry identical 10%');
  assert.equal(upFish2.item.statChoice, 'fishing-experience', 'choice of stat is preserved');
  assert.equal(upChef2.item.statChoice, 'cooking-experience', 'choice of stat is preserved');

  const upFish3 = performSmithService('town', 'upgrade', upFish2.item, wallet);
  assert.equal(upFish3.item.tierStep, 3);
  assert.equal(upFish3.item.statPercent, TIER_STEP_PERCENTS[3]);
  const beyondMaxTier = performSmithService('town', 'upgrade', upFish3.item, wallet);
  assert.equal(beyondMaxTier.ok, false);
  assert.equal(beyondMaxTier.reason, 'already-max-tier-step');

  // 3) Enhance steps through common -> uncommon -> rare -> legend -> mythos deterministically
  let current = fishingHat;
  for (const expectedNext of ENHANCEMENT_TRACK.slice(1)) {
    const step = performSmithService('town', 'enhance', current, wallet);
    assert.equal(step.ok, true);
    assert.equal(step.item.enhancement, expectedNext);
    assert.equal(step.item.enhancementBonusPercent, ENHANCEMENT_BONUS_PERCENTS[expectedNext]);
    current = step.item;
  }
  assert.equal(current.enhancement, 'mythos');
  const beyondMythos = performSmithService('town', 'enhance', current, wallet);
  assert.equal(beyondMythos.ok, false);
  assert.equal(beyondMythos.reason, 'already-max-enhancement');
});

// ---------------------------------------------------------------- 3. Charge cap at boundaries (3 to 5)
test("Fable's Anvil charge cap: boundary checks for level and HP / mana / energy pools (3 to 5)", () => {
  // Fable's Anvil is a valid wardrobe convenience item that saves walking and carries no stats
  assert.equal(FABLES_ANVIL_ITEM.id, FABLES_ANVIL_ITEM_ID);
  assert.equal(FABLES_ANVIL_ITEM.kind, 'convenience');
  assert.equal(FABLES_ANVIL_ITEM.saves, 'walking');
  assert.deepEqual(validateShopItem(FABLES_ANVIL_ITEM), { ok: true, errors: [] });

  // Lower boundary: minimum is 3 even at level 1 and tiny pools
  assert.equal(computeAnvilChargeCap({ level: 1, hpPool: 1, manaPool: 1, energyPool: 1 }), ANVIL_MIN_CHARGES);
  assert.equal(computeAnvilChargeCap({ level: 0, hpPool: 0 }), 3);
  assert.equal(
    computeAnvilChargeCap({
      level: ANVIL_LEVEL_BONUS_THRESHOLD - 1,
      hpPool: ANVIL_POOL_BONUS_THRESHOLD - 1,
    }),
    3,
    'just below both level (19) and pool (499) thresholds stays at 3',
  );

  // Level boundary: crossing level 20 raises cap from 3 to 4
  assert.equal(
    computeAnvilChargeCap({
      level: ANVIL_LEVEL_BONUS_THRESHOLD,
      hpPool: ANVIL_POOL_BONUS_THRESHOLD - 1,
    }),
    4,
    'exact level threshold (20) with pool 499 gives 4 charges',
  );

  // Pool boundary across HP, mana, and energy (Monk energy-only build): crossing 500 raises cap from 3 to 4
  assert.equal(
    computeAnvilChargeCap({
      level: ANVIL_LEVEL_BONUS_THRESHOLD - 1,
      hpPool: ANVIL_POOL_BONUS_THRESHOLD,
    }),
    4,
    'exact HP pool threshold (500) at level 19 gives 4 charges',
  );
  assert.equal(
    computeAnvilChargeCap({
      level: ANVIL_LEVEL_BONUS_THRESHOLD - 1,
      hpPool: 100,
      manaPool: ANVIL_POOL_BONUS_THRESHOLD,
    }),
    4,
    'exact mana pool threshold (500) at level 19 gives 4 charges',
  );
  assert.equal(
    computeAnvilChargeCap({
      level: ANVIL_LEVEL_BONUS_THRESHOLD - 1,
      hpPool: 1,
      manaPool: 1,
      energyPool: ANVIL_POOL_BONUS_THRESHOLD,
    }),
    4,
    'Monk with HP=1, mana=1, and energy=500 at level 19 gets 4 charges',
  );

  // Upper boundary: meeting both level >= 20 and pool >= 500 gives 5 charges, and never exceeds 5
  assert.equal(
    computeAnvilChargeCap({
      level: ANVIL_LEVEL_BONUS_THRESHOLD,
      hpPool: ANVIL_POOL_BONUS_THRESHOLD,
    }),
    5,
    'exact level (20) and pool (500) thresholds give 5 charges',
  );
  assert.equal(
    computeAnvilChargeCap({
      level: 50,
      hpPool: 1,
      manaPool: 1,
      energyPool: 900,
    }),
    ANVIL_MAX_CHARGES,
  );
  assert.equal(
    computeAnvilChargeCap({
      level: 99,
      hpPool: 25000,
      manaPool: 25000,
      energyPool: 25000,
    }),
    5,
    'charge cap never exceeds 5',
  );
});

// ---------------------------------------------------------------- 4. Anvil unusable at zero charges & camp lifecycle
test("Fable's Anvil: consumes charges, unusable at zero charges, and despawns on walk-away or timeout", () => {
  const playerOrigin = [10, 1.1, -12] as const;
  let anvil = createAnvilState({ level: 10, hpPool: 250 });
  assert.equal(anvil.maxCharges, 3);
  assert.equal(anvil.charges, 3);

  // Use all 3 charges
  for (let remaining = 2; remaining >= 0; remaining--) {
    const used = useFablesAnvil(anvil, playerOrigin, { nowSec: 100 });
    assert.equal(used.ok, true);
    if (!used.ok) throw new Error('expected anvil use to succeed');
    assert.equal(used.state.charges, remaining);
    assert.equal(used.camp.active, true);
    assert.equal(used.camp.campShape, 'tow-behind-triangle-tent');
    assert.equal(used.camp.truckId, FABLES_ARMOR_TRUCK_ID);
    assert.equal(used.camp.smithNpc, FABLE_SMITH_NPC);
    assert.equal(used.camp.serviceTable, SMITH_SERVICE_TABLE);
    anvil = used.state;
  }

  // At 0 charges, Fable's Anvil is unusable
  assert.equal(anvil.charges, 0);
  const refusedAtZero = useFablesAnvil(anvil, playerOrigin, { nowSec: 200 });
  assert.deepEqual(refusedAtZero, {
    ok: false,
    reason: 'no-charges-remaining',
    state: anvil,
    camp: null,
  });

  // Also verify initialCharges = 0 is unusable immediately
  const emptyAnvil = createAnvilState({ level: 50, hpPool: 2000 }, 0);
  assert.equal(emptyAnvil.maxCharges, 5);
  assert.equal(emptyAnvil.charges, 0);
  assert.equal(useFablesAnvil(emptyAnvil, playerOrigin).ok, false);

  // Camp despawn check 1: player walks away beyond despawnRadiusMeters
  const freshAnvil = createAnvilState({ level: 25, hpPool: 800 });
  const spawned = useFablesAnvil(freshAnvil, [0, 0, 0], {
    nowSec: 10,
    spawnOffset: [2, 0, 0],
    despawnRadiusMeters: CAMP_DEFAULT_DESPAWN_RADIUS_M,
    timeoutSec: CAMP_DEFAULT_TIMEOUT_SEC,
  });
  assert.equal(spawned.ok, true);
  if (!spawned.ok) throw new Error('unreachable');

  const stillNear = updateAnvilCamp(spawned.camp, [2 + CAMP_DEFAULT_DESPAWN_RADIUS_M - 0.5, 0, 0], 20);
  assert.equal(stillNear.active, true);

  const walkedAway = updateAnvilCamp(spawned.camp, [2 + CAMP_DEFAULT_DESPAWN_RADIUS_M + 0.5, 0, 0], 25);
  assert.equal(walkedAway.active, false);
  assert.equal(walkedAway.despawnReason, 'player-walked-away');

  // Services cannot be used on a despawned camp
  const gear = createSmithGearItem({ id: 'test-helm', name: 'Test Helm', slot: 'headwear', durability: 50 });
  const despawnedAttempt = performCampSmithService(walkedAway, 'repair', gear, { sols: 500 });
  assert.equal(despawnedAttempt.ok, false);
  assert.equal(despawnedAttempt.reason, 'camp-despawned');

  // Camp despawn check 2: timeout elapses while player stands right next to camp
  const beforeTimeout = updateAnvilCamp(
    spawned.camp,
    [2, 0, 0],
    10 + CAMP_DEFAULT_TIMEOUT_SEC - 1,
  );
  assert.equal(beforeTimeout.active, true);

  const afterTimeout = updateAnvilCamp(
    spawned.camp,
    [2, 0, 0],
    10 + CAMP_DEFAULT_TIMEOUT_SEC,
  );
  assert.equal(afterTimeout.active, false);
  assert.equal(afterTimeout.despawnReason, 'timeout');
});

// ---------------------------------------------------------------- 6. Fable's Armor Truck route & summoning
test("Fable's Armor Truck: drives night route, parks midway towing pop-up camper, and responds to Fable's Anvil", () => {
  // Day: parked at town depot
  const dayTruck = resolveArmorTruckState('day', 0.2);
  assert.equal(dayTruck.mode, 'town-day-depot');
  assert.equal(dayTruck.location, 'town');
  assert.equal(dayTruck.towsPopupCamper, true);
  assert.equal(dayTruck.serviceTable, SMITH_SERVICE_TABLE);

  // Night driving (early route before midway park window)
  const nightDriving = resolveArmorTruckState('night', 0.15);
  assert.equal(nightDriving.mode, 'night-route-driving');
  assert.equal(nightDriving.location, 'route-truck');
  assert.equal(nightDriving.camperDeployed, false);
  assert.equal(nightDriving.serviceTable, SMITH_SERVICE_TABLE);

  // Night parked midway (0.5 is inside midwayParkWindow [0.35, 0.65])
  const nightMidway = resolveArmorTruckState('night', 0.5);
  assert.equal(nightMidway.mode, 'night-route-parked-midway');
  assert.equal(nightMidway.location, 'route-truck');
  assert.equal(nightMidway.camperDeployed, true);
  assert.deepEqual(nightMidway.position, NIGHT_ARMOR_TRUCK_ROUTE.midwayParkPosition);
  assert.equal(nightMidway.smithNpc, FABLE_SMITH_NPC);
  assert.equal(nightMidway.serviceTable, SMITH_SERVICE_TABLE);
  assert.equal(nightMidway.priceList, SMITH_PRICE_LIST);

  // Using Fable's Anvil calls this same truck to the player anywhere
  const anvil = createAnvilState({ level: 30, hpPool: 900 });
  const callTruck = useFablesAnvil(anvil, [-45, 3.2, -110], { nowSec: 60 });
  assert.equal(callTruck.ok, true);
  if (!callTruck.ok) throw new Error('unreachable');

  const summonedTruck = resolveArmorTruckState('night', 0.5, callTruck.camp);
  assert.equal(summonedTruck.mode, 'summoned-to-player');
  assert.equal(summonedTruck.location, 'summoned-camp');
  assert.equal(summonedTruck.camperDeployed, true);
  assert.deepEqual(summonedTruck.position, callTruck.camp.position);
  assert.equal(summonedTruck.serviceTable, SMITH_SERVICE_TABLE);

  // Player using the truck midway on its route gets identical results and prices as town and summoned camp
  const item = createSmithGearItem({ id: 'road-shield', name: 'Road Shield', durability: 60 });
  const wallet = { sols: 1000, tierMaterials: 5, forgeCatalysts: 5 };
  const midwayRepair = performTruckSmithService(nightMidway, 'repair', item, wallet);
  const townRepair = performSmithService('town', 'repair', item, wallet);
  const campRepair = performCampSmithService(callTruck.camp, 'repair', item, wallet);

  assert.deepEqual(midwayRepair.item, townRepair.item);
  assert.deepEqual(campRepair.item, townRepair.item);
  assert.equal(midwayRepair.remainingSols, townRepair.remainingSols);
  assert.equal(campRepair.remainingSols, townRepair.remainingSols);

  // Live NPC Lab proposal helper adheres to approved action types
  for (const loc of SMITH_LOCATIONS) {
    const proposal = buildFableSmithNpcProposal('dreamer-1', loc, item);
    assert.equal(proposal.npcId, FABLE_SMITH_NPC_ID);
    assert.equal(proposal.proposedActions[0]?.type, 'suggest_hint');
  }
});

// ---------------------------------------------------------------- 7. Founder pet TrollinlootNScoot interaction
test('TrollinlootNScoot interaction: star-struck around Sup@ and Fable, offers drift-cart tow, rare Sup@ reply, and Cod3x/Mollama PR line', () => {
  // 1) Near Fable or Fable's Armor Truck: star-struck, rolls up in drift cart offering a tow
  const nearFable = evaluateFounderPetInteraction({
    targetId: FABLE_SMITH_NPC_ID,
    petPosition: [20, 1.15, -20],
    targetPosition: [21.5, 1.15, -21.5],
  });
  assert.equal(nearFable.triggered, true);
  assert.equal(nearFable.starStruck, true);
  assert.equal(nearFable.friendlyToAllNpcs, true);
  assert.equal(nearFable.vehicle, 'three-wheel-drift-cart');
  assert.equal(nearFable.offersTow, true);
  assert.equal(nearFable.petLine, TROLL_DRIFT_CART_TOW_LINE);
  assert.equal(nearFable.petLine, "I can tow ya if you're ever stuck. Three-wheel drive!");
  assert.equal(nearFable.supReply, null);

  const nearTruck = evaluateFounderPetInteraction({
    targetId: FABLES_ARMOR_TRUCK_ID,
  });
  assert.equal(nearTruck.triggered, true);
  assert.equal(nearTruck.starStruck, true);
  assert.equal(nearTruck.petLine, TROLL_DRIFT_CART_TOW_LINE);

  // 2) Friendly to every NPC (e.g. camp-guard or field-gatherer), not star-struck outside Sup@ and Fable
  const nearGuard = evaluateFounderPetInteraction({
    targetId: 'camp-guard',
  });
  assert.equal(nearGuard.triggered, true);
  assert.equal(nearGuard.friendlyToAllNpcs, true);
  assert.equal(nearGuard.starStruck, false);
  assert.equal(nearGuard.offersTow, true);
  assert.equal(nearGuard.petLine, TROLL_DRIFT_CART_TOW_LINE);

  // 3) Near Sup@: star-struck; Sup@ almost never answers, and when it does the only reply ever is 'Keep Dreaming Trollz'
  const nearSupSilent = evaluateFounderPetInteraction({
    targetId: 'Sup@',
    supRareRoll01: SUP_RARE_REPLY_THRESHOLD + 0.1,
  });
  assert.equal(nearSupSilent.triggered, true);
  assert.equal(nearSupSilent.starStruck, true);
  assert.equal(nearSupSilent.supReply, null, 'Sup@ almost never answers on normal rolls');

  const nearSupRareReply = evaluateFounderPetInteraction({
    targetId: 'Sup@',
    supRareRoll01: SUP_RARE_REPLY_THRESHOLD - 0.01,
  });
  assert.equal(nearSupRareReply.triggered, true);
  assert.equal(nearSupRareReply.starStruck, true);
  assert.equal(nearSupRareReply.supReply, SUP_ONLY_REPLY_TO_TROLL);
  assert.equal(nearSupRareReply.supReply, 'Keep Dreaming Trollz');

  // 4) Seeing Cod3x or Mollama: exact Trollz Pull Request line
  for (const codeNpc of ['Cod3x', 'c0d3x-rider', 'Mollama']) {
    const res = evaluateFounderPetInteraction({ targetId: codeNpc });
    assert.equal(res.triggered, true);
    assert.equal(res.friendlyToAllNpcs, true);
    assert.equal(res.petLine, TROLL_COD3X_MOLLAMA_LINE);
    assert.equal(
      res.petLine,
      'If you ever get stuck in reverse, knee-deep in code, I can put this thing in three-wheel drive and do a Trollz Pull Request.',
    );
  }

  // 5) Out of range does not trigger
  const farAway = evaluateFounderPetInteraction({
    targetId: FABLE_SMITH_NPC_ID,
    petPosition: [0, 0, 0],
    targetPosition: [50, 0, 50],
  });
  assert.equal(farAway.triggered, false);
  assert.equal(farAway.petLine, null);
});
