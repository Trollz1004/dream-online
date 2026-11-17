---
name: brainstorming
description: "Structured multi-angle design exploration before implementation. Evaluates clean-room architecture, REA evidence, Remake 100% Yours validation, zero-TOS-risk compliance, and accessibility before writing code."
version: 2.1.0
platforms: [windows, linux, macos]
---

# Brainstorming, REA Clean-Room & Remake 100% Yours Architecture Skill (2026-11-01)

## Protocol
1. **Restate Goal & Lens Check**: Frame who the real human viewer is (Rule One), evaluate Person, Technical, WCAG AAA Accessibility, and Long-Term zero-vendor-lock-in lenses.
2. **Compare 2-3 Clean-Room Approaches**:
   - Use **REA (`reverse-engineer-anything`)** to study existing implementations, binaries, or protocols as clean-room evidence, then author a **100% in-house implementation** in `src/engine/` (zero Unreal, zero Unity, zero external game-engine runtime lock-in, zero Paperclip).
   - Enforce the **Remake (`remake`) `100% Yours` Validation Gate**: every slot, copy token, palette, asset, and gameplay system must be 100% swapped to world-native DREAM / platform ownership with zero source-brand residue; the gate passes on features matched, a clear visual difference from the source, and our own code, and never on likeness.
3. **Select & Plan**: Pick the simplest deterministic design that costs $0 marginal spend and passes TDD.
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
