/**
 * Island test scene — WGSL shaders (in-house, clean-room).
 * Techniques are generic, publicly documented real-time patterns:
 * GGX PBR, PCF shadows, depth-absorption water with screen-space refraction,
 * leaf-card canopies with spherized normals, instanced wind grass, AgX tone mapping.
 */

export const COMMON_WGSL = /* wgsl */ `
const PI = 3.14159265;
const WATER_Y = 0.0;

struct Camera {
  viewProj: mat4x4f,
  invViewProj: mat4x4f,
  camPos: vec4f,     // xyz, unused
  clip: vec4f,       // x: clip enabled, y: clip height, z: near, w: far
  screen: vec4f,     // w, h, 1/w, 1/h
  camRight: vec4f,
  camUp: vec4f,
};

struct Light { posRadius: vec4f, color: vec4f };

struct Frame {
  lightViewProj: mat4x4f,
  sunDir: vec4f,      // xyz toward sun, w intensity
  sunColor: vec4f,
  skyZenith: vec4f,
  skyHorizon: vec4f,
  ground: vec4f,
  params: vec4f,      // time, shadowTaps, detailNormals, caustics
  params2: vec4f,     // fogDensity, shadowTexel, grassFade, exposure
  fox: vec4f,         // xyz, inWater
  counts: vec4f,      // numLights, numRipples, reflectMode, windStrength
  lights: array<Light, 8>,
  ripples: array<vec4f, 12>,
};

@group(0) @binding(0) var<uniform> cam: Camera;
@group(1) @binding(0) var<uniform> frame: Frame;
@group(1) @binding(1) var shadowMap: texture_depth_2d;
@group(1) @binding(2) var shadowSampler: sampler_comparison;
@group(1) @binding(3) var<storage, read> bones: array<mat4x4f, 32>;

fn hash12(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
fn hash13(p: vec3f) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
fn hash11(x: f32) -> f32 { return fract(sin(x * 127.1) * 43758.5453); }

fn noise2(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash12(i); let b = hash12(i + vec2f(1.0, 0.0));
  let c = hash12(i + vec2f(0.0, 1.0)); let d = hash12(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
fn noise3(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let n000 = hash13(i);
  let n100 = hash13(i + vec3f(1.0, 0.0, 0.0));
  let n010 = hash13(i + vec3f(0.0, 1.0, 0.0));
  let n110 = hash13(i + vec3f(1.0, 1.0, 0.0));
  let n001 = hash13(i + vec3f(0.0, 0.0, 1.0));
  let n101 = hash13(i + vec3f(1.0, 0.0, 1.0));
  let n011 = hash13(i + vec3f(0.0, 1.0, 1.0));
  let n111 = hash13(i + vec3f(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
             mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
fn fbm2(p: vec2f) -> f32 {
  var s = 0.0; var a = 0.5; var q = p;
  for (var i = 0; i < 4; i++) { s += a * noise2(q); q = q * 2.03 + vec2f(17.1, 9.2); a *= 0.5; }
  return s / 0.9375;
}
fn fbm3(p: vec3f) -> f32 {
  var s = 0.0; var a = 0.5; var q = p;
  for (var i = 0; i < 3; i++) { s += a * noise3(q); q = q * 2.07 + vec3f(5.3, 1.7, 9.1); a *= 0.5; }
  return s / 0.875;
}

/** Perturb normal n by the gradient of a noise field sampled at q (q = p * per-axis scale). */
fn bumpScaled(n: vec3f, q: vec3f, scale: vec3f, strength: f32) -> vec3f {
  if (frame.params.z < 0.5) { return n; }
  let d = 0.15;
  let h0 = noise3(q);
  let g = vec3f(noise3(q + vec3f(d, 0.0, 0.0)) - h0, noise3(q + vec3f(0.0, d, 0.0)) - h0, noise3(q + vec3f(0.0, 0.0, d)) - h0) / d * scale;
  let gt = g - dot(g, n) * n;
  return normalize(n - gt * strength);
}
fn bump(n: vec3f, p: vec3f, freq: f32, strength: f32) -> vec3f {
  return bumpScaled(n, p * freq, vec3f(1.0), strength);
}

fn skyColor(rd: vec3f, withSun: bool) -> vec3f {
  let L = frame.sunDir.xyz;
  let y = rd.y;
  let t = clamp(y, 0.0, 1.0);
  var col = mix(frame.skyHorizon.rgb, frame.skyZenith.rgb, pow(t, 0.55));
  if (y < 0.0) { col = frame.skyHorizon.rgb * mix(1.0, 0.82, clamp(-y * 4.0, 0.0, 1.0)); }
  let sd = max(dot(rd, L), 0.0);
  col += frame.sunColor.rgb * (pow(sd, 6.0) * 0.22 + pow(sd, 48.0) * 0.5);
  if (withSun) { col += frame.sunColor.rgb * smoothstep(0.99935, 0.9997, sd) * 40.0; }
  if (y > 0.0) {
    let uv = rd.xz / (y + 0.14) * 1.2 + vec2f(frame.params.x * 0.003, frame.params.x * 0.001);
    let c = fbm2(uv * 0.7);
    let cov = smoothstep(0.5, 0.78, c) * smoothstep(0.0, 0.25, y);
    let lit = mix(vec3f(0.78, 0.82, 0.9), vec3f(1.12, 1.06, 0.97), clamp(sd * 1.2, 0.0, 1.0));
    col = mix(col, lit * frame.sunDir.w * 0.45, cov * 0.75);
  }
  return col;
}

fn applyFog(col: vec3f, wp: vec3f) -> vec3f {
  let d = distance(wp, cam.camPos.xyz);
  let rd = (wp - cam.camPos.xyz) / max(d, 1e-3);
  let hf = exp(-max(wp.y, 0.0) * 0.02);
  let f = 1.0 - exp(-d * frame.params2.x * hf);
  let sd = max(dot(rd, frame.sunDir.xyz), 0.0);
  let fogCol = frame.skyHorizon.rgb + frame.sunColor.rgb * pow(sd, 6.0) * 0.3;
  return mix(col, fogCol, clamp(f, 0.0, 1.0));
}

fn shadowAt(wp: vec3f, n: vec3f) -> f32 {
  let taps = frame.params.y;
  if (taps < 0.5) { return 1.0; }
  let lp = frame.lightViewProj * vec4f(wp + n * 0.05, 1.0);
  let ndc = lp.xyz / lp.w;
  let uv = vec2f(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
  if (uv.x < 0.002 || uv.y < 0.002 || uv.x > 0.998 || uv.y > 0.998 || ndc.z > 1.0 || ndc.z < 0.0) { return 1.0; }
  let dref = ndc.z - 0.0005;
  if (taps < 1.5) { return textureSampleCompareLevel(shadowMap, shadowSampler, uv, dref); }
  let n1 = select(select(4.0, 3.0, taps < 12.0), 2.0, taps < 6.0);
  let halfK = (n1 - 1.0) * 0.5;
  let texel = frame.params2.y;
  var sum = 0.0;
  for (var i = 0.0; i < n1; i += 1.0) {
    for (var j = 0.0; j < n1; j += 1.0) {
      sum += textureSampleCompareLevel(shadowMap, shadowSampler, uv + (vec2f(i, j) - halfK) * texel * 1.2, dref);
    }
  }
  // Fade out at the edge of the shadow range so there is no hard seam.
  let edge = smoothstep(0.42, 0.5, max(abs(uv.x - 0.5), abs(uv.y - 0.5)));
  return mix(sum / (n1 * n1), 1.0, edge);
}

struct Surf {
  albedo: vec3f,
  n: vec3f,
  rough: f32,
  metal: f32,
  ao: f32,
  emissive: vec3f,
  sss: f32,
  sheen: f32,
};

fn shade(s: Surf, wp: vec3f) -> vec3f {
  let V = normalize(cam.camPos.xyz - wp);
  let L = frame.sunDir.xyz;
  let N = s.n;
  let nlRaw = dot(N, L);
  let nl = max(nlRaw, 0.0);
  let nv = max(dot(N, V), 1e-3);
  let H = normalize(L + V);
  let nh = max(dot(N, H), 0.0);
  let vh = max(dot(V, H), 0.0);
  let f0 = mix(vec3f(0.04), s.albedo, s.metal);
  let a = max(s.rough * s.rough, 0.002);
  let a2 = a * a;
  let dd = nh * nh * (a2 - 1.0) + 1.0;
  let D = a2 / (PI * dd * dd);
  let k = (s.rough + 1.0) * (s.rough + 1.0) / 8.0;
  let G = (nv / (nv * (1.0 - k) + k)) * (nl / (nl * (1.0 - k) + k));
  let F = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
  let spec = D * G * F / max(4.0 * nv * nl, 1e-4);
  let kd = (1.0 - F) * (1.0 - s.metal);
  let sh = shadowAt(wp, N);
  let sun = frame.sunColor.rgb * frame.sunDir.w;
  // Wrap lighting for thin translucent things (leaves, ears).
  let wrapNl = max((nlRaw + s.sss * 0.6) / (1.0 + s.sss * 0.6), 0.0);
  var col = (kd * s.albedo / PI * wrapNl + spec * nl) * sun * sh;
  if (s.sss > 0.0) {
    let back = pow(max(dot(-V, L), 0.0), 4.0) * 0.8 + 0.12;
    col += s.albedo * s.sss * back * clamp(-nlRaw * 0.5 + 0.5, 0.0, 1.0) * sun * (0.35 + 0.65 * sh) * 0.3;
  }
  if (s.sheen > 0.0) {
    col += s.albedo * s.sheen * pow(1.0 - nv, 3.0) * (sun * (0.3 + 0.7 * sh) * 0.22 + frame.skyZenith.rgb * 0.5);
  }
  let skyAmb = mix(frame.skyZenith.rgb, frame.skyHorizon.rgb, 0.45);
  let hemi = mix(frame.ground.rgb, skyAmb, N.y * 0.5 + 0.5) * 0.62;
  col += s.albedo * hemi * s.ao * (1.0 - s.metal * 0.7);
  let R = reflect(-V, N);
  let Fa = f0 + (max(vec3f(1.0 - s.rough), f0) - f0) * pow(1.0 - nv, 5.0);
  let envR = mix(frame.skyHorizon.rgb, frame.skyZenith.rgb, clamp(R.y, 0.0, 1.0));
  col += Fa * envR * s.ao * (1.0 - s.rough * 0.85) * 0.5;
  let nL = u32(frame.counts.x);
  for (var i = 0u; i < nL; i++) {
    let lp = frame.lights[i].posRadius;
    let lc = frame.lights[i].color;
    let dv = lp.xyz - wp;
    let dist = length(dv);
    if (dist < lp.w) {
      let l = dv / dist;
      let fall = pow(clamp(1.0 - pow(dist / lp.w, 4.0), 0.0, 1.0), 2.0) / (dist * dist + 1.0);
      let pnl = max(dot(N, l), 0.0);
      let ph = normalize(l + V);
      let ps = pow(max(dot(N, ph), 0.0), mix(8.0, 128.0, 1.0 - s.rough)) * (1.0 - s.rough);
      col += (s.albedo / PI * pnl + vec3f(ps) * pnl * 0.5) * lc.rgb * lc.w * fall;
    }
  }
  col += s.emissive;
  return col;
}
`;

