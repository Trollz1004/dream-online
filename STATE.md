# DREAM ONLINE Local Prototype State

Last updated: 2026-07-08

Purpose: compact handoff for the current local prototype state. This file must stay free of secrets, private vault material, provider tokens, payment data, and unrelated business/accounting notes.

## Root

- Repo root: `D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG`
- Expected env var: `DREAM_ROOT=D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG`
- Task queue: `ops/dream-task-bank-100.md`
- Primary project rules: `CLAUDE.md`, `AGENTS.md`
- Design index: `docs/DESIGN-INDEX.md`
- Local port contract: `docs/tech/local-prototype-ports.md`
- Local command reference: `docs/tech/local-command-reference.md`
- AI failure behavior: `docs/tech/ai-failure-behavior.md`

## Local Services

| Service | Path | Start Command | Health URL |
| --- | --- | --- | --- |
| Live NPC Lab | `game/server/live-npc-lab` | `npm start` | `http://127.0.0.1:9127/health` |
| DreamOps Bridge | `game/server/dreamops-bridge` | `npm start` | `http://127.0.0.1:9133/health` |

Service notes:

- Live NPC Lab defaults to local/mock behavior and has no cloud provider implementation enabled by default.
- DreamOps Bridge is local-only and supports inspection plus safe proposal endpoints. It does not execute destructive rollback actions.
- If both services are run at once, keep Live NPC Lab on port `9127` and DreamOps Bridge on port `9133`.
- Future local game, web, and agent bridge ports are reserved in `docs/tech/local-prototype-ports.md` to prevent collisions.

## Current First-Playable Scope

The first playable proof remains:

- Movement.
- One starter enemy.
- One gathering node.
- One NPC guide.
- One world event.
- Local persistence for player state, NPC memory, and world event state.

Acceptance gate: `docs/testing/first-playable-acceptance-checklist.md`

## Current Implementation Reality

- Unreal gameplay implementation is not present in this repo yet.
- Current executable local prototypes are Node services under `game/server`.
- Data schemas exist for several future systems under `game/server/live-npc-lab/data`.
- No lint/typecheck command is defined for the whole repo.
- Live NPC Lab has local smoke and first-playable dialogue/event/memory checks via `npm test` in `game/server/live-npc-lab`.

## Safe Work Boundaries

- Do not read or copy classified OneDrive material into this repo.
- Do not commit `.env` values, provider keys, session exports, private keys, or local auth configs.
- Do not use direct competitor name drops in active docs, prompts, reports, or player-facing copy.
- Keep paid systems limited to convenience, style, and access. Do not sell combat power.
- Do not deploy externally, install heavyweight interactive software, make purchases, or perform destructive operations without explicit approval.

## Next Useful P0 Slices

- Convert the AI failure behavior rules into Live NPC Lab tests for disabled provider,
  timeout fallback, unsafe action rejection, and inspectable failure logs.
