/**
 * Character Creator v1 (Recipe 9) — Body-Only Configuration & Logic
 *
 * Implements docs/gdd/07-character-creation.md, docs/gdd/09-interface-style.md,
 * and docs/gdd/12-wardrobe-needs-shop.md:
 *  - Shapes a body only: silhouette, facePreset, skinTone, hairShape, hairColor,
 *    eyeStyle, voiceStyle, plus starter combatPath and lifeSkillInterest.
 *  - No outfits, no skins, no shop inside the creator.
 *  - Every character leaves the creator in the three-piece kid-safe basics set
 *    (Plain Tee, Plain Trousers, Plain Sneakers) imported from src/game/economy/wardrobe.
 *  - Every body slider has an explicit reset control (`hasReset: true`) and pure
 *    reset helpers (`resetCreatorSlider`, `resetAllCreatorSliders`).
 *  - Supports importing a standard VRM 0.x / 1.0 `.vrm` binary (checking that its
 *    metadata allows commercial use and redistribution) without ever embedding
 *    VRoid Studio.
 */

import {
  BASIC_SLOTS,
  KID_SAFE_BASICS,
  KID_SAFE_BASIC_IDS,
  createDefaultOutfit,
  isKidSafeBasicsOutfit,
  type BasicSlot,
  type BasicItem,
  type Outfit,
} from '../game/economy/wardrobe/index.ts';

export {
  BASIC_SLOTS,
  KID_SAFE_BASICS,
  KID_SAFE_BASIC_IDS,
  createDefaultOutfit,
  isKidSafeBasicsOutfit,
  type BasicSlot,
  type BasicItem,
  type Outfit,
};

export type BasicGarment = BasicItem;
export type WornBasicsSet = Outfit;
export const createDefaultBasicsSet = createDefaultOutfit;
export const isKidSafeBasicsSet = isKidSafeBasicsOutfit;

export type BodySilhouetteId =
  | 'balanced-traveler'
  | 'lean-strider'
  | 'broad-vanguard'
  | 'tall-wayfarer'
  | 'compact-acrobat';

export type FacePresetId =
  | 'face-01-serene'
  | 'face-02-resolute'
  | 'face-03-windborne'
  | 'face-04-scholar'
  | 'face-05-hearthwarm'
  | 'face-06-duskwatch'
  | 'face-07-starlit'
  | 'face-08-ironbrow'
  | 'face-09-reedlight'
  | 'face-10-horizon';

export type SkinToneId =
  | 'porcelain-mist'
  | 'warm-alabaster'
  | 'golden-ochre'
  | 'sunlit-sienna'
  | 'deep-umber'
  | 'obsidian-bark';

export type HairShapeId =
  | 'windswept-short'
  | 'tied-crest'
  | 'braided-crown'
  | 'shoulder-waves'
  | 'cropped-helm'
  | 'long-wanderer';

export type HairColorId =
  | 'raven-ink'
  | 'ash-silver'
  | 'chestnut-bark'
  | 'copper-dawn'
  | 'pale-flax'
  | 'midnight-slate';

export type EyeStyleId =
  | 'clear-iris'
  | 'gemineye-amber-lens'
  | 'gemineye-silver-contact'
  | 'scout-eye-patch'
  | 'first-person-visor-lens';

export type VoiceStyleId =
  | 'calm-low'
  | 'bright-clear'
  | 'measured-alto'
  | 'quiet-resonant';

export type StarterCombatPathId = 'blade' | 'hammer' | 'spear' | 'bow' | 'focus';

export type StarterLifeSkillId =
  | 'gathering'
  | 'fishing'
  | 'smithing'
  | 'alchemy'
  | 'trading';

export type AppearancePresetId =
  | 'preset-01-cloudwalker'
  | 'preset-02-stoneguard'
  | 'preset-03-reedwarden'
  | 'preset-04-skylark'
  | 'preset-05-lanternkeeper'
  | 'preset-06-ridgehunter'
  | 'preset-07-ashsmith'
  | 'preset-08-mistweaver'
  | 'preset-09-riverfisher'
  | 'preset-10-wayfinder';

export type CreatorSliderKey =
  | 'heightScale'
  | 'shoulderWidth'
  | 'torsoBuild'
  | 'headScale'
  | 'hairLength'
  | 'previewYawDeg';

export interface CreatorOptionItem<T extends string = string> {
  readonly id: T;
  readonly label: string;
  readonly summary: string;
}

export interface SkinToneOption extends CreatorOptionItem<SkinToneId> {
  readonly rgb: readonly [number, number, number];
}

export interface HairColorOption extends CreatorOptionItem<HairColorId> {
  readonly rgb: readonly [number, number, number];
}

export interface EyeStyleOption extends CreatorOptionItem<EyeStyleId> {
  readonly irisRgb: readonly [number, number, number];
  readonly hasPatch: boolean;
}

export interface AppearancePreset {
  readonly id: AppearancePresetId;
  readonly label: string;
  readonly summary: string;
  readonly silhouette: BodySilhouetteId;
  readonly facePreset: FacePresetId;
  readonly skinTone: SkinToneId;
  readonly hairShape: HairShapeId;
  readonly hairColor: HairColorId;
  readonly eyeStyle: EyeStyleId;
  readonly voiceStyle: VoiceStyleId;
  readonly heightScale: number;
  readonly shoulderWidth: number;
  readonly torsoBuild: number;
  readonly headScale: number;
  readonly hairLength: number;
}

export interface SliderSpec {
  readonly key: CreatorSliderKey;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly defaultValue: number;
  readonly unit: string;
  readonly hasReset: true;
}

export interface CharacterCreatorState {
  readonly appearancePreset: AppearancePresetId;
  readonly silhouette: BodySilhouetteId;
  readonly facePreset: FacePresetId;
  readonly skinTone: SkinToneId;
  readonly hairShape: HairShapeId;
  readonly hairColor: HairColorId;
  readonly eyeStyle: EyeStyleId;
  readonly voiceStyle: VoiceStyleId;
  readonly combatPath: StarterCombatPathId;
  readonly lifeSkillInterest: StarterLifeSkillId;
  readonly heightScale: number;
  readonly shoulderWidth: number;
  readonly torsoBuild: number;
  readonly headScale: number;
  readonly hairLength: number;
  readonly previewYawDeg: number;
}

