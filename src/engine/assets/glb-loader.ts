/**
 * DREAM Engine — In-House Binary glTF 2.0 (.glb) Loader
 * Pure TypeScript, zero external dependencies.
 *
 * Parses glTF 2.0 binary (.glb) containers:
 *   1. 12-byte header (magic 0x46546C67 "glTF", version 2, total byte length)
 *   2. Chunk 0 (0x4E4F534A "JSON") -> glTF 2.0 scene graph, accessors, skins, animations, materials
 *   3. Chunk 1 (0x004E4942 "BIN\0") -> vertex attributes, indices, inverseBindMatrices, keyframe tracks, embedded PNG/JPEG textures
 *   4. In-house RFC 1950/1951 Inflate + PNG RGBA8 decoder so embedded PNG textures decode
 *      synchronously into RGBA8 Uint8Array buffers in both Node.js tests and browser WebGPU/WebGL2.
 */

import { Mat4 } from '../math/mat4.ts';
import { Quat } from '../math/quat.ts';
import { Vec3 } from '../math/vec3.ts';
import {
  MeshGeometry,
  MaterialProperties,
  PbrTextureData,
  computeVertexTangents,
} from '../scene/mesh.ts';

const GLB_MAGIC = 0x46546c67; // "glTF"
const GLB_VERSION = 2;
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const CHUNK_BIN = 0x004e4942;  // "BIN\0"

// glTF componentType constants
const COMP_BYTE = 5120;
const COMP_UBYTE = 5121;
const COMP_SHORT = 5122;
const COMP_USHORT = 5123;
const COMP_UINT = 5125;
const COMP_FLOAT = 5126;

const TYPE_COUNTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

export interface GlbNode {
  index: number;
  name: string;
  parentIndex: number;
  children: number[];
  translation: Vec3;
  rotation: Quat;
  scale: Vec3;
  meshIndex?: number;
  skinIndex?: number;
}

export interface GlbSkin {
  name: string;
  skeletonRootNode: number;
  joints: number[]; // Node indices for each joint (0 .. joints.length - 1)
  jointNames: string[];
  inverseBindMatrices: Mat4[];
}

export type GlbAnimationPath = 'translation' | 'rotation' | 'scale';
export type GlbInterpolation = 'LINEAR' | 'STEP' | 'CUBICSPLINE';

export interface GlbAnimationChannel {
  targetNode: number;
  targetName: string;
  path: GlbAnimationPath;
  interpolation: GlbInterpolation;
  times: Float32Array;
  values: Float32Array;
}

export interface GlbAnimationClip {
  name: string;
  duration: number;
  channels: GlbAnimationChannel[];
}

export interface GlbMeshPrimitive {
  name: string;
  geometry: MeshGeometry;
  material: MaterialProperties;
  skinIndex?: number;
  nodeIndex?: number;
}

export interface ParsedGlbAsset {
  json: Record<string, unknown>;
  nodes: GlbNode[];
  meshes: GlbMeshPrimitive[];
  materials: MaterialProperties[];
  textures: PbrTextureData[];
  skins: GlbSkin[];
  animations: GlbAnimationClip[];
}

// ---------------------------------------------------------------------------
// In-House Pure-TypeScript RFC 1951 DEFLATE / RFC 1950 ZLIB + PNG RGBA8 Decoder
// ---------------------------------------------------------------------------

const FIXED_LEN_LITS = new Uint8Array(288);
for (let i = 0; i <= 143; i++) FIXED_LEN_LITS[i] = 8;
for (let i = 144; i <= 255; i++) FIXED_LEN_LITS[i] = 9;
for (let i = 256; i <= 279; i++) FIXED_LEN_LITS[i] = 7;
for (let i = 280; i <= 287; i++) FIXED_LEN_LITS[i] = 8;

const FIXED_DIST_LITS = new Uint8Array(32);
FIXED_DIST_LITS.fill(5);

const CLEN_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
const LEN_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
];
const LEN_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
  3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DIST_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
  7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];

interface HuffTable {
  counts: Uint16Array;
  symbols: Uint16Array;
}

function buildHuffTable(lengths: Uint8Array): HuffTable {
  const counts = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i++) {
    const l = lengths[i];
    if (l > 0 && l < 16) counts[l]++;
  }
  const offsets = new Uint16Array(16);
  let total = 0;
  for (let i = 1; i < 16; i++) {
    offsets[i] = total;
    total += counts[i];
  }
  const symbols = new Uint16Array(total);
  for (let i = 0; i < lengths.length; i++) {
    const l = lengths[i];
    if (l > 0 && l < 16) {
      symbols[offsets[l]++] = i;
    }
  }
  return { counts, symbols };
}