export const MESH_WGSL = /* wgsl */ `
struct VIn {
  @location(0) pos: vec3f,
  @location(1) nrm: vec3f,
  @location(2) col: vec3f,
  @location(3) mat: f32,
  @location(4) ao: f32,
  @location(5) bone: f32,
  @location(6) aux: f32,
  @location(7) m0: vec4f,
  @location(8) m1: vec4f,
  @location(9) m2: vec4f,
  @location(10) m3: vec4f,
  @location(11) ip: vec4f,   // phase, wind, tint, lodFade
};

struct VOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) nrm: vec3f,
  @location(2) col: vec3f,
  @location(3) @interpolate(flat) mat: u32,
  @location(4) ao: f32,
  @location(5) aux: f32,
  @location(6) obj: vec3f,
  @location(7) tint: f32,
};

fn worldOf(v: VIn) -> VOut {
  var o: VOut;
  var p = vec4f(v.pos, 1.0);
  var n = v.nrm;
  if (v.bone > -0.5) {
    let bm = bones[u32(v.bone + 0.5)];
    p = bm * p;
    n = (bm * vec4f(n, 0.0)).xyz;
  }
  let model = mat4x4f(v.m0, v.m1, v.m2, v.m3);
  var wp = (model * p).xyz;
  let wn = normalize((model * vec4f(n, 0.0)).xyz);
  let mat = u32(v.mat + 0.5);
  let windAmt = v.ip.y * frame.counts.w;
  if (windAmt > 0.0) {
    let h = max(v.pos.y - 0.8, 0.0);
    let t = frame.params.x;
    let ph = v.ip.x;
    let sway = sin(t * 0.9 + ph + wp.x * 0.03) * 0.6 + sin(t * 2.1 + ph * 1.7 + wp.z * 0.05) * 0.25;
    var flutter = 0.0;
    if (mat == 3u || mat == 13u) { flutter = sin(t * 6.5 + dot(v.pos, vec3f(3.1, 2.3, 4.7)) * 2.0) * 0.035; }
    let bend = h * h * 0.006;
    wp += vec3f(sway * bend + flutter, -abs(sway) * bend * 0.15, sway * bend * 0.6 + flutter * 0.7) * windAmt;
  }
  o.world = wp;
  o.nrm = wn;
  o.col = v.col;
  o.mat = mat;
  o.ao = v.ao;
  o.aux = v.aux;
  o.obj = v.pos;
  o.tint = v.ip.z;
  return o;
}

@vertex fn vs_main(v: VIn) -> VOut {
  var o = worldOf(v);
  o.clip = cam.viewProj * vec4f(o.world, 1.0);
  return o;
}

@vertex fn vs_shadow(v: VIn) -> VOut {
  var o = worldOf(v);
  o.clip = frame.lightViewProj * vec4f(o.world, 1.0);
  return o;
}

/** Procedural leaf cluster for leaf cards: uv in [0,1]^2 -> coverage. */
fn leafMask(uv: vec2f, seed: f32) -> f32 {
  let p = uv * 3.2;
  let cell = floor(p);
  var cover = 0.0;
  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let c = cell + vec2f(f32(i), f32(j));
      let h = hash12(c + seed * 13.1);
      let center = c + vec2f(hash12(c + 3.7 + seed), hash12(c + 9.1 + seed));
      let ang = h * 6.2831;
      let d = p - center;
      let r = vec2f(cos(ang) * d.x + sin(ang) * d.y, -sin(ang) * d.x + cos(ang) * d.y);
      let e = length(r * vec2f(1.0, 2.1));
      cover = max(cover, 1.0 - smoothstep(0.36, 0.42, e));
    }
  }
  let radial = 1.0 - smoothstep(0.38, 0.5, length(uv - 0.5));
  return cover * radial;
}

fn wetFactor(y: f32, wobble: f32) -> f32 {
  return 1.0 - smoothstep(WATER_Y + 0.3, WATER_Y + 0.9 + wobble * 0.5, y);
}

fn caustics(p: vec2f, t: f32) -> f32 {
  let a = noise2(p * 0.85 + vec2f(t * 0.31, t * 0.21));
  let b = noise2(p * 1.25 - vec2f(t * 0.24, -t * 0.17) + 7.3);
  let v = 1.0 - abs(a - b) * 3.2;
  return pow(clamp(v, 0.0, 1.0), 6.0);
}

fn surfaceOf(i: VOut, front: bool) -> Surf {
  var s: Surf;
  var N = normalize(i.nrm);
  if (!front) { N = -N; }
  let p = i.world;
  s.albedo = i.col;
  s.rough = 0.8;
  s.metal = 0.0;
  s.ao = i.ao;
  s.emissive = vec3f(0.0);
  s.sss = 0.0;
  s.sheen = 0.0;
  var wetMat = 1.0;
  switch i.mat {
    case 0u: { // terrain
      let n1 = fbm3(p * 0.35);
      let slope = 1.0 - N.y;
      let h = p.y;
      let sand = vec3f(0.82, 0.74, 0.56) * (0.88 + 0.24 * n1);
      let underSand = vec3f(0.84, 0.78, 0.64) * (0.88 + 0.24 * n1);
      let grass = mix(vec3f(0.19, 0.33, 0.09), vec3f(0.36, 0.45, 0.15), n1);
      let rock = vec3f(0.43, 0.41, 0.37) * (0.72 + 0.5 * n1);
      let moss = vec3f(0.22, 0.33, 0.1);
      var alb = select(sand, underSand, h < -0.25);
      let gW = smoothstep(1.2, 2.0, h + (n1 - 0.5) * 1.6) * (1.0 - smoothstep(0.25, 0.45, slope));
      alb = mix(alb, grass, gW);
      let rW = smoothstep(0.38, 0.55, slope + (n1 - 0.5) * 0.2);
      let shoal = i.col.r * smoothstep(0.42, 0.6, n1);
      let rk = max(rW, shoal);
      alb = mix(alb, mix(rock, moss, smoothstep(0.55, 0.9, N.y) * 0.75), rk);
      s.albedo = alb;
      s.rough = mix(0.93, 0.82, rk);
      N = bump(N, p, 1.4, 0.25 + rk * 0.5);
      if (h < -0.3) {
        let r = sin(p.x * 2.1 + p.z * 0.8 + noise2(p.xz * 0.35) * 5.0);
        N = normalize(N + vec3f(0.06 * r, 0.0, 0.025 * r));
      }
    }
    case 1u: { // weathered wood, grain along aux axis
      let axis = u32(i.aux + 0.5);
      let o = i.obj;
      var sc = vec3f(14.0, 14.0, 14.0);
      if (axis == 0u) { sc.x = 0.7; } else if (axis == 1u) { sc.y = 0.7; } else { sc.z = 0.7; }
      let q = o * sc;
      let camDist = distance(cam.camPos.xyz, p);
      let detail = 1.0 - smoothstep(5.0, 22.0, camDist);
      let grain = mix(0.55, noise3(q), detail);
      let streak = noise3(q * 0.3 + 11.0);
      let a = select(select(o.x, o.y, axis == 1u), o.z, axis == 2u);
      let b = select(select(o.y + o.z, o.x + o.z, axis == 1u), o.x + o.y, axis == 2u);
      let ring = fract(b * 5.0 + streak * 2.5 + a * 0.05);
      var alb = i.col * (0.84 + 0.24 * grain) * (0.92 + 0.12 * smoothstep(0.25, 0.75, ring));
      let grey = vec3f(dot(alb, vec3f(0.33))) * vec3f(1.04, 1.0, 0.95);
      alb = mix(alb, grey, 0.18 * smoothstep(0.3, 0.8, noise3(o * 0.8)) * max(N.y, 0.2));
      alb *= mix(0.5, 1.0, smoothstep(0.08, 0.22, grain));
      s.albedo = alb;
      s.rough = 0.8;
      N = bumpScaled(N, q, sc * 0.02, 0.45 * detail);
    }
    case 2u: { // mossy rock
      let nn = fbm3(p * 0.8);
      var alb = vec3f(0.44, 0.42, 0.38) * (0.7 + 0.5 * nn) * mix(0.6, 1.0, i.ao);
      let mW = smoothstep(0.45, 0.8, N.y + (noise3(p * 1.7) - 0.5) * 0.6) * smoothstep(-0.3, 0.6, p.y);
      alb = mix(alb, vec3f(0.2, 0.31, 0.09) * (0.8 + 0.4 * nn), mW * 0.85);
      s.albedo = alb;
      s.rough = mix(0.86, 0.95, mW);
      N = bump(N, p, 2.0, 0.5);
      N = bump(N, p, 7.0, 0.2);
    }
    case 3u: { // foliage puffs (LOD)
      let v = noise3(p * 2.5);
      s.albedo = mix(i.col, i.col * vec3f(1.35, 1.2, 0.7), i.tint * 0.35) * (0.75 + 0.5 * v);
      s.rough = 0.6;
      s.sss = 0.7;
      N = bump(N, p, 5.0, 0.6);
      wetMat = 0.0;
    }
    case 4u: { // bark
      s.albedo = i.col * (0.7 + 0.5 * noise3(vec3f(p.x * 14.0, p.y * 1.6, p.z * 14.0)));
      s.rough = 0.92;
      N = bumpScaled(N, vec3f(p.x * 14.0, p.y * 1.6, p.z * 14.0), vec3f(14.0, 1.6, 14.0) * 0.03, 0.5);
    }
    case 5u: { // fur
      s.albedo = i.col * (0.92 + 0.12 * noise3(i.obj * 60.0));
      s.rough = 0.78;
      s.sheen = 0.7;
      s.sss = 0.15;
      N = bump(N, i.obj, 45.0, 0.12);
      wetMat = 0.0;
    }
    case 6u: { // turtle shell plates; aux = distance to plate edge (m)
      let e = i.aux;
      let groove = 1.0 - smoothstep(0.05, 0.45, e);
      let rings = 1.0 - smoothstep(0.0, 0.06, abs(fract(e * 0.9) - 0.5) - 0.44);
      var alb = i.col * (1.0 - groove * 0.55) * (1.0 - rings * 0.16);
      let m = smoothstep(0.55, 0.75, fbm3(p * 0.3)) * smoothstep(0.3, 0.8, N.y);
      alb = mix(alb, vec3f(0.24, 0.37, 0.11), m * 0.6);
      s.albedo = alb * (0.85 + 0.25 * noise3(p * 2.0));
      s.rough = 0.62;
      N = bump(N, p, 1.2, 0.35);
      N = bump(N, p, 5.0, 0.15);
    }
    case 7u: { // roof shingles
      let row = fract(p.y * 4.0);
      let cellId = floor(vec3f(p.x * 3.0, p.y * 4.0, p.z * 3.0));
      s.albedo = i.col * (0.72 + 0.4 * hash13(cellId)) * (0.72 + 0.28 * smoothstep(0.0, 0.25, row));
      s.albedo = mix(s.albedo, vec3f(0.22, 0.3, 0.12), smoothstep(0.62, 0.8, noise3(p * 1.3)) * 0.4);
      s.rough = 0.85;
    }
    case 8u: { // plaster
      s.albedo = i.col * (0.86 + 0.18 * fbm3(p * 1.5));
      s.rough = 0.92;
      N = bump(N, p, 4.0, 0.08);
    }
    case 9u: { // emissive lantern glass
      s.albedo = i.col * 0.2;
      s.emissive = i.col * 3.0;
      wetMat = 0.0;
    }
    case 10u: { // rope
      let strand = sin((i.obj.x + i.obj.y + i.obj.z) * 70.0) * 0.5 + 0.5;
      s.albedo = i.col * (0.72 + 0.32 * strand);
      s.rough = 0.95;
    }
    case 11u: { // turtle skin
      let w = fbm3(p * 0.9);
      s.albedo = i.col * (0.78 + 0.32 * w);
      s.albedo = mix(s.albedo, vec3f(0.24, 0.33, 0.13), smoothstep(0.6, 0.85, N.y + (w - 0.5)) * 0.35);
      s.rough = 0.55;
      N = bump(N, p, 2.0, 0.18);
      N = bump(N, p, 7.0, 0.06);
    }
    case 12u: { // dark iron / glass
      s.rough = 0.32;
      s.metal = 0.0;
      wetMat = 0.0;
    }
    case 13u: { // leaf cards: col.rg = card uv, col.b = seed
      let m = leafMask(i.col.rg, i.col.b);
      if (m < 0.5) { discard; }
      let hue = hash11(i.col.b * 91.0 + floor(i.col.r * 3.2) * 7.0 + floor(i.col.g * 3.2) * 3.0);
      var g = mix(vec3f(0.13, 0.29, 0.06), vec3f(0.27, 0.42, 0.1), hue);
      g = mix(g, g * vec3f(1.3, 1.15, 0.65), i.tint * 0.4);
      s.albedo = g;
      s.rough = 0.55;
      s.sss = 0.85;
      wetMat = 0.0;
    }
    default: {}
  }
  // Wet edges and algae near the waterline; darker, glossier.
  let wob = noise2(p.xz * 1.3);
  let wet = wetFactor(p.y, wob) * wetMat;
  if (wet > 0.0) {
    let algae = (1.0 - smoothstep(WATER_Y - 0.4, WATER_Y + 0.2, p.y)) * 0.5;
    s.albedo = mix(s.albedo, s.albedo * vec3f(0.62, 0.72, 0.55), algae * select(1.0, 0.0, i.mat == 0u));
    s.albedo *= mix(1.0, 0.58, wet);
    s.rough = mix(s.rough, 0.2, wet);
  }
  s.n = N;
  return s;
}

@fragment fn fs_main(i: VOut, @builtin(front_facing) front: bool) -> @location(0) vec4f {
  if (cam.clip.x > 0.5 && i.world.y < cam.clip.y) { discard; }
  let s = surfaceOf(i, front);
  var col = shade(s, i.world);
  // Caustics on submerged surfaces.
  if (frame.params.w > 0.5 && i.world.y < WATER_Y - 0.02) {
    let depth = WATER_Y - i.world.y;
    let L = frame.sunDir.xyz;
    let cp = i.world.xz + L.xz * depth * 0.6;
    let c = caustics(cp * 1.4, frame.params.x);
    let sh = shadowAt(i.world, s.n);
    col += s.albedo * frame.sunColor.rgb * frame.sunDir.w * c * 0.9 * exp(-depth * 0.35) * max(dot(s.n, L), 0.0) * sh;
  }
  return vec4f(applyFog(col, i.world), 1.0);
}

@fragment fn fs_shadow(i: VOut) {
  if (i.mat == 13u) {
    if (leafMask(i.col.rg, i.col.b) < 0.5) { discard; }
  }
}
`;

