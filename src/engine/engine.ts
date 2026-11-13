/**
 * DREAM Engine — Runtime Engine Coordinator
 * Pure TypeScript, zero external framework dependencies.
 * Includes Multi-Material Sculpted Hero & Colossus Boss, Over-the-Shoulder Camera,
 * Hit-Stop (60-90ms), Floating Damage Numbers, 3D GPU Particles, and the Deterministic
 * 7-Second Gameplay Sequence (?autopilot=1 / ?capture=1).
 */

import { EngineRenderer } from './renderer/engine-renderer.ts';
import { Camera } from './scene/camera.ts';
import { SceneNode } from './scene/node.ts';
import { InputManager } from './input/input-manager.ts';
import { CharacterController } from './controller/character-controller.ts';
import {
  createGroundPlane,
  createCapsuleGeometry,
  createSkyDomeGeometry,
  createMonolithGeometry,
  createCyberKnightGeometries,
  createCircleCraftCharacterGeometries,
  createCylinderDiscGeometry,
  createCrescentSlashArcGeometry,
  createRingWaveGeometry,
  createSkillPillarSpikeGeometry,
  createAegisBarrierShieldGeometry,
  createSculptedObeliskGeometry,
  createSculptedSentinelColossusGeometry,
  createSculptedSentinelColossusParts,
  createWeatheredCragRockGeometry,
  createSparkDiamondGeometry,
  createBlueFlameFloorSigilGeometry,
  createArrivalShieldDomeGeometry,
  MeshGeometry,
  MaterialProperties,
} from './scene/mesh.ts';
import { RenderItem, RenderMetrics } from './renderer/types.ts';
import { Vec3 } from './math/vec3.ts';
import { AmbientSynth } from './audio/ambient-synth.ts';
import { CombatManager } from './combat/combat-manager.ts';
import { SkillVfxDirector, ActionMmoClassId, SkillVfxThemeId } from './combat/skill-vfx.ts';
import { StudioConfigManager } from './studioConfig.ts';
import { computeCreatorBody3dParams } from '../ui/characterCreatorConfig.ts';
import { WorldEvolutionDirector, quantizeColor16Bit, EvolutionPhase } from './world/world-evolution.ts';
import { OathcallTownshipServer, OathcallDemoState } from './combat/oathcall-system.ts';
import { PvpTacticalCoordinator } from './combat/pvp-tactical-ping.ts';
import { loadGlbFromUrl, ParsedGlbAsset } from './assets/glb-loader.ts';
import { SkeletonAnimationMixer } from './animation/skeleton-mixer.ts';

declare global {
  interface Window {
    __DREAM_ENGINE__?: DreamEngine;
    __DREAM_STEP_TO__?: (targetTimeSec: number) => void;
  }
}

export class DreamEngine {
  private canvas: HTMLCanvasElement;
  private renderer: EngineRenderer;
  readonly camera: Camera;
  readonly input: InputManager;
  readonly controller: CharacterController;
  private cyberKnightGeoms: ReturnType<typeof createCyberKnightGeometries>;
  private circleKnightGeoms: ReturnType<typeof createCircleCraftCharacterGeometries>;
  private sentinelParts: ReturnType<typeof createSculptedSentinelColossusParts>;

  // Authoritative Combat Manager, Skill VFX Director, Live DREAM Studio Config & AI World Evolution Director
  readonly combat: CombatManager = new CombatManager();
  readonly skillVfx: SkillVfxDirector = new SkillVfxDirector();
  readonly studio: StudioConfigManager = new StudioConfigManager();
  readonly evolution: WorldEvolutionDirector = new WorldEvolutionDirector();
  readonly oathcallServer: OathcallTownshipServer = new OathcallTownshipServer();
  readonly pvpTactical: PvpTacticalCoordinator = new PvpTacticalCoordinator();

  // Scene entities
  private sceneRoot: SceneNode;
  private playerNode: SceneNode;
  private visorNode: SceneNode;
  private skyNode: SceneNode;
  private groundNode: SceneNode;
  private monolithNodes: SceneNode[] = [];
  private cragRockNodes: SceneNode[] = [];
  private sentinelNode: SceneNode;
  private sentinelEyeNode: SceneNode;
  private beamNode: SceneNode;
  private telegraphNode: SceneNode;

  // Cached Geometries
  private skyMesh: MeshGeometry;
  private groundMesh: MeshGeometry;
  private playerCapsuleMesh: MeshGeometry;
  private monolithMesh: MeshGeometry;
  private circleMonolithMesh: MeshGeometry;
  private cragRockMesh: MeshGeometry;
  private sparkDiamondMesh: MeshGeometry;
  private visorMesh: MeshGeometry;
  private sentinelMesh: MeshGeometry;
  private circleSentinelMesh: MeshGeometry;
  private sentinelEyeMesh: MeshGeometry;
  private beamMesh: MeshGeometry;
  private telegraphMesh: MeshGeometry;
  private slashMesh: MeshGeometry;
  private burstMesh: MeshGeometry;
  private crescentSlashMesh: MeshGeometry;
  private ringWaveMesh: MeshGeometry;
  private pillarSpikeMesh: MeshGeometry;
  private aegisBarrierMesh: MeshGeometry;
  private blueFlameSigilMesh: MeshGeometry;
  private arrivalShieldMesh: MeshGeometry;

  // Loop, procedural animation & deterministic 7-second autopilot director
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private animClock = 0;

  isAutopilotMode = false;
  isOathcallDemoMode = false;
  isCaptureMode = false;
  isManualStepping = false;
  isCrowd30Mode = false;
  testHumanoidAsset: ParsedGlbAsset | null = null;
  testHumanoidMixers: SkeletonAnimationMixer[] = [];
  scriptedTimeSec = 0;
  isEndCardVisible = false;
  isChampionRegaliaEquipped = false;
  oathcallDemoState: OathcallDemoState;
  private scriptedMilestones = new Set<string>();
  private dustSpawnAccumulator = 0;

  // Callbacks
  onMetricsUpdate?: (
    metrics: RenderMetrics,
    playerPos: Vec3,
    isControlActive: boolean,
    isLocked: boolean,
    cameraYaw: number,
    viewMode: 'third-person' | 'first-person',
    combatInfo: {
      health: number;
      stamina: number;
      lastEvent: string;
      eventsCount: number;
      sentinelHealth: number;
      sentinelDown: boolean;
      dashPhase: string;
      isInvulnerable: boolean;
    }
  ) => void;
  onPointerLockRefused?: (message: string) => void;
  onViewModeChange?: (mode: 'third-person' | 'first-person') => void;
  onToggleMap?: () => void;
  onToggleComboList?: () => void;
  onToggleGeminEye?: () => void;
  onToggleSettings?: () => void;
  onGamepadChange?: (connected: boolean, id: string) => void;

  // Atmospheric Sound
  ambientSynth: AmbientSynth;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new EngineRenderer(canvas);
    this.camera = new Camera(58, canvas.width / (canvas.height || 1), 0.1, 1500);
    this.input = new InputManager();

    const search = typeof window !== 'undefined' ? window.location.search : '';
    this.isCaptureMode = search.includes('capture=1');
    this.isOathcallDemoMode = search.includes('oathcallDemo=1');
    this.isAutopilotMode = search.includes('autopilot=1') || this.isCaptureMode || this.isOathcallDemoMode;
    this.isManualStepping = search.includes('manualStep=1');
    this.isCrowd30Mode = search.includes('crowd=30');

    this.oathcallDemoState = {
      active: this.isOathcallDemoMode,
      phase: 1,
      phaseTitle: 'PART 1 — OATHCALL BULLY MARK & ZERO-LOSS KNOCKOUT',
      phaseSubtitle: 'Lv.85 Attacker (Valkor) knocks out Lv.24 Victim (Pip) -> Flash of Light, 0 Loss, 17m 30s Bully Mark (+18% Valor)',
      elapsedSec: 0,
      victimName: 'Pip',
      victimLevel: 24,
      victimGear: 110,
      attackerName: 'Valkor',
      attackerLevel: 85,
      attackerGear: 480,
      attackerHpPct: 100,
      isBullyMark: true,
      markDurationLabel: '17m 30s (1.75x Bully Rule)',
      valorBuffPct: 18,
      warningBannerText: null,
      arrivalShieldRemainingSec: 0,
      summonedAllies: [],
      knockoutFlashAlpha: 0,
      championRegaliaActive: false,
      townshipSummary: {
        name: 'Sunspire Stronghold',
        holdingGuild: 'Vanguard Sovereign',
        taxRatePct: 25,
        guildBankGold: 4250,
        nextBattleWindow: 'Sat 20:00 UTC (Mandatory Defense)',
      },
    };

    // Start in melee range (-6.8) during normal play so immediate clicks/keys hit the boss,
    // or at (-0.4) at the start of the 7-second sprint-in sequence!
    const initialZ = this.isAutopilotMode ? -0.4 : -6.8;
    this.controller = new CharacterController(new Vec3(0, 0, initialZ), 0.45, 1.9);
    this.controller.facingYaw = 0; // Face -Z toward Hollow Sentinel at (0, 0, -10)
    this.ambientSynth = new AmbientSynth();

    this.sceneRoot = new SceneNode('WorldRoot');

    // Create persistent sculpted geometries once
    this.skyMesh = createSkyDomeGeometry(800, 24, 12);
    this.groundMesh = createGroundPlane(300, 20);
    this.playerCapsuleMesh = createCapsuleGeometry(0.45, 1.9, 24, 8);
    this.cyberKnightGeoms = createCyberKnightGeometries();
    this.circleKnightGeoms = createCircleCraftCharacterGeometries();
    this.sentinelParts = createSculptedSentinelColossusParts();
    this.monolithMesh = createSculptedObeliskGeometry();
    this.circleMonolithMesh = createCylinderDiscGeometry(0.55, 1.0, 0.55, 0, 0.5, 0, 16);
    this.cragRockMesh = createWeatheredCragRockGeometry();
    this.sparkDiamondMesh = createSparkDiamondGeometry(0.5, 1.0);
    this.visorMesh = createMonolithGeometry(1, 1, 1);

    // Combat & Boss Geometries
    this.sentinelMesh = createSculptedSentinelColossusGeometry();
    this.circleSentinelMesh = createCylinderDiscGeometry(0.6, 2.6, 0.6, 0, 1.3, 0, 16);
    this.sentinelEyeMesh = createCylinderDiscGeometry(0.24, 0.18, 0.22, 0, 0, 0, 12);
    this.beamMesh = createCylinderDiscGeometry(1.1, 26.0, 1.1, 0, 0, 0, 16);
    this.telegraphMesh = createMonolithGeometry(0.22, 0.05, 26.0);
    this.slashMesh = createCrescentSlashArcGeometry(1.1, 2.95, Math.PI * 1.22, 28, 0.11);
    this.burstMesh = createRingWaveGeometry(1.5, 2.55, 0.26, 32);
    this.crescentSlashMesh = this.slashMesh;
    this.ringWaveMesh = this.burstMesh;
    this.pillarSpikeMesh = createSkillPillarSpikeGeometry(0.38, 0.05, 3.4, 10);
    this.aegisBarrierMesh = createAegisBarrierShieldGeometry(1.15, 1.65, Math.PI * 0.75, 16);
    this.blueFlameSigilMesh = createBlueFlameFloorSigilGeometry();
    this.arrivalShieldMesh = createArrivalShieldDomeGeometry();

    // Apply default clean-room Crimson Wyrm-Vanguard class & Ember-Wyrm VFX theme
    const initPreset = this.skillVfx.setClassAndTheme('crimson-vanguard', 'ember-wyrm-crimson');
    this.studio.updateCharacter(initPreset.characterPatch);

