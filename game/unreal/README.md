# DreamOnline test zone

This folder holds a Blueprint-only Unreal Engine 5.8.2 test project called
DreamOnline: a playable third-person combat zone to poke at while the real
DREAM ONLINE game is designed, built from Epic's installed Third Person
Blueprint template plus that template's Combat variant.

Epic's Unreal Engine End User License Agreement forbids redistributing
engine template content outside of a project built with a licensed copy of
the engine. This repository is public, so the project's `Content` folder,
and everything else generated under `game/unreal/DreamOnline`, is listed
in `.gitignore` and never committed. What is committed instead is the
script that rebuilds it locally from the engine already installed at
`C:\DREAM\UE_5.8`.

## Rebuilding the project

Run this from the repository root on a machine with Unreal Engine 5.8
installed at `C:\DREAM\UE_5.8`:

    powershell -NoProfile -ExecutionPolicy Bypass -File game\unreal\New-DreamTestZone.ps1

Add `-Force` to rebuild over an existing project; the old folder is renamed
to a timestamped backup beside it and is never deleted.

## Opening the zone

Run `game\unreal\Open-DreamTestZone.cmd`. It checks that both the engine
and the built project exist, then launches the Combat map in a windowed
game session. It does not open the full editor.

## Controls

The Combat variant defines these input actions: move, look (mouse and
gamepad), jump, a combo melee attack, a charged attack, and a button to
toggle which side the camera sits on. Those are the action names the
Combat pack ships; the exact keys and buttons bound to each one live
inside a binary input mapping asset and were not read for this document,
so they are not listed here.

## Day Dream and Night Dream

"The same place, dreamed twice" (`docs/gdd/08-day-dreams-night-dreams-world.md`):
two small blockout maps sharing one spawn point and one playable character,
built entirely from engine content (`/Engine/BasicShapes/Cube|Sphere|Cylinder|Cone|Plane`,
engine lights, sky and fog actors) plus materials created by script. Nothing
here is hand-placed in the editor; the maps and their materials are code, so
they rebuild identically every time and never need a real level designer's
edits committed to git.

- `/Game/Dream/Maps/Lvl_DayDream`: an abandoned old-world stone village at
  the end of the day. A rutted earth track runs out from the spawn through
  a handful of ruined and one intact cottage, past broken dry-stone walls
  and bare trees, toward a dark mountain silhouette with a low warm sun
  behind it.
- `/Game/Dream/Maps/Lvl_NightDream`: the same footprint as a lit city at
  night. A grid of towers with a procedural lit-window pattern in their
  emissive channel (three material variants: warm, cool, sparse) lines a
  street lit by lamps, with magenta and cyan sign strips and a dark glossy
  wet-look street.
- Both maps share one `PlayerStart` at the same location and rotation, and
  both override the World Settings game mode to
  `/Game/Variant_Combat/Blueprints/BP_CombatGameMode.BP_CombatGameMode_C`,
  so the existing third-person combat character spawns in each.

### Rebuilding the maps

Requires the project already built by `New-DreamTestZone.ps1` (Day/Night
build needs the `PythonScriptPlugin` and `EditorScriptingUtilities` plugins,
which that script's `.uproject` writer now enables alongside the two
existing plugins). From the repository root:

    powershell -NoProfile -ExecutionPolicy Bypass -File game\unreal\Build-DreamMaps.ps1

This runs `game/unreal/scripts/build_dream_maps.py` through the editor to
create and save both maps and every material under `/Game/Dream/Materials`
(deleting and recreating that folder each run; nothing else under `/Game`
is touched), then runs `game/unreal/scripts/verify_dream_maps.py` to load
them back and check the art-direction rules from the 002B card, writing
`C:\DREAM\recon\002B-verify.json`. The script exits with the verify step's
pass/fail code.

### Opening the maps

Run `game\unreal\Open-DreamDay.cmd` or `game\unreal\Open-DreamNight.cmd`.
Each checks that the engine, the project and that specific map exist, then
launches it in a windowed game session (not the full editor). If the map
is missing, it tells you to run `Build-DreamMaps.ps1` first.

### What these are, and are not

Both maps are blockouts: every shape is an engine primitive, scaled,
rotated and jittered by script, not a piece of hand-authored art. They
exist to let the founder judge the art direction (a warm sunset ruin by
day, a lit city by night) from something playable, before any real
environment art is built. `game/unreal/DreamOnline/Content/` is
git-ignored, so the `.umap`/`.uasset` files these scripts produce are never
committed; the Python scripts under `game/unreal/scripts/` are the source
of truth and are safe to re-run at any time.
