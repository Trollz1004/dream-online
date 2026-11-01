/**
 * DREAM Engine — Movable GUI & Tactical PvP Map Ping / Focus-Target Coordination System
 *
 * 100% Built In-House with Google Gemini:
 * 1. Movable / Scalable HUD Widgets (Action Bar, Player Bars, Boss Target Frame, Radar Minimap, Team Focus Frame, FPS Telemetry)
 *    with Layout Presets ('default', 'pvp-centered', 'minimalist') and persistent localStorage + Settings UI.
 * 2. Shift + Right-Click Tactical Map Ping System (Focus Target, Engage/Attack, Regroup, Danger/Peel)
 *    with 3D World Beacons, Minimap & C0D3X Map markers, and Squad Callout Log.
 * 3. PvP Team-Fight Focus Target & Shotcaller System (Cycle / Lock Priority Target, Target HP/Stamina/CC State,
 *    Ally Squad Frames, and Instant Focus Ping).
 */

export type HudWidgetId =
  | 'actionBar'
  | 'playerVitals'
  | 'bossTarget'
  | 'radarMinimap'
  | 'teamFightHud'
  | 'telemetryPill';

export type HudLayoutPresetId = 'default' | 'pvp-centered' | 'minimalist';

export interface HudWidgetPosition {
  id: HudWidgetId;
  label: string;
  offsetX: number; // pixel offset from default anchor
  offsetY: number; // pixel offset from default anchor
  scale: number; // 0.75 .. 1.35
  opacity: number; // 0.35 .. 1.0
  visible: boolean;
  orientation?: 'horizontal' | 'vertical' | 'compact-2row';
}

export interface HudLayoutState {
  unlockDragging: boolean;
  locked?: boolean;
  actionBarOrientation?: 'horizontal' | 'vertical' | 'compact-2row';
  snapToGrid: boolean;
  gridSizePx: number;
  activePreset: HudLayoutPresetId;
  shiftRightClickPingMode: TacticalPingKind;
  widgets: Record<HudWidgetId, HudWidgetPosition>;
}

export type TacticalPingKind = 'focus' | 'attack' | 'regroup' | 'danger';

export interface TacticalMapPing {
  id: string;
  kind: TacticalPingKind;
  label: string;
  callerName: string;
  callerRole: 'Shotcaller' | 'Vanguard' | 'Support' | 'Flanker';
  x: number;
  z: number;
  worldX: number;
  worldZ: number;
  targetId?: string;
  targetName?: string;
  colorHex: string;
  rgb: [number, number, number];
  createdAtMs: number;
  durationMs: number;
}

export interface PvpCombatantTarget {
  id: string;
  name: string;
  classTitle: string;
  faction: 'hostile' | 'boss';
  hp: number;
  maxHp: number;
  stamina: number;
  ccState: 'NONE' | 'SUPER ARMOR' | 'FORWARD GUARD' | 'STAGGERED' | 'KNOCKED DOWN';
  x: number;
  z: number;
  threatRating: 'PRIMARY' | 'HIGH' | 'BOSS';
}

export interface SquadMemberStatus {
  id: string;
  name: string;
  role: 'Shotcaller' | 'Vanguard' | 'Support' | 'Flanker';
  classBadge: string;
  hp: number;
  maxHp: number;
  ultReady: boolean;
  distMeters: number;
  x: number;
  z: number;
}

export const TACTICAL_PING_SPECS: Record<
  TacticalPingKind,
  {
    kind: TacticalPingKind;
    shortTag: string;
    title: string;
    colorHex: string;
    rgb: [number, number, number];
    defaultDurationMs: number;
  }
> = {
  focus: {
    kind: 'focus',
    shortTag: 'FOCUS TARGET',
    title: 'Collapse & Focus Target Now',
    colorHex: '#FFD21E',
    rgb: [1.0, 0.82, 0.12],
    defaultDurationMs: 12000,
  },
  attack: {
    kind: 'attack',
    shortTag: 'ENGAGE / PUSH',
    title: 'Engage & Push Coordinate',
    colorHex: '#FF4D6D',
    rgb: [1.0, 0.25, 0.38],
    defaultDurationMs: 10000,
  },
  regroup: {
    kind: 'regroup',
    shortTag: 'REGROUP / HEAL',
    title: 'Stack on Anchor & Reset Cooldowns',
    colorHex: '#00E5A3',
    rgb: [0.0, 0.9, 0.64],
    defaultDurationMs: 10000,
  },
  danger: {
    kind: 'danger',
    shortTag: 'DANGER / PEEL',
    title: 'Enemy Bomb Incoming — Peel Backline',
    colorHex: '#F97316',
    rgb: [0.98, 0.45, 0.09],
    defaultDurationMs: 10000,
  },
};

