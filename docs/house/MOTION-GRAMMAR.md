# Motion grammar

Studied by the judge lane (Fable) on 2026-11-24, at Josh's word, from the reference page he chose (the world-and-satellite demo named in the motion rule's reference capture). This page records how that page moves, in our own words and numbers. It holds none of its code, pictures, words or models, and none of those may ship. Build our own scene and objects to this grammar.

## Structure

- One 3D canvas stays fixed behind everything for the whole page. There is no video.
- The page is about 49 screens of scroll for 24 frames. Each frame is a full-screen fixed layer. An empty spacer block in the document gives each frame its scroll length: 1 to 2 screens for a normal frame, 3 to 5 screens for an interactive one, half a screen for the opening.
- Each frame's animation is tied to its own spacer by a scrubbed scroll timeline (27 on the page), so everything follows the wheel exactly, forward and back. The scroll itself is smoothed.
- Fixed layers on top of the scene: the header, the menu, one action button at bottom right, the progress bar, a custom cursor and a scroll hint.

## Text

- One large uppercase phrase per frame, with one small accent-coloured word under it.
- Headlines are split into lines and words. Each line sits in a mask and rises into place from 150 percent below: 0.8 seconds, expo-out ease, 0.06 seconds between lines. Smaller text: 0.6 seconds, 0.04 seconds between lines.
- Leaving is faster than arriving: lines exit upward to minus 150 percent in 0.25 seconds, ease-in, 0.02 seconds apart.
- Dim to light: waiting items sit at 40 to 50 percent opacity and the active one goes to full in 0.3 seconds, linear. Frames fade between 0 and 1. Nothing pops.

## Easing and time

- Scene moves: power2 in-out. Arrivals: expo-out. Exits: power2 in. Scrubbed scroll: linear.
- Small state changes take 0.1 to 0.3 seconds, reveals 0.5 to 0.8 seconds, scene moves 1 to 1.2 seconds.
- Interface geometry (bar segments, gaps) uses cubic-bezier(.76,0,.24,1) at 0.8 seconds and cubic-bezier(.66,0,.34,1) at 0.5 seconds.

## Progress bar

- A row of small blocks at bottom centre, one per frame, lit as each is passed.
- The current chapter's block widens over 0.8 seconds into a label, and its sub-steps appear inside as marks that fade in one after another, 0.1 seconds apart.
- The gap between blocks grows on hover.
- On a narrow screen the bar becomes a column of dots on the right edge, and the active dot grows taller.

## The 3D scene

- The globe is drawn as points that carry letters and numbers from a texture. It is not a photograph.
- Objects are drawn by shaders with dials: time, mouse position, noise, globe opacity, sky opacity, trail count and visibility, a stagger dial, and a build dial that takes the main object from a wireframe grid to a solid surface.
- Scroll turns those dials. The camera flies, the object assembles as it nears, and light sits on edges.
- The mouse moves the scene slightly.
- Models are compressed before they are sent.

## Interactive frames

- A pill slider that fills with the scroll, set between two large opposite words (a left choice and a right choice) joined by thin lines, with the globe rising beneath.
- A pick list where the active item brightens and the rest stay dim.

## Weight, measured the same day with Lighthouse

- About 5.5 MB in total, first paint at 0.7 seconds, about 3 seconds of main-thread work, no layout shift. Ours should be lighter.

## Never taken from the reference

Its model, pictures, words and code.

## What a still picture hides (measured live by the judge, 2026-11-24, after Josh said the first study underrated it)

- Never a dead notch. The whole ride is about 300 clicks of a mouse wheel. On the globe frames every single click changes 12 to 28 percent of the picture. The 24 frames are chapters; the visitor sees hundreds of different screens.
- Alive when nothing is touched. On the letter globe, with no scroll and no mouse, 13 percent of the picture changes every 0.4 seconds: rows of letters and numbers keep running across the sphere. The opening frame only twinkles (under half a percent). A frame may also hold perfectly still, so stillness is a choice, not a default.
- The globe's recipe: a real map of the earth sampled on a fine grid (about 400 by 200) and drawn as blue dots; a dial cross-fades the dots into letters taken from a letter sheet on the same grid; a slow drifting noise keeps it shimmering; clouds run on their own clock; satellite trails are drawn over it; three lights and a blue rim light from behind give it depth; another dial blurs it out for transitions.
- Markers on the globe pulse gently, about two and a half beats in six seconds.
- The lesson for our builds: every wheel click must change the picture, and the main object must be alive at rest.
- Readouts run by themselves. On the spec panel frame (seen with Josh on 2026-11-24, no scroll, no mouse) four number readouts count on their own between two sets of values, for example 10 down to 4, 100 percent down to 30, 2000 down to 100, while the scene behind changes up to 6 percent of the picture every 0.7 seconds. Words and numbers are part of the motion, not only the 3D scene.

## No cuts: one scene becomes the next (watched click by click with Josh, 2026-11-24)

