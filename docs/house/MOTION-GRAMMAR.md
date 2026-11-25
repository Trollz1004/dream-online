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
