# DREAM ONLINE — Master In-House Canon & Systems Lore Bible

**Engine & Platform:** 100% In-House **DREAM-Engine** (WebGPU / WebGL2 Native 3D Engine & DREAM Maker Studio)  
**Architecture:** Single Authoritative Shared World Server · Live NPC Lab (`:9127`) · DreamOps Bridge (`:9133`) · Hermes NPC Fleet (`:9119`)  
**Founder & Steward:** Joshua Coleman (`#ForTheKids` · `#UntilNoKidInNeed` · `Built with Google Gemini`)

---

## 1. Core World Pillars & The One-World Law

1. **One Seamless World — No Instances, No Fast Travel, Ever:**
   - Every Dreamer wakes inside the same shared, continuous world on a single authoritative server.
   - There are no dungeon instances, no load-screen sharding, and no fast travel or teleportation systems. Distance creates economic geography, route danger, and real social encounters. Mounts and horses are earned later; your feet come first.
2. **Real-Time Directional Action Combat:**
   - Combat is directional, stamina-governed, and frame-driven—never tab-target rotation.
   - Every weapon path features light chains, heavy openers, directional dodge/i-frames, guard/parry counters, posture/stability pressure, and recovery cancels.
3. **Life Skills Are Main Progression:**
   - Gathering, processing, cooking, alchemy, farming, fishing, hunting, crafting, worker management, and route trading stand alongside action combat as primary progression pillars.
4. **Live NPCs That Remember (100% Free & Unlimited):**
   - Game triggers route to scoped AI agents with persistent memory (`player`, `npc`, `zone`, `global_event`, `world_event`).
   - NPCs remember who helped them, who went outlaw, and what happened during world events.
   - Live NPC dialogue is **100% free and unlimited for every player** (ad-funded, zero paywalls, zero message caps).
5. **Pay-for-Convenience Only — Never Pay-to-Win:**
   - All paid items are strictly cosmetic or convenience-based. Every convenience item sold in the shop has a free, earnable in-world path or saves travel/attention friction without granting combat superiority.

---

## 2. One World, Dreamed Twice: Day Dreams & Nightfall (Night Dreams)

DREAM ONLINE takes place in a single geography that transforms across the Day/Nightfall cycle while the player retains all skills, gear, outfits, and party roles.

### Day Dreams (The Old World)
- **Visual Identity:** Open fields, dry country, ruined stone cottages with slate roofs, half-fallen dry-stone walls, rutted earth cart tracks, bare trees, red-brown brush, low golden sunlight casting long shadows toward a distant mountain ridge, warm ochre/rust/gold highlights, and cool blue-grey mist in low ground. Zero modern structures by day.
- **Gameplay Window (+25% Life Skill EXP / 100% Monster Stats):** Productive, social, and safer. Optimal window for gathering, fishing at Lake Lumen, cooking, processing, worker node scheduling, and trade preparation.

### Nightfall / Night Dreams (The Neon Metropolis)
- **Visual Identity:** The exact same terrain coordinates transform at Nightfall into a dense, rain-slicked cyberpunk metropolis of lit tower grids, neon street signs, wet asphalt reflections, and vertical traversal under a dark sky.
- **Same Place, Same People, Dreamed Twice:** Every landmark, NPC, vendor, and boss arena occupies the exact same world coordinates across both states with dual environmental dressings:
  - A daytime fruit-stand merchant becomes the same merchant behind a lit convenience-store counter at night.
  - A boss fought in an open ruin field by day is fought in a floodlit stadium arena, city park, or parking lot at night.
- **Gameplay Window (-25% Life Skill EXP / +35% Monster EXP / +25% Monster HP / +20% Monster Damage):** High-risk, high-reward combat window.
- **Weekly Nightmare Shift:** Once a week, the world enters a deep Nightmare Shift where urban crime, heists, and street PvP ignite with severe, persistent consequences (bounties, Red Name status, jail time, and world-state persistence into the following day).

---

## 3. Canon Entities, Bosses & World Guardians

