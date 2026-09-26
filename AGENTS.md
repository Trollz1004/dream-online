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

- Engine: **Godot 4.7.2** (Joshua, 2026-09-20; the reasons and the revisit terms are in `docs/tech/engine-decision-2026-09-20.md`). The playable slice is `game/godot/DreamSlice`, written entirely as text; run its headless suite with `godot --headless --path game/godot/DreamSlice --script res://tests/run_tests.gd` and never lower the `MINIMUM_CHECKS` floor in `tests/run_tests.gd` (789 as of 2026-09-25). Unreal Engine 5.8.2 stays parked at `C:\DREAM\UE_5.8` on the Alienware node for cinematics and reference only; no DREAM `.uproject` is on the path to the game. Node operations (the `drift` command, health probe, runbook, launch skill, journal) live in `ops/node/` and are edited by the Claude judge lane only.
- Platform: PC target, micro-transaction based. In-game currency: NEEDs (never surface as a real-money benefit — FL §496.405 compliance wall).
- ONE shared world server — no instances, no fast travel.

## Current prototypes

- Combat slice (Godot 4.7.2): `game/godot/DreamSlice` — open with `game\godot\Open-DreamSlice.cmd`, browser build via `Export-DreamSlice-Web.cmd` and `Serve-DreamSlice-Web.cmd` on `127.0.0.1:8099`. Dash with invulnerability frames, attack chain, heavy attack, guard, lunge, burst, a telegraphing dummy, Mireth with a memory link into the Live NPC Lab, Day Dream and Night Dream environments, a rigged CC0 character, the GeminEYE pet and a keyboard hotbar. Its `README.md` says how to test it and take a frame.
- Live NPC Lab (Node, zero dependencies): `game/server/live-npc-lab` — `npm start` on `127.0.0.1:9127`, `npm test` runs the smoke, first-playable, NPC-profile, AI-failure, cost-guard, memory-scope, memory-compaction, lore-retrieval, Hermes-webhook-provider and world-event-memory-recall checks; `npm run test:contracts` checks the contract index. Cloud calls stay disabled by default; providers are gated in `src/providers.js`. Decision (2026-09-11): Hermes profiles become a disabled-by-default webhook provider inside this lab for named and story NPCs; T0 ambient NPCs use local Ollama on the RX 6800; Sup@ stays on the real signed-in Claude CLI, never an API key; the lab keeps allowlist, timeout (3 s budget) and fallback authority.
- DreamOps Bridge (Node, zero dependencies): `game/server/dreamops-bridge` — `127.0.0.1:9133` (pinned there; do not move it back to 9119, which Hermes owns). No test script yet.
- Port contract: `docs/tech/local-prototype-ports.md`. State: `STATE.md`. Tasks: `TASKS.md`, `ops/dream-task-bank-100.md`. Live records: `docs/DREAM-DISPATCH.md` and the newest entry of `ops/node/JOURNAL.md`.

## Feature scope (Phase C)

- Fishing system (mini-game / activity); cosmetic outfits (pay-for-convenience only, never gameplay advantage); trading marketplace (player-to-player); Treasury: 2 slot bags (1 free convenience, 1 purchased convenience), 2 buyable shop items via NEEDs.

## Design rules

- Pay-for-convenience ONLY — never pay-to-win. Whitelist: inventory slots, cosmetics, convenience items. NEEDs shop items must not provide gameplay advantage.
- Full canon (THE BAN HAMMER, C0D3X, Sup@): `paperclip-tro/projects/PROJECT-2-DREAM-ONLINE.md`; terminology decoder: `memory/glossary.md` (NEEDs, Sup@, T0–T3 NPC tiers).

## Monorepo structure

- `game/` — the Godot slice (`game/godot`), the Node services (`game/server`), the parked Unreal scripts (`game/unreal`); `adapters/` — adapter manifests (pi, hermes, opencode, grok, claude, codex, gemini, ollama-local, 1minai); `opencode/opencode.json` — OpenCode provider/model config (local, ignored); `ops/` — the Alienware node's command, health probe, skills and journal under `ops/node/`, plus older planning notes (reference only); `specs/` — Spec Kit specs (000 node, 001 world bus, 002 crowdfunding demo, 003 production look); `docs/` — GDD, tech, testing, handoffs. Start with `docs/tech/engine-decision-2026-09-20.md`, then `docs/DREAM-DISPATCH.md` and the newest `ops/node/JOURNAL.md` entry; `docs/handoffs/FABLE-DREAM-ONLINE-START-HERE-2026-08-25.md` is the older Unreal-era brief and is history now.

## Adapter model ladders

All adapters share the platform ladder: OpenAI (gpt-5.5-pro, gpt-5.5, gpt-5, gpt-5-mini, o3); Ollama Cloud (minimax-m3:cloud, kimi-k2.7-code:cloud, gemma4:cloud, qwen3.5:cloud); Ollama Local (qwen2.5:7b, qwen2.5-coder:7b, gemma4:latest, gemma2:latest — free); OpenRouter Free (llama-3.3-70b-instruct:free, gemini-2.5-flash, grok-3:free, hermes-3-405b:free); xAI/Grok (grok-3, grok-3-mini, grok-3-reasoning); Nous (Hermes-4-405B, Hermes-4-70B); Hermes Router (hermes, hermes-deep, hermes-fast, code, fast, cfo); Claude: `claude` (real signed-in CLI, no proxy).

Recommended (in `opencode/opencode.json`): Free `openrouter/meta-llama/llama-3.3-70b-instruct:free`, `openrouter/google/gemini-2.5-flash`; Cloud `ollama-cloud/minimax-m3:cloud`, `ollama-cloud/kimi-k2.7-code:cloud`, `xai/grok-3`; Coding `ollama-local/qwen2.5-coder:7b`, `opencode/gpt-5.3-codex`; Fast `ollama-local/qwen2.5:7b`, `openrouter/google/gemini-2.5-flash`.

## NPC cost tiers (for any AI/NPC work)

- T0: Ollama local (ambient NPCs). T1: OpenRouter paid (named NPCs). T2: sub-based providers / WHEEL routing (story-critical). T3: batch scheduled (world actors). **Sup@ is the only entity on real Claude CLI auth — never an API key.**

## Dev commands and safety

- `DREAM_ROOT` must resolve to the repo root (`C:\DREAM\dream-online` on the Alienware node). There is no repo-wide lint or typecheck; the gates are the Godot headless suite and the Live NPC Lab `npm test` plus `npm run test:contracts`, run locally and, since the account's billing lock was cleared on 2026-09-26, in GitHub Actions as well.
- Never commit secrets, `.env` values, provider tokens, private keys, classified OneDrive material or local session exports.
- Paid systems stay convenience/style/access focused. Do not sell direct combat power.
- Do not deploy externally, install heavyweight interactive software, make purchases or perform destructive operations without explicit approval.
