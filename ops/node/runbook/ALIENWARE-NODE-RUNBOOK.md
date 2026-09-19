# ALIENWARE NODE RUNBOOK

Written by Claude Fable 5.1, the Claude judge lane on this node, on 2026-09-19, from the brief Joshua handed over from the Sabretooth lane. This is the only runbook for this box. If a doc, a skill or a dashboard disagrees with it, this wins and that gets fixed. The launch skill for Claude is `~/.claude/skills/alienware-node/SKILL.md`, with its tracked copy at `ops/node/skills/alienware-node/SKILL.md`. Every fact here was checked on the box on 2026-09-19 unless it says otherwise.

## 1. What this node is for

This node builds and runs DREAM Online. Sabretooth designs, dispatches and reviews; the game never runs there.

- Name and address: hostname ALIENWARE-11THG, LAN address `192.168.0.40`. Sabretooth is `192.168.0.8`.
- System: Windows 11 Home, build 26200. Intel i7-11700F, 40 GB of memory, AMD Radeon RX 6800 with 16 GB. There is no CUDA. Local inference uses Vulkan, ROCm or DirectML. Unreal uses DX12.
- Drives: C has about 312 GB free, D about 839 GB free, A about 51 GB free.
- The game repository is `C:\DREAM\dream-online` (`Trollz1004/dream-online`, branch `main`). The Obsidian game vault sits inside it at `C:\DREAM\dream-online\DREAM-ONLINE` (vault id `2289237e7c63ff36`) and is gitignored.
- Hermes is cloned at `C:\DREAM\hermes` (`Trollz1004/hermes`). It holds the stack script, the older JARVIS HUD and the Crosslisting OS.
- Unreal Engine 5.8.2 is at `C:\DREAM\dream-online\UE_5.8`, gitignored. It is not under Program Files and not at `C:\DREAM\UE_5.8`. There is no DREAM `.uproject` yet.

## 2. What runs on restart

One script brings the stack up: `C:\DREAM\hermes\scripts\dream-stack.ps1`. The scheduled task "DREAM Stack" starts it at logon in a console that stays open. It supervises forever, restarts a service that dies (five restarts in ten minutes, then it backs off), and logs to `%LOCALAPPDATA%\dream-stack\logs`. Run with `-Once` it does a single heal pass and prints a table. Its own header says never to run it from inside a Claude Code terminal, and that holds.

Services, each judged by an identity string and never by a port answering:

- Live NPC Lab on port 9127. `/health` contains `dream-live-npc-lab`. Required.
- DreamOps Bridge on port 9133. `/health` contains `dreamops-bridge`. Required. It is the only path from a proposal into the running world.
- Hermes dashboard on port 9119. `/api/health` contains `"ok":true`. Optional.
- Ollama on port 11434. `/api/tags` contains `"models":[`. Optional, for T0 ambient NPCs.
- JARVIS HUD on port 9150. `/health` contains `airi-dashboard`. Optional. This is the older copy from the hermes repository (see section 9).
- Crosslisting OS on port 3000. `/` contains `<div id="root">`. Optional, and not game work.

Two Sabretooth services are probed from here and never healed from here: OmniRoute at `http://192.168.0.8:20128/v1/models` (contains `"data":[`) and JARVIS at `http://192.168.0.8:9150/health` (contains `jarvis-dashboard`). Nothing on this node listens on port 20128, and nothing should.

Report states as UP, DOWN, WRONG SERVICE, AUTH MISSING, AUTH REJECTED or NOT CONFIGURED.

Other scheduled tasks on the box that are not ours: three Hermes gateway tasks at logon, `cua-driver-serve`, OneDrive, AMD and audio driver tasks.

## 3. Commands

- `drift` makes sure the one stack supervisor is running, then opens Claude with the `alienware-node` skill loaded. The last line is `claude "/alienware-node"`: Joshua's own command on this box with only the quoted prompt added, and no permission flags added or removed.
- `drift bare` opens Claude only and touches nothing.
- `drift house` makes sure the supervisor is running, waits ten seconds, and prints the health table. No Claude.
- `drift health` runs the health probe now and prints the table. If a required service is down it runs one bring-up pass.
- `drift ue` opens the Unreal Editor. Until a DREAM `.uproject` exists it opens the project browser.
- `drift jarvis` opens Mission Control on Sabretooth in the browser.
- `drift help` lists these.