function inflateZlib(src: Uint8Array, expectedSize?: number): Uint8Array {
  // Skip 2-byte zlib header (CMF, FLG)
  let bytePos = 2;
  let bitBuf = 0;
  let bitCnt = 0;

  const bits = (n: number): number => {
    while (bitCnt < n) {
      bitBuf |= (src[bytePos++] ?? 0) << bitCnt;
      bitCnt += 8;
    }
    const val = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCnt -= n;
    return val;
  };

  const decodeSym = (t: HuffTable): number => {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const count = t.counts[len];
      if (code - count < first) {
        return t.symbols[index + (code - first)];
      }
      index += count;
      first += count;
      first <<= 1;
      code <<= 1;
    }
    return 0;
  };

  let out = new Uint8Array(expectedSize || Math.max(4096, src.length * 4));
  let outPos = 0;
  const ensureOut = (need: number) => {
    if (outPos + need <= out.length) return;
    let nextLen = out.length * 2;
    while (nextLen < outPos + need) nextLen *= 2;
    const grown = new Uint8Array(nextLen);
    grown.set(out);
    out = grown;
  };

  let bfinal = 0;
  while (!bfinal && bytePos <= src.length) {
    bfinal = bits(1);
    const btype = bits(2);

    if (btype === 0) {
      // Uncompressed block
      bitBuf = 0;
      bitCnt = 0;
      const len = (src[bytePos] ?? 0) | ((src[bytePos + 1] ?? 0) << 8);
      bytePos += 4; // skip len + nlen
      ensureOut(len);
      out.set(src.subarray(bytePos, bytePos + len), outPos);
      outPos += len;
      bytePos += len;
    } else if (btype === 1 || btype === 2) {
      let litTable: HuffTable;
      let distTable: HuffTable;
      if (btype === 1) {
        litTable = buildHuffTable(FIXED_LEN_LITS);
        distTable = buildHuffTable(FIXED_DIST_LITS);
      } else {
        const hlit = bits(5) + 257;
        const hdist = bits(5) + 1;
        const hclen = bits(4) + 4;
        const clenLengths = new Uint8Array(19);
        for (let i = 0; i < hclen; i++) {
          clenLengths[CLEN_ORDER[i]] = bits(3);
        }
        const clenTable = buildHuffTable(clenLengths);
        const allLengths = new Uint8Array(hlit + hdist);
        let idx = 0;
        while (idx < hlit + hdist) {
          const sym = decodeSym(clenTable);
          if (sym < 16) {
            allLengths[idx++] = sym;
          } else if (sym === 16) {
            const prev = allLengths[idx - 1] ?? 0;
            const rep = bits(2) + 3;
            for (let r = 0; r < rep; r++) allLengths[idx++] = prev;
          } else if (sym === 17) {
            const rep = bits(3) + 3;
            for (let r = 0; r < rep; r++) allLengths[idx++] = 0;
          } else {
            const rep = bits(7) + 11;
            for (let r = 0; r < rep; r++) allLengths[idx++] = 0;
          }
        }
        litTable = buildHuffTable(allLengths.subarray(0, hlit));
        distTable = buildHuffTable(allLengths.subarray(hlit));
      }

      while (true) {
        const sym = decodeSym(litTable);
        if (sym < 256) {
          ensureOut(1);
          out[outPos++] = sym;
        } else if (sym === 256) {
          break;
        } else {
          const lenIdx = sym - 257;
          const length = (LEN_BASE[lenIdx] ?? 3) + bits(LEN_EXTRA[lenIdx] ?? 0);
          const distSym = decodeSym(distTable);
          const dist = (DIST_BASE[distSym] ?? 1) + bits(DIST_EXTRA[distSym] ?? 0);
          ensureOut(length);
          for (let i = 0; i < length; i++) {
            out[outPos] = out[outPos - dist];
            outPos++;
          }
        }
      }
    } else {
      break;
    }
  }

  return out.subarray(0, outPos);
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decodes an embedded PNG binary buffer into an RGBA8 `PbrTextureData`.
 * Supports 8-bit RGB (colorType=2), RGBA (colorType=6), Grayscale (0), and Grayscale+Alpha (4)
 * across all 5 PNG scanline filters (None, Sub, Up, Average, Paeth).
 */
