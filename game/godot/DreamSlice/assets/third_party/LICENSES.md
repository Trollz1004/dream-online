# Third-party assets

Every asset here is CC0 1.0 (public domain dedication) from Poly Haven
(https://polyhaven.com/license, read 2026-09-24): "You can use our assets for
any purpose, including commercial work"; modification and redistribution are
unrestricted; "You do not need to give credit or attribution when using them
(although it is appreciated)." No login was required to fetch any file, none
is marked no-AI, and CC0 explicitly clears AI-assisted pipelines. The
recording still credits Poly Haven on the end card (spec 003, "the recording
credits third-party assets on the end card"), as the appreciated-not-required
courtesy above.

All files are the 1K JPG (or, for the HDRI, the 1K `.hdr`) resolution tier,
kept well under the ~40 MB repository budget (spec 003) at roughly 16 MB of
texture total (the three armor/leather/fabric texture sets added 2026-09-24
for "Character direction" brought this up from ~9.4 MB). The tree and ruin
glTF models (below) add a further ~16.2 MB of imported meshes. Comfortably
under this task's own tighter 30 MB ceiling for the character-direction
work specifically, and under the repo's own 80 MB `assets/third_party`
budget overall.

## Ground: Aerial Grass Rock

- Source: https://polyhaven.com/a/aerial_grass_rock
- Author: Rob Tuytel, via Poly Haven
- License: CC0 1.0
- Files: `textures/ground/aerial_grass_rock_diff_1k.jpg` (albedo),
  `textures/ground/aerial_grass_rock_nor_gl_1k.jpg` (OpenGL-convention normal
  map, matches Godot), `textures/ground/aerial_grass_rock_rough_1k.jpg`
  (roughness)
- Used for: the Day Dream field's PBR ground material (`scripts/dream_env.gd`)

## Rock: Rock Face 03

- Source: https://polyhaven.com/a/rock_face_03
- Author: Poly Haven
- License: CC0 1.0
- Files: `textures/rock/rock_face_03_diff_1k.jpg` (albedo),
  `textures/rock/rock_face_03_nor_gl_1k.jpg` (normal),
  `textures/rock/rock_face_03_arm_1k.jpg` (packed AO/roughness/metallic --
  Poly Haven's "arm" map, R=AO, G=roughness, B=metallic, read with Godot's
  `ORMMaterial3D`)
- Used for: scattered rocks, dry-stone walls and cottage/ruin stone facing in
  the Day Dream field

## Facade: Concrete Wall 003

- Source: https://polyhaven.com/a/concrete_wall_003
- Author: Poly Haven
- License: CC0 1.0
- Files: `textures/facade/concrete_wall_003_diff_1k.jpg`,
  `textures/facade/concrete_wall_003_nor_gl_1k.jpg`,
  `textures/facade/concrete_wall_003_arm_1k.jpg` (packed AO/roughness/metallic)
- Used for: Night Dream tower facades (`scripts/dream_env.gd`)

## Street: Asphalt 02

- Source: https://polyhaven.com/a/asphalt_02
- Author: Rob Tuytel, via Poly Haven
- License: CC0 1.0
- Files: `textures/street/asphalt_02_diff_1k.jpg`,
  `textures/street/asphalt_02_nor_gl_1k.jpg`,
  `textures/street/asphalt_02_arm_1k.jpg` (packed AO/roughness/metallic)
- Used for: the Night Dream wet street, with SSR (screen-space reflections,
  desktop only) doing the actual reflection work over a low-roughness variant
  of this material

## Sky

The Day Dream sky's clouds (`_build_sky_clouds` in `scripts/dream_env.gd`) are
generated at runtime from Godot's own built-in `FastNoiseLite` and
`NoiseTexture2D` -- no downloaded image. A Poly Haven HDRI
(`kloofendal_48d_partly_cloudy`) was evaluated as the sky background itself
but not used: swapping the whole sky out from under the hand-tuned
`ProceduralSkyMaterial` gradient (many judge-review passes recorded in this
file's own git history) risked undoing that tuning with no cheap way to
re-validate it, so the procedural noise-cloud layer was kept instead, over
the existing gradient. Nothing from that HDRI download shipped, so it is not
listed as a used asset here.

## Characters (spec 003, lever 1)

Every asset below was read at its source before use. Each is CC0 1.0 Universal
(no attribution required, free for commercial use, modification and
AI-assisted pipelines) with no no-AI marking.

## Quaternius — "Universal Base Characters" / "Universal Animation Library"

- Author: Quaternius (www.quaternius.com / quaternius.itch.io)
- Licence: CC0 1.0 Universal — http://creativecommons.org/publicdomain/zero/1.0/
- Licence read at the author's own pack pages (each states the same thing,
  full text below), fetched directly:
  - https://quaternius.com/packs/universalbasecharacters.html
  - https://quaternius.com/packs/universalanimationlibrary.html
  - Site-wide terms: https://quaternius.com/license.html

  > License: CC0 — http://creativecommons.org/publicdomain/zero/1.0/
  > Free to use in personal, educational and commercial projects. (CC0 License)

  Site-wide terms add: "You can use these assets, free of charge, in
  personal, educational, and commercial games and other projects, with no
  credit required. You just can't resell or redistribute the assets
  themselves as assets." No no-AI clause; AI-assisted pipelines are not
  restricted.

- File used: one shared rigged, animated body plays all three kinds
  (dreamwalker, keeper, sentinel), distinguished by material tint, scale
  and a small accent light — `assets/third_party/quaternius/
  UniversalBaseCharacter.glb`. 44 animation clips are baked in (Idle, Walk,
  Jog_Fwd, Sprint, Roll, Sword_Idle, Sword_Attack, Sword_Attack_RM,
  Spell_Simple_*, Hit_Chest, Hit_Head, Death01, Idle_Talking, Punch_*,
  Pistol_*, Sitting_*, Swim_*, Crouch_*, etc.) — Quaternius's own combined
  preview of the "Universal Base Characters" rig paired with the "Universal
  Animation Library" clip set, both CC0.

- Provenance note, stated plainly: Quaternius's own download buttons on the
  pages above route through itch.io's purchase-flow widget (a manual
  click-through, even for a $0 item) — per spec 003's rule, that was not
  scripted around. The actual bytes were instead fetched from
  **poly.pizza** (`https://static.poly.pizza/0b65e14d-a349-44cc-836c-
  efdeb6933d48.glb`, model page `https://poly.pizza/m/cwYvO5UauX`,
  "Animated Base Character — Free 3D Model By Quaternius"), a public
  aggregator that mirrors this exact Quaternius file as a plain, unauthenticated
  static download with no login and no click-through, explicitly labelled
  "Free download... No login required" and attributed to Quaternius. The
  licence terms above, read at Quaternius's own site, are what govern the
  file regardless of which of the author's own mirrors served the bytes.

- Size: `UniversalBaseCharacter.glb` is 2.2 MB, comfortably under the
  spec's 40 MB import budget and the repo's 80 MB budget.

## Trees and ruins (spec 003, second production-look pass)

The judge's own read of the first pass's frames: "stick trees made of
cylinders, cone-shaped mountains, and box houses with pyramid roofs." This
pass replaces the first two literally and the mountain with a heightmap mesh
(below); every model here is CC0 1.0 Universal, read at the author's own site
before use, fetched as a plain unauthenticated download with no login and no
click-through.

### Quaternius — "Dead Tree", "Twisted Tree" and "Tree" (nature packs)

- Author: Quaternius (quaternius.com / quaternius.itch.io)
- Licence: CC0 1.0 Universal — http://creativecommons.org/publicdomain/zero/1.0/,
  the same site-wide terms already quoted above for the character rig:
  "Free to use in personal, educational, and commercial games and other
  projects, with no credit required."
- Fetched from poly.pizza's static CDN, the same provenance already used for
  `UniversalBaseCharacter.glb` (Quaternius's own itch.io download buttons
  route through a purchase-flow click-through even for a $0 item; poly.pizza
  mirrors the exact same CC0 files as a plain static download):
  - `DeadTree.glb` — https://poly.pizza/m/n8FhMgMldD ("Dead Tree — Free 3D
    Model By Quaternius"), bytes at
    `https://static.poly.pizza/c02771ac-10db-420b-9426-86f26ae0869a.glb`. A
    bare, bark-only mesh with no leaf material — the "gnarled bare" tree the
    spec calls for.
  - `TwistedTree.glb` — https://poly.pizza/m/7PDBpElkQr ("Twisted Tree"),
    bytes at
    `https://static.poly.pizza/229336e6-4632-4bc7-af2e-ec1f3c8245f7.glb`. A
    gnarled trunk with a sparse leaf canopy.
  - `CommonTree.glb` — https://poly.pizza/m/qZtx0AHhcy ("Tree"), bytes at
    `https://static.poly.pizza/24cf9df9-435f-408e-971b-640d670ce973.glb`. A
    plainer tree for variety in the "sparse old-world" scatter.
- Used for: every tree in the Day Dream field (`scripts/dream_env.gd`,
  `_build_trees`/`_place_tree`), replacing the recursive branch-cylinder
  trees this pass removed. Each of the eleven original tree positions picks
  one of the three models round-robin, uniformly rescaled to a randomised
  5.5–9.5 m height (each source model's own native height differs — read off
  its imported mesh, not assumed) and given a random yaw, so the same three
  meshes never repeat identically.
- Import note: each file's glTF import is set to embed its own textures
  (`gltf/embedded_image_handling=3`) rather than the importer's default of
  extracting them as separate loose files in this folder — the textures are
  already inside the `.glb` on disk; extracting them a second time would
  only double the committed size for no benefit, since the extracted copies
  never leave `.godot/imported/`'s own gitignored cache anyway once embedded.
- Size: 2.60 MB (`DeadTree.glb`) + 3.08 MB (`TwistedTree.glb`) + 2.54 MB
  (`CommonTree.glb`) = 8.22 MB.

### Quaternius — "Modular Ruins Pack"

- Author: Quaternius (quaternius.com), the same combined-preview pack as
  quaternius.com's "Ultimate Modular Ruins Pack" page
  (https://quaternius.com/packs/ultimatemodularruins.html), read directly:
  "CC0" (linking the same public-domain-zero licence), "90 total models, all
  textured."
- Fetched from poly.pizza: https://poly.pizza/m/F2LAK03B0r ("Modular Ruins
  Pack — Free 3D Model By Quaternius"), bytes at
  `https://static.poly.pizza/fa6cf69d-a091-4eb7-b62e-56290d8b9097.glb` — a
  single file bundling dozens of individual pieces (walls, windows, broken
  archways, floor slabs, rubble, freestanding arches) as one shared preview
  scene, each piece a separate named node with its own real-world scale.
- Used for: the ruined village along the cart track
  (`scripts/dream_env.gd`, `_build_ruin_village`/`_build_ruin_structure`),
  replacing the procedural box cottages with pyramid roofs. Four small
  roofless 4×4 m rooms (one wall always the pack's own 4 m broken round
  archway; the other three walls built from the kit's 2 m wall, window-hole
  and window-bar modules; one module per room swapped for a rubble pile) at
  the same four spots the box cottages stood, plus a freestanding gothic
  archway with a column, a tree-through-floor slab, and scattered brick and
  trapdoor rubble between them. Every piece is read from the imported scene
  by name and reused at a fresh position via its own transform basis (never
  its shelf position in the original preview) — see the code comment on
  `_load_ruin_piece` for exactly how a piece's real-world size and pivot were
  confirmed against the imported scene rather than assumed from the raw
  glTF's own per-node scale (several pieces carry a non-uniform scale there
  that Godot's own importer resolves correctly).
- Import note: embedded-texture handling set the same way as the tree
  models above (`gltf/embedded_image_handling=3`), for the same reason.
- Size: 7.97 MB.

### Mountain range: not a downloaded asset

The far mountain range (`_build_mountain`/`mountain_height` in
`scripts/dream_env.gd`) is a heightmap-displaced mesh generated at runtime
from a ridged sine multifractal — no imported model, the same "generated at
runtime, no imported asset" choice already made for the Day Dream's sky
clouds above. A CC0 mountain model was the spec's other listed option, but a
single downloaded model would need to tile or repeat to fill the same wide
backdrop this heightmap already covers with real, non-repeating ridges and
valleys and per-vertex rock/snow shading, so nothing was fetched for it.

## Armor, clothing and construct plating (spec 003, "Character direction", 2026-09-24)

Quaternius's own matching outfit pack ("Modular Character Outfits - Fantasy",
CC0, built to fit this exact rig) is still only distributed behind itch.io's
click-through purchase flow (see "Known gaps" below and the revision note in
`scripts/character_model.gd`'s header) -- per spec 003's rule, that was not
scripted around. Instead, every character now wears procedurally-built
BoneAttachment3D armor/clothing geometry (plates, pauldrons, bracers,
greaves, a cape, a coat), textured with two more free Poly Haven CC0 sets
plus a reuse of the Rock/street sets already listed above. Read at the same
source pages as the ground/rock/facade/street sets above, all under the same
Poly Haven site-wide CC0 terms quoted at the top of this file.

### Armor: Metal Plate 02

- Source: https://polyhaven.com/a/metal_plate_02
- Author: Rob Tuytel, via Poly Haven
- License: CC0 1.0
- Files: `textures/armor/metal_plate_02_diff_1k.jpg` (albedo),
  `textures/armor/metal_plate_02_nor_gl_1k.jpg` (normal),
  `textures/armor/metal_plate_02_arm_1k.jpg` (packed AO/roughness/metallic)
- Used for: the dreamwalker's plate armor and mail skirt (tinted dark for the
  mail), Mireth's mail wrist cuffs, and the Sentinel's iron plate, harness
  buckle rune backing and (retinted lighter) its "fur" cuff trim
  (`scripts/character_model.gd`)

### Leather: Brown Leather

- Source: https://polyhaven.com/a/brown_leather
- Author: Rob Tuytel, via Poly Haven
- License: CC0 1.0
- Files: `textures/leather/brown_leather_diff_1k.jpg` (albedo),
  `textures/leather/brown_leather_nor_gl_1k.jpg` (normal),
  `textures/leather/brown_leather_arm_1k.jpg` (packed AO/roughness/metallic)
- Used for: the dreamwalker's and Mireth's belts, and the Sentinel's harness
  straps, waist band and (retinted) fur-look cuff trim
  (`scripts/character_model.gd`)

### Fabric: Quatrefoil Jacquard Fabric

- Source: https://polyhaven.com/a/quatrefoil_jacquard_fabric
- Author: colormass (photography), Rico Cilliers (processing), via Poly Haven
- License: CC0 1.0
- Files: `textures/fabric/quatrefoil_jacquard_fabric_diff_1k.jpg` (albedo),
  `textures/fabric/quatrefoil_jacquard_fabric_nor_gl_1k.jpg` (normal),
  `textures/fabric/quatrefoil_jacquard_fabric_arm_1k.jpg` (packed
  AO/roughness/metallic)
- Used for: Mireth's long coat-robe, its high collar and its two small
  shoulder capes, tinted rust-red (`scripts/character_model.gd`)

### Reused, no new download

- The Sentinel's own eye accent stays the amber/violet telegraph colour
  dummy.gd reads directly; nothing new was added for it.
- Rock Face 03 (already listed above, licensed for the Day Dream field's
  rocks) was evaluated for the Sentinel's plates during design but the
  concept art review below moved the Sentinel to riveted iron plate instead,
  so Rock Face 03 is not actually used by character_model.gd.

## Character direction reference art (not a repository asset)

Joshua's own request of 2026-09-24 pointed this pass at concept art the
judge lane generated locally in ComfyUI (Z-Image Turbo, Apache 2.0) from
generic words: `concept_fusion_knight_00002_.png`, `concept_fusion_
mage_00002_.png` and `concept_brute_00001_.png`, kept outside the repository
at `C:\DREAM\recon\concepts\2026-09-24\` on the Alienware node. Per spec
003's own rule ("Concept art is generated locally... Reference pictures
Joshua shares are read for mood, materials and proportion, and are never
given to a generator or copied") and this task's own instruction, these
images were opened and read for silhouette, palette and material only --
never copied into the repository, never fed to a generator, and are not
listed as a used asset because nothing from them ships as a file.

## Revision history

- First pass (superseded): KayKit by Kay Lousberg (kaylousberg.com), CC0 —
  `KayKit-Character-Pack-Adventures-1.0` (Knight.glb, Mage.glb) and
  `KayKit-Character-Pack-Skeletons-1.0` (Skeleton_Warrior.glb), fetched
  directly from their GitHub repos (also CC0, also a plain login-free
  fetch). Replaced the same day on Joshua's judgement that the pack's
  chunky, big-headed proportions read as "toy" rather than the realistic,
  cinematic-fantasy look spec 003 asks for. Nothing from that pass ships;
  it is recorded here only so the substitution is not silently lost.

## Credits for the recording's end card

"Characters, trees and ruins: models by Quaternius (quaternius.com), CC0.
Ground, rock, facade, street, armor, leather and fabric textures: Rob
Tuytel, colormass and Rico Cilliers, via Poly Haven (polyhaven.com), CC0."

## Known gaps

- Quaternius's own "Modular Character Outfits - Fantasy" pack (CC0, built to
  fit this exact rig) is still the natural upgrade over the procedural
  BoneAttachment3D geometry the "Character direction" pass (2026-09-24)
  built instead, but its only distribution found remains itch.io's
  click-through purchase flow.
- The Sentinel reads as a hulking brute in riveted iron plate, per the
  judge lane's own concept art, but this rig's head is the same generic
  mannequin head as the other two kinds -- there is no tusked, grey-skinned
  face to sculpt without a from-scratch head mesh, so its "brow-cap" sits up
  and back rather than replacing the face.
- The dreamwalker's and the Sentinel's plate pieces are primitive
  spheres/cylinders/boxes, not sculpted plate silhouettes; the layered-dome
  pauldron and the mail-skirt lathe are this pass's best low-poly
  approximation of the concept art's actual plate shapes.
- Cloth (the dreamwalker's cape and hood, Mireth's coat, collar and shoulder
  capes) is rigid BoneAttachment3D geometry with no cloth simulation -- it
  follows the torso's own rotation, not real drape or wind.
