/**
 * DREAM Engine — In-House Binary glTF 2.0 (.glb) Loader
 * Pure TypeScript, zero external dependencies.
 *
 * Parses glTF 2.0 binary (.glb) containers:
 *   1. 12-byte header (magic 0x46546C67 "glTF", version 2, total byte length)
 *   2. Chunk 0 (0x4E4F534A "JSON") -> glTF 2.0 scene graph, accessors, skins, animations, materials
 *   3. Chunk 1 (0x004E4942 "BIN\0") -> vertex attributes, indices, inverseBindMatrices, keyframe tracks, embedded PNG textures
 *   4. In-house RFC 1950/1951 Inflate + PNG RGBA8 decoder with strict bounds, CRC/Adler-32 verification,
 *      Huffman tree completeness checks, and work/memory budgets.
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

// Hard security ceilings for untrusted GLB / PNG / DEFLATE inputs
export const MAX_GLB_FILE_BYTES = 64 * 1024 * 1024; // 64 MB max container size
export const MAX_JSON_CHUNK_BYTES = 8 * 1024 * 1024; // 8 MB max JSON chunk
export const MAX_DECODED_TOTAL_BYTES = 128 * 1024 * 1024; // 128 MB aggregate decoded allocation ceiling
export const MAX_PNG_DIMENSION = 4096;
export const MAX_PNG_PIXELS = 4096 * 4096;
export const MAX_INFLATE_OUTPUT_BYTES = MAX_PNG_DIMENSION * (MAX_PNG_DIMENSION * 4 + 1);
export const MAX_INFLATE_WORK_STEPS = 32_000_000;
export const MAX_BUFFERS = 1;
export const MAX_BUFFER_VIEWS = 4096;
export const MAX_ACCESSORS = 4096;
export const MAX_IMAGES = 128;
export const MAX_TEXTURES = 128;
export const MAX_MATERIALS = 256;
export const MAX_MESHES = 512;
export const MAX_PRIMITIVES_PER_MESH = 64;
export const MAX_VERTICES_PER_PRIMITIVE = 500_000;
export const MAX_INDICES_PER_PRIMITIVE = 3_000_000;
export const MAX_ACCESSOR_COUNT = 3_000_000;
export const MAX_NODES = 2048;
export const MAX_NODE_DEPTH = 256;
export const MAX_SKINS = 64;
export const MAX_JOINTS_PER_SKIN = 64;
export const MAX_ANIMATIONS = 128;
export const MAX_CHANNELS_PER_ANIMATION = 512;
export const MAX_KEYFRAMES_PER_CHANNEL = 65536;

class DecodedByteBudget {
  private usedBytes = 0;
  readonly maxBytes: number;

  constructor(maxBytes = MAX_DECODED_TOTAL_BYTES) {
    this.maxBytes = maxBytes;
  }

  reserve(bytes: number, label: string): void {
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new Error(`Invalid byte allocation size for ${label}: ${bytes}`);
    }
    if (this.usedBytes + bytes > this.maxBytes) {
      throw new Error(
        `GLB decoded byte budget exceeded while allocating ${label}: ${this.usedBytes + bytes} > ${this.maxBytes}`
      );
    }
    this.usedBytes += bytes;
  }
}

function isPlainObject(val: unknown): val is Record<string, any> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function assertSafeNonNegInt(val: unknown, label: string, maxVal = Number.MAX_SAFE_INTEGER): number {
  if (typeof val !== 'number' || !Number.isSafeInteger(val) || val < 0 || val > maxVal) {
    throw new Error(`Invalid ${label}: expected integer in [0, ${maxVal}], got ${String(val)}`);
  }
  return val;
}

function assertSafePosInt(val: unknown, label: string, maxVal = Number.MAX_SAFE_INTEGER): number {
  if (typeof val !== 'number' || !Number.isSafeInteger(val) || val < 1 || val > maxVal) {
    throw new Error(`Invalid ${label}: expected integer in [1, ${maxVal}], got ${String(val)}`);
  }
  return val;
}

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

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeCrc32(bytes: Uint8Array, start: number, length: number): number {
  let c = 0xffffffff;
  const end = start + length;
  for (let i = start; i < end; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function computeAdler32(bytes: Uint8Array): number {
  let s1 = 1;
  let s2 = 0;
  const len = bytes.length;
  let i = 0;
  while (i < len) {
    const chunkEnd = Math.min(i + 5552, len);
    while (i < chunkEnd) {
      s1 += bytes[i++];
      s2 += s1;
    }
    s1 %= 65521;
    s2 %= 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

interface HuffTable {
  counts: Uint16Array;
  symbols: Uint16Array;
  isEmpty: boolean;
}

function buildHuffTable(
  lengths: Uint8Array,
  label: string,
  opts: { allowEmpty?: boolean; requireEndOfBlock?: boolean } = {}
): HuffTable {
  const counts = new Uint16Array(16);
  let numCodes = 0;
  for (let i = 0; i < lengths.length; i++) {
    const l = lengths[i];
    if (l > 15) {
      throw new Error(`Invalid DEFLATE Huffman code length ${l} in ${label}`);
    }
    if (l > 0) {
      counts[l]++;
      numCodes++;
    }
  }

  if (opts.requireEndOfBlock && (lengths.length <= 256 || lengths[256] === 0)) {
    throw new Error(`Invalid DEFLATE ${label}: missing End-Of-Block symbol 256`);
  }

  if (numCodes === 0) {
    if (opts.allowEmpty) {
      return { counts, symbols: new Uint16Array(0), isEmpty: true };
    }
    throw new Error(`Invalid DEFLATE ${label}: empty Huffman table`);
  }

  // Verify Kraft inequality at max depth 15 (total leaf budget = 1 << 15 = 32768)
  let usedSpace = 0;
  for (let len = 1; len <= 15; len++) {
    usedSpace += counts[len] * (1 << (15 - len));
  }
  if (usedSpace > 1 << 15) {
    throw new Error(`Invalid DEFLATE ${label}: oversubscribed Huffman tree (${usedSpace} > 32768)`);
  }
  if (usedSpace < 1 << 15) {
    throw new Error(`Invalid DEFLATE ${label}: incomplete Huffman tree (${usedSpace} < 32768)`);
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
    if (l > 0) {
      symbols[offsets[l]++] = i;
    }
  }
  return { counts, symbols, isEmpty: false };
}

const FIXED_LIT_TABLE = buildHuffTable(FIXED_LEN_LITS, 'fixed literal/length table', {
  requireEndOfBlock: true,
});
const FIXED_DIST_TABLE = buildHuffTable(FIXED_DIST_LITS, 'fixed distance table');

function inflateZlib(src: Uint8Array, expectedSize: number, budget: DecodedByteBudget): Uint8Array {
  assertSafePosInt(expectedSize, 'expected inflate output size', MAX_INFLATE_OUTPUT_BYTES);

  // Require at least 2-byte zlib header + 1-byte deflate payload + 4-byte Adler-32 checksum
  if (src.byteLength < 7) {
    throw new Error(`Invalid zlib stream: byteLength ${src.byteLength} < 7`);
  }

  const cmf = src[0];
  const flg = src[1];
  const cm = cmf & 0x0f;
  const cinfo = (cmf >>> 4) & 0x0f;
  if (cm !== 8 || cinfo > 7) {
    throw new Error(`Invalid zlib compression method/window: CM=${cm}, CINFO=${cinfo}`);
  }
  if ((flg & 0x20) !== 0) {
    throw new Error('Unsupported zlib preset dictionary (FDICT=1)');
  }
  if (((cmf << 8) | flg) % 31 !== 0) {
    throw new Error('Invalid zlib header checksum (CMF/FLG FCHECK failed)');
  }

  const deflateEnd = src.byteLength - 4;
  let bytePos = 2;
  let bitBuf = 0;
  let bitCnt = 0;
  let workSteps = 0;
  const maxWorkSteps = Math.min(MAX_INFLATE_WORK_STEPS, Math.max(65536, expectedSize * 32));

  const stepWork = (amount = 1) => {
    workSteps += amount;
    if (workSteps > maxWorkSteps) {
      throw new Error(`DEFLATE work budget exceeded (${workSteps} > ${maxWorkSteps})`);
    }
  };

  const bits = (n: number): number => {
    stepWork(1);
    while (bitCnt < n) {
      if (bytePos >= deflateEnd) {
        throw new Error('Unexpected end of DEFLATE bitstream');
      }
      bitBuf |= src[bytePos++] << bitCnt;
      bitCnt += 8;
    }
    const val = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCnt -= n;
    return val;
  };

  const decodeSym = (t: HuffTable): number => {
    if (t.isEmpty) {
      throw new Error('Invalid DEFLATE stream: attempted to decode from empty Huffman table');
    }
    let code = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len <= 15; len++) {
      code |= bits(1);
      const count = t.counts[len];
      if (code - count < first) {
        const symIdx = index + (code - first);
        if (symIdx < 0 || symIdx >= t.symbols.length) {
          throw new Error('Invalid DEFLATE Huffman symbol index');
        }
        return t.symbols[symIdx];
      }
      index += count;
      first += count;
      first <<= 1;
      code <<= 1;
    }
    throw new Error('Invalid DEFLATE Huffman code');
  };

  budget.reserve(expectedSize, 'PNG scanline inflate buffer');
  const out = new Uint8Array(expectedSize);
  let outPos = 0;

  let bfinal = 0;
  while (!bfinal) {
    stepWork(1);
    bfinal = bits(1);
    const btype = bits(2);

    if (btype === 0) {
      // Uncompressed stored block: align to byte boundary
      bitBuf = 0;
      bitCnt = 0;
      if (bytePos + 4 > deflateEnd) {
        throw new Error('Truncated DEFLATE stored block header');
      }
      const len = src[bytePos] | (src[bytePos + 1] << 8);
      const nlen = src[bytePos + 2] | (src[bytePos + 3] << 8);
      bytePos += 4;
      if (len !== ((~nlen) & 0xffff)) {
        throw new Error(`DEFLATE stored block length mismatch: len=${len}, nlen=${nlen}`);
      }
      if (bytePos + len > deflateEnd) {
        throw new Error('Truncated DEFLATE stored block data');
      }
      if (outPos + len > expectedSize) {
        throw new Error(`DEFLATE stored block output exceeds expected size (${outPos + len} > ${expectedSize})`);
      }
      stepWork(len + 1);
      out.set(src.subarray(bytePos, bytePos + len), outPos);
      outPos += len;
      bytePos += len;
    } else if (btype === 1 || btype === 2) {
      let litTable: HuffTable;
      let distTable: HuffTable;
      if (btype === 1) {
        litTable = FIXED_LIT_TABLE;
        distTable = FIXED_DIST_TABLE;
      } else {
        const hlit = bits(5) + 257;
        const hdist = bits(5) + 1;
        const hclen = bits(4) + 4;
        if (hlit > 286) {
          throw new Error(`Invalid DEFLATE dynamic HLIT count: ${hlit}`);
        }
        if (hdist > 30) {
          throw new Error(`Invalid DEFLATE dynamic HDIST count: ${hdist}`);
        }
        const clenLengths = new Uint8Array(19);
        for (let i = 0; i < hclen; i++) {
          clenLengths[CLEN_ORDER[i]] = bits(3);
        }
        const clenTable = buildHuffTable(clenLengths, 'code-length Huffman table');
        const totalHeaderSyms = hlit + hdist;
        const allLengths = new Uint8Array(totalHeaderSyms);
        let idx = 0;
        while (idx < totalHeaderSyms) {
          stepWork(1);
          const sym = decodeSym(clenTable);
          if (sym < 16) {
            allLengths[idx++] = sym;
          } else if (sym === 16) {
            if (idx === 0) {
              throw new Error('Invalid DEFLATE code-length repeat 16 at index 0');
            }
            const prev = allLengths[idx - 1];
            const rep = bits(2) + 3;
            if (idx + rep > totalHeaderSyms) {
              throw new Error('DEFLATE code-length repeat 16 overflows header table');
            }
            for (let r = 0; r < rep; r++) allLengths[idx++] = prev;
          } else if (sym === 17) {
            const rep = bits(3) + 3;
            if (idx + rep > totalHeaderSyms) {
              throw new Error('DEFLATE code-length repeat 17 overflows header table');
            }
            for (let r = 0; r < rep; r++) allLengths[idx++] = 0;
          } else if (sym === 18) {
            const rep = bits(7) + 11;
            if (idx + rep > totalHeaderSyms) {
              throw new Error('DEFLATE code-length repeat 18 overflows header table');
            }
            for (let r = 0; r < rep; r++) allLengths[idx++] = 0;
          } else {
            throw new Error(`Invalid DEFLATE code-length symbol ${sym}`);
          }
        }
        litTable = buildHuffTable(allLengths.subarray(0, hlit), 'dynamic literal/length table', {
          requireEndOfBlock: true,
        });
        distTable = buildHuffTable(allLengths.subarray(hlit), 'dynamic distance table', {
          allowEmpty: true,
        });
      }

      while (true) {
        stepWork(1);
        const sym = decodeSym(litTable);
        if (sym < 256) {
          if (outPos >= expectedSize) {
            throw new Error(`DEFLATE literal output exceeds expected size (${expectedSize})`);
          }
          out[outPos++] = sym;
        } else if (sym === 256) {
          break;
        } else if (sym <= 285) {
          const lenIdx = sym - 257;
          const length = LEN_BASE[lenIdx] + bits(LEN_EXTRA[lenIdx]);
          const distSym = decodeSym(distTable);
          if (distSym >= 30) {
            throw new Error(`Invalid DEFLATE distance symbol ${distSym}`);
          }
          const dist = DIST_BASE[distSym] + bits(DIST_EXTRA[distSym]);
          if (dist <= 0 || dist > outPos) {
            throw new Error(`Invalid DEFLATE back-reference distance ${dist} at output offset ${outPos}`);
          }
          if (outPos + length > expectedSize) {
            throw new Error(`DEFLATE match output exceeds expected size (${outPos + length} > ${expectedSize})`);
          }
          stepWork(length);
          for (let i = 0; i < length; i++) {
            out[outPos] = out[outPos - dist];
            outPos++;
          }
        } else {
          throw new Error(`Invalid DEFLATE literal/length symbol ${sym}`);
        }
      }
    } else {
      throw new Error(`Invalid DEFLATE block type ${btype} (reserved)`);
    }
  }

  if (outPos !== expectedSize) {
    throw new Error(`DEFLATE output size mismatch: got ${outPos} bytes, expected ${expectedSize}`);
  }
  if (bytePos !== deflateEnd) {
    throw new Error(`DEFLATE stream trailing bytes: ended at ${bytePos}, expected ${deflateEnd}`);
  }

  const expectedAdler =
    ((src[deflateEnd] << 24) |
      (src[deflateEnd + 1] << 16) |
      (src[deflateEnd + 2] << 8) |
      src[deflateEnd + 3]) >>>
    0;
  const actualAdler = computeAdler32(out);
  if (actualAdler !== expectedAdler) {
    throw new Error(
      `Invalid zlib Adler-32 checksum: got 0x${actualAdler.toString(16)}, expected 0x${expectedAdler.toString(16)}`
    );
  }

  return out;
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
export function decodePngToRgba8(
  pngBytes: Uint8Array,
  srgb = false,
  name?: string,
  budget: DecodedByteBudget = new DecodedByteBudget()
): PbrTextureData {
  // Check full 8-byte PNG signature and minimum container size (8 sig + 25 IHDR + 12 IDAT + 12 IEND = 57)
  if (
    !(pngBytes instanceof Uint8Array) ||
    pngBytes.byteLength < 45 ||
    pngBytes.byteLength > MAX_GLB_FILE_BYTES ||
    pngBytes[0] !== 0x89 ||
    pngBytes[1] !== 0x50 ||
    pngBytes[2] !== 0x4e ||
    pngBytes[3] !== 0x47 ||
    pngBytes[4] !== 0x0d ||
    pngBytes[5] !== 0x0a ||
    pngBytes[6] !== 0x1a ||
    pngBytes[7] !== 0x0a
  ) {
    throw new Error(`Invalid PNG signature or truncated PNG buffer (${pngBytes?.byteLength ?? 0} bytes)`);
  }

  const dv = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let seenIhdr = false;
  let seenIend = false;
  const idatChunks: Uint8Array[] = [];
  let totalIdat = 0;

  while (offset < pngBytes.byteLength) {
    if (seenIend) {
      throw new Error('Invalid PNG: trailing bytes after IEND chunk');
    }
    if (offset + 12 > pngBytes.byteLength) {
      throw new Error('Truncated PNG chunk header');
    }
    const chunkLen = dv.getUint32(offset, false);
    if (chunkLen > pngBytes.byteLength - (offset + 12)) {
      throw new Error(`PNG chunk length ${chunkLen} exceeds remaining buffer bounds`);
    }
    const chunkType =
      String.fromCharCode(pngBytes[offset + 4]) +
      String.fromCharCode(pngBytes[offset + 5]) +
      String.fromCharCode(pngBytes[offset + 6]) +
      String.fromCharCode(pngBytes[offset + 7]);
    const dataStart = offset + 8;
    const expectedCrc = dv.getUint32(dataStart + chunkLen, false);
    const actualCrc = computeCrc32(pngBytes, offset + 4, 4 + chunkLen);
    if (actualCrc !== expectedCrc) {
      throw new Error(`PNG ${chunkType} chunk CRC mismatch`);
    }

    if (!seenIhdr && chunkType !== 'IHDR') {
      throw new Error(`Invalid PNG: first chunk must be IHDR, got ${chunkType}`);
    }

    if (chunkType === 'IHDR') {
      if (seenIhdr) {
        throw new Error('Invalid PNG: duplicate IHDR chunk');
      }
      if (chunkLen !== 13) {
        throw new Error(`Invalid PNG IHDR chunk length: ${chunkLen} (expected 13)`);
      }
      width = dv.getUint32(dataStart, false);
      height = dv.getUint32(dataStart + 4, false);
      const bitDepth = pngBytes[dataStart + 8];
      colorType = pngBytes[dataStart + 9];
      const compressionMethod = pngBytes[dataStart + 10];
      const filterMethod = pngBytes[dataStart + 11];
      const interlaceMethod = pngBytes[dataStart + 12];

      if (width < 1 || height < 1 || width > MAX_PNG_DIMENSION || height > MAX_PNG_DIMENSION) {
        throw new Error(
          `Invalid PNG dimensions ${width}x${height} (allowed 1..${MAX_PNG_DIMENSION})`
        );
      }
      if (width * height > MAX_PNG_PIXELS) {
        throw new Error(`PNG pixel count ${width * height} exceeds limit ${MAX_PNG_PIXELS}`);
      }
      if (bitDepth !== 8) {
        throw new Error(`Unsupported PNG bit depth: ${bitDepth} (only 8-bit is supported)`);
      }
      if (colorType !== 0 && colorType !== 2 && colorType !== 4 && colorType !== 6) {
        throw new Error(`Unsupported PNG colorType: ${colorType}`);
      }
      if (compressionMethod !== 0 || filterMethod !== 0) {
        throw new Error(
          `Unsupported PNG compression (${compressionMethod}) or filter method (${filterMethod})`
        );
      }
      if (interlaceMethod !== 0) {
        throw new Error(`Unsupported PNG interlace method: ${interlaceMethod} (Adam7 not supported)`);
      }
      seenIhdr = true;
    } else if (chunkType === 'IDAT') {
      if (chunkLen > 0) {
        const slice = pngBytes.subarray(dataStart, dataStart + chunkLen);
        idatChunks.push(slice);
        totalIdat += slice.byteLength;
      }
    } else if (chunkType === 'IEND') {
      if (chunkLen !== 0) {
        throw new Error(`Invalid PNG IEND chunk length: ${chunkLen}`);
      }
      seenIend = true;
    }
    offset = dataStart + chunkLen + 4;
  }

  if (!seenIhdr || !seenIend || totalIdat === 0) {
    throw new Error('Invalid PNG: missing required IHDR, IDAT, or IEND chunk');
  }

  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const stride = width * bpp;
  const expectedScanlineBytes = height * (stride + 1);
  const unfilteredBytes = height * stride;
  const rgbaBytes = width * height * 4;

  // Validate and reserve memory budgets BEFORE allocating buffers
  budget.reserve(totalIdat, 'PNG compressed IDAT buffer');
  const compressed = new Uint8Array(totalIdat);
  let pos = 0;
  for (const c of idatChunks) {
    compressed.set(c, pos);
    pos += c.byteLength;
  }

  const rawScanlines = inflateZlib(compressed, expectedScanlineBytes, budget);

  budget.reserve(unfilteredBytes, 'PNG unfiltered scanlines');
  const unfiltered = new Uint8Array(unfilteredBytes);
  for (let y = 0; y < height; y++) {
    const filter = rawScanlines[y * (stride + 1)];
    if (filter > 4) {
      throw new Error(`Invalid PNG scanline filter type ${filter} at row ${y}`);
    }
    const srcRow = y * (stride + 1) + 1;
    const dstRow = y * stride;
    const prevRow = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const raw = rawScanlines[srcRow + x];
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

  budget.reserve(rgbaBytes, 'PNG RGBA8 output');
  const rgba = new Uint8Array(rgbaBytes);
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
// Accessor & BufferView Validation and Reading Helpers
// ---------------------------------------------------------------------------

interface GltfAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  normalized?: boolean;
  count: number;
  type: string;
  sparse?: unknown;
}

interface GltfBufferView {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
}

interface ValidatedBufferViewSlice {
  byteOffset: number;
  byteLength: number;
  byteStride?: number;
  dv: DataView;
}

interface AccessorValidationRules {
  maxCount: number;
  expectedCount?: number;
  expectedTypes?: string[];
  expectedComponentTypes?: number[];
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
      throw new Error(`Unsupported glTF componentType: ${String(componentType)}`);
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
      throw new Error(`Unsupported glTF componentType: ${componentType}`);
  }
}

function validateAndPrepareBufferViews(
  rawBufferViews: unknown[],
  binChunk: Uint8Array,
  declaredBufferByteLength: number
): ValidatedBufferViewSlice[] {
  const effectiveBinLimit = Math.min(binChunk.byteLength, declaredBufferByteLength);
  return rawBufferViews.map((raw, idx) => {
    if (!isPlainObject(raw)) {
      throw new Error(`glTF bufferView[${idx}] must be an object`);
    }
    const bufferIdx = assertSafeNonNegInt(raw.buffer, `bufferView[${idx}].buffer`, 0);
    if (bufferIdx !== 0) {
      throw new Error(`glTF bufferView[${idx}] references unsupported buffer ${bufferIdx}`);
    }
    const byteOffset =
      raw.byteOffset !== undefined
        ? assertSafeNonNegInt(raw.byteOffset, `bufferView[${idx}].byteOffset`, effectiveBinLimit)
        : 0;
    const byteLength = assertSafePosInt(
      raw.byteLength,
      `bufferView[${idx}].byteLength`,
      effectiveBinLimit
    );
    if (byteOffset + byteLength > effectiveBinLimit || byteOffset + byteLength > binChunk.byteLength) {
      throw new Error(
        `glTF bufferView[${idx}] extent [${byteOffset}..${byteOffset + byteLength}] exceeds BIN buffer length (${effectiveBinLimit})`
      );
    }

    let byteStride: number | undefined;
    if (raw.byteStride !== undefined) {
      byteStride = assertSafePosInt(raw.byteStride, `bufferView[${idx}].byteStride`, 252);
      if (byteStride < 4 || byteStride % 4 !== 0) {
        throw new Error(`glTF bufferView[${idx}].byteStride (${byteStride}) must be a multiple of 4 in [4, 252]`);
      }
    }

    return {
      byteOffset,
      byteLength,
      byteStride,
      dv: new DataView(binChunk.buffer, binChunk.byteOffset + byteOffset, byteLength),
    };
  });
}

function validateAccessorHeader(
  accessors: unknown[],
  validatedViews: ValidatedBufferViewSlice[],
  accessorIndex: unknown,
  rules: AccessorValidationRules
): {
  acc: GltfAccessor;
  view: ValidatedBufferViewSlice;
  numComps: number;
  compSize: number;
  elemSize: number;
  stride: number;
  accByteOffset: number;
} {
  const idx = assertSafeNonNegInt(accessorIndex, 'accessor index', accessors.length - 1);
  const rawAcc = accessors[idx];
  if (!isPlainObject(rawAcc)) {
    throw new Error(`glTF accessor[${idx}] must be an object`);
  }
  if (rawAcc.sparse !== undefined) {
    throw new Error(`glTF accessor[${idx}] uses unsupported sparse encoding`);
  }

  const countCap = Math.min(rules.maxCount, MAX_ACCESSOR_COUNT);
  const count = assertSafePosInt(rawAcc.count, `accessor[${idx}].count`, countCap);
  if (rules.expectedCount !== undefined && count !== rules.expectedCount) {
    throw new Error(
      `glTF accessor[${idx}].count mismatch: got ${count}, expected ${rules.expectedCount}`
    );
  }

  const type = typeof rawAcc.type === 'string' ? rawAcc.type : '';
  const numComps = TYPE_COUNTS[type];
  if (!numComps) {
    throw new Error(`glTF accessor[${idx}] has invalid type "${String(rawAcc.type)}"`);
  }
  if (rules.expectedTypes && !rules.expectedTypes.includes(type)) {
    throw new Error(
      `glTF accessor[${idx}] type "${type}" not in expected [${rules.expectedTypes.join(', ')}]`
    );
  }

  const componentType = assertSafePosInt(rawAcc.componentType, `accessor[${idx}].componentType`, 65535);
  const compSize = componentByteSize(componentType);
  if (rules.expectedComponentTypes && !rules.expectedComponentTypes.includes(componentType)) {
    throw new Error(
      `glTF accessor[${idx}] componentType ${componentType} not in expected [${rules.expectedComponentTypes.join(', ')}]`
    );
  }

  if (rawAcc.bufferView === undefined) {
    throw new Error(`glTF accessor[${idx}] is missing required bufferView`);
  }
  const bvIndex = assertSafeNonNegInt(
    rawAcc.bufferView,
    `accessor[${idx}].bufferView`,
    validatedViews.length - 1
  );
  const view = validatedViews[bvIndex];
  if (!view) {
    throw new Error(`glTF accessor[${idx}] references missing bufferView ${bvIndex}`);
  }

  const accByteOffset =
    rawAcc.byteOffset !== undefined
      ? assertSafeNonNegInt(rawAcc.byteOffset, `accessor[${idx}].byteOffset`, view.byteLength)
      : 0;

  if (accByteOffset % compSize !== 0 || (view.byteOffset + accByteOffset) % compSize !== 0) {
    throw new Error(
      `glTF accessor[${idx}] byteOffset (${accByteOffset}) is not aligned to component size (${compSize})`
    );
  }

  const elemSize = compSize * numComps;
  const stride = view.byteStride !== undefined ? view.byteStride : elemSize;
  if (stride < elemSize || stride % compSize !== 0) {
    throw new Error(
      `glTF accessor[${idx}] stride (${stride}) is smaller than element size (${elemSize}) or misaligned`
    );
  }

  const bytesNeededInView = (count - 1) * stride + elemSize;
  if (accByteOffset + bytesNeededInView > view.byteLength) {
    throw new Error(
      `glTF accessor[${idx}] extent [${accByteOffset}..${accByteOffset + bytesNeededInView}] exceeds bufferView[${bvIndex}].byteLength (${view.byteLength})`
    );
  }

  return {
    acc: rawAcc as unknown as GltfAccessor,
    view,
    numComps,
    compSize,
    elemSize,
    stride,
    accByteOffset,
  };
}

function readAccessorFloats(
  accessors: unknown[],
  validatedViews: ValidatedBufferViewSlice[],
  accessorIndex: unknown,
  budget: DecodedByteBudget,
  rules: AccessorValidationRules
): Float32Array {
  const { acc, view, numComps, compSize, stride, accByteOffset } = validateAccessorHeader(
    accessors,
    validatedViews,
    accessorIndex,
    rules
  );

  const totalFloats = acc.count * numComps;
  budget.reserve(totalFloats * 4, `accessor[${String(accessorIndex)}] Float32Array`);
  const out = new Float32Array(totalFloats);
  const normalized = Boolean(acc.normalized);

  for (let i = 0; i < acc.count; i++) {
    const elemStart = accByteOffset + i * stride;
    for (let c = 0; c < numComps; c++) {
      const v = readComponentAsFloat(
        view.dv,
        elemStart + c * compSize,
        acc.componentType,
        normalized
      );
      if (!Number.isFinite(v)) {
        throw new Error(`glTF accessor[${String(accessorIndex)}] contains non-finite float at index ${i}`);
      }
      out[i * numComps + c] = v;
    }
  }
  return out;
}

function readAccessorUint16(
  accessors: unknown[],
  validatedViews: ValidatedBufferViewSlice[],
  accessorIndex: unknown,
  budget: DecodedByteBudget,
  rules: AccessorValidationRules
): Uint16Array {
  const { acc, view, numComps, compSize, stride, accByteOffset } = validateAccessorHeader(
    accessors,
    validatedViews,
    accessorIndex,
    rules
  );

  const totalVals = acc.count * numComps;
  budget.reserve(totalVals * 2, `accessor[${String(accessorIndex)}] Uint16Array`);
  const out = new Uint16Array(totalVals);

  for (let i = 0; i < acc.count; i++) {
    const elemStart = accByteOffset + i * stride;
    for (let c = 0; c < numComps; c++) {
      const v = readComponentAsFloat(view.dv, elemStart + c * compSize, acc.componentType, false);
      if (!Number.isFinite(v) || v < 0 || v > 65535) {
        throw new Error(`glTF accessor[${String(accessorIndex)}] uint16 value out of range: ${v}`);
      }
      out[i * numComps + c] = Math.round(v);
    }
  }
  return out;
}

function readAccessorIndices(
  accessors: unknown[],
  validatedViews: ValidatedBufferViewSlice[],
  accessorIndex: unknown,
  budget: DecodedByteBudget,
  rules: AccessorValidationRules
): Uint16Array | Uint32Array {
  const { acc, view, compSize, stride, accByteOffset } = validateAccessorHeader(
    accessors,
    validatedViews,
    accessorIndex,
    rules
  );

  const useUint32 = acc.componentType === COMP_UINT || acc.count > 65535;
  budget.reserve(acc.count * (useUint32 ? 4 : 2), `accessor[${String(accessorIndex)}] indices`);
  const out = useUint32 ? new Uint32Array(acc.count) : new Uint16Array(acc.count);

  for (let i = 0; i < acc.count; i++) {
    const v = readComponentAsFloat(view.dv, accByteOffset + i * stride, acc.componentType, false);
    if (!Number.isFinite(v) || v < 0) {
      throw new Error(`glTF index accessor[${String(accessorIndex)}] invalid index value ${v}`);
    }
    out[i] = Math.round(v);
  }
  return out;
}

function computeSmoothNormals(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array,
  budget: DecodedByteBudget
): Float32Array {
  const vCount = Math.floor(positions.length / 3);
  budget.reserve(vCount * 3 * 4, 'computed smooth normals');
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
  for (let i = 0; i < 16; i++) {
    if (typeof m[i] !== 'number' || !Number.isFinite(m[i])) {
      throw new Error(`Invalid non-finite matrix element at index ${i}`);
    }
  }
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

function getValidatedArray(obj: Record<string, any>, key: string, maxLen: number): any[] {
  const val = obj[key];
  if (val === undefined) return [];
  if (!Array.isArray(val)) {
    throw new Error(`Invalid glTF JSON: "${key}" must be an array`);
  }
  if (val.length > maxLen) {
    throw new Error(`glTF "${key}" count (${val.length}) exceeds maximum allowed (${maxLen})`);
  }
  return val;
}

/**
 * Parses a glTF 2.0 binary (.glb) ArrayBuffer or Uint8Array into meshes, PBR materials,
 * decoded RGBA8 textures, skeletons (joints + inverseBindMatrices), and animation clips.
 */
