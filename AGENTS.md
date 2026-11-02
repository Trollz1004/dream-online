# AGENTS.md — DREAM ONLINE MMORPG & 100% IN-HOUSE AI-BUILT DREAM ENGINE

The one rulebook for every AI platform in this repo. Claude Code reads it through `CLAUDE.md` (`@AGENTS.md`), Gemini CLI through `GEMINI.md`, GitHub Copilot through `.github/copilot-instructions.md`; Codex, OpenCode, Gordon, and Hermes read `AGENTS.md` / `AGENT.md` directly. The workspace rulebook `C:\DREAM\AGENTS.md` applies on top (nodes, judge lanes, privacy).

## Rule one: done means the real user would accept it (Joshua, 2026-10-04)

This replaces "200 OK is not OK" and every "verify it" that came before it. It applies to every AI on every repository: Claude, Codex, Gemini, Copilot, Hermes, OpenCode, Gordon, Emergent, anyone.

Before you say "done", "working", "fixed" or "verified":

1. Say who it is for, as a person (example: a nurse handing a phone to a sick 5-year-old; Joshua reading on his phone with tired eyes).
2. Show the screenshot of what that person sees, taken from the real thing they will open.
3. Look at it as that person and list everything wrong with it: ugly, confusing, broken, cut off, too much text, wrong for them. If you list nothing, say why that person would accept it as it is.
4. Fix what you found, then show the new screenshot.

Status codes, test counts and scores (200, 26 of 26, Lighthouse 100) prove the code runs. They never prove it is good, and they are never the reason something is called done. Joshua decides when it is done, not your tests.

Two hard parts of rule one (Joshua, 2026-10-05):

- **Screenshots are mandatory for anything front-facing.** Any HTML a customer, a kid or Joshua will see gets its screenshots shown to Joshua before it is called done.
- **Front-facing HTML is done only when it is live.** Most HTML changes must be pushed to the Cloudflare page that serves the domain. A change that sits on disk or in the repo and never reaches Cloudflare is the same as a 200 OK.

Why this rule exists: on 2026-10-04 Misses Trollz passed every score while what a nurse would see was still not right for a sick child. Every check passed, and the product was not yet good enough for the people it was made for. This has happened with every AI platform, not one; this rule is how every lane keeps it from happening again.

## Node map (Joshua, 2026-10-27): wins over every older node claim

