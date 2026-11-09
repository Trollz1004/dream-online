/**
 * Island test scene â€” procedural, seeded content builders.
 * Everything here is authored in-house from code: no store assets, no ripped
 * models, no generated video. Same seed => same world, every session.
 */
import { MAT, MeshBuilder } from './geometry.ts';
import { type Mat4, type Vec3, multiply, rotationY, rotationX, rotationZ, scaling, translation, trs, v3, lerp, clamp } from './math.ts';
import { mulberry32, valueNoise2 } from './noise.ts';
import {
  DECKS, DECK_Y, TERRAIN, TURTLE, WATER_Y, coastX, groundHeight, shellSurfaceLocal, terrainHeight, turtleShoalMask,
} from './world.ts';
import {
  FABLE_SMITH_NPC,
  NIGHT_ARMOR_TRUCK_ROUTE,
  SMITH_SERVICE_TABLE,
  TOWN_SMITH_PLACEMENT,
  createAnvilState,
  resolveArmorTruckState,
  useFablesAnvil,
  type ActiveAnvilCamp,
  type AnvilCapInput,
  type ArmorTruckState,
  type FablesAnvilState,
  type NightArmorTruckRoute,
  type SmithNpcDefinition,
  type SmithServiceTable,
  type TownSmithPlacement,
} from '../../game/economy/smith/index.ts';

export type WorldDayPhase = 'day' | 'night';

export interface WindmillRig { bone: number; hub: Vec3; axis: Vec3; speed: number }
export interface PointLightDef { pos: Vec3; color: Vec3; radius: number }

export interface StaticScene {
  world: MeshBuilder;
  windmills: WindmillRig[];
  lanterns: PointLightDef[];
  townSmith: TownSmithPlacement;
  nightTruckRoute: NightArmorTruckRoute;
}

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------
export function buildTerrain(res: number): MeshBuilder {
  const b = new MeshBuilder();
  const { minX, maxX, minZ, maxZ } = TERRAIN;
  const n = res + 1;
  const hs = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = lerp(minX, maxX, i / res), z = lerp(minZ, maxZ, j / res);
      hs[j * n + i] = terrainHeight(x, z);
    }
  }
  const dx = (maxX - minX) / res, dz = (maxZ - minZ) / res;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = lerp(minX, maxX, i / res), z = lerp(minZ, maxZ, j / res);
      const h = hs[j * n + i];
      const hl = hs[j * n + Math.max(0, i - 1)], hr = hs[j * n + Math.min(res, i + 1)];
      const hd = hs[Math.max(0, j - 1) * n + i], hu = hs[Math.min(res, j + 1) * n + i];
      const nrm = v3.norm([(hl - hr) / (2 * dx), 1, (hd - hu) / (2 * dz)]);
      // Cheap cavity AO: darker in local dips.
      const avg = (hl + hr + hd + hu) * 0.25;
      const ao = clamp(1 - (avg - h) * 0.35, 0.55, 1);
      b.vert([x, h, z], nrm, [turtleShoalMask(x, z), 0, 0], MAT.TERRAIN, ao, -1, 0);
    }
  }
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const a = j * n + i, bb = a + 1, c = a + n, d = c + 1;
      b.tri(a, c, d);
      b.tri(a, d, bb);
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// Boardwalk: planks, stringers, posts, sagging ropes, coils, barrels, crates.
// ---------------------------------------------------------------------------
const WOOD_BASE: Vec3 = [0.44, 0.29, 0.18];
const WOOD_GREY: Vec3 = [0.5, 0.43, 0.35];
const ROPE: Vec3 = [0.66, 0.55, 0.38];

function woodTone(r: () => number): Vec3 {
  const g = r() * 0.35;
  const k = 0.82 + r() * 0.3;
  return v3.scale(v3.lerp(WOOD_BASE, WOOD_GREY, g), k);
}

function sagRope(b: MeshBuilder, a: Vec3, c: Vec3, sag: number, radius: number) {
  const pts: Vec3[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = v3.lerp(a, c, t);
    p[1] -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  b.tube(pts, radius, 6, ROPE, MAT.ROPE);
}

function ropeCoil(b: MeshBuilder, center: Vec3, r: number, turns: number) {
  for (let k = 0; k < turns; k++) {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      pts.push([center[0] + Math.cos(a) * r, center[1] + k * 0.055, center[2] + Math.sin(a) * r]);
    }
    b.tube(pts, 0.03, 5, ROPE, MAT.ROPE);
  }
}

function post(b: MeshBuilder, x: number, z: number, topY: number, r: number, rnd: () => number) {
  const bottom = Math.min(terrainHeight(x, z) - 0.6, WATER_Y - 1.0);
  b.cylinder([x, bottom, z], [x + (rnd() - 0.5) * 0.06, topY, z + (rnd() - 0.5) * 0.06], r * 1.05, r * 0.95, 8, woodTone(rnd), MAT.WOOD, { aux: 1, jitter: 0.14 });
}

interface RailEdge { a: [number, number]; b: [number, number]; skip?: [number, number][]; rope?: boolean }

function railing(b: MeshBuilder, edge: RailEdge, rnd: () => number, spacing = 3.0) {
  const [ax, az] = edge.a, [bx, bz] = edge.b;
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.round(len / spacing));
  const pts: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = lerp(ax, bx, t), z = lerp(az, bz, t);
    const along = Math.abs(bx - ax) > Math.abs(bz - az) ? x : z;
    const skipped = edge.skip?.some(([s0, s1]) => along > Math.min(s0, s1) && along < Math.max(s0, s1));
    const tall = i === 0 || i === n || rnd() < 0.18;
    const top = DECK_Y + (tall ? 1.55 + rnd() * 0.5 : 1.15);
    post(b, x, z, top, tall ? 0.2 : 0.15, rnd);
    if (tall) ropeCoil(b, [x, DECK_Y + 1.05, z], tall ? 0.22 : 0.17, 3);
    pts.push(skipped ? [NaN, NaN, NaN] : [x, DECK_Y + 1.02, z]);
  }
  if (edge.rope === false) return;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    if (Number.isNaN(p[0]) || Number.isNaN(q[0])) continue;
    sagRope(b, p, q, 0.22, 0.034);
    sagRope(b, [p[0], p[1] - 0.45, p[2]], [q[0], q[1] - 0.45, q[2]], 0.12, 0.028);
  }
}

function deckPlanks(b: MeshBuilder, rnd: () => number) {
  for (const d of DECKS) {
    const pw = 0.2, gap = 0.016;
    if (d.plankAxis === 'x') {
      const midX = (d.minX + d.maxX) / 2, halfW = (d.maxX - d.minX) / 2;
      for (let z = d.maxZ - pw / 2; z > d.minZ; z -= pw + gap) {
        if (rnd() < 0.015 && Math.abs(z) > 6) continue;
        const jitter = (rnd() - 0.5) * 0.12;
        const tr = multiply(translation(midX + jitter, d.y - 0.045 + (rnd() - 0.5) * 0.02, z), rotationY((rnd() - 0.5) * 0.03));
        b.box([0, 0, 0], [halfW + 0.08 + rnd() * 0.1, 0.045, pw / 2 - rnd() * 0.015], woodTone(rnd), MAT.WOOD, { aux: 0, transform: tr });
      }
      for (const sx of [d.minX + 0.3, midX, d.maxX - 0.3]) {
        b.box([sx, d.y - 0.18, (d.minZ + d.maxZ) / 2], [0.09, 0.09, (d.maxZ - d.minZ) / 2], woodTone(rnd), MAT.WOOD, { aux: 2, ao: 0.6 });
      }
    } else {
      const midZ = (d.minZ + d.maxZ) / 2, halfD = (d.maxZ - d.minZ) / 2;
      for (let x = d.minX + pw / 2; x < d.maxX; x += pw + gap) {
        if (rnd() < 0.015) continue;
        const jitter = (rnd() - 0.5) * 0.12;
        const tr = multiply(translation(x, d.y - 0.045 + (rnd() - 0.5) * 0.02, midZ + jitter), rotationY((rnd() - 0.5) * 0.03));
        b.box([0, 0, 0], [pw / 2 - rnd() * 0.015, 0.045, halfD + 0.08 + rnd() * 0.1], woodTone(rnd), MAT.WOOD, { aux: 2, transform: tr });
      }
      for (const sz of [d.minZ + 0.3, midZ, d.maxZ - 0.3]) {
        b.box([(d.minX + d.maxX) / 2, d.y - 0.18, sz], [(d.maxX - d.minX) / 2, 0.09, 0.09], woodTone(rnd), MAT.WOOD, { aux: 0, ao: 0.6 });
      }
    }
    // Support posts under the deck interior (short, below planks).
    for (let x = d.minX + 0.4; x <= d.maxX - 0.3; x += 3.1) {
      for (let z = d.minZ + 0.4; z <= d.maxZ - 0.3; z += 3.1) {
        post(b, x, z, d.y - 0.2, 0.14, rnd);
      }
    }
  }
}

