# Implementation Plan: The tutorial slice, worthy of the judge lane's name

**Branch**: `005-tutorial-slice` | **Date**: 2026-09-28 | **Spec**: `specs/005-tutorial-slice/spec.md`

**Input**: Feature specification from `specs/005-tutorial-slice/spec.md`

**Note**: written by the Claude judge lane in the cloud session, from Joshua's goal of 2026-09-28, following the `/speckit-plan` template. File and line references were read from `main` on 2026-09-28.

## Summary

Turn `game/godot/DreamSlice` into the game's tutorial, visuals first. Move every environment setting into a render profile per world and platform so the headless suite can check it; raise the browser build's look (shadows, sky detail, glow, a wet-street reflection the browser can draw) with a named fallback for everything the browser renderer lacks; give the hero a rim light and a better chase framing; replace the text-column HUD with the dark see-through style; add a small tutorial director that walks the eleven beats of `docs/gdd/01a-first-15-minute-journey.md` by showing; place Ember on the route and keep GeminEYE at the shoulder; add the combo list screen. Grade the result against the spec's Screenshot bar from frames captured by a Playwright script against the exported web build.

## Technical Context

**Language/Version**: GDScript, Godot 4.7.2 stable; the capture script is Node (Playwright 1.56).

**Renderers**: the desktop build runs Forward+ (`project.godot`, `config/features` "Forward Plus", 2x MSAA). The web build is the single-threaded "Web" preset (`export_presets.cfg`, `variant/thread_support=false`, `variant/extensions_support=false`) and runs on the **Compatibility renderer over WebGL 2**, because `project.godot` sets no web rendering method and the web platform cannot run Forward+. The graded frame comes from that renderer, so it sets the floor.

**Primary Dependencies**: none new at runtime. CC0 or original art only (spec FR-019).

**Storage**: `user://` files for the checkpoint save (new) and the hotbar layout (existing `user://hud_layout.cfg`).

**Testing**: the headless suite (`godot --headless --path game/godot/DreamSlice --script res://tests/run_tests.gd`), floor 789, raised by every check added; frames graded by the judge lane.

**Performance Goals**: web build at least 50 frames per second at 1920x1080 on real hardware (spec SC-005); desktop 60 on the RX 6800. Never measured from the software-rendered capture.

**Constraints**: `MINIMUM_CHECKS` never lowered; no competitor names; NEEDs never a real-money benefit; the tutorial never mocks the player; assets within spec 003's roughly 80 MB budget; the `--demo` path's expensive settings (`scripts/demo_director.gd`, `_apply_demo_quality`) stay demo-only.

## Constitution Check

- **Founder locks**: combat frame data, the combo grammar and the dash rules are not changed; the tutorial teaches them as ruled in `docs/gdd/02-action-combat.md`. Mireth stays the one guide; Ember takes no guide slot (01a ruling).
- **Test first**: every new script lands with its checks in the same change; the floor rises, never falls.
- **Spec first, small slices**: the phases below each leave a playable, gradable build.
- **Evidence over assumptions**: which Compatibility features 4.7.2 actually draws is measured by capture in Phase 0 (T003) before the render table is trusted; every visual claim is a graded frame.
- **Public surface**: no secrets, no vault material; Ember's public layer only (02-action-combat.md, bosses).

No violation; the Complexity Tracking table stays empty.

## What exists, and where (grep of `scripts/` on 2026-09-28)