export interface EmittedCharacterBodyProfile {
  readonly silhouette: BodySilhouetteId;
  readonly facePreset: FacePresetId;
  readonly skinTone: SkinToneId;
  readonly hairShape: HairShapeId;
  readonly hairColor: HairColorId;
  readonly eyeStyle: EyeStyleId;
  readonly voiceStyle: VoiceStyleId;
  readonly combatPath: StarterCombatPathId;
  readonly lifeSkillInterest: StarterLifeSkillId;
  readonly heightScale: number;
  readonly shoulderWidth: number;
  readonly torsoBuild: number;
  readonly headScale: number;
  readonly hairLength: number;
}

export interface CharacterCreatorExitState {
  readonly body: EmittedCharacterBodyProfile;
  readonly basics: WornBasicsSet;
}

export const BODY_SILHOUETTES: readonly CreatorOptionItem<BodySilhouetteId>[] = Object.freeze([
  {
    id: 'balanced-traveler',
    label: 'BALANCED TRAVELER',
    summary: 'Even proportions built for long road marches, climbing, and swift parries.',
  },
  {
    id: 'lean-strider',
    label: 'LEAN STRIDER',
    summary: 'Light frame with a narrow waist and long stride for rooftop and ridge travel.',
  },
  {
    id: 'broad-vanguard',
    label: 'BROAD VANGUARD',
    summary: 'Wide shoulders and grounded stance suited to heavy hammers and shield walls.',
  },
  {
    id: 'tall-wayfarer',
    label: 'TALL WAYFARER',
    summary: 'Extended limb reach and upright posture for spears, bows, and high vantage lines.',
  },
  {
    id: 'compact-acrobat',
    label: 'COMPACT ACROBAT',
    summary: 'Low center of balance for tight dodges, vaulting, and quick footwork.',
  },
]);

export const FACE_PRESETS: readonly CreatorOptionItem<FacePresetId>[] = Object.freeze([
  {
    id: 'face-01-serene',
    label: 'FACE I · SERENE',
    summary: 'Soft brow line and composed jawline with balanced cheek structure.',
  },
  {
    id: 'face-02-resolute',
    label: 'FACE II · RESOLUTE',
    summary: 'Squared jaw and steady gaze shaped for frontline focus.',
  },
  {
    id: 'face-03-windborne',
    label: 'FACE III · WINDBORNE',
    summary: 'High cheekbones and tapered chin with alert eyes.',
  },
  {
    id: 'face-04-scholar',
    label: 'FACE IV · SCHOLAR',
    summary: 'Gentle bridge and thoughtful profile suited to quiet study.',
  },
  {
    id: 'face-05-hearthwarm',
    label: 'FACE V · HEARTHWARM',
    summary: 'Rounded cheeks and open expression that reads clearly at distance.',
  },
  {
    id: 'face-06-duskwatch',
    label: 'FACE VI · DUSKWATCH',
    summary: 'Angular brow ridge and narrow nose bridge for night sentries.',
  },
  {
    id: 'face-07-starlit',
    label: 'FACE VII · STARLIT',
    summary: 'Fine bone structure with wide-set eyes and calm poise.',
  },
  {
    id: 'face-08-ironbrow',
    label: 'FACE VIII · IRONBROW',
    summary: 'Strong chin and weathered contour carved like highland stone.',
  },
  {
    id: 'face-09-reedlight',
    label: 'FACE IX · REEDLIGHT',
    summary: 'Slender profile with subtle brow arch and relaxed mouth line.',
  },
  {
    id: 'face-10-horizon',
    label: 'FACE X · HORIZON',
    summary: 'Balanced classic proportions designed for any discipline.',
  },
]);

export const SKIN_TONES: readonly SkinToneOption[] = Object.freeze([
  {
    id: 'porcelain-mist',
    label: 'PORCELAIN MIST',
    summary: 'Cool pale complexion that catches soft moonlight and lantern glow.',
    rgb: [0.91, 0.84, 0.79],
  },
  {
    id: 'warm-alabaster',
    label: 'WARM ALABASTER',
    summary: 'Light ivory tone with subtle warm undertones.',
    rgb: [0.86, 0.75, 0.66],
  },
  {
    id: 'golden-ochre',
    label: 'GOLDEN OCHRE',
    summary: 'Sun-warmed olive and golden midrange tone.',
    rgb: [0.76, 0.61, 0.48],
  },
  {
    id: 'sunlit-sienna',
    label: 'SUNLIT SIENNA',
    summary: 'Rich bronze-amber complexion with warm highlights.',
    rgb: [0.63, 0.45, 0.33],
  },
  {
    id: 'deep-umber',
    label: 'DEEP UMBER',
    summary: 'Deep warm brown complexion with soft specular sheen.',
    rgb: [0.44, 0.3, 0.22],
  },
  {
    id: 'obsidian-bark',
    label: 'OBSIDIAN BARK',
    summary: 'Rich dark espresso tone that contrasts cleanly with silver and ash.',
    rgb: [0.29, 0.2, 0.16],
  },
]);

export const HAIR_SHAPES: readonly CreatorOptionItem<HairShapeId>[] = Object.freeze([
  {
    id: 'windswept-short',
    label: 'WINDSWEPT SHORT',
    summary: 'Cropped layers swept back to keep vision clear in close combat.',
  },
  {
    id: 'tied-crest',
    label: 'TIED CREST',
    summary: 'High tied topknot with clean temples for martial discipline.',
  },
  {
    id: 'braided-crown',
    label: 'BRAIDED CROWN',
    summary: 'Woven braid secured around the crown so nothing snags on bowstrings.',
  },
  {
    id: 'shoulder-waves',
    label: 'SHOULDER WAVES',
    summary: 'Medium flowing locks resting across the collar and upper back.',
  },
  {
    id: 'cropped-helm',
    label: 'CROPPED HELM',
    summary: 'Close-shorn travel cut built for smiths and vanguard guards.',
  },
  {
    id: 'long-wanderer',
    label: 'LONG WANDERER',
    summary: 'Full-length hair gathered loosely down the spine.',
  },
]);