export const SKY_WGSL = /* wgsl */ `
struct SOut { @builtin(position) pos: vec4f, @location(0) ndc: vec2f };
@vertex fn vs_sky(@builtin(vertex_index) vi: u32) -> SOut {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: SOut;
  o.pos = vec4f(p[vi], 1.0, 1.0);
  o.ndc = p[vi];
  return o;
}
@fragment fn fs_sky(i: SOut) -> @location(0) vec4f {
  let far = cam.invViewProj * vec4f(i.ndc, 1.0, 1.0);
  let near = cam.invViewProj * vec4f(i.ndc, 0.0, 1.0);
  let rd = normalize(far.xyz / far.w - near.xyz / near.w);
  return vec4f(skyColor(rd, true), 1.0);
}
`;

export const GRASS_WGSL = /* wgsl */ `
struct GIn {
  @builtin(vertex_index) vi: u32,
  @location(0) posYaw: vec4f,
  @location(1) params: vec4f,  // height, tint, _, _
};
struct GOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) nrm: vec3f,
  @location(2) t: f32,
  @location(3) tint: f32,
};
@vertex fn vs_grass(g: GIn) -> GOut {
  var lut = array<vec2f, 15>(
    vec2f(-1.0, 0.0), vec2f(1.0, 0.0), vec2f(-1.0, 0.33),
    vec2f(1.0, 0.0), vec2f(1.0, 0.33), vec2f(-1.0, 0.33),
    vec2f(-1.0, 0.33), vec2f(1.0, 0.33), vec2f(-1.0, 0.66),
    vec2f(1.0, 0.33), vec2f(1.0, 0.66), vec2f(-1.0, 0.66),
    vec2f(-1.0, 0.66), vec2f(1.0, 0.66), vec2f(0.0, 1.0));
  let c = lut[g.vi];
  let t = c.y;
  var o: GOut;
  let base = g.posYaw.xyz;
  let yaw = g.posYaw.w;
  let dist = distance(base, cam.camPos.xyz);
  let fade = 1.0 - smoothstep(frame.params2.z * 0.7, frame.params2.z, dist);
  if (fade <= 0.001) {
    o.clip = vec4f(0.0, 0.0, 2.0, 1.0);
    return o;
  }
  let height = g.params.x * mix(0.4, 1.0, fade);
  let across = vec3f(-sin(yaw), 0.0, cos(yaw));
  let facing = vec3f(cos(yaw), 0.0, sin(yaw));
  let time = frame.params.x;
  let gust = noise2(base.xz * 0.05 + vec2f(time * 0.25, time * 0.1));
  let w = sin(time * 1.7 + base.x * 0.15 + base.z * 0.11) * 0.35 + gust * 0.9;
  var bendDir = normalize(vec2f(0.8, 0.45) + facing.xz * 0.3);
  var bendAmt = (0.12 + w * 0.32) * frame.counts.w;
  // The fox pushes grass aside as it walks through.
  let d = base.xz - frame.fox.xz;
  let dl = length(d);
  if (dl < 0.9) {
    let push = (1.0 - dl / 0.9);
    bendDir = normalize(mix(bendDir, d / max(dl, 1e-3), push));
    bendAmt += push * 0.9;
  }
  let bend = bendAmt * t * t * height;
  let width = 0.05 * (1.0 - t * 0.8);
  var wp = base + across * c.x * width + vec3f(bendDir.x, 0.0, bendDir.y) * bend;
  wp.y += t * height - bend * bend * 0.35;
  o.world = wp;
  o.nrm = normalize(facing + vec3f(0.0, 0.9, 0.0) + vec3f(bendDir.x, 0.0, bendDir.y) * t * 0.4);
  o.t = t;
  o.tint = g.params.y;
  o.clip = cam.viewProj * vec4f(wp, 1.0);
  return o;
}
@fragment fn fs_grass(i: GOut, @builtin(front_facing) front: bool) -> @location(0) vec4f {
  var s: Surf;
  var N = normalize(i.nrm);
  let V = normalize(cam.camPos.xyz - i.world);
  if (dot(N, V) < 0.0) { N = normalize(N - 2.0 * dot(N, V) * V * 0.5); }
  let baseC = vec3f(0.1, 0.2, 0.05);
  let tip = mix(vec3f(0.34, 0.48, 0.13), vec3f(0.52, 0.55, 0.2), i.tint);
  s.albedo = mix(baseC, tip, i.t);
  s.n = N;
  s.rough = 0.65;
  s.metal = 0.0;
  s.ao = mix(0.35, 1.0, i.t);
  s.emissive = vec3f(0.0);
  s.sss = 0.6;
  s.sheen = 0.0;
  return vec4f(applyFog(shade(s, i.world), i.world), 1.0);
}
`;

