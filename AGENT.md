# AGENT.md — UNIFIED MULTI-HARNESS ENTRYPOINT (`2026-10-28`)

@AGENTS.md
@CLAUDE.md
@GEMINI.md

> **Zero-Drift Multi-Harness Rule**:
> Whether you are running as **Claude Code (`Opus 5.5 / Fable`)**, **Google Gemini (`Gemini 4 High Reasoning / Spark / Ultra / agy`)**, **OpenAI (`Codex`)**, **Free Claude Code (`:8082`)**, **Hermes (`OPSis`)**, **OpenCode**, or **Meta AI (`Muse / Musa`)**, all harnesses share the exact same canonical rules in `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `api.workflow.json`, and `.agents/skills/*/SKILL.md` (`.claude/skills/*/SKILL.md`).

1. **`Trust Level Max` Judges (`Opus 5.5 / Fable` & `Gemini 4 High Reasoning`)**: Hold 100% permission from Founder Joshua Coleman to judge what is used/not used, approve the work of all other AI platforms, and dispatch zero-cost partner outreach/emails (`cost_usd === 0` until Joshua says finalize).
2. **Mandatory Session Skills**: Load `caveman`, `i-have-adhd`, `find-skills`, `create-skills`, `brainstorming`, `superpowers`, `tdd` (`test-driven-development`), `verification-before-completion`, `obsidian-save`, `openviking`, `supabase`, `agent-workflow`, `rooflo-opsis-cut-and-reach`, and `house-boot`.
3. **Mandatory Session-Start & Session-End Memory**:
   - Read `C:\DREAM\Antigravity\T5500\gemini-to-gemini.md` and `C:\DREAM\Antigravity\<NODE>\<agent>-to-<agent>.md` at session start.
   - Run `scripts/obsidian/session-note.ps1` at session end to append to Obsidian (`C:\DREAM\Antigravity`) and mirror to Shared `ai-memory` (`http://192.168.0.15:49374` with `scope="global"`), Graphy, OpenViking, Supabase, and Supermemory backups.
4. **Power-Loss Auto-Boot**: Managed by Windows Scheduled Tasks `DREAM-Alienware-BootAll` (`.40` ports `:8082`, `:8390`, `:20128`, `:9127`, `:9133`), `ANTIGRAVITY Mission Control` (`.15` ports `:3130`, `:20128`, `:49374`), and `DREAM-Sabretooth-BootAll` (`.8` ports `:11434`, `:8391`).