export const HAIR_COLORS: readonly HairColorOption[] = Object.freeze([
  {
    id: 'raven-ink',
    label: 'RAVEN INK',
    summary: 'Deep charcoal black with subtle slate reflection.',
    rgb: [0.14, 0.15, 0.18],
  },
  {
    id: 'ash-silver',
    label: 'ASH SILVER',
    summary: 'Pale weathered silver like frost over highland stone.',
    rgb: [0.78, 0.8, 0.84],
  },
  {
    id: 'chestnut-bark',
    label: 'CHESTNUT BARK',
    summary: 'Warm woodland brown with muted russet depth.',
    rgb: [0.36, 0.24, 0.17],
  },
  {
    id: 'copper-dawn',
    label: 'COPPER DAWN',
    summary: 'Burnished auburn-copper tone inspired by forge embers.',
    rgb: [0.58, 0.31, 0.2],
  },
  {
    id: 'pale-flax',
    label: 'PALE FLAX',
    summary: 'Soft wheat-gold blonde with calm natural highlights.',
    rgb: [0.82, 0.74, 0.56],
  },
  {
    id: 'midnight-slate',
    label: 'MIDNIGHT SLATE',
    summary: 'Cool storm-grey with deep dusk undertones.',
    rgb: [0.27, 0.31, 0.37],
  },
]);

export const EYE_STYLES: readonly EyeStyleOption[] = Object.freeze([
  {
    id: 'clear-iris',
    label: 'CLEAR NATURAL IRIS',
    summary: 'Unadorned natural eyes with steady focus and clean catchlights.',
    irisRgb: [0.52, 0.62, 0.7],
    hasPatch: false,
  },
  {
    id: 'gemineye-amber-lens',
    label: 'GEMINEYE AMBER LENS',
    summary: 'Warm optical contact lens tuned for reading wind trails and distant landmarks.',
    irisRgb: [0.84, 0.66, 0.34],
    hasPatch: false,
  },
  {
    id: 'gemineye-silver-contact',
    label: 'GEMINEYE SILVER CONTACT',
    summary: 'Luminous pale silver iris ring for low-light ruin exploration.',
    irisRgb: [0.85, 0.88, 0.92],
    hasPatch: false,
  },
  {
    id: 'scout-eye-patch',
    label: 'SCOUT EYE PATCH',
    summary: 'Single cloth field patch over the left eye paired with a sharp right iris.',
    irisRgb: [0.62, 0.7, 0.76],
    hasPatch: true,
  },
  {
    id: 'first-person-visor-lens',
    label: 'FIRST-PERSON SIGHT LENS',
    summary: 'Subtle dual-ring GeminEYE sight alignment built for first-person aim.',
    irisRgb: [0.74, 0.82, 0.88],
    hasPatch: false,
  },
]);

export const VOICE_STYLES: readonly CreatorOptionItem<VoiceStyleId>[] = Object.freeze([
  {
    id: 'calm-low',
    label: 'VOICE I · CALM LOW',
    summary: 'Grounded baritone cadence for quiet calls, breath cues, and parries.',
  },
  {
    id: 'bright-clear',
    label: 'VOICE II · BRIGHT CLEAR',
    summary: 'Crisp midrange voice that carries cleanly across open valleys.',
  },
  {
    id: 'measured-alto',
    label: 'VOICE III · MEASURED ALTO',
    summary: 'Steady warm alto timbre suited to rhythmic traversal and focus arts.',
  },
  {
    id: 'quiet-resonant',
    label: 'VOICE IV · QUIET RESONANT',
    summary: 'Soft spoken breath and deliberate effort notes with minimal noise.',
  },
]);

export const STARTER_COMBAT_PATHS: readonly CreatorOptionItem<StarterCombatPathId>[] = Object.freeze([
  {
    id: 'blade',
    label: 'BLADE · FAST & BALANCED',
    summary: 'Balanced steel work built around crisp parries, quick steps, and clean counter-cuts.',
  },
  {
    id: 'hammer',
    label: 'HAMMER · SLOW & HEAVY',
    summary: 'Deliberate two-handed strikes that stagger guards and break stone postures.',
  },
  {
    id: 'spear',
    label: 'SPEAR · LONG REACH',
    summary: 'Sweeping polearm spacing that keeps foes at the tip of your stride.',
  },
  {
    id: 'bow',
    label: 'BOW · RANGED',
    summary: 'High-ground archery for scouting wind lines and striking from afar.',
  },
  {
    id: 'focus',
    label: 'FOCUS · ELEMENTAL SUPPORT',
    summary: 'Channelled resonance for warding allies, shaping wind currents, and steadying resolve.',
  },
]);

export const STARTER_LIFE_SKILLS: readonly CreatorOptionItem<StarterLifeSkillId>[] = Object.freeze([
  {
    id: 'gathering',
    label: 'GATHERING · HERBS & TIMBER',
    summary: 'Harvest wild herbs, mountain ore, and seasoned timber along the frontier trails.',
  },
  {
    id: 'fishing',
    label: 'FISHING · RIVERS & COASTS',
    summary: 'Read quiet eddies and mist-covered lakes with patient line control.',
  },
  {
    id: 'smithing',
    label: 'SMITHING · FORGE & ANVIL',
    summary: 'Shape raw ingots into balanced blades, tools, and camp hardware.',
  },
  {
    id: 'alchemy',
    label: 'ALCHEMY · TONICS & SALVES',
    summary: 'Distill field roots and spring water into restorative travel draughts.',
  },
  {
    id: 'trading',
    label: 'TRADING · CARAVAN LEDGERS',
    summary: 'Move regional goods between outposts and appraise rare salvage.',
  },
]);

