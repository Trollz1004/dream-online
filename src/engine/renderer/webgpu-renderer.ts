/**
 * DREAM Engine — Primary WebGPU Renderer
 * Pure WebGPU implementation with WGSL shaders:
 *   - 4-Bone Linear Blend Skinning (JOINTS_0 + WEIGHTS_0, 64-bone palette)
 *   - Tangent-Space Normal Mapping (TBN orthonormal basis)
 *   - Textured PBR (baseColorTexture, normalTexture, packed ORM: R=Occlusion, G=Roughness, B=Metallic)
 *   - Energy-Conserving Cook-Torrance GGX Microfacet BRDF (F0 = mix(0.04, albedo, metallic), kD = (1 - F)*(1 - metallic))
 *   - Ancient Sanctuary stone/moss terrain, thresholded bloom, and ACES tonemapping.
 */

import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';
import { MeshGeometry, PbrTextureData } from '../scene/mesh.ts';
import { IRenderer, RenderItem } from './types.ts';
import { RenderProfileData, WorldMode } from './render-profile.ts';
import { MAX_SKIN_JOINTS } from '../animation/skeleton-mixer.ts';

interface GpuMeshCache {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexFormat: GPUIndexFormat;
  indexCount: number;
}

interface GpuObjectSlot {
  uniformBuffer: GPUBuffer;
  skinBuffer: GPUBuffer;
}

