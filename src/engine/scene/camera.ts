/**
 * DREAM Engine — Over-the-Shoulder 3rd-Person & 1st-Person Camera
 * Frames the hero in the left third and the boss unobstructed in the center-right.
 * Supports FOV punch, deterministic impact shake, and ultimate camera pull-back.
 */

import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';

export class Camera {
  readonly position = new Vec3(1.05, 2.2, 4.2);
  readonly target = new Vec3(0.42, 1.38, -2.2);
  readonly up = new Vec3(0, 1, 0);

  readonly viewMatrix = new Mat4();
  readonly projectionMatrix = new Mat4();

  // Orbit parameters
  yaw = 0; // Radians around Y (0 looks down -Z)
  pitch = -0.14; // Radians around X
  distance = 4.2;
  minDistance = 2.0;
  maxDistance = 14.0;

  // Over-the-shoulder framing offsets (hero on left third, boss unobstructed center-right)
  shoulderOffsetRight = 1.05;
  targetOffsetRight = 0.42;
  targetLookAhead = 2.2;

  // Dynamic combat camera effects (FOV punch, deterministic shake, ultimate pull-back)
  private baseFovDeg: number;
  private fovRadians: number;
  private fovPunchDeg = 0;
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeClock = 0;
  ultimatePullback = 0;
  private targetPullback = 0;

  // View Mode: 'third-person' | 'first-person'
  viewMode: 'third-person' | 'first-person' = 'third-person';

  private aspect: number;
  private near: number;
  private far: number;

  constructor(fovDegrees = 60, aspect = 16 / 9, near = 0.1, far = 1500) {
    this.baseFovDeg = fovDegrees;
    this.fovRadians = (fovDegrees * Math.PI) / 180;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.updateProjection();
  }

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.updateProjection();
  }

  setFov(fovDegrees: number): void {
    const clamped = Math.max(40, Math.min(110, fovDegrees));
    this.baseFovDeg = clamped;
    this.fovRadians = ((clamped + this.fovPunchDeg) * Math.PI) / 180;
    this.updateProjection();
  }

  /**
   * Triggers a crisp FOV punch and deterministic camera shake on heavy hits and ultimates.
   */
  triggerPunch(fovDeltaDeg = 5.5, shakeAmount = 0.14, duration = 0.24): void {
    this.fovPunchDeg = Math.max(this.fovPunchDeg, fovDeltaDeg);
    this.shakeIntensity = Math.max(this.shakeIntensity, shakeAmount);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  /**
   * Sets target extra pull-back distance (e.g., +2.1m during the 5.0-7.0s ultimate).
   */
  setUltimatePullback(extraMeters: number): void {
    this.targetPullback = Math.max(0, extraMeters);
  }

  updateProjection(): void {
    this.projectionMatrix.makePerspective(this.fovRadians, this.aspect, this.near, this.far);
  }

  toggleViewMode(): 'third-person' | 'first-person' {
    this.viewMode = this.viewMode === 'third-person' ? 'first-person' : 'third-person';
    return this.viewMode;
  }

  updateOrbit(targetPos: Vec3, dt = 0.016): void {
    // Clamp pitch so camera doesn't flip or dip under ground
    const maxPitch = this.viewMode === 'first-person' ? 1.35 : 0.45;
    const minPitch = -1.25;
    if (this.pitch > maxPitch) this.pitch = maxPitch;
    if (this.pitch < minPitch) this.pitch = minPitch;

    // Smoothly decay FOV punch & camera shake
    if (this.fovPunchDeg !== 0) {
      const sign = this.fovPunchDeg > 0 ? 1 : -1;
      this.fovPunchDeg = sign * Math.max(0, Math.abs(this.fovPunchDeg) - dt * 22.0);
      this.fovRadians = ((this.baseFovDeg + this.fovPunchDeg) * Math.PI) / 180;
      this.updateProjection();
    }

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeDuration > 0) {
      this.shakeDuration = Math.max(0, this.shakeDuration - dt);
      this.shakeClock += dt;
      const damp = Math.min(1, this.shakeDuration * 5.0);
      shakeX = Math.sin(this.shakeClock * 53.0) * this.shakeIntensity * damp;
      shakeY = Math.cos(this.shakeClock * 69.0) * this.shakeIntensity * 0.75 * damp;
      if (this.shakeDuration === 0) {
        this.shakeIntensity = 0;
      }
    }

    // Smoothly interpolate ultimate pull-back distance
    const pullbackRate = Math.min(1, dt * 6.5);
    this.ultimatePullback += (this.targetPullback - this.ultimatePullback) * pullbackRate;

    if (this.viewMode === 'first-person') {
      this.position.set(targetPos.x + shakeX, targetPos.y + 1.55 + shakeY, targetPos.z);

      const forwardX = -Math.sin(this.yaw) * Math.cos(this.pitch);
      const forwardY = Math.sin(this.pitch);
      const forwardZ = -Math.cos(this.yaw) * Math.cos(this.pitch);

      this.target.set(
        this.position.x + forwardX * 10,
        this.position.y + forwardY * 10,
        this.position.z + forwardZ * 10
      );
    } else {
      // Over-the-Shoulder 3rd-Person Framing:
      // Right vector and forward vector relative to camera yaw
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);
      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);

      const effectiveDist = this.distance + this.ultimatePullback;
      const effectivePitch = this.pitch - this.ultimatePullback * 0.04;
      const horizDist = effectiveDist * Math.cos(effectivePitch);
      const vertDist = effectiveDist * Math.sin(effectivePitch);

      // Look target is slightly right of the hero and slightly ahead toward the boss
      // so the hero stands in the left third and the boss stands unobstructed in the center-right.
      this.target.set(
        targetPos.x + rightX * this.targetOffsetRight + forwardX * this.targetLookAhead + shakeX * 0.6,
        targetPos.y + 1.38 + this.ultimatePullback * 0.12 + shakeY * 0.6,
        targetPos.z + rightZ * this.targetOffsetRight + forwardZ * this.targetLookAhead
      );

      const offsetX = Math.sin(this.yaw) * horizDist + rightX * this.shoulderOffsetRight;
      const offsetZ = Math.cos(this.yaw) * horizDist + rightZ * this.shoulderOffsetRight;

      this.position.set(
        targetPos.x + offsetX + shakeX,
        Math.max(0.65, targetPos.y + 1.48 - vertDist + this.ultimatePullback * 0.35 + shakeY),
        targetPos.z + offsetZ
      );
    }

    this.viewMatrix.makeLookAt(this.position, this.target, this.up);
  }

  getForwardXZ(out: Vec3): Vec3 {
    out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    return out.normalize();
  }

  getRightXZ(out: Vec3): Vec3 {
    out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    return out.normalize();
  }
}