The tracked copy is `ops/node/drift.cmd`. The installed copy is `%USERPROFILE%\.local\bin\drift.cmd`, and that folder is on the user PATH. The two are byte-identical; check with `Get-FileHash`. The file is plain ASCII with CRLF line endings.

`drift` counts a supervisor as running when any PowerShell process holds `dream-stack.ps1` without `-Once`, `-Status` or `-Install`. When none is, it starts the "DREAM Stack" task, or the script in a minimized window if the task is missing. It never starts a second supervisor.

## 4. Health loop and triggers

`ops/node/alienware-health.ps1` runs every 30 minutes from the scheduled task `DREAM-Alienware-Health` and spends no tokens. It probes every service in section 2 by identity, checks that the game repository's tracked files are clean and equal to `origin/main` (without fetching, so it stays offline), and writes three files in `ops/node/heartbeat/`, which is gitignored:

- `alienware-health.json`, the last snapshot, with `overall` GREEN, YELLOW or RED.
- `health.log`, one line per run.
- `TRIGGERS.jsonl`, one line for each failure it asked the bring-up to clear.

RED means a required local service is not UP. On RED the probe appends a trigger, runs `dream-stack.ps1 -Once` one time, waits, probes again and records the result. YELLOW means only an optional or remote service is not UP, or git has drifted. The next `drift` opens Claude with the skill, which reads the trigger file first.

One deliberate difference from Sabretooth: there is no unattended model run in this probe and no flag file whose contents get executed. A file that any process on the box can write, and whose first line is then run as a command, is an injection surface. If Joshua wants an unattended heal, that is a new ruling and a new spec.

Register or remove the task with `ops/node/register-health-task.ps1`. It asks for the S4U logon type first, which stores no password and runs before sign-in, and falls back to Interactive when Windows refuses S4U without elevation. Section 8 records which one this box accepted.

Tests: `Invoke-Pester -Path ops/node/alienware-health.Tests.ps1`. The box has Pester 3.4, so the tests use the `Should Be` form.

## 5. Model access and secrets

- Every model call from a harness or the game goes through OmniRoute at `http://192.168.0.8:20128/v1`. That is the only URL. No provider key lives in code, config or a client build.
- Claude is auth login only. There is no Anthropic API key anywhere, and Claude never routes through OmniRoute.
- Secrets live in the OneDrive vault and local env files only. The drop box holds `.env` files and a private payments folder; Claude never opens them.
- The repository is public. Nothing that looks like a key goes into a commit.

## 6. Git

- `C:\DREAM\dream-online` stays on `main`, tracked files clean and equal to origin. The health loop flags drift as YELLOW.
- Only the judge lanes push. Work happens on a `judge/<topic>` branch. Merge with `git merge --no-ff` at a 90 percent or better pass rate of the affected tests, then push. There is no branch ruleset on the repository yet; `.github/workflows/live-npc-lab.yml` is the only workflow. When the game has a test suite worth gating on, copy Sabretooth's `quality-gate.yml` and `auto-land.yml` pattern and protect `main`.
- The repository has no local git identity. Commit with Joshua's GitHub noreply address, `132442315+Trollz1004@users.noreply.github.com`, or GitHub rejects the push.
- Never `git add -A` in the main checkout. It holds untracked strays that are not game source: `UE_5.8/`, `hermes-worktrees/`, `claude-quickstarts/`, `prime-agent/`, an empty `server/`, a root `SKILL.md`, an old lockdown note, a spec JSON, a shortcut and a text file. The heavy and unrelated ones are gitignored; the rest are left for Joshua.
- Orca opens Claude in a worktree under the vault folder on its own branch. The installed `drift`, the health task and the skill all point at the main checkout, so a change is live only after it is merged to `main` and the main checkout is fast-forwarded.

## 7. Protected files

Only Claude, reached through `drift` on this node, edits these: everything under `ops/node/` (both copies of `drift.cmd`, the health probe, both copies of the launch skill, this runbook), the stack script `C:\DREAM\hermes\scripts\dream-stack.ps1`, and every file in the drop box. Not Hermes, not a harness, not a subagent on its own initiative. Every edit gets a line in `ops/node/runbook/PROTECTED-CHANGELOG.md`: date, time, file, what changed, commit. `.github/CODEOWNERS` names the same paths. A change to one of these that Claude did not make is drift to report.

