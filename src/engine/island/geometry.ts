/**
 * Island test scene — CPU mesh builder.
 * Vertex layout (13 floats, 52 bytes):
 *   pos.xyz | normal.xyz | albedo.rgb | material | ao | bone | aux
 * `bone` >= 0 means the vertex is rigidly driven by bones[bone] (fox limbs, windmill sails).
 * `aux` is a per-material extra channel (wood grain axis, foliage canopy height, ...).
 */
import { type Mat4, type Vec3, transformDir, transformPoint, v3 } from './math.ts';
import { valueNoise3 } from './noise.ts';

export const FLOATS_PER_VERTEX = 13;

export const MAT = {
  TERRAIN: 0,
  WOOD: 1,
  ROCK: 2,
  FOLIAGE: 3,
  BARK: 4,
  FUR: 5,
  SHELL: 6,
  ROOF: 7,
  PLASTER: 8,
  EMISSIVE: 9,
  ROPE: 10,
  SKIN: 11,
  METAL: 12,
  LEAF_CARD: 13,
} as const;

export interface VertexOpts {
  ao?: number;
  bone?: number;
  aux?: number;
  transform?: Mat4;
}

export class MeshBuilder {
  v: number[] = [];
  idx: number[] = [];

  get vertexCount(): number {
    return this.v.length / FLOATS_PER_VERTEX;
  }

