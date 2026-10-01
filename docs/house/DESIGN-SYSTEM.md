# DREAM Space: the House design system

Ruled by Joshua on 2026-10-01 and drawn by the Claude judge lane the same night as one artboard (a private Claude design artifact; this page is its public text). It is the preset for the engine's interface, Mission Control and the screen savers, and anything else the House puts in front of a person. In his words: a space feel; black, whites and greys do the work; one vibrant yellow is the colour; everything reactive; animated backgrounds; headers that belong to the page. Built as code by the OpenCode designer under `docs/design-system/` when that lands.

## Palette

- **Ink** `#0A0B0D`: the ground. Everything sits on it.
- **Porcelain** `#F4F1EA`: text and light. 18 to 1 on Ink.
- **Fog** `#C9CBCE`: body text and secondary copy. 12 to 1.
- **Slate** `#9DA3AA`: captions, used sparingly. 7 to 1.
- **Hull** `#3A3F45`: borders, panels, dividers. Never text.
- **Signal yellow** `#FFD21E`: the one accent, 14 to 1 on Ink. Hover `#E6B800`. Dim (disabled) `#7A6A1E`.
- Status colours stay small and never carry the brand: green `#58D68D`, amber `#F5B041`, red `#FF6B6B`, grey `#6E757C`. Yellow is never a status; yellow means "needs you".
- No purple. No brown-red. No gradient washes.

## Type

- Display: Space Grotesk 700 (500 for sub-heads), letter spacing -0.02em on large sizes, line height 1.05.
- Text: IBM Plex Sans 400 to 600, line height 1.5.
- Scale: 14, 16, 20, 24, 32, 40, 56, 72 px. Body is 20 px on any screen the founder reads; nothing he reads goes under 16 px. Captions at 14 px only in Slate and only where a caption belongs.
- Both faces are open-licensed and served from Google Fonts.

## Motion and the background

- Durations: 120 ms for a press, 240 ms for a reveal, 480 ms for a scene change. Easing out for arrivals, in-out for moves.
- The background: a slow starfield with parallax on mouse and scroll, a faint grid that breathes, a rare yellow glint. Under 2 percent CPU, paused when the tab is hidden.
- Reactive, not restless: cards lift on hover, the header underlines the active section in yellow, hero lines rise in a stagger. Reduced motion turns every animation into a fade. No motion blur, ever.

## Parts

- Header: sticky, glass over the background (`rgba(10,11,13,.72)` with a 12 px blur), Hull border, the active section underlined in Signal yellow, the primary action a yellow button at the right.
- Buttons: primary is yellow on Ink, bold, 10 px radius, at least 44 px tall; secondary is outlined in Slate with Porcelain text; quiet is Slate text alone. Every button is a real `<button>` or `<a href>`.
- Status pills: a 10 px dot, a Hull border, 999 px radius, and the time of the probe in the label; the yellow pill is "needs you".
- Cards: Hull border, 14 px radius, glass fill; a 3 px Signal-yellow left edge marks the card that needs the person.
- Prompt band: two lines at most, centred, `rgba(244,241,234,.06)` fill, 16 px text.
- Dark see-through panel: the same glass as the header, 14 px radius, 24 px padding.
- Icons: inline stroke SVG only, never emoji.

## Rules

1. Yellow means one thing: the thing you can act on or must look at now.
2. Text meets 4.5 to 1 on the ground; 3 to 1 at 24 px and up.
3. Hit areas are 44 px or larger. Focus is visible. Real buttons and links; nothing clickable is a `div`.
4. Every light carries its time. A stale green is a bug.
5. Our own styles only. Nothing copied, traced or named from anyone else's work; other sites are ideas, never sources.

## Where it goes

DREAM Engine's HUD, settings and combo registry; Mission Control's tabs, lights and the voice log; the DREAM Space screen saver for streams; the public pages of the House.
