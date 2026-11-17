# AGENTS.md — the T5500 (`192.168.0.15`, front-of-house)

This file is written to `C:\DREAM\AGENTS.md` on the T5500 (`192.168.0.15`) by `Bootstrap-T5500.ps1`
(the `WriteAgentsFiles` step) and kept in sync by `ops/agents/render-agent-files.ps1`.
`CLAUDE.md` and `GEMINI.md` next to it are one-line pointers (`@AGENTS.md`); edit this file or `docs/house/SPINE.md`, not them.

## The seat

The T5500 (`192.168.0.15`) is **front-of-house**: finished, shipped, always-running products,
customer support, Mission OS (`http://192.168.0.15:3130`), Domains Server (`:9160`), Date App (`:3200` web / `:8000` API),
OmniRoute (`:20128`), Shared `ai-memory` (`:49374`), and Hermes API (`:8643`).
It runs no local heavy builds and holds no game-engine development or provider API keys beyond what a signed-in CLI or Hermes profile needs.
Development work, the game itself, heavy builds (routed through the Alienware wheel via the inbox), and anything that touches `C:\DREAM\dream-online\ops\node` belong to **Alienware (`192.168.0.40`, workshop)**.

## The lanes present on this machine

- **Hermes (`OPSis`, `marketing` profile).** Its gateway listens on `http://192.168.0.15:8377` (key read from `%LOCALAPPDATA%\hermes\profiles\marketing\.env`, never pasted into chat or committed). Sub-agents route through OmniRoute (`http://192.168.0.15:20128/v1`); OPSis itself runs on Nous Portal, never a bare API key.
- **Trusted Three Judges & Builder Lanes (`agy` / `Claude Code` / `Codex CLI`).** `Claude Opus 5.5 / Fable`, `Gemini 4 Carbon`, and `GPT-6 Astra / GPT-6.1 Sol / Codex` review PRs, approve publishing decisions, and merge green checks (`docs/house/TRUSTED-MODELS.md`, `docs/house/PIPELINE.md`).

## What is never done on this desk

- No heavy builds, no game engine work, no gameplay code. Heavy builds requested from Mission OS route to the Alienware (`192.168.0.40`) wheel through the inbox.
- No provider API keys stored on this node outside a signed-in CLI's own credential store or a Hermes profile's `.env`. Nothing gets typed into chat, a commit, or a file under source control.
- No publishing — no public post, no public page, no release — without a judge lane's review.
- Nothing here edits `C:\DREAM\dream-online\ops\node` directly without going through PR + green CI checks.
- Machine-local services (Postgres `:5432`, Redis `:6379`, Obsidian Local REST API `:27123`) bind `"127.0.0.1"` on this machine only and never bind `0.0.0.0`.
- The third machine is a separate test node under a separate GitHub account and is never named or reached from `Trollz1004` code (`docs/house/NODES.md`).

## Control from Alienware (`192.168.0.40`)

Alienware (`192.168.0.40`) reaches this desk's Hermes marketing gateway at `http://192.168.0.15:8377` and Shared `ai-memory` at `http://192.168.0.15:49374` (`ops/fleet/fleet-map.json`), while `ops/agents/render-agent-files.ps1 -Node t5500` deploys agent pointer updates over `ssh t5500`.

## Project language

Use the same player-readable terms as the rest of DREAM ONLINE's public language:
live-world open-world MMO, action combat, life skills, player-driven marketplace, Nightfall,
Nightmare Class, DREAM Class, Storage Runner, Market Runner. Avoid competitor name drops,
real-world brand names for in-game systems, sandbox jargon in player-facing copy, and classified OneDrive plot material.
See `docs/house/SPINE.md` and `AGENTS.md` before anything publishes.
- Address doctrine: `docs/house/ADDRESS-DOCTRINE.md` and `ops/fleet/fleet-map.json` (use `192.168.0.40` and `192.168.0.15` reach addresses, never loopback reach URLs).
- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).

<!-- TROLLZ1004-SPINE:START -->
- `Repo: dream-online | Fleet: Alienware (192.168.0.40, workshop) & T5500 (192.168.0.15, front-of-house) | GitHub: Trollz1004 (ops/fleet/fleet-map.json).`
- `Spine: Trollz1004/dream-online docs/house/SPINE.md (pointers: ADDRESS-DOCTRINE.md, NODES.md, PIPELINE.md, TRUSTED-MODELS.md, THE-HOUSE.md).`
- `Address doctrine: use 192.168.0.40 and 192.168.0.15 from ops/fleet/fleet-map.json; never use loopback reach URLs; Postgres (port 5432), Redis (port 6379), and Obsidian REST (port 27123) bind "127.0.0.1" on their own machine only.`
- `Trusted three: Claude Opus 5.5 / Fable (Claude Code), Gemini 4 Carbon (agy), and GPT-6 Astra / GPT-6.1 Sol / Codex (Codex CLI); superpowers is in every kit on demand, while REA, remake, Agent-Reach, and last30days are locked to the trusted three.`
- `Pipeline: brainstorm first, route role + <=2 skills, build [A]/[B] with failing test first, expediter rubric + 5 stacked add-on PRs, Carbon + Codex judge, Fable / rotating trusted-three merges green checks.`
- `Starter kit MCP ("kit"): cmd.exe /d /c node "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\kit\server.mjs" (tools: map_search, map_section, memory_search, memory_add, role_get, method_get).`
<!-- TROLLZ1004-SPINE:END -->
