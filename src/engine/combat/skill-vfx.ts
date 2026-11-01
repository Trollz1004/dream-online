/**
 * DREAM Engine — Action-MMORPG Character Archetypes, Dreamforge 43-Style Forge &
 * Real-Time 3D Combat Skill Visuals (Rohan: Blood Feud & Black Desert Online Inspired)
 *
 * 100% Built In-House with Google Gemini — Zero Box Primitives — #UntilNoKidInNeed
 */

import { CharacterDesignConfig, WorldShaderConfig } from '../studioConfig.ts';

export type ActionMmoClassId =
  | 'crimson-dekan'
  | 'abyssal-awakening'
  | 'aether-valkyrie'
  | 'blood-moon-dhan';

export type SkillVfxThemeId =
  | 'bdo-black-spirit'
  | 'rohan-blood-crimson'
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
  'bdo-black-spirit': {
    id: 'bdo-black-spirit',
    name: 'Black Spirit 100% Awakening (Abyssal Crimson-Violet)',
    badge: 'BDO AWAKENING',
    primarySlashRgb: [0.96, 0.16, 0.38],
    secondaryCoreRgb: [0.72, 0.22, 1.0],
    shockwaveRgb: [0.85, 0.18, 0.95],
    lightningPillarRgb: [1.0, 0.12, 0.36],
    phantomCloneRgb: [0.58, 0.18, 0.95],
    aegisShieldRgb: [0.78, 0.35, 1.0],
    cssAccentHex: '#F43F5E',
    cssGlowHex: '#A855F7',
  },
  'rohan-blood-crimson': {
    id: 'rohan-blood-crimson',
    name: 'Blood Feud Dragon-Crest (Molten Crimson & Gold)',
    badge: 'ROHAN BLOOD FEUD',
    primarySlashRgb: [1.0, 0.22, 0.14],
    secondaryCoreRgb: [1.0, 0.78, 0.18],
    shockwaveRgb: [1.0, 0.45, 0.12],
    lightningPillarRgb: [1.0, 0.68, 0.15],
    phantomCloneRgb: [0.95, 0.25, 0.18],
    aegisShieldRgb: [1.0, 0.75, 0.2],
    cssAccentHex: '#EF4444',
    cssGlowHex: '#F59E0B',
  },
  'celestial-aether-gold': {
    id: 'celestial-aether-gold',
    name: 'Celestial Valkyrie Aether (Solar Gold & Starlight Cyan)',
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
    name: 'Blood-Moon Dhan Venom (Emerald Jade & Shadow Crimson)',
    badge: 'DHAN SHADOW',
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
  'crimson-dekan': {
    id: 'crimson-dekan',
    name: 'Crimson Dragon-Knight',
    title: 'Evolving Zhen Blade & Dragon-Blood Sovereign',
    inspirationNote: 'Inspired by Rohan: Blood Feud Dekan Dragon-Knight & BDO Warrior Awakening',
    weaponName: 'Evolving Zhen Twin-Blade',
    awakeningWeaponName: 'Dragon-Fang Inferno Greatsword',
    defaultVfxTheme: 'rohan-blood-crimson',
    defaultDreamforgeStyle: 'stylized-semi-real-3d-game',
    characterConfig: {
      armorColorDay: [0.22, 0.06, 0.08],
      armorColorNight: [0.15, 0.04, 0.07],
      visorColorDay: [1.0, 0.35, 0.12],
      visorColorNight: [1.0, 0.22, 0.28],
      bladeColorDay: [1.0, 0.28, 0.14],
      bladeColorNight: [1.0, 0.18, 0.32],
      armorMetallic: 0.88,
      armorRoughness: 0.22,
      visorGlowIntensity: 3.8,
      avatarScale: 1.06,
    },
    skillNames: {
      l1: 'Dragon-Fang Cleave I',
      l2: 'Crimson Twin-Arc II',
      l3: 'Zhen Blood-Whirlwind III',
      heavy: 'Grave-Shatter Dragon Slam',
      lunge: 'Breath of Evolving Flame (W+F)',
      burst: '100% Dragon-Blood Cataclysm (R)',
      dash: 'Shadow-Scale Step (I-Frame)',
      guard: 'Dragon-Wall Aegis (75% Block)',
    },
  },
  'abyssal-awakening': {
    id: 'abyssal-awakening',
    name: 'Abyssal Awakening Dark-Knight',
    title: 'Vediant Phantom Blades & Black-Spirit Reaper',
    inspirationNote: 'Inspired by Black Desert Online Dark Knight / Sorceress Awakening',
    weaponName: 'Kriegsmesser of Twilight',
    awakeningWeaponName: 'Vediant Twin Phantom-Blades',
    defaultVfxTheme: 'bdo-black-spirit',
    defaultDreamforgeStyle: 'tenebrist-painterly',
    characterConfig: {
      armorColorDay: [0.16, 0.11, 0.24],
      armorColorNight: [0.10, 0.07, 0.18],
      visorColorDay: [0.78, 0.25, 1.0],
      visorColorNight: [0.95, 0.18, 0.55],
      bladeColorDay: [0.85, 0.22, 1.0],
      bladeColorNight: [1.0, 0.15, 0.48],
      armorMetallic: 0.84,
      armorRoughness: 0.24,
      visorGlowIntensity: 4.2,
      avatarScale: 1.02,
    },
    skillNames: {
      l1: 'Kamasylvia Slash I',
      l2: 'Dusk-Reaper Crescent II',
      l3: 'Violation of Darkness III',
      heavy: 'Spirit Legacy: Obliteration',
      lunge: 'Twilight Dash: Stinger (W+F)',
      burst: 'Black Spirit 100%: Abyssal Doom (R)',
      dash: 'Smoky Haze Phantom Step (I-Frame)',
      guard: 'Nocturne Dark Barrier (75% Block)',
    },
  },
  'aether-valkyrie': {
    id: 'aether-valkyrie',
    name: 'Celestial Aether Valkyrie',
    title: 'Solar Lancia & Sacred Sanctuary Defender',
    inspirationNote: 'Inspired by BDO Valkyrie Awakening & Rohan Defender Templar',
    weaponName: 'Sacred Elion Longsword',
    awakeningWeaponName: 'Solaris Great-Lancia & Aegis',
    defaultVfxTheme: 'celestial-aether-gold',
    defaultDreamforgeStyle: 'commercial-game-painterly',
    characterConfig: {
      armorColorDay: [0.82, 0.76, 0.64],
      armorColorNight: [0.24, 0.34, 0.48],
      visorColorDay: [1.0, 0.85, 0.22],
      visorColorNight: [0.18, 0.92, 1.0],
      bladeColorDay: [1.0, 0.88, 0.28],
      bladeColorNight: [0.25, 0.95, 1.0],
      armorMetallic: 0.92,
      armorRoughness: 0.18,
      visorGlowIntensity: 3.6,
      avatarScale: 1.04,
    },
    skillNames: {
      l1: 'Sword of Judgment I',
      l2: 'Radiant Arc II',
      l3: 'Celestial Verdict III',
      heavy: 'Terra Sancta Earthshaker',
      lunge: 'Hastiludium Sacred Charge (W+F)',
      burst: 'Sanctitas de Enslar Nova (R)',
      dash: 'Light-Wing Evasion (I-Frame)',
      guard: 'Strong Defense: Heaven Shield (75%)',
    },
  },
  'blood-moon-dhan': {
    id: 'blood-moon-dhan',
    name: 'Blood-Moon Dhan Assassin',
    title: 'Six-Blade Sura & Crimson Stealth Predator',
    inspirationNote: 'Inspired by Rohan: Blood Feud Dhan Avenger & BDO Ninja Sura Katana',
    weaponName: 'Venom Katar & Shuriken',
    awakeningWeaponName: 'Six-Blade Sura Blood Katanas',
    defaultVfxTheme: 'venom-shadow-jade',
    defaultDreamforgeStyle: 'high-contrast-neon',
    characterConfig: {
      armorColorDay: [0.11, 0.16, 0.14],
      armorColorNight: [0.06, 0.11, 0.10],
      visorColorDay: [0.12, 0.98, 0.64],
      visorColorNight: [1.0, 0.18, 0.36],
      bladeColorDay: [0.15, 1.0, 0.68],
      bladeColorNight: [0.12, 0.98, 0.64],
      armorMetallic: 0.78,
      armorRoughness: 0.26,
      visorGlowIntensity: 4.0,
      avatarScale: 1.0,
    },
    skillNames: {
      l1: 'Phantom Katar Cut I',
      l2: 'Venom Cross-Slash II',
      l3: 'Sura Six-Blade Tempest III',
      heavy: 'Serpent Ascension Execution',
      lunge: 'Ghost Step: Heart-Seeker (W+F)',
      burst: 'Blood-Moon Death Lotus (R)',
      dash: 'Silent Smokescreen I-Frame',
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
  { id: 'ip-jump', label: 'IP Jump', emoji: '🚪', sub: 'Step into a dark-fantasy realm you love.', engineMapping: 'Action-MMO Archetype & Skill Remapper (BDO / Rohan)' },
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
  activeClassId: ActionMmoClassId = 'crimson-dekan';
  activeThemeId: SkillVfxThemeId = 'rohan-blood-crimson';
  activeDreamforgeMode: string = 'ip-jump';
  activeDreamforgeStyle: string = 'stylized-semi-real-3d-game';

  slashRibbons: Active3DSlashRibbon[] = [];
  shockwaveRings: Active3DShockwaveRing[] = [];
  pillarSpikes: Active3DPillarSpike[] = [];
  phantomClones: Active3DPhantomClone[] = [];
  callouts: CombatCalloutFloater[] = [];

  comboChainCount = 0;
  private comboResetTimer = 0;
  private prevAttackStep = 0;
  private prevHeavyActive = false;
  private prevLungeActive = false;
  private prevBurstActive = false;
  private prevDashActive = false;
  private prevGuardActive = false;

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
    const profile = ACTION_MMO_CLASSES[classId] || ACTION_MMO_CLASSES['crimson-dekan'];
    this.activeClassId = profile.id;
    this.activeThemeId = themeId || profile.defaultVfxTheme;
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
      ? 0.95
      : 0.72;

    const characterPatch: Partial<CharacterDesignConfig> = {
      ...profile.characterConfig,
      bladeColorDay: [...theme.primarySlashRgb] as [number, number, number],
      bladeColorNight: [...theme.secondaryCoreRgb] as [number, number, number],
      visorColorDay: [...theme.secondaryCoreRgb] as [number, number, number],
      visorColorNight: [...theme.primarySlashRgb] as [number, number, number],
    };

    const shaderPatch: Partial<WorldShaderConfig> = {
      rimIntensity: rimBoost,
      exposure: 1.05 + ((styleHash % 15) / 100),
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
      id: `vfx-callout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      skillTitle,
      tag,
      comboCount: this.comboChainCount,
      accentHex: theme.cssAccentHex,
      glowHex: theme.cssGlowHex,
      createdAt: Date.now(),
    };
    this.callouts = [floater, ...this.callouts].slice(0, 6);
  }

  spawnLightSlashVfx(step: number, x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;
    const s = Math.max(1, Math.min(3, step)) as 1 | 2 | 3;

    // Step 1: Diagonal right-to-left crescent slash (-28 deg roll)
    // Step 2: Reverse left-to-right cross slash (+32 deg roll)
    // Step 3: 360-degree Twin Blood-Tempest Helix (two crossing crescents + ground shockwave!)
    const roll = s === 1 ? -0.48 : s === 2 ? 0.52 : 0.18;
    const spin = s === 1 ? 8.5 : s === 2 ? -9.5 : 16.0;

    this.slashRibbons.push({
      id: `slash-l${s}-${Date.now()}-${Math.random()}`,
      x,
      y: y + 1.08,
      z,
      yaw,
      pitchRad: 0.08,
      rollRad: roll,
      scale: s === 3 ? 1.38 : 1.05,
      colorRgb: theme.primarySlashRgb,
      coreRgb: theme.secondaryCoreRgb,
      elapsed: 0,
      duration: s === 3 ? 0.58 : 0.42,
      spinSpeedRadPerSec: spin,
    });

    if (s === 3) {
      // Second counter-rotating crescent + shockwave ring for L3 finisher
      this.slashRibbons.push({
        id: `slash-l3b-${Date.now()}-${Math.random()}`,
        x,
        y: y + 0.92,
        z,
        yaw: yaw + Math.PI,
        pitchRad: -0.12,
        rollRad: -0.42,
        scale: 1.52,
        colorRgb: theme.secondaryCoreRgb,
        coreRgb: theme.primarySlashRgb,
        elapsed: 0,
        duration: 0.62,
        spinSpeedRadPerSec: -18.0,
      });

      this.shockwaveRings.push({
        id: `ring-l3-${Date.now()}-${Math.random()}`,
        x,
        y: y + 0.05,
        z,
        startScale: 0.5,
        endScale: 2.2,
        colorRgb: theme.shockwaveRgb,
        elapsed: 0,
        duration: 0.55,
      });
    }

    const title = s === 1 ? cls.skillNames.l1 : s === 2 ? cls.skillNames.l2 : cls.skillNames.l3;
    this.pushCallout(title, s === 3 ? 'CRITICAL!' : 'BACK ATTACK!');
  }

  spawnHeavyCleaveVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;

    // Giant vertical overhead cleave arc + cross-arc
    this.slashRibbons.push(
      {
        id: `heavy-v1-${Date.now()}-${Math.random()}`,
        x,
        y: y + 1.35,
        z,
        yaw,
        pitchRad: 0.25,
        rollRad: 1.32, // Near-vertical overhead cleave
        scale: 1.68,
        colorRgb: theme.primarySlashRgb,
        coreRgb: theme.secondaryCoreRgb,
        elapsed: 0,
        duration: 0.68,
        spinSpeedRadPerSec: 6.0,
      },
      {
        id: `heavy-v2-${Date.now()}-${Math.random()}`,
        x,
        y: y + 0.85,
        z,
        yaw,
        pitchRad: 0,
        rollRad: -0.15,
        scale: 1.55,
        colorRgb: theme.secondaryCoreRgb,
        coreRgb: theme.primarySlashRgb,
        elapsed: 0,
        duration: 0.65,
        spinSpeedRadPerSec: -10.0,
      }
    );

    // Expanding ground-shatter shockwave ring
    this.shockwaveRings.push({
      id: `heavy-ring-${Date.now()}-${Math.random()}`,
      x: x - Math.sin(yaw) * 1.6,
      y: y + 0.04,
      z: z - Math.cos(yaw) * 1.6,
      startScale: 0.4,
      endScale: 2.85,
      colorRgb: theme.shockwaveRgb,
      elapsed: 0,
      duration: 0.72,
    });

    // 5 Erupting Tectonic Spikes radiating along the forward slam line
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    for (let i = 1; i <= 5; i++) {
      const dist = 1.1 + i * 0.85;
      this.pillarSpikes.push({
        id: `heavy-spike-${i}-${Date.now()}-${Math.random()}`,
        x: x + fwdX * dist,
        y,
        z: z + fwdZ * dist,
        orbitCenterX: x + fwdX * dist,
        orbitCenterZ: z + fwdZ * dist,
        orbitRadius: 0,
        orbitAngle: 0,
        orbitSpeed: 0,
        maxScaleY: 0.65 + i * 0.18,
        colorRgb: i % 2 === 0 ? theme.lightningPillarRgb : theme.primarySlashRgb,
        elapsed: 0,
        duration: 0.65 + i * 0.06,
      });
    }

    this.pushCallout(cls.skillNames.heavy, 'DOWN ATTACK!');
  }

  spawnDreamLungeVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);

    // 3 Phantom Afterimage Clones trailing along the lunge vector
    for (let i = 0; i < 3; i++) {
      const stepDist = i * 1.35;
      this.phantomClones.push({
        id: `lunge-clone-${i}-${Date.now()}-${Math.random()}`,
        x: x + fwdX * stepDist,
        y,
        z: z + fwdZ * stepDist,
        yaw,
        colorRgb: theme.phantomCloneRgb,
        elapsed: 0,
        duration: 0.55 + i * 0.12,
      });
    }

    // Piercing spear-slash vortex
    this.slashRibbons.push({
      id: `lunge-arc-${Date.now()}-${Math.random()}`,
      x: x + fwdX * 2.2,
      y: y + 1.05,
      z: z + fwdZ * 2.2,
      yaw,
      pitchRad: 0.35,
      rollRad: 0.0,
      scale: 1.55,
      colorRgb: theme.secondaryCoreRgb,
      coreRgb: theme.primarySlashRgb,
      elapsed: 0,
      duration: 0.60,
      spinSpeedRadPerSec: 22.0,
    });

    this.shockwaveRings.push({
      id: `lunge-ring-${Date.now()}-${Math.random()}`,
      x,
      y: y + 0.05,
      z,
      startScale: 0.4,
      endScale: 2.1,
      colorRgb: theme.secondaryCoreRgb,
      elapsed: 0,
      duration: 0.52,
    });

    this.pushCallout(cls.skillNames.lunge, 'CRITICAL!');
  }

  spawnNightveilBurstVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;

    // 2 Concentric Expanding Awakening Shockwave Rings
    this.shockwaveRings.push(
      {
        id: `burst-ring1-${Date.now()}-${Math.random()}`,
        x,
        y: y + 0.05,
        z,
        startScale: 0.5,
        endScale: 3.8,
        colorRgb: theme.shockwaveRgb,
        elapsed: 0,
        duration: 0.95,
      },
      {
        id: `burst-ring2-${Date.now()}-${Math.random()}`,
        x,
        y: y + 0.35,
        z,
        startScale: 0.3,
        endScale: 2.9,
        colorRgb: theme.secondaryCoreRgb,
        elapsed: 0,
        duration: 0.85,
      }
    );

    // 3 Swirling Awakening Blade Hurricanes
    for (let k = 0; k < 3; k++) {
      this.slashRibbons.push({
        id: `burst-hurricane-${k}-${Date.now()}-${Math.random()}`,
        x,
        y: y + 0.65 + k * 0.45,
        z,
        yaw: yaw + (k * Math.PI * 2) / 3,
        pitchRad: (k - 1) * 0.22,
        rollRad: (k - 1) * 0.35,
        scale: 1.65 + k * 0.2,
        colorRgb: k % 2 === 0 ? theme.primarySlashRgb : theme.secondaryCoreRgb,
        coreRgb: theme.lightningPillarRgb,
        elapsed: 0,
        duration: 0.92,
        spinSpeedRadPerSec: (k % 2 === 0 ? 1 : -1) * 20.0,
      });
    }

    // 8 Orbiting Awakening Dark-Lightning / Dragon-Flame Pillars
    const pillarCount = 8;
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const radius = 2.65;
      this.pillarSpikes.push({
        id: `burst-pillar-${i}-${Date.now()}-${Math.random()}`,
        x: x + Math.cos(angle) * radius,
        y,
        z: z + Math.sin(angle) * radius,
        orbitCenterX: x,
        orbitCenterZ: z,
        orbitRadius: radius,
        orbitAngle: angle,
        orbitSpeed: 3.4,
        maxScaleY: 1.35 + (i % 2) * 0.35,
        colorRgb: i % 2 === 0 ? theme.lightningPillarRgb : theme.secondaryCoreRgb,
        elapsed: 0,
        duration: 0.95,
      });
    }

    this.pushCallout(cls.skillNames.burst, 'AWAKENING 100%!');
  }

  spawnDashPhantomVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;

    this.phantomClones.push({
      id: `dash-phantom-${Date.now()}-${Math.random()}`,
      x,
      y,
      z,
      yaw,
      colorRgb: theme.phantomCloneRgb,
      elapsed: 0,
      duration: 0.48,
    });

    this.shockwaveRings.push({
      id: `dash-ring-${Date.now()}-${Math.random()}`,
      x,
      y: y + 0.04,
      z,
      startScale: 0.35,
      endScale: 1.45,
      colorRgb: theme.secondaryCoreRgb,
      elapsed: 0,
      duration: 0.40,
    });

    this.pushCallout(cls.skillNames.dash, 'PERFECT I-FRAME!');
  }

  spawnGuardAegisVfx(x: number, y: number, z: number, yaw: number): void {
    const theme = this.currentTheme;
    const cls = this.currentClass;
    this.shockwaveRings.push({
      id: `guard-ring-${Date.now()}-${Math.random()}`,
      x,
      y: y + 0.04,
      z,
      startScale: 0.6,
      endScale: 1.5,
      colorRgb: theme.aegisShieldRgb,
      elapsed: 0,
      duration: 0.45,
    });
    this.pushCallout(cls.skillNames.guard, 'AEGIS GUARD 75%!');
  }

  /**
   * Fires a full Awakening Combo Showcase in the 3D scene so the user or AI Team
   * can immediately see all BDO / Rohan skill visuals erupt on screen!
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
   * and advances all active 3D skill VFX meshes.
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
    // Detect rising edges of skills so keyboard/mouse/gamepad & proof sequence automatically spawn 3D VFX
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
  }
}