export function decodePngToRgba8(pngBytes: Uint8Array, srgb = false, name?: string): PbrTextureData {
  // Check PNG signature
  if (
    pngBytes.length < 32 ||
    pngBytes[0] !== 0x89 ||
    pngBytes[1] !== 0x50 ||
    pngBytes[2] !== 0x4e ||
    pngBytes[3] !== 0x47
  ) {
    // Fallback 1x1 neutral pixel if non-PNG
    return {
      width: 1,
      height: 1,
      data: new Uint8Array([255, 255, 255, 255]),
      srgb,
      name,
    };
  }

  const dv = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);
  let offset = 8;
  let width = 1;
  let height = 1;
  let colorType = 6;
  const idatChunks: Uint8Array[] = [];
  let totalIdat = 0;

  while (offset + 8 <= pngBytes.length) {
    const chunkLen = dv.getUint32(offset, false);
    const chunkType =
      String.fromCharCode(pngBytes[offset + 4]) +
      String.fromCharCode(pngBytes[offset + 5]) +
      String.fromCharCode(pngBytes[offset + 6]) +
      String.fromCharCode(pngBytes[offset + 7]);
    const dataStart = offset + 8;

    if (chunkType === 'IHDR') {
      width = dv.getUint32(dataStart, false);
      height = dv.getUint32(dataStart + 4, false);
      colorType = pngBytes[dataStart + 9];
    } else if (chunkType === 'IDAT') {
      const slice = pngBytes.subarray(dataStart, dataStart + chunkLen);
      idatChunks.push(slice);
      totalIdat += slice.length;
    } else if (chunkType === 'IEND') {
      break;
    }
    offset = dataStart + chunkLen + 4; // +4 for CRC
  }

  const compressed = new Uint8Array(totalIdat);
  let pos = 0;
  for (const c of idatChunks) {
    compressed.set(c, pos);
    pos += c.length;
  }

  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const stride = width * bpp;
  const rawScanlines = inflateZlib(compressed, height * (stride + 1));

  const unfiltered = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = rawScanlines[y * (stride + 1)] ?? 0;
    const srcRow = y * (stride + 1) + 1;
    const dstRow = y * stride;
    const prevRow = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const raw = rawScanlines[srcRow + x] ?? 0;
      const a = x >= bpp ? unfiltered[dstRow + x - bpp] : 0;
      const b = y > 0 ? unfiltered[prevRow + x] : 0;
      const c = x >= bpp && y > 0 ? unfiltered[prevRow + x - bpp] : 0;

      let recon = raw;
      if (filter === 1) recon = (raw + a) & 0xff;
      else if (filter === 2) recon = (raw + b) & 0xff;
      else if (filter === 3) recon = (raw + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) recon = (raw + paethPredictor(a, b, c)) & 0xff;

      unfiltered[dstRow + x] = recon;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  if (bpp === 4) {
    rgba.set(unfiltered);
  } else if (bpp === 3) {
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4 + 0] = unfiltered[i * 3 + 0];
      rgba[i * 4 + 1] = unfiltered[i * 3 + 1];
      rgba[i * 4 + 2] = unfiltered[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
  } else if (bpp === 2) {
    for (let i = 0; i < width * height; i++) {
      const g = unfiltered[i * 2 + 0];
      rgba[i * 4 + 0] = g;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = g;
      rgba[i * 4 + 3] = unfiltered[i * 2 + 1];
    }
  } else {
    for (let i = 0; i < width * height; i++) {
      const g = unfiltered[i];
      rgba[i * 4 + 0] = g;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = g;
      rgba[i * 4 + 3] = 255;
    }
  }

  return { width, height, data: rgba, srgb, name };
}

// ---------------------------------------------------------------------------
// Accessor Reading Helpers
// ---------------------------------------------------------------------------

interface GltfAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  normalized?: boolean;
  count: number;
  type: string;
}

interface GltfBufferView {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
}

function componentByteSize(componentType: number): number {
  switch (componentType) {
    case COMP_BYTE:
    case COMP_UBYTE:
      return 1;
    case COMP_SHORT:
    case COMP_USHORT:
      return 2;
    case COMP_UINT:
    case COMP_FLOAT:
      return 4;
    default:
      throw new Error(`Unsupported glTF componentType: ${componentType}`);
  }
}

