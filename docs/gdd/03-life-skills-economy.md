# Life Skills and Economy

## Design Goal

Life skills must be as deep and respected as combat. Players can progress by fighting, working, crafting, fishing, trading, farming, and running workers.

## Core Life Skills

| Skill | Core Loop |
|---|---|
| Gathering | Find node, use tool, spend energy/time, receive raw materials |
| Processing | Convert raw materials into refined materials |
| Cooking | Combine ingredients into food, buffs, worker meals, trade crates |
| Alchemy | Create potions, oils, reagents, durability compounds, monster lures |
| Farming | Plant, grow, breed, harvest, respond to pests/weather |
| Fishing | Active minigame or slower AFK fishing loop |
| Hunting | Track and kill wildlife for hides, meat, trophies |
| Crafting | Tools, armor, weapons, camp gear, stations, boats, wagons later |
| Workers | NPC labor for nodes and workshops while player plays or AFKs |
| Trading | Move goods across routes for distance/risk bonuses |

## Resource Chain Examples

Tree -> Logs -> Timber -> Planks -> Treated Planks -> Tool Handle -> Gathering Tool.

Fish -> Fresh Fish -> Dried Fish -> Cooking Ingredient -> Worker Meal -> Worker stamina restoration.

Ore -> Raw Ore -> Melted Shard -> Ingot -> Weapon Part -> Repair Kit / Gear.

Herb -> Dried Herb -> Extract -> Potion / Alchemy Oil / Durability Compound.

## AFK Systems

Allowed:

- AFK fishing.
- Worker node gathering.
- Long cooking batches.
- Long processing batches.
- Farming timers.

Rules:

- AFK yields are slower than active play.
- AFK activities consume durability, inventory, worker stamina, or station uses.
- AFK cannot create best-in-game rewards without active inputs or market risk.
- AFK systems must protect server performance.

## Monetization Boundaries

Allowed:

- Cosmetics.
- Outfits.
- Camp skins.
- Mount skins.
- Housing furniture skins.
- Storage convenience.
- Portable repair convenience.
- Queue/crafting UI convenience.
- EXP boost buckets capped at +10% each.

Disallowed:

- Paid damage.
- Paid defense.
- Paid PvP advantage.
- Paid rare-drop advantage.
- Paid exclusive crafting material.
- Paid marketplace control.
- Paid worker output multiplier beyond cosmetic/convenience boundaries.

## EXP Buckets

- Combat EXP boost cap: +10% paid convenience.
- Skill EXP boost cap: +10% paid convenience.
- Life Skill EXP boost cap: +10% paid convenience.
- Mount EXP boost cap: +10% paid convenience.

In-game buffs can exceed paid boosts if earned through food, guilds, events, crafted items, or world bonuses.

## Founder Monetization Detail: Treasury, Bags, Pets, Costumes

These are allowed paid convenience/cosmetic lanes, with in-game earnable equivalents.

| System | Free / Earnable Baseline | Paid Convenience | Rule |
|---|---|---|---|
| Treasury storage | Player gets 1 treasury slot baseline | 1 additional treasury slot can be paywalled | Paid storage is convenience, not exclusive power |
| Inventory bags | Player gets baseline bag access | Additional bag slots/bags can be paywalled | In-game bag upgrades must exist, but can be difficult |
| Pets | In-game pets can be earned through hard play | Paid pets allowed | Paid pets cannot give exclusive combat/PvP advantage |
| Costumes | In-game costumes can be earned through hard play | Paid costumes allowed | Paid costumes are visual/convenience only |

Design requirement:

- Anything sold for convenience should have a hard but real in-game path.
- Paid versions may save time, reduce friction, or add style.
- Paid versions must not create exclusive combat damage, defense, PvP, rare-drop, or economy-control advantage.
- If a paid item affects life skills, cap it inside the approved convenience bucket and provide an earnable alternative.

Initial product framing:

- Sell treasury convenience.
- Sell inventory convenience.
- Sell pet access/cosmetics.
- Sell costumes and identity.
- Do not sell victory.


## Random-Stat Marketplace Loot, 100% Non-Gambling Forge & Dual-Era Ocean Sailing (Founder Ruling, 2026-11-01)

### 1. Random-Stat Loot Drops for the Player Marketplace
To give the player-driven Marketplace real economic purpose and in-game currency (`Sols`) tax velocity, monster and boss drops roll randomized stat affixes across five rarity tiers (**`Common` → `Uncommon` → `Rare` → `Legend` → `Mythos`**):
- **`+HP%` / Flat Vitality** (prized by Vitality Defenders and Full-HP `FingFangFoom` Dragons)
- **`+Melee Attack`**
- **`+Magic Attack`**
- **`+Ranged Attack`**
- **Weapon-Specific & Skill-Tree Affinities**

### 2. 100% Non-Gambling Deterministic Forge (Zero Break, Zero Fail-Stacks Ever)
- **Strict Anti-Gambling Law:** Weapons and armor **never break, never downgrade, and never use fail-stacks** when forging.
- **In-Game Earned Only:** Forging a weapon from `Common` → `Uncommon` → `Rare` → `Legend` → `Mythos` requires **Forge Catalysts** and in-game currency (`Sols`) obtained strictly by farming drops in-world or trading with other players on the Marketplace (never sold for real money).
- **Progressive 3D Weapon Visuals:** Every Forge tier adds a distinct 3D visual aura to the equipped weapon so players can see each tier in the open world:
  - `Rare`: Subtle elemental edge glow.
  - `Legend`: **Growing Blue Flame** surging along the blade or mace head.
  - `Mythos`: **Sovereign Blue/Crimson Flame + Orbiting Arcane Orbs** circling a Staff, Zhen, Blade, or Bow.

### 3. Visually Animated Life Skills, Shipbuilding & Dual-Era Ocean Exploration
- **Crafted Elixirs & Party Feasts:** Gathering, active/AFK fishing, forging, and alchemy feature expressive 3D animations and produce the solo/party Elixirs and Food Buffs that serve as Factor #7 in the PvP/PvE combat hierarchy.
- **Shipbuilding & Sailing the Dream Oceans:** Players construct seafaring vessels to sail across the open ocean to distant islands to level, gather, farm, trade, and explore across both world states:
  - **Day Dream (`day_dream_3d`):** Classic wind-powered **Tall Ships and Sailboats** with canvas sails, timber hulls, and rope rigging (**zero engines**).
  - **Nightfall / Nightmare (`nightmare_3d`):** At Nightfall, vessels morph into **High-Speed Neon Speedboats and Luxury Cyber-Yachts** powered by hydro-turbines, racing across bioluminescent ocean waves between island sanctuaries.
