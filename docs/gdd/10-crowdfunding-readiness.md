# What a crowdfunding-ready slice still needs

Status: honest state check, written 2026-09-22 by the Claude judge lane at Joshua's direction, after research into what backers of an indie RPG campaign actually look at and what a combo-driven action combat hotbar system does. Read this before promising anything to a backer, and update it every time a session changes what is built rather than letting it go stale.

## What "ready" means, and where that came from

Two things were checked at the source rather than assumed, on 2026-09-22:

- Backers convert on **playable proof**, not concept art. A vertical slice earns trust when it is complete enough to represent the finished game end to end, polished enough to carry no game-breaking bugs, and shown in a video that leads with real gameplay in the first 10 to 15 seconds rather than a logo or a pitch.
- The combo-driven action combat family this project already draws on (named generically in `docs/gdd/02-action-combat.md`, no other game's art or name enters this project) treats the hotbar as a cooldown readout, not the primary way skills fire, exactly as Joshua already ruled on 2026-09-20. That ruling did not need revisiting; the gap was that almost none of it had been built yet.

## What is actually built right now

Be plain about this with anyone deciding whether to show the slice. As of 2026-09-26 (the 2026-09-22 state this section first recorded is in git history; every line below was checked against the journal and the code):

- One Godot 4.7.2 vertical slice, `game/godot/DreamSlice`, runs in a window and in a browser; the test floor is 789 checks, last run 789 of 789 on `main` (2026-09-25).
- A real character: a rigged CC0 rig with animations, wearing the hooded ranger outfit Joshua chose on 2026-09-25 over the knight look. The knight and the other class looks are still design (`specs/003-production-look/spec.md`, `docs/gdd/02-action-combat.md`).
- Combat: the dash with invulnerability frames, a three-step light attack chain, a heavy attack on right mouse, a guard stance on Q, the Dream Lunge and the Nightveil Burst (spec 002). That is six working moves out of the roughly eighty the grammar makes room for; every other key combination still falls through to a stub that prints its name. The hotbar is now a movable keyboard panel with a keycap readout, red and blue potions and food on 1 to 3; its icons are plain coloured dots.
- One enemy: the Sentinel training dummy that telegraphs a beam and can be perfect-dodged or fought down. One friendly NPC, Mireth, who reacts to the player's perfect dodges and, at Nightfall, recalls them from world memory written to the Live NPC Lab (with a local fallback when the lab is down). There is still no dialogue tree or quest beyond that.
- A companion: the GeminEYE timed looting pet, bought from a demo NEEDs shop on P (convenience only).
- Two environments: the Day Dream field (CC0 textures, shaped terrain, wind grass, trees, ruins, a ridged mountain) and the Night Dream city (rain, crowds, traffic, lit windows, wet streets), both with depth fog and a desktop-only bloom and ambient-occlusion pass. Mountains still read pale and the ground plain in places.
- No character creation (design draft only, `docs/gdd/07-character-creation.md`); the five classes and their awakening paths are ruled in `02-action-combat.md` but only the ranger look exists on the rig.
- No server: invulnerability is decided on the client, which `02-action-combat.md` already flags as wrong for player-versus-player and files under "later."
- One captured clip: the 88-second spec 002 recording (`game/godot/Record-Demo.cmd`; the file itself is not committed), with a known 1.5 s pale-orange washout after the Dream Lunge at about 24 s. No recording has been made since the spec 003 look landed.

## What is still missing before a backer should see this as "the game"

This list was written on 2026-09-22 with six items. On 2026-09-26 each item carries its status; the original wording is in git history. The order is still the one that buys the most credibility per hour of work, on the judge lane's own read of the research above.

1. **More of the grammar actually doing something.** Done in its first form: the guard on Q, the Dream Lunge and the Nightveil Burst took the working move count from three to six, and the hotbar is a real keyboard panel with keycaps and cooldowns rather than two text lines. The higher bar that remains: more of the roughly eighty combinations doing something (the melee dagger ranger's combat is the next ruled piece), and real icons in place of the plain coloured dots once there are enough skills to justify them.
2. **A reason to talk to Mireth.** Done in its first form: she reacts to the player's perfect dodges and recalls them from world memory at Nightfall. The higher bar that remains: a real quest loop, where she asks for something and answers when it happens, if that stays a campaign goal.
3. **A combo list screen.** Still open. Already specified in `02-action-combat.md` and `09-interface-style.md` (the dark, see-through, three-column panel Joshua chose). The keyboard panel shows keycaps and cooldowns, but nobody can discover what a key combination does without reading the code, which is the exact failure mode the spec calls out for this genre of combat.
4. **One more environment beat.** Done and then some: the Day Dream field has CC0 textures, shaped terrain, trees, ruins and a ridged mountain, and the Night Dream city exists. The higher bar that remains: the mountains still read pale and the ground plain in places, and the Sentinel's beam and orb need a VFX pass.
5. **A captured clip.** Done in its first form: the 88-second spec 002 recording, with its known washout at about 24 s. The higher bar that remains: a fresh recording of the production look after the polish above, captured through `C:\DREAM\recon\Capture-GameWindow.ps1` or `game/godot/Record-Demo.cmd`, never a screen grab.
6. **Still after all of the above.** Character creation, the other class looks, a server-authoritative dash, and further biomes. They are real work, not filler, but none of them changes whether a first-time viewer believes this is a real game in the first fifteen seconds, which is what the research above says actually matters first.

## What changed this session (2026-09-22)

Fixed, tested, and merged: the queued browser mouse-look hint; Mireth and the E-interact prompt; the heavy attack on right mouse with its own HUD line; plain depth fog everywhere and a desktop-only bloom/SSAO pass. None of this was asked for one piece at a time — Joshua's direction was to stop waiting for sign-off on game work, so this document is the record of what was decided and why, in place of asking.

Items 1 and 2 above were the default next work at the time and have since landed. As of 2026-09-26 the default next work, from the 2026-09-25 journal, is icon and pet polish, then the melee dagger ranger's combat, then a fresh recording; item 3, the combo list screen, is the one original item still untouched.
