/**
 * Canon site content for dream-online.net
 *
 * Source of truth:
 * - docs/house/SITE-BRIEF-dream-online-net.md
 * - docs/gdd/00-vision.md
 * - docs/gdd/00a-first-playable-promise.md
 * - docs/gdd/01a-first-15-minute-journey.md
 * - docs/gdd/canon-lore-inhouse.md
 *
 * Customer copy rule: every headline, kicker, and caption sells the game's
 * direct value to the player. Nothing negative is said about anyone.
 */

export const BRAND_META = {
  domain: 'dream-online.net',
  title: 'DREAM ONLINE',
  fullBanner: 'DREAM ONLINE',
  builderAttribution: 'Built with Google Gemini',
  heroKicker: 'DREAM ONLINE · ONE UNSHARDED REALM',
  heroLines: ['ONE SHARED WORLD.', 'DREAMED TWICE.'],
  heroSubhead:
    'A third-person 3D action RPG where every player walks the same continuous horizon, every NPC remembers your deeds, and nightfall awakens a neon metropolis.',
  stickyCtaLabel: 'PLAY FIRST 15 MINUTES',
  primaryCtaLabel: 'PLAY THE FIRST 15 MINUTES',
  serverProbeLabel: 'REALM ONLINE · 23:06 ET',
  splitFlapPhrases: [
    'ONE UNSHARDED REALM',
    'DAY DREAMS OLD WORLD',
    'NIGHTFALL METROPOLIS',
    'STAMINA ACTION COMBAT',
    'TEN LIFE SKILLS',
    'LIVING NPC MEMORY',
  ],
} as const;

export interface ChapterStep {
  id: string;
  label: string;
  sectionIndex: number;
}

export interface ChapterGroup {
  id: string;
  index: string;
  title: string;
  steps: ChapterStep[];
}

/**
 * 0C — Fixed Bottom-Center Chapter Scrubber (5 Groups, 14 Steps)
 * Matches docs/house/SITE-BRIEF-dream-online-net.md §3 Row 0C.
 */
export const CHAPTER_GROUPS: readonly ChapterGroup[] = [
  {
    id: 'world',
    index: '01',
    title: 'WORLD',
    steps: [
      { id: 'seamless', label: 'Seamless', sectionIndex: 2 },
      { id: 'day-night', label: 'Day & Night', sectionIndex: 4 },
      { id: 'paths', label: 'Paths', sectionIndex: 6 },
      { id: 'awakening', label: 'Awakening', sectionIndex: 7 },
    ],
  },
  {
    id: 'life-economy',
    index: '02',
    title: 'LIFE & ECONOMY',
    steps: [
      { id: 'craft', label: 'Craft', sectionIndex: 10 },
      { id: 'caravans', label: 'Caravans', sectionIndex: 12 },
      { id: 'fair-trade', label: 'Fair Trade', sectionIndex: 13 },
    ],
  },
  {
    id: 'living-npcs',
    index: '03',
    title: 'LIVING NPCS',
    steps: [
      { id: 'memory', label: 'Memory', sectionIndex: 15 },
      { id: 'world-tick', label: 'World Tick', sectionIndex: 16 },
    ],
  },
  {
    id: 'guardians',
    index: '04',
    title: 'GUARDIANS',
    steps: [
      { id: 'sup-at', label: 'Sup@', sectionIndex: 17 },
      { id: 'council', label: 'Council', sectionIndex: 18 },
      { id: 'world-bosses', label: 'World Bosses', sectionIndex: 19 },
    ],
  },
  {
    id: 'first-slice',
    index: '05',
    title: 'FIRST SLICE',
    steps: [
      { id: '15-min-journey', label: '15-Min Journey', sectionIndex: 20 },
      { id: 'promise', label: 'Promise', sectionIndex: 21 },
    ],
  },
];

export type SectionAlign = 'left' | 'right' | 'center' | 'split';
export type SectionKind =
  | 'hero'
  | 'text-reveal'
  | 'two-steps'
  | 'chapter-poster'
  | 'combat-selector'
  | 'sub-left'
  | 'sub-right'
  | 'life-economy'
  | 'hud-telemetry'
  | 'journey-scrubber'
  | 'technical-promise'
  | 'climax-cta';