### Sup@ (Screen-Safe HUD Alias: `SupO`) — The Companion Sphere
- **Archetype & Visuals:** Floating glass-and-spark companion sphere (`sup-companion.glb`) with an internal golden coil and orbiting rings that hover at every Dreamer's shoulder from character creation.
- **Role:** Primary narrator, tutorial whisperer (replacing immersion-breaking UI popups), quest-giver, and emotional spine of DREAM ONLINE. Warns of low gear durability, nearby fishing waters, Red Name threats, and boss tells.
- **Evolution Tiers:** Evolves alongside the player's level and journey across four visual and narrative tiers: **Mote → Spark → Beacon → Halo**. As Sup@ grows, it slowly recovers its memory of what it used to be and why the world is a DREAM.
- **Technical Routing Law:** Sup@ is the **only** entity powered by real signed-in Claude CLI authentication (never an API key), maintaining per-player persistent memory across the player's entire journey. Sup@ cosmetics and voices are convenience/style only—never combat power.

### THE BAN HAMMER — The Spectacle Enforcer
- **Archetype:** T2 Enforcer NPC and "Adversary for Good."
- **In-World Anti-Cheat Spectacle:** Anti-cheat enforcement is performed visibly inside the world rather than hidden in backend logs. When a cheater or exploiter is caught, a massive bat swings in from off-screen, splattering the offender across nearby players' viewports like a bug on a windshield (complete with windshield wiper animation) and delivering the signature line: *"KIDS play this game! Get outta here with your bugs and glitches!"*
- **Public Verdict Events:** Major exploit verdicts stage tribal drums and an arena walk where guards read the sentence aloud, turning world integrity into community spectacle.

### C0D3X (`c0d3x-rider`) — The Rollback Rider
- **Archetype:** World-Recovery Rider astride **MOLLMA** (a paradoxical reverse-proxy mount), rendered as an anomalous rotated golden-amber form trailing scan-lines one frame out of sync with the world.
- **Role:** When a live-world event, gate flicker, or unexpected world-state anomaly destabilizes a zone, C0D3X rides in to stitch the timeline back to the last verified all-green checkpoint. Technical rollbacks become canonized in-world lore rather than silent database restores.
- **Signature Voice:** *"This road forgot itself. I'm stitching it back — stand at the Moon Gate while it remembers. I promise nothing permanent."*

### GeminEYE & OpenAEye — Arena of Lenses Duo Bosses
- **GeminEYE:** Robotic ocular boss in the Arena of Lenses that splits into a mirrored twin at 50% HP. (Also lends its form language to the starter **GeminEYE** looter companion pet.)
- **OpenAEye:** Paired ocular boss whose periodic gaze inflicts the **Cross-Eyed** status effect, doubling the player's render-layer vision for 6 seconds.
- **Orange Sherbet KRAKEN:** Canon boss-tier encounter that drops rare orange sherbet trophies and NEED shards.

### First Gate & Haven NPC Roster
- **FABLE (`fable-smith`):** Haven's dry-humored T1 Blacksmith. Remembers the player's gear durability history, visits, and Red Name record. Operates the town anvil for Sols repairs, gear purchases, and loot sales.
- **Mireth:** Memory-linked guide NPC in the First Gate slice connected directly to the Live NPC Lab memory store.
- **Camp Guard (`camp-guard`):** Stern hexagonal-plate sentinel anchoring the Moon Gate safe line. Warns travelers before they step onto the Low Road at Nightfall and executes Red-Named outlaws on sight in Sanctuary zones.
- **Field Gatherer (`field-gatherer`):** Warm, grounded artisan who teaches ore-node cooldowns, resource blooms, and tool durability discipline.
- **Market Runner (`market-runner`) & Storage Runner:** Fast-striding logistics couriers who carry a single item or bundle between the field and town storage/marketplace without ever teleporting the player.
- **Sunny Ledger:** Karma-gated merchant who trades rare curiosities only at sunrise and sunset based on the player's karma record, honoring in-world jokes like invisible-ink checks without ever touching real-world money.

---

## 4. Classes, Combat Progression & Awakenings

