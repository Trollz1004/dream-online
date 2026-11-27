/**
 * DREAM Engine — Equipment, Gem Sockets, Forge Crystal Stages & Costume Layer Module
 *
 * Pure data and deterministic calculations for the Equipment & Costume Window.
 * Grounded in:
 *  - RULINGS-2026-11-12.md (sections 2, 3, and 7)
 *  - docs/gdd/09-interface-style.md (calm, dark, see-through, white on dark)
 *  - docs/gdd/10-wardrobe-catalogue.md & docs/gdd/12-wardrobe-needs-shop.md
 *  - GEMINI-JEWLS-ACCESSORIES-PROPOSAL-2026-11-10.md (6 accessories, 10 gem sockets, 4 tiers)
 *  - FORGE-CRYSTALS-PROPOSAL-2026-11-10.md (15 crystal stages, 4 recovery stats, weapon glow & armor wings)
 *
 * All layouts, naming, and structures are 100% original to DREAM Online.
 */

export const WEAPON_SLOT_IDS = ['main-hand', 'off-hand', 'awakening'] as const;
export type WeaponSlotId = (typeof WEAPON_SLOT_IDS)[number];

export const ARMOR_SLOT_IDS = ['helm', 'chest', 'gloves', 'boots'] as const;
export type ArmorSlotId = (typeof ARMOR_SLOT_IDS)[number];

export const ACCESSORY_SLOT_IDS = [
  'necklace',
  'ring-1',
  'ring-2',
  'earring-1',
  'earring-2',
  'bracelet',
] as const;
export type AccessorySlotId = (typeof ACCESSORY_SLOT_IDS)[number];

export const GEAR_SLOT_IDS = [
  ...WEAPON_SLOT_IDS,
  ...ARMOR_SLOT_IDS,
  ...ACCESSORY_SLOT_IDS,
] as const;
export type GearSlotId = (typeof GEAR_SLOT_IDS)[number];

export const COSTUME_SLOT_IDS = [
  'helm',
  'chest',
  'gloves',
  'bottom',
  'boots',
  'main-hand',
  'off-hand',
  'awakening',
] as const;
export type CostumeSlotId = (typeof COSTUME_SLOT_IDS)[number];

/** Life-skill costumes fill only chest and helm (RULINGS-2026-11-12 section 2.6). */
export const LIFE_SKILL_COSTUME_SLOTS: readonly CostumeSlotId[] = Object.freeze([
  'helm',
  'chest',
]);

/** Full combat costumes fill all 8 costume slots, including main hand, off hand, and awakening skins. */
export const COMBAT_COSTUME_SLOTS: readonly CostumeSlotId[] = Object.freeze([
  ...COSTUME_SLOT_IDS,
]);

export interface GearSlotMeta {
  readonly id: GearSlotId;
  readonly label: string;
  readonly shortLabel: string;
  readonly group: 'weapon' | 'armor' | 'accessory';
  readonly maxGemSockets: number;
  readonly supportsCrystalStages: boolean;
}

/**
 * Socket counts per Gemini Jewls' specification:
 * Necklace: 3, Ring 1: 2, Ring 2: 2, Earring 1: 1, Earring 2: 1, Bracelet: 2 (10 sockets total).
 */
export const ACCESSORY_MAX_GEM_SOCKETS: Readonly<Record<AccessorySlotId, number>> = Object.freeze({
  necklace: 3,
  'ring-1': 2,
  'ring-2': 2,
  'earring-1': 1,
  'earring-2': 1,
  bracelet: 2,
});

export const TOTAL_MAX_ACCESSORY_GEM_SOCKETS = 11;

export const GEAR_SLOT_META: Readonly<Record<GearSlotId, GearSlotMeta>> = Object.freeze({
  'main-hand': Object.freeze({
    id: 'main-hand',
    label: 'Main Hand Weapon',
    shortLabel: 'Main Hand',
    group: 'weapon',
    maxGemSockets: 0,
    supportsCrystalStages: true,
  }),
  'off-hand': Object.freeze({
    id: 'off-hand',
    label: 'Off Hand Guard',
    shortLabel: 'Off Hand',
    group: 'weapon',
    maxGemSockets: 0,
    supportsCrystalStages: true,
  }),
  awakening: Object.freeze({
    id: 'awakening',
    label: 'Awakening Weapon',
    shortLabel: 'Awakening',
    group: 'weapon',
    maxGemSockets: 0,
    supportsCrystalStages: true,
  }),
  helm: Object.freeze({
    id: 'helm',
    label: 'Helm',
    shortLabel: 'Helm',
    group: 'armor',
    maxGemSockets: 0,
    supportsCrystalStages: true,
  }),
  chest: Object.freeze({
    id: 'chest',
    label: 'Cuirass & Coat',
    shortLabel: 'Chest',
    group: 'armor',
    maxGemSockets: 0,
    supportsCrystalStages: true,
  }),
  gloves: Object.freeze({
    id: 'gloves',
    label: 'Gauntlets',
    shortLabel: 'Gloves',
    group: 'armor',
    maxGemSockets: 0,
    supportsCrystalStages: true,
  }),
  boots: Object.freeze({
    id: 'boots',
    label: 'Greaves & Boots',
    shortLabel: 'Boots',
    group: 'armor',
    maxGemSockets: 0,
    supportsCrystalStages: true,
  }),
  necklace: Object.freeze({
    id: 'necklace',
    label: 'Necklace (Centerpiece)',
    shortLabel: 'Necklace',
    group: 'accessory',
    maxGemSockets: 3,
    supportsCrystalStages: false,
  }),
  'ring-1': Object.freeze({
    id: 'ring-1',
    label: 'First Ring',
    shortLabel: 'Ring I',
    group: 'accessory',
    maxGemSockets: 2,
    supportsCrystalStages: false,
  }),
  'ring-2': Object.freeze({
    id: 'ring-2',
    label: 'Second Ring',
    shortLabel: 'Ring II',
    group: 'accessory',
    maxGemSockets: 2,
    supportsCrystalStages: false,
  }),
  'earring-1': Object.freeze({
    id: 'earring-1',
    label: 'Left Earring',
    shortLabel: 'Earring I',
    group: 'accessory',
    maxGemSockets: 1,
    supportsCrystalStages: false,
  }),
  'earring-2': Object.freeze({
    id: 'earring-2',
    label: 'Right Earring',
    shortLabel: 'Earring II',
    group: 'accessory',
    maxGemSockets: 1,
    supportsCrystalStages: false,
  }),
  bracelet: Object.freeze({
    id: 'bracelet',
    label: 'Wrist Bracelet',
    shortLabel: 'Bracelet',
    group: 'accessory',
    maxGemSockets: 2,
    supportsCrystalStages: false,
  }),
});

