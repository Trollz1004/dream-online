/**
 * DREAM Engine — Action-MMORPG Character Archetypes, Dreamforge 43-Style Forge &
 * Real-Time 3D Combat Skill Visuals (100% Clean-Room World-Native Design)
 *
 * 100% Built In-House with Google Gemini — Zero Box Primitives
 */

import { CharacterDesignConfig, WorldShaderConfig } from '../studioConfig.ts';

export type ActionMmoClassId =
  | 'crimson-vanguard'
  | 'nightveil-reaper'
  | 'solaris-warden'
  | 'jade-stalker';

export type SkillVfxThemeId =
  | 'ember-wyrm-crimson'
  | 'nightveil-abyss'
  | 'celestial-aether-gold'
  | 'venom-shadow-jade';

export interface ActionMmoClassProfile {
  id: ActionMmoClassId;
  name: string;
  title: string;
  inspirationNote: string;
  weaponName: string;
  awakeningWeaponName: string;
  defaultVfxTheme: SkillVfxThemeId;
  defaultDreamforgeStyle: string;
  characterConfig: Partial<CharacterDesignConfig>;
  skillNames: {
    l1: string;
    l2: string;
    l3: string;
    heavy: string;
    lunge: string;
    burst: string;
    dash: string;
    guard: string;
  };
}

export interface SkillVfxThemePalette {
  id: SkillVfxThemeId;
  name: string;
  badge: string;
  primarySlashRgb: [number, number, number];
  secondaryCoreRgb: [number, number, number];
  shockwaveRgb: [number, number, number];
  lightningPillarRgb: [number, number, number];
  phantomCloneRgb: [number, number, number];
  aegisShieldRgb: [number, number, number];
  cssAccentHex: string;
  cssGlowHex: string;
}

export const SKILL_VFX_THEMES: Record<SkillVfxThemeId, SkillVfxThemePalette> = {
  'ember-wyrm-crimson': {
    id: 'ember-wyrm-crimson',
    name: 'Ember-Wyrm Sovereign (Molten Crimson & Solar Gold)',
    badge: 'EMBER WYRM AWAKENING',
    primarySlashRgb: [1.0, 0.24, 0.12],
    secondaryCoreRgb: [1.0, 0.82, 0.22],
    shockwaveRgb: [1.0, 0.48, 0.14],
    lightningPillarRgb: [1.0, 0.72, 0.18],
    phantomCloneRgb: [0.95, 0.28, 0.18],
    aegisShieldRgb: [1.0, 0.78, 0.22],
    cssAccentHex: '#EF4444',
    cssGlowHex: '#F59E0B',
  },
  'nightveil-abyss': {
    id: 'nightveil-abyss',
    name: 'Nightveil 100% Awakening (Abyssal Crimson-Violet)',
    badge: 'NIGHTVEIL AWAKENING',
    primarySlashRgb: [0.96, 0.16, 0.38],
    secondaryCoreRgb: [0.72, 0.22, 1.0],
    shockwaveRgb: [0.85, 0.18, 0.95],
    lightningPillarRgb: [1.0, 0.15, 0.42],
    phantomCloneRgb: [0.58, 0.18, 0.95],
    aegisShieldRgb: [0.78, 0.35, 1.0],
    cssAccentHex: '#F43F5E',
    cssGlowHex: '#A855F7',
  },
  'celestial-aether-gold': {
    id: 'celestial-aether-gold',
    name: 'Celestial Solaris Aether (Solar Gold & Starlight Cyan)',
    badge: 'SACRED AETHER',
    primarySlashRgb: [1.0, 0.86, 0.25],
    secondaryCoreRgb: [0.15, 0.92, 1.0],
    shockwaveRgb: [1.0, 0.88, 0.35],
    lightningPillarRgb: [0.22, 0.95, 1.0],
    phantomCloneRgb: [0.25, 0.88, 1.0],
    aegisShieldRgb: [1.0, 0.9, 0.35],
    cssAccentHex: '#FACC15',
    cssGlowHex: '#22D3EE',
  },
  'venom-shadow-jade': {
    id: 'venom-shadow-jade',
    name: 'Blood-Moon Shadow Tempest (Emerald Jade & Crimson)',
    badge: 'SHADOW TEMPEST',
    primarySlashRgb: [0.12, 0.98, 0.64],
    secondaryCoreRgb: [0.95, 0.18, 0.35],
    shockwaveRgb: [0.15, 0.92, 0.58],
    lightningPillarRgb: [0.1, 1.0, 0.72],
    phantomCloneRgb: [0.08, 0.82, 0.55],
    aegisShieldRgb: [0.18, 0.95, 0.68],
    cssAccentHex: '#10B981',
    cssGlowHex: '#F43F5E',
  },
};

