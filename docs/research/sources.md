# Research Sources

**Status note (2026-09-26):** The list below is the Unreal-era reference set, kept for a possible revisit. The engine is the in-house DREAM Engine.

## Official / Primary Sources

- Unreal World Partition: https://dev.epicgames.com/documentation/unreal-engine/world-partition-in-unreal-engine
- Unreal Gameplay Ability System: https://dev.epicgames.com/documentation/unreal-engine/gameplay-ability-system-for-unreal-engine
- Unreal Replication Graph: https://dev.epicgames.com/documentation/unreal-engine/replication-graph-in-unreal-engine
- Unreal Iris Replication: https://dev.epicgames.com/documentation/unreal-engine/iris-replication-system-in-unreal-engine
- Unreal StateTree: https://dev.epicgames.com/documentation/unreal-engine/state-tree-in-unreal-engine
- Unreal Smart Objects: https://dev.epicgames.com/documentation/unreal-engine/smart-objects-in-unreal-engine---overview
- Commercial life-skill MMO reference set: removed from the active index by the
  clean-room naming rule. Track mechanics generically instead: gathering, processing,
  cooking, fishing, worker nodes, repair, durability, storage pressure, and XP modifiers.

## In-House DREAM Engine sources

- The engine and editor are built in-house (`src/engine/`, `docs/tech/engine-decision-2026-09-30-own-engine.md`) on WebGPU with a WebGL2 fallback and zero third-party engine dependencies; the earlier Godot 4 reference links are retired.

## Visual and System References (2026-11-12)

- **Top Character Reference:** `%USERPROFILE%\OneDrive\claude-to-claude\images\game-look\four-classes-nightfall-city-2026-11-12.jpg`. Four panels depicting characters walking a rain-wet neon city street at night: knight in engraved plate with goggles; archer in fitted dark leather with compound bow; mage in purple/gold embroidered coat with glasses; dragon in evolving form with crimson/black plate and glowing red eyes (awakened progression form, not picked at creation). Sets the realism bar for characters and the Nightfall city. Build to it; do not trace it.
- **Equipment Window (Study-Only):** `%USERPROFILE%\OneDrive\claude-to-claude\images\game-look\STUDY-ONLY-bdo-equipment-window-2026-11-12.jpg`. Screenshot of Black Desert's equipment window for study only. Shows layout concepts (gear slots outer ring, appearance slots inner ring, lower accessory slots, attack/defense totals). Our window is designed new, in our own layout, icons and art. Nothing from that screenshot is copied.

## Design Takeaway

Borrow principles, not literal implementation:

- Interlocked life-skill economy.
- Action-combat depth.
- Slow grind made fun through active mechanics.
- AFK systems with capped, economy-safe output.
- Day/night world state as gameplay.
- Convenience monetization without PvP/PvE power sales.
