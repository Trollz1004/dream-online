/**
 * Island test scene — WebGPU renderer (in-house).
 * Pass order per frame:
 *   shadow (sun, depth only) -> [planar reflection] -> opaque HDR (sky, terrain, world,
 *   trees, rocks, fox, grass) -> copy HDR -> water (refraction/absorption/foam) ->
 *   elemental VFX (additive) -> bloom (bright + blur) -> sun shafts -> composite (AgX) to canvas.
 */
import { FLOATS_PER_VERTEX, type MeshBuilder } from './geometry.ts';
import { type Mat4, type Vec3, identity, invert, lookAt, multiply, ortho, perspective, transformPoint, trs, v3, clamp, smoothstep } from './math.ts';
import { hash2 } from './noise.ts';
import type { QualityTier } from './quality.ts';
import {
  BLUR_WGSL, BRIGHT_WGSL, COMMON_WGSL, COMPOSITE_WGSL, GRASS_WGSL, MESH_WGSL, SHAFTS_WGSL, SKY_WGSL, VFX_WGSL, WATER_WGSL,
} from './shaders.ts';
import {
  buildBroadleaf, buildFox, buildPine, buildRock, buildStaticScene, buildTerrain, type PointLightDef, type WindmillRig,
} from './scene.ts';
import {
  WATER_Y, grassPlacements, rockPlacements, shellSurfaceLocal, treePlacements, worldToTurtleLocal,
} from './world.ts';

const HDR_FORMAT: GPUTextureFormat = 'rgba16float';
const DEPTH_FORMAT: GPUTextureFormat = 'depth32float';
const INSTANCE_FLOATS = 20;
const FRAME_FLOATS = 164;
const CAMERA_FLOATS = 52;

interface GpuMesh {
  vbuf: GPUBuffer;
  ibuf: GPUBuffer;
  indexCount: number;
  inst: GPUBuffer;
  instCount: number;
  instCapacity: number;
}

export interface CastState { origin: Vec3; forward: Vec3; start: number; element: number; seed: number }

export interface FrameState {
  time: number;
  eye: Vec3;
  target: Vec3;
  fovY: number;
  foxBones: Mat4[];
  foxPos: Vec3;
  foxInWater: boolean;
  ripples: { x: number; z: number; t: number; s: number }[];
  cast: CastState | null;
  wind: number;
}

export interface GpuTiming { gpuMs: number | null }

export class IslandRenderer {
  canvas: HTMLCanvasElement;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;
  adapterInfo = '';
  tier!: QualityTier;
  sunDir: Vec3 = v3.norm([0.7, 0.62, 0.2]);
  tonemap: 0 | 1 = 0;
  exposure = 0.9;
  sunIntensity = 4.4;
  fogDensity = 0.0008;

  private camLayout!: GPUBindGroupLayout;
  private frameLayout!: GPUBindGroupLayout;
  private waterLayout!: GPUBindGroupLayout;
  private vfxLayout!: GPUBindGroupLayout;

  private meshPipe!: GPURenderPipeline;
  private shadowPipe!: GPURenderPipeline;
  private skyPipe!: GPURenderPipeline;
  private grassPipe!: GPURenderPipeline;
  private waterPipe!: GPURenderPipeline;
  private vfxPipe!: GPURenderPipeline;
  private brightPipe!: GPURenderPipeline;
  private blurHPipe!: GPURenderPipeline;
  private blurVPipe!: GPURenderPipeline;
  private shaftPipe!: GPURenderPipeline;
  private compositePipe!: GPURenderPipeline;

  private camUbo!: GPUBuffer;
  private reflCamUbo!: GPUBuffer;
  private frameUbo!: GPUBuffer;
  private bonesSb!: GPUBuffer;
  private vfxUbo!: GPUBuffer;
  private shaftUbo!: GPUBuffer;
  private compUbo!: GPUBuffer;
  private camBG!: GPUBindGroup;
  private reflCamBG!: GPUBindGroup;
  private frameBG!: GPUBindGroup;
  private frameShadowBG!: GPUBindGroup;
  private waterBG!: GPUBindGroup;
  private vfxBG!: GPUBindGroup;
  private brightBG!: GPUBindGroup;
  private blurHBG!: GPUBindGroup;
  private blurVBG!: GPUBindGroup;
  private shaftBG!: GPUBindGroup;
  private compositeBG!: GPUBindGroup;

  private linearSampler!: GPUSampler;
  private shadowSampler!: GPUSampler;
  private shadowTex!: GPUTexture;
  private dummyDepth!: GPUTexture;
  private hdr!: GPUTexture;
  private hdrCopy!: GPUTexture;
  private depth!: GPUTexture;
  private refl!: GPUTexture;
  private reflDepth!: GPUTexture;
  private bloomA!: GPUTexture;
  private bloomB!: GPUTexture;
  private shafts!: GPUTexture;
  private black!: GPUTexture;

