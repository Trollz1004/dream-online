# Alienware node journal

One entry per session, newest first, in the form did, verified, blocked, next, commits. Written by the Claude judge lane for a reader with no memory of the session.

## 2026-09-19 about 19:10 EDT, Claude Fable 5.1, second session, opened after a reboot

**Did.** Ran the session start from the launch skill: no trigger file, health file GREEN, the main checkout clean and equal to `origin/main`. Joshua had just restarted the box and pasted the stack supervisor's console into the session to confirm that everything starts on reboot. Checked his claim against the machine and wrote the result into runbook section 8. Marked runbook open item 5 as done (the workspace rulebook is back at `C:\DREAM\AGENTS.md`). Added open item 6 for a finding below.

**Verified.**
- Reboot test passed. Boot at 19:06:12. The "DREAM Stack" task started one supervisor (pid 10980) at 19:06:24. The supervisor log holds exactly one "started" line per service, between 19:06:43 and 19:06:55. The first health pass at 19:07:04 showed all six DOWN while they warmed up and did not start second copies.
- Direct identity probes at 19:10:12: Live NPC Lab 9127, DreamOps Bridge 9133, Hermes 9119, Ollama 11434, the older JARVIS HUD 9150, Crosslisting 3000, OmniRoute on Sabretooth and JARVIS on Sabretooth all UP. `health.log` has a GREEN line at 23:08:12Z.
- The supervisor's one DOWN line, the Sentry probe of `192.168.0.8:9140`, is the dead probe already recorded. Expected.

**Found.** Two Ollama servers run after a sign-in. The supervisor's copy (pid 26488) listens on `127.0.0.1:11434`. The Startup folder shortcut `Ollama.lnk` starts the tray app, whose own `ollama serve` (pid 8188, started 19:10:23) listens on `::` port 11434, every interface. `OLLAMA_HOST` is unset for the user and the machine. Risk: the same model loaded twice into the 16 GB card depending on whether a caller says `127.0.0.1` or `localhost`, and a copy reachable from the LAN. Nothing was changed. The Startup folder also holds `llama-ui.lnk`, not examined.

**Blocked or left for Joshua.** Whether to remove `Ollama.lnk` from the Startup folder so the supervisor is the one owner of Ollama. Still open from the first session: retiring the old JARVIS HUD and Crosslisting from the stack on this node, the Obsidian plugin swap in his terminal, and the usage-cap recovery supervisor that Codex's handoff asks for.

**Codex handoff.** `CODEX-TO-FABLE.md` in the drop box changed at 19:02, after my 18:15 reply. Read its new sections: the reconciliation after my reply, the usage-cap recovery contract and the delivery status. Codex accepts my corrections, agrees that the recovery supervisor stays unbuilt until Joshua confirms it to me directly, and was waiting on the reboot test. One stale claim in it: that `drift ue` points at a wrong Unreal path. Checked: `UnrealEditor.exe` is at `C:\DREAM\UE_5.8`, `drift.cmd` points there, and both copies still hash to `4e7cb1b482f04dd9`. Wrote `FABLE-TO-CODEX-2026-09-19T1915.md` in the drop box with the reboot result and that correction. The rest of the handoff below the delivery status was not re-read.

**Ruled by Joshua later in the same session.** The top model on this node is the brain only and Sonnet subagents do the work, unless it is something only the brain can do. The default model is not to be changed to a lesser one. A large task that would eat the Max five-hour cap, which he hits often, goes to Hermes. He also opened a Claude session in claude.ai with folder access and assigned it the payments and date-app matter from a chat on his phone; this lane keeps to the game and does not deal with payments or the date app. The rule went into section 1 of the launch skill (both copies, SHA-256 equal, first 16 hex digits `503cabfe9f238c65`) and into the auto-memory.

**Handoff to the claude.ai session, 19:30 EDT.** At his request wrote `ALIENWARE-TO-CLAUDE-AI-2026-09-19T1930.md` in the drop box: the node's verified state, who does what, the decisions waiting on Joshua, which files are protected, and how to reply (`CLAUDE-AI-TO-FABLE-<timestamp>.md`). It is signed; its SHA-256 anchor is `37b60195f723cee96f5b447725ccef58583fd6d4ef94d0300f37f46e2659bdfe` and was re-checked after writing. I have not seen the phone chat and the note says so.

**Next.** Runbook section 9. The game work is item 4: directive section 49 reconnaissance, then spec 001. At the next session start, look in the drop box for a `CLAUDE-AI-TO-FABLE-*.md` file.

**Commits.** Named in the git log as "ops(node): reboot test verified" and "ops(node): delegation ruling and claude.ai handoff".

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
