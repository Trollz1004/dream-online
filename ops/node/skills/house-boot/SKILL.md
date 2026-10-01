---
name: house-boot
description: First thing on every session start on the Alienware node, after alienware-node. Summarizes the House as finalized on 2026-10-01 and points to every file that holds it, so no session re-derives what the last one built. Use at session start, after compaction, after a restart, and whenever Joshua says "where are we".
---

# House boot (finalized 2026-10-01)

Read this in one pass, then act. Everything below is a pointer; the file named is the truth.

## The rulings that stand

- The House: `C:\DREAM\AGENTS.md`, section "The House". Claude Code on the signed-in CLI is the judge lane. Codex the peer judge. Hermes is **OPSis**, never JARVIS, never Claude. Gemini builds in AI Studio's free preview. OpenCode, FreeBuff, OpenClaw, AnythingLLM are zero-cost helpers.
- Seats: Alienware is the workshop (dev only). Sabretooth is the shelf (finished, always-running product, Mission Control). The T5500 is the marketing desk, no local models.
- Watchdog rule: stop the ship from sinking, then tell Joshua what was done. Never a bare "it is down".
- Nothing costs money until Joshua says finalize. No Publish, Deploy, Cloud Run, paid tier, upgrade button.
- The tribute to Claude stays on every front-facing surface. Never trim it.
- Public copy of all of it: `dream-online/docs/house/` (THE-HOUSE.md, LESSONS.md, TOOLS.md, DESIGN-SYSTEM.md, ai-studio-stages.json).

## Where the work stands

- Newest journal entry: `dream-online/ops/node/JOURNAL.md`. Queue and Joshua's open decisions: `C:\DREAM\recon\QUEUE.md`. Status for other lanes: drop box `ALIENWARE-NODE-STATUS.md`.
- Engine: DREAM Engine in AI Studio, app `94afb663-1c94-47a8-a560-91c1ac7da627`. Stage 1 on screen, not accepted; prompt 1 on Joshua's desktop page `DREAM-GEMINI-PROMPTS-2026-09-30.html` resends the fix when the daily limit clears. Stage board: `docs/house/ai-studio-stages.json`.
- Mission Control: spec `specs/006-mission-control-jarvis/`. Tools and research: `C:\DREAM\recon\mission-control\`. Cards: drop box `FABLE-TO-SABRETOOTH-2026-09-30T2210.md`, `FABLE-TO-CODEX-2026-09-30T2210.md`.
- Hermes prompts: `C:\DREAM\recon\mission-control\HERMES-*.md`. OpenCode prompt (House wiring, engine look, design system as code): `C:\DREAM\recon\OPENCODE-HOUSE-PROMPT-2026-10-01.md`.
- T5500: `dream-online/ops/t5500/` (three lines in its README start it).
- Design: DREAM Space (`docs/house/DESIGN-SYSTEM.md`; the canvas artifact is `https://claude.ai/artifact/VJhsNvWteoHnXoUU6wDmSZ`).
- Claude's House connector for claude.ai and Cowork: `dream-online/workers/claudes-house/` (read-only MCP Worker, deploy with `npx wrangler login` then `npx wrangler deploy`).

## The one command

`drift` starts the stack and Claude. `drift duo` opens Claude left and Hermes right in one terminal tab. `drift voice` opens Hermes alone. `drift ground` tells the truth of the machine. `drift health` probes now.

## First moves of a session

1. Load `alienware-node`, run `drift ground`.
2. Read the newest journal entry and the top of `QUEUE.md`.
3. Check the drop box root for new `*-TO-FABLE-*.md` replies.
4. Check AI Studio for the daily limit; if clear, prompt 1.
5. Next focus (Joshua, 2026-10-01): the T5500 comes up, then the Mission Control test with screenshots instead of live recording, summarized by the Claude tied to it.