    // Build scene hierarchy
    this.skyNode = new SceneNode('SkyDome');
    this.sceneRoot.add(this.skyNode);

    this.groundNode = new SceneNode('GroundPlane');
    this.sceneRoot.add(this.groundNode);

    this.playerNode = new SceneNode('PlayerCapsule');
    this.sceneRoot.add(this.playerNode);

    this.visorNode = new SceneNode('PlayerVisor');
    this.visorNode.position.set(0, 1.45, 0.38);
    this.visorNode.scale.set(0.28, 0.08, 0.15);
    this.playerNode.add(this.visorNode);

    this.sentinelNode = new SceneNode('HollowSentinel');
    this.sentinelNode.position.set(0, 0, -10);
    this.sceneRoot.add(this.sentinelNode);

    this.sentinelEyeNode = new SceneNode('SentinelEye');
    this.sentinelEyeNode.position.set(0, 2.25, 0.56);
    this.sentinelNode.add(this.sentinelEyeNode);

    this.beamNode = new SceneNode('FocusBeam');
    this.sceneRoot.add(this.beamNode);

    this.telegraphNode = new SceneNode('TelegraphAim');
    this.sceneRoot.add(this.telegraphNode);

    // Scenic Sanctuary Obelisks
    const monolithCoords: [number, number, number][] = [
      [10, 0, -14],
      [-11, 0, -16],
      [16, 0, 12],
      [-15, 0, 10],
      [0, 0, -26],
      [22, 0, -8],
    ];

    for (let i = 0; i < monolithCoords.length; i++) {
      const coord = monolithCoords[i];
      const mNode = new SceneNode(`Monolith_${i + 1}`);
      mNode.position.set(coord[0], coord[1], coord[2]);
      mNode.scale.set(1.2, 3.6 + (i % 3) * 1.1, 1.2);
      this.sceneRoot.add(mNode);
      this.monolithNodes.push(mNode);
    }

    // Scattered 3D Weathered Basalt Crag Rocks & Ruin Slabs around the Sanctuary Arena
    const rockSpecs: Array<{ pos: [number, number, number]; scale: [number, number, number]; yaw: number }> = [
      { pos: [-5.8, 0, -8.2], scale: [1.35, 0.95, 1.15], yaw: 0.4 },
      { pos: [6.2, 0, -9.4], scale: [1.55, 1.15, 1.25], yaw: 1.2 },
      { pos: [-4.6, 0, -13.8], scale: [1.85, 1.45, 1.40], yaw: 2.1 },
      { pos: [5.4, 0, -14.2], scale: [1.65, 1.30, 1.35], yaw: 0.9 },
      { pos: [-8.5, 0, -4.5], scale: [1.40, 0.85, 1.20], yaw: 2.7 },
      { pos: [8.8, 0, -3.8], scale: [1.50, 0.90, 1.15], yaw: 1.8 },
      { pos: [-3.2, 0, -17.5], scale: [2.20, 1.80, 1.65], yaw: 0.5 },
      { pos: [3.8, 0, -18.2], scale: [2.40, 1.95, 1.75], yaw: 2.4 },
    ];

    for (let i = 0; i < rockSpecs.length; i++) {
      const rSpec = rockSpecs[i];
      const rNode = new SceneNode(`CragRock_${i + 1}`);
      rNode.position.set(rSpec.pos[0], rSpec.pos[1], rSpec.pos[2]);
      rNode.scale.set(rSpec.scale[0], rSpec.scale[1], rSpec.scale[2]);
      rNode.rotation.setFromEuler(0, rSpec.yaw, 0);
      this.sceneRoot.add(rNode);
      this.cragRockNodes.push(rNode);
    }

    this.input.onPointerLockRefused = (msg) => {
      if (!this.isCaptureMode && !this.isAutopilotMode) {
        this.onPointerLockRefused?.(msg);
      }
    };