export const APPEARANCE_PRESETS: readonly AppearancePreset[] = Object.freeze([
  {
    id: 'preset-01-cloudwalker',
    label: 'PRESET I · CLOUDWALKER',
    summary: 'Balanced traveler with windswept raven hair and clear natural iris.',
    silhouette: 'balanced-traveler',
    facePreset: 'face-01-serene',
    skinTone: 'warm-alabaster',
    hairShape: 'windswept-short',
    hairColor: 'raven-ink',
    eyeStyle: 'clear-iris',
    voiceStyle: 'calm-low',
    heightScale: 1.0,
    shoulderWidth: 1.0,
    torsoBuild: 1.0,
    headScale: 1.0,
    hairLength: 1.0,
  },
  {
    id: 'preset-02-stoneguard',
    label: 'PRESET II · STONEGUARD',
    summary: 'Broad vanguard frame with ironbrow features and ash-silver crest.',
    silhouette: 'broad-vanguard',
    facePreset: 'face-08-ironbrow',
    skinTone: 'sunlit-sienna',
    hairShape: 'tied-crest',
    hairColor: 'ash-silver',
    eyeStyle: 'gemineye-amber-lens',
    voiceStyle: 'calm-low',
    heightScale: 1.06,
    shoulderWidth: 1.12,
    torsoBuild: 1.1,
    headScale: 0.98,
    hairLength: 0.95,
  },
  {
    id: 'preset-03-reedwarden',
    label: 'PRESET III · REEDWARDEN',
    summary: 'Lean strider with braided crown, golden ochre skin, and bright voice.',
    silhouette: 'lean-strider',
    facePreset: 'face-03-windborne',
    skinTone: 'golden-ochre',
    hairShape: 'braided-crown',
    hairColor: 'chestnut-bark',
    eyeStyle: 'clear-iris',
    voiceStyle: 'bright-clear',
    heightScale: 0.99,
    shoulderWidth: 0.94,
    torsoBuild: 0.92,
    headScale: 1.0,
    hairLength: 1.05,
  },
  {
    id: 'preset-04-skylark',
    label: 'PRESET IV · SKYLARK',
    summary: 'Compact acrobat with shoulder waves and first-person sight lens.',
    silhouette: 'compact-acrobat',
    facePreset: 'face-07-starlit',
    skinTone: 'porcelain-mist',
    hairShape: 'shoulder-waves',
    hairColor: 'pale-flax',
    eyeStyle: 'first-person-visor-lens',
    voiceStyle: 'bright-clear',
    heightScale: 0.93,
    shoulderWidth: 0.95,
    torsoBuild: 0.94,
    headScale: 1.02,
    hairLength: 1.12,
  },
  {
    id: 'preset-05-lanternkeeper',
    label: 'PRESET V · LANTERNKEEPER',
    summary: 'Scholar features with deep umber complexion and silver GeminEYE contacts.',
    silhouette: 'balanced-traveler',
    facePreset: 'face-04-scholar',
    skinTone: 'deep-umber',
    hairShape: 'long-wanderer',
    hairColor: 'ash-silver',
    eyeStyle: 'gemineye-silver-contact',
    voiceStyle: 'measured-alto',
    heightScale: 1.02,
    shoulderWidth: 0.98,
    torsoBuild: 0.97,
    headScale: 1.0,
    hairLength: 1.25,
  },
  {
    id: 'preset-06-ridgehunter',
    label: 'PRESET VI · RIDGEHUNTER',
    summary: 'Tall wayfarer with scout eye patch and copper dawn hair.',
    silhouette: 'tall-wayfarer',
    facePreset: 'face-06-duskwatch',
    skinTone: 'warm-alabaster',
    hairShape: 'tied-crest',
    hairColor: 'copper-dawn',
    eyeStyle: 'scout-eye-patch',
    voiceStyle: 'quiet-resonant',
    heightScale: 1.08,
    shoulderWidth: 1.03,
    torsoBuild: 0.98,
    headScale: 0.97,
    hairLength: 1.0,
  },
  {
    id: 'preset-07-ashsmith',
    label: 'PRESET VII · ASHSMITH',
    summary: 'Grounded frame with cropped helm cut and obsidian bark complexion.',
    silhouette: 'broad-vanguard',
    facePreset: 'face-02-resolute',
    skinTone: 'obsidian-bark',
    hairShape: 'cropped-helm',
    hairColor: 'midnight-slate',
    eyeStyle: 'gemineye-amber-lens',
    voiceStyle: 'calm-low',
    heightScale: 1.04,
    shoulderWidth: 1.14,
    torsoBuild: 1.12,
    headScale: 0.99,
    hairLength: 0.85,
  },
  {
    id: 'preset-08-mistweaver',
    label: 'PRESET VIII · MISTWEAVER',
    summary: 'Slender reedlight visage with long midnight-slate locks.',
    silhouette: 'lean-strider',
    facePreset: 'face-09-reedlight',
    skinTone: 'porcelain-mist',
    hairShape: 'long-wanderer',
    hairColor: 'midnight-slate',
    eyeStyle: 'gemineye-silver-contact',
    voiceStyle: 'quiet-resonant',
    heightScale: 1.01,
    shoulderWidth: 0.92,
    torsoBuild: 0.9,
    headScale: 1.0,
    hairLength: 1.28,
  },
  {
    id: 'preset-09-riverfisher',
    label: 'PRESET IX · RIVERFISHER',
    summary: 'Hearthwarm face preset with sunlit sienna tone and braided crown.',
    silhouette: 'balanced-traveler',
    facePreset: 'face-05-hearthwarm',
    skinTone: 'sunlit-sienna',
    hairShape: 'braided-crown',
    hairColor: 'raven-ink',
    eyeStyle: 'clear-iris',
    voiceStyle: 'measured-alto',
    heightScale: 0.98,
    shoulderWidth: 1.01,
    torsoBuild: 1.02,
    headScale: 1.0,
    hairLength: 1.04,
  },
  {
    id: 'preset-10-wayfinder',
    label: 'PRESET X · WAYFINDER',
    summary: 'Horizon face preset with tall posture and amber GeminEYE lens.',
    silhouette: 'tall-wayfarer',
    facePreset: 'face-10-horizon',
    skinTone: 'golden-ochre',
    hairShape: 'shoulder-waves',
    hairColor: 'chestnut-bark',
    eyeStyle: 'gemineye-amber-lens',
    voiceStyle: 'bright-clear',
    heightScale: 1.05,
    shoulderWidth: 1.02,
    torsoBuild: 1.0,
    headScale: 0.99,
    hairLength: 1.1,
  },
]);