export const WATER_WGSL = /* wgsl */ `
@group(2) @binding(0) var sceneColor: texture_2d<f32>;
@group(2) @binding(1) var sceneDepth: texture_depth_2d;
@group(2) @binding(2) var reflTex: texture_2d<f32>;
@group(2) @binding(3) var linSampler: sampler;

struct WOut { @builtin(position) clip: vec4f, @location(0) world: vec3f };

@vertex fn vs_water(@builtin(vertex_index) vi: u32) -> WOut {
  var c = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let s = 3000.0;
  let wp = vec3f(cam.camPos.x + c[vi].x * s, WATER_Y, cam.camPos.z + c[vi].y * s);
  var o: WOut;
  o.world = wp;
  o.clip = cam.viewProj * vec4f(wp, 1.0);
  return o;
}

fn linearDepth(d: f32) -> f32 {
  let n = cam.clip.z; let f = cam.clip.w;
  return n * f / (f - d * (f - n));
}

/** Water height field: a few long gentle swells + scrolling noise ripples + contact ripples. */
fn waterHeight(p: vec2f, t: f32, dist: f32) -> f32 {
  var h = 0.0;
  h += sin(dot(p, vec2f(0.12, 0.05)) + t * 0.7) * 0.05;
  h += sin(dot(p, vec2f(-0.07, 0.16)) + t * 0.9) * 0.035;
  h += sin(dot(p, vec2f(0.31, -0.22)) + t * 1.6) * 0.012;
  let detail = 1.0 - smoothstep(25.0, 140.0, dist);
  h += (noise2(p * 0.9 + vec2f(t * 0.35, t * 0.12)) - 0.5) * 0.05 * detail;
  h += (noise2(p * 2.6 - vec2f(t * 0.5, -t * 0.4)) - 0.5) * 0.018 * detail;
  let nR = u32(frame.counts.y);
  for (var i = 0u; i < nR; i++) {
    let r = frame.ripples[i];
    let age = t - r.z;
    if (age > 0.0 && age < 3.0) {
      let d = distance(p, r.xy);
      let radius = age * 1.3;
      let ring = exp(-pow((d - radius) * 4.5, 2.0)) * exp(-age * 1.3) * r.w;
      h += sin((d - radius) * 22.0) * ring * 0.03;
    }
  }
  return h;
}

@fragment fn fs_water(i: WOut) -> @location(0) vec4f {
  let fc = i.clip.xy;
  let size = vec2f(textureDimensions(sceneDepth));
  let uv = fc / size;
  let sceneD = textureLoad(sceneDepth, vec2i(fc), 0);
  if (sceneD <= i.clip.z) { discard; }
  let t = frame.params.x;
  let wp = i.world;
  let toCam = cam.camPos.xyz - wp;
  let dist = length(toCam);
  let V = toCam / dist;
  let e = 0.08;
  let h0 = waterHeight(wp.xz, t, dist);
  let hx = waterHeight(wp.xz + vec2f(e, 0.0), t, dist);
  let hz = waterHeight(wp.xz + vec2f(0.0, e), t, dist);
  let strength = mix(1.0, 0.35, smoothstep(30.0, 300.0, dist));
  let N = normalize(vec3f(-(hx - h0) / e * strength, 1.0, -(hz - h0) / e * strength));

  let zW = linearDepth(i.clip.z);
  let zS = linearDepth(sceneD);
  let thick0 = max(zS - zW, 0.0);
  // Screen-space refraction, rejected if the offset sample is in front of the water.
  var ruv = uv + N.xz * 0.045 * clamp(thick0 * 0.6, 0.0, 1.0) / max(1.0, dist * 0.05);
  ruv = clamp(ruv, vec2f(0.001), vec2f(0.999));
  var dR = textureLoad(sceneDepth, vec2i(ruv * size), 0);
  if (dR <= i.clip.z) { ruv = uv; dR = sceneD; }
  let thick = max(linearDepth(dR) - zW, 0.0);
  let below = textureSampleLevel(sceneColor, linSampler, ruv, 0.0).rgb;
  // Reconstruct the seabed point behind the refracted sample so the light path is
  // vertical depth / cos(view angle), not raw view-z difference (that turns grazing water muddy).
  let ndcR = vec2f(ruv.x * 2.0 - 1.0, 1.0 - ruv.y * 2.0);
  let gH = cam.invViewProj * vec4f(ndcR, dR, 1.0);
  let groundY = gH.y / gH.w;
  let vDepth = max(WATER_Y - groundY, 0.0);
  let path = min(vDepth / max(V.y, 0.04), thick * 1.2 + 0.01);
  // Beer-Lambert: red dies first, leaving clear turquoise shallows and teal depths.
  let trans = exp(-path * vec3f(0.42, 0.075, 0.035));
  let sunAmb = frame.sunDir.w * 0.2 + 0.25;
  let scatter = mix(vec3f(0.03, 0.38, 0.4), vec3f(0.0, 0.1, 0.16), clamp(vDepth / 9.0, 0.0, 1.0)) * sunAmb;
  var under = below * trans + scatter * (1.0 - trans);

  let R = reflect(-V, N);
  var refl: vec3f;
  if (frame.counts.z > 0.5) {
    let rr = clamp(vec2f(uv.x, 1.0 - uv.y) + N.xz * 0.025, vec2f(0.001), vec2f(0.999));
    refl = textureSampleLevel(reflTex, linSampler, rr, 0.0).rgb;
  } else {
    refl = skyColor(normalize(vec3f(R.x, abs(R.y), R.z)), false);
  }
  let fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  let L = frame.sunDir.xyz;
  let sh = shadowAt(wp, vec3f(0.0, 1.0, 0.0));
  let sd = max(dot(R, L), 0.0);
  let glint = (pow(sd, 900.0) * 14.0 + pow(sd, 90.0) * 0.4) * sh;

  // Foam: shoreline / around posts (thin water) and contact ripples.
  let band = noise2(wp.xz * 2.2 + vec2f(t * 0.25, -t * 0.18));
  let shore = 1.0 - smoothstep(0.0, 0.35 + band * 0.3, vDepth);
  var foam = smoothstep(0.35, 0.8, shore * (0.55 + band * 0.7)) * shore;
  let nR = u32(frame.counts.y);
  for (var k = 0u; k < nR; k++) {
    let r = frame.ripples[k];
    let age = t - r.z;
    if (age > 0.0 && age < 2.0) {
      let d = distance(wp.xz, r.xy);
      let ring = exp(-pow((d - age * 1.3) * 7.0, 2.0)) * exp(-age * 2.2) * r.w;
      foam = max(foam, ring * smoothstep(0.3, 0.7, noise2(wp.xz * 9.0)) * 0.9);
    }
  }
  var col = mix(under, refl, fres) + frame.sunColor.rgb * glint;
  let foamLight = frame.sunColor.rgb * frame.sunDir.w * 0.35 * (0.4 + 0.6 * sh) + frame.skyZenith.rgb * 0.6;
  col = mix(col, vec3f(0.95) * foamLight, clamp(foam, 0.0, 1.0) * 0.85);
  return vec4f(applyFog(col, wp), 1.0);
}
`;

