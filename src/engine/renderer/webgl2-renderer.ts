/**
 * DREAM Engine — WebGL2 Fallback Renderer
 * Full visual parity with WebGPU: PBR metallic/roughness shading, procedural Ancient Sanctuary
 * stone/moss terrain, dual contact shadows, thresholded bloom, and ACES Filmic Tonemapping.
 */

import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';
import { MeshGeometry } from '../scene/mesh.ts';
import { IRenderer, RenderItem } from './types.ts';
import { RenderProfileData, WorldMode } from './render-profile.ts';

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

uniform mat4 uViewProj;
uniform mat4 uModel;

out vec3 vWorldPos;
out vec3 vWorldNormal;
out vec2 vUv;

void main() {
  vec4 worldPos4 = uModel * vec4(aPosition, 1.0);
  vWorldPos = worldPos4.xyz;
  gl_Position = uViewProj * worldPos4;
  vWorldNormal = normalize(mat3(uModel) * aNormal);
  vUv = aUv;
}
`;

const FRAGMENT_SHADER_GLSL = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vWorldNormal;
in vec2 vUv;

uniform vec4 uCameraPos;         // xyz = pos, w = worldMode (0=day, 1=night)
uniform vec4 uSunDirAndExposure; // xyz = sunDir, w = exposure
uniform vec4 uFogAndEnergy;      // x = fogDensity, y = keyEnergy, z = ambientEnergy, w = time

uniform vec4 uBaseColor;
uniform vec4 uEmissive;          // xyz = color, w = intensity
uniform vec4 uFlags;             // x = isSky, y = isGround, z = rimIntensity, w = packed(roughness, metallic)

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
  float roughness = clamp(floor(packedRM) / 255.0, 0.08, 0.98);
  float metallic = clamp(fract(packedRM), 0.0, 0.98);

  vec3 albedo = uBaseColor.rgb;
  float effRoughness = roughness;
  float effMetallic = metallic;
  vec3 groundRuneEmissive = vec3(0.0);

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
  } else {
    float microTex = valueNoise(vWorldPos.xy * 18.0 + vWorldPos.zy * 14.0);
    albedo *= (0.90 + 0.20 * microTex);
  }

  // 4. Shadowed Key Light, Sky/Ground Hemisphere Ambient, PBR Specular & Rim Light
  float NdotL = dot(N, sunDir);
  float shadowTerm = smoothstep(-0.15, 0.45, NdotL);
  float diff = max(NdotL, 0.0) * shadowTerm;

  vec3 H = normalize(sunDir + viewDir);
  float NdotH = max(dot(N, H), 0.0);
  float shininess = mix(14.0, 96.0, 1.0 - effRoughness);
  float specStrength = mix(0.18, 1.15, effMetallic) * (1.0 - effRoughness * 0.65);
  float spec = pow(NdotH, shininess) * specStrength * shadowTerm;

  vec3 keyColor = (isNight ? vec3(0.42, 0.56, 0.92) : vec3(1.0, 0.94, 0.84)) * uFogAndEnergy.y;
  vec3 skyAmbient = isNight ? vec3(0.09, 0.13, 0.24) : vec3(0.36, 0.46, 0.62);
  vec3 groundBounce = isNight ? vec3(0.04, 0.05, 0.08) : vec3(0.24, 0.19, 0.15);
  vec3 hemiAmbient = mix(groundBounce, skyAmbient, clamp(N.y * 0.5 + 0.5, 0.0, 1.0)) * uFogAndEnergy.z;

  float cavityAO = clamp(0.42 + 0.58 * (N.y * 0.45 + 0.55), 0.30, 1.0);
  vec3 diffuseColor = albedo * (1.0 - effMetallic * 0.55);
  vec3 specColor = mix(vec3(0.96, 0.94, 0.90), albedo * 1.25 + vec3(0.12), effMetallic);

  vec3 reflDir = reflect(-viewDir, N);
  vec3 envReflect = mix(groundBounce, skyAmbient * 1.35, clamp(reflDir.y * 0.5 + 0.5, 0.0, 1.0));
  vec3 metalEnvContribution = envReflect * specColor * effMetallic * (1.0 - effRoughness * 0.55) * 0.55;

  float rim = pow(1.0 - max(dot(N, viewDir), 0.0), 3.0) * uFlags.z;
  vec3 rimColor = isNight ? vec3(0.38, 0.72, 1.0) : vec3(1.0, 0.84, 0.58);

  vec3 rawEmissive = uEmissive.rgb * min(uEmissive.w, 2.6) + groundRuneEmissive;

  vec3 color = (hemiAmbient * diffuseColor * cavityAO) +
               (keyColor * (diffuseColor * diff + specColor * spec)) +
               (metalEnvContribution * cavityAO) +
               (rimColor * rim * 0.38) +
               rawEmissive;

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float bloomExcess = max(0.0, luma - 0.85);
  color += color * (bloomExcess / (1.0 + bloomExcess)) * 0.28;

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

  private meshCache = new WeakMap<MeshGeometry, GlMeshCache>();
  private viewProjMat = new Mat4();
  private startTime = performance.now();

  private pixelBuf = new Uint8Array(4 * 4 * 4);
  private lastLuma = 0.48;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
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

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    return true;
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

    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);

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
