import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGlb,
  decodePngToRgba8,
  loadGlbFromUrl,
  MAX_NODE_DEPTH,
} from '../src/engine/assets/glb-loader.ts';
import { SkeletonAnimationMixer } from '../src/engine/animation/skeleton-mixer.ts';

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < bytes.length; i++) {
    s1 = (s1 + bytes[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

function wrapZlib(deflatePayload: Uint8Array, expectedOutputForAdler = new Uint8Array(5)): Uint8Array {
  const out = new Uint8Array(2 + deflatePayload.length + 4);
  out[0] = 0x78;
  out[1] = 0x9c;
  out.set(deflatePayload, 2);
  const checksum = adler32(expectedOutputForAdler);
  const dv = new DataView(out.buffer);
  dv.setUint32(2 + deflatePayload.length, checksum, false);
  return out;
}

class BitPacker {
  private bytes: number[] = [];
  private curByte = 0;
  private bitPos = 0;

  writeBits(val: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const bit = (val >>> i) & 1;
      this.curByte |= bit << this.bitPos;
      this.bitPos++;
      if (this.bitPos === 8) {
        this.bytes.push(this.curByte);
        this.curByte = 0;
        this.bitPos = 0;
      }
    }
  }

  // Huffman codes in RFC 1951 are packed MSB-first into the LSB-first bitstream
  writeHuffCode(code: number, len: number): void {
    for (let i = len - 1; i >= 0; i--) {
      const bit = (code >>> i) & 1;
      this.writeBits(bit, 1);
    }
  }

  finish(): Uint8Array {
    if (this.bitPos > 0) {
      this.bytes.push(this.curByte);
      this.curByte = 0;
      this.bitPos = 0;
    }
    return new Uint8Array(this.bytes);
  }
}

function makePngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + 4);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i++) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(data, 8);
  const crcInput = out.subarray(4, 8 + data.length);
  dv.setUint32(8 + data.length, crc32(crcInput), false);
  return out;
}