function barrel(b: MeshBuilder, x: number, y: number, z: number, rnd: () => number) {
  const h = 0.9, r = 0.32;
  const tone = woodTone(rnd);
  b.cylinder([x, y, z], [x, y + h * 0.5, z], r * 0.88, r, 14, tone, MAT.WOOD, { aux: 1, caps: true });
  b.cylinder([x, y + h * 0.5, z], [x, y + h, z], r, r * 0.88, 14, tone, MAT.WOOD, { aux: 1, caps: true });
  for (const t of [0.12, 0.42, 0.58, 0.88]) {
    const rr = r * (t < 0.5 ? lerp(0.88, 1, t * 2) : lerp(1, 0.88, (t - 0.5) * 2)) + 0.012;
    b.cylinder([x, y + h * t - 0.02, z], [x, y + h * t + 0.02, z], rr, rr, 14, [0.16, 0.15, 0.14], MAT.METAL, { caps: false });
  }
}

function crate(b: MeshBuilder, x: number, y: number, z: number, s: number, yaw: number, rnd: () => number) {
  const tr = multiply(translation(x, y + s / 2, z), rotationY(yaw));
  b.box([0, 0, 0], [s / 2, s / 2, s / 2], woodTone(rnd), MAT.WOOD, { aux: 0, transform: tr });
  for (const sy of [-1, 1]) {
    b.box([0, sy * (s / 2 - 0.04), s / 2 + 0.01], [s / 2 + 0.01, 0.045, 0.02], woodTone(rnd), MAT.WOOD, { aux: 0, transform: tr });
    b.box([0, sy * (s / 2 - 0.04), -s / 2 - 0.01], [s / 2 + 0.01, 0.045, 0.02], woodTone(rnd), MAT.WOOD, { aux: 0, transform: tr });
  }
}

function lantern(b: MeshBuilder, lights: PointLightDef[], x: number, y: number, z: number) {
  b.box([x, y + 0.18, z], [0.11, 0.02, 0.11], [0.12, 0.1, 0.09], MAT.METAL);
  b.box([x, y - 0.02, z], [0.1, 0.02, 0.1], [0.12, 0.1, 0.09], MAT.METAL);
  b.box([x, y + 0.08, z], [0.075, 0.09, 0.075], [1.0, 0.62, 0.28], MAT.EMISSIVE);
  lights.push({ pos: [x, y + 0.08, z], color: [1.0, 0.62, 0.3], radius: 7 });
}

// ---------------------------------------------------------------------------
// Timber houses (village on the turtle and stilt houses on the shore).
// ---------------------------------------------------------------------------
const PLASTER: Vec3 = [0.92, 0.82, 0.64];
const TIMBER: Vec3 = [0.3, 0.21, 0.14];
const ROOF: Vec3 = [0.34, 0.22, 0.17];

function house(b: MeshBuilder, base: Mat4, w: number, d: number, floors: number, rnd: () => number) {
  const fh = 2.3;
  let y = 0;
  for (let f = 0; f < floors; f++) {
    const over = f * 0.25;
    const hw = w / 2 + over, hd = d / 2 + over;
    const wallColor = v3.scale(PLASTER, 0.9 + rnd() * 0.15);
    b.box([0, y + fh / 2, 0], [hw, fh / 2, hd], wallColor, MAT.PLASTER, { transform: base });
    // Timber frame: corner posts, floor beam, mid studs, diagonal-ish braces.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.box([sx * hw, y + fh / 2, sz * hd], [0.1, fh / 2, 0.1], TIMBER, MAT.WOOD, { aux: 1, transform: base });
    }
    b.box([0, y + 0.08, hd + 0.02], [hw + 0.08, 0.1, 0.06], TIMBER, MAT.WOOD, { aux: 0, transform: base });
    b.box([0, y + 0.08, -hd - 0.02], [hw + 0.08, 0.1, 0.06], TIMBER, MAT.WOOD, { aux: 0, transform: base });
    b.box([hw + 0.02, y + 0.08, 0], [0.06, 0.1, hd + 0.08], TIMBER, MAT.WOOD, { aux: 2, transform: base });
    b.box([-hw - 0.02, y + 0.08, 0], [0.06, 0.1, hd + 0.08], TIMBER, MAT.WOOD, { aux: 2, transform: base });
    b.box([0, y + fh - 0.06, hd + 0.02], [hw + 0.08, 0.08, 0.06], TIMBER, MAT.WOOD, { aux: 0, transform: base });
    b.box([0, y + fh - 0.06, -hd - 0.02], [hw + 0.08, 0.08, 0.06], TIMBER, MAT.WOOD, { aux: 0, transform: base });
    const studs = Math.max(1, Math.round(w / 1.4));
    for (let s = 1; s < studs; s++) {
      const sx = -hw + (2 * hw * s) / studs;
      b.box([sx, y + fh / 2, hd + 0.03], [0.06, fh / 2, 0.04], TIMBER, MAT.WOOD, { aux: 1, transform: base });
      b.box([sx, y + fh / 2, -hd - 0.03], [0.06, fh / 2, 0.04], TIMBER, MAT.WOOD, { aux: 1, transform: base });
      // Window between studs on alternating bays.
      if ((s + f) % 2 === 0) {
        const wx = sx - hw / studs;
        b.box([wx, y + fh * 0.55, hd + 0.04], [0.32, 0.38, 0.03], [0.06, 0.07, 0.08], MAT.METAL, { transform: base });
        b.box([wx, y + fh * 0.55 - 0.42, hd + 0.08], [0.4, 0.04, 0.08], TIMBER, MAT.WOOD, { aux: 0, transform: base });
      }
    }
    y += fh;
  }
  const topW = w / 2 + (floors - 1) * 0.25, topD = d / 2 + (floors - 1) * 0.25;
  const rh = 1.6 + rnd() * 0.8;
  b.gableRoof([0, y, 0], topW, topD, rh, 0.45, v3.scale(ROOF, 0.85 + rnd() * 0.3), MAT.ROOF, { transform: base });
  b.gableEnd(topW, y, 0, topD, rh, 1, PLASTER, MAT.PLASTER, { transform: base });
  b.gableEnd(-topW, y, 0, topD, rh, -1, PLASTER, MAT.PLASTER, { transform: base });
  // Chimney.
  b.box([topW * 0.5, y + rh * 0.7, topD * 0.3], [0.25, rh * 0.6, 0.25], [0.45, 0.42, 0.4], MAT.ROCK, { transform: base });
}

function windmill(b: MeshBuilder, rigs: WindmillRig[], base: Mat4, height: number, bone: number, rnd: () => number) {
  const tone = woodTone(rnd);
  b.cylinder([0, 0, 0], [0, height, 0], height * 0.2, height * 0.12, 8, tone, MAT.WOOD, { aux: 1, transform: base });
  b.gableRoof([0, height, 0], height * 0.14, height * 0.13, height * 0.16, 0.12, ROOF, MAT.ROOF, { transform: base });
  // Sails hub faces local -X.
  const hubLocal: Vec3 = [-height * 0.2, height * 0.95, 0];
  const toWorld = (p: Vec3): Vec3 => {
    const m = base;
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  };
  const hub = toWorld(hubLocal);
  const axisEnd = toWorld([hubLocal[0] - 1, hubLocal[1], hubLocal[2]]);
  const axis = v3.norm(v3.sub(axisEnd, hub));
  const sail = height * 0.85;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const arm = multiply(base, multiply(translation(hubLocal[0], hubLocal[1], hubLocal[2]), rotationX(a)));
    b.box([0, sail / 2, 0], [0.06, sail / 2, 0.06], TIMBER, MAT.WOOD, { aux: 1, bone, transform: arm });
    // Lattice sail cloth: a thin panel offset to one side of the arm.
    b.box([0.02, sail * 0.58, 0.26], [0.02, sail * 0.38, 0.24], [0.84, 0.78, 0.66], MAT.PLASTER, { bone, transform: arm });
    for (let r = 0; r < 5; r++) {
      b.box([0.04, sail * (0.25 + r * 0.16), 0.26], [0.025, 0.025, 0.26], TIMBER, MAT.WOOD, { aux: 2, bone, transform: arm });
    }
  }
  b.cylinder(v3.add(hubLocal, [0.25, 0, 0]), v3.add(hubLocal, [-0.2, 0, 0]), 0.16, 0.16, 8, TIMBER, MAT.WOOD, { transform: base, bone });
  rigs.push({ bone, hub, axis, speed: 0.6 + rnd() * 0.4 });
}