export interface SpatialSection {
  index: number;
  id: string;
  svh: number;
  align: SectionAlign;
  kind: SectionKind;
  groupId?: string;
  stepId?: string;
  kicker?: string;
  headline: string;
  subtitle?: string;
  body: string;
}

/**
 * Sections 1–22 (Spatial Scroll Journey — 18-viewport target track)
 * Matches docs/house/SITE-BRIEF-dream-online-net.md §3 Rows 1–22.
 */
export const SPATIAL_SECTIONS: readonly SpatialSection[] = [
  {
    index: 1,
    id: 'section-1-hero',
    svh: 100,
    align: 'left',
    kind: 'hero',
    kicker: 'DREAM ONLINE · ONE UNSHARDED REALM',
    headline: 'ONE SHARED WORLD. DREAMED TWICE.',
    subtitle: 'DREAM ONLINE',
    body: 'A third-person 3D action RPG where every player walks the same continuous horizon, every NPC remembers your deeds, and nightfall awakens a neon metropolis.',
  },
  {
    index: 2,
    id: 'section-2-horizon',
    svh: 100,
    align: 'left',
    kind: 'text-reveal',
    groupId: 'world',
    stepId: 'seamless',
    kicker: 'ONE LIVING HORIZON',
    headline: 'Walk from the central plaza to the farthest frontier without a single loading screen, shard wall, or fast-travel shortcut.',
    body: 'Every Dreamer wakes inside the same shared world on one authoritative realm. Distance creates real economic geography, route danger, and organic social encounters.',
  },
  {
    index: 3,
    id: 'section-3-mastery',
    svh: 100,
    align: 'left',
    kind: 'text-reveal',
    groupId: 'world',
    stepId: 'seamless',
    kicker: 'SKILL OVER MENUS',
    headline: "Aim your swings, time your blocks, manage your stamina, and read your opponent's body—victory belongs to how you play.",
    body: 'Real-time directional action combat replaces tab-target rotations with light chains, heavy openers, directional dodge frames, parry counters, and stability pressure.',
  },
  {
    index: 4,
    id: 'section-4-day-night',
    svh: 150,
    align: 'split',
    kind: 'two-steps',
    groupId: 'world',
    stepId: 'day-night',
    kicker: 'ONE WORLD DREAMED TWICE',
    headline: 'DAY & NIGHT',
    subtitle: 'DAWN BELLS TO MIDNIGHT CONVERGENCE',
    body: 'The exact same terrain coordinates transform across the schedule while you retain every skill, outfit, and party role.',
  },
  {
    index: 5,
    id: 'section-5-five-paths',
    svh: 75,
    align: 'center',
    kind: 'chapter-poster',
    groupId: 'world',
    stepId: 'paths',
    kicker: 'POOLED PARTY DAMAGE · YOUR OWN LOOT DROP',
    headline: 'FIVE STARTER PATHS',
    body: 'Friends team up freely across level gaps without losing drops—every member rolls personal loot from the party pool.',
  },
  {
    index: 6,
    id: 'section-6-combat-selector',
    svh: 125,
    align: 'left',
    kind: 'combat-selector',
    groupId: 'world',
    stepId: 'paths',
    kicker: '01 / CHOOSE / YOUR DISCIPLINE',
    headline: 'MASTER FIVE PATHS & LEVEL 45 AWAKENINGS',
    body: 'Select a starter path or Level 45 Awakening to inspect its directional combo profile and live 3D weapon geometry.',
  },
  {
    index: 7,
    id: 'section-7-stamina',
    svh: 75,
    align: 'left',
    kind: 'sub-left',
    groupId: 'world',
    stepId: 'awakening',
    kicker: '01.A · STAMINA DISCIPLINE',
    headline: 'Every swing, dodge, parry, and sprint draws from one visible stamina bar.',
    body: 'Positioning, weapon reach, and timing decide the fight.',
  },
  {
    index: 8,
    id: 'section-8-awakenings',
    svh: 75,
    align: 'left',
    kind: 'sub-left',
    groupId: 'world',
    stepId: 'awakening',
    kicker: '01.B · LEVEL 20 & 45 PROGRESSION',
    headline: 'Unlock your second weapon style at Level 20 and dual DREAM & Nightmare Awakenings at Level 45.',
    body: 'Expressive silhouette trails and combo extensions multiply your mastery while keeping group play accessible from day one.',
  },
  {
    index: 9,
    id: 'section-9-party-loot',
    svh: 75,
    align: 'left',
    kind: 'sub-left',
    groupId: 'world',
    stepId: 'awakening',
    kicker: '01.C · COOPERATIVE REWARDS',
    headline: 'Fight side by side at any level—party damage pools together so every member rolls their own personal loot.',
    body: 'Every drop belongs to the party that dealt the highest pooled damage. Solo players count as a party of one.',
  },
  {
    index: 10,
    id: 'section-10-life-skills',
    svh: 100,
    align: 'right',
    kind: 'life-economy',
    groupId: 'life-economy',
    stepId: 'craft',
    kicker: 'MAIN PROGRESSION PILLAR',
    headline: '02 / FORGE / THE LIVING ECONOMY',
    body: 'Ten interlocking life skills: Farming, Fishing, Mining, Woodcutting & Milling, Hunting & Foraging, Cooking & Brewing, Alchemy, Blacksmithing & Armorcraft, Artifice & Neon Engineering, Caravan & Trade.',
  },
  {
    index: 11,
    id: 'section-11-fable-forge',
    svh: 75,
    align: 'center',
    kind: 'chapter-poster',
    groupId: 'life-economy',
    stepId: 'craft',
    kicker: 'THE HEART OF THE PLAZA & ROAD',
    headline: "FABLE'S FORGE & CAMPER",
    body: "Hammer steel by day at FABLE's central anvil—or spot the glowing string-lit popup camper on the frontier road for hot repairs, rare blueprints, and camp buffs.",
  },
  {
    index: 12,
    id: 'section-12-runners',
    svh: 75,
    align: 'left',
    kind: 'sub-left',
    groupId: 'life-economy',
    stepId: 'caravans',
    kicker: '02.A · PHYSICAL LOGISTICS',
    headline: 'Summon a physical courier NPC on the road to carry your ore to town storage or list your crafts at the central plaza.',
    body: 'Storage Runners and Market Runners keep you out in the field without ever teleporting players across the realm.',
  },
  {
    index: 13,
    id: 'section-13-fair-trade',
    svh: 75,
    align: 'right',
    kind: 'sub-right',
    groupId: 'life-economy',
    stepId: 'fair-trade',
    kicker: '02.B · PLAYER-FIRST ECONOMY',
    headline: 'Sols are earned in-world; NEEDs buy convenience and cosmetics only—never combat power.',
    body: 'Every convenience item has an earnable path in the world, with zero loot boxes and zero paid combat superiority.',
  },
  {
    index: 14,
    id: 'section-14-six-month-rule',
    svh: 75,
    align: 'right',
    kind: 'sub-right',
    groupId: 'life-economy',
    stepId: 'fair-trade',
    kicker: '02.C · EARNABLE WARDROBE & PETS',
    headline: 'Every cosmetic becomes earnable in-game after six months—and catch the laughing goblin TrollinlootNScoot before he vanishes to recover a piece from the vault.',
    body: 'Every player earns a free baseline auto-looter pet with identical carry-weight and class-branded utility.',
  },
  {
    index: 15,
    id: 'section-15-living-npcs',
    svh: 75,
    align: 'right',
    kind: 'chapter-poster',
    groupId: 'living-npcs',
    stepId: 'memory',
    kicker: 'VOICE & TEXT NPCS FOR EVERY PLAYER',
    headline: 'FREE & UNLIMITED',
    body: 'Speak or type naturally to townsfolk, guards, and merchants within a 3-second reply budget—never gated behind a per-message token fee.',
  },
  {
    index: 16,
    id: 'section-16-world-tick',
    svh: 75,
    align: 'left',
    kind: 'chapter-poster',
    groupId: 'living-npcs',
    stepId: 'world-tick',
    kicker: 'EVERY 15 MINUTES ACROSS THE REALM',
    headline: 'RUMORS TRAVEL',
    body: 'Save a caravan or fell a boss and hear tavern keepers, guards, and wandering bards recount your deeds—or embellish them according to their honesty trait.',
  },
  {
    index: 17,
    id: 'section-17-meet-sup',
    svh: 75,
    align: 'left',
    kind: 'chapter-poster',
    groupId: 'guardians',
    stepId: 'sup-at',
    kicker: 'COUNTER-ROTATING RINGS · "KEEP DREAMING TROLLZ"',
    headline: 'MEET SUP@',
    body: 'Your glass-and-spark companion sphere evolves across four tiers—Mote, Spark, Beacon, and Halo—remembering your journey from character creation.',
  },
  {
    index: 18,
    id: 'section-18-guardians',
    svh: 75,
    align: 'left',
    kind: 'sub-left',
    groupId: 'guardians',
    stepId: 'council',
    kicker: '04.A · THE REALM COUNCIL',
    headline: "Guided by Myth@s (Ember's father) and Mireth at the heart of the city, watched over by the twin sky sentinels GeminEYE and OpenAEye.",
    body: 'In the Arena of Lenses, GeminEYE splits into a mirrored twin at half health while OpenAEye challenges your focus and sightlines.',
  },
  {
    index: 19,
    id: 'section-19-telemetry-hud',
    svh: 100,
    align: 'left',
    kind: 'hud-telemetry',
    groupId: 'guardians',
    stepId: 'world-bosses',
    kicker: '04.B · WORLD BOSSES & LIVE REALM TELEMETRY',
    headline: 'Face the 22-hour World Boss, the deep-sea terror MyThOsKraken, C0D3X astride MOLLMA, and the spectacle of THE BAN HAMMER.',
    body: 'Anti-cheat enforcement and timeline recovery happen visibly inside the world as living lore spectacles.',
  },
  {
    index: 20,
    id: 'section-20-first-15-min',
    svh: 100,
    align: 'center',
    kind: 'journey-scrubber',
    groupId: 'first-slice',
    stepId: '15-min-journey',
    kicker: 'ZERO TO CAPTAIN VAREN',
    headline: 'FIRST 15 MINUTES',
    body: 'Scrub through the playable slice tutorial route—from your first steps at the safe camp with Sup@ to stamina combat, gathering, and dusk on the frontier.',
  },
  {
    index: 21,
    id: 'section-21-technical-promise',
    svh: 100,
    align: 'center',
    kind: 'technical-promise',
    groupId: 'first-slice',
    stepId: 'promise',
    kicker: 'TARGET FRAME RATE',
    headline: 'BUILT TO RUN SMOOTHLY ON YOUR MACHINE FROM MINUTE ONE',
    subtitle: '1080p NATIVE · < 10 SEC COLD BOOT · ZERO-CRASH 15-MIN RUN',
    body: 'Toggle between Daytime Plaza and Nightfall Frontier lighting specs verified by our First Playable Promise.',
  },
  {
    index: 22,
    id: 'section-22-enter-dream',
    svh: 100,
    align: 'center',
    kind: 'climax-cta',
    kicker: 'DREAM ONLINE · ONE UNSHARDED REALM',
    headline: 'STEP INTO THE DREAM',
    body: 'Enter one unbroken 3D world where your skill, your craft, and your name carry across every horizon.',
  },
];