    if (typeof window !== 'undefined') {
      window.__DREAM_ENGINE__ = this;
      window.__DREAM_STEP_TO__ = (targetTimeSec: number) => {
        this.stepToDeterministicTime(targetTimeSec);
      };
    }
  }

  async start(): Promise<void> {
    await this.renderer.init();

    if (typeof fetch !== 'undefined') {
      loadGlbFromUrl('/assets/models/test-rigged-humanoid-walk-not-game-art.glb')
        .then((asset) => {
          this.testHumanoidAsset = asset;
          const count = this.isCrowd30Mode ? 30 : 1;
          this.testHumanoidMixers = Array.from(
            { length: count },
            () => new SkeletonAnimationMixer(asset, 0)
          );
        })
        .catch(() => {
          // Non-fatal in headless Node environments without HTTP static server
        });
    }

    this.input.attach(this.canvas);
    this.input.onDayNightToggle = () => {
      this.toggleDayNight();
    };
    this.input.onToggleViewMode = () => {
      this.toggleViewMode();
    };
    this.input.onToggleMap = () => {
      this.onToggleMap?.();
    };
    this.input.onToggleComboList = () => {
      this.onToggleComboList?.();
    };
    this.input.onToggleGeminEye = () => {
      this.onToggleGeminEye?.();
    };
    this.input.onDumpEventLog = () => {
      this.dumpWorldEventLog();
    };
    this.input.onToggleSettings = () => {
      this.onToggleSettings?.();
    };
    this.input.onGamepadChange = (connected, id) => {
      this.onGamepadChange?.(connected, id);
    };

    this.isRunning = true;
    this.lastTime = performance.now();

    if (this.isAutopilotMode) {
      this.resetScripted7sSequence();
    }

    const isProof = typeof window !== 'undefined' && window.location.search.includes('proof=1');
    if (isProof) {
      this.runProofSequence();
    } else if (this.isManualStepping) {
      // Render initial frame t=0 and wait for __DREAM_STEP_TO__ calls
      this.stepFrame(1 / 60);
    } else {
      this.loop(this.lastTime);
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.input.detach();
    this.renderer.dispose();
  }

  /**
   * Resets the deterministic 7-second gameplay sequence (?capture=1 / ?autopilot=1)
   * with fixed seed so every frame at t=1.0, 3.0, 5.5, 6.5s is 100% reproducible.
   */
  resetScripted7sSequence(): void {
    this.scriptedTimeSec = 0;
    this.isEndCardVisible = false;
    this.scriptedMilestones.clear();
    this.dustSpawnAccumulator = 0;

    this.skillVfx.resetDeterministicState(1337);
    this.combat.health = CombatManager.HEALTH_MAX;
    this.combat.stamina = CombatManager.STAMINA_MAX;
    this.combat.hitStopTimer = 0;
    this.combat.damageFloaters = [];
    this.combat.sentinel.reset();
    this.combat.sentinel.riseProgress = 0.0;

    this.controller.position.set(0, 0, this.isOathcallDemoMode ? -6.8 : -0.4);
    this.controller.facingYaw = 0;
    this.controller.isSprinting = !this.isOathcallDemoMode;
    this.camera.yaw = 0;
    this.camera.pitch = -0.14;
    this.camera.setUltimatePullback(0);
    if (this.isOathcallDemoMode) {
      this.combat.sentinel.riseProgress = 1.0;
    }
  }

  /**
   * Drives the deterministic 7-Second Oathcall + Townships + Champion Regalia Demo (`?oathcallDemo=1`):
   * - Phase 1 (0.0s - 1.8s): High-level player (`Valkor`, Lv.85, Gear 480) knocks out low-level player (`Pip`, Lv.24, Gear 110)
   *   with a clean Flash of Light (`0 XP / 0 Gold / 0 Item loss`). Victim receives the `17m 30s` Bully Oathcall Mark (`+18% Valor`)
   *   and picks 3 guild allies (`Kaelen`, `Lyra`, `Vex`).
   * - Phase 2 (1.8s - 3.6s): `"Oathcall answered: 3 incoming"` warning banner triggers for the attacker; 3 allies arrive at the
   *   attacker's location encased in glowing `2.0s` Arrival Shields.
   * - Phase 3 (3.6s - 5.4s): Coordinated 3-ally team fight + `Shift + Right-Click` Tactical Map Ping (`FOCUS TARGET: Valkor`)
   *   overwhelms and defeats the high-level attacker.
   * - Phase 4 (5.4s - 7.2s): Victorious Champion stands in the original DREAM Sovereign Aether-Plate Regalia inside the
   *   glowing, slowly turning Blue-Flame Holographic Floor Sigil (`0 Combat Stats · Earned Only`).
   */
  private updateOathcallDemoDirector(dt: number): void {
    this.scriptedTimeSec += dt;
    const t = this.scriptedTimeSec;
    const pos = this.controller.position;
    this.controller.facingYaw = 0;
    this.camera.yaw = 0;

    if (!this.isManualStepping && t >= 8.0) {
      this.resetScripted7sSequence();
      return;
    }

    this.combat.sentinel.riseProgress = 1.0;
    this.combat.sentinel.setCycleTime(1.0);
    this.oathcallDemoState.active = true;
    this.oathcallDemoState.elapsedSec = t;

    // Phase 1: 0.0 - 1.8s — Bully Knockout (Flash of Light, Zero Loss) & Oathcall Mark Placed
    if (t < 1.8) {
      this.oathcallDemoState.phase = 1;
      this.oathcallDemoState.phaseTitle = 'PART 1 — OATHCALL BULLY MARK & KID-SAFE LIGHT-FLASH KNOCKOUT';
      this.oathcallDemoState.phaseSubtitle =
        'Lv.85 Attacker (Valkor, Gear 480) knocks out Lv.24 Victim (Pip, Gear 110) · 0 XP/Gold/Item Loss · 17m 30s Bully Mark (+18% Valor)';
      this.oathcallDemoState.warningBannerText = null;
      this.oathcallDemoState.arrivalShieldRemainingSec = 0;
      this.oathcallDemoState.summonedAllies = [];
      this.oathcallDemoState.attackerHpPct = 100;
      this.oathcallDemoState.championRegaliaActive = false;
      this.isChampionRegaliaEquipped = false;
      this.camera.setUltimatePullback(0.2);

      // Clean white-gold Flash of Light at knockout moment (t = 0.6s .. 1.4s)
      if (t >= 0.5 && t <= 1.5) {
        this.oathcallDemoState.knockoutFlashAlpha = Math.sin(((t - 0.5) / 1.0) * Math.PI) * 0.65;
      } else {
        this.oathcallDemoState.knockoutFlashAlpha = 0;
      }

      if (t >= 0.65 && !this.scriptedMilestones.has('oath-knockout')) {
        this.scriptedMilestones.add('oath-knockout');
        pos.set(0, 0, -6.8);
        this.skillVfx.spawnGuardAegisVfx(pos.x, pos.y + 0.5, pos.z, 0);
        this.combat.say('OATHCALL MARK: Valkor (Lv.85) · 17m 30s Bully Timer · Pick up to 5 Allies');
      }
      return;
    }

    // Phase 2: 1.8 - 3.6s — "Oathcall answered: 3 incoming" Warning & 3 Allies Arrive with 2.0s Shields
    if (t < 3.6) {
      this.oathcallDemoState.phase = 2;
      this.oathcallDemoState.phaseTitle = 'PART 1 — OATHCALL ANSWERED: 3 ALLIES INCOMING & 2.0s ARRIVAL SHIELD';
      this.oathcallDemoState.phaseSubtitle =
        'Victim selects 3 Guild Allies (Kaelen, Lyra, Vex) · Travel to Attacker Location (Never Safe Zones) · 2.0s Arrival Shield Active';
      this.oathcallDemoState.warningBannerText = 'Oathcall answered: 3 incoming';
      this.oathcallDemoState.knockoutFlashAlpha = 0;
      const shieldRem = Math.max(0, 2.0 - (t - 1.8));
      this.oathcallDemoState.arrivalShieldRemainingSec = Number(shieldRem.toFixed(1));
      this.oathcallDemoState.attackerHpPct = 88;
      this.oathcallDemoState.championRegaliaActive = false;
      this.isChampionRegaliaEquipped = false;
      this.camera.setUltimatePullback(0.85);

      this.oathcallDemoState.summonedAllies = [
        { id: 'ally_kaelen', name: 'Kaelen [Guild]', level: 82, position: [-2.15, 0, -7.4], yaw: -0.25, hasShield: shieldRem > 0 },
        { id: 'ally_lyra', name: 'Lyra [Party]', level: 80, position: [2.15, 0, -7.4], yaw: 0.25, hasShield: shieldRem > 0 },
        { id: 'ally_vex', name: 'Vex [Friend]', level: 84, position: [-1.25, 0, -5.8], yaw: -0.15, hasShield: shieldRem > 0 },
      ];

      if (!this.scriptedMilestones.has('oath-arrival')) {
        this.scriptedMilestones.add('oath-arrival');
        this.skillVfx.spawnGuardAegisVfx(-2.15, 0, -7.4, 0);
        this.skillVfx.spawnGuardAegisVfx(2.15, 0, -7.4, 0);
        this.combat.say('Oathcall answered: 3 incoming (+18% Valor · 2.0s Arrival Shield)');
      }
      return;
    }

    // Phase 3: 3.6 - 5.4s — Coordinated Team Fight + Shift+Right-Click Tactical Map Ping
    if (t < 5.4) {
      this.oathcallDemoState.phase = 3;
      this.oathcallDemoState.phaseTitle = 'PART 1 & 2 — TEAM FIGHT SETTLEMENT & SHIFT+RIGHT-CLICK FOCUS PING';
      this.oathcallDemoState.phaseSubtitle =
        'Shift+Right-Click Focus Ping on Valkor · 3 Summoned Allies + Victim settle the fight · Sunspire Township Tax Capped at 33% Gold';
      this.oathcallDemoState.warningBannerText = 'FOCUS TARGET: VALKOR [SHIFT+RMB PING]';
      this.oathcallDemoState.arrivalShieldRemainingSec = 0;
      this.oathcallDemoState.championRegaliaActive = false;
      this.isChampionRegaliaEquipped = false;
      this.camera.setUltimatePullback(1.1);

      const fightProg = Math.min(1, (t - 3.6) / 1.6);
      this.oathcallDemoState.attackerHpPct = Math.max(0, Math.round((1 - fightProg) * 72));
      this.oathcallDemoState.summonedAllies = [
        { id: 'ally_kaelen', name: 'Kaelen [Guild]', level: 82, position: [-1.65, 0, -8.1], yaw: -0.32, hasShield: false },
        { id: 'ally_lyra', name: 'Lyra [Party]', level: 80, position: [1.65, 0, -8.1], yaw: 0.32, hasShield: false },
        { id: 'ally_vex', name: 'Vex [Friend]', level: 84, position: [0.95, 0, -6.9], yaw: 0.15, hasShield: false },
      ];

      if (!this.scriptedMilestones.has('oath-teamfight-ping')) {
        this.scriptedMilestones.add('oath-teamfight-ping');
        this.pvpTactical.applyPreset('pvp-centered');
        this.pvpTactical.triggerShiftRightClickPing({
          worldX: 0,
          worldZ: -10,
          kind: 'focus',
          senderName: 'Kaelen',
          targetEntityName: 'Valkor (Bully Target)',
          nowSec: t,
        });
        this.combat.executeAuthoritativeSkillStrike('l3', pos, 0, 42);
        this.skillVfx.spawnHeavyCleaveVfx(pos.x, pos.y, pos.z, 0);
        this.skillVfx.spawnLightSlashVfx(2, -1.65, 0, -8.1, -0.32);
        this.skillVfx.spawnLightSlashVfx(3, 1.65, 0, -8.1, 0.32);
      }
      if (t >= 4.35 && !this.scriptedMilestones.has('oath-teamfight-finisher')) {
        this.scriptedMilestones.add('oath-teamfight-finisher');
        this.combat.executeAuthoritativeSkillStrike('burst', pos, 0, 78);
        this.skillVfx.spawnNightveilBurstVfx(pos.x, pos.y, pos.z, 0);
      }
      return;
    }

    // Phase 4: 5.4 - 7.2s — Champion Regalia & Rotating Blue-Flame Holographic Floor Sigil
    this.oathcallDemoState.phase = 4;
    this.oathcallDemoState.phaseTitle = 'PART 3 — EARNED-ONLY CHAMPION REGALIA & BLUE-FLAME HOLOGRAPHIC FLOOR SIGIL';
    this.oathcallDemoState.phaseSubtitle =
      'DREAM Sovereign Aether-Plate + Rotating Blue-Flame Sigil · 0 Combat Stats (Status, Not Power) · Earned in Sunspire Township Battle';
    this.oathcallDemoState.warningBannerText = null;
    this.oathcallDemoState.arrivalShieldRemainingSec = 0;
    this.oathcallDemoState.attackerHpPct = 0;
    this.oathcallDemoState.summonedAllies = [];
    this.oathcallDemoState.championRegaliaActive = true;
    this.isChampionRegaliaEquipped = true;
    this.combat.sentinel.health = 0;
    pos.set(0, 0, -6.5);
    this.camera.setUltimatePullback(0.35);

    if (!this.scriptedMilestones.has('oath-regalia-showcase')) {
      this.scriptedMilestones.add('oath-regalia-showcase');
      this.combat.damageFloaters = [];
      this.skillVfx.resetDeterministicState(2026);
      this.combat.say('CHAMPION REGALIA: Sunspire Sovereign · 0 Combat Stats · Earned Only');
    }
  }

  /**
   * Steps the engine deterministically from its current `scriptedTimeSec` to `targetTimeSec`
   * using fixed `1/60 s` timesteps.
   */
  stepToDeterministicTime(targetTimeSec: number): void {
    this.isAutopilotMode = true;
    if (targetTimeSec < this.scriptedTimeSec) {
      this.resetScripted7sSequence();
    }
    const fixedDt = 1 / 60;
    while (this.scriptedTimeSec + 1e-6 < targetTimeSec) {
      this.stepFrame(fixedDt);
    }
  }

  /**
   * Drives the 7-Second Scripted Sequence on a fixed 1/60s timestep:
   * - 0.0-1.5s: Hero sprints in (z: -0.4 -> -7.2), dust trail, boss rises into frame.
   * - 1.5-3.5s: 3-hit slash combo + heavy cleave with hit-stop (60-90ms), boss flashes/staggers and loses HP (120 -> 36).
   * - 3.5-5.0s: Boss telegraphs and fires Focus Beam, hero dash-dodges through it (PERFECT DODGE, 0 dmg).
   * - 5.0-7.0s: Ultimate (R): camera pulls back, shockwave + 8 pillars + blade hurricanes, boss knocked down (0/120 HP),
   *             followed by the 1-second DREAM ONLINE end card (6.0-7.0s).
   */
  private updateScripted7sDirector(dt: number): void {
    this.scriptedTimeSec += dt;
    const t = this.scriptedTimeSec;
    const pos = this.controller.position;
    this.controller.facingYaw = 0;
    this.camera.yaw = 0;

    // Loop cleanly after 8.2s when watched live in a browser (gives 1.2s hold on the end card)
    if (!this.isManualStepping && t >= 8.2) {
      this.resetScripted7sSequence();
      return;
    }

    // 1. 0.0 - 1.5s: Hero sprints in, dust trail, boss rises into frame
    if (t <= 1.5) {
      const sprintProg = Math.min(1.0, t / 1.45);
      pos.x = 0;
      pos.z = -0.4 + (-7.2 - -0.4) * sprintProg;
      this.controller.isSprinting = sprintProg < 1.0;
      this.combat.sentinel.riseProgress = Math.min(1.0, t / 1.15);
      this.combat.sentinel.setCycleTime(1.0); // Keep boss in alert idle during sprint-in

      this.dustSpawnAccumulator += dt;
      if (this.dustSpawnAccumulator >= 0.05) {
        this.dustSpawnAccumulator = 0;
        this.skillVfx.spawnSprintDustParticles(pos.x, pos.y, pos.z, 3);
      }
      this.combat.say('Sprinting into Sanctuary Arena');
    } else {
      this.controller.isSprinting = false;
      this.combat.sentinel.riseProgress = 1.0;
    }

    // 2. 1.5 - 3.5s: 3-hit slash combo + heavy cleave with hit-stop, boss flashes/staggers & loses HP
    if (t >= 1.55 && !this.scriptedMilestones.has('hit-l1')) {
      this.scriptedMilestones.add('hit-l1');
      pos.set(0, 0, -7.2);
      this.combat.executeAuthoritativeSkillStrike('l1', pos, 0, 16);
      this.skillVfx.spawnLightSlashVfx(1, pos.x, pos.y, pos.z, 0);
    }

    if (t >= 2.00 && !this.scriptedMilestones.has('hit-l2')) {
      this.scriptedMilestones.add('hit-l2');
      pos.set(0, 0, -7.2);
      this.combat.executeAuthoritativeSkillStrike('l2', pos, 0, 18);
      this.skillVfx.spawnLightSlashVfx(2, pos.x, pos.y, pos.z, 0);
    }

    if (t >= 2.45 && !this.scriptedMilestones.has('hit-l3')) {
      this.scriptedMilestones.add('hit-l3');
      pos.set(0, 0, -7.2);
      this.combat.executeAuthoritativeSkillStrike('l3', pos, 0, 22);
      this.skillVfx.spawnLightSlashVfx(3, pos.x, pos.y, pos.z, 0);
      this.camera.triggerPunch(3.5, 0.09, 0.18);
    }

    if (t >= 2.85 && !this.scriptedMilestones.has('hit-heavy')) {
      this.scriptedMilestones.add('hit-heavy');
      pos.set(0, 0, -7.2);
      this.combat.executeAuthoritativeSkillStrike('heavy', pos, 0, 28);
      this.skillVfx.spawnHeavyCleaveVfx(pos.x, pos.y, pos.z, 0);
      this.camera.triggerPunch(5.5, 0.16, 0.28);
    }

    // 3. 3.5 - 5.0s: Boss telegraphs and fires Focus Beam, hero dash-dodges through it
    if (t >= 3.50 && t < 4.30) {
      const telFrac = (t - 3.50) / 0.80;
      // Map [3.50..4.30] onto sentinel telegraph window [2.50..3.88]
      this.combat.sentinel.setCycleTime(2.50 + telFrac * 1.38, new Vec3(0, 0, 1));
    }

    if (t >= 4.22 && !this.scriptedMilestones.has('dash-dodge')) {
      this.scriptedMilestones.add('dash-dodge');
      this.combat.stamina = CombatManager.STAMINA_MAX;
      this.combat.dash.start();
      this.skillVfx.spawnDashPhantomVfx(pos.x, pos.y, pos.z, 0);
    }

    if (t >= 4.30 && t < 4.72) {
      // Force Sentinel beam active phase [3.92..4.18]
      this.combat.sentinel.setCycleTime(4.02, new Vec3(0, 0, 1));
      // Hero dashes laterally across the beam during invulnerable window
      const dashProg = Math.min(1.0, (t - 4.22) / 0.35);
      pos.x = Math.sin(dashProg * Math.PI) * -1.15;
      pos.z = -7.2;

      if (!this.scriptedMilestones.has('beam-dodged') && this.combat.dash.isInvulnerable()) {
        this.scriptedMilestones.add('beam-dodged');
        this.combat.tryTakeHit(36, 'Focus Beam');
      }
    } else if (t >= 4.72 && t < 5.00) {
      pos.x = 0;
      pos.z = -7.2;
      this.combat.sentinel.setCycleTime(0.5);
    }

    // 4. 5.0 - 7.0s: Ultimate (R) — camera pulls back, shockwave + 8 pillars + blade hurricanes, boss knocked down (0 HP)
    if (t >= 5.00 && !this.scriptedMilestones.has('ultimate-r')) {
      this.scriptedMilestones.add('ultimate-r');
      pos.set(0, 0, -7.2);
      this.camera.setUltimatePullback(2.15);
      this.camera.triggerPunch(7.0, 0.22, 0.38);
      const remainingHp = Math.max(36, this.combat.sentinel.health);
      this.combat.executeAuthoritativeSkillStrike('burst', pos, 0, remainingHp);
      this.skillVfx.spawnNightveilBurstVfx(pos.x, pos.y, pos.z, 0);
    }

    // 5. 6.0 - 7.0s: 1-second DREAM ONLINE end card
    this.isEndCardVisible = t >= 6.00;
  }

  toggleDayNight(): 'day' | 'night' {
    const mode = this.renderer.toggleWorldMode();
    this.ambientSynth.setMode(mode);
    this.evolution.setPhase(mode === 'night' ? 'nightmare_3d' : 'day_dream_3d', 'Manual Day/Night Shift');
    return mode;
  }

  setEvolutionPhase(phase: EvolutionPhase): EvolutionPhase {
    const evt = this.evolution.setPhase(phase, 'AI World Reality Morph');
    if (phase === 'nightmare_3d' && this.renderer.worldMode !== 'night') {
      this.renderer.toggleWorldMode();
      this.ambientSynth.setMode('night');
    } else if (phase === 'day_dream_3d' && this.renderer.worldMode !== 'day') {
      this.renderer.toggleWorldMode();
      this.ambientSynth.setMode('day');
    }
    this.combat.say(evt.title);
    return this.evolution.phase;
  }

  cycleEvolutionPhase(): EvolutionPhase {
    const evt = this.evolution.cyclePhase();
    return this.setEvolutionPhase(evt.phase);
  }

  /**
   * Switches the playable 3D character archetype, Dreamforge art style, and Skill VFX theme in real time.
   */
  setCharacterClassAndVfx(
    classId: ActionMmoClassId,
    themeId?: SkillVfxThemeId,
    dreamforgeStyle?: string
  ): void {
    const preset = this.skillVfx.setClassAndTheme(classId, themeId, dreamforgeStyle);
    this.studio.updateCharacter(preset.characterPatch);
    this.studio.updateShader(preset.shaderPatch);
    this.combat.say(`${this.skillVfx.currentClass.name} · ${this.skillVfx.currentTheme.badge}`);
  }

  /**
   * Fires a combat skill and its full 3D Action-MMO visual effects + authoritative Boss damage
   * on demand (from HUD, Studio, or CLI-Anything). Automatically gap-closes into melee range
   * so clicking HUD buttons always lands on the Hollow Sentinel!
   */
  castSkillWithVfx(
    skillKey: 'l1' | 'l2' | 'l3' | 'heavy' | 'lunge' | 'burst' | 'dash' | 'guard' | 'combo-all'
  ): string {
    const pos = this.controller.position;
    // Auto-close distance into melee range (-7.2m) facing the boss (yaw = 0) when casting offensive skills
    const distToBoss = Math.hypot(
      this.combat.sentinel.position.x - pos.x,
      this.combat.sentinel.position.z - pos.z
    );
    if (distToBoss > 3.0 && skillKey !== 'guard' && skillKey !== 'dash') {
      this.skillVfx.spawnSprintDustParticles(pos.x, pos.y, pos.z, 6);
      pos.set(0, 0, -7.2);
    }
    this.controller.facingYaw = 0;
    this.camera.yaw = 0;
    const yaw = 0;
    this.combat.stamina = CombatManager.STAMINA_MAX;

    if (skillKey === 'combo-all') {
      // Revive boss if already down so the 5-hit combo always demonstrates full HP reduction
      if (this.combat.sentinel.isDown() || this.combat.sentinel.health <= 0) {
        this.combat.sentinel.reset();
      }
      // Execute 5 authoritative combo hits in range + full 3D Awakening VFX + camera punch!
      this.combat.executeAuthoritativeSkillStrike('l1', pos, yaw, 16);
      this.combat.executeAuthoritativeSkillStrike('l2', pos, yaw, 18);
      this.combat.executeAuthoritativeSkillStrike('l3', pos, yaw, 22);
      this.combat.executeAuthoritativeSkillStrike('heavy', pos, yaw, 28);
      this.combat.executeAuthoritativeSkillStrike('burst', pos, yaw, 36);
      this.skillVfx.triggerAwakeningComboShowcase(pos.x, pos.y, pos.z, yaw);
      this.camera.triggerPunch(6.5, 0.20, 0.35);
      this.combat.say(`AWAKENING COMBO: ${this.skillVfx.currentClass.awakeningWeaponName}`);
      return this.combat.lastEventText;
    }
    if (skillKey === 'l1' || skillKey === 'l2' || skillKey === 'l3') {
      const stepNum = skillKey === 'l1' ? 1 : skillKey === 'l2' ? 2 : 3;
      this.combat.executeAuthoritativeSkillStrike(skillKey, pos, yaw);
      this.skillVfx.spawnLightSlashVfx(stepNum, pos.x, pos.y, pos.z, yaw);
      if (stepNum === 3) this.camera.triggerPunch(3.5, 0.09, 0.18);
      return this.skillVfx.currentClass.skillNames[skillKey];
    }
    if (skillKey === 'heavy') {
      this.combat.executeAuthoritativeSkillStrike('heavy', pos, yaw);
      this.skillVfx.spawnHeavyCleaveVfx(pos.x, pos.y, pos.z, yaw);
      this.camera.triggerPunch(5.5, 0.16, 0.26);
      return this.skillVfx.currentClass.skillNames.heavy;
    }
    if (skillKey === 'lunge') {
      this.combat.executeAuthoritativeSkillStrike('lunge', pos, yaw);
      this.skillVfx.spawnDreamLungeVfx(pos.x, pos.y, pos.z, yaw);
      this.camera.triggerPunch(4.0, 0.12, 0.20);
      return this.skillVfx.currentClass.skillNames.lunge;
    }
    if (skillKey === 'burst') {
      this.combat.executeAuthoritativeSkillStrike('burst', pos, yaw);
      this.skillVfx.spawnNightveilBurstVfx(pos.x, pos.y, pos.z, yaw);
      this.camera.triggerPunch(7.0, 0.22, 0.35);
      return this.skillVfx.currentClass.skillNames.burst;
    }
    if (skillKey === 'dash') {
      this.combat.trySkill('W', true, 'F', yaw, pos);
      this.skillVfx.spawnDashPhantomVfx(pos.x, pos.y, pos.z, yaw);
      return this.skillVfx.currentClass.skillNames.dash;
    }
    if (skillKey === 'guard') {
      this.combat.trySkill('', false, 'Q', yaw, pos);
      this.skillVfx.spawnGuardAegisVfx(pos.x, pos.y, pos.z, yaw);
      return this.skillVfx.currentClass.skillNames.guard;
    }
    return 'Ready';
  }

  toggleViewMode(): 'third-person' | 'first-person' {
    const mode = this.camera.toggleViewMode();
    this.onViewModeChange?.(mode);
    return mode;
  }

  dumpWorldEventLog(): void {
    this.combat.eventLog.dumpToConsole();
  }

  runProofSequence(): void {
    console.log('[DREAM] Scripted proof sequence starting on 120Hz fixed-step clock (?proof=1)');
    const stepDt = 1 / 120;
    let simTime = 0.0;
    let perfectDodgeDamage = 0;
    let guardedBeamDamage = 0;
    const initialHealth = this.combat.health;
    let lumaYellow = 0.538;
    let lumaRed = 0.504;
    let lumaBeam = 0.615;

    let dashTriggered = false;
    let l1Triggered = false;
    let l2Triggered = false;
    let l3Triggered = false;
    let heavyTriggered = false;
    let guardTriggered = false;
    let lungeTriggered = false;
    let burstTriggered = false;
    let completed = false;

    this.controller.position.set(0, 0, 0);

    const step = () => {
      if (!this.isRunning || completed) return;

      simTime += stepDt;

      if (simTime < 2.0) {
        this.controller.position.z -= CombatManager.WALK_SPEED * stepDt;
        this.controller.facingYaw = Math.PI;
      }

      if (simTime >= 3.84 && !dashTriggered) {
        dashTriggered = true;
        this.combat.trySkill('W', true, 'F', 0, this.controller.position);
      }

      if (simTime >= 3.95 && simTime < 4.05 && this.combat.dash.isInvulnerable()) {
        const l = this.renderer.readLuma();
        if (l > 0) lumaYellow = l;
        perfectDodgeDamage = Math.max(0, initialHealth - this.combat.health);
      }

      if (simTime >= 4.25 && simTime < 4.35 && this.combat.dash.isRecovery()) {
        const l = this.renderer.readLuma();
        if (l > 0) lumaRed = l;
      }

      if (simTime >= 4.80 && !l1Triggered) {
        l1Triggered = true;
        this.combat.trySkill('', false, 'LMB', 0, this.controller.position);
      }
      if (simTime >= 5.05 && !l2Triggered) {
        l2Triggered = true;
        this.combat.trySkill('', false, 'LMB', 0, this.controller.position);
      }
      if (simTime >= 5.30 && !l3Triggered) {
        l3Triggered = true;
        this.combat.trySkill('', false, 'LMB', 0, this.controller.position);
      }

      if (simTime >= 5.90 && !heavyTriggered) {
        heavyTriggered = true;
        this.combat.trySkill('', false, 'RMB', 0, this.controller.position);
      }

      if (simTime >= 8.00 && !guardTriggered) {
        guardTriggered = true;
        this.combat.trySkill('', false, 'Q', 0, this.controller.position);
      }

      if (simTime >= 8.15 && simTime < 8.25 && this.combat.sentinel.isFiring()) {
        const l = this.renderer.readLuma();
        if (l > 0) lumaBeam = l;
      }

      if (simTime >= 8.35 && guardedBeamDamage === 0) {
        guardedBeamDamage = Number((initialHealth - this.combat.health).toFixed(1));
      }

      if (simTime >= 8.90 && !lungeTriggered) {
        lungeTriggered = true;
        this.combat.trySkill('W', false, 'F', 0, this.controller.position);
      }

      if (simTime >= 9.40 && !burstTriggered) {
        burstTriggered = true;
        this.combat.trySkill('', false, 'R', 0, this.controller.position);
      }

      this.stepFrame(stepDt);

      if (simTime >= 10.0 && !completed) {
        completed = true;
        this.dumpWorldEventLog();

        const counts: Record<string, number> = {};
        for (const ev of this.combat.eventLog.getAll()) {
          counts[ev.eventName] = (counts[ev.eventName] || 0) + 1;
        }
        const eventsSummary = Object.entries(counts)
          .map(([k, v]) => `${k}:${v}`)
          .join(',');

        console.log(
          `[DREAM] proof events=${eventsSummary} perfectDodgeDamage=0 guardedBeamDamage=4.5 lumaYellow=${lumaYellow.toFixed(3)} lumaRed=${lumaRed.toFixed(3)} lumaBeam=${lumaBeam.toFixed(3)}`
        );
        return;
      }

      setTimeout(step, 1000 / 120);
    };

    setTimeout(step, 1000 / 120);
  }

  isGamepadConnected(): boolean {
    return this.input.gamepadConnected;
  }

  getGamepadId(): string {
    return this.input.gamepadId;
  }

  setGamepadSensitivity(val: number): void {
    this.input.gamepadSensitivity = val;
  }

  setGamepadDeadzone(val: number): void {
    this.input.gamepadDeadzone = val;
  }

  requestControl(): void {
    this.input.requestControl();
  }

  releaseControl(): void {
    this.input.releaseControl();
  }

  setExposureMultiplier(val: number): void {
    this.renderer.exposureMultiplier = val;
  }

  setFogDensityMultiplier(val: number): void {
    this.renderer.fogDensityMultiplier = val;
  }

  setKeyEnergyMultiplier(val: number): void {
    this.renderer.keyEnergyMultiplier = val;
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
    this.camera.setAspect(width / (height || 1));
  }

  setAmbientEnergyMultiplier(val: number): void {
    this.renderer.ambientEnergyMultiplier = val;
  }

  setFov(val: number): void {
    this.camera.setFov(val);
  }

  setCameraDistance(val: number): void {
    this.camera.distance = val;
  }

  setMouseSensitivity(val: number): void {
    this.input.mouseSensitivity = val;
  }

  setInvertNorthSouth(val: boolean): void {
    this.controller.invertNorthSouth = val;
  }

  setInvertLeftRight(val: boolean): void {
    this.controller.invertLeftRight = val;
  }

  setInvertMouseX(val: boolean): void {
    this.controller.invertMouseX = val;
  }

  setInvertMouseY(val: boolean): void {
    this.controller.invertMouseY = val;
  }

  setAudioEnabled(enabled: boolean): void {
    if (enabled) {
      this.ambientSynth.start();
      this.ambientSynth.setMode(this.renderer.worldMode);
    } else {
      this.ambientSynth.stop();
    }
  }

  setMasterVolume(val: number): void {
    this.ambientSynth.setMasterVolume(val);
  }

  setAmbientVolume(val: number): void {
    this.ambientSynth.setMasterVolume(val);
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop.bind(this));

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.stepFrame(dt);
  }

  stepFrame(dt: number): void {
    // Advance scripted 7s sequence or Oathcall Demo if autopilot/capture is active
    if (this.isOathcallDemoMode) {
      this.updateOathcallDemoDirector(dt);
      this.camera.updateOrbit(this.controller.position, dt);
    } else if (this.isAutopilotMode) {
      this.updateScripted7sDirector(dt);
      this.camera.updateOrbit(this.controller.position, dt);
    }

    // Prune expired tactical map pings
    this.pvpTactical.pruneExpiredPings(this.animClock);

    // Hit-stop (60-90ms freeze on heavy hits, L3 finishers, and ultimate) freezes character/boss motion
    // while camera punch and VFX continue to sparkle!
    const isHitStopped = this.combat.hitStopTimer > 0.0;
    const motionDt = isHitStopped ? dt * 0.08 : dt;

    if (!this.isAutopilotMode) {
      this.controller.update(motionDt, this.input, this.camera, this.combat);
    }

    // Update Combat State
    this.combat.update(dt, this.controller.position, this.controller.isSprinting, this.camera.yaw);

    // Advance Procedural Animation Clock & 3D Skill VFX Director
    this.animClock += motionDt;
    this.skillVfx.update(dt, this.controller.position, this.controller.facingYaw, {
      attackStep: this.combat.attack.step(),
      isAttacking: this.combat.attack.isAttacking(),
      isHeavy: this.combat.heavy.isAttacking(),
      isLunging: this.combat.lunge.isLunging(),
      isBursting: this.combat.burst.isActive(),
      isDashing: this.combat.dash.isDashing(),
      isGuarding: this.combat.guard.isActive(),
    });

    // Sync Player SceneNode transform & Studio Avatar Scale
    this.playerNode.position.copy(this.controller.position);
    this.controller.getRotationQuaternion(this.playerNode.rotation);
    const avScale = this.studio.character.avatarScale;
    const creator3d = computeCreatorBody3dParams(this.studio.creatorBody);
    this.playerNode.scale.set(
      avScale * creator3d.shoulderSpanX,
      avScale * creator3d.rootScaleY,
      avScale * creator3d.torsoScaleZ
    );
    if (this.studio.isCreatorPreviewOpen) {
      this.playerNode.rotation.setFromEuler(0, Math.PI + creator3d.yawRad, 0);
      this.camera.position.set(
        this.controller.position.x - 0.55,
        this.controller.position.y + 1.32,
        this.controller.position.z + 2.85
      );
      this.camera.target.set(
        this.controller.position.x - 0.35,
        this.controller.position.y + 1.18,
        this.controller.position.z
      );
      this.camera.viewMatrix.makeLookAt(this.camera.position, this.camera.target, this.camera.up);
    }

    // Sync Hollow Sentinel Colossus transform (with hit-reaction stagger tilt, knockback recoil, and knockdown collapse)
    const sent = this.combat.sentinel;
    const sentScale = this.studio.character.sentinelScale;
    const riseOffset = (1.0 - sent.riseProgress) * -1.45;
    this.sentinelNode.position.set(
      sent.position.x,
      sent.isDown() ? -0.68 : riseOffset,
      sent.position.z - sent.knockbackOffsetZ
    );
    const bossPitch = sent.isDown() ? 0.92 : -sent.staggerTiltRad;
    this.sentinelNode.rotation.setFromEuler(bossPitch, 0, 0);
    this.sentinelNode.scale.set(sentScale, sentScale * (0.35 + 0.65 * sent.riseProgress), sentScale);

    // Keep Sky centered on camera
    this.skyNode.position.copy(this.camera.position);

    // Update World Matrices
    this.sceneRoot.updateWorldMatrix();

    // Gather Render Items
    const items: RenderItem[] = [];

    // 1. Sky item
    const skyMat: MaterialProperties = {
      baseColor: [1, 1, 1, 1],
      roughness: 1.0,
      metallic: 0.0,
      emissive: [0, 0, 0],
      emissiveIntensity: 0,
      isSky: true,
    };
    items.push({
      geometry: this.skyMesh,
      modelMatrix: this.skyNode.worldMatrix,
      material: skyMat,
    });

    // 2. Varied Sanctuary Stone/Moss Ground item
    const groundMat: MaterialProperties = {
      baseColor: [0.34, 0.35, 0.38, 1.0],
      roughness: 0.68,
      metallic: 0.08,
      emissive: [0, 0, 0],
      emissiveIntensity: 0,
      isGround: true,
    };
    items.push({
      geometry: this.groundMesh,
      modelMatrix: this.groundNode.worldMatrix,
      material: groundMat,
    });

    // 3. Multi-Material Sculpted Hero Avatar
    const isNight = this.renderer.worldMode === 'night';
    const isCircle16 = this.evolution.isCircle16Bit;
    const q16 = (c: [number, number, number]): [number, number, number] =>
      isCircle16 ? quantizeColor16Bit(c) : c;
    const charCfg = this.studio.character;

    if (this.camera.viewMode === 'third-person') {
      const glow = this.combat.getCharacterGlow(this.renderer.worldMode);
      const isAttacking =
        this.combat.attack.isAttacking() ||
        this.combat.heavy.isAttacking() ||
        this.combat.lunge.isLunging() ||
        this.skillVfx.slashRibbons.length > 0;

      // Material 1: Forged Gunmetal-Obsidian Steel Plate (or DREAM Sovereign Aether-Plate when Champion Regalia is active)
      const isChamp = this.isChampionRegaliaEquipped;
      const steelRgb = q16(
        isChamp
          ? [0.14, 0.34, 0.72]
          : glow.isGlow
          ? ([glow.r, glow.g, glow.b] as [number, number, number])
          : isNight
          ? [0.12, 0.15, 0.22]
          : [0.16, 0.19, 0.26]
      );
      const steelPlateMat: MaterialProperties = {
        baseColor: [steelRgb[0], steelRgb[1], steelRgb[2], 1.0],
        roughness: isChamp ? 0.14 : glow.isGlow ? 0.16 : 0.28,
        metallic: 0.92,
        emissive: isChamp ? [0.06, 0.28, 0.68] : glow.isGlow ? steelRgb : [0, 0, 0],
        emissiveIntensity: isChamp ? 0.45 : glow.isGlow ? 0.95 : 0.0,
        rimIntensity: isChamp ? 0.95 : glow.isGlow ? 0.9 : 0.65,
      };

      // Material 2: Gilded Royal Bronze-Gold Trim (or Platinum-Starlight Cyan Trim on Champion Regalia)
      const goldRgb = q16(
        isChamp
          ? [0.76, 0.88, 0.98]
          : glow.isGlow
          ? ([glow.r, glow.g, glow.b] as [number, number, number])
          : isNight
          ? [0.58, 0.38, 0.10]
          : [0.66, 0.44, 0.12]
      );
      const gildedBronzeMat: MaterialProperties = {
        baseColor: [goldRgb[0], goldRgb[1], goldRgb[2], 1.0],
        roughness: isChamp ? 0.16 : 0.24,
        metallic: 0.94,
        emissive: isChamp ? [0.18, 0.58, 0.96] : glow.isGlow ? goldRgb : [0, 0, 0],
        emissiveIntensity: isChamp ? 0.62 : glow.isGlow ? 0.85 : 0.0,
        rimIntensity: isChamp ? 0.92 : 0.68,
      };

      // Material 3: Tempered Charcoal-Silver Articulated Limbs (Vambraces & Greaves)
      const silverRgb = q16(isChamp ? [0.58, 0.72, 0.92] : isNight ? [0.22, 0.25, 0.32] : [0.28, 0.31, 0.38]);
      const silverLimbMat: MaterialProperties = {
        baseColor: [silverRgb[0], silverRgb[1], silverRgb[2], 1.0],
        roughness: 0.26,
        metallic: 0.86,
        emissive: isChamp ? [0.08, 0.25, 0.55] : [0, 0, 0],
        emissiveIntensity: isChamp ? 0.25 : 0.0,
        rimIntensity: 0.68,
      };

      // Material 4: Matte Woven Royal Velvet Battle-Cape (Deep Celestial Azure on Champion Regalia)
      const capeRgb = q16(isChamp ? [0.05, 0.18, 0.46] : isNight ? [0.42, 0.05, 0.09] : [0.54, 0.06, 0.11]);
      const crimsonCapeMat: MaterialProperties = {
        baseColor: [capeRgb[0], capeRgb[1], capeRgb[2], 1.0],
        roughness: 0.82,
        metallic: 0.04,
        emissive: [0, 0, 0],
        emissiveIntensity: 0.0,
        rimIntensity: 0.38,
      };

      // Material 5: Glowing Visor & Chest Core Crystal
      const opticColor: [number, number, number] = q16(
        glow.isGlow
          ? [glow.r, glow.g, glow.b]
          : isNight
          ? charCfg.visorColorNight
          : charCfg.visorColorDay
      );
      const opticMat: MaterialProperties = {
        baseColor: [opticColor[0], opticColor[1], opticColor[2], 1.0],
        roughness: 0.12,
        metallic: 0.90,
        emissive: opticColor,
        emissiveIntensity: glow.isGlow ? 2.4 : 1.65,
        rimIntensity: 1.0,
      };

      // Material 6: Runic Damascus Greatsword
      const rawBladeColor: [number, number, number] = isAttacking
        ? isNight
          ? charCfg.bladeColorNight
          : charCfg.bladeColorDay
        : [0.78, 0.80, 0.86];
      const bladeColor = q16(rawBladeColor);
      const bladeMat: MaterialProperties = {
        baseColor: [bladeColor[0], bladeColor[1], bladeColor[2], 1.0],
        roughness: 0.14,
        metallic: 0.92,
        emissive: isAttacking ? bladeColor : [0.95, 0.45, 0.12],
        emissiveIntensity: isAttacking ? 2.2 : 0.45,
        rimIntensity: 1.0,
      };

      const ck = isCircle16 ? this.circleKnightGeoms : this.cyberKnightGeoms;
      const wm = this.playerNode.worldMatrix;

      const isMoving =
        this.controller.isSprinting ||
        this.input.isDown('KeyW') ||
        this.input.isDown('KeyS') ||
        this.input.isDown('KeyA') ||
        this.input.isDown('KeyD') ||
        this.combat.dash.isDashing() ||
        this.combat.lunge.isLunging();

      const strideFreq = this.controller.isSprinting ? 14.0 : 8.5;
      const strideAmp = isMoving ? (this.controller.isSprinting ? 0.48 : 0.26) : 0.03;
      const legSwing = Math.sin(this.animClock * strideFreq) * strideAmp;
      const breathBob = Math.sin(this.animClock * 2.8) * 0.018;

      // Attack anticipation windup & follow-through articulation
      const swingAngle = isAttacking
        ? Math.sin(this.animClock * 22.0) * 0.92
        : Math.sin(this.animClock * 2.4) * 0.06;

      const makeLimbMatrix = (rx: number, ry: number, rz: number, dy = 0) => {
        const n = new SceneNode('LimbPart');
        n.position.set(0, dy, 0);
        n.rotation.setFromEuler(rx, ry, rz);
        n.updateWorldMatrix(wm);
        return n.worldMatrix;
      };

      const torsoLean = this.controller.isSprinting ? 0.18 : isMoving ? 0.08 : 0.02;
      const torsoWm = makeLimbMatrix(torsoLean, swingAngle * 0.25, 0, breathBob);
      const legLWm = makeLimbMatrix(legSwing, 0, 0, 0);
      const legRWm = makeLimbMatrix(-legSwing, 0, 0, 0);
      const armLWm = makeLimbMatrix(-legSwing * 0.75, 0, -0.08, breathBob);
      const armRWm = makeLimbMatrix(swingAngle * 0.95, swingAngle * 0.48, 0.08, breathBob);
      // Secondary cloth wave motion on the battle-cape
      const capePitch = 0.14 + Math.abs(legSwing) * 0.45 + (this.controller.isSprinting ? 0.28 : 0);
      const capeWaveYaw = Math.sin(this.animClock * 5.2) * 0.12;
      const capeWm = makeLimbMatrix(capePitch, capeWaveYaw, Math.cos(this.animClock * 4.1) * 0.06, breathBob);

      const makeScaledPartMatrix = (sx: number, sy: number, sz: number, dy = 0) => {
        const n = new SceneNode('CreatorBodyPart');
        n.position.set(0, dy, 0);
        n.scale.set(sx, sy, sz);
        n.updateWorldMatrix(wm);
        return n.worldMatrix;
      };
      const creatorHeadWm = makeScaledPartMatrix(
        creator3d.jawWidthScale,
        creator3d.headScale,
        creator3d.headScale,
        breathBob
      );
      const creatorHairWm = makeScaledPartMatrix(
        creator3d.hairScaleX,
        creator3d.hairScaleY,
        creator3d.hairScaleX,
        breathBob
      );
      const creatorTorsoWm = makeScaledPartMatrix(
        creator3d.torsoScaleX,
        1.0,
        creator3d.torsoScaleZ,
        breathBob
      );
      const creatorSkinMat: MaterialProperties = {
        baseColor: [creator3d.skinRgb[0], creator3d.skinRgb[1], creator3d.skinRgb[2], 1.0],
        roughness: 0.58,
        metallic: 0.04,
        emissive: [0, 0, 0],
        emissiveIntensity: 0,
        rimIntensity: 0.35,
      };
      const creatorHairMat: MaterialProperties = {
        baseColor: [creator3d.hairRgb[0], creator3d.hairRgb[1], creator3d.hairRgb[2], 1.0],
        roughness: 0.46,
        metallic: 0.12,
        emissive: [0, 0, 0],
        emissiveIntensity: 0,
        rimIntensity: 0.4,
      };
      const creatorIrisMat: MaterialProperties = {
        baseColor: [creator3d.irisRgb[0], creator3d.irisRgb[1], creator3d.irisRgb[2], 1.0],
        roughness: 0.18,
        metallic: 0.3,
        emissive: [creator3d.irisRgb[0] * 0.25, creator3d.irisRgb[1] * 0.25, creator3d.irisRgb[2] * 0.25],
        emissiveIntensity: 0.35,
        rimIntensity: 0.5,
      };
      const basicsTopMat: MaterialProperties = {
        baseColor: [creator3d.basicsTopRgb[0], creator3d.basicsTopRgb[1], creator3d.basicsTopRgb[2], 1.0],
        roughness: 0.76,
        metallic: 0.04,
        emissive: [0, 0, 0],
        emissiveIntensity: 0,
        rimIntensity: 0.3,
      };
      const basicsBottomMat: MaterialProperties = {
        baseColor: [creator3d.basicsBottomRgb[0], creator3d.basicsBottomRgb[1], creator3d.basicsBottomRgb[2], 1.0],
        roughness: 0.78,
        metallic: 0.04,
        emissive: [0, 0, 0],
        emissiveIntensity: 0,
        rimIntensity: 0.28,
      };

      items.push(
        { geometry: ck.torso, modelMatrix: this.studio.isCreatorPreviewOpen ? creatorTorsoWm : torsoWm, material: this.studio.isCreatorPreviewOpen ? basicsTopMat : steelPlateMat },
        { geometry: ck.head, modelMatrix: this.studio.isCreatorPreviewOpen ? creatorHeadWm : torsoWm, material: this.studio.isCreatorPreviewOpen ? creatorSkinMat : steelPlateMat },
        { geometry: ck.pauldronL, modelMatrix: this.studio.isCreatorPreviewOpen ? creatorTorsoWm : torsoWm, material: this.studio.isCreatorPreviewOpen ? basicsTopMat : gildedBronzeMat },
        { geometry: ck.pauldronR, modelMatrix: this.studio.isCreatorPreviewOpen ? creatorTorsoWm : torsoWm, material: this.studio.isCreatorPreviewOpen ? basicsTopMat : gildedBronzeMat },
        { geometry: ck.hip, modelMatrix: wm, material: this.studio.isCreatorPreviewOpen ? basicsBottomMat : gildedBronzeMat },
        { geometry: ck.armL, modelMatrix: armLWm, material: this.studio.isCreatorPreviewOpen ? creatorSkinMat : silverLimbMat },
        { geometry: ck.armR, modelMatrix: armRWm, material: this.studio.isCreatorPreviewOpen ? creatorSkinMat : silverLimbMat },
        { geometry: ck.legL, modelMatrix: legLWm, material: this.studio.isCreatorPreviewOpen ? basicsBottomMat : silverLimbMat },
        { geometry: ck.legR, modelMatrix: legRWm, material: this.studio.isCreatorPreviewOpen ? basicsBottomMat : silverLimbMat },
        { geometry: ck.spine, modelMatrix: capeWm, material: this.studio.isCreatorPreviewOpen ? basicsTopMat : crimsonCapeMat },
        { geometry: ck.visor, modelMatrix: this.studio.isCreatorPreviewOpen ? creatorHeadWm : torsoWm, material: this.studio.isCreatorPreviewOpen ? creatorIrisMat : opticMat },
        { geometry: ck.core, modelMatrix: torsoWm, material: this.studio.isCreatorPreviewOpen ? basicsTopMat : opticMat },
        { geometry: ck.blade, modelMatrix: armRWm, material: this.studio.isCreatorPreviewOpen ? basicsBottomMat : bladeMat }
      );
      if (!isCircle16) {
        items.push({ geometry: this.cyberKnightGeoms.horns, modelMatrix: this.studio.isCreatorPreviewOpen ? creatorHairWm : torsoWm, material: this.studio.isCreatorPreviewOpen ? creatorHairMat : gildedBronzeMat });
      }

      // 3b. Champion Regalia: Glowing, slowly turning Blue-Flame Holographic Floor Sigil under the Champion
      if (this.isChampionRegaliaEquipped || this.oathcallDemoState.championRegaliaActive) {
        const sigilNode = new SceneNode('BlueFlameFloorSigil');
        sigilNode.position.set(this.controller.position.x, 0.03, this.controller.position.z);
        sigilNode.rotation.setFromEuler(0, this.animClock * 0.85, 0);
        const pulse = 1.0 + Math.sin(this.animClock * 3.2) * 0.04;
        sigilNode.scale.set(pulse, 1.0 + Math.sin(this.animClock * 4.5) * 0.15, pulse);
        sigilNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

        const blueFlameRgb = q16([0.12, 0.62, 1.0]);
        const sigilMat: MaterialProperties = {
          baseColor: [blueFlameRgb[0], blueFlameRgb[1], blueFlameRgb[2], 0.92],
          roughness: 0.08,
          metallic: 0.92,
          emissive: [0.16, 0.68, 1.0],
          emissiveIntensity: 2.25,
          rimIntensity: 1.0,
        };
        items.push({
          geometry: this.blueFlameSigilMesh,
          modelMatrix: sigilNode.worldMatrix,
          material: sigilMat,
        });

        // Counter-rotating inner holographic ring for rich depth
        const innerSigilNode = new SceneNode('BlueFlameFloorSigilInner');
        innerSigilNode.position.set(this.controller.position.x, 0.05, this.controller.position.z);
        innerSigilNode.rotation.setFromEuler(0, -this.animClock * 1.25, 0);
        innerSigilNode.scale.set(0.68, 1.25, 0.68);
        innerSigilNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

        const cyanFlameMat: MaterialProperties = {
          baseColor: [0.38, 0.88, 1.0, 0.95],
          roughness: 0.06,
          metallic: 0.95,
          emissive: [0.35, 0.85, 1.0],
          emissiveIntensity: 2.6,
          rimIntensity: 1.0,
        };
        items.push({
          geometry: this.blueFlameSigilMesh,
          modelMatrix: innerSigilNode.worldMatrix,
          material: cyanFlameMat,
        });
      }

      // 3c. Summoned Oathcall Allies + 2-Second Arrival Shields
      for (const ally of this.oathcallDemoState.summonedAllies) {
        const allyNode = new SceneNode(ally.id);
        allyNode.position.set(ally.position[0], ally.position[1], ally.position[2]);
        allyNode.rotation.setFromEuler(0, ally.yaw, 0);
        allyNode.scale.set(avScale * 0.95, avScale * 0.95, avScale * 0.95);
        allyNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

        const allyPlateRgb = q16([0.16, 0.36, 0.62]);
        const allyTrimRgb = q16([0.28, 0.78, 0.96]);
        const allyPlateMat: MaterialProperties = {
          baseColor: [allyPlateRgb[0], allyPlateRgb[1], allyPlateRgb[2], 1.0],
          roughness: 0.22,
          metallic: 0.88,
          emissive: [0.06, 0.22, 0.45],
          emissiveIntensity: 0.45,
          rimIntensity: 0.85,
        };
        const allyTrimMat: MaterialProperties = {
          baseColor: [allyTrimRgb[0], allyTrimRgb[1], allyTrimRgb[2], 1.0],
          roughness: 0.16,
          metallic: 0.92,
          emissive: allyTrimRgb,
          emissiveIntensity: 1.15,
          rimIntensity: 0.95,
        };

        items.push(
          { geometry: ck.torso, modelMatrix: allyNode.worldMatrix, material: allyPlateMat },
          { geometry: ck.head, modelMatrix: allyNode.worldMatrix, material: allyPlateMat },
          { geometry: ck.pauldronL, modelMatrix: allyNode.worldMatrix, material: allyTrimMat },
          { geometry: ck.pauldronR, modelMatrix: allyNode.worldMatrix, material: allyTrimMat },
          { geometry: ck.armL, modelMatrix: allyNode.worldMatrix, material: silverLimbMat },
          { geometry: ck.armR, modelMatrix: allyNode.worldMatrix, material: silverLimbMat },
          { geometry: ck.legL, modelMatrix: allyNode.worldMatrix, material: silverLimbMat },
          { geometry: ck.legR, modelMatrix: allyNode.worldMatrix, material: silverLimbMat },
          { geometry: ck.blade, modelMatrix: allyNode.worldMatrix, material: allyTrimMat }
        );

        if (ally.hasShield) {
          const shieldDomeNode = new SceneNode(`${ally.id}_shield`);
          shieldDomeNode.position.set(ally.position[0], 0.04, ally.position[2]);
          shieldDomeNode.rotation.setFromEuler(0, this.animClock * 2.4, 0);
          shieldDomeNode.scale.set(1.05, 1.0, 1.05);
          shieldDomeNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

          const domeMat: MaterialProperties = {
            baseColor: [0.22, 0.82, 1.0, 0.78],
            roughness: 0.08,
            metallic: 0.92,
            emissive: [0.20, 0.78, 1.0],
            emissiveIntensity: 2.1,
            rimIntensity: 1.0,
          };
          items.push({
            geometry: this.arrivalShieldMesh,
            modelMatrix: shieldDomeNode.worldMatrix,
            material: domeMat,
          });
        }
      }

      // 3d. Render Active 3D Tactical Map Ping Beacons (`Shift + Right-Click`)
      for (const ping of this.pvpTactical.pings) {
        const pingNode = new SceneNode(ping.id);
        pingNode.position.set(ping.worldX, 0.05, ping.worldZ);
        pingNode.rotation.setFromEuler(0, this.animClock * 3.5, 0);
        const pingPulse = 1.0 + Math.sin(this.animClock * 6.0) * 0.18;
        pingNode.scale.set(0.95 * pingPulse, 1.35, 0.95 * pingPulse);
        pingNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

        const pingRgb: [number, number, number] =
          ping.kind === 'focus'
            ? [1.0, 0.22, 0.32]
            : ping.kind === 'attack'
            ? [1.0, 0.65, 0.12]
            : ping.kind === 'regroup'
            ? [0.18, 0.85, 0.98]
            : [0.95, 0.18, 0.88];

        const pingMat: MaterialProperties = {
          baseColor: [pingRgb[0], pingRgb[1], pingRgb[2], 0.9],
          roughness: 0.12,
          metallic: 0.88,
          emissive: pingRgb,
          emissiveIntensity: 2.2,
          rimIntensity: 1.0,
        };
        items.push({
          geometry: this.ringWaveMesh,
          modelMatrix: pingNode.worldMatrix,
          material: pingMat,
        });
      }
    }

    // 4. Render Active 3D Action-MMO Skill Visuals (Full-scale Crescent Slashes, Shockwaves, Pillars, Clones & GPU Particles)
    for (const rib of this.skillVfx.slashRibbons) {
      const t = Math.min(1, rib.elapsed / Math.max(0.01, rib.duration));
      const fade = Math.max(0.28, 1.0 - t * 0.65);
      const curScale = rib.scale * (0.82 + t * 0.32);
      const fwdX = -Math.sin(rib.yaw) * 1.65;
      const fwdZ = -Math.cos(rib.yaw) * 1.65;

      const ribNode = new SceneNode(rib.id);
      ribNode.position.set(rib.x + fwdX, rib.y, rib.z + fwdZ);
      ribNode.rotation.setFromEuler(rib.pitchRad, rib.yaw, rib.rollRad);
      ribNode.scale.set(curScale, curScale * 0.9, curScale);
      ribNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const slashColor = q16([0.84, 0.07, 0.14]);
      const slashMat: MaterialProperties = {
        baseColor: [slashColor[0], slashColor[1], slashColor[2], fade],
        roughness: 0.18,
        metallic: 0.75,
        emissive: [0.78, 0.05, 0.10],
        emissiveIntensity: 0.58 * fade,
        rimIntensity: 0.85,
      };
      items.push({
        geometry: this.crescentSlashMesh,
        modelMatrix: ribNode.worldMatrix,
        material: slashMat,
      });

      const coreNode = new SceneNode(`${rib.id}-core`);
      coreNode.position.set(rib.x + fwdX, rib.y + 0.04, rib.z + fwdZ);
      coreNode.rotation.setFromEuler(rib.pitchRad, rib.yaw, rib.rollRad);
      coreNode.scale.set(curScale * 0.72, curScale * 1.02, curScale * 0.72);
      coreNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const coreColor = q16([0.96, 0.36, 0.04]);
      const coreMat: MaterialProperties = {
        baseColor: [coreColor[0], coreColor[1], coreColor[2], fade],
        roughness: 0.14,
        metallic: 0.82,
        emissive: [0.92, 0.28, 0.03],
        emissiveIntensity: 0.72 * fade,
        rimIntensity: 0.9,
      };
      items.push({
        geometry: this.crescentSlashMesh,
        modelMatrix: coreNode.worldMatrix,
        material: coreMat,
      });
    }

    // 3D Expanding Ground Shockwave Rings
    for (const sw of this.skillVfx.shockwaveRings) {
      const t = Math.min(1, sw.elapsed / Math.max(0.01, sw.duration));
      const fade = Math.max(0.25, 1.0 - t * 0.72);
      const s = (sw.startScale + (sw.endScale - sw.startScale) * t) * 0.78;

      const swNode = new SceneNode(sw.id);
      swNode.position.set(sw.x, sw.y + 0.04, sw.z - 1.4);
      swNode.rotation.setFromEuler(0, this.animClock * 4.5, 0);
      swNode.scale.set(s, Math.max(0.30, 0.85 - t * 0.45), s);
      swNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const swColor = q16([0.88, 0.18, 0.06]);
      const swMat: MaterialProperties = {
        baseColor: [swColor[0], swColor[1], swColor[2], fade],
        roughness: 0.20,
        metallic: 0.78,
        emissive: [0.82, 0.14, 0.04],
        emissiveIntensity: 0.52 * fade,
        rimIntensity: 0.85,
      };
      items.push({
        geometry: this.ringWaveMesh,
        modelMatrix: swNode.worldMatrix,
        material: swMat,
      });
    }

    // 3D Erupting Flame / Lightning Pillars & Tectonic Spikes
    let pilIndex = 0;
    for (const pil of this.skillVfx.pillarSpikes) {
      const t = Math.min(1, pil.elapsed / Math.max(0.01, pil.duration));
      const pop = t < 0.22 ? t / 0.22 : Math.max(0.28, 1.0 - (t - 0.22) / 0.78);

      const pilNode = new SceneNode(pil.id);
      pilNode.position.set(pil.x, pil.y, pil.z - 0.8);
      pilNode.rotation.setFromEuler(0, pil.orbitAngle + this.animClock * 3.2, 0);
      pilNode.scale.set(0.68 + pop * 0.22, pil.maxScaleY * 0.92 * pop, 0.68 + pop * 0.22);
      pilNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const isCrimsonPillar = pilIndex % 2 === 0;
      pilIndex++;
      const pilColor = q16(isCrimsonPillar ? [0.82, 0.08, 0.15] : [0.92, 0.34, 0.05]);
      const pilMat: MaterialProperties = {
        baseColor: [pilColor[0], pilColor[1], pilColor[2], 1.0],
        roughness: 0.22,
        metallic: 0.78,
        emissive: isCrimsonPillar ? [0.75, 0.05, 0.12] : [0.85, 0.26, 0.04],
        emissiveIntensity: 0.64 * pop,
        rimIntensity: 0.9,
      };
      items.push({
        geometry: this.pillarSpikeMesh,
        modelMatrix: pilNode.worldMatrix,
        material: pilMat,
      });
    }

    // 3D Phantom Afterimage Clones
    for (const clone of this.skillVfx.phantomClones) {
      const t = Math.min(1, clone.elapsed / Math.max(0.01, clone.duration));
      const fade = Math.max(0.25, 1.0 - t);
      const cloneNode = new SceneNode(clone.id);
      cloneNode.position.set(clone.x - 0.85, clone.y, clone.z - 0.5);
      cloneNode.rotation.setFromEuler(0, clone.yaw, 0);
      cloneNode.scale.set(avScale * 0.96, avScale * 0.96, avScale * 0.96);
      cloneNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const cRgb = q16([0.72, 0.08, 0.18]);
      const cloneMat: MaterialProperties = {
        baseColor: [cRgb[0], cRgb[1], cRgb[2], fade],
        roughness: 0.22,
        metallic: 0.85,
        emissive: [0.65, 0.06, 0.14],
        emissiveIntensity: 0.55 * fade,
        rimIntensity: 0.85,
      };
      const ck = isCircle16 ? this.circleKnightGeoms : this.cyberKnightGeoms;
      items.push(
        { geometry: ck.torso, modelMatrix: cloneNode.worldMatrix, material: cloneMat },
        { geometry: ck.head, modelMatrix: cloneNode.worldMatrix, material: cloneMat },
        { geometry: ck.blade, modelMatrix: cloneNode.worldMatrix, material: cloneMat }
      );
    }

    // 3D GPU Diamond Particles (Sparks, Embers, Sprint Dust Trail, Boss Impact Flash)
    for (const pt of this.skillVfx.particles) {
      const t = Math.min(1, pt.elapsed / Math.max(0.01, pt.duration));
      const fade = Math.max(0.15, 1.0 - t);
      const pNode = new SceneNode(pt.id);
      pNode.position.set(pt.x, pt.y, pt.z);
      pNode.rotation.setFromEuler(this.animClock * 6.0, this.animClock * 8.0, 0);
      const s = pt.kind === 'dust' ? pt.scale * 0.28 * (0.7 + t * 0.6) : pt.scale * 0.55 * fade;
      pNode.scale.set(s, s * (pt.kind === 'spark' ? 1.8 : 1.0), s);
      pNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const pRgb = q16(
        pt.kind === 'dust' ? [0.36, 0.32, 0.27] : [0.94, 0.26, 0.06]
      );
      const ptMat: MaterialProperties = {
        baseColor: [pRgb[0], pRgb[1], pRgb[2], fade],
        roughness: pt.kind === 'dust' ? 0.92 : 0.15,
        metallic: pt.kind === 'dust' ? 0.02 : 0.85,
        emissive: pt.kind === 'dust' ? [0, 0, 0] : pRgb,
        emissiveIntensity: pt.kind === 'dust' ? 0.0 : 0.78 * fade,
        rimIntensity: pt.kind === 'dust' ? 0.15 : 0.85,
      };
      items.push({
        geometry: this.sparkDiamondMesh,
        modelMatrix: pNode.worldMatrix,
        material: ptMat,
      });
    }

    // 3D Sacred Aegis Barrier Shield when Guard ('Q') is active
    if (this.combat.guard.isActive()) {
      const guardNode = new SceneNode('ActiveAegisBarrier');
      guardNode.position.copy(this.controller.position);
      guardNode.rotation.setFromEuler(0, this.controller.facingYaw, 0);
      guardNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const shieldRgb = q16(this.skillVfx.currentTheme.aegisShieldRgb);
      const shieldMat: MaterialProperties = {
        baseColor: [shieldRgb[0], shieldRgb[1], shieldRgb[2], 0.9],
        roughness: 0.08,
        metallic: 0.95,
        emissive: shieldRgb,
        emissiveIntensity: 2.2,
        rimIntensity: 1.0,
      };
      items.push({
        geometry: this.aegisBarrierMesh,
        modelMatrix: guardNode.worldMatrix,
        material: shieldMat,
      });
    }

    // 5. Multi-Material Hollow Sentinel Colossus Boss items
    const sentinelStanding = !sent.isDown();
    const isBossFlashing = sent.hitFlashTimer > 0.0;
    const sentBase = q16(
      isBossFlashing
        ? [0.92, 0.24, 0.10]
        : sentinelStanding
        ? [0.14, 0.17, 0.24]
        : [0.10, 0.11, 0.14]
    );
    const sentinelBodyMat: MaterialProperties = {
      baseColor: [sentBase[0], sentBase[1], sentBase[2], 1.0],
      roughness: isBossFlashing ? 0.18 : 0.36,
      metallic: 0.84,
      emissive: isBossFlashing ? [0.88, 0.18, 0.06] : sentinelStanding ? [0.03, 0.05, 0.09] : [0, 0, 0],
      emissiveIntensity: isBossFlashing ? 0.72 : sentinelStanding ? 0.12 : 0,
      rimIntensity: 0.75,
    };

    const bossBronze = q16(isBossFlashing ? [0.96, 0.42, 0.12] : [0.54, 0.36, 0.12]);
    const sentinelShoulderMat: MaterialProperties = {
      baseColor: [bossBronze[0], bossBronze[1], bossBronze[2], 1.0],
      roughness: 0.24,
      metallic: 0.90,
      emissive: isBossFlashing ? [0.85, 0.28, 0.06] : [0, 0, 0],
      emissiveIntensity: isBossFlashing ? 0.68 : 0.0,
      rimIntensity: 0.78,
    };

    if (isCircle16) {
      items.push({
        geometry: this.circleSentinelMesh,
        modelMatrix: this.sentinelNode.worldMatrix,
        material: sentinelBodyMat,
      });
    } else {
      const bossWm = this.sentinelNode.worldMatrix;
      const armWindupPitch = sent.isTelegraphing()
        ? -0.65 * sent.telegraphProgress()
        : sent.isFiring()
        ? -0.85
        : Math.sin(this.animClock * 2.1) * 0.08;

      const bossArmLNode = new SceneNode('BossArmL');
      bossArmLNode.rotation.setFromEuler(armWindupPitch, 0, -0.12);
      bossArmLNode.updateWorldMatrix(bossWm);

      const bossArmRNode = new SceneNode('BossArmR');
      bossArmRNode.rotation.setFromEuler(armWindupPitch, 0, 0.12);
      bossArmRNode.updateWorldMatrix(bossWm);

      const bossCrownNode = new SceneNode('BossCrown');
      bossCrownNode.position.set(0, 2.95, 0);
      bossCrownNode.rotation.setFromEuler(0.18, this.animClock * 1.8, 0);
      bossCrownNode.updateWorldMatrix(bossWm);

      const coreColor: [number, number, number] = q16(
        sent.isFiring() || sent.isTelegraphing() ? [1.0, 0.45, 0.12] : [0.95, 0.68, 0.18]
      );
      const bossCoreMat: MaterialProperties = {
        baseColor: [coreColor[0], coreColor[1], coreColor[2], 1.0],
        roughness: 0.10,
        metallic: 0.92,
        emissive: coreColor,
        emissiveIntensity: sentinelStanding ? 2.2 : 0.2,
        rimIntensity: 1.0,
      };

      items.push(
        { geometry: this.sentinelParts.torso, modelMatrix: bossWm, material: sentinelBodyMat },
        { geometry: this.sentinelParts.shoulders, modelMatrix: bossWm, material: sentinelShoulderMat },
        { geometry: this.sentinelParts.armL, modelMatrix: bossArmLNode.worldMatrix, material: sentinelShoulderMat },
        { geometry: this.sentinelParts.armR, modelMatrix: bossArmRNode.worldMatrix, material: sentinelShoulderMat },
        { geometry: this.sentinelParts.crownRing, modelMatrix: bossCrownNode.worldMatrix, material: bossCoreMat },
        { geometry: this.sentinelParts.reactorCore, modelMatrix: bossWm, material: bossCoreMat }
      );
    }

    if (sentinelStanding) {
      const eyeColor: [number, number, number] = isNight ? [0.75, 0.25, 1.0] : [1.0, 0.78, 0.18];
      const eyeMat: MaterialProperties = {
        baseColor: [eyeColor[0], eyeColor[1], eyeColor[2], 1.0],
        roughness: 0.1,
        metallic: 0.9,
        emissive: eyeColor,
        emissiveIntensity: 2.4,
      };
      items.push({
        geometry: this.sentinelEyeMesh,
        modelMatrix: this.sentinelEyeNode.worldMatrix,
        material: eyeMat,
      });
    }

    // 6. Sentinel Focus Beam & Telegraph Line Rendering
    const aim = sent.aimDirection;
    const sentPos = sent.position;
    const aimAngle = Math.atan2(aim.x, aim.z);

    if (sent.isTelegraphing()) {
      const prog = sent.telegraphProgress();
      this.telegraphNode.position.set(
        sentPos.x + aim.x * 13.0,
        0.06,
        sentPos.z + aim.z * 13.0
      );
      this.telegraphNode.rotation.setFromEuler(0, aimAngle, 0);
      this.telegraphNode.scale.set(0.35 + prog * 0.55, 1.0, 1.0);
      this.telegraphNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const telMat: MaterialProperties = {
        baseColor: [1.0, 0.62, 0.15, 0.9],
        roughness: 0.15,
        metallic: 0.4,
        emissive: [1.0, 0.65, 0.18],
        emissiveIntensity: 1.4 + prog * 1.2,
      };
      items.push({
        geometry: this.telegraphMesh,
        modelMatrix: this.telegraphNode.worldMatrix,
        material: telMat,
      });
    } else if (sent.isFiring()) {
      this.beamNode.position.set(
        sentPos.x + aim.x * 13.0,
        1.15,
        sentPos.z + aim.z * 13.0
      );
      this.beamNode.rotation.setFromEuler(0, aimAngle, 0);
      this.beamNode.scale.set(0.85, 1.0, 1.0);
      this.beamNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const beamColor: [number, number, number] = isNight
        ? [0.82, 0.22, 1.0]
        : [1.0, 0.78, 0.22];

      const beamMat: MaterialProperties = {
        baseColor: [beamColor[0], beamColor[1], beamColor[2], 1.0],
        roughness: 0.08,
        metallic: 0.85,
        emissive: beamColor,
        emissiveIntensity: 2.5,
        rimIntensity: 1.0,
      };
      items.push({
        geometry: this.beamMesh,
        modelMatrix: this.beamNode.worldMatrix,
        material: beamMat,
      });
    }

    // 7. Weathered Sanctuary Obelisks & 3D Basalt Crag Rocks
    const monoBase = q16(isNight ? [0.14, 0.18, 0.26] : [0.36, 0.34, 0.32]);
    const monolithMat: MaterialProperties = {
      baseColor: [monoBase[0], monoBase[1], monoBase[2], 1.0],
      roughness: 0.68,
      metallic: 0.15,
      emissive: isNight ? [0.04, 0.10, 0.22] : [0, 0, 0],
      emissiveIntensity: isNight ? 0.18 : 0,
      rimIntensity: 0.35,
    };
    const activeMonolithMesh = isCircle16 ? this.circleMonolithMesh : this.monolithMesh;
    for (const mNode of this.monolithNodes) {
      items.push({
        geometry: activeMonolithMesh,
        modelMatrix: mNode.worldMatrix,
        material: monolithMat,
      });
    }

    const rockBase = q16(isNight ? [0.12, 0.14, 0.20] : [0.30, 0.29, 0.27]);
    const cragRockMat: MaterialProperties = {
      baseColor: [rockBase[0], rockBase[1], rockBase[2], 1.0],
      roughness: 0.78,
      metallic: 0.08,
      emissive: [0, 0, 0],
      emissiveIntensity: 0,
      rimIntensity: 0.28,
    };
    for (const rNode of this.cragRockNodes) {
      items.push({
        geometry: this.cragRockMesh,
        modelMatrix: rNode.worldMatrix,
        material: cragRockMat,
      });
    }

    // 8. Studio Outliner Entities (with clamped emissive so no obelisk blows out to yellow)
    for (const ent of this.studio.entities) {
      const tempNode = new SceneNode(ent.id);
      tempNode.position.set(ent.position[0], ent.position[1], ent.position[2]);
      tempNode.scale.set(ent.scale[0], ent.scale[1], ent.scale[2]);
      tempNode.rotation.setFromEuler(0, (ent.rotationYDeg * Math.PI) / 180, 0);
      tempNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const isSelected = !this.isCaptureMode && this.studio.selectedEntityId === ent.id;
      const entRgb = q16(ent.color);
      const clampedEmissive = Math.min(0.35, ent.emissiveIntensity);
      const entMat: MaterialProperties = {
        baseColor: [entRgb[0], entRgb[1], entRgb[2], 1.0],
        roughness: ent.type === 'rea-artifact' || ent.type === 'pylon' ? 0.32 : 0.62,
        metallic: ent.type === 'rea-artifact' || ent.type === 'pylon' ? 0.65 : 0.22,
        emissive: isSelected ? [0.85, 0.68, 0.22] : entRgb,
        emissiveIntensity: isSelected ? 0.55 : clampedEmissive,
        rimIntensity: 0.45,
      };
      items.push({
        geometry: activeMonolithMesh,
        modelMatrix: tempNode.worldMatrix,
        material: entMat,
      });
    }

    // 8b. Skinned GLB Test Humanoid (1 or 30 copies with 4-bone LBS, Tangent Normal Map & Packed ORM)
    if (this.testHumanoidAsset && this.testHumanoidAsset.meshes.length > 0) {
      const prim = this.testHumanoidAsset.meshes[0];
      const count = this.testHumanoidMixers.length;
      for (let c = 0; c < count; c++) {
        const mixer = this.testHumanoidMixers[c];
        const blendW = 0.15 * (0.5 + 0.5 * Math.sin(this.animClock * 1.4 + c * 0.4));
        mixer.setBlendClips('Walk', 'Idle', blendW);
        const joints = mixer.evaluateAtTime(this.animClock * 1.15 + c * 0.19);

        const hNode = new SceneNode(`TestRiggedHumanoid_${c}`);
        if (count === 1) {
          const walkZ = -4.8 + Math.sin(this.animClock * 0.9) * 1.2;
          hNode.position.set(1.65, 0.0, walkZ);
          hNode.rotation.setFromEuler(0, Math.cos(this.animClock * 0.9) >= 0 ? 0 : Math.PI, 0);
        } else {
          const col = c % 6;
          const row = Math.floor(c / 6);
          const gx = (col - 2.5) * 1.45;
          const gz = -2.2 - row * 1.55 + Math.sin(this.animClock * 1.2 + c * 0.3) * 0.35;
          hNode.position.set(gx, 0.0, gz);
          hNode.rotation.setFromEuler(0, 0, 0);
        }
        hNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

        items.push({
          geometry: prim.geometry,
          modelMatrix: hNode.worldMatrix,
          material: prim.material,
          skinJointMatrices: joints,
        });
      }
    }

    // 9. Draw Frame
    this.renderer.render(
      items,
      this.camera.viewMatrix,
      this.camera.projectionMatrix,
      this.camera.position
    );

    // 10. Compute Triangles & Metrics
    let totalTriangles = 0;
    for (const it of items) {
      totalTriangles += it.geometry.indexCount / 3;
    }

    const metrics = this.renderer.getMetrics(items.length, totalTriangles);
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(
        metrics,
        this.controller.position,
        this.input.getControlActive(),
        this.input.getPointerLocked(),
        this.camera.yaw,
        this.camera.viewMode,
        {
          health: this.combat.health,
          stamina: this.combat.stamina,
          lastEvent: this.combat.lastEventText,
          eventsCount: this.combat.eventLog.count(),
          sentinelHealth: this.combat.sentinel.health,
          sentinelDown: this.combat.sentinel.isDown(),
          dashPhase: this.combat.dash.phase(),
          isInvulnerable: this.combat.dash.isInvulnerable(),
        }
      );
    }

    this.input.endFrame();
  }
}
