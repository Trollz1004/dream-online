/**
 * DREAM Engine — Mesh & Procedural Geometries
 * Pure TypeScript, zero external dependencies.
 */

export interface GeometryData {
  positions: Float32Array; // 3 floats per vertex
  normals: Float32Array;   // 3 floats per vertex
  uvs: Float32Array;       // 2 floats per vertex
  colors?: Float32Array;   // 4 floats per vertex (RGBA)
  indices: Uint16Array | Uint32Array;
}

export interface MaterialProperties {
  baseColor: [number, number, number, number];
  roughness: number;
  metallic: number;
  emissive: [number, number, number];
  emissiveIntensity: number;
  rimIntensity?: number;
  isSky?: boolean;
  isGround?: boolean;
}

export class MeshGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors?: Float32Array;
  indices: Uint16Array | Uint32Array;
  vertexCount: number;
  indexCount: number;

  constructor(data: GeometryData) {
    this.positions = data.positions;
    this.normals = data.normals;
    this.uvs = data.uvs;
    this.colors = data.colors;
    this.indices = data.indices;
    this.vertexCount = this.positions.length / 3;
    this.indexCount = this.indices.length;
  }
}

/**
 * Creates a ground plane centered at (0, 0, 0) in XZ plane with normals pointing up (0, 1, 0).
 */
export function createGroundPlane(size = 200, subdivisions = 10): MeshGeometry {
  const half = size * 0.5;
  const segs = subdivisions;
  const step = size / segs;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let z = 0; z <= segs; z++) {
    for (let x = 0; x <= segs; x++) {
      const px = -half + x * step;
      const pz = -half + z * step;

      positions.push(px, 0, pz);
      normals.push(0, 1, 0);
      uvs.push((px / 10), (pz / 10)); // 1 UV unit per 10 world units
    }
  }

  const rowSize = segs + 1;
  for (let z = 0; z < segs; z++) {
    for (let x = 0; x < segs; x++) {
      const a = z * rowSize + x;
      const b = a + 1;
      const c = (z + 1) * rowSize + x;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  });
}

/**
 * Creates a 3D capsule centered along Y axis with base at y = 0.
 * Total height = height, radius = radius.
 */
export function createCapsuleGeometry(
  radius = 0.4,
  height = 1.8,
  radialSegments = 24,
  rings = 8
): MeshGeometry {
  const cylinderHeight = Math.max(0.1, height - radius * 2);
  const halfCyl = cylinderHeight * 0.5;
  const centerY = radius + halfCyl; // Character center height

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Helper to add vertex
  function addVertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number) {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    uvs.push(u, v);
  }

  // Top Hemisphere
  for (let lat = 0; lat <= rings; lat++) {
    const theta = (lat * Math.PI) / (2 * rings);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= radialSegments; lon++) {
      const phi = (lon * 2 * Math.PI) / radialSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;

      const px = radius * nx;
      const py = centerY + halfCyl + radius * (ny - 1) + radius;
      const pz = radius * nz;

      addVertex(px, py, pz, nx, ny, nz, lon / radialSegments, 1.0 - (lat / (rings * 4)));
    }
  }

  // Cylinder Body
  for (let i = 0; i <= 2; i++) {
    const yFrac = i / 2;
    const py = centerY + halfCyl - yFrac * cylinderHeight;

    for (let lon = 0; lon <= radialSegments; lon++) {
      const phi = (lon * 2 * Math.PI) / radialSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const nx = cosPhi;
      const ny = 0;
      const nz = sinPhi;

      addVertex(radius * nx, py, radius * nz, nx, ny, nz, lon / radialSegments, 0.5);
    }
  }

  // Bottom Hemisphere
  for (let lat = 0; lat <= rings; lat++) {
    const theta = Math.PI * 0.5 + (lat * Math.PI) / (2 * rings);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= radialSegments; lon++) {
      const phi = (lon * 2 * Math.PI) / radialSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;

      const px = radius * nx;
      const py = centerY - halfCyl + radius * ny;
      const pz = radius * nz;

      addVertex(px, py, pz, nx, ny, nz, lon / radialSegments, 0.25 - (lat / (rings * 4)));
    }
  }

  // Build index grid
  const totalRings = (rings + 1) + 3 + (rings + 1);
  const segCols = radialSegments + 1;

  for (let r = 0; r < totalRings - 1; r++) {
    for (let c = 0; c < radialSegments; c++) {
      const a = r * segCols + c;
      const b = a + 1;
      const cIdx = (r + 1) * segCols + c;
      const d = cIdx + 1;

      indices.push(a, cIdx, b);
      indices.push(b, cIdx, d);
    }
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  });
}