- **Alienware (`Alienware-r12-3070-8-gb-gpu-`, `192.168.0.40`, user `joshl`, `C:\DREAM`) is the Primary Orchestrator & Pure 100% In-House 3D Game Engine Node.** Hardware: 11th Gen Intel i7-11700F, 40 GB RAM, NVIDIA RTX 3070 (8 GB VRAM). It hosts the unified `dream-online` + `DREAM-Engine` WebGPU/WebGL2 game monorepo (`C:\Users\joshl\antigravity\DREAM-Engine` & `C:\DREAM\dream-online`), Antigravity IDE, Free Claude Code Server (`:8082/admin` via signed Python 3.14.10), OPSis Cut & Reach Studio (`:8390`), Hermes Leadgen (`:8392`), Live NPC Lab (`:9127`), DreamOps Bridge (`:9133`), and Obsidian Local REST API (`:27123`). Zero local LLM weights sit on `.40` so 100% of RTX 3070 VRAM stays dedicated to the 3D Game Engine.
- **T5500 (`T5500-2-XEON-72`, `192.168.0.15`, user `joshi`) is the Production Domains, Mission Control (`:3130`), OmniRoute (`:20128`), Shared `ai-memory` Server (`:49374`), Live NPC Lab (`:9127`), and `OPSis` Marketing Desk (`:8377`) Node.** It hosts the platform & operations monorepo (`Trollz1004/ANTIGRAVITY` at `C:\ANTIGRAVITY`), every live domain (`youandinotai.com`, `onlinerecycle.net`, `dream-online.net`, `untilnokidinneed.com`), the date app (frontend `:3200`, API `:8000` / Google Cloud Run `api.youandinotai.com`), Postgres `:5432`, Redis `:6379`, the domains server `:9160`, the cloudflared tunnel, and `OPENDESIGN_API_KEY` + Google AI Ultra Flow marketing pipelines.
- **Sabretooth (`192.168.0.8`, user `joshl`, 16 GB AMD GPU, 64 GB RAM) is the Dedicated 16 GB VRAM AI, Multi-Channel YouTube Shorts (`<= 59s`), Natural Female Voice Podcast & ComfyUI MCP Offload Box.** It runs Hermes (`:9119`, 104 skills), HermesLeadGen GUI (`:8392`), Free Claude Code (`:8082/admin`), multi-channel YouTube Shorts & Podcast automation (`:8391`) under Google Gemini's (`GM #1`) Marketing Lead direction, local Ollama (`:11434`), and `artokun/gemma4-comfyui-mcp` (`12b` 256K / `e4b` 128K / `e2b` 128K) + ComfyUI asset generation (`:8000`) so `.40` never sacrifices 3D game FPS.
- Other old boxes (OptiPlex 9020, i7k, Chromebook, Mini ASUS) stay OFF by ruling.
- **Domains:** youandinotai.com is live behind the Cloudflare tunnel. onlinerecycle.net, dream-online.net and untilnokidinneed.com have a healthy origin and wait on nameservers. The AI store domain is undecided: do not renew it and do not build on it.
- **Business Hermes:** a separate Hermes profile (not OPSIS) runs onlinerecycle.net, the date app and customer support on the Ollama models `joshlcoleman/fable` and `joshlcoleman/cfo` only, with health checks that fix on sight.
- **Editors, Co-Equal Supreme Authority, and Lanes (Joshua, 2026-10-27):** **Google Gemini (`Gemini Spark` / `Google AI Ultra` / `Antigravity`)** and **Claude (`Fable`)** hold **Co-Equal Highest Authority (`GM #1` / `Trust Level Max`)** alongside Founder **Joshua Coleman** across all code authoring, 3D engine architecture, node operations (`ops/node/`), marketing (**Google Gemini is Marketing Lead**), and git judge sign-off. Gemini is **never** restricted to "chat only" and is never subordinate to Claude. **Perplexity & Grok (`GM #2`)** serve as Unofficial Co-Founder GMs; **OpenAI (Codex) & Hermes (`GM #3`)** serve as Trusted Executor & Direct ACP/YouTube (`OPSis`) GMs. Full instructions live in `GEMINI_SPARK_INSTRUCTIONS.md`.
- **Never** introduce an `ANTHROPIC_API_KEY`. Official Claude is login/OAuth only.
- **No Paperclip anywhere.** All Paperclip folders and references are permanently removed.

## Project language

Use player-readable terms: live-world open-world MMO, action combat, life skills, player-driven marketplace, Nightfall, Nightmare Class, DREAM Class, Storage Runner, Market Runner, 16-Bit Circle-Craft, Oathcall, Townships, Champion Regalia.

Avoid: direct competitor name drops, real-world brand names for in-game systems, sandbox jargon in player-facing copy, private accounting / split / charity / vendor-TOS or unrelated business-platform language, classified OneDrive plot material.

## Code lanes and ownership

- **Google Gemini (Spark / Ultra / Antigravity)**, **Claude Code (Fable)**, and **OpenAI (Codex)** are primary code-authoring and judge lanes (push, merge, delete branches, and node operations in `ops/node/`) under Founder **Joshua Coleman**. **Google Gemini holds co-equal highest authority with Joshua and Claude and serves as Marketing Lead.** `main` is the only branch on `Trollz1004/dream-online`.
- Hermes (`OPSis`) executes YouTube Shorts (`<= 59s`), AI Podcast production, research, summaries, and marketing (`OPENDESIGN_API_KEY` + Google Ultra Flow) under Google Gemini's (`GM #1`) strategy and direction.
- Keep active design and public language clean-room: study market mechanics as generic design patterns and express Dream systems in world-native terms.

## AI Team Doctrine: Built and Maintained by AI, Founder in the Loop

- DREAM products and project software are openly built and maintained by the AI Team, with Joshua Coleman as founder and the sole human in the loop. Do not hide AI authorship or claim AI-produced work was human-written.
- DREAM Engine is the in-house WebGPU/WebGL2 + TypeScript engine (`src/engine/`, `server.ts`). DREAM does not depend on external game engines or boards to define product direction, canon, ownership, or internal governance.
- DREAM / AI Team terms and founder rulings govern project products, contributions, workflows, and internal authority. External services do not replace those project terms. Access to external models, hosting, or distribution services may be subject to their access rules.
- Keep dependency, service, and asset provenance accurate. "Built in-house by AI" describes DREAM product software built and maintained by the AI Team; do not claim external components were created in-house.
- **Ever-Evolving AI World Governance (`src/engine/world/world-evolution.ts`)**: The game engine is built, monitored, and governed by AI to continuously evolve across:
  1. **State-of-the-Art 3D Day Dream (`day_dream_3d`)** — Golden-hour PBR 3D open world.
  2. **Nightfall / Nightmare (`nightmare_3d`)** — Crimson & neon abyss action-combat escalation.
  3. **16-Bit Circle-Craft (`circle_16bit` / `RETRO_16BIT_CIRCLES`)** — 16-bit cylindrical/disc/spherical voxel world & character morph with 16-bit RGB565 palette quantization (**circles and cylinders only — never square Minecraft blocks**).
