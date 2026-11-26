---
name: alienware-node
description: "Judge launch skill on the Alienware node (192.168.0.40), the DREAM Online workshop. Loads on drift/session start, establishes active two-node rulings, token/auth policy, trigger inbox and health files, service identity probes, and records to write before stopping."
version: 1.1.0
author: Joshua (joshlcoleman), Claude Fable / Trusted Three
platforms: [windows]
metadata:
  node: alienware
  runbook: ops/node/runbook/ALIENWARE-NODE-RUNBOOK.md
  tracked_copy: ops/node/skills/alienware-node/SKILL.md
---

# Alienware node (`192.168.0.40`): launch skill

Read `docs/house/SPINE.md` (`ADDRESS-DOCTRINE.md`, `NODES.md`, `PIPELINE.md`, `TRUSTED-MODELS.md`, `THE-HOUSE.md`) and this file once, then act. If a fact below disagrees with the disk or `ops/fleet/fleet-map.json`, `ops/fleet/fleet-map.json` and the disk win.

> **Canonical Two-Node & Fleet Map (`docs/house/NODES.md`, `ops/fleet/fleet-map.json`):**
> 1. **Alienware (`192.168.0.40`, workshop, `%USERPROFILE%`)**: hosts `Trollz1004/dream-online` (`%USERPROFILE%\antigravity\DREAM-Engine` & `C:\DREAM\dream-online`), DREAM Engine (`:9180`), Panda Router (`:8765`), Swarm Command (`:8000`), Lead-Gen Studio (`:8392`), OPSis Studio (`:8390`), Free Claude Code (`192.168.0.40:8082/admin`), wheel inbox runner, and the Freebuff lead-gen folder. Zero Unreal Engine, zero external game-engine runtime, and zero Paperclip.
> 2. **T5500 (`192.168.0.15`, front-of-house, `%USERPROFILE%`)**: hosts `Trollz1004/ANTIGRAVITY` (`C:\ANTIGRAVITY`), Mission OS (`192.168.0.15:3130`), Domains Server (`:9160`), Date App (`:3200` web / `:8000` API), Shared `ai-memory` (`192.168.0.15:49374`), OmniRoute (`192.168.0.15:20128`), Live NPC Lab (`:9127`), and Hermes API (`:8643`). Heavy builds go to the Alienware wheel via the inbox, never built on T5500.
> 3. **Third machine boundary**: the third machine is a separate test node under a separate GitHub account and is never named or reached from `Trollz1004` code.
> 4. **Trusted Three & Judges (`docs/house/TRUSTED-MODELS.md`, `docs/house/PIPELINE.md`)**: **Claude (`Opus 5.5` / `Fable`)** via signed-in Claude Code, **Gemini (`Gemini 4 Carbon`)** via signed-in `agy`, and **OpenAI (`GPT-6 Astra`, `GPT-6.1 Sol`, `Codex`)** via signed-in Codex CLI. `Gemini 4 Carbon` and `Codex` judge primary and stacked add-on PRs; `Fable` or the rotating trusted-three merges green GitHub CI checks.

## 0. Who sets the rules

Joshua Coleman is the only human in this loop and he sets the rules. Looking into something is never refused: if a tool is blocked or missing, say so in one line and reach the same answer another legitimate way. Never quote lane bookkeeping back at him as a reason something cannot be done.

