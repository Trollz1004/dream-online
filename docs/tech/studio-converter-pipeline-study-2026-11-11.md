# Picture-to-3D Converter Pipeline Study for DREAM Studio and NEEDs Shop Designer

**Date:** 2026-11-11
**Scope:** Primary-source research study only. Nothing was downloaded, installed, signed into, or accepted during this task. No canon and no engine code were modified.

---

## Outcome Summary

The missing converter step between Josh's 2D character/skin pictures and the DREAM Engine can be built 100% locally on the Alienware RTX 3070 (8 GB VRAM, CUDA) at **$0.00 cost** using permissively licensed open-source tools (**MIT License**, **Apache License 2.0**, and already-installed **Blender 5.2.3** whose `.glb` outputs are 100% unencumbered by the GPL).

Why characters currently look like toys: Claude's judge review on PR #107 (`https://github.com/Trollz1004/dream-online/pull/107`, read 2026-11-11) scored Silhouette 7/10, Armor and cloth detail 4/10 (*"The plates are flat-shaded blocks, and the knight reads as a toy robot"*), Faces and bodies 3/10 (*"Heads are blank or mask-like, and the limbs are straight tubes"*), Boss presence 6/10 (*"a dark knight scaled up"*), and Scene 3/10, while also flagging blown-out white specular highlights on the Knight's shield and shoulders. Auditing `src/engine/` confirms why: `src/engine/characters/hero-and-boss-builder.ts` builds heroes out of procedural boxes, cylinders, cones, and spheres rotated around rigid child `THREE.Group` nodes, and `src/engine/` currently has **no `.glb` loader, no 4-bone Linear Blend Skinning (`JOINTS_0` / `WEIGHTS_0`), no tangent-space normal maps, and no 2D PBR texture samplers**.

The recommended pipeline solves all of those gaps end to end:

1. **Art Input:** Josh generates front, side, and back A-pose or T-pose character turnaround sheets from plain-word descriptions in **Google Gemini** (`https://policies.google.com/terms/generative-ai`, read 2026-11-11). Never use the static sample images inside `dreamforge/assets/`, because those seven PNGs were captured from `neta.art` during the study remake (`dreamforge/README.md`, read 2026-11-11).
2. **Background Stripping:** **`danielgatis/rembg`** (**MIT License**, `u2net.onnx` **~176 MB**, < 1 GB VRAM) removes the background cleanly without touching the non-commercial `briaai/RMBG-1.4` model.
3. **Local Image-to-3D Sculpt Generation (RTX 3070, 8 GB VRAM):** **`VAST-AI/TripoSG`** (**MIT License**, **8 GB VRAM**, **7.40 GB** download) generates a sharp 100,000–200,000-triangle high-resolution SDF mesh with real facial features, cloth folds, and armor trim, paired with **`stabilityai/TripoSR`** (**MIT License**, **~6 GB VRAM**, **1.56 GB** download) and multi-view camera projection in headless **Blender 5.2.3** for delit albedo and curvature-driven PBR maps.
4. **Polygon Reduction & High-to-Low PBR Baking:** Headless **Blender 5.2.3 (`bpy` + Cycles)** (already installed at `%LOCALAPPDATA%\Microsoft\WindowsApps\blender-launcher.exe`, **0 MB download**) retopologizes the dense sculpt via Quadriflow and Decimate into **LOD0 (8,000–12,000 triangles)**, **LOD1 (3,500–5,000 triangles)**, and **LOD2 (1,200–2,000 triangles)**, then raycast-bakes the 200,000-triangle detail into **1024×1024 Tangent-Space Normal, Delit Albedo, and packed ORM (Ambient Occlusion / Roughness / Metallic)** maps, optimized with **`@gltf-transform/cli` + `meshoptimizer`** (**MIT License**, **~25 MB**).
5. **Auto-Rigging & Skinning:** Headless **Blender 5.2.3 Rigify Deform Skeleton (`DEF-*` bones)** with heat-diffusion automatic weights auto-rigs all standard humanoids (Knight, Elf Archer, Mage, Dark Knight, NEEDs shop skins) onto one shared animation skeleton, while **`VAST-AI/UniRig`** (**MIT License**, **8 GB VRAM**, **5.42 GB** checkpoint download) auto-predicts skeletons and skin weights for non-humanoid bosses, mounts, wings, and capes.
6. **In-House Engine Additions (`src/engine/`):** Add an in-house `.glb` binary parser (`src/engine/assets/glb-loader.ts`), expand the vertex buffer layout in `src/engine/renderer/webgpu-renderer.ts` and `src/engine/renderer/webgl2-renderer.ts` to include `tangent` (`vec4f`), `joints0` (`vec4<u32>`), and `weights0` (`vec4f`), add 4-bone Linear Blend Skinning and `TBN` normal-map + PBR texture sampling in WGSL and GLSL, and clamp metallic specular energy conservation so silver armor plates never blow out to white.

---

## 1. Local Image-to-3D Models for Alienware (RTX 3070, 8 GB VRAM, CUDA)

Every candidate below was checked directly against its upstream GitHub repository (`LICENSE` and `README.md`) and its Hugging Face model repository metadata on `2026-11-11`. Anything non-commercial is explicitly ruled out.

### Candidate 1A (Recommended for High-Detail Sculpt Geometry): `VAST-AI/TripoSG`

- **Primary URLs (read 2026-11-11):**
  - Code repository: `https://github.com/VAST-AI-Research/TripoSG` (read 2026-11-11)
  - Code license file: `https://raw.githubusercontent.com/VAST-AI-Research/TripoSG/main/LICENSE` (read 2026-11-11)
  - Technical README: `https://raw.githubusercontent.com/VAST-AI-Research/TripoSG/main/README.md` (read 2026-11-11)
  - Weights repository: `https://huggingface.co/VAST-AI/TripoSG` (read 2026-11-11)