export interface CombatCard {
  id: string;
  name: string;
  roleTag: string;
  reach: string;
  staminaProfile: string;
  summary: string;
  shape: 'blade' | 'guard' | 'spear' | 'bow' | 'focus' | 'awakening';
}

export interface CombatTab {
  id: 'starter' | 'awakening';
  label: string;
  cards: CombatCard[];
}

export const COMBAT_TABS: readonly CombatTab[] = [
  {
    id: 'starter',
    label: 'STARTER PATHS LV 1',
    cards: [
      {
        id: 'blade',
        name: 'Blade',
        roleTag: 'AGILE VANGUARD · LV 1',
        reach: '2.8m Arc',
        staminaProfile: '14 Stamina / Chain',
        summary: 'Fast melee command chains, gap-closers, retreating counter slashes, and side-evade cuts.',
        shape: 'blade',
      },
      {
        id: 'guard',
        name: 'Guard (Shield & Hammer)',
        roleTag: 'BASTION BREAKER · LV 1',
        reach: '2.2m Impact',
        staminaProfile: '18 Stamina / Guard',
        summary: 'Shield bash, directional block and parry stance, shield rush, and heavy posture-breaking strikes.',
        shape: 'guard',
      },
      {
        id: 'spear',
        name: 'Spear',
        roleTag: 'REACH CONTROLLER · LV 1',
        reach: '4.1m Thrust',
        staminaProfile: '16 Stamina / Sweep',
        summary: 'Mid-range reach, sweep crowd control, and lunging thrust combos that hold the frontier line.',
        shape: 'spear',
      },
      {
        id: 'bow',
        name: 'Bow',
        roleTag: 'MOBILE RANGER · LV 1',
        reach: '28.0m Volley',
        staminaProfile: '12 Stamina / Draw',
        summary: 'Mobile ranged volleys, back-roll evasion shots, and piercing line arrows for precision kiting.',
        shape: 'bow',
      },
      {
        id: 'focus',
        name: 'Focus / Arc',
        roleTag: 'GEOMETRIC ARCANIST · LV 1',
        reach: '22.0m Field',
        staminaProfile: '20 Stamina / Cast',
        summary: 'Projectile shaping, charged energy blasts, and luminous field-control traps.',
        shape: 'focus',
      },
    ],
  },
  {
    id: 'awakening',
    label: 'AWAKENINGS LV 20 & 45',
    cards: [
      {
        id: 'stance-shift',
        name: 'Level 20 Stance Shift',
        roleTag: 'DUAL DISCIPLINE · LV 20',
        reach: 'Adaptive',
        staminaProfile: 'Instant Cancel',
        summary: 'Unlocks your second weapon style, wider AoE geometry, and coordinated party pull combos.',
        shape: 'blade',
      },
      {
        id: 'dream-awakening',
        name: 'Level 45 DREAM Awakening',
        roleTag: 'RADIANT CONVERGENCE · LV 45',
        reach: '32.0m Domain',
        staminaProfile: 'Resonance Flow',
        summary: 'Surreal projectile shaping, luminous floating accents, zone control, and high-visibility ranged combos.',
        shape: 'focus',
      },
      {
        id: 'nightmare-awakening',
        name: 'Level 45 Nightmare Awakening',
        roleTag: 'SHADOW SOVEREIGN · LV 45',
        reach: '4.5m Blink',
        staminaProfile: 'Burst Execution',
        summary: 'Shadow movement, close-range burst, execution windows, and sharp dark melee silhouettes.',
        shape: 'awakening',
      },
      {
        id: 'counter-parry',
        name: 'Counter-Parry',
        roleTag: 'DEFENSIVE MASTERY · ALL PATHS',
        reach: '2.5m Riposte',
        staminaProfile: '+10 Stamina Refund',
        summary: 'Frame-tight directional guard that shatters enemy stability and opens an instant golden riposte.',
        shape: 'guard',
      },
      {
        id: 'aerial-finisher',
        name: 'Aerial Finisher',
        roleTag: 'PARTY SYNERGY · LV 20+',
        reach: '6.0m Leap',
        staminaProfile: '22 Stamina / Dive',
        summary: 'Vault from a staggered enemy to deliver a high-impact descending strike that adds pooled party damage.',
        shape: 'spear',
      },
    ],
  },
];

