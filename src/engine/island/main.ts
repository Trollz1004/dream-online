/**
 * Island test scene — entry point: fox controller, follow camera, input, HUD, benchmark,
 * and Fable's town smith (`fable-smith`), night-route Armor Truck + pop-up camper, Fable's Anvil
 * summon beside the player, and Smith Service Table (`?slice=town|night-midway|summoned|service-table`).
 * URL flags: ?tier=low|medium|high|ultra  ?capture=1 (hide HUD)  ?bench=1 (all-tier benchmark)
 *            ?autopilot=1 (scripted run for video)  ?manual=1 (time advanced only by window.__ISLAND__.step)
 *            ?slice=town|night-midway|summoned|service-table
 */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { type Mat4, type Vec3, multiply, rotationX, rotationY, rotationZ, scaling, translation, v3, clamp, lerp } from './math.ts';
import { IslandRenderer, type CastState, type FrameState } from './renderer.ts';
import {
  FOX_BONES,
  FOX_PIVOTS,
  resolveIslandSlicePlacement,
  type IslandSliceMode,
  type IslandSlicePlacementOptions,
  type IslandSlicePlacementState,
} from './scene.ts';
import { TIERS, TIER_ORDER, parseTier, type TierName } from './quality.ts';
import { WATER_Y, groundHeight, terrainHeight } from './world.ts';
import { SmithServiceModal } from '../../ui/SmithServiceModal.tsx';
import type { SmithLocationKind } from '../../game/economy/smith/index.ts';

const params = new URLSearchParams(location.search);
const capture = params.get('capture') === '1';
const benchMode = params.get('bench') === '1';
const autopilot = params.get('autopilot') === '1';
const manual = params.get('manual') === '1';
const VALID_SLICE_MODES: readonly IslandSliceMode[] = ['town', 'night-midway', 'summoned', 'service-table'];
const initialSliceParam = params.get('slice') as IslandSliceMode | null;
const initialSliceMode: IslandSliceMode | null =
  initialSliceParam && VALID_SLICE_MODES.includes(initialSliceParam) ? initialSliceParam : null;
const ELEMENTS = ['Fire', 'Water', 'Wind', 'Earth'];

interface Fox {
  pos: Vec3; yaw: number; vy: number; speed: number; phase: number;
  grounded: boolean; inWater: boolean; lastRipple: number;
}

const fox: Fox = { pos: [0, 1.1, 10], yaw: Math.PI, vy: 0, speed: 0, phase: 0, grounded: true, inWater: false, lastRipple: 0 };
const camState = { yaw: Math.PI, pitch: 0.16, dist: 3.6, eye: [0, 2.3, 13.6] as Vec3, target: [0, 1.6, 8] as Vec3 };
const keys = new Set<string>();
const ripples: { x: number; z: number; t: number; s: number }[] = [];
let element = 0;
let cast: CastState | null = null;
let castCount = 0;
let worldTime = 0;
let wind = 1;

function addRipple(x: number, z: number, s: number) {
  ripples.unshift({ x, z, t: worldTime, s });
  if (ripples.length > 12) ripples.length = 12;
}

function castElement(el = element) {
  const f: Vec3 = [Math.sin(fox.yaw), 0, Math.cos(fox.yaw)];
  cast = { origin: [fox.pos[0], fox.pos[1], fox.pos[2]], forward: f, start: worldTime, element: el, seed: castCount++ % 97 };
  if (el === 1 || fox.inWater) addRipple(fox.pos[0] + f[0] * 1.5, fox.pos[2] + f[2] * 1.5, 1.2);
}