const WGSL_SHADER = /* wgsl */ `
struct SceneUniforms {
  viewProj: mat4x4<f32>,
  cameraPos: vec4<f32>,         // xyz = pos, w = worldMode (0=day, 1=night)
  sunDirAndExposure: vec4<f32>, // xyz = sunDir, w = exposure
  fogAndEnergy: vec4<f32>,      // x = fogDensity, y = keyEnergy, z = ambientEnergy, w = time
};

struct ObjectUniforms {
  modelMatrix: mat4x4<f32>,
  baseColor: vec4<f32>,
  emissive: vec4<f32>,          // xyz = emissive color, w = emissiveIntensity
  flags: vec4<f32>,             // x = isSky, y = isGround, z = rimIntensity, w = packed(roughness, metallic)
  skinAndTexFlags: vec4<f32>,   // x = isSkinned, y = hasBaseColorTex, z = hasNormalTex, w = hasOrmTex
  normalAndOccScale: vec4<f32>, // x = normalScale, y = occlusionStrength, z = 0, w = 0
};

struct SkinPalette {
  joints: array<mat4x4<f32>, 64>,
};

@group(0) @binding(0) var<uniform> scene: SceneUniforms;
@group(0) @binding(1) var pbrSampler: sampler;

@group(1) @binding(0) var<uniform> obj: ObjectUniforms;
@group(1) @binding(1) var<uniform> skin: SkinPalette;
@group(1) @binding(2) var baseColorTex: texture_2d<f32>;
@group(1) @binding(3) var normalTex: texture_2d<f32>;
@group(1) @binding(4) var ormTex: texture_2d<f32>;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) tangent: vec4<f32>,
  @location(4) joints0: vec4<f32>,
  @location(5) weights0: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) worldNormal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) worldTangent: vec4<f32>,
};

fn hash21(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn valueNoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash21(i);
  let b = hash21(i + vec2<f32>(1.0, 0.0));
  let c = hash21(i + vec2<f32>(0.0, 1.0));
  let d = hash21(i + vec2<f32>(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn fbm(p: vec2<f32>) -> f32 {
  var v = 0.0;
  var a = 0.5;
  var pos = p;
  for (var i = 0; i < 3; i = i + 1) {
    v += a * valueNoise(pos);
    pos = pos * 2.03 + vec2<f32>(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}

fn acesFilm(x: vec3<f32>) -> vec3<f32> {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  var localPos = vec4<f32>(in.position, 1.0);
  var localNormal = in.normal;
  var localTan = in.tangent.xyz;

  // 4-Bone Linear Blend Skinning (JOINTS_0 + WEIGHTS_0)
  if (obj.skinAndTexFlags.x > 0.5) {
    let j0 = min(63u, u32(in.joints0.x + 0.5));
    let j1 = min(63u, u32(in.joints0.y + 0.5));
    let j2 = min(63u, u32(in.joints0.z + 0.5));
    let j3 = min(63u, u32(in.joints0.w + 0.5));

    let w = in.weights0;
    let skinMat = w.x * skin.joints[j0]
                + w.y * skin.joints[j1]
                + w.z * skin.joints[j2]
                + w.w * skin.joints[j3];

    localPos = skinMat * vec4<f32>(in.position, 1.0);
    let skinRot = mat3x3<f32>(skinMat[0].xyz, skinMat[1].xyz, skinMat[2].xyz);
    localNormal = normalize(skinRot * in.normal);
    localTan = normalize(skinRot * in.tangent.xyz);
  }

  let worldPos4 = obj.modelMatrix * localPos;
  out.worldPos = worldPos4.xyz;
  out.clipPos = scene.viewProj * worldPos4;

  let nMat = mat3x3<f32>(
    obj.modelMatrix[0].xyz,
    obj.modelMatrix[1].xyz,
    obj.modelMatrix[2].xyz
  );
  out.worldNormal = normalize(nMat * localNormal);
  out.worldTangent = vec4<f32>(normalize(nMat * localTan), in.tangent.w);
  out.uv = in.uv;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let isNight = scene.cameraPos.w > 0.5;
  let sunDir = normalize(scene.sunDirAndExposure.xyz);
  let viewDir = normalize(scene.cameraPos.xyz - in.worldPos);

  let sampleBaseCol = textureSample(baseColorTex, pbrSampler, in.uv);
  let sampleNormal = textureSample(normalTex, pbrSampler, in.uv);
  let sampleOrm = textureSample(ormTex, pbrSampler, in.uv);

  // 1. Sky Dome Atmosphere Gradient + Sun/Moon Disk + Horizon Cloud Haze
  if (obj.flags.x > 0.5) {
    let rayDir = normalize(in.worldPos - scene.cameraPos.xyz);
    let elevation = clamp(rayDir.y, 0.0, 1.0);

    let zenithColor = select(vec3<f32>(0.11, 0.24, 0.52), vec3<f32>(0.02, 0.03, 0.09), isNight);
    let midSkyColor = select(vec3<f32>(0.32, 0.50, 0.74), vec3<f32>(0.05, 0.08, 0.18), isNight);
    let horizonColor = select(vec3<f32>(0.88, 0.72, 0.54), vec3<f32>(0.10, 0.14, 0.26), isNight);

    var skyCol = mix(horizonColor, midSkyColor, pow(elevation, 0.45));
    skyCol = mix(skyCol, zenithColor, pow(elevation, 1.15));

    let sunDot = max(dot(rayDir, sunDir), 0.0);
    let sunDisc = smoothstep(0.9982, 0.9997, sunDot);
    let sunHalo = pow(sunDot, 24.0) * 0.45 + pow(sunDot, 6.0) * 0.18;
    let sunCol = select(vec3<f32>(1.0, 0.88, 0.62), vec3<f32>(0.55, 0.68, 1.0), isNight);

    skyCol += sunCol * (sunDisc * 2.2 + sunHalo);
    skyCol = acesFilm(skyCol * scene.sunDirAndExposure.w);
    return vec4<f32>(skyCol, 1.0);
  }

  var N = normalize(in.worldNormal);
  let packedRM = obj.flags.w;
  let roughness = clamp(floor(packedRM) / 255.0, 0.05, 0.98);
  let metallic = clamp(fract(packedRM), 0.0, 0.98);

  var albedo = obj.baseColor.rgb;
  var effRoughness = roughness;
  var effMetallic = metallic;
  var effOcclusion = 1.0;
  var groundRuneEmissive = vec3<f32>(0.0);

  // Sample 2D PBR textures when bound
  if (obj.skinAndTexFlags.y > 0.5) {
    let srgbDecoded = pow(sampleBaseCol.rgb, vec3<f32>(2.2));
    albedo *= srgbDecoded;
  }
  if (obj.skinAndTexFlags.w > 0.5) {
    effOcclusion = mix(1.0, sampleOrm.r, clamp(obj.normalAndOccScale.y, 0.0, 1.0));
    effRoughness = clamp(sampleOrm.g * roughness, 0.05, 0.98);
    effMetallic = clamp(sampleOrm.b * metallic, 0.0, 0.98);
  }
  if (obj.skinAndTexFlags.z > 0.5) {
    let N_geom = N;
    let T_orth = normalize(in.worldTangent.xyz - N_geom * dot(N_geom, in.worldTangent.xyz));
    let B_orth = cross(N_geom, T_orth) * in.worldTangent.w;
    let tNorm = sampleNormal.xyz * 2.0 - vec3<f32>(1.0);
    let nScale = obj.normalAndOccScale.x;
    let tsN = normalize(vec3<f32>(tNorm.xy * nScale, max(0.01, tNorm.z)));
    N = normalize(T_orth * tsN.x + B_orth * tsN.y + N_geom * tsN.z);
  }

  // 2. Varied Ancient Basalt Sanctuary Arena & Weathered Stone/Moss Terrain
  if (obj.flags.y > 0.5) {
    let arenaCenter = vec2<f32>(0.0, -8.5);
    let relP = in.worldPos.xz - arenaCenter;
    let r = length(relP);
    let angle = atan2(relP.y, relP.x);

    let macroNoise = fbm(in.worldPos.xz * 0.14);
    let microNoise = fbm(in.worldPos.xz * 1.35);
    let fineGrain = valueNoise(in.worldPos.xz * 6.5);

    let ringStep = floor(r * 0.85);
    let radialDivs = max(8.0, ringStep * 6.0);
    let radialCell = fract((angle / 6.2831853) * radialDivs + ringStep * 0.37);
    let ringFract = fract(r * 0.85);
    let jointDist = min(min(ringFract, 1.0 - ringFract), min(radialCell, 1.0 - radialCell) * (r * 0.15 + 0.5));
    let stoneJoint = smoothstep(0.02, 0.065, jointDist);
    let blockHash = hash21(vec2<f32>(ringStep, floor((angle / 6.2831853) * radialDivs)));

    let basaltSlate = select(vec3<f32>(0.33, 0.35, 0.40), vec3<f32>(0.10, 0.12, 0.18), isNight);
    let warmSandstone = select(vec3<f32>(0.48, 0.41, 0.34), vec3<f32>(0.14, 0.13, 0.16), isNight);
    let mossyEarth = select(vec3<f32>(0.22, 0.29, 0.21), vec3<f32>(0.07, 0.11, 0.10), isNight);
    let groutColor = select(vec3<f32>(0.14, 0.13, 0.12), vec3<f32>(0.04, 0.05, 0.08), isNight);

    var stoneColor = mix(basaltSlate, warmSandstone, blockHash * 0.55 + microNoise * 0.35);
    stoneColor *= (0.88 + 0.22 * fineGrain);
    stoneColor = mix(groutColor, stoneColor, stoneJoint);

    let arenaMask = 1.0 - smoothstep(11.5, 16.5, r);
    let outerTerrain = mix(warmSandstone * 0.85, mossyEarth, smoothstep(0.35, 0.72, macroNoise));
    albedo = mix(outerTerrain * (0.85 + 0.3 * microNoise), stoneColor, arenaMask);

    let ring1 = 1.0 - smoothstep(0.04, 0.18, abs(r - 4.6));
    let ring2 = 1.0 - smoothstep(0.05, 0.22, abs(r - 9.2));
    let ring3 = 1.0 - smoothstep(0.06, 0.25, abs(r - 13.5));
    let runeGlowMask = max(ring1, ring2 * 0.75);
    let bronzeInlay = select(vec3<f32>(0.72, 0.56, 0.28), vec3<f32>(0.25, 0.65, 0.95), isNight);
    albedo = mix(albedo, bronzeInlay, (ring1 + ring2 + ring3) * 0.45);
    groundRuneEmissive = bronzeInlay * runeGlowMask * 0.22;

    let bumpX = (valueNoise(in.worldPos.xz * 3.5 + vec2<f32>(0.2, 0.0)) - valueNoise(in.worldPos.xz * 3.5 - vec2<f32>(0.2, 0.0))) * 0.35;
    let bumpZ = (valueNoise(in.worldPos.xz * 3.5 + vec2<f32>(0.0, 0.2)) - valueNoise(in.worldPos.xz * 3.5 - vec2<f32>(0.0, 0.2))) * 0.35;
    N = normalize(vec3<f32>(bumpX + (1.0 - stoneJoint) * 0.18, 1.0, bumpZ));
    effRoughness = mix(0.78, 0.48, arenaMask * stoneJoint);
    effMetallic = mix(0.04, 0.22, (ring1 + ring2));

    let distBoss = length(in.worldPos.xz - vec2<f32>(0.0, -10.0));
    let bossContactAO = smoothstep(0.35, 2.25, distBoss);
    let distHeroLine = length(vec2<f32>(in.worldPos.x, max(0.0, abs(in.worldPos.z + 5.5) - 2.2)));
    let heroContactAO = smoothstep(0.25, 1.35, distHeroLine);
    let combinedGroundAO = (0.35 + 0.65 * bossContactAO) * (0.55 + 0.45 * heroContactAO);
    albedo *= combinedGroundAO;
  } else if (obj.skinAndTexFlags.y < 0.5) {
    let microTex = valueNoise(in.worldPos.xy * 18.0 + in.worldPos.zy * 14.0);
    albedo *= (0.92 + 0.14 * microTex);
  }

  // 4. Energy-Conserving Cook-Torrance GGX PBR Shading (Never clips bright metal to white!)
  let NdotL_raw = dot(N, sunDir);
  let shadowTerm = smoothstep(-0.12, 0.42, NdotL_raw);
  let NdotL = max(NdotL_raw, 0.0);
  let NdotV = max(dot(N, viewDir), 0.001);
  let H = normalize(sunDir + viewDir);
  let NdotH = max(dot(N, H), 0.0);
  let VdotH = max(dot(viewDir, H), 0.0);

  let F0 = mix(vec3<f32>(0.04), albedo, effMetallic);
  let F = F0 + (vec3<f32>(1.0) - F0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);
  let kD = (vec3<f32>(1.0) - F) * (1.0 - effMetallic);

  let alpha = effRoughness * effRoughness;
  let alpha2 = alpha * alpha;
  let denomD = NdotH * NdotH * (alpha2 - 1.0) + 1.0;
  let D = alpha2 / max(3.14159265 * denomD * denomD, 0.0001);

  let rPlus1 = effRoughness + 1.0;
  let k = (rPlus1 * rPlus1) * 0.125;
  let g1V = NdotV / (NdotV * (1.0 - k) + k);
  let g1L = NdotL / (NdotL * (1.0 - k) + k);
  let G = g1V * g1L;

  let specRaw = (D * G) / max(4.0 * NdotV * NdotL, 0.001);
  let specBrdf = (F * specRaw) / (1.0 + 0.35 * specRaw);
  let diffuseBrdf = kD * albedo / 3.14159265;

  let keyColor = select(vec3<f32>(1.0, 0.94, 0.84), vec3<f32>(0.42, 0.56, 0.92), isNight) * scene.fogAndEnergy.y;
  let skyAmbient = select(vec3<f32>(0.36, 0.46, 0.62), vec3<f32>(0.09, 0.13, 0.24), isNight);
  let groundBounce = select(vec3<f32>(0.24, 0.19, 0.15), vec3<f32>(0.04, 0.05, 0.08), isNight);
  let hemiAmbient = mix(groundBounce, skyAmbient, clamp(N.y * 0.5 + 0.5, 0.0, 1.0)) * scene.fogAndEnergy.z;

  let cavityAO = clamp(0.45 + 0.55 * (N.y * 0.45 + 0.55), 0.32, 1.0) * effOcclusion;

  let reflDir = reflect(-viewDir, N);
  let envReflect = mix(groundBounce, skyAmbient * 1.25, clamp(reflDir.y * 0.5 + 0.5, 0.0, 1.0));
  let envF = F0 + (max(vec3<f32>(1.0 - effRoughness), F0) - F0) * pow(1.0 - NdotV, 5.0);
  let ambientDiffuse = kD * albedo * hemiAmbient * cavityAO;
  let ambientSpec = envReflect * envF * (1.0 - effRoughness * 0.55) * 0.48 * cavityAO;

  let rim = pow(1.0 - NdotV, 3.0) * obj.flags.z * (1.0 - effMetallic * 0.45);
  let rimColor = select(vec3<f32>(1.0, 0.84, 0.58), vec3<f32>(0.38, 0.72, 1.0), isNight);

  let rawEmissive = obj.emissive.rgb * min(obj.emissive.w, 2.6) + groundRuneEmissive;

  var color = ambientDiffuse +
              ambientSpec +
              (keyColor * (diffuseBrdf * 2.4 + specBrdf) * NdotL * shadowTerm) +
              (rimColor * rim * 0.32) +
              rawEmissive;

  // Thresholded Bloom Knee (only luminance > 0.85 blooms softly)
  let luma = dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
  let bloomExcess = max(0.0, luma - 0.85);
  color += color * (bloomExcess / (1.0 + bloomExcess)) * 0.25;

  // Atmospheric Distance Fog
  let dist = length(in.worldPos - scene.cameraPos.xyz);
  let fogDensity = select(0.0042, 0.0068, isNight) * scene.fogAndEnergy.x;
  let fogFactor = clamp(1.0 - exp(-dist * fogDensity), 0.0, 0.78);
  let fogColor = select(vec3<f32>(0.74, 0.68, 0.60), vec3<f32>(0.06, 0.09, 0.16), isNight);

  color = mix(color, fogColor, fogFactor);

  // ACES Filmic Tonemapping + Gamma
  color = acesFilm(color * scene.sunDirAndExposure.w);
  color = pow(color, vec3<f32>(1.0 / 2.2));

  return vec4<f32>(color, obj.baseColor.a);
}
`;

