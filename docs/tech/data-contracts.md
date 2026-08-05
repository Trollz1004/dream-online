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

Implemented local API:

```text
GET /contracts
GET /contracts/:id
```

Example ids:

```text
character-profile
progression
combat-ability
life-skill
pvp-state
item-inventory
marketplace
boosters-pets
world-event
live-npc-memory
```

The endpoint serves local schemas only. It is not a provider bridge and does not expose
secrets, payment tokens, or classified material.

## Local sample payloads

Implemented local API:

```text
GET /samples
GET /samples/:id
```

Example ids:

```text
character-profile
progression
combat-ability
life-skill
pvp-state
item-inventory
marketplace
boosters-pets
world-event
live-npc-memory
```

The sample endpoint serves local prototype payloads only. It is for developer testing,
Unreal integration planning, and contract examples.

## Local world seeds

Implemented local API:

```text
GET /world/zones
GET /world/zones/:id
```

Current seed id:

```text
first-gate
```

The world-zone endpoint serves local seed files only and is intended for first-playable
prototyping.

## Local NPC profiles

Implemented local API:

```text
GET /npc/profiles
GET /npc/profiles/:id
```

Current profile ids:

```text
sup-guide
camp-guard
market-runner
field-gatherer
c0d3x-rider
```

The profile registry defines first-playable NPC purpose, memory scopes, and allowed
proposal types. NPC profiles may suggest approved game actions, but they do not execute
world changes directly.