// ---------------------------------------------------------------------------
// Giant turtle with scute plates (Voronoi on the shell), head, flippers.
// ---------------------------------------------------------------------------
function scuteCenters(): Vec3[] {
  const c: Vec3[] = [];
  for (const deg of [-50, -25, 0, 25, 50]) {
    const a = (deg * Math.PI) / 180;
    c.push(v3.norm([Math.sin(a), Math.cos(a), 0]));
  }
  for (const side of [-1, 1]) {
    for (const s of [-0.78, -0.26, 0.26, 0.78]) c.push(v3.norm([s, 0.62, side * 0.82]));
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    c.push(v3.norm([Math.cos(a), 0.16, Math.sin(a)]));
  }
  return c;
}
const SCUTES = scuteCenters();

function scuteInfo(d: Vec3): { edge: number; id: number } {
  let best = -2, second = -2, id = 0;
  for (let i = 0; i < SCUTES.length; i++) {
    const k = v3.dot(d, SCUTES[i]);
    if (k > best) { second = best; best = k; id = i; } else if (k > second) second = k;
  }
  const edge = (Math.acos(clamp(second, -1, 1)) - Math.acos(clamp(best, -1, 1))) * 0.5 * 18;
  return { edge, id };
}

export function buildTurtle(b: MeshBuilder, place: Mat4, detail: number, seed: number) {
  const rnd = mulberry32(seed);
  const { shellRx: rx, shellRy: ry, shellRz: rz, shellY } = TURTLE;
  const rings = [36, 52, 72][detail], segs = [72, 104, 144][detail];
  const plateTint: Vec3[] = SCUTES.map(() => [0.25 + rnd() * 0.14, 0.33 + rnd() * 0.12, 0.13 + rnd() * 0.07]);
  b.ellipsoid([0, shellY, 0], [rx, ry, rz], rings, segs, [0.3, 0.4, 0.2], MAT.SHELL, {
    transform: place,
    flatBottom: 0.18,
    displace: (d) => {
      const { edge } = scuteInfo(v3.norm(d));
      const t = Math.min(1, edge / 1.4); const plateau = t * t * (3 - 2 * t); return 0.18 * plateau - 0.4 * (1 - Math.min(1, edge / 0.4));
    },
    shade: (d) => {
      const { edge, id } = scuteInfo(v3.norm(d));
      const moss = clamp(d[1] * 1.3 - 0.1, 0, 1);
      const c = v3.lerp(v3.scale(plateTint[id], 0.75), plateTint[id], moss);
      return { c, ao: 0.55 + 0.45 * Math.min(1, edge / 0.5), aux: edge };
    },
  });
  const skin: Vec3 = [0.36, 0.38, 0.29];
  const skinShade = (d: Vec3) => ({ ao: 0.6 + 0.4 * (d[1] * 0.5 + 0.5) });
  // Neck and head (head toward -X).
  b.ellipsoid([-rx - 4.5, shellY + 3.2, 0], [8.5, 4.6, 5.0], 18, 28, skin, MAT.SKIN, { transform: multiply(place, rotationZ(0)), noise: 0.02, noiseFreq: 3, seed: 3, shade: skinShade });
  b.ellipsoid([-rx - 13.0, shellY + 6.0, 0], [7.4, 4.3, 4.7], 20, 30, skin, MAT.SKIN, { transform: place, noise: 0.015, noiseFreq: 3, seed: 5, shade: skinShade });
  b.ellipsoid([-rx - 19.2, shellY + 5.0, 0], [3.4, 2.4, 3.4], 12, 18, v3.scale(skin, 0.75), MAT.SKIN, { transform: place, noise: 0.03, seed: 9, shade: skinShade });
  for (const s of [-1, 1]) {
    b.ellipsoid([-rx - 15.4, shellY + 7.8, s * 3.7], [0.95, 0.95, 0.95], 10, 14, [0.03, 0.03, 0.03], MAT.METAL, { transform: place });
    b.ellipsoid([-rx - 15.0, shellY + 8.8, s * 3.4], [1.7, 0.6, 1.3], 8, 12, v3.scale(skin, 0.9), MAT.SKIN, { transform: place, shade: skinShade });
    // Front flippers sweep forward-out, rear flippers back-out.
    b.ellipsoid([0, 0, 0], [10.5, 1.5, 3.8], 12, 22, skin, MAT.SKIN, {
      transform: multiply(place, trs([-rx * 0.45, shellY - 1.3, s * (rz + 2.5)], [0, s * 0.55, s * 0.12], 1)), noise: 0.06, noiseFreq: 4, seed: 11 + s, shade: skinShade,
    });
    b.ellipsoid([0, 0, 0], [6.5, 1.2, 2.9], 10, 18, skin, MAT.SKIN, {
      transform: multiply(place, trs([rx * 0.62, shellY - 1.5, s * (rz * 0.82 + 1.5)], [0, -s * 0.65, 0], 1)), noise: 0.06, noiseFreq: 4, seed: 17 + s, shade: skinShade,
    });
  }
  // Tail.
  b.ellipsoid([rx + 1.5, shellY - 0.6, 0], [3.5, 1.4, 1.6], 10, 14, skin, MAT.SKIN, { transform: place, shade: skinShade });
}

function shellPoint(place: Mat4, lx: number, lz: number, sink = 0.5): Mat4 {
  return multiply(place, translation(lx, shellSurfaceLocal(lx, lz) - sink, lz));
}

// ---------------------------------------------------------------------------
// Fable's Forge Smith (`fable-smith`) & Fable's Armor Truck + Pop-Up Camper
// ---------------------------------------------------------------------------
const IRON_DARK: Vec3 = [0.16, 0.17, 0.19];
const IRON_STEEL: Vec3 = [0.34, 0.36, 0.4];
const BRASS_WARM: Vec3 = [0.68, 0.52, 0.26];
const LEATHER_APRON: Vec3 = [0.36, 0.22, 0.13];
const TUNIC_SLATE: Vec3 = [0.22, 0.26, 0.32];
const SKIN_WARM: Vec3 = [0.78, 0.62, 0.5];
const EMBER_GLOW: Vec3 = [1.0, 0.48, 0.16];
const CAMPER_CANVAS: Vec3 = [0.86, 0.78, 0.64];
const TRUCK_SLATE: Vec3 = [0.2, 0.23, 0.27];

/** Sculpted horned blacksmith anvil on an oak timber block. */
function buildSmithAnvil(b: MeshBuilder, base: Mat4) {
  // Heavy oak stump base with iron bands.
  b.cylinder([0, 0, 0], [0, 0.54, 0], 0.34, 0.31, 12, [0.38, 0.25, 0.15], MAT.WOOD, { aux: 1, transform: base });
  b.cylinder([0, 0.12, 0], [0, 0.16, 0], 0.345, 0.345, 12, IRON_DARK, MAT.METAL, { caps: false, transform: base });
  b.cylinder([0, 0.42, 0], [0, 0.46, 0], 0.32, 0.32, 12, IRON_DARK, MAT.METAL, { caps: false, transform: base });
  // Cast-iron anvil foot, waist, and working face.
  b.box([0, 0.6, 0], [0.28, 0.06, 0.18], IRON_DARK, MAT.METAL, { transform: base });
  b.box([0, 0.72, 0], [0.18, 0.08, 0.12], IRON_DARK, MAT.METAL, { transform: base });
  b.box([0, 0.85, 0], [0.34, 0.07, 0.15], IRON_STEEL, MAT.METAL, { transform: base });
  // Tapered bick/horn pointing +X and heel step pointing -X.
  b.cylinder([0.3, 0.85, 0], [0.64, 0.86, 0], 0.11, 0.025, 10, IRON_STEEL, MAT.METAL, { transform: base });
  b.box([-0.38, 0.83, 0], [0.08, 0.045, 0.13], IRON_STEEL, MAT.METAL, { transform: base });
  // Glowing hot ingot resting on the anvil face.
  b.box([0.04, 0.94, 0], [0.11, 0.025, 0.045], EMBER_GLOW, MAT.EMISSIVE, { transform: base });
}

/**
 * Sculpted figure for Fable's town/camp/truck smith NPC (`fable-smith`).
 * Positioned at local origin facing +Z (or towards the anvil).
 */
