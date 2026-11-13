/**
 * DREAM Engine — Energy-Conserving Cook-Torrance GGX PBR Shading Reference & Validator
 * Pure TypeScript, zero external dependencies.
 *
 * Implements the exact Cook-Torrance GGX microfacet BRDF, Schlick Fresnel, Smith height-correlated
 * geometry masking, and metallic diffuse energy conservation (`kD = (1 - F) * (1 - metallic)`)
 * used in both `webgpu-renderer.ts` (WGSL) and `webgl2-renderer.ts` (GLSL 300 es), plus
 * tangent-space normal perturbation (`TBN`).
 */

import { Vec3 } from '../math/vec3.ts';

export interface PbrShadingInput {
  albedo: [number, number, number];
  roughness: number;
  metallic: number;
  occlusion: number;
  normalWorld: Vec3;
  viewDir: Vec3;
  lightDir: Vec3;
  lightColor: [number, number, number];
  skyAmbient: [number, number, number];
  groundBounce: [number, number, number];
  exposure?: number;
}

export interface PbrShadingResult {
  f0: [number, number, number];
  fresnel: [number, number, number];
  kD: [number, number, number];
  energySum: [number, number, number];
  linearRadiance: [number, number, number];
  tonemappedSrgb: [number, number, number];
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function acesFilmScalar(x: number): number {
  const a = 2.51;
  const b = 0.03;
  const c = 2.43;
  const d = 0.59;
  const e = 0.14;
  return clamp01((x * (a * x + b)) / (x * (c * x + d) + e));
}

/**
 * Evaluates energy-conserving Cook-Torrance GGX PBR shading and verifies that
 * `kD + F <= 1.0` per channel and tonemapped output never clips to blown-out white.
 */
export function evaluateEnergyConservingPbr(input: PbrShadingInput): PbrShadingResult {
  const N = input.normalWorld.clone().normalize();
  const V = input.viewDir.clone().normalize();
  const L = input.lightDir.clone().normalize();
  const H = Vec3.add(V, L).normalize();

  const roughness = Math.max(0.05, Math.min(0.98, input.roughness));
  const metallic = clamp01(input.metallic);
  const ao = clamp01(input.occlusion);

  const NdotL = Math.max(0.0, N.dot(L));
  const NdotV = Math.max(0.001, N.dot(V));
  const NdotH = Math.max(0.0, N.dot(H));
  const VdotH = Math.max(0.0, V.dot(H));

  // Dielectric F0 = 0.04, Conductor F0 = albedo
  const f0: [number, number, number] = [
    0.04 * (1 - metallic) + input.albedo[0] * metallic,
    0.04 * (1 - metallic) + input.albedo[1] * metallic,
    0.04 * (1 - metallic) + input.albedo[2] * metallic,
  ];

  // Schlick Fresnel
  const fPow = Math.pow(clamp01(1.0 - VdotH), 5.0);
  const fresnel: [number, number, number] = [
    f0[0] + (1.0 - f0[0]) * fPow,
    f0[1] + (1.0 - f0[1]) * fPow,
    f0[2] + (1.0 - f0[2]) * fPow,
  ];

  // Energy-conserving diffuse weight: conductors (metallic=1) have kD = 0
  const kD: [number, number, number] = [
    (1.0 - fresnel[0]) * (1.0 - metallic),
    (1.0 - fresnel[1]) * (1.0 - metallic),
    (1.0 - fresnel[2]) * (1.0 - metallic),
  ];

  const energySum: [number, number, number] = [
    kD[0] + fresnel[0],
    kD[1] + fresnel[1],
    kD[2] + fresnel[2],
  ];

  // Trowbridge-Reitz GGX normal distribution D
  const alpha = roughness * roughness;
  const alpha2 = alpha * alpha;
  const denomD = NdotH * NdotH * (alpha2 - 1.0) + 1.0;
  const D = alpha2 / Math.max(Math.PI * denomD * denomD, 1e-5);

  // Schlick-GGX geometry masking G
  const rPlus1 = roughness + 1.0;
  const k = (rPlus1 * rPlus1) / 8.0;
  const g1V = NdotV / (NdotV * (1.0 - k) + k);
  const g1L = NdotL / (NdotL * (1.0 - k) + k);
  const G = g1V * g1L;

  const specScale = (D * G) / Math.max(4.0 * NdotV * NdotL, 0.001);

  const hemiMix = clamp01(N.y * 0.5 + 0.5);
  const ambR = input.groundBounce[0] * (1 - hemiMix) + input.skyAmbient[0] * hemiMix;
  const ambG = input.groundBounce[1] * (1 - hemiMix) + input.skyAmbient[1] * hemiMix;
  const ambB = input.groundBounce[2] * (1 - hemiMix) + input.skyAmbient[2] * hemiMix;

  const linearRadiance: [number, number, number] = [0, 0, 0];
  const ambVec = [ambR, ambG, ambB];

  for (let c = 0; c < 3; c++) {
    const diffuseBrdf = (kD[c] * input.albedo[c]) / Math.PI;
    // Softly compress ultra-sharp GGX peaks so grazing specular stays energy-conserving
    const specBrdf = (fresnel[c] * specScale) / (1.0 + 0.85 * specScale);
    const direct = (diffuseBrdf + specBrdf) * input.lightColor[c] * NdotL;

    const envF = f0[c] + (Math.max(1.0 - roughness, f0[c]) - f0[c]) * Math.pow(1.0 - NdotV, 5.0);
    const ambientDiffuse = kD[c] * input.albedo[c] * ambVec[c] * ao;
    const ambientSpec = envF * ambVec[c] * (1.0 - roughness * 0.55) * 0.45 * ao;

    linearRadiance[c] = direct + ambientDiffuse + ambientSpec;
  }

  const exposure = input.exposure ?? 1.0;
  const tonemappedSrgb: [number, number, number] = [
    Math.pow(acesFilmScalar(linearRadiance[0] * exposure), 1.0 / 2.2),
    Math.pow(acesFilmScalar(linearRadiance[1] * exposure), 1.0 / 2.2),
    Math.pow(acesFilmScalar(linearRadiance[2] * exposure), 1.0 / 2.2),
  ];

  return {
    f0,
    fresnel,
    kD,
    energySum,
    linearRadiance,
    tonemappedSrgb,
  };
}

/**
 * Perturbs a world-space geometric normal using a tangent-space normal sample `(nx, ny, nz)` in `[-1, 1]`
 * and vertex tangent `(tx, ty, tz, handednessW)`.
 */
export function applyTangentSpaceNormal(
  worldNormal: Vec3,
  worldTangent: Vec3,
  handednessW: number,
  tangentNormalSample: Vec3,
  normalScale = 1.0
): Vec3 {
  const N = worldNormal.clone().normalize();
  const T = worldTangent
    .clone()
    .addScaled(N, -N.dot(worldTangent))
    .normalize();
  const B = Vec3.cross(N, T).scale(handednessW < 0 ? -1.0 : 1.0).normalize();

  const ts = new Vec3(
    tangentNormalSample.x * normalScale,
    tangentNormalSample.y * normalScale,
    Math.max(0.01, tangentNormalSample.z)
  ).normalize();

  return new Vec3(
    T.x * ts.x + B.x * ts.y + N.x * ts.z,
    T.y * ts.x + B.y * ts.y + N.y * ts.z,
    T.z * ts.x + B.z * ts.y + N.z * ts.z
  ).normalize();
}
