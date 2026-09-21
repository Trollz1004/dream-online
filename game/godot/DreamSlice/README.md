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
static host with no cross-origin isolation headers, and it drops the sun's
shadows and multisampling because a browser pays for both every frame on one
thread. The readout says the frame rate, so any change that costs something can
be read off the screen.

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

The dummy winds up for 1.4 seconds, then fires along the line it locked at the
start of the wind-up. Dash through the beam while the character is bright yellow
and you take nothing. Dash too early or too late and the recovery, shown in red,
is wide open.

## Run the tests

```
godot --headless --path game/godot/DreamSlice --script res://tests/run_tests.gd
```

87 checks cover the dash frame windows, the stamina and cooldown gates, the
combo grammar including the rule that the Shift is part of the key set, the
light attack chain, the world event envelope, and the readout.

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

Placeholder: every shape and colour, the single dummy, and the skills that only
print their name. Art arrives under the originality rule in
`docs/gdd/08-day-dreams-night-dreams-world.md`.
