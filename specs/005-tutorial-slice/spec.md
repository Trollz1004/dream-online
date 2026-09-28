# Feature Specification: The tutorial slice, worthy of the judge lane's name

**Feature Branch**: `005-tutorial-slice`

**Created**: 2026-09-28

**Status**: draft, 2026-09-28, Claude judge lane in the cloud session, from Joshua's goal of the same day

**Input**: Joshua's goal, 2026-09-28, in his own words: "research opus spec kit screenshot to opus visuals build with designer skill fable screenshot game compares to premium action-MMO tier minimum quality goal specify a real game play worthy of built by Fables name". He named one specific game where "premium action-MMO" now stands; the judge lane replaced that name under the repo's clean-room rule (`AGENTS.md`, project language), and no competitor game or studio is named anywhere in this spec. Standing rulings carried with it: the slice is the tutorial and visuals come first (2026-09-28, `docs/gdd/01a-first-15-minute-journey.md`); the first seven seconds on screen decide whether anyone stays (the README's bar, restated in 01a); no false gameplay data is ever shown (2026-09-26); everything shown stays real gameplay and any enhanced cut is labelled (2026-09-24).

## The bar, in our own words

One still frame taken from the real build, at 1920x1080, should read as a premium third-person action MMO in production: a world with light that comes from somewhere, air with depth in it, a hero who stands out from the ground and is shaped by light, ground you could walk on, a sky with something in it, and an interface that is calm, dark, see-through and speaks plain words. Nothing on screen may be a placeholder, and nothing on screen may claim a system the build does not have. The graded frame comes from the browser build, so the bar must be met by what the browser build can draw; the desktop build may look better, never worse.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The first seven seconds (Priority: P1)

A newcomer opens the slice (the published web link or the desktop window) and, before touching a key, sees the spawn frame: the hero at a safe camp, a readable landmark and exit path ahead, golden light with long shadows in the Day Dream field, or rain, neon and wet reflections in the Night Dream city. The frame alone makes them want to press a key.

**Why this priority**: Joshua's ruling is that the first seven seconds decide whether anyone stays. Every later beat is wasted if this frame loses the viewer.

**Independent Test**: export the web build, capture one 1920x1080 frame of each world at the spawn moment (plan, capture procedure) and grade both against the Screenshot bar below. Both frames must pass every item that applies to their world.

**Acceptance Scenarios**:

1. **Given** a fresh start in the Day Dream field, **When** the first stable frame is captured at 1920x1080 from the web build, **Then** it passes SB-01 to SB-07 and SB-09 to SB-15 (SB-08 is night only).
2. **Given** a fresh start in the Night Dream city (`dream=night`), **When** the same capture is taken, **Then** it passes SB-02 to SB-15 (SB-01 is day only).
3. **Given** either world, **When** the headless suite builds the environment, **Then** the WorldEnvironment carries every setting its render profile names for that platform (FR-003, FR-004), exactly one WorldEnvironment and one DirectionalLight3D exist, the key light casts shadows in both the desktop and the web profile, and a character rim light node exists on the player.
4. **Given** the web profile, **When** a setting the browser renderer cannot draw is requested, **Then** the profile substitutes its named fallback (plan, render table) and the suite checks that the fallback node or value is present.

### User Story 2 - The tutorial spine, taught by showing (Priority: P2)

The player walks the first-15-minute flow of `docs/gdd/01a-first-15-minute-journey.md` as a tutorial: spawn at camp; move and sprint; dash with invulnerability frames, taught by the Hollow Sentinel's telegraph; the light chain; the heavy attack; the guard; one gather at a resource node; one world event near the route; Mireth's memory callback; the camp checkpoint. Each beat is taught by the world (a marker on the ground, a light on the node, the Sentinel's wind-up glow, a keycap that lights on the hotbar) with at most one short prompt line, never a paragraph.

**Why this priority**: the frame earns seven seconds; the spine earns the next fifteen minutes. It turns six working moves and one NPC into a guided first session, which is what `docs/gdd/10-crowdfunding-readiness.md` says a backer needs to see.

**Independent Test**: play the slice from spawn to checkpoint with no outside explanation; the headless suite drives the same beats by signals and checks the order, the prompts and the saved state.

**Acceptance Scenarios**:

1. **Given** the tutorial has started, **When** the player completes each beat's action, **Then** the director advances exactly one beat, in the order spawn, move, sprint, dash, light chain, heavy, guard, gather, world event, Mireth, checkpoint, and never skips or repeats one (headless, by signal).
2. **Given** any beat is active, **When** the headless suite walks every visible Label under the HUD and tutorial layers, **Then** no tutorial label is longer than 90 characters, at most two tutorial lines are visible at once, and the old five-line help block is not visible by default.
3. **Given** the dash beat, **When** the Sentinel starts its 1.4-second wind-up, **Then** the beat's world cue (the wind-up glow and the lit Shift and direction keycaps) is active, and the beat completes only on a confirmed perfect dodge (the existing `perfect_dodge_confirmed` signal), not on any dash.
4. **Given** the gather beat, **When** the player gathers once, **Then** the node moves from available to cooldown and that state survives a save and reload (headless round trip).
5. **Given** the world-event beat, **When** the event starts, **Then** an envelope is built by `scripts/world_event.gd` moving from calm to active with trigger, timestamp, player impact and rollback note, and the area visibly changes (a node or light the suite can find).
6. **Given** the Mireth beat, **When** the player talks to her after the event, **Then** she recalls at least one prior beat and names the event, with the Live NPC Lab up and with it down (local fallback), in approved language only.
7. **Given** the checkpoint beat, **When** the player reaches the camp, **Then** inventory, health, stamina, Mireth's memory, the event state and the tutorial beat are saved locally and restored on reload.
8. **Given** a player who fails a beat (hit by the beam, out of stamina), **When** the beat retries, **Then** the prompt stays neutral and encouraging; no line mocks, scolds or scores the player.

### User Story 3 - Ember on the route, GeminEYE at the shoulder (Priority: P3)

On the route between the gather node and the world event, the player comes upon Ember: a small figure around a light plainly too big for him, its bleed flickering. He is present and never explained. GeminEYE, the looting pet, stays at the player's shoulder throughout.

**Why this priority**: it plants the boss story's public layer (`docs/gdd/02-action-combat.md`, bosses) in the first session without spending a guide slot or a word of exposition; it adds wonder, not instruction.

**Independent Test**: walk the route and see Ember at his spot in both worlds; the suite finds his node and checks that nothing names or explains him.

**Acceptance Scenarios**:

1. **Given** either world, **When** the scene is built, **Then** an Ember node exists at a fixed route position outside the fight lane and Mireth's clear radius, carrying an emissive core and a light source (headless).
2. **Given** the tutorial runs, **When** the suite scans every tutorial prompt, HUD label and Mireth line, **Then** none contains Ember's name or explains him, and his node has no nameplate or interact prompt.
3. **Given** the player comes within range, **When** his light-bleed tell rises, **Then** he may leave with one short in-character apology chosen from a fixed written list, never generated live, and returns on reload.
4. **Given** any beat, **When** the scene is built, **Then** the GeminEYE pet node exists at the shoulder offset, as in the current slice, and its shop stays a demo NEEDs purchase with no gameplay advantage.

### User Story 4 - The combo list screen (Priority: P4)

A key opens the combo list screen `docs/gdd/10-crowdfunding-readiness.md` names as still open: the dark, see-through, three-column panel of `docs/gdd/09-interface-style.md`, listing every key combination the build resolves, in plain words, with its defensive tag. The long help block lives here now, not on the play screen.

**Why this priority**: it answers the genre's standing complaint (nothing is discoverable) and lets the tutorial keep its prompts short.

**Independent Test**: open the screen and find every working move; the suite checks the list against `scripts/combo.gd`.

**Acceptance Scenarios**:

1. **Given** the screen is opened, **When** the suite reads its rows, **Then** every skill `scripts/combo.gd` resolves to a working state appears once, with its keys, a plain sentence and its defensive tag (invulnerability frames, guard, super armour or none), and stub combinations that only print their name are marked "not yet in this build" rather than described as working.
2. **Given** the screen is open, **When** a 1920x1080 and a 1280x720 frame are captured, **Then** it passes SB-10 and SB-13, and one Back control sits at the bottom centre.

### Edge Cases

- The browser renderer lacks screen-space reflections, ambient occlusion, volumetric fog and global illumination; every item in the Screenshot bar must pass without them (plan, render table), and desktop-only extras are extras.
- The graded frame is taken under software rendering at about 1 frame per second, so the frame-rate line will read low; it is true data, it stays on screen (spec 004, FR-002, SC-003), and it is never graded.
- A browser that has not been clicked shows "Click to look around."; that hint must pass SB-10 and SB-13 like any other element.
- A saved hotbar position from an older build (`user://hud_layout.cfg`) must still be clamped clear of the prompt line at both resolutions.
- The Live NPC Lab is down: Mireth's callback uses the local fallback and the beat still completes.
- A player who skips ahead (walks to the node before fighting) is not blocked: the director records the beat done out of order and does not re-teach it.

## Screenshot bar *(mandatory)*

One 1920x1080 frame of the real build, captured from the browser export under software rendering (plan, capture procedure). Frame rate is never graded from it. Each item is a yes or no a reviewer answers from the still alone; a frame passes when every item that applies to its world is yes. The judge lane grades; the grade and the frame's path go in `ops/node/JOURNAL.md`.

| ID | World | Yes when |
|---|---|---|
| SB-01 | Day | The sun's direction is readable from cast shadows on the ground (the hero, trees or ruins throw shadows that agree with one light direction). |
| SB-02 | Both | The sky has a gradient from zenith to horizon and visible detail in it: clouds by day; stars or lit cloud by night. No flat single-colour band. |
| SB-03 | Both | Fog or haze gives depth: foreground, middle ground and far ground (mountains or towers) read as separate planes, the far plane lighter or cooler than the near. |
| SB-04 | Both | The hero's silhouette separates from the ground and the background along its whole outline; head, cloak and weapon read as shapes. |
| SB-05 | Both | A rim or key light visibly shapes the hero: a lit edge or a light-to-shade turn across the body. The hero is never a flat dark cutout. |
| SB-06 | Both | The ground shows texture detail at play distance (grass, pebbles, cracks or wet asphalt), and no repeating pattern is visible toward the horizon. |
| SB-07 | Both | The camera sits behind and above the hero's shoulder with the hero off the frame's dead centre, the horizon off the midline, and the route or landmark ahead readable. |
| SB-08 | Night | The wet street shows reflections of lit signs, windows or lamps. |
| SB-09 | Both | Light sources that should glow (lamps, signs, the Sentinel's eye, Ember's core, the pet's eye) show a soft halo, not a hard flat disc. |
| SB-10 | Both | Every persistent HUD element sits on the dark see-through panel style of `docs/gdd/09-interface-style.md`, in plain words; no raw column of debug-looking text lines. |
| SB-11 | Both | No placeholder art: no plain coloured dot, blank square or untextured box stands in for an icon, an item or a character. |
| SB-12 | Both | The real-slice label is present and legible (in the web build, the stamped label with the commit hash). |
| SB-13 | Both | No HUD element overlaps, clips or runs off another or the frame edge; the on-screen prompt never sits under the hotbar. Checked in this frame and in a 1280x720 frame of the same moment. |
| SB-14 | Both | No text wall: at most two lines of tutorial text on screen, none longer than 90 characters. |
| SB-15 | Both | Nothing on screen claims a system the build does not have: no mock party frames, chat, player counts, damage numbers or menus that do nothing. |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The slice MUST start in tutorial mode by default (desktop and web), at the camp spawn, with the existing capture, demo and `--dream` flags still working; the web build MUST also read `dream` from the page's query string so a night frame can be captured.
- **FR-002**: Render settings for each world MUST come from one data source per world and platform (a render profile) that the headless suite can read without a window, so every visual setting is a checked fact, not a hope.
- **FR-003**: The Day Dream profile MUST provide, on both platforms: a key light with shadows (low-cost shadow settings on the web), a sky with gradient and clouds, depth fog with height fog and aerial perspective, the AgX tonemap with the day grade, glow where the renderer draws it, and a rim light on the hero. Desktop MAY add ambient occlusion, volumetric fog and higher shadow quality.
- **FR-004**: The Night Dream profile MUST provide, on both platforms: moon key light with shadows, a star field, depth and height fog, lamp and sign glow, and a wet-street reflection that the browser renderer can draw (a reflection probe or a mirrored reflection layer, per the plan's render table). Desktop MAY add screen-space reflections, ambient occlusion and volumetric fog.
- **FR-005**: Every setting the web renderer cannot draw MUST have a named fallback in the plan's render table, and the web profile MUST select that fallback, never silently drop the look.
- **FR-006**: The hero MUST read at play distance in both worlds: a rim light, a camera-following fill (already present) and a default chase framing per SB-07.
- **FR-007**: The play-screen HUD MUST follow `docs/gdd/09-interface-style.md` (dark see-through panels, plain words): health, stamina and cooldowns in the bottom bar the HUD already builds for the demo, the text readout column hidden by default, the five-line help block moved to the combo list screen.
- **FR-008**: Hotbar, prompt line, bottom bar and real-slice label MUST NOT overlap at 1280x720 or 1920x1080, including after a saved hotbar position is restored.
- **FR-009**: Hotbar icons MUST be real icons (a red bottle, a blue bottle, a food item, skill glyphs), drawn in code or taken from a CC0 source with its licence line in `assets/third_party/LICENSES.md`.
- **FR-010**: A tutorial director (a small state machine) MUST drive the eleven beats of User Story 2 from existing signals, show at most one prompt line per beat (90 characters maximum), light the matching world cue and keycaps, and tolerate out-of-order completion.
- **FR-011**: The slice MUST add one gathering node (available, gathering, cooldown; state saved locally) and one world event near the route (a resource bloom or gate flicker) built through `scripts/world_event.gd`.
- **FR-012**: Mireth MUST recall at least one prior beat and name the active event at the Mireth beat, using the existing memory link and its local fallback; she stays the one guide.
- **FR-013**: The camp checkpoint MUST save and restore inventory, health, stamina, Mireth's memory, event state, gather node state and tutorial beat locally (`user://`).
- **FR-014**: Ember MUST be placed on the route in both worlds as a figure met and never explained: an original design (a small body around an oversized light with a visible bleed), no nameplate, no prompt, no guide slot; any departure line comes from a fixed written list.
- **FR-015**: GeminEYE MUST stay at the player's shoulder through the tutorial, unchanged in rules; its shop stays convenience only.
- **FR-016**: A combo list screen MUST open on one key, list every combination `scripts/combo.gd` resolves with keys, plain description and defensive tag, and mark stubs honestly.
- **FR-017**: Every prompt, line and label MUST be world-native, concise and kind; the tutorial never mocks, scolds or grades the player.
- **FR-018**: Every new feature MUST add headless checks, and `MINIMUM_CHECKS` in `tests/run_tests.gd` MUST rise by the number added; it is never lowered below 789.
- **FR-019**: Every new asset MUST be CC0 or original, recorded in `assets/third_party/LICENSES.md` before use; imported assets stay within spec 003's budget of about 80 MB.
- **FR-020**: No competitor name appears in code, copy, commit or pull request; NEEDs are never shown as a real-money benefit; no paid item gives gameplay advantage.

### Key Entities

- **Render profile**: the set of environment, light and material settings for one world on one platform, with each web fallback named.
- **Tutorial beat**: an id, one prompt line, a world cue, the signal that completes it, and whether it is done.
- **Gather node**: position, state (available, cooldown), cooldown remaining; saved locally.
- **Checkpoint save**: the local record FR-013 lists.
- **Screenshot grade**: a frame's path, its commit, its world, its resolution, and a yes or no per SB item.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The day and night 1920x1080 web frames each pass every Screenshot bar item that applies to their world (14 of 14 for day, 14 of 14 for night), graded by the judge lane with the frames opened, never described.
- **SC-002**: The matching 1280x720 frames pass SB-10 to SB-14.
- **SC-003**: The headless suite passes every check, and the count is at least 789 plus the checks this feature adds, with `MINIMUM_CHECKS` raised to match.
- **SC-004**: A first-time player completes the eleven beats with no outside explanation (the 01a failure case), observed once by Joshua or the judge lane on real hardware.
- **SC-005**: The web build, on real hardware, reads at least 50 frames per second at 1920x1080 on the readout; the desktop build holds 60 on the RX 6800. If not, the costliest item in the render table falls back and the grade is re-taken.
- **SC-006**: No visible tutorial label exceeds 90 characters and no more than two are visible at once, at any beat (headless).

## Assumptions

- The web export (preset "Web", `variant/thread_support=false`) runs on Godot's Compatibility renderer over WebGL 2: `project.godot` sets no web rendering method and the web platform cannot run Forward+, which the desktop uses (`config/features` "Forward Plus"). Which Compatibility features 4.7.2 actually draws is confirmed by capture in task T003, not assumed.
- The headless suite cannot see pixels; it checks settings, nodes, text lengths and layout rectangles. Pixels are graded by the judge lane from captured frames.
- Playwright 1.56 with its Chromium is available to the judge lane in the cloud container, as used for spec 004's boot check.
- The ranger outfit on the rigged CC0 character stays the hero's look; no new class look is needed for this feature.
- The tutorial starts in the Day Dream field; Nightfall (N) shows the Night Dream city with the same beats.

## Out of scope

- Networking, a server-authoritative dash, and any shared-world state.
- The marketplace, Storage Runner, Market Runner and any trading.
- Monetisation beyond the existing demo NEEDs pet shop; no new paid item.
- Character creation, other class looks, the melee dagger ranger's combat, new skills.
- The Myth@s and Ember dual events and any boss fight (they need their own spec).
- A new recorded video; the capture here is stills.