export function buildFableSmithFigure(b: MeshBuilder, base: Mat4) {
  // Boots & sturdy stance legs.
  for (const sx of [-0.14, 0.14]) {
    b.cylinder([sx, 0, 0], [sx, 0.42, 0], 0.095, 0.085, 10, [0.18, 0.13, 0.1], MAT.WOOD, { transform: base });
    b.cylinder([sx, 0.42, 0], [sx, 0.88, 0], 0.105, 0.095, 10, TUNIC_SLATE, MAT.PLASTER, { transform: base });
  }
  // Broad blacksmith torso + heavy leather smithing apron.
  b.ellipsoid([0, 1.18, 0], [0.27, 0.34, 0.19], 12, 16, TUNIC_SLATE, MAT.PLASTER, { transform: base });
  b.box([0, 1.02, 0.12], [0.23, 0.36, 0.08], LEATHER_APRON, MAT.WOOD, { aux: 1, transform: base });
  // Tool belt + brass buckle.
  b.box([0, 0.9, 0.02], [0.27, 0.045, 0.2], [0.22, 0.14, 0.09], MAT.WOOD, { transform: base });
  b.box([0, 0.9, 0.22], [0.055, 0.05, 0.02], BRASS_WARM, MAT.METAL, { transform: base });
  // Shoulders & arms (right arm raised with forging hammer, left arm holding tongs).
  b.ellipsoid([-0.31, 1.34, 0.02], [0.11, 0.11, 0.11], 8, 12, TUNIC_SLATE, MAT.PLASTER, { transform: base });
  b.ellipsoid([0.31, 1.36, 0.04], [0.11, 0.11, 0.11], 8, 12, TUNIC_SLATE, MAT.PLASTER, { transform: base });
  // Left arm reaching forward with tongs.
  b.cylinder([-0.31, 1.32, 0.04], [-0.22, 1.06, 0.36], 0.075, 0.065, 8, SKIN_WARM, MAT.SKIN, { transform: base });
  b.cylinder([-0.22, 1.06, 0.36], [-0.06, 0.96, 0.58], 0.022, 0.018, 6, IRON_DARK, MAT.METAL, { transform: base });
  // Right arm poised with blacksmith cross-peen hammer.
  b.cylinder([0.31, 1.36, 0.04], [0.26, 1.54, 0.32], 0.08, 0.068, 8, SKIN_WARM, MAT.SKIN, { transform: base });
  b.cylinder([0.26, 1.5, 0.26], [0.14, 1.82, 0.44], 0.026, 0.024, 8, [0.46, 0.31, 0.18], MAT.WOOD, { transform: base });
  b.box([0.13, 1.84, 0.45], [0.065, 0.065, 0.14], IRON_STEEL, MAT.METAL, { transform: base });
  // Neck, head, beard, and brass smith goggles on forehead.
  b.cylinder([0, 1.46, 0], [0, 1.58, 0], 0.09, 0.085, 8, SKIN_WARM, MAT.SKIN, { transform: base });
  b.ellipsoid([0, 1.71, 0.02], [0.155, 0.175, 0.16], 12, 16, SKIN_WARM, MAT.SKIN, { transform: base });
  b.ellipsoid([0, 1.63, 0.1], [0.13, 0.11, 0.11], 10, 12, [0.24, 0.17, 0.12], MAT.FUR, { transform: base });
  b.ellipsoid([0, 1.78, -0.02], [0.165, 0.12, 0.165], 10, 14, [0.24, 0.17, 0.12], MAT.FUR, { transform: base });
  b.box([0, 1.79, 0.14], [0.13, 0.035, 0.04], BRASS_WARM, MAT.METAL, { transform: base });
}

/**
 * Places the daytime town smith (`fable-smith`) and open-air forge on Haven Town Landing
 * using `TOWN_SMITH_PLACEMENT` from `src/game/economy/smith/truck.ts`.
 */
export function buildTownSmithForge(
  b: MeshBuilder,
  lights: PointLightDef[],
  placement: TownSmithPlacement = TOWN_SMITH_PLACEMENT,
) {
  const [px, py, pz] = placement.position;
  const base = multiply(translation(px, py, pz), rotationY(placement.yaw));
  const toWorld = (lp: Vec3): Vec3 => [
    base[0] * lp[0] + base[4] * lp[1] + base[8] * lp[2] + base[12],
    base[1] * lp[0] + base[5] * lp[1] + base[9] * lp[2] + base[13],
    base[2] * lp[0] + base[6] * lp[1] + base[10] * lp[2] + base[14],
  ];

  // Stone hearth pad under the forge so hot coals never scorch the boardwalk planks.
  b.box([0, 0.04, 0], [1.95, 0.04, 1.65], [0.38, 0.36, 0.34], MAT.ROCK, { transform: base });

  // Open-air timber forge pavilion posts + shingled gable canopy.
  for (const [cx, cz] of [[-1.75, -1.4], [1.75, -1.4], [-1.75, 1.4], [1.75, 1.4]] as [number, number][]) {
    b.cylinder([cx, 0, cz], [cx, 2.55, cz], 0.11, 0.095, 8, TIMBER, MAT.WOOD, { aux: 1, transform: base });
  }
  b.box([0, 2.48, 1.4], [1.85, 0.08, 0.08], TIMBER, MAT.WOOD, { aux: 0, transform: base });
  b.box([0, 2.48, -1.4], [1.85, 0.08, 0.08], TIMBER, MAT.WOOD, { aux: 0, transform: base });
  b.gableRoof([0, 2.55, 0], 1.85, 1.5, 0.78, 0.28, ROOF, MAT.ROOF, { transform: base });
  b.gableEnd(1.85, 2.55, 0, 1.5, 0.78, 1, TIMBER, MAT.WOOD, { transform: base });
  b.gableEnd(-1.85, 2.55, 0, 1.5, 0.78, -1, TIMBER, MAT.WOOD, { transform: base });

  // Stone brick forge hearth & chimney hood on the back-left (-X, -Z).
  b.box([-0.95, 0.55, -0.68], [0.68, 0.52, 0.56], [0.42, 0.4, 0.37], MAT.ROCK, { transform: base });
  b.box([-0.95, 1.12, -0.68], [0.74, 0.08, 0.62], IRON_DARK, MAT.METAL, { transform: base });
  b.cylinder([-0.95, 1.65, -0.68], [-0.95, 3.55, -0.68], 0.44, 0.24, 10, IRON_DARK, MAT.METAL, { transform: base });
  // Glowing forge coal bed + warm point light.
  b.ellipsoid([-0.95, 1.18, -0.58], [0.42, 0.12, 0.34], 8, 12, EMBER_GLOW, MAT.EMISSIVE, { transform: base });
  lights.push({ pos: toWorld([-0.85, 1.45, -0.45]), color: [1.0, 0.58, 0.24], radius: 9.5 });

  // Centerpiece horned anvil in front of the smith.
  buildSmithAnvil(b, multiply(base, translation(0.22, 0.06, 0.38)));

  // Quench barrel and weapon/armor service rack on +X.
  b.cylinder([1.18, 0.06, -0.45], [1.18, 0.82, -0.45], 0.3, 0.33, 12, WOOD_BASE, MAT.WOOD, { aux: 1, transform: base });
  b.box([1.32, 0.72, 0.42], [0.22, 0.66, 0.62], TIMBER, MAT.WOOD, { aux: 1, transform: base });
  for (const sz of [-0.32, 0, 0.32]) {
    b.cylinder([1.28, 0.35, 0.42 + sz], [1.22, 1.38, 0.42 + sz], 0.032, 0.015, 6, IRON_STEEL, MAT.METAL, { transform: base });
  }

  // Hanging forge sign lantern at the front post.
  const signWorld = toWorld([1.75, 2.15, 1.45]);
  lantern(b, lights, signWorld[0], signWorld[1], signWorld[2]);

  // Fable's Forge Smith NPC (`fable-smith`) standing behind the anvil facing the player walkway.
  buildFableSmithFigure(b, multiply(base, translation(0.18, 0.06, -0.32)));
}

/**
 * Computes the heading yaw for Fable's Armor Truck from its active state and route.
 */
export function computeArmorTruckYaw(
  truckState: ArmorTruckState,
  route: NightArmorTruckRoute = NIGHT_ARMOR_TRUCK_ROUTE,
): number {
  if (truckState.mode === 'summoned-to-player') {
    return -2.55;
  }
  const dx = route.destinationPosition[0] - route.originPosition[0];
  const dz = route.destinationPosition[2] - route.originPosition[2];
  return Math.atan2(dx, dz);
}

/**
 * Builds Fable's Armor Truck (`fables-armor-truck`) and its tow-behind pop-up camper
 * (`towsPopupCamper: true`) at `truckState.position`.
 * When `truckState.camperDeployed` is true (parked midway at night
 * or summoned beside the player via Fable's Anvil), the pop-up camper roof and awning deploy
 * and the same smith NPC (`fable-smith`) stands at the portable anvil counter.
 */
