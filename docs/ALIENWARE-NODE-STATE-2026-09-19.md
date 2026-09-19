# NODE STATE: Alienware, 2026-09-19

A signed state record, written by the Claude judge lane (Claude Fable 5.1) on the Alienware node at Joshua Coleman's direction. The body ends with a SHA-256 anchor over everything above it and a model attestation. Nobody edits text above the anchor; a later state is a new record that names this one as superseded. Every fact here was checked on the box on this date. Nothing is projected.

## The machine

Hostname ALIENWARE-11THG, LAN address 192.168.0.40, Windows 11 Home build 26200, Intel i7-11700F, 40 GB of memory, AMD Radeon RX 6800 with 16 GB, no CUDA. Sabretooth is 192.168.0.8. Tools present: git 2.55, node 26, npm 12, python 3.10 and the py launcher, uv and uvx (inside the Hermes install), gh 2.101 signed in as Trollz1004, claude 2.1.273, hermes 0.21.3, ollama 0.34.2, VS Code. Not present: pnpm, PowerShell 7. Unreal Engine 5.8.2 is at C:\DREAM\dream-online\UE_5.8, not at C:\DREAM\UE_5.8 and not under Program Files. No DREAM .uproject exists.

## What was built on this date

The `drift` command is installed at %USERPROFILE%\.local\bin\drift.cmd, which is on the user PATH, with a byte-identical tracked copy at ops/node/drift.cmd in Trollz1004/dream-online. SHA-256 of both: 7adac84b3d60ca4194302a74461ad1d0d9e713c6dbf9393f1c71e74df60197ad. With no argument it makes sure the one stack supervisor is running and then runs `claude "/alienware-node"`, which is Joshua's own command on this box (plain `claude`) with only the quoted prompt added. Subcommands: bare, house, health, ue, jarvis, help.

The launch skill `alienware-node` is installed at %USERPROFILE%\.claude\skills\alienware-node\SKILL.md with a byte-identical tracked copy at ops/node/skills/alienware-node/SKILL.md. SHA-256 of both: dbc61c31ccaf42dfdf40a1b66e7a95d32c5269269f358466cddd83aac4bba01b. Claude Code lists it as an available skill.

The runbook is ops/node/runbook/ALIENWARE-NODE-RUNBOOK.md, with PROTECTED-CHANGELOG.md beside it and a journal at ops/node/JOURNAL.md. CODEOWNERS names the protected paths.

The health probe is ops/node/alienware-health.ps1: Windows PowerShell 5.1, no modules, no model calls, identity checks only. It writes alienware-health.json, health.log and TRIGGERS.jsonl under ops/node/heartbeat, which is gitignored. On a failed required service it appends a trigger and runs the stack script with -Once one time. It has no unattended model run and executes no command read from a file; that is a deliberate difference from the Sabretooth probe. The scheduled task DREAM-Alienware-Health runs it every 30 minutes. Windows refused the S4U logon type without elevation, so the task is Interactive and runs only while Joshua is signed in, through conhost --headless.

Spec Kit is installed in the game repository with the Claude integration and PowerShell scripts. The constitution at .specify/memory/constitution.md is version 1.0.0, drawn from the rulings. The node setup is spec 000; spec 001 is reserved for the world bus and the CrossEyed slice.

## Services, with the identity strings that answered

The one bring-up is C:\DREAM\hermes\scripts\dream-stack.ps1, started at logon by the scheduled task "DREAM Stack". Live NPC Lab, port 9127, /health contains dream-live-npc-lab. DreamOps Bridge, port 9133, /health contains dreamops-bridge. Hermes dashboard, port 9119, /api/health contains "ok":true. Ollama, port 11434, /api/tags contains "models":[. JARVIS HUD, port 9150, /health contains airi-dashboard; this is the hermes repository's older copy and has not been replaced yet. Crosslisting OS, port 3000, / contains <div id="root">. Nothing on this node listens on port 20128. From this node, OmniRoute at http://192.168.0.8:20128/v1/models returned a live model list, and Sabretooth JARVIS at http://192.168.0.8:9150/health answered jarvis-dashboard. Sabretooth port 9140 did not answer, which matches the Sentry having been folded into JARVIS on 2026-09-18.

## Evidence

The health probe's Pester tests pass 15 of 15; the test file failed first, before the script existed. The probe returned GREEN when run by hand, through the installed `drift health` from an unrelated folder, and twice from the scheduled task with result 0. `drift help` exits 0 and an unknown subcommand exits 2. At the time of the check no stack supervisor process was running although every service was up, and the "DREAM Stack" task was in the Ready state.

NODE-STATE-2026-09-17.md and PROMPT-FOR-ALIENWARE-CLAUDE-2026-09-18.md both matched their SHA-256 anchors. The node state record was countersigned, and its body hashed the same afterwards.

## Found and handled

The C:\DREAM workspace root had been moved into the game repository folder. The workspace rulebook sat uncommitted over the game repository's AGENTS.md and CLAUDE.md in the main checkout, and the workspace package.json with the `npm run all` script no longer resolved its paths. The three rulebook files were copied to C:\DREAM, confirmed byte-identical, and only then were the tracked files restored; package.json, package-lock.json and node_modules were moved to C:\DREAM. Nothing was deleted. UE_5.8, hermes-worktrees, claude-quickstarts and prime-agent are still inside the repository folder and are gitignored there.

C:\ANTIGRAVITY on this box is a stale clone from before the 2026-09-17 history rewrite, on a feature branch with no upstream, without mission-control, the Sabretooth skill, runbook, health probe or session-note script. It was not touched. Current Sabretooth files were read from the public GitHub raw endpoint.

## Git

Trollz1004/dream-online, branch main, at 6c11fcc22f98e08344182be83a1c8989b26b8f55 on this node and on origin, tracked files clean. Work commits: 44baa90 (node setup), a6809d0 (journal, headless task, dispatch), plus the path-scrub commit, each merged with --no-ff from judge/alienware-node-setup. Affected tests at each merge: 15 of 15.

## Not verified

`drift`, `drift bare`, `drift house` and `drift ue` typed in Joshua's own console. No reboot test. The Unreal editor was not launched.

## Still open

Replace the old JARVIS HUD with an instance run from ANTIGRAVITY's mission-control on its own port, which needs a fresh ANTIGRAVITY clone first. Install the obsidian-second-brain plugin against the game vault, disable claude-obsidian 2.2.0, and register the session-note hook beside the Orca hooks; this needs an interactive terminal. The other repository clones. A quality-gate workflow once the game has tests worth gating. The directive section 49 reconnaissance, then spec 001. Joshua decides which of the MCP servers he pasted belong on this node; none was wired.

---
attestation: written by Claude Fable 5.1 (model id claude-fable-5-1), the Claude judge lane, on 2026-09-19 on the Alienware node, at Joshua Coleman's direction; the hash below covers every line above this attestation line
sha256 of everything above the attestation line: 614f9ce552756248a383f519919b7b6e2ade7348711fa4e4549c1f1ce16b91f3
verify: any Claude on any node recomputes the anchor with `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8').replace(/\r\n/g,'\n');console.log(require('crypto').createHash('sha256').update(s.split('\nattestation:')[0]+'\n').digest('hex'))" ALIENWARE-NODE-STATE-2026-09-19.md` and compares it to the line above; a match proves the body is unaltered. The same split works in python, as in NODE-STATE-2026-09-17.md. Lines below the anchor are countersignatures and never change the body.
