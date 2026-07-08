# Data Contracts

Status: prototype index

The local Live NPC Lab now has a contract-first data layer. These schemas are not the
final database design; they are the first shared language for Codex, Claude, future
Unreal work, backend services, and AI/NPC systems.

## Contract index

Primary machine-readable index:

```text
game/server/live-npc-lab/data/schema-index.json
```

## Current contracts

- Character profile: creation, starter path, appearance, level 45 awakening identity.
- Progression: level cap, level 20 shift, level 45 awakening, death penalty, EXP modifiers.
- Combat ability: action-command inputs, stamina, cooldowns, hit shapes, movement, visual identity.
- Life skill: gathering, fishing, cooking, processing, farming, worker routes, AFK-safe limits.
- PvP state: Pink Flag, Red Name, guard response, level scaling, structured war risk.
- Item/inventory: item templates, bag/treasury slots, durability, repair, drops, audit.
- Marketplace: listings, buy orders, Storage Runner, Market Runner, fees, locks, audit.
- Boosters/pets: seals, scrolls, diminishing returns, pet capabilities, paid-power boundaries.
- World event: Dream Shift, wilderness-to-city layers, Nightfall surge, rollback hooks.
- Live NPC memory: NPC profiles, retrieval, dialogue turns, proposed actions, provider routing.
- Day/night economy rules: first seed values for Day/Nightfall, PvP, boosters, pets, runners.

## Design rules

- Keep schemas free of secrets and payment tokens.
- Keep provider credentials outside the game client and outside committed files.
- Keep classified plot material out of repo data contracts.
- Keep public-facing fields player-readable.
- Keep monetization fields constrained to convenience/style/access, not paid combat power.

## Next implementation step

The next safe code step is a schema-aware `/contracts` endpoint in the Live NPC Lab that
returns `schema-index.json` and optionally serves individual schema files by id.