export const VFX_WGSL = /* wgsl */ `
struct Vfx {
  a: vec4f,   // origin xyz, start time
  b: vec4f,   // forward xyz, element (0 fire, 1 water, 2 wind, 3 earth)
  c: vec4f,   // duration, count, intensity, seed
};
@group(2) @binding(0) var<uniform> vfx: Vfx;

struct POut {
  @builtin(position) clip: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) alpha: f32,
};

/** Element-specific particle path. Thin, flowing, force-driven, never a straight burst. */
fn particlePos(elem: u32, s: f32, s2: f32, s3: f32, age: f32, t01: f32) -> vec3f {
  let o = vfx.a.xyz;
  let fwd = normalize(vfx.b.xyz);
  let up = vec3f(0.0, 1.0, 0.0);
  let right = normalize(cross(fwd, up));
  if (elem == 0u) { // fire: ember threads curling forward and rising
    let u = fract(s + age * 0.5);
    let lateral = sin(u * 9.0 + age * 2.6 + s3 * 6.283) * 0.16 * (1.0 - u * 0.4);
    var p = o + fwd * (0.4 + u * 4.5) + right * lateral + up * (0.45 + u * 0.55 + sin(u * 9.4 + s2 * 6.283) * 0.08);
    if (s > 0.72) { p += up * fract(age * 0.35 + s2) * 1.1 + right * (s3 - 0.5) * 0.6; }
    return p;
  } else if (elem == 1u) { // water: two intertwined ribbons that arc and rejoin
    let u = fract(s + age * 0.42);
    let stream = select(-1.0, 1.0, s2 > 0.5);
    let ang = u * 12.566 + age * 1.8;
    let center = o + fwd * (0.3 + u * 4.2) + up * (0.5 + sin(u * 3.1416) * 0.55);
    return center + (right * cos(ang) * stream + up * sin(ang)) * 0.2 * (1.0 - u * 0.5);
  } else if (elem == 2u) { // wind: open spiralling streaks lifting around the caster
    let u = fract(s + age * 0.33);
    let ang = u * 15.0 + s2 * 6.283;
    let r = 0.45 + u * 0.8;
    return o + vec3f(cos(ang) * r, 0.15 + u * 1.5, sin(ang) * r) + fwd * u * 1.2;
  }
  // earth: motes rise from a ring, hover and orbit slowly, then settle
  let ang = s * 6.283 + age * 0.7;
  let r = 0.65 + s2 * 0.55;
  let lift = smoothstep(0.0, 0.35, t01) * (0.25 + s3 * 0.85) * (1.0 - smoothstep(0.8, 1.0, t01) * 0.9);
  return o + vec3f(cos(ang) * r, 0.04 + lift + sin(age * 2.0 + s * 10.0) * 0.04, sin(ang) * r);
}

fn elementColor(elem: u32, s: f32, u: f32) -> vec3f {
  if (elem == 0u) { return 2.6 * mix(vec3f(1.0, 0.95, 0.84), mix(vec3f(1.0, 0.6, 0.24), vec3f(0.76, 0.21, 0.12), u), smoothstep(0.0, 0.4, u)); }
  if (elem == 1u) { return mix(vec3f(0.92, 0.98, 1.0), mix(vec3f(0.31, 0.76, 0.91), vec3f(0.11, 0.44, 0.54), u), smoothstep(0.0, 0.5, s)); }
  if (elem == 2u) { return mix(vec3f(0.91, 1.0, 0.96), mix(vec3f(0.62, 0.85, 0.72), vec3f(0.61, 0.79, 1.0), s), 0.6); }
  return 1.5 * select(vec3f(0.91, 0.85, 0.71), select(vec3f(0.54, 0.42, 0.27), vec3f(0.79, 0.71, 0.35), s > 0.85), s > 0.45);
}

@vertex fn vs_vfx(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> POut {
  var corners = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  var o: POut;
  let elem = u32(vfx.b.w + 0.5);
  let age = frame.params.x - vfx.a.w;
  let dur = vfx.c.x;
  let t01 = age / dur;
  if (t01 < 0.0 || t01 > 1.0 || f32(ii) >= vfx.c.y) { o.clip = vec4f(0.0, 0.0, 2.0, 1.0); return o; }
  let fi = f32(ii) + vfx.c.w * 17.0;
  let s = hash11(fi * 1.37 + 0.11);
  let s2 = hash11(fi * 2.71 + 0.37);
  let s3 = hash11(fi * 4.13 + 0.73);
  let p = particlePos(elem, s, s2, s3, age, t01);
  let pPrev = particlePos(elem, s, s2, s3, age - 0.04, t01);
  // Build-up 15%, short peak, long graceful fade.
  let env = smoothstep(0.0, 0.15, t01) * (1.0 - smoothstep(0.35, 1.0, t01) * 0.85) * (1.0 - smoothstep(0.9, 1.0, t01));
  var size = 0.022;
  var stretch = 1.0;
  if (elem == 0u) { size = 0.018 + 0.02 * (1.0 - fract(s + age * 0.5)); stretch = 2.5; }
  if (elem == 1u) { size = 0.02; stretch = 4.0; }
  if (elem == 2u) { size = 0.012; stretch = 9.0; }
  if (elem == 3u) { size = select(0.02, 0.045, s > 0.85); stretch = 1.0; }
  let c = corners[vi];
  let vel = p - pPrev;
  let toCam = normalize(cam.camPos.xyz - p);
  var axis = cam.camUp.xyz;
  var side = cam.camRight.xyz;
  if (stretch > 1.5 && length(vel) > 1e-4) {
    axis = normalize(vel);
    side = normalize(cross(axis, toCam));
  }
  let wp = p + side * c.x * size + axis * c.y * size * stretch;
  o.clip = cam.viewProj * vec4f(wp, 1.0);
  o.uv = c;
  let u = select(fract(s + age * 0.45), t01, elem == 3u);
  o.color = elementColor(elem, s, u) * vfx.c.z;
  o.alpha = env;
  return o;
}

@fragment fn fs_vfx(i: POut) -> @location(0) vec4f {
  let d = length(i.uv);
  let core = exp(-d * d * 5.0);
  let hot = exp(-d * d * 18.0);
  let col = mix(i.color, vec3f(1.0), hot * 0.35) * core * i.alpha;
  return vec4f(col, 0.0);
}
`;

