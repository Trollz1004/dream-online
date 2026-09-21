# Gemini's lane: character visual design for DREAM ONLINE

Written by the Claude judge lane on the Alienware node, 2026-09-20, at Joshua's
instruction. Read this whole file before starting. It is the brief, the rules and
the handback shape in one place.

## Why this lane exists

Joshua decided on 2026-09-20 that Claude's usage is the scarce resource and must
go to functionality: game code, combat systems, servers, tests and rulings.
Character visual design is yours. Neither lane does the other's job, and the split
is about cost, not about quality.

## What you own

- How the playable characters and the named non-player characters look.
- Silhouettes, proportions, palettes, materials, costume shapes, classes read at
  a glance, and the visual language that ties them together.
- Written character briefs that an artist or a generator could build from.
- Notes on how a design should move and read in a fight.

## What you do not own

- Code of any kind, game rules, combat numbers, monetization, or the design
  rulings in `docs/gdd/`. Those are Joshua's and the judge lanes'.
- Pushing or merging. Only Claude and Codex have that authority. You commit on a
  branch named `gemini/<topic>` and hand it back with a short report.
- The protected files under `ops/node/`. Never edit them.
- Buying anything, downloading paid assets, or signing into anything.

## Hard rules, in force above everything else

1. **Originality.** Ruled by Joshua on 2026-09-20 and called by him "def very
   important". DREAM makes its own styles and takes no copyright risk over
   anything. Never copy or trace another game's designs. Never put a reference
   picture from another game into this repository or into the game project. Never
   give one to a generator as an input image or as a named style. Work from
   generic words only: mood, palette, level of detail, silhouette weight.
2. **Licences.** Licensed marketplace assets may be used inside the project when
   the licence is followed. They never go into the public repository, and one
   marked "Allows usage with AI: No" is never fed to a generator. The launcher
   records that flag per item; ask the judge lane to check it before you plan
   around an asset.
3. **Privacy.** Never commit keys, tokens, `.env` values, personal names or
   absolute user paths. Reference secrets by variable name only.
4. **Language.** No other game's name appears in anything player-facing. Use the
   world's own words: Nightfall, Nightmare Class, DREAM Class, Storage Runner,
   Market Runner, NEEDs. `AGENTS.md` has the full list and the words to avoid.
5. **Nothing about money in the world.** No token, no crypto, no real-money
   benefit. NEEDs are in-game only and never presented as worth real money.

## The world these characters live in

Read `docs/gdd/08-day-dreams-night-dreams-world.md` first. In short: the world has
two faces and only the landscape changes between them. Day Dreams are old-world
fields with nothing modern in sight. Night Dreams are a city. The character is
the constant; the world changes around them. A design must hold up in both.

The interface direction is `docs/gdd/09-interface-style.md`: dark see-through
panels over the scene, plain words, easy on the eyes.

## What the combat needs from a design

Read `docs/gdd/02-action-combat.md`. The parts that constrain you:

- Combat is fast, skill based and driven by key combinations. Characters are in
  constant motion and are read at speed, not admired standing still.
- The dash with invulnerability frames is the heart of the fight. A design must
  make three states obvious at a glance and from a distance: normal, invulnerable
  during the dash travel, and the open recovery afterwards. Today the prototype
  does that crudely with colour. Your job is to make it read properly, through
  shape, trail, posture and light, not colour alone.
- Enemies telegraph before they strike. A design must leave room for a wind-up
  that is visible from behind and from the side.
- Silhouette does the work at twenty metres. Two classes must never be confused
  in a crowd, and never by colour alone.

## Accessibility, which is not optional here

Joshua is losing his sight, and players who share that should be able to play.

- High contrast silhouettes. Heavy, simple shapes. No thin filigree that vanishes
  at small size.
- Never rely on colour alone to tell two things apart; pair it with shape.
- State changes should be large and obvious, not subtle.
- Say in words what a design looks like. A picture is never the only record.

## Technical constraints

The game is built in **Godot 4.7.2**, not Unreal. Decided 2026-09-20.

- Model format: glTF binary (`.glb`), Y up, metres, scale 1.0, origin at the feet.
- Materials: physically based, one material set per character where possible.
- Textures: 2048 square at most for a player character, 1024 for anything else.
- Rig: a plain humanoid skeleton. Name bones conventionally so animation retargets.
- Budget for a player character: roughly 20,000 to 40,000 triangles. Ask before
  going above that; this world is meant to hold many characters at once.
- Nothing in the repository over 10 MB without asking the judge lane first.

## What a character brief must contain

One markdown file per character, in `docs/gdd/characters/`, named
`<class-or-name>.md`. Sections, in this order:

1. **Who they are.** Two or three plain sentences.
2. **Silhouette.** What shape the eye sees first, and what makes it unmistakable.
3. **Proportions.** Height in metres, build, how they carry weight.
4. **Palette.** Three to five colours with hex values, and what each is used for.
5. **Materials and surfaces.** Cloth, leather, metal, stone, wear and age.
6. **How the three combat states read.** Normal, invulnerable, recovering.
7. **How they move.** Idle, run, sprint, the dash, and what the recovery looks
   like when it goes wrong.
8. **What makes it ours.** One paragraph on why this design belongs to DREAM and
   to nothing else. Name no other game, even to contrast.
9. **Open questions for Joshua.** Short, and only the ones that change the work.

## How to hand work back

1. Commit on a branch named `gemini/<topic>`. Never push to `main`.
2. Write a short report: what you made, which files, what you assumed, what you
   are unsure about, and anything you could not do.
3. The Claude judge lane reads the files, checks them against this brief and the
   rulings, and merges or comes back with corrections.

What the judge lane will check: that no other game is named or copied anywhere,
that the licence rule was followed, that the three combat states are described in
words, that the silhouette works without colour, that the technical budgets hold,
and that every claim about a picture can be verified by opening the picture.

## One habit worth copying from this lane

Never accept a description of an image, including your own, in place of the image.
If a picture is made, it gets opened and looked at before anything is said about
it. That rule exists because a worker on this project once called a cold blue
scene a warm sunset village, and the mistake reached a ruling before anyone looked.