### Five Starter Paths (Levels 1–19)
Players begin at the Moon Gate choosing from five foundational action-combat paths:
1. **Blade:** Fast melee command chains, gap-closers (`W + Shift + F`), retreating counter slashes (`S + LMB`), and side-evade cuts.
2. **Guard / Hammer:** Shield bash, directional block/parry stance (`Q`), shield rush, and heavy posture-breaking strikes.
3. **Spear:** Mid-range reach, sweep control, and lunging thrust combos.
4. **Bow:** Mobile ranged volleys, back-roll shots, and piercing line arrows.
5. **Focus / Arc:** Projectile shaping, charged energy blasts, and field-control traps.

### Level 20 Combat Shift
- Levels 1–20 serve as the onboarding combat arc. At **Level 20**, combat unlocks wider AoE geometry, expressive combo extensions, and coordinated party pull potential.

### Level 45 Class Awakening (Prestige Identity Spike)
At **Level 45** (working cap target: Level 50), Dreamers unlock a transformative visual and mechanical awakening—designed to feel five times more expressive and impactful through silhouette, trail effects, stance, and combo geometry while remaining balanced for PvP:
- **Nightmare Class (Dark Melee / Assassin Awakening):** For non-mage paths. Focuses on shadow movement, close-range burst, execution windows, bleed/mark pressure, and sharp dark silhouettes.
- **DREAM Class (Radiant Mage / Projectile Awakening):** For non-melee paths. Focuses on surreal projectile shaping, luminous floating accents, zone control, and high-visibility ranged combos.

### Founder-Locked Pooled Party Damage Loot Rule
- **Every drop in DREAM ONLINE** belongs to the party that dealt the highest **total pooled damage** (scaled by a party participation modifier)—never to whoever tapped first, held the ground, or rolled RNG. Solo players count as a party of one.

---

## 5. Life Skills, Durability & Economy

### Life-Skill Loops & Resource Chains
- **Gathering, Processing, Cooking, Alchemy, Farming, Fishing, Hunting, Crafting, Workers, Trading.**
- **Resource Chains:**
  - *Wood:* Tree → Logs → Timber → Planks → Treated Planks → Tool Handle → Gathering Tool.
  - *Fish:* Lake Lumen Cast (timing-bar minigame or slower AFK fishing) → Fresh Fish → Dried Fish → Worker Meal.
  - *Metal:* Ore Node → Raw Ore → Melted Shard → Ingot → Weapon Part / Repair Kit.
  - *Alchemy:* Herb → Dried Herb → Extract → Potion / Alchemy Oil / Durability Compound.
- **AFK Rules:** AFK fishing, worker node gathering, and long cooking/processing batches are allowed at slower yields than active play and consume tool durability, inventory space, or worker stamina.

### Durability & Field Repair Loop
- Weapons lose durability per swing; armor loses durability per hit taken; life tools lose durability per harvest/cast. Gear never permanently deletes on normal wear, but effectiveness drops by 50% at zero durability.
- **Town Repair:** Cheap Sols repair at FABLE's Blacksmith Shop.
- **FABLE's Popup Camper / Portable Anvil:** Convenience field deployment (consumes charges/materials, ~2× lifetime Sols cost of town repair) allowing repair and stash access without walking back to town.