  private terrain: GpuMesh | null = null;
  private world: GpuMesh | null = null;
  private fox: GpuMesh | null = null;
  private rocks: GpuMesh | null = null;
  private treeMeshes: GpuMesh[] = [];
  private grassBuf: GPUBuffer | null = null;
  private grassCount = 0;
  private windmills: WindmillRig[] = [];
  private lanterns: PointLightDef[] = [];
  private treeInstances: Float32Array[] = [];
  private lastLodUpdate = -1;

  private renderW = 0;
  private renderH = 0;
  private frameData = new Float32Array(FRAME_FLOATS);
  private bonesData = new Float32Array(32 * 16);

  private timestamps = false;
  private querySet: GPUQuerySet | null = null;
  private queryResolve: GPUBuffer | null = null;
  private queryReadback: GPUBuffer[] = [];
  private readbackBusy: boolean[] = [];
  private readbackIndex = 0;
  gpuMs: number | null = null;
  triangles = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(tier: QualityTier, fallback = false): Promise<boolean> {
    if (!('gpu' in navigator)) return false;
    const adapter = await navigator.gpu.requestAdapter(fallback ? { forceFallbackAdapter: true } : { powerPreference: 'high-performance' });
    if (!adapter) return false;
    const info = (adapter as GPUAdapter & { info?: GPUAdapterInfo }).info;
    this.adapterInfo = info ? `${info.vendor || ''} ${info.architecture || ''} ${info.description || ''}`.trim() : 'WebGPU adapter';
    this.timestamps = adapter.features.has('timestamp-query');
    this.device = await adapter.requestDevice({
      requiredFeatures: this.timestamps ? ['timestamp-query'] : [],
      requiredLimits: { maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize },
    });
    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });
    this.createStatic();
    this.createPipelines();
    if (this.timestamps) {
      this.querySet = this.device.createQuerySet({ type: 'timestamp', count: 2 });
      this.queryResolve = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
      for (let i = 0; i < 8; i++) {
        this.queryReadback.push(this.device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }));
        this.readbackBusy.push(false);
      }
    }
    this.setTier(tier);
    return true;
  }

  // -------------------------------------------------------------------------
  private createStatic() {
    const d = this.device;
    const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    this.camLayout = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: VF, buffer: { type: 'uniform' } }] });
    this.frameLayout = d.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
        { binding: 1, visibility: VF, texture: { sampleType: 'depth' } },
        { binding: 2, visibility: VF, sampler: { type: 'comparison' } },
        { binding: 3, visibility: VF, buffer: { type: 'read-only-storage' } },
      ],
    });
    this.waterLayout = d.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      ],
    });
    this.vfxLayout = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: VF, buffer: { type: 'uniform' } }] });

    const ubo = (floats: number) => d.createBuffer({ size: floats * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.camUbo = ubo(CAMERA_FLOATS);
    this.reflCamUbo = ubo(CAMERA_FLOATS);
    this.frameUbo = ubo(FRAME_FLOATS);
    this.vfxUbo = ubo(12);
    this.shaftUbo = ubo(8);
    this.compUbo = ubo(4);
    this.bonesSb = d.createBuffer({ size: 32 * 64, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    for (let i = 0; i < 32; i++) this.bonesData.set(identity(), i * 16);

    this.linearSampler = d.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    this.shadowSampler = d.createSampler({ compare: 'less', magFilter: 'linear', minFilter: 'linear' });
    this.dummyDepth = d.createTexture({ size: [1, 1], format: DEPTH_FORMAT, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT });
    this.black = d.createTexture({ size: [1, 1], format: HDR_FORMAT, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });

    this.camBG = d.createBindGroup({ layout: this.camLayout, entries: [{ binding: 0, resource: { buffer: this.camUbo } }] });
    this.reflCamBG = d.createBindGroup({ layout: this.camLayout, entries: [{ binding: 0, resource: { buffer: this.reflCamUbo } }] });
    this.vfxBG = d.createBindGroup({ layout: this.vfxLayout, entries: [{ binding: 0, resource: { buffer: this.vfxUbo } }] });
    this.frameShadowBG = d.createBindGroup({
      layout: this.frameLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frameUbo } },
        { binding: 1, resource: this.dummyDepth.createView() },
        { binding: 2, resource: this.shadowSampler },
        { binding: 3, resource: { buffer: this.bonesSb } },
      ],
    });
  }

  private module(code: string): GPUShaderModule {
    const m = this.device.createShaderModule({ code });
    m.getCompilationInfo().then((info) => {
      for (const msg of info.messages) {
        if (msg.type === 'error') console.error(`[island WGSL] ${msg.lineNum}:${msg.linePos} ${msg.message}`);
      }
    });
    return m;
  }

  private createPipelines() {
    const d = this.device;
    const meshMod = this.module(COMMON_WGSL + MESH_WGSL);
    const skyMod = this.module(COMMON_WGSL + SKY_WGSL);
    const grassMod = this.module(COMMON_WGSL + GRASS_WGSL);
    const waterMod = this.module(COMMON_WGSL + WATER_WGSL);
    const vfxMod = this.module(COMMON_WGSL + VFX_WGSL);
    const base = d.createPipelineLayout({ bindGroupLayouts: [this.camLayout, this.frameLayout] });
    const waterL = d.createPipelineLayout({ bindGroupLayouts: [this.camLayout, this.frameLayout, this.waterLayout] });
    const vfxL = d.createPipelineLayout({ bindGroupLayouts: [this.camLayout, this.frameLayout, this.vfxLayout] });

    const meshBuffers: GPUVertexBufferLayout[] = [
      {
        arrayStride: FLOATS_PER_VERTEX * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32x3' },
          { shaderLocation: 2, offset: 24, format: 'float32x3' },
          { shaderLocation: 3, offset: 36, format: 'float32' },
          { shaderLocation: 4, offset: 40, format: 'float32' },
          { shaderLocation: 5, offset: 44, format: 'float32' },
          { shaderLocation: 6, offset: 48, format: 'float32' },
        ],
      },
      {
        arrayStride: INSTANCE_FLOATS * 4,
        stepMode: 'instance',
        attributes: [
          { shaderLocation: 7, offset: 0, format: 'float32x4' },
          { shaderLocation: 8, offset: 16, format: 'float32x4' },
          { shaderLocation: 9, offset: 32, format: 'float32x4' },
          { shaderLocation: 10, offset: 48, format: 'float32x4' },
          { shaderLocation: 11, offset: 64, format: 'float32x4' },
        ],
      },
    ];
    const depthOn: GPUDepthStencilState = { format: DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: 'less' };
    this.meshPipe = d.createRenderPipeline({
      layout: base,
      vertex: { module: meshMod, entryPoint: 'vs_main', buffers: meshBuffers },
      fragment: { module: meshMod, entryPoint: 'fs_main', targets: [{ format: HDR_FORMAT }] },
      primitive: { topology: 'triangle-list', cullMode: 'back', frontFace: 'ccw' },
      depthStencil: depthOn,
    });
    this.shadowPipe = d.createRenderPipeline({
      layout: base,
      vertex: { module: meshMod, entryPoint: 'vs_shadow', buffers: meshBuffers },
      fragment: { module: meshMod, entryPoint: 'fs_shadow', targets: [] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: 'less', depthBias: 2, depthBiasSlopeScale: 2.5, depthBiasClamp: 0.01 },
    });
    this.skyPipe = d.createRenderPipeline({
      layout: base,
      vertex: { module: skyMod, entryPoint: 'vs_sky' },
      fragment: { module: skyMod, entryPoint: 'fs_sky', targets: [{ format: HDR_FORMAT }] },
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: false, depthCompare: 'always' },
    });
    this.grassPipe = d.createRenderPipeline({
      layout: base,
      vertex: {
        module: grassMod, entryPoint: 'vs_grass',
        buffers: [{ arrayStride: 32, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }, { shaderLocation: 1, offset: 16, format: 'float32x4' }] }],
      },
      fragment: { module: grassMod, entryPoint: 'fs_grass', targets: [{ format: HDR_FORMAT }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depthOn,
    });
    this.waterPipe = d.createRenderPipeline({
      layout: waterL,
      vertex: { module: waterMod, entryPoint: 'vs_water' },
      fragment: { module: waterMod, entryPoint: 'fs_water', targets: [{ format: HDR_FORMAT }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
    });
    this.vfxPipe = d.createRenderPipeline({
      layout: vfxL,
      vertex: { module: vfxMod, entryPoint: 'vs_vfx' },
      fragment: {
        module: vfxMod, entryPoint: 'fs_vfx',
        targets: [{ format: HDR_FORMAT, blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' } } }],
      },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: false, depthCompare: 'less' },
    });
    const post = (code: string, entry: string, format: GPUTextureFormat) => {
      const m = this.module(code);
      return d.createRenderPipeline({
        layout: 'auto',
        vertex: { module: m, entryPoint: 'vs_full' },
        fragment: { module: m, entryPoint: entry, targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });
    };
    this.brightPipe = post(BRIGHT_WGSL, 'fs_bright', HDR_FORMAT);
    this.blurHPipe = post(BLUR_WGSL, 'fs_blurH', HDR_FORMAT);
    this.blurVPipe = post(BLUR_WGSL, 'fs_blurV', HDR_FORMAT);
    this.shaftPipe = post(SHAFTS_WGSL, 'fs_shafts', HDR_FORMAT);
    this.compositePipe = post(COMPOSITE_WGSL, 'fs_composite', this.format);
  }

  // -------------------------------------------------------------------------
  private upload(b: MeshBuilder, instances: Float32Array, capacity?: number): GpuMesh {
    const d = this.device;
    const { vertices, indices } = b.build();
    const vbuf = d.createBuffer({ size: Math.max(16, vertices.byteLength), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    d.queue.writeBuffer(vbuf, 0, vertices);
    const ibuf = d.createBuffer({ size: Math.max(16, indices.byteLength), usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    d.queue.writeBuffer(ibuf, 0, indices);
    const cap = Math.max(1, capacity ?? instances.length / INSTANCE_FLOATS);
    const inst = d.createBuffer({ size: cap * INSTANCE_FLOATS * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    if (instances.length) d.queue.writeBuffer(inst, 0, instances);
    return { vbuf, ibuf, indexCount: indices.length, inst, instCount: instances.length / INSTANCE_FLOATS, instCapacity: cap };
  }

  private static identityInstance(): Float32Array {
    const a = new Float32Array(INSTANCE_FLOATS);
    a.set(identity(), 0);
    a.set([0, 0, 0, 1], 16);
    return a;
  }

  private destroyMesh(m: GpuMesh | null) {
    if (!m) return;
    m.vbuf.destroy(); m.ibuf.destroy(); m.inst.destroy();
  }

  setTier(tier: QualityTier) {
    this.tier = tier;
    const t0 = performance.now();
    [this.terrain, this.world, this.fox, this.rocks, ...this.treeMeshes].forEach((m) => this.destroyMesh(m));
    this.grassBuf?.destroy();

    this.terrain = this.upload(buildTerrain(tier.terrainRes), IslandRenderer.identityInstance());
    const scene = buildStaticScene(tier.sphereDetail);
    this.windmills = scene.windmills;
    this.lanterns = scene.lanterns;
    this.world = this.upload(scene.world, IslandRenderer.identityInstance());
    this.fox = this.upload(buildFox(), IslandRenderer.identityInstance());

    // Rocks (prefix of the persistent list).
    const rp = rockPlacements().slice(0, tier.rockCount);
    const rockInst = new Float32Array(rp.length * INSTANCE_FLOATS);
    rp.forEach((r, i) => {
      rockInst.set(trs([r.x, r.y, r.z], [r.tilt, r.yaw, r.tilt * 0.5], r.scale), i * INSTANCE_FLOATS);
      rockInst.set([0, 0, 0, 1], i * INSTANCE_FLOATS + 16);
    });
    this.rocks = this.upload(buildRock(), rockInst);

    // Trees: broadleaf/pine x LOD0/LOD1 buckets (instances rewritten on LOD update).
    const trees = treePlacements().slice(0, tier.treeCount);
    this.treeInstances = [];
    const all: { m: Float32Array; pine: boolean; pos: Vec3 }[] = [];
    for (const tp of trees) {
      let y = tp.y;
      if (Number.isNaN(y)) {
        const [lx, lz] = worldToTurtleLocal(tp.x, tp.z);
        y = shellSurfaceLocal(lx, lz) - 0.4;
      }
      const m = new Float32Array(INSTANCE_FLOATS);
      m.set(trs([tp.x, y, tp.z], [0, tp.yaw, 0], tp.scale), 0);
      m.set([hash2(Math.round(tp.x * 10), Math.round(tp.z * 10)) * 6.28, 1, tp.tint, 1], 16);
      all.push({ m, pine: tp.tint < 0.28 && tp.kind === 0, pos: [tp.x, y, tp.z] });
    }
    (this as unknown as { allTrees: typeof all }).allTrees = all;
    const cap = Math.max(1, all.length);
    this.treeMeshes = [
      this.upload(buildBroadleaf(0), new Float32Array(0), cap),
      this.upload(buildBroadleaf(1), new Float32Array(0), cap),
      this.upload(buildPine(0), new Float32Array(0), cap),
      this.upload(buildPine(1), new Float32Array(0), cap),
    ];
    this.lastLodUpdate = -1;

    // Grass.
    const gp = grassPlacements().slice(0, tier.grassCount);
    const gd = new Float32Array(Math.max(1, gp.length) * 8);
    gp.forEach((g, i) => gd.set([g.x, g.y - 0.02, g.z, g.yaw, g.height, g.tint, 0, 0], i * 8));
    this.grassBuf = this.device.createBuffer({ size: gd.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.device.queue.writeBuffer(this.grassBuf, 0, gd);
    this.grassCount = gp.length;

    this.shadowTex?.destroy();
    this.shadowTex = this.device.createTexture({ size: [tier.shadowMapSize, tier.shadowMapSize], format: DEPTH_FORMAT, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    this.frameBG = this.device.createBindGroup({
      layout: this.frameLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frameUbo } },
        { binding: 1, resource: this.shadowTex.createView() },
        { binding: 2, resource: this.shadowSampler },
        { binding: 3, resource: { buffer: this.bonesSb } },
      ],
    });
    this.renderW = 0; // force target rebuild
    this.triangles = [this.terrain, this.world, this.fox].reduce((s, m) => s + (m ? m.indexCount / 3 : 0), 0);
    console.info(`[island] tier ${tier.name} built in ${(performance.now() - t0).toFixed(0)} ms`);
  }

  private ensureTargets() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.tier.maxDpr);
    const cw = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const ch = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw; this.canvas.height = ch;
    }
    const w = Math.max(1, Math.floor(cw * this.tier.renderScale));
    const h = Math.max(1, Math.floor(ch * this.tier.renderScale));
    if (w === this.renderW && h === this.renderH) return;
    this.renderW = w; this.renderH = h;
    const d = this.device;
    [this.hdr, this.hdrCopy, this.depth, this.refl, this.reflDepth, this.bloomA, this.bloomB, this.shafts].forEach((t) => t?.destroy());
    const tex = (tw: number, th: number, format: GPUTextureFormat, usage: number) => d.createTexture({ size: [Math.max(1, tw), Math.max(1, th)], format, usage });
    const RT = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    this.hdr = tex(w, h, HDR_FORMAT, RT | GPUTextureUsage.COPY_SRC);
    this.hdrCopy = tex(w, h, HDR_FORMAT, GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST);
    this.depth = tex(w, h, DEPTH_FORMAT, RT);
    const rs = this.tier.reflections === 2 ? 1 : 0.5;
    this.refl = tex(Math.floor(w * rs), Math.floor(h * rs), HDR_FORMAT, RT);
    this.reflDepth = tex(Math.floor(w * rs), Math.floor(h * rs), DEPTH_FORMAT, RT);
    this.bloomA = tex(w >> 1, h >> 1, HDR_FORMAT, RT);
    this.bloomB = tex(w >> 1, h >> 1, HDR_FORMAT, RT);
    this.shafts = tex(w >> 1, h >> 1, HDR_FORMAT, RT);

    this.waterBG = d.createBindGroup({
      layout: this.waterLayout,
      entries: [
        { binding: 0, resource: this.hdrCopy.createView() },
        { binding: 1, resource: this.depth.createView() },
        { binding: 2, resource: this.tier.reflections ? this.refl.createView() : this.black.createView() },
        { binding: 3, resource: this.linearSampler },
      ],
    });
    const pbg = (pipe: GPURenderPipeline, entries: GPUBindGroupEntry[]) => d.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries });
    this.brightBG = pbg(this.brightPipe, [{ binding: 0, resource: this.hdr.createView() }, { binding: 1, resource: this.linearSampler }]);
    this.blurHBG = pbg(this.blurHPipe, [{ binding: 0, resource: this.bloomA.createView() }, { binding: 1, resource: this.linearSampler }]);
    this.blurVBG = pbg(this.blurVPipe, [{ binding: 0, resource: this.bloomB.createView() }, { binding: 1, resource: this.linearSampler }]);
    this.shaftBG = pbg(this.shaftPipe, [{ binding: 0, resource: this.depth.createView() }, { binding: 1, resource: { buffer: this.shaftUbo } }]);
    this.compositeBG = pbg(this.compositePipe, [
      { binding: 0, resource: this.hdr.createView() },
      { binding: 1, resource: (this.tier.bloom ? this.bloomA : this.black).createView() },
      { binding: 2, resource: (this.tier.sunShaftSamples > 0 ? this.shafts : this.black).createView() },
      { binding: 3, resource: this.linearSampler },
      { binding: 4, resource: { buffer: this.compUbo } },
    ]);
  }

  // -------------------------------------------------------------------------
  private writeCamera(buf: GPUBuffer, eye: Vec3, target: Vec3, fovY: number, aspect: number, clip: boolean): { viewProj: Mat4; view: Mat4 } {
    const near = 0.1, far = 2600;
    const view = lookAt(eye, target, [0, 1, 0]);
    const proj = perspective(fovY, aspect, near, far);
    const viewProj = multiply(proj, view);
    const data = new Float32Array(CAMERA_FLOATS);
    data.set(viewProj, 0);
    data.set(invert(viewProj), 16);
    data.set([eye[0], eye[1], eye[2], 0], 32);
    data.set([clip ? 1 : 0, WATER_Y - 0.05, near, far], 36);
    data.set([this.renderW, this.renderH, 1 / this.renderW, 1 / this.renderH], 40);
    data.set([view[0], view[4], view[8], 0], 44);
    data.set([view[1], view[5], view[9], 0], 48);
    this.device.queue.writeBuffer(buf, 0, data);
    return { viewProj, view };
  }

  private updateTreeLods(eye: Vec3, time: number) {
    if (this.lastLodUpdate >= 0 && time - this.lastLodUpdate < 0.25) return;
    this.lastLodUpdate = time;
    const all = (this as unknown as { allTrees: { m: Float32Array; pine: boolean; pos: Vec3 }[] }).allTrees || [];
    const buckets: Float32Array[] = this.treeMeshes.map((m) => new Float32Array(m.instCapacity * INSTANCE_FLOATS));
    const counts = [0, 0, 0, 0];
    const lodD2 = this.tier.treeLodDistance ** 2;
    for (const t of all) {
      const dx = t.pos[0] - eye[0], dz = t.pos[2] - eye[2];
      const far = dx * dx + dz * dz > lodD2;
      const k = (t.pine ? 2 : 0) + (far ? 1 : 0);
      buckets[k].set(t.m, counts[k] * INSTANCE_FLOATS);
      counts[k]++;
    }
    this.treeMeshes.forEach((m, i) => {
      m.instCount = counts[i];
      if (counts[i]) this.device.queue.writeBuffer(m.inst, 0, buckets[i], 0, counts[i] * INSTANCE_FLOATS);
    });
  }

  private drawMesh(pass: GPURenderPassEncoder, m: GpuMesh | null) {
    if (!m || !m.instCount || !m.indexCount) return;
    pass.setVertexBuffer(0, m.vbuf);
    pass.setVertexBuffer(1, m.inst);
    pass.setIndexBuffer(m.ibuf, 'uint32');
    pass.drawIndexed(m.indexCount, m.instCount);
  }

  private drawOpaque(pass: GPURenderPassEncoder, withGrass: boolean, withSky: boolean) {
    if (withSky) {
      pass.setPipeline(this.skyPipe);
      pass.draw(3);
    }
    pass.setPipeline(this.meshPipe);
    this.drawMesh(pass, this.terrain);
    this.drawMesh(pass, this.world);
    this.drawMesh(pass, this.rocks);
    for (const t of this.treeMeshes) this.drawMesh(pass, t);
    this.drawMesh(pass, this.fox);
    if (withGrass && this.grassBuf && this.grassCount) {
      pass.setPipeline(this.grassPipe);
      pass.setVertexBuffer(0, this.grassBuf);
      pass.draw(15, this.grassCount);
    }
  }

  render(s: FrameState) {
    this.ensureTargets();
    const d = this.device;
    const tier = this.tier;
    const aspect = this.renderW / this.renderH;
    const L = this.sunDir;

    // Cameras.
    const main = this.writeCamera(this.camUbo, s.eye, s.target, s.fovY, aspect, false);
    if (tier.reflections) {
      this.writeCamera(this.reflCamUbo, [s.eye[0], 2 * WATER_Y - s.eye[1], s.eye[2]], [s.target[0], 2 * WATER_Y - s.target[1], s.target[2]], s.fovY, aspect, true);
    }

    // Sun shadow box: centred ahead of the player, snapped to texels to stop shimmer.
    const fwd = v3.norm([s.target[0] - s.eye[0], 0, s.target[2] - s.eye[2]]);
    const range = tier.shadowRange;
    const center = v3.add(s.foxPos, v3.scale(fwd, range * 0.45));
    const lightView = lookAt(L, [0, 0, 0], Math.abs(L[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0]);
    const lc = transformPoint(lightView, center);
    const texelWorld = (2 * range) / tier.shadowMapSize;
    const sx = Math.round(lc[0] / texelWorld) * texelWorld;
    const sy = Math.round(lc[1] / texelWorld) * texelWorld;
    const lightProj = ortho(sx - range, sx + range, sy - range, sy + range, -lc[2] - 260, -lc[2] + 260);
    const lightViewProj = multiply(lightProj, lightView);

    // Frame uniforms.
    const f = this.frameData;
    f.fill(0);
    f.set(lightViewProj, 0);
    f.set([L[0], L[1], L[2], this.sunIntensity], 16);
    f.set([1.0, 0.9, 0.76, 0], 20);
    f.set([0.2, 0.43, 0.95, 0], 24);
    f.set([0.6, 0.74, 0.9, 0].map((x) => x * 1.05), 28);
    f.set([0.42, 0.37, 0.28, 0].map((x) => x * 0.5), 32);
    f.set([s.time, tier.shadowTaps, tier.detailNormals ? 1 : 0, tier.caustics ? 1 : 0], 36);
    f.set([this.fogDensity, 1 / tier.shadowMapSize, tier.grassDistance, this.exposure], 40);
    f.set([s.foxPos[0], s.foxPos[1], s.foxPos[2], s.foxInWater ? 1 : 0], 44);
    const lights: { pos: Vec3; color: Vec3; radius: number; intensity: number }[] = this.lanterns.map((l) => ({ ...l, intensity: 2.2 }));
    if (s.cast) {
      const age = s.time - s.cast.start;
      const env = smoothstep(0, 0.2, age) * (1 - smoothstep(0.6, 2.2, age));
      if (env > 0) {
        const colors: Vec3[] = [[1.0, 0.6, 0.25], [0.35, 0.8, 1.0], [0.75, 0.95, 0.85], [0.95, 0.75, 0.4]];
        lights.unshift({
          pos: v3.add(s.cast.origin, v3.add(v3.scale(s.cast.forward, 1.6), [0, 0.7, 0])),
          color: colors[s.cast.element], radius: 7, intensity: 3.5 * env,
        });
      }
    }
    const nLights = Math.min(8, lights.length);
    f.set([nLights, Math.min(12, s.ripples.length), tier.reflections ? 1 : 0, s.wind], 48);
    for (let i = 0; i < nLights; i++) {
      const l = lights[i];
      f.set([l.pos[0], l.pos[1], l.pos[2], l.radius, l.color[0], l.color[1], l.color[2], l.intensity], 52 + i * 8);
    }
    s.ripples.slice(0, 12).forEach((r, i) => f.set([r.x, r.z, r.t, r.s], 116 + i * 4));
    d.queue.writeBuffer(this.frameUbo, 0, f);

    // Bones: fox 0..10, windmill sails 16..19.
    s.foxBones.forEach((m, i) => this.bonesData.set(m, i * 16));
    for (const w of this.windmills) {
      this.bonesData.set(rotateSail(w, s.time), w.bone * 16);
    }
    d.queue.writeBuffer(this.bonesSb, 0, this.bonesData);

    // VFX.
    if (s.cast) {
      const c = s.cast;
      d.queue.writeBuffer(this.vfxUbo, 0, new Float32Array([
        c.origin[0], c.origin[1], c.origin[2], c.start,
        c.forward[0], c.forward[1], c.forward[2], c.element,
        2.2, tier.name === 'low' ? 90 : 180, 1.0, c.seed,
      ]));
    }

    // Shafts + composite params.
    const sunClip = multiplyVec4(main.viewProj, [s.eye[0] + L[0] * 1000, s.eye[1] + L[1] * 1000, s.eye[2] + L[2] * 1000, 1]);
    let shaftStrength = 0;
    let sunUv: [number, number] = [0.5, -1];
    if (sunClip[3] > 0) {
      sunUv = [sunClip[0] / sunClip[3] * 0.5 + 0.5, 0.5 - sunClip[1] / sunClip[3] * 0.5];
      const off = Math.max(Math.abs(sunUv[0] - 0.5), Math.abs(sunUv[1] - 0.5));
      shaftStrength = (1 - smoothstep(0.5, 1.1, off)) * 0.55;
    }
    d.queue.writeBuffer(this.shaftUbo, 0, new Float32Array([sunUv[0], sunUv[1], tier.sunShaftSamples, shaftStrength, 1.0, 0.86, 0.66, 0]));
    d.queue.writeBuffer(this.compUbo, 0, new Float32Array([this.exposure, tier.bloom ? 0.07 : 0, tier.sunShaftSamples > 0 ? 0.6 : 0, this.tonemap]));

    this.updateTreeLods(s.eye, s.time);

    const enc = d.createCommandEncoder();
    const ts = (begin: boolean, end: boolean): GPURenderPassTimestampWrites | undefined => {
      if (!this.querySet) return undefined;
      const w: GPURenderPassTimestampWrites = { querySet: this.querySet };
      if (begin) w.beginningOfPassWriteIndex = 0;
      if (end) w.endOfPassWriteIndex = 1;
      return w;
    };

    // 1. Shadow.
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [],
        depthStencilAttachment: { view: this.shadowTex.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' },
        timestampWrites: ts(true, false),
      });
      pass.setPipeline(this.shadowPipe);
      pass.setBindGroup(0, this.camBG);
      pass.setBindGroup(1, this.frameShadowBG);
      this.drawMesh(pass, this.world);
      this.drawMesh(pass, this.rocks);
      for (const t of this.treeMeshes) this.drawMesh(pass, t);
      this.drawMesh(pass, this.fox);
      pass.end();
    }
    // 2. Planar reflection.
    if (tier.reflections) {
      const pass = enc.beginRenderPass({
        colorAttachments: [{ view: this.refl.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
        depthStencilAttachment: { view: this.reflDepth.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' },
      });
      pass.setBindGroup(0, this.reflCamBG);
      pass.setBindGroup(1, this.frameBG);
      this.drawOpaque(pass, false, true);
      pass.end();
    }
    // 3. Opaque HDR.
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [{ view: this.hdr.createView(), clearValue: { r: 0.6, g: 0.75, b: 0.9, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
        depthStencilAttachment: { view: this.depth.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' },
      });
      pass.setBindGroup(0, this.camBG);
      pass.setBindGroup(1, this.frameBG);
      this.drawOpaque(pass, true, true);
      pass.end();
    }
    // 4. Water.
    enc.copyTextureToTexture({ texture: this.hdr }, { texture: this.hdrCopy }, [this.renderW, this.renderH]);
    {
      const pass = enc.beginRenderPass({ colorAttachments: [{ view: this.hdr.createView(), loadOp: 'load', storeOp: 'store' }] });
      pass.setPipeline(this.waterPipe);
      pass.setBindGroup(0, this.camBG);
      pass.setBindGroup(1, this.frameBG);
      pass.setBindGroup(2, this.waterBG);
      pass.draw(6);
      pass.end();
    }
    // 5. Elemental VFX.
    if (s.cast && s.time - s.cast.start < 2.3) {
      const pass = enc.beginRenderPass({
        colorAttachments: [{ view: this.hdr.createView(), loadOp: 'load', storeOp: 'store' }],
        depthStencilAttachment: { view: this.depth.createView(), depthReadOnly: true },
      });
      pass.setPipeline(this.vfxPipe);
      pass.setBindGroup(0, this.camBG);
      pass.setBindGroup(1, this.frameBG);
      pass.setBindGroup(2, this.vfxBG);
      pass.draw(6, tier.name === 'low' ? 90 : 180);
      pass.end();
    }
    // 6. Bloom.
    const fullscreen = (pipe: GPURenderPipeline, bg: GPUBindGroup, target: GPUTexture, tsw?: GPURenderPassTimestampWrites, view?: GPUTextureView) => {
      const pass = enc.beginRenderPass({ colorAttachments: [{ view: view ?? target.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }], timestampWrites: tsw });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, bg);
      pass.draw(3);
      pass.end();
    };
    if (tier.bloom) {
      fullscreen(this.brightPipe, this.brightBG, this.bloomA);
      fullscreen(this.blurHPipe, this.blurHBG, this.bloomB);
      fullscreen(this.blurVPipe, this.blurVBG, this.bloomA);
    }
    if (tier.sunShaftSamples > 0) fullscreen(this.shaftPipe, this.shaftBG, this.shafts);
    // 7. Composite.
    fullscreen(this.compositePipe, this.compositeBG, this.hdr, ts(false, true), this.context.getCurrentTexture().createView());

    let rb: GPUBuffer | null = null;
    let rbIndex = -1;
    if (this.querySet && this.queryResolve) {
      enc.resolveQuerySet(this.querySet, 0, 2, this.queryResolve, 0);
      rbIndex = this.readbackIndex;
      if (!this.readbackBusy[rbIndex]) {
        rb = this.queryReadback[rbIndex];
        enc.copyBufferToBuffer(this.queryResolve, 0, rb, 0, 16);
        this.readbackIndex = (this.readbackIndex + 1) % this.queryReadback.length;
      }
    }
    d.queue.submit([enc.finish()]);
    if (rb) {
      const idx = rbIndex;
      this.readbackBusy[idx] = true;
      rb.mapAsync(GPUMapMode.READ).then(() => {
        const v = new BigUint64Array(rb!.getMappedRange());
        const ns = Number(v[1] - v[0]);
        if (ns > 0 && ns < 1e9) this.gpuMs = ns / 1e6;
        rb!.unmap();
        this.readbackBusy[idx] = false;
      }).catch(() => { this.readbackBusy[idx] = false; });
    }
  }
}

function multiplyVec4(m: Mat4, v: [number, number, number, number]): [number, number, number, number] {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
    m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3],
  ];
}

function rotateSail(w: WindmillRig, time: number): Mat4 {
  // Persistent: sail angle is a pure function of world time, never of view.
  const angle = time * w.speed;
  const [x, y, z] = w.axis;
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  const r = new Float32Array([
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ]);
  const p = w.hub;
  const a = new Float32Array(16); a.set(identity()); a[12] = p[0]; a[13] = p[1]; a[14] = p[2];
  const b = new Float32Array(16); b.set(identity()); b[12] = -p[0]; b[13] = -p[1]; b[14] = -p[2];
  return multiply(multiply(a, r), b);
}

export { clamp };