function readComponentAsFloat(
  dv: DataView,
  byteOffset: number,
  componentType: number,
  normalized = false
): number {
  switch (componentType) {
    case COMP_FLOAT:
      return dv.getFloat32(byteOffset, true);
    case COMP_UBYTE: {
      const v = dv.getUint8(byteOffset);
      return normalized ? v / 255.0 : v;
    }
    case COMP_BYTE: {
      const v = dv.getInt8(byteOffset);
      return normalized ? Math.max(-1.0, v / 127.0) : v;
    }
    case COMP_USHORT: {
      const v = dv.getUint16(byteOffset, true);
      return normalized ? v / 65535.0 : v;
    }
    case COMP_SHORT: {
      const v = dv.getInt16(byteOffset, true);
      return normalized ? Math.max(-1.0, v / 32767.0) : v;
    }
    case COMP_UINT:
      return dv.getUint32(byteOffset, true);
    default:
      return 0;
  }
}

function readAccessorFloats(
  accessors: GltfAccessor[],
  bufferViews: GltfBufferView[],
  binChunk: Uint8Array,
  accessorIndex: number
): Float32Array {
  const acc = accessors[accessorIndex];
  if (!acc) throw new Error(`Missing glTF accessor ${accessorIndex}`);
  const numComps = TYPE_COUNTS[acc.type] ?? 1;
  const out = new Float32Array(acc.count * numComps);
  if (acc.bufferView === undefined) return out;

  const bv = bufferViews[acc.bufferView];
  const compSize = componentByteSize(acc.componentType);
  const elemSize = compSize * numComps;
  const stride = bv.byteStride && bv.byteStride > 0 ? bv.byteStride : elemSize;
  const baseOffset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const dv = new DataView(binChunk.buffer, binChunk.byteOffset, binChunk.byteLength);

  for (let i = 0; i < acc.count; i++) {
    const elemStart = baseOffset + i * stride;
    for (let c = 0; c < numComps; c++) {
      out[i * numComps + c] = readComponentAsFloat(
        dv,
        elemStart + c * compSize,
        acc.componentType,
        Boolean(acc.normalized)
      );
    }
  }
  return out;
}

function readAccessorUint16(
  accessors: GltfAccessor[],
  bufferViews: GltfBufferView[],
  binChunk: Uint8Array,
  accessorIndex: number
): Uint16Array {
  const acc = accessors[accessorIndex];
  if (!acc) throw new Error(`Missing glTF accessor ${accessorIndex}`);
  const numComps = TYPE_COUNTS[acc.type] ?? 1;
  const out = new Uint16Array(acc.count * numComps);
  if (acc.bufferView === undefined) return out;

  const bv = bufferViews[acc.bufferView];
  const compSize = componentByteSize(acc.componentType);
  const elemSize = compSize * numComps;
  const stride = bv.byteStride && bv.byteStride > 0 ? bv.byteStride : elemSize;
  const baseOffset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const dv = new DataView(binChunk.buffer, binChunk.byteOffset, binChunk.byteLength);

  for (let i = 0; i < acc.count; i++) {
    const elemStart = baseOffset + i * stride;
    for (let c = 0; c < numComps; c++) {
      out[i * numComps + c] = Math.round(
        readComponentAsFloat(dv, elemStart + c * compSize, acc.componentType, false)
      );
    }
  }
  return out;
}

function readAccessorIndices(
  accessors: GltfAccessor[],
  bufferViews: GltfBufferView[],
  binChunk: Uint8Array,
  accessorIndex: number
): Uint16Array | Uint32Array {
  const acc = accessors[accessorIndex];
  if (!acc) throw new Error(`Missing glTF index accessor ${accessorIndex}`);
  const useUint32 = acc.componentType === COMP_UINT || acc.count > 65535;
  const out = useUint32 ? new Uint32Array(acc.count) : new Uint16Array(acc.count);
  if (acc.bufferView === undefined) return out;

  const bv = bufferViews[acc.bufferView];
  const compSize = componentByteSize(acc.componentType);
  const stride = bv.byteStride && bv.byteStride > 0 ? bv.byteStride : compSize;
  const baseOffset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const dv = new DataView(binChunk.buffer, binChunk.byteOffset, binChunk.byteLength);

  for (let i = 0; i < acc.count; i++) {
    out[i] = Math.round(readComponentAsFloat(dv, baseOffset + i * stride, acc.componentType, false));
  }
  return out;
}