/**
 * Creates a scenic monolith/pillar mesh for world depth and spatial scale.
 */
export function createMonolithGeometry(w = 1.2, h = 4.5, d = 1.2): MeshGeometry {
  const hw = w * 0.5;
  const hd = d * 0.5;

  const positions = new Float32Array([
    // Front face
    -hw, 0,  hd,   hw, 0,  hd,   hw, h,  hd,  -hw, h,  hd,
    // Back face
    -hw, 0, -hd,  -hw, h, -hd,   hw, h, -hd,   hw, 0, -hd,
    // Top face
    -hw, h, -hd,  -hw, h,  hd,   hw, h,  hd,   hw, h, -hd,
    // Bottom face
    -hw, 0, -hd,   hw, 0, -hd,   hw, 0,  hd,  -hw, 0,  hd,
    // Right face
     hw, 0, -hd,   hw, h, -hd,   hw, h,  hd,   hw, 0,  hd,
    // Left face
    -hw, 0, -hd,  -hw, 0,  hd,  -hw, h,  hd,  -hw, h, -hd,
  ]);

  const normals = new Float32Array([
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
   -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);

  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);

  const indices = new Uint16Array([
    0, 1, 2,      0, 2, 3,    // Front
    4, 5, 6,      4, 6, 7,    // Back
    8, 9, 10,     8, 10, 11,  // Top
    12, 13, 14,   12, 14, 15, // Bottom
    16, 17, 18,   16, 18, 19, // Right
    20, 21, 22,   20, 22, 23  // Left
  ]);

  return new MeshGeometry({ positions, normals, uvs, indices });
}

/**
 * Creates a sky hemisphere for atmosphere gradient and sun disk rendering.
 */
export function createSkyDomeGeometry(radius = 800, segments = 24, rings = 12): MeshGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= rings; r++) {
    // from zenith (0) down to slightly below horizon (PI * 0.55)
    const theta = (r * Math.PI * 0.55) / rings;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let s = 0; s <= segments; s++) {
      const phi = (s * 2 * Math.PI) / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = radius * cosPhi * sinTheta;
      const y = radius * cosTheta;
      const z = radius * sinPhi * sinTheta;

      // Inverted normal facing inward
      positions.push(x, y, z);
      normals.push(-cosPhi * sinTheta, -cosTheta, -sinPhi * sinTheta);
      uvs.push(s / segments, r / rings);
    }
  }

  const cols = segments + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * cols + s;
      const b = a + 1;
      const c = (r + 1) * cols + s;
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  });
}

/**
 * Creates a centered or offset box geometry with custom dimensions and center offset.
 */
