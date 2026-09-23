# Integration and demo director card (spec 002)

Approver: Claude judge lane (Opus), Alienware node. You are the integrator. Everything in `specs/002-crowdfunding-demo/spec.md` is the goal. The pieces already built on this branch are these:

- `scripts/character_model.gd` (kinds: dreamwalker, keeper, sentinel; `update_pose`, `set_time_of_day`, blade hooks)
- `scripts/dream_env.gd` (`mode` is day or night; it builds sky, light, ground and scenery)
- `scripts/npc_memory.gd` and `scripts/memory_panel.gd` (record/recall against the Live NPC Lab on 9127, with a local fallback)
- `scripts/lunge_state.gd`, `scripts/burst_state.gd`, `scripts/vfx.gd`, and `scripts/SKILLS_WIRING.md`

Read every one of them before you change anything.

## Part 1: wire the game (it stays playable by hand)

1. `world.gd` stops building its own sky, ground and scenery. It adds a `dream_env.gd` node instead. `--dream day|night` picks the mode, and day is the default. Add `func nightfall(duration)`: it fades a full-screen dark overlay in, frees the day env, adds the night env, calls `set_time_of_day("night")` on every character model, and fades back out. Keep the `--capture`, `--at`, `--move` and `--yaw` flags working.
2. `player.gd`: replace the capsule and nose with `character_model.gd` kind dreamwalker, parented under `_visual` so the facing logic still works. Every physics frame, feed `update_pose` with the speed, the sprint flag, and the current action and its progress from the dash, attack, heavy, guard, lunge and burst states (and hit when it takes damage). Drop `_tint()`, or move the invulnerability flash onto the model (a gold rim during i-frames). Wire the new skills exactly as `SKILLS_WIRING.md` says: W+F is the lunge, and R is the burst. Spawn the vfx on every swing, heavy, lunge, burst, hit, perfect dodge and damage number. Add a small camera shake on a heavy hit and on the burst.
3. `npc.gd`: the model is `character_model.gd` kind keeper, idling, and she turns to face the player when talked to.
4. `dummy.gd`: the model is `character_model.gd` kind sentinel. It keeps the beam logic and uses `vfx.beam_telegraph` and `vfx.beam_fire`. Name it "Hollow Sentinel" in the HUD. When its health reaches 0 it plays `down`, then rises again after 4 s at full health.
5. Memory: the world owns one `npc_memory.gd` node and one `memory_panel.gd`.
   - Record `perfect_dodge`, `heavy_hit` (with `damage`), `skill_used` (with `skill`: "Dream Lunge" or "Nightveil Burst"), `sentinel_defeated` and `talked`, each with the right `timeOfDay`. Record only while Mireth is within 25 m of the player (she is the witness), and call `memory_panel.show_stored("...")` with a short line each time.
   - When the player talks to Mireth at night, call `recall("mireth")`. Then show the composed line from `compose_line` and call `memory_panel.show_recalled(lines, source)`.
   - The `recall` call blocks for up to 3 s, so run it during the nightfall fade, not mid-fight. Cache the result for the night conversation.
6. The HUD: keep it, and add the hotbar lines for Lunge and Burst with their cooldowns. Add `hud.set_cinematic(true)`: it hides the debug-ish help text and the status column, but keeps the health, stamina and hotbar small at the bottom, plus the event line and captions.
7. Tests: update the existing tests that assumed the capsule, and add tests for the lunge and burst wiring through `player.gd` (the combo string maps to the right state; stamina is spent). The whole `run_tests.gd` must pass, and MINIMUM_CHECKS goes up only.

## Part 2: the demo director

`scripts/demo_director.gd` is started by the `--demo` flag. It needs `player.capture_mode = true` and the scripted input fields, and it drives the player by calling methods directly (add small public methods on the player such as `demo_move(vec)`, `demo_face(yaw)` and `demo_skill(direction, shift, key)`, all going through the same `_try_skill` code path). No fake OS input. It owns a camera rig for the cinematic shots: smooth cuts between the player camera and a few framed shots, with slow orbit and dolly moves. It shows caption text in a clean, thin, white type at the lower third (one caption at a time, fading in and out). It resets the local memory store and uses the lab (make sure the lab has the new `world_event` scope; if it does not answer, the fallback is fine, but log which one was used).

The timeline is about 80 s. The times are guides, so adjust for feel.

- 0 to 3 s: the player camera is already moving. The Dreamwalker runs up the cart track through the ruins at golden hour. A caption, small: "DREAM ONLINE - pre-alpha gameplay, captured in engine".
- 3 to 9 s: a framed shot as the player reaches Mireth and presses E. Her line (from the day compose) appears. The memory panel shows "Mireth will remember: you spoke with her".
- 9 to 32 s: the fight with the Hollow Sentinel. Walk in. The beam telegraph, then a dash through it: PERFECT DODGE, with its flash. The panel stores it. Then the light chain 1-2-3 (hitting), a heavy cleave (a big number, a shake; stored), a guard block against the next beam (BLOCKED), then a Dream Lunge from about 7 m (stored), and a second perfect dodge. The Nightveil Burst finishes it: the Sentinel goes down (stored). Captions come sparingly: "Action combat: every skill is a key combination", "Perfect dodge - invulnerable through the dash".
- 32 to 36 s: a slow orbit around the player standing among the ruins. Caption: "Mireth saw all of it. She will remember."
- 36 to 42 s: Nightfall. The sky darkens, a fade to black, and the Night Dream city fades in at the same spot. Caption: "Nightfall. The landscape changes. You don't." The recall happens during the black.
- 42 to 50 s: a framed establishing shot of the city (a crane up from street level through the lamps and the wet reflections).
- 50 to 60 s: the player walks to Mireth, who is now standing under a street lamp, and talks. Her night line, built from the recalled facts, appears. The panel shows "Mireth remembers" with the recalled bullet list and "from world memory - Live NPC Lab". Hold long enough to read it: about 7 s.
- 60 to 74 s: a short night fight against the Sentinel with its violet eye: a lunge, the chain, a perfect dodge and the burst, lit by the city.
- 74 to 80 s: an end card over a slow night pan: "DREAM ONLINE", then "Pre-alpha. Every frame in engine. Characters, world and memory built by AI." Then quit.

## Recording

`game/godot/Record-Demo.cmd` runs `godot --path <slice> --write-movie <slice>\demo\dream-demo.avi --fixed-fps 30 --resolution 1920x1080 -- --demo`. Then it runs `ffmpeg -y -i ...avi -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p ...mp4` and deletes the AVI. Add `game/godot/*/demo/` to `.gitignore`. Use CRLF and plain ASCII in the .cmd file.

## Proof you must bring back

- The full test pass line.
- The MP4 path, its length (from ffprobe), and 8 frames pulled with ffmpeg at 2, 6, 15, 25, 38, 46, 55 and 70 s into the scratchpad as PNGs. LOOK at every one yourself with the Read tool and fix what looks wrong before reporting: a character clipping into the ground, a caption over the panel, black frames, a camera inside a wall, text cut off.
- Which memory source was used in the recorded run.

## Rules

Commit on your branch with an explicit pathspec and `git -c user.name="Joshua Coleman" -c user.email="132442315+Trollz1004@users.noreply.github.com" commit`, ending the message with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Never push. Never touch `ops/node`. Write files with the Write tool, not shell heredocs.
