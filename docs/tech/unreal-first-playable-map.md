# Unreal First Playable Implementation Map

Status: planning draft

Purpose: map the current Dream data contracts and first-playable docs into future Unreal
systems before heavy engine installation begins.

This is not an install script and does not require Unreal to be present.

## Target build

First playable target:

- One small zone: First Gate.
- One player character.
- Five starter combat paths.
- One guide NPC.
- One guard NPC.
- One gatherer NPC.
- One Market Runner NPC.
- Four resource node types.
- Two starter enemy pockets.
- Day and Nightfall state.
- One live-world event.
- Local Live NPC Lab integration.

## Unreal project shape

Recommended first project structure:

```text
DreamOnline/
  Source/
    DreamOnline/
      Combat/
      Character/
      Inventory/
      LifeSkills/
      LiveWorld/
      NPC/
      PvP/
      UI/
  Content/
    FirstGate/
    Characters/
    Combat/
    Items/
    UI/
    Audio/
```

## Systems map

| Dream contract | Unreal system target | First playable role |
|---|---|---|
| `character-profile` | Player save/profile data asset or backend DTO | Character creation and awakening preview |
| `combat-ability` | Gameplay Ability System data assets | Starter skills, stamina, cooldowns, hit shapes |
| `progression` | Progression subsystem | Level 20, level 45, EXP, death penalty |
| `life-skill` | Life-skill subsystem and interactable nodes | Gathering, tool wear, resource output |
| `item-inventory` | Inventory component | Bags, treasury, durability, repair, drops |
| `marketplace` | Marketplace service DTOs | Market Runner and Storage Runner placeholders |
| `pvp-state` | PvP state component | Pink Flag, Red Name, future war risk |
| `world-event` | Live-world event subsystem | Gate Flicker, Nightfall Surge, Resource Bloom |
| `live-npc-memory` | NPC guide bridge | Guide memory, retrieval, proposed actions |
| `first-zone.seed` | First Gate level seed | Zone layout and content placement |

## C++ vs Blueprint split

C++ first:

- Character movement extensions.
- Combat ability execution.
- Hit detection and server-authoritative damage.
- Stamina and cooldown logic.
- Inventory state and item movement.
- PvP state transitions.
- Live-world event state.
- HTTP bridge to local backend.

Blueprint first:

- Prototype UI layout.
- Tutorial prompts.
- Zone event presentation.
- Placeholder VFX and audio triggers.
- NPC animation state hookups.
- Data-driven tuning values exposed from C++.

## First Gate level implementation

Use `first-zone.seed.json` as the source map.

Level content:

- Spawn: Old Road Arrival.
- Landmark: Moon Gate Ruin.
- Safe camp: Worker Camp.
- Danger road: Low Road.
- Future event boundary: Closed City Line.

First greybox requirements:

- Moon Gate visible from spawn.
- Guide visible within 30 seconds.
- Safe retreat route from Low Road.
- Resource nodes readable by shape and prompt.
- Enemy pocket visible before it can damage the player.
- Closed City Line readable as future scope, not current promise.

## Combat implementation path

Order:

1. Third-person movement.
2. Health and stamina.
3. One light attack.
4. One dodge.
5. One hit shape.
6. One enemy with idle, notice, attack, stagger, reset.
7. Cooldown UI.
8. Low stamina cue.
9. Nightfall stat modifier.
10. Level 20 and level 45 preview data only.

Do not start with the full class system. Prove hit feel first.

## Life-skill implementation path

Order:

1. One ore node.
2. Tool requirement.
3. Timed gather interaction.
4. Inventory item grant.
5. Tool durability wear.
6. Day bonus copy.
7. Nightfall reduction or interrupt.
8. Repair hint.

Do not add deep recipes until gathering and inventory are readable.

## Live NPC integration path

Initial mode:

- HTTP call to local Live NPC Lab.
- Mock provider only.
- No cloud key in client.
- Guide can request `/npc/dialogue`.
- Guide can query `/world/zones/first-gate`.
- Guide can query `/contracts` for schema awareness during developer testing.

Rules:

- NPCs propose safe actions.
- Game systems decide whether to apply actions.
- World-changing actions require allowlist and approval path.
- Provider routes stay server-side.

## UI implementation path

Build from `docs/ux/first-playable-hud.md`.

Minimum widgets:

- Health/stamina.
- Skill command labels.
- Cooldown read.
- Gather prompt.
- Guide hint.
- Inventory preview.
- Durability warning.
- Nightfall warning.
- Safe-exit marker.

## Audio implementation path

Build from `docs/audio/first-playable-audio.md`.

Minimum cues:

- Footsteps.
- Attack swing.
- Hit confirm.
- Enemy tell.
- Low stamina.
- Gather success.
- Tool wear warning.
- Nightfall transition.
- Gate Flicker.

## Network and multiplayer boundary

First playable can be local single-player simulation.

Do not fake MMO scale in the first playable. Instead, keep the systems shaped for future
server authority:

- server-owned inventory movement
- server-owned item drops
- server-owned PvP state
- server-owned marketplace locks
- server-owned world events
- server-owned NPC provider routing

## Install readiness

Before Unreal work starts, confirm:

- Unreal Engine installed.
- Visual Studio C++ workload installed.
- Windows SDK installed.
- CMake installed if required.
- Git LFS active.
- First playable scope frozen.

## Stop conditions

Do not add more land, classes, marketplace depth, or AI complexity until:

- movement feels good
- one hit feels good
- one gather action works
- guide is useful
- Nightfall is readable
- First Gate route passes the 15-minute walkthrough