export const CREATOR_SLIDER_SPECS: Readonly<Record<CreatorSliderKey, SliderSpec>> = Object.freeze({
  heightScale: Object.freeze({
    key: 'heightScale',
    label: 'Stature Height',
    min: 0.88,
    max: 1.15,
    step: 0.01,
    defaultValue: 1.0,
    unit: 'x',
    hasReset: true,
  }),
  shoulderWidth: Object.freeze({
    key: 'shoulderWidth',
    label: 'Shoulder Span',
    min: 0.85,
    max: 1.2,
    step: 0.01,
    defaultValue: 1.0,
    unit: 'x',
    hasReset: true,
  }),
  torsoBuild: Object.freeze({
    key: 'torsoBuild',
    label: 'Torso Build',
    min: 0.85,
    max: 1.2,
    step: 0.01,
    defaultValue: 1.0,
    unit: 'x',
    hasReset: true,
  }),
  headScale: Object.freeze({
    key: 'headScale',
    label: 'Head Proportion',
    min: 0.9,
    max: 1.12,
    step: 0.01,
    defaultValue: 1.0,
    unit: 'x',
    hasReset: true,
  }),
  hairLength: Object.freeze({
    key: 'hairLength',
    label: 'Hair Volume',
    min: 0.8,
    max: 1.35,
    step: 0.01,
    defaultValue: 1.0,
    unit: 'x',
    hasReset: true,
  }),
  previewYawDeg: Object.freeze({
    key: 'previewYawDeg',
    label: 'Body Turn Angle',
    min: -180,
    max: 180,
    step: 5,
    defaultValue: -20,
    unit: '°',
    hasReset: true,
  }),
});

export type CreatorRowId =
  | 'appearancePreset'
  | 'silhouette'
  | 'facePreset'
  | 'skinTone'
  | 'hairShape'
  | 'hairColor'
  | 'eyeStyle'
  | 'voiceStyle'
  | 'combatPath'
  | 'lifeSkillInterest'
  | CreatorSliderKey;

export interface CreatorRowMeta {
  readonly id: CreatorRowId;
  readonly label: string;
  readonly kind: 'select' | 'slider';
  readonly hasReset: boolean;
  readonly helpTitle: string;
  readonly helpBody: readonly string[];
}

export const CREATOR_ROWS: readonly CreatorRowMeta[] = Object.freeze([
  {
    id: 'appearancePreset',
    label: 'Appearance Preset',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Appearance Preset',
    helpBody: [
      'Choose one of ten ready-made starting appearances so you can step into the world in under a minute.',
      'Selecting a preset shapes the body and face together. Every setting below remains open for fine tuning.',
    ],
  },
  {
    id: 'silhouette',
    label: 'Body Silhouette',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Body Silhouette',
    helpBody: [
      'Shapes the overall frame and posture of your character in the live scene behind this panel.',
      'Silhouette is purely visual and never alters movement speed, reach, or combat balance.',
    ],
  },
  {
    id: 'facePreset',
    label: 'Face Structure',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Face Structure',
    helpBody: [
      'Selects brow contour, nose bridge, and jawline proportions across ten distinct faces.',
      'Built for clear expression reading in both third-person travel and close conversation.',
    ],
  },
  {
    id: 'skinTone',
    label: 'Skin Tone',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Skin Tone',
    helpBody: [
      'Adjusts surface complexion across warm, cool, and deep natural tones under scene lighting.',
      'Changes apply immediately to the live 3D body model standing in the courtyard.',
    ],
  },
  {
    id: 'hairShape',
    label: 'Hair Shape',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Hair Shape',
    helpBody: [
      'Selects the crown silhouette, braid work, or travel cut worn by your character.',
      'Combine with the Hair Volume slider below to adjust length and silhouette fullness.',
    ],
  },
  {
    id: 'hairColor',
    label: 'Hair Colour',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Hair Colour',
    helpBody: [
      'Sets the pigment and light reflection of the hair mesh in the live 3D scene.',
      'Natural ink, silver ash, woodland chestnut, forge copper, pale flax, and storm slate.',
    ],
  },
  {
    id: 'eyeStyle',
    label: 'Eye Style (GeminEYE)',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Eye Style (GeminEYE)',
    helpBody: [
      'Configures natural iris colour, optical GeminEYE contact lenses, or a scout field patch.',
      'Prepares your character for both third-person exploration and first-person GeminEYE sight.',
    ],
  },
  {
    id: 'voiceStyle',
    label: 'Voice Timbre',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Voice Timbre',
    helpBody: [
      'Chooses the vocal cadence used for effort breaths, parries, and callouts on the road.',
      'Four calm voice timbres are included at launch.',
    ],
  },
  {
    id: 'combatPath',
    label: 'Starter Combat Path',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Starter Combat Path',
    helpBody: [
      'Selects your opening martial discipline: Blade, Hammer, Spear, Bow, or Focus.',
      'You are never locked in. Every character can learn and switch disciplines freely in the world.',
    ],
  },
  {
    id: 'lifeSkillInterest',
    label: 'Life-Skill Interest',
    kind: 'select',
    hasReset: false,
    helpTitle: 'Life-Skill Interest',
    helpBody: [
      'Marks the first trade craft introduced when you arrive: Gathering, Fishing, Smithing, Alchemy, or Trading.',
      'All crafts remain open to practice at any camp or town workshop.',
    ],
  },
  {
    id: 'heightScale',
    label: 'Stature Height',
    kind: 'slider',
    hasReset: true,
    helpTitle: 'Stature Height',
    helpBody: [
      'Scales vertical body height in the live 3D scene between compact and tall stature.',
      'Use the square reset control beside the slider to restore the 1.00x baseline at any time.',
    ],
  },
  {
    id: 'shoulderWidth',
    label: 'Shoulder Span',
    kind: 'slider',
    hasReset: true,
    helpTitle: 'Shoulder Span',
    helpBody: [
      'Broadens or narrows the clavicle and upper-arm spacing on the live 3D character mesh.',
      'Use the reset control beside the slider to return to the standard 1.00x span.',
    ],
  },
  {
    id: 'torsoBuild',
    label: 'Torso Build',
    kind: 'slider',
    hasReset: true,
    helpTitle: 'Torso Build',
    helpBody: [
      'Shapes chest depth and core frame thickness on the live character model.',
      'Every character wears the kid-safe three-piece basics set (Plain Tee, Plain Trousers, Plain Sneakers) on exit.',
    ],
  },
  {
    id: 'headScale',
    label: 'Head Proportion',
    kind: 'slider',
    hasReset: true,
    helpTitle: 'Head Proportion',
    helpBody: [
      'Fine-tunes head and facial scale relative to the shoulders and collar line.',
      'Click the reset button next to the value box to restore the default proportion.',
    ],
  },
  {
    id: 'hairLength',
    label: 'Hair Volume',
    kind: 'slider',
    hasReset: true,
    helpTitle: 'Hair Volume',
    helpBody: [
      'Adjusts the vertical drape and crown volume of the chosen hair shape in the 3D scene.',
      'Includes an individual reset button to restore the default 1.00x volume.',
    ],
  },
  {
    id: 'previewYawDeg',
    label: 'Body Turn Angle',
    kind: 'slider',
    hasReset: true,
    helpTitle: 'Body Turn Angle',
    helpBody: [
      'Rotates the character body in the courtyard behind this panel so you can inspect profile and back posture.',
      'Reset returns the character to the standard three-quarter viewing angle.',
    ],
  },
]);