export function buildArmorTruckWithPopupCamper(
  b: MeshBuilder,
  lights: PointLightDef[],
  truckState: ArmorTruckState,
  yawOverride?: number,
) {
  const [tx, ty, tz] = truckState.position;
  const yaw = yawOverride ?? computeArmorTruckYaw(truckState);
  const base = multiply(translation(tx, ty, tz), rotationY(yaw));
  const toWorld = (lp: Vec3): Vec3 => [
    base[0] * lp[0] + base[4] * lp[1] + base[8] * lp[2] + base[12],
    base[1] * lp[0] + base[5] * lp[1] + base[9] * lp[2] + base[13],
    base[2] * lp[0] + base[6] * lp[1] + base[10] * lp[2] + base[14],
  ];

  // -------------------------------------------------------------------------
  // 1. Fable's Armor Truck (`fables-armor-truck`) — centered at local z = +1.15
  // -------------------------------------------------------------------------
  // Heavy armored chassis frame & bumpers.
  b.box([0, 0.44, 1.15], [1.08, 0.14, 2.05], IRON_DARK, MAT.METAL, { transform: base });
  b.box([0, 0.42, 3.26], [1.14, 0.16, 0.12], BRASS_WARM, MAT.METAL, { transform: base });
  b.box([0, 0.42, -0.92], [1.12, 0.14, 0.1], IRON_DARK, MAT.METAL, { transform: base });

  // 4 heavy off-road wheels with brass hubs.
  for (const [wx, wz] of [
    [-1.08, 2.45],
    [1.08, 2.45],
    [-1.08, 0.05],
    [1.08, 0.05],
  ] as [number, number][]) {
    const side = wx < 0 ? -1 : 1;
    b.cylinder([wx - side * 0.14, 0.44, wz], [wx + side * 0.14, 0.44, wz], 0.44, 0.44, 14, [0.1, 0.1, 0.11], MAT.METAL, { transform: base });
    b.cylinder([wx - side * 0.16, 0.44, wz], [wx + side * 0.16, 0.44, wz], 0.2, 0.2, 10, BRASS_WARM, MAT.METAL, { transform: base });
  }

  // Forward armored cab (local z = 2.05..3.15).
  b.box([0, 1.18, 2.55], [0.98, 0.62, 0.58], TRUCK_SLATE, MAT.METAL, { transform: base });
  b.box([0, 0.92, 3.02], [0.94, 0.36, 0.24], [0.24, 0.27, 0.32], MAT.METAL, { transform: base });
  // Windshield visor & warm headlights.
  b.box([0, 1.42, 3.14], [0.82, 0.22, 0.04], [0.12, 0.18, 0.24], MAT.METAL, { transform: base });
  for (const hx of [-0.68, 0.68]) {
    b.box([hx, 0.78, 3.28], [0.14, 0.11, 0.05], [1.0, 0.82, 0.46], MAT.EMISSIVE, { transform: base });
  }

  // Rear mobile forge workshop box body (local z = -0.85..2.0).
  b.box([0, 1.42, 0.58], [1.04, 0.86, 1.42], [0.34, 0.24, 0.16], MAT.WOOD, { aux: 2, transform: base });
  // Brass & riveted iron corner trim + roof rack + forge chimney stack.
  b.box([0, 2.32, 0.58], [1.08, 0.07, 1.46], IRON_DARK, MAT.METAL, { transform: base });
  b.box([0, 2.38, 0.58], [0.92, 0.05, 1.28], BRASS_WARM, MAT.METAL, { transform: base });
  b.cylinder([-0.55, 2.35, 0.2], [-0.55, 3.15, 0.2], 0.16, 0.12, 10, IRON_DARK, MAT.METAL, { transform: base });
  b.ellipsoid([-0.55, 3.18, 0.2], [0.14, 0.06, 0.14], 6, 10, EMBER_GLOW, MAT.EMISSIVE, { transform: base });

  // Side service window bay on +X with glowing forge interior & service counter.
  b.box([1.05, 1.38, 0.58], [0.05, 0.46, 0.96], EMBER_GLOW, MAT.EMISSIVE, { transform: base });
  b.box([1.14, 0.92, 0.58], [0.16, 0.06, 1.04], WOOD_BASE, MAT.WOOD, { aux: 2, transform: base });
  // Propped awning over the truck service window.
  const awningLift = truckState.camperDeployed ? 0.55 : 0.12;
  b.box([1.42, 1.88, 0.58], [0.46, 0.04, 1.06], ROOF, MAT.ROOF, {
    transform: multiply(base, rotationZ(-0.22 * awningLift)),
  });

  // -------------------------------------------------------------------------
  // 2. Tow Hitch & Tow-Behind Pop-Up Camper (`towsPopupCamper: true`)
  // -------------------------------------------------------------------------
  if (truckState.towsPopupCamper) {
    // Steel A-frame tow hitch connecting truck rear (z = -0.92) to camper front (z = -1.75).
    b.cylinder([-0.32, 0.42, -1.78], [0, 0.42, -0.92], 0.045, 0.045, 6, IRON_STEEL, MAT.METAL, { transform: base });
    b.cylinder([0.32, 0.42, -1.78], [0, 0.42, -0.92], 0.045, 0.045, 6, IRON_STEEL, MAT.METAL, { transform: base });
    b.ellipsoid([0, 0.46, -1.32], [0.08, 0.08, 0.08], 6, 8, BRASS_WARM, MAT.METAL, { transform: base });

    // Camper trailer chassis & lower tub (local z = -1.75..-4.25, centered at z = -3.0).
    b.box([0, 0.42, -3.0], [0.96, 0.12, 1.25], IRON_DARK, MAT.METAL, { transform: base });
    b.box([0, 0.78, -3.0], [0.94, 0.28, 1.22], [0.4, 0.28, 0.18], MAT.WOOD, { aux: 2, transform: base });

    // Camper wheels.
    for (const wx of [-0.98, 0.98]) {
      const side = wx < 0 ? -1 : 1;
      b.cylinder([wx - side * 0.12, 0.38, -3.0], [wx + side * 0.12, 0.38, -3.0], 0.38, 0.38, 12, [0.1, 0.1, 0.11], MAT.METAL, { transform: base });
      b.cylinder([wx - side * 0.14, 0.38, -3.0], [wx + side * 0.14, 0.38, -3.0], 0.17, 0.17, 8, BRASS_WARM, MAT.METAL, { transform: base });
    }

    // Pop-up camper upper canvas walls & pitched pop-up roof (expanded when deployed).
    const popHeight = truckState.camperDeployed ? 0.56 : 0.18;
    const roofY = 1.06 + popHeight * 2;
    b.box([0, 1.06 + popHeight, -3.0], [0.88, popHeight, 1.14], CAMPER_CANVAS, MAT.PLASTER, { transform: base });
    // Warm glowing camper windows on the canvas walls when deployed.
    if (truckState.camperDeployed) {
      b.box([0.9, 1.38, -3.0], [0.03, 0.24, 0.58], [1.0, 0.72, 0.34], MAT.EMISSIVE, { transform: base });
      b.box([-0.9, 1.38, -3.0], [0.03, 0.24, 0.58], [1.0, 0.72, 0.34], MAT.EMISSIVE, { transform: base });
      // Stabilizer corner jacks lowered to ground.
      for (const [jx, jz] of [[-0.86, -1.88], [0.86, -1.88], [-0.86, -4.12], [0.86, -4.12]] as [number, number][]) {
        b.cylinder([jx, 0.02, jz], [jx, 0.38, jz], 0.035, 0.035, 6, IRON_STEEL, MAT.METAL, { transform: base });
      }
    }
    const roofH = truckState.camperDeployed ? 0.62 : 0.24;
    b.gableRoof([0, roofY, -3.0], 0.94, 1.22, roofH, 0.16, ROOF, MAT.ROOF, { transform: base });
    b.gableEnd(0.94, roofY, -3.0, 1.22, roofH, 1, CAMPER_CANVAS, MAT.PLASTER, { transform: base });
    b.gableEnd(-0.94, roofY, -3.0, 1.22, roofH, -1, CAMPER_CANVAS, MAT.PLASTER, { transform: base });
  }

  // Warm forge lantern light on the truck.
  lights.push({ pos: toWorld([1.35, 1.75, 0.58]), color: [1.0, 0.62, 0.28], radius: 10.0 });
  if (truckState.towsPopupCamper) {
    lights.push({ pos: toWorld([0.95, 1.55, -3.0]), color: [1.0, 0.68, 0.32], radius: 8.0 });
  }

  // When parked midway or summoned beside the player, deploy portable anvil & `fable-smith` NPC!
  if (truckState.camperDeployed) {
    if (truckState.mode === 'night-route-parked-midway') {
      // Weathered timber midway turnout platform so the night-route truck, pop-up camper, smith, and player stand on solid planks.
      b.box([0.95, -0.05, -0.65], [2.85, 0.05, 4.45], WOOD_BASE, MAT.WOOD, { aux: 0, transform: base });
      for (const [px, pz] of [
        [-1.6, 3.3],
        [3.4, 3.3],
        [-1.6, -4.6],
        [3.4, -4.6],
      ] as [number, number][]) {
        b.cylinder([px, -2.6, pz], [px, 0.95, pz], 0.14, 0.12, 8, TIMBER, MAT.WOOD, { aux: 1, transform: base });
      }
    }
    buildSmithAnvil(b, multiply(base, translation(1.75, 0.0, 0.55)));
    buildFableSmithFigure(b, multiply(multiply(base, translation(1.62, 0.0, -0.22)), rotationY(0.35)));
  }
}

