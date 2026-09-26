# Prototype Architecture

**Status note (2026-09-26):** Written before the 2026-09-20 engine decision. Track B below is now the Godot slice at `game/godot/DreamSlice`; the Unreal section at the end is parked reference (`docs/tech/engine-decision-2026-09-20.md`).

## Current Reality

The repo root is `C:\DREAM\dream-online`, and the Godot slice at `game/godot/DreamSlice` now exists alongside the prototype servers described below.

Primary design source of truth is the canon document kept local and git-ignored at
`paperclip-tro/projects/PROJECT-2-DREAM-ONLINE.md` under the repo root.

This document is an implementation companion for the first slice.

## Recommended Two-Track Plan

Track A: lightweight browser/server prototype.

- Proves live NPC triggers.
- Proves NEEDs earn/spend loop.
- Proves basic world state, fishing, inventory, and agent memory.
- Faster iteration on this node.

Track B: the engine decision is made (Godot); the vertical slice is `game/godot/DreamSlice`.

- Real action combat feel: built — dash with invulnerability frames, light attack chain, heavy attack, guard, lunge, burst.
- Server-authoritative hit validation: not yet — the dash is decided on the client today.
- The Day Dream / Night Dream shift: built as two environments in the slice; open-world streaming not yet.
- Multi-player combat and the life-skill loop: not yet — no netcode.

## Live-NPC Backend Target

The Live NPC Lab on `127.0.0.1:9127` is the authoritative backend today. Game triggers post to it, it routes by NPC tier with allowlist, timeout and fallback, and it writes memory back. Paperclip was an earlier plan for a webhook backend on Sabretooth port `3100`; it is now parked, nothing depends on it, and it answers on no port.

Initial implementation must stub this flow before spending on high-cost models.

## NPC Tier Implementation Rule

- T0: local Ollama ambient NPCs.
- T1/T3: cloud multi-model route for richer named or batch content.
- T2: higher-cost routed tier when budget-gated.
- Sup@ high-cost inference is a later phase only, after revenue/explicit founder decision justifies spend.

## Engine Decision Gate

Do not commit the full MMO to any engine until these are answered:

- Can no-tab combat feel good in the chosen engine?
- Can server authority validate action hitboxes at target latency?
- Can one continuous shared world be streamed and maintained without normal dungeon instances?
- Can Dream events transform a wilderness area into city life through controlled
  layers, lighting, audio, NPC schedules, props, and event masks without pretending
  that the first prototype supports full-world replacement?
- Can live NPC memory run with bounded cost and safe lore constraints?
- Can tools support years of crafting/economy/content growth?

## Unreal Direction (parked; revisit terms in the engine decision record)

- World: World Partition, Data Layers, One File Per Actor.
- Combat: Gameplay Ability System, C++ hit validation, animation notifies.
- Networking: dedicated server, Replication Graph first, Iris evaluation later.
- NPCs: StateTree, Smart Objects, Mass Entity for crowds/workers later.
- UI: CommonUI / UMG, controller-ready, minimal MMO HUD.

## Dream Shift System

Day layer:

- Wilderness resources.
- Field mobs.
- Normal vendors.
- Worker routes.
- Safer travel.

Night layer:

- Dream-city district assets.
- Black-market NPCs.
- Rare fish/resources.
- Dangerous mobs.
- PvP risk routes.

Implementation rule:

Start with a blackout/fade transition that hides streaming and state swap. Do not attempt seamless full-city transformation first.