export function createBoxGeometry(w = 1.0, h = 1.0, d = 1.0, ox = 0, oy = 0, oz = 0): MeshGeometry {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const hd = d * 0.5;

  const minX = ox - hw, maxX = ox + hw;
  const minY = oy - hh, maxY = oy + hh;
  const minZ = oz - hd, maxZ = oz + hd;

  const positions = new Float32Array([
    // Front face (Z+)
    minX, minY, maxZ,   maxX, minY, maxZ,   maxX, maxY, maxZ,   minX, maxY, maxZ,
    // Back face (Z-)
    minX, minY, minZ,   minX, maxY, minZ,   maxX, maxY, minZ,   maxX, minY, minZ,
    // Top face (Y+)
    minX, maxY, minZ,   minX, maxY, maxZ,   maxX, maxY, maxZ,   maxX, maxY, minZ,
    // Bottom face (Y-)
    minX, minY, minZ,   maxX, minY, minZ,   maxX, minY, maxZ,   minX, minY, maxZ,
    // Right face (X+)
    maxX, minY, minZ,   maxX, maxY, minZ,   maxX, maxY, maxZ,   maxX, minY, maxZ,
    // Left face (X-)
    minX, minY, minZ,   minX, minY, maxZ,   minX, maxY, maxZ,   minX, maxY, minZ,
  ]);

  const normals = new Float32Array([
    0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
    0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
    1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
   -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
  ]);

  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);

  const indices = new Uint16Array([
    0, 1, 2,      0, 2, 3,
    4, 5, 6,      4, 6, 7,
    8, 9, 10,     8, 10, 11,
    12, 13, 14,   12, 14, 15,
    16, 17, 18,   16, 18, 19,
    20, 21, 22,   20, 22, 23,
  ]);

  return new MeshGeometry({ positions, normals, uvs, indices });
}

/**
 * Creates a contoured multi-ring tapered 3D lathe / armor segment mesh.
 * Used for sculpted Dark-Fantasy Action-MMORPG armor, limbs, horns, and obelisks (never flat boxes).
 */
export function createSculptedArmorSegmentGeometry(
  radiiX: number[],
  radiiZ: number[],
  heights: number[],
  ox = 0,
  oy = 0,
  oz = 0,
  radialSegments = 16,
  curveZOffsets?: number[]
): MeshGeometry {
  const segs = Math.max(8, radialSegments);
  const rings = Math.min(radiiX.length, radiiZ.length, heights.length);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < rings; r++) {
    const v = rings > 1 ? r / (rings - 1) : 0;
    const rx = radiiX[r];
    const rz = radiiZ[r];
    const y = oy + heights[r];
    const zOff = curveZOffsets ? (curveZOffsets[r] || 0) : 0;

    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const phi = u * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      const px = ox + rx * cosP;
      const pz = oz + zOff + rz * sinP;

      positions.push(px, y, pz);
      normals.push(cosP, 0.15, sinP);
      uvs.push(u, v);
    }
  }

  const stride = segs + 1;
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = (r + 1) * stride + s;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // Cap top and bottom
  if (rings >= 2) {
    const botCenterIdx = positions.length / 3;
    const zOff0 = curveZOffsets ? (curveZOffsets[0] || 0) : 0;
    positions.push(ox, oy + heights[0], oz + zOff0);
    normals.push(0, -1, 0);
    uvs.push(0.5, 0.5);
    for (let s = 0; s < segs; s++) {
      indices.push(botCenterIdx, s, s + 1);
    }

    const topRingStart = (rings - 1) * stride;
    const topCenterIdx = positions.length / 3;
    const zOffTop = curveZOffsets ? (curveZOffsets[rings - 1] || 0) : 0;
    positions.push(ox, oy + heights[rings - 1], oz + zOffTop);
    normals.push(0, 1, 0);
    uvs.push(0.5, 0.5);
    for (let s = 0; s < segs; s++) {
      indices.push(topCenterIdx, topRingStart + s + 1, topRingStart + s);
    }
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  });
}

/**
 * Creates a sweeping 3D Crescent Sword-Slash Ribbon Mesh for Black Desert Online / Rohan: Blood Feud
 * style combat skill visuals. Sweeps from -arcAngle/2 to +arcAngle/2 in the XZ plane with tapered blade tips.
 */
