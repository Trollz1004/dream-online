---
name: dream-brain
description: The DREAM brain on the Alienware node. Session memory that is read at every start and written at every end, recall across the Obsidian memory graph and Claude's auto-memory, and the boot card that arms the core skills. Use at session start, after a context loss, before re-deriving anything, when a durable fact appears, and before stopping after real work.
---

# DREAM brain

Built 2026-09-23 at Joshua's request: he wanted the skills, the Obsidian setup and memory to be there on every session start and after every restart of the PC, and memory written on session end.

## What loads by itself

- **At every session start**, including the one the `DREAM-Drift-Logon` task opens after a reboot, the SessionStart hook runs `ops/node/brain/brain-hook.mjs start`. It puts the boot card into context: which skill to invoke for what (research, finding and creating skills, game development, superpowers, Obsidian), node health, repo state, and the last two session records. It costs about 600 tokens.
- **Skills are armed, not loaded.** Claude Code already lists every installed skill; the boot card says when each must be invoked. The full text of a skill loads when it is invoked. Loading every skill's full text at start would spend Joshua's usage cap within a few sessions, so it is not done.
- **At every session end** (exit, `/clear`, logout), the SessionEnd hook appends the mechanical facts to `Session memory`: when the session started, the branch and head, what is uncommitted, and the commits made during it.

## The four MCP tools (server `dream-brain`)

- `brain_boot`: the boot card again, for after a compaction or confusion.
- `brain_recall`: search the vault's `memory-graph/` and `wiki/`, plus the auto-memory, before working anything out from scratch.
- `brain_remember`: one durable fact becomes one note in the vault, linked from `Memory hub`, so it appears in the graph.
- `brain_session_end`: the record that only Claude can write, meaning the summary, the decisions and what comes next. Call it before stopping after real work. The hook cannot know what was decided.

## Where things live

- Code and tests: `ops/node/brain/` (tests: `node --test ops/node/brain/`). Protected like the rest of `ops/node/`: edited by the Claude lane only, with a changelog line.
- Memory file: `DREAM-ONLINE/memory-graph/Session memory.md` in the game vault (gitignored, local only).
- Wiring: `node ops/node/brain/install-brain.mjs` adds the two hooks and `MCP_TIMEOUT=90000` to `~/.claude/settings.json` (idempotent, backs up first). The MCP server is registered at user scope with `claude mcp add -s user dream-brain -- node C:/DREAM/dream-online/ops/node/brain/brain-mcp.mjs`.
- Edit the skill map in `ops/node/brain/boot-card.md`, not in this file.

## If something is off

- No boot card at start: run `claude mcp get dream-brain`, then check that `~/.claude/settings.json` still has the two `dream-brain` hooks (another app can rewrite that file) and rerun the installer.
- The Obsidian MCP needs Obsidian running. `drift` starts it when port 27123 is closed.
- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).

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