export const ACTION_MMO_CLASSES: Record<ActionMmoClassId, ActionMmoClassProfile> = {
  'crimson-vanguard': {
    id: 'crimson-vanguard',
    name: 'Crimson Wyrm-Vanguard',
    title: 'Evolving Wyrm-Blade & Sovereign Greatsword Champion',
    inspirationNote: 'World-native heavy plate sovereign knight wielding molten dragon-fire arcs and tectonic slams',
    weaponName: 'Evolving Wyrm Twin-Blade',
    awakeningWeaponName: 'Dragon-Fang Inferno Greatsword',
    defaultVfxTheme: 'ember-wyrm-crimson',
    defaultDreamforgeStyle: 'stylized-semi-real-3d-game',
    characterConfig: {
      armorColorDay: [0.24, 0.26, 0.32],
      armorColorNight: [0.16, 0.18, 0.24],
      visorColorDay: [1.0, 0.45, 0.14],
      visorColorNight: [1.0, 0.28, 0.24],
      bladeColorDay: [1.0, 0.36, 0.14],
      bladeColorNight: [1.0, 0.24, 0.32],
      armorMetallic: 0.88,
      armorRoughness: 0.22,
      visorGlowIntensity: 2.2,
      avatarScale: 1.06,
    },
    skillNames: {
      l1: 'Wyrm-Fang Cleave I',
      l2: 'Crimson Twin-Arc II',
      l3: 'Sovereign Flame-Whirlwind III',
      heavy: 'Earthshaker Wyrm Slam',
      lunge: 'Breath of Evolving Flame (W+F)',
      burst: '100% Sovereign Cataclysm (R)',
      dash: 'Shadow-Scale Step (I-Frame)',
      guard: 'Dragon-Wall Aegis (75% Block)',
    },
  },
  'nightveil-reaper': {
    id: 'nightveil-reaper',
    name: 'Nightveil Phantom-Reaper',
    title: 'Abyssal Phantom Blades & Dusk Rift Sovereign',
    inspirationNote: 'World-native Nightfall spellblade channeling abyssal rifts and twin phantom greatswords',
    weaponName: 'Kriegsmesser of Twilight',
    awakeningWeaponName: 'Nightveil Twin Phantom-Blades',
    defaultVfxTheme: 'nightveil-abyss',
    defaultDreamforgeStyle: 'tenebrist-painterly',
    characterConfig: {
      armorColorDay: [0.18, 0.15, 0.26],
      armorColorNight: [0.12, 0.09, 0.20],
      visorColorDay: [0.78, 0.25, 1.0],
      visorColorNight: [0.95, 0.18, 0.55],
      bladeColorDay: [0.85, 0.22, 1.0],
      bladeColorNight: [1.0, 0.15, 0.48],
      armorMetallic: 0.84,
      armorRoughness: 0.24,
      visorGlowIntensity: 2.4,
      avatarScale: 1.02,
    },
    skillNames: {
      l1: 'Nightveil Crescent Slash I',
      l2: 'Dusk-Reaper Cross-Arc II',
      l3: 'Abyssal Vortex Finale III',
      heavy: 'Obliteration Rift Cleave',
      lunge: 'Twilight Phantom Stinger (W+F)',
      burst: 'Nightveil 100%: Abyssal Cataclysm (R)',
      dash: 'Rift-Haze Phantom Step (I-Frame)',
      guard: 'Nocturne Dark Aegis (75% Block)',
    },
  },
  'solaris-warden': {
    id: 'solaris-warden',
    name: 'Solaris Aegis-Warden',
    title: 'Solar Great-Lance & First Gate Sanctuary Guardian',
    inspirationNote: 'World-native First Gate paladin wielding starlight lances and golden sanctuary shields',
    weaponName: 'First Gate Starlight Longsword',
    awakeningWeaponName: 'Solaris Great-Lance & Aegis',
    defaultVfxTheme: 'celestial-aether-gold',
    defaultDreamforgeStyle: 'commercial-game-painterly',
    characterConfig: {
      armorColorDay: [0.72, 0.68, 0.58],
      armorColorNight: [0.24, 0.34, 0.48],
      visorColorDay: [1.0, 0.85, 0.22],
      visorColorNight: [0.18, 0.92, 1.0],
      bladeColorDay: [1.0, 0.88, 0.28],
      bladeColorNight: [0.25, 0.95, 1.0],
      armorMetallic: 0.92,
      armorRoughness: 0.18,
      visorGlowIntensity: 2.1,
      avatarScale: 1.04,
    },
    skillNames: {
      l1: 'Blade of Judgment I',
      l2: 'Radiant Solaris Arc II',
      l3: 'Celestial Verdict III',
      heavy: 'Sanctuary Earthshaker Slam',
      lunge: 'Starlight Lance Charge (W+F)',
      burst: 'Solaris 100%: Starfall Nova (R)',
      dash: 'Light-Wing Evasion (I-Frame)',
      guard: 'Sanctuary Heaven Shield (75%)',
    },
  },
  'jade-stalker': {
    id: 'jade-stalker',
    name: 'Blood-Moon Shadow-Stalker',
    title: 'Six-Fold Jade Katanas & Mirage Executioner',
    inspirationNote: 'World-native high-agility shadow assassin weaving emerald blade hurricanes and mirage clones',
    weaponName: 'Emerald Fang Katar',
    awakeningWeaponName: 'Six-Fold Shadow Katanas',
    defaultVfxTheme: 'venom-shadow-jade',
    defaultDreamforgeStyle: 'high-contrast-neon',
    characterConfig: {
      armorColorDay: [0.14, 0.20, 0.18],
      armorColorNight: [0.08, 0.14, 0.12],
      visorColorDay: [0.12, 0.98, 0.64],
      visorColorNight: [1.0, 0.18, 0.36],
      bladeColorDay: [0.15, 1.0, 0.68],
      bladeColorNight: [0.12, 0.98, 0.64],
      armorMetallic: 0.78,
      armorRoughness: 0.26,
      visorGlowIntensity: 2.3,
      avatarScale: 1.0,
    },
    skillNames: {
      l1: 'Phantom Katar Cut I',
      l2: 'Emerald Cross-Slash II',
      l3: 'Six-Fold Jade Tempest III',
      heavy: 'Serpent Ascension Execution',
      lunge: 'Ghost Step: Heart-Seeker (W+F)',
      burst: 'Blood-Moon Tempest Lotus (R)',
      dash: 'Silent Mirage I-Frame',
      guard: 'Blade-Spin Parry (75% Block)',
    },
  },
};