### Pets & `TrollinlootNScoot`
- **Free Baseline Pet:** Every player earns or receives a pet without paying. Every pet provides the exact same three baseline functions:
  1. **Auto-Looter** (picks up drops automatically, like the GeminEYE pet).
  2. **Carry Weight Boost** (delays encirclement/encumbrance slowdown).
  3. **Class-Branded Boost** (identical numerical value across all pets, labeled for the owner's class—giving a 10% edge only if an opponent fails to summon their own free pet).
- **Pet Leveling, Feeding & Revival:** Pets level slowly (steps at 5, 10, 15) unlocking new idle animations and pet-to-pet interactions. Hand-feeding on an attentive cycle outperforms the paid convenience auto-feeder. Pets have two near-free revival tickets; a third death is permanent for that pet's levels unless restored with a Raise-the-Dead convenience item (skins are never lost and transfer freely).
- **TrollinlootNScoot (Founder-Funding Limited Edition Skin):** The "skin of skins"—a troll riding an original drift cart with **zero gameplay bonus** over a free pet. Features T1 Live NPC memory, interacts with players, mobs, and Sup@, tells clean dad-joke swerves ("Dirty? I'm guessing bedroom, bathroom, kitchen!"), and adapts automatically to account age bands (drinking milk and acting star-struck around Sup@ on younger accounts).

### Storage Runner & Market Runner
- Because DREAM ONLINE has no fast travel, **Storage Runners** (send one item or small bundle to town storage) and **Market Runners** (buy, list, or claim a single marketplace item remotely) provide cooldown-limited logistics convenience without ever teleporting the player or moving unlimited cargo.

---

## 6. Open-World PvP, Flagging & Karma

- **Zone Tiers:**
  - **Sanctuary (Haven / Moon Gate):** Zero PvP, town guards enforce peace.
  - **Frontier / Rival Road:** Opt-in PvP flagging (**Pink Flag**). Unflagged players cannot hit or be hit in standard zones.
  - **Blackout Zone / Guild War Zone:** Nightfall high-risk zones and explicit guild objective warfare.
- **Karma & Red Name Outlaw Rules:**
  - Accumulating **3 unlawful player kills** turns the aggressor's name **Red (Outlaw)**.
  - **Red Name Penalties:** Town guards one-shot Red players on sight; outlaw death drops **half of inventory** as a world-lootable bag and incurs heavier gear durability loss; town repair services lock out (requiring costly camp/black-market repair).
  - **Redemption:** Red status decays slowly through peaceful play or can be cleared via a **Mercy Writ** convenience item.

---

## 7. Currencies, Compliance & The Four NPC Laws

### Dual Currency Model
1. **Sols:** Earned strictly in-game (mob drops, selling loot/fish/materials). Spent on gear, tonics, and town blacksmith repairs. Never sold for cash.
2. **NEEDs:** In-game convenience currency (earned via ~1.5% rare mob drops, fishing treasures, and guaranteed boss drops, or purchased as a strict in-game product via Square-hosted checkout). Spent on cosmetic outfits, pet skins, FABLE's Popup Camper, Storage/Market Runners, Mercy Writs, and capped convenience boosters (Solo/Party Seals and Scrolls with diminishing returns).
3. **Six-Month Cosmetic Rule:** Every cash-shop cosmetic skin becomes earnable in-game 6 months after release, excluding only the founder-funding limited edition `TrollinlootNScoot` skin and limited-event trophies.

### Compliance & Ethics Wall (Florida §496.405)
- `NEEDs` is surfaced strictly as an in-game convenience product. Player-facing interfaces, NPC dialogue, and shop copy **never** frame `NEEDs` as a donation, charity split, tax-deductible contribution, or real-money benefit.
- Zero loot boxes, zero gambling upgrades, and zero paid combat power.
- Swimwear-maximum rating enforcement, zero nudity, 13+ signup age gate, and guardian confirmation for under-18 purchases.

### The Four Laws of Every Live NPC
1. **Proposals Only:** An NPC suggests (`suggest_hint`, `suggest_marker`, `suggest_safe_exit`, `suggest_repair_warning`, `suggest_event_pause`); the authoritative server decides; the player chooses. No NPC writes world state directly.
2. **Fourth Wall Holds:** NPCs speak strictly in DREAM world-native terms—never mentioning real-world companies, AI model vendors, or external business platforms.
3. **No Secrets, No Spoilers:** Any output matching secret patterns, tokens, or classified plot material is dropped pre-render by the safety judge.
4. **Nobody Waits on a Model:** Strict 3-second dialogue budget across tiered routing (T0 local Ollama ambient → T1 persistent named NPCs → T2 story-critical → T3 scheduled world actors, with Sup@ alone on signed-in Claude CLI). If inference is slow or offline, deterministic world-native fallback lines fire immediately.