| Concern | File | Where |
|---|---|---|
| WorldEnvironment, sky, fog, day sun | `scripts/dream_env.gd` | `_build_day_environment` (about line 1028); desktop-only glow, SSAO and volumetric fog behind `OS.has_feature("web")`; `sun.shadow_enabled = not OS.has_feature("web")` |
| Clouds | `scripts/dream_env.gd` | `_build_sky_clouds` (after line 1125), a noise-textured plane |
| Night environment, moon | `scripts/dream_env.gd` | `_build_night_environment` (about line 2115); SSR desktop only; no star field exists |
| Wet street | `scripts/dream_env.gd` | `_street_material` (about line 2499), roughness 0.18, relies on SSR |
| Spawn, enemy, Mireth spots | `scripts/dream_env.gd` | `PLAYER_SPAWN`, `ENEMY_SPOT`, `MIRETH_SPOT`, `CLEAR_RADIUS` constants |
| Camera, fill light | `scripts/player.gd` | `SpringArm3D` length 4.2 at height 1.4 (`_ready`), `_build_fill_light` (camera-parented SpotLight3D), `set_camera_distance` |
| HUD readout, help block, bottom bar | `scripts/hud.gd` | `_ready` builds a column of large text lines and the five-line `_help` label (about 430 characters); `_build_cinematic_bar` builds the thin bars and six cooldown slots, hidden unless `set_cinematic(true)` |
| Hotbar | `scripts/keyboard_panel.gd`, `hotbar_layout.gd`, `keycap.gd`, `consumables.gd` | `DEFAULT_POSITION := Vector2(24, 460)` overlaps the help lines at 1280x720 (journal, 2026-09-27); icons are plain dots |
| Hollow Sentinel | `scripts/dummy.gd` | `TELEGRAPH := 1.4`, `CYCLE := 4.2`, `_wind_up` |
| Mireth | `scripts/npc.gd`, wired in `scripts/world.gd` | lines and `player.npc` set in `world.gd` `_ready`; memory in `scripts/npc_memory.gd`, panel in `scripts/memory_panel.gd` |
| GeminEYE | `scripts/pet.gd`, `pet_state.gd`, `pet_shop.gd`, `pet_shop_panel.gd` | `SHOULDER_OFFSET`, created in `world.gd` |
| World events | `scripts/world_event.gd` | envelope builder, schema 0.1.0 |
| Combo resolution | `scripts/combo.gd` | key set to skill name |
| Demo camera and quality | `scripts/demo_director.gd` | `_apply_demo_quality`, `_set_dof` |
| Web stamp label | `.github/scripts/stamp_demo.py` | fixed `#dream-real-slice` div, top right |

## Render profile, and the table of fallbacks

New `scripts/render_profile.gd`: a pure, static `profile(world: String, web: bool) -> Dictionary` holding every environment, light and material setting `dream_env.gd` applies. `dream_env.gd` reads from it instead of hard-coding values behind `OS.has_feature("web")`, so the suite can check both platforms' profiles in one headless run. The Phase 0 capture (T003) confirms each "web" cell below on the real Compatibility renderer before Phase 1 relies on it; any cell that fails drops to its fallback.

| Look | Desktop (Forward+) | Web (Compatibility) | Named fallback if the web cell does not draw or costs too much |
|---|---|---|---|
| Key light shadows | on, PSSM 4 splits, soft | on, PSSM 2 splits, `directional_shadow_max_distance` about 40 m, 2048 atlas | blob shadows: a soft dark radial quad under the hero, Sentinel, Mireth, Ember and each tree |
| Sky | ProceduralSkyMaterial gradient + cloud plane | same | none needed |
| Stars (night) | new star field: a MultiMesh of small unshaded points on a far dome | same | none needed |
| Depth and height fog, aerial perspective | on | on | distant haze cards (large transparent gradient planes) between mid and far ground |
| Tonemap and grade | AgX, per-world adjustments | AgX and adjustments if drawn | Filmic tonemap; the grade baked into material tints |
| Glow | on | on if drawn | additive soft-circle billboards on lamps, signs, eyes and Ember's core |
| Ambient occlusion | SSAO | none | contact darkening baked into the ground shader around registered footprints (`_register_footprint`) |
| Volumetric fog, light shafts | on | none | additive light-shaft cards under night lamps and through day ruins |
| Wet-street reflection | SSR on the low-roughness street | a ReflectionProbe over the street if drawn | a mirrored reflection layer: flipped, dimmed emissive copies of signs and windows under a semi-transparent streaked street overlay |
| Anti-aliasing | 2x MSAA (4x plus TAA in `--demo`) | FXAA if drawn | none |
| Hero rim | material rim on the character's materials plus a back light on the camera rig | same | none needed |

## Camera and character read

- `player.gd`: raise the default chase framing to put the hero low and off-centre (spring about 5.0 m, mount 1.6 m, pitch a few degrees down, a small shoulder offset), keep `set_camera_distance` and the capture flags; the spawn yaw faces the landmark and exit path.
- Add a rim: enable `rim_enabled` on the hero's materials in `character_model.gd` (Compatibility draws material rim), and a second weak back light on the camera rig aimed at the hero from behind. The existing fill light stays.
- Bring the hero's value off the ground's: a slightly lighter cloak edge or darker ground immediately around spawn, whichever the Phase 3 frame shows is needed.

