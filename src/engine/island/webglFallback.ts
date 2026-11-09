/**
 * Clean-room WebGL2 fallback rasterizer for the in-house island slice (`src/engine/island/`).
 * Consumes the exact same `MeshBuilder` 13-float vertex buffers, 20-float instance buffers,
 * bone matrices, and point lights as the WebGPU pipeline so headless browsers without a
 * WebGPU adapter render the identical seeded 3D island, town smith, Armor Truck, and pop-up camper.
 */
import { FLOATS_PER_VERTEX, type MeshBuilder } from './geometry.ts';
import {
  type Mat4,
  type Vec3,
  identity,
  invert,
  lookAt,
  multiply,
  perspective,
  trs,
  v3,
} from './math.ts';
import { hash2 } from './noise.ts';
import type { QualityTier } from './quality.ts';
import {
  buildArmorTruckMesh,
  buildBroadleaf,
  buildFox,
  buildPine,
  buildRock,
  buildStaticScene,
  buildTerrain,
  type PointLightDef,
  type WindmillRig,
  type WorldDayPhase,
} from './scene.ts';
import {
  WATER_Y,
  rockPlacements,
  shellSurfaceLocal,
  treePlacements,
  worldToTurtleLocal,
} from './world.ts';
import type { ArmorTruckState } from '../../game/economy/smith/index.ts';
import type { FrameState } from './renderer.ts';

const INSTANCE_FLOATS = 20;

interface GlMesh {
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
  instBo: WebGLBuffer;
  indexCount: number;
  instCount: number;
}

const SKY_VS = `#version 300 es
precision highp float;
out vec2 vNdc;
void main() {
  vec2 p[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  vNdc = p[gl_VertexID];
  gl_Position = vec4(vNdc, 0.9999, 1.0);
}
`;

const SKY_FS = `#version 300 es
precision highp float;
in vec2 vNdc;
out vec4 fragColor;
uniform mat4 uInvViewProj;
uniform vec3 uSunDir;
uniform float uSunIntensity;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform float uNightFactor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 farP = uInvViewProj * vec4(vNdc, 1.0, 1.0);
  vec4 nearP = uInvViewProj * vec4(vNdc, -1.0, 1.0);
  vec3 rd = normalize(farP.xyz / farP.w - nearP.xyz / nearP.w);
  float y = clamp(rd.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(y, 0.55));
  if (rd.y < 0.0) {
    col = uSkyHorizon * mix(1.0, 0.78, clamp(-rd.y * 4.0, 0.0, 1.0));
  }
  float sd = max(dot(rd, normalize(uSunDir)), 0.0);
  vec3 sunTint = mix(vec3(1.0, 0.9, 0.72), vec3(0.68, 0.78, 1.0), uNightFactor);
  col += sunTint * (pow(sd, 8.0) * 0.18 + pow(sd, 64.0) * 0.45) * (uSunIntensity * 0.25);
  if (uNightFactor > 0.5 && rd.y > 0.08) {
    vec2 starCell = floor(rd.xz / (rd.y + 0.15) * 90.0);
    float star = step(0.992, hash12(starCell));
    col += vec3(0.85, 0.9, 1.0) * star * smoothstep(0.08, 0.35, rd.y) * 0.65;
  }
  col = col / (col + vec3(1.0));
  col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
`;

const MESH_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNrm;
layout(location = 2) in vec3 aCol;
layout(location = 3) in float aMat;
layout(location = 4) in float aAo;
layout(location = 5) in float aBone;
layout(location = 6) in float aAux;
layout(location = 7) in vec4 iM0;
layout(location = 8) in vec4 iM1;
layout(location = 9) in vec4 iM2;
layout(location = 10) in vec4 iM3;
layout(location = 11) in vec4 iParams;

uniform mat4 uViewProj;
uniform mat4 uBones[24];

out vec3 vWorld;
out vec3 vNrm;
out vec3 vCol;
flat out int vMat;
out float vAo;

