# DREAM Online additions: off-repo backups, Game-Studios isolation, task router

Kept as its own file so the pointer in `docs/standards/AGENT-STANDARD.md` stays short and the canonical standard in `Trollz1004/ANTIGRAVITY` does not drift.

- **Off-repo full backups on the Alienware node**: saved outside Git under `%LOCALAPPDATA%\DREAM-OffRepo-Backups\2026-11-02-full-context\` and in-repo at `docs/standards/backups-full-context/`. Restore with `node ops/node/restore-full-context-backups.mjs`. The snapshots are dated 2026-11-02 and predate the 2026-11-03 rulings; where a snapshot disagrees with `AGENTS.md` or the standard, the standard wins.
- **`Claude-Code-Game-Studios` isolation rule**: raw prompts from `%USERPROFILE%\antigravity\Claude-Code-Game-Studios` may only run inside `Free Claude Code (:8082)` models, never on real Claude (`Fable` sign-in) and never on real Antigravity Gemini. All real Council game-design work uses our REA and Remake `100% Yours` clean-room roles (`DREAM_STUDIO_CLEAN_ROOM_ROLES`).
- **Clean-room task-to-agent router (`routeTaskToDreamAgent`)**: synthesized through REA and Remake `100% Yours` from a task-profiler and escalation-ladder design (PandaOrchestrator style), with zero third-party license contamination from `pandacode`.