function computeSmoothNormals(positions: Float32Array, indices: Uint16Array | Uint32Array): Float32Array {
  const vCount = Math.floor(positions.length / 3);
  const normals = new Float32Array(vCount * 3);
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    const ax = positions[i1 * 3] - positions[i0 * 3];
    const ay = positions[i1 * 3 + 1] - positions[i0 * 3 + 1];
    const az = positions[i1 * 3 + 2] - positions[i0 * 3 + 2];

    const bx = positions[i2 * 3] - positions[i0 * 3];
    const by = positions[i2 * 3 + 1] - positions[i0 * 3 + 1];
    const bz = positions[i2 * 3 + 2] - positions[i0 * 3 + 2];

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;

    for (const idx of [i0, i1, i2]) {
      normals[idx * 3] += nx;
      normals[idx * 3 + 1] += ny;
      normals[idx * 3 + 2] += nz;
    }
  }
  for (let i = 0; i < vCount; i++) {
    const len = Math.hypot(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]) || 1.0;
    normals[i * 3] /= len;
    normals[i * 3 + 1] /= len;
    normals[i * 3 + 2] /= len;
  }
  return normals;
}

function decomposeMatrixToTrs(m: number[]): { translation: Vec3; rotation: Quat; scale: Vec3 } {
  const translation = new Vec3(m[12] ?? 0, m[13] ?? 0, m[14] ?? 0);
  const sx = Math.hypot(m[0], m[1], m[2]) || 1;
  const sy = Math.hypot(m[4], m[5], m[6]) || 1;
  const sz = Math.hypot(m[8], m[9], m[10]) || 1;
  const scale = new Vec3(sx, sy, sz);

  const m00 = m[0] / sx, m01 = m[4] / sy, m02 = m[8] / sz;
  const m10 = m[1] / sx, m11 = m[5] / sy, m12 = m[9] / sz;
  const m20 = m[2] / sx, m21 = m[6] / sy, m22 = m[10] / sz;

  const trace = m00 + m11 + m22;
  const rotation = new Quat();
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    rotation.set((m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s);
  } else if (m00 > m11 && m00 > m22) {
    const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
    rotation.set(0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s);
  } else if (m11 > m22) {
    const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
    rotation.set((m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s);
  } else {
    const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
    rotation.set((m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s);
  }
  return { translation, rotation, scale };
}

/**
 * Parses a glTF 2.0 binary (.glb) ArrayBuffer or Uint8Array into meshes, PBR materials,
 * decoded RGBA8 textures, skeletons (joints + inverseBindMatrices), and animation clips.
 */
export function parseGlb(input: ArrayBuffer | Uint8Array): ParsedGlbAsset {
  const bytes =
    input instanceof Uint8Array
      ? input
      : new Uint8Array(input);

  if (bytes.byteLength < 20) {
    throw new Error(`Invalid GLB buffer: length ${bytes.byteLength} < 20 bytes`);
  }

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = dv.getUint32(0, true);
  if (magic !== GLB_MAGIC) {
    throw new Error(`Invalid GLB magic header: 0x${magic.toString(16)} (expected 0x46546c67 "glTF")`);
  }

  const version = dv.getUint32(4, true);
  if (version !== GLB_VERSION) {
    throw new Error(`Unsupported GLB version: ${version} (expected 2)`);
  }

  const totalLength = dv.getUint32(8, true);
  let offset = 12;
  let jsonText = '';
  let binChunk: Uint8Array = new Uint8Array(0);

  while (offset + 8 <= Math.min(totalLength, bytes.byteLength)) {
    const chunkLength = dv.getUint32(offset, true);
    const chunkType = dv.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkSlice = bytes.subarray(chunkStart, chunkStart + chunkLength);

    if (chunkType === CHUNK_JSON) {
      jsonText = new TextDecoder('utf-8').decode(chunkSlice);
    } else if (chunkType === CHUNK_BIN) {
      binChunk = chunkSlice;
    }
    offset = chunkStart + chunkLength;
  }

  if (!jsonText) {
    throw new Error('GLB file is missing required JSON chunk');
  }

  const gltf = JSON.parse(jsonText) as Record<string, any>;
  const accessors: GltfAccessor[] = gltf.accessors ?? [];
  const bufferViews: GltfBufferView[] = gltf.bufferViews ?? [];
  const rawImages: any[] = gltf.images ?? [];
  const rawTextures: any[] = gltf.textures ?? [];
  const rawMaterials: any[] = gltf.materials ?? [];
  const rawNodes: any[] = gltf.nodes ?? [];
  const rawMeshes: any[] = gltf.meshes ?? [];
  const rawSkins: any[] = gltf.skins ?? [];
  const rawAnimations: any[] = gltf.animations ?? [];

  // 1. Decode Embedded Textures (PNG -> RGBA8)
  const decodedImages: PbrTextureData[] = rawImages.map((img, idx) => {
    if (typeof img.bufferView === 'number') {
      const bv = bufferViews[img.bufferView];
      const start = bv.byteOffset ?? 0;
      const slice = binChunk.subarray(start, start + bv.byteLength);
      return decodePngToRgba8(slice, false, img.name ?? `image_${idx}`);
    }
    return {
      width: 1,
      height: 1,
      data: new Uint8Array([255, 255, 255, 255]),
      srgb: false,
      name: img.name ?? `image_${idx}`,
    };
  });

  const getTextureByGltfIndex = (texIdx: number | undefined, srgb = false): PbrTextureData | undefined => {
    if (texIdx === undefined || texIdx < 0 || texIdx >= rawTextures.length) return undefined;
    const texDef = rawTextures[texIdx];
    const srcIdx = texDef?.source;
    if (srcIdx === undefined || !decodedImages[srcIdx]) return undefined;
    const img = decodedImages[srcIdx];
    return {
      width: img.width,
      height: img.height,
      data: img.data,
      srgb,
      name: img.name,
    };
  };

  // 2. Parse PBR Materials (BaseColor, Tangent Normal, Packed ORM)
  const materials: MaterialProperties[] = rawMaterials.map((m) => {
    const pbr = m.pbrMetallicRoughness ?? {};
    const baseFactor = (pbr.baseColorFactor ?? [1, 1, 1, 1]) as [number, number, number, number];
    const metallicFactor = typeof pbr.metallicFactor === 'number' ? pbr.metallicFactor : 0.5;
    const roughnessFactor = typeof pbr.roughnessFactor === 'number' ? pbr.roughnessFactor : 0.5;
    const emissiveFactor = (m.emissiveFactor ?? [0, 0, 0]) as [number, number, number];

    const baseColorTexture = getTextureByGltfIndex(pbr.baseColorTexture?.index, true);
    const normalTexture = getTextureByGltfIndex(m.normalTexture?.index, false);
    const normalScale = typeof m.normalTexture?.scale === 'number' ? m.normalTexture.scale : 1.0;

    // glTF 2.0 packs Occlusion in R, Roughness in G, Metallic in B
    const mrTex = getTextureByGltfIndex(pbr.metallicRoughnessTexture?.index, false);
    const occTex = getTextureByGltfIndex(m.occlusionTexture?.index, false);
    let ormTexture = mrTex || occTex;

    // If occlusionTexture and metallicRoughnessTexture are separate images of matching size, merge R from occTex and G/B from mrTex
    if (mrTex && occTex && mrTex.data !== occTex.data && mrTex.width === occTex.width && mrTex.height === occTex.height) {
      const merged = new Uint8Array(mrTex.data.length);
      for (let i = 0; i < mrTex.width * mrTex.height; i++) {
        merged[i * 4 + 0] = occTex.data[i * 4 + 0]; // R = Occlusion
        merged[i * 4 + 1] = mrTex.data[i * 4 + 1];  // G = Roughness
        merged[i * 4 + 2] = mrTex.data[i * 4 + 2];  // B = Metallic
        merged[i * 4 + 3] = 255;
      }
      ormTexture = {
        width: mrTex.width,
        height: mrTex.height,
        data: merged,
        srgb: false,
        name: `${mrTex.name || 'mr'}_orm`,
      };
    }

    const occlusionStrength = typeof m.occlusionTexture?.strength === 'number' ? m.occlusionTexture.strength : 1.0;

    return {
      baseColor: [baseFactor[0], baseFactor[1], baseFactor[2], baseFactor[3] ?? 1.0],
      roughness: roughnessFactor,
      metallic: metallicFactor,
      emissive: [emissiveFactor[0], emissiveFactor[1], emissiveFactor[2]],
      emissiveIntensity: Math.max(emissiveFactor[0], emissiveFactor[1], emissiveFactor[2]) > 0 ? 1.0 : 0.0,
      rimIntensity: 0.45,
      baseColorTexture,
      normalTexture,
      normalScale,
      ormTexture,
      occlusionStrength,
    };
  });

  const defaultMaterial: MaterialProperties = materials[0] ?? {
    baseColor: [0.82, 0.84, 0.88, 1.0],
    roughness: 0.38,
    metallic: 0.65,
    emissive: [0, 0, 0],
    emissiveIntensity: 0,
    rimIntensity: 0.45,
  };

  // 3. Parse Scene Graph Nodes
  const nodes: GlbNode[] = rawNodes.map((n, index) => {
    let translation = new Vec3(0, 0, 0);
    let rotation = new Quat(0, 0, 0, 1);
    let scale = new Vec3(1, 1, 1);

    if (Array.isArray(n.matrix) && n.matrix.length === 16) {
      const dec = decomposeMatrixToTrs(n.matrix);
      translation = dec.translation;
      rotation = dec.rotation;
      scale = dec.scale;
    } else {
      if (Array.isArray(n.translation)) {
        translation.set(n.translation[0] ?? 0, n.translation[1] ?? 0, n.translation[2] ?? 0);
      }
      if (Array.isArray(n.rotation)) {
        rotation.set(n.rotation[0] ?? 0, n.rotation[1] ?? 0, n.rotation[2] ?? 0, n.rotation[3] ?? 1);
      }
      if (Array.isArray(n.scale)) {
        scale.set(n.scale[0] ?? 1, n.scale[1] ?? 1, n.scale[2] ?? 1);
      }
    }

    return {
      index,
      name: n.name ?? `node_${index}`,
      parentIndex: -1,
      children: Array.isArray(n.children) ? [...n.children] : [],
      translation,
      rotation,
      scale,
      meshIndex: typeof n.mesh === 'number' ? n.mesh : undefined,
      skinIndex: typeof n.skin === 'number' ? n.skin : undefined,
    };
  });

  for (const node of nodes) {
    for (const childIdx of node.children) {
      if (nodes[childIdx]) {
        nodes[childIdx].parentIndex = node.index;
      }
    }
  }

  // 4. Parse Skins (Joints & InverseBindMatrices)
  const skins: GlbSkin[] = rawSkins.map((s, idx) => {
    const joints: number[] = Array.isArray(s.joints) ? [...s.joints] : [];
    const jointNames = joints.map((nodeIdx) => nodes[nodeIdx]?.name ?? `joint_${nodeIdx}`);
    const inverseBindMatrices: Mat4[] = [];

    if (typeof s.inverseBindMatrices === 'number') {
      const ibmFloats = readAccessorFloats(accessors, bufferViews, binChunk, s.inverseBindMatrices);
      for (let j = 0; j < joints.length; j++) {
        const m = new Mat4();
        m.elements.set(ibmFloats.subarray(j * 16, j * 16 + 16));
        inverseBindMatrices.push(m);
      }
    } else {
      for (let j = 0; j < joints.length; j++) {
        inverseBindMatrices.push(new Mat4());
      }
    }

    return {
      name: s.name ?? `skin_${idx}`,
      skeletonRootNode: typeof s.skeleton === 'number' ? s.skeleton : (joints[0] ?? 0),
      joints,
      jointNames,
      inverseBindMatrices,
    };
  });

  // 5. Parse Meshes & Primitives (Positions, Normals, UVs, Tangents, 4-Bone Skinning JOINTS_0 & WEIGHTS_0)
  const meshes: GlbMeshPrimitive[] = [];
  rawMeshes.forEach((meshDef, meshIdx) => {
    const primitives: any[] = meshDef.primitives ?? [];
    // Find any node referencing this mesh to link skinIndex
    const ownerNode = nodes.find((n) => n.meshIndex === meshIdx);

    primitives.forEach((prim, primIdx) => {
      const attrs = prim.attributes ?? {};
      if (typeof attrs.POSITION !== 'number') return;

      const positions = readAccessorFloats(accessors, bufferViews, binChunk, attrs.POSITION);
      const vertexCount = Math.floor(positions.length / 3);

      let indices: Uint16Array | Uint32Array;
      if (typeof prim.indices === 'number') {
        indices = readAccessorIndices(accessors, bufferViews, binChunk, prim.indices);
      } else {
        indices = vertexCount > 65535 ? new Uint32Array(vertexCount) : new Uint16Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) indices[i] = i;
      }

      const normals =
        typeof attrs.NORMAL === 'number'
          ? readAccessorFloats(accessors, bufferViews, binChunk, attrs.NORMAL)
          : computeSmoothNormals(positions, indices);

      const uvs =
        typeof attrs.TEXCOORD_0 === 'number'
          ? readAccessorFloats(accessors, bufferViews, binChunk, attrs.TEXCOORD_0)
          : new Float32Array(vertexCount * 2);

      const tangents =
        typeof attrs.TANGENT === 'number'
          ? readAccessorFloats(accessors, bufferViews, binChunk, attrs.TANGENT)
          : computeVertexTangents(positions, normals, uvs, indices);

      const joints0 =
        typeof attrs.JOINTS_0 === 'number'
          ? readAccessorUint16(accessors, bufferViews, binChunk, attrs.JOINTS_0)
          : new Uint16Array(vertexCount * 4);

      let weights0: Float32Array;
      if (typeof attrs.WEIGHTS_0 === 'number') {
        weights0 = readAccessorFloats(accessors, bufferViews, binChunk, attrs.WEIGHTS_0);
        // Normalize 4-bone weights per vertex so sum == 1.0
        for (let v = 0; v < vertexCount; v++) {
          const base = v * 4;
          const sum = weights0[base] + weights0[base + 1] + weights0[base + 2] + weights0[base + 3];
          if (sum > 1e-6) {
            const inv = 1.0 / sum;
            weights0[base] *= inv;
            weights0[base + 1] *= inv;
            weights0[base + 2] *= inv;
            weights0[base + 3] *= inv;
          } else {
            weights0[base] = 1.0;
            weights0[base + 1] = 0.0;
            weights0[base + 2] = 0.0;
            weights0[base + 3] = 0.0;
          }
        }
      } else {
        weights0 = new Float32Array(vertexCount * 4);
        for (let v = 0; v < vertexCount; v++) {
          weights0[v * 4] = 1.0;
        }
      }

      const geometry = new MeshGeometry({
        positions,
        normals,
        uvs,
        tangents,
        joints0,
        weights0,
        indices,
      });

      const mat =
        typeof prim.material === 'number' && materials[prim.material]
          ? materials[prim.material]
          : defaultMaterial;

      meshes.push({
        name: meshDef.name ? `${meshDef.name}_${primIdx}` : `mesh_${meshIdx}_${primIdx}`,
        geometry,
        material: mat,
        skinIndex: ownerNode?.skinIndex ?? (skins.length > 0 ? 0 : undefined),
        nodeIndex: ownerNode?.index,
      });
    });
  });

  // 6. Parse Animation Clips (Keyframes & Channels)
  const animations: GlbAnimationClip[] = rawAnimations.map((anim, animIdx) => {
    const samplers: any[] = anim.samplers ?? [];
    const rawChannels: any[] = anim.channels ?? [];
    const channels: GlbAnimationChannel[] = [];
    let maxTime = 0;

    for (const ch of rawChannels) {
      const sampler = samplers[ch.sampler];
      const target = ch.target;
      if (!sampler || !target || typeof target.node !== 'number') continue;
      const path = target.path as GlbAnimationPath;
      if (path !== 'translation' && path !== 'rotation' && path !== 'scale') continue;

      const times = readAccessorFloats(accessors, bufferViews, binChunk, sampler.input);
      const values = readAccessorFloats(accessors, bufferViews, binChunk, sampler.output);
      if (times.length > 0) {
        const endT = times[times.length - 1];
        if (endT > maxTime) maxTime = endT;
      }

      channels.push({
        targetNode: target.node,
        targetName: nodes[target.node]?.name ?? `node_${target.node}`,
        path,
        interpolation: (sampler.interpolation as GlbInterpolation) || 'LINEAR',
        times,
        values,
      });
    }

    return {
      name: anim.name ?? `clip_${animIdx}`,
      duration: maxTime,
      channels,
    };
  });

  return {
    json: gltf,
    nodes,
    meshes,
    materials,
    textures: decodedImages,
    skins,
    animations,
  };
}

/**
 * Fetches and parses a binary `.glb` URL in the browser.
 */
export async function loadGlbFromUrl(url: string): Promise<ParsedGlbAsset> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch GLB from ${url}: HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return parseGlb(buf);
}