Ten wheel clicks upward from the letter globe, three seconds of watching after each:
- The letter globe does not switch on. Its life fades in with the scroll. At rest the picture changed 0, then 0.3, 3, 8, 12 and finally 16 percent per second-long look as the clicks went down toward it. The lit area grew from about a tenth of the screen to a third.
- The frame before it is a flat control-room screen floating in space at an angle: charts, a map with a route drawn on it, a dotted world. Between the two frames that screen swings edge-on and sweeps across like a curtain while the dotted world carries over and becomes the globe.
- The headline arrives dim and comes up to full as the globe wakes.
- For one click between the two frames there are no words at all. The old line has left and the new one has not come. The scene carries that moment alone.
- Nothing is cut. The camera, the object and the light carry from one frame into the next.

The lesson: transitions are the show. Do not fade one picture out and another in. Turn, sweep or grow the object the visitor is already looking at into the next thing.
- Parts come in one way and leave another (watched in part-click steps with Josh, 2026-11-24). On the floating control-room screen, the list panel on the right leaves by sliding off the right edge, the next click the new metric panels rise in from the bottom left, label first, then a gauge, then a picture tile. The screen itself stays; only its parts change. Entrances and exits are never mirror images of each other.
- Correction from Josh, who watched it move (2026-11-24): rolling the wheel up, the left metric panels enter from the left side and exit south, off the bottom. The judge's stills were taken rolling down, where the same scrubbed motion runs backward: the panels rise from the bottom and leave to the left. The judge saw only the bottom move; the left-side move is Josh's observation. Either way the entrance and the exit are different directions.

## A chapter change told as a story (twenty clicks down with Josh, 2026-11-24)

From the frame "a named internal owner" to the chapter title "Deploy", two to six seconds watched after each click:
- Clicks 1 to 5. The machine is a ghost drawn in white lines with one solid blue part inside it. The words say one named owner; the picture shows one part in colour. Each click moves the camera closer (8 to 22 percent of the picture changes). At rest it is perfectly still.
- Clicks 6 to 10. The camera dives in until the wire rings fill the screen (23 to 32 percent per click). On the tenth click the scene starts to move by itself.
- Clicks 11 to 14. Streaks of white and blue light begin to fall across the screen and never stop: 17 to 22 percent of the picture changes every second with nothing touched. The three-line headline leaves one line at a time.
- Clicks 15 to 16. One word of the headline is left, dim as a ghost, then nothing. The streaks hold at about 10 to 15 percent a second for as long as you wait. It is a loop, not a one-off.
- Clicks 17 to 18. Two full clicks with no words. The camera has pulled back and the machine is now seen whole as a long launch tube.
- Clicks 19 to 20. The chapter title arrives dim, with part of the machine passing in front of the letters, so the word sits inside the scene and not on top of it. By the twentieth click it is at full brightness and the tube's surface has filled in.

What this teaches:
- The motion says what the words say. One owner is one coloured part. Deploy is a launch.
- A chapter break gets a long wordless ride, and the idle motion is strongest there.
- Words can live inside the 3D depth, behind an object, not only on a flat layer above it.
- Stillness and motion are placed on purpose: still while you read, moving while you travel.

## The same chapter change in the wide view (eight more clicks, 1280 wide, 2026-11-24)

The twenty-click study above was seen in a narrow pane, which is the phone layout. In the wide layout, continuing from the "Deploy" title:
- The title sits large at the right, the launch tube runs diagonally through the middle with streaks of light, and the bar at the bottom reads as named tabs: the three finished steps lit and labelled, the current chapter labelled and dark, the rest small unlit blocks.
- Within four clicks the tube is gone and the satellite is out in orbit, solid and glowing, its panels spread, a dotted earth on the horizon. The chapter's block in the bar lights. Each click changed 12 to 32 percent of the picture, and after each one the motion plays on for a second or two and then settles.
- Within four more the satellite has left the frame and the camera has tipped down to the globe, which fills the lower half with a blue rim. The last click changed half the picture. The bar has folded back to small blocks with no labels.
- So the bar shows names while a chapter is arriving and folds away once it has landed.
- The word is acted out: launch, then the craft deployed, then the world it serves.
- Always judge a build at both widths. The phone layout stacks the words over the scene and turns the bar into dots at the right edge; the wide layout puts the words beside the scene.

## Depth that comes at you (three clicks at full width with Josh, 2026-11-24)

From the frame where the launch tube opens over the earth:
- Click one. The spent rocket stage is huge and close at the upper left, tilted and soft, falling past the camera. The small blue satellite is released at the right, next to the title. Thin white arcs of the opened shell drift at the edges. The earth is far below. Three depths at once: something very near, the subject in the middle, the world far away.
- Click two. The stage is gone. The satellite is opening its panels like an accordion, caught half-folded, and one panel passes in front of the first letter of the title.
- Click three. The panels are straight and the satellite has come toward the camera. It is about twice the size and runs from the left edge to the middle of the screen, lens first. Josh's words: it looks so 3D it is like you are about to be hit in the head by a rocket.

What makes the depth: a near object that leaves past the edge of the screen, a subject that grows toward the viewer between clicks, a far world that barely moves, and parts that cross in front of the words. An object that only turns in place never gives this.