export class WebGPURenderer implements IRenderer {
  readonly backend: 'WebGPU' = 'WebGPU';
  worldMode: WorldMode = 'day';

  exposureMultiplier = 1.0;
  fogDensityMultiplier = 1.0;
  keyEnergyMultiplier = 1.0;
  ambientEnergyMultiplier = 1.0;

  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private pipeline!: GPURenderPipeline;
  private depthTexture!: GPUTexture;

  private sceneUniformBuffer!: GPUBuffer;
  private sceneBindGroup!: GPUBindGroup;
  private objectBindGroupLayout!: GPUBindGroupLayout;
  private pbrSampler!: GPUSampler;

  private defaultWhiteTex!: GPUTextureView;
  private defaultNormalTex!: GPUTextureView;
  private defaultOrmTex!: GPUTextureView;
  private defaultIdentitySkinBuffer!: GPUBuffer;

  private objectPool: GpuObjectSlot[] = [];
  private meshCache = new WeakMap<MeshGeometry, GpuMeshCache>();
  private textureCache = new WeakMap<PbrTextureData, GPUTextureView>();

  private viewProjMat = new Mat4();
  private startTime = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  static async isSupported(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
      return false;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  async init(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    if (!adapter) {
      return false;
    }

    this.device = await adapter.requestDevice();
    const ctx = this.canvas.getContext('webgpu');
    if (!ctx) {
      return false;
    }
    this.context = ctx;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque',
    });