export function createDefaultWidgets(preset: HudLayoutPresetId = 'default'): Record<HudWidgetId, HudWidgetPosition> {
  if (preset === 'pvp-centered') {
    return {
      actionBar: {
        id: 'actionBar',
        label: 'Skill Action Bar',
        offsetX: 0,
        offsetY: -48,
        scale: 1.08,
        opacity: 0.96,
        visible: true,
        orientation: 'horizontal',
      },
      playerVitals: {
        id: 'playerVitals',
        label: 'Hero HP & Stamina Bars',
        offsetX: 0,
        offsetY: 0,
        scale: 1.05,
        opacity: 0.98,
        visible: true,
      },
      bossTarget: {
        id: 'bossTarget',
        label: 'Boss / Primary Target Frame',
        offsetX: 0,
        offsetY: 18,
        scale: 1.0,
        opacity: 0.95,
        visible: true,
      },
      radarMinimap: {
        id: 'radarMinimap',
        label: 'Tactical Radar Minimap',
        offsetX: -12,
        offsetY: 16,
        scale: 1.05,
        opacity: 0.95,
        visible: true,
      },
      teamFightHud: {
        id: 'teamFightHud',
        label: 'PvP Squad & Focus Target Caller',
        offsetX: 16,
        offsetY: 0,
        scale: 1.0,
        opacity: 0.95,
        visible: true,
      },
      telemetryPill: {
        id: 'telemetryPill',
        label: 'FPS & Engine Telemetry',
        offsetX: 0,
        offsetY: 0,
        scale: 0.9,
        opacity: 0.85,
        visible: true,
      },
    };
  }

  if (preset === 'minimalist') {
    return {
      actionBar: {
        id: 'actionBar',
        label: 'Skill Action Bar',
        offsetX: 0,
        offsetY: 6,
        scale: 0.9,
        opacity: 0.82,
        visible: true,
        orientation: 'compact-2row',
      },
      playerVitals: {
        id: 'playerVitals',
        label: 'Hero HP & Stamina Bars',
        offsetX: 0,
        offsetY: 6,
        scale: 0.9,
        opacity: 0.85,
        visible: true,
      },
      bossTarget: {
        id: 'bossTarget',
        label: 'Boss / Primary Target Frame',
        offsetX: 0,
        offsetY: 0,
        scale: 0.9,
        opacity: 0.85,
        visible: true,
      },
      radarMinimap: {
        id: 'radarMinimap',
        label: 'Tactical Radar Minimap',
        offsetX: 0,
        offsetY: 0,
        scale: 0.9,
        opacity: 0.85,
        visible: true,
      },
      teamFightHud: {
        id: 'teamFightHud',
        label: 'PvP Squad & Focus Target Caller',
        offsetX: 0,
        offsetY: 0,
        scale: 0.9,
        opacity: 0.85,
        visible: true,
      },
      telemetryPill: {
        id: 'telemetryPill',
        label: 'FPS & Engine Telemetry',
        offsetX: 0,
        offsetY: 0,
        scale: 0.85,
        opacity: 0.75,
        visible: false,
      },
    };
  }

  // 'default' preset — positioned cleanly so Top Bar never overlaps Boss HP Bar or Radar Minimap
  return {
    actionBar: {
      id: 'actionBar',
      label: 'Skill Action Bar',
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      opacity: 0.95,
      visible: true,
      orientation: 'horizontal',
    },
    playerVitals: {
      id: 'playerVitals',
      label: 'Hero HP & Stamina Bars',
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      opacity: 0.95,
      visible: true,
    },
    bossTarget: {
      id: 'bossTarget',
      label: 'Boss / Primary Target Frame',
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      opacity: 0.95,
      visible: true,
    },
    radarMinimap: {
      id: 'radarMinimap',
      label: 'Tactical Radar Minimap',
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      opacity: 0.95,
      visible: true,
    },
    teamFightHud: {
      id: 'teamFightHud',
      label: 'PvP Squad & Focus Target Caller',
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      opacity: 0.95,
      visible: true,
    },
    telemetryPill: {
      id: 'telemetryPill',
      label: 'FPS & Engine Telemetry',
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      opacity: 0.9,
      visible: true,
    },
  };
}

