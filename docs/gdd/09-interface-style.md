# Interface style: calm, dark, see-through

Status: founder direction, recorded 2026-09-20 by the Claude judge lane from Joshua's own words and one reference picture
Audience: Codex, Claude, interface design, Unreal UI work

## The ruling

The settings screen, and the menus that follow it, look like the founder's reference picture. He finds the layout and the colour scheme modern and easy on the eyes. The judge lane suggested larger, heavier, higher-contrast type; he overruled that. Build what he chose. Do not change the look on accessibility grounds unless he asks.

## What the reference shows, in words

- A calm, dark, see-through panel laid over a softly blurred view of the scene behind it. The world stays visible behind the menu.
- A large, thin, light title at the top left with a fine rule under it.
- Three columns.
  - Left: the setting names, one per row. The chosen row has a soft highlight bar.
  - Middle: dark boxes holding the current value in small capitals, with a drop-down arrow; a slider with a reset button where a slider fits.
  - Right: a help panel that explains the chosen setting in plain sentences.
- One "Back" control at the bottom centre.
- White on dark. No ornament and no other colour.

The rows in the picture: load recommended settings, window mode, screen resolution, visual quality, V-sync, frame rate lock, brightness.

## Where it comes from

The picture is from a Blueprint interface template on Fab that the founder saved to his library and is downloading. It is built on Unreal's Common UI, so it needs no C++ compiler. Like every Fab asset it is used inside the Unreal project only and never committed to this public repository; read its licence line before use.

## Same menu, both dreams

The menu is the same by day and by night. Because it is see-through, it takes its mood from the world behind it: warm ruins in a Day Dream, city light in a Night Dream.

## Party interface (founder, 2026-09-24)

From the founder's own recorded gameplay as a healer-line character in an older MMO (frames kept privately, never in this repository), what the party interface must make obvious:

- The party list on the left, each member with a health bar, always visible in group content.
- A party-buff tray: every active buff from the party shown as an icon near the top of the screen, grouped by source, with its remaining time. Party-only buffs are the heart of group play, so the player must see at a glance what the party is giving them.
- A combat log that reports damage dealt and what drain effects returned (mana and health), because the healer line's hidden damage shows up there first.
- Protective effects such as a party shield read as a large, obvious shape around the protected players, not as a small icon alone (accessibility: never colour alone).