/**
 * Builds a standalone `MeshBuilder` and `PointLightDef[]` for Fable's Armor Truck
 * and its tow-behind pop-up camper for a given `ArmorTruckState`.
 */
export function buildArmorTruckMesh(
  truckState: ArmorTruckState,
  yawOverride?: number,
): { mesh: MeshBuilder; lanterns: PointLightDef[] } {
  const mesh = new MeshBuilder();
  const lanterns: PointLightDef[] = [];
  buildArmorTruckWithPopupCamper(mesh, lanterns, truckState, yawOverride);
  return { mesh, lanterns };
}

export type IslandSliceMode = 'town' | 'night-midway' | 'summoned' | 'service-table';

export interface IslandSlicePlacementOptions {
  readonly anvilInput?: AnvilCapInput;
  readonly playerPosition?: Vec3;
  readonly playerYaw?: number;
  readonly routeProgress?: number;
  readonly nowSec?: number;
}

export interface IslandSlicePlacementState {
  readonly mode: IslandSliceMode;
  readonly worldPhase: WorldDayPhase;
  readonly routeProgress: number;
  readonly townSmith: TownSmithPlacement;
  readonly nightRoute: NightArmorTruckRoute;
  readonly anvilState: FablesAnvilState;
  readonly activeCamp: ActiveAnvilCamp | null;
  readonly truckState: ArmorTruckState;
  readonly serviceTableOpen: boolean;
  readonly activeSmithNpc: SmithNpcDefinition;
  readonly activeServiceTable: SmithServiceTable;
  readonly playerPos: Vec3;
  readonly playerYaw: number;
  readonly cameraEye: Vec3;
  readonly cameraTarget: Vec3;
}

/**
 * Resolves the complete in-house slice placement for Fable's town smith (`fable-smith`),
 * Fable's Armor Truck on its night route (including its midway parking spot), and Fable's Anvil
 * summoning that same truck + pop-up camper beside the player with the same smith and service table.
 */
export function resolveIslandSlicePlacement(
  mode: IslandSliceMode,
  options: IslandSlicePlacementOptions = {},
): IslandSlicePlacementState {
  const baseAnvil = createAnvilState(options.anvilInput ?? { level: 25, hpPool: 640, manaPool: 320 });

  if (mode === 'town') {
    const [sx, sy, sz] = TOWN_SMITH_PLACEMENT.position;
    const playerPos: Vec3 = options.playerPosition ?? [sx - 2.2, sy, sz + 1.9];
    const playerYaw = options.playerYaw ?? 2.35;
    const truckState = resolveArmorTruckState('day', options.routeProgress ?? 0, null);
    return Object.freeze({
      mode,
      worldPhase: 'day',
      routeProgress: options.routeProgress ?? 0,
      townSmith: TOWN_SMITH_PLACEMENT,
      nightRoute: NIGHT_ARMOR_TRUCK_ROUTE,
      anvilState: baseAnvil,
      activeCamp: null,
      truckState,
      serviceTableOpen: false,
      activeSmithNpc: TOWN_SMITH_PLACEMENT.smithNpc,
      activeServiceTable: TOWN_SMITH_PLACEMENT.serviceTable,
      playerPos,
      playerYaw,
      cameraEye: [sx - 4.4, sy + 1.85, sz + 4.1] as Vec3,
      cameraTarget: [sx + 0.15, sy + 0.85, sz - 0.15] as Vec3,
    });
  }

  if (mode === 'night-midway') {
    const routeProgress = options.routeProgress ?? 0.5;
    const truckState = resolveArmorTruckState('night', routeProgress, null);
    const [mx, my, mz] = truckState.position;
    const playerPos: Vec3 = options.playerPosition ?? [mx - 2.35, my, mz + 0.95];
    const playerYaw = options.playerYaw ?? 1.85;
    return Object.freeze({
      mode,
      worldPhase: 'night',
      routeProgress,
      townSmith: TOWN_SMITH_PLACEMENT,
      nightRoute: NIGHT_ARMOR_TRUCK_ROUTE,
      anvilState: baseAnvil,
      activeCamp: null,
      truckState,
      serviceTableOpen: false,
      activeSmithNpc: truckState.smithNpc,
      activeServiceTable: truckState.serviceTable,
      playerPos,
      playerYaw,
      cameraEye: [mx - 5.9, my + 2.25, mz + 4.35] as Vec3,
      cameraTarget: [mx + 0.65, my + 1.0, mz + 0.45] as Vec3,
    });
  }

  // 'summoned' or 'service-table': Using Fable's Anvil summons the same Armor Truck beside the player.
  const playerPos: Vec3 = options.playerPosition ?? [-8.5, DECK_Y, -35.2];
  const playerYaw = options.playerYaw ?? 1.65;
  const used = useFablesAnvil(baseAnvil, playerPos, {
    nowSec: options.nowSec ?? 12,
    spawnOffset: [2.4, 0, -1.6],
  });
  const activeCamp = used.ok ? used.camp : null;
  const truckState = resolveArmorTruckState('day', options.routeProgress ?? 0, activeCamp);
  const [cx, cy, cz] = truckState.position;

  return Object.freeze({
    mode,
    worldPhase: 'day',
    routeProgress: options.routeProgress ?? 0,
    townSmith: TOWN_SMITH_PLACEMENT,
    nightRoute: NIGHT_ARMOR_TRUCK_ROUTE,
    anvilState: used.state,
    activeCamp,
    truckState,
    serviceTableOpen: mode === 'service-table',
    activeSmithNpc: truckState.smithNpc,
    activeServiceTable: truckState.serviceTable,
    playerPos,
    playerYaw,
    cameraEye: [playerPos[0] - 3.6, cy + 2.15, playerPos[2] + 3.8] as Vec3,
    cameraTarget: [cx + 0.55, cy + 0.95, cz + 0.35] as Vec3,
  });
}