## HUD cleanup

- `hud.gd`: the text readout column is built as today (its getters stay for the tests) but hidden by default; the bottom bar from `_build_cinematic_bar` becomes the default play HUD, on a dark see-through `StyleBoxFlat` panel; the frame-rate line stays visible, small, bottom right (spec 004 FR-006 and SC-003); the `_help` block moves into the combo list screen.
- New one-line prompt label, bottom centre above the bar, on the same panel style, 90 characters maximum, owned by the tutorial director.
- `keyboard_panel.gd` and `hotbar_layout.gd`: new default position anchored bottom left, clear of the prompt and bar at 1280x720 and 1920x1080; `clamp_position` also keeps a restored saved position out of the prompt's rectangle. A pure `layout_rects(viewport_size)` returns every HUD rectangle so the suite checks no overlap at both sizes.
- `keycap.gd`: real icons drawn in code (a red bottle, a blue bottle, bread, skill glyphs) instead of dots.
- The "Click to look around." hint moves onto the prompt panel's style.
- New `scripts/combo_list_panel.gd`: the three-column see-through screen of `09-interface-style.md`, opened with L (free in the grammar and the controls), listing every combination `combo.gd` resolves with keys, a plain sentence and its defensive tag; stubs say "not yet in this build".

## Tutorial director

New `scripts/tutorial_beats.gd` (pure data) and `scripts/tutorial_director.gd` (a Node, created by `world.gd` unless `--demo` or `--no-tutorial` is passed). States, in order: `SPAWN`, `MOVE`, `SPRINT`, `DASH`, `LIGHT_CHAIN`, `HEAVY`, `GUARD`, `GATHER`, `WORLD_EVENT`, `MIRETH`, `CHECKPOINT`, then `FREE`. Each beat holds one prompt, a world cue and a completion test:

| Beat | Prompt (example, world-native) | World cue | Completes on |
|---|---|---|---|
| SPAWN | none for three seconds; the frame speaks | camp fire, landmark lit ahead | three seconds or any move |
| MOVE | "W A S D to walk. The mouse looks." | a ground marker on the road | player moves 4 m |
| SPRINT | "Hold Shift with a direction to run." | Shift keycap lit | one second of sprint (`movement.gd` state) |
| DASH | "Watch its eye. Shift, a direction, then F as it fires." | Sentinel wind-up glow, Shift and F keycaps lit | `perfect_dodge_confirmed` |
| LIGHT_CHAIN | "Left mouse, three times. The strikes flow as one." | mouse glyph lit | third chain step lands |
| HEAVY | "Right mouse strikes slower and harder." | mouse glyph lit | `heavy_hit_landed` |
| GUARD | "Q alone holds a guard." | Q keycap lit | a beam blocked by the guard |
| GATHER | "That bloom will fade soon. Gather once with E." | the node glows | node `gathered` |
| WORLD_EVENT | none; the world changes | bloom or gate flicker near the route | the event envelope reaches active |
| MIRETH | "Mireth is waiting at camp." | marker at Mireth | `talked` after the event, with recall |
| CHECKPOINT | "Rest by the fire to keep what you carry." | the fire brightens | save written |

The director listens to signals that already exist (`perfect_dodge_confirmed`, `heavy_hit_landed`, `skill_used`, `talked`, `defeated`) plus new ones from the gather node and the checkpoint; a beat done out of order is recorded and skipped later. Retry prompts after a failure are neutral ("Again. Watch its eye.").

New world pieces: `scripts/gather_node.gd` (a CC0 or code-built bloom plant: available, cooldown, saved), a resource-bloom world event on the route using `world_event.gd`, and `scripts/checkpoint_save.gd` (a `ConfigFile` at `user://tutorial_save.cfg`). Positions are new constants in `dream_env.gd`, registered with `_register_footprint` so scenery stays clear, in both worlds.

## Ember and GeminEYE

- New `scripts/ember.gd`: an original figure, a small hooded body around a sphere of emissive light too large for it, an OmniLight, and a flickering bleed whose strength is the tell. Placed at a fixed route spot between the gather node and the event, outside `CLEAR_RADIUS` and `MIRETH_CLEAR_RADIUS`. No nameplate, no interact prompt, never named in any prompt. When the player comes within range and the bleed peaks, he may leave with one line from a fixed list in `ember.gd` and returns on reload.
- GeminEYE is unchanged: `pet.gd` keeps the shoulder offset; its eye gets the glow or billboard from the render table.

