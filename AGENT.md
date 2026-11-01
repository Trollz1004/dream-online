# AGENT.md — CANONICAL POINTER TO AGENTS.md, CLAUDE.md & GEMINI.md

@AGENTS.md

This file (`AGENT.md`) mirrors [`AGENTS.md`](./AGENTS.md), [`CLAUDE.md`](./CLAUDE.md), [`GEMINI.md`](./GEMINI.md), [`api.workflow.json`](./api.workflow.json), [`workflow_api.json`](./workflow_api.json), and [`memory/obsidian-vault/Agent Universal/agent-workflow-graphy.json`](./memory/obsidian-vault/Agent%20Universal/agent-workflow-graphy.json) for harnesses that read `AGENT.md` (singular).

## Key Canonical Rules (`2026-11-01`)
1. **Two Monorepos (Besides Standalone `Misses Trollz`) Mapped to Repo-Specific Nodes**:
   - **Node 1: Alienware (`.40`, `192.168.0.40`) — Unified Game Monorepo (`Trollz1004/dream-online` / `DREAM-Engine`)**: `C:\Users\joshl\antigravity\DREAM-Engine` and `C:\DREAM\dream-online` (auto-synced via `.git/hooks/post-commit`). Hosts the 100% in-house WebGPU/WebGL2 + TypeScript `DREAM Engine` & `DREAM Online` MMORPG (`:20128`), `Free Claude Code` (`:8082/admin` via signed Python 3.14.10), `OPSis Cut & Reach Studio` (`:8390`), `Hermes Leadgen` (`:8392`), `Live NPC Lab` (`:9127`), and `DreamOps Bridge` (`:9133`).
   - **Node 2: T5500 (`.15`, `192.168.0.15`) & Node 3: Sabretooth (`.8`, `192.168.0.8`) — Platform & Operations Monorepo (`Trollz1004/ANTIGRAVITY`)**: `C:\ANTIGRAVITY` on `.15` (Mission Control `:3130`, OmniRoute `:20128`, Shared `ai-memory` `:49374`, Production Domains) and `C:\Ai-Dream-Team\Antigravity` on `.8` (16 GB AMD GPU offload, Ollama `:11434`, Hermes `:9119`, YouTube Shorts `<= 59.0s` & Female Voice Podcast worker `:8391`).
2. **Graphy for AI Codebase Sync & Search (`api.workflow.json`, `agent-workflow-graphy.json`, `/api/graphy/codebase`)**:
   - Every agent uses **Codebase Graphy (`/api/graphy/codebase` & `graphify-out/graph.json`)** for AST/symbol/dependency search and **Workflow Graphy (`api.workflow.json` & `Agent Universal/agent-workflow-graphy.json`)** for repo-specific node routing so zero duplicate files are created.
3. **One and Only One `$5/mo` Synced Obsidian Vault (`Antigravity` — `1 GB` Cap) with Separated Node/Agent Locations**:
   - Founder Joshua Coleman pays **`$5/mo` for 1 and only 1 Obsidian Sync remote vault**.
   - Each node mounts its local folder (`C:\DREAM\Antigravity` on `.40`, `C:\ANTIGRAVITY\Antigravity` on `.15`, `C:\Ai-Dream-Team\Antigravity` on `.8`, mirrored to `memory/obsidian-vault/` in git), and **all three nodes sync into that same 1 and only 1 `$5/mo` remote vault**.
   - Each agent writes only to its separated node/agent file (`<Node>/<agent>-to-<agent>.md`, e.g., `Alienware/claude-to-claude.md`, `Alienware/gemini-to-gemini.md`, `Alienware/codex-to-codex.md`, `Alienware/gordon-to-gordon.md`, `Alienware/hermes-to-hermes.md`) so zero sync conflicts or duplicate files occur.
