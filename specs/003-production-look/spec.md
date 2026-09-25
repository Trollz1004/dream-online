# Spec 003: the production look

Written 2026-09-24 by the Claude judge lane on Alienware, from Joshua's words the same day:
"i want game play demo to look almost like end game production level no one will invest
into a mediocre game ... if visually not impressive we lost before we ever got started."

## The problem, seen in the frames

The spec 002 recording (`demo/dream-demo.mp4`) plays well but looks like a prototype. Judged
from frames at 3, 15, 55 and 70 seconds:

- Every character is built from boxes and cylinders in code (`character_model.gd`). This is the
  loudest "prototype" signal on screen.
- The Day Dream field is a flat brown plane with sparse cross-shaped grass tufts, stick trees,
  cone mountains and box houses. No texture, no terrain shape, no sky detail.
- The Night Dream city is the stronger half (bloom, wet street, lit windows) but buildings are
  bare boxes and the air has no depth.
- A pale-orange washout fills the frame for about 1.5 s after the Dream Lunge (about 24 s).
- The first three seconds, which decide whether a viewer stays, are the weakest shot.

## Goal

A viewer who sees any three seconds of the recording believes it is a well-funded game in
production. Stylised is fine; cheap is not. The gameplay, systems and timeline of spec 002 stay.

## Levers, in order of visible gain

1. **Real characters.** Rigged, animated character models from a free CC0 source, driven by the
   existing state machine (idle, run, dash, attacks, guard, hit). Replaces the box figures.
2. **Real ground and sky.** A shaped terrain, PBR ground materials, dense wind-driven grass,
   scanned rocks and ruins, real tree models, an HDRI or detailed procedural sky with clouds.
3. **Light and air.** Offline recording has no frame budget, so the demo path turns on the
   expensive features: SDFGI or VoxelGI, volumetric fog with light shafts, high shadow quality,
   SSR, SSAO, SSIL, TAA or MSAA, depth of field on camera moves, AgX or filmic tone mapping with
   a colour grade per world.
4. **The city.** Facades with window, ledge and sign detail instead of bare boxes; haze that
   lamps cut through; reflections on the wet street.
5. **Camera and cut.** The strongest shot opens the video. Slower, weighted camera moves.

## Character direction (Joshua, 2026-09-24)

- High-end cinematic fantasy CGI, stylised-realistic, with believable adult proportions. Never
  round, big-headed or toy-like ("very bubble like" was his word for what to avoid).
- **One outfit works in both worlds.** Day Dreams are old-world fields and Night Dreams are a
  neon night city, and a costume must not look out of era in either. The style is a timeless
  fusion: medieval silhouettes made from sleek, modern-feeling materials, such as fine dark
  chainmail, matte fitted plates, clean leather and thin subtle light seams.
- The sword rides sheathed on the back outside combat and is drawn when combat starts.
- A mage's orb floats and orbits near the shoulder.
- **Four starting class looks** (Joshua's own Gemini image from his text, 2026-09-24, kept
  outside the repo at `C:\DREAM\recon\concepts\2026-09-24\joshua-class-examples-gemini.jpg`; it is
  pixel art, so it guides class, silhouette, palette and gear, not rendering style):
  1. Knight: silver plate with gold trim, winged helm, sword and a lion-crest shield.
  2. Elf archer: leather armour, green hooded cloak, longbow, light and quick.
  3. Mage: dark flowing robes with glowing violet and blue runes, staff, spell light at the hand.
  4. Dark knight: jagged black and red plate, glowing red polearm, red cape, a dragon motif.
  Each is redrawn in the both-worlds fusion style before it is modelled.
- **The same classes in the night city** (Joshua's own Gemini images, 2026-09-24, kept at
  `C:\DREAM\recon\concepts\2026-09-24\joshua-city-classes-1..4.jpg`; approved by the judge as the
  target mood). The knight wears plate over a tactical vest with the lion shield and sword; the
  archer mixes leather with modern boots and a visor and fights from ledges and rooftops; the
  mage wears violet robes over street clothes with large blue spell circles; the dark knight is
  spiked black plate with glowing red seams and a glowing red polearm. The Night Dream city
  target is: rain, wet streets reflecting neon, glass towers with lit windows, crowds under
  umbrellas, cars with headlights, graffiti walls and alley bins. None of these pictures goes
  into the repository or into a generator; workers get these words.
- **Knight look chosen** (Joshua, 2026-09-24, from `joshua-city-classes-1.jpg`): steel helmet
  with dark visor goggles, plate pauldrons, vambraces and greaves over an olive tactical vest
  with pouches and belts, dark undersuit, the lion-crest shield and a long straight sword. This is
  the knight class's reference look in both worlds.
- **The modern-feel set** (Joshua, 2026-09-24, `joshua-modern-classes-and-mythas.jpg`, his own
  Gemini image; the strongest reference so far). Knight: ornate dark plate with gold filigree over
  a tactical vest full of pouches, goggles pushed up on the helm, lion shield, long sword. Archer:
  headset and glasses, a high-tech bow with a glowing blue string and ring details, dark cloak
  over leather with pouches, shooting from rooftops over a river city. Mage: glasses, violet and
  black robes with gold patterns, a floating spell book, large blue spell circles. The red dark
  knight in that set becomes the boss **Myth@s** (see `docs/gdd/02-action-combat.md`).
- **Walking around, out of combat** (Joshua, 2026-09-24, `joshua-walking-city-1.jpg` and
  `-2.jpg`). Every class stows its weapon on the back while walking: the knight's sword and
  shield, the archer's bow, Myth@s's polearm; the mage shows no staff or book until she casts.
  The walk is calm and confident, shoulders relaxed, among ordinary city people with umbrellas
  and briefcases on wet crosswalks. The knight wears his goggles down while walking and pushes
  them up in combat. Weapons come to hand only when a fight starts. The Night Dream city needs
  ambient pedestrian crowds for this to read.
- Concept art is generated locally in ComfyUI (Z-Image Turbo, Apache 2.0) from generic words
  only. Reference pictures Joshua shares are read for mood, materials and proportion, and are
  never given to a generator or copied.

## Rules

- Every asset is free and its licence is CC0 (or another licence that allows commercial use,
  modification and AI-assisted pipelines with no attribution trap). The licence line is read
  and written into `assets/third_party/LICENSES.md` with its source URL before the asset is used.
- Nothing that imitates another game's designs. No asset marked no-AI.
- The recording credits third-party assets on the end card.
- Headless tests keep passing; new behaviour gets a failing test first where it is logic.
- The live interactive slice must still run at a playable frame rate on the RX 6800; the
  expensive settings apply to the `--demo` recording path.
- Imported assets stay under about 80 MB in the repository.

## Done means

A re-recorded `dream-demo.mp4`, and a judge who has opened frames at 1, 3, 10, 25, 40, 55 and 70
seconds and finds no box people, no flat untextured ground, and no washout.
