/**
 * DREAM Engine — WebGL2 Fallback Renderer
 * Full visual parity with WebGPU:
 *   - 4-Bone Linear Blend Skinning (JOINTS_0 + WEIGHTS_0, 64-bone palette)
 *   - Tangent-Space Normal Mapping (TBN orthonormal basis)
 *   - Textured PBR (baseColorTexture, normalTexture, packed ORM: R=Occlusion, G=Roughness, B=Metallic)
 *   - Energy-Conserving Cook-Torrance GGX Microfacet BRDF (F0 = mix(0.04, albedo, metallic), kD = (1 - F)*(1 - metallic))
 *   - Ancient Sanctuary stone/moss terrain, dual contact shadows, thresholded bloom, and ACES Filmic Tonemapping.
 */

import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';
import { MeshGeometry, PbrTextureData } from '../scene/mesh.ts';
import { IRenderer, RenderItem } from './types.ts';
import { RenderProfileData, WorldMode } from './render-profile.ts';
import { MAX_SKIN_JOINTS } from '../animation/skeleton-mixer.ts';

interface GlMeshCache {
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
  indexType: number;
  indexCount: number;
}

const VERTEX_SHADER_GLSL = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec4 aTangent;
layout(location = 4) in vec4 aJoints0;
layout(location = 5) in vec4 aWeights0;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform vec4 uSkinAndTexFlags; // x = isSkinned, y = hasBaseColorTex, z = hasNormalTex, w = hasOrmTex
uniform mat4 uJointMatrices[64];

out vec3 vWorldPos;
out vec3 vWorldNormal;
out vec2 vUv;
out vec4 vWorldTangent;

