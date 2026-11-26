---
name: "cli-anything-blender"
description: >-
  Agent-native Text-In / Text-Out CLI control for Blender 5.2.3 (`blender-launcher.exe`) paired with REA (`morluto/rea`) clean-room geometry specs and Remake style tokens. Use whenever any AI on the Council needs to generate, sculpt, rig, bake PBR materials, or export clean-room `.glb` 3D characters, weapons, bosses, or procedural city meshes for the DREAM Engine.
---

# `cli-anything-blender` — Headless Blender 5.2.3 + REA + Remake 3D Asset Pipeline

## Installed Local Paths on Alienware (`192.168.0.40`)
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

<!-- TROLLZ1004-SPINE:START -->
- `Repo: dream-online | Fleet: Alienware (192.168.0.40, workshop) & T5500 (192.168.0.15, front-of-house) | GitHub: Trollz1004 (ops/fleet/fleet-map.json).`
- `Spine: Trollz1004/dream-online docs/house/SPINE.md (pointers: ADDRESS-DOCTRINE.md, NODES.md, PIPELINE.md, TRUSTED-MODELS.md, THE-HOUSE.md).`
- `Address doctrine: use 192.168.0.40 and 192.168.0.15 from ops/fleet/fleet-map.json; never use loopback reach URLs; Postgres (port 5432), Redis (port 6379), and Obsidian REST (port 27123) bind "127.0.0.1" on their own machine only.`
- `Trusted three: Claude Opus 5.5 / Fable (Claude Code), Gemini 4 Carbon (agy), and GPT-6 Astra / GPT-6.1 Sol / Codex (Codex CLI); superpowers is in every kit on demand, while REA, remake, Agent-Reach, and last30days are locked to the trusted three.`
- `Pipeline: brainstorm first, route role + <=2 skills, build [A]/[B] with failing test first, expediter rubric + 5 stacked add-on PRs, Carbon + Codex judge, Fable / rotating trusted-three merges green checks.`
- `Starter kit MCP ("kit"): cmd.exe /d /c node "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\kit\server.mjs" (tools: map_search, map_section, memory_search, memory_add, role_get, method_get).`
- `First read: the house index, https://github.com/Trollz1004/dream-online/blob/main/docs/house/INDEX.md, then the newest rulings in the claude.ai project Ai-Dream-Team as the index describes.`
- `Funding comes first and game work is paused (ruled 2026-11-13).`
- `The wheel: tickets in the .fable-kitchen inbox on the Alienware; runner ops/router/inbox-runner.ts in dream-online; lane rules in orders/RULES.md in the kitchen.`
- `Merging (ruled 2026-11-16): nothing merges with a failing required check; platform and marketing changes need the checks plus one trusted review; game and engine work keeps two offerings and two judges; whoever merges looks at the files and leaves a one-line verdict.`
- `Public text passes the go gate: the product does what the text says, stop-slop plus a humanizer pass, only what is true, every outside fact links the exact page.`
- `Marketing team log: https://github.com/Trollz1004/ANTIGRAVITY/tree/main/marketing/team (public; nothing private goes in).`
<!-- TROLLZ1004-SPINE:END -->
