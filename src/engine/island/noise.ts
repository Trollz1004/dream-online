/**
 * Deterministic, seeded value noise for the island slice.
 * Every world feature is generated from a fixed seed so the world is persistent:
 * the same pier plank, rock and tree sits in the same place every frame,
 * every session, on every quality tier. Nothing is regenerated per view.
 */
export const WORLD_SEED = 0x51a7d;

export function hash2(ix: number, iy: number, seed = WORLD_SEED): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export function hash3(ix: number, iy: number, iz: number, seed = WORLD_SEED): number {
  return hash2(ix + Math.imul(iz | 0, 1013), iy - Math.imul(iz | 0, 7919), seed);
}

const fade = (t: number) => t * t * (3 - 2 * t);

export function valueNoise2(x: number, y: number, seed = WORLD_SEED): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fade(x - ix), fy = fade(y - iy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export function valueNoise3(x: number, y: number, z: number, seed = WORLD_SEED): number {
  const iz = Math.floor(z);
  const fz = fade(z - iz);
  const a = valueNoise2(x + iz * 17.13, y - iz * 9.71, seed);
  const b = valueNoise2(x + (iz + 1) * 17.13, y - (iz + 1) * 9.71, seed);
  return a + (b - a) * fz;
}

export function fbm2(x: number, y: number, octaves = 4, seed = WORLD_SEED): number {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(x * freq, y * freq, seed + i * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/** Small deterministic PRNG (mulberry32) for placement sequences. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