function buildCustomPng(opts: {
  width?: number;
  height?: number;
  bitDepth?: number;
  colorType?: number;
  compression?: number;
  filter?: number;
  interlace?: number;
  idatPayload?: Uint8Array;
  includeIdat?: boolean;
  includeIend?: boolean;
  corruptCrc?: boolean;
}): Uint8Array {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  const ihdrDv = new DataView(ihdr.buffer);
  ihdrDv.setUint32(0, opts.width ?? 1, false);
  ihdrDv.setUint32(4, opts.height ?? 1, false);
  ihdr[8] = opts.bitDepth ?? 8;
  ihdr[9] = opts.colorType ?? 6;
  ihdr[10] = opts.compression ?? 0;
  ihdr[11] = opts.filter ?? 0;
  ihdr[12] = opts.interlace ?? 0;

  const chunks: Uint8Array[] = [sig, makePngChunk('IHDR', ihdr)];
  if (opts.includeIdat !== false) {
    const idat = makePngChunk('IDAT', opts.idatPayload ?? new Uint8Array([0x78, 0x9c, 0x05]));
    if (opts.corruptCrc) {
      idat[idat.length - 1] ^= 0xff;
    }
    chunks.push(idat);
  }
  if (opts.includeIend !== false) {
    chunks.push(makePngChunk('IEND', new Uint8Array(0)));
  }

  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

function buildGlb(jsonObj: Record<string, unknown>, binBytes?: Uint8Array): Uint8Array {
  const jsonRaw = new TextEncoder().encode(JSON.stringify(jsonObj));
  const jsonPad = (4 - (jsonRaw.byteLength % 4)) % 4;
  const jsonChunkLen = jsonRaw.byteLength + jsonPad;

  const hasBin = binBytes !== undefined;
  const binRaw = binBytes ?? new Uint8Array(0);
  const binPad = hasBin ? (4 - (binRaw.byteLength % 4)) % 4 : 0;
  const binChunkLen = hasBin ? binRaw.byteLength + binPad : 0;

  const totalLen = 12 + 8 + jsonChunkLen + (hasBin ? 8 + binChunkLen : 0);
  const out = new Uint8Array(totalLen);
  const dv = new DataView(out.buffer);

  dv.setUint32(0, GLB_MAGIC, true);
  dv.setUint32(4, GLB_VERSION, true);
  dv.setUint32(8, totalLen, true);

  dv.setUint32(12, jsonChunkLen, true);
  dv.setUint32(16, CHUNK_JSON, true);
  out.set(jsonRaw, 20);
  for (let i = 0; i < jsonPad; i++) {
    out[20 + jsonRaw.byteLength + i] = 0x20;
  }

  if (hasBin) {
    const binOffset = 20 + jsonChunkLen;
    dv.setUint32(binOffset, binChunkLen, true);
    dv.setUint32(binOffset + 4, CHUNK_BIN, true);
    out.set(binRaw, binOffset + 8);
  }

  return out;
}

function withAllocationTrap<T>(maxElements: number, fn: () => T): T {
  const OrigFloat32 = globalThis.Float32Array;
  const OrigUint8 = globalThis.Uint8Array;
  const OrigUint16 = globalThis.Uint16Array;
  const OrigUint32 = globalThis.Uint32Array;

  type TypedArrayConstructor =
    | Float32ArrayConstructor
    | Uint8ArrayConstructor
    | Uint16ArrayConstructor
    | Uint32ArrayConstructor;

  const wrapTypedArray = <C extends TypedArrayConstructor>(Orig: C, label: string): C =>
    new Proxy(Orig, {
      construct(target, args, newTarget) {
        if (typeof args[0] === 'number' && args[0] > maxElements) {
          throw new Error(`ALLOCATION_TRAP_${label}:${args[0]}`);
        }
        return Reflect.construct(target, args, newTarget);
      },
    });

  globalThis.Float32Array = wrapTypedArray(OrigFloat32, 'Float32Array');
  globalThis.Uint8Array = wrapTypedArray(OrigUint8, 'Uint8Array');
  globalThis.Uint16Array = wrapTypedArray(OrigUint16, 'Uint16Array');
  globalThis.Uint32Array = wrapTypedArray(OrigUint32, 'Uint32Array');

  try {
    return fn();
  } finally {
    globalThis.Float32Array = OrigFloat32;
    globalThis.Uint8Array = OrigUint8;
    globalThis.Uint16Array = OrigUint16;
    globalThis.Uint32Array = OrigUint32;
  }
}

test('Finding 1: rejects truncated DEFLATE 78 9c 05 inside 1x1 PNG GLB under 1s without hanging or runaway output', () => {
  const png = buildCustomPng({
    width: 1,
    height: 1,
    idatPayload: new Uint8Array([0x78, 0x9c, 0x05]),
  });
  const glb = buildGlb(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: png.byteLength }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: png.byteLength }],
      images: [{ bufferView: 0, mimeType: 'image/png' }],
    },
    png
  );

  const t0 = performance.now();
  assert.throws(
    () => {
      withAllocationTrap(65536, () => parseGlb(glb));
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        !err.message.startsWith('ALLOCATION_TRAP_'),
        `Loader entered runaway inflate loop instead of rejecting malformed DEFLATE: ${err.message}`
      );
      return true;
    }
  );
  const elapsedMs = performance.now() - t0;
  assert.ok(elapsedMs < 1000, `Expected rejection in < 1000ms, took ${elapsedMs.toFixed(2)}ms`);
});