void main() {
  vec4 p = vec4(aPos, 1.0);
  vec3 n = aNrm;
  if (aBone > -0.5) {
    int bIdx = clamp(int(aBone + 0.5), 0, 23);
    mat4 bm = uBones[bIdx];
    p = bm * p;
    n = (bm * vec4(n, 0.0)).xyz;
  }
  mat4 model = mat4(iM0, iM1, iM2, iM3);
  vec3 wp = (model * p).xyz;
  vec3 wn = normalize((model * vec4(n, 0.0)).xyz);
  vWorld = wp;
  vNrm = wn;
  vCol = aCol;
  vMat = int(aMat + 0.5);
  vAo = aAo;
  gl_Position = uViewProj * vec4(wp, 1.0);
}
`;

const MESH_FS = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNrm;
in vec3 vCol;
flat in int vMat;
in float vAo;

out vec4 fragColor;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uSunIntensity;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform float uFogDensity;
uniform float uExposure;
uniform float uNightFactor;
uniform int uNumLights;
uniform vec4 uLightPosRad[8];
uniform vec4 uLightColor[8];

void main() {
  vec3 N = normalize(vNrm);
  if (!gl_FrontFacing) N = -N;
  vec3 albedo = vCol;
  float rough = 0.78;
  float metal = 0.0;
  vec3 emissive = vec3(0.0);

  if (vMat == 0) {
    // Terrain: sand near water, grass above, rock on slopes
    float slope = 1.0 - N.y;
    vec3 sand = vec3(0.78, 0.70, 0.54);
    vec3 grass = vec3(0.24, 0.39, 0.14);
    vec3 rock = vec3(0.42, 0.40, 0.36);
    float gW = smoothstep(0.8, 1.8, vWorld.y) * (1.0 - smoothstep(0.25, 0.5, slope));
    float rW = max(smoothstep(0.35, 0.55, slope), vCol.r * 0.85);
    albedo = mix(sand, grass, gW);
    albedo = mix(albedo, rock, rW);
  } else if (vMat == 9) {
    emissive = vCol * 2.8;
    albedo = vCol * 0.3;
  } else if (vMat == 12) {
    rough = 0.35;
    metal = 0.35;
  } else if (vMat == 13) {
    // Leaf card: soft radial mask + lush green
    float d = length(vCol.rg - vec2(0.5));
    if (d > 0.48) discard;
    albedo = mix(vec3(0.16, 0.33, 0.09), vec3(0.28, 0.44, 0.13), vCol.b);
  }

  vec3 L = normalize(uSunDir);
  vec3 V = normalize(uCamPos - vWorld);
  vec3 H = normalize(L + V);
  float nl = max(dot(N, L), 0.0);
  float nh = max(dot(N, H), 0.0);
  vec3 sunCol = mix(vec3(1.0, 0.92, 0.78), vec3(0.52, 0.64, 0.92), uNightFactor) * (uSunIntensity * 0.32);
  vec3 hemi = mix(vec3(0.22, 0.2, 0.18), mix(uSkyZenith, uSkyHorizon, 0.5), N.y * 0.5 + 0.5) * mix(0.65, 0.38, uNightFactor);

  float spec = pow(nh, mix(12.0, 64.0, 1.0 - rough)) * (1.0 - rough) * 0.35;
  vec3 col = albedo * (hemi * vAo + sunCol * nl) + sunCol * spec * nl;

  for (int i = 0; i < 8; i++) {
    if (i >= uNumLights) break;
    vec4 lp = uLightPosRad[i];
    vec4 lc = uLightColor[i];
    vec3 dv = lp.xyz - vWorld;
    float dist = length(dv);
    if (dist < lp.w) {
      vec3 lDir = dv / max(dist, 1e-3);
      float atten = pow(clamp(1.0 - dist / lp.w, 0.0, 1.0), 2.0) / (1.0 + dist * 0.35);
      float pnl = max(dot(N, lDir) * 0.7 + 0.3, 0.0);
      col += (albedo * pnl + vec3(0.22) * pnl) * lc.rgb * lc.w * atten;
    }
  }

  col += emissive;

  float camDist = distance(uCamPos, vWorld);
  float fogF = clamp(1.0 - exp(-camDist * uFogDensity), 0.0, 1.0);
  col = mix(col, uSkyHorizon, fogF);

  col *= uExposure;
  col = col / (col + vec3(1.0));
  col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
`;

