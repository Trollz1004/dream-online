# Spec 000: Alienware node setup

Status: in progress. Owner: Claude judge lane on Alienware. Source: `ALIENWARE-NODE-SETUP-FOR-CLAUDE.md` and `PROMPT-FOR-ALIENWARE-CLAUDE-2026-09-18.md` in the drop box, both handed over by Joshua on 2026-09-19. Spec 001 is reserved for the world bus and the CrossEyed slice.

## Outcome

Joshua types `drift` on this box. The DREAM stack is up, and real Claude opens with the `alienware-node` skill loaded, already knowing the rulings, the services, the tools and what to check first. A token-free probe watches the node every 30 minutes and leaves a trigger Claude reads first.

## Requirements

1. One command, `drift`, on the PATH, with a byte-identical tracked copy. Subcommands: none, `bare`, `house`, `health`, `ue`, `jarvis`. Its last line is Joshua's own `claude` line on this box with only `"/alienware-node"` appended. It reuses the existing stack script and never starts a second supervisor.
2. One launch skill, `alienware-node`, installed for the user with a tracked copy. It holds only verified facts.
3. One runbook and a protected-files changelog beside it.
4. One deterministic health probe in Windows PowerShell 5.1: identity checks, a JSON snapshot, a log line, a trigger line on failure, one bring-up pass, no model calls. A 30-minute scheduled task runs it, with no stored password where Windows allows it.
5. Spec Kit installed with a constitution drawn from Joshua's rulings.
6. Records: a journal entry, auto-memory, a signed `ALIENWARE-NODE-STATE` record and a status note in the drop box.

## Out of scope for this spec

Replacing the JARVIS HUD with ANTIGRAVITY's `mission-control/`, the Obsidian plugin swap and session-note hook, cloning the other repositories, the quality-gate workflow, and the directive section 49 reconnaissance. Each is listed as open work in the runbook and gets its own spec or task list.

## Acceptance

- `Invoke-Pester -Path ops/node/alienware-health.Tests.ps1` passes at 90 percent or better.
- `drift health` prints a table whose states match a manual identity probe.
- `Get-FileHash` agrees for both copies of `drift.cmd` and both copies of the skill.
- Joshua's first `drift house` and `drift` in his own console work. That step is his, and it is recorded in the journal when done.
