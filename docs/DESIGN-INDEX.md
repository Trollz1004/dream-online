# DREAM ONLINE Design Index

This folder contains implementation-facing companion docs for the first playable slice.

Canonical build root: `E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG`

Primary design source of truth remains:

`C:\antigravity\paperclip-tro\projects\PROJECT-2-DREAM-ONLINE.md`

Classified founder-only material remains outside repo in the OneDrive do-not-commit vault. Do not copy it here, into git, into PR bodies, or into public docs.

## Read Order

1. `CLAUDE.md`
2. `TASKS.md`
3. `memory/glossary.md`
4. `docs/gdd/00-vision.md`
5. `docs/gdd/01-vertical-slice.md`
6. `docs/gdd/02-action-combat.md`
7. `docs/gdd/03-life-skills-economy.md`
8. `docs/gdd/04-pvp-flagging-durability.md`
9. `docs/tech/prototype-architecture.md`
10. `docs/tech/live-ai-runtime-architecture.md`
11. `docs/tech/c0d3x-world-recovery.md`
12. `docs/testing/test-plan.md`
13. `docs/testing/live-ai-load-test-plan.md`

## Current Build Strategy

Start small. Prove one playable slice before full MMO scale.

The slice must validate:

- No-tab-target action combat.
- Gathering, processing, cooking, fishing, workers, repair.
- Pay-for-convenience only.
- One shared world direction: no instances, no fast travel.
- Day/night Dream Shift as gameplay, not just lighting.
- Live NPC bridge as the long-term moat.
- C0D3X/DreamOps recovery as lore-backed operational safety.

## Implementation Reality

As of the current state note, no game server, game loop, or netcode exists yet. The folders under `game/` are scaffolding until implementation starts.
## Day/Night Economy And Market

- `docs/gdd/05-day-night-economy-market.md`: day/night XP rotation, Nightfall monster risk, PvE death EXP loss, level 20 combat shift, booster stacking, pets, Storage Runners, Market Runners, and marketplace requirements.
- `docs/gdd/06-pvp-level-scaling.md`: simple PvP scaling where level gap dominates, with small cooldown/range/melee modifiers and separate anti-grief boundaries.
- `docs/gdd/07-character-creation.md`: character creation vision, starter combat paths, level 20 identity shift, level 45 awakenings, and console-friendly UX.

## Brand And Repo Setup

- `docs/brand/BRAND.md`: brand voice, clean language, visual direction, and original placeholder logo rules.
- `assets/brand/dream-online-logo.svg`: original placeholder logo mark for the private repo.
- `CONTRIBUTING.md`: contribution rules, public-copy boundaries, commit style, and ownership.
- `SECURITY.md`: secret handling and sensitive-system reporting.
- `ops/software-install-plan.md`: engine/toolchain install order and current local-tool strategy.
