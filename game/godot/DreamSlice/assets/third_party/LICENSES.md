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
kept well under the ~40 MB repository budget (spec 003) at roughly 9.4 MB
total.

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

"Characters: base rig and animations by Quaternius (quaternius.com), CC0."

## Known gaps (see the report this work shipped with for the full list)

- The rig ships as a bare grey mannequin with no clothing or armour
  geometry; "layered leather and steel", "a robed woman" and
  "stone-and-iron" currently read through material colour/metallic/
  roughness only. Quaternius's own "Modular Character Outfits - Fantasy"
  pack (CC0, built to fit this exact rig) is the natural next step, but its
  only distribution found was itch.io's click-through purchase flow.
- No PBR texture maps (albedo detail, normal, roughness/metallic, an
  emissive mask for the accent glows) exist yet for the mannequin.
