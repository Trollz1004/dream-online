# DREAM ONLINE Current State

Updated: 2026-07-08

## Repo

Private repo:

```text
https://github.com/Trollz1004/dream-online
```

Local root:

```text
D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG
```

Current lane:

- DREAM ONLINE only.
- Keep ANTIGRAVITY/date-app/business-exchange drift out of this repo.
- Keep Paperclip/local legacy stubs out of git.

## Active prototype

Live NPC Lab:

```text
game/server/live-npc-lab
http://127.0.0.1:9127/health
```

Core endpoints:

```text
GET  /health
GET  /contracts
GET  /contracts/:id
GET  /world/zones
GET  /world/zones/first-gate
POST /npc/dialogue
POST /npc/event
GET  /npc/memory?playerId=founder
```

Local checks:

```powershell
npm test
npm run test:contracts
```

## Major contracts created

- `character-profile`
- `progression`
- `combat-ability`
- `life-skill`
- `pvp-state`
- `item-inventory`
- `marketplace`
- `boosters-pets`
- `world-event`
- `live-npc-memory`
- `day-night-economy-rules`

Index:

```text
game/server/live-npc-lab/data/schema-index.json
```

## First playable target

Zone:

```text
First Gate
```

Seed:

```text
game/server/live-npc-lab/data/first-zone.seed.json
```

Core proof:

- movement
- one guide NPC
- one gather loop
- one combat loop
- Day/Nightfall behavior change
- one live-world event
- inventory/durability/repair visibility
- Storage Runner and Market Runner as limited convenience concepts

## Key design decisions

- Public phrasing: live-world open-world MMO.
- Avoid player-facing `sandbox` jargon.
- No direct competitor name drops in active docs or public copy.
- Codex and Claude are the primary code-authoring lanes.
- Hermes can support unless Joshua directly assigns more authority.
- Monetization is convenience/style/access only, not paid combat power.
- No classified OneDrive plot material in repo files.
- No secrets or populated `.env` values in repo files.

## Systems already drafted

- Nightfall day/night risk economy.
- PvE death EXP loss draft.
- Level 20 combat identity shift.
- Level 45 `Nightmare Class` and `DREAM Class` awakening identity.
- Pink Flag and Red Name open-world PK consequence loop.
- Structured war risk for node wars, castle sieges, city sieges, and guild wars.
- Storage Runner and Market Runner logistics.
- Pets, boosters, inventory, durability, marketplace, and item-drop rules.
- Dream event layering, including future wilderness-to-city founder-test events.
- C0D3X-style world recovery fiction mapped to rollback/audit systems.

## Important docs

- `docs/roadmap/milestones.md`
- `docs/testing/first-playable-acceptance.md`
- `docs/testing/first-playable-walkthrough.md`
- `docs/tech/unreal-first-playable-map.md`
- `docs/tech/data-contracts.md`
- `docs/ux/first-playable-hud.md`
- `docs/audio/first-playable-audio.md`
- `ops/dream-task-bank-100.md`
- `ops/software-install-plan.md`

## Next safe actions

1. Add schema-aware sample payloads for each contract.
2. Add a local `/samples` endpoint after sample files exist.
3. Run validation only when Joshua asks for a check pass.
4. Freeze First Gate scope before Unreal installation.
5. Install Unreal/Visual Studio/CMake only after Joshua approves a long interactive setup window.

## Stop conditions

Do not do these from unattended heartbeat work:

- read or expose secrets
- use classified OneDrive plot material
- install heavyweight software
- deploy externally
- make purchases or charges
- delete or rewrite remote history
- add paid power
- add unrelated date-app/business-platform material
