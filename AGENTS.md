# AGENTS.md — 30-LINE LEAN CONTEXT ROUTER (TROLLZ1004 MONOREPOS)
> Spine: `docs/house/SPINE.md` | Fleet Map: `ops/fleet/fleet-map.json` | Full context backups: `docs/standards/backups-full-context/` (2026-11-02 snapshots; where they disagree with `docs/house/SPINE.md`, this file, or `AGENT-STANDARD.md`, the Spine and this file win. Restore: `node ops/node/restore-full-context-backups.mjs`).

1. **GO READ HERE (Node & Role Specs)**:
   - Global Standard: `docs/standards/AGENT-STANDARD.md` (pointer to canonical copy in `Trollz1004/ANTIGRAVITY`; extras in `docs/standards/DREAM-ROUTER-ISOLATION.md`).
   - Node 1 Alienware (`192.168.0.40`, workshop · `Trollz1004/dream-online` · `%USERPROFILE%\antigravity\DREAM-Engine`): `docs/standards/ALIENWARE-SOUL.md` (`DREAM Engine :9180`, `Panda Router :8765`, `Swarm Command :8000`, `Lead-Gen Studio :8392`, `OPSis Studio :8390`, `Free Claude Code :8082`, wheel inbox runner).
   - Node 2 T5500 (`192.168.0.15`, front-of-house · `Trollz1004/ANTIGRAVITY` · `C:\ANTIGRAVITY`): `ops/t5500/AGENTS.t5500.md` (`Mission OS :3130`, `Domains :9160`, `Date App :3200/:8000`, `OmniRoute :20128`, `Shared ai-memory :49374`, `Hermes API :8643`). Heavy builds go to the Alienware wheel via the inbox, never built on T5500.
   - Third machine boundary: the third machine is a separate test node under a separate GitHub account and is never named or reached from `Trollz1004` code (`docs/house/NODES.md`).
2. **MANDATORY UI & RULE ONE (`200 OK IS NOT OK`)**:
   - Every dashboard uses `src/ui/UnifiedAntigravityWorkspaceShell.tsx` (Left Sidebar + Center View & 1-Click 5-Hour Cap Model Switcher + Permanent Right Dock: `Review`, `Open File`, `Terminal`, `Browser`).
   - Screenshot the reference/before state and compare it side-by-side against the new live screenshot before calling anything done.
3. **YOU MUST USE THESE TOOLS & GATES**:
   - **CLI-Anything**: `.agents/skills/cli-anything/` (`npm test`, `npm run lint`).
4. **WATCHDOG / SENTRY / WEBHOOKS, PR LAW & JUDGES**:
   - Monitored by 100% headless watchdogs (`ops/node/boot-alienware-services.vbs`), Sentry, and webhooks.
   - **PRs Only**: Executor lanes (`Hermes OPSis`, `Free Claude Code :8082`, `Codex`) push branches and open PRs on `Trollz1004/dream-online` or `Trollz1004/ANTIGRAVITY`.
5. **MANDATORY SKILLS**:
   - `superpowers` (brainstorming, TDD, verification) and `kit` (`ops/kit/METHOD.md`) are in every kit on demand; `caveman` is used for the session note; design jobs add `ui-ux-pro-max`, `motion`, `impeccable`, `humanizer`; `REA`, `remake`, `Agent-Reach`, and `last30days` run only on the trusted three (`Claude Opus 5.5 / Fable`, `Gemini 4 Carbon`, `GPT-6 Astra / GPT-6.1 Sol / Codex`), never by a wrapper or local model.
6. **1-AND-ONLY-1 `$5/MO` SYNCED OBSIDIAN VAULT (`1 GB` Cap) & `[REDACTED:XXXX]` SECRETS**:
   - Write only to your separated node/agent file (`Alienware/<agent>-to-<agent>.md`, `T5500/<agent>-to-<agent>.md`) + Shared `ai-memory` (`192.168.0.15:49374` via `ops/fleet/fleet-map.json`). Mask all secrets/keys as `XXXX`.
- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports.

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