test('Finding 1b: rejects EOF, incomplete/oversubscribed Huffman tables, bad repeat/distance codes, stored-block mismatch, and output overflow', () => {
  const t0 = performance.now();

  // 1. Bad zlib header (CMF/FLG FCHECK failure)
  assert.throws(
    () => decodePngToRgba8(buildCustomPng({ idatPayload: new Uint8Array([0x78, 0x00, 0x03, 0x00, 0, 0, 0, 1]) })),
    /zlib header/i
  );

  // 2. Stored block (btype=0) with NLEN complement mismatch
  assert.throws(
    () =>
      decodePngToRgba8(
        buildCustomPng({
          idatPayload: wrapZlib(new Uint8Array([0x01, 0x05, 0x00, 0x00, 0x00, 0, 0, 0, 0, 0])),
        })
      ),
    /stored block length mismatch/i
  );

  // 3. Stored block truncated before declared len
  assert.throws(
    () =>
      decodePngToRgba8(
        buildCustomPng({
          idatPayload: wrapZlib(new Uint8Array([0x01, 0x05, 0x00, 0xfa, 0xff, 0x00, 0x01])),
        })
      ),
    /Truncated DEFLATE stored block/i
  );

  // 4. Fixed Huffman block truncated before EOB symbol 256 (EOF rejection)
  assert.throws(
    () => {
      const bp = new BitPacker();
      bp.writeBits(1, 1); // bfinal = 1
      bp.writeBits(1, 2); // btype = 1 (fixed Huffman)
      bp.writeHuffCode(0b00110000, 8); // literal 0
      // No EOB symbol 256 -> hits EOF
      decodePngToRgba8(buildCustomPng({ idatPayload: wrapZlib(bp.finish()) }));
    },
    /Unexpected end of DEFLATE bitstream/i
  );

  // 5. Incomplete Huffman table (code-length table with only a single length-1 code -> 16384 < 32768)
  assert.throws(
    () => {
      const bp = new BitPacker();
      bp.writeBits(1, 1); // bfinal = 1
      bp.writeBits(2, 2); // btype = 2 (dynamic Huffman)
      bp.writeBits(0, 5); // hlit = 257
      bp.writeBits(0, 5); // hdist = 1
      bp.writeBits(0, 4); // hclen = 4
      bp.writeBits(1, 3); // CLEN_ORDER[0]=16 has length 1
      bp.writeBits(0, 3); // length 0
      bp.writeBits(0, 3); // length 0
      bp.writeBits(0, 3); // length 0
      decodePngToRgba8(buildCustomPng({ idatPayload: wrapZlib(bp.finish()) }));
    },
    /incomplete Huffman tree/i
  );

  // 6. Oversubscribed Huffman table (three length-1 codes in code-length table -> 49152 > 32768)
  assert.throws(
    () => {
      const bp = new BitPacker();
      bp.writeBits(1, 1); // bfinal = 1
      bp.writeBits(2, 2); // btype = 2 (dynamic Huffman)
      bp.writeBits(0, 5); // hlit = 257
      bp.writeBits(0, 5); // hdist = 1
      bp.writeBits(0, 4); // hclen = 4
      bp.writeBits(1, 3); // length 1
      bp.writeBits(1, 3); // length 1
      bp.writeBits(1, 3); // length 1
      bp.writeBits(0, 3); // length 0
      decodePngToRgba8(buildCustomPng({ idatPayload: wrapZlib(bp.finish()) }));
    },
    /oversubscribed Huffman tree/i
  );

  // 7. Bad repeat code 16 at index 0 (no previous code length)
  assert.throws(
    () => {
      const bp = new BitPacker();
      bp.writeBits(1, 1); // bfinal = 1
      bp.writeBits(2, 2); // btype = 2 (dynamic)
      bp.writeBits(0, 5); // hlit = 257
      bp.writeBits(0, 5); // hdist = 1
      bp.writeBits(0, 4); // hclen = 4 (symbols 16, 17, 18, 0)
      bp.writeBits(1, 3); // sym 16 length = 1 (code 1)
      bp.writeBits(0, 3); // sym 17 length = 0
      bp.writeBits(0, 3); // sym 18 length = 0
      bp.writeBits(1, 3); // sym 0  length = 1 (code 0)
      // Emit sym 16 (code 1) as the very first entry at idx = 0
      bp.writeHuffCode(1, 1);
      bp.writeBits(0, 2);
      decodePngToRgba8(buildCustomPng({ idatPayload: wrapZlib(bp.finish()) }));
    },
    /repeat 16 at index 0/i
  );

  // 8. Bad back-reference distance past start of output (dist=1 at outPos=0 in fixed Huffman block)
  assert.throws(
    () => {
      const bp = new BitPacker();
      bp.writeBits(1, 1); // bfinal = 1
      bp.writeBits(1, 2); // btype = 1 (fixed Huffman)
      bp.writeHuffCode(0b0000001, 7); // sym 257 (length = 3)
      bp.writeHuffCode(0b00000, 5);   // distSym 0 (dist = 1 at outPos = 0)
      bp.writeHuffCode(0b0000000, 7); // sym 256 (EOB)
      decodePngToRgba8(buildCustomPng({ idatPayload: wrapZlib(bp.finish()) }));
    },
    /back-reference distance/i
  );

  // 9. Stored block producing more bytes than expected 1x1 RGBA scanline size (6 > 5)
  assert.throws(
    () =>
      decodePngToRgba8(
        buildCustomPng({
          idatPayload: wrapZlib(new Uint8Array([0x01, 0x06, 0x00, 0xf9, 0xff, 0, 0, 0, 0, 0, 0])),
        })
      ),
    /exceeds expected size/i
  );

  // 10. Work budget exceeded on empty stored block flood (bfinal=0, btype=0, len=0, nlen=0xffff)
  assert.throws(
    () => {
      const blocks = 25000;
      const deflate = new Uint8Array(blocks * 5);
      for (let i = 0; i < blocks; i++) {
        const base = i * 5;
        deflate[base + 0] = 0x00; // bfinal=0, btype=0
        deflate[base + 1] = 0x00;
        deflate[base + 2] = 0x00;
        deflate[base + 3] = 0xff;
        deflate[base + 4] = 0xff;
      }
      decodePngToRgba8(buildCustomPng({ idatPayload: wrapZlib(deflate) }));
    },
    /work budget exceeded/i
  );

  // 11. PNG missing IDAT, missing IEND, bad CRC, invalid scanline filter, or non-PNG signature must throw
  assert.throws(() => decodePngToRgba8(buildCustomPng({ includeIdat: false })), /missing required/i);
  assert.throws(() => decodePngToRgba8(buildCustomPng({ includeIend: false })), /missing required/i);
  assert.throws(() => decodePngToRgba8(buildCustomPng({ corruptCrc: true })), /CRC mismatch/i);
  assert.throws(() => decodePngToRgba8(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), /Invalid PNG signature/i);

  const badFilterRow = new Uint8Array([9, 0, 0, 0, 255]); // filter = 9 (> 4)
  const badFilterBlock = new Uint8Array([0x01, 0x05, 0x00, 0xfa, 0xff, ...badFilterRow]);
  assert.throws(
    () => decodePngToRgba8(buildCustomPng({ idatPayload: wrapZlib(badFilterBlock, badFilterRow) })),
    /Invalid PNG scanline filter/i
  );

  assert.ok(performance.now() - t0 < 1000);
});

