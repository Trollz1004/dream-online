# Gemini's lane: build DREAM Engine and DREAM Maker in AI Studio

Written by the Claude judge lane on the Alienware node, 2026-09-30, at Joshua's
instruction. Joshua's words, same day: he will build his own everything; a real
dream is an ever-evolving world that we control and do not depend on another
for. Gemini in AI Studio builds it, Google hosts it, AI Studio pushes it to
GitHub. This file is the brief, the rules and the handback shape in one place.

The decision record is `docs/tech/engine-decision-2026-09-30-own-engine.md`.

## Part 1. The prompt to paste into AI Studio Build

Open AI Studio, start a new Build app, paste everything between the two lines.
Then add this file to the project as `BRIEF.md` (Add files) so Gemini keeps it.

----------------------------------------------------------------------

You are building DREAM Engine and DREAM Maker for DREAM ONLINE, a live-world
open-world MMO. I own this code outright. Build it so nothing in it depends on
another engine or another company's product.

What it is:

1. DREAM Engine, the runtime. TypeScript. Client renderer on WebGPU with a
   WebGL2 fallback, written by you from the platform APIs. No three.js, no
   Babylon, no Phaser, no PlayCanvas, no engine or game framework of any kind.
   Your own math, scene graph, entity-component store, glTF loader, skeletal
   animation, capsule character controller, simple collision, input, audio,
   and a render profile system (one profile per world and per platform, with
   named fallbacks when a device cannot draw an effect).
2. DREAM World Server, the authoritative simulation. Node, zero npm
   dependencies at runtime. One shared world, no instances, no fast travel.
   It decides movement, hits, invulnerability windows, and emits world events
   in the envelope described in `docs/tech/data-contracts.md` of the reference
   repository below.
3. DREAM Maker, the editor. Runs in the browser. React is fine here. Scene
   tree, inspector, terrain painting, placing objects and NPC spawn points
   with a profile id, Day and Night preview, play the scene in place, save.
   Every scene is a JSON file in git. No binary editor state anywhere.

Everything is text. Assets are glTF, PNG and WebP. The app is synced to the
GitHub repository `dream-engine`. Never Publish, never deploy, never create a
Cloud Run service or anything else that costs money: the AI Studio preview is
the link for every stage, and the finalize steps are the founder's own, last.

Build in stages. Each stage ends running in the AI Studio preview and with a
`HANDBACK.md` at the repository root that says what works, what is stubbed and
how it was tested. Do not start the next stage until the current one runs in
the preview and the judge lane has said so in chat.

Stage 0, first light. A ground plane, a sky with a sun, a capsule that walks
with W A S D, the mouse looks, Escape frees the mouse, N toggles Day and
Night, a frame-rate pill at the bottom right. Hosted.

Stage 1, combat parity. Reproduce the DREAM combat slice exactly as the
reference repository specifies it in `docs/gdd/02-action-combat.md` and
`game/godot/DreamSlice/scripts/combo_list.gd`: dash with invulnerability
frames (hold Shift and a direction, then an action key), a training dummy that
winds up for 1.4 seconds, locks its line at the start of the wind-up, then
fires along it; the character glows yellow during the invulnerable window and
the dummy's recovery shows red; light attack chain on the left mouse button,
heavy on the right, guard on Q, stamina and cooldown gates, a two-line prompt
band under the character, and the combo list on L as a dark see-through
three-column screen. Every action emits a world event in the envelope. Hosted.

Stage 2, the Maker. Open a scene, move things, paint terrain, place a spawn
point, save the JSON, play it in place, come back to editing. Hosted.

Stage 3, shared world. Two browsers in the same world see each other move and
fight; the server resolves every hit; world events stream to a WebSocket that
a Node service can subscribe to. Hosted.

Stage 4, the streaming world. Chunked terrain with no loading screens. Day
Dreams are old-world fields with nothing modern in sight; Night Dreams are a
city; only the landscape changes and the character is the constant. Hosted.

Testing. `npm test` runs `node --test` over the engine logic: math, the entity
store, the combat timing windows, the envelope, scene save and load. Keep a
check count floor in the test runner that only ever rises. Report the count in
`HANDBACK.md` every stage.

Rules that stand above everything:

