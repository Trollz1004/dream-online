# The tools of the House

An index for any Claude or any builder reading this repository. Paths are relative to the repository root; everything listed is public and free of secrets.

## Rules and records

- `docs/house/THE-HOUSE.md`: the House rules, the seats, the nodes.
- `docs/house/LESSONS.md`: the lessons, for anyone.
- `docs/house/DESIGN-SYSTEM.md`: the DREAM Space design system (palette, type, motion, parts, rules), the preset for every surface of the House.
- `AGENTS.md`: the game repository's rulebook (lanes, architecture, design rules).
- `docs/DREAM-DISPATCH.md`: the current objective and the dated handoff record.
- `ops/node/JOURNAL.md`: the Alienware node's journal, newest entry first, in the form did, verified, blocked, next, commits.
- `ops/node/runbook/ALIENWARE-NODE-RUNBOOK.md` and `ops/node/runbook/PROTECTED-CHANGELOG.md`: how the node runs and every edit to its protected files.
- `docs/house/ai-studio-stages.json`: where each AI Studio app stands and what it waits on.

## Specs (Spec Kit)

- `specs/000-alienware-node/`: the node itself.
- `specs/001-world-bus-cross-eyed-slice/`: the world event bus and the first slice.
- `specs/002-crowdfunding-demo/`, `specs/003-production-look/`, `specs/004-cloud-demo/`, `specs/005-tutorial-slice/`: the game's demo, look, cloud build and tutorial.
- `specs/006-mission-control-jarvis/`: Mission Control with OPSis on the Echo Show, the validators, the watchdog rule, the date app's notification proof.

## Briefs and prompts for the other lanes

- `docs/handoffs/GEMINI-DREAM-ENGINE-2026-09-30.md`: the brief for DREAM Engine, DREAM World Server and DREAM Maker, built by Gemini in AI Studio.
- `docs/handoffs/GEMINI-DREAM-ENGINE-SYSTEM-INSTRUCTIONS.md`: the system instruction saved into the AI Studio project.
- `docs/handoffs/GEMINI-CHARACTER-DESIGN-2026-09-20.md`: the character design lane.
- `docs/tech/engine-decision-2026-09-30-own-engine.md` and `docs/tech/engine-decision-2026-09-20.md`: why the House builds its own engine, and the Godot record it supersedes.

## Scripts and services

- `ops/node/drift.cmd`: the founder's one command on the Alienware node (`drift`, `drift voice`, `drift duo`, `drift health`, `drift ground`, `drift jarvis`).
- `ops/node/alienware-health.ps1` and `ops/node/dream-ground-truth.ps1`: the token-free health probe and the ground-truth checker, with Pester tests beside them.
- `ops/node/backup-node.mjs`: the nightly backup of the game vault and the database, with tests.
- `ops/t5500/`: the josh-proofed bootstrap for a fresh Windows marketing node (step-gated, resumable, sign-in gates, a Hermes profile as OPSis, a self-healing health task), with Pester tests.
- `game/server/live-npc-lab/`: the Live NPC Lab (Node, zero dependencies, `npm test`).
- `game/server/dreamops-bridge/`: the DreamOps Bridge, the only path from a proposal into the running world.
- `game/godot/DreamSlice/`: the playable combat slice in Godot 4.7.2, with its headless suite and its check floor.
- `.github/workflows/`: the Godot headless suite, the Live NPC Lab checks, and the GitHub Pages demo build.

## The connector

- `workers/claudes-house/`: the read-only "Claude's House" connector for claude.ai and Cowork, a Cloudflare Worker that serves these pages and records as tools, with no auth and no secrets, free for anyone to add or fork.
