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
- [ ] T011 Fresh `ANTIGRAVITY` clone, then run `mission-control/` here on its own port with the DREAM probe targets and retire the old HUD (own spec).
- [ ] T012 obsidian-second-brain plugin against the game vault, claude-obsidian disabled, session-note hook registered (needs Joshua's terminal).
- [ ] T013 Directive section 49 reconnaissance, then spec 001.