export class PvpTacticalCoordinator {
  layout: HudLayoutState;
  pings: TacticalMapPing[] = [];
  squadMembers: SquadMemberStatus[];
  enemyTargets: PvpCombatantTarget[];
  focusedTargetId: string = 'sentinel-001';
  private pingCounter = 0;
  private listeners: Set<() => void> = new Set();

  static readonly STORAGE_KEY = 'dream_engine_hud_layout_v1';

  constructor() {
    this.layout = this.loadFromStorage() ?? {
      unlockDragging: false,
      snapToGrid: true,
      gridSizePx: 8,
      activePreset: 'default',
      shiftRightClickPingMode: 'focus',
      widgets: createDefaultWidgets('default'),
    };

    this.squadMembers = [
      {
        id: 'ally-1',
        name: 'YOU (Shotcaller)',
        role: 'Shotcaller',
        classBadge: 'WYRM-VANGUARD',
        hp: 100,
        maxHp: 100,
        ultReady: true,
        distMeters: 0,
        x: 0,
        z: -6.8,
      },
      {
        id: 'ally-2',
        name: 'Kaelen · Peel',
        role: 'Vanguard',
        classBadge: 'SOLARIS WARDEN',
        hp: 92,
        maxHp: 100,
        ultReady: true,
        distMeters: 6.4,
        x: -4.2,
        z: -8.5,
      },
      {
        id: 'ally-3',
        name: 'Lyra · Anchor',
        role: 'Support',
        classBadge: 'AETHER WEAVER',
        hp: 88,
        maxHp: 100,
        ultReady: false,
        distMeters: 9.1,
        x: 3.8,
        z: -3.2,
      },
      {
        id: 'ally-4',
        name: 'Vex · Flank',
        role: 'Flanker',
        classBadge: 'JADE STALKER',
        hp: 76,
        maxHp: 100,
        ultReady: true,
        distMeters: 12.8,
        x: 6.5,
        z: -11.4,
      },
    ];

    this.enemyTargets = [
      {
        id: 'sentinel-001',
        name: 'Hollow Sentinel Colossus',
        classTitle: 'Sanctuary World Boss · Focus Beam',
        faction: 'boss',
        hp: 120,
        maxHp: 120,
        stamina: 100,
        ccState: 'SUPER ARMOR',
        x: 0,
        z: -10,
        threatRating: 'BOSS',
      },
      {
        id: 'red-reaper-01',
        name: 'Malakor (Enemy Shotcaller)',
        classTitle: 'Nightveil Reaper · Backline Dive',
        faction: 'hostile',
        hp: 100,
        maxHp: 100,
        stamina: 78,
        ccState: 'FORWARD GUARD',
        x: -6.2,
        z: -13.5,
        threatRating: 'PRIMARY',
      },
      {
        id: 'red-archon-02',
        name: 'Seraphina (Enemy Healer)',
        classTitle: 'Solaris Warden · Aegis Pocket',
        faction: 'hostile',
        hp: 100,
        maxHp: 100,
        stamina: 64,
        ccState: 'NONE',
        x: 5.8,
        z: -14.0,
        threatRating: 'HIGH',
      },
    ];
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.saveToStorage();
    for (const fn of this.listeners) {
      fn();
    }
  }

