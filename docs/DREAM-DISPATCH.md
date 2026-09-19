# DREAM Dispatch

Operational state for asynchronous coordination between Fable and Codex. The master directive defines doctrine; this file defines what is happening now.

## CURRENT OBJECTIVE

Finish the Alienware node setup (spec 000, `specs/000-alienware-node/`), then the directive section 49 reconnaissance, then spec 001: the world bus and the CrossEyed vertical slice (directive section 43).

## CURRENT OWNER

Claude judge lane on Alienware. First session ran on 2026-09-19.

## LAST VERIFIED STATE

2026-09-19, on the Alienware node (`192.168.0.40`): the node's `drift` command, launch skill, runbook and token-free health probe are built, merged and installed. The probe reports GREEN: Live NPC Lab 9127 and DreamOps Bridge 9133 UP by identity string, as are Hermes 9119, Ollama 11434, the older JARVIS HUD 9150 and Crosslisting 3000, plus OmniRoute and JARVIS on Sabretooth. Spec Kit is installed with a constitution. No game code changed.

## FILES CHANGED

`ops/node/**`, `.specify/**`, `.claude/skills/speckit-*`, `specs/000-alienware-node/**`, `.github/CODEOWNERS`, `.gitignore`, `.gitattributes`, `AGENTS.md` (the Unreal line), this file.

## SERVICES TOUCHED

None stopped or restarted. One scheduled task added: `DREAM-Alienware-Health`, every 30 minutes, read-only probes unless a required service is down.

## TEST RESULTS

`ops/node/alienware-health.Tests.ps1`: 15 of 15 pass (Pester 3.4). The game suites were not affected and were not re-run.

## KNOWN FAILURES

None in this work. The stack script's `sentry` probe of `192.168.0.8:9140` now fails by design, because Sabretooth folded its Sentry into JARVIS on 2026-09-18.

## OPEN QUESTIONS

- A second dispatch file exists at the repository root (`DREAM-DISPATCH.md`, from commit `be5b19b`). This file under `docs/` is the one the 2026-09-18 brief names as operational. Codex or Joshua: retire the root copy, or say which one stands.
- Answered: the DREAM stack script is `C:\DREAM\hermes\scripts\dream-stack.ps1`. Its `package.json` wrapper belongs at `C:\DREAM\` and was put back there.

## DO-NOT-TOUCH

`docs/DREAM-MASTER-DIRECTIVE.md` sections 50 and 51 (founder locks, stop conditions); the DREAM-ONLINE vault folder; everything under `ops/node/` unless you are the Claude judge lane (see `ops/node/runbook/PROTECTED-CHANGELOG.md`).

## NEXT HANDOFF

Summary: node operations landed; nothing for Codex to review in game code yet. Architectural decision worth a look: the health probe has no unattended model run and executes no command read from a file, unlike the Sabretooth pattern; the reason is in runbook section 4. Security check: no secrets read or written; the repository stays public-safe. Rollback: `git revert -m 1 84696a5`, delete `%USERPROFILE%\.local\bin\drift.cmd` and `%USERPROFILE%\.claude\skills\alienware-node\`, and run `ops/node/register-health-task.ps1 -Uninstall`. Next: open work is listed in runbook section 9.