export const POST_FULLSCREEN = /* wgsl */ `
struct FOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs_full(@builtin(vertex_index) vi: u32) -> FOut {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: FOut;
  o.pos = vec4f(p[vi], 0.0, 1.0);
  o.uv = vec2f(p[vi].x * 0.5 + 0.5, 0.5 - p[vi].y * 0.5);
  return o;
}
`;

export const BRIGHT_WGSL = POST_FULLSCREEN + /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@fragment fn fs_bright(i: FOut) -> @location(0) vec4f {
  let texel = 1.0 / vec2f(textureDimensions(src));
  var c = textureSampleLevel(src, samp, i.uv, 0.0).rgb * 0.5;
  c += textureSampleLevel(src, samp, i.uv + texel * vec2f(1.0, 1.0), 0.0).rgb * 0.125;
  c += textureSampleLevel(src, samp, i.uv + texel * vec2f(-1.0, 1.0), 0.0).rgb * 0.125;
  c += textureSampleLevel(src, samp, i.uv + texel * vec2f(1.0, -1.0), 0.0).rgb * 0.125;
  c += textureSampleLevel(src, samp, i.uv + texel * vec2f(-1.0, -1.0), 0.0).rgb * 0.125;
  let l = max(c.r, max(c.g, c.b));
  let knee = 0.6;
  let thr = 1.6;
  let soft = clamp(l - thr + knee, 0.0, 2.0 * knee);
  let w = max(soft * soft / (4.0 * knee + 1e-4), l - thr) / max(l, 1e-4);
  return vec4f(min(c * w, vec3f(20.0)), 1.0);
}
`;

export const BLUR_WGSL = POST_FULLSCREEN + /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
fn blur(uv: vec2f, dir: vec2f) -> vec3f {
  let texel = 1.0 / vec2f(textureDimensions(src));
  var w = array<f32, 5>(0.227, 0.194, 0.122, 0.054, 0.016);
  var c = textureSampleLevel(src, samp, uv, 0.0).rgb * w[0];
  for (var k = 1; k < 5; k++) {
    let o = dir * texel * f32(k) * 1.6;
    c += textureSampleLevel(src, samp, uv + o, 0.0).rgb * w[k];
    c += textureSampleLevel(src, samp, uv - o, 0.0).rgb * w[k];
  }
  return c;
}
@fragment fn fs_blurH(i: FOut) -> @location(0) vec4f { return vec4f(blur(i.uv, vec2f(1.0, 0.0)), 1.0); }
@fragment fn fs_blurV(i: FOut) -> @location(0) vec4f { return vec4f(blur(i.uv, vec2f(0.0, 1.0)), 1.0); }
`;