test('Finding 2: rejects oversized accessor count=1,000,000,000 and oversized PNG dimensions before allocation', async () => {
  const glb = buildGlb({
    asset: { version: '2.0' },
    accessors: [{ componentType: 5126, count: 1_000_000_000, type: 'VEC3' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  });

  const t0 = performance.now();
  assert.throws(
    () => {
      withAllocationTrap(1_000_000, () => parseGlb(glb));
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(!(err instanceof RangeError), `Must reject before RangeError: ${err.message}`);
      assert.ok(
        !err.message.startsWith('ALLOCATION_TRAP_'),
        `Oversized accessor count reached Float32Array constructor before validation: ${err.message}`
      );
      return true;
    }
  );

  // Oversized PNG dimensions (65536 x 65536) rejected before buffer allocation
  const hugePng = buildCustomPng({
    width: 65536,
    height: 65536,
    idatPayload: wrapZlib(new Uint8Array([0x01, 0x00, 0x00, 0xff, 0xff]), new Uint8Array(0)),
  });
  assert.throws(
    () => {
      withAllocationTrap(1_000_000, () => decodePngToRgba8(hugePng));
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(!err.message.startsWith('ALLOCATION_TRAP_'));
      return true;
    }
  );

  // loadGlbFromUrl rejects oversized Content-Length before reading response body
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(new Uint8Array(32), {
        status: 200,
        headers: { 'content-length': String(500 * 1024 * 1024) },
      })) as typeof fetch;

    await assert.rejects(() => loadGlbFromUrl('https://example.invalid/huge.glb', 1024), /Content-Length/i);
  } finally {
    globalThis.fetch = origFetch;
  }

  assert.ok(performance.now() - t0 < 1000);
});

