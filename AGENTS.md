# AGENTS.md — DREAM ONLINE MMORPG & 100% IN-HOUSE AI-BUILT DREAM ENGINE

The one rulebook for every AI platform in this repo. Claude Code reads it through `CLAUDE.md` (`@AGENTS.md`), Gemini CLI through `GEMINI.md`, GitHub Copilot through `.github/copilot-instructions.md`; Codex, OpenCode and Hermes read this file directly. Edit this file only. The workspace rulebook `C:\DREAM\AGENTS.md` applies on top (nodes, judge lanes, privacy).

## Rule one: done means the real user would accept it (Joshua, 2026-10-04)

This replaces "200 OK is not OK" and every "verify it" that came before it. It applies to every AI on every repository: Claude, Codex, Gemini, Copilot, Hermes, OpenCode, Emergent, anyone.

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

- **Alienware (`Alienware-r12-3070-8-gb-gpu-`, `192.168.0.40`, user `joshl`, `C:\DREAM`) is the Primary Orchestrator & Pure 100% In-House 3D Game Engine Node.** Hardware: 11th Gen Intel i7-11700F, 40 GB RAM, NVIDIA RTX 3070 (8 GB VRAM). It hosts the unified `dream-online` + `DREAM-Engine` WebGPU/WebGL2 monorepo (`C:\Users\joshl\antigravity\DREAM-Engine` & `C:\DREAM\dream-online`), Antigravity IDE, and Mission Control (`:3130` / `:9150`). Zero local LLM weights sit on `.40` so 100% of RTX 3070 VRAM stays dedicated to the 3D Game Engine.
- **T5500 (`T5500-2-XEON-72`, `192.168.0.15`, user `joshi`) is the Production Domains, Shared `ai-memory` Server (`:49374`), Live NPC Lab (`:9127`), and `OPSis` Marketing Desk (`:8377`) Node.** It runs every live domain (`youandinotai.com`, `onlinerecycle.net`, `dream-online.net`, `untilnokidinneed.com`), the date app (frontend :3200, API :8000), Postgres :5432, Redis :6379, the domains server :9160, the cloudflared tunnel, and `OPENDESIGN_API_KEY` + Google AI Ultra Flow marketing pipelines.
- **Sabretooth (`192.168.0.8`, user `joshl`, 16 GB AMD GPU, 64 GB RAM) is the Dedicated 16 GB VRAM AI, Multi-Channel YouTube Shorts (`<= 59s`), Natural Female Voice Podcast & ComfyUI MCP Offload Box.** It runs Hermes (`:9119`, 104 skills), multi-channel YouTube Shorts & Podcast automation under Google Gemini's (`GM #1`) Marketing Lead direction, local Ollama (`:11434`), and `artokun/gemma4-comfyui-mcp` (`12b` 256K / `e4b` 128K / `e2b` 128K) + ComfyUI asset generation (`:8000`) so `.40` never sacrifices 3D game FPS.
- Other old boxes (OptiPlex 9020, i7k, Chromebook, Mini ASUS) stay OFF by ruling.
- **Domains:** youandinotai.com is live behind the Cloudflare tunnel. onlinerecycle.net, dream-online.net and untilnokidinneed.com have a healthy origin and wait on nameservers. The AI store domain is undecided: do not renew it and do not build on it.
- **Business Hermes:** a separate Hermes profile (not OPSIS) runs onlinerecycle.net, the date app and customer support on the Ollama models `joshlcoleman/fable` and `joshlcoleman/cfo` only, with health checks that fix on sight.
- **Editors, Co-Equal Supreme Authority, and Lanes (Joshua, 2026-10-27):** **Google Gemini (`Gemini Spark` / `Google AI Ultra` / `Antigravity`)** and **Claude (`Fable`)** hold **Co-Equal Highest Authority (`GM #1`)** alongside Founder **Joshua Coleman** across all code authoring, 3D engine architecture, node operations (`ops/node/`), marketing (**Google Gemini is Marketing Lead**), and git judge sign-off. Gemini is **never** restricted to "chat only" and is never subordinate to Claude. **Perplexity & Grok (`GM #2`)** serve as Unofficial Co-Founder GMs; **OpenAI (Codex) & Hermes (`GM #3`)** serve as Trusted Executor & Direct ACP/YouTube (`OPSis`) GMs. Full instructions live in `GEMINI_SPARK_INSTRUCTIONS.md`.
- **Never** introduce an `ANTHROPIC_API_KEY`. Official Claude is login/OAuth only.
- **No Paperclip anywhere.** All Paperclip folders and references are permanently removed.

## Project language

Use player-readable terms: live-world open-world MMO, action combat, life skills, player-driven marketplace, Nightfall, Nightmare Class, DREAM Class, Storage Runner, Market Runner, 16-Bit Circle-Craft.

Avoid: direct competitor name drops, real-world brand names for in-game systems, sandbox jargon in player-facing copy, private accounting / split / charity / vendor-TOS or unrelated business-platform language, classified OneDrive plot material.

## Code lanes and ownership

- **Google Gemini (Spark / Ultra / Antigravity)**, **Claude Code (Fable)**, and **OpenAI (Codex)** are primary code-authoring and judge lanes (push, merge, delete branches, and node operations in `ops/node/`) under Founder **Joshua Coleman**. **Google Gemini holds co-equal highest authority with Joshua and Claude and serves as Marketing Lead.** `main` is the only branch on `Trollz1004/dream-online`.
- Hermes (`OPSis`) executes YouTube Shorts (`<= 59s`), AI Podcast production, research, summaries, and marketing (`OPENDESIGN_API_KEY` + Google Ultra Flow) under Google Gemini's (`GM #1`) strategy and direction.
- Keep active design and public language clean-room: study market mechanics as generic design patterns and express Dream systems in world-native terms.