export interface LifeSkillItem {
  index: string;
  name: string;
  chain: string;
  benefit: string;
}

export const LIFE_SKILLS: readonly LifeSkillItem[] = [
  { index: '01', name: 'Farming', chain: 'Seedbed → Tended Crop → Grain & Fiber → Ration Stock', benefit: 'Steadies camp stamina recovery and mounts.' },
  { index: '02', name: 'Fishing', chain: 'Lake Lumen Cast → Fresh Catch → Dried Fillet → Worker Meal', benefit: 'Timing-bar active catches or relaxed lakeside casting.' },
  { index: '03', name: 'Mining', chain: 'Ore Vein → Raw Ore → Melted Shard → Tempered Ingot', benefit: 'Feeds FABLE anvil repairs and weapon smithing.' },
  { index: '04', name: 'Woodcutting & Milling', chain: 'Timber Tree → Logs → Planks → Treated Tool Handle', benefit: 'Crafts durable gathering tools and caravan frames.' },
  { index: '05', name: 'Hunting & Foraging', chain: 'Frontier Trail → Wild Herb & Hide → Cured Leather', benefit: 'Supplies light armor linings and alchemy extracts.' },
  { index: '06', name: 'Cooking & Brewing', chain: 'Campfire Kettle → Hearty Stew & Tonic → Party Buff', benefit: 'Shares stamina regeneration across the whole party.' },
  { index: '07', name: 'Alchemy', chain: 'Dried Herb → Distilled Extract → Durability Compound', benefit: 'Slows weapon wear during long frontier expeditions.' },
  { index: '08', name: 'Blacksmithing & Armorcraft', chain: 'Tempered Ingot → Sovereign Blade & Veynar Plate', benefit: 'Forges repair kits and masterwork martial gear.' },
  { index: '09', name: 'Artifice & Neon Engineering', chain: 'Crystal Core → Lens Array → Nightfall Beacon', benefit: 'Powers Nightfall skyway gear and Focus conduits.' },
  { index: '10', name: 'Caravan & Trade', chain: 'Regional Pack → Frontier Road → Central Plaza Market', benefit: 'Rewards real overland distance with higher Sols margins.' },
];