export interface CostumeSlotMeta {
  readonly id: CostumeSlotId;
  readonly label: string;
  readonly shortLabel: string;
  readonly category: 'apparel' | 'weapon-skin';
  readonly inLifeSkillCostume: boolean;
}

export const COSTUME_SLOT_META: Readonly<Record<CostumeSlotId, CostumeSlotMeta>> = Object.freeze({
  helm: Object.freeze({
    id: 'helm',
    label: 'Headwear Look',
    shortLabel: 'Head Look',
    category: 'apparel',
    inLifeSkillCostume: true,
  }),
  chest: Object.freeze({
    id: 'chest',
    label: 'Chest Look',
    shortLabel: 'Chest Look',
    category: 'apparel',
    inLifeSkillCostume: true,
  }),
  gloves: Object.freeze({
    id: 'gloves',
    label: 'Gloves Look',
    shortLabel: 'Gloves Look',
    category: 'apparel',
    inLifeSkillCostume: false,
  }),
  bottom: Object.freeze({
    id: 'bottom',
    label: 'Lower Body Look',
    shortLabel: 'Bottom Look',
    category: 'apparel',
    inLifeSkillCostume: false,
  }),
  boots: Object.freeze({
    id: 'boots',
    label: 'Footwear Look',
    shortLabel: 'Boots Look',
    category: 'apparel',
    inLifeSkillCostume: false,
  }),
  'main-hand': Object.freeze({
    id: 'main-hand',
    label: 'Main Weapon Skin',
    shortLabel: 'Main Skin',
    category: 'weapon-skin',
    inLifeSkillCostume: false,
  }),
  'off-hand': Object.freeze({
    id: 'off-hand',
    label: 'Off Hand Skin',
    shortLabel: 'Off Skin',
    category: 'weapon-skin',
    inLifeSkillCostume: false,
  }),
  awakening: Object.freeze({
    id: 'awakening',
    label: 'Awakening Weapon Skin',
    shortLabel: 'Awaken Skin',
    category: 'weapon-skin',
    inLifeSkillCostume: false,
  }),
});

// ============================================================================
// GEMINI JEWLS: GEMS, ELEMENTS, TIERS & SOCKETS
// ============================================================================

export const GEM_IDS = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'diamond'] as const;
export type GemId = (typeof GEM_IDS)[number];

export const GEM_TIER_IDS = ['chip', 'cut', 'flawless', 'fossilized'] as const;
export type GemTierId = (typeof GEM_TIER_IDS)[number];

export const GEM_TIER_BONUS_PERCENTS: Readonly<Record<GemTierId, number>> = Object.freeze({
  chip: 1,
  cut: 2,
  flawless: 4,
  fossilized: 6,
});

export const GEM_ELEMENT_CAP_PERCENT = 30;

export interface GemDefinition {
  readonly id: GemId;
  readonly name: string;
  readonly elementLabel: string;
  readonly glyphCode: string;
}

export const GEM_DEFINITIONS: Readonly<Record<GemId, GemDefinition>> = Object.freeze({
  ruby: Object.freeze({
    id: 'ruby',
    name: 'Ruby',
    elementLabel: 'Fire',
    glyphCode: 'FIR',
  }),
  sapphire: Object.freeze({
    id: 'sapphire',
    name: 'Sapphire',
    elementLabel: 'Water & Ice',
    glyphCode: 'ICE',
  }),
  emerald: Object.freeze({
    id: 'emerald',
    name: 'Emerald',
    elementLabel: 'Earth & Nature',
    glyphCode: 'ERT',
  }),
  topaz: Object.freeze({
    id: 'topaz',
    name: 'Topaz',
    elementLabel: 'Lightning',
    glyphCode: 'LTG',
  }),
  amethyst: Object.freeze({
    id: 'amethyst',
    name: 'Amethyst',
    elementLabel: 'Dream & Shadow',
    glyphCode: 'DRM',
  }),
  diamond: Object.freeze({
    id: 'diamond',
    name: 'Diamond',
    elementLabel: 'Light',
    glyphCode: 'LGT',
  }),
});

export interface SocketedGem {
  readonly gemId: GemId;
  readonly tier: GemTierId;
}

export interface AccessoryGemSocketState {
  readonly index: number;
  readonly unlocked: boolean;
  readonly gem: SocketedGem | null;
}

// ============================================================================
// FABLE'S FORGE CRYSTALS: 15 STAGES, 4 RECOVERY STATS, WEAPON AURA & WINGS
// ============================================================================

export const MAX_CRYSTAL_STAGE = 15;

export const CRYSTAL_RECOVERY_STAT_IDS = [
  'cooldown-reduction',
  'mana-recovery',
  'stamina',
  'energy',
] as const;
export type CrystalRecoveryStatId = (typeof CRYSTAL_RECOVERY_STAT_IDS)[number];

export const CRYSTAL_STAT_STEP_PERCENTS: Readonly<Record<CrystalRecoveryStatId, number>> =
  Object.freeze({
    'cooldown-reduction': 0.5,
    'mana-recovery': 1,
    stamina: 1,
    energy: 1,
  });

export const CRYSTAL_STAT_CAPS: Readonly<Record<CrystalRecoveryStatId, number>> = Object.freeze({
  'cooldown-reduction': 20,
  'mana-recovery': 40,
  stamina: 40,
  energy: 40,
});

export const CRYSTAL_STAT_LABELS: Readonly<Record<CrystalRecoveryStatId, string>> = Object.freeze({
  'cooldown-reduction': 'Cooldown Reduction',
  'mana-recovery': 'Mana Recovery',
  stamina: 'Stamina Recovery',
  energy: 'Energy Recovery',
});

export type WeaponCrystalAuraStyle = 'glow' | 'flame' | 'smoke';
export type ArmorWingMetalTier =
  | 'none'
  | 'rough-dark-iron'
  | 'polished-steel-silver'
  | 'platinum'
  | 'platinum-diamond-inlay';

export function resolveArmorWingMetalTier(stage: number): ArmorWingMetalTier {
  const clamped = Math.max(0, Math.min(MAX_CRYSTAL_STAGE, Math.floor(stage)));
  if (clamped === 0) return 'none';
  if (clamped <= 5) return 'rough-dark-iron';
  if (clamped <= 10) return 'polished-steel-silver';
  if (clamped <= 14) return 'platinum';
  return 'platinum-diamond-inlay';
}

