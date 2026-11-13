/**
 * DREAM Engine — Renderer Types & Interfaces
 * Pure TypeScript, zero external dependencies.
 */

import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';
import { MeshGeometry, MaterialProperties } from '../scene/mesh.ts';
import { RenderProfileData } from './render-profile.ts';

export interface RenderItem {
  geometry: MeshGeometry;
  modelMatrix: Mat4;
  material: MaterialProperties;
  /**
   * Optional 4-bone Linear Blend Skinning joint palette (up to 64 mat4x4 column-major matrices = 1024 floats).
   * When present and skinningEnabled is true, each vertex transforms by:
   *   skinMat = w.x * joints[j.x] + w.y * joints[j.y] + w.z * joints[j.z] + w.w * joints[j.w]
   */
  skinJointMatrices?: Float32Array;
}

export interface RenderMetrics {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  backend: 'WebGPU' | 'WebGL2';
  worldMode: 'day' | 'night';
  activeFallbacks: string[];
  luma: number;
}

export interface IRenderer {
  readonly backend: 'WebGPU' | 'WebGL2';
  init(): Promise<boolean>;
  resize(width: number, height: number): void;
  render(
    items: RenderItem[],
    viewMatrix: Mat4,
    projectionMatrix: Mat4,
    cameraPos: Vec3,
    profile: RenderProfileData,
    sunDirection: Vec3
  ): void;
  readLuma?(): number;
  dispose(): void;
}