export interface TelemetryHudRow {
  label: string;
  value: string;
  note: string;
}

export const TELEMETRY_HUD_ROWS: readonly TelemetryHudRow[] = [
  { label: 'NPC VOICE REPLY', value: '<= 3.0 SEC', note: 'Tiered routing with instant world-native fallback' },
  { label: 'WORLD GOSSIP TICK', value: '15 MIN', note: 'Deeds ripple across tavern keepers and guards' },
  { label: 'WORLD BOSS CADENCE', value: '22 HOURS', note: 'Spawn coordinates discovered through seeded rumor' },
  { label: 'LOCAL CLIENT FPS TARGET', value: '60 FPS', note: '1080p native budget with < 2% idle starfield CPU' },
];

export interface JourneyStop {
  time: string;
  title: string;
  systemProof: string;
  quote: string;
  description: string;
}

export const FIRST_15_MIN_STOPS: readonly JourneyStop[] = [
  {
    time: '0:00',
    title: '0:00 Arrival & Sup@',
    systemProof: 'Spawn · Landmark Sightline · Sup@ Companion',
    quote: '"Stay near the camp until your footing is steady."',
    description: 'Appear at the safe camp facing a clear landmark and road with Sup@ hovering at your shoulder—no minimap clutter needed.',
  },
  {
    time: '2:00',
    title: '2:00 Movement & Stamina',
    systemProof: 'Walk · Sprint · Directional Dodge · Stamina Bar',
    quote: '"Every step and evade draws from one readable bar."',
    description: 'Test walking, sprinting, turning, and one defensive dodge while watching your stamina recover in real time.',
  },
  {
    time: '5:00',
    title: "5:00 FABLE's Blacksmith",
    systemProof: 'Mireth Guide Memory · Resource Node · Tool Durability',
    quote: '"That bloom will fade soon. Gather once, then step back."',
    description: "Receive Mireth's in-world direction, gather your first resource node, and inspect tool durability at FABLE's anvil.",
  },
  {
    time: '8:00',
    title: '8:00 Road Skirmish & Loot',
    systemProof: 'Shoulder Tells · Parry Window · Pooled Party Loot',
    quote: '"The road ahead is restless. Watch the enemy\'s shoulders before it strikes."',
    description: 'Defeat the starter road threat through timing and positioning, then claim your personal drop.',
  },
  {
    time: '11:00',
    title: '11:00 Dusk Shift & Captain Varen',
    systemProof: 'Live Route Event · NPC Recall · Reload Persistence',
    quote: '"You held the road when the gate flickered. The camp remembers."',
    description: 'Witness a local world event transform the route, hear Mireth recall your feat, and verify full state persistence across reload.',
  },
];

