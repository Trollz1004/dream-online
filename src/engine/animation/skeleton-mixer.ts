/**
 * DREAM Engine — In-House Skeleton Animation Playback & Cross-Fade Mixer
 * Pure TypeScript, zero external dependencies.
 *
 * Evaluates glTF 2.0 keyframe tracks (translation, rotation, scale), supports smooth
 * blending / cross-fading between two animation clips (e.g. Walk <-> Idle),
 * computes world-space hierarchy transforms, and outputs a flat column-major
 * `Float32Array(maxJoints * 16)` palette of skinning matrices (`worldJoint * inverseBindMatrix`)
 * for 4-bone Linear Blend Skinning in both WebGPU and WebGL2 renderers.
 */

import { Mat4 } from '../math/mat4.ts';
import { Quat } from '../math/quat.ts';
import { Vec3 } from '../math/vec3.ts';
import {
  GlbAnimationChannel,
  GlbAnimationClip,
  GlbNode,
  GlbSkin,
  ParsedGlbAsset,
} from '../assets/glb-loader.ts';
import { MeshGeometry } from '../scene/mesh.ts';

export const MAX_SKIN_JOINTS = 64;

interface NodePose {
  translation: Vec3;
  rotation: Quat;
  scale: Vec3;
}

function findKeyframePair(times: Float32Array, t: number): { i0: number; i1: number; alpha: number } {
  const n = times.length;
  if (n === 0) return { i0: 0, i1: 0, alpha: 0 };
  if (n === 1 || t <= times[0]) return { i0: 0, i1: 0, alpha: 0 };
  if (t >= times[n - 1]) return { i0: n - 1, i1: n - 1, alpha: 0 };

  // Binary search for interval [times[i0], times[i1]]
  let lo = 0;
  let hi = n - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }
  const t0 = times[lo];
  const t1 = times[hi];
  const span = t1 - t0;
  const alpha = span > 1e-6 ? Math.max(0, Math.min(1, (t - t0) / span)) : 0;
  return { i0: lo, i1: hi, alpha };
}

function sampleVec3Channel(ch: GlbAnimationChannel, t: number, out: Vec3): Vec3 {
  const { i0, i1, alpha } = findKeyframePair(ch.times, t);
  const stride = ch.interpolation === 'CUBICSPLINE' ? 9 : 3;
  const offset = ch.interpolation === 'CUBICSPLINE' ? 3 : 0;

  const b0 = i0 * stride + offset;
  const x0 = ch.values[b0] ?? 0;
  const y0 = ch.values[b0 + 1] ?? 0;
  const z0 = ch.values[b0 + 2] ?? 0;

  if (ch.interpolation === 'STEP' || i0 === i1 || alpha === 0) {
    return out.set(x0, y0, z0);
  }

  const b1 = i1 * stride + offset;
  const x1 = ch.values[b1] ?? x0;
  const y1 = ch.values[b1 + 1] ?? y0;
  const z1 = ch.values[b1 + 2] ?? z0;

  return out.set(
    x0 + (x1 - x0) * alpha,
    y0 + (y1 - y0) * alpha,
    z0 + (z1 - z0) * alpha
  );
}

const _tmpQuatB = new Quat();

function sampleQuatChannel(ch: GlbAnimationChannel, t: number, out: Quat): Quat {
  const { i0, i1, alpha } = findKeyframePair(ch.times, t);
  const stride = ch.interpolation === 'CUBICSPLINE' ? 12 : 4;
  const offset = ch.interpolation === 'CUBICSPLINE' ? 4 : 0;

  const b0 = i0 * stride + offset;
  out.set(
    ch.values[b0] ?? 0,
    ch.values[b0 + 1] ?? 0,
    ch.values[b0 + 2] ?? 0,
    ch.values[b0 + 3] ?? 1
  );

  if (ch.interpolation === 'STEP' || i0 === i1 || alpha === 0) {
    return normalizeQuat(out);
  }

  const b1 = i1 * stride + offset;
  _tmpQuatB.set(
    ch.values[b1] ?? 0,
    ch.values[b1 + 1] ?? 0,
    ch.values[b1 + 2] ?? 0,
    ch.values[b1 + 3] ?? 1
  );
  out.slerp(_tmpQuatB, alpha);
  return normalizeQuat(out);
}