// ---------------------------------------------------------------------------
// Fox movement (persistent world: collision reads the same pure height functions).
// ---------------------------------------------------------------------------
function updateFox(dt: number, input: { fwd: number; side: number; sprint: boolean; jump: boolean }) {
  const cf: Vec3 = [Math.sin(camState.yaw), 0, Math.cos(camState.yaw)];
  const cr: Vec3 = [-cf[2], 0, cf[0]];
  let move = v3.add(v3.scale(cf, input.fwd), v3.scale(cr, input.side));
  const mlen = Math.hypot(move[0], move[2]);
  const target = mlen > 0.01 ? (input.sprint ? 6.4 : 4.2) * (fox.inWater ? 0.45 : 1) : 0;
  fox.speed = lerp(fox.speed, target, 1 - Math.exp(-dt * 8));
  if (mlen > 0.01) {
    move = v3.scale(move, 1 / mlen);
    const want = Math.atan2(move[0], move[2]);
    let d = want - fox.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    fox.yaw += d * (1 - Math.exp(-dt * 12));
  }
  const fwd: Vec3 = [Math.sin(fox.yaw), 0, Math.cos(fox.yaw)];
  fox.pos[0] += fwd[0] * fox.speed * dt;
  fox.pos[2] += fwd[2] * fox.speed * dt;

  const ground = groundHeight(fox.pos[0], fox.pos[2]);
  const swimY = WATER_Y - 0.28;
  const floor = Math.max(ground, ground < swimY ? swimY : ground);
  if (input.jump && (fox.grounded || fox.inWater)) {
    fox.vy = fox.inWater ? 3.2 : 4.6;
    fox.grounded = false;
  }
  fox.vy -= 13 * dt;
  fox.pos[1] += fox.vy * dt;
  if (fox.pos[1] <= floor) {
    if (!fox.grounded && fox.vy < -3 && ground < WATER_Y) addRipple(fox.pos[0], fox.pos[2], 1.6);
    fox.pos[1] = floor;
    fox.vy = 0;
    fox.grounded = true;
  }
  const wasIn = fox.inWater;
  fox.inWater = ground < swimY + 0.02 && fox.pos[1] <= swimY + 0.05;
  if (fox.inWater && !wasIn) addRipple(fox.pos[0], fox.pos[2], 1.4);
  // Wading or swimming leaves ripples; standing still in water leaves slow ones.
  const touching = fox.pos[1] < WATER_Y + 0.12 && ground < WATER_Y + 0.05;
  if (touching) {
    const gap = fox.speed > 0.5 ? 0.24 : 1.1;
    if (worldTime - fox.lastRipple > gap) {
      addRipple(fox.pos[0], fox.pos[2], fox.speed > 0.5 ? 1.0 : 0.45);
      fox.lastRipple = worldTime;
    }
  }
  fox.phase += dt * (fox.inWater ? 7 : 4 + fox.speed * 2.3);
}

function foxBones(): Mat4[] {
  const P = FOX_PIVOTS;
  const sn = clamp(fox.speed / 4.2, 0, 1.5);
  const ph = fox.phase;
  const airborne = !fox.grounded && !fox.inWater;
  const root = multiply(multiply(translation(fox.pos[0], fox.pos[1], fox.pos[2]), rotationY(fox.yaw)), scaling(1.35, 1.35, 1.35));
  const bob = fox.inWater ? Math.sin(worldTime * 2.2) * 0.01 : Math.sin(ph * 2) * 0.022 * sn + Math.sin(worldTime * 2.1) * 0.004 * (1 - sn);
  const pitch = airborne ? clamp(-fox.vy * 0.06, -0.35, 0.35) : Math.sin(ph * 2 + 0.6) * 0.03 * sn;
  const body = multiply(multiply(root, translation(0, P.bodyHeight + bob, 0)), rotationX(pitch));
  const head = multiply(multiply(body, translation(...P.head)), multiply(rotationX(-Math.sin(ph * 2) * 0.05 * sn + 0.05), rotationY(Math.sin(worldTime * 0.7) * 0.15 * (1 - sn))));
  const tail = multiply(multiply(body, translation(...P.tail)), multiply(rotationY(Math.sin(worldTime * 2.4 + ph) * (0.22 + 0.1 * sn)), rotationX(-0.25 - 0.2 * sn)));
  const leg = (pivot: Vec3, offset: number, front: boolean): [Mat4, Mat4] => {
    let swing: number, knee: number;
    if (airborne) {
      swing = front ? -0.7 : 0.75;
      knee = front ? 0.9 : -0.6;
    } else if (fox.inWater) {
      swing = Math.sin(ph + offset) * 0.6;
      knee = (Math.cos(ph + offset) * 0.5 + 0.5) * (front ? 0.9 : -0.6);
    } else {
      swing = Math.sin(ph + offset) * 0.55 * Math.min(sn, 1.2);
      knee = Math.max(0, Math.cos(ph + offset)) * 0.75 * Math.min(sn, 1.2) * (front ? 1 : -1);
    }
    const upper = multiply(multiply(body, translation(...pivot)), rotationX(-swing));
    const lower = multiply(multiply(upper, translation(0, -P.upperLen, 0)), rotationX(knee));
    return [upper, lower];
  };
  const [flu, fll] = leg(P.legs.FL, 0, true);
  const [fru, frl] = leg(P.legs.FR, Math.PI, true);
  const [blu, bll] = leg(P.legs.BL, Math.PI, false);
  const [bru, brl] = leg(P.legs.BR, 0, false);
  const out: Mat4[] = [];
  out[FOX_BONES.BODY] = body;
  out[FOX_BONES.HEAD] = head;
  out[FOX_BONES.TAIL] = tail;
  out[FOX_BONES.FL_U] = flu; out[FOX_BONES.FL_L] = fll;
  out[FOX_BONES.FR_U] = fru; out[FOX_BONES.FR_L] = frl;
  out[FOX_BONES.BL_U] = blu; out[FOX_BONES.BL_L] = bll;
  out[FOX_BONES.BR_U] = bru; out[FOX_BONES.BR_L] = brl;
  return out;
}