export const DEFAULT_CREATOR_STATE: CharacterCreatorState = Object.freeze({
  appearancePreset: 'preset-01-cloudwalker',
  silhouette: 'balanced-traveler',
  facePreset: 'face-01-serene',
  skinTone: 'warm-alabaster',
  hairShape: 'windswept-short',
  hairColor: 'raven-ink',
  eyeStyle: 'clear-iris',
  voiceStyle: 'calm-low',
  combatPath: 'blade',
  lifeSkillInterest: 'gathering',
  heightScale: CREATOR_SLIDER_SPECS.heightScale.defaultValue,
  shoulderWidth: CREATOR_SLIDER_SPECS.shoulderWidth.defaultValue,
  torsoBuild: CREATOR_SLIDER_SPECS.torsoBuild.defaultValue,
  headScale: CREATOR_SLIDER_SPECS.headScale.defaultValue,
  hairLength: CREATOR_SLIDER_SPECS.hairLength.defaultValue,
  previewYawDeg: CREATOR_SLIDER_SPECS.previewYawDeg.defaultValue,
});

export function createInitialCreatorState(): CharacterCreatorState {
  return { ...DEFAULT_CREATOR_STATE };
}

export function applyAppearancePreset(
  current: CharacterCreatorState,
  presetId: AppearancePresetId,
): CharacterCreatorState {
  const preset =
    APPEARANCE_PRESETS.find((item) => item.id === presetId) ?? APPEARANCE_PRESETS[0];
  return {
    ...current,
    appearancePreset: preset.id,
    silhouette: preset.silhouette,
    facePreset: preset.facePreset,
    skinTone: preset.skinTone,
    hairShape: preset.hairShape,
    hairColor: preset.hairColor,
    eyeStyle: preset.eyeStyle,
    voiceStyle: preset.voiceStyle,
    heightScale: clampSliderValue('heightScale', preset.heightScale),
    shoulderWidth: clampSliderValue('shoulderWidth', preset.shoulderWidth),
    torsoBuild: clampSliderValue('torsoBuild', preset.torsoBuild),
    headScale: clampSliderValue('headScale', preset.headScale),
    hairLength: clampSliderValue('hairLength', preset.hairLength),
  };
}

export function clampSliderValue(key: CreatorSliderKey, rawValue: number): number {
  const spec = CREATOR_SLIDER_SPECS[key];
  if (!Number.isFinite(rawValue)) {
    return spec.defaultValue;
  }
  const clamped = Math.min(spec.max, Math.max(spec.min, rawValue));
  return Number(clamped.toFixed(2));
}

export function updateCreatorSlider(
  current: CharacterCreatorState,
  key: CreatorSliderKey,
  rawValue: number,
): CharacterCreatorState {
  return {
    ...current,
    [key]: clampSliderValue(key, rawValue),
  };
}

export function resetCreatorSlider(
  current: CharacterCreatorState,
  key: CreatorSliderKey,
): CharacterCreatorState {
  return {
    ...current,
    [key]: CREATOR_SLIDER_SPECS[key].defaultValue,
  };
}

export function resetAllCreatorSliders(
  current: CharacterCreatorState,
): CharacterCreatorState {
  return {
    ...current,
    heightScale: CREATOR_SLIDER_SPECS.heightScale.defaultValue,
    shoulderWidth: CREATOR_SLIDER_SPECS.shoulderWidth.defaultValue,
    torsoBuild: CREATOR_SLIDER_SPECS.torsoBuild.defaultValue,
    headScale: CREATOR_SLIDER_SPECS.headScale.defaultValue,
    hairLength: CREATOR_SLIDER_SPECS.hairLength.defaultValue,
    previewYawDeg: CREATOR_SLIDER_SPECS.previewYawDeg.defaultValue,
  };
}

/**
 * Emits ONLY the pure body profile and starter path / life-skill choices.
 * Explicitly strips any extraneous properties so outfit, skin, shop, or stat
 * fields can never be emitted from the character creator.
 */
export function emitCharacterBodyProfile(
  state: CharacterCreatorState,
): EmittedCharacterBodyProfile {
  return Object.freeze({
    silhouette: state.silhouette,
    facePreset: state.facePreset,
    skinTone: state.skinTone,
    hairShape: state.hairShape,
    hairColor: state.hairColor,
    eyeStyle: state.eyeStyle,
    voiceStyle: state.voiceStyle,
    combatPath: state.combatPath,
    lifeSkillInterest: state.lifeSkillInterest,
    heightScale: clampSliderValue('heightScale', state.heightScale),
    shoulderWidth: clampSliderValue('shoulderWidth', state.shoulderWidth),
    torsoBuild: clampSliderValue('torsoBuild', state.torsoBuild),
    headScale: clampSliderValue('headScale', state.headScale),
    hairLength: clampSliderValue('hairLength', state.hairLength),
  });
}

/**
 * Produces the final exit payload when a player finishes or leaves the creator:
 * 1. Pure body profile (never any outfit, skin, or shop field).
 * 2. The mandatory three-piece kid-safe basics set (Plain Tee, Plain Trousers, Plain Sneakers).
 */
export function leaveCharacterCreator(
  state: CharacterCreatorState,
): CharacterCreatorExitState {
  return Object.freeze({
    body: emitCharacterBodyProfile(state),
    basics: createDefaultBasicsSet(),
  });
}

