# Dreamforge — AI World Builder

A studio that turns one idea into a living world. 100% AI-built, built with Google Gemini.
100% ToS-compliant rebuild of a world-builder site (neta.art -> Dreamforge), all 131 content
slots de-branded and re-authored. SFW.

## The functions — 7 ways to start a world

1. **World Seed** — one sentence -> a map, characters, lore, factions, and a magic system with rules.
2. **IP Jump** — start from a world you already love (fandom-safe).
3. **World Map** — name a place -> a map that grows rivers, mountains, borders, and trade routes.
4. **POV Video** — a single shot -> the rest of the scene unfolds.
5. **Roleplay** — pick a character, chat, and the conversation becomes a story.
6. **Pixel Room** — build a pixel home.
7. **Scroll World** — describe a place -> one continuously scrolling journey.

## Skills — 13, per-mode preloaded, admin unlocks all

Map & Geography, Character Creation, Dialogue Engine, Combat System, Magic System,
Factions & Politics, Lore & History, Weather & Ecology, Music & Ambience,
Camera & Cinematics, Economy & Trade, Lighting & Atmosphere, World Events.

Each mode pre-selects its own skill subset (World Seed = 6, Roleplay = 3, POV Video = 4, etc.).
Admin login (`admin` / `dreamforge2026`) unlocks all 13 with no limits. Non-admin sees only
the mode's skills with a paid-plan lock note — the paywall structure is ready for a shipped build.

## Art styles — 43

Same world, 43 looks (aged-paper-painting, american-comics, pixel-art, watercolor-sketch, ...).
See `index.html` `STYLES` array for the full list.

## UX

- Dark mode toggle (localStorage-persisted).
- Genie-style scroll-zoom hero (scales 1x -> 1.7x while fading as you scroll) + shrinking header.
- 7-mode carousel, 43-style grid, generate flow, dismissible banner.

## Where it plugs into game dev

- **World Seed** -> procedural worldgen seed (terrain + lore + faction generator).
- **Skills: Magic System / Combat System / Economy** -> rule & mechanic definitions to feed the
  DREAM-Engine (zero Unreal, Godot is retired) and its three visual states
  (MODERN_3D_DAYDREAM / NIGHTMARE_CRISIS / RETRO_16BIT_CIRCLES).
- **Roleplay / Dialogue Engine** -> NPC dialogue systems for the Live NPC Lab.
- **World Map** -> overworld + trade-route generation.
- **43 styles** -> art-direction presets for textures, skyboxes, and thumbnails (ComfyUI offload).

## Where it plugs into YouTube automation

- World-art generation for Shorts thumbnails / B-roll.
- World Seed -> one-line hook material for a <=59s Short (one sentence -> a story).
- Style presets -> consistent channel art across the DREAM Online channels.

## Notes for running it

- `index.html` is the self-contained app (all logic: MODES, ALL_SKILLS, MODE_SKILLS, STYLES,
  generate flow, dark mode, admin, scroll-zoom).
- Mode images are referenced as `../assets/<mode>.png`; brand assets live in `brand/`.
- Style thumbnails are re-encoded by the remake engine and served from `../_ext/...` (the `const base`
  in `index.html`), so those 43 thumbs need the remake engine (or a re-wire of `base`) to display;
  everything else runs standalone.

## Original source

Rebuilt with the remake engine from: `%USERPROFILE%\remakes\neta-art-world-new`
(desktop visual score 81.69% before de-branding; de-branding intentionally diverged from the
original for ToS compliance). Content swap board: `remake/content.json` (131 slots, 100% re-authored).