const WATER_VS = `#version 300 es
precision highp float;
uniform mat4 uViewProj;
uniform vec3 uCamPos;
out vec3 vWorld;
void main() {
  vec2 c[6] = vec2[6](
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
    vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0)
  );
  vec2 p = c[gl_VertexID] * 900.0;
  vWorld = vec3(uCamPos.x + p.x, ${WATER_Y.toFixed(2)}, uCamPos.z + p.y);
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}
`;

const WATER_FS = `#version 300 es
precision highp float;
in vec3 vWorld;
out vec4 fragColor;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform float uTime;
uniform float uFogDensity;
uniform float uExposure;
uniform float uNightFactor;

void main() {
  vec3 V = normalize(uCamPos - vWorld);
  float wave = sin(vWorld.x * 0.45 + uTime * 1.1) * 0.04 + cos(vWorld.z * 0.38 - uTime * 0.9) * 0.04;
  vec3 N = normalize(vec3(-wave, 1.0, wave));
  float fres = 0.06 + 0.88 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
  vec3 deepWater = mix(vec3(0.04, 0.28, 0.34), vec3(0.02, 0.08, 0.14), uNightFactor);
  vec3 refl = mix(uSkyHorizon, uSkyZenith, 0.45);
  vec3 L = normalize(uSunDir);
  vec3 R = reflect(-V, N);
  float spec = pow(max(dot(R, L), 0.0), 120.0) * 1.4;
  vec3 col = mix(deepWater, refl, fres) + vec3(1.0, 0.9, 0.75) * spec;
  float camDist = distance(uCamPos, vWorld);
  float fogF = clamp(1.0 - exp(-camDist * uFogDensity), 0.0, 1.0);
  col = mix(col, uSkyHorizon, fogF);
  col *= uExposure;
  col = col / (col + vec3(1.0));
  col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
  fragColor = vec4(col, 0.88);
}
`;

function compileProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, vsSrc);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(fs);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  return prog;
}

export class IslandWebGL2Fallback {
  private gl: WebGL2RenderingContext;
  private skyProg: WebGLProgram;
  private meshProg: WebGLProgram;
  private waterProg: WebGLProgram;
  private emptyVao: WebGLVertexArrayObject;