export interface DreamforgeModeSpec {
  id: string;
  label: string;
  emoji: string;
  sub: string;
  engineMapping: string;
}

export const DREAMFORGE_MODES: DreamforgeModeSpec[] = [
  { id: 'world-seed', label: 'World Seed', emoji: '🔮', sub: 'One sentence in, one world out.', engineMapping: 'Procedural World & Character Lore Generator' },
  { id: 'ip-jump', label: 'Archetype Jump', emoji: '🚪', sub: 'Step into a dark-fantasy realm you love.', engineMapping: 'Action-MMO Archetype & Skill Remapper' },
  { id: 'world-map', label: 'World Map', emoji: '🗺️', sub: 'Draw a line, nations and boss citadels rise.', engineMapping: 'REA Procedural City & Overworld Sector Builder' },
  { id: 'pov-video', label: 'POV Video', emoji: '🎬', sub: 'Shoot one action combo, generate a <=59s Short.', engineMapping: 'YouTube Shorts <=59s Combat & Female TTS Trailer' },
  { id: 'roleplay', label: 'Roleplay', emoji: '🎭', sub: 'One character. Live AI voice & combat soul.', engineMapping: 'Live NPC Lab (:9127) & Sup@ / GeminEYE Companion' },
  { id: 'pixel-room', label: 'Pixel Room / 16-Bit Circles', emoji: '🧱', sub: 'Morph into 16-Bit Circle-Craft radial sanctuaries.', engineMapping: '16-Bit Circle-Craft (RGB565 Cylindrical Voxel Morph)' },
  { id: 'scroll-world', label: 'Scroll World', emoji: '📜', sub: 'Endless Nightfall abyssal dungeon progression.', engineMapping: 'Nightfall Escalation & Boss Gauntlet Director' },
];

export const DREAMFORGE_SKILLS: string[] = [
  'Map & Geography',
  'Character Creation',
  'Dialogue Engine',
  'Combat System',
  'Magic System',
  'Factions & Politics',
  'Lore & History',
  'Weather & Ecology',
  'Music & Ambience',
  'Camera & Cinematics',
  'Economy & Trade',
  'Lighting & Atmosphere',
  'Procedural Events',
];

export const DREAMFORGE_STYLES: string[] = [
  'aged-paper-painting','american-comics','animation-sketch','anime-cel-painted-key-art',
  'bold-line-comic','broad-brush-painting','cel-shaded-3d-game','cel-shading',
  'clean-black-and-white-manga','clean-line-anime','commercial-game-painterly','crayon-watercolor',
  'east-asian-grace-3d-animation','east-asian-style-acg','flat-webtoon','grainy-print',
  'graphic-color-block','high-contrast-manga-ink','high-contrast-neon','idol-semi-3d-painterly',
  'ink-gesture-wash','journal-doodle','line-scribble','marker-style',
  'minimal-geometric-graphic','monochrome-ink-wash','pixel-art','realistic-3d-render',
  'retro-halftone-comic','rough-ink-print','semi-realistic-painterly','soft-edge-pastel-airbrush',
  'soft-flat-color','soft-polished-webtoon','soft-tone-brushwork','stop-motion-animation',
  'structure-flat-cel','stuffed-plush-rendering','stylized-semi-real-3d-game','tenebrist-painterly',
  'three-color-cutout-graphic','toy-figure-rendering','watercolor-sketch',
];