// ---------------------------------------------------------------------------
// Third-person follow camera: slightly low and wide, critically damped.
// ---------------------------------------------------------------------------
function updateCamera(dt: number, snap = false) {
  const f: Vec3 = [Math.sin(camState.yaw), 0, Math.cos(camState.yaw)];
  const heightOff = 0.75 + camState.pitch * 3.2;
  const desiredEye: Vec3 = [fox.pos[0] - f[0] * camState.dist, fox.pos[1] + heightOff, fox.pos[2] - f[2] * camState.dist];
  const minY = Math.max(terrainHeight(desiredEye[0], desiredEye[2]) + 0.45, WATER_Y + 0.4);
  desiredEye[1] = Math.max(desiredEye[1], minY);
  const desiredTarget: Vec3 = [fox.pos[0] + f[0] * 2.2, fox.pos[1] + 0.55, fox.pos[2] + f[2] * 2.2];
  const k = snap ? 1 : 1 - Math.exp(-dt * 7);
  camState.eye = v3.lerp(camState.eye, desiredEye, k);
  camState.target = v3.lerp(camState.target, desiredTarget, snap ? 1 : 1 - Math.exp(-dt * 10));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const canvas = document.getElementById('view') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLDivElement;
const help = document.getElementById('help') as HTMLDivElement;
const fail = document.getElementById('fail') as HTMLDivElement;
const smithModalHost = document.getElementById('smith-modal-root');
let smithModalRoot: Root | null = smithModalHost ? createRoot(smithModalHost) : null;
if (capture) { hud.style.display = 'none'; help.style.display = 'none'; }

const renderer = new IslandRenderer(canvas);
let tierName: TierName = parseTier(params.get('tier'));
const fps = { frames: 0, acc: 0, value: 0, dts: [] as number[], gpu: [] as number[] };
let currentPlacement: IslandSlicePlacementState | null = null;
let sliceCameraLocked = false;

function syncSmithModal() {
  if (!smithModalRoot) return;
  const open = Boolean(currentPlacement?.serviceTableOpen);
  if (open && currentPlacement) {
    canvas.style.filter = 'blur(5px) brightness(0.42) saturate(0.22)';
    hud.style.display = 'none';
    help.style.display = 'none';
    const placement = currentPlacement;
    smithModalRoot.render(
      React.createElement(SmithServiceModal, {
        isOpen: true,
        location: placement.truckState.location,
        anvilState: placement.anvilState,
        activeCamp: placement.activeCamp,
        truckState: placement.truckState,
        playerPosition: placement.playerPos,
        onChangeLocation: (nextLoc: SmithLocationKind) => {
          if (nextLoc === 'town') {
            applySlicePlacement('town', { keepServiceTableOpen: true });
          } else if (nextLoc === 'route-truck') {
            applySlicePlacement('night-midway', { keepServiceTableOpen: true });
          } else {
            applySlicePlacement('service-table');
          }
        },
        onSummonAnvil: () => {
          applySlicePlacement('service-table');
        },
        onClose: () => {
          applySlicePlacement('summoned');
        },
      }),
    );
  } else {
    canvas.style.filter = '';
    if (!capture) {
      hud.style.display = 'block';
      help.style.display = 'block';
    }
    smithModalRoot.render(null);
  }
}

function applySlicePlacement(
  mode: IslandSliceMode,
  opts: IslandSlicePlacementOptions & { keepServiceTableOpen?: boolean } = {},
): IslandSlicePlacementState {
  const resolved = resolveIslandSlicePlacement(mode, opts);
  const serviceTableOpen = opts.keepServiceTableOpen ? true : resolved.serviceTableOpen;
  currentPlacement = Object.freeze({
    ...resolved,
    serviceTableOpen,
  });
  renderer.setWorldDayPhase(currentPlacement.worldPhase);
  renderer.setArmorTruckState(currentPlacement.truckState);
  fox.pos = [...currentPlacement.playerPos] as Vec3;
  fox.yaw = currentPlacement.playerYaw;
  fox.speed = 0;
  fox.vy = 0;
  fox.grounded = true;
  camState.eye = [...currentPlacement.cameraEye] as Vec3;
  camState.target = [...currentPlacement.cameraTarget] as Vec3;
  sliceCameraLocked = true;
  syncSmithModal();
  if (!capture && !currentPlacement.serviceTableOpen) {
    const label =
      mode === 'town'
        ? `Town Smith (${currentPlacement.activeSmithNpc.npcId}) · Haven Town Landing`
        : mode === 'night-midway'
          ? `Fable's Armor Truck + Pop-Up Camper · Night Route Midway`
          : `Fable's Anvil Summoned Truck + Pop-Up Camper · Beside Player (${currentPlacement.anvilState.charges}/${currentPlacement.anvilState.maxCharges} charges)`;
    hud.textContent = `${label} · Press F for Service Table`;
  }
  return currentPlacement;
}

function setTier(t: TierName) {
  tierName = t;
  renderer.setTier(TIERS[t]);
}

function median(a: number[]) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; }
function p95(a: number[]) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.95)] ?? 0; }