export function formatArmorWingMetalLabel(tier: ArmorWingMetalTier): string {
  switch (tier) {
    case 'none':
      return 'No Wings';
    case 'rough-dark-iron':
      return 'Rough Dark Iron Wings';
    case 'polished-steel-silver':
      return 'Polished Steel & Silver Wings';
    case 'platinum':
      return 'Platinum Wings';
    case 'platinum-diamond-inlay':
      return 'Platinum & Diamond Inlay Wings';
  }
}

// ============================================================================
// GEAR ITEMS (WEAPONS, ARMOR, ACCESSORIES)
// ============================================================================

export type GearRarity = 'common' | 'uncommon' | 'rare' | 'legend' | 'mythos';

export interface GearItem {
  readonly id: string;
  readonly name: string;
  readonly slot: GearSlotId;
  readonly rarity: GearRarity;
  readonly attack: number;
  readonly defense: number;
  /** Crystal stage 0..15 for weapons and armor; always 0 for accessories. */
  readonly crystalStage: number;
  /** Player-chosen recovery stat picks across the unlocked crystal stages. */
  readonly crystalPicks: readonly CrystalRecoveryStatId[];
  /** Weapon crystal aura look (weapons only). */
  readonly weaponAura?: WeaponCrystalAuraStyle;
  /** Gem sockets (accessories only: 3 on necklace, 2 on each ring, 1 on each earring, 2 on bracelet). */
  readonly gemSockets: readonly AccessoryGemSocketState[];
  readonly summary: string;
}

// ============================================================================
// COSTUME PIECES, SETS & CONFIGURABLE WHOLE-SET RULE
// ============================================================================

export type CostumeSetKind = 'combat' | 'life-skill' | 'leisure';
export type CostumeSetId =
  | 'nightfall-sovereign-combat'
  | 'afk-zebra-angler-lifeskill'
  | 'sunshore-swimwear-leisure'
  | 'haven-culinary-lifeskill';

export interface CostumePiece {
  readonly id: string;
  readonly name: string;
  readonly slot: CostumeSlotId;
  readonly setId: CostumeSetId;
  readonly setKind: CostumeSetKind;
  /** Per-item tier stat note from docs/gdd/10-wardrobe-catalogue.md. */
  readonly pieceStatNote: string;
  /** Visual tag used by the live character preview renderer. */
  readonly visualTag:
    | 'sovereign-combat'
    | 'fish-head'
    | 'zebra-angler'
    | 'swimsuit-top'
    | 'swimsuit-bottom'
    | 'chef-hat'
    | 'cooking-apron';
  readonly summary: string;
}

export interface CostumeSetDefinition {
  readonly id: CostumeSetId;
  readonly name: string;
  readonly kind: CostumeSetKind;
  readonly requiredSlots: readonly CostumeSlotId[];
  readonly pieceIds: readonly string[];
  readonly effectStatLabel: string;
  readonly effectStatKey: string;
  readonly effectPercent: number;
  readonly description: string;
}

/**
 * Claude's reading, pending Josh (RULINGS-2026-11-12 section 2.9):
 * The set effect needs the whole set worn, so mixing parts for looks is a free choice
 * that gives up that set's effect.
 *
 * Built as a single setting that is easy to change: edit `DEFAULT_REQUIRE_WHOLE_COSTUME_SET`
 * below or pass `createCostumeSetRuleConfig({ requireWholeSet: false })`.
 */
export const DEFAULT_REQUIRE_WHOLE_COSTUME_SET = true;

export interface CostumeSetRuleConfig {
  readonly requireWholeSet: boolean;
}

export const DEFAULT_COSTUME_SET_RULE_CONFIG: CostumeSetRuleConfig = Object.freeze({
  requireWholeSet: DEFAULT_REQUIRE_WHOLE_COSTUME_SET,
});

export function createCostumeSetRuleConfig(
  overrides: Partial<CostumeSetRuleConfig> = {},
): CostumeSetRuleConfig {
  return Object.freeze({
    requireWholeSet:
      typeof overrides.requireWholeSet === 'boolean'
        ? overrides.requireWholeSet
        : DEFAULT_REQUIRE_WHOLE_COSTUME_SET,
  });
}

// ============================================================================
// IN-HOUSE COSTUME CATALOGUE & SETS
// ============================================================================

export const COSTUME_SETS: Readonly<Record<CostumeSetId, CostumeSetDefinition>> = Object.freeze({
  'nightfall-sovereign-combat': Object.freeze({
    id: 'nightfall-sovereign-combat',
    name: 'Nightfall Sovereign Panoply (Combat Set)',
    kind: 'combat',
    requiredSlots: COMBAT_COSTUME_SLOTS,
    pieceIds: Object.freeze([
      'sovereign-combat-helm',
      'sovereign-combat-chest',
      'sovereign-combat-gloves',
      'sovereign-combat-bottom',
      'sovereign-combat-boots',
      'sovereign-combat-main-hand',
      'sovereign-combat-off-hand',
      'sovereign-combat-awakening',
    ]),
    effectStatLabel: '+10% Combat Experience & +10% Awakening Readiness',
    effectStatKey: 'combat-experience-and-awakening',
    effectPercent: 10,
    description:
      'Full 8-piece combat regalia covering armor and all three weapon skins (main hand, off hand, and awakening).',
  }),
  'afk-zebra-angler-lifeskill': Object.freeze({
    id: 'afk-zebra-angler-lifeskill',
    name: 'Zebra Fish Scale Angler (Life-Skill Set)',
    kind: 'life-skill',
    requiredSlots: LIFE_SKILL_COSTUME_SLOTS,
    pieceIds: Object.freeze(['fishing-zebra-fish-head', 'fishing-zebra-scale-vest']),
    effectStatLabel: '+10% Fishing Experience, +10% Skill Speed & All-Tool Wear Cut',
    effectStatKey: 'fishing-speed-exp-and-wear-cut',
    effectPercent: 10,
    description:
      'Life-skill costume filling only helm and chest. Cuts wear on every tool (cheap NPC tools included) and raises fishing skill speed and experience.',
  }),
  'sunshore-swimwear-leisure': Object.freeze({
    id: 'sunshore-swimwear-leisure',
    name: 'Sunshore Tide Swimwear (Coast Set)',
    kind: 'leisure',
    requiredSlots: Object.freeze(['chest', 'bottom'] as const),
    pieceIds: Object.freeze(['sunshore-swimsuit-rashguard', 'sunshore-swimsuit-bottom']),
    effectStatLabel: '+10% Swimming Stamina & Coastal Sprint Cadence',
    effectStatKey: 'swimming-stamina-cadence',
    effectPercent: 10,
    description:
      'Two-piece coastal swimwear set. Mix the swimsuit bottom with the Zebra Fish Head for the classic PvP look.',
  }),
  'haven-culinary-lifeskill': Object.freeze({
    id: 'haven-culinary-lifeskill',
    name: "Haven Master Chef (Life-Skill Set)",
    kind: 'life-skill',
    requiredSlots: LIFE_SKILL_COSTUME_SLOTS,
    pieceIds: Object.freeze(['chefs-tall-hat', 'master-cooking-apron']),
    effectStatLabel: '+10% Cooking Experience, +10% Skill Speed & All-Tool Wear Cut',
    effectStatKey: 'cooking-speed-exp-and-wear-cut',
    effectPercent: 10,
    description:
      'Two-piece culinary life-skill costume filling only helm and chest. Raises cooking speed and experience and cuts utensil wear.',
  }),
});

