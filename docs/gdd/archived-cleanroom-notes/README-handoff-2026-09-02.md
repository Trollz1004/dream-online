# Handoff: DREAM Online — First Gate slice, GM Control, funding reel

For Codex / Claude Code. Repo: Trollz1004/dream-online (branch main). Local root: D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG

## Overview
Design references for the DREAM Online MMORPG: (1) the playable First Gate slice (canvas world + glass HUD), (2) the GM Control operator console, (3) the investor/crowdfunding reel, (4) NPC style board and the Sup@ companion 3D model. The canonical design doc is design-refs/DESIGN-dreamonline-mmorpg-gdd-2026-07-02.md (sections 1–12, founder-locked rules marked). Read it first.

## About the design files
Everything in design-refs/ is an HTML design reference — prototypes that show intended look and behavior. They are NOT production code. Recreate them in the repo's real stack: authoritative Node game server (live-npc-lab :9127, dreamops-bridge :9133 patterns), a browser client, Hermes NPC fleet (Python, always on), and the separate marketplace platform. All "server" logic in the slice runs client-side in dream-engine.js and must be moved server-side.

## Fidelity
High-fidelity for visual language (ANTIGRAVITY glass system: #020617 base, cyan #22d3ee primary, gold #e9b949 trust, emerald #34d399 ok, amber #fbbf24 pending, rose #f43f5e danger; Inter for human text, JetBrains Mono for system labels; glass = rgba(15,23,42,.6) + blur(12px) + 1px rgba(255,255,255,.1) + 0 0 20px rgba(0,0,0,.5); radii 8–12 controls, 16–24 cards, 32 hero). NO PURPLE anywhere — founder rule. Low-fidelity for world art (circles/tokens are placeholders for real sprites/models).

## Screens
1. DREAM Online.dc.html + dream-engine.js — Start gate (name, M/F, 13+ required, optional 18+ unfiltered, TOS; teen mode softens copy and shows full-cover swim variants), world (WASD/tap move, aimed-arc action combat with 3-hit combo, Shift dodge i-frames, zones L1–12, durability per swing/hit, FABLE blacksmith repair/buy/sell, Popup Camper field repair, Lake Lumen fishing timing bar with outfit perks, NEEDS shop + simulated Square checkout, PvP flag / 3 kills = red name / guards one-shot reds / red death drops half bag as lootable, GeminEYE + OpenAEye duo boss with cross-eye render effect, Sup@ companion tiers Mote→Spark→Beacon→Halo, dances on B), save in localStorage. Animated dot-field backdrop behind the start gate (dot-field.jsx, LiveDotField).
2. DREAM GM Control.dc.html — operator console on the Mission Control structure: title bar, mode rail (Overview/World/NPC Lab/Economy/Stack), trust hierarchy (Founder → Claude CEO/Hermes CEO → Codex → helpers), adapter lanes, GM command (POST /hotfix/propose, POST /rollback/plan — plan only), stack integrity (polls GAME NODE API http://192.168.0.8:20128/api/v1, lab :9127, bridge :9133, ollama :11434; states ONLINE / UNREACHABLE / TIMEOUT / BLOCKED for https→http), world stat cards (falls back to recorded world_state.json snapshot, never guesses), events with pause, NPC dialogue test (POST /npc/dialogue, playerId founder), economy scan, inference budget (AI free + unlimited, ad-funded, T0 scripted / T1 Ollama / T2 Claude / T3 Codex), checkpoints, session audit. Every mutation appends to game/server/audit.log.
3. DREAM Online Pitch v2.dc.html + dream-pitch-v2.jsx + animations-v3.jsx + dot-field.jsx — 76s reel, 1920x1080, exported via the host video export. Beats: cold open, one world/no fast travel, action combat, durability, Dragonclaw (HP-fuelled AOE), party buffs, PvP, vengeance hit list, 22h random-spawn guild fight with pooled-damage loot rule, prestige, pets, Sup@ tiers, Prime, money model, close.
4. NPC Style Guide.dc.html — First Gate roster form language, voice, memory scopes; the four laws.
5. sup-companion-3d.html + three-d-stage.js — Sup@ orb, exports OBJ/GLB.

## Founder-locked rules (do not reinterpret)
- One sandbox, no instances, no load screens, no fast travel, ever.
- Pay for convenience, never power. No loot boxes, no gambling upgrades, gear never breaks or downgrades.
- Loot: most pooled party damage (× party modifier) takes every drop.
- PvP opt-in; 3 kills = red name; guards one-shot reds; red death drops half inventory.
- AI/NPC access is free and unlimited for all players; ads fund inference.
- 13+ signup; under-18 purchases need a guardian; swimwear-max, zero nudity.
- Hermes is every NPC (profile = persona + scoped memory). Marketplace is a separate platform: formula tax, layaway by deposit, webhook-driven revenue values.
- Weekly Nightmare Shift: same map, neon city, crime possible, penalties severe and real.
- Copy rules: never donate/donation/charity/solicitation/tax-deductible; no competitor names; no AI vendor names inside the game world.
- Classified end-game material lives in the founder's vault only. Never in repo, PR bodies, or public docs.

## State / data contracts to implement server-side
character-profile, progression, combat-ability, life-skill, pvp-state, item-inventory, marketplace, boosters-pets, world-event, live-npc-memory, day-night-economy-rules (see game/server/live-npc-lab/data/schema-index.json in the repo). NEEDS ledger append-only, item instances UUID'd, argon2id passwords + TOTP 2FA, Square-hosted checkout only.

## Suggested Codex work order
1. Wire test/memory-restart-durability.mjs into live-npc-lab package.json and green it.
2. Move dream-engine.js rules into server contracts (combat, durability, loot rule, karma).
3. Stand up GAME NODE API /health on 192.168.0.8:20128/api/v1 so GM Control goes green; add CORS for the console origin.
4. Marketplace service skeleton: tax formula, layaway deposit/hold, webhook triggers, audit log.
5. Nightmare Shift toggle as a world-event contract (weekly cron), penalties table.

## Files
design-refs/ contains every file above plus the GDD and PLAN docs.