  private terrain: GlMesh | null = null;
  private world: GlMesh | null = null;
  private armorTruck: GlMesh | null = null;
  private fox: GlMesh | null = null;
  private rocks: GlMesh | null = null;
  private treeMeshes: GlMesh[] = [];
  windmills: WindmillRig[] = [];
  lanterns: PointLightDef[] = [];
  truckLanterns: PointLightDef[] = [];
  private bonesData = new Float32Array(24 * 16);

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.skyProg = compileProgram(gl, SKY_VS, SKY_FS);
    this.meshProg = compileProgram(gl, MESH_VS, MESH_FS);
    this.waterProg = compileProgram(gl, WATER_VS, WATER_FS);
    this.emptyVao = gl.createVertexArray()!;
    for (let i = 0; i < 24; i++) this.bonesData.set(identity(), i * 16);
  }

  private upload(b: MeshBuilder, instances: Float32Array): GlMesh {
    const gl = this.gl;
    const { vertices, indices } = b.build();
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const stride = FLOATS_PER_VERTEX * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 36);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, stride, 40);
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 1, gl.FLOAT, false, stride, 44);
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 1, gl.FLOAT, false, stride, 48);

    const instBo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, instBo);
    gl.bufferData(gl.ARRAY_BUFFER, instances.byteLength ? instances : new Float32Array(INSTANCE_FLOATS), gl.DYNAMIC_DRAW);
    const instStride = INSTANCE_FLOATS * 4;
    for (let k = 0; k < 5; k++) {
      const loc = 7 + k;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, instStride, k * 16);
      gl.vertexAttribDivisor(loc, 1);
    }

    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return {
      vao,
      vbo,
      ibo,
      instBo,
      indexCount: indices.length,
      instCount: instances.length / INSTANCE_FLOATS,
    };
  }

  private static identityInstance(): Float32Array {
    const a = new Float32Array(INSTANCE_FLOATS);
    a.set(identity(), 0);
    a.set([0, 0, 0, 1], 16);
    return a;
  }

  setTier(tier: QualityTier) {
    this.terrain = this.upload(buildTerrain(Math.min(tier.terrainRes, 220)), IslandWebGL2Fallback.identityInstance());
    const scene = buildStaticScene(tier.sphereDetail);
    this.windmills = scene.windmills;
    this.lanterns = scene.lanterns;
    this.world = this.upload(scene.world, IslandWebGL2Fallback.identityInstance());
    this.fox = this.upload(buildFox(), IslandWebGL2Fallback.identityInstance());

    const rp = rockPlacements().slice(0, tier.rockCount);
    const rockInst = new Float32Array(rp.length * INSTANCE_FLOATS);
    rp.forEach((r, i) => {
      rockInst.set(trs([r.x, r.y, r.z], [r.tilt, r.yaw, r.tilt * 0.5], r.scale), i * INSTANCE_FLOATS);
      rockInst.set([0, 0, 0, 1], i * INSTANCE_FLOATS + 16);
    });
    this.rocks = this.upload(buildRock(), rockInst);

    const trees = treePlacements().slice(0, Math.min(tier.treeCount, 220));
    const broadleafInst: number[] = [];
    const pineInst: number[] = [];
    for (const tp of trees) {
      let y = tp.y;
      if (Number.isNaN(y)) {
        const [lx, lz] = worldToTurtleLocal(tp.x, tp.z);
        y = shellSurfaceLocal(lx, lz) - 0.4;
      }
      const m = new Float32Array(INSTANCE_FLOATS);
      m.set(trs([tp.x, y, tp.z], [0, tp.yaw, 0], tp.scale), 0);
      m.set([hash2(Math.round(tp.x * 10), Math.round(tp.z * 10)) * 6.28, 1, tp.tint, 1], 16);
      const targetArr = tp.tint < 0.28 && tp.kind === 0 ? pineInst : broadleafInst;
      for (let k = 0; k < INSTANCE_FLOATS; k++) targetArr.push(m[k]);
    }
    this.treeMeshes = [
      this.upload(buildBroadleaf(1), new Float32Array(broadleafInst)),
      this.upload(buildPine(1), new Float32Array(pineInst)),
    ];
  }

  setArmorTruck(truckState: ArmorTruckState | null, yawOverride?: number) {
    if (!truckState || truckState.mode === 'town-day-depot') {
      this.armorTruck = null;
      this.truckLanterns = [];
      return;
    }
    const built = buildArmorTruckMesh(truckState, yawOverride);
    this.armorTruck = this.upload(built.mesh, IslandWebGL2Fallback.identityInstance());
    this.truckLanterns = built.lanterns;
  }

  private drawMesh(m: GlMesh | null) {
    if (!m || !m.indexCount || !m.instCount) return;
    const gl = this.gl;
    gl.bindVertexArray(m.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_INT, 0, m.instCount);
  }

  render(
    s: FrameState,
    opts: {
      sunDir: Vec3;
      sunIntensity: number;
      fogDensity: number;
      exposure: number;
      worldDayPhase: WorldDayPhase;
      rotateSailFn: (w: WindmillRig, time: number) => Mat4;
    },
  ) {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cw = Math.max(1, Math.floor((canvas.clientWidth || window.innerWidth) * dpr));
    const ch = Math.max(1, Math.floor((canvas.clientHeight || window.innerHeight) * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0.08, 0.12, 0.18, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = cw / ch;
    const view = lookAt(s.eye, s.target, [0, 1, 0]);
    const proj = perspective(s.fovY, aspect, 0.1, 2000);
    const viewProj = multiply(proj, view);
    const invViewProj = invert(viewProj);

    const isNight = opts.worldDayPhase === 'night';
    const nightFactor = isNight ? 1.0 : 0.0;
    const skyZenith: Vec3 = isNight ? [0.04, 0.07, 0.16] : [0.2, 0.43, 0.95];
    const skyHorizon: Vec3 = isNight ? [0.1, 0.15, 0.28] : [0.63, 0.77, 0.94];
    const sunDir: Vec3 = isNight ? v3.norm([-0.45, 0.52, -0.35]) : opts.sunDir;
    const sunIntensity = isNight ? 1.55 : opts.sunIntensity;

    // 1. Sky pass
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.skyProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.skyProg, 'uInvViewProj'), false, invViewProj);
    gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'uSunDir'), sunDir);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uSunIntensity'), sunIntensity);
    gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'uSkyZenith'), skyZenith);
    gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'uSkyHorizon'), skyHorizon);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uNightFactor'), nightFactor);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. Opaque meshes
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    s.foxBones.forEach((m, i) => {
      if (i < 24) this.bonesData.set(m, i * 16);
    });
    for (const w of this.windmills) {
      if (w.bone < 24) this.bonesData.set(opts.rotateSailFn(w, s.time), w.bone * 16);
    }

    // Prioritize truck lanterns + closest world lanterns
    const allLights = [
      ...this.truckLanterns.map((l) => ({ ...l, intensity: isNight ? 4.2 : 2.8 })),
      ...this.lanterns.map((l) => ({ ...l, intensity: isNight ? 3.4 : 2.2 })),
    ];
    allLights.sort(
      (a, b) =>
        Math.hypot(a.pos[0] - s.eye[0], a.pos[2] - s.eye[2]) -
        Math.hypot(b.pos[0] - s.eye[0], b.pos[2] - s.eye[2]),
    );
    const nLights = Math.min(8, allLights.length);
    const lightPosRad = new Float32Array(8 * 4);
    const lightColor = new Float32Array(8 * 4);
    for (let i = 0; i < nLights; i++) {
      const l = allLights[i];
      lightPosRad.set([l.pos[0], l.pos[1], l.pos[2], l.radius], i * 4);
      lightColor.set([l.color[0], l.color[1], l.color[2], l.intensity], i * 4);
    }

    gl.useProgram(this.meshProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.meshProg, 'uViewProj'), false, viewProj);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.meshProg, 'uBones[0]'), false, this.bonesData);
    gl.uniform3fv(gl.getUniformLocation(this.meshProg, 'uCamPos'), s.eye);
    gl.uniform3fv(gl.getUniformLocation(this.meshProg, 'uSunDir'), sunDir);
    gl.uniform1f(gl.getUniformLocation(this.meshProg, 'uSunIntensity'), sunIntensity);
    gl.uniform3fv(gl.getUniformLocation(this.meshProg, 'uSkyZenith'), skyZenith);
    gl.uniform3fv(gl.getUniformLocation(this.meshProg, 'uSkyHorizon'), skyHorizon);
    gl.uniform1f(gl.getUniformLocation(this.meshProg, 'uFogDensity'), opts.fogDensity);
    gl.uniform1f(gl.getUniformLocation(this.meshProg, 'uExposure'), opts.exposure);
    gl.uniform1f(gl.getUniformLocation(this.meshProg, 'uNightFactor'), nightFactor);
    gl.uniform1i(gl.getUniformLocation(this.meshProg, 'uNumLights'), nLights);
    gl.uniform4fv(gl.getUniformLocation(this.meshProg, 'uLightPosRad[0]'), lightPosRad);
    gl.uniform4fv(gl.getUniformLocation(this.meshProg, 'uLightColor[0]'), lightColor);

    this.drawMesh(this.terrain);
    this.drawMesh(this.world);
    this.drawMesh(this.armorTruck);
    this.drawMesh(this.rocks);
    for (const tm of this.treeMeshes) this.drawMesh(tm);
    this.drawMesh(this.fox);

    // 3. Water plane
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.waterProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.waterProg, 'uViewProj'), false, viewProj);
    gl.uniform3fv(gl.getUniformLocation(this.waterProg, 'uCamPos'), s.eye);
    gl.uniform3fv(gl.getUniformLocation(this.waterProg, 'uSunDir'), sunDir);
    gl.uniform3fv(gl.getUniformLocation(this.waterProg, 'uSkyZenith'), skyZenith);
    gl.uniform3fv(gl.getUniformLocation(this.waterProg, 'uSkyHorizon'), skyHorizon);
    gl.uniform1f(gl.getUniformLocation(this.waterProg, 'uTime'), s.time);
    gl.uniform1f(gl.getUniformLocation(this.waterProg, 'uFogDensity'), opts.fogDensity);
    gl.uniform1f(gl.getUniformLocation(this.waterProg, 'uExposure'), opts.exposure);
    gl.uniform1f(gl.getUniformLocation(this.waterProg, 'uNightFactor'), nightFactor);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}