export const COSTUME_PIECES: readonly CostumePiece[] = Object.freeze([
  // 1. Nightfall Sovereign Combat Costume (8 pieces: 5 apparel + 3 weapon skins)
  Object.freeze({
    id: 'sovereign-combat-helm',
    name: 'Nightfall Sovereign Visor Greathelm',
    slot: 'helm',
    setId: 'nightfall-sovereign-combat',
    setKind: 'combat',
    pieceStatNote: '10% experience (hat tier)',
    visualTag: 'sovereign-combat',
    summary: 'Engraved dark-plate greathelm skin with tactical night optics.',
  }),
  Object.freeze({
    id: 'sovereign-combat-chest',
    name: 'Nightfall Sovereign Engraved Coatplate',
    slot: 'chest',
    setId: 'nightfall-sovereign-combat',
    setKind: 'combat',
    pieceStatNote: 'Part of 8-piece combat set',
    visualTag: 'sovereign-combat',
    summary: 'Layered obsidian plate over a rain-slicked tactical trench mantle.',
  }),
  Object.freeze({
    id: 'sovereign-combat-gloves',
    name: 'Nightfall Sovereign Claw Gauntlets',
    slot: 'gloves',
    setId: 'nightfall-sovereign-combat',
    setKind: 'combat',
    pieceStatNote: 'Part of 8-piece combat set',
    visualTag: 'sovereign-combat',
    summary: 'Articulated silver-fluted finger gauntlets.',
  }),
  Object.freeze({
    id: 'sovereign-combat-bottom',
    name: 'Nightfall Sovereign Tactical Greave-Breeches',
    slot: 'bottom',
    setId: 'nightfall-sovereign-combat',
    setKind: 'combat',
    pieceStatNote: 'Part of 8-piece combat set',
    visualTag: 'sovereign-combat',
    summary: 'Reinforced dark leather combat breeches with plate tassets.',
  }),
  Object.freeze({
    id: 'sovereign-combat-boots',
    name: 'Nightfall Sovereign Strider Sabatons',
    slot: 'boots',
    setId: 'nightfall-sovereign-combat',
    setKind: 'combat',
    pieceStatNote: 'Part of 8-piece combat set',
    visualTag: 'sovereign-combat',
    summary: 'Heavy street-and-bastion sabatons with silent tread.',
  }),
  Object.freeze({
    id: 'sovereign-combat-main-hand',
    name: 'Nightfall Sovereign Greatsword Skin',
    slot: 'main-hand',
    setId: 'nightfall-sovereign-combat',
    setKind: 'combat',
    pieceStatNote: 'Main weapon skin (combat set)',
    visualTag: 'sovereign-combat',
    summary: 'Main-hand weapon skin etched with silver bastion fuller grooves.',
  }),
  Object.freeze({
    id: 'sovereign-combat-off-hand',
    name: 'Nightfall Sovereign Aegis Shield Skin',
    slot: 'off-hand',
    setId: 'nightfall-sovereign-combat',
    setKind: 'combat',
    pieceStatNote: 'Off-hand weapon skin (combat set)',
    visualTag: 'sovereign-combat',
    summary: 'Off-hand kite shield skin with raised sovereign crest.',
  }),
  Object.freeze({
    id: 'sovereign-combat-awakening',
    name: 'Nightfall Sovereign Dragon-Halberd Skin',
    slot: 'awakening',
    setId: 'nightfall-sovereign-combat',
    setKind: 'combat',
    pieceStatNote: 'Awakening weapon skin (combat set)',
    visualTag: 'sovereign-combat',
    summary: 'Awakening polearm skin forged for post-awakening evolution.',
  }),

  // 2. AFK Zebra Fish Scale Life-Skill Costume (2 pieces: Helm & Chest only)
  Object.freeze({
    id: 'fishing-zebra-fish-head',
    name: 'Zebra Fish Scale Fish-Head Mascot Helm',
    slot: 'helm',
    setId: 'afk-zebra-angler-lifeskill',
    setKind: 'life-skill',
    pieceStatNote: '10% fishing experience (hat tier)',
    visualTag: 'fish-head',
    summary:
      'Oversized sculpted zebra-striped fish head with dorsal fin and gills. Can be mixed with any outfit, including a swimsuit bottom in PvP.',
  }),
  Object.freeze({
    id: 'fishing-zebra-scale-vest',
    name: 'Zebra Fish Scale Angler Vest',
    slot: 'chest',
    setId: 'afk-zebra-angler-lifeskill',
    setKind: 'life-skill',
    pieceStatNote: '10% fishing experience & skill speed + tool wear cut',
    visualTag: 'zebra-angler',
    summary:
      'Waterproof zebra-scale life-skill vest with tackle pockets. Cuts wear on all tools, NPC throwaway tools included.',
  }),

  // 3. Sunshore Tide Swimwear Set (2 pieces: Chest & Bottom — includes Swimsuit Bottom)
  Object.freeze({
    id: 'sunshore-swimsuit-rashguard',
    name: 'Sunshore Tide Surf Top',
    slot: 'chest',
    setId: 'sunshore-swimwear-leisure',
    setKind: 'leisure',
    pieceStatNote: 'Part of 2-piece swimwear set',
    visualTag: 'swimsuit-top',
    summary: 'Lightweight coastal surf top built for open-water sprints.',
  }),
  Object.freeze({
    id: 'sunshore-swimsuit-bottom',
    name: 'Sunshore Tide Swimsuit Bottom',
    slot: 'bottom',
    setId: 'sunshore-swimwear-leisure',
    setKind: 'leisure',
    pieceStatNote: 'Part of 2-piece swimwear set',
    visualTag: 'swimsuit-bottom',
    summary:
      'Striped coastal swimsuit bottom. Pair with the Zebra Fish Head for Josh’s classic mixed PvP look.',
  }),

  // 4. Haven Master Chef Life-Skill Costume (2 pieces: Helm & Chest only)
  Object.freeze({
    id: 'chefs-tall-hat',
    name: "Chef's Pleated Toque Hat",
    slot: 'helm',
    setId: 'haven-culinary-lifeskill',
    setKind: 'life-skill',
    pieceStatNote: '10% cooking experience (hat tier)',
    visualTag: 'chef-hat',
    summary: 'Crisp tall kitchen hat that boosts cooking experience.',
  }),
  Object.freeze({
    id: 'master-cooking-apron',
    name: 'Cooking Apron & Utensil Strap',
    slot: 'chest',
    setId: 'haven-culinary-lifeskill',
    setKind: 'life-skill',
    pieceStatNote: '10% cooking experience & skill speed + tool wear cut',
    visualTag: 'cooking-apron',
    summary: 'Heavy linen cooking apron that speeds up hearth prep and cuts tool wear.',
  }),
]);