export interface CreatorBody3dParams {
  readonly rootScaleY: number;
  readonly shoulderSpanX: number;
  readonly torsoScaleX: number;
  readonly torsoScaleZ: number;
  readonly limbScaleX: number;
  readonly headScale: number;
  readonly jawWidthScale: number;
  readonly hairScaleY: number;
  readonly hairScaleX: number;
  readonly yawRad: number;
  readonly skinRgb: readonly [number, number, number];
  readonly hairRgb: readonly [number, number, number];
  readonly irisRgb: readonly [number, number, number];
  readonly hasEyePatch: boolean;
  readonly basicsTopRgb: readonly [number, number, number];
  readonly basicsBottomRgb: readonly [number, number, number];
  readonly basicsShoesRgb: readonly [number, number, number];
}

const SILHOUETTE_MODIFIERS: Readonly<
  Record<BodySilhouetteId, { y: number; shoulder: number; torso: number; limb: number }>
> = {
  'balanced-traveler': { y: 1.0, shoulder: 1.0, torso: 1.0, limb: 1.0 },
  'lean-strider': { y: 1.02, shoulder: 0.92, torso: 0.88, limb: 0.92 },
  'broad-vanguard': { y: 1.03, shoulder: 1.14, torso: 1.15, limb: 1.12 },
  'tall-wayfarer': { y: 1.07, shoulder: 1.02, torso: 0.96, limb: 0.98 },
  'compact-acrobat': { y: 0.92, shoulder: 0.95, torso: 0.94, limb: 0.95 },
};

const FACE_JAW_MODIFIERS: Readonly<Record<FacePresetId, number>> = {
  'face-01-serene': 1.0,
  'face-02-resolute': 1.08,
  'face-03-windborne': 0.94,
  'face-04-scholar': 0.96,
  'face-05-hearthwarm': 1.05,
  'face-06-duskwatch': 0.95,
  'face-07-starlit': 0.93,
  'face-08-ironbrow': 1.1,
  'face-09-reedlight': 0.92,
  'face-10-horizon': 1.01,
};

const HAIR_SHAPE_MODIFIERS: Readonly<Record<HairShapeId, { x: number; y: number }>> = {
  'windswept-short': { x: 1.0, y: 0.95 },
  'tied-crest': { x: 0.92, y: 1.22 },
  'braided-crown': { x: 1.06, y: 1.02 },
  'shoulder-waves': { x: 1.12, y: 1.18 },
  'cropped-helm': { x: 0.96, y: 0.82 },
  'long-wanderer': { x: 1.14, y: 1.35 },
};

/**
 * Computes concrete 3D scene transformation and material parameters from the
 * creator state so the live 3D body behind the panel updates on every change.
 */
export function computeCreatorBody3dParams(
  state: CharacterCreatorState,
): CreatorBody3dParams {
  const sil = SILHOUETTE_MODIFIERS[state.silhouette] ?? SILHOUETTE_MODIFIERS['balanced-traveler'];
  const jawMod = FACE_JAW_MODIFIERS[state.facePreset] ?? 1.0;
  const hairMod = HAIR_SHAPE_MODIFIERS[state.hairShape] ?? { x: 1.0, y: 1.0 };

  const skin = SKIN_TONES.find((s) => s.id === state.skinTone) ?? SKIN_TONES[1];
  const hair = HAIR_COLORS.find((h) => h.id === state.hairColor) ?? HAIR_COLORS[0];
  const eye = EYE_STYLES.find((e) => e.id === state.eyeStyle) ?? EYE_STYLES[0];

  const heightScale = clampSliderValue('heightScale', state.heightScale);
  const shoulderWidth = clampSliderValue('shoulderWidth', state.shoulderWidth);
  const torsoBuild = clampSliderValue('torsoBuild', state.torsoBuild);
  const headScale = clampSliderValue('headScale', state.headScale);
  const hairLength = clampSliderValue('hairLength', state.hairLength);
  const previewYawDeg = clampSliderValue('previewYawDeg', state.previewYawDeg);

  return {
    rootScaleY: Number((sil.y * heightScale).toFixed(4)),
    shoulderSpanX: Number((sil.shoulder * shoulderWidth).toFixed(4)),
    torsoScaleX: Number((sil.torso * torsoBuild).toFixed(4)),
    torsoScaleZ: Number((sil.torso * (0.9 + torsoBuild * 0.1)).toFixed(4)),
    limbScaleX: Number((sil.limb * (0.85 + torsoBuild * 0.15)).toFixed(4)),
    headScale: Number(headScale.toFixed(4)),
    jawWidthScale: Number((jawMod * headScale).toFixed(4)),
    hairScaleY: Number((hairMod.y * hairLength).toFixed(4)),
    hairScaleX: Number((hairMod.x * (0.92 + hairLength * 0.08)).toFixed(4)),
    yawRad: Number(((previewYawDeg * Math.PI) / 180).toFixed(4)),
    skinRgb: skin.rgb,
    hairRgb: hair.rgb,
    irisRgb: eye.irisRgb,
    hasEyePatch: eye.hasPatch,
    // Kid-safe three-piece basics: Plain Tee, Plain Trousers, Plain Sneakers in calm neutral cloth
    basicsTopRgb: [0.34, 0.36, 0.39],
    basicsBottomRgb: [0.22, 0.24, 0.27],
    basicsShoesRgb: [0.18, 0.19, 0.21],
  };
}

export interface VrmImportResult {
  readonly ok: boolean;
  readonly fileName: string;
  readonly title?: string;
  readonly author?: string;
  readonly version?: string;
  readonly allowsCommercialAndRedistribution: boolean;
  readonly reason?: string;
}

const GLB_MAGIC = 0x46546c67; // 'glTF'
const JSON_CHUNK_TYPE = 0x4e4f534a; // 'JSON'

/**
 * Parses a standard VRM 0.x or VRM 1.0 (`.vrm` glTF 2.0 binary) file imported by
 * the user from disk. Verifies the glTF binary container, extracts VRM metadata,
 * and checks that commercial usage and redistribution are permitted.
 * Never embeds VRoid Studio.
 */