function frameState(): FrameState {
  return {
    time: worldTime, eye: camState.eye, target: camState.target, fovY: (58 * Math.PI) / 180,
    foxBones: foxBones(), foxPos: fox.pos, foxInWater: fox.inWater, ripples, cast, wind,
  };
}

function autopilotInput(t: number) {
  const s = { fwd: 0, side: 0, sprint: false, jump: false };
  if (t < 3.2) s.fwd = 1;
  else if (t < 4.6) { s.fwd = 1; s.side = -0.6; }
  else if (t < 6.0) { s.fwd = 1; }
  if (Math.abs(t - 1.2) < 0.02) castElement(0);
  return s;
}

function readInput() {
  return {
    fwd: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0),
    side: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
    sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    jump: keys.has('Space'),
  };
}

function step(dt: number, input = readInput()) {
  worldTime += dt;
  const hasManualMove =
    input.fwd !== 0 ||
    input.side !== 0 ||
    input.jump ||
    keys.has('ArrowLeft') ||
    keys.has('ArrowRight');
  if (hasManualMove) {
    sliceCameraLocked = false;
  }
  if (keys.has('ArrowLeft')) camState.yaw += dt * 1.8;
  if (keys.has('ArrowRight')) camState.yaw -= dt * 1.8;
  if (!sliceCameraLocked) {
    updateFox(dt, input);
    updateCamera(dt);
  } else {
    fox.phase += dt * 2.4;
  }
}