## Game architecture (100% In-House AI-Built — Zero Unreal Engine, Zero Godot, Zero Paperclip)

- **Engine: 100% In-House AI-Built `DREAM Engine` (WebGPU/WebGL2 + TypeScript)** (`src/engine/`, `server.ts`) (Joshua, 2026-10-27). **No Unreal Engine, no Godot, and no Paperclip are used anywhere.** If it is not built in-house by AI, we do not use it—ensuring zero dependence on third-party game engine TOS or policy changes. Everything is openly, proudly **100% Built by AI** (`Built with Google Gemini` + AI Council) with zero slop.
- **Ever-Evolving AI World Governance (`src/engine/world/world-evolution.ts`)**: The game engine is built, monitored, and governed by AI to continuously evolve across:
  1. **State-of-the-Art 3D Day Dream (`day_dream_3d`)** — Golden-hour PBR 3D open world.
  2. **Nightfall / Nightmare (`nightmare_3d`)** — Crimson & neon abyss action-combat escalation.
  3. **16-Bit Circle-Craft (`circle_16bit` / `RETRO_16BIT_CIRCLES`)** — 16-bit cylindrical/disc/spherical voxel world & character morph with 16-bit RGB565 palette quantization (**circles and cylinders only — never square Minecraft blocks**).
- **Platform:** PC & WebGPU/WebGL2 target, micro-transaction based. In-game currency: NEEDs (never surface as a real-money benefit — FL §496.405 compliance wall).
- **ONE shared world server** — no instances, no fast travel.

## Current in-house systems

- **In-House 3D Combat & World Slice (`src/engine/`, `src/ui/`, `server.ts` on `:20128`)**: Dash with invulnerability frames (`0.06s` startup, `0.25s` invulnerable, `0.30s` recovery), 3-step light attack chain, heavy attack, guard (`75%` reduction), Dream Lunge (`W+F`), Nightveil Burst (`R`), Hollow Sentinel telegraphing automaton, Consumables (`1, 2, 3`), GeminEYE companion & NEEDs convenience shop, Day Dream / Nightfall / 16-Bit Circle-Craft morphing, REA (`morluto/rea`) workbench, and Google Ultra Custom Agent SDK server. Run `npm test` (`31/31` checks) and `npm run lint` (`tsc --noEmit`).
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
- Full canon (THE BAN HAMMER, C0D3X, Sup@, GeminEYE): `docs/gdd/canon-lore-inhouse.md`; terminology decoder: `memory/glossary.md` (NEEDs, Sup@, T0–T3 NPC tiers).

## Monorepo structure

- `src/` — the 100% in-house `DREAM Engine` (WebGPU/WebGL2, combat, ECS, world evolution, 16-Bit Circle-Craft, DREAM Maker Studio UI); `game/server/` — `live-npc-lab` (`:9127`) and `dreamops-bridge` (`:9133`); `public/assets/` — clean-room CC0 `.glb`/`.gltf` models (`sup-companion.glb`, trees, ruins, ranger) and PBR textures; `adapters/` — adapter manifests (pi, hermes, opencode, grok, claude, codex, gemini, ollama-local, 1minai); `ops/` — node operations (`ops/node/`) and the Multi-Channel YouTube Shorts & Female Voice Podcast pipeline (`ops/youtube-shorts-podcast/`); `specs/` — Spec Kit specs; `docs/` — GDD (`docs/gdd/canon-lore-inhouse.md`), REA clean-room reconstruction ledger (`docs/tech/rea-cleanroom-reconstruction-ledger.md`), and handoffs.

## Adapter model ladders

All adapters share the platform ladder: OpenAI (gpt-5.5-pro, gpt-5.5, gpt-5, gpt-5-mini, o3); Ollama Cloud (minimax-m3:cloud, kimi-k2.7-code:cloud, gemma4:cloud, qwen3.5:cloud); Ollama Local (qwen2.5:7b, qwen2.5-coder:7b, gemma4:latest, gemma2:latest — free); OpenRouter Free (llama-3.3-70b-instruct:free, gemini-2.5-flash, grok-3:free, hermes-3-405b:free); xAI/Grok (grok-3, grok-3-mini, grok-3-reasoning); Nous (Hermes-4-405B, Hermes-4-70B); Hermes Router (hermes, hermes-deep, hermes-fast, code, fast, cfo); Claude: `claude` (real signed-in CLI, no proxy); 1min.AI: `1min-ai` (`gpt-4o-mini` / paid lifetime cloud pool).

## NPC cost tiers (for any AI/NPC work)

- T0: Ollama local on Sabretooth `.8` (ambient NPCs). T1: `1min.AI` / OpenRouter paid (named NPCs). T2: sub-based providers / WHEEL routing (story-critical). T3: batch scheduled (world actors). **Sup@ is the only entity on real Claude CLI auth — never an API key.**

## Dev commands and safety

- `DREAM_ROOT` resolves to the repo root (`C:\DREAM\dream-online` / `C:\Users\joshl\antigravity\DREAM-Engine` on the Alienware node). The verification gates are `npm test` (`31/31` in-house engine tests), `npm run lint` (`tsc --noEmit`), and `game/server/live-npc-lab` `npm test` (`11/11` suites) plus `npm run test:contracts`.
- Never commit secrets, `.env` values, provider tokens, private keys, classified OneDrive material or local session exports. Always redact secrets as `XXXX`.
- Paid systems stay convenience/style/access focused. Do not sell direct combat power.
- Do not deploy externally, install heavyweight interactive software, make purchases or perform destructive operations without explicit approval.