test('Finding 3: rejects accessor reading past its declared bufferView.byteLength=0 even when BIN has 12 bytes', () => {
  const bin = new Uint8Array(new Float32Array([1, 2, 3]).buffer);
  const glb = buildGlb(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: 12 }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 0 }],
      accessors: [{ bufferView: 0, byteOffset: 0, componentType: 5126, count: 1, type: 'VEC3' }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    },
    bin
  );

  const t0 = performance.now();
  assert.throws(() => parseGlb(glb), /bufferView|bounds|extent|length|integer/i);

  // Non-zero bufferView (8 bytes) smaller than VEC3 float accessor (12 bytes) even when BIN has 24 bytes
  const bin24 = new Uint8Array(24);
  const partialViewGlb = buildGlb(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: 24 }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 8 }],
      accessors: [{ bufferView: 0, byteOffset: 0, componentType: 5126, count: 1, type: 'VEC3' }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    },
    bin24
  );
  assert.throws(() => parseGlb(partialViewGlb), /exceeds bufferView/i);

  // Attribute count mismatch (POSITION count=2 vs NORMAL count=1)
  const bin36 = new Uint8Array(36);
  const mismatchedAttrGlb = buildGlb(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: 36 }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 24 },
        { buffer: 0, byteOffset: 24, byteLength: 12 },
      ],
      accessors: [
        { bufferView: 0, byteOffset: 0, componentType: 5126, count: 2, type: 'VEC3' },
        { bufferView: 1, byteOffset: 0, componentType: 5126, count: 1, type: 'VEC3' },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 } }] }],
    },
    bin36
  );
  assert.throws(() => parseGlb(mismatchedAttrGlb), /count mismatch/i);

  // Out-of-range mesh indices (>= vertexCount)
  const posAndIdxBin = new Uint8Array(16);
  const dv = new DataView(posAndIdxBin.buffer);
  dv.setFloat32(0, 0, true);
  dv.setFloat32(4, 0, true);
  dv.setFloat32(8, 0, true);
  dv.setUint16(12, 5, true); // index 5 >= vertexCount 1
  const badIdxGlb = buildGlb(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: 16 }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 12 },
        { buffer: 0, byteOffset: 12, byteLength: 2 },
      ],
      accessors: [
        { bufferView: 0, byteOffset: 0, componentType: 5126, count: 1, type: 'VEC3' },
        { bufferView: 1, byteOffset: 0, componentType: 5123, count: 1, type: 'SCALAR' },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    },
    posAndIdxBin
  );
  assert.throws(() => parseGlb(badIdxGlb), /index|vertexCount|out of bounds/i);

  // GLB header totalLength mismatch (declared totalLength > actual buffer)
  const truncatedHeaderGlb = buildGlb({ asset: { version: '2.0' } });
  new DataView(truncatedHeaderGlb.buffer).setUint32(8, truncatedHeaderGlb.byteLength + 64, true);
  assert.throws(() => parseGlb(truncatedHeaderGlb), /totalLength/i);

  assert.ok(performance.now() - t0 < 1000);
});

test('Finding 4: rejects cyclic scene graphs (nodes:[{children:[0]}]), multi-parent nodes, and excessive node depth', () => {
  const selfCycleGlb = buildGlb({
    asset: { version: '2.0' },
    nodes: [{ children: [0] }],
  });

  const t0 = performance.now();
  assert.throws(() => {
    const asset = parseGlb(selfCycleGlb);
    new SkeletonAnimationMixer(asset);
  }, /cycle|parent|child|hierarchy/i);

  // 2-node mutual cycle
  const twoNodeCycleGlb = buildGlb({
    asset: { version: '2.0' },
    nodes: [{ children: [1] }, { children: [0] }],
  });
  assert.throws(() => parseGlb(twoNodeCycleGlb), /cycle|parent|hierarchy/i);

  // Valid root node 0 plus disconnected 2-node cycle (1 <-> 2)
  const disconnectedCycleGlb = buildGlb({
    asset: { version: '2.0' },
    nodes: [{}, { children: [2] }, { children: [1] }],
  });
  assert.throws(() => parseGlb(disconnectedCycleGlb), /cycle/i);

  // Diamond / multi-parent node
  const multiParentGlb = buildGlb({
    asset: { version: '2.0' },
    nodes: [{ children: [2] }, { children: [2] }, {}],
  });
  assert.throws(() => parseGlb(multiParentGlb), /multiple parents/i);

  // Invalid child index
  const invalidChildGlb = buildGlb({
    asset: { version: '2.0' },
    nodes: [{ children: [99] }],
  });
  assert.throws(() => parseGlb(invalidChildGlb), /children/i);

  // Deep acyclic chain exceeding MAX_NODE_DEPTH
  const deepCount = MAX_NODE_DEPTH + 10;
  const deepNodes = Array.from({ length: deepCount }, (_, i) =>
    i + 1 < deepCount ? { children: [i + 1] } : {}
  );
  const deepGlb = buildGlb({
    asset: { version: '2.0' },
    nodes: deepNodes,
  });
  assert.throws(() => parseGlb(deepGlb), /depth .* exceeds maximum/i);

  assert.ok(performance.now() - t0 < 1000);
});
