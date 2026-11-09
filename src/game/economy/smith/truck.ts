/**
 * Town Smith Placement & Fable's Armor Truck (Night Route + Summoned Camp).
 *
 * Rulings (Josh, 2026-11-08 18:24 & 18:27):
 *  - Town smith placement in the slice's town (`haven_town_landing`).
 *  - Fable's Armor Truck: the smith also works out of an armor truck, like a food truck,
 *    that drives a set route between towns at night and parks midway, towing a pop-up camper.
 *  - Players who find it get the same smith and the same service table.
 *  - Using Fable's Anvil calls this same truck to the player anywhere; that is the convenience.
 *  - Town, truck on its route, and summoned truck all share one service table and one price list.
 */

import {
  FABLE_SMITH_NPC,
  SMITH_PRICE_LIST,
  SMITH_SERVICE_TABLE,
  performSmithService,
} from './services.ts';
import {
  FABLES_ARMOR_TRUCK_ID,
  type ActiveAnvilCamp,
  type SmithGearItem,
  type SmithLocationKind,
  type SmithNpcDefinition,
  type SmithPlayerWallet,
  type SmithPriceList,
  type SmithServiceId,
  type SmithServiceResult,
  type SmithServiceTable,
  type Vec3Tuple,
} from './types.ts';

export interface TownSmithPlacement {
  readonly placementId: 'slice-haven-town-smith';
  readonly zoneId: 'haven_town_landing';
  readonly location: 'town';
  readonly position: Vec3Tuple;
  readonly yaw: number;
  readonly smithNpc: SmithNpcDefinition;
  readonly serviceTable: SmithServiceTable;
  readonly priceList: SmithPriceList;
}

/**
 * Authoritative placement of Fable's Blacksmith Forge on the shore-side town landing
 * in the playable slice (`DECK_Y + 0.05 = 1.15`).
 */
export const TOWN_SMITH_PLACEMENT: TownSmithPlacement = Object.freeze({
  placementId: 'slice-haven-town-smith',
  zoneId: 'haven_town_landing',
  location: 'town',
  position: Object.freeze([21.5, 1.15, -21.5] as const),
  yaw: -0.65,
  smithNpc: FABLE_SMITH_NPC,
  serviceTable: SMITH_SERVICE_TABLE,
  priceList: SMITH_PRICE_LIST,
});

export interface NightArmorTruckRoute {
  readonly truckId: typeof FABLES_ARMOR_TRUCK_ID;
  readonly name: "Fable's Armor Truck";
  readonly style: 'armor-food-truck-with-tow-behind-triangle-camper';
  readonly originTownId: 'haven_town_landing';
  readonly originPosition: Vec3Tuple;
  readonly midwayParkPosition: Vec3Tuple;
  readonly destinationTownId: 'turtle_shell_village';
  readonly destinationPosition: Vec3Tuple;
  readonly midwayParkWindow: readonly [number, number];
  readonly towsPopupCamper: true;
  readonly camperShape: 'tow-behind-triangle-tent';
  readonly smithNpc: SmithNpcDefinition;
  readonly serviceTable: SmithServiceTable;
  readonly priceList: SmithPriceList;
}

export const NIGHT_ARMOR_TRUCK_ROUTE: NightArmorTruckRoute = Object.freeze({
  truckId: FABLES_ARMOR_TRUCK_ID,
  name: "Fable's Armor Truck",
  style: 'armor-food-truck-with-tow-behind-triangle-camper',
  originTownId: 'haven_town_landing',
  originPosition: Object.freeze([21.5, 1.15, -21.5] as const),
  midwayParkPosition: Object.freeze([4.75, 1.1, -52.75] as const),
  destinationTownId: 'turtle_shell_village',
  destinationPosition: Object.freeze([-12.0, 14.6, -84.0] as const),
  midwayParkWindow: Object.freeze([0.35, 0.65] as const),
  towsPopupCamper: true,
  camperShape: 'tow-behind-triangle-tent',
  smithNpc: FABLE_SMITH_NPC,
  serviceTable: SMITH_SERVICE_TABLE,
  priceList: SMITH_PRICE_LIST,
});

export type ArmorTruckMode =
  | 'town-day-depot'
  | 'night-route-driving'
  | 'night-route-parked-midway'
  | 'summoned-to-player';

export interface ArmorTruckState {
  readonly truckId: typeof FABLES_ARMOR_TRUCK_ID;
  readonly mode: ArmorTruckMode;
  readonly worldPhase: 'day' | 'night';
  readonly location: SmithLocationKind;
  readonly position: Vec3Tuple;
  readonly towsPopupCamper: true;
  readonly camperShape: 'tow-behind-triangle-tent';
  readonly camperDeployed: boolean;
  readonly smithNpc: SmithNpcDefinition;
  readonly serviceTable: SmithServiceTable;
  readonly priceList: SmithPriceList;
}

