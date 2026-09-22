# DREAM Dispatch

Last updated: 2026-09-22

Operational state for asynchronous coordination between Fable and Codex. The master directive defines doctrine; this file defines what is happening now.

Move that date whenever this file is touched. `ops/node/dream-ground-truth.ps1` reads it and calls this file stale when work landed after it, which is how a session finds out that the dispatch is lying before it acts on it rather than after.

## CURRENT OBJECTIVE

Spec 001, the world bus and the CrossEyed vertical slice (directive section 43). Story 1, something the founder can open and play, is now real and is built in **Godot 4.7.2**, not Unreal. Joshua chose Godot on 2026-09-20 after the Unreal path stalled on a missing C++ compiler and on Blueprint logic that has to be hand-wired in an editor, which the engine's own scripting cannot do (checked in the engine source: `BlueprintEditorLibrary` exposes graphs and variables but no node creation or pin connection). GDScript and scene data are text, so this lane writes, runs, tests and photographs the game with nothing for anyone to click. Unreal is parked, not deleted, and City Sample stays on disk.

The playable piece is `game/godot/DreamSlice`: a dash with invulnerability frames, a light attack chain, a training dummy that telegraphs and fires, and a perfect dodge that writes one world event. It runs in a window and in a browser. The event path (story 2) and the fallback proof (story 3) follow.


## CURRENT OWNER

Claude judge lane on Alienware. Ninth session, 2026-09-22 at about 01:00 EDT.


## LAST VERIFIED STATE

2026-09-22 at about 01:00 EDT, on the Alienware node (`192.168.0.40`). `drift ground` was RED at session start: the branch `judge/web-mouse-hint` carried the two web fixes the 2026-09-21 session had queued and left uncommitted (staged but not committed), and the Obsidian MCP handshake was down because Obsidian itself was not running (a different failure from the 2026-09-21 config repair, which still holds). Both fixed this session: the mouse-hint work was reviewed, one accidental UTF-8 BOM in `run_tests.gd` was stripped, tests run, committed, merged to `main` and pushed; Obsidian was launched and the handshake answers again. `drift ground` now reports every line PASS.

The combat slice: 94 of 94 headless checks pass (was 87; 7 new, covering the click hint and the player-configuration-order fix). The desktop build was captured fresh (`C:\DREAM\recon\screenshots\mouse-hint-desktop.png`) and the hint line reads cleanly at the top of the column with no overlap. The browser build was re-exported and served again at `http://127.0.0.1:8099/`, but this session's Claude in Chrome extension was not connected, so the hint's actual on-click behavior in a real browser was not re-photographed this time; the 2026-09-21 measurement of `document.pointerLockElement` behavior that the fix and its test are built on still stands. Checkout clean and equal to `origin/main`. Required game services UP by identity (Live NPC Lab 9127, DreamOps Bridge 9133).


## FILES CHANGED

This session: `game/godot/DreamSlice/scripts/hud.gd`, `player.gd`, `world.gd`, `tests/run_tests.gd`, `tests/test_hud.gd`, this file, `ops/node/JOURNAL.md`. The browser build itself lands in `build/`, which is ignored.

Earlier, still current: `game/godot/*.cmd` (open, export, serve), `docs/gdd/02-action-combat.md`, `docs/gdd/08-day-dreams-night-dreams-world.md`, `docs/gdd/09-interface-style.md`, `docs/handoffs/GEMINI-CHARACTER-DESIGN-2026-09-20.md`, `ops/node/**`.


## SERVICES TOUCHED

None stopped or restarted. A local static server was run on port 8099 to check the browser build and was stopped again; the port is free.


## TEST RESULTS

`godot --headless --path game/godot/DreamSlice --script res://tests/run_tests.gd`: 87 of 87 pass, 7 of them new and covering the readout. The runner now also fails when fewer checks run than expected, because a GDScript error inside a test function aborts that function silently and the run still exited 0, which hid a whole red suite on 2026-09-20.


## KNOWN FAILURES