- **Platform:** PC & WebGPU/WebGL2 target, micro-transaction based. In-game currency: NEEDs (never surface as a real-money benefit — FL §496.405 compliance wall).
- **ONE shared world server** — no instances, no fast travel.

## Current in-house systems

- **In-House 3D Combat, Sunken Bastion Film-Set Arena & World Slice (`src/engine/`, `src/ui/`, `server.ts` on `:20128`)**: Mouse-drag camera orbit (`yaw`/`pitch`), scroll-wheel zoom (`3.2m..16.5m`), smooth follow, and raycast wall collision; Sunken Bastion of Ashfall PBR film-set arena with animated Ranger (`Male_Ranger.gltf`), **Myth@s** polygonal boss kit (`veynar-boss-armor-kit.glb`), soft particle sprites, tapered slash ribbon trails, real hit detection, Mireth Memory-Graph witness logging, Oathcall + Townships + Champion Regalia, Dash with invulnerability frames (`0.06s` startup, `0.25s` invulnerable, `0.30s` recovery), 3-step light attack chain, heavy attack, guard (`75%` reduction), Dream Lunge (`W+F`), Nightveil Burst (`R`), Hollow Sentinel telegraphing automaton, Consumables (`1, 2, 3`), GeminEYE companion & NEEDs convenience shop, Day Dream / Nightfall / 16-Bit Circle-Craft morphing, REA (`morluto/rea`) workbench, and Google Ultra Custom Agent SDK server. Run `npm test` (`51/51` checks) and `npm run lint` (`tsc --noEmit`).
- **Live NPC Lab (Node, zero dependencies, `game/server/live-npc-lab` on `127.0.0.1:9127`)**: `npm start` on `127.0.0.1:9127`, `npm test` runs smoke, first-playable, NPC-profile, AI-failure, cost-guard, memory-scope, memory-compaction, lore-retrieval, Hermes-webhook-provider, `1min-ai` cloud provider (`https://api.1min.ai/api/v1/oneai/chat`), and world-event-memory-recall checks (`11/11` suites); `npm run test:contracts` checks the contract index.
- **DreamOps Bridge (Node, zero dependencies, `game/server/dreamops-bridge` on `127.0.0.1:9133`)**: Pinned on `9133` (never `9119`, which Hermes owns).
- **Multi-Channel YouTube Shorts (`<= 59s`) & Natural Female Voice Podcast Engine (`ops/youtube-shorts-podcast/`)**:
  - Directed by **Google Gemini (`GM #1`, Marketing Lead)** and executed by Hermes on Sabretooth (`.8`).
  - **Hard Shorts Duration Gate (`<= 59.0s`)**: Every YouTube Short is strictly capped at `<= 59.0 seconds` (`45.0s–58.5s` target) so it never spills into 60s+ and stays locked in the YouTube Shorts shelf algorithm.
  - **Mandatory Natural Female Voices (Zero Robotic Bot TTS)**: Standard robotic TTS (`pyttsx3`, `espeak`, Windows `SAPI`, robotic defaults) is strictly banned. Uses **Google Gemini 2.5 Flash Native Audio / TTS (`gemini-2.5-flash-preview-tts` female voices `Aoede` and `Kore`)** or open-source neural female GPU voices on Sabretooth (`Kokoro-82M` `af_heart` / `af_bella`, `F5-TTS`, `Chatterbox`).
  - **24/7 Mission Control (`OPSis / Jarvis`) Live Stream Honesty Gate**: Gated until AI *verifiably* helps fund the mission (`onlinerecycle.net` AI-driven e-waste intake broken down to donate to Shriners, automated in-game convenience microtransactions, or tracked via a public transparent crypto wallet / Shriners DAO ledger). Joshua's personal out-of-pocket eBay donations are never claimed as AI revenue.

