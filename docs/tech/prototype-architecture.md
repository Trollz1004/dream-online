# Prototype Architecture

## Current Reality

Existing state says the E drive is the DREAM ONLINE build root and currently contains scaffolding only: no game loop, no game server, and no netcode yet.

Primary design source of truth remains in the main repo:

`C:\antigravity\paperclip-tro\projects\PROJECT-2-DREAM-ONLINE.md`

This E-drive doc is an implementation companion for the first slice.

## Recommended Two-Track Plan

Track A: lightweight browser/server prototype.

- Proves live NPC triggers.
- Proves NEEDs earn/spend loop.
- Proves basic world state, fishing, inventory, and agent memory.
- Faster iteration on this node.

Track B: Unreal vertical slice after engine install/decision.

- Proves real action combat feel.
- Proves server-authoritative hit validation.
- Proves World Partition / Data Layer Dream Shift.
- Proves 8-16 player combat and life-skill loop.

## Live-NPC Backend Target

Agent Hub on Sabretooth port `3130` is the intended webhook backend once the game server exists. Game server triggers call Agent Hub, Agent Hub routes to the correct NPC tier, and memory write-back persists the result.

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

## Unreal Direction If Chosen

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
