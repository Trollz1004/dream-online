# Tasks: spec 000, Alienware node setup

Tick a task only with evidence in `ops/node/JOURNAL.md`.

## Done on 2026-09-19

- [x] T001 Read the preferences, the brief and the prompt file; verify both signed records against their SHA-256 anchors; countersign `NODE-STATE-2026-09-17.md`.
- [x] T002 Read-only survey of the box by a Sonnet subagent: repositories, ports and identity strings, the stack script, scheduled tasks, tools, Unreal, Obsidian, how Joshua starts Claude.
- [x] T003 Install Spec Kit with the Claude integration and PowerShell scripts; write the constitution; track the `speckit-*` skills.
- [x] T004 Write the health probe test first (RED), then the probe (GREEN, 15 of 15); run it live in report-only mode.
- [x] T005 Write `drift.cmd`; test `help`, an unknown subcommand and the supervisor detection line.
- [x] T006 Write the launch skill, the runbook, the protected-files changelog, `CODEOWNERS` and the journal.

- [x] T007 Merge to `main`, push, fast-forward the main checkout, install `drift.cmd` and the skill, confirm the hashes match.
- [x] T008 Register the `DREAM-Alienware-Health` task; run it once; record which logon type Windows accepted (Interactive; S4U needs elevation).

## Still to do

- [x] T009 Write the signed `ALIENWARE-NODE-STATE` record and `ALIENWARE-NODE-STATUS.md` into the drop box.
- [ ] T010 Joshua: type `drift house`, then `drift`, in Windows Terminal. Report anything Windows blocks.
- [x] T011 Dropped by ruling: Joshua said on 2026-09-19 that this node is just the game, so no `mission-control/` instance and no ANTIGRAVITY clone here. Replaced by T014.
- [ ] T012 obsidian-second-brain plugin against the game vault, claude-obsidian disabled, session-note hook registered (needs Joshua's terminal).
- [ ] T013 Directive section 49 reconnaissance, then spec 001.
- [ ] T014 Joshua: say yes or no to taking the old JARVIS HUD (9150), the Crosslisting OS (3000) and the dead Sentry probe out of `dream-stack.ps1` on this node.
- [x] T015 SSH from this node to Sabretooth: authorized by Joshua with Codex; verified 2026-09-19 18:10 EDT through the `dream-sabretooth` alias (answer `SABRETOOTH`, JARVIS identity `jarvis-dashboard`).
