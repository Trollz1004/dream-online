/**
 * Island test scene — world layout (persistent, seeded, view-independent).
 *
 * Layout mirrors the visual target: the player starts on a weathered wooden
 * boardwalk over clear turquoise shallows, a giant turtle-shell island with a
 * timber village on its back sits ahead-left, a wooded shore with stilt houses
 * runs along the right, and hazy rocky islands with a windmill sit far left.
 */
import { fbm2, mulberry32, valueNoise2 } from './noise.ts';
import { clamp, smoothstep, lerp, type Vec3 } from './math.ts';

export const WATER_Y = 0;
export const DECK_Y = 1.1;

/** Terrain heightfield extents (meters). */
export const TERRAIN = { minX: -280, maxX: 280, minZ: -380, maxZ: 180 };

/** Giant turtle landmark (world placement). Head points toward -X. */
export const TURTLE = { x: -12, z: -84, yaw: 0.42, shellRx: 22, shellRy: 13, shellRz: 18, shellY: 1.6 };

export const DISTANT_ISLANDS = [
  { x: -165, z: -235, r: 52, h: 34 },
  { x: -95, z: -330, r: 40, h: 20 },
  { x: 140, z: -300, r: 64, h: 26 },
  { x: -230, z: -120, r: 30, h: 14 },
];

/** Shore line on the right side: land where x > coastX(z). */
export function coastX(z: number): number {
  return 30 + 9 * (fbm2(z * 0.018, 3.7) - 0.5) * 2 + Math.max(0, -z - 60) * 0.25;
}

function rawTerrain(x: number, z: number): number {
  // Open ocean floor with gentle undulation.
  let h = -10 + 3 * fbm2(x * 0.008, z * 0.008, 3);

  // Bright turquoise lagoon shelf around the boardwalk and the turtle.
  const lagoonD = Math.hypot(x - 0, (z + 30) * 0.8);
  const lagoon = smoothstep(120, 55, lagoonD);
  const lagoonH = -2.7 + 0.9 * (fbm2(x * 0.05, z * 0.05, 3) - 0.5) + 0.25 * Math.sin(x * 0.7 + z * 0.3) * 0.3;
  h = lerp(h, lagoonH, lagoon);

  // Right-hand wooded shore.
  const sd = x - coastX(z);
  if (sd > -16) {
    const hills = 8 + 9 * fbm2(x * 0.02, z * 0.02, 4);
    const hs = -2.9 + smoothstep(-16, 2, sd) * 3.9 + smoothstep(2, 50, sd) * hills
      + (fbm2(x * 0.25, z * 0.25, 2) - 0.5) * 0.5 * smoothstep(-4, 4, sd);
    h = Math.max(h, hs);
  }

  // Rocky shoal the turtle rests on.
  const td = Math.hypot((x - TURTLE.x) / 36, (z - TURTLE.z) / 30);
  if (td < 1.4) {
    const rocks = fbm2(x * 0.12, z * 0.12, 3);
    const hs = -3.0 + 2.6 * smoothstep(1.35, 0.75, td) + 2.2 * Math.max(0, rocks - 0.45) * smoothstep(1.3, 0.8, td);
    h = Math.max(h, hs);
  }

  // Hazy distant islands with cliffs.
  for (const isl of DISTANT_ISLANDS) {
    const warp = (fbm2(x * 0.02 + isl.x, z * 0.02 + isl.z, 3) - 0.5) * 0.55;
    const d = Math.hypot(x - isl.x, z - isl.z) / isl.r + warp;
    if (d < 1.3) {
      const core = smoothstep(1.15, 0.25, d);
      const cliff = Math.pow(core, 0.55);
      const hs = -9 + (isl.h + 9) * cliff * (0.75 + 0.35 * fbm2(x * 0.06, z * 0.06, 3));
      h = Math.max(h, hs);
    }
  }
  return h;
}

/** Terrain height at (x, z). Pure function of position — persistent by construction. */
export function terrainHeight(x: number, z: number): number {
  return rawTerrain(clamp(x, TERRAIN.minX, TERRAIN.maxX), clamp(z, TERRAIN.minZ, TERRAIN.maxZ));
}