export interface PromiseLightingMode {
  id: 'day' | 'night';
  label: string;
  headline: string;
  fpsStat: string;
  bootStat: string;
  specs: string[];
}

export const PROMISE_LIGHTING_MODES: readonly PromiseLightingMode[] = [
  {
    id: 'day',
    label: 'DAYTIME PLAZA',
    headline: 'OLD WORLD SUNLIT STONE & OPEN VALLEYS',
    fpsStat: '60 FPS',
    bootStat: '< 10 SEC',
    specs: [
      '1080p native resolution with crisp dry-stone and warm ochre sunlight grading',
      '+25% Life Skill EXP window for gathering, fishing at Lake Lumen, and anvil work',
      'Zero-crash 15-minute run with persistent player, node, and NPC memory state',
    ],
  },
  {
    id: 'night',
    label: 'NIGHTFALL FRONTIER',
    headline: 'NEON METROPOLIS & HIGH-STAKES ARENAS',
    fpsStat: '60 FPS',
    bootStat: '< 10 SEC',
    specs: [
      'Same world coordinates transformed into lit tower grids and wet asphalt reflections',
      '+35% Monster EXP window and Weekly Nightmare Shift high-reward encounters',
      'Deterministic frame pacing with < 2% background CPU budget and instant state save',
    ],
  },
];