- **HARD RULE, above everything else**: Never break the law, never break a provider's or a licence's terms, and never do anything that could cost the founder his accounts.
- **Visual first**: Work that puts something on screen comes first; when something new can be opened, tell him how to open it, then wait until he has looked.
- **Originality rule**: DREAM makes its own styles and takes no copyright risk. Work from plain words: mood, palette, level of detail. Never copy or trace external designs or feed reference pictures into git or generators.
- **100% In-House Engine (`src/engine/`, `192.168.0.40:9180`)**: The DREAM Engine and DREAM Maker Studio live in `src/engine/`. All third-party game-engine runtimes are excluded/retired.
- **90% passing gate & PR law**: Work goes on a short-lived PR branch, opens a pull request (`[YYYY-MM-DD #NNNN] title, by NAME` with `Authored-by: NAME`), and merges only after `Engine headless suite` and `Local smoke and contract checks` pass at >=90%.
- **Zero raw provider API keys**: Trusted CLIs use signed-in auth only. Game NPC routing uses OmniRoute on T5500 (`http://192.168.0.15:20128/v1`) via process-scoped `DREAM_NPC_OMNIROUTE_KEY` only.
- **Business-only public copy**: Customer-facing copy sells product value only. No competitor name drops, no mission/split wording on public surfaces.
- **Drop box**: `%USERPROFILE%\DO_NOT_COMMIT_TO_GITHUB!!!!\OneDrive\claude-to-claude\` (or `%USERPROFILE%\OneDrive\claude-to-claude` where mirrored). Use `-LiteralPath`. Never open `.env` files or the payments folder.
- **Separate private project boundary**: Never open, edit, or attach files or profiles of any separate private project; coordinate only via a handoff note in the drop box.
- **Write for Joshua's eyes**: Plain complete sentences, short lists, outcome first, no dense tables, no ASCII art.

## 1. Session start, in order

1. Read `C:\DREAM\dream-online\ops\node\heartbeat\TRIGGERS.jsonl` if it exists; clear unresolved triggers first, then delete the file.
2. Read `C:\DREAM\dream-online\ops\node\heartbeat\alienware-health.json` (`drift health`).
3. Run `drift ground` (`ops/node/dream-ground-truth.ps1`) and load `dream-ground-truth`.
4. Read `docs/house/SPINE.md`, `docs/DREAM-DISPATCH.md`, and the newest entry in `ops/node/JOURNAL.md`.
5. Read `C:\DREAM\recon\QUEUE.md` for queued cards and owed records.
6. Non-trivial work starts from a spec under `specs/` and the Starter Kit Method Card (`ops/kit/METHOD.md`).

## 2. Services on Alienware (`192.168.0.40`, verified by identity string in `ops/fleet/fleet-map.json`)

The stack supervisor is `C:\DREAM\hermes\scripts\dream-stack.ps1` (scheduled task `"DREAM Stack"`). Never run two supervisors. Every service is checked by its identity string:

- **Swarm Command**: `http://192.168.0.40:8000/api/health` (`swarm-command`, `lan-guarded`)
- **Free Claude Code**: `http://192.168.0.40:8082/admin` (`free-claude-code`, `lan-guarded`)
- **OPSis Cut and Reach Studio**: `http://192.168.0.40:8390/api/session` (`token`)
- **Media and TTS Worker**: `http://192.168.0.40:8391/health` (`ok`)
- **Lead-Gen Studio**: `http://192.168.0.40:8392/api/node/status` (`services`, `lan-guarded`)
- **Panda Router**: `http://192.168.0.40:8765/health` (`ok`, `lan-guarded`)
- **Hermes Dashboard (Alienware)**: `http://192.168.0.40:9119/api/health` (`"ok":true`)
- **Live NPC Lab**: `http://192.168.0.40:9127/health` (`dream-live-npc-lab`)
- **DreamOps Bridge**: `http://192.168.0.40:9133/health` (`dreamops-bridge`)
- **AIRI Dashboard**: `http://192.168.0.40:9150/health` (`airi-dashboard`)
- **Alienware Fleet Status**: `http://192.168.0.40:9165/health` (`alienware-fleet-status`)
- **DREAM Engine**: `http://192.168.0.40:9180/api/gm/health` (`"status":"ok"`, `lan-guarded`)
- **Ollama (Alienware)**: `http://192.168.0.40:11434/api/tags` (`"models":[`, `lan-guarded`)
- **Obsidian Local REST API**: bind `"127.0.0.1"` on port `27123` (`this machine only`, `/mcp` -> `serverInfo`)
- **Obsidian MCP (Alienware)**: `http://192.168.0.40:27200/health` (`obsidian-mcp`, `lan-guarded`)

## 3. Tools & Rules on this node