export function terrainNormal(x: number, z: number): Vec3 {
  const e = 0.5;
  const hl = terrainHeight(x - e, z), hr = terrainHeight(x + e, z);
  const hd = terrainHeight(x, z - e), hu = terrainHeight(x, z + e);
  const nx = hl - hr, nz = hd - hu, ny = 2 * e;
  const l = Math.hypot(nx, ny, nz);
  return [nx / l, ny / l, nz / l];
}

/** Turtle-shell weight for terrain shading (0 = none). Used by the shoal blend only. */
export function turtleShoalMask(x: number, z: number): number {
  const td = Math.hypot((x - TURTLE.x) / 36, (z - TURTLE.z) / 30);
  return smoothstep(1.3, 0.8, td);
}

// ---------------------------------------------------------------------------
// Boardwalk (walkable deck rectangles, axis aligned).
// ---------------------------------------------------------------------------
export interface DeckRect { minX: number; maxX: number; minZ: number; maxZ: number; plankAxis: 'x' | 'z'; y: number }

export const DECKS: DeckRect[] = [
  // Main boardwalk the player starts on, running away from camera (-Z). Planks run across X.
  { minX: -2.4, maxX: 2.4, minZ: -34, maxZ: 16, plankAxis: 'x', y: DECK_Y },
  // Wide cross platform at the far end, extending left toward the turtle.
  { minX: -18, maxX: 8, minZ: -40, maxZ: -32, plankAxis: 'z', y: DECK_Y },
  // Right branch toward the shore and the stilt houses.
  { minX: 2.4, maxX: 27, minZ: -14, maxZ: -9.5, plankAxis: 'z', y: DECK_Y },
  // Shore-side landing in front of the stilt houses.
  { minX: 16, maxX: 30, minZ: -30, maxZ: -14, plankAxis: 'x', y: DECK_Y + 0.05 },
  // Small left jetty off the main boardwalk (a gap the fox can leap).
  { minX: -10, maxX: -3.2, minZ: -6, maxZ: -2, plankAxis: 'z', y: DECK_Y - 0.1 },
];

export function deckAt(x: number, z: number): DeckRect | null {
  for (const d of DECKS) {
    if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) return d;
  }
  return null;
}

/** Walkable ground height: the highest of terrain and deck. */
export function groundHeight(x: number, z: number): number {
  const t = terrainHeight(x, z);
  const d = deckAt(x, z);
  return d ? Math.max(t, d.y) : t;
}

// ---------------------------------------------------------------------------
// Persistent placements. Lists are generated once from a fixed seed; quality
// tiers take a PREFIX of each list, so a tree visible on Low is the very same
// tree in the very same place on Ultra.
// ---------------------------------------------------------------------------
export interface TreePlacement { x: number; y: number; z: number; scale: number; yaw: number; tint: number; kind: number }
export interface GrassPlacement { x: number; y: number; z: number; yaw: number; height: number; tint: number }
export interface RockPlacement { x: number; y: number; z: number; scale: Vec3; yaw: number; tilt: number }

function onDeckOrNear(x: number, z: number, pad: number): boolean {
  for (const d of DECKS) {
    if (x >= d.minX - pad && x <= d.maxX + pad && z >= d.minZ - pad && z <= d.maxZ + pad) return true;
  }
  return false;
}

function slopeAt(x: number, z: number): number {
  return 1 - terrainNormal(x, z)[1];
}

export const MAX_TREES = 520;
export const MAX_GRASS = 220_000;
export const MAX_ROCKS = 140;