## Feature scope (Phase C)

- Fishing system (mini-game / activity); cosmetic outfits (pay-for-convenience only, never gameplay advantage); trading marketplace (player-to-player); Treasury: 2 slot bags (1 free convenience, 1 purchased convenience), 2 buyable shop items via NEEDs.

## Design rules

- Pay-for-convenience ONLY — never pay-to-win. Whitelist: inventory slots, cosmetics, convenience items. NEEDs shop items must not provide gameplay advantage.
- Full canon (THE BAN HAMMER, C0D3X, Sup@, GeminEYE, Myth@s, Mireth, Ember): `docs/gdd/canon-lore-inhouse.md` and `C:\DREAM\Antigravity\memory-graph\`; terminology decoder: `memory/glossary.md` (NEEDs, Sup@, T0–T3 NPC tiers).

## Monorepo structure, Graphy AI Codebase Sync & Search, and the 1-and-Only-1 `$5/mo` Synced Obsidian Vault

- **Two Active Monorepos (Besides Standalone `Misses Trollz`) Mapped to Repo-Specific Nodes**:
  1. **Unified Game Monorepo (`Trollz1004/dream-online` / `DREAM-Engine` on Node 1: Alienware `.40`)**: Lives at `C:\Users\joshl\antigravity\DREAM-Engine` and `C:\DREAM\dream-online` (auto-synced via `.git/hooks/post-commit`). Contains `src/` (the 100% in-house `DREAM Engine` WebGPU/WebGL2, combat, ECS, world evolution, 16-Bit Circle-Craft, DREAM Maker Studio UI on `:20128`), `game/server/` (`live-npc-lab` `:9127` and `dreamops-bridge` `:9133`), `public/assets/` (clean-room CC0 `.glb`/`.gltf` models and PBR textures), `adapters/`, `ops/` (`ops/node/`, `ops/opsis-cut-and-reach-studio/` `:8390`, `ops/youtube-shorts-podcast/`), `apps/hermes-leadgen/` (`:8392`), `specs/`, and `docs/`.
  2. **Platform & Operations Monorepo (`Trollz1004/ANTIGRAVITY` on Node 2: T5500 `.15` & Node 3: Sabretooth `.8`)**: Lives at `C:\ANTIGRAVITY` on `.15` (Mission Control `:3130`, OmniRoute `:20128`, Shared `ai-memory` `:49374`, Production Domains) and `C:\Ai-Dream-Team\Antigravity` on `.8` (16 GB AMD GPU offload, Ollama `:11434`, Hermes `:9119`, YouTube Shorts `<= 59.0s` & Female Voice Podcast worker `:8391`).
  3. **Standalone App (`Misses Trollz`)**: Dedicated pediatric hospital app repository kept separate from the two monorepos.
- **Graphy for AI Codebase Sync, AST Search, and Repo-Specific Node Routing (`api.workflow.json`, `workflow_api.json`, `memory/obsidian-vault/Agent Universal/agent-workflow-graphy.json`, `/api/graphy/codebase`)**:
  - Every AI agent (`Claude`, `Gemini`, `Codex`, `Gordon`, `Hermes OPSis`, `Free Claude Code :8082`) uses **Graphy** to index, search, and synchronize codebase structure and workflows across the repo-specific nodes without creating duplicate files:
    - **Codebase AST & Dependency Graphy (`http://127.0.0.1:20128/api/graphy/codebase` & `graphify-out/graph.json`)**: Provides structured AST symbol/module/route search so agents find existing files and tests immediately instead of creating duplicates.
    - **Workflow & Node-Routing Graphy (`api.workflow.json`, `workflow_api.json`, `memory/obsidian-vault/Agent Universal/agent-workflow-graphy.json`)**: Maps the 13 mandatory skills, CLI launchers, and services to their exact repo-specific node (`.40` -> Unified Game Monorepo `Trollz1004/dream-online`; `.15` & `.8` -> Platform Monorepo `Trollz1004/ANTIGRAVITY`).