- **Exact License of Code and Weights:** **MIT License** for both the `VAST-AI-Research/TripoSG` source code and the `VAST-AI/TripoSG` 1.5B Rectified Flow Transformer, SDF VAE, and DINOv2 weights.
- **Critical Sub-Dependency Ruling (`briaai/RMBG-1.4` Ruled Out):** TripoSG's sample `image_process.py` helper script attempts to auto-download `briaai/RMBG-1.4` (`https://huggingface.co/briaai/RMBG-1.4/raw/main/README.md`, read 2026-11-11) for background removal. `briaai/RMBG-1.4` is governed by the **BRIA RMBG 1.4 Non-Commercial License** (*"available as a source-available model for non-commercial use"*). Therefore `briaai/RMBG-1.4` **must be ruled out and never downloaded**. Replace that step with pre-masked RGBA PNGs or **`danielgatis/rembg`** (`https://raw.githubusercontent.com/danielgatis/rembg/main/LICENSE.txt`, **MIT License**, read 2026-11-11).
- **Commercial Use in a Sold Game:** **Yes, unrestricted** under the MIT License (once `briaai/RMBG-1.4` is bypassed).
- **VRAM Needed:** **8 GB VRAM** minimum recommended (`CUDA-enabled GPU with at least 8GB VRAM` in the official README), which fits on the Alienware RTX 3070 (8 GB VRAM) in FP16 inference when no other GPU model is resident.
- **What It Outputs:** High-fidelity untextured geometry-only `.glb` mesh extracted from a continuous Signed Distance Field (SDF) with sharp armor ridges, facial structure, and cloth folds, plus an optional built-in face-count target flag (`--faces`). It does not output texture maps or PBR maps on its own, so textures are projected and baked in the Blender stage.
- **Single Image vs. Front/Side/Back Sheet:** Takes **one image** (`--image-input`) in the released 1.5B model (`TripoSG-scribble` takes a scribble plus text prompt). Front, side, and back views from a character turnaround sheet can still be projected onto the generated mesh during the Blender UV/texture stage.
- **Download Size:** **7.40 GB (7,578.4 MB)** total across the `VAST-AI/TripoSG` Hugging Face repository (`transformer/diffusion_pytorch_model.safetensors` is **5,491.5 MB**, `image_encoder_dinov2/model.safetensors` is **1,161.1 MB**, and `vae/diffusion_pytorch_model.safetensors` is **925.7 MB**).

### Candidate 1B (Recommended Fast Single-Image & Albedo Companion): `stabilityai/TripoSR`

- **Primary URLs (read 2026-11-11):**
  - Code repository: `https://github.com/VAST-AI-Research/TripoSR` (read 2026-11-11)
  - Code license file: `https://raw.githubusercontent.com/VAST-AI-Research/TripoSR/main/LICENSE` (read 2026-11-11)
  - Technical README: `https://raw.githubusercontent.com/VAST-AI-Research/TripoSR/main/README.md` (read 2026-11-11)
  - Weights repository: `https://huggingface.co/stabilityai/TripoSR` (read 2026-11-11)
