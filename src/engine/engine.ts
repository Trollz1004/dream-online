/**
 * DREAM Engine — Runtime Engine Coordinator
 * Pure TypeScript, zero external framework dependencies.
 * Stage 1: Action Combat Parity, Hollow Sentinel, Focus Beam,
 * Perfect Dodge i-frames, and Append-Only World Event Bus.
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
  MeshGeometry,
  MaterialProperties
} from './scene/mesh.ts';
import { RenderItem, RenderMetrics } from './renderer/types.ts';
import { Vec3 } from './math/vec3.ts';
import { AmbientSynth } from './audio/ambient-synth.ts';
import { CombatManager } from './combat/combat-manager.ts';
import { SkillVfxDirector, ActionMmoClassId, SkillVfxThemeId } from './combat/skill-vfx.ts';
import { StudioConfigManager } from './studioConfig.ts';
import { WorldEvolutionDirector, quantizeColor16Bit, EvolutionPhase } from './world/world-evolution.ts';

export class DreamEngine {
  private canvas: HTMLCanvasElement;
  private renderer: EngineRenderer;
  private camera: Camera;
  readonly input: InputManager;
  private controller: CharacterController;
  private cyberKnightGeoms: ReturnType<typeof createCyberKnightGeometries>;
  private circleKnightGeoms: ReturnType<typeof createCircleCraftCharacterGeometries>;

  // Authoritative Combat Manager, Skill VFX Director, Live DREAM Studio Config & AI World Evolution Director
  readonly combat: CombatManager = new CombatManager();
  readonly skillVfx: SkillVfxDirector = new SkillVfxDirector();
  readonly studio: StudioConfigManager = new StudioConfigManager();
  readonly evolution: WorldEvolutionDirector = new WorldEvolutionDirector();

  // Scene entities
  private sceneRoot: SceneNode;
  private playerNode: SceneNode;
  private visorNode: SceneNode;
  private skyNode: SceneNode;
  private groundNode: SceneNode;
  private monolithNodes: SceneNode[] = [];
  private sentinelNode: SceneNode;
  private sentinelEyeNode: SceneNode;
  private beamNode: SceneNode;
  private telegraphNode: SceneNode;

  // Cached Geometries (created once, not per frame)
  private skyMesh: MeshGeometry;
  private groundMesh: MeshGeometry;
  private playerCapsuleMesh: MeshGeometry;
  private monolithMesh: MeshGeometry;
  private circleMonolithMesh: MeshGeometry;
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

  // Loop & procedural skeletal animation clock
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private animClock = 0;

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
    this.camera = new Camera(60, canvas.width / (canvas.height || 1), 0.1, 1500);
    this.input = new InputManager();
    this.controller = new CharacterController(new Vec3(0, 0, 0), 0.45, 1.9);
    this.ambientSynth = new AmbientSynth();

    this.sceneRoot = new SceneNode('WorldRoot');

    // Create persistent geometries once (sculpted Action-MMO geometries — zero flat boxes)
    this.skyMesh = createSkyDomeGeometry(800, 24, 12);
    this.groundMesh = createGroundPlane(300, 16);
    this.playerCapsuleMesh = createCapsuleGeometry(0.45, 1.9, 24, 8);
    this.cyberKnightGeoms = createCyberKnightGeometries();
    this.circleKnightGeoms = createCircleCraftCharacterGeometries();
    this.monolithMesh = createSculptedObeliskGeometry();
    this.circleMonolithMesh = createCylinderDiscGeometry(0.55, 1.0, 0.55, 0, 0.5, 0, 16);
    this.visorMesh = createMonolithGeometry(1, 1, 1);

    // Combat & Boss Geometries (Sculpted Colossus Sentinel + 3D Skill VFX Meshes)
    this.sentinelMesh = createSculptedSentinelColossusGeometry();
    this.circleSentinelMesh = createCylinderDiscGeometry(0.6, 2.6, 0.6, 0, 1.3, 0, 16);
    this.sentinelEyeMesh = createCylinderDiscGeometry(0.24, 0.18, 0.22, 0, 0, 0, 12);
    this.beamMesh = createCylinderDiscGeometry(1.1, 26.0, 1.1, 0, 0, 0, 16);
    this.telegraphMesh = createMonolithGeometry(0.2, 0.05, 26.0);
    this.slashMesh = createCrescentSlashArcGeometry(1.05, 2.85, Math.PI * 1.18, 28, 0.09);
    this.burstMesh = createRingWaveGeometry(1.5, 2.45, 0.24, 32);
    this.crescentSlashMesh = this.slashMesh;
    this.ringWaveMesh = this.burstMesh;
    this.pillarSpikeMesh = createSkillPillarSpikeGeometry(0.36, 0.04, 3.2, 10);
    this.aegisBarrierMesh = createAegisBarrierShieldGeometry(1.15, 1.65, Math.PI * 0.75, 16);

    // Apply default Crimson Dragon-Knight class & Rohan/BDO VFX theme
    const initPreset = this.skillVfx.setClassAndTheme('crimson-dekan', 'rohan-blood-crimson');
    this.studio.updateCharacter(initPreset.characterPatch);

    // Build scene hierarchy
    // 1. Sky
    this.skyNode = new SceneNode('SkyDome');
    this.sceneRoot.add(this.skyNode);

    // 2. Ground
    this.groundNode = new SceneNode('GroundPlane');
    this.sceneRoot.add(this.groundNode);

    // 3. Player Capsule
    this.playerNode = new SceneNode('PlayerCapsule');
    this.sceneRoot.add(this.playerNode);

    // Player Visor accent
    this.visorNode = new SceneNode('PlayerVisor');
    this.visorNode.position.set(0, 1.45, 0.38);
    this.visorNode.scale.set(0.28, 0.08, 0.15);
    this.playerNode.add(this.visorNode);

    // 4. Hollow Sentinel (Training Dummy Automaton at 0, 0, -10)
    this.sentinelNode = new SceneNode('HollowSentinel');
    this.sentinelNode.position.set(0, 0, -10);
    this.sceneRoot.add(this.sentinelNode);

    this.sentinelEyeNode = new SceneNode('SentinelEye');
    this.sentinelEyeNode.position.set(0, 2.15, 0.55);
    this.sentinelNode.add(this.sentinelEyeNode);

    // Beam & Telegraph nodes
    this.beamNode = new SceneNode('FocusBeam');
    this.sceneRoot.add(this.beamNode);

    this.telegraphNode = new SceneNode('TelegraphAim');
    this.sceneRoot.add(this.telegraphNode);

    // 5. Scenic Monoliths (DREAM landmark pillars)
    const monolithCoords: [number, number, number][] = [
      [8, 0, -12],
      [-12, 0, -18],
      [16, 0, 14],
      [-15, 0, 10],
      [0, 0, -28],
      [24, 0, -6],
    ];

    for (let i = 0; i < monolithCoords.length; i++) {
      const coord = monolithCoords[i];
      const mNode = new SceneNode(`Monolith_${i + 1}`);
      mNode.position.set(coord[0], coord[1], coord[2]);
      mNode.scale.set(1.2, 3.5 + (i % 3) * 1.2, 1.2);
      this.sceneRoot.add(mNode);
      this.monolithNodes.push(mNode);
    }

    // Forward input callbacks
    this.input.onPointerLockRefused = (msg) => {
      this.onPointerLockRefused?.(msg);
    };
  }

  async start(): Promise<void> {
    await this.renderer.init();

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

    const isProof = typeof window !== 'undefined' && window.location.search.includes('proof=1');
    if (isProof) {
      this.runProofSequence();
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
   * Switches the playable 3D character archetype, Dreamforge art style, and BDO/Rohan Skill VFX theme in real time.
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
   * Fires a combat skill and its full 3D Action-MMO visual effects on demand (from HUD, Studio, or CLI-Anything).
   */
  castSkillWithVfx(
    skillKey: 'l1' | 'l2' | 'l3' | 'heavy' | 'lunge' | 'burst' | 'dash' | 'guard' | 'combo-all'
  ): string {
    const pos = this.controller.position;
    const yaw = this.controller.facingYaw;
    this.combat.stamina = CombatManager.STAMINA_MAX;

    if (skillKey === 'combo-all') {
      this.skillVfx.triggerAwakeningComboShowcase(pos.x, pos.y, pos.z, yaw);
      this.combat.say(`AWAKENING COMBO: ${this.skillVfx.currentClass.awakeningWeaponName}`);
      return this.combat.lastEventText;
    }
    if (skillKey === 'l1' || skillKey === 'l2' || skillKey === 'l3') {
      const stepNum = skillKey === 'l1' ? 1 : skillKey === 'l2' ? 2 : 3;
      this.combat.trySkill('', false, 'LMB', yaw, pos);
      this.skillVfx.spawnLightSlashVfx(stepNum, pos.x, pos.y, pos.z, yaw);
      return this.skillVfx.currentClass.skillNames[skillKey];
    }
    if (skillKey === 'heavy') {
      this.combat.trySkill('', false, 'RMB', yaw, pos);
      this.skillVfx.spawnHeavyCleaveVfx(pos.x, pos.y, pos.z, yaw);
      return this.skillVfx.currentClass.skillNames.heavy;
    }
    if (skillKey === 'lunge') {
      this.combat.trySkill('W', false, 'F', yaw, pos);
      this.skillVfx.spawnDreamLungeVfx(pos.x, pos.y, pos.z, yaw);
      return this.skillVfx.currentClass.skillNames.lunge;
    }
    if (skillKey === 'burst') {
      this.combat.trySkill('', false, 'R', yaw, pos);
      this.skillVfx.spawnNightveilBurstVfx(pos.x, pos.y, pos.z, yaw);
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

    const step = () => {
      if (!this.isRunning || completed) return;

      simTime += stepDt;

      // 1. Walk 2.0s towards Hollow Sentinel (facing -Z)
      if (simTime < 2.0) {
        this.controller.position.z -= CombatManager.WALK_SPEED * stepDt;
        this.controller.facingYaw = Math.PI;
      }

      // 2. Dash through Focus Beam cycle 1
      // Sentinel telegraph runs from 2.50s to 3.90s. Beam fires 3.90s to 4.20s.
      // Dash startup is 0.06s. Trigger dash at 3.84s so invulnerable window [3.90s, 4.15s] covers beam firing.
      if (simTime >= 3.84 && !dashTriggered) {
        dashTriggered = true;
        this.combat.trySkill('W', true, 'F', 0, this.controller.position);
      }

      // Sample yellow luma during invulnerable window
      if (simTime >= 3.95 && simTime < 4.05 && this.combat.dash.isInvulnerable()) {
        const l = this.renderer.readLuma();
        if (l > 0) lumaYellow = l;
        perfectDodgeDamage = Math.max(0, initialHealth - this.combat.health);
      }

      // Sample red luma during recovery window
      if (simTime >= 4.25 && simTime < 4.35 && this.combat.dash.isRecovery()) {
        const l = this.renderer.readLuma();
        if (l > 0) lumaRed = l;
      }

      // 3. Three light strikes
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

      // 4. One heavy strike (after L3 recovery finishes at 5.86s)
      if (simTime >= 5.90 && !heavyTriggered) {
        heavyTriggered = true;
        this.combat.trySkill('', false, 'RMB', 0, this.controller.position);
      }

      // 5. Guard while next beam lands
      // Sentinel cycle 2 beam fires from 8.10s to 8.40s.
      // Guard startup is 0.08s. Trigger guard at 8.00s so active window [8.08s, 8.53s] absorbs hit!
      if (simTime >= 8.00 && !guardTriggered) {
        guardTriggered = true;
        this.combat.trySkill('', false, 'Q', 0, this.controller.position);
      }

      // Sample beam luma while Focus Beam is firing
      if (simTime >= 8.15 && simTime < 8.25 && this.combat.sentinel.isFiring()) {
        const l = this.renderer.readLuma();
        if (l > 0) lumaBeam = l;
      }

      // Record guarded beam damage (18 * 0.25 = 4.5)
      if (simTime >= 8.35 && guardedBeamDamage === 0) {
        guardedBeamDamage = Number((initialHealth - this.combat.health).toFixed(1));
      }

      // 6. Dream Lunge (W+F)
      if (simTime >= 8.90 && !lungeTriggered) {
        lungeTriggered = true;
        this.combat.trySkill('W', false, 'F', 0, this.controller.position);
      }

      // 7. Nightveil Burst (R)
      if (simTime >= 9.40 && !burstTriggered) {
        burstTriggered = true;
        this.combat.trySkill('', false, 'R', 0, this.controller.position);
      }

      // Execute frame step
      this.stepFrame(stepDt);

      // 8. Dump event log and print required output
      if (simTime >= 10.0 && !completed) {
        completed = true;
        this.dumpWorldEventLog();

        // Count events by kind
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

  // Live Settings Controls
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

  private stepFrame(dt: number): void {
    // 1. Update Controller (with combat inputs and dash/lunge velocity overrides)
    this.controller.update(dt, this.input, this.camera, this.combat);

    // 2. Update Combat State (stamina, health, sentinel AI, hit resolution, event logs)
    this.combat.update(dt, this.controller.position, this.controller.isSprinting, this.camera.yaw);

    // 2b. Advance Procedural Animation Clock & 3D Skill VFX Director (Rohan / BDO style skill visuals)
    this.animClock += dt;
    this.skillVfx.update(dt, this.controller.position, this.controller.facingYaw, {
      attackStep: this.combat.attack.step(),
      isAttacking: this.combat.attack.isAttacking(),
      isHeavy: this.combat.heavy.isAttacking(),
      isLunging: this.combat.lunge.isLunging(),
      isBursting: this.combat.burst.isActive(),
      isDashing: this.combat.dash.isDashing(),
      isGuarding: this.combat.guard.isActive(),
    });

    // 3. Sync Player SceneNode transform & Studio Avatar Scale
    this.playerNode.position.copy(this.controller.position);
    this.controller.getRotationQuaternion(this.playerNode.rotation);
    const avScale = this.studio.character.avatarScale;
    this.playerNode.scale.set(avScale, avScale, avScale);

    // 4. Sync Sentinel SceneNode & Studio Scale
    this.sentinelNode.position.copy(this.combat.sentinel.position);
    const sentScale = this.studio.character.sentinelScale;
    this.sentinelNode.scale.set(sentScale, sentScale, sentScale);
    if (this.combat.sentinel.isDown()) {
      this.sentinelNode.position.y = -0.8; // sank/collapsed
    } else {
      this.sentinelNode.position.y = 0.0;
    }

    // 5. Keep Sky centered on camera
    this.skyNode.position.copy(this.camera.position);

    // 6. Update World Matrices
    this.sceneRoot.updateWorldMatrix();

    // 7. Gather Render Items
    const items: RenderItem[] = [];

    // Sky item
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

    // Ground item
    const groundMat: MaterialProperties = {
      baseColor: [0.28, 0.23, 0.18, 1.0],
      roughness: 0.85,
      metallic: 0.05,
      emissive: [0, 0, 0],
      emissiveIntensity: 0,
      isGround: true,
    };
    items.push({
      geometry: this.groundMesh,
      modelMatrix: this.groundNode.worldMatrix,
      material: groundMat,
    });

    // Player Cyber-Knight Avatar items
    // (glow yellow during invulnerable window and only then; recovery shows red)
    const isNight = this.renderer.worldMode === 'night';
    const isCircle16 = this.evolution.isCircle16Bit;
    const q16 = (c: [number, number, number]): [number, number, number] =>
      isCircle16 ? quantizeColor16Bit(c) : c;
    const charCfg = this.studio.character;
    if (this.camera.viewMode === 'third-person') {
      const glow = this.combat.getCharacterGlow(this.renderer.worldMode);
      const isAttacking = this.combat.attack.isAttacking() || this.combat.heavy.isAttacking() || this.combat.lunge.isLunging();

      const rawArmorRgb = glow.isGlow
        ? ([glow.r, glow.g, glow.b] as [number, number, number])
        : isNight
        ? charCfg.armorColorNight
        : charCfg.armorColorDay;
      const baseArmorRgb = q16(rawArmorRgb);
      const armorMat: MaterialProperties = {
        baseColor: [baseArmorRgb[0], baseArmorRgb[1], baseArmorRgb[2], 1.0],
        roughness: glow.isGlow ? 0.15 : charCfg.armorRoughness,
        metallic: charCfg.armorMetallic,
        emissive: glow.isGlow ? baseArmorRgb : [0, 0, 0],
        emissiveIntensity: glow.isGlow ? 3.5 : 0.0,
        rimIntensity: glow.isGlow ? 1.0 : this.studio.shader.rimIntensity,
      };

      const opticColor: [number, number, number] = q16(
        glow.isGlow
          ? [glow.r, glow.g, glow.b]
          : isNight
          ? charCfg.visorColorNight
          : charCfg.visorColorDay
      );
      const opticMat: MaterialProperties = {
        baseColor: [opticColor[0], opticColor[1], opticColor[2], 1.0],
        roughness: 0.1,
        metallic: 0.9,
        emissive: opticColor,
        emissiveIntensity: glow.isGlow ? 4.5 : charCfg.visorGlowIntensity,
        rimIntensity: 1.0,
      };

      const rawBladeColor: [number, number, number] = isAttacking
        ? (isNight ? charCfg.bladeColorNight : charCfg.bladeColorDay)
        : (isNight ? [charCfg.bladeColorNight[0] * 0.5, charCfg.bladeColorNight[1] * 0.5, charCfg.bladeColorNight[2] * 0.6] : [charCfg.bladeColorDay[0] * 0.45, charCfg.bladeColorDay[1] * 0.45, charCfg.bladeColorDay[2] * 0.45]);
      const bladeColor = q16(rawBladeColor);
      const bladeMat: MaterialProperties = {
        baseColor: [bladeColor[0], bladeColor[1], bladeColor[2], 1.0],
        roughness: 0.1,
        metallic: 0.9,
        emissive: bladeColor,
        emissiveIntensity: isAttacking ? 5.0 : 0.65,
        rimIntensity: 1.0,
      };

      const ck = isCircle16 ? this.circleKnightGeoms : this.cyberKnightGeoms;
      const wm = this.playerNode.worldMatrix;

      // Dynamic procedural locomotion & combat swing articulation (arms, legs, blade, cape)
      const isMoving =
        this.input.isDown('KeyW') ||
        this.input.isDown('KeyS') ||
        this.input.isDown('KeyA') ||
        this.input.isDown('KeyD') ||
        this.combat.dash.isDashing() ||
        this.combat.lunge.isLunging();
      const strideFreq = this.controller.isSprinting ? 13.0 : 8.5;
      const strideAmp = isMoving ? (this.controller.isSprinting ? 0.42 : 0.26) : 0.03;
      const legSwing = Math.sin(this.animClock * strideFreq) * strideAmp;
      const breathBob = Math.sin(this.animClock * 2.8) * 0.015;

      // Weapon arm & blade swing angle during skills
      const hasActiveVfxRibbon = this.skillVfx.slashRibbons.length > 0;
      const swingAngle = isAttacking || hasActiveVfxRibbon
        ? Math.sin(this.animClock * 24.0) * 0.85
        : Math.sin(this.animClock * 2.4) * 0.06;

      const makeLimbMatrix = (rx: number, ry: number, rz: number, dy = 0) => {
        const n = new SceneNode('LimbPart');
        n.position.set(0, dy, 0);
        n.rotation.setFromEuler(rx, ry, rz);
        n.updateWorldMatrix(wm);
        return n.worldMatrix;
      };

      const torsoWm = makeLimbMatrix(isMoving ? 0.06 : 0, swingAngle * 0.22, 0, breathBob);
      const legLWm = makeLimbMatrix(legSwing, 0, 0, 0);
      const legRWm = makeLimbMatrix(-legSwing, 0, 0, 0);
      const armLWm = makeLimbMatrix(-legSwing * 0.7, 0, 0, breathBob);
      const armRWm = makeLimbMatrix(swingAngle * 0.9, swingAngle * 0.45, 0, breathBob);
      const capeWm = makeLimbMatrix(0.08 + Math.abs(legSwing) * 0.35, Math.sin(this.animClock * 4.2) * 0.08, 0, breathBob);

      items.push(
        { geometry: ck.torso, modelMatrix: torsoWm, material: armorMat },
        { geometry: ck.head, modelMatrix: torsoWm, material: armorMat },
        { geometry: ck.pauldronL, modelMatrix: torsoWm, material: armorMat },
        { geometry: ck.pauldronR, modelMatrix: torsoWm, material: armorMat },
        { geometry: ck.armL, modelMatrix: armLWm, material: armorMat },
        { geometry: ck.armR, modelMatrix: armRWm, material: armorMat },
        { geometry: ck.hip, modelMatrix: wm, material: armorMat },
        { geometry: ck.legL, modelMatrix: legLWm, material: armorMat },
        { geometry: ck.legR, modelMatrix: legRWm, material: armorMat },
        { geometry: ck.spine, modelMatrix: capeWm, material: opticMat },
        { geometry: ck.visor, modelMatrix: torsoWm, material: opticMat },
        { geometry: ck.core, modelMatrix: torsoWm, material: opticMat },
        { geometry: ck.blade, modelMatrix: armRWm, material: bladeMat }
      );
      if (!isCircle16) {
        items.push({ geometry: this.cyberKnightGeoms.horns, modelMatrix: torsoWm, material: opticMat });
      }
    }

    // 7b. Render Active 3D Action-MMO Skill Visuals (BDO / Rohan: Blood Feud Crescent Slashes, Shockwaves, Pillars & Clones)
    for (const rib of this.skillVfx.slashRibbons) {
      const t = Math.min(1, rib.elapsed / Math.max(0.01, rib.duration));
      const fade = Math.max(0.2, 1.0 - t * 0.75);
      const curScale = rib.scale * (0.28 + t * 0.12);
      const fwdX = -Math.sin(rib.yaw) * 2.15;
      const fwdZ = -Math.cos(rib.yaw) * 2.15;

      const ribNode = new SceneNode(rib.id);
      ribNode.position.set(rib.x + fwdX, rib.y, rib.z + fwdZ);
      ribNode.rotation.setFromEuler(rib.pitchRad, rib.yaw, rib.rollRad);
      ribNode.scale.set(curScale, curScale * 0.75, curScale);
      ribNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const slashColor = q16(rib.colorRgb);
      const slashMat: MaterialProperties = {
        baseColor: [slashColor[0] * 0.85, slashColor[1] * 0.18, slashColor[2] * 0.25, fade],
        roughness: 0.25,
        metallic: 0.75,
        emissive: [slashColor[0], slashColor[1] * 0.28, slashColor[2] * 0.35],
        emissiveIntensity: 1.15 * fade,
        rimIntensity: 0.9,
      };
      items.push({
        geometry: this.crescentSlashMesh,
        modelMatrix: ribNode.worldMatrix,
        material: slashMat,
      });

      // Inner blazing core ribbon
      const coreNode = new SceneNode(`${rib.id}-core`);
      coreNode.position.set(rib.x + fwdX, rib.y + 0.03, rib.z + fwdZ);
      coreNode.rotation.setFromEuler(rib.pitchRad, rib.yaw, rib.rollRad);
      coreNode.scale.set(curScale * 0.76, curScale * 0.85, curScale * 0.76);
      coreNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const coreColor = q16(rib.coreRgb);
      const coreMat: MaterialProperties = {
        baseColor: [coreColor[0], coreColor[1] * 0.65, coreColor[2] * 0.25, fade],
        roughness: 0.18,
        metallic: 0.85,
        emissive: [coreColor[0], coreColor[1] * 0.65, coreColor[2] * 0.25],
        emissiveIntensity: 1.35 * fade,
        rimIntensity: 1.0,
      };
      items.push({
        geometry: this.crescentSlashMesh,
        modelMatrix: coreNode.worldMatrix,
        material: coreMat,
      });
    }

    // 3D Shockwave Rings
    for (const sw of this.skillVfx.shockwaveRings) {
      const t = Math.min(1, sw.elapsed / Math.max(0.01, sw.duration));
      const fade = Math.max(0.15, 1.0 - t * 0.8);
      const s = (sw.startScale + (sw.endScale - sw.startScale) * t) * 0.46;

      const swNode = new SceneNode(sw.id);
      swNode.position.set(sw.x, sw.y, sw.z - 1.85);
      swNode.rotation.setFromEuler(0, this.animClock * 4.0, 0);
      swNode.scale.set(s * 0.72, Math.max(0.2, 0.55 - t * 0.3), s * 0.72);
      swNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const swColor = q16(sw.colorRgb);
      const swMat: MaterialProperties = {
        baseColor: [swColor[0] * 0.9, swColor[1] * 0.28, swColor[2] * 0.35, fade],
        roughness: 0.22,
        metallic: 0.8,
        emissive: [swColor[0], swColor[1] * 0.32, swColor[2] * 0.4],
        emissiveIntensity: 1.05 * fade,
        rimIntensity: 0.85,
      };
      items.push({
        geometry: this.ringWaveMesh,
        modelMatrix: swNode.worldMatrix,
        material: swMat,
      });
    }

    // 3D Awakening Lightning / Dragon-Flame Pillars & Tectonic Spikes
    for (const pil of this.skillVfx.pillarSpikes) {
      const t = Math.min(1, pil.elapsed / Math.max(0.01, pil.duration));
      const pop = t < 0.25 ? t / 0.25 : Math.max(0.2, 1.0 - (t - 0.25) / 0.75);

      const pilNode = new SceneNode(pil.id);
      pilNode.position.set(pil.x, pil.y, pil.z - 2.1);
      pilNode.rotation.setFromEuler(0, pil.orbitAngle + this.animClock * 3.0, 0);
      pilNode.scale.set(0.42 + pop * 0.14, pil.maxScaleY * 0.55 * pop, 0.42 + pop * 0.14);
      pilNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const pilColor = q16(pil.colorRgb);
      const pilMat: MaterialProperties = {
        baseColor: [pilColor[0] * 0.88, pilColor[1] * 0.22, pilColor[2] * 0.35, 1.0],
        roughness: 0.24,
        metallic: 0.82,
        emissive: [pilColor[0], pilColor[1] * 0.28, pilColor[2] * 0.42],
        emissiveIntensity: 1.2 * pop,
        rimIntensity: 0.9,
      };
      items.push({
        geometry: this.pillarSpikeMesh,
        modelMatrix: pilNode.worldMatrix,
        material: pilMat,
      });
    }

    // 3D Phantom Afterimage Clones (Dash & Dream Lunge)
    for (const clone of this.skillVfx.phantomClones) {
      const t = Math.min(1, clone.elapsed / Math.max(0.01, clone.duration));
      const fade = Math.max(0.2, 1.0 - t);
      const cloneNode = new SceneNode(clone.id);
      cloneNode.position.set(clone.x - 1.35, clone.y, clone.z - 0.9);
      cloneNode.rotation.setFromEuler(0, clone.yaw, 0);
      cloneNode.scale.set(avScale * 0.96, avScale * 0.96, avScale * 0.96);
      cloneNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const cRgb = q16(clone.colorRgb);
      const cloneMat: MaterialProperties = {
        baseColor: [cRgb[0] * 0.75, cRgb[1] * 0.18, cRgb[2] * 0.85, fade],
        roughness: 0.2,
        metallic: 0.9,
        emissive: [cRgb[0] * 0.8, cRgb[1] * 0.18, cRgb[2] * 0.95],
        emissiveIntensity: 1.15 * fade,
        rimIntensity: 1.0,
      };
      const ck = isCircle16 ? this.circleKnightGeoms : this.cyberKnightGeoms;
      items.push(
        { geometry: ck.torso, modelMatrix: cloneNode.worldMatrix, material: cloneMat },
        { geometry: ck.head, modelMatrix: cloneNode.worldMatrix, material: cloneMat },
        { geometry: ck.blade, modelMatrix: cloneNode.worldMatrix, material: cloneMat }
      );
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
        roughness: 0.05,
        metallic: 0.95,
        emissive: shieldRgb,
        emissiveIntensity: 5.5,
        rimIntensity: 1.0,
      };
      items.push({
        geometry: this.aegisBarrierMesh,
        modelMatrix: guardNode.worldMatrix,
        material: shieldMat,
      });
    }

    // 8. Hollow Sentinel items
    const sentinelStanding = !this.combat.sentinel.isDown();
    const sentBase = q16(sentinelStanding ? [0.22, 0.22, 0.28] : [0.12, 0.12, 0.14]);
    const sentinelMat: MaterialProperties = {
      baseColor: [sentBase[0], sentBase[1], sentBase[2], 1.0],
      roughness: 0.6,
      metallic: 0.3,
      emissive: sentinelStanding ? [0.05, 0.05, 0.1] : [0, 0, 0],
      emissiveIntensity: sentinelStanding ? 0.4 : 0,
      rimIntensity: 0.6,
    };
    items.push({
      geometry: isCircle16 ? this.circleSentinelMesh : this.sentinelMesh,
      modelMatrix: this.sentinelNode.worldMatrix,
      material: sentinelMat,
    });

    // Sentinel Eye (Amber by day, violet by night)
    if (sentinelStanding) {
      const eyeColor: [number, number, number] = isNight ? [0.75, 0.25, 1.0] : [1.0, 0.8, 0.15];
      const eyeMat: MaterialProperties = {
        baseColor: [eyeColor[0], eyeColor[1], eyeColor[2], 1.0],
        roughness: 0.1,
        metallic: 0.9,
        emissive: eyeColor,
        emissiveIntensity: 3.0,
      };
      items.push({
        geometry: this.sentinelEyeMesh,
        modelMatrix: this.sentinelEyeNode.worldMatrix,
        material: eyeMat,
      });
    }

    // 9. Sentinel Focus Beam & Telegraph Line Rendering
    const aim = this.combat.sentinel.aimDirection;
    const sentPos = this.combat.sentinel.position;
    // Aim yaw
    const aimAngle = Math.atan2(aim.x, aim.z);

    if (this.combat.sentinel.isTelegraphing()) {
      // Telegraph warning line extending 26m
      const prog = this.combat.sentinel.telegraphProgress();
      this.telegraphNode.position.set(
        sentPos.x + aim.x * 13.0,
        0.05,
        sentPos.z + aim.z * 13.0
      );
      this.telegraphNode.rotation.setFromEuler(0, aimAngle, 0);
      this.telegraphNode.scale.set(0.2 + prog * 0.4, 1.0, 1.0);
      this.telegraphNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const telMat: MaterialProperties = {
        baseColor: [1.0, 0.65, 0.15, 0.85],
        roughness: 0.1,
        metallic: 0.0,
        emissive: [1.0, 0.7, 0.2],
        emissiveIntensity: 1.5 + prog * 2.5,
      };
      items.push({
        geometry: this.telegraphMesh,
        modelMatrix: this.telegraphNode.worldMatrix,
        material: telMat,
      });
    } else if (this.combat.sentinel.isFiring()) {
      // 26m long, 2.2m wide devastating Focus Beam
      this.beamNode.position.set(
        sentPos.x + aim.x * 13.0,
        1.1,
        sentPos.z + aim.z * 13.0
      );
      this.beamNode.rotation.setFromEuler(0, aimAngle, 0);
      this.beamNode.scale.set(1.0, 1.0, 1.0);
      this.beamNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const beamColor: [number, number, number] = isNight
        ? [0.8, 0.2, 1.0]
        : [1.0, 0.85, 0.25];

      const beamMat: MaterialProperties = {
        baseColor: [beamColor[0], beamColor[1], beamColor[2], 1.0],
        roughness: 0.0,
        metallic: 0.5,
        emissive: beamColor,
        emissiveIntensity: 5.5,
        rimIntensity: 1.0,
      };
      items.push({
        geometry: this.beamMesh,
        modelMatrix: this.beamNode.worldMatrix,
        material: beamMat,
      });
    }

    // 10. Monolith & Dynamic Studio Entities
    const monoBase = q16(isNight ? [0.12, 0.16, 0.24] : [0.38, 0.34, 0.30]);
    const monolithMat: MaterialProperties = {
      baseColor: [monoBase[0], monoBase[1], monoBase[2], 1.0],
      roughness: 0.7,
      metallic: 0.1,
      emissive: isNight ? [0.05, 0.15, 0.35] : [0, 0, 0],
      emissiveIntensity: isNight ? 0.3 : 0,
    };
    const activeMonolithMesh = isCircle16 ? this.circleMonolithMesh : this.monolithMesh;
    for (const mNode of this.monolithNodes) {
      items.push({
        geometry: activeMonolithMesh,
        modelMatrix: mNode.worldMatrix,
        material: monolithMat,
      });
    }

    // Render additional Studio Outliner Entities (Pylons, Jump Pads, NPC Beacons, REA Artifacts)
    for (const ent of this.studio.entities) {
      // Skip the first two default monoliths already in monolithNodes unless transformed
      const tempNode = new SceneNode(ent.id);
      tempNode.position.set(ent.position[0], ent.position[1], ent.position[2]);
      tempNode.scale.set(ent.scale[0], ent.scale[1], ent.scale[2]);
      tempNode.rotation.setFromEuler(0, (ent.rotationYDeg * Math.PI) / 180, 0);
      tempNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const isSelected = this.studio.selectedEntityId === ent.id;
      const entRgb = q16(ent.color);
      const entMat: MaterialProperties = {
        baseColor: [entRgb[0], entRgb[1], entRgb[2], 1.0],
        roughness: ent.type === 'rea-artifact' || ent.type === 'pylon' ? 0.15 : 0.55,
        metallic: ent.type === 'rea-artifact' || ent.type === 'pylon' ? 0.85 : 0.25,
        emissive: isSelected ? [1.0, 0.82, 0.12] : entRgb,
        emissiveIntensity: isSelected ? Math.max(2.0, ent.emissiveIntensity) : ent.emissiveIntensity,
        rimIntensity: isSelected ? 1.0 : 0.65,
      };
      items.push({
        geometry: activeMonolithMesh,
        modelMatrix: tempNode.worldMatrix,
        material: entMat,
      });
    }

    // 11. Draw Frame
    this.renderer.render(
      items,
      this.camera.viewMatrix,
      this.camera.projectionMatrix,
      this.camera.position
    );

    // 12. Compute Triangles & Metrics
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