- Originality. DREAM makes its own styles and takes no copyright risk. Never
  copy or trace another game's designs, art, names or code. Never use another
  game's picture as an input. Work from plain words: mood, palette, level of
  detail, silhouette weight.
- Licences. Development-time tools may be MIT, BSD, Apache or zlib licensed
  (TypeScript, Vite, React, node's own test runner). Runtime engine and server
  code is written by you. If you believe a runtime dependency is unavoidable,
  stop, say why in `HANDBACK.md`, and wait.
- Privacy. Never commit keys, tokens, `.env` values, personal names or
  absolute user paths. Reference secrets by variable name only.
- Language. No other game's name appears anywhere player-facing. Use the
  world's own words: Nightfall, Nightmare Class, DREAM Class, Storage Runner,
  Market Runner, NEEDs.
- Money. Nothing in the world is worth real money and nothing paid gives
  combat power. NEEDs are in-game only.
- Authority. You push to the `dream-engine` repository through AI Studio's
  GitHub sync. You never touch the `dream-online` repository; it is read-only
  reference. The judge lanes (Claude and Codex) review every stage.

Reference repository, read-only: `https://github.com/Trollz1004/dream-online`.
Read first: `docs/gdd/02-action-combat.md`,
`docs/gdd/08-day-dreams-night-dreams-world.md`,
`docs/gdd/09-interface-style.md`, `docs/tech/data-contracts.md`,
`game/godot/DreamSlice/scripts/combo_list.gd`,
`game/godot/DreamSlice/scripts/render_profile.gd`.

Start with Stage 0 now. When it runs at a link, write `HANDBACK.md` and stop.

----------------------------------------------------------------------

## Part 2. Why the brief is shaped this way (for the lanes, not for Gemini)

- The box has no C++ compiler, and Joshua cannot hand-wire an editor. A
  TypeScript engine is text end to end: agents write it, tests run it, a
  browser shows it. That is the same reason Godot won on 2026-09-20, kept.
- AI Studio Build produces a React client with a Node server, installs npm
  packages, syncs two ways with a GitHub repository, and deploys to Cloud Run
  from inside AI Studio (Google's own documentation, read 2026-09-30:
  `https://ai.google.dev/gemini-api/docs/aistudio-build-mode` and
  `https://aistudio.google.com/learn/sync-your-ai-studio-apps-with-github`).
  The brief asks for exactly that shape, so Gemini never has to fight its own
  tool. Cloud Run pricing applies by usage; the AI Studio preview link is the
  zero-cost fallback if a deploy is ever unwanted.
- Stages end on a screen because Joshua decides from a screen, never from a
  spec. Stage 1 is parity with the Godot slice so the new engine is measured
  against something that already runs.
- Joshua ruled the same afternoon, when the lane reached the Publish step:
  nothing is published, deployed or hosted on Cloud Run until he says
  finalize, because that step costs him money. Everything stays in AI Studio,
  free. The preview link (`ais-dev-…run.app`, behind his Google sign-in) is
  the stage link. Gemini's first handback claimed a deployed link that
  returned 404; the "Hosted" wording above was removed for that reason too.
  The GitHub sync is free and stays.
- The world server is the part that makes the world "ours". The spine (event
  envelope, NPC profiles, Live NPC Lab, DreamOps Bridge) stays engine-agnostic
  and plugs into Stage 3 unchanged.

## Part 3. What the judge lane does with each handback

1. Open the hosted link and look, with the `game-development` or
   `browser-automation` skill. Never accept the handback's description alone.
2. Pull the `dream-engine` repository locally, run `npm test`, record the
   count and every failure.
3. Check the licence of every entry in `package.json` and that runtime code
   imports none of them.
4. Grep for other games' names, keys and absolute paths.
5. Write the verdict in `ops/node/JOURNAL.md` and the next stage's go or
   no-go in `docs/DREAM-DISPATCH.md`. The Godot slice stays the public demo
   until Stage 1 is verified on screen.

## Part 4. Open items Joshua may want to rule on later

- The licence of `dream-engine` itself. Until he chooses, the repository
  carries a `LICENSE` that says all rights reserved by the founder; it can be
  opened later and never closed again, so this is the safe default.
- The names DREAM Engine and DREAM Maker are working names.
