---
name: superpowers
description: "Full-stack autonomous execution loop: Spec -> Plan -> TDD (Red/Green/Refactor) -> Implement (REA + Remake 100% Yours) -> Verify (Rule One screenshot/HTTP probe) -> Commit -> 6-Tier Memory Sync."
version: 2.1.0
platforms: [windows, linux, macos]
---

# Superpowers Autonomous Execution Skill (2026-11-01)

## The 7-Step Superpowers Loop
1. **SPEC**: Read `docs/house/SPINE.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `docs/standards/AGENT-STANDARD.md`, `api.workflow.json`, and the node's `gemini-to-gemini.md` / `claude-to-claude.md` in the single synced Obsidian vault.
2. **PLAN**: Brainstorm 2-3 clean-room approaches using **REA (`reverse-engineer-anything`)** evidence and break the work into small, deterministic in-house modules.
3. **TDD (Mandatory)**: Write the failing test first (`node --test` / `npm test` / `npm run lint`), then implement until 100% green.
4. **IMPLEMENT & 100% YOURS VALIDATION (`remake`)**: Author complete production code with zero placeholders or TODO stubs, and pass the **Remake `100% Yours` Validation Gate** (100% world-native copy/assets, zero source-brand leaks; it passes on features matched, a clear visual difference from the source, and our own code, and never on likeness).
5. **VERIFY (Rule One)**: Prove with real HTTP/process probes and a real screenshot for any front-facing HTML/UI. Ensure all background watchdogs run 100% headless (`wscript.exe //B`, `Hidden: True`) so nothing ever steals keyboard focus.
6. **COMMIT**: Commit to the PR branch so work is never stranded uncommitted in the preview pane. Never push to `main` and never merge; merges go through Josh or Fable / rotating trusted-three once checks are green.
7. **MEMORY SYNC**: Append session findings to the single $5/mo synced Obsidian Vault (`<NODE>/<agent>-to-<agent>.md`), Shared `ai-memory` on T5500 (`192.168.0.15:49374`), Dual Graphies (`/api/graphy/codebase` + `api.workflow.json`), OpenViking, Supabase, and Supermemory.
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
