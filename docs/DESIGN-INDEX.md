# DREAM ONLINE Design Index

This folder contains implementation-facing companion docs for the first playable slice.

Canonical build root: `C:\DREAM\dream-online` on the Alienware node (`DREAM_ROOT` resolves there; the older `D:` drive root was folded in and removed on 2026-09-19).

Primary design source of truth remains the canon document, kept local and ignored by git at `paperclip-tro/projects/PROJECT-2-DREAM-ONLINE.md` under the repo root.

Classified founder-only material remains outside repo in the OneDrive do-not-commit vault. Do not copy it here, into git, into PR bodies, or into public docs.

## Read Order

Read the live state first, then the design:

1. `CLAUDE.md` (which loads `AGENTS.md`)
2. `docs/tech/engine-decision-2026-09-20.md` (Godot 4.7.2; Unreal parked)
3. `docs/DREAM-DISPATCH.md` and the newest entry of `ops/node/JOURNAL.md`
4. `STATE.md` and `TASKS.md`
5. `game/godot/DreamSlice/README.md`
6. `memory/glossary.md`
7. `docs/gdd/00-vision.md`
8. `docs/gdd/00a-first-playable-promise.md`
9. `docs/gdd/01-vertical-slice.md`
10. `docs/gdd/01a-first-15-minute-journey.md`
11. `docs/gdd/02-action-combat.md` (the combo grammar, the five classes and the awakening paths)
12. `docs/gdd/08-day-dreams-night-dreams-world.md` and `docs/gdd/09-interface-style.md`
13. `docs/gdd/10-crowdfunding-readiness.md`
14. `docs/gdd/03-life-skills-economy.md`
15. `docs/gdd/04-pvp-flagging-durability.md`
16. `docs/tech/prototype-architecture.md`
17. `docs/tech/live-ai-runtime-architecture.md`
18. `docs/tech/ai-failure-behavior.md`
19. `docs/tech/local-prototype-ports.md`
20. `docs/tech/local-command-reference.md`
21. `docs/tech/c0d3x-world-recovery.md`
22. `docs/planning/first-playable-risk-register.md`
23. `docs/testing/test-plan.md`
24. `docs/testing/first-playable-acceptance-checklist.md`
25. `docs/testing/live-ai-load-test-plan.md`

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

As of 2026-09-26: the Godot combat slice under `game/godot/DreamSlice` is real and playable (see `STATE.md` for what it contains and its test floor). The Node services under `game/server` (Live NPC Lab, DreamOps Bridge) are real local prototypes. There is still no server-authoritative game server or netcode; invulnerability is decided on the client, which `docs/gdd/02-action-combat.md` already flags as wrong for player-versus-player and files under later. `game/unreal/` is the parked Unreal test-zone tooling.

## Day/Night Economy And Market

- `docs/gdd/05-day-night-economy-market.md`: day/night XP rotation, Nightfall monster risk, PvE death EXP loss, level 20 combat shift, booster stacking, pets, Storage Runners, Market Runners, and marketplace requirements.
- `docs/gdd/06-pvp-level-scaling.md`: simple PvP scaling where level gap dominates, with small cooldown/range/melee modifiers and separate anti-grief boundaries.
- `docs/gdd/07-character-creation.md`: character creation vision, starter combat paths, level 20 identity shift, level 45 awakenings, and console-friendly UX.

## Brand And Repo Setup

- `docs/brand/BRAND.md`: brand voice, clean language, visual direction, and original placeholder logo rules.
- `assets/brand/dream-online-logo.svg`: original placeholder logo mark for the private repo.
- `docs/gdd/00a-first-playable-promise.md`: smallest P0 proof for movement, one enemy, one node, one guide NPC, one event, and persistence.
- `docs/testing/first-playable-acceptance-checklist.md`: pass/fail gate for movement, one enemy, one gathering node, one NPC guide, one world event, and persistence.
- `docs/tech/local-prototype-ports.md`: local port ownership and collision rules for DreamOps Bridge, Live NPC Lab, and reserved future services.
- `docs/tech/local-command-reference.md`: safe start, health-check, test, port-inspection, and stop commands for DreamOps Bridge and Live NPC Lab.
- `docs/tech/ai-failure-behavior.md`: P0 degraded-mode rules for no response, slow response, unsafe output, rate limits, and provider outage.
- `docs/planning/first-playable-risk-register.md`: P0 blocker register for engine, C++ toolchain, art assets, AI cost, and network scale.
- `CONTRIBUTING.md`: contribution rules, public-copy boundaries, commit style, and ownership.
- `SECURITY.md`: secret handling and sensitive-system reporting.
- `ops/software-install-plan.md`: engine/toolchain install order and current local-tool strategy.
