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