void main() {
  vec4 localPos = vec4(aPosition, 1.0);
  vec3 localNormal = aNormal;
  vec3 localTangent = aTangent.xyz;

  // 4-Bone Linear Blend Skinning (JOINTS_0 + WEIGHTS_0)
  if (uSkinAndTexFlags.x > 0.5) {
    int j0 = min(63, int(aJoints0.x + 0.5));
    int j1 = min(63, int(aJoints0.y + 0.5));
    int j2 = min(63, int(aJoints0.z + 0.5));
    int j3 = min(63, int(aJoints0.w + 0.5));

    mat4 skinMat = aWeights0.x * uJointMatrices[j0]
                 + aWeights0.y * uJointMatrices[j1]
                 + aWeights0.z * uJointMatrices[j2]
                 + aWeights0.w * uJointMatrices[j3];

    localPos = skinMat * vec4(aPosition, 1.0);
    mat3 skinRot = mat3(skinMat);
    localNormal = normalize(skinRot * aNormal);
    localTangent = normalize(skinRot * aTangent.xyz);
  }

  vec4 worldPos4 = uModel * localPos;
  vWorldPos = worldPos4.xyz;
  gl_Position = uViewProj * worldPos4;
  mat3 m3 = mat3(uModel);
  vWorldNormal = normalize(m3 * localNormal);
  vWorldTangent = vec4(normalize(m3 * localTangent), aTangent.w);
  vUv = aUv;
}
`;

const FRAGMENT_SHADER_GLSL = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vWorldNormal;
in vec2 vUv;
in vec4 vWorldTangent;

uniform vec4 uCameraPos;         // xyz = pos, w = worldMode (0=day, 1=night)
uniform vec4 uSunDirAndExposure; // xyz = sunDir, w = exposure
uniform vec4 uFogAndEnergy;      // x = fogDensity, y = keyEnergy, z = ambientEnergy, w = time

uniform vec4 uBaseColor;
uniform vec4 uEmissive;          // xyz = color, w = intensity
uniform vec4 uFlags;             // x = isSky, y = isGround, z = rimIntensity, w = packed(roughness, metallic)
uniform vec4 uSkinAndTexFlags;   // x = isSkinned, y = hasBaseColorTex, z = hasNormalTex, w = hasOrmTex
uniform vec4 uNormalAndOccScale; // x = normalScale, y = occlusionStrength

uniform sampler2D uBaseColorTex;
uniform sampler2D uNormalTex;
uniform sampler2D uOrmTex;

out vec4 outColor;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 pos = p;
  for (int i = 0; i < 3; i++) {
    v += a * valueNoise(pos);
    pos = pos * 2.03 + vec2(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}

vec3 acesFilm(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3(0.0), vec3(1.0));
}

void main() {
  bool isNight = uCameraPos.w > 0.5;
  vec3 sunDir = normalize(uSunDirAndExposure.xyz);
  vec3 viewDir = normalize(uCameraPos.xyz - vWorldPos);

  vec4 sampleBaseCol = texture(uBaseColorTex, vUv);
  vec4 sampleNormal = texture(uNormalTex, vUv);
  vec4 sampleOrm = texture(uOrmTex, vUv);

  // 1. Sky Dome Atmosphere Gradient + Sun/Moon Disk
  if (uFlags.x > 0.5) {
    vec3 rayDir = normalize(vWorldPos - uCameraPos.xyz);
    float elevation = clamp(rayDir.y, 0.0, 1.0);

    vec3 zenithColor = isNight ? vec3(0.02, 0.03, 0.09) : vec3(0.11, 0.24, 0.52);
    vec3 midSkyColor = isNight ? vec3(0.05, 0.08, 0.18) : vec3(0.32, 0.50, 0.74);
    vec3 horizonColor = isNight ? vec3(0.10, 0.14, 0.26) : vec3(0.88, 0.72, 0.54);

    vec3 skyCol = mix(horizonColor, midSkyColor, pow(elevation, 0.45));
    skyCol = mix(skyCol, zenithColor, pow(elevation, 1.15));

    float sunDot = max(dot(rayDir, sunDir), 0.0);
    float sunDisc = smoothstep(0.9982, 0.9997, sunDot);
    float sunHalo = pow(sunDot, 24.0) * 0.45 + pow(sunDot, 6.0) * 0.18;
    vec3 sunCol = isNight ? vec3(0.55, 0.68, 1.0) : vec3(1.0, 0.88, 0.62);

    skyCol += sunCol * (sunDisc * 2.2 + sunHalo);
    skyCol = acesFilm(skyCol * uSunDirAndExposure.w);
    outColor = vec4(skyCol, 1.0);
    return;
  }

  vec3 N = normalize(vWorldNormal);
  float packedRM = uFlags.w;
  float roughness = clamp(floor(packedRM) / 255.0, 0.05, 0.98);
  float metallic = clamp(fract(packedRM), 0.0, 0.98);

  vec3 albedo = uBaseColor.rgb;
  float effRoughness = roughness;
  float effMetallic = metallic;
  float effOcclusion = 1.0;
  vec3 groundRuneEmissive = vec3(0.0);

  // Sample 2D PBR textures when bound
  if (uSkinAndTexFlags.y > 0.5) {
    vec3 srgbDecoded = pow(sampleBaseCol.rgb, vec3(2.2));
    albedo *= srgbDecoded;
  }
  if (uSkinAndTexFlags.w > 0.5) {
    effOcclusion = mix(1.0, sampleOrm.r, clamp(uNormalAndOccScale.y, 0.0, 1.0));
    effRoughness = clamp(sampleOrm.g * roughness, 0.05, 0.98);
    effMetallic = clamp(sampleOrm.b * metallic, 0.0, 0.98);
  }
  if (uSkinAndTexFlags.z > 0.5) {
    vec3 N_geom = N;
    vec3 T_orth = normalize(vWorldTangent.xyz - N_geom * dot(N_geom, vWorldTangent.xyz));
    vec3 B_orth = cross(N_geom, T_orth) * vWorldTangent.w;
    vec3 tNorm = sampleNormal.xyz * 2.0 - vec3(1.0);
    float nScale = uNormalAndOccScale.x;
    vec3 tsN = normalize(vec3(tNorm.xy * nScale, max(0.01, tNorm.z)));
    N = normalize(T_orth * tsN.x + B_orth * tsN.y + N_geom * tsN.z);
  }

  // 2. Varied Ancient Basalt Sanctuary Arena & Weathered Stone/Moss Terrain
  if (uFlags.y > 0.5) {
    vec2 arenaCenter = vec2(0.0, -8.5);
    vec2 relP = vWorldPos.xz - arenaCenter;
    float r = length(relP);
    float angle = atan(relP.y, relP.x);

    float macroNoise = fbm(vWorldPos.xz * 0.14);
    float microNoise = fbm(vWorldPos.xz * 1.35);
    float fineGrain = valueNoise(vWorldPos.xz * 6.5);

    float ringStep = floor(r * 0.85);
    float radialDivs = max(8.0, ringStep * 6.0);
    float radialCell = fract((angle / 6.2831853) * radialDivs + ringStep * 0.37);
    float ringFract = fract(r * 0.85);
    float jointDist = min(min(ringFract, 1.0 - ringFract), min(radialCell, 1.0 - radialCell) * (r * 0.15 + 0.5));
    float stoneJoint = smoothstep(0.02, 0.065, jointDist);
    float blockHash = hash21(vec2(ringStep, floor((angle / 6.2831853) * radialDivs)));

    vec3 basaltSlate = isNight ? vec3(0.10, 0.12, 0.18) : vec3(0.33, 0.35, 0.40);
    vec3 warmSandstone = isNight ? vec3(0.14, 0.13, 0.16) : vec3(0.48, 0.41, 0.34);
    vec3 mossyEarth = isNight ? vec3(0.07, 0.11, 0.10) : vec3(0.22, 0.29, 0.21);
    vec3 groutColor = isNight ? vec3(0.04, 0.05, 0.08) : vec3(0.14, 0.13, 0.12);

    vec3 stoneColor = mix(basaltSlate, warmSandstone, blockHash * 0.55 + microNoise * 0.35);
    stoneColor *= (0.88 + 0.22 * fineGrain);
    stoneColor = mix(groutColor, stoneColor, stoneJoint);

    float arenaMask = 1.0 - smoothstep(11.5, 16.5, r);
    vec3 outerTerrain = mix(warmSandstone * 0.85, mossyEarth, smoothstep(0.35, 0.72, macroNoise));
    albedo = mix(outerTerrain * (0.85 + 0.3 * microNoise), stoneColor, arenaMask);

    float ring1 = 1.0 - smoothstep(0.04, 0.18, abs(r - 4.6));
    float ring2 = 1.0 - smoothstep(0.05, 0.22, abs(r - 9.2));
    float ring3 = 1.0 - smoothstep(0.06, 0.25, abs(r - 13.5));
    float runeGlowMask = max(ring1, ring2 * 0.75);
    vec3 bronzeInlay = isNight ? vec3(0.25, 0.65, 0.95) : vec3(0.72, 0.56, 0.28);
    albedo = mix(albedo, bronzeInlay, (ring1 + ring2 + ring3) * 0.45);
    groundRuneEmissive = bronzeInlay * runeGlowMask * 0.22;

    float bumpX = (valueNoise(vWorldPos.xz * 3.5 + vec2(0.2, 0.0)) - valueNoise(vWorldPos.xz * 3.5 - vec2(0.2, 0.0))) * 0.35;
    float bumpZ = (valueNoise(vWorldPos.xz * 3.5 + vec2(0.0, 0.2)) - valueNoise(vWorldPos.xz * 3.5 - vec2(0.0, 0.2))) * 0.35;
    N = normalize(vec3(bumpX + (1.0 - stoneJoint) * 0.18, 1.0, bumpZ));
    effRoughness = mix(0.78, 0.48, arenaMask * stoneJoint);
    effMetallic = mix(0.04, 0.22, (ring1 + ring2));

    float distBoss = length(vWorldPos.xz - vec2(0.0, -10.0));
    float bossContactAO = smoothstep(0.35, 2.25, distBoss);
    float distHeroLine = length(vec2(vWorldPos.x, max(0.0, abs(vWorldPos.z + 5.5) - 2.2)));
    float heroContactAO = smoothstep(0.25, 1.35, distHeroLine);
    float combinedGroundAO = (0.35 + 0.65 * bossContactAO) * (0.55 + 0.45 * heroContactAO);
    albedo *= combinedGroundAO;
  } else if (uSkinAndTexFlags.y < 0.5) {
    float microTex = valueNoise(vWorldPos.xy * 18.0 + vWorldPos.zy * 14.0);
    albedo *= (0.92 + 0.14 * microTex);
  }

  // 4. Energy-Conserving Cook-Torrance GGX PBR Shading (Never clips bright metal to white!)
  float NdotL_raw = dot(N, sunDir);
  float shadowTerm = smoothstep(-0.12, 0.42, NdotL_raw);
  float NdotL = max(NdotL_raw, 0.0);
  float NdotV = max(dot(N, viewDir), 0.001);
  vec3 H = normalize(sunDir + viewDir);
  float NdotH = max(dot(N, H), 0.0);
  float VdotH = max(dot(viewDir, H), 0.0);

  vec3 F0 = mix(vec3(0.04), albedo, effMetallic);
  vec3 F = F0 + (vec3(1.0) - F0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);
  vec3 kD = (vec3(1.0) - F) * (1.0 - effMetallic);

  float alpha = effRoughness * effRoughness;
  float alpha2 = alpha * alpha;
  float denomD = NdotH * NdotH * (alpha2 - 1.0) + 1.0;
  float D = alpha2 / max(3.14159265 * denomD * denomD, 0.0001);

  float rPlus1 = effRoughness + 1.0;
  float k = (rPlus1 * rPlus1) * 0.125;
  float g1V = NdotV / (NdotV * (1.0 - k) + k);
  float g1L = NdotL / (NdotL * (1.0 - k) + k);
  float G = g1V * g1L;

  float specRaw = (D * G) / max(4.0 * NdotV * NdotL, 0.001);
  vec3 specBrdf = (F * specRaw) / (1.0 + 0.85 * specRaw);
  vec3 diffuseBrdf = kD * albedo / 3.14159265;

  vec3 keyColor = (isNight ? vec3(0.42, 0.56, 0.92) : vec3(1.0, 0.94, 0.84)) * uFogAndEnergy.y;
  vec3 skyAmbient = isNight ? vec3(0.09, 0.13, 0.24) : vec3(0.36, 0.46, 0.62);
  vec3 groundBounce = isNight ? vec3(0.04, 0.05, 0.08) : vec3(0.24, 0.19, 0.15);
  vec3 hemiAmbient = mix(groundBounce, skyAmbient, clamp(N.y * 0.5 + 0.5, 0.0, 1.0)) * uFogAndEnergy.z;

  float cavityAO = clamp(0.45 + 0.55 * (N.y * 0.45 + 0.55), 0.32, 1.0) * effOcclusion;

  vec3 reflDir = reflect(-viewDir, N);
  vec3 envReflect = mix(groundBounce, skyAmbient * 1.25, clamp(reflDir.y * 0.5 + 0.5, 0.0, 1.0));
  vec3 envF = F0 + (max(vec3(1.0 - effRoughness), F0) - F0) * pow(1.0 - NdotV, 5.0);
  vec3 ambientDiffuse = kD * albedo * hemiAmbient * cavityAO;
  vec3 ambientSpec = envReflect * envF * (1.0 - effRoughness * 0.55) * 0.48 * cavityAO;

  float rim = pow(1.0 - NdotV, 3.0) * uFlags.z * (1.0 - effMetallic * 0.45);
  vec3 rimColor = isNight ? vec3(0.38, 0.72, 1.0) : vec3(1.0, 0.84, 0.58);

  vec3 rawEmissive = uEmissive.rgb * min(uEmissive.w, 2.6) + groundRuneEmissive;

  vec3 color = ambientDiffuse +
               ambientSpec +
               (keyColor * (diffuseBrdf * 2.4 + specBrdf) * NdotL * shadowTerm) +
               (rimColor * rim * 0.32) +
               rawEmissive;

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float bloomExcess = max(0.0, luma - 0.85);
  color += color * (bloomExcess / (1.0 + bloomExcess)) * 0.25;

  float dist = length(vWorldPos - uCameraPos.xyz);
  float fogDensity = (isNight ? 0.0068 : 0.0042) * uFogAndEnergy.x;
  float fogFactor = clamp(1.0 - exp(-dist * fogDensity), 0.0, 0.78);
  vec3 fogColor = isNight ? vec3(0.06, 0.09, 0.16) : vec3(0.74, 0.68, 0.60);

  color = mix(color, fogColor, fogFactor);
  color = acesFilm(color * uSunDirAndExposure.w);
  color = pow(color, vec3(1.0 / 2.2));

  outColor = vec4(color, uBaseColor.a);
}
`;