export function createCrescentSlashArcGeometry(
  innerRadius = 1.1,
  outerRadius = 2.8,
  arcRadians = Math.PI * 1.15,
  segments = 28,
  thickness = 0.08
): MeshGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfArc = arcRadians * 0.5;
  const halfThick = thickness * 0.5;

  // Build top and bottom crescent surfaces so it is visible from any camera angle
  for (let side = 0; side < 2; side++) {
    const ny = side === 0 ? 1 : -1;
    const yOff = side === 0 ? halfThick : -halfThick;
    const baseIdx = positions.length / 3;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Taper crescent width at both ends (sin curve) so it looks like a razor crescent wave, never a box!
      const taper = Math.sin(t * Math.PI);
      const angle = -halfArc + t * arcRadians;
      const sinA = Math.sin(angle);
      const cosA = -Math.cos(angle); // Forward is -Z

      const rMid = (innerRadius + outerRadius) * 0.5;
      const halfSpan = ((outerRadius - innerRadius) * 0.5) * (0.18 + 0.82 * taper);
      const rIn = rMid - halfSpan * 0.65;
      const rOut = rMid + halfSpan * 1.15;

      // Inner vertex
      positions.push(sinA * rIn, yOff * taper, cosA * rIn);
      normals.push(0, ny, 0);
      uvs.push(t, 0);

      // Outer razor crest vertex
      positions.push(sinA * rOut, yOff * taper * 1.4, cosA * rOut);
      normals.push(sinA * 0.3, ny * 0.9, cosA * 0.3);
      uvs.push(t, 1);
    }

    for (let i = 0; i < segments; i++) {
      const a = baseIdx + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      if (side === 0) {
        indices.push(a, b, c);
        indices.push(b, d, c);
      } else {
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  });
}

/**
 * Creates a 3D Expanding Shockwave Torus / Ring Wave Geometry for Heavy Cleave, Dream Lunge, and Nightveil Burst.
 */
export function createRingWaveGeometry(
  innerRadius = 1.6,
  outerRadius = 2.4,
  crestHeight = 0.22,
  radialSegments = 32
): MeshGeometry {
  const segs = Math.max(12, radialSegments);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const midRadius = (innerRadius + outerRadius) * 0.5;

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const phi = u * Math.PI * 2;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);

    // 0: Inner ring base
    positions.push(innerRadius * cosP, 0.02, innerRadius * sinP);
    normals.push(-cosP * 0.5, 0.85, -sinP * 0.5);
    uvs.push(u, 0);

    // 1: Raised shockwave crest
    positions.push(midRadius * cosP, crestHeight, midRadius * sinP);
    normals.push(0, 1, 0);
    uvs.push(u, 0.5);

    // 2: Outer ring base
    positions.push(outerRadius * cosP, 0.02, outerRadius * sinP);
    normals.push(cosP * 0.5, 0.85, sinP * 0.5);
    uvs.push(u, 1);
  }

  for (let i = 0; i < segs; i++) {
    const rowA = i * 3;
    const rowB = (i + 1) * 3;
    // Inner slope
    indices.push(rowA, rowB, rowA + 1);
    indices.push(rowA + 1, rowB, rowB + 1);
    // Outer slope
    indices.push(rowA + 1, rowB + 1, rowA + 2);
    indices.push(rowA + 2, rowB + 1, rowB + 2);
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  });
}

/**
 * Creates a jagged 3D Awakening Lightning / Blood-Flame Pillar & Tectonic Spike Geometry.
 */
export function createSkillPillarSpikeGeometry(
  baseRadius = 0.35,
  topRadius = 0.04,
  height = 3.2,
  radialSegments = 10
): MeshGeometry {
  return createSculptedArmorSegmentGeometry(
    [baseRadius, baseRadius * 0.78, baseRadius * 0.52, baseRadius * 0.28, topRadius],
    [baseRadius, baseRadius * 0.78, baseRadius * 0.52, baseRadius * 0.28, topRadius],
    [0, height * 0.25, height * 0.55, height * 0.82, height],
    0,
    0,
    0,
    radialSegments,
    [0, 0.06, -0.05, 0.04, 0]
  );
}

/**
 * Creates a curved Sacred Aegis Barrier Shield mesh for Guard ('Q') visual feedback.
 */
