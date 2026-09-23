# DREAM Dispatch

Last updated: 2026-09-23

**2026-09-23 about 16:20 EDT, Claude judge lane on Alienware.** The spec 002 integration card (the demo director and its recording) is merged to `main` as `6570bdd`, 327 of 327 headless checks. The 88-second recording is at `game/godot/DreamSlice/demo/dream-demo.mp4` (ignored by git; rebuild with `game/godot/Record-Demo.cmd`). Known flaw: a 1.5 s pale-orange washout right after the Dream Lunge at about 24 s. Spec 002 has no `tasks.md`; its work list is `integration-card.md`. Waiting on Joshua's view of the video.

**2026-09-23 about 13:05 EDT, Claude judge lane on Alienware.** The spec 002 crowdfunding-demo work (`specs/002-crowdfunding-demo`: Mireth's memory link, the Day Dream pass, four character passes) was merged to `main` and pushed as `f5b6928`, 301 of 301 headless checks. The sections below still describe the 2026-09-22 state; read spec 002's `tasks.md` for what comes next.

Operational state for asynchronous coordination between Fable and Codex. The master directive defines doctrine; this file defines what is happening now.

Move that date whenever this file is touched. `ops/node/dream-ground-truth.ps1` reads it and calls this file stale when work landed after it, which is how a session finds out that the dispatch is lying before it acts on it rather than after.

## CURRENT OBJECTIVE

Spec 001, the world bus and the CrossEyed vertical slice (directive section 43). Story 1, something the founder can open and play, is now real and is built in **Godot 4.7.2**, not Unreal. Joshua chose Godot on 2026-09-20 after the Unreal path stalled on a missing C++ compiler and on Blueprint logic that has to be hand-wired in an editor, which the engine's own scripting cannot do (checked in the engine source: `BlueprintEditorLibrary` exposes graphs and variables but no node creation or pin connection). GDScript and scene data are text, so this lane writes, runs, tests and photographs the game with nothing for anyone to click. Unreal is parked, not deleted, and City Sample stays on disk.

The playable piece is `game/godot/DreamSlice`: a dash with invulnerability frames, a light attack chain, a heavy attack, a guard stance, a friendly NPC, a training dummy that telegraphs and fires, and a perfect dodge that writes one world event. It runs in a window and in a browser. The event path (story 2) and the fallback proof (story 3) follow.


## CURRENT OWNER

Claude judge lane on Alienware. Ninth session, 2026-09-22, second batch at about 01:40 EDT.


## LAST VERIFIED STATE

2026-09-22 at about 01:40 EDT, on the Alienware node (`192.168.0.40`), same session as the mouse-hint fix above but a second batch of work under a fresh direction: Joshua set a standing goal to stop waiting for sign-off on game work, to research what a combo-driven action-combat game's skills and hotbar should look like, and to fix that the slice was all training-dummy combat with nobody to talk to. Read `docs/gdd/02-action-combat.md` again with that in mind and found the design already answered the research question (Joshua had ruled the combo grammar and the hotbar-shows-cooldowns rule on 2026-09-20); the actual gap was that almost none of the roughly eighty combos it describes had ever been built.

Built and merged in one batch: a friendly NPC (Mireth) the player can talk to with a plain E, closing the "nobody to interact with" gap; a real heavy attack on right mouse (named in the input table since it was written, never implemented); a real guard stance on Q (same story); plain depth fog everywhere plus a desktop-only bloom and ambient-occlusion pass, answering "the visuals need to be better." Wrote `docs/gdd/10-crowdfunding-readiness.md`, an honest state check against what backers of an indie RPG campaign actually look at (cited inside it), naming the next two pieces of work in priority order.

One real bug found and fixed along the way, by looking at a screenshot rather than trusting the diff: the on-screen help text was at a fixed y position, and it either buried itself under the growing status column or ran off the bottom of a 720-tall canvas depending on how many lines were tried. It now lives inside the same auto-laying-out column as everything else, wraps inside the screen width, and reads one size down from the rest of the readout. 149 of 149 headless checks pass (was 94). Checkout clean and equal to `origin/main` after the merge and push.


## FILES CHANGED

This batch: `game/godot/DreamSlice/scripts/hud.gd`, `player.gd`, `world.gd`, new `npc.gd`, `heavy_attack_state.gd`, `guard_state.gd`, their tests, `docs/gdd/10-crowdfunding-readiness.md`, this file, `ops/node/JOURNAL.md`.

Earlier, still current: `game/godot/*.cmd` (open, export, serve), `docs/gdd/02-action-combat.md`, `docs/gdd/08-day-dreams-night-dreams-world.md`, `docs/gdd/09-interface-style.md`, `docs/handoffs/GEMINI-CHARACTER-DESIGN-2026-09-20.md`, `ops/node/**`.


## SERVICES TOUCHED

None stopped or restarted. A local static server was run on port 8099 to check the browser build and was stopped again; the port is free.


## TEST RESULTS

`godot --headless --path game/godot/DreamSlice --script res://tests/run_tests.gd`: 149 of 149 pass. The runner fails when fewer checks run than expected, because a GDScript error inside a test function aborts that function silently and the run still exited 0, which hid a whole red suite on 2026-09-20; that floor caught several real mistakes this session (a missing script, a mis-typed variable, a check count off by one) before they could hide the same way.


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

This session's first addition: a browser player who has not yet clicked now sees "Click to look around." at the top of the HUD column, because a web export cannot take pointer lock until a user gesture and nothing said so before. Fixing it surfaced a real ordering bug in `world.gd`, since fixed: `player.capture_mode`/`demo_move`/`demo_yaw` were being set one line after `add_child(player)`, too late for `_ready` to see them.

This session's second addition, described above: Mireth, the heavy attack, the guard stance, the atmosphere pass, and the crowdfunding-readiness roadmap. `docs/gdd/10-crowdfunding-readiness.md` names the next two pieces in priority order: more of the combo grammar doing something (a forward gap-close strike is the obvious next one), and giving Mireth an actual reason to exist beyond one line, using the perfect-dodge world event log as the hook.

Security check: no secrets read or written; the repository stays public-safe; the browser build lands in the ignored `build/` folder and is not committed.

Rollback: revert the merge commit named "click hint on the web build; player config-before-add_child bug fixed; 94 of 94" for the first addition, or "NPC to talk to, heavy attack, guard stance, atmosphere pass, crowdfunding-readiness roadmap; 149 of 149" for the second.

Third addition, same session: Mireth now reacts to a perfect dodge (`npc.current_line(perfect_dodges)`) instead of repeating one line forever, closing one of the two items `docs/gdd/10-crowdfunding-readiness.md` named. 153 of 153. Merge commit "Mireth reacts to a perfect dodge; 153 of 153", pushed `f74815e..11584de`.

Next: read `docs/gdd/10-crowdfunding-readiness.md` first. Story 2, the event path into the Live NPC Lab, is still the next piece of spec 001 proper and needs no compiler; the roadmap's one remaining item, a forward gap-close strike distinct from the dash's current catch-all, is what the judge lane is treating as the default game work between now and whenever Joshua redirects it.
