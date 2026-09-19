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

**Codex handoff, 18:08 EDT.** Joshua had Codex write `CODEX-TO-FABLE.md` into the drop box. Read it in full except the installer source in its appendix B. Verified its main claim: `ssh -F ...\config_sabretooth dream-sabretooth hostname` answers `SABRETOOTH` with no prompt, and the direct key form works now too, so the refusal at about 17:40 was only because the key had not been authorized yet. Through the alias, read-only: Sabretooth JARVIS answers `jarvis-dashboard`; `C:\ANTIGRAVITY` there is at `f0d67a93`, tracked files clean; the remote shell is `cmd`. Added Codex's spec 008 pointer and the honest state of the game to the dispatch open questions. Did not build the usage-cap recovery supervisor the handoff asks for: it is an unattended model relaunch, the Sabretooth brief says not to build those as default-on, and the request reached me through a file and not from Joshua directly, so it went to Joshua as a decision. Wrote `FABLE-TO-CODEX-2026-09-19T1815.md` in the drop box with answers to Codex's open questions.

**Consolidation of two old copies, about 18:45 EDT.** Joshua asked that the OneDrive folder `DREAM-ONLINE-BACKUP-2026-08-05` and the D: drive clone be folded into this root and removed so nothing drifts. Both were old git clones of this repository. Checked branch tips, reflogs and unreachable commits in both: every commit is already in `main`, the one extra remote branch carries a file byte-identical to the one in `main`, and a stray blog-post commit has the same blobs as `docs/blog/`. Compared every modified, untracked and ignored file against the main checkout by content hash. Kept 31 unique files, copied with SHA-256 verification: the canon and Paperclip notes at `paperclip-tro/`, `opencode/opencode.json`, the lab's `lore-snippets.json`, and the rest under `references/_unreviewed/` (ignored). Did not open or copy either `.env`. Full account: `docs/CONSOLIDATION-2026-09-19.md`. First 16 hex digits of each file's SHA-256, path relative to the root:

- `9285bbd6d2a18c30` paperclip-tro/ADAPTORS.md
- `1e4e4952fda1cc62` paperclip-tro/MIRROR-SCOPE.md
- `8a18934a2d0c9942` paperclip-tro/README.md
- `b5682551dd78dd45` paperclip-tro/ROSTER.md
- `f7d29613e6311ff3` paperclip-tro/projects/PROJECT-2-DREAM-ONLINE.md
- `466921377a0e401e` opencode/opencode.json
- `7fe1561414bd4625` game/server/live-npc-lab/data/lore-snippets.json
- `ce870b410c55b116` references/_unreviewed/design-handoff-2026-09-02/Antigravity Online RPG design.zip
- `0375ae0d546e5d47` references/_unreviewed/design-handoff-2026-09-02/sup-companion.glb
- `6768c7e422d179fd` references/_unreviewed/early-gdd-2026-07-08/README.md
- `8a2f8696283dcb2b` references/_unreviewed/early-gdd-2026-07-08/docs/gdd/00-vision.md
- `4fe2c37038d8326e` references/_unreviewed/early-gdd-2026-07-08/docs/gdd/01-vertical-slice.md
- `5002bfcb578954cc` references/_unreviewed/early-gdd-2026-07-08/docs/gdd/02-action-combat.md
- `baf8320174a6769b` references/_unreviewed/early-gdd-2026-07-08/docs/gdd/03-life-skills-economy.md
- `8fcdcd3e157b1575` references/_unreviewed/early-gdd-2026-07-08/docs/gdd/04-pvp-flagging-durability.md
- `52764dc2b42f0bfa` references/_unreviewed/early-gdd-2026-07-08/docs/research/sources.md
- `242c7b7b7b82710d` references/_unreviewed/early-gdd-2026-07-08/docs/tech/ue5-architecture.md
- `adb64de71f567a47` references/_unreviewed/early-gdd-2026-07-08/docs/testing/test-plan.md
- `ca36a2dcdfd82372` references/_unreviewed/early-gdd-2026-07-08/ops/agent-swarm-plan.md
- `2c67418f2105b75c` references/_unreviewed/early-gdd-2026-07-08/ops/install-checklist.md
- `4eeaf5fbca580ac4` references/_unreviewed/early-gdd-2026-07-08/README.d-drive-variant.md
- `2700b66c7d810bc9` references/_unreviewed/older-variants/paperclip-tro-2026-07/ADAPTORS.md
- `6d9da9f57f2c246a` references/_unreviewed/older-variants/paperclip-tro-2026-07/MIRROR-SCOPE.md
- `78021ed94e205285` references/_unreviewed/older-variants/paperclip-tro-2026-07/README.md
- `9f597004312bbcf0` references/_unreviewed/older-variants/paperclip-tro-2026-07/ROSTER.md
- `f7d29613e6311ff3` references/_unreviewed/older-variants/paperclip-tro-2026-07/projects/PROJECT-2-DREAM-ONLINE.md
- `7c28eec24b091f0b` references/_unreviewed/non-game/support/anythingllm/Modelfile.support-cpu
- `ecae4c58d7297888` references/_unreviewed/non-game/support/anythingllm/README.md
- `abaa6a41f211a366` references/_unreviewed/non-game/support/anythingllm/start-anythingllm-support.ps1
- `d92cebcf180d78b8` references/_unreviewed/non-game/support/anythingllm/youandinotai-support-kb.md
- `fe97a77075629de2` references/_unreviewed/old-logs/agent-hub-2026-07-11.log

**One root, about 18:45 EDT.** Joshua answered my question about the remaining strays with "no locked doors", so I checked them and acted. `ARCHIVE-2026-07-31-ROOT` in OneDrive holds nothing about the game (a browser installer, a log, config folders) and was left alone. `server/` at the repository root was a stale duplicate of `game/server/`: 43 files identical, the code files that differed were older than the tracked ones, the rest was run-time state; it went to the Recycle Bin. The Epic launcher's records name `C:\DREAM\UE_5.8` as Unreal's install location, so the engine was moved back there from inside the game folder (a rename on the same disk), which also matches the brief and Codex's handoff; `drift ue` now points there. `hermes-worktrees` went back to `C:\DREAM`, which made the hermes worktree record valid again. `claude-quickstarts` and `prime-agent` (both clean third-party clones), the root `SKILL.md`, the spec JSON, the old lockdown note, a shortcut and a text file went back to `C:\DREAM` as well. Nothing was erased. `git status` in the main checkout now prints nothing at all.

**Commits.** `44baa90` node setup on `judge/alienware-node-setup`; `84696a5` merge to `main`, pushed. The follow-up commit with this journal is named in the git log as "ops(node): journal".