export function createAegisBarrierShieldGeometry(
  radius = 1.15,
  height = 1.65,
  arcRadians = Math.PI * 0.72,
  segments = 16
): MeshGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const halfArc = arcRadians * 0.5;

  for (let r = 0; r <= 4; r++) {
    const v = r / 4;
    const y = 0.25 + v * height;
    const archCurve = Math.sin(v * Math.PI) * 0.14;
    for (let s = 0; s <= segments; s++) {
      const u = s / segments;
      const angle = -halfArc + u * arcRadians;
      const sinA = Math.sin(angle);
      const cosA = -Math.cos(angle);
      const rad = radius + archCurve;
      positions.push(sinA * rad, y, cosA * rad);
      normals.push(sinA, 0.1, cosA);
      uvs.push(u, v);
    }
  }

  const stride = segments + 1;
  for (let r = 0; r < 4; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = (r + 1) * stride + s;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
      indices.push(a, c, b, b, c, d);
    }
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  });
}

/**
 * Creates a sculpted Dark-Fantasy Action-MMORPG Hero (Rohan: Blood Feud / Black Desert Online inspired).
 * Replaces flat boxes with contoured plate cuirass, horned dragon-crest helm, curved winged pauldrons,
 * tapered vambraces & greaves, flowing royal battle-cape, and a runic double-edged greatsword!
 */
export function createCyberKnightGeometries() {
  return {
    // Sculpted Dragon-Knight Helm with contoured crown & cheek guards
    head: createSculptedArmorSegmentGeometry(
      [0.12, 0.16, 0.17, 0.15, 0.08],
      [0.13, 0.18, 0.19, 0.16, 0.10],
      [-0.15, -0.06, 0.04, 0.13, 0.22],
      0, 1.62, 0, 16,
      [0, 0.01, 0.02, 0, -0.04]
    ),
    // Curved wrap-around glowing optic visor
    visor: createSculptedArmorSegmentGeometry(
      [0.15, 0.165, 0.14],
      [0.09, 0.11, 0.08],
      [-0.04, 0.0, 0.04],
      0, 1.62, 0.11, 14,
      [0.02, 0.04, 0.01]
    ),
    // Sculpted V-Taper Heroic Plate Cuirass (narrow waist, broad armored chest)
    torso: createSculptedArmorSegmentGeometry(
      [0.19, 0.22, 0.28, 0.30, 0.24],
      [0.14, 0.16, 0.21, 0.22, 0.16],
      [-0.29, -0.12, 0.06, 0.20, 0.29],
      0, 1.16, 0, 18,
      [0, 0.01, 0.03, 0.02, 0]
    ),
    // Faceted chest runic heart-core crystal
    core: createSculptedArmorSegmentGeometry(
      [0.03, 0.09, 0.03],
      [0.03, 0.06, 0.03],
      [-0.09, 0.0, 0.09],
      0, 1.25, 0.19, 8
    ),
    // Layered winged Dragon Pauldrons (Left & Right)
    pauldronL: createSculptedArmorSegmentGeometry(
      [0.15, 0.19, 0.16, 0.06],
      [0.16, 0.20, 0.17, 0.08],
      [-0.10, 0.0, 0.09, 0.18],
      -0.38, 1.38, 0, 14,
      [0, 0, -0.03, -0.08]
    ),
    pauldronR: createSculptedArmorSegmentGeometry(
      [0.15, 0.19, 0.16, 0.06],
      [0.16, 0.20, 0.17, 0.08],
      [-0.10, 0.0, 0.09, 0.18],
      0.38, 1.38, 0, 14,
      [0, 0, -0.03, -0.08]
    ),
    // Tapered Armored Vambraces & Gauntlets
    armL: createSculptedArmorSegmentGeometry(
      [0.065, 0.09, 0.075, 0.095],
      [0.065, 0.09, 0.075, 0.095],
      [-0.26, -0.08, 0.10, 0.26],
      -0.36, 1.02, 0, 12,
      [0.04, 0.02, 0, 0]
    ),
    armR: createSculptedArmorSegmentGeometry(
      [0.065, 0.09, 0.075, 0.095],
      [0.065, 0.09, 0.075, 0.095],
      [-0.26, -0.08, 0.10, 0.26],
      0.36, 1.02, 0, 12,
      [0.04, 0.02, 0, 0]
    ),
    // Sculpted Runic Awakening Greatsword (pommel -> hilt -> crossguard -> fuller blade -> razor tip)
    blade: createSculptedArmorSegmentGeometry(
      [0.04, 0.028, 0.16, 0.065, 0.085, 0.055, 0.008],
      [0.04, 0.028, 0.045, 0.022, 0.026, 0.018, 0.004],
      [-0.28, -0.08, -0.02, 0.05, 0.48, 0.92, 1.28],
      0.38, 0.85, -0.35, 10,
      [0.12, 0.04, 0, -0.04, -0.22, -0.40, -0.56]
    ),
    // Armored Tassets / Waist Fauld
    hip: createSculptedArmorSegmentGeometry(
      [0.25, 0.22, 0.19],
      [0.18, 0.16, 0.14],
      [-0.12, 0.0, 0.10],
      0, 0.78, 0, 16
    ),
    // Contoured Armored Greaves & Sabatons
    legL: createSculptedArmorSegmentGeometry(
      [0.085, 0.07, 0.105, 0.095, 0.11],
      [0.12, 0.08, 0.11, 0.10, 0.115],
      [-0.35, -0.22, 0.0, 0.18, 0.35],
      -0.15, 0.36, 0, 14,
      [0.04, 0, 0.02, 0, 0]
    ),
    legR: createSculptedArmorSegmentGeometry(
      [0.085, 0.07, 0.105, 0.095, 0.11],
      [0.12, 0.08, 0.11, 0.10, 0.115],
      [-0.35, -0.22, 0.0, 0.18, 0.35],
      0.15, 0.36, 0, 14,
      [0.04, 0, 0.02, 0, 0]
    ),
    // Flowing Royal Battle-Cape & Dragon Spine Crest
    spine: createSculptedArmorSegmentGeometry(
      [0.34, 0.30, 0.25, 0.22, 0.18],
      [0.03, 0.035, 0.04, 0.04, 0.03],
      [-0.52, -0.25, 0.0, 0.20, 0.34],
      0, 0.92, -0.22, 14,
      [-0.18, -0.12, -0.06, -0.02, 0.02]
    ),
    // Twin Swept Dragon-Helm Horns
    horns: createSculptedArmorSegmentGeometry(
      [0.14, 0.22, 0.28, 0.32],
      [0.05, 0.04, 0.03, 0.015],
      [0.0, 0.08, 0.18, 0.28],
      0, 1.72, -0.02, 10,
      [0, -0.04, -0.10, -0.18]
    ),
  };
}

