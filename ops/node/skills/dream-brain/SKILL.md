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
