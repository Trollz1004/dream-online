# AGENTS.md — DREAM Online MMORPG

> High-signal repo context. Read CLAUDE.md first for working memory, node map, and roster.

## Game Architecture
- Engine: Unreal Engine (premium live-world open-world MMO)

## Code Ownership

Codex and Claude are the primary code-authoring lanes for Dream ONLINE.
Hermes may support with research, summaries, proposals, marketing, or light helper work,
but Hermes does not independently own production architecture, code decisions, public
copy rules, monetization rules, or merge authority unless Joshua directly assigns that
role for a specific task.

Keep active design and public language clean-room: do not name-drop direct competitors
in active docs, prompts, task titles, reports, or public copy. Study market mechanics
as generic design patterns and express Dream systems in world-native terms.
- Platform: PC target, micro-transaction based
- In-game currency: NEEDs (NEVER surface as real-money benefit — FL §496.405 compliance wall)
- ONE shared world server — no instances, no fast travel

## Feature Scope (Phase C)
- Fishing system (mini-game / activity)
- Cosmetic outfits (micro-transactions) — pay-for-convenience ONLY, never gameplay advantage
- Trading marketplace (player-to-player)
- Treasury: 2 slot bags (1 free convenience, 1 purchased convenience), 2 buyable shop items via NEEDs

## Design Rules
- Pay-for-convenience ONLY — never pay-to-win
- Pay-for-convenience whitelist: inventory slots, cosmetic cosmetics, convenience items
- Cash currency (NEEDs) shop items must not provide gameplay advantage
- See paperclip-tro/projects/PROJECT-2-DREAM-ONLINE.md for full canon (THE BAN HAMMER, C0D3X, Sup@)

## Monorepo Structure
- `game/` — live game data (assets, config, saves, server, logs)
- `adapters/` — Paperclip adapter manifests (pi, hermes, opencode, grok, etc.)
- `opencode/opencode.json` — OpenCode provider/model config
- `paperclip-tro/projects/PROJECT-2-DREAM-ONLINE.md` — active game design spec
- `memory/glossary.md` — terminology decoder (NEEDs, Sup@, T0-T3 NPC tiers)
- `ops/` — backups and legacy stubs (reference only)

## Adapter Model Ladders
All adapters (pi, hermes, opencode, grok) share full platform ladder:
- **OpenAI**: gpt-5.5-pro, gpt-5.5, gpt-5, gpt-5-mini, o3
- **Ollama Cloud**: minimax-m3:cloud, kimi-k2.7-code:cloud, gemma4:cloud, qwen3.5:cloud, CFO-Until-No-Kid-In-Need
- **Ollama Local**: qwen2.5:7b, qwen2.5-coder:7b, gemma4:latest, gemma2:latest (FREE)
- **OpenRouter Free**: llama-3.3-70b-instruct:free, gemini-2.5-flash, grok-3:free, hermes-3-405b:free
- **xAI/Grok**: grok-3, grok-3-mini, grok-3-reasoning
- **Nous**: Hermes-4-405B, Hermes-4-70B
- **Hermes Router**: hermes, hermes-deep, hermes-fast, code, fast, cfo
- **FCC-Claude**: fcc-claude (via proxy 127.0.0.1:8082)

**Recommended** (in `opencode/opencode.json`):
- Free: `openrouter/meta-llama/llama-3.3-70b-instruct:free`, `openrouter/google/gemini-2.5-flash`
- Cloud: `ollama-cloud/minimax-m3:cloud`, `ollama-cloud/kimi-k2.7-code:cloud`, `xai/grok-3`
- Coding: `ollama-local/qwen2.5-coder:7b`, `opencode/gpt-5.3-codex`
- Fast: `ollama-local/qwen2.5:7b`, `openrouter/google/gemini-2.5-flash`

## Dev Commands
- DREAM_ROOT env var must resolve to repo root
- No lint/typecheck commands yet — design phase
- Feature branch workflow: branch → PR → merge → delete (Trollz1004/ANTIGRAVITY repo)

## NPC Cost Tiers (for any AI/NPC work)
- T0: Ollama local (ambient NPCs)
- T1: OpenRouter paid (named NPCs)
- T2: sub-based providers / WHEEL routing (story-critical)
- T3: batch scheduled (world actors)
- **Sup@ is ONLY entity on real Claude CLI auth — never API key**