/**
 * Creates a sculpted Tapered Ancient Obelisk with crystal apex (replaces box monoliths).
 */
export function createSculptedObeliskGeometry(): MeshGeometry {
  return createSculptedArmorSegmentGeometry(
    [0.62, 0.52, 0.44, 0.38, 0.32, 0.04],
    [0.62, 0.52, 0.44, 0.38, 0.32, 0.04],
    [0.0, 0.12, 0.18, 0.55, 0.86, 1.0],
    0, 0, 0, 8
  );
}

/**
 * Creates a sculpted Colossus Automaton Boss mesh for the Hollow Sentinel (replaces the 1.2x2.6x1.2 box).
 */
export function createSculptedSentinelColossusGeometry(): MeshGeometry {
  return createSculptedArmorSegmentGeometry(
    [0.72, 0.55, 0.42, 0.68, 0.82, 0.52, 0.35, 0.12],
    [0.72, 0.55, 0.40, 0.56, 0.65, 0.48, 0.35, 0.12],
    [0.0, 0.35, 0.85, 1.35, 1.85, 2.20, 2.48, 2.75],
    0, 0, 0, 14,
    [0, 0, 0.02, 0.05, 0.06, 0.02, 0, -0.04]
  );
}

/**
 * Creates a radial cylinder / disc primitive (for "16-Bit Circle-Craft" mode — circles, never square cubes!).
 * Every cross-section in XZ is a true radial polygon/circle of `radialSegments` sides with top and bottom disc caps.
 */