function normalizeQuat(q: Quat): Quat {
  const len = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  q.x /= len;
  q.y /= len;
  q.z /= len;
  q.w /= len;
  return q;
}

export class SkeletonAnimationMixer {
  readonly nodes: GlbNode[];
  readonly skin: GlbSkin;
  readonly clips: Map<string, GlbAnimationClip> = new Map();
  readonly jointMatrices: Float32Array;
  readonly worldMatrices: Mat4[];
  readonly localMatrices: Mat4[];

  private posesA: NodePose[];
  private posesB: NodePose[];
  private blendedPoses: NodePose[];
  private topologicalOrder: number[] = [];
  private tmpMat = new Mat4();

  private primaryClipName: string;
  private secondaryClipName: string | null = null;
  private blendFactor = 0.0; // 0 = 100% primaryClip, 1 = 100% secondaryClip
  private crossFadeDuration = 0.0;
  private crossFadeElapsed = 0.0;
  private currentTime = 0.0;

  constructor(asset: ParsedGlbAsset, skinIndex = 0) {
    this.nodes = asset.nodes;
    this.skin = asset.skins[skinIndex] ?? {
      name: 'default_skin',
      skeletonRootNode: 0,
      joints: asset.nodes.map((n) => n.index),
      jointNames: asset.nodes.map((n) => n.name),
      inverseBindMatrices: asset.nodes.map(() => new Mat4()),
    };

    for (const clip of asset.animations) {
      this.clips.set(clip.name, clip);
    }

    this.primaryClipName = asset.animations[0]?.name ?? '';
    this.jointMatrices = new Float32Array(MAX_SKIN_JOINTS * 16);
    // Initialize all 64 joint slots to identity
    for (let j = 0; j < MAX_SKIN_JOINTS; j++) {
      this.jointMatrices[j * 16 + 0] = 1;
      this.jointMatrices[j * 16 + 5] = 1;
      this.jointMatrices[j * 16 + 10] = 1;
      this.jointMatrices[j * 16 + 15] = 1;
    }

    const nCount = this.nodes.length;
    this.localMatrices = Array.from({ length: nCount }, () => new Mat4());
    this.worldMatrices = Array.from({ length: nCount }, () => new Mat4());

    this.posesA = this.nodes.map((n) => ({
      translation: n.translation.clone(),
      rotation: n.rotation.clone(),
      scale: n.scale.clone(),
    }));
    this.posesB = this.nodes.map((n) => ({
      translation: n.translation.clone(),
      rotation: n.rotation.clone(),
      scale: n.scale.clone(),
    }));
    this.blendedPoses = this.nodes.map((n) => ({
      translation: n.translation.clone(),
      rotation: n.rotation.clone(),
      scale: n.scale.clone(),
    }));

    this.buildTopologicalOrder();
    this.evaluateAtTime(0);
  }

  private buildTopologicalOrder(): void {
    const visited = new Uint8Array(this.nodes.length);
    const visit = (idx: number) => {
      if (idx < 0 || idx >= this.nodes.length || visited[idx]) return;
      const parent = this.nodes[idx].parentIndex;
      if (parent >= 0 && !visited[parent]) {
        visit(parent);
      }
      visited[idx] = 1;
      this.topologicalOrder.push(idx);
    };
    for (let i = 0; i < this.nodes.length; i++) {
      visit(i);
    }
  }

  getClipNames(): string[] {
    return Array.from(this.clips.keys());
  }

