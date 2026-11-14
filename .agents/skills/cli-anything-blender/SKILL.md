---
name: "cli-anything-blender"
description: >-
  Agent-native Text-In / Text-Out CLI control for Blender 5.2.3 (`blender-launcher.exe`) paired with REA (`morluto/rea`) clean-room geometry specs and Remake style tokens. Use whenever any AI on the Council needs to generate, sculpt, rig, bake PBR materials, or export clean-room `.glb` 3D characters, weapons, bosses, or procedural city meshes for the DREAM Engine.
---

# `cli-anything-blender` — Headless Blender 5.2.3 + REA + Remake 3D Asset Pipeline

## Installed Local Paths on Alienware (`.40`)
- **Blender 5.2.3 Launcher (WindowsApps Alias)**:
  `%LOCALAPPDATA%\Microsoft\WindowsApps\blender-launcher.exe`
- **Blender 5.2.3 Package Root**:
  `C:\Program Files\WindowsApps\BlenderFoundation.Blender_5.2.3.0_x64__ppwjx1n5r4v9t\Blender\blender-launcher.exe`
- **CLI-Anything Blender Python Harness**:
  `C:\DREAM\CLI-Anything\blender\agent-harness\cli_anything\blender\blender_cli.py`
- **DREAM Engine CLI Bridge**:
  `npx tsx ops/cli-anything/dream-cli.ts blender --help`

## How AI Uses Blender + REA + Remake Together
1. **REA (`morluto/rea`) Clean-Room Spec Extraction**:
   - REA inspects binary/structural rules (e.g., `BLDG_ECO_primary.bdf` floor-height/setback tables, weapon reach/capsule envelopes, or bone/socket hierarchies) and outputs deterministic JSON metrics—never copying external copyrighted meshes.
2. **Remake + Dreamforge Style Tokens**:
   - Remake & Dreamforge supply the 43 art-style palettes, PBR roughness/metalness targets, and world-native class themes (`Crimson Vanguard`, `Nightveil Reaper`, `Solaris Warden`, `Jade Stalker`).
3. **`cli-anything-blender` (`bpy` Text-In / Text-Out)**:
   - Because AI models think in **text-in / text-out**, the agent never needs to click Blender's GUI. Instead, it runs `cli-anything-blender` or `dream-cli blender` to generate a deterministic JSON scene + `bpy` script, sculpts beveled armor/weapons/architecture, bakes PBR metallic/roughness vertex/material channels, and exports clean-room `.glb` assets straight into `public/assets/models/`.

## Commands
```powershell
# Inspect Blender 5.2.3 + CLI-Anything pipeline status via dream-cli
npx tsx ops/cli-anything/dream-cli.ts blender status --json

# Generate a clean-room bpy script & .glb export recipe for a sculpted class or REA block
npx tsx ops/cli-anything/dream-cli.ts blender forge --target crimson-vanguard --style stylized-semi-real-3d-game --json
```
- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).