export function parseVrmBinary(
  bytes: Uint8Array | ArrayBuffer,
  fileName = 'imported.vrm',
): VrmImportResult {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (buf.byteLength < 20) {
    return {
      ok: false,
      fileName,
      allowsCommercialAndRedistribution: false,
      reason: 'File is smaller than a valid 20-byte glTF/VRM binary header.',
    };
  }

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  if (magic !== GLB_MAGIC || version !== 2) {
    return {
      ok: false,
      fileName,
      allowsCommercialAndRedistribution: false,
      reason: 'File header is not a glTF 2.0 binary (.vrm).',
    };
  }

  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  if (jsonChunkType !== JSON_CHUNK_TYPE || 20 + jsonChunkLength > buf.byteLength) {
    return {
      ok: false,
      fileName,
      allowsCommercialAndRedistribution: false,
      reason: 'VRM JSON chunk header is malformed or truncated.',
    };
  }

  let parsedJson: Record<string, unknown>;
  try {
    const jsonBytes = buf.subarray(20, 20 + jsonChunkLength);
    const text = new TextDecoder('utf-8').decode(jsonBytes).replace(/\0+$/g, '').trim();
    parsedJson = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      fileName,
      allowsCommercialAndRedistribution: false,
      reason: 'Unable to parse VRM glTF JSON chunk.',
    };
  }

  const extensions = (parsedJson.extensions ?? {}) as Record<string, unknown>;
  const vrm0 = extensions.VRM as Record<string, unknown> | undefined;
  const vrm1 = extensions.VRMC_vrm as Record<string, unknown> | undefined;

  if (!vrm0 && !vrm1) {
    return {
      ok: false,
      fileName,
      allowsCommercialAndRedistribution: false,
      reason: 'Binary is glTF 2.0 but does not contain VRM or VRMC_vrm humanoid metadata.',
    };
  }

  const meta = ((vrm1?.meta ?? vrm0?.meta) ?? {}) as Record<string, unknown>;
  const title = typeof meta.title === 'string' && meta.title.trim()
    ? meta.title.trim()
    : typeof meta.name === 'string' && meta.name.trim()
      ? meta.name.trim()
      : fileName;
  const author = typeof meta.author === 'string'
    ? meta.author
    : Array.isArray(meta.authors) && typeof meta.authors[0] === 'string'
      ? meta.authors[0]
      : 'Unknown Author';

  let allowsCommercial = false;
  let allowsRedistribution = false;

  if (vrm1) {
    const comm = typeof meta.commercialUsage === 'string' ? meta.commercialUsage.trim() : '';
    allowsCommercial = comm === 'corporation' || comm === 'personalProfit';
    allowsRedistribution = meta.allowRedistribution === true;
  } else if (vrm0) {
    const comm = typeof meta.commercialUssageName === 'string' ? meta.commercialUssageName.trim().toLowerCase() : '';
    allowsCommercial = comm === 'allow';
    const redist = typeof meta.redistribution === 'string' ? meta.redistribution.trim().toLowerCase() : '';
    allowsRedistribution = redist === 'allow';
  }

  if (!allowsCommercial || !allowsRedistribution) {
    const missing: string[] = [];
    if (!allowsCommercial) missing.push('commercial use');
    if (!allowsRedistribution) missing.push('redistribution');
    return {
      ok: false,
      fileName,
      title,
      author,
      version: vrm1 ? '1.0' : '0.x',
      allowsCommercialAndRedistribution: false,
      reason: `VRM import rejected: licence metadata does not explicitly allow ${missing.join(' and ')}.`,
    };
  }

  return {
    ok: true,
    fileName,
    title,
    author,
    version: vrm1 ? '1.0' : '0.x',
    allowsCommercialAndRedistribution: true,
  };
}

/**
 * Helper used by automated tests to construct a minimal valid VRM 0.x / 1.0 glTF binary
 * in memory with explicit licence metadata.
 */
export function buildSampleMinimalVrmBinary(options: {
  title: string;
  author: string;
  version?: '0.x' | '1.0';
  commercialUsage?: string | boolean;
  commercialUssageName?: string;
  redistribution?: string | boolean;
  allowRedistribution?: boolean;
  otherPermissionUrl?: string;
}): Uint8Array {
  const isVrm0 = options.version === '0.x';
  let jsonPayload: string;

  if (isVrm0) {
    const meta: Record<string, unknown> = {
      title: options.title,
      author: options.author,
    };
    if (options.commercialUssageName !== undefined) {
      meta.commercialUssageName = options.commercialUssageName;
    } else if (options.commercialUsage !== undefined) {
      meta.commercialUssageName = options.commercialUsage;
    }
    if (options.redistribution !== undefined) {
      meta.redistribution = options.redistribution;
    }
    if (options.otherPermissionUrl !== undefined) {
      meta.otherPermissionUrl = options.otherPermissionUrl;
    }

    jsonPayload = JSON.stringify({
      asset: { version: '2.0', generator: 'DREAM-Studio-InHouse-VRM-Test' },
      extensionsUsed: ['VRM'],
      extensions: {
        VRM: {
          specVersion: '0.0',
          meta,
          humanoid: { humanBones: [] },
        },
      },
    });
  } else {
    const meta: Record<string, unknown> = {
      name: options.title,
      authors: [options.author],
    };
    if (options.commercialUsage !== undefined) {
      meta.commercialUsage = options.commercialUsage;
    }
    if (options.allowRedistribution !== undefined) {
      meta.allowRedistribution = options.allowRedistribution;
    } else if (typeof options.redistribution === 'boolean') {
      meta.allowRedistribution = options.redistribution;
    } else if (options.redistribution !== undefined) {
      meta.redistribution = options.redistribution;
    }
    if (options.otherPermissionUrl !== undefined) {
      meta.otherPermissionUrl = options.otherPermissionUrl;
    }

    jsonPayload = JSON.stringify({
      asset: { version: '2.0', generator: 'DREAM-Studio-InHouse-VRM-Test' },
      extensionsUsed: ['VRMC_vrm'],
      extensions: {
        VRMC_vrm: {
          specVersion: '1.0',
          meta,
          humanoid: { humanBones: {} },
        },
      },
    });
  }
  const encoder = new TextEncoder();
  const rawJsonBytes = encoder.encode(jsonPayload);
  const padLength = (4 - (rawJsonBytes.byteLength % 4)) % 4;
  const jsonChunkLength = rawJsonBytes.byteLength + padLength;
  const totalLength = 20 + jsonChunkLength;

  const out = new Uint8Array(totalLength);
  const view = new DataView(out.buffer);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, jsonChunkLength, true);
  view.setUint32(16, JSON_CHUNK_TYPE, true);
  out.set(rawJsonBytes, 20);
  for (let i = 0; i < padLength; i++) {
    out[20 + rawJsonBytes.byteLength + i] = 0x20; // space padding per glTF 2.0 spec
  }
  return out;
}