The drop box on this box is `%USERPROFILE%\DO_NOT_COMMIT_TO_GITHUB!!!!\OneDrive\claude-to-claude\`. Briefs from Sabretooth call it `%USERPROFILE%\OneDrive\claude-to-claude`; on this box that path is an almost empty leftover.

## 8. What is validated, and how

Recorded on 2026-09-19:

- The health probe ran live in report-only mode and returned GREEN: all six local services and both Sabretooth services answered with their identity strings. Its 15 Pester tests pass.
- `drift help` and an unknown subcommand behave as written. The supervisor detection line was run on its own and correctly reported that no supervisor was running at that moment, although the services were up.
- `NODE-STATE-2026-09-17.md` and the 2026-09-18 prompt file in the drop box both matched their SHA-256 anchors. The node state record was countersigned.
- The scheduled task `DREAM-Alienware-Health` ran twice on demand with result 0 and a GREEN log line each time. Windows refused the S4U logon type without elevation, so the task is registered as Interactive: it runs every 30 minutes while Joshua is signed in, through `conhost --headless` so no window flashes. To get the before-sign-in behaviour, run `register-health-task.ps1` once from an elevated PowerShell.
- The installed `drift health`, run from an unrelated folder, printed the same GREEN table.
- Both copies of `drift.cmd` and both copies of the skill have equal SHA-256 hashes.

Not validated, and why:

- `drift`, `drift bare`, `drift house` and `drift ue` have not been typed in Joshua's own console. Windows 11 can stop an unknown `.cmd` on first run, and the stack script must not be started from a Claude terminal. Joshua's first `drift house` in Windows Terminal is the test.
- A reboot test has not been done. After one, `drift health` and `health.log` are the evidence.

## 9. Open work, in order

1. Joshua ruled on 2026-09-19 that this node is just the game. That drops the older brief's plan to run a `mission-control/` instance here, and with it the need for an ANTIGRAVITY clone on this box; `C:\ANTIGRAVITY` is a stale pre-rewrite clone and stays untouched. None of the Sabretooth MCP servers get wired here. What remains is a question for Joshua: the old JARVIS HUD on port 9150 and the Crosslisting OS on port 3000 are not game services, yet the stack script still starts and restarts them. Taking them out of `dream-stack.ps1` on this node stops running services, so it waits for his yes. The dead `sentry` probe of `192.168.0.8:9140` in the same script can go at the same time.
2. Install the obsidian-second-brain plugin against the game vault, disable the older claude-obsidian plugin (version 2.2.0 is still enabled), and register the token-free session-note hook beside the Orca hooks already in `~/.claude/settings.json`. The plugin commands prompt, so this needs Joshua's terminal.
3. Tell the Sabretooth lane the health routes and identity strings in section 2 so God's Eye can identify Hermes, the NPC lab and the bridge. The drop-box status note carries them.
4. Directive section 49 reconnaissance, then spec 001: the world bus and the CrossEyed slice.
5. The workspace rulebook that belongs at `C:\DREAM\AGENTS.md` is missing there; an uncommitted copy of it sits over the game repository's `AGENTS.md` in the main checkout. The journal records how that was handled.

## 10. Remote access

Sabretooth's judge lane has key-only SSH into this box as Joshua's Windows user at `192.168.0.40`, with PowerShell as the remote shell. It reads; it does not do this node's protected work. Mission Control lives on Sabretooth only. On the LAN it is `http://192.168.0.8:9150/` (`drift jarvis` opens it). From anywhere it is `https://dashboard.aidoesitall.website/`, proxied from Sabretooth's port and gated by Cloudflare Access with a one-time code mailed to Joshua; checked on 2026-09-19, the hostname redirects to the Access sign-in page as it should. Joshua has said Claude may sign in there when the work needs it.

In the other direction, SSH from this node to Sabretooth works as of 2026-09-19 18:10 EDT. Joshua set it up with Codex: the key `%USERPROFILE%\.ssh\id_ed25519_sabretooth`, a dedicated config `config_sabretooth` with the alias `dream-sabretooth`, and Sabretooth's host key pinned in `known_hosts_sabretooth`. The command is `ssh -F "$env:USERPROFILE\.ssh\config_sabretooth" dream-sabretooth <command>`. Sabretooth's remote shell is `cmd`. An earlier attempt the same afternoon was refused only because the key had not been authorized yet. Verified through it, read-only: JARVIS answers `jarvis-dashboard`, and `C:\ANTIGRAVITY` was at `f0d67a93` with tracked files clean.

Sabretooth also offers a read-only MCP endpoint at `http://192.168.0.8:9150/mcp` behind a bearer token that Joshua holds; it is not connected here yet.