export interface NumberCounterSpec {
  value: string;
  unitLabel: string;
  detail: string;
}

export const NUMBERS_COUNTERS: readonly NumberCounterSpec[] = [
  {
    value: '1',
    unitLabel: 'SHARED WORLD (ZERO SHARDS)',
    detail: 'Every player walks the same continuous geography with zero loading screens or fast travel.',
  },
  {
    value: '5',
    unitLabel: 'STARTER COMBAT PATHS',
    detail: 'Blade, Guard, Spear, Bow, and Focus—expanding with Level 20 shifts and Level 45 Awakenings.',
  },
  {
    value: '10',
    unitLabel: 'INTERLOCKING LIFE SKILLS',
    detail: 'From Farming and Lake Lumen Fishing to Blacksmithing, Alchemy, and overland Caravans.',
  },
  {
    value: '15 MIN',
    unitLabel: 'FIRST PLAYABLE SLICE',
    detail: 'A complete, verifiable loop of movement, stamina combat, gathering, and persistent NPC memory.',
  },
];

export interface ShowcaseCell {
  index: string;
  id: string;
  title: string;
  subtitle: string;
  isAccentCallout?: boolean;
}

/**
 * Section 24 — Canon Showcase & Hall of Craft (6x2 Bordered Grid)
 * Matches docs/house/SITE-BRIEF-dream-online-net.md §3 Row 24.
 */
export const SHOWCASE_CELLS: readonly ShowcaseCell[] = [
  { index: '01', id: 'one-world', title: 'One / World', subtitle: 'UNSHARDED HORIZON' },
  { index: '02', id: 'sup-companion', title: 'Sup@ Companion', subtitle: 'COUNTER-ROTATING RINGS' },
  { index: '03', id: 'fables-forge', title: "FABLE's Forge", subtitle: 'ANVIL & POPUP CAMPER' },
  { index: '04', id: 'day-night-cycle', title: 'Day & Night Cycle', subtitle: 'OLD WORLD TO NEON CITY' },
  { index: '05', id: 'sovereign-blade', title: 'Sovereign Blade', subtitle: 'DIRECTIONAL COMBAT' },
  { index: '06', id: 'veynar-guard', title: 'Veynar Guard', subtitle: 'SHIELD & POSTURE BREAK' },
  { index: '07', id: 'inferno-titan', title: 'Inferno Titan', subtitle: '22-HOUR WORLD BOSS' },
  { index: '08', id: 'gemineye-openaeye', title: 'GeminEYE & OpenAEye', subtitle: 'ARENA OF LENSES' },
  { index: '09', id: 'mythos-kraken', title: 'MyThOsKraken', subtitle: '04:00 WORLD AWAKENING' },
  { index: '10', id: 'trollinlootnscoot', title: 'TrollinlootNScoot', subtitle: 'DRIFT CART VAULT HUNTER' },
  { index: '11', id: 'captain-varen', title: 'Captain Varen', subtitle: 'DUSK FRONTIER SENTINEL' },
  { index: '12', id: 'you-slot', title: 'YOU?', subtitle: 'CLAIM YOUR NAME IN DREAM', isAccentCallout: true },
];

