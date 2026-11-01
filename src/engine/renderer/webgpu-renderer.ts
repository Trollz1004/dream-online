/**
 * DREAM Engine — Primary WebGPU Renderer
 * Pure WebGPU implementation with WGSL shaders, PBR metallic/roughness shading,
 * procedural Ancient Sanctuary stone/moss terrain, thresholded bloom, and ACES tonemapping.
 */

import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';
import { MeshGeometry } from '../scene/mesh.ts';
import { IRenderer, RenderItem } from './types.ts';
import { RenderProfileData, WorldMode } from './render-profile.ts';

interface GpuMeshCache {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexFormat: GPUIndexFormat;
  indexCount: number;
}

const WGSL_SHADER = /* wgsl */ `
struct SceneUniforms {
  viewProj: mat4x4<f32>,
  cameraPos: vec4<f32>,      // xyz = pos, w = worldMode (0=day, 1=night)
  sunDirAndExposure: vec4<f32>, // xyz = sunDir, w = exposure
  fogAndEnergy: vec4<f32>,   // x = fogDensity, y = keyEnergy, z = ambientEnergy, w = time
};

struct ObjectUniforms {
  modelMatrix: mat4x4<f32>,
  baseColor: vec4<f32>,
  emissive: vec4<f32>,       // xyz = emissive color, w = emissiveIntensity
  flags: vec4<f32>,          // x = isSky, y = isGround, z = rimIntensity, w = packed(roughness, metallic)
};

@group(0) @binding(0) var<uniform> scene: SceneUniforms;
@group(1) @binding(0) var<uniform> obj: ObjectUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) worldNormal: vec3<f32>,
  @location(2) uv: vec2<f32>,
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
  let worldPos4 = obj.modelMatrix * vec4<f32>(in.position, 1.0);
  out.worldPos = worldPos4.xyz;
  out.clipPos = scene.viewProj * worldPos4;
  let nMat = mat3x3<f32>(
    obj.modelMatrix[0].xyz,
    obj.modelMatrix[1].xyz,
    obj.modelMatrix[2].xyz
  );
  out.worldNormal = normalize(nMat * in.normal);
  out.uv = in.uv;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let isNight = scene.cameraPos.w > 0.5;
  let sunDir = normalize(scene.sunDirAndExposure.xyz);
  let viewDir = normalize(scene.cameraPos.xyz - in.worldPos);

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
  let roughness = clamp(floor(packedRM) / 255.0, 0.08, 0.98);
  let metallic = clamp(fract(packedRM), 0.0, 0.98);

  var albedo = obj.baseColor.rgb;
  var effRoughness = roughness;
  var effMetallic = metallic;
  var groundRuneEmissive = vec3<f32>(0.0);

  // 2. Varied Ancient Basalt Sanctuary Arena & Weathered Stone/Moss Terrain (Replaces flat brown grid)
  if (obj.flags.y > 0.5) {
    let arenaCenter = vec2<f32>(0.0, -8.5);
    let relP = in.worldPos.xz - arenaCenter;
    let r = length(relP);
    let angle = atan2(relP.y, relP.x);

    let macroNoise = fbm(in.worldPos.xz * 0.14);
    let microNoise = fbm(in.worldPos.xz * 1.35);
    let fineGrain = valueNoise(in.worldPos.xz * 6.5);

    // Polar sanctuary stone flagstone blocks inside the arena (r < 14.5m)
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

    // Outer terrain blends from carved flagstones into weathered mossy rock & earth
    let arenaMask = 1.0 - smoothstep(11.5, 16.5, r);
    let outerTerrain = mix(warmSandstone * 0.85, mossyEarth, smoothstep(0.35, 0.72, macroNoise));
    albedo = mix(outerTerrain * (0.85 + 0.3 * microNoise), stoneColor, arenaMask);

    // Carved sanctuary rings at r = 4.6m, 9.2m, and 13.5m
    let ring1 = 1.0 - smoothstep(0.04, 0.18, abs(r - 4.6));
    let ring2 = 1.0 - smoothstep(0.05, 0.22, abs(r - 9.2));
    let ring3 = 1.0 - smoothstep(0.06, 0.25, abs(r - 13.5));
    let runeGlowMask = max(ring1, ring2 * 0.75);
    let bronzeInlay = select(vec3<f32>(0.72, 0.56, 0.28), vec3<f32>(0.25, 0.65, 0.95), isNight);
    albedo = mix(albedo, bronzeInlay, (ring1 + ring2 + ring3) * 0.45);
    groundRuneEmissive = bronzeInlay * runeGlowMask * 0.22;

    // Perturb ground normal from flagstone joints & micro-relief for real directional shadow depth
    let bumpX = (valueNoise(in.worldPos.xz * 3.5 + vec2<f32>(0.2, 0.0)) - valueNoise(in.worldPos.xz * 3.5 - vec2<f32>(0.2, 0.0))) * 0.35;
    let bumpZ = (valueNoise(in.worldPos.xz * 3.5 + vec2<f32>(0.0, 0.2)) - valueNoise(in.worldPos.xz * 3.5 - vec2<f32>(0.0, 0.2))) * 0.35;
    N = normalize(vec3<f32>(bumpX + (1.0 - stoneJoint) * 0.18, 1.0, bumpZ));
    effRoughness = mix(0.78, 0.48, arenaMask * stoneJoint);
    effMetallic = mix(0.04, 0.22, (ring1 + ring2));

    // Dual Contact Shadows / Ambient Occlusion under Boss (0, -10) and Hero combat zone
    let distBoss = length(in.worldPos.xz - vec2<f32>(0.0, -10.0));
    let bossContactAO = smoothstep(0.35, 2.25, distBoss);
    let distHeroLine = length(vec2<f32>(in.worldPos.x, max(0.0, abs(in.worldPos.z + 5.5) - 2.2)));
    let heroContactAO = smoothstep(0.25, 1.35, distHeroLine);
    let combinedGroundAO = (0.35 + 0.65 * bossContactAO) * (0.55 + 0.45 * heroContactAO);
    albedo *= combinedGroundAO;
  } else {
    // 3. Procedural Armor / Stone Micro-Texture & Bevel Cavity Shading on 3D Meshes
    let microTex = valueNoise(in.worldPos.xy * 18.0 + in.worldPos.zy * 14.0);
    albedo *= (0.90 + 0.20 * microTex);
  }

  // 4. Shadowed Key Light, Sky/Ground Hemisphere Ambient, PBR Specular & Rim Light
  let NdotL = dot(N, sunDir);
  let shadowTerm = smoothstep(-0.15, 0.45, NdotL);
  let diff = max(NdotL, 0.0) * shadowTerm;

  let H = normalize(sunDir + viewDir);
  let NdotH = max(dot(N, H), 0.0);
  let shininess = mix(14.0, 96.0, 1.0 - effRoughness);
  let specStrength = mix(0.18, 1.15, effMetallic) * (1.0 - effRoughness * 0.65);
  let spec = pow(NdotH, shininess) * specStrength * shadowTerm;

  let keyColor = select(vec3<f32>(1.0, 0.94, 0.84), vec3<f32>(0.42, 0.56, 0.92), isNight) * scene.fogAndEnergy.y;
  let skyAmbient = select(vec3<f32>(0.36, 0.46, 0.62), vec3<f32>(0.09, 0.13, 0.24), isNight);
  let groundBounce = select(vec3<f32>(0.24, 0.19, 0.15), vec3<f32>(0.04, 0.05, 0.08), isNight);
  let hemiAmbient = mix(groundBounce, skyAmbient, clamp(N.y * 0.5 + 0.5, 0.0, 1.0)) * scene.fogAndEnergy.z;

  // Vertical & normal cavity AO so armor plates, greaves, and obelisks have strong 3D relief
  let cavityAO = clamp(0.42 + 0.58 * (N.y * 0.45 + 0.55), 0.30, 1.0);
  let diffuseColor = albedo * (1.0 - effMetallic * 0.55);
  let specColor = mix(vec3<f32>(0.96, 0.94, 0.90), albedo * 1.25 + vec3<f32>(0.12), effMetallic);

  // Environment reflection for metallic armor
  let reflDir = reflect(-viewDir, N);
  let envReflect = mix(groundBounce, skyAmbient * 1.35, clamp(reflDir.y * 0.5 + 0.5, 0.0, 1.0));
  let metalEnvContribution = envReflect * specColor * effMetallic * (1.0 - effRoughness * 0.55) * 0.55;

  let rim = pow(1.0 - max(dot(N, viewDir), 0.0), 3.0) * obj.flags.z;
  let rimColor = select(vec3<f32>(1.0, 0.84, 0.58), vec3<f32>(0.38, 0.72, 1.0), isNight);

  // Clamp raw emissive intensity so stone obelisks never blow out, while thresholded bloom boosts true VFX
  let rawEmissive = obj.emissive.rgb * min(obj.emissive.w, 2.6) + groundRuneEmissive;

  var color = (hemiAmbient * diffuseColor * cavityAO) +
              (keyColor * (diffuseColor * diff + specColor * spec)) +
              (metalEnvContribution * cavityAO) +
              (rimColor * rim * 0.38) +
              rawEmissive;

  // Thresholded Bloom Knee (only luminance > 0.85 blooms softly)
  let luma = dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
  let bloomExcess = max(0.0, luma - 0.85);
  color += color * (bloomExcess / (1.0 + bloomExcess)) * 0.28;

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

  private objectPool: { buffer: GPUBuffer; bindGroup: GPUBindGroup }[] = [];
  private meshCache = new WeakMap<MeshGeometry, GpuMeshCache>();

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

    const sceneBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
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
            arrayStride: 32,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 12, format: 'float32x3' },
              { shaderLocation: 2, offset: 24, format: 'float32x2' },
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
      layout: sceneBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.sceneUniformBuffer } }],
    });

    this.createDepthTexture();
    return true;
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
    const interleaved = new Float32Array(vCount * 8);
    for (let i = 0; i < vCount; i++) {
      const base = i * 8;
      interleaved[base + 0] = geom.positions[i * 3 + 0];
      interleaved[base + 1] = geom.positions[i * 3 + 1];
      interleaved[base + 2] = geom.positions[i * 3 + 2];
      interleaved[base + 3] = geom.normals[i * 3 + 0];
      interleaved[base + 4] = geom.normals[i * 3 + 1];
      interleaved[base + 5] = geom.normals[i * 3 + 2];
      interleaved[base + 6] = geom.uvs[i * 2 + 0];
      interleaved[base + 7] = geom.uvs[i * 2 + 1];
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

  private getObjectSlot(index: number): { buffer: GPUBuffer; bindGroup: GPUBindGroup } {
    while (this.objectPool.length <= index) {
      const buffer = this.device.createBuffer({
        size: 112,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const bindGroup = this.device.createBindGroup({
        layout: this.objectBindGroupLayout,
        entries: [{ binding: 0, resource: { buffer } }],
      });
      this.objectPool.push({ buffer, bindGroup });
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

    const objData = new Float32Array(28);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const slot = this.getObjectSlot(i);
      const mesh = this.getOrCreateMesh(item.geometry);
      const mat = item.material;

      const roughByte = Math.round(Math.max(0.05, Math.min(0.98, mat.roughness ?? 0.4)) * 255);
      const metalFrac = Math.max(0.0, Math.min(0.98, mat.metallic ?? 0.5));
      const packedRM = roughByte + metalFrac;

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

      this.device.queue.writeBuffer(slot.buffer, 0, objData);

      pass.setBindGroup(1, slot.bindGroup);
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
      slot.buffer.destroy();
    }
    if (this.sceneUniformBuffer) {
      this.sceneUniformBuffer.destroy();
    }
  }
}
