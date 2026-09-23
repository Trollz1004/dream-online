# Spec 002: the crowdfunding demo video

Status: in progress, set 2026-09-23 by the Claude judge lane on Joshua's own goal: "get to the crowd funding demo video with an actual char designed and skills working with the memory aspects ... a day and night scene in the demo." He handed the design to this lane instead of Gemini.

## What ships

A recorded video of 60 to 90 seconds, `game/godot/DreamSlice/demo/dream-demo.mp4` (the video file is git-ignored; the recipe to make it is committed), rendered from the real Godot slice, with every frame played by the game engine. It is labelled pre-alpha. Nothing in it is painted over, and no sample or licensed asset shown as DREAM's own.

It shows, in order:

1. **Day Dream**, from the very first second: the player character runs through a ruined old-world stone village at golden hour. They talk to Mireth, who asks them to prove they can read the Sentinel's beam.
2. **Skills that work.** Against the Hollow Sentinel, with its telegraphed beam: a perfect dodge through the beam, the light chain, a heavy cleave, a guard block, and two new skills, Dream Lunge and Nightveil Burst. Each has its own animation and effect, and damage numbers.
3. **Memory.** Each thing Mireth witnesses is written into world memory (the Live NPC Lab on port 9127, with a local file when the lab is down). A small panel shows it being stored: "Mireth will remember".
4. **Nightfall.** The sky darkens and the landscape changes. The player does not: the same spot becomes the Night Dream city of towers, lit windows, a wet street and lamps.
5. **Night Dream, memory paying off.** Mireth is there too. She speaks a line built from what she remembers of the day, and the panel shows the memories she recalled, read back from world memory. A short fight with the night Sentinel shows the same skills lit by the city.
6. An end card: DREAM ONLINE, pre-alpha, in-engine footage.

## The character (designed here, original)

**The Dreamwalker**, the player. Realistic proportions (about 1.8 m tall) and readable high-fantasy gear, per `docs/gdd/08-day-dreams-night-dreams-world.md`:

- A long layered leather coat in deep slate-teal, split into two tails that reach the knee.
- One engraved bronze-gold pauldron on the left shoulder only. The asymmetry is the silhouette's signature.
- A mantle and scarf in dream violet, with a thin thread that glows faintly.
- Leather bracers and tall boots in dark brown, and a belt carrying a small lantern charm that glows warm amber: the dream light.
- A bare head with short dark hair and a thin silver-violet circlet.
- The Dreamedge: a large single-edged longblade in steel, with a violet line along the fuller that brightens during an attack.

**Mireth**, the keeper: an older woman in a long hooded robe of ochre and rust, with a grey braid, carrying a staff with a hanging lantern that gives off warm light.

**The Hollow Sentinel**, the enemy (it replaces the training dummy): a construct of weathered stone and bronze bands, with one round eye that glows and fires the beam. By day the eye glows amber. By night it glows violet.

Everything is built in code from primitives and generated meshes. There are no imported models, and nothing is traced from any game (the originality rule). The body is moved by procedural animation: walk and run cycles, and a pose for each action.

## Skills added (combo grammar of `docs/gdd/02-action-combat.md`)

- **Dream Lunge**: W+F. A gap-closing forward thrust that covers 6 m in 0.25 s and deals 18 damage. It costs 20 stamina and has a 4 s cooldown.
- **Nightveil Burst**: R. A ring shockwave around the player with a 4 m radius, dealing 25 damage. It costs 25 stamina and has an 8 s cooldown.

## Memory

- Events: `perfect_dodge`, `heavy_hit`, `skill_used`, `sentinel_defeated` and `talked`, each with `timeOfDay` and `witness: "mireth"`.
- The game posts each event to the Live NPC Lab. Recall reads back from the lab. When the lab is down or slower than 3 s, a local `user://npc-memory.json` answers. Either way the line she speaks names its source.
- Her night line is built from the facts she recalls (counts and specifics). It is never canned text that ignores them.

## Recording

`godot --path game/godot/DreamSlice --write-movie demo/dream-demo.avi --fixed-fps 30 -- --demo`, followed by ffmpeg to MP4. A demo director script plays the whole timeline with no person at the keys. The recipe is `game/godot/Record-Demo.cmd`.

## Done means

- The headless tests pass.
- The MP4 exists, and this lane has looked at frames taken from it, covering both day and night.
- Joshua has been told how to open it.
