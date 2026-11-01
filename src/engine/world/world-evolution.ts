/**
 * DREAM Engine — AI-Governed World Evolution & Reality Morphing Director
 * 100% Built in-house by AI (Google Gemini + AI Council). Zero Unreal Engine, Zero Godot.
 *
 * Implements Founder Joshua Coleman's core long-term vision:
 * - An ever-evolving, self-adapting AI-governed game world that shifts between:
 *   1. `day_dream_3d`: State-of-the-art 3D PBR Golden Hour Sanctuary
 *   2. `nightmare_3d`: Crimson Nightfall & Neon Abyss action-combat escalation
 *   3. `circle_16bit`: "16-Bit Circle-Craft" — Radial Cylindrical/Spherical Voxels &
 *      16-bit RGB565 palette quantization ("circles not squares like Minecraft").
 * - Transparent AI Mission Verification Gate (`OPSis / Jarvis` 24/7 Stream Gate):
 *   Never claims personal out-of-pocket human donations as AI revenue. Only unlocks
 *   the 24/7 AI Mission Funding stream indicator when AI verifiably generates intake
 *   (e.g., `onlinerecycle.net` AI-driven e-waste intake, automated in-game convenience
 *   microtransactions, or public DAO / crypto wallet proof for Shriners / #UntilNoKidInNeed).
 */

export type EvolutionPhase = 'day_dream_3d' | 'nightmare_3d' | 'circle_16bit';

export interface WorldMutationEvent {
  epoch: number;
  phase: EvolutionPhase;
  title: string;
  description: string;
  geometryPrimitive: 'pbr-mesh' | 'cylinder-circle-16bit';
  colorDepthBits: 16 | 24;
  timestamp: string;
}

export interface TransparentMissionGate {
  aiBuiltEngine100Percent: true;
  zeroExternalGameEngines: true; // No Unreal, No Godot, No Paperclip
  onlinerecycleAiIntakeVerified: boolean;
  dreamOnlineAutomatedMtxVerified: boolean;
  publicDaoWalletAddress: string | null;
  personalOutOfPocketCountedAsAi: false; // Strictly false: Joshua's personal eBay donations are never claimed as AI revenue
  readyFor24x7OpsisStream: boolean;
}

/**
 * Quantizes a floating-point RGB color [0..1, 0..1, 0..1] to authentic 16-bit RGB565
 * (32 red levels, 64 green levels, 32 blue levels) for the `circle_16bit` world morph.
 */
export function quantizeColor16Bit(rgb: [number, number, number]): [number, number, number] {
  const r5 = Math.round(Math.min(1, Math.max(0, rgb[0])) * 31) / 31;
  const g6 = Math.round(Math.min(1, Math.max(0, rgb[1])) * 63) / 63;
  const b5 = Math.round(Math.min(1, Math.max(0, rgb[2])) * 31) / 31;
  return [Number(r5.toFixed(4)), Number(g6.toFixed(4)), Number(b5.toFixed(4))];
}

export class WorldEvolutionDirector {
  static readonly PHASES: readonly EvolutionPhase[] = [
    'day_dream_3d',
    'nightmare_3d',
    'circle_16bit',
  ];

  private _phase: EvolutionPhase = 'day_dream_3d';
  private _epoch = 1;
  private _autoEvolveEnabled = false;
  private _autoCycleSeconds = 180.0;
  private _elapsedInPhase = 0.0;
  private _history: WorldMutationEvent[] = [];

  readonly missionGate: TransparentMissionGate = {
    aiBuiltEngine100Percent: true,
    zeroExternalGameEngines: true,
    onlinerecycleAiIntakeVerified: false,
    dreamOnlineAutomatedMtxVerified: false,
    publicDaoWalletAddress: null,
    personalOutOfPocketCountedAsAi: false,
    readyFor24x7OpsisStream: false,
  };

  constructor(initialPhase: EvolutionPhase = 'day_dream_3d') {
    this.setPhase(initialPhase, 'Initial AI World Genesis');
  }