## Test additions (each file loaded from `tests/run_tests.gd`)

| File | Checks, in outline |
|---|---|
| `tests/test_render_profile.gd` | both worlds times both platforms: fog, height fog, tonemap, grade, shadows on, star field (night), reflection source (night), glow or billboard fallback, rim; one WorldEnvironment and one DirectionalLight3D built |
| `tests/test_tutorial_director.gd` | beat order; one advance per completion; out-of-order completion; prompts at most 90 characters; no prompt names Ember; neutral retry lines contain none of a banned-word list |
| `tests/test_gather_and_checkpoint.gd` | node available, gathered, cooldown; save and reload round trip of every FR-013 field |
| `tests/test_ember.gd` | node present in both worlds, outside the clear radii, has an emissive core and a light, has no Label child; departure lines come from the fixed list |
| `tests/test_combo_list.gd` | one row per resolved skill, defensive tag present, stubs marked |
| additions to `tests/test_hud.gd` and `tests/test_keyboard_hotbar.gd` | help block hidden by default; at most two tutorial lines visible; no visible HUD label over 90 characters; `layout_rects` has no overlap at 1280x720 and 1920x1080, including a restored saved position; no keycap uses the dot icon |

`MINIMUM_CHECKS` rises by the exact number of checks these add, in the same commit.

## Screenshot capture procedure

1. **Export**, as `.github/workflows/demo-pages.yml` and spec 004 already do: the Godot 4.7.2 Linux binary; `.github/scripts/fetch_web_template.py` for `web_nothreads_release.zip` only; `godot --headless --path game/godot/DreamSlice --import`; `godot --headless --path game/godot/DreamSlice --export-release "Web" ../../../build/web/index.html`; `.github/scripts/stamp_demo.py` for the real-slice label. `build/` stays git-ignored.
2. **Serve**: `python3 -m http.server 8099 --bind 127.0.0.1 --directory build/web`.
3. **Ready signal**: on the web, `world.gd` reads `dream` (and nothing else) from `location.search` through `JavaScriptBridge`, and after the spawn frame has rendered stably for a fixed number of frames (not seconds, since software rendering runs near 1 frame per second) sets `window.dreamFrameReady = true`.
4. **Shoot**: new `.github/scripts/shoot_demo.mjs` launches Playwright's headless Chromium with software WebGL 2 (`--use-angle=swiftshader`, `--enable-unsafe-swiftshader`), opens `?dream=day` and `?dream=night` at 1920x1080 and 1280x720, waits for `dreamFrameReady` (180 s timeout), records console errors and failed requests, and saves `<world>-<width>x<height>-<commit>.png` into the session scratchpad or `C:\DREAM\recon\` on the node, never into the repository.
5. **Grade**: the judge lane opens every frame and answers SB-01 to SB-15; the grade, the paths and the commit go into `ops/node/JOURNAL.md`. A description of a frame is never accepted in place of the frame.
6. **Real hardware**: Joshua (or the node lane) reads the frame-rate line in a real browser for SC-005; the capture above never supplies that number.

## Project Structure

```text
specs/005-tutorial-slice/{spec.md, plan.md, tasks.md}
game/godot/DreamSlice/scripts/  render_profile.gd, tutorial_beats.gd, tutorial_director.gd, gather_node.gd,
                                checkpoint_save.gd, ember.gd, combo_list_panel.gd   (new)
                                dream_env.gd, player.gd, character_model.gd, hud.gd, keyboard_panel.gd,
                                hotbar_layout.gd, keycap.gd, dummy.gd, world.gd, npc.gd, pet.gd   (changed)
game/godot/DreamSlice/tests/    test_render_profile.gd, test_tutorial_director.gd, test_gather_and_checkpoint.gd,
                                test_ember.gd, test_combo_list.gd (new); run_tests.gd, test_hud.gd,
                                test_keyboard_hotbar.gd (changed)
.github/scripts/shoot_demo.mjs  (new)
```

Each new `.gd` file gets its `.uid` sidecar from a headless import pass before it is committed (journal, 2026-09-26).

## Complexity Tracking

*No entries: the Constitution Check above found no violation to justify.*