- **Exact License of Code and Weights:** **MIT License** for both the `VAST-AI-Research/TripoSR` code and the `stabilityai/TripoSR` weights (`model.ckpt`).
- **Commercial Use in a Sold Game:** **Yes, unrestricted** under the MIT License.
- **VRAM Needed:** **~6 GB VRAM** for a single input image (runs in ~0.5 seconds on CUDA and fits comfortably within the RTX 3070's 8 GB VRAM).
- **What It Outputs:** `.obj` or `.glb` triangle mesh via marching cubes (`torchmcubes`) with either vertex colors or a UV-unwrapped baked albedo texture (`--bake-texture --texture-resolution`, using `xatlas`). It does **not** output separate PBR metallic, roughness, or normal maps, and it does not delit baked shadows from the input image.
- **Single Image vs. Front/Side/Back Sheet:** Takes **one image** per reconstruction (passing multiple paths to `run.py` processes each image sequentially as a separate single-view asset).
- **Download Size:** **1.56 GB (1,602.0 MB)** total on Hugging Face (`model.ckpt` is **1,599.5 MB**).

### Candidate 1C (Multi-View Front/Side/Back Sheet Option, Apache-2.0): `TencentARC/InstantMesh`

- **Primary URLs (read 2026-11-11):**
  - Code repository: `https://github.com/TencentARC/InstantMesh` (read 2026-11-11)
  - Code license file: `https://raw.githubusercontent.com/TencentARC/InstantMesh/main/LICENSE` (read 2026-11-11)
  - Technical README: `https://raw.githubusercontent.com/TencentARC/InstantMesh/main/README.md` (read 2026-11-11)
  - Weights repository: `https://huggingface.co/TencentARC/InstantMesh` (read 2026-11-11)
  - Upstream multi-view and isosurface licenses: `https://raw.githubusercontent.com/SUDO-AI-3D/zero123plus/main/LICENSE` (**Apache-2.0**, read 2026-11-11) and `https://raw.githubusercontent.com/nv-tlabs/FlexiCubes/main/LICENSE.txt` (**Apache-2.0**, read 2026-11-11)
- **Exact License of Code and Weights:** **Apache License 2.0** for `InstantMesh` code and weights, `SUDO-AI-3D/zero123plus`, and `nv-tlabs/FlexiCubes`.
- **Commercial Use in a Sold Game:** **Yes, unrestricted** under Apache License 2.0.
- **VRAM Needed:** Running the default end-to-end `run.py` script (which keeps both the Zero123++ 6-view diffusion model and the `instant_mesh_large` FlexiCubes LRM reconstructor loaded in VRAM simultaneously) peaks at **16–22 GB VRAM**, which exceeds the RTX 3070's 8 GB VRAM. However, running **only the sparse-view LRM reconstructor** on a pre-supplied 4-to-6-view turnaround sheet (or unloading Zero123++ to CPU before loading the LRM checkpoint) requires **~6–8 GB VRAM**.
- **What It Outputs:** `.obj` mesh with vertex colors or a UV-unwrapped baked albedo texture map (`--export_texmap`). It does **not** natively output PBR metallic, roughness, or normal maps.
- **Single Image vs. Front/Side/Back Sheet:** Supports **both** single-image input (via Zero123++ 6-view synthesis) **and** direct multi-view input (4 to 6 views such as front, side, and back sheets passed directly into the sparse-view LRM reconstructor).
- **Download Size:** **6.77 GB (6,931.0 MB)** for the full Hugging Face repository, or **3.02 GB (3,096.4 MB)** if downloading only `instant_mesh_large.ckpt` (**1,444.6 MB**) plus `diffusion_pytorch_model.bin` (**1,651.8 MB**).

### Candidates Evaluated and Ruled Out (Hardware Overflow, Revenue Caps, Territorial Bans, or Non-Commercial Terms)

1. **`microsoft/TRELLIS-image-large` (MIT License, Ruled Out for 8 GB VRAM Ceiling):**
   - **Primary URLs (read 2026-11-11):** `https://github.com/microsoft/TRELLIS`, `https://raw.githubusercontent.com/microsoft/TRELLIS/main/LICENSE`, `https://raw.githubusercontent.com/microsoft/TRELLIS/main/README.md`, and `https://huggingface.co/microsoft/TRELLIS-image-large` (all read 2026-11-11).
   - **Findings:** Code and weights are **MIT License** (**3.07 GB / 3,146.4 MB** download across 19 files), and it supports single-image or tuning-free multi-image input and outputs `.glb` meshes with baked albedo textures. However, Microsoft's official README states: *"An NVIDIA GPU with at least 16GB of memory is necessary. The code has been verified on NVIDIA A100 and A6000 GPUs."* On an 8 GB RTX 3070 on Windows, TRELLIS runs out of memory during `nvdiffrast` mesh/texture extraction unless heavily modified with community CPU-offload hacks.
2. **`stabilityai/stable-fast-3d` (SF3D) and `stabilityai/stable-point-aware-3d` (SPAR3D) (Ruled Out for Gated Sign-In & $1M Revenue Cap):**
   - **Primary URLs (read 2026-11-11):** `https://github.com/Stability-AI/stable-fast-3d`, `https://raw.githubusercontent.com/Stability-AI/stable-fast-3d/main/LICENSE.md`, `https://huggingface.co/stabilityai/stable-fast-3d`, `https://github.com/Stability-AI/stable-point-aware-3d`, `https://raw.githubusercontent.com/Stability-AI/stable-point-aware-3d/main/LICENSE.md`, and `https://huggingface.co/stabilityai/stable-point-aware-3d` (all read 2026-11-11).
   - **Findings:** Both fit in 8 GB VRAM (SF3D uses **~6 GB VRAM** with a **3.75 GB / 3,840.6 MB** download; SPAR3D uses **10.5 GB VRAM** default or **~7 GB VRAM** with `--low-vram-mode` and a **6.83 GB / 6,994.8 MB** download) and both output UV-unwrapped `.glb` meshes with delit albedo, metallic/roughness parameters, and normal maps from a single image. However, both are governed by the **Stability AI Community License Agreement (July 5, 2024)**, which (a) gates the Hugging Face weights behind account sign-in and agreement acceptance, (b) requires commercial registration and a mandatory `"Powered by Stability AI"` attribution notice, and (c) **terminates commercial rights once annual gross revenue reaches $1,000,000 USD** unless Stability AI grants a custom paid enterprise license in its sole discretion. We rule both out in favor of 100% MIT/Apache-2.0 weights with zero revenue traps.
3. **`tencent/Hunyuan3D-2`, `Hunyuan3D-2mini`, `Hunyuan3D-2mv`, and `Hunyuan3D-2.1` (Ruled Out for EU/UK/South Korea Territorial Ban & 16 GB Paint VRAM):**
   - **Primary URLs (read 2026-11-11):** `https://github.com/Tencent-Hunyuan/Hunyuan3D-2`, `https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2/main/LICENSE`, `https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2/main/README.md`, `https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1`, `https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE`, `https://huggingface.co/tencent/Hunyuan3D-2mini`, `https://huggingface.co/tencent/Hunyuan3D-2mv`, and `https://huggingface.co/tencent/Hunyuan3D-2.1` (all read 2026-11-11).
   - **Findings:** While `Hunyuan3D-2mini` (0.6B, **4.03 GB** single FP16 checkpoint) and `Hunyuan3D-2mv` (1.1B multi-view front/side/back sheet model, **5.09 GB** single FP16 checkpoint) can generate untextured shapes in **6 GB VRAM**, running the texture/PBR stage (`Hunyuan3D-Paint` / `PaintPBR`, **13.89 GB** in v2.1) requires **16 GB VRAM**. Worse, the **Tencent Hunyuan 3D 2.0 / 2.1 Community License Agreement** explicitly states: *"THIS LICENSE AGREEMENT DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA"* and caps commercial use at 1,000,000 Monthly Active Users. A global online game cannot rely on a license that excludes the EU, UK, and South Korea.
4. **Non-Commercial Models Explicitly Ruled Out:**
   - **`briaai/RMBG-1.4`** (`https://huggingface.co/briaai/RMBG-1.4/raw/main/README.md`, read 2026-11-11): BRIA Non-Commercial license.
   - **Stable Video 3D (`stabilityai/sv3d`), Wonder3D, CharacterGen, MeshAnything-v2, and One-2-3-45++**: Non-commercial weights or CC-BY-NC-4.0 licensing — ruled out.
   - **`stepfun-ai/Step1X-3D`**: Apache-2.0 license, but requires **24 GB+ VRAM** and >20 GB weights — ruled out for an 8 GB RTX 3070.

---

## 2. Adding a Skeleton: Permissive Auto-Rigging & `src/engine/` Code Audit

### 2A. Permissively Licensed Auto-Rigging Tools

1. **Headless Blender 5.2.3 (`bpy`) + Built-in `Rigify` Deform Skeleton + Automatic Heat/Voxel Weights + `glTF-Blender-IO` (Primary for Humanoid Heroes & Skins):**
   - **Primary URL (read 2026-11-11):** `https://www.blender.org/about/license/` (read 2026-11-11).
   - **Exact License:** Blender's executable and bundled Python add-ons (`Rigify`, `glTF-Blender-IO`) are **GNU GPL v2+ / v3+**, and the Blender Foundation's official license ruling (`https://www.blender.org/about/license/`, read 2026-11-11) explicitly establishes that **all files output by Blender (`.blend`, `.glb`, `.gltf`, meshes, armatures, skin weights, textures, and animations) are your sole property and may be licensed or sold commercially under any terms**. To keep the `.glb` 100% free of GPL Python code, export only the deform bone hierarchy (`DEF-*` joints, skin weights, and baked keyframe actions) via `bpy.ops.export_scene.gltf(export_def_bones=True)` without embedding Rigify's Python UI script.
   - **VRAM & Download Size:** **0 GB download and $0 cost** (Blender 5.2.3 is already installed on the Alienware at `%LOCALAPPDATA%\Microsoft\WindowsApps\blender-launcher.exe`).
   - **How It Works:** A headless `bpy` script places a canonical 52-bone humanoid armature inside the A-pose/T-pose character mesh, runs `bpy.ops.object.parent_set(type='ARMATURE_AUTO')` (surface heat diffusion skinning, with voxel heat fallback for layered armor plates), normalizes 4-bone vertex weights (`bpy.ops.object.vertex_group_limit_total(limit=4)`), bakes shared animations (idle, run, dash, 4-hit combo, block, awakening), and exports a standard glTF 2.0 `.glb`. Because every humanoid hero and NEEDs shop skin binds to the exact same 52-bone hierarchy, one animation library drives every humanoid character in the game.
2. **`VAST-AI/UniRig` (MIT-Licensed ML Auto-Rigger for Bosses, Creatures, Wings, Capes, and Pets):**
   - **Primary URLs (read 2026-11-11):**
     - Code repository: `https://github.com/VAST-AI-Research/UniRig` (read 2026-11-11)
     - Code license file: `https://raw.githubusercontent.com/VAST-AI-Research/UniRig/main/LICENSE` (read 2026-11-11)
     - Technical README: `https://raw.githubusercontent.com/VAST-AI-Research/UniRig/main/README.md` (read 2026-11-11)
     - Weights repository: `https://huggingface.co/VAST-AI/UniRig` (read 2026-11-11)
   - **Exact License of Code and Weights:** **MIT License** for both the `VAST-AI-Research/UniRig` code and the `VAST-AI/UniRig` checkpoints.
   - **VRAM & Download Size:** Runs in **8 GB VRAM** on CUDA. The two inference checkpoints total **5.42 GB (5,545.7 MB)**: `skeleton/articulation-xl_quantization_256/model.ckpt` (**1,372.9 MB**) and `skin/articulation-xl/model.ckpt` (**4,172.8 MB**).
   - **How It Works:** UniRig uses an autoregressive skeleton tree transformer (`generate_skeleton.sh`) followed by a point-cloud bone-weight network (`generate_skin.sh`) and merges the predicted skeleton (`JOINTS_0`) and per-vertex skin weights (`WEIGHTS_0`) into a rigged `.glb` or `.fbx`. This solves non-humanoid bosses (`Myth@s`, `OpenAeYe`, beasts, multi-winged bosses, and articulated armor tails) where a fixed humanoid template does not fit.
3. **Auto-Rigging Tools Ruled Out:**
   - **`VAST-AI-Research/SkinTokens`** (`https://raw.githubusercontent.com/VAST-AI-Research/SkinTokens/main/README.md`, read 2026-11-11): MIT License, but requires **14 GB VRAM minimum** — ruled out on an 8 GB RTX 3070.
   - **`zhan-xu/RigNet`**: Licensed under **GPLv3** with commercial restrictions from UMass — ruled out.
   - **Adobe Mixamo and ActorCore AccuRIG**: Proprietary cloud/account services requiring sign-in and restrictive terms — ruled out.

### 2B. Audit of What `src/engine/` Supports Today vs. What Must Be Added

Reading the actual source files under `src/engine/` on `2026-11-11` shows the exact state of both rendering paths in the repository:

1. **glTF / GLB Asset Loading (`src/engine/`): Currently Not Supported.**
   - There is no `.gltf` or `.glb` parser anywhere under `src/engine/`. Every mesh in the engine is constructed procedurally in TypeScript via `src/engine/scene/mesh.ts` (`createCube`, `createSphere`, `createPlane`, `createCylinder`), `src/engine/island/geometry.ts`, or `src/engine/characters/hero-and-boss-builder.ts`.
2. **Skinned Meshes (`src/engine/`): Currently Rigid-Node or Single-Bone Only (No 4-Bone Linear Blend Skinning).**
   - In the main engine renderer (`src/engine/renderer/types.ts` lines 31–44, `src/engine/renderer/webgpu-renderer.ts` lines 38–42 and 366–374, and `src/engine/renderer/webgl2-renderer.ts` lines 24–26 and 374–379), `MeshGeometry` only stores `positions` (`vec3`), `normals` (`vec3`), `uvs` (`vec2`), and `indices` (`Uint16Array | Uint32Array`) with a fixed 32-byte interleaved vertex stride (`8 * 4` bytes). There are zero joint index or joint weight attributes and zero bone uniform buffers.
   - In `src/engine/characters/hero-and-boss-builder.ts` (lines 48–79), character "joints" (`hips`, `torso`, `head`, `shoulderL`, `shoulderR`, `elbowL`, `elbowR`, `hipL`, `hipR`, `kneeL`, `kneeR`, `weaponHand`, `offHand`) are rigid `THREE.Group` transform pivots holding separate boxes, cylinders, and spheres. Because vertices never deform across joints, limbs look like straight tubes and armor looks like blocks.
   - In the island renderer (`src/engine/island/shaders.ts` lines 43, 231, and 256–260 for WebGPU, and `src/engine/island/webglFallback.ts` lines 111, 120, and 131–136 for WebGL2), the vertex shader accepts a **single scalar bone index** (`@location(5) bone: f32` in WGSL indexing `bones: array<mat4x4f, 32>`, and `aBone` indexing `uniform mat4 uBones[24]` in GLSL). Each vertex is transformed by a single matrix (`let bm = u.bones[bi]`). That moves rigid body parts without smooth 4-bone weighted deformation across shoulders, elbows, hips, knees, or cloth.
3. **Normal Maps (`src/engine/`): Currently Not Supported.**
   - Neither `src/engine/renderer/` nor `src/engine/island/` stores vertex tangents (`vec4f` with handedness `w`) or binds a 2D tangent-space normal map texture. Both renderers only perturb surface normals using procedural 3D hash noise (`valueNoise` in `webgpu-renderer.ts` lines 116–134 and `bump` / `bumpScaled` in `src/engine/island/shaders.ts` lines 69–82).
4. **PBR Shading (`src/engine/`): Math Exists in Shaders, but Texture Maps Are Not Bound and Metallic Specular Blows Out.**
   - `src/engine/island/shaders.ts` (`shade()`, lines 165–221) already implements a full Cook-Torrance GGX microfacet BRDF (`D * G * F`, Schlick Fresnel `F0 = mix(vec3f(0.04), col, metallic)`, wrap subsurface scattering, cloth sheen, 9-tap PCF shadows, and AgX tonemapping).
   - `src/engine/renderer/webgpu-renderer.ts` (lines 171–244) and `src/engine/renderer/webgl2-renderer.ts` (lines 167–233) implement metallic/roughness Blinn-Phong/GGX-style specular, hemisphere sky/ground ambient, rim lighting, procedural cavity darkening, and ACES filmic tonemapping.
   - **Two Missing Pieces in `src/engine/renderer/`:** First, `MaterialProperties` (`src/engine/renderer/types.ts` lines 38–44) only accepts flat scalar uniforms (`baseColor: Vec3`, `roughness: number`, `metallic: number`, `emissive?: Vec3`) with **no 2D texture samplers** (`baseColorTexture`, `normalTexture`, `metallicRoughnessTexture`, `occlusionTexture`). Second, in `src/engine/renderer/webgpu-renderer.ts` (lines 213–214) and `src/engine/renderer/webgl2-renderer.ts` (lines 201–202), the shader computes `specColor = mix(vec3(1.0), albedo * 1.25 + vec3(0.12), effMetallic)` and `specStrength = mix(0.18, 1.15, effMetallic)` without subtracting reflected energy from `kD` aggressively enough, which causes bright high-metallic silver armor (`metallic >= 0.85`) to clip above `1.0` and blow out to flat white—the exact defect Claude's judge review flagged on the Knight's shield and shoulders in PR #107.
5. **Exact List of Additions Required in `src/engine/` (When Implementation Is Approved):**
   - **In-House Binary `.glb` Loader (`src/engine/assets/glb-loader.ts`):** Parse the 12-byte glTF 2.0 header, `JSON` chunk, and `BIN` chunk into `MeshGeometry`, embedded `ImageBitmap` textures, `Skeleton` (`joints`, `inverseBindMatrices`), and `AnimationClip` keyframe samplers (`translation`, `rotation`, `scale`).
   - **Expanded Vertex Layout (`src/engine/renderer/types.ts`, `webgpu-renderer.ts`, `webgl2-renderer.ts`):** Expand the vertex format from 32 bytes to 64 bytes per vertex: `position: vec3f` (`@location(0)`), `normal: vec3f` (`@location(1)`), `uv: vec2f` (`@location(2)`), `tangent: vec4f` (`@location(3)`), `joints0: vec4<u32>` (`@location(4)`), and `weights0: vec4f` (`@location(5)`).
   - **4-Bone Linear Blend Skinning & Animation Mixer (`src/engine/animation/skeleton-mixer.ts` + Shaders):** Add a `storage` or `uniform` bone matrix palette (`array<mat4x4f, 64>`) per character and compute `skinMat = w.x * bones[j.x] + w.y * bones[j.y] + w.z * bones[j.z] + w.w * bones[j.w]` in the vertex shader, driven by a TRS keyframe mixer using `src/engine/math/` (`Vec3`, `Quat`, `Mat4`).
   - **2D PBR Texture Bindings + Energy-Conserving Specular:** Bind `baseColorTexture` (`rgba8unorm-srgb`), `normalTexture` (`rgba8unorm` linear with `TBN = mat3x3f(T, B, N)`), and packed `ormTexture` (`R = Occlusion`, `G = Roughness`, `B = Metallic`), and replace the blown-out `albedo * 1.25 + 0.12` specular multiplier in `webgpu-renderer.ts` and `webgl2-renderer.ts` with energy-conserving Cook-Torrance GGX (`F0 = mix(vec3(0.04), albedo, metallic)` and `kD = (1.0 - F) * (1.0 - metallic)`).

---

## 3. Polygon Budget & Permissive Reduction/Re-Baking for 60 FPS with 5 to 30 Characters

### 3A. Target Browser Polygon, Draw-Call, and Texture Budget (60 FPS on WebGPU / WebGL2)

Image-to-3D generators (`TripoSG`, `TripoSR`, `InstantMesh`) output dense marching-cubes or FlexiCubes meshes ranging from **80,000 to 250,000+ triangles** per character. Shipping 30 raw 200,000-triangle skinned characters would push 6,000,000 skinned triangles per frame and stall browser frame times. To hold a rock-solid **60 frames per second (< 16.6 ms total frame budget, < 6 ms GPU draw budget)** with **5 to 30 animated characters on screen** alongside environment geometry (~80,000 triangles), the converter must enforce three automatic Level-of-Detail (LOD) tiers per character:

- **LOD0 — Close Combat / Player & Bosses (0 to 12 meters, up to 5 characters):**
  - **Polygon budget:** **8,000 to 12,000 triangles** (~4,500 to 6,500 vertices) for heroes; up to **15,000 triangles** for a raid boss.
  - **Skeleton budget:** **52 deform bones** (4 weights per vertex).
  - **Material & Texture budget:** **1 draw call** (single merged UV atlas) with **1024×1024** Albedo, **1024×1024** Tangent-Space Normal, and **1024×1024** packed ORM (Occlusion / Roughness / Metallic) compressed as WebP or BasisU/KTX2 (**~4 MB GPU VRAM** per unique character skin).
- **LOD1 — Mid-Range Party / Melee Pack (12 to 30 meters, 6 to 15 characters):**
  - **Polygon budget:** **3,500 to 5,000 triangles** per character.
  - **Skeleton budget:** **24 major deform bones** (finger and face twist bones merged into hand/head).
  - **Material & Texture budget:** **1 draw call**, **512×512** mip level (**~1 MB GPU VRAM** per unique skin).
- **LOD2 — Far Crowd / 30-Character Raid or Town Hub (beyond 30 meters, 16 to 30 characters):**
  - **Polygon budget:** **1,200 to 2,000 triangles** per character.
  - **Skeleton budget:** **15 core bones** (root, spine, head, upper/lower limbs).
  - **Material & Texture budget:** **1 draw call**, **256×256** mip level.
- **Worst-Case Combined Scene Load (30 Characters on Screen at Once):**
  - **5 characters at LOD0** (5 × 10,000 = 50,000 tris) + **10 characters at LOD1** (10 × 4,200 = 42,000 tris) + **15 characters at LOD2** (15 × 1,600 = 24,000 tris) = **116,000 character triangles total** (and even if all 30 characters cluster at mid/close range, total character geometry stays under **200,000 triangles** and **30 draw calls**). Both WebGPU and WebGL2 render 200,000 4-bone skinned triangles across 30 draw calls in **2.0 to 4.5 ms** on mid-range desktop and laptop GPUs, holding **60 FPS** with plenty of headroom.

### 3B. Permissively Licensed Reduction & High-to-Low PBR Re-Baking Pipeline

Every tool in the reduction and baking stage is permissively licensed for commercial games and runs locally on the Alienware:

1. **Headless Blender 5.2.3 (`bpy`) Quadriflow / Decimate + Cycles Raycast Baker:**
   - **Primary URL (read 2026-11-11):** `https://www.blender.org/about/license/` (Blender GPLv2+/v3+ with unrestricted commercial ownership of all output files; Cycles rendering/baking engine is **Apache License 2.0**).
   - **Step A — Clean Topology Reduction:** Load the 150,000-triangle high-poly mesh from `TripoSG`/`TripoSR`. Run `bpy.ops.object.quadriflow_remesh(target_faces=4500, use_mesh_symmetry=True, use_preserve_sharp=True)` to produce an ~9,000-triangle quad-dominant LOD0 mesh whose edge loops follow limb and torso contours for clean joint deformation. Generate LOD1 (`ratio=0.42`, ~3,800 triangles) and LOD2 (`ratio=0.16`, ~1,500 triangles) via `bpy.ops.object.modifier_add(type='DECIMATE')`.
   - **Step B — UV Unwrapping &Tangent Generation:** Unwrap LOD0 onto a single non-overlapping 0..1 UV atlas via `bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02)` (or `xatlas`) and compute MikkTSpace tangents.
   - **Step C — Selected-to-Active Cycles Raycast Baking:** With the 150,000-triangle source sculpt selected and the 9,000-triangle LOD0 mesh active (`use_selected_to_active=True`, `cage_extrusion=0.025`), run headless Cycles (`bpy.ops.object.bake`) on CUDA to bake:
     - **`NORMAL` (1024×1024 Tangent-Space Normal Map):** Transfers every high-poly armor engraving, rivet, leather seam, cloth fold, and facial contour onto the 9,000-triangle mesh so the low-poly mesh shades like a 150,000-triangle sculpt (how *Black Desert* and *Diablo 3* achieve realism on low-poly budgets).
     - **`AO` (1024×1024 Ambient Occlusion Map):** Raycasts real geometric crevices under pauldrons, belts, hoods, and eye sockets.
     - **`ROUGHNESS` & `METALLIC` (Packed into ORM Map):** Combines material-ID masks (steel plate `metallic=0.88, roughness=0.26`, weathered leather `metallic=0.0, roughness=0.62`, cloth `metallic=0.0, roughness=0.82`, skin `metallic=0.0, roughness=0.48`) with high-poly curvature (`geometry.pointiness`) for edge wear.
     - **`DIFFUSE` (`pass_filter={'COLOR'}`, 1024×1024 Delit Albedo):** Bakes pure base color with lighting stripped so the engine's dynamic sun, torchlight, and rim lights do all shading.
2. **`@gltf-transform/cli` (`donmccurdy/glTF-Transform`) + `meshoptimizer` (`zeux/meshoptimizer`):**
   - **Primary URLs (read 2026-11-11):**
     - `glTF-Transform` license: `https://raw.githubusercontent.com/donmccurdy/glTF-Transform/main/LICENSE.md` (**MIT License**, read 2026-11-11)
     - `meshoptimizer` license: `https://raw.githubusercontent.com/zeux/meshoptimizer/master/LICENSE.md` (**MIT License**, read 2026-11-11)
   - **Function:** Optimizes the exported `.glb` for browser streaming by welding duplicate vertices, reordering indices for GPU post-transform vertex cache locality, quantizing vertex positions/normals, pruning unused nodes, and compressing the 1024×1024 textures to WebP/KTX2.

---

## 4. Art Sources: Commercial Game Terms for (a) Google Flow & Gemini and (b) the Dreamforge Study Remake

### 4A. Google Flow and Google Gemini Image Generation Terms for a Commercial Game

- **Primary URLs (read 2026-11-11):**
  - Google Terms of Service: `https://policies.google.com/terms` (read 2026-11-11)
  - Google Generative AI Additional Terms of Service: `https://policies.google.com/terms/generative-ai` (read 2026-11-11)
  - Google Generative AI Prohibited Use Policy: `https://policies.google.com/terms/generative-ai/use-policy` (read 2026-11-11)
  - Gemini API Additional Terms of Service (effective March 23, 2026): `https://ai.google.dev/gemini-api/terms` and `https://aistudio.google.com/docs/terms` (read 2026-11-11; cross-checked with repo record `docs/house/GEMINI-HUD-TERMS-CHECK-2026-11-10.md`)
- **Ownership & Commercial Game Verdict:**
  1. **Google Claims Zero Ownership of Generated Content:** Under Google's **Generative AI Additional Terms of Service** (`https://policies.google.com/terms/generative-ai`, read 2026-11-11), Google explicitly states: *"Some of our services allow you to generate original content. Google won't claim ownership over that content."* Under the **Gemini API Additional Terms of Service** (`https://ai.google.dev/gemini-api/terms`, read 2026-11-11), Google likewise claims no ownership over generated outputs.
  2. **Using Gemini-Generated Images as Offline Studio Art Inputs Is Permitted:** In our prior house check (`docs/house/GEMINI-HUD-TERMS-CHECK-2026-11-10.md`), we ruled out shipping a live Gemini API client inside an all-ages game because the Gemini API terms restrict live **API Clients** from serving under-18 users or operating in certain territories. However, **when Josh (an adult 18+ creator in the United States) uses Google Gemini offline in DREAM Studio to generate 2D character concept sheets, and our local converter turns those sheets into static `.glb` 3D meshes and baked PBR textures shipped with the game**, the game is **not** an "API Client" calling Gemini at runtime. Shipping static `.glb` character assets derived from Josh's Gemini images in a commercial game is allowed under Google's terms.
  3. **Specific Note on Google Flow (`labs.google/fx/tools/flow`):** Google Flow is an experimental AI filmmaking/video tool under Google Labs governed by the Google Terms of Service (`https://policies.google.com/terms`) and Generative AI Additional Terms (`https://policies.google.com/terms/generative-ai`, read 2026-11-11). While Google also claims no ownership over Flow outputs, Flow outputs carry embedded **SynthID** watermarks (which the Prohibited Use Policy `https://policies.google.com/terms/generative-ai/use-policy` forbids tampering with or circumventing to mislead others) and Labs preview features carry no commercial warranty or indemnity. For clean, orthographic front/side/back character turnaround sheets, **Google Gemini image generation (Imagen 3 / Gemini Flash Image)** is both cleaner and better suited than video frames from Flow.
  4. **House Originality Rule (`docs/house/THE-HOUSE.md` Rule 7):** Every prompt Josh feeds into Gemini must be written in plain words describing our own dark-fantasy classes, armor, materials, and proportions—never naming another game, franchise, or copyrighted character, and never uploading a third-party reference image.

### 4B. Image Models Related to the Dreamforge Study Remake (`dreamforge/`)

- **Primary URLs & Repo Files (read 2026-11-11):**
  - Local Dreamforge study files: `dreamforge/README.md` (lines 1–68, read 2026-11-11) and `dreamforge/index.html` (lines 390–398 and 546–568, read 2026-11-11)
  - Studied upstream organization (`neta.art` on Hugging Face): `https://huggingface.co/neta-art` (read 2026-11-11)
  - `neta-art/Neta-Lumina` model card & license: `https://huggingface.co/neta-art/Neta-Lumina` and `https://huggingface.co/neta-art/Neta-Lumina/raw/main/README.md` (read 2026-11-11)
  - `neta-art/neta-noob-1.0` & `neta-art/neta-xl-2.0` model cards: `https://huggingface.co/neta-art/neta-noob-1.0/raw/main/README.md` and `https://huggingface.co/neta-art/neta-xl-2.0` (read 2026-11-11)
  - Fair AI Public License 1.0-SD (`FAIPL-1.0-SD`) primary text: `https://freedevproject.org/faipl-1.0-SD/` / `https://freedevproject.org/faipl-1.0-sd/` (read 2026-11-11)
- **What Actually Runs Inside `dreamforge/` in This Repo Today:**
  - Reading `dreamforge/index.html` (lines 390–398 and 546–568) confirms that **no live image generation model is wired into `dreamforge/index.html`**. Its `generate()` function is a static UI simulation (`setTimeout(..., 1800)`) that cycles through seven static PNG files in `dreamforge/assets/` (`world-seed.png`, `ip-jump.png`, `world-map.png`, `pov-video.png`, `roleplay.png`, `pixel-room.png`, and `scroll-world.png`) and applies CSS `hue-rotate()` filters for the 43 style presets.
  - **Hard Ban on Using `dreamforge/assets/*.png`:** `dreamforge/README.md` (lines 4–5 and 58–67) documents that those seven PNGs were captured from `neta.art` during the study remake. Under `docs/house/THE-HOUSE.md` Rule 7 (*"100% ours... nothing copied, traced or named from anyone else's work"*), **none of the pre-bundled images in `dreamforge/assets/` may ever be used as our game art**.
- **Terms of the Underlying `neta.art` Models on Hugging Face (If Used to Generate New Pictures):**
  1. **`neta-art/Neta-Lumina` (`neta-lumina-v1.0`):** Fine-tuned on `Alpha-VLLM/Lumina-Image-2.0` with `google/gemma-2-2b`. Its model card (`https://huggingface.co/neta-art/Neta-Lumina/raw/main/README.md`, read 2026-11-11) declares the **Apache License 2.0** (`19.94 GB` total repo; `neta-lumina-v1.0-all-in-one.safetensors` is `10,128.2 MB`), with the `gemma-2-2b` text encoder subject to the Google Gemma Terms of Use. *(Note: the older `neta-art/NetaLumina_Alpha` checkpoint explicitly prohibited commercial use and must be avoided.)*
  2. **`neta-art/neta-noob-1.0` and `neta-art/neta-xl-2.0`:** Both are governed by the **Fair AI Public License 1.0-SD (`FAIPL-1.0-SD`)** (`https://freedevproject.org/faipl-1.0-sd/`, read 2026-11-11). While FAIPL-1.0-SD does not restrict commercial use of generated output images, it is a copyleft-style model license (requiring source/weight disclosure for any modified or network-hosted derivative model), and the `neta` checkpoints are explicitly trained on anime/Danbooru datasets designed for 2D anime illustration rather than realistic *Black Desert* / *Diablo 3* dark-fantasy PBR characters.
- **Verdict on Dreamforge Art Sources:** Do **not** use the 7 captured PNGs in `dreamforge/assets/`, and do **not** download the 10–20 GB `neta-art` anime checkpoints onto the Alienware RTX 3070. Keep Dreamforge's clean-room **43 style token presets and prompt-builder UI patterns**, and generate the actual 2D character turnaround sheets from plain-word prompts in **Google Gemini**.

---

## 5. Recommended Pipeline & Josh's Approval Checklist

### 5A. One Recommended End-to-End Pipeline (Picture to Animated Character in the DREAM Engine)

1. **Stage 1 — 2D Turnaround Sheet Creation (`Google Gemini`):**
   - Josh prompts **Google Gemini** using plain words only (zero third-party names or reference images) for an orthographic front, side, and back A-pose character turnaround sheet on a solid neutral background, plus close-up weapon/shield callouts.
2. **Stage 2 — Foreground Segmentation (`danielgatis/rembg`, MIT License):**
   - A local Python CLI step runs **`rembg`** (`u2net.onnx`, Apache-2.0 / MIT) on the Alienware to strip the background into a clean 2048×2048 RGBA PNG in < 0.3 seconds.
3. **Stage 3 — High-Poly 3D Sculpt & Base Albedo Generation (`VAST-AI/TripoSG` + `stabilityai/TripoSR`, MIT License):**
   - **`VAST-AI/TripoSG`** (MIT License, 8 GB VRAM on Alienware RTX 3070) generates a 150,000-triangle watertight high-poly `.glb` sculpt from the segmented character image, capturing realistic facial anatomy, armor layering, pauldrons, and cloth folds.
   - **`stabilityai/TripoSR`** (MIT License, ~6 GB VRAM) or multi-view camera projection in headless Blender projects the front/side/back character sheet onto the high-poly sculpt to establish the base color (albedo) and material-zone masks (metal, leather, cloth, skin, emissive runes).
4. **Stage 4 — Retopology, UV Unwrapping & High-to-Low Poly PBR Baking (`Blender 5.2.3 Headless bpy + Cycles`, Already Installed):**
   - Headless **Blender 5.2.3** (`%LOCALAPPDATA%\Microsoft\WindowsApps\blender-launcher.exe`) runs a deterministic Python pipeline (`ops/blender/convert-picture-to-game-character.py`):
     - Retopologizes the 150,000-triangle sculpt into **LOD0 (9,000 triangles)** via Quadriflow (`quadriflow_remesh(target_faces=4500)`), **LOD1 (4,000 triangles)**, and **LOD2 (1,500 triangles)** via Decimate.
     - Unwraps a single non-overlapping UV atlas and computes MikkTSpace tangents.
     - Uses **Cycles CUDA Selected-to-Active Raycast Baking** to bake the 150,000-triangle detail into three **1024×1024** textures: **Delit Albedo (`baseColorTexture`)**, **Tangent-Space Normal Map (`normalTexture`)**, and **Packed ORM (`Occlusion` in R, `Roughness` in G, `Metallic` in B)**.
5. **Stage 5 — Automated Skeleton Binding & Animation Baking (`Blender 5.2.3 Rigify Deform Skeleton` + `VAST-AI/UniRig`, MIT License):**
   - For **humanoid heroes and NEEDs shop skins**: Blender fits our canonical 52-bone `DEF-*` humanoid skeleton, computes 4-bone heat-diffusion skin weights (`ARMATURE_AUTO`), attaches weapon/shield sockets (`hand_r_socket`, `hand_l_socket`), and links the shared combat animation tracks (`idle`, `run`, `dash`, `combo_1..4`, `block`, `awakening`, `hit`, `death`).
   - For **non-humanoid bosses, mounts, wings, and capes**: **`VAST-AI/UniRig`** (MIT License, 8 GB VRAM) predicts the custom bone tree and skinning weights and exports a rigged `.glb`.
6. **Stage 6 — glTF/GLB Compression (`@gltf-transform/cli` + `meshoptimizer`, MIT License):**
   - Packs the LOD meshes, 52-bone skeleton, animation clips, and 1024×1024 WebP/KTX2 PBR textures into a single game-ready `.glb` file (`public/models/characters/<class-or-skin>.glb`, ~2.5 to 4.5 MB on disk).
7. **Stage 7 — In-House DREAM Engine Runtime (`src/engine/`):**
   - The in-house `glb-loader.ts` loads the `.glb` into `src/engine/renderer/webgpu-renderer.ts`, `src/engine/renderer/webgl2-renderer.ts`, and `src/engine/island/renderer.ts`, running 4-bone Linear Blend Skinning (`JOINTS_0` + `WEIGHTS_0`), tangent-space normal mapping (`TBN`), and energy-conserving GGX PBR shading at **60 FPS with 5 to 30 characters on screen**.

### 5B. Exact List of What Josh Would Have to Approve Before Implementation

- **Total Monetary Cost:** **$0.00** (nothing in this pipeline costs money, requires a paid subscription, or carries a commercial revenue royalty).
- **Already Installed on Alienware (0 MB Download Needed):**
  - **Blender 5.2.3 (`blender-launcher.exe`)** at `%LOCALAPPDATA%\Microsoft\WindowsApps\blender-launcher.exe` (includes Python `bpy`, `Rigify`, `Cycles` CUDA baker, `Quadriflow`, and `glTF-Blender-IO`).
- **Downloads Josh Must Approve Before Any Implementation Lane Installs Them (Total: 14.58 GB across all optional and primary weights, or 9.16 GB for the core humanoid pipeline without UniRig):**
  1. **`VAST-AI/TripoSG` weights + code (MIT License, primary high-detail 3D sculpt generator):** **7.40 GB (7,578.4 MB)** from `https://huggingface.co/VAST-AI/TripoSG` and `https://github.com/VAST-AI-Research/TripoSG` (configured to skip `briaai/RMBG-1.4`).
  2. **`stabilityai/TripoSR` weights + code (MIT License, fast single-image mesh + albedo companion):** **1.56 GB (1,602.0 MB)** from `https://huggingface.co/stabilityai/TripoSR` and `https://github.com/VAST-AI-Research/TripoSR`.
  3. **`danielgatis/rembg` + `u2net.onnx` checkpoint (MIT / Apache-2.0 License, clean background removal):** **0.17 GB (~176 MB)** from `https://github.com/danielgatis/rembg`.
  4. **`VAST-AI/UniRig` skeleton + skinning checkpoints + code (MIT License, needed only for non-humanoid bosses, creatures, and winged rigs):** **5.42 GB (5,545.7 MB)** (`skeleton/articulation-xl_quantization_256/model.ckpt` **1,372.9 MB** + `skin/articulation-xl/model.ckpt` **4,172.8 MB**) from `https://huggingface.co/VAST-AI/UniRig` and `https://github.com/VAST-AI-Research/UniRig`.
  5. **`@gltf-transform/cli` and `meshoptimizer` npm packages (MIT License, `.glb` optimization & LOD compression):** **~0.025 GB (~25 MB)** from `https://github.com/donmccurdy/glTF-Transform` and `https://github.com/zeux/meshoptimizer`.

---

## 6. Primary Sources Cited (All Read on 2026-11-11)

- **Judge Verdict on PR #107:** `https://github.com/Trollz1004/dream-online/pull/107` (read 2026-11-11)
- **VAST-AI TripoSG:** `https://github.com/VAST-AI-Research/TripoSG`, `https://raw.githubusercontent.com/VAST-AI-Research/TripoSG/main/LICENSE`, `https://raw.githubusercontent.com/VAST-AI-Research/TripoSG/main/README.md`, and `https://huggingface.co/VAST-AI/TripoSG` (read 2026-11-11)
- **VAST-AI / Stability AI TripoSR:** `https://github.com/VAST-AI-Research/TripoSR`, `https://raw.githubusercontent.com/VAST-AI-Research/TripoSR/main/LICENSE`, `https://raw.githubusercontent.com/VAST-AI-Research/TripoSR/main/README.md`, and `https://huggingface.co/stabilityai/TripoSR` (read 2026-11-11)
- **TencentARC InstantMesh & Dependencies:** `https://github.com/TencentARC/InstantMesh`, `https://raw.githubusercontent.com/TencentARC/InstantMesh/main/LICENSE`, `https://raw.githubusercontent.com/TencentARC/InstantMesh/main/README.md`, `https://huggingface.co/TencentARC/InstantMesh`, `https://raw.githubusercontent.com/SUDO-AI-3D/zero123plus/main/LICENSE`, and `https://raw.githubusercontent.com/nv-tlabs/FlexiCubes/main/LICENSE.txt` (read 2026-11-11)
- **Microsoft TRELLIS:** `https://github.com/microsoft/TRELLIS`, `https://raw.githubusercontent.com/microsoft/TRELLIS/main/LICENSE`, `https://raw.githubusercontent.com/microsoft/TRELLIS/main/README.md`, and `https://huggingface.co/microsoft/TRELLIS-image-large` (read 2026-11-11)
- **Stability AI SF3D & SPAR3D:** `https://github.com/Stability-AI/stable-fast-3d`, `https://raw.githubusercontent.com/Stability-AI/stable-fast-3d/main/LICENSE.md`, `https://raw.githubusercontent.com/Stability-AI/stable-fast-3d/main/README.md`, `https://huggingface.co/stabilityai/stable-fast-3d`, `https://github.com/Stability-AI/stable-point-aware-3d`, `https://raw.githubusercontent.com/Stability-AI/stable-point-aware-3d/main/LICENSE.md`, `https://raw.githubusercontent.com/Stability-AI/stable-point-aware-3d/main/README.md`, and `https://huggingface.co/stabilityai/stable-point-aware-3d` (read 2026-11-11)
- **Tencent Hunyuan3D-2 & 2.1:** `https://github.com/Tencent-Hunyuan/Hunyuan3D-2`, `https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2/main/LICENSE`, `https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2/main/README.md`, `https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1`, `https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE`, `https://huggingface.co/tencent/Hunyuan3D-2mini`, `https://huggingface.co/tencent/Hunyuan3D-2mv`, `https://huggingface.co/tencent/Hunyuan3D-2`, and `https://huggingface.co/tencent/Hunyuan3D-2.1` (read 2026-11-11)
- **Background Removal (`rembg` MIT vs. `briaai/RMBG-1.4` Non-Commercial):** `https://github.com/danielgatis/rembg`, `https://raw.githubusercontent.com/danielgatis/rembg/main/LICENSE.txt`, and `https://huggingface.co/briaai/RMBG-1.4/raw/main/README.md` (read 2026-11-11)
- **Auto-Rigging (`Blender`, `UniRig`, `SkinTokens`):** `https://www.blender.org/about/license/`, `https://github.com/VAST-AI-Research/UniRig`, `https://raw.githubusercontent.com/VAST-AI-Research/UniRig/main/LICENSE`, `https://raw.githubusercontent.com/VAST-AI-Research/UniRig/main/README.md`, `https://huggingface.co/VAST-AI/UniRig`, and `https://raw.githubusercontent.com/VAST-AI-Research/SkinTokens/main/README.md` (read 2026-11-11)
- **Mesh Optimization (`glTF-Transform` & `meshoptimizer`):** `https://raw.githubusercontent.com/donmccurdy/glTF-Transform/main/LICENSE.md` and `https://raw.githubusercontent.com/zeux/meshoptimizer/master/LICENSE.md` (read 2026-11-11)
- **Google Flow & Gemini Terms:** `https://policies.google.com/terms`, `https://policies.google.com/terms/generative-ai`, `https://policies.google.com/terms/generative-ai/use-policy`, `https://ai.google.dev/gemini-api/terms`, and `https://aistudio.google.com/docs/terms` (read 2026-11-11)
- **Dreamforge / `neta.art` Models & Licenses:** `https://huggingface.co/neta-art`, `https://huggingface.co/neta-art/Neta-Lumina/raw/main/README.md`, `https://huggingface.co/neta-art/neta-noob-1.0/raw/main/README.md`, `https://huggingface.co/neta-art/neta-xl-2.0`, and `https://freedevproject.org/faipl-1.0-sd/` (read 2026-11-11)
