# Alienware node journal

One entry per session, newest first, in the form did, verified, blocked, next, commits. Written by the Claude judge lane for a reader with no memory of the session.

## 2026-09-19, Claude Fable 5.1, session opened by Joshua in the Orca desktop app

**Did.** Joshua handed over the node setup brief from the Sabretooth lane as a OneDrive link. Read his preferences file, the brief and the 2026-09-18 prompt file. Verified both signed records against their SHA-256 anchors and countersigned `NODE-STATE-2026-09-17.md`. Ran a read-only Sonnet survey of the box. Installed Spec Kit in the game repository and wrote the constitution. Built, from spec 000: the `drift` command, the token-free health probe with tests, its scheduled task, the `alienware-node` launch skill, the runbook, the protected-files changelog and `CODEOWNERS`. Merged to `main`, pushed, fast-forwarded the main checkout, and installed `drift.cmd` and the skill.

Found that the `C:\DREAM` workspace root had been moved into the game repository folder. The workspace rulebook was sitting, uncommitted, over the game repository's `AGENTS.md` and `CLAUDE.md`, and the workspace `package.json` (the `npm run all` one) no longer resolved its paths. Copied the three rulebook files to `C:\DREAM\`, confirmed the copies were byte-identical, moved `package.json`, `package-lock.json` and `node_modules` to `C:\DREAM\`, and only then restored the tracked files in the main checkout. Nothing was deleted. Corrected the stale tool and Unreal facts in `C:\DREAM\AGENTS.md`.

**Verified.**
- Health probe tests: 15 of 15 pass (Pester 3.4). The test file failed first, before the script existed.
- The probe run live, by hand, through the installed `drift health` from an unrelated folder, and twice from the scheduled task: GREEN each time, all six local services and both Sabretooth services UP by identity string, task result 0.
- `drift help` exits 0; an unknown subcommand prints the list and exits 2. The supervisor detection line reported, correctly, that no stack supervisor was running while the services were up. The "DREAM Stack" task was in the Ready state, not Running.
- Both copies of `drift.cmd` and both copies of the skill have equal SHA-256 hashes. `drift` resolves on the PATH to `%USERPROFILE%\.local\bin\drift.cmd`. Claude Code lists `alienware-node` as an available skill.
- Windows refused the S4U logon type without elevation ("Access is denied"). The task is registered as Interactive, so it runs only while Joshua is signed in. It uses `conhost --headless` so no window flashes. Re-running `register-health-task.ps1` from an elevated PowerShell would move it to S4U.
- Joshua starts Claude on this box with plain `claude`; that is the only distinct `claude` line in his shell history besides one typo. So the last line of `drift` is `claude "/alienware-node"`.
- OmniRoute at `http://192.168.0.8:20128/v1/models` returned a live model list. Nothing on this node listens on 20128. Joshua confirmed in the session that OmniRoute is on `.8` and not on this node.
- Sabretooth's port 9140 did not answer; its Sentry was folded into JARVIS on 2026-09-18, so the stack script's `sentry` probe of `192.168.0.8:9140` is now expected to fail. Sabretooth JARVIS `/health` answers `jarvis-dashboard`.

**Not verified.** `drift`, `drift bare`, `drift house` and `drift ue` typed in Joshua's own console. The stack script must not be started from a Claude terminal, and Windows 11 may challenge a new `.cmd` on first run. No reboot test.

**Blocked or left for Joshua.**
- The Obsidian plugin swap and the session-note hook need an interactive terminal.
- The MCP block Joshua pasted (brain-mcp, mission-mcp, playwright, supabase, dateapp-desk) was not wired. The stale `C:\ANTIGRAVITY` clone has no built `brain-mcp` or `mission-mcp`; `dateapp-desk` is date-app tooling, which the rulings keep off this node; the supabase project reference is unidentified. Asked him which he wants here.
- Moving `UE_5.8/` and the other strays back out of the repository folder is his call.
- His global `CLAUDE.md` says Hermes implements and chat replies are terse; his preferences file says Sonnet subagents do the mechanical work and he wants complete sentences. Reported to him; followed the preferences file.

**Next.** Runbook section 9, in order: fresh ANTIGRAVITY clone and the `mission-control/` instance to replace the old HUD; the Obsidian plugin swap; send the identity strings to the Sabretooth lane (the drop-box status note carries them); then the directive section 49 reconnaissance and spec 001. Also worth a small task: drop the dead `sentry` 9140 probe from `dream-stack.ps1`.

**Ruled by Joshua later in the same session.** This node is just the game. No dashboard instance here, and none of the MCP servers he pasted get wired here. Mission Control is on Sabretooth only: `http://192.168.0.8:9150/` on the LAN and `https://dashboard.aidoesitall.website/` from anywhere, behind Cloudflare Access with a one-time code mailed to him; he said Claude may sign in when the work needs it. Verified from here that the hostname redirects to the Access sign-in page. That drops the brief's plan for a local `mission-control/` instance and the ANTIGRAVITY clone. He also said SSH to Sabretooth should work: port 22 is open and this node has a key for it, but Sabretooth refused the key, so the public half went into the drop-box session note for the Sabretooth lane to authorize. At his request I read the newest drop-box files (the README protocol, the SSH setup script, the Codex setup prompt) and wrote the session note `2026-09-19T1743-alienware-claude-code.md`. It tells Codex what is already done here, and tells the Sabretooth lane that the README's ground-truth section is stale.

**Commits.** `44baa90` node setup on `judge/alienware-node-setup`; `84696a5` merge to `main`, pushed. The follow-up commit with this journal is named in the git log as "ops(node): journal".