let treeCache: TreePlacement[] | null = null;
export function treePlacements(): TreePlacement[] {
  if (treeCache) return treeCache;
  const rnd = mulberry32(0x73ee5);
  const out: TreePlacement[] = [];
  let guard = 0;
  while (out.length < MAX_TREES && guard++ < 200000) {
    // Bias toward the near shore so the hero view is dense; some on far islands.
    const pick = rnd();
    let x: number, z: number;
    if (pick < 0.78) {
      z = lerp(-150, 90, rnd());
      x = coastX(z) + 3 + Math.pow(rnd(), 1.4) * 120;
    } else if (pick < 0.86) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 9;
      x = TURTLE.x + Math.cos(a) * r; z = TURTLE.z + Math.sin(a) * r; // on the shell — placed later on shell surface
      out.push({ x, y: NaN, z, scale: 0.55 + rnd() * 0.35, yaw: rnd() * 6.283, tint: rnd(), kind: 1 });
      continue;
    } else {
      const isl = DISTANT_ISLANDS[Math.floor(rnd() * DISTANT_ISLANDS.length)];
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * isl.r * 0.8;
      x = isl.x + Math.cos(a) * r; z = isl.z + Math.sin(a) * r;
    }
    const y = terrainHeight(x, z);
    if (y < 1.4 || slopeAt(x, z) > 0.32 || onDeckOrNear(x, z, 3)) continue;
    // Keep a clear sightline to the turtle from the boardwalk.
    if (x < 34 && z < -20 && z > -150) continue;
    out.push({ x, y, z, scale: 0.75 + rnd() * 0.75, yaw: rnd() * 6.283, tint: rnd(), kind: 0 });
  }
  treeCache = out;
  return out;
}

let grassCache: GrassPlacement[] | null = null;
export function grassPlacements(): GrassPlacement[] {
  if (grassCache) return grassCache;
  const rnd = mulberry32(0x96a55);
  const out: GrassPlacement[] = [];
  let guard = 0;
  while (out.length < MAX_GRASS && guard++ < MAX_GRASS * 6) {
    // Dense near the boardwalk landing, thinning out inland.
    const z = lerp(-120, 80, rnd());
    const x = coastX(z) + 1 + Math.pow(rnd(), 1.7) * 70;
    const y = terrainHeight(x, z);
    if (y < 0.9 || y > 22) continue;
    if (slopeAt(x, z) > 0.35) continue;
    // Clumping: reject in noise-low patches so meadows read as clumps, not carpet.
    if (valueNoise2(x * 0.12, z * 0.12, 77) < 0.32) continue;
    out.push({ x, y, z, yaw: rnd() * 6.283, height: 0.35 + rnd() * 0.55, tint: rnd() });
  }
  grassCache = out;
  return out;
}

let rockCache: RockPlacement[] | null = null;
export function rockPlacements(): RockPlacement[] {
  if (rockCache) return rockCache;
  const rnd = mulberry32(0x50c45);
  const out: RockPlacement[] = [];
  let guard = 0;
  while (out.length < MAX_ROCKS && guard++ < 60000) {
    const pick = rnd();
    let x: number, z: number;
    if (pick < 0.55) {
      z = lerp(-110, 60, rnd());
      x = coastX(z) + lerp(-9, 6, rnd());
    } else {
      const a = rnd() * Math.PI * 2, r = lerp(18, 34, Math.sqrt(rnd()));
      x = TURTLE.x + Math.cos(a) * r * 1.1; z = TURTLE.z + Math.sin(a) * r * 0.9;
    }
    if (onDeckOrNear(x, z, 1.5)) continue;
    const y = terrainHeight(x, z);
    if (y < -2.6 || y > 4) continue;
    const s = 0.6 + Math.pow(rnd(), 2) * 3.2;
    out.push({ x, y: y - s * 0.25, z, scale: [s * (0.9 + rnd() * 0.6), s * (0.6 + rnd() * 0.5), s * (0.9 + rnd() * 0.6)], yaw: rnd() * 6.283, tilt: (rnd() - 0.5) * 0.4 });
  }
  rockCache = out;
  return out;
}

/** Turtle shell surface height in TURTLE-local coordinates (lx, lz). */
export function shellSurfaceLocal(lx: number, lz: number): number {
  const q = 1 - (lx / TURTLE.shellRx) ** 2 - (lz / TURTLE.shellRz) ** 2;
  return TURTLE.shellY + TURTLE.shellRy * Math.sqrt(Math.max(0, q));
}

export function turtleLocalToWorld(lx: number, ly: number, lz: number): Vec3 {
  const c = Math.cos(TURTLE.yaw), s = Math.sin(TURTLE.yaw);
  return [TURTLE.x + c * lx + s * lz, ly, TURTLE.z - s * lx + c * lz];
}

export function worldToTurtleLocal(x: number, z: number): [number, number] {
  const dx = x - TURTLE.x, dz = z - TURTLE.z;
  const c = Math.cos(TURTLE.yaw), s = Math.sin(TURTLE.yaw);
  return [c * dx - s * dz, s * dx + c * dz];
}