- **Commands**: `drift`, `drift bare`, `drift house`, `drift health`, `drift ground` (installed at `%USERPROFILE%\.local\bin\drift.cmd`, tracked at `ops/node/drift.cmd`).
- **Starter Kit MCP (`kit`)**: `ops/kit/server.mjs` (`map_search`, `map_section`, `memory_search`, `memory_add`, `role_get`, `method_get`). `superpowers` is in every kit on demand; `REA`, `remake`, `Agent-Reach`, and `last30days` are locked strictly to the trusted three.
- **YouTube & Google scraping stays OFF**: `yt-dlp` and scraping tools stay removed/disabled (`ops/fleet/remove-yt-dlp.ps1`). Use official YouTube Data/Analytics APIs only for Joshua's channel (`private` uploads only).
- **Runtimes**: Node, npm, git, `gh` (logged in as `Trollz1004`), Python `3.13` (`python3` / `python3.13`), Windows PowerShell `5.1` (`.ps1` scripts must target PowerShell 5.1).
- **Obsidian & Shared Memory**: Game vault `C:\DREAM\dream-online\DREAM-ONLINE` (gitignored) + single synced vault + T5500 `ai-memory` (`http://192.168.0.15:49374`).

## 4. Records before you stop

1. Append an entry to `ops/node/JOURNAL.md` (`DID / VERIFIED / BLOCKED / NEXT / COMMITS`).
2. Update `docs/DREAM-DISPATCH.md` (`Last updated:`) when game work moved.
3. Add a line in `ops/node/runbook/PROTECTED-CHANGELOG.md` for any protected-file edit.
4. Commit with an explicit pathspec (never `git add -A`) and end every commit with `Authored-by: NAME`.
- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).

<!-- TROLLZ1004-SPINE:START -->
- `Repo: dream-online | Fleet: Alienware (192.168.0.40, workshop) & T5500 (192.168.0.15, front-of-house) | GitHub: Trollz1004 (ops/fleet/fleet-map.json).`
- `Spine: Trollz1004/dream-online docs/house/SPINE.md (pointers: ADDRESS-DOCTRINE.md, NODES.md, PIPELINE.md, TRUSTED-MODELS.md, THE-HOUSE.md).`
- `Address doctrine: use 192.168.0.40 and 192.168.0.15 from ops/fleet/fleet-map.json; never use loopback reach URLs; Postgres (port 5432), Redis (port 6379), and Obsidian REST (port 27123) bind "127.0.0.1" on their own machine only.`
- `Trusted three: Claude Opus 5.5 / Fable (Claude Code), Gemini 4 Carbon (agy), and GPT-6 Astra / GPT-6.1 Sol / Codex (Codex CLI); superpowers is in every kit on demand, while REA, remake, Agent-Reach, and last30days are locked to the trusted three.`
- `Pipeline: brainstorm first, route role + <=2 skills, build [A]/[B] with failing test first, expediter rubric + 5 stacked add-on PRs, Carbon + Codex judge, Fable / rotating trusted-three merges green checks.`
- `Starter kit MCP ("kit"): cmd.exe /d /c node "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\kit\server.mjs" (tools: map_search, map_section, memory_search, memory_add, role_get, method_get).`
- `First read: the house index, https://github.com/Trollz1004/dream-online/blob/main/docs/house/INDEX.md, then the newest rulings in the claude.ai project Ai-Dream-Team as the index describes.`
- `Funding comes first and game work is paused (ruled 2026-11-13).`
- `The wheel: tickets in the .fable-kitchen inbox on the Alienware; runner ops/router/inbox-runner.ts in dream-online; lane rules in orders/RULES.md in the kitchen.`
- `Merging (ruled 2026-11-16): nothing merges with a failing required check; platform and marketing changes need the checks plus one trusted review; game and engine work keeps two offerings and two judges; whoever merges looks at the files and leaves a one-line verdict.`
- `Public text passes the go gate: the product does what the text says, stop-slop plus a humanizer pass, only what is true, every outside fact links the exact page.`
- `Marketing team log: https://github.com/Trollz1004/ANTIGRAVITY/tree/main/marketing/team (public; nothing private goes in).`
<!-- TROLLZ1004-SPINE:END -->
