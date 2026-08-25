# DREAM ONLINE

DREAM ONLINE is a live-world open-world MMO project focused on action combat, life skills, player-driven markets, high-stakes PvP, and live NPC systems that make the world feel awake.

This repository is the clean project home for Dream design, prototype code, agent handoff docs, brand scaffolding, and first-playable planning.

## Current focus

- First playable foundation.
- Live NPC Lab.
- DreamOps Bridge.
- Day/Night and Nightfall economy rules.
- PvP level scaling and Red Name consequences.
- Level 20 combat identity shift.
- Level 45 Nightmare Class and DREAM Class awakenings.
- Marketplace, Storage Runner, and Market Runner systems.
- Character creation vision.

## Local prototypes

### Live NPC Lab

```powershell
cd "D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\server\live-npc-lab"
npm start
```

Health:

```text
http://127.0.0.1:9127/health
```

### DreamOps Bridge

```powershell
cd "D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\server\dreamops-bridge"
npm start
```

Health:

```text
http://127.0.0.1:9119/health
```

## Important docs

- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/brand/BRAND.md`
- `docs/gdd/00-vision.md`
- `docs/gdd/00a-first-playable-promise.md`
- `docs/gdd/05-day-night-economy-market.md`
- `docs/gdd/06-pvp-level-scaling.md`
- `docs/gdd/07-character-creation.md`
- `docs/testing/first-playable-acceptance-checklist.md`
- `ops/dream-task-bank-100.md`
- `ops/software-install-plan.md`

## Boundaries

- No secrets or `.env` values in git.
- No classified OneDrive plot material in repo files.
- No direct competitor name drops in active docs or public copy.
- No `sandbox` jargon in player-facing language.
- No charity, split, private accounting, or vendor/TOS language in game-facing copy.
- Monetization is convenience/style/access only, not paid combat power.

## Brand

Draft original logo:

```text
assets/brand/dream-online-logo.svg
```

The logo is a placeholder original mark and can be replaced by commissioned art or Gemini-generated art later.

## Repository status

Private-first until Joshua intentionally makes it public.

---

## Previous local notes
# DREAM ONLINE MMORPG — boot pointer

> Read this first. It points you at everything else. Keep it under 40 lines.

## Boot order
1. Read `CLAUDE.md` (this folder) — working memory: who, what, node map, roster, rules.
2. Read `TASKS.md` (this folder) — current phase and open tasks.
3. Read `memory\glossary.md` if you hit unfamiliar shorthand (NEEDs, Sup@, T0-T3, etc).

## Where things live
- `game\assets\` `game\config\` `game\saves\` `game\server\` `game\logs\` — live game data.
- `ops\backups\` — drive/repo backups (see paperclip-final-2026-07-04 for Phase A marker).
- `ops\legacy\paperclip-stub\` — retired Paperclip stub backup, kept for reference.
- `memory\` — glossary and knowledge base.

## Env
- `DREAM_ROOT` = this folder's full path. Set at machine (or user, if access denied)
  level. All game/ops tooling should resolve paths relative to `DREAM_ROOT`, not
  hardcoded drive letters — this drive is portable.

## Ground truth
- PaperclipAI HQ: `http://127.0.0.1:3110` is the human-facing board and CEO cockpit.
- Paperclip is Mission Control at `http://127.0.0.1:3100`. Verify identity with `GET /api/openapi.json` -> `.info.title` == `Paperclip API`. There is no Agent Hub on :3130.
- Sole authority: Joshua Coleman (joshlcoleman@gmail.com).
- Full ANTIGRAVITY doctrine: C:\antigravity\CLAUDE.md (separate repo, not this drive).