function lerpVec3(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  const clamped = Math.max(0, Math.min(1, t));
  return Object.freeze([
    Number((a[0] + (b[0] - a[0]) * clamped).toFixed(3)),
    Number((a[1] + (b[1] - a[1]) * clamped).toFixed(3)),
    Number((a[2] + (b[2] - a[2]) * clamped).toFixed(3)),
  ]);
}

/**
 * Resolves the state and world position of Fable's Armor Truck:
 *  - When summoned by Fable's Anvil (`summonedCamp?.active`), the truck is at the player's
 *    camp with its tow-behind triangle camper deployed.
 *  - At night (`worldPhase === 'night'`), it drives its set route between Haven Town and
 *    Turtle Village and parks midway during `[0.35, 0.65]` of the night cycle.
 *  - By day (when not summoned), it rests at the Haven town smith depot.
 */
export function resolveArmorTruckState(
  worldPhase: 'day' | 'night',
  routeProgress01 = 0.5,
  summonedCamp: ActiveAnvilCamp | null = null,
): ArmorTruckState {
  if (summonedCamp && summonedCamp.active) {
    return Object.freeze({
      truckId: FABLES_ARMOR_TRUCK_ID,
      mode: 'summoned-to-player',
      worldPhase,
      location: 'summoned-camp',
      position: summonedCamp.position,
      towsPopupCamper: true,
      camperShape: 'tow-behind-triangle-tent',
      camperDeployed: true,
      smithNpc: FABLE_SMITH_NPC,
      serviceTable: SMITH_SERVICE_TABLE,
      priceList: SMITH_PRICE_LIST,
    });
  }

  if (worldPhase === 'day') {
    return Object.freeze({
      truckId: FABLES_ARMOR_TRUCK_ID,
      mode: 'town-day-depot',
      worldPhase: 'day',
      location: 'town',
      position: TOWN_SMITH_PLACEMENT.position,
      towsPopupCamper: true,
      camperShape: 'tow-behind-triangle-tent',
      camperDeployed: false,
      smithNpc: FABLE_SMITH_NPC,
      serviceTable: SMITH_SERVICE_TABLE,
      priceList: SMITH_PRICE_LIST,
    });
  }

  const p = Math.max(0, Math.min(1, Number.isFinite(routeProgress01) ? routeProgress01 : 0.5));
  const [parkStart, parkEnd] = NIGHT_ARMOR_TRUCK_ROUTE.midwayParkWindow;

  if (p >= parkStart && p <= parkEnd) {
    return Object.freeze({
      truckId: FABLES_ARMOR_TRUCK_ID,
      mode: 'night-route-parked-midway',
      worldPhase: 'night',
      location: 'route-truck',
      position: NIGHT_ARMOR_TRUCK_ROUTE.midwayParkPosition,
      towsPopupCamper: true,
      camperShape: 'tow-behind-triangle-tent',
      camperDeployed: true,
      smithNpc: FABLE_SMITH_NPC,
      serviceTable: SMITH_SERVICE_TABLE,
      priceList: SMITH_PRICE_LIST,
    });
  }

  const position =
    p < parkStart
      ? lerpVec3(
          NIGHT_ARMOR_TRUCK_ROUTE.originPosition,
          NIGHT_ARMOR_TRUCK_ROUTE.midwayParkPosition,
          p / parkStart,
        )
      : lerpVec3(
          NIGHT_ARMOR_TRUCK_ROUTE.midwayParkPosition,
          NIGHT_ARMOR_TRUCK_ROUTE.destinationPosition,
          (p - parkEnd) / (1 - parkEnd),
        );

  return Object.freeze({
    truckId: FABLES_ARMOR_TRUCK_ID,
    mode: 'night-route-driving',
    worldPhase: 'night',
    location: 'route-truck',
    position,
    towsPopupCamper: true,
    camperShape: 'tow-behind-triangle-tent',
    camperDeployed: false,
    smithNpc: FABLE_SMITH_NPC,
    serviceTable: SMITH_SERVICE_TABLE,
    priceList: SMITH_PRICE_LIST,
  });
}

/**
 * Executes a smith service at Fable's Armor Truck (either found on its night route or summoned).
 * Shares the exact same `SMITH_SERVICE_TABLE` and `SMITH_PRICE_LIST` as the town smith.
 */
export function performTruckSmithService(
  truckState: ArmorTruckState,
  serviceId: SmithServiceId,
  item: SmithGearItem,
  wallet: SmithPlayerWallet,
): SmithServiceResult {
  return performSmithService(truckState.location, serviceId, item, wallet);
}