// ---------------------------------------------------------------------------
// Static world assembly.
// ---------------------------------------------------------------------------
export function buildStaticScene(detail: number): StaticScene {
  const b = new MeshBuilder();
  const rnd = mulberry32(0xd0c4);
  const windmills: WindmillRig[] = [];
  const lanterns: PointLightDef[] = [];

  deckPlanks(b, rnd);

  const edges: RailEdge[] = [
    { a: [-2.4, 16], b: [-2.4, -32], skip: [[-6.6, -1.4]] },
    { a: [2.4, 16], b: [2.4, -32], skip: [[-14.6, -8.9]] },
    { a: [-18, -32], b: [-2.4, -32] },
    { a: [2.4, -32], b: [8, -32] },
    { a: [-18, -40], b: [8, -40] },
    { a: [-18, -32], b: [-18, -40] },
    { a: [8, -32], b: [8, -40] },
    { a: [2.4, -9.5], b: [27, -9.5] },
    { a: [2.4, -14], b: [16, -14] },
    { a: [16, -14], b: [16, -30] },
    { a: [16, -30], b: [30, -30] },
    { a: [-10, -2], b: [-3.2, -2], rope: false },
    { a: [-10, -6], b: [-3.2, -6], rope: false },
  ];
  for (const e of edges) railing(b, e, rnd);

  // Lanterns on tall posts along the boardwalk.
  for (const [x, z] of [[-2.4, -15.5], [2.4, 2.5], [-2.4, -31.8], [8, -39.8], [16, -14]] as [number, number][]) {
    post(b, x + 0.0, z, DECK_Y + 2.6, 0.17, rnd);
    b.box([x, DECK_Y + 2.45, z + 0.25], [0.04, 0.04, 0.3], TIMBER, MAT.WOOD, { aux: 2 });
    lantern(b, lanterns, x, DECK_Y + 2.15, z + 0.5);
  }

  // Barrels and crates on the shore-side landing and cross platform.
  for (const [x, z] of [[18.2, -16.3], [18.9, -17.0], [17.6, -17.2], [5.8, -38.6], [6.6, -37.9], [-1.4, -12.5]] as [number, number][]) {
    barrel(b, x, DECK_Y + (x > 15 ? 0.05 : 0), z, rnd);
  }
  crate(b, 19.6, DECK_Y + 0.05, -18.4, 0.8, 0.3, rnd);
  crate(b, 19.5, DECK_Y + 0.85, -18.3, 0.6, 0.7, rnd);
  crate(b, 4.6, DECK_Y, -37.0, 0.7, -0.2, rnd);

  // Stilt houses on the shore landing + Fable's town smith (`fable-smith`) forge at TOWN_SMITH_PLACEMENT.
  house(b, multiply(translation(24.5, DECK_Y + 0.05, -24.5), rotationY(0.08)), 6.2, 4.8, 3, rnd);
  buildTownSmithForge(b, lanterns, TOWN_SMITH_PLACEMENT);
  {
    const hx = 21, hz = -44;
    for (const [px, pz] of [[-3, -2.5], [3, -2.5], [-3, 2.5], [3, 2.5], [0, 0]] as [number, number][]) {
      post(b, hx + px, hz + pz, DECK_Y + 0.6, 0.22, rnd);
    }
    b.box([hx, DECK_Y + 0.55, hz], [3.6, 0.08, 3.1], woodTone(rnd), MAT.WOOD, { aux: 0 });
    house(b, multiply(translation(hx, DECK_Y + 0.63, hz), rotationY(-0.12)), 5, 4.2, 2, rnd);
  }

  // Giant turtle + village on its back + windmills.
  const turtlePlace = multiply(translation(TURTLE.x, 0, TURTLE.z), rotationY(TURTLE.yaw));
  buildTurtle(b, turtlePlace, detail, 0x7117);
  const village: [number, number, number, number, number, number][] = [
    // lx, lz, w, d, floors, yaw
    [-2, -2, 5.2, 4.2, 3, 0.3],
    [5, 3, 4.4, 3.8, 2, -0.4],
    [-6.5, 4.5, 4.0, 3.6, 2, 0.9],
    [3.5, -6.5, 4.6, 3.6, 2, 1.4],
    [9.5, -1.5, 3.8, 3.4, 2, 0.1],
    [-9.5, -4, 3.6, 3.2, 1, -0.6],
  ];
  for (const [lx, lz, w, d, f, yaw] of village) {
    const base = multiply(shellPoint(turtlePlace, lx, lz, 0.6), rotationY(yaw));
    // Stone footing so houses sit into the curved shell.
    b.box([0, -0.9, 0], [w / 2 + 0.2, 1.2, d / 2 + 0.2], [0.45, 0.43, 0.38], MAT.ROCK, { transform: base });
    house(b, base, w, d, f, rnd);
  }
  windmill(b, windmills, multiply(shellPoint(turtlePlace, -13, 6, 0.8), rotationY(0.3)), 7.5, 16, rnd);
  windmill(b, windmills, multiply(shellPoint(turtlePlace, 6, 9, 0.8), rotationY(-0.2)), 6.5, 17, rnd);

  // Two smaller turtles further out (readable silhouettes in the haze).
  const small: [number, number, number, number][] = [[-78, -185, 0.42, 0.7], [-28, -232, 0.3, -0.35], [62, -205, 0.36, 2.6]];
  small.forEach(([x, z, s, yaw], k) => {
    const place = multiply(multiply(translation(x, -0.4, z), rotationY(yaw)), scaling(s, s, s));
    buildTurtle(b, place, 0, 0x5a11 + k);
    const top = multiply(shellPoint(place, 0, 0, 0.8), rotationY(rnd() * 3));
    if (k === 0) windmill(b, windmills, top, 9, 18, rnd);
    else house(b, top, 5, 4, 2, rnd);
  });

  // Windmill on the far-left rocky island, like the target picture.
  {
    const x = -150, z = -228;
    const y = terrainHeight(x, z);
    windmill(b, windmills, multiply(translation(x, y - 0.5, z), rotationY(0.5)), 9, 19, rnd);
    for (let k = 0; k < 3; k++) {
      const hx = x + 10 + k * 7, hz = z + 12 + k * 3;
      house(b, multiply(translation(hx, terrainHeight(hx, hz) - 0.3, hz), rotationY(k)), 5, 4, 2, rnd);
    }
  }

  return {
    world: b,
    windmills,
    lanterns,
    townSmith: TOWN_SMITH_PLACEMENT,
    nightTruckRoute: NIGHT_ARMOR_TRUCK_ROUTE,
  };
}

// ---------------------------------------------------------------------------
// Instanced meshes: trees (2 species x 2 LODs) and rocks.
// ---------------------------------------------------------------------------
/**
 * Leaf card: a double-sided quad whose normal is blended toward the clump and crown
 * centres (spherized), so a cloud of cards shades like a soft leafy volume.
 * Vertex colour carries (u, v, seed) for the procedural leaf mask (material 13).
 */
function leafCard(b: MeshBuilder, center: Vec3, size: number, yaw: number, pitch: number, clumpC: Vec3, crownC: Vec3, seed: number, ao: number) {
  const rot = multiply(rotationY(yaw), rotationX(pitch));
  const right: Vec3 = [rot[0], rot[1], rot[2]];
  const up: Vec3 = [rot[4], rot[5], rot[6]];
  const cardN: Vec3 = [rot[8], rot[9], rot[10]];
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const ids: number[] = [];
  for (const [cx, cy] of corners) {
    const p = v3.add(center, v3.add(v3.scale(right, cx * size * 0.5), v3.scale(up, cy * size * 0.5)));
    const nClump = v3.norm(v3.sub(p, clumpC));
    const nCrown = v3.norm(v3.sub(p, crownC));
    const n = v3.norm(v3.add(v3.add(v3.scale(nClump, 0.5), v3.scale(nCrown, 0.45)), v3.scale(cardN, 0.15)));
    ids.push(b.vert(p, n, [(cx + 1) / 2, (cy + 1) / 2, seed], MAT.LEAF_CARD, ao, -1, 0));
  }
  b.tri(ids[0], ids[1], ids[2]); b.tri(ids[0], ids[2], ids[3]);
  b.tri(ids[0], ids[2], ids[1]); b.tri(ids[0], ids[3], ids[2]);
}

export function buildBroadleaf(lod: 0 | 1): MeshBuilder {
  const b = new MeshBuilder();
  const rnd = mulberry32(0xb40ad + lod);
  const top: Vec3 = [0.35, 4.4, 0.12];
  b.cylinder([0, -0.4, 0], top, 0.34, 0.17, lod ? 5 : 9, [0.33, 0.25, 0.18], MAT.BARK, { jitter: 0.18 });
  const lobes: { c: Vec3; r: number }[] = [];
  const canopyCenter: Vec3 = [0.35, 5.4, 0.1];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + rnd() * 0.5;
    const rr = k === 0 ? 0 : 1.3 + rnd() * 0.8;
    lobes.push({ c: [canopyCenter[0] + Math.cos(a) * rr, canopyCenter[1] + (rnd() - 0.35) * 1.4 + (k === 0 ? 0.7 : 0), canopyCenter[2] + Math.sin(a) * rr], r: 1.25 + rnd() * 0.55 });
  }
  if (!lod) {
    for (let k = 0; k < 4; k++) {
      const l = lobes[k * 2 + 1];
      b.cylinder([0.25, 3.2 + k * 0.3, 0.08], [l.c[0] * 0.8, l.c[1] - 0.4, l.c[2] * 0.8], 0.11, 0.05, 6, [0.33, 0.25, 0.18], MAT.BARK);
    }
    // ~70 clumps x 3 crossing cards, outermost written first so early-Z rejects inner cards.
    const clumps: { p: Vec3; lobe: { c: Vec3; r: number }; d: number }[] = [];
    for (let i = 0; i < 72; i++) {
      const lobe = lobes[i % lobes.length];
      const dir = v3.norm([rnd() * 2 - 1, rnd() * 1.6 - 0.6, rnd() * 2 - 1]);
      const dist = lobe.r * (0.45 + 0.55 * Math.sqrt(rnd()));
      const p = v3.add(lobe.c, v3.scale(dir, dist));
      clumps.push({ p, lobe, d: v3.len(v3.sub(p, canopyCenter)) });
    }
    clumps.sort((a, c) => c.d - a.d);
    for (const cl of clumps) {
      const inner = clamp(cl.d / 3.2, 0, 1);
      const under = clamp((cl.p[1] - canopyCenter[1] + 1.8) / 3.2, 0, 1);
      const ao = clamp((0.35 + 0.65 * under) * (0.5 + 0.5 * inner), 0.22, 1);
      const seed = rnd();
      const size = 1.0 + rnd() * 0.45;
      const yaw = rnd() * Math.PI;
      for (let k = 0; k < 3; k++) {
        leafCard(b, cl.p, size, yaw + (k * Math.PI) / 3, (rnd() - 0.5) * 1.1, cl.lobe.c, canopyCenter, (seed + k * 0.37) % 1, ao);
      }
    }
    return b;
  }
  for (const lobe of lobes.slice(0, 5)) {
    const green: Vec3 = [0.16 + rnd() * 0.06, 0.32 + rnd() * 0.1, 0.08 + rnd() * 0.04];
    b.ellipsoid(lobe.c, [lobe.r * 1.1, lobe.r * 0.9, lobe.r * 1.1], 6, 9, green, MAT.FOLIAGE, {
      noise: 0.16, noiseFreq: 3.2, seed: lobe.r * 10,
      shade: (d, p) => {
        const inner = clamp(v3.len(v3.sub(p, canopyCenter)) / 3.0, 0, 1);
        return { ao: clamp((0.35 + 0.65 * (d[1] * 0.5 + 0.5)) * (0.55 + 0.45 * inner), 0.2, 1) };
      },
    });
  }
  return b;
}

