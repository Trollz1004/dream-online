# Day Dreams and Night Dreams: the world changes, the player does not

Status: founder direction, recorded 2026-09-20 by the Claude judge lane from Joshua's own words and reference pictures
Audience: Codex, Claude, world building, art direction, level design

## The rule

DREAM ONLINE has one world that is dreamed two ways.

- **Day Dreams** are the old world. Open fields, dry country, ruins, villages of stone. No city. Nothing modern of any kind.
- **Night Dreams** are a city. Towers, streets, lights.
- The player keeps everything across the change: the same skills, the same player-versus-player styles, the same crafting, the same outfits. **The landscape is what changes.** That change is what makes this DREAM ONLINE and not another open-world game.

This sits on top of `05-day-night-economy-market.md`, which already makes Day the safer, productive time and Nightfall the dangerous, profitable time, and on `00-vision.md`, which already speaks of a wilderness trail becoming city life. This document adds the look and the hard line: no modern thing by day, a city by night.

## What Day Dreams look like

From the founder's reference pictures, described in words:

- An abandoned old-world stone village at the end of the day. Ruined cottages with slate roofs, one or two still standing. Roofless walls with empty doorways.
- Dry-stone walls, half fallen. A rutted cart track of packed earth running between them.
- Bare trees, red-brown brush, dry grass. Dust in the air and mist lying in the low ground.
- A single mountain on the horizon. A low golden sun behind it, long shadows, a violet sky going dark.
- Palette: warm ochre, rust and gold in the light; cold blue-grey in the shadow. Most of the mood is the light.

## What Night Dreams look like

- A vast modern city seen as a wall of towers, dense to the horizon. The source is Epic's free City Sample for Unreal Engine 5.8, which the founder is downloading.
- The sample's own pictures are lit for daytime. In DREAM ONLINE the city belongs to the night: dark sky, lit windows, wet streets, signs.

## Characters

Realistic proportions and ornate, readable high-fantasy gear: layered leathers, engraved plate, large signature weapons and shields. The same outfit must read well against warm ruins by day and against city light by night.

## First thing to build

"The same place, dreamed twice." Two small maps with the same spawn point and the same playable character:

1. A Day Dream blockout: ground, ruin shapes, low golden sun, dust and mist, a mountain shape on the horizon.
2. A Night Dream blockout: tower shapes with lit windows, dark sky, street light. City Sample replaces the blockout when it is installed.

Each opens from its own shortcut. The founder decides from what he sees, not from documents.

## Originality rule (founder, 2026-09-20)

Every reference picture is there to give ideas and nothing more. DREAM ONLINE makes its own styles and takes no copyright risk over anything. The founder called this "very important".

- Never copy or trace a design from another game: no characters, outfits, creatures, names, logos, maps or interface.
- Never put a picture from another game into this repository or into the Unreal project.
- Never give such a picture to an image or model generator, as an input image or as a named style to imitate.
- Describe what is wanted in generic words (mood, palette, level of detail) and design from those words.
- If something made for DREAM looks recognisably like another game's work, it is changed before anyone sees it.

Properly licensed assets are a different matter: they may be used inside the project when their licence is followed, and even then the final look should become DREAM's own.

### The founder showing samples to a generator himself (founder, 2026-09-21)

The four rules above are how the lanes work. They are not a limit on Joshua. He
said in his own words that he wants to show reference samples to a generator to
develop DREAM's own character visuals, and that he wants to be sure of not
breaking a licence or anyone's terms. That is allowed and it carries no
contradiction with the rule, because the rule exists to protect the finished work
from looking like someone else's, not to stop him looking at things.

The two limits that are real, and the only two a lane should ever raise with him:

- A picture whose own licence forbids it. Fab and Epic listings carry an "Allows
  usage with AI" line, stored as `is_ai_forbidden` in the launcher's
  `FabLibrary\listings_v1.db`. A listing marked no is never given to a generator
  by anyone. Read that column before any generator work.
- A result that comes out looking like the source. Style and ideas are free to
  borrow; a specific character, logo, crest, name or layout is not. If an output
  is recognisable as another game's, it is redrawn.

Ordinary screenshots of a website or a game, used as a mood reference to make
something different, sit outside both limits.

## What exists (2026-09-20)

Two blockout maps made only from Unreal's basic shapes, lights, sky and fog, generated by `game/unreal/scripts/build_dream_maps.py` and checked by `verify_dream_maps.py` (run both with `game/unreal/Build-DreamMaps.ps1`):

- `Lvl_DayDream`: ruined and intact stone cottages, broken dry-stone walls, bare trees, brush, an earth track, a far ridge of peaks, a low sun behind the player's shoulder throwing long shadows toward the ridge.
- `Lvl_NightDream`: the same spot as a city: towers with grids of lit windows in warm and cool tones, sign strips, warm street lamps, a wet reflective street, a dark sky.

Both use the same spawn point and the same playable character. `game/unreal/Open-DreamDay.cmd` and `Open-DreamNight.cmd` open them.

## Rules for assets

- Assets from Fab and from Epic's samples are used inside the Unreal project only. They are never committed to this public repository; `game/unreal/DreamOnline/Content/` is git-ignored and rebuilt or re-imported locally.
- An asset whose Fab page says "Allows usage with AI: No" is never given to an image or model generator.
- Reference pictures from other studios' games are studied for generic qualities only (level of detail, mood) and never stored in this repository. No other game is named in player-facing copy.