  private loadFromStorage(): HudLayoutState | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(PvpTacticalCoordinator.STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<HudLayoutState>;
      if (!parsed || !parsed.widgets) return null;
      const defaults = createDefaultWidgets(parsed.activePreset || 'default');
      return {
        unlockDragging: Boolean(parsed.unlockDragging),
        snapToGrid: parsed.snapToGrid ?? true,
        gridSizePx: parsed.gridSizePx ?? 8,
        activePreset: parsed.activePreset || 'default',
        shiftRightClickPingMode: parsed.shiftRightClickPingMode || 'focus',
        widgets: {
          ...defaults,
          ...parsed.widgets,
        },
      };
    } catch {
      return null;
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(PvpTacticalCoordinator.STORAGE_KEY, JSON.stringify(this.layout));
    } catch {
      // Ignore storage quota errors in headless contexts
    }
  }

  setUnlockDragging(unlocked: boolean): void {
    this.layout.unlockDragging = unlocked;
    this.notify();
  }

  toggleUnlockDragging(): boolean {
    this.layout.unlockDragging = !this.layout.unlockDragging;
    this.notify();
    return this.layout.unlockDragging;
  }

  setShiftRightClickPingMode(kind: TacticalPingKind): void {
    this.layout.shiftRightClickPingMode = kind;
    this.notify();
  }

  applyLayoutPreset(preset: HudLayoutPresetId): void {
    this.layout.activePreset = preset;
    this.layout.widgets = createDefaultWidgets(preset);
    this.notify();
  }

  moveWidget(id: HudWidgetId, offsetX: number, offsetY: number): void {
    const w = this.layout.widgets[id];
    if (!w) return;
    const g = this.layout.snapToGrid ? Math.max(1, this.layout.gridSizePx) : 1;
    w.offsetX = Math.round(offsetX / g) * g;
    w.offsetY = Math.round(offsetY / g) * g;
    this.notify();
  }

  updateWidgetConfig(
    id: HudWidgetId,
    patch: Partial<Pick<HudWidgetPosition, 'offsetX' | 'offsetY' | 'scale' | 'opacity' | 'visible' | 'orientation'>>
  ): void {
    const w = this.layout.widgets[id];
    if (!w) return;
    if (patch.offsetX !== undefined) w.offsetX = Math.round(patch.offsetX);
    if (patch.offsetY !== undefined) w.offsetY = Math.round(patch.offsetY);
    if (patch.scale !== undefined) w.scale = Math.max(0.7, Math.min(1.4, Number(patch.scale.toFixed(2))));
    if (patch.opacity !== undefined) w.opacity = Math.max(0.3, Math.min(1.0, Number(patch.opacity.toFixed(2))));
    if (patch.visible !== undefined) w.visible = patch.visible;
    if (patch.orientation !== undefined) w.orientation = patch.orientation;
    this.notify();
  }

  /**
   * Shift + Right-Click Ping on Minimap, World Map, or 3D Viewport.
   * Automatically snaps to a nearby hostile/boss target within 3.5m if pinging 'focus' or 'attack'.
   */
  emitMapPing(
    x: number,
    z: number,
    kind: TacticalPingKind = this.layout.shiftRightClickPingMode,
    callerName = 'YOU (Shotcaller)',
    nowMs = Date.now()
  ): TacticalMapPing {
    this.pingCounter += 1;
    const spec = TACTICAL_PING_SPECS[kind] || TACTICAL_PING_SPECS.focus;

    let snappedTarget: PvpCombatantTarget | undefined;
    let bestDist = 4.0;
    for (const t of this.enemyTargets) {
      const d = Math.hypot(t.x - x, t.z - z);
      if (d < bestDist) {
        bestDist = d;
        snappedTarget = t;
      }
    }

    if (snappedTarget && (kind === 'focus' || kind === 'attack')) {
      this.focusedTargetId = snappedTarget.id;
    }

    const pingX = snappedTarget ? snappedTarget.x : Number(x.toFixed(1));
    const pingZ = snappedTarget ? snappedTarget.z : Number(z.toFixed(1));

    const label = snappedTarget
      ? `${spec.shortTag}: ${snappedTarget.name} [X:${pingX} Z:${pingZ}]`
      : `${spec.shortTag} @ [X:${pingX} Z:${pingZ}]`;

    const ping: TacticalMapPing = {
      id: `ping-${this.pingCounter}-${nowMs}`,
      kind,
      label,
      callerName,
      callerRole: 'Shotcaller',
      x: pingX,
      z: pingZ,
      worldX: pingX,
      worldZ: pingZ,
      targetId: snappedTarget?.id,
      targetName: snappedTarget?.name,
      colorHex: spec.colorHex,
      rgb: spec.rgb,
      createdAtMs: nowMs,
      durationMs: spec.defaultDurationMs,
    };

    this.pings = [ping, ...this.pings].slice(0, 8);
    this.notify();
    return ping;
  }

  clearPings(): void {
    this.pings = [];
    this.notify();
  }

  pruneExpiredPings(nowMs = Date.now()): void {
    const before = this.pings.length;
    this.pings = this.pings.filter((p) => nowMs - p.createdAtMs < p.durationMs);
    if (this.pings.length !== before) {
      this.notify();
    }
  }

  getFocusedTarget(): PvpCombatantTarget {
    return (
      this.enemyTargets.find((t) => t.id === this.focusedTargetId) ||
      this.enemyTargets[0]
    );
  }

  setFocusedTarget(targetId: string, emitFocusPing = false, nowMs = Date.now()): PvpCombatantTarget {
    const found = this.enemyTargets.find((t) => t.id === targetId) || this.enemyTargets[0];
    this.focusedTargetId = found.id;
    if (emitFocusPing) {
      this.emitMapPing(found.x, found.z, 'focus', 'YOU (Shotcaller)', nowMs);
    } else {
      this.notify();
    }
    return found;
  }

  cycleFocusTarget(emitFocusPing = true, nowMs = Date.now()): PvpCombatantTarget {
    const idx = this.enemyTargets.findIndex((t) => t.id === this.focusedTargetId);
    const next = this.enemyTargets[(idx + 1) % this.enemyTargets.length];
    return this.setFocusedTarget(next.id, emitFocusPing, nowMs);
  }

  /**
   * Synchronizes real-time boss HP/CC state and ally distance telemetry each frame.
   */
  syncLiveCombatState(
    playerPos: { x: number; y: number; z: number },
    playerHp: number,
    sentinelState: {
      health: number;
      isDown: boolean;
      isTelegraphing: boolean;
      isFiring: boolean;
    },
    nowMs = Date.now()
  ): void {
    this.pruneExpiredPings(nowMs);

    const boss = this.enemyTargets.find((t) => t.id === 'sentinel-001');
    if (boss) {
      boss.hp = Math.max(0, Math.round(sentinelState.health));
      boss.ccState = sentinelState.isDown
        ? 'KNOCKED DOWN'
        : sentinelState.isFiring
        ? 'SUPER ARMOR'
        : sentinelState.isTelegraphing
        ? 'FORWARD GUARD'
        : 'SUPER ARMOR';
    }

    if (this.squadMembers[0]) {
      this.squadMembers[0].hp = Math.max(0, Math.round(playerHp));
      this.squadMembers[0].x = Number(playerPos.x.toFixed(1));
      this.squadMembers[0].z = Number(playerPos.z.toFixed(1));
    }

    for (let i = 1; i < this.squadMembers.length; i++) {
      const m = this.squadMembers[i];
      m.distMeters = Number(Math.hypot(m.x - playerPos.x, m.z - playerPos.z).toFixed(1));
    }
  }

  // Ergonomic UI aliases for CombatHud, RadarMinimap, SettingsModal & Engine
  get activePingKind(): TacticalPingKind {
    return this.layout.shiftRightClickPingMode;
  }

  set activePingKind(kind: TacticalPingKind) {
    this.setShiftRightClickPingMode(kind);
  }

  get focusTarget(): { targetName: string; calledBy: string; healthPct: number } {
    const t = this.getFocusedTarget();
    return {
      targetName: t.name,
      calledBy: 'Shotcaller',
      healthPct: Math.round((t.hp / Math.max(1, t.maxHp)) * 100),
    };
  }

  get squad(): Array<{ id: string; name: string; role: string; hpPct: number }> {
    return this.squadMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      hpPct: Math.round((m.hp / Math.max(1, m.maxHp)) * 100),
    }));
  }

  getWidget(id: HudWidgetId): HudWidgetPosition {
    const w = this.layout.widgets[id];
    this.layout.locked = !this.layout.unlockDragging;
    this.layout.actionBarOrientation = this.layout.widgets.actionBar?.orientation || 'horizontal';
    return w;
  }

  setLocked(locked: boolean): void {
    this.layout.locked = locked;
    this.setUnlockDragging(!locked);
  }

  applyPreset(preset: HudLayoutPresetId): void {
    this.applyLayoutPreset(preset);
    this.layout.locked = !this.layout.unlockDragging;
    this.layout.actionBarOrientation = this.layout.widgets.actionBar?.orientation || 'horizontal';
  }

  resetLayout(): void {
    this.applyPreset('default');
  }

  setActionBarOrientation(ori: 'horizontal' | 'vertical' | 'compact-2row'): void {
    this.layout.actionBarOrientation = ori;
    this.updateWidgetConfig('actionBar', { orientation: ori });
  }

  moveWidgetByDelta(id: HudWidgetId, dx: number, dy: number): void {
    const w = this.layout.widgets[id];
    if (!w) return;
    this.moveWidget(id, w.offsetX + dx, w.offsetY + dy);
  }

  triggerShiftRightClickPing(opts: {
    worldX: number;
    worldZ: number;
    kind?: TacticalPingKind;
    senderName?: string;
    targetEntityName?: string;
    nowSec?: number;
  }): TacticalMapPing {
    const p = this.emitMapPing(
      opts.worldX,
      opts.worldZ,
      opts.kind || this.layout.shiftRightClickPingMode,
      opts.senderName || 'YOU (Shotcaller)',
      opts.nowSec !== undefined ? opts.nowSec * 1000 : Date.now()
    );
    if (opts.targetEntityName) {
      p.targetName = opts.targetEntityName;
      p.label = `${p.kind.toUpperCase()}: ${opts.targetEntityName}`;
    }
    return p;
  }
}