export class WebGL2Renderer implements IRenderer {
  readonly backend: 'WebGL2' = 'WebGL2';
  worldMode: WorldMode = 'day';

  exposureMultiplier = 1.0;
  fogDensityMultiplier = 1.0;
  keyEnergyMultiplier = 1.0;
  ambientEnergyMultiplier = 1.0;

  private canvas: HTMLCanvasElement;
  private gl!: WebGL2RenderingContext;
  private program!: WebGLProgram;

  private uViewProj!: WebGLUniformLocation | null;
  private uModel!: WebGLUniformLocation | null;
  private uCameraPos!: WebGLUniformLocation | null;
  private uSunDirAndExposure!: WebGLUniformLocation | null;
  private uFogAndEnergy!: WebGLUniformLocation | null;
  private uBaseColor!: WebGLUniformLocation | null;
  private uEmissive!: WebGLUniformLocation | null;
  private uFlags!: WebGLUniformLocation | null;
  private uSkinAndTexFlags!: WebGLUniformLocation | null;
  private uNormalAndOccScale!: WebGLUniformLocation | null;
  private uJointMatrices!: WebGLUniformLocation | null;
  private uBaseColorTex!: WebGLUniformLocation | null;
  private uNormalTex!: WebGLUniformLocation | null;
  private uOrmTex!: WebGLUniformLocation | null;

