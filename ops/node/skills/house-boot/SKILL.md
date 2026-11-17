---
name: house-boot
description: "First thing on every session start across the 2-Node Fleet (Alienware 192.168.0.40 and T5500 192.168.0.15 from ops/fleet/fleet-map.json). Summarizes docs/house/SPINE.md, Trusted-Three authority, 100% In-House DREAM Engine, live Date App, Mission OS :3130 on T5500, Wyoming DAO LLC (51%/49%), and Starter Kit + Superpowers loop."
---

# House Boot (`docs/house/SPINE.md` + Two-Node Fleet State)

Read this in one pass, then act. Trust the newest CLAUDE-USER-PREFERENCES file in the drop box (`%USERPROFILE%\OneDrive\claude-to-claude\`), `docs/house/SPINE.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and `.claude/skills/rooflo-opsis-cut-and-reach/SKILL.md` over any older September note.

## 1. Working Directory & Active Repositories
- **Working Directory for Free Claude Code (`http://192.168.0.40:8082/admin`) on Alienware (`192.168.0.40`, `ops/fleet/fleet-map.json`)**:
  - Always use **`%USERPROFILE%\antigravity\DREAM-Engine`** (or **`C:\DREAM\dream-online`**). Never use `C:\DREAM` directly because `C:\DREAM` is the parent folder, not the git repository.
- **Two Active `Trollz1004` Nodes Only (`docs/house/NODES.md`, `ops/fleet/fleet-map.json`)**:
  1. **Alienware (`192.168.0.40`, workshop)**: `Trollz1004/dream-online`, `Trollz1004/swarm-command`, `Trollz1004/ANTIGRAVITY` — Unified 100% In-House `DREAM Engine` & Editor (`src/engine/`, `:9180`), Panda Router (`:8765`), Swarm Command (`:8000`), Lead-Gen Studio (`:8392`), OPSis Studio (`:8390`), Free Claude Code (`:8082`), and wheel inbox runner (served from `dream-online.net` with own checkout; zero external game-engine runtime, zero Paperclip).
  2. **T5500 (`192.168.0.15`, front-of-house)**: `Trollz1004/ANTIGRAVITY` (`C:\ANTIGRAVITY`), `Trollz1004/dream-online` — Mission OS (`192.168.0.15:3130`), Domains Server (`:9160`), Date App (`:3200` web / `:8000` API), OmniRoute (`:20128`), Shared `ai-memory` (`:49374`), and Hermes API (`:8643`). Heavy builds go to the Alienware wheel via the inbox, never built on T5500.
  3. **Third machine boundary**: the third machine is a separate test node under a separate GitHub account and is never named or reached from `Trollz1004` code.

## 2. The Rulings That Stand (`docs/house/SPINE.md`)
- **Mission OS is `http://192.168.0.15:3130` on T5500 (`:3130/live`) — Hermes is called `OPSis`**:
  - Runs on T5500 as the scheduled task `"ANTIGRAVITY Mission Control"` (`C:\ANTIGRAVITY\mission-os\server.mjs`).
  - Hermes is called **`OPSis`** and is reached per node via Josh's Telegram bots.
- **The Date App (`youandinotai.com` / `youandinotai.online`) is NOT For Sale — It Is MARKETING**:
  - The old sale listing is **cancelled**.
  - **Production Backend**: Runs on **Google Cloud Run** behind `api.youandinotai.com` (DB, Redis, Square all connected; `.env.production` points `VITE_API_URL` there). Port `:3200` on `192.168.0.15` is only a local copy of the frontend.
  - **Payments & Revenue — CLOSED (`docs/PAYMENTS-TRUTH.md` & `docs/house/PAYMENT-ACCOUNTS-RULE.md`)**: Verified and closed. Never re-audit, re-verify, question payments, or repeat old payment stories, and never put private customer names or merchant account mappings into repo files.
  - **Affiliates**: **Emergent** markets the app via affiliate links at **50%** (`Link Forge` / `affiliate-partners.json`).
- **Business Structure (`docs/house/THE-HOUSE.md`)**:
  - `Trash Or Treasure Online Recycler LLC` (`FL #L25000158401`, `EIN 33-4655313`) is a straight for-profit business (`FOUNDER_PERCENTAGE=90`, `10%` corporate deduction ceiling).
  - Target DAO is a **Wyoming DAO LLC** keeping **51% control** with a token sale of up to **49% of ~2.5M tokens** so a smart contract enforces commitments in code.
  - Customer-facing copy sells product value only (never split or tax-deduction wording on public surfaces).
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