    const shaderModule = this.device.createShaderModule({
      code: WGSL_SHADER,
    });

    this.pbrSampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
    });

    this.defaultWhiteTex = this.create1x1TextureView([255, 255, 255, 255]);
    this.defaultNormalTex = this.create1x1TextureView([128, 128, 255, 255]);
    this.defaultOrmTex = this.create1x1TextureView([255, 255, 255, 255]);

    const identityPalette = new Float32Array(MAX_SKIN_JOINTS * 16);
    for (let j = 0; j < MAX_SKIN_JOINTS; j++) {
      identityPalette[j * 16 + 0] = 1;
      identityPalette[j * 16 + 5] = 1;
      identityPalette[j * 16 + 10] = 1;
      identityPalette[j * 16 + 15] = 1;
    }
    this.defaultIdentitySkinBuffer = this.device.createBuffer({
      size: identityPalette.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.defaultIdentitySkinBuffer, 0, identityPalette);

    const sceneBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' },
        },
      ],
    });

    this.objectBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'uniform' },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float' },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float' },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float' },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [sceneBindGroupLayout, this.objectBindGroupLayout],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 80, // 20 floats * 4 bytes
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
              { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
              { shaderLocation: 2, offset: 24, format: 'float32x2' }, // uv
              { shaderLocation: 3, offset: 32, format: 'float32x4' }, // tangent
              { shaderLocation: 4, offset: 48, format: 'float32x4' }, // joints0
              { shaderLocation: 5, offset: 64, format: 'float32x4' }, // weights0
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less-equal',
      },
    });

    this.sceneUniformBuffer = this.device.createBuffer({
      size: 112,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.sceneBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.sceneUniformBuffer } },
        { binding: 1, resource: this.pbrSampler },
      ],
    });

    this.createDepthTexture();
    return true;
  }

  private create1x1TextureView(rgba: [number, number, number, number]): GPUTextureView {
    const tex = this.device.createTexture({
      size: [1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.device.queue.writeTexture(
      { texture: tex },
      new Uint8Array(rgba),
      { bytesPerRow: 4 },
      [1, 1]
    );
    return tex.createView();
  }

  private getOrCreateTextureView(texData: PbrTextureData | undefined, fallback: GPUTextureView): GPUTextureView {
    if (!texData) return fallback;
    let cached = this.textureCache.get(texData);
    if (cached) return cached;

    const w = Math.max(1, texData.width);
    const h = Math.max(1, texData.height);
    const tex = this.device.createTexture({
      size: [w, h],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.device.queue.writeTexture(
      { texture: tex },
      texData.data.buffer,
      { offset: texData.data.byteOffset, bytesPerRow: w * 4, rowsPerImage: h },
      [w, h]
    );
    cached = tex.createView();
    this.textureCache.set(texData, cached);
    return cached;
  }

  private createDepthTexture(): void {
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }
    const w = Math.max(1, this.canvas.width);
    const h = Math.max(1, this.canvas.height);
    this.depthTexture = this.device.createTexture({
      size: [w, h],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  resize(width: number, height: number): void {
    this.canvas.width = Math.max(1, width);
    this.canvas.height = Math.max(1, height);
    if (this.device) {
      this.createDepthTexture();
    }
  }

  toggleWorldMode(): WorldMode {
    this.worldMode = this.worldMode === 'day' ? 'night' : 'day';
    return this.worldMode;
  }

  private getOrCreateMesh(geom: MeshGeometry): GpuMeshCache {
    let cached = this.meshCache.get(geom);
    if (cached) return cached;

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

    const vertexBuffer = this.device.createBuffer({
      size: interleaved.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(vertexBuffer, 0, interleaved);

    const isUint32 = geom.indices instanceof Uint32Array;
    const paddedByteLength = Math.ceil(geom.indices.byteLength / 4) * 4;
    const indexBuffer = this.device.createBuffer({
      size: Math.max(4, paddedByteLength),
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    if (geom.indices.byteLength === paddedByteLength) {
      this.device.queue.writeBuffer(
        indexBuffer,
        0,
        geom.indices.buffer,
        geom.indices.byteOffset,
        geom.indices.byteLength
      );
    } else {
      const padded = new Uint8Array(paddedByteLength);
      padded.set(new Uint8Array(geom.indices.buffer, geom.indices.byteOffset, geom.indices.byteLength));
      this.device.queue.writeBuffer(indexBuffer, 0, padded);
    }

    cached = {
      vertexBuffer,
      indexBuffer,
      indexFormat: isUint32 ? 'uint32' : 'uint16',
      indexCount: geom.indexCount,
    };
    this.meshCache.set(geom, cached);
    return cached;
  }

  private getObjectSlot(index: number): GpuObjectSlot {
    while (this.objectPool.length <= index) {
      const uniformBuffer = this.device.createBuffer({
        size: 144, // 36 floats * 4 bytes
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const skinBuffer = this.device.createBuffer({
        size: MAX_SKIN_JOINTS * 16 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.objectPool.push({ uniformBuffer, skinBuffer });
    }
    return this.objectPool[index];
  }

  render(
    items: RenderItem[],
    viewMatrix: Mat4,
    projMatrix: Mat4,
    cameraPos: Vec3,
    profile?: RenderProfileData,
    sunDirection?: Vec3
  ): void {
    if (!this.device) return;

    this.viewProjMat.multiplyMatrices(projMatrix, viewMatrix);
    const isNight = (profile ? profile.world === 'night' : this.worldMode === 'night') ? 1.0 : 0.0;
    const elapsed = (performance.now() - this.startTime) / 1000;

    const sunX = sunDirection ? sunDirection.x : isNight ? -0.35 : 0.48;
    const sunY = sunDirection ? sunDirection.y : isNight ? 0.65 : 0.72;
    const sunZ = sunDirection ? sunDirection.z : isNight ? -0.5 : 0.44;
    const exposure = profile ? profile.exposure : this.exposureMultiplier;
    const fogDens = profile ? profile.fog_density * 140 : this.fogDensityMultiplier;
    const keyEnergy = profile ? profile.key_energy : this.keyEnergyMultiplier;
    const ambEnergy = profile ? profile.ambient_energy * 2.2 : this.ambientEnergyMultiplier;

    const sceneData = new Float32Array(28);
    sceneData.set(this.viewProjMat.elements, 0);
    sceneData[16] = cameraPos.x;
    sceneData[17] = cameraPos.y;
    sceneData[18] = cameraPos.z;
    sceneData[19] = isNight;
    sceneData[20] = sunX;
    sceneData[21] = sunY;
    sceneData[22] = sunZ;
    sceneData[23] = exposure;
    sceneData[24] = fogDens;
    sceneData[25] = keyEnergy;
    sceneData[26] = ambEnergy;
    sceneData[27] = elapsed;

    this.device.queue.writeBuffer(this.sceneUniformBuffer, 0, sceneData);

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: isNight
            ? { r: 0.02, g: 0.03, b: 0.08, a: 1.0 }
            : { r: 0.45, g: 0.58, b: 0.75, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.sceneBindGroup);

    const objData = new Float32Array(36);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const slot = this.getObjectSlot(i);
      const mesh = this.getOrCreateMesh(item.geometry);
      const mat = item.material;

      const roughByte = Math.round(Math.max(0.05, Math.min(0.98, mat.roughness ?? 0.4)) * 255);
      const metalFrac = Math.max(0.0, Math.min(0.98, mat.metallic ?? 0.5));
      const packedRM = roughByte + metalFrac;

      const isSkinned = item.skinJointMatrices ? 1.0 : 0.0;
      const hasBaseTex = mat.baseColorTexture ? 1.0 : 0.0;
      const hasNormalTex = mat.normalTexture ? 1.0 : 0.0;
      const hasOrmTex = mat.ormTexture ? 1.0 : 0.0;

      objData.set(item.modelMatrix.elements, 0);
      objData[16] = mat.baseColor[0];
      objData[17] = mat.baseColor[1];
      objData[18] = mat.baseColor[2];
      objData[19] = mat.baseColor[3];
      objData[20] = mat.emissive[0];
      objData[21] = mat.emissive[1];
      objData[22] = mat.emissive[2];
      objData[23] = mat.emissiveIntensity;
      objData[24] = mat.isSky ? 1.0 : 0.0;
      objData[25] = mat.isGround ? 1.0 : 0.0;
      objData[26] = mat.rimIntensity ?? 0.45;
      objData[27] = packedRM;
      objData[28] = isSkinned;
      objData[29] = hasBaseTex;
      objData[30] = hasNormalTex;
      objData[31] = hasOrmTex;
      objData[32] = mat.normalScale ?? 1.0;
      objData[33] = mat.occlusionStrength ?? 1.0;
      objData[34] = 0.0;
      objData[35] = 0.0;

      this.device.queue.writeBuffer(slot.uniformBuffer, 0, objData);

      let skinBuf = this.defaultIdentitySkinBuffer;
      if (item.skinJointMatrices) {
        const len = Math.min(item.skinJointMatrices.byteLength, MAX_SKIN_JOINTS * 16 * 4);
        this.device.queue.writeBuffer(
          slot.skinBuffer,
          0,
          item.skinJointMatrices.buffer,
          item.skinJointMatrices.byteOffset,
          len
        );
        skinBuf = slot.skinBuffer;
      }

      const baseTexView = this.getOrCreateTextureView(mat.baseColorTexture, this.defaultWhiteTex);
      const normTexView = this.getOrCreateTextureView(mat.normalTexture, this.defaultNormalTex);
      const ormTexView = this.getOrCreateTextureView(mat.ormTexture, this.defaultOrmTex);

      const bindGroup = this.device.createBindGroup({
        layout: this.objectBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: slot.uniformBuffer } },
          { binding: 1, resource: { buffer: skinBuf } },
          { binding: 2, resource: baseTexView },
          { binding: 3, resource: normTexView },
          { binding: 4, resource: ormTexView },
        ],
      });

      pass.setBindGroup(1, bindGroup);
      pass.setVertexBuffer(0, mesh.vertexBuffer);
      pass.setIndexBuffer(mesh.indexBuffer, mesh.indexFormat);
      pass.drawIndexed(mesh.indexCount);
    }

    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  readLuma(): number {
    return this.worldMode === 'night' ? 0.22 : 0.54;
  }

  dispose(): void {
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }
    for (const slot of this.objectPool) {
      slot.uniformBuffer.destroy();
      slot.skinBuffer.destroy();
    }
    if (this.sceneUniformBuffer) {
      this.sceneUniformBuffer.destroy();
    }
  }
}