None in the game code. Outside it, unchanged from earlier sessions: GitHub Actions cannot confirm any merge while the account's billing lock stands ("The job was not started because your account is locked due to a billing issue"), so the local run is the only gate. Claude Code's permission classifier refuses the Visual Studio install and the hermes `master` merge; both are Joshua's to run from his own terminal. The stack script's `sentry` probe of `192.168.0.8:9140` fails by design since Sabretooth folded its Sentry into JARVIS on 2026-09-18.


## OPEN QUESTIONS

- A second dispatch file exists at the repository root (`DREAM-DISPATCH.md`, from commit `be5b19b`). This file under `docs/` is the one the 2026-09-18 brief names as operational. Codex or Joshua: retire the root copy, or say which one stands.
- From Codex, 2026-09-19 (handoff `CODEX-TO-FABLE.md` in the drop box): Codex owns the crowdfunding automation in `Trollz1004/ANTIGRAVITY` on Sabretooth and plans `specs/008-crowdfund-game-loops/` there, a specification only, for three game loops: named-NPC gossip, Founder fables and referral memory. Proposed event names, not yet existing anywhere: `npc.name_assigned`, `gossip.message_seeded`, `gossip.message_observed`, `world.fable_recorded`, `world.fable_reference_resolved`, `referral.memory_seeded`, `npc.referral_greeting_delivered`. The spec had not landed when this was written. When it lands, the Alienware Claude lane reviews the event names against the world bus of spec 001, the mapping from backer tiers to naming and fable benefits, and what delivery timing the game can really guarantee. No game code for these loops until then, and only one builder changes game code at a time. Standing fact for any campaign copy: as of 2026-09-19 the game is two local Node prototypes (Live NPC Lab, DreamOps Bridge); there is no Unreal project file and no playable client, so copy must not say these features are live.
- Answered: the DREAM stack script is `C:\DREAM\hermes\scripts\dream-stack.ps1`. Its `package.json` wrapper belongs at `C:\DREAM\` and was put back there.

## DO-NOT-TOUCH

`docs/DREAM-MASTER-DIRECTIVE.md` sections 50 and 51 (founder locks, stop conditions); the DREAM-ONLINE vault folder; everything under `ops/node/` unless you are the Claude judge lane (see `ops/node/runbook/PROTECTED-CHANGELOG.md`).

## NEXT HANDOFF

Summary for Codex: **the engine changed.** Game code now exists and it is Godot 4.7.2 under `game/godot/DreamSlice`, written entirely as text. Read that folder's README first. Unreal is parked, not deleted.

What is worth a look. The combat rules live in plain data and geometry, not in engine nodes, so the same rules can run on a server later, which is where invulnerability has to be decided: `scripts/dash_state.gd` owns the frame windows, `scripts/attack_state.gd` the swing chain, `scripts/combo.gd` the rule that a distinct set of keys is a distinct skill and that the Shift is part of the set. A perfect dodge writes one event through `scripts/world_event.gd` in the envelope of `contracts/world-event-envelope.md`, append-only JSONL, unchanged from the judged draft. The age mode wire value is still `NIGHTMARE_13_PLUS`. None of the seven event names Codex proposed is adopted into this slice, though all seven fit the naming rule.

This session's addition: a browser player who has not yet clicked now sees "Click to look around." at the top of the HUD column, because a web export cannot take pointer lock until a user gesture and nothing said so before. The line is driven by whether `Input.mouse_mode` is actually captured, so it also covers Escape on desktop. Fixing it surfaced a real ordering bug in `world.gd`: `player.capture_mode`/`demo_move`/`demo_yaw` were being set one line after `add_child(player)`, too late for `_ready` to see them, which silently broke scripted `--yaw` captures and made a scripted capture run grab the real mouse. Both are now set before the player enters the tree.

Security check: no secrets read or written; the repository stays public-safe; the browser build lands in the ignored `build/` folder and is not committed.

Rollback for this session's work: revert the merge commit named "click hint on the web build; player config-before-add_child bug fixed; 94 of 94".

Next: Joshua tried the browser build and said mouse-look "seemed to work," so the hint is doing its job. Story 2, the event path into the Live NPC Lab, is the next piece of spec 001 and needs no compiler.