export function buildPine(lod: 0 | 1): MeshBuilder {
  const b = new MeshBuilder();
  const rnd = mulberry32(0x9172 + lod);
  b.cylinder([0, -0.4, 0], [0, 7.5, 0], 0.3, 0.08, lod ? 5 : 8, [0.3, 0.22, 0.16], MAT.BARK, { jitter: 0.15 });
  const tiers = lod ? 3 : 5;
  for (let k = 0; k < tiers; k++) {
    const t = k / (tiers - 1);
    const y = 2.2 + t * 5.0;
    const r = lerp(2.1, 0.6, t);
    if (!lod) {
      const tierC: Vec3 = [0, y, 0];
      const n = Math.round(lerp(26, 8, t));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.4;
        const rr = r * (0.55 + rnd() * 0.45);
        const p: Vec3 = [Math.cos(a) * rr, y + (rnd() - 0.6) * 0.6, Math.sin(a) * rr];
        const ao = clamp(0.4 + 0.6 * (rr / r) * (0.6 + 0.4 * t), 0.25, 1);
        leafCard(b, p, 0.9 + rnd() * 0.4, -a + Math.PI / 2, 0.5 + rnd() * 0.4, tierC, [0, 4.5, 0], rnd(), ao);
        leafCard(b, p, 0.8 + rnd() * 0.3, -a, (rnd() - 0.5) * 0.6, tierC, [0, 4.5, 0], rnd(), ao);
      }
      continue;
    }
    b.ellipsoid([0, y, 0], [r, 1.1 - t * 0.3, r], 6, 9, [0.1 + t * 0.03, 0.24 + t * 0.05, 0.1], MAT.FOLIAGE, {
      noise: 0.18, noiseFreq: 4, seed: 31 + k, flatBottom: 0.35,
      shade: (d) => ({ ao: clamp(0.3 + 0.7 * (d[1] * 0.5 + 0.5), 0.25, 1) }),
    });
  }
  return b;
}

export function buildRock(): MeshBuilder {
  const b = new MeshBuilder();
  b.ellipsoid([0, 0, 0], [1, 1, 1], 12, 20, [0.44, 0.42, 0.38], MAT.ROCK, {
    noise: 0.24, noiseFreq: 1.9, seed: 4, flatBottom: 0.45,
    shade: (d) => ({ ao: 0.55 + 0.45 * (d[1] * 0.5 + 0.5) }),
  });
  return b;
}

// ---------------------------------------------------------------------------
// The fox (rigid-skinned, 11 bones). Forward is local +Z.
// ---------------------------------------------------------------------------
export const FOX_BONES = {
  BODY: 0, HEAD: 1, TAIL: 2,
  FL_U: 3, FL_L: 4, FR_U: 5, FR_L: 6, BL_U: 7, BL_L: 8, BR_U: 9, BR_L: 10,
} as const;

export const FOX_PIVOTS = {
  bodyHeight: 0.37,
  head: [0, 0.07, 0.25] as Vec3,
  tail: [0, 0.05, -0.27] as Vec3,
  legs: {
    FL: [0.068, -0.04, 0.17] as Vec3,
    FR: [-0.068, -0.04, 0.17] as Vec3,
    BL: [0.07, -0.03, -0.17] as Vec3,
    BR: [-0.07, -0.03, -0.17] as Vec3,
  },
  upperLen: 0.16,
};

export function buildFox(): MeshBuilder {
  const b = new MeshBuilder();
  const cream: Vec3 = [0.95, 0.84, 0.66];
  const tan: Vec3 = [0.88, 0.6, 0.36];
  const white: Vec3 = [0.97, 0.93, 0.86];
  const dark: Vec3 = [0.08, 0.06, 0.05];
  const furShade = (d: Vec3) => ({ c: d[1] > 0.35 ? v3.lerp(cream, tan, clamp((d[1] - 0.35) * 2, 0, 1)) : d[1] < -0.3 ? white : cream, ao: 0.7 + 0.3 * (d[1] * 0.5 + 0.5) });
  const B = FOX_BONES;
  // Torso + chest.
  b.ellipsoid([0, 0, 0.0], [0.115, 0.12, 0.27], 12, 18, cream, MAT.FUR, { bone: B.BODY, shade: furShade, noise: 0.03, noiseFreq: 6 });
  b.ellipsoid([0, 0.01, 0.15], [0.118, 0.135, 0.14], 12, 18, cream, MAT.FUR, { bone: B.BODY, shade: (d) => ({ c: d[2] > 0.3 && d[1] < 0.4 ? white : furShade(d).c, ao: furShade(d).ao }) });
  b.ellipsoid([0, -0.005, -0.16], [0.11, 0.115, 0.13], 10, 16, cream, MAT.FUR, { bone: B.BODY, shade: furShade });
  // Head.
  b.ellipsoid([0, 0.04, 0.03], [0.065, 0.085, 0.08], 10, 14, cream, MAT.FUR, { bone: B.HEAD, shade: furShade });
  b.ellipsoid([0, 0.11, 0.09], [0.085, 0.078, 0.088], 12, 16, cream, MAT.FUR, { bone: B.HEAD, shade: furShade });
  b.ellipsoid([0, 0.085, 0.19], [0.036, 0.034, 0.08], 10, 12, white, MAT.FUR, { bone: B.HEAD });
  b.ellipsoid([0, 0.098, 0.268], [0.016, 0.014, 0.014], 6, 8, dark, MAT.METAL, { bone: B.HEAD });
  for (const s of [-1, 1]) {
    b.ellipsoid([s * 0.043, 0.13, 0.165], [0.012, 0.011, 0.008], 6, 8, dark, MAT.METAL, { bone: B.HEAD });
    b.cylinder([s * 0.046, 0.165, 0.08], [s * 0.066, 0.275, 0.065], 0.038, 0.004, 8, tan, MAT.FUR, { bone: B.HEAD });
  }
  // Bushy tail with a white tip.
  b.ellipsoid([0, -0.03, -0.18], [0.065, 0.065, 0.2], 10, 14, cream, MAT.FUR, { bone: B.TAIL, noise: 0.08, noiseFreq: 5, shade: furShade });
  b.ellipsoid([0, -0.06, -0.36], [0.045, 0.045, 0.07], 8, 12, white, MAT.FUR, { bone: B.TAIL, noise: 0.06, noiseFreq: 5 });
  // Legs.
  const legPairs: [number, number][] = [[B.FL_U, B.FL_L], [B.FR_U, B.FR_L], [B.BL_U, B.BL_L], [B.BR_U, B.BR_L]];
  legPairs.forEach(([u, l], k) => {
    const back = k >= 2;
    b.ellipsoid([0, -0.07, 0], [back ? 0.045 : 0.036, 0.1, back ? 0.055 : 0.045], 8, 12, cream, MAT.FUR, { bone: u, shade: furShade });
    b.cylinder([0, 0, 0], [0, -0.15, 0.0], 0.022, 0.017, 8, cream, MAT.FUR, { bone: l });
    b.ellipsoid([0, -0.158, 0.016], [0.025, 0.016, 0.04], 6, 10, v3.scale(tan, 0.8), MAT.FUR, { bone: l });
  });
  return b;
}

/** Axis-angle rotation about a world pivot (for windmill sails). */
export function rotateAboutAxis(pivot: Vec3, axis: Vec3, angle: number): Mat4 {
  const [x, y, z] = v3.norm(axis);
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  const r = new Float32Array([
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ]);
  return multiply(multiply(translation(pivot[0], pivot[1], pivot[2]), r), translation(-pivot[0], -pivot[1], -pivot[2]));
}

export { coastX, valueNoise2, WATER_Y };



