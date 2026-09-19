# AGENTS.md — DREAM ONLINE MMORPG

The one rulebook for every AI platform in this repo. Claude Code reads it through `CLAUDE.md` (`@AGENTS.md`), Gemini CLI through `GEMINI.md`, GitHub Copilot through `.github/copilot-instructions.md`; Codex, OpenCode and Hermes read this file directly. Edit this file only. The workspace rulebook `C:\DREAM\AGENTS.md` applies on top (nodes, judge lanes, privacy).

## Project language

Use player-readable terms: live-world open-world MMO, action combat, life skills, player-driven marketplace, Nightfall, Nightmare Class, DREAM Class, Storage Runner, Market Runner.

Avoid: direct competitor name drops, real-world brand names for in-game systems, sandbox jargon in player-facing copy, private accounting / split / charity / vendor-TOS or unrelated business-platform language, classified OneDrive plot material.

## Code lanes and ownership

- Codex and Claude Code are the primary code-authoring lanes and the only judge lanes (push, merge, delete branches). `main` is the only branch on `Trollz1004/dream-online`.
- Hermes supports with research, summaries, proposals, marketing or light helper work. It does not own production architecture, code decisions, public-copy rules, monetization rules or merge authority unless Joshua assigns that role for a specific task.
- Keep active design and public language clean-room: study market mechanics as generic design patterns and express Dream systems in world-native terms.

## Game architecture

- Engine: Unreal Engine (premium live-world open-world MMO). On the Alienware node Unreal Engine 5.8.2 sits at `UE_5.8/` in the main checkout (gitignored, verified 2026-09-19); there is no DREAM `.uproject` yet. Node operations (the `drift` command, health probe, runbook, launch skill) live in `ops/node/` and are edited by the Claude judge lane only.
- Platform: PC target, micro-transaction based. In-game currency: NEEDs (never surface as a real-money benefit — FL §496.405 compliance wall).
- ONE shared world server — no instances, no fast travel.

## Current prototypes (Node, zero dependencies)

- Live NPC Lab: `game/server/live-npc-lab` — `npm start` on `127.0.0.1:9127`, `npm test` runs the smoke, first-playable, NPC-profile, AI-failure, cost-guard, memory-scope, memory-compaction and lore-retrieval checks. Cloud calls stay disabled by default; providers are gated in `src/providers.js`. Decision (2026-09-11): Hermes profiles become a disabled-by-default webhook provider inside this lab for named and story NPCs; T0 ambient NPCs use local Ollama on the RX 6800; Sup@ stays on the real signed-in Claude CLI, never an API key; the lab keeps allowlist, timeout (3 s budget) and fallback authority.
- DreamOps Bridge: `game/server/dreamops-bridge` — `127.0.0.1:9133` (pinned there; do not move it back to 9119, which Hermes owns).
- Port contract: `docs/tech/local-prototype-ports.md`. State: `STATE.md`. Tasks: `TASKS.md`, `ops/dream-task-bank-100.md`.

## Feature scope (Phase C)

- Fishing system (mini-game / activity); cosmetic outfits (pay-for-convenience only, never gameplay advantage); trading marketplace (player-to-player); Treasury: 2 slot bags (1 free convenience, 1 purchased convenience), 2 buyable shop items via NEEDs.

## Design rules

- Pay-for-convenience ONLY — never pay-to-win. Whitelist: inventory slots, cosmetics, convenience items. NEEDs shop items must not provide gameplay advantage.
- Full canon (THE BAN HAMMER, C0D3X, Sup@): `paperclip-tro/projects/PROJECT-2-DREAM-ONLINE.md`; terminology decoder: `memory/glossary.md` (NEEDs, Sup@, T0–T3 NPC tiers).

## Monorepo structure

- `game/` — live game data (assets, config, saves, server, logs); `adapters/` — adapter manifests (pi, hermes, opencode, grok, claude, codex, gemini, ollama-local, 1minai); `opencode/opencode.json` — OpenCode provider/model config; `ops/` — backups and legacy stubs (reference only); `docs/` — GDD, tech, testing, handoffs (start with `docs/handoffs/FABLE-DREAM-ONLINE-START-HERE-2026-08-25.md`).

## Adapter model ladders

All adapters share the platform ladder: OpenAI (gpt-5.5-pro, gpt-5.5, gpt-5, gpt-5-mini, o3); Ollama Cloud (minimax-m3:cloud, kimi-k2.7-code:cloud, gemma4:cloud, qwen3.5:cloud); Ollama Local (qwen2.5:7b, qwen2.5-coder:7b, gemma4:latest, gemma2:latest — free); OpenRouter Free (llama-3.3-70b-instruct:free, gemini-2.5-flash, grok-3:free, hermes-3-405b:free); xAI/Grok (grok-3, grok-3-mini, grok-3-reasoning); Nous (Hermes-4-405B, Hermes-4-70B); Hermes Router (hermes, hermes-deep, hermes-fast, code, fast, cfo); Claude: `claude` (real signed-in CLI, no proxy).

Recommended (in `opencode/opencode.json`): Free `openrouter/meta-llama/llama-3.3-70b-instruct:free`, `openrouter/google/gemini-2.5-flash`; Cloud `ollama-cloud/minimax-m3:cloud`, `ollama-cloud/kimi-k2.7-code:cloud`, `xai/grok-3`; Coding `ollama-local/qwen2.5-coder:7b`, `opencode/gpt-5.3-codex`; Fast `ollama-local/qwen2.5:7b`, `openrouter/google/gemini-2.5-flash`.

## NPC cost tiers (for any AI/NPC work)

- T0: Ollama local (ambient NPCs). T1: OpenRouter paid (named NPCs). T2: sub-based providers / WHEEL routing (story-critical). T3: batch scheduled (world actors). **Sup@ is the only entity on real Claude CLI auth — never an API key.**

## Dev commands and safety

- `DREAM_ROOT` must resolve to the repo root (`C:\DREAM\dream-online` on the Alienware node). No lint/typecheck for the whole repo yet — design phase.
- Never commit secrets, `.env` values, provider tokens, private keys, classified OneDrive material or local session exports.
- Paid systems stay convenience/style/access focused. Do not sell direct combat power.
- Do not deploy externally, install heavyweight interactive software, make purchases or perform destructive operations without explicit approval.