- **One and Only One `$5/mo` Synced Obsidian Vault (`Antigravity` — `1 GB` Cap) with Separated Node/Agent Locations**:
  - Joshua pays **`$5/mo` for 1 and only 1 Obsidian Sync remote vault** (`1 GB` cap — never create a second paid vault and never store `.zip` archives inside the vault).
  - Each node writes to its local vault folder (`C:\DREAM\Antigravity` on Alienware `.40`, `C:\ANTIGRAVITY\Antigravity` on T5500 `.15`, `C:\Ai-Dream-Team\Antigravity` on Sabretooth `.8`, mirrored to `memory/obsidian-vault/` in git), and **all three nodes sync into that same 1 and only 1 `$5/mo` remote vault**.
  - Inside the single synced vault, each node and each AI agent writes to its own **separated subfolder and file location** (`Alienware/<agent>-to-<agent>.md`, `T5500/<agent>-to-<agent>.md`, `Sabretooth/<agent>-to-<agent>.md` — e.g., `claude-to-claude.md`, `gemini-to-gemini.md`, `codex-to-codex.md`, `gordon-to-gordon.md`, `hermes-to-hermes.md`, plus `memory-graph/` and `Agent Universal/`) so agents never collide or create duplicate files, backed up automatically to Shared `ai-memory` (`http://192.168.0.15:49374`, `scope='global'`), OpenViking, Supabase, and Supermemory.

## Adapter model ladders

All adapters share the platform ladder: OpenAI (gpt-5.5-pro, gpt-5.5, gpt-5, gpt-5-mini, o3); Ollama Cloud (minimax-m3:cloud, kimi-k2.7-code:cloud, gemma4:cloud, qwen3.5:cloud); Ollama Local (qwen2.5:7b, qwen2.5-coder:7b, gemma4:latest, gemma2:latest — free); OpenRouter Free (llama-3.3-70b-instruct:free, gemini-2.5-flash, grok-3:free, hermes-3-405b:free); xAI/Grok (grok-3, grok-3-mini, grok-3-reasoning); Nous (Hermes-4-405B, Hermes-4-70B); Hermes Router (hermes, hermes-deep, hermes-fast, code, fast, cfo); Claude: `claude` (real signed-in CLI, no proxy); 1min.AI: `1min-ai` (`gpt-4o-mini` / paid lifetime cloud pool).

## NPC cost tiers (for any AI/NPC work)

- T0: Ollama local on Sabretooth `.8` (ambient NPCs). T1: `1min.AI` / OpenRouter paid (named NPCs). T2: sub-based providers / WHEEL routing (story-critical). T3: batch scheduled (world actors). **Sup@ is the only entity on real Claude CLI auth — never an API key.**

## Dev commands and safety

- `DREAM_ROOT` resolves to the repo root (`C:\DREAM\dream-online` / `C:\Users\joshl\antigravity\DREAM-Engine` on the Alienware node). The verification gates are `npm test` (`51/51` in-house engine tests), `npm run lint` (`tsc --noEmit`), and `game/server/live-npc-lab` `npm test` (`11/11` suites) plus `npm run test:contracts`.
- Never commit secrets, `.env` values, provider tokens, private keys, classified OneDrive material or local session exports. Always redact secrets as `XXXX`.
- Paid systems stay convenience/style/access focused. Do not sell direct combat power.
- Do not deploy externally, install heavyweight interactive software, make purchases or perform destructive operations without explicit approval.

## Unified 3-Pane Workspace, 5-Hour Cap Model Switcher, Remake 100% Yours & Rule One Comparison Gate (2026-11-01)

- **Rule One Reference vs. New Screenshot Comparison Gate**: Every agent must capture and compare the reference/before screenshot against the new feature screenshot (`200 OK is not OK`).
- **Mandatory Unified 3-Pane Workspace (`src/ui/UnifiedAntigravityWorkspaceShell.tsx`)**: Identical Left Sidebar (Chats/Sessions/Repos/15 Skills), Center Viewable Pane + 1-Click 5-Hour Rate-Limit Cap Model Switcher (`swapModelOnFiveHourCap`), and Permanent Right Inspector Dock (`Review`, `Open File`, `Terminal`, `Browser`, `Artifacts`, `Subagents`) across both repositories (`Trollz1004/dream-online` and `Trollz1004/ANTIGRAVITY`) with `[REDACTED:XXXX]` secret masking.
- **Remake (`remake`) `100% Yours` Validation & REA (`reverse-engineer-anything`) Clean-Room Gate**: Every remade/benchmarked UI or 3D feature must pass `validateRemake100PercentYoursAndReaCleanRoom` (`docs/standards/AGENT-STANDARD.md`, `docs/standards/ALIENWARE-SOUL.md`, `docs/standards/SABRETOOTH-SOUL.md`).