export const MARQUEE_ITEMS: readonly string[] = [
  'ONE UNSHARDED WORLD · ZERO FAST TRAVEL',
  'DIRECTIONAL STAMINA ACTION COMBAT',
  'DAY DREAMS OLD WORLD · NIGHTFALL NEON METROPOLIS',
  '10 INTERLOCKING LIFE SKILLS',
  'FREE & UNLIMITED VOICE + TEXT NPCS',
  '15-MINUTE WORLD GOSSIP TICK',
  'POOLED PARTY DAMAGE · PERSONAL LOOT',
  'CONVENIENCE ONLY · NEVER PAY-TO-WIN',
  '60 FPS NATIVE FIRST PLAYABLE PROMISE',
];

export interface FooterColumn {
  heading: string;
  links: Array<{ label: string; href: string }>;
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'THE WORLD',
    links: [
      { label: 'Unbroken Horizon', href: '#section-2-horizon' },
      { label: 'Day Dreams & Nightfall', href: '#section-4-day-night' },
      { label: 'By the Numbers', href: '#section-23-numbers' },
      { label: 'Hall of Craft', href: '#section-24-showcase' },
    ],
  },
  {
    heading: 'COMBAT & SKILLS',
    links: [
      { label: 'Five Starter Paths', href: '#section-6-combat-selector' },
      { label: 'Level 45 Awakenings', href: '#section-8-awakenings' },
      { label: 'Ten Life Skills', href: '#section-10-life-skills' },
      { label: "FABLE's Forge & Camper", href: '#section-11-fable-forge' },
    ],
  },
  {
    heading: 'CANON LORE',
    links: [
      { label: 'Living NPC Memory', href: '#section-15-living-npcs' },
      { label: '15-Minute Gossip Tick', href: '#section-16-world-tick' },
      { label: 'Meet Sup@', href: '#section-17-meet-sup' },
      { label: 'Guardians & World Bosses', href: '#section-19-telemetry-hud' },
    ],
  },
  {
    heading: 'PLAYABLE SLICE',
    links: [
      { label: 'First 15-Minute Journey', href: '#section-20-first-15-min' },
      { label: '60 FPS Technical Promise', href: '#section-21-technical-promise' },
      { label: 'Fair Economy Pledge', href: '#section-13-fair-trade' },
      { label: 'Step Into the DREAM', href: '#section-22-enter-dream' },
    ],
  },
];

export function collectAllPublicCopy(): string {
  const chunks: string[] = [
    BRAND_META.title,
    BRAND_META.fullBanner,
    BRAND_META.builderAttribution,
    BRAND_META.heroKicker,
    ...BRAND_META.heroLines,
    BRAND_META.heroSubhead,
    ...BRAND_META.splitFlapPhrases,
  ];
  for (const g of CHAPTER_GROUPS) {
    chunks.push(g.title);
    for (const s of g.steps) chunks.push(s.label);
  }
  for (const sec of SPATIAL_SECTIONS) {
    if (sec.kicker) chunks.push(sec.kicker);
    chunks.push(sec.headline);
    if (sec.subtitle) chunks.push(sec.subtitle);
    chunks.push(sec.body);
  }
  for (const tab of COMBAT_TABS) {
    chunks.push(tab.label);
    for (const c of tab.cards) chunks.push(c.name, c.roleTag, c.summary);
  }
  for (const sk of LIFE_SKILLS) chunks.push(sk.name, sk.chain, sk.benefit);
  for (const row of TELEMETRY_HUD_ROWS) chunks.push(row.label, row.value, row.note);
  for (const st of FIRST_15_MIN_STOPS) chunks.push(st.title, st.systemProof, st.quote, st.description);
  for (const pm of PROMISE_LIGHTING_MODES) chunks.push(pm.label, pm.headline, ...pm.specs);
  for (const nc of NUMBERS_COUNTERS) chunks.push(nc.value, nc.unitLabel, nc.detail);
  for (const sc of SHOWCASE_CELLS) chunks.push(sc.title, sc.subtitle);
  chunks.push(...MARQUEE_ITEMS);
  return chunks.join('\n');
}