  playClip(clipName: string): void {
    if (!this.clips.has(clipName)) return;
    this.primaryClipName = clipName;
    this.secondaryClipName = null;
    this.blendFactor = 0.0;
    this.crossFadeDuration = 0.0;
  }

  /**
   * Starts a smooth cross-fade transition from the current primary clip to `targetClipName`.
   */
  crossFadeTo(targetClipName: string, durationSec = 0.25): void {
    if (!this.clips.has(targetClipName) || targetClipName === this.primaryClipName) return;
    this.secondaryClipName = targetClipName;
    this.crossFadeDuration = Math.max(0.001, durationSec);
    this.crossFadeElapsed = 0.0;
    this.blendFactor = 0.0;
  }

  /**
   * Explicitly sets two clips and a blend weight `weightB` in `[0, 1]`
   * (0 = 100% `clipA`, 1 = 100% `clipB`).
   */
  setBlendClips(clipA: string, clipB: string, weightB: number): void {
    if (this.clips.has(clipA)) this.primaryClipName = clipA;
    this.secondaryClipName = this.clips.has(clipB) ? clipB : null;
    this.blendFactor = Math.max(0, Math.min(1, weightB));
    this.crossFadeDuration = 0;
  }

  /**
   * Advances mixer clock by `dt` seconds and updates `jointMatrices`.
   */
  update(dt: number): Float32Array {
    this.currentTime += dt;
    if (this.secondaryClipName && this.crossFadeDuration > 0) {
      this.crossFadeElapsed += dt;
      this.blendFactor = Math.min(1.0, this.crossFadeElapsed / this.crossFadeDuration);
      if (this.blendFactor >= 1.0) {
        this.primaryClipName = this.secondaryClipName;
        this.secondaryClipName = null;
        this.blendFactor = 0.0;
        this.crossFadeDuration = 0.0;
      }
    }
    return this.evaluateAtTime(this.currentTime);
  }

  private sampleClipIntoPoses(clip: GlbAnimationClip | undefined, timeSec: number, targetPoses: NodePose[]): void {
    // Reset to rest pose first
    for (let i = 0; i < this.nodes.length; i++) {
      const rest = this.nodes[i];
      targetPoses[i].translation.copy(rest.translation);
      targetPoses[i].rotation.copy(rest.rotation);
      targetPoses[i].scale.copy(rest.scale);
    }
    if (!clip || clip.channels.length === 0) return;

    const localT = clip.duration > 1e-5 ? ((timeSec % clip.duration) + clip.duration) % clip.duration : 0;
    for (const ch of clip.channels) {
      const pose = targetPoses[ch.targetNode];
      if (!pose) continue;
      if (ch.path === 'translation') {
        sampleVec3Channel(ch, localT, pose.translation);
      } else if (ch.path === 'rotation') {
        sampleQuatChannel(ch, localT, pose.rotation);
      } else if (ch.path === 'scale') {
        sampleVec3Channel(ch, localT, pose.scale);
      }
    }
  }

