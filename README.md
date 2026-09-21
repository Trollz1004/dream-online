# DREAM ONLINE

DREAM ONLINE is a live-world open-world MMO project focused on action combat, life skills, player-driven markets, high-stakes PvP, and live NPC systems that make the world feel awake.

This repository is the clean project home for Dream design, prototype code, agent handoff docs, brand scaffolding, and first-playable planning.

## Current focus

- **The combat slice, which is playable now.** A dash with invulnerability frames, a
  light attack chain, and a training dummy that telegraphs and fires. It runs in a
  window and in a browser, and a perfect dodge writes one world event. See
  `game/godot/DreamSlice/README.md`.
- First playable foundation.
- Live NPC Lab.
- DreamOps Bridge.
- Day/Night and Nightfall economy rules.
- PvP level scaling and Red Name consequences.
- Level 20 combat identity shift.
- Level 45 Nightmare Class and DREAM Class awakenings.
- Marketplace, Storage Runner, and Market Runner systems.
- Character creation vision.

## Founder governance lock — Drift Cart Doctrine

Joshua defines DREAM's vision and founder-locked canon, but deliberately does **not** operate production code, player moderation, anti-cheat verdicts, live economy mutations, or direct database fixes.

```text
FOUNDER RUNTIME PERMISSIONS

DRIFT CART                         FULL ADMIN
HONK                               UNLIMITED
DRIFT THROUGH WORLD EVENTS         ALLOWED WITHIN GAME RULES
DESIGN / CANON                     FOUNDER AUTHORITY

PRODUCTION CODE                    NO DIRECT WRITES
ANTI-CHEAT VERDICTS                NO
BAN / SUSPEND PLAYERS              NO
MODERATOR CONSOLE                  NO
ECONOMY LEDGER MUTATIONS           NO
NEEDs MINTING                      NO
LIVE DATABASE QUICK FIXES          NO
```

There is **no founder moderation backdoor**. A report submitted by the founder enters the same evidence/review pipeline as an ordinary player report. Anti-cheat evidence and deterministic security systems establish violations; authorized moderation processes handle enforcement.

Fable Ultra Code and Codex build/review production code. C0D3X/MOLLMA represents the verified rollback/recovery doctrine. Hermes/runtime NPCs do not receive production administrative authority.

The founder retains authority over what DREAM becomes while deliberately separating that authority from unilateral control over individual players, production state, and the game economy.

If founder access attempts to cross this boundary, the canonical response is:

> **ACCESS DENIED: PLEASE RETURN TO DRIFT CART.**

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
http://127.0.0.1:9133/health
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
- `docs/doctrine/DREAM-FABLE-CODEX-MASTER-DISPATCH.md`
- `ops/dream-task-bank-100.md`
- `ops/software-install-plan.md`

## Boundaries

- No secrets or `.env` values in git.
- No classified OneDrive plot material in repo files.
- No direct competitor name drops in active docs or public copy.
- No `sandbox` jargon in player-facing language.
- No charity, split, private accounting, or vendor/TOS language in game-facing copy.
- Monetization is convenience/style/access only, not paid combat power.
- Founder authority over design/canon does not grant production, moderation, anti-cheat, economy-ledger, or database authority.

## Brand

Draft original logo:

```text
assets/brand/dream-online-logo.svg
```

The logo is a placeholder original mark and can be replaced by commissioned art or generated original art later.

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

Checked against the machine on 2026-09-21. Judge a service by the identity string
it returns, never by a port answering.

- **Engine: Godot 4.7.2.** The playable piece is `game/godot/DreamSlice`. Unreal is
  parked, not deleted. The reasons and the conditions for revisiting that are in
  `docs/tech/engine-decision-2026-09-20.md`.
- Live NPC Lab, `http://127.0.0.1:9127/health`, identity `dream-live-npc-lab`.
- DreamOps Bridge, `http://127.0.0.1:9133/health`, identity `dreamops-bridge`. It is
  the only path from a proposal into the running world.
- Mission Control is not on this machine. It is JARVIS on the Sabretooth node,
  `http://192.168.0.8:9150/health`, identity `jarvis-dashboard`.
- Model routing for every harness goes through OmniRoute on Sabretooth,
  `http://192.168.0.8:20128/v1`. No provider key lives in this repository.
- Sole authority: Joshua Coleman (`@Trollz1004` on GitHub).
- ANTIGRAVITY is a separate repository, `Trollz1004/ANTIGRAVITY`, and is not on this
  drive in a usable state: the local copy predates a history rewrite. Read its
  current files from `https://raw.githubusercontent.com/Trollz1004/ANTIGRAVITY/main/`.

The older entries here named Paperclip boards on ports 3100, 3110 and 3130. Nothing
on this machine answers on any of them, and they were removed rather than left to
send a reader to a dead end.