  vert(p: Vec3, n: Vec3, c: Vec3, mat: number, ao = 1, bone = -1, aux = 0): number {
    this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], mat, ao, bone, aux);
    return this.vertexCount - 1;
  }

  tri(a: number, b: number, c: number) {
    this.idx.push(a, b, c);
  }

  private xf(p: Vec3, n: Vec3, t?: Mat4): [Vec3, Vec3] {
    if (!t) return [p, n];
    return [transformPoint(t, p), v3.norm(transformDir(t, n))];
  }

  /** Axis-aligned box in local space (center, half extents), optional transform. */
  box(center: Vec3, half: Vec3, color: Vec3, mat: number, o: VertexOpts = {}) {
    const [cx, cy, cz] = center, [hx, hy, hz] = half;
    const faces: { n: Vec3; corners: Vec3[] }[] = [
      { n: [1, 0, 0], corners: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
      { n: [-1, 0, 0], corners: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
      { n: [0, 1, 0], corners: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
      { n: [0, -1, 0], corners: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
      { n: [0, 0, 1], corners: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
      { n: [0, 0, -1], corners: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
    ];
    for (const f of faces) {
      const base: number[] = [];
      for (const c of f.corners) {
        const [p, n] = this.xf([cx + c[0], cy + c[1], cz + c[2]], f.n, o.transform);
        // Bottom faces and lower corners get a little baked occlusion.
        const ao = (o.ao ?? 1) * (f.n[1] < 0 ? 0.55 : c[1] < 0 ? 0.82 : 1);
        base.push(this.vert(p, n, color, mat, ao, o.bone ?? -1, o.aux ?? 0));
      }
      this.tri(base[0], base[1], base[2]);
      this.tri(base[0], base[2], base[3]);
    }
  }

  /** Capped, tapered cylinder from p0 to p1 (world/local space), optional transform. */
  cylinder(p0: Vec3, p1: Vec3, r0: number, r1: number, sides: number, color: Vec3, mat: number, o: VertexOpts & { caps?: boolean; jitter?: number } = {}) {
    const axis = v3.sub(p1, p0);
    const len = v3.len(axis);
    const dir = v3.norm(axis);
    const ref: Vec3 = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = v3.norm(v3.cross(ref, dir));
    const w = v3.cross(dir, u);
    const slope = (r0 - r1) / Math.max(len, 1e-4);
    const ring = (center: Vec3, r: number, ao: number) => {
      const ids: number[] = [];
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const jit = o.jitter ? 1 + (valueNoise3(center[0] * 3 + i, center[1] * 3, center[2] * 3) - 0.5) * o.jitter : 1;
        const radial = v3.add(v3.scale(u, Math.cos(a)), v3.scale(w, Math.sin(a)));
        const p = v3.add(center, v3.scale(radial, r * jit));
        const n = v3.norm(v3.add(radial, v3.scale(dir, slope)));
        const [tp, tn] = this.xf(p, n, o.transform);
        ids.push(this.vert(tp, tn, color, mat, (o.ao ?? 1) * ao, o.bone ?? -1, o.aux ?? 0));
      }
      return ids;
    };
    const a = ring(p0, r0, 0.8);
    const b = ring(p1, r1, 1);
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      this.tri(a[i], a[j], b[j]);
      this.tri(a[i], b[j], b[i]);
    }
    if (o.caps !== false) {
      const capIds = (center: Vec3, r: number, n: Vec3, flip: boolean) => {
        const [cp, cn] = this.xf(center, n, o.transform);
        const c = this.vert(cp, cn, color, mat, o.ao ?? 1, o.bone ?? -1, o.aux ?? 0);
        const ids: number[] = [];
        for (let i = 0; i < sides; i++) {
          const ang = (i / sides) * Math.PI * 2;
          const radial = v3.add(v3.scale(u, Math.cos(ang)), v3.scale(w, Math.sin(ang)));
          const [tp] = this.xf(v3.add(center, v3.scale(radial, r)), n, o.transform);
          ids.push(this.vert(tp, cn, color, mat, o.ao ?? 1, o.bone ?? -1, o.aux ?? 0));
        }
        for (let i = 0; i < sides; i++) {
          const j = (i + 1) % sides;
          if (flip) this.tri(c, ids[j], ids[i]);
          else this.tri(c, ids[i], ids[j]);
        }
      };
      capIds(p0, r0, v3.scale(dir, -1), true);
      capIds(p1, r1, dir, false);
    }
  }

  /**
   * Welded lat/long ellipsoid with optional noise displacement and smooth normals.
   * `shade(localDir)` may return per-vertex albedo / ao overrides.
   */
  ellipsoid(center: Vec3, radii: Vec3, rings: number, segs: number, color: Vec3, mat: number,
    o: VertexOpts & { noise?: number; noiseFreq?: number; seed?: number; flatBottom?: number; displace?: (d: Vec3) => number; shade?: (d: Vec3, p: Vec3) => { c?: Vec3; ao?: number; aux?: number } } = {}) {
    const start = this.vertexCount;
    const pos: Vec3[] = [];
    const meta: { c: Vec3; ao: number; aux: number }[] = [];
    const dirs: Vec3[] = [];
    const push = (d: Vec3) => {
      const nf = o.noiseFreq ?? 2.2;
      const sd = o.seed ?? 0;
      const disp = o.noise ? 1 + (valueNoise3(d[0] * nf + sd, d[1] * nf + sd * 0.7, d[2] * nf - sd) - 0.5) * 2 * o.noise
        + (o.noise ? (valueNoise3(d[0] * nf * 3.1 + sd, d[1] * nf * 3.1, d[2] * nf * 3.1) - 0.5) * o.noise * 0.6 : 0) : 1;
      let p: Vec3 = [center[0] + d[0] * radii[0] * disp, center[1] + d[1] * radii[1] * disp, center[2] + d[2] * radii[2] * disp];
      if (o.displace) {
        const off = o.displace(d);
        p = [p[0] + d[0] * off, p[1] + d[1] * off, p[2] + d[2] * off];
      }
      if (o.flatBottom !== undefined && p[1] < center[1] - radii[1] * o.flatBottom) {
        p = [p[0], center[1] - radii[1] * o.flatBottom, p[2]];
      }
      pos.push(p);
      dirs.push(d);
      const s = o.shade ? o.shade(d, p) : {};
      meta.push({ c: s.c ?? color, ao: (s.ao ?? 1) * (o.ao ?? 1), aux: s.aux ?? o.aux ?? 0 });
    };
    push([0, 1, 0]);
    for (let r = 1; r < rings; r++) {
      const phi = (r / rings) * Math.PI;
      for (let s = 0; s < segs; s++) {
        const th = (s / segs) * Math.PI * 2;
        push([Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)]);
      }
    }
    push([0, -1, 0]);
    const tris: number[] = [];
    const ringStart = (r: number) => 1 + (r - 1) * segs;
    for (let s = 0; s < segs; s++) tris.push(0, ringStart(1) + ((s + 1) % segs), ringStart(1) + s);
    for (let r = 1; r < rings - 1; r++) {
      for (let s = 0; s < segs; s++) {
        const a = ringStart(r) + s, b = ringStart(r) + ((s + 1) % segs);
        const c = ringStart(r + 1) + s, d = ringStart(r + 1) + ((s + 1) % segs);
        tris.push(a, b, d, a, d, c);
      }
    }
    const last = pos.length - 1;
    for (let s = 0; s < segs; s++) tris.push(last, ringStart(rings - 1) + s, ringStart(rings - 1) + ((s + 1) % segs));
    // Smooth normals from welded faces.
    const nrm: Vec3[] = pos.map(() => [0, 0, 0] as Vec3);
    for (let i = 0; i < tris.length; i += 3) {
      const a = pos[tris[i]], b = pos[tris[i + 1]], c = pos[tris[i + 2]];
      const fn = v3.cross(v3.sub(b, a), v3.sub(c, a));
      for (let k = 0; k < 3; k++) {
        const n = nrm[tris[i + k]];
        n[0] += fn[0]; n[1] += fn[1]; n[2] += fn[2];
      }
    }
    for (let i = 0; i < pos.length; i++) {
      const [p, n] = this.xf(pos[i], v3.norm(nrm[i]), o.transform);
      this.vert(p, n, meta[i].c, mat, meta[i].ao, o.bone ?? -1, meta[i].aux);
    }
    // Winding: triangles are wound CCW-from-outside (cross product points outward).
    for (let i = 0; i < tris.length; i += 3) {
      this.tri(start + tris[i], start + tris[i + 1], start + tris[i + 2]);
    }
    return dirs;
  }

  /** Smooth tube along a polyline (ropes, cables, tails). */
  tube(points: Vec3[], radius: number, sides: number, color: Vec3, mat: number, o: VertexOpts = {}) {
    const rings: number[][] = [];
    for (let i = 0; i < points.length; i++) {
      const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
      const t = v3.norm(v3.sub(next, prev));
      const ref: Vec3 = Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = v3.norm(v3.cross(ref, t));
      const w = v3.cross(t, u);
      const ids: number[] = [];
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        const radial = v3.add(v3.scale(u, Math.cos(a)), v3.scale(w, Math.sin(a)));
        const [tp, tn] = this.xf(v3.add(points[i], v3.scale(radial, radius)), radial, o.transform);
        ids.push(this.vert(tp, tn, color, mat, o.ao ?? 1, o.bone ?? -1, o.aux ?? (i / Math.max(1, points.length - 1))));
      }
      rings.push(ids);
    }
    for (let i = 0; i < rings.length - 1; i++) {
      for (let s = 0; s < sides; s++) {
        const j = (s + 1) % sides;
        this.tri(rings[i][s], rings[i][j], rings[i + 1][j]);
        this.tri(rings[i][s], rings[i + 1][j], rings[i + 1][s]);
      }
    }
  }

  /** Gabled roof prism: ridge along local X. */
  gableRoof(center: Vec3, halfX: number, halfZ: number, height: number, overhang: number, color: Vec3, mat: number, o: VertexOpts = {}) {
    const hx = halfX + overhang, hz = halfZ + overhang;
    const [cx, cy, cz] = center;
    const ridgeA: Vec3 = [cx - hx, cy + height, cz], ridgeB: Vec3 = [cx + hx, cy + height, cz];
    const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => {
      const n = v3.norm(v3.cross(v3.sub(b, a), v3.sub(d, a)));
      const ids = [a, b, c, d].map((p, k) => {
        const [tp, tn] = this.xf(p, n, o.transform);
        return this.vert(tp, tn, color, mat, (o.ao ?? 1) * (k < 2 ? 0.75 : 1), o.bone ?? -1, o.aux ?? 0);
      });
      this.tri(ids[0], ids[1], ids[2]);
      this.tri(ids[0], ids[2], ids[3]);
    };
    // Two sloped faces (eaves -> ridge) and a thickness lip.
    quad([cx - hx, cy, cz + hz], [cx + hx, cy, cz + hz], ridgeB, ridgeA);
    quad([cx + hx, cy, cz - hz], [cx - hx, cy, cz - hz], ridgeA, ridgeB);
    // Gable end triangles (plaster) are closed by the caller's wall boxes; add underside.
    quad([cx - hx, cy - 0.05, cz - hz], [cx + hx, cy - 0.05, cz - hz], [cx + hx, cy - 0.05, cz + hz], [cx - hx, cy - 0.05, cz + hz]);
  }

  /** Gable end wall triangle in the YZ plane at x. */
  gableEnd(x: number, cy: number, cz: number, halfZ: number, height: number, normalX: number, color: Vec3, mat: number, o: VertexOpts = {}) {
    const pts: Vec3[] = [[x, cy, cz - halfZ], [x, cy, cz + halfZ], [x, cy + height, cz]];
    const ids = pts.map((p) => {
      const [tp, tn] = this.xf(p, [normalX, 0, 0], o.transform);
      return this.vert(tp, tn, color, mat, o.ao ?? 1, o.bone ?? -1, o.aux ?? 0);
    });
    if (normalX > 0) this.tri(ids[0], ids[2], ids[1]);
    else this.tri(ids[0], ids[1], ids[2]);
  }

  append(other: MeshBuilder) {
    const base = this.vertexCount;
    for (const x of other.v) this.v.push(x);
    for (const i of other.idx) this.idx.push(i + base);
  }

  build(): { vertices: Float32Array; indices: Uint32Array } {
    return { vertices: new Float32Array(this.v), indices: new Uint32Array(this.idx) };
  }
}