  get phase(): EvolutionPhase {
    return this._phase;
  }

  get epoch(): number {
    return this._epoch;
  }

  get isCircle16Bit(): boolean {
    return this._phase === 'circle_16bit';
  }

  get autoEvolveEnabled(): boolean {
    return this._autoEvolveEnabled;
  }

  setAutoEvolve(enabled: boolean, cycleSeconds = 180.0): void {
    this._autoEvolveEnabled = enabled;
    this._autoCycleSeconds = Math.max(10.0, cycleSeconds);
  }

  setPhase(nextPhase: EvolutionPhase, reason = 'AI Governor World Shift'): WorldMutationEvent {
    this._phase = nextPhase;
    this._elapsedInPhase = 0.0;
    const isCircle = nextPhase === 'circle_16bit';
    const title =
      nextPhase === 'day_dream_3d'
        ? 'Day Dream Sanctuary (3D PBR)'
        : nextPhase === 'nightmare_3d'
        ? 'Nightfall Abyss (3D Action Escalation)'
        : '16-Bit Circle-Craft Dimension (Cylindrical Voxels — Zero Squares)';

    const evt: WorldMutationEvent = {
      epoch: this._epoch++,
      phase: nextPhase,
      title,
      description: reason,
      geometryPrimitive: isCircle ? 'cylinder-circle-16bit' : 'pbr-mesh',
      colorDepthBits: isCircle ? 16 : 24,
      timestamp: new Date().toISOString(),
    };
    this._history.push(evt);
    if (this._history.length > 64) {
      this._history.shift();
    }
    return evt;
  }

  /**
   * Cycles to the next reality phase in the sequence:
   * `day_dream_3d` -> `nightmare_3d` -> `circle_16bit` -> `day_dream_3d`
   */
  cyclePhase(reason = 'Autonomous AI Reality Morph'): WorldMutationEvent {
    const idx = WorldEvolutionDirector.PHASES.indexOf(this._phase);
    const nextIdx = (idx + 1) % WorldEvolutionDirector.PHASES.length;
    return this.setPhase(WorldEvolutionDirector.PHASES[nextIdx], reason);
  }

  /**
   * Advances autonomous AI world evolution timer when enabled.
   */
  tick(deltaSeconds: number): WorldMutationEvent | null {
    if (!this._autoEvolveEnabled || deltaSeconds <= 0) {
      return null;
    }
    this._elapsedInPhase += deltaSeconds;
    if (this._elapsedInPhase >= this._autoCycleSeconds) {
      return this.cyclePhase('Scheduled AI Epoch Transition');
    }
    return null;
  }

  /**
   * Updates the transparent AI mission funding verification gate.
   * Ensures 24/7 OPSis/Jarvis livestream only marks AI funding active when real AI-driven
   * intake (`onlinerecycle.net` e-waste or automated game MTX + public wallet/DAO proof) is verified.
   */
  updateMissionVerification(opts: {
    onlinerecycleAiIntakeVerified?: boolean;
    dreamOnlineAutomatedMtxVerified?: boolean;
    publicDaoWalletAddress?: string | null;
  }): TransparentMissionGate {
    if (typeof opts.onlinerecycleAiIntakeVerified === 'boolean') {
      this.missionGate.onlinerecycleAiIntakeVerified = opts.onlinerecycleAiIntakeVerified;
    }
    if (typeof opts.dreamOnlineAutomatedMtxVerified === 'boolean') {
      this.missionGate.dreamOnlineAutomatedMtxVerified = opts.dreamOnlineAutomatedMtxVerified;
    }
    if (opts.publicDaoWalletAddress !== undefined) {
      this.missionGate.publicDaoWalletAddress = opts.publicDaoWalletAddress;
    }
    this.missionGate.readyFor24x7OpsisStream =
      this.missionGate.onlinerecycleAiIntakeVerified ||
      this.missionGate.dreamOnlineAutomatedMtxVerified;
    return { ...this.missionGate };
  }

  getHistory(): readonly WorldMutationEvent[] {
    return this._history;
  }
}