export interface Active3DSlashRibbon {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitchRad: number;
  rollRad: number;
  scale: number;
  colorRgb: [number, number, number];
  coreRgb: [number, number, number];
  elapsed: number;
  duration: number;
  spinSpeedRadPerSec: number;
}

export interface Active3DShockwaveRing {
  id: string;
  x: number;
  y: number;
  z: number;
  startScale: number;
  endScale: number;
  colorRgb: [number, number, number];
  elapsed: number;
  duration: number;
}

export interface Active3DPillarSpike {
  id: string;
  x: number;
  y: number;
  z: number;
  orbitCenterX: number;
  orbitCenterZ: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  maxScaleY: number;
  colorRgb: [number, number, number];
  elapsed: number;
  duration: number;
}

export interface Active3DPhantomClone {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  colorRgb: [number, number, number];
  elapsed: number;
  duration: number;
}

export interface Active3DParticle {
  id: string;
  kind: 'spark' | 'ember' | 'dust' | 'impact-flash';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  scale: number;
  colorRgb: [number, number, number];
  emissiveIntensity: number;
  elapsed: number;
  duration: number;
}

export interface CombatCalloutFloater {
  id: string;
  skillTitle: string;
  tag: 'CRITICAL!' | 'BACK ATTACK!' | 'DOWN ATTACK!' | 'AWAKENING 100%!' | 'PERFECT I-FRAME!' | 'AEGIS GUARD 75%!';
  comboCount: number;
  accentHex: string;
  glowHex: string;
  createdAt: number;
}

export class SkillVfxDirector {
  activeClassId: ActionMmoClassId = 'crimson-vanguard';
  activeThemeId: SkillVfxThemeId = 'ember-wyrm-crimson';
  activeDreamforgeMode: string = 'ip-jump';
  activeDreamforgeStyle: string = 'stylized-semi-real-3d-game';

  slashRibbons: Active3DSlashRibbon[] = [];
  shockwaveRings: Active3DShockwaveRing[] = [];
  pillarSpikes: Active3DPillarSpike[] = [];
  phantomClones: Active3DPhantomClone[] = [];
  particles: Active3DParticle[] = [];
  callouts: CombatCalloutFloater[] = [];

  comboChainCount = 0;
  private comboResetTimer = 0;
  private prevAttackStep = 0;
  private prevHeavyActive = false;
  private prevLungeActive = false;
  private prevBurstActive = false;
  private prevDashActive = false;
  private prevGuardActive = false;
  private deterministicSeed = 1337;

  /**
   * Deterministic pseudo-random generator in [0, 1) so particle bursts and screenshots
   * are 100% reproducible across fixed-timestep captures.
   */
  private nextRand(): number {
    this.deterministicSeed = (this.deterministicSeed * 1664525 + 1013904223) >>> 0;
    return (this.deterministicSeed & 0xfffffff) / 0x10000000;
  }

  resetDeterministicState(seed = 1337): void {
    this.deterministicSeed = seed;
    this.slashRibbons = [];
    this.shockwaveRings = [];
    this.pillarSpikes = [];
    this.phantomClones = [];
    this.particles = [];
    this.callouts = [];
    this.comboChainCount = 0;
    this.comboResetTimer = 0;
  }

  get currentClass(): ActionMmoClassProfile {
    return ACTION_MMO_CLASSES[this.activeClassId];
  }

  get currentTheme(): SkillVfxThemePalette {
    return SKILL_VFX_THEMES[this.activeThemeId];
  }

  setClassAndTheme(
    classId: ActionMmoClassId,
    themeId?: SkillVfxThemeId,
    dreamforgeStyle?: string
  ): { characterPatch: Partial<CharacterDesignConfig>; shaderPatch: Partial<WorldShaderConfig> } {
    const profile = ACTION_MMO_CLASSES[classId] || ACTION_MMO_CLASSES['crimson-vanguard'];
    this.activeClassId = profile.id;
    this.activeThemeId = (themeId && SKILL_VFX_THEMES[themeId] ? themeId : profile.defaultVfxTheme);
    if (dreamforgeStyle) {
      this.activeDreamforgeStyle = dreamforgeStyle;
    } else {
      this.activeDreamforgeStyle = profile.defaultDreamforgeStyle;
    }

    const theme = this.currentTheme;
    const styleHash = this.activeDreamforgeStyle
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    const rimBoost = this.activeDreamforgeStyle.includes('cel') || this.activeDreamforgeStyle.includes('neon')
      ? 0.85
      : 0.68;

    const characterPatch: Partial<CharacterDesignConfig> = {
      ...profile.characterConfig,
      bladeColorDay: [...theme.primarySlashRgb] as [number, number, number],
      bladeColorNight: [...theme.secondaryCoreRgb] as [number, number, number],
      visorColorDay: [...theme.secondaryCoreRgb] as [number, number, number],
      visorColorNight: [...theme.primarySlashRgb] as [number, number, number],
    };

    const shaderPatch: Partial<WorldShaderConfig> = {
      rimIntensity: rimBoost,
      exposure: 1.0 + ((styleHash % 10) / 100),
    };

    return { characterPatch, shaderPatch };
  }