export function getCostumePieceById(id: string | null | undefined): CostumePiece | null {
  if (!id) return null;
  return COSTUME_PIECES.find((p) => p.id === id) ?? null;
}

export function getCostumePiecesForSlot(slot: CostumeSlotId): readonly CostumePiece[] {
  return Object.freeze(COSTUME_PIECES.filter((p) => p.slot === slot));
}

// ============================================================================
// DEFAULT FULL GEAR CATALOGUE (WEAPONS, ARMOR, 6 GEM-SOCKETED ACCESSORIES)
// ============================================================================

function makeCrystalPicks(
  stage: number,
  pattern: readonly CrystalRecoveryStatId[],
): readonly CrystalRecoveryStatId[] {
  const out: CrystalRecoveryStatId[] = [];
  for (let i = 0; i < stage; i++) {
    out.push(pattern[i % pattern.length]);
  }
  return Object.freeze(out);
}

export const FULL_COMBAT_GEAR_LOADOUT: Readonly<Record<GearSlotId, GearItem>> = Object.freeze({
  'main-hand': Object.freeze({
    id: 'sunspire-vanguard-greatsword',
    name: 'Sunspire Vanguard Broadsword',
    slot: 'main-hand',
    rarity: 'mythos',
    attack: 168,
    defense: 12,
    crystalStage: 15,
    crystalPicks: makeCrystalPicks(15, ['cooldown-reduction', 'cooldown-reduction', 'stamina']),
    weaponAura: 'flame',
    gemSockets: Object.freeze([]),
    summary: 'Primary vanguard blade forged at Fable’s Anvil. Stage 15 crystal flame density.',
  }),
  'off-hand': Object.freeze({
    id: 'bastion-lion-kite-shield',
    name: 'Bastion Rampant Kite Shield',
    slot: 'off-hand',
    rarity: 'legend',
    attack: 24,
    defense: 96,
    crystalStage: 12,
    crystalPicks: makeCrystalPicks(12, ['stamina', 'mana-recovery', 'cooldown-reduction']),
    weaponAura: 'glow',
    gemSockets: Object.freeze([]),
    summary: 'Heavy off-hand shield embossed with the rampant crest. Stage 12 crystal glow.',
  }),
  awakening: Object.freeze({
    id: 'crimson-dragon-war-halberd',
    name: 'Crimson Dragon Sovereign Halberd',
    slot: 'awakening',
    rarity: 'mythos',
    attack: 192,
    defense: 20,
    crystalStage: 15,
    crystalPicks: makeCrystalPicks(15, ['cooldown-reduction', 'mana-recovery', 'energy']),
    weaponAura: 'flame',
    gemSockets: Object.freeze([]),
    summary: 'Awakening polearm channeling the evolving crimson dragon form.',
  }),
  helm: Object.freeze({
    id: 'haven-winged-greathelm',
    name: 'Haven Winged Greathelm',
    slot: 'helm',
    rarity: 'legend',
    attack: 0,
    defense: 78,
    crystalStage: 15,
    crystalPicks: makeCrystalPicks(15, ['cooldown-reduction', 'mana-recovery', 'energy']),
    gemSockets: Object.freeze([]),
    summary: 'Fluted steel greathelm with Stage 15 platinum and diamond inlay wings.',
  }),
  chest: Object.freeze({
    id: 'haven-bastion-cuirass',
    name: 'Haven Bastion Fluted Cuirass',
    slot: 'chest',
    rarity: 'mythos',
    attack: 8,
    defense: 134,
    crystalStage: 15,
    crystalPicks: makeCrystalPicks(15, ['stamina', 'cooldown-reduction', 'mana-recovery']),
    gemSockets: Object.freeze([]),
    summary: 'Articulated breastplate and plackart with Stage 15 platinum and diamond wings.',
  }),
  gloves: Object.freeze({
    id: 'haven-vanguard-gauntlets',
    name: 'Haven Vanguard Gauntlets',
    slot: 'gloves',
    rarity: 'legend',
    attack: 14,
    defense: 62,
    crystalStage: 11,
    crystalPicks: makeCrystalPicks(11, ['cooldown-reduction', 'stamina', 'energy']),
    gemSockets: Object.freeze([]),
    summary: 'Locking plate gauntlets with Stage 11 platinum wing trim.',
  }),
  boots: Object.freeze({
    id: 'haven-strider-sabatons',
    name: 'Haven Strider Sabatons',
    slot: 'boots',
    rarity: 'legend',
    attack: 6,
    defense: 68,
    crystalStage: 12,
    crystalPicks: makeCrystalPicks(12, ['stamina', 'energy', 'mana-recovery']),
    gemSockets: Object.freeze([]),
    summary: 'Articulated greaves and sabatons with Stage 12 platinum wings.',
  }),
  necklace: Object.freeze({
    id: 'jewls-starfire-collar',
    name: "Jewls' Starfire Sovereign Collar",
    slot: 'necklace',
    rarity: 'mythos',
    attack: 42,
    defense: 36,
    crystalStage: 0,
    crystalPicks: Object.freeze([]),
    gemSockets: Object.freeze([
      Object.freeze({ index: 0, unlocked: true, gem: Object.freeze({ gemId: 'ruby', tier: 'fossilized' }) }),
      Object.freeze({ index: 1, unlocked: true, gem: Object.freeze({ gemId: 'sapphire', tier: 'fossilized' }) }),
      Object.freeze({ index: 2, unlocked: true, gem: Object.freeze({ gemId: 'diamond', tier: 'fossilized' }) }),
    ]),
    summary: 'Centerpiece necklace enhanced at Jewls’ Jewelry Box with 3 Fossilized gem sockets.',
  }),
  'ring-1': Object.freeze({
    id: 'jewls-solstice-signet-1',
    name: "Jewls' Solstice Signet I",
    slot: 'ring-1',
    rarity: 'legend',
    attack: 22,
    defense: 14,
    crystalStage: 0,
    crystalPicks: Object.freeze([]),
    gemSockets: Object.freeze([
      Object.freeze({ index: 0, unlocked: true, gem: Object.freeze({ gemId: 'ruby', tier: 'flawless' }) }),
      Object.freeze({ index: 1, unlocked: true, gem: Object.freeze({ gemId: 'topaz', tier: 'fossilized' }) }),
    ]),
    summary: 'First ring holding 2 guaranteed gem sockets.',
  }),
  'ring-2': Object.freeze({
    id: 'jewls-solstice-signet-2',
    name: "Jewls' Solstice Signet II",
    slot: 'ring-2',
    rarity: 'legend',
    attack: 22,
    defense: 14,
    crystalStage: 0,
    crystalPicks: Object.freeze([]),
    gemSockets: Object.freeze([
      Object.freeze({ index: 0, unlocked: true, gem: Object.freeze({ gemId: 'amethyst', tier: 'fossilized' }) }),
      Object.freeze({ index: 1, unlocked: true, gem: Object.freeze({ gemId: 'emerald', tier: 'flawless' }) }),
    ]),
    summary: 'Second ring holding 2 guaranteed gem sockets.',
  }),
  'earring-1': Object.freeze({
    id: 'jewls-whisper-stud-1',
    name: "Jewls' Whisper Arc Stud I",
    slot: 'earring-1',
    rarity: 'rare',
    attack: 16,
    defense: 12,
    crystalStage: 0,
    crystalPicks: Object.freeze([]),
    gemSockets: Object.freeze([
      Object.freeze({ index: 0, unlocked: true, gem: Object.freeze({ gemId: 'sapphire', tier: 'flawless' }) }),
    ]),
    summary: 'Left earring enhanced at Jewls’ with 1 Flawless Sapphire socket.',
  }),
  'earring-2': Object.freeze({
    id: 'jewls-whisper-stud-2',
    name: "Jewls' Whisper Arc Stud II",
    slot: 'earring-2',
    rarity: 'rare',
    attack: 16,
    defense: 12,
    crystalStage: 0,
    crystalPicks: Object.freeze([]),
    gemSockets: Object.freeze([
      Object.freeze({ index: 0, unlocked: true, gem: Object.freeze({ gemId: 'diamond', tier: 'flawless' }) }),
    ]),
    summary: 'Right earring enhanced at Jewls’ with 1 Flawless Diamond socket.',
  }),
  bracelet: Object.freeze({
    id: 'jewls-tidebound-cuff',
    name: "Jewls' Tidebound Wrist Cuff",
    slot: 'bracelet',
    rarity: 'legend',
    attack: 18,
    defense: 24,
    crystalStage: 0,
    crystalPicks: Object.freeze([]),
    gemSockets: Object.freeze([
      Object.freeze({ index: 0, unlocked: true, gem: Object.freeze({ gemId: 'emerald', tier: 'fossilized' }) }),
      Object.freeze({ index: 1, unlocked: true, gem: Object.freeze({ gemId: 'amethyst', tier: 'cut' }) }),
    ]),
    summary: 'Heavy wrist cuff holding 2 gem sockets.',
  }),
});