export const SHAFTS_WGSL = POST_FULLSCREEN + /* wgsl */ `
struct ShaftParams { sun: vec4f, color: vec4f };  // sun.xy uv, sun.z samples, sun.w strength
@group(0) @binding(0) var depthTex: texture_depth_2d;
@group(0) @binding(1) var<uniform> sp: ShaftParams;
@fragment fn fs_shafts(i: FOut) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(depthTex));
  let n = sp.sun.z;
  if (sp.sun.w <= 0.0) { return vec4f(0.0, 0.0, 0.0, 1.0); }
  var uv = i.uv;
  let delta = (sp.sun.xy - uv) / n * 0.85;
  var decay = 1.0;
  var sum = 0.0;
  let jitter = fract(sin(dot(i.uv, vec2f(12.9898, 78.233))) * 43758.5453);
  uv += delta * jitter;
  for (var k = 0.0; k < n; k += 1.0) {
    let c = clamp(uv, vec2f(0.0), vec2f(0.999));
    let d = textureLoad(depthTex, vec2i(c * size), 0);
    let sky = select(0.0, 1.0, d >= 0.99999);
    let near = exp(-length(c - sp.sun.xy) * 3.0);
    sum += sky * near * decay;
    decay *= 0.965;
    uv += delta;
  }
  return vec4f(sp.color.rgb * sum / n * sp.sun.w, 1.0);
}
`;