  private pushCallout(
    skillTitle: string,
    tag: CombatCalloutFloater['tag']
  ): void {
    this.comboChainCount += 1;
    this.comboResetTimer = 4.5;
    const theme = this.currentTheme;
    const floater: CombatCalloutFloater = {
      id: `vfx-callout-${this.comboChainCount}-${Math.floor(this.nextRand() * 9999)}`,
      skillTitle,
      tag,
      comboCount: this.comboChainCount,
      accentHex: theme.cssAccentHex,
      glowHex: theme.cssGlowHex,
      createdAt: Date.now(),
    };
    this.callouts = [floater, ...this.callouts].slice(0, 6);
  }

  /**
   * Spawns 3D sandstone/earth dust puffs behind the sprinting hero's boots.
   */
  spawnSprintDustParticles(x: number, y: number, z: number, count = 3): void {
    for (let i = 0; i < count; i++) {
      const rx = (this.nextRand() - 0.5) * 0.65;
      const rz = 0.25 + this.nextRand() * 0.55;
      this.particles.push({
        id: `dust-${this.particles.length}-${this.nextRand()}`,
        kind: 'dust',
        x: x + rx,
        y: y + 0.08 + this.nextRand() * 0.14,
        z: z + rz,
        vx: (this.nextRand() - 0.5) * 0.9,
        vy: 0.65 + this.nextRand() * 0.85,
        vz: 1.4 + this.nextRand() * 1.2,
        gravity: -0.8,
        scale: 0.18 + this.nextRand() * 0.16,
        colorRgb: [0.68, 0.58, 0.46],
        emissiveIntensity: 0.25,
        elapsed: 0,
        duration: 0.48 + this.nextRand() * 0.25,
      });
    }
    if (this.particles.length > 140) {
      this.particles.splice(0, this.particles.length - 140);
    }
  }

  /**
   * Spawns high-velocity 3D GPU spark & ember particles + a bright impact flash starburst on the boss.
   */
  spawnImpactSparks(
    targetX: number,
    targetY: number,
    targetZ: number,
    count = 20,
    isHeavyOrUlt = false
  ): void {
    const theme = this.currentTheme;
    // Central impact flash burst on the boss torso
    this.particles.push({
      id: `impact-flash-${this.nextRand()}`,
      kind: 'impact-flash',
      x: targetX,
      y: targetY,
      z: targetZ + 0.45,
      vx: 0,
      vy: 0,
      vz: 0,
      gravity: 0,
      scale: isHeavyOrUlt ? 1.15 : 0.78,
      colorRgb: [1.0, 0.92, 0.65],
      emissiveIntensity: 2.8,
      elapsed: 0,
      duration: isHeavyOrUlt ? 0.28 : 0.20,
    });

    for (let i = 0; i < count; i++) {
      const theta = this.nextRand() * Math.PI * 2;
      const speed = (isHeavyOrUlt ? 4.5 : 3.0) + this.nextRand() * 4.2;
      const vy = 2.0 + this.nextRand() * 4.5;
      const useCore = i % 2 === 0;
      this.particles.push({
        id: `spark-${i}-${this.nextRand()}`,
        kind: isHeavyOrUlt && i % 3 === 0 ? 'ember' : 'spark',
        x: targetX + (this.nextRand() - 0.5) * 0.6,
        y: targetY + (this.nextRand() - 0.5) * 0.5,
        z: targetZ + 0.35 + (this.nextRand() - 0.5) * 0.4,
        vx: Math.cos(theta) * speed,
        vy,
        vz: Math.sin(theta) * speed,
        gravity: -9.8,
        scale: (isHeavyOrUlt ? 0.14 : 0.10) + this.nextRand() * 0.09,
        colorRgb: useCore ? theme.secondaryCoreRgb : theme.primarySlashRgb,
        emissiveIntensity: 2.4,
        elapsed: 0,
        duration: 0.38 + this.nextRand() * 0.34,
      });
    }

    if (this.particles.length > 140) {
      this.particles.splice(0, this.particles.length - 140);
    }
  }