// ============================================================================
// WINDOW STATE, PRESETS & MUTATORS
// ============================================================================

export type CharacterAppearanceDisplayMode = 'costume' | 'gear';
export type EquipmentPresetId = 'empty' | 'full-combat' | 'mixed-fish-swimsuit' | 'lifeskill-angler';

export interface EquipmentWindowState {
  readonly presetId: EquipmentPresetId;
  readonly gear: Readonly<Record<GearSlotId, GearItem | null>>;
  readonly costumes: Readonly<Record<CostumeSlotId, CostumePiece | null>>;
  readonly hiddenCostumeSlots: Readonly<Record<CostumeSlotId, boolean>>;
  readonly displayMode: CharacterAppearanceDisplayMode;
  readonly setRuleConfig: CostumeSetRuleConfig;
}

function createEmptyHiddenSlots(): Readonly<Record<CostumeSlotId, boolean>> {
  return Object.freeze({
    helm: false,
    chest: false,
    gloves: false,
    bottom: false,
    boots: false,
    'main-hand': false,
    'off-hand': false,
    awakening: false,
  });
}

export function createEmptyEquipmentState(
  setRuleConfig: CostumeSetRuleConfig = DEFAULT_COSTUME_SET_RULE_CONFIG,
): EquipmentWindowState {
  const emptyGear = {} as Record<GearSlotId, GearItem | null>;
  for (const slot of GEAR_SLOT_IDS) {
    emptyGear[slot] = null;
  }
  const emptyCostumes = {} as Record<CostumeSlotId, CostumePiece | null>;
  for (const slot of COSTUME_SLOT_IDS) {
    emptyCostumes[slot] = null;
  }
  return Object.freeze({
    presetId: 'empty',
    gear: Object.freeze(emptyGear),
    costumes: Object.freeze(emptyCostumes),
    hiddenCostumeSlots: createEmptyHiddenSlots(),
    displayMode: 'costume',
    setRuleConfig,
  });
}

export function createFullEquippedState(
  setRuleConfig: CostumeSetRuleConfig = DEFAULT_COSTUME_SET_RULE_CONFIG,
): EquipmentWindowState {
  const costumes = {} as Record<CostumeSlotId, CostumePiece | null>;
  for (const slot of COSTUME_SLOT_IDS) {
    costumes[slot] =
      COSTUME_PIECES.find(
        (p) => p.setId === 'nightfall-sovereign-combat' && p.slot === slot,
      ) ?? null;
  }
  return Object.freeze({
    presetId: 'full-combat',
    gear: FULL_COMBAT_GEAR_LOADOUT,
    costumes: Object.freeze(costumes),
    hiddenCostumeSlots: createEmptyHiddenSlots(),
    displayMode: 'costume',
    setRuleConfig,
  });
}

/**
 * Josh's canonical mixing test case:
 * Fishing costume's Zebra Fish Head (`helm`) worn with a Swimsuit Bottom (`bottom`) over combat gear.
 */