export function parseGlb(input: ArrayBuffer | Uint8Array): ParsedGlbAsset {
  if (!(input instanceof Uint8Array) && !(input instanceof ArrayBuffer)) {
    throw new Error('Invalid GLB input: expected ArrayBuffer or Uint8Array');
  }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (bytes.byteLength < 20) {
    throw new Error(`Invalid GLB buffer: length ${bytes.byteLength} < 20 bytes`);
  }
  if (bytes.byteLength > MAX_GLB_FILE_BYTES) {
    throw new Error(`GLB buffer size ${bytes.byteLength} exceeds limit ${MAX_GLB_FILE_BYTES}`);
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
  if (totalLength !== bytes.byteLength) {
    throw new Error(
      `Invalid GLB header totalLength: ${totalLength} does not match actual byteLength ${bytes.byteLength}`
    );
  }

  // Chunk 0 MUST be JSON
  if (12 + 8 > totalLength) {
    throw new Error('Truncated GLB container: missing JSON chunk header');
  }
  const jsonChunkLength = dv.getUint32(12, true);
  const jsonChunkType = dv.getUint32(16, true);
  if (jsonChunkType !== CHUNK_JSON) {
    throw new Error(`Invalid GLB chunk 0 type: 0x${jsonChunkType.toString(16)} (expected JSON 0x4e4f534a)`);
  }
  if (jsonChunkLength === 0 || jsonChunkLength > MAX_JSON_CHUNK_BYTES || 20 + jsonChunkLength > totalLength) {
    throw new Error(`Invalid GLB JSON chunk length: ${jsonChunkLength}`);
  }

  const jsonSlice = bytes.subarray(20, 20 + jsonChunkLength);
  const jsonText = new TextDecoder('utf-8', { fatal: true }).decode(jsonSlice);

  // Optional Chunk 1 MUST be BIN and account for the rest of the file
  let offset = 20 + jsonChunkLength;
  let binChunk: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  if (offset < totalLength) {
    if (offset + 8 > totalLength) {
      throw new Error('Truncated GLB BIN chunk header');
    }
    const binChunkLength = dv.getUint32(offset, true);
    const binChunkType = dv.getUint32(offset + 4, true);
    if (binChunkType !== CHUNK_BIN) {
      throw new Error(`Invalid GLB chunk 1 type: 0x${binChunkType.toString(16)} (expected BIN 0x004e4942)`);
    }
    const binStart = offset + 8;
    if (binChunkLength > totalLength - binStart) {
      throw new Error(`GLB BIN chunk length ${binChunkLength} exceeds remaining file bytes`);
    }
    binChunk = bytes.subarray(binStart, binStart + binChunkLength);
    offset = binStart + binChunkLength;
    if (offset !== totalLength) {
      throw new Error(`GLB trailing bytes after BIN chunk (${totalLength - offset} extra bytes)`);
    }
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Invalid GLB JSON chunk: ${(err as Error).message}`);
  }
  if (!isPlainObject(parsedJson)) {
    throw new Error('Invalid GLB JSON root: expected an object');
  }

  const gltf = parsedJson;
  if (gltf.asset !== undefined) {
    if (!isPlainObject(gltf.asset)) {
      throw new Error('Invalid glTF asset header');
    }
    if (gltf.asset.version !== undefined && typeof gltf.asset.version === 'string' && !gltf.asset.version.startsWith('2.')) {
      throw new Error(`Unsupported glTF asset version: ${gltf.asset.version}`);
    }
  }

  const budget = new DecodedByteBudget(MAX_DECODED_TOTAL_BYTES);

  const rawBuffers = getValidatedArray(gltf, 'buffers', MAX_BUFFERS);
  let declaredBufferByteLength = binChunk.byteLength;
  if (rawBuffers.length === 1) {
    const b0 = rawBuffers[0];
    if (!isPlainObject(b0)) {
      throw new Error('glTF buffers[0] must be an object');
    }
    if (b0.uri !== undefined) {
      throw new Error('External glTF buffer URIs are not allowed in GLB');
    }
    declaredBufferByteLength = assertSafeNonNegInt(
      b0.byteLength,
      'buffers[0].byteLength',
      binChunk.byteLength
    );
  }

  const rawBufferViews = getValidatedArray(gltf, 'bufferViews', MAX_BUFFER_VIEWS);
  const validatedViews = validateAndPrepareBufferViews(
    rawBufferViews,
    binChunk,
    declaredBufferByteLength
  );

  const accessors = getValidatedArray(gltf, 'accessors', MAX_ACCESSORS);
  const rawImages = getValidatedArray(gltf, 'images', MAX_IMAGES);
  const rawTextures = getValidatedArray(gltf, 'textures', MAX_TEXTURES);
  const rawMaterials = getValidatedArray(gltf, 'materials', MAX_MATERIALS);
  const rawNodes = getValidatedArray(gltf, 'nodes', MAX_NODES);
  const rawMeshes = getValidatedArray(gltf, 'meshes', MAX_MESHES);
  const rawSkins = getValidatedArray(gltf, 'skins', MAX_SKINS);
  const rawAnimations = getValidatedArray(gltf, 'animations', MAX_ANIMATIONS);

  // 1. Decode Embedded Textures (PNG -> RGBA8)
  const decodedImages: PbrTextureData[] = rawImages.map((img, idx) => {
    if (!isPlainObject(img)) {
      throw new Error(`glTF images[${idx}] must be an object`);
    }
    if (img.uri !== undefined) {
      throw new Error(`External image URI in images[${idx}] is not supported`);
    }
    if (img.mimeType !== undefined && img.mimeType !== 'image/png') {
      throw new Error(`Unsupported image mimeType in images[${idx}]: ${String(img.mimeType)}`);
    }
    const bvIdx = assertSafeNonNegInt(
      img.bufferView,
      `images[${idx}].bufferView`,
      validatedViews.length - 1
    );
    const view = validatedViews[bvIdx];
    const slice = binChunk.subarray(view.byteOffset, view.byteOffset + view.byteLength);
    return decodePngToRgba8(slice, false, typeof img.name === 'string' ? img.name : `image_${idx}`, budget);
  });

  for (let tIdx = 0; tIdx < rawTextures.length; tIdx++) {
    const texDef = rawTextures[tIdx];
    if (!isPlainObject(texDef)) {
      throw new Error(`glTF textures[${tIdx}] must be an object`);
    }
    if (texDef.source !== undefined) {
      assertSafeNonNegInt(texDef.source, `textures[${tIdx}].source`, decodedImages.length - 1);
    }
  }

  const getTextureByGltfIndex = (texIdx: unknown, srgb = false, label = 'texture.index'): PbrTextureData | undefined => {
    if (texIdx === undefined) return undefined;
    const validTexIdx = assertSafeNonNegInt(texIdx, label, rawTextures.length - 1);
    const texDef = rawTextures[validTexIdx];
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
  const materials: MaterialProperties[] = rawMaterials.map((m, matIdx) => {
    if (!isPlainObject(m)) {
      throw new Error(`glTF materials[${matIdx}] must be an object`);
    }
    const pbr = isPlainObject(m.pbrMetallicRoughness) ? m.pbrMetallicRoughness : {};
    const baseFactor = (Array.isArray(pbr.baseColorFactor) ? pbr.baseColorFactor : [1, 1, 1, 1]) as [
      number,
      number,
      number,
      number,
    ];
    const metallicFactor = typeof pbr.metallicFactor === 'number' && Number.isFinite(pbr.metallicFactor) ? pbr.metallicFactor : 0.5;
    const roughnessFactor = typeof pbr.roughnessFactor === 'number' && Number.isFinite(pbr.roughnessFactor) ? pbr.roughnessFactor : 0.5;
    const emissiveFactor = (Array.isArray(m.emissiveFactor) ? m.emissiveFactor : [0, 0, 0]) as [
      number,
      number,
      number,
    ];

    const baseColorTexture = getTextureByGltfIndex(
      pbr.baseColorTexture?.index,
      true,
      `materials[${matIdx}].baseColorTexture.index`
    );
    const normalTexture = getTextureByGltfIndex(
      m.normalTexture?.index,
      false,
      `materials[${matIdx}].normalTexture.index`
    );
    const normalScale =
      typeof m.normalTexture?.scale === 'number' && Number.isFinite(m.normalTexture.scale)
        ? m.normalTexture.scale
        : 1.0;

    // glTF 2.0 packs Occlusion in R, Roughness in G, Metallic in B
    const mrTex = getTextureByGltfIndex(
      pbr.metallicRoughnessTexture?.index,
      false,
      `materials[${matIdx}].metallicRoughnessTexture.index`
    );
    const occTex = getTextureByGltfIndex(
      m.occlusionTexture?.index,
      false,
      `materials[${matIdx}].occlusionTexture.index`
    );
    let ormTexture = mrTex || occTex;

    // If occlusionTexture and metallicRoughnessTexture are separate images of matching size, merge R from occTex and G/B from mrTex
    if (
      mrTex &&
      occTex &&
      mrTex.data !== occTex.data &&
      mrTex.width === occTex.width &&
      mrTex.height === occTex.height
    ) {
      budget.reserve(mrTex.data.length, `materials[${matIdx}] merged ORM texture`);
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

    const occlusionStrength =
      typeof m.occlusionTexture?.strength === 'number' && Number.isFinite(m.occlusionTexture.strength)
        ? m.occlusionTexture.strength
        : 1.0;

    return {
      baseColor: [baseFactor[0] ?? 1, baseFactor[1] ?? 1, baseFactor[2] ?? 1, baseFactor[3] ?? 1.0],
      roughness: roughnessFactor,
      metallic: metallicFactor,
      emissive: [emissiveFactor[0] ?? 0, emissiveFactor[1] ?? 0, emissiveFactor[2] ?? 0],
      emissiveIntensity:
        Math.max(emissiveFactor[0] ?? 0, emissiveFactor[1] ?? 0, emissiveFactor[2] ?? 0) > 0 ? 1.0 : 0.0,
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

  // 3. Parse & Validate Scene Graph Nodes (Reject invalid child indices, multi-parent, cycles, and deep chains)
  const nodes: GlbNode[] = rawNodes.map((n, index) => {
    if (!isPlainObject(n)) {
      throw new Error(`glTF nodes[${index}] must be an object`);
    }
    let translation = new Vec3(0, 0, 0);
    let rotation = new Quat(0, 0, 0, 1);
    let scale = new Vec3(1, 1, 1);

    if (Array.isArray(n.matrix)) {
      if (n.matrix.length !== 16) {
        throw new Error(`glTF nodes[${index}].matrix must have 16 elements`);
      }
      const dec = decomposeMatrixToTrs(n.matrix);
      translation = dec.translation;
      rotation = dec.rotation;
      scale = dec.scale;
    } else {
      if (Array.isArray(n.translation)) {
        if (n.translation.length !== 3 || !n.translation.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))) {
          throw new Error(`glTF nodes[${index}].translation must be 3 finite numbers`);
        }
        translation.set(n.translation[0], n.translation[1], n.translation[2]);
      }
      if (Array.isArray(n.rotation)) {
        if (n.rotation.length !== 4 || !n.rotation.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))) {
          throw new Error(`glTF nodes[${index}].rotation must be 4 finite numbers`);
        }
        rotation.set(n.rotation[0], n.rotation[1], n.rotation[2], n.rotation[3]);
      }
      if (Array.isArray(n.scale)) {
        if (n.scale.length !== 3 || !n.scale.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))) {
          throw new Error(`glTF nodes[${index}].scale must be 3 finite numbers`);
        }
        scale.set(n.scale[0], n.scale[1], n.scale[2]);
      }
    }

    let children: number[] = [];
    if (n.children !== undefined) {
      if (!Array.isArray(n.children) || n.children.length > MAX_NODES) {
        throw new Error(`Invalid glTF nodes[${index}].children array`);
      }
      children = n.children.map((c: unknown, cPos: number) =>
        assertSafeNonNegInt(c, `nodes[${index}].children[${cPos}]`, rawNodes.length - 1)
      );
    }

    const meshIndex =
      n.mesh !== undefined
        ? assertSafeNonNegInt(n.mesh, `nodes[${index}].mesh`, rawMeshes.length - 1)
        : undefined;
    const skinIndex =
      n.skin !== undefined
        ? assertSafeNonNegInt(n.skin, `nodes[${index}].skin`, rawSkins.length - 1)
        : undefined;

    return {
      index,
      name: typeof n.name === 'string' ? n.name : `node_${index}`,
      parentIndex: -1,
      children,
      translation,
      rotation,
      scale,
      meshIndex,
      skinIndex,
    };
  });

  // Validate single-parent tree edges and reject self-cycles
  for (const node of nodes) {
    for (const childIdx of node.children) {
      if (childIdx === node.index) {
        throw new Error(`Invalid glTF scene graph: node ${node.index} lists itself as a child (cycle)`);
      }
      if (nodes[childIdx].parentIndex !== -1) {
        throw new Error(
          `Invalid glTF scene graph: node ${childIdx} has multiple parents (${nodes[childIdx].parentIndex} and ${node.index})`
        );
      }
      nodes[childIdx].parentIndex = node.index;
    }
  }

  // Iterative traversal from root nodes to detect cycles and enforce MAX_NODE_DEPTH without recursion
  if (nodes.length > 0) {
    const stack: Array<{ idx: number; depth: number }> = [];
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].parentIndex === -1) {
        stack.push({ idx: i, depth: 0 });
      }
    }
    if (stack.length === 0) {
      throw new Error('Invalid glTF scene graph: cycle detected (no root node exists)');
    }

    const visited = new Uint8Array(nodes.length);
    let visitedCount = 0;
    while (stack.length > 0) {
      const { idx, depth } = stack.pop()!;
      if (depth > MAX_NODE_DEPTH) {
        throw new Error(
          `Invalid glTF scene graph: node hierarchy depth ${depth} exceeds maximum ${MAX_NODE_DEPTH}`
        );
      }
      if (visited[idx] !== 0) {
        throw new Error(`Invalid glTF scene graph: cycle detected at node ${idx}`);
      }
      visited[idx] = 1;
      visitedCount++;
      const children = nodes[idx].children;
      for (let c = children.length - 1; c >= 0; c--) {
        stack.push({ idx: children[c], depth: depth + 1 });
      }
    }

    if (visitedCount !== nodes.length) {
      throw new Error('Invalid glTF scene graph: cycle detected in disconnected node component');
    }
  }

  // 4. Parse Skins (Joints & InverseBindMatrices)
  const skins: GlbSkin[] = rawSkins.map((s, idx) => {
    if (!isPlainObject(s)) {
      throw new Error(`glTF skins[${idx}] must be an object`);
    }
    if (!Array.isArray(s.joints) || s.joints.length === 0 || s.joints.length > MAX_JOINTS_PER_SKIN) {
      throw new Error(
        `Invalid glTF skins[${idx}].joints: expected 1..${MAX_JOINTS_PER_SKIN} joints`
      );
    }
    const seenJoints = new Set<number>();
    const joints: number[] = s.joints.map((jNode: unknown, jPos: number) => {
      const nodeIdx = assertSafeNonNegInt(
        jNode,
        `skins[${idx}].joints[${jPos}]`,
        nodes.length - 1
      );
      if (seenJoints.has(nodeIdx)) {
        throw new Error(`Duplicate joint node ${nodeIdx} in skins[${idx}]`);
      }
      seenJoints.add(nodeIdx);
      return nodeIdx;
    });

    const skeletonRootNode =
      s.skeleton !== undefined
        ? assertSafeNonNegInt(s.skeleton, `skins[${idx}].skeleton`, nodes.length - 1)
        : joints[0];

    const jointNames = joints.map((nodeIdx) => nodes[nodeIdx]?.name ?? `joint_${nodeIdx}`);
    const inverseBindMatrices: Mat4[] = [];

    if (s.inverseBindMatrices !== undefined) {
      const ibmFloats = readAccessorFloats(accessors, validatedViews, s.inverseBindMatrices, budget, {
        maxCount: joints.length,
        expectedCount: joints.length,
        expectedTypes: ['MAT4'],
        expectedComponentTypes: [COMP_FLOAT],
      });
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
      name: typeof s.name === 'string' ? s.name : `skin_${idx}`,
      skeletonRootNode,
      joints,
      jointNames,
      inverseBindMatrices,
    };
  });

  // 5. Parse Meshes & Primitives (Positions, Normals, UVs, Tangents, 4-Bone Skinning JOINTS_0 & WEIGHTS_0)
  const meshes: GlbMeshPrimitive[] = [];
  rawMeshes.forEach((meshDef, meshIdx) => {
    if (!isPlainObject(meshDef)) {
      throw new Error(`glTF meshes[${meshIdx}] must be an object`);
    }
    const primitives = getValidatedArray(meshDef, 'primitives', MAX_PRIMITIVES_PER_MESH);
    const ownerNode = nodes.find((n) => n.meshIndex === meshIdx);

    primitives.forEach((prim, primIdx) => {
      if (!isPlainObject(prim)) {
        throw new Error(`glTF meshes[${meshIdx}].primitives[${primIdx}] must be an object`);
      }
      if (prim.mode !== undefined && prim.mode !== 4) {
        throw new Error(`Unsupported glTF primitive mode ${String(prim.mode)} (expected 4 TRIANGLES)`);
      }
      const attrs = isPlainObject(prim.attributes) ? prim.attributes : {};
      if (attrs.POSITION === undefined) {
        throw new Error(`glTF meshes[${meshIdx}].primitives[${primIdx}] is missing POSITION attribute`);
      }

      const positions = readAccessorFloats(accessors, validatedViews, attrs.POSITION, budget, {
        maxCount: MAX_VERTICES_PER_PRIMITIVE,
        expectedTypes: ['VEC3'],
        expectedComponentTypes: [COMP_FLOAT],
      });
      const vertexCount = Math.floor(positions.length / 3);

      let indices: Uint16Array | Uint32Array;
      if (prim.indices !== undefined) {
        indices = readAccessorIndices(accessors, validatedViews, prim.indices, budget, {
          maxCount: MAX_INDICES_PER_PRIMITIVE,
          expectedTypes: ['SCALAR'],
          expectedComponentTypes: [COMP_UBYTE, COMP_USHORT, COMP_UINT],
        });
        for (let i = 0; i < indices.length; i++) {
          if (indices[i] >= vertexCount) {
            throw new Error(
              `Mesh primitive index ${indices[i]} at [${i}] is out of bounds for vertexCount ${vertexCount}`
            );
          }
        }
      } else {
        const useU32 = vertexCount > 65535;
        budget.reserve(vertexCount * (useU32 ? 4 : 2), 'generated sequential indices');
        indices = useU32 ? new Uint32Array(vertexCount) : new Uint16Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) indices[i] = i;
      }

      const normals =
        attrs.NORMAL !== undefined
          ? readAccessorFloats(accessors, validatedViews, attrs.NORMAL, budget, {
              maxCount: vertexCount,
              expectedCount: vertexCount,
              expectedTypes: ['VEC3'],
              expectedComponentTypes: [COMP_FLOAT],
            })
          : computeSmoothNormals(positions, indices, budget);

      let uvs: Float32Array;
      if (attrs.TEXCOORD_0 !== undefined) {
        uvs = readAccessorFloats(accessors, validatedViews, attrs.TEXCOORD_0, budget, {
          maxCount: vertexCount,
          expectedCount: vertexCount,
          expectedTypes: ['VEC2'],
          expectedComponentTypes: [COMP_FLOAT, COMP_UBYTE, COMP_USHORT],
        });
      } else {
        budget.reserve(vertexCount * 2 * 4, 'default UVs');
        uvs = new Float32Array(vertexCount * 2);
      }

      let tangents: Float32Array;
      if (attrs.TANGENT !== undefined) {
        tangents = readAccessorFloats(accessors, validatedViews, attrs.TANGENT, budget, {
          maxCount: vertexCount,
          expectedCount: vertexCount,
          expectedTypes: ['VEC4'],
          expectedComponentTypes: [COMP_FLOAT],
        });
      } else {
        budget.reserve(vertexCount * 4 * 4, 'computed tangents');
        tangents = computeVertexTangents(positions, normals, uvs, indices);
      }

      const skinIndex = ownerNode?.skinIndex ?? (skins.length > 0 ? 0 : undefined);
      const activeSkin = skinIndex !== undefined ? skins[skinIndex] : undefined;

      let joints0: Uint16Array;
      if (attrs.JOINTS_0 !== undefined) {
        joints0 = readAccessorUint16(accessors, validatedViews, attrs.JOINTS_0, budget, {
          maxCount: vertexCount,
          expectedCount: vertexCount,
          expectedTypes: ['VEC4'],
          expectedComponentTypes: [COMP_UBYTE, COMP_USHORT],
        });
        const maxJointIdx = activeSkin ? activeSkin.joints.length : MAX_JOINTS_PER_SKIN;
        for (let i = 0; i < joints0.length; i++) {
          if (joints0[i] >= maxJointIdx) {
            throw new Error(
              `Mesh JOINTS_0 index ${joints0[i]} exceeds skin joint count (${maxJointIdx})`
            );
          }
        }
      } else {
        budget.reserve(vertexCount * 4 * 2, 'default joints0');
        joints0 = new Uint16Array(vertexCount * 4);
      }

      let weights0: Float32Array;
      if (attrs.WEIGHTS_0 !== undefined) {
        weights0 = readAccessorFloats(accessors, validatedViews, attrs.WEIGHTS_0, budget, {
          maxCount: vertexCount,
          expectedCount: vertexCount,
          expectedTypes: ['VEC4'],
          expectedComponentTypes: [COMP_FLOAT, COMP_UBYTE, COMP_USHORT],
        });
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
        budget.reserve(vertexCount * 4 * 4, 'default weights0');
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

      let mat = defaultMaterial;
      if (prim.material !== undefined) {
        const matIdx = assertSafeNonNegInt(
          prim.material,
          `meshes[${meshIdx}].primitives[${primIdx}].material`,
          materials.length - 1
        );
        mat = materials[matIdx];
      }

      meshes.push({
        name: typeof meshDef.name === 'string' ? `${meshDef.name}_${primIdx}` : `mesh_${meshIdx}_${primIdx}`,
        geometry,
        material: mat,
        skinIndex,
        nodeIndex: ownerNode?.index,
      });
    });
  });

  // 6. Parse Animation Clips (Keyframes & Channels)
  const animations: GlbAnimationClip[] = rawAnimations.map((anim, animIdx) => {
    if (!isPlainObject(anim)) {
      throw new Error(`glTF animations[${animIdx}] must be an object`);
    }
    const samplers = getValidatedArray(anim, 'samplers', MAX_CHANNELS_PER_ANIMATION);
    const rawChannels = getValidatedArray(anim, 'channels', MAX_CHANNELS_PER_ANIMATION);
    const channels: GlbAnimationChannel[] = [];
    let maxTime = 0;

    for (let chIdx = 0; chIdx < rawChannels.length; chIdx++) {
      const ch = rawChannels[chIdx];
      if (!isPlainObject(ch)) {
        throw new Error(`glTF animations[${animIdx}].channels[${chIdx}] must be an object`);
      }
      const samplerIdx = assertSafeNonNegInt(
        ch.sampler,
        `animations[${animIdx}].channels[${chIdx}].sampler`,
        samplers.length - 1
      );
      const sampler = samplers[samplerIdx];
      if (!isPlainObject(sampler)) {
        throw new Error(`glTF animations[${animIdx}].samplers[${samplerIdx}] must be an object`);
      }
      const target = ch.target;
      if (!isPlainObject(target)) {
        throw new Error(`glTF animations[${animIdx}].channels[${chIdx}].target must be an object`);
      }
      const targetNode = assertSafeNonNegInt(
        target.node,
        `animations[${animIdx}].channels[${chIdx}].target.node`,
        nodes.length - 1
      );
      const path = target.path as GlbAnimationPath;
      if (path !== 'translation' && path !== 'rotation' && path !== 'scale') {
        throw new Error(
          `Unsupported animation target path "${String(target.path)}" in animations[${animIdx}]`
        );
      }

      const interpolationRaw = sampler.interpolation ?? 'LINEAR';
      if (
        interpolationRaw !== 'LINEAR' &&
        interpolationRaw !== 'STEP' &&
        interpolationRaw !== 'CUBICSPLINE'
      ) {
        throw new Error(`Unsupported animation interpolation "${String(interpolationRaw)}"`);
      }
      const interpolation = interpolationRaw as GlbInterpolation;

      const times = readAccessorFloats(accessors, validatedViews, sampler.input, budget, {
        maxCount: MAX_KEYFRAMES_PER_CHANNEL,
        expectedTypes: ['SCALAR'],
        expectedComponentTypes: [COMP_FLOAT],
      });

      const expectedValCount = times.length * (interpolation === 'CUBICSPLINE' ? 3 : 1);
      const expectedValType = path === 'rotation' ? 'VEC4' : 'VEC3';
      const values = readAccessorFloats(accessors, validatedViews, sampler.output, budget, {
        maxCount: MAX_KEYFRAMES_PER_CHANNEL * 3,
        expectedCount: expectedValCount,
        expectedTypes: [expectedValType],
        expectedComponentTypes: [COMP_FLOAT, COMP_BYTE, COMP_UBYTE, COMP_SHORT, COMP_USHORT],
      });

      if (times.length > 0) {
        const endT = times[times.length - 1];
        if (endT > maxTime) maxTime = endT;
      }

      channels.push({
        targetNode,
        targetName: nodes[targetNode]?.name ?? `node_${targetNode}`,
        path,
        interpolation,
        times,
        values,
      });
    }

    return {
      name: typeof anim.name === 'string' ? anim.name : `clip_${animIdx}`,
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
 * Fetches and parses a binary `.glb` URL with a strict response byte budget.
 */
export async function loadGlbFromUrl(
  url: string,
  maxBytes = MAX_GLB_FILE_BYTES
): Promise<ParsedGlbAsset> {
  const byteLimit = assertSafePosInt(maxBytes, 'loadGlbFromUrl maxBytes', MAX_GLB_FILE_BYTES);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch GLB from ${url}: HTTP ${res.status}`);
  }

  const contentLengthHeader = res.headers?.get?.('content-length');
  if (contentLengthHeader !== null && contentLengthHeader !== undefined) {
    const declaredLen = Number(contentLengthHeader);
    if (Number.isFinite(declaredLen) && declaredLen > byteLimit) {
      await res.body?.cancel?.();
      throw new Error(
        `GLB response Content-Length (${declaredLen}) exceeds limit (${byteLimit})`
      );
    }
  }

  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > byteLimit) {
            await reader.cancel();
            throw new Error(
              `GLB response stream exceeded maximum allowed size (${totalBytes} > ${byteLimit})`
            );
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return parseGlb(combined);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > byteLimit) {
    throw new Error(`GLB response buffer (${buf.byteLength}) exceeds limit (${byteLimit})`);
  }
  return parseGlb(buf);
}