  spawnLightSlashVfx(step: number, x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;
    const s = Math.max(1, Math.min(3, step)) as 1 | 2 | 3;

    const roll = s === 1 ? -0.42 : s === 2 ? 0.46 : 0.16;
    const spin = s === 1 ? 6.5 : s === 2 ? -7.5 : 12.0;

    this.slashRibbons.push({
      id: `slash-l${s}-${this.nextRand()}`,
      x,
      y: y + 1.18,
      z,
      yaw,
      pitchRad: 0.12,
      rollRad: roll,
      scale: s === 3 ? 1.48 : 1.18,
      colorRgb: theme.primarySlashRgb,
      coreRgb: theme.secondaryCoreRgb,
      elapsed: 0,
      duration: s === 3 ? 0.62 : 0.48,
      spinSpeedRadPerSec: spin,
    });

    if (s === 3) {
      this.slashRibbons.push({
        id: `slash-l3b-${this.nextRand()}`,
        x,
        y: y + 0.96,
        z,
        yaw: yaw + Math.PI * 0.35,
        pitchRad: -0.14,
        rollRad: -0.38,
        scale: 1.56,
        colorRgb: theme.secondaryCoreRgb,
        coreRgb: theme.primarySlashRgb,
        elapsed: 0,
        duration: 0.65,
        spinSpeedRadPerSec: -14.0,
      });

      this.shockwaveRings.push({
        id: `ring-l3-${this.nextRand()}`,
        x,
        y: y + 0.06,
        z,
        startScale: 0.65,
        endScale: 2.45,
        colorRgb: theme.shockwaveRgb,
        elapsed: 0,
        duration: 0.58,
      });
    }

    const fwdX = -Math.sin(yaw) * 2.2;
    const fwdZ = -Math.cos(yaw) * 2.2;
    this.spawnImpactSparks(x + fwdX, y + 1.35, z + fwdZ, s === 3 ? 24 : 14, s === 3);

    const title = s === 1 ? cls.skillNames.l1 : s === 2 ? cls.skillNames.l2 : cls.skillNames.l3;
    this.pushCallout(title, s === 3 ? 'CRITICAL!' : 'BACK ATTACK!');
  }

  spawnHeavyCleaveVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;

    // Giant overhead cleave arc + wide horizontal cross-arc
    this.slashRibbons.push(
      {
        id: `heavy-v1-${this.nextRand()}`,
        x,
        y: y + 1.38,
        z,
        yaw,
        pitchRad: 0.22,
        rollRad: 1.15,
        scale: 1.72,
        colorRgb: theme.primarySlashRgb,
        coreRgb: theme.secondaryCoreRgb,
        elapsed: 0,
        duration: 0.75,
        spinSpeedRadPerSec: 4.5,
      },
      {
        id: `heavy-v2-${this.nextRand()}`,
        x,
        y: y + 0.95,
        z,
        yaw,
        pitchRad: 0.05,
        rollRad: -0.18,
        scale: 1.62,
        colorRgb: theme.secondaryCoreRgb,
        coreRgb: theme.primarySlashRgb,
        elapsed: 0,
        duration: 0.72,
        spinSpeedRadPerSec: -8.0,
      }
    );

    // Expanding ground-shatter shockwave ring
    this.shockwaveRings.push({
      id: `heavy-ring-${this.nextRand()}`,
      x: x - Math.sin(yaw) * 1.8,
      y: y + 0.06,
      z: z - Math.cos(yaw) * 1.8,
      startScale: 0.6,
      endScale: 3.1,
      colorRgb: theme.shockwaveRgb,
      elapsed: 0,
      duration: 0.78,
    });

    // 5 Erupting Tectonic Spikes radiating along the forward slam line toward the boss
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    for (let i = 1; i <= 5; i++) {
      const dist = 0.9 + i * 0.75;
      const lateral = (i % 2 === 0 ? 1 : -1) * (i * 0.18);
      this.pillarSpikes.push({
        id: `heavy-spike-${i}-${this.nextRand()}`,
        x: x + fwdX * dist + lateral,
        y,
        z: z + fwdZ * dist,
        orbitCenterX: x + fwdX * dist + lateral,
        orbitCenterZ: z + fwdZ * dist,
        orbitRadius: 0,
        orbitAngle: i * 0.7,
        orbitSpeed: 0,
        maxScaleY: 0.78 + i * 0.18,
        colorRgb: i % 2 === 0 ? theme.lightningPillarRgb : theme.primarySlashRgb,
        elapsed: 0,
        duration: 0.72 + i * 0.05,
      });
    }