  /**
   * Evaluates the active animation clip (or blended pair of clips) at `timeSec`
   * and returns the updated `Float32Array(MAX_SKIN_JOINTS * 16)` skinning matrix palette.
   */
  evaluateAtTime(timeSec: number): Float32Array {
    this.currentTime = timeSec;
    const clipA = this.clips.get(this.primaryClipName);
    this.sampleClipIntoPoses(clipA, timeSec, this.posesA);

    const clipB = this.secondaryClipName ? this.clips.get(this.secondaryClipName) : undefined;
    const w = clipB ? this.blendFactor : 0.0;

    if (clipB && w > 0.0) {
      this.sampleClipIntoPoses(clipB, timeSec, this.posesB);
      for (let i = 0; i < this.nodes.length; i++) {
        const pa = this.posesA[i];
        const pb = this.posesB[i];
        const out = this.blendedPoses[i];
        out.translation.copy(pa.translation).lerp(pb.translation, w);
        out.rotation.copy(pa.rotation).slerp(pb.rotation, w);
        out.scale.copy(pa.scale).lerp(pb.scale, w);
      }
    } else {
      for (let i = 0; i < this.nodes.length; i++) {
        const pa = this.posesA[i];
        const out = this.blendedPoses[i];
        out.translation.copy(pa.translation);
        out.rotation.copy(pa.rotation);
        out.scale.copy(pa.scale);
      }
    }

    // Compose local and world hierarchy matrices in topological order
    for (const idx of this.topologicalOrder) {
      const pose = this.blendedPoses[idx];
      const localMat = this.localMatrices[idx];
      localMat.compose(pose.translation, pose.rotation, pose.scale);

      const parentIdx = this.nodes[idx].parentIndex;
      if (parentIdx >= 0) {
        this.worldMatrices[idx].multiplyMatrices(this.worldMatrices[parentIdx], localMat);
      } else {
        this.worldMatrices[idx].copy(localMat);
      }
    }

    // Compute final joint palette: jointMatrix[j] = worldMatrix[jointNode] * inverseBindMatrix[j]
    const jointCount = Math.min(this.skin.joints.length, MAX_SKIN_JOINTS);
    for (let j = 0; j < jointCount; j++) {
      const nodeIdx = this.skin.joints[j];
      const worldMat = this.worldMatrices[nodeIdx];
      const ibm = this.skin.inverseBindMatrices[j];
      this.tmpMat.multiplyMatrices(worldMat, ibm);
      this.jointMatrices.set(this.tmpMat.elements, j * 16);
    }

    return this.jointMatrices;
  }
}

/**
 * Applies 4-bone Linear Blend Skinning on the CPU to a single vertex `vertexIndex`
 * for deterministic verification tests and bounding-box checks.
 */
export function applyFourBoneLbsToVertex(
  geom: MeshGeometry,
  vertexIndex: number,
  jointMatrices: Float32Array
): { position: Vec3; normal: Vec3 } {
  const px = geom.positions[vertexIndex * 3 + 0];
  const py = geom.positions[vertexIndex * 3 + 1];
  const pz = geom.positions[vertexIndex * 3 + 2];

  const nx = geom.normals[vertexIndex * 3 + 0];
  const ny = geom.normals[vertexIndex * 3 + 1];
  const nz = geom.normals[vertexIndex * 3 + 2];

  let outPx = 0, outPy = 0, outPz = 0;
  let outNx = 0, outNy = 0, outNz = 0;

  for (let k = 0; k < 4; k++) {
    const weight = geom.weights0[vertexIndex * 4 + k];
    if (weight <= 0) continue;
    const jointIdx = Math.min(MAX_SKIN_JOINTS - 1, geom.joints0[vertexIndex * 4 + k]);
    const base = jointIdx * 16;

    const m00 = jointMatrices[base + 0], m01 = jointMatrices[base + 4], m02 = jointMatrices[base + 8],  m03 = jointMatrices[base + 12];
    const m10 = jointMatrices[base + 1], m11 = jointMatrices[base + 5], m12 = jointMatrices[base + 9],  m13 = jointMatrices[base + 13];
    const m20 = jointMatrices[base + 2], m21 = jointMatrices[base + 6], m22 = jointMatrices[base + 10], m23 = jointMatrices[base + 14];

    outPx += weight * (m00 * px + m01 * py + m02 * pz + m03);
    outPy += weight * (m10 * px + m11 * py + m12 * pz + m13);
    outPz += weight * (m20 * px + m21 * py + m22 * pz + m23);

    outNx += weight * (m00 * nx + m01 * ny + m02 * nz);
    outNy += weight * (m10 * nx + m11 * ny + m12 * nz);
    outNz += weight * (m20 * nx + m21 * ny + m22 * nz);
  }

  return {
    position: new Vec3(outPx, outPy, outPz),
    normal: new Vec3(outNx, outNy, outNz).normalize(),
  };
}