export function createFishHeadSwimsuitMixState(
  setRuleConfig: CostumeSetRuleConfig = DEFAULT_COSTUME_SET_RULE_CONFIG,
): EquipmentWindowState {
  const costumes = {} as Record<CostumeSlotId, CostumePiece | null>;
  for (const slot of COSTUME_SLOT_IDS) {
    costumes[slot] = null;
  }
  costumes.helm = getCostumePieceById('fishing-zebra-fish-head');
  costumes.bottom = getCostumePieceById('sunshore-swimsuit-bottom');

  return Object.freeze({
    presetId: 'mixed-fish-swimsuit',
    gear: FULL_COMBAT_GEAR_LOADOUT,
    costumes: Object.freeze(costumes),
    hiddenCostumeSlots: createEmptyHiddenSlots(),
    displayMode: 'costume',
    setRuleConfig,
  });
}

export function createLifeSkillAnglerState(
  setRuleConfig: CostumeSetRuleConfig = DEFAULT_COSTUME_SET_RULE_CONFIG,
): EquipmentWindowState {
  const costumes = {} as Record<CostumeSlotId, CostumePiece | null>;
  for (const slot of COSTUME_SLOT_IDS) {
    costumes[slot] = null;
  }
  costumes.helm = getCostumePieceById('fishing-zebra-fish-head');
  costumes.chest = getCostumePieceById('fishing-zebra-scale-vest');

  return Object.freeze({
    presetId: 'lifeskill-angler',
    gear: FULL_COMBAT_GEAR_LOADOUT,
    costumes: Object.freeze(costumes),
    hiddenCostumeSlots: createEmptyHiddenSlots(),
    displayMode: 'costume',
    setRuleConfig,
  });
}

export function createStateFromPreset(
  presetId: EquipmentPresetId,
  setRuleConfig: CostumeSetRuleConfig = DEFAULT_COSTUME_SET_RULE_CONFIG,
): EquipmentWindowState {
  switch (presetId) {
    case 'empty':
      return createEmptyEquipmentState(setRuleConfig);
    case 'full-combat':
      return createFullEquippedState(setRuleConfig);
    case 'mixed-fish-swimsuit':
      return createFishHeadSwimsuitMixState(setRuleConfig);
    case 'lifeskill-angler':
      return createLifeSkillAnglerState(setRuleConfig);
  }
}

export function equipCostumePiece(
  state: EquipmentWindowState,
  slot: CostumeSlotId,
  pieceId: string | null,
): EquipmentWindowState {
  if (pieceId === null) {
    return Object.freeze({
      ...state,
      costumes: Object.freeze({
        ...state.costumes,
        [slot]: null,
      }),
    });
  }
  const piece = getCostumePieceById(pieceId);
  if (!piece || piece.slot !== slot) {
    throw new Error(`Invalid costume piece "${pieceId}" for slot "${slot}"`);
  }
  return Object.freeze({
    ...state,
    costumes: Object.freeze({
      ...state.costumes,
      [slot]: piece,
    }),
  });
}

export function toggleCostumeSlotVisibility(
  state: EquipmentWindowState,
  slot: CostumeSlotId,
): EquipmentWindowState {
  return Object.freeze({
    ...state,
    hiddenCostumeSlots: Object.freeze({
      ...state.hiddenCostumeSlots,
      [slot]: !state.hiddenCostumeSlots[slot],
    }),
  });
}

export function setCharacterDisplayMode(
  state: EquipmentWindowState,
  mode: CharacterAppearanceDisplayMode,
): EquipmentWindowState {
  return Object.freeze({
    ...state,
    displayMode: mode,
  });
}

export function toggleGearSlotEquipped(
  state: EquipmentWindowState,
  slot: GearSlotId,
): EquipmentWindowState {
  const current = state.gear[slot];
  const nextItem = current ? null : FULL_COMBAT_GEAR_LOADOUT[slot];
  return Object.freeze({
    ...state,
    gear: Object.freeze({
      ...state.gear,
      [slot]: nextItem,
    }),
  });
}

// ============================================================================
// SET EFFECT EVALUATION & TOTALS COMPUTATION
// ============================================================================

export interface CostumeSetEvaluation {
  readonly set: CostumeSetDefinition;
  readonly wornCount: number;
  readonly totalPieces: number;
  readonly wornPieceIds: readonly string[];
  readonly isComplete: boolean;
  readonly isBroken: boolean;
  readonly effectActive: boolean;
  readonly activePercent: number;
  readonly statusLabel: string;
}

export function evaluateCostumeSets(
  costumes: Readonly<Record<CostumeSlotId, CostumePiece | null>>,
  config: CostumeSetRuleConfig = DEFAULT_COSTUME_SET_RULE_CONFIG,
): readonly CostumeSetEvaluation[] {
  const wornPieces = Object.values(costumes).filter((p): p is CostumePiece => p !== null);

  return Object.freeze(
    (Object.keys(COSTUME_SETS) as CostumeSetId[]).map((setId) => {
      const set = COSTUME_SETS[setId];
      const matchingIds = wornPieces
        .filter((p) => p.setId === setId)
        .map((p) => p.id);
      const wornCount = matchingIds.length;
      const totalPieces = set.pieceIds.length;
      const isComplete = wornCount === totalPieces;
      const isBroken = wornCount > 0 && wornCount < totalPieces;

      const effectActive = config.requireWholeSet ? isComplete : wornCount > 0;
      const activePercent = effectActive
        ? config.requireWholeSet
          ? set.effectPercent
          : Math.round((set.effectPercent * wornCount) / totalPieces)
        : 0;

      let statusLabel: string;
      if (effectActive && isComplete) {
        statusLabel = `EFFECT ON · ${wornCount}/${totalPieces} WORN (+${activePercent}%)`;
      } else if (effectActive) {
        statusLabel = `EFFECT ON (PARTIAL) · ${wornCount}/${totalPieces} WORN (+${activePercent}%)`;
      } else if (isBroken) {
        statusLabel = `EFFECT OFF · SET BROKEN (${wornCount}/${totalPieces} WORN)`;
      } else {
        statusLabel = `EFFECT OFF · 0/${totalPieces} WORN`;
      }

      return Object.freeze({
        set,
        wornCount,
        totalPieces,
        wornPieceIds: Object.freeze(matchingIds),
        isComplete,
        isBroken,
        effectActive,
        activePercent,
        statusLabel,
      });
    }),
  );
}

export interface CrystalRecoveryTotals {
  readonly raw: Readonly<Record<CrystalRecoveryStatId, number>>;
  readonly capped: Readonly<Record<CrystalRecoveryStatId, number>>;
  readonly isCapped: Readonly<Record<CrystalRecoveryStatId, boolean>>;
  readonly totalStagesEquipped: number;
}

