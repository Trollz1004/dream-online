# Unreal Engine Architecture

**Status note (2026-09-26):** This is a parked Unreal reference, kept for the revisit terms recorded in `docs/tech/engine-decision-2026-09-20.md`. The current implementation is the Godot slice at `game/godot/DreamSlice`.

## Engine Direction

Target Unreal Engine 5.5 or newer if available. Use UE5 open-world features but prototype with strict scope.

## Core Systems

| System | Unreal Direction |
|---|---|
| Open world | World Partition, Data Layers, One File Per Actor |
| Combat | Gameplay Ability System, C++ hit validation, animation notifies |
| Networking | Dedicated server, Replication Graph first, Iris evaluation later |
| NPCs | StateTree, Smart Objects, Mass Entity for crowds/workers later |
| UI | CommonUI / UMG, controller-ready, minimal MMO HUD |
| Persistence | Backend service later; prototype can start local save + server DB |
| Economy | Server-authoritative item ledger and crafting recipes |

## Dream Shift System

Day and night are not just lighting.

Day layer:

- Wilderness resources.
- Field mobs.
- normal vendors.
- Worker routes.
- safer travel.

Night layer:

- Dream-city district assets.
- black-market NPCs.
- rare fish/resources.
- dangerous mobs.
- PvP risk routes.

Implementation:

- Author day/night content in Data Layers.
- Use a server-authoritative world clock.
- During Dream Shift, fade/blackout, pause sensitive actions, stream layer changes, then resume.
- Do not attempt seamless full-city transform first.

## Performance Budgets

Prototype target:

- 60 FPS local on development machine if possible.
- 30 FPS acceptable during early editor prototype on GTX 1070.
- Dedicated server target: stable 8-16 players in slice.
- No Blueprint Tick in shipped gameplay systems.

## First Unreal Project Shape

When Unreal is installed:

```text
C:\DREAM\dream-online\game\unreal\DreamOnline.uproject
C:\DREAM\dream-online\game\unreal\Source\DreamOnline\
C:\DREAM\dream-online\game\unreal\Content\DreamOnline\
```

Modules:

- `DreamOnline`: core gameplay.
- `DreamCombat`: abilities, attributes, hit validation.
- `DreamWorld`: day/night, resources, world events.
- `DreamEconomy`: inventory, recipes, durability.
- `DreamAI`: NPC schedules, workers, hostile AI.