export const COMPOSITE_WGSL = POST_FULLSCREEN + /* wgsl */ `
struct CompParams { p: vec4f };  // exposure, bloomStrength, shaftStrength, tonemap (0 AgX, 1 ACES)
@group(0) @binding(0) var hdr: texture_2d<f32>;
@group(0) @binding(1) var bloomTex: texture_2d<f32>;
@group(0) @binding(2) var shaftTex: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;
@group(0) @binding(4) var<uniform> cp: CompParams;

// AgX (minimal polynomial fit, public-domain formulation by Benjamin Wrensch).
fn agxContrast(x: vec3f) -> vec3f {
  let x2 = x * x;
  let x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
fn agx(c: vec3f) -> vec3f {
  let inset = mat3x3f(vec3f(0.842479062253094, 0.0423282422610123, 0.0423756549057051),
                      vec3f(0.0784335999999992, 0.878468636469772, 0.0784336),
                      vec3f(0.0792237451477643, 0.0791661274605434, 0.879142973793104));
  let outset = mat3x3f(vec3f(1.19687900512017, -0.0528968517574562, -0.0529716355144438),
                       vec3f(-0.0980208811401368, 1.15190312990417, -0.0980434501171241),
                       vec3f(-0.0990297440797205, -0.0989611768448433, 1.15107367264116));
  let minEv = -12.47393;
  let maxEv = 4.026069;
  var v = inset * c;
  v = clamp(log2(max(v, vec3f(1e-10))), vec3f(minEv), vec3f(maxEv));
  v = (v - minEv) / (maxEv - minEv);
  v = agxContrast(v);
  // "Punchy" look: more saturation and a little contrast for rich fantasy colour.
  let luma = dot(v, vec3f(0.2126, 0.7152, 0.0722));
  v = luma + 1.32 * (v - luma);
  v = clamp((v - 0.5) * 1.06 + 0.5, vec3f(0.0), vec3f(1.0));
  v = outset * v;
  return pow(max(v, vec3f(0.0)), vec3f(2.2)); // back to linear for the sRGB encode below
}
fn aces(x: vec3f) -> vec3f {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
}
@fragment fn fs_composite(i: FOut) -> @location(0) vec4f {
  var c = textureSampleLevel(hdr, samp, i.uv, 0.0).rgb;
  c += textureSampleLevel(bloomTex, samp, i.uv, 0.0).rgb * cp.p.y;
  c += textureSampleLevel(shaftTex, samp, i.uv, 0.0).rgb * cp.p.z;
  c *= cp.p.x;
  var m: vec3f;
  if (cp.p.w > 0.5) { m = aces(c); } else { m = agx(c); }
  let vig = 1.0 - 0.18 * pow(length(i.uv - 0.5) * 1.35, 2.5);
  m *= vig;
  var srgb = pow(clamp(m, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
  let dither = (fract(sin(dot(i.uv, vec2f(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  srgb += dither;
  return vec4f(srgb, 1.0);
}
`;