function updateHud(dt: number) {
  fps.frames++; fps.acc += dt;
  if (fps.acc >= 0.5) {
    fps.value = fps.frames / fps.acc; fps.frames = 0; fps.acc = 0;
    if (!capture && !currentPlacement?.serviceTableOpen) {
      if (currentPlacement) {
        const mode = currentPlacement.mode;
        const label =
          mode === 'town'
            ? `Town Smith (${currentPlacement.activeSmithNpc.npcId}) · Haven Town Landing`
            : mode === 'night-midway'
              ? `Fable's Armor Truck + Pop-Up Camper · Night Route Midway`
              : `Summoned Armor Truck + Pop-Up Camper · Beside Player (${currentPlacement.anvilState.charges}/${currentPlacement.anvilState.maxCharges} charges)`;
        hud.textContent = `${label} · ${fps.value.toFixed(0)} fps · Press F for Service Table`;
      } else {
        const g = renderer.gpuMs !== null ? `${renderer.gpuMs.toFixed(2)} ms GPU` : 'GPU timer n/a';
        hud.textContent = `${TIERS[tierName].label} · ${fps.value.toFixed(0)} fps · ${g} · element: ${ELEMENTS[element]}`;
      }
    }
  }
}

async function runBench() {
  // Fixed 1920x1080 canvas so every tier is measured at the same output size.
  const res = (params.get('benchres') || '1920x1080').split('x').map(Number);
  canvas.style.width = `${res[0]}px`;
  canvas.style.height = `${res[1]}px`;
  const results: Record<string, { medianMs: number; p95Ms: number; fps: number; gpuMedianMs: number | null; gpuP95Ms: number | null; renderW: number; renderH: number }> = {};
  const benchTiers = (params.get('benchtiers') || TIER_ORDER.join(',')).split(',').filter((t): t is TierName => (TIER_ORDER as string[]).includes(t));
  const frames = Number(params.get('benchframes') || 330);
  for (const t of benchTiers) {
    setTier(t);
    fox.pos = [0, 1.1, 10]; fox.yaw = Math.PI; camState.yaw = Math.PI;
    updateCamera(0, true);
    const dts: number[] = []; const gpus: number[] = [];
    for (let i = 0; i < frames; i++) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const t0 = performance.now();
      // A fixed slow orbit so each tier renders identical views.
      camState.yaw = Math.PI + Math.sin(i * 0.02) * 0.6;
      step(1 / 60, { fwd: 0, side: 0, sprint: false, jump: false });
      renderer.render(frameState());
      // Honest frame cost: wait until the GPU has actually finished this frame.
      await renderer.device.queue.onSubmittedWorkDone();
      const dt = performance.now() - t0;
      if (i >= Math.min(90, frames / 3)) { dts.push(dt); if (renderer.gpuMs !== null) gpus.push(renderer.gpuMs); }
      if (i % 30 === 0) hud.textContent = `Benchmarking ${TIERS[t].label}… ${i}/330`;
    }
    const m = median(dts);
    results[t] = {
      medianMs: +m.toFixed(2), p95Ms: +p95(dts).toFixed(2), fps: +(1000 / m).toFixed(1),
      gpuMedianMs: gpus.length ? +median(gpus).toFixed(2) : null, gpuP95Ms: gpus.length ? +p95(gpus).toFixed(2) : null,
      renderW: canvas.width * TIERS[t].renderScale | 0, renderH: canvas.height * TIERS[t].renderScale | 0,
    };
  }
  (window as unknown as { __ISLAND_BENCH__: unknown }).__ISLAND_BENCH__ = { adapter: renderer.adapterInfo, canvas: [canvas.width, canvas.height], results };
  hud.textContent = benchTiers.map((t) => `${t}: ${results[t].fps} fps (p95 ${results[t].p95Ms} ms${results[t].gpuMedianMs !== null ? `, GPU ${results[t].gpuMedianMs} ms` : ''})`).join(' · ');
}