export interface ElementalGemSummary {
  readonly gemId: GemId;
  readonly name: string;
  readonly elementLabel: string;
  readonly rawPercent: number;
  readonly cappedPercent: number;
  readonly isCapped: boolean;
}

export interface EquipmentTotalsSummary {
  readonly attackTotal: number;
  readonly defenseTotal: number;
  readonly equippedGearCount: number;
  readonly equippedCostumeCount: number;
  readonly totalSocketedGems: number;
  readonly totalAccessorySockets: number;
  readonly crystalRecovery: CrystalRecoveryTotals;
  readonly elementalGems: readonly ElementalGemSummary[];
  readonly costumeSets: readonly CostumeSetEvaluation[];
}

export function computeEquipmentTotals(
  state: EquipmentWindowState,
): EquipmentTotalsSummary {
  let attackTotal = 0;
  let defenseTotal = 0;
  let equippedGearCount = 0;
  let totalStagesEquipped = 0;
  let totalSocketedGems = 0;

  const rawCrystal: Record<CrystalRecoveryStatId, number> = {
    'cooldown-reduction': 0,
    'mana-recovery': 0,
    stamina: 0,
    energy: 0,
  };

  const rawGems: Record<GemId, number> = {
    ruby: 0,
    sapphire: 0,
    emerald: 0,
    topaz: 0,
    amethyst: 0,
    diamond: 0,
  };

  for (const slot of GEAR_SLOT_IDS) {
    const item = state.gear[slot];
    if (!item) continue;
    equippedGearCount++;
    attackTotal += item.attack;
    defenseTotal += item.defense;
    totalStagesEquipped += item.crystalStage;

    for (const pick of item.crystalPicks) {
      rawCrystal[pick] += CRYSTAL_STAT_STEP_PERCENTS[pick];
    }

    for (const socket of item.gemSockets) {
      if (socket.unlocked && socket.gem) {
        totalSocketedGems++;
        rawGems[socket.gem.gemId] += GEM_TIER_BONUS_PERCENTS[socket.gem.tier];
      }
    }
  }

  const cappedCrystal = {} as Record<CrystalRecoveryStatId, number>;
  const isCappedCrystal = {} as Record<CrystalRecoveryStatId, boolean>;
  for (const statId of CRYSTAL_RECOVERY_STAT_IDS) {
    const cap = CRYSTAL_STAT_CAPS[statId];
    cappedCrystal[statId] = Math.min(cap, rawCrystal[statId]);
    isCappedCrystal[statId] = rawCrystal[statId] > cap;
  }

  const elementalGems: ElementalGemSummary[] = GEM_IDS.map((gemId) => {
    const def = GEM_DEFINITIONS[gemId];
    const rawPercent = rawGems[gemId];
    const cappedPercent = Math.min(GEM_ELEMENT_CAP_PERCENT, rawPercent);
    return Object.freeze({
      gemId,
      name: def.name,
      elementLabel: def.elementLabel,
      rawPercent,
      cappedPercent,
      isCapped: rawPercent > GEM_ELEMENT_CAP_PERCENT,
    });
  });

  const equippedCostumeCount = COSTUME_SLOT_IDS.filter(
    (s) => state.costumes[s] !== null,
  ).length;

  const costumeSets = evaluateCostumeSets(state.costumes, state.setRuleConfig);

  return Object.freeze({
    attackTotal,
    defenseTotal,
    equippedGearCount,
    equippedCostumeCount,
    totalSocketedGems,
    totalAccessorySockets: TOTAL_MAX_ACCESSORY_GEM_SOCKETS,
    crystalRecovery: Object.freeze({
      raw: Object.freeze(rawCrystal),
      capped: Object.freeze(cappedCrystal),
      isCapped: Object.freeze(isCappedCrystal),
      totalStagesEquipped,
    }),
    elementalGems: Object.freeze(elementalGems),
    costumeSets,
  });
}

export interface ResolvedCharacterSlotVisual {
  readonly slot: CostumeSlotId;
  readonly activeSource: 'costume' | 'gear' | 'basic-or-empty';
  readonly label: string;
  readonly visualTag: string;
}

/**
 * Resolves what is visually shown on the character preview for each slot,
 * honoring both the master `displayMode` ('costume' vs 'gear') and each slot's
 * per-piece Hide/Show toggle (`hiddenCostumeSlots`).
 */
export function resolveVisibleCharacterAppearance(
  state: EquipmentWindowState,
): Readonly<Record<CostumeSlotId, ResolvedCharacterSlotVisual>> {
  const result = {} as Record<CostumeSlotId, ResolvedCharacterSlotVisual>;

  const costumeToGearSlot: Readonly<Record<CostumeSlotId, GearSlotId | null>> = {
    helm: 'helm',
    chest: 'chest',
    gloves: 'gloves',
    bottom: null,
    boots: 'boots',
    'main-hand': 'main-hand',
    'off-hand': 'off-hand',
    awakening: 'awakening',
  };

  for (const slot of COSTUME_SLOT_IDS) {
    const costumePiece = state.costumes[slot];
    const isHidden = state.hiddenCostumeSlots[slot];
    const gearSlot = costumeToGearSlot[slot];
    const gearItem = gearSlot ? state.gear[gearSlot] : null;

    if (state.displayMode === 'costume' && costumePiece && !isHidden) {
      result[slot] = Object.freeze({
        slot,
        activeSource: 'costume',
        label: costumePiece.name,
        visualTag: costumePiece.visualTag,
      });
    } else if (gearItem) {
      result[slot] = Object.freeze({
        slot,
        activeSource: 'gear',
        label: gearItem.name,
        visualTag: `gear-${gearItem.slot}`,
      });
    } else if (slot === 'bottom' && state.gear.chest) {
      result[slot] = Object.freeze({
        slot,
        activeSource: 'gear',
        label: 'Vanguard Plate Tassets & Greaves',
        visualTag: 'gear-bottom',
      });
    } else {
      result[slot] = Object.freeze({
        slot,
        activeSource: 'basic-or-empty',
        label:
          slot === 'chest'
            ? 'Plain Tee (Kid-Safe Basic)'
            : slot === 'bottom'
              ? 'Plain Trousers (Kid-Safe Basic)'
              : slot === 'boots'
                ? 'Plain Sneakers (Kid-Safe Basic)'
                : 'Unarmed / Empty',
        visualTag: 'basic',
      });
    }
  }

  return Object.freeze(result);
}
