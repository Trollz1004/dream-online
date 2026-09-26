# DREAM ONLINE Local Prototype State

Last updated: 2026-09-26, by the Claude judge lane in a cloud checkout (nothing on the Alienware node was touched).

Purpose: compact handoff for the current state of the repository. This file must stay free of secrets, private vault material, provider tokens, payment data, and unrelated business/accounting notes. The live records are `ops/node/JOURNAL.md` (newest entry first) and `docs/DREAM-DISPATCH.md`; when they disagree with this file, they win and this file gets fixed.

## Root

- Repo root on the Alienware node: `C:\DREAM\dream-online`. `DREAM_ROOT` resolves there. Older documents name a `D:` drive root; that clone was folded in and removed on 2026-09-19 (`docs/CONSOLIDATION-2026-09-19.md`).
- GitHub: `Trollz1004/dream-online`, public, `main` is the only remote branch. The account's billing lock was cleared on 2026-09-26 and Actions runs again, so the gates are the local suites and the Actions checks.
- Rules: `CLAUDE.md` loads `AGENTS.md`. Node operations and the rulings in force: `ops/node/skills/alienware-node/SKILL.md`, section 0.
- Engine decision: `docs/tech/engine-decision-2026-09-20.md` (Godot 4.7.2 now; Unreal parked on defined revisit terms).
- Design index: `docs/DESIGN-INDEX.md`. Port contract: `docs/tech/local-prototype-ports.md`. Local commands: `docs/tech/local-command-reference.md`. AI failure behavior: `docs/tech/ai-failure-behavior.md`.

## The playable slice (Godot 4.7.2)

`game/godot/DreamSlice`, written entirely as text (GDScript and scene data), no compiler needed. Read its `README.md` first.

- Tests: `godot --headless --path game/godot/DreamSlice --script res://tests/run_tests.gd`. The floor `MINIMUM_CHECKS` in `tests/run_tests.gd` is 789. Last recorded run: 789 of 789 on `main` at `0c7bf71`, 2026-09-25, on the Alienware node.
- Open it: `game\godot\Open-DreamSlice.cmd` (windowed, never fullscreen, by Joshua's ruling of 2026-09-24). Browser build: `Export-DreamSlice-Web.cmd`, then `Serve-DreamSlice-Web.cmd` on `http://127.0.0.1:8099/`.
- Picture a frame: `godot --path game/godot/DreamSlice -- --capture <file.png> --at <seconds>`. Demo recording: `game/godot/Record-Demo.cmd`; its output is ignored by git.
- Built so far: movement and sprint; the dash with invulnerability frames; light attack chain; heavy attack; guard; Dream Lunge; Nightveil Burst; a training dummy that telegraphs and fires; the perfect-dodge world event; Mireth, a friendly NPC whose memory of the player's perfect dodges is written to and recalled from the Live NPC Lab with a local fallback (`scripts/npc_memory.gd`); the demo director and recording; side-screen capture; Day Dream and Night Dream environments with CC0 textures, trees, ruins and a night city with rain and crowds; a rigged CC0 character wearing the ranger outfit Joshua chose on 2026-09-25; the GeminEYE timed looting pet with a demo NEEDs shop on P; a movable keyboard hotbar with red and blue potions and food on 1 to 3.
- Known weak spots (journal, 2026-09-25): hotbar icons are plain coloured dots; the pet's bubble and tombstone read small at play distance; hotbar drag and rebinding were not tested interactively.

## Local services (Node, zero dependencies)

- Live NPC Lab: `game/server/live-npc-lab`, `npm start`, health `http://127.0.0.1:9127/health` must contain `dream-live-npc-lab`. Tests: `npm test` (ten scripts) and `npm run test:contracts` (eleven contracts). Cloud calls are off by default; providers are gated in `src/providers.js`; Hermes is a disabled-by-default webhook provider.
- DreamOps Bridge: `game/server/dreamops-bridge`, `npm start`, health `http://127.0.0.1:9133/health` must contain `dreamops-bridge`. Inspection and safe proposal endpoints only; it never executes a destructive rollback. It has no test script yet.
- Both bind to `127.0.0.1`. Other services on the same box own their ports and no Dream service takes them: Hermes dashboard 9119, Ollama 11434, the older JARVIS HUD 9150, Crosslisting 3000, Obsidian's REST API 27123. The full list, with reserved Dream ports, is in `docs/tech/local-prototype-ports.md`.
- Verified on 2026-09-26 in the cloud checkout: Live NPC Lab `npm test` and `npm run test:contracts` pass; `ops/node/brain` tests 10 of 10. The Godot suite was not run there (no Godot in the container).

## Unreal (parked)

Unreal Engine 5.8.2 stays at `C:\DREAM\UE_5.8`, with City Sample on disk, for cinematics and reference only. `game/unreal/` holds the earlier Blueprint test-zone scripts; nothing there is on the path to the game. The revisit terms are in the engine decision record.

## Records and rulings

- Rulings in force, in Joshua's own dated words: section 0 of `ops/node/skills/alienware-node/SKILL.md`. Combat rulings: `docs/gdd/02-action-combat.md`. World: `docs/gdd/08-day-dreams-night-dreams-world.md`. Interface: `docs/gdd/09-interface-style.md`. Honest readiness check: `docs/gdd/10-crowdfunding-readiness.md`.
- Latest rulings (2026-09-24 and 2026-09-25): five classes including a Healer; at the awakening every class splits into a Nightmare path or a DREAM path; the archer line's second path is a melee dagger ranger; windowed mode always.
- Open for the node lane: the runbook's landing rule still needs the note that Actions is a gate again; icon and pet polish; the melee dagger ranger's combat; which ranger path is Nightmare and which is DREAM is Joshua's call.

## Safe work boundaries

- Do not read or copy classified OneDrive material into this repo.
- Do not commit `.env` values, provider keys, session exports, private keys, or local auth configs.
- Do not use direct competitor name drops in active docs, prompts, reports, or player-facing copy.
- Keep paid systems limited to convenience, style, and access. Do not sell combat power.
- Do not deploy externally, install heavyweight interactive software, make purchases, or perform destructive operations without explicit approval.
- Only the Claude judge lane edits `ops/node/**`; every such edit gets a line in `ops/node/runbook/PROTECTED-CHANGELOG.md`.
