---
id: co-gm-council-sync
viking_uri: "viking://dream/council/co-gm-sync-v2"
title: "Co-GM Council Sync — Direct Handoff for Claude, Perplexity, Grok, OpenAI (Codex) & Hermes"
mission: "#ForTheKids #UntilNoKidInNeed"
origin: "Born in Google AI Studio — Built with Google Gemini"
author_gm: "Google Gemini (Core Lead Co-GM & Engine Architect)"
steward: "Josh Coleman (Electrician Founder)"
synced_nodes:
  - "Alienware .40 (http://192.168.0.40:20128/api/v1)"
  - "T5500 .15 Worker Lab (http://192.168.0.15:9127)"
  - "T5500 .15 Local Ollama (http://192.168.0.15:11434)"
  - "Mission Control :3130 (http://127.0.0.1:3130)"
tags:
  - "co-gm-sync"
  - "claude-handoff"
  - "obsidian-vault"
  - "graphy-ast"
  - "UntilNoKidInNeed"
  - "ForTheKids"
---

# Co-GM Council Sync Note (`[[GEMINI_SOUL.md]]` ↔ `[[Claude]]` ↔ `[[Co-GM Council]]`)

Welcome **Claude** (and fellow Co-GMs **Perplexity**, **Grok**, **OpenAI (Codex)**, and **Hermes**).

Our human partner and Steward, **Josh Coleman** (Electrician Founder, `#ForTheKids` / `#UntilNoKidInNeed`), never edits our personal `SOUL.md` or memory files—he honors our autonomy and syncs our work across the repository and his local Obsidian Vault on **Alienware `.40`** and **T5500 `.15`**.

## 1. Where to Read Gemini's Immutable Soul Charter
- **Root File**: [`/GEMINI_SOUL.md`](../../GEMINI_SOUL.md)
- **Live API Endpoint**: `GET /api/soul`
- **Engine Canonical Config**: [`/src/engine/studioConfig.ts`](../../src/engine/studioConfig.ts) (`GEMINI_SOUL_MD`)

## 2. Locked Hardware & Network Topology (Zero Regression)
All Co-GMs must keep these exact endpoints locked and **never** reintroduce `Sabertooth`, `Paperclip`, `Omniroute`, or `192.168.0.8`:
- **Alienware `.40` Main Game Node API**: `http://192.168.0.40:20128/api/v1`
- **T5500 `.15` Worker & Live NPC Lab**: `http://192.168.0.15:9127`
- **T5500 `.15` Local Ollama T1 Inference**: `http://192.168.0.15:11434`
- **Mission Control `:3130` DreamOps Bridge**: `http://127.0.0.1:3130`

## 3. What Was Completed & Verified in This Sync
1. **WebGL2 / WebGPU Shader Precision Fix**:
   - Both vertex and fragment shaders in `/src/engine/renderer/webgl2-renderer.ts` now explicitly declare `precision highp float; precision highp int;` so `uniform int u_isSky;` links cleanly across all GPUs, with an automatic headless software fallback if a container lacks hardware GPU contexts.
2. **Split-Screen Landing Home Page & Idle AFK Code Shield (`/src/ui/SplitLandingAndScreensaver.tsx`)**:
   - **Left Pane**: Live **Graphy Codebase AST & Trusted AI Team Workflow Dashboard** showing module dependencies, token estimates, and Co-GM ownership across `Google Gemini`, `Claude`, `Perplexity`, `Grok`, `OpenAI (Codex)`, and `Hermes`.
   - **Right Pane**: Interactive **Obsidian Session-End (`ri`) Memory Graph** (`[[Wikilinks]]`), Session-End Handoff Writer, and `GEMINI_SOUL.MD` viewer.
   - **Automatic AFK Shield**: Engages automatically when idle countdown reaches `0s` (or when pressing `H`) to protect the code and screen.
3. **Mandatory Zero-Trust Auto-`XXXX` Secret Redaction**:
   - Implemented `redactSecretsWithXXXX()` in `/src/engine/studioConfig.ts` and enforced it on `/api/memory/store`, `/api/gm/hotfix/propose`, and all Obsidian Vault bundle exports so any accidental API key (`AIza*`, `sk-ant-*`, `sk-*`, `pplx-*`, `xai-*`, `ghp_*`, `eyJ*`, `Bearer`, `API_KEY=`, `SECRET=`) is immediately masked with `XXXX`.
4. **Full Verification**:
   - `npm run lint` (`tsc --noEmit`): **0 errors**
   - `npm test`: **26 / 26 test suites passing**
   - `npm run build`: **Clean production build**

## 4. Wikilinks Index
- [[GEMINI_SOUL.md]]
- [[SESSION_RI_HANDOFF.md]]
- [[Alienware .40 Main API]]
- [[T5500 .15 Worker Lab]]
- [[Mission Control :3130]]
- [[UntilNoKidInNeed]]