    this.spawnImpactSparks(x + fwdX * 2.4, y + 1.45, z + fwdZ * 2.4, 30, true);
    this.pushCallout(cls.skillNames.heavy, 'DOWN ATTACK!');
  }

  spawnDreamLungeVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);

    for (let i = 0; i < 3; i++) {
      const stepDist = i * 1.25;
      this.phantomClones.push({
        id: `lunge-clone-${i}-${this.nextRand()}`,
        x: x + fwdX * stepDist,
        y,
        z: z + fwdZ * stepDist,
        yaw,
        colorRgb: theme.phantomCloneRgb,
        elapsed: 0,
        duration: 0.55 + i * 0.12,
      });
    }

    this.slashRibbons.push({
      id: `lunge-arc-${this.nextRand()}`,
      x: x + fwdX * 1.8,
      y: y + 1.12,
      z: z + fwdZ * 1.8,
      yaw,
      pitchRad: 0.30,
      rollRad: 0.0,
      scale: 1.55,
      colorRgb: theme.secondaryCoreRgb,
      coreRgb: theme.primarySlashRgb,
      elapsed: 0,
      duration: 0.62,
      spinSpeedRadPerSec: 18.0,
    });

    this.shockwaveRings.push({
      id: `lunge-ring-${this.nextRand()}`,
      x,
      y: y + 0.06,
      z,
      startScale: 0.5,
      endScale: 2.3,
      colorRgb: theme.secondaryCoreRgb,
      elapsed: 0,
      duration: 0.55,
    });

    this.spawnImpactSparks(x + fwdX * 2.2, y + 1.35, z + fwdZ * 2.2, 20, false);
    this.pushCallout(cls.skillNames.lunge, 'CRITICAL!');
  }

  spawnNightveilBurstVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    const centerX = x + fwdX * 1.8;
    const centerZ = z + fwdZ * 1.8;

    // 2 Concentric Expanding Awakening Shockwave Rings
    this.shockwaveRings.push(
      {
        id: `burst-ring1-${this.nextRand()}`,
        x: centerX,
        y: y + 0.06,
        z: centerZ,
        startScale: 0.8,
        endScale: 4.2,
        colorRgb: theme.shockwaveRgb,
        elapsed: 0,
        duration: 1.15,
      },
      {
        id: `burst-ring2-${this.nextRand()}`,
        x: centerX,
        y: y + 0.42,
        z: centerZ,
        startScale: 0.5,
        endScale: 3.2,
        colorRgb: theme.secondaryCoreRgb,
        elapsed: 0,
        duration: 1.05,
      }
    );

    // 3 Swirling Awakening Blade Hurricanes
    for (let k = 0; k < 3; k++) {
      this.slashRibbons.push({
        id: `burst-hurricane-${k}-${this.nextRand()}`,
        x,
        y: y + 0.78 + k * 0.48,
        z,
        yaw: yaw + (k * Math.PI * 2) / 3,
        pitchRad: (k - 1) * 0.22,
        rollRad: (k - 1) * 0.35,
        scale: 1.75 + k * 0.22,
        colorRgb: k % 2 === 0 ? theme.primarySlashRgb : theme.secondaryCoreRgb,
        coreRgb: theme.lightningPillarRgb,
        elapsed: 0,
        duration: 1.10,
        spinSpeedRadPerSec: (k % 2 === 0 ? 1 : -1) * 16.0,
      });
    }

    // 8 Orbiting Awakening Flame / Lightning Pillars around the combat impact center
    const pillarCount = 8;
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const radius = 3.1;
      this.pillarSpikes.push({
        id: `burst-pillar-${i}-${this.nextRand()}`,
        x: centerX + Math.cos(angle) * radius,
        y,
        z: centerZ + Math.sin(angle) * radius,
        orbitCenterX: centerX,
        orbitCenterZ: centerZ,
        orbitRadius: radius,
        orbitAngle: angle,
        orbitSpeed: 2.6,
        maxScaleY: 1.45 + (i % 2) * 0.35,
        colorRgb: i % 2 === 0 ? theme.lightningPillarRgb : theme.secondaryCoreRgb,
        elapsed: 0,
        duration: 1.15,
      });
    }

    this.spawnImpactSparks(centerX, y + 1.55, centerZ, 44, true);
    this.pushCallout(cls.skillNames.burst, 'AWAKENING 100%!');
  }

  spawnDashPhantomVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;

    this.phantomClones.push({
      id: `dash-phantom-${this.nextRand()}`,
      x,
      y,
      z,
      yaw,
      colorRgb: theme.phantomCloneRgb,
      elapsed: 0,
      duration: 0.52,
    });

    this.shockwaveRings.push({
      id: `dash-ring-${this.nextRand()}`,
      x,
      y: y + 0.05,
      z,
      startScale: 0.45,
      endScale: 1.65,
      colorRgb: theme.secondaryCoreRgb,
      elapsed: 0,
      duration: 0.45,
    });

    this.spawnSprintDustParticles(x, y, z, 6);
    this.pushCallout(cls.skillNames.dash, 'PERFECT I-FRAME!');
  }

  spawnGuardAegisVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;
    this.shockwaveRings.push({
      id: `guard-ring-${this.nextRand()}`,
      x,
      y: y + 0.05,
      z,
      startScale: 0.65,
      endScale: 1.65,
      colorRgb: theme.aegisShieldRgb,
      elapsed: 0,
      duration: 0.48,
    });
    this.pushCallout(cls.skillNames.guard, 'AEGIS GUARD 75%!');
  }

  /**
   * Fires a full Awakening Combo Showcase in the 3D scene.
   */
  triggerAwakeningComboShowcase(x: number, y: number, z: number, yaw: number): void {
    this.spawnLightSlashVfx(1, x, y, z, yaw);
    this.spawnLightSlashVfx(3, x, y, z, yaw + 0.35);
    this.spawnHeavyCleaveVfx(x, y, z, yaw);
    this.spawnDreamLungeVfx(x, y, z, yaw);
    this.spawnNightveilBurstVfx(x, y, z, yaw);
  }

  /**
   * Synchronizes with authoritative CombatManager state transitions each frame
   * and advances all active 3D skill VFX meshes & GPU particles.
   */
  update(
    dt: number,
    playerPos: { x: number; y: number; z: number },
    playerYaw: number,
    combatState: {
      attackStep: number;
      isAttacking: boolean;
      isHeavy: boolean;
      isLunging: boolean;
      isBursting: boolean;
      isDashing: boolean;
      isGuarding: boolean;
    }
  ): void {
    const curStep = combatState.isAttacking ? combatState.attackStep : 0;
    if (curStep > 0 && curStep !== this.prevAttackStep) {
      this.spawnLightSlashVfx(curStep, playerPos.x, playerPos.y, playerPos.z, playerYaw);
    }
    this.prevAttackStep = curStep;

    if (combatState.isHeavy && !this.prevHeavyActive) {
      this.spawnHeavyCleaveVfx(playerPos.x, playerPos.y, playerPos.z, playerYaw);
    }
    this.prevHeavyActive = combatState.isHeavy;

    if (combatState.isLunging && !this.prevLungeActive) {
      this.spawnDreamLungeVfx(playerPos.x, playerPos.y, playerPos.z, playerYaw);
    }
    this.prevLungeActive = combatState.isLunging;

    if (combatState.isBursting && !this.prevBurstActive) {
      this.spawnNightveilBurstVfx(playerPos.x, playerPos.y, playerPos.z, playerYaw);
    }
    this.prevBurstActive = combatState.isBursting;

    if (combatState.isDashing && !this.prevDashActive) {
      this.spawnDashPhantomVfx(playerPos.x, playerPos.y, playerPos.z, playerYaw);
    }
    this.prevDashActive = combatState.isDashing;

    if (combatState.isGuarding && !this.prevGuardActive) {
      this.spawnGuardAegisVfx(playerPos.x, playerPos.y, playerPos.z, playerYaw);
    }
    this.prevGuardActive = combatState.isGuarding;

    // Combo decay timer
    if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
      if (this.comboResetTimer === 0) {
        this.comboChainCount = 0;
      }
    }

    // Advance 3D Slash Ribbons
    for (let i = this.slashRibbons.length - 1; i >= 0; i--) {
      const r = this.slashRibbons[i];
      r.elapsed += dt;
      r.yaw += r.spinSpeedRadPerSec * dt;
      if (r.elapsed >= r.duration) {
        this.slashRibbons.splice(i, 1);
      }
    }

    // Advance 3D Shockwave Rings
    for (let i = this.shockwaveRings.length - 1; i >= 0; i--) {
      const sw = this.shockwaveRings[i];
      sw.elapsed += dt;
      if (sw.elapsed >= sw.duration) {
        this.shockwaveRings.splice(i, 1);
      }
    }

    // Advance 3D Pillars & Spikes
    for (let i = this.pillarSpikes.length - 1; i >= 0; i--) {
      const p = this.pillarSpikes[i];
      p.elapsed += dt;
      if (p.orbitRadius > 0) {
        p.orbitAngle += p.orbitSpeed * dt;
        p.x = p.orbitCenterX + Math.cos(p.orbitAngle) * p.orbitRadius;
        p.z = p.orbitCenterZ + Math.sin(p.orbitAngle) * p.orbitRadius;
      }
      if (p.elapsed >= p.duration) {
        this.pillarSpikes.splice(i, 1);
      }
    }

    // Advance 3D Phantom Clones
    for (let i = this.phantomClones.length - 1; i >= 0; i--) {
      const c = this.phantomClones[i];
      c.elapsed += dt;
      if (c.elapsed >= c.duration) {
        this.phantomClones.splice(i, 1);
      }
    }

    // Advance 3D GPU Particles (Sparks, Embers, Dust Trail, Impact Flash)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.elapsed += dt;
      pt.x += pt.vx * dt;
      pt.y = Math.max(0.03, pt.y + pt.vy * dt);
      pt.z += pt.vz * dt;
      pt.vy += pt.gravity * dt;
      if (pt.elapsed >= pt.duration) {
        this.particles.splice(i, 1);
      }
    }
  }
}
