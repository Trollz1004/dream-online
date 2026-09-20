# DREAM Dispatch

Operational state for asynchronous coordination between Fable and Codex. The master directive defines doctrine; this file defines what is happening now.

## CURRENT OBJECTIVE

Spec 001, the world bus and the CrossEyed vertical slice (directive section 43), landed as a judged draft in `specs/001-world-bus-cross-eyed-slice/`. Story 1 is the visible test zone in Unreal 5.8.2, because the founder needs to see the game before he can decide anything. It waits on his go-ahead, in his own words in the game lane, to create the DREAM project file. The event path (story 2) and the fallback proof (story 3) follow.

## CURRENT OWNER

Claude judge lane on Alienware. Third session, 2026-09-19 at about 23:10 EDT.

## LAST VERIFIED STATE

2026-09-19 at about 23:25 EDT, on the Alienware node (`192.168.0.40`): health GREEN at 03:00Z, all six local services and both Sabretooth services UP by identity string. Hermes finished the section 49 reconnaissance and the three spec 001 cards; the judge accepted the inventory as written (about 85 claims checked against the code, none wrong) and accepted the spec and the event contract with changes that are written at the top of each file. Facts from the check: the Live NPC Lab serves JSON only, so nothing a person can look at exists today; the lab already appends world events to a JSONL log; no code path connects DreamOps Bridge to the lab. No game code changed.

## FILES CHANGED

`specs/001-world-bus-cross-eyed-slice/**` (new), `ops/node/register-drift-logon.ps1` and its tests (new), `ops/node/runbook/**`, `ops/node/skills/**`, `ops/node/JOURNAL.md`, this file.

## SERVICES TOUCHED

None stopped or restarted. One scheduled task added: `DREAM-Drift-Logon`, which opens `drift` 90 seconds after sign-in. `DREAM-Alienware-Health` is unchanged.

## TEST RESULTS

`ops/node/register-drift-logon.Tests.ps1`: 8 of 8 pass. `ops/node/alienware-health.Tests.ps1`: 15 of 15 pass. The game suites were not affected and were not re-run.

## KNOWN FAILURES

None in this work. The stack script's `sentry` probe of `192.168.0.8:9140` now fails by design, because Sabretooth folded its Sentry into JARVIS on 2026-09-18.

## OPEN QUESTIONS

- A second dispatch file exists at the repository root (`DREAM-DISPATCH.md`, from commit `be5b19b`). This file under `docs/` is the one the 2026-09-18 brief names as operational. Codex or Joshua: retire the root copy, or say which one stands.
- From Codex, 2026-09-19 (handoff `CODEX-TO-FABLE.md` in the drop box): Codex owns the crowdfunding automation in `Trollz1004/ANTIGRAVITY` on Sabretooth and plans `specs/008-crowdfund-game-loops/` there, a specification only, for three game loops: named-NPC gossip, Founder fables and referral memory. Proposed event names, not yet existing anywhere: `npc.name_assigned`, `gossip.message_seeded`, `gossip.message_observed`, `world.fable_recorded`, `world.fable_reference_resolved`, `referral.memory_seeded`, `npc.referral_greeting_delivered`. The spec had not landed when this was written. When it lands, the Alienware Claude lane reviews the event names against the world bus of spec 001, the mapping from backer tiers to naming and fable benefits, and what delivery timing the game can really guarantee. No game code for these loops until then, and only one builder changes game code at a time. Standing fact for any campaign copy: as of 2026-09-19 the game is two local Node prototypes (Live NPC Lab, DreamOps Bridge); there is no Unreal project file and no playable client, so copy must not say these features are live.
- Answered: the DREAM stack script is `C:\DREAM\hermes\scripts\dream-stack.ps1`. Its `package.json` wrapper belongs at `C:\DREAM\` and was put back there.

## DO-NOT-TOUCH

`docs/DREAM-MASTER-DIRECTIVE.md` sections 50 and 51 (founder locks, stop conditions); the DREAM-ONLINE vault folder; everything under `ops/node/` unless you are the Claude judge lane (see `ops/node/runbook/PROTECTED-CHANGELOG.md`).

## NEXT HANDOFF

Summary: spec 001 is landed as a judged draft; nothing for Codex to review in game code yet. Architectural decisions worth a look, all in the rulings at the top of `spec.md` and `contracts/world-event-envelope.md`: the carrier is append-only JSONL with the Live NPC Lab as the one writer; the age mode wire value is `NIGHTMARE_13_PLUS`; none of the seven event names Codex proposed is adopted into this slice, though all seven fit the naming rule. Security check: no secrets read or written; the repository stays public-safe. Rollback: revert the merge commit named "drift at sign-in, status line, spec 001 landed" and run `ops/node/register-drift-logon.ps1 -Uninstall`. Next: the founder's go-ahead for the Unreal project, then Spec Kit plan and tasks for story 1.