export function createCylinderDiscGeometry(
  radiusX = 0.5,
  height = 1.0,
  radiusZ = radiusX,
  ox = 0,
  oy = 0,
  oz = 0,
  radialSegments = 16
): MeshGeometry {
  const segs = Math.max(8, radialSegments);
  const hh = height * 0.5;
  const minY = oy - hh;
  const maxY = oy + hh;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // 1. Cylindrical side wall
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const phi = u * Math.PI * 2;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);

    const x = ox + radiusX * cosP;
    const z = oz + radiusZ * sinP;

    // Normal along radial outward direction
    const nx = cosP;
    const nz = sinP;

    // Bottom ring vertex
    positions.push(x, minY, z);
    normals.push(nx, 0, nz);
    uvs.push(u, 0);

    // Top ring vertex
    positions.push(x, maxY, z);
    normals.push(nx, 0, nz);
    uvs.push(u, 1);
  }

  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }

  // 2. Top circular disc cap (Y+)
  const topCenterIdx = positions.length / 3;
  positions.push(ox, maxY, oz);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);

  for (let i = 0; i <= segs; i++) {
    const phi = (i / segs) * Math.PI * 2;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    positions.push(ox + radiusX * cosP, maxY, oz + radiusZ * sinP);
    normals.push(0, 1, 0);
    uvs.push(0.5 + 0.5 * cosP, 0.5 + 0.5 * sinP);
  }
  for (let i = 0; i < segs; i++) {
    indices.push(topCenterIdx, topCenterIdx + 1 + i + 1, topCenterIdx + 1 + i);
  }

  // 3. Bottom circular disc cap (Y-)
  const botCenterIdx = positions.length / 3;
  positions.push(ox, minY, oz);
  normals.push(0, -1, 0);
  uvs.push(0.5, 0.5);

  for (let i = 0; i <= segs; i++) {
    const phi = (i / segs) * Math.PI * 2;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    positions.push(ox + radiusX * cosP, minY, oz + radiusZ * sinP);
    normals.push(0, -1, 0);
    uvs.push(0.5 + 0.5 * cosP, 0.5 + 0.5 * sinP);
  }
  for (let i = 0; i < segs; i++) {
    indices.push(botCenterIdx, botCenterIdx + 1 + i, botCenterIdx + 1 + i + 1);
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  });
}

/**
 * Creates the 16-Bit Circle-Craft character avatar where every limb, helm, visor,
 * torso, core, pauldron, and blade is constructed from radial cylinders & circular discs
 * ("16 bit circles chars not square like minecraft").
 */
export function createCircleCraftCharacterGeometries() {
  return {
    head: createCylinderDiscGeometry(0.18, 0.30, 0.18, 0, 1.62, 0, 16),
    visor: createCylinderDiscGeometry(0.15, 0.08, 0.08, 0, 1.62, 0.15, 12),
    torso: createCylinderDiscGeometry(0.27, 0.58, 0.20, 0, 1.16, 0, 16),
    core: createCylinderDiscGeometry(0.09, 0.14, 0.06, 0, 1.25, 0.18, 12),
    pauldronL: createCylinderDiscGeometry(0.13, 0.22, 0.13, -0.38, 1.38, 0, 12),
    pauldronR: createCylinderDiscGeometry(0.13, 0.22, 0.13, 0.38, 1.38, 0, 12),
    armL: createCylinderDiscGeometry(0.08, 0.52, 0.08, -0.36, 1.02, 0, 12),
    armR: createCylinderDiscGeometry(0.08, 0.52, 0.08, 0.36, 1.02, 0, 12),
    blade: createCylinderDiscGeometry(0.05, 0.75, 0.06, 0.38, 0.85, 0.25, 12),
    hip: createCylinderDiscGeometry(0.22, 0.18, 0.17, 0, 0.78, 0, 16),
    legL: createCylinderDiscGeometry(0.09, 0.68, 0.10, -0.15, 0.36, 0, 12),
    legR: createCylinderDiscGeometry(0.09, 0.68, 0.10, 0.15, 0.36, 0, 12),
    spine: createCylinderDiscGeometry(0.06, 0.54, 0.06, 0, 1.18, -0.20, 12),
  };
}