async function main() {
  const ok = await renderer.init(TIERS[tierName], params.get('fallback') === '1');
  if (!ok) {
    fail.style.display = 'flex';
    return;
  }
  if (initialSliceMode) {
    applySlicePlacement(initialSliceMode);
  } else {
    updateCamera(0, true);
  }
  const api = {
    renderer, fox, camState, ripples,
    setTier: (t: TierName) => setTier(t),
    place: (x: number, z: number, yaw: number, camYaw = yaw, pitch = 0.16, dist = 3.6) => {
      sliceCameraLocked = false;
      fox.pos = [x, groundHeight(x, z), z]; fox.yaw = yaw; camState.yaw = camYaw; camState.pitch = pitch; camState.dist = dist;
      fox.speed = 0; updateCamera(0, true);
    },
    setSliceMode: (mode: IslandSliceMode, opts?: IslandSlicePlacementOptions) => {
      const res = applySlicePlacement(mode, opts);
      renderer.render(frameState());
      return res;
    },
    getSlicePlacement: () => currentPlacement,
    summonAnvil: () => {
      const res = applySlicePlacement('summoned', {
        playerPosition: [fox.pos[0], fox.pos[1], fox.pos[2]],
        playerYaw: fox.yaw,
        nowSec: Math.round(worldTime),
      });
      renderer.render(frameState());
      return res;
    },
    openServiceTable: () => {
      const res = applySlicePlacement('service-table');
      renderer.render(frameState());
      return res;
    },
    cast: (el: number) => castElement(el),
    step: (dt: number, fwd = 0, side = 0, frames = 1) => {
      for (let i = 0; i < frames; i++) step(dt, { fwd, side, sprint: false, jump: false });
      renderer.render(frameState());
    },
    render: () => renderer.render(frameState()),
    setTime: (t: number) => { worldTime = t; },
    setSun: (x: number, y: number, z: number) => { renderer.sunDir = v3.norm([x, y, z]); },
    setLook: (o: { exposure?: number; sun?: number; fog?: number; tonemap?: 0 | 1 }) => {
      if (o.exposure !== undefined) renderer.exposure = o.exposure;
      if (o.sun !== undefined) renderer.sunIntensity = o.sun;
      if (o.fog !== undefined) renderer.fogDensity = o.fog;
      if (o.tonemap !== undefined) renderer.tonemap = o.tonemap;
    },
    ready: true,
  };
  (window as unknown as { __ISLAND__: typeof api }).__ISLAND__ = api;

  if (benchMode) { await runBench(); return; }
  if (manual) { renderer.render(frameState()); return; }

  let last = performance.now();
  const startT = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (autopilot) step(dt, autopilotInput((now - startT) / 1000));
    else step(dt);
    renderer.render(frameState());
    updateHud(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Digit1') setTier('low');
  if (e.code === 'Digit2') setTier('medium');
  if (e.code === 'Digit3') setTier('high');
  if (e.code === 'Digit4') setTier('ultra');
  if (e.code === 'KeyQ') element = (element + 1) % 4;
  if (e.code === 'KeyE') castElement();
  if (e.code === 'KeyT') renderer.tonemap = renderer.tonemap ? 0 : 1;
  if (e.code === 'KeyH') help.style.display = help.style.display === 'none' ? 'block' : 'none';
  if (e.code === 'KeyF') {
    if (currentPlacement?.serviceTableOpen) {
      applySlicePlacement('summoned');
    } else {
      applySlicePlacement('service-table');
    }
  }
  if (e.code === 'KeyV') {
    applySlicePlacement('summoned', {
      playerPosition: [fox.pos[0], fox.pos[1], fox.pos[2]],
      playerYaw: fox.yaw,
      nowSec: Math.round(worldTime),
    });
  }
  if (e.code === 'KeyN') applySlicePlacement('night-midway');
  if (e.code === 'KeyM') applySlicePlacement('town');
  if (['Space', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
let dragging = false;
canvas.addEventListener('pointerdown', (e) => { dragging = true; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', (e) => { dragging = false; canvas.releasePointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  sliceCameraLocked = false;
  camState.yaw -= e.movementX * 0.005;
  camState.pitch = clamp(camState.pitch + e.movementY * 0.003, -0.05, 0.6);
});
canvas.addEventListener('wheel', (e) => { camState.dist = clamp(camState.dist + e.deltaY * 0.003, 2.2, 9); });

void rotationZ;
main();