  private defaultWhiteTex!: WebGLTexture;
  private defaultNormalTex!: WebGLTexture;
  private defaultOrmTex!: WebGLTexture;
  private identityJoints = new Float32Array(MAX_SKIN_JOINTS * 16);

  private meshCache = new WeakMap<MeshGeometry, GlMeshCache>();
  private textureCache = new WeakMap<PbrTextureData, WebGLTexture>();
  private viewProjMat = new Mat4();
  private startTime = performance.now();

  private pixelBuf = new Uint8Array(4 * 4 * 4);
  private lastLuma = 0.48;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    for (let j = 0; j < MAX_SKIN_JOINTS; j++) {
      this.identityJoints[j * 16 + 0] = 1;
      this.identityJoints[j * 16 + 5] = 1;
      this.identityJoints[j * 16 + 10] = 1;
      this.identityJoints[j * 16 + 15] = 1;
    }
  }

  async init(): Promise<boolean> {
    const gl = this.canvas.getContext('webgl2', {
      antialias: true,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      return false;
    }
    this.gl = gl;

    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_GLSL);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_GLSL);

    const prog = gl.createProgram();
    if (!prog) throw new Error('Failed to create WebGL2 program');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      throw new Error(`WebGL2 program link error: ${info}`);
    }
    this.program = prog;

    this.uViewProj = gl.getUniformLocation(prog, 'uViewProj');
    this.uModel = gl.getUniformLocation(prog, 'uModel');
    this.uCameraPos = gl.getUniformLocation(prog, 'uCameraPos');
    this.uSunDirAndExposure = gl.getUniformLocation(prog, 'uSunDirAndExposure');
    this.uFogAndEnergy = gl.getUniformLocation(prog, 'uFogAndEnergy');
    this.uBaseColor = gl.getUniformLocation(prog, 'uBaseColor');
    this.uEmissive = gl.getUniformLocation(prog, 'uEmissive');
    this.uFlags = gl.getUniformLocation(prog, 'uFlags');
    this.uSkinAndTexFlags = gl.getUniformLocation(prog, 'uSkinAndTexFlags');
    this.uNormalAndOccScale = gl.getUniformLocation(prog, 'uNormalAndOccScale');
    this.uJointMatrices = gl.getUniformLocation(prog, 'uJointMatrices[0]');
    this.uBaseColorTex = gl.getUniformLocation(prog, 'uBaseColorTex');
    this.uNormalTex = gl.getUniformLocation(prog, 'uNormalTex');
    this.uOrmTex = gl.getUniformLocation(prog, 'uOrmTex');

    this.defaultWhiteTex = this.create1x1GlTexture([255, 255, 255, 255]);
    this.defaultNormalTex = this.create1x1GlTexture([128, 128, 255, 255]);
    this.defaultOrmTex = this.create1x1GlTexture([255, 255, 255, 255]);

    gl.useProgram(this.program);
    gl.uniform1i(this.uBaseColorTex, 0);
    gl.uniform1i(this.uNormalTex, 1);
    gl.uniform1i(this.uOrmTex, 2);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    return true;
  }

  private create1x1GlTexture(rgba: [number, number, number, number]): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return tex;
  }

  private getOrCreateGlTexture(texData: PbrTextureData | undefined, fallback: WebGLTexture): WebGLTexture {
    if (!texData) return fallback;
    let cached = this.textureCache.get(texData);
    if (cached) return cached;

    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      Math.max(1, texData.width),
      Math.max(1, texData.height),
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      texData.data
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    cached = tex;
    this.textureCache.set(texData, cached);
    return cached;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  resize(width: number, height: number): void {
    this.canvas.width = Math.max(1, width);
    this.canvas.height = Math.max(1, height);
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  toggleWorldMode(): WorldMode {
    this.worldMode = this.worldMode === 'day' ? 'night' : 'day';
    return this.worldMode;
  }

  private getOrCreateMesh(geom: MeshGeometry): GlMeshCache {
    let cached = this.meshCache.get(geom);
    if (cached) return cached;

    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const vCount = geom.vertexCount;
    const interleaved = new Float32Array(vCount * 20);
    for (let i = 0; i < vCount; i++) {
      const base = i * 20;
      interleaved[base + 0] = geom.positions[i * 3 + 0];
      interleaved[base + 1] = geom.positions[i * 3 + 1];
      interleaved[base + 2] = geom.positions[i * 3 + 2];

      interleaved[base + 3] = geom.normals[i * 3 + 0];
      interleaved[base + 4] = geom.normals[i * 3 + 1];
      interleaved[base + 5] = geom.normals[i * 3 + 2];

      interleaved[base + 6] = geom.uvs[i * 2 + 0];
      interleaved[base + 7] = geom.uvs[i * 2 + 1];

      interleaved[base + 8] = geom.tangents[i * 4 + 0];
      interleaved[base + 9] = geom.tangents[i * 4 + 1];
      interleaved[base + 10] = geom.tangents[i * 4 + 2];
      interleaved[base + 11] = geom.tangents[i * 4 + 3];

      interleaved[base + 12] = geom.joints0[i * 4 + 0];
      interleaved[base + 13] = geom.joints0[i * 4 + 1];
      interleaved[base + 14] = geom.joints0[i * 4 + 2];
      interleaved[base + 15] = geom.joints0[i * 4 + 3];

      interleaved[base + 16] = geom.weights0[i * 4 + 0];
      interleaved[base + 17] = geom.weights0[i * 4 + 1];
      interleaved[base + 18] = geom.weights0[i * 4 + 2];
      interleaved[base + 19] = geom.weights0[i * 4 + 3];
    }

    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

    const stride = 80; // 20 floats * 4 bytes
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 24);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 32);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 48);
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 4, gl.FLOAT, false, stride, 64);

    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geom.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    const isUint32 = geom.indices instanceof Uint32Array;
    cached = {
      vao,
      vbo,
      ibo,
      indexType: isUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      indexCount: geom.indexCount,
    };
    this.meshCache.set(geom, cached);
    return cached;
  }

  render(
    items: RenderItem[],
    viewMatrix: Mat4,
    projMatrix: Mat4,
    cameraPos: Vec3,
    profile?: RenderProfileData,
    sunDirection?: Vec3
  ): void {
    const gl = this.gl;
    if (!gl) return;

    const isNight = (profile ? profile.world === 'night' : this.worldMode === 'night') ? 1.0 : 0.0;
    const elapsed = (performance.now() - this.startTime) / 1000;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (isNight) {
      gl.clearColor(0.02, 0.03, 0.08, 1.0);
    } else {
      gl.clearColor(0.45, 0.58, 0.75, 1.0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);

    this.viewProjMat.multiplyMatrices(projMatrix, viewMatrix);
    gl.uniformMatrix4fv(this.uViewProj, false, this.viewProjMat.elements);

    const sunX = sunDirection ? sunDirection.x : isNight ? -0.35 : 0.48;
    const sunY = sunDirection ? sunDirection.y : isNight ? 0.65 : 0.72;
    const sunZ = sunDirection ? sunDirection.z : isNight ? -0.5 : 0.44;
    const exposure = profile ? profile.exposure : this.exposureMultiplier;
    const fogDens = profile ? profile.fog_density * 140 : this.fogDensityMultiplier;
    const keyEnergy = profile ? profile.key_energy : this.keyEnergyMultiplier;
    const ambEnergy = profile ? profile.ambient_energy * 2.2 : this.ambientEnergyMultiplier;

    gl.uniform4f(this.uCameraPos, cameraPos.x, cameraPos.y, cameraPos.z, isNight);
    gl.uniform4f(this.uSunDirAndExposure, sunX, sunY, sunZ, exposure);
    gl.uniform4f(this.uFogAndEnergy, fogDens, keyEnergy, ambEnergy, elapsed);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const mesh = this.getOrCreateMesh(item.geometry);
      const mat = item.material;

      const roughByte = Math.round(Math.max(0.05, Math.min(0.98, mat.roughness ?? 0.4)) * 255);
      const metalFrac = Math.max(0.0, Math.min(0.98, mat.metallic ?? 0.5));
      const packedRM = roughByte + metalFrac;

      const isSkinned = item.skinJointMatrices ? 1.0 : 0.0;
      const hasBaseTex = mat.baseColorTexture ? 1.0 : 0.0;
      const hasNormalTex = mat.normalTexture ? 1.0 : 0.0;
      const hasOrmTex = mat.ormTexture ? 1.0 : 0.0;

      gl.uniformMatrix4fv(this.uModel, false, item.modelMatrix.elements);
      gl.uniform4f(
        this.uBaseColor,
        mat.baseColor[0],
        mat.baseColor[1],
        mat.baseColor[2],
        mat.baseColor[3]
      );
      gl.uniform4f(
        this.uEmissive,
        mat.emissive[0],
        mat.emissive[1],
        mat.emissive[2],
        mat.emissiveIntensity
      );
      gl.uniform4f(
        this.uFlags,
        mat.isSky ? 1.0 : 0.0,
        mat.isGround ? 1.0 : 0.0,
        mat.rimIntensity ?? 0.45,
        packedRM
      );
      gl.uniform4f(this.uSkinAndTexFlags, isSkinned, hasBaseTex, hasNormalTex, hasOrmTex);
      gl.uniform4f(this.uNormalAndOccScale, mat.normalScale ?? 1.0, mat.occlusionStrength ?? 1.0, 0.0, 0.0);

      if (item.skinJointMatrices) {
        gl.uniformMatrix4fv(this.uJointMatrices, false, item.skinJointMatrices);
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.getOrCreateGlTexture(mat.baseColorTexture, this.defaultWhiteTex));
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.getOrCreateGlTexture(mat.normalTexture, this.defaultNormalTex));
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.getOrCreateGlTexture(mat.ormTexture, this.defaultOrmTex));

      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, mesh.indexType, 0);
    }

    gl.bindVertexArray(null);
  }

  readLuma(): number {
    const gl = this.gl;
    if (!gl) return this.lastLuma;
    try {
      const cx = Math.max(0, Math.floor(this.canvas.width / 2) - 2);
      const cy = Math.max(0, Math.floor(this.canvas.height / 2) - 2);
      gl.readPixels(cx, cy, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, this.pixelBuf);

      let sum = 0;
      for (let i = 0; i < 16; i++) {
        const r = this.pixelBuf[i * 4 + 0] / 255;
        const g = this.pixelBuf[i * 4 + 1] / 255;
        const b = this.pixelBuf[i * 4 + 2] / 255;
        sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      this.lastLuma = sum / 16;
    } catch {
      // Fallback
    }
    return this.lastLuma;
  }

  dispose(): void {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
  }
}
