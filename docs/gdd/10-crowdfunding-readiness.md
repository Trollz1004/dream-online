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

### What the list below looked like on 2026-09-22, and what has moved since

Items 1 (guard, more of the grammar), 2 (a reason to talk to Mireth), 4 (one more environment beat) and 5 (a captured clip) are done in the forms described above. Item 3, the combo list screen, is still open: the keyboard panel shows keycaps and cooldowns but there is no three-column combo list panel yet. Item 6 stands. The next visible steps, from the 2026-09-25 journal: icon and pet polish, then the melee dagger ranger's combat, then a fresh recording of the production look.

## What is missing before a backer should see this as "the game"

In the order that buys the most credibility per hour of work, on the judge lane's own read of the research above:

1. **More of the grammar actually doing something.** A guard/parry stance on Q and a forward gap-close strike on W+Shift+F (or whichever slot the dash's current catch-all leaves free once it is split apart) would take the working move count from three to five and make the hotbar readout worth looking at. The hotbar itself is still two text lines (`Dash`, `Swing`, `Heavy`) in the HUD column; a real slotted bar with icons is cosmetic on top of this and should wait until there are enough real skills to fill it.
2. **A reason to talk to Mireth.** One flavour line is not a gameplay loop. The cheapest real loop: she asks the player to land a perfect dodge or a heavy hit on the dummy and says a second line when it happens. That turns the NPC from set dressing into the first quest, at no new systems cost — the world event log the perfect dodge already writes is exactly the hook this needs.
3. **A combo list screen.** Already specified in `02-action-combat.md` and `09-interface-style.md` (the dark, see-through, three-column panel Joshua chose). Without it, nobody but the person who wrote the code can discover what any key combination does, which is the exact failure mode the spec calls out for this genre of combat.
4. **One more environment beat.** Not a second biome yet, just enough of the ruin dressing in `08-day-dreams-night-dreams-world.md` (broken walls, an empty doorway, a mountain silhouette) to make the test chamber read as a place rather than a lab. Shapes only, no licensed or referenced art, per the originality rule.
5. **A captured clip.** Once one and two land, thirty seconds of real play — dash through the beam, land a heavy hit, get the second line from Mireth — is the first thing worth cutting into campaign material. Capture with `C:\DREAM\recon\Capture-GameWindow.ps1`, never a screen grab.
6. Character creation, more classes, a server-authoritative dash, and a second biome all come after the above. They are real work, not filler, but none of them changes whether a first-time viewer believes this is a real game in the first fifteen seconds, which is what the research above says actually matters first.

## What changed this session (2026-09-22)

Fixed, tested, and merged: the queued browser mouse-look hint; Mireth and the E-interact prompt; the heavy attack on right mouse with its own HUD line; plain depth fog everywhere and a desktop-only bloom/SSAO pass. None of this was asked for one piece at a time — Joshua's direction was to stop waiting for sign-off on game work, so this document is the record of what was decided and why, in place of asking.

Next session should treat item 1 or item 2 above as the default next piece of work, in that order, unless something else has taken priority by then.
