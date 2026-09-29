# DREAM ONLINE combat slice (Godot 4)

The first playable piece of DREAM combat. It exists to make one thing feel right
before anything is built on top of it: the dash with invulnerability frames,
timed against a telegraphed attack.

Joshua chose Godot on 2026-09-20 after the Unreal path stalled. The reason is
practical rather than aesthetic: GDScript and scene data are text, so this lane
writes, runs, tests and photographs the game with no compiler and nothing for
anyone to click in an editor. Unreal stays parked, not deleted.

## Open it

Double-click `game\godot\Open-DreamSlice.cmd`, or the desktop shortcut
"DREAM Combat Slice". Nothing else has to be running.

## Or play it in a browser

Double-click `game\godot\Serve-DreamSlice-Web.cmd`. It opens
`http://localhost:8099` and serves the browser build from `build\web`, which is
not in the repository. Leave that window open while you play and close it to
stop. If the folder is empty, run `game\godot\Export-DreamSlice-Web.cmd` first;
it takes about a minute.

The browser build is deliberately single-threaded, so it runs on any plain
static host with no cross-origin isolation headers. It runs on Godot's
Compatibility renderer, and since spec 005 (2026-09-28) every visual setting
comes from `scripts/render_profile.gd`, one profile per world and platform: the
browser keeps the sun and moon shadows, the sky, the fog, glow and the hero's
rim, and the effects that renderer cannot draw (ambient occlusion, volumetric
fog, screen-space reflections) are replaced by named fallbacks (contact
darkening, haze bands, light cones, a mirrored wet-street layer) rather than
dropped. The frame-rate pill at the bottom right says the frame rate, so any
change that costs something can be read off the screen.

## Controls

They follow the rulings in `docs/gdd/02-action-combat.md`.

- **Move**: W, A, S, D. The mouse looks. Escape frees the mouse.
- **Sprint**: hold Shift with a direction. A direction with Shift is movement and
  never a skill.
- **Auto-sprint**: double tap a direction, so a long walk needs no keys held.
- **Dash with invulnerability frames**: hold Shift and a direction, then press an
  action key (Q, E, R, F, Z, C, or a mouse button).
- **A skill without Shift is a different skill**: a direction and F on its own is
  its own combination, and the screen names it when you press it.
- **Light attack**: left mouse button. **Heavy attack**: right mouse, slower and
  harder. **Guard**: Q alone, blocks most of a hit but opens you up right after.
- **Dream Lunge**: hold W and press F. **Nightveil Burst**: R. **Nightfall**: N.
- **Talk**: E when the screen says Mireth is near.
- **Pet shop**: P (the GeminEYE looting pet, a demo NEEDs purchase). **Hotbar**:
  1 to 3 for the red potion, the blue potion and food; the keyboard panel can be
  dragged.

- **Combo list**: L opens the dark see-through three-column screen that lists
  every combination the build resolves, in plain words, with its defensive tag,
  and marks the stubs honestly. The play screen itself carries no help block any
  more; a short prompt band under the character says at most two lines.

`scripts/combo_list.gd` is the source of truth when this list and the screen
disagree.

The dummy winds up for 1.4 seconds, then fires along the line it locked at the
start of the wind-up. Dash through the beam while the character is bright yellow
and you take nothing. Dash too early or too late and the recovery, shown in red,
is wide open.

## Run the tests

```
godot --headless --path game/godot/DreamSlice --script res://tests/run_tests.gd
```

The floor is `MINIMUM_CHECKS` in `tests/run_tests.gd` (789 as of 2026-09-25,
last run 789 of 789 on `main`). The checks cover the dash frame windows, the
stamina and cooldown gates, the combo grammar including the rule that the Shift
is part of the key set, the light attack chain, the heavy attack, the guard, the
world event envelope, Mireth and her memory link (with the Live NPC Lab down as
well as up), the demo director, the character model, the environment, the
side-screen capture, the GeminEYE pet, the keyboard hotbar, and the readout.

The runner also fails when fewer checks run than it expects. A GDScript error
inside a test function aborts that function and returns here as though nothing
had happened, so a whole suite can be skipped in silence and still report
success. Raise `MINIMUM_CHECKS` in `tests/run_tests.gd` when checks are added;
never lower it to make a run pass.

## Take a picture

```
godot --path game/godot/DreamSlice -- --capture C:/DREAM/recon/shot.png --at 4.05
```

`--at` is the second at which the frame is taken, which is how the wind-up and
the firing beam are checked without anyone watching the screen. The lane opens
the picture itself; a description of an image is never accepted in place of the
image.

## What is real and what is a placeholder

Real: the frame windows, the stamina cost, the cooldown, the aim lock at the
start of the wind-up, the hit test, and the grammar that decides which key set is
which skill. All of it is plain data and geometry, so the same rules can run on
the server later, which is where invulnerability has to be decided.

Real since spec 003 (2026-09-24 and 2026-09-25): a rigged CC0 character with
animations and the ranger outfit Joshua chose, CC0 ground textures, trees and
ruins, a ridged mountain, and the Night Dream city with rain, crowds and traffic
(`assets/third_party/LICENSES.md` names every source). Real since spec 005 (2026-09-28): the render profiles with their browser
fallbacks, a chase camera with the hero off centre, a rim light and a leather
shield, code-drawn hotbar icons, the calm play screen and the combo list on L.
Still placeholder: the pet's loot gems and eye, the Sentinel's beam and charge
orb, the single dummy, the cone mountains and stick trees of the day field, the
box towers of the night city, and the skills that only print their name. Art keeps arriving under the originality rule in
`docs/gdd/08-day-dreams-night-dreams-world.md`.
