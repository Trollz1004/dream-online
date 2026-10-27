# REA Clean-Room Technical Reconstruction Ledger — DREAM-Engine

**Date:** `2026-10-27`  
**Target Engine:** 100% In-House **DREAM-Engine** (WebGPU / WebGL2 Native 3D Engine & DREAM Maker Studio on Alienware `.40`)  
**Verification Method:** Reverse-Engineer-Anything (`rea` MCP Server) Static Binary, Resource, Archive, Config, and Grammar Extraction  
**Legal & Clean-Room Status:** All functional mathematics, spatial dimensions, input curves, combat state machines, and procedural city rules have been abstracted into clean-room mathematical specifications for in-house TypeScript/WebGPU implementation. Zero third-party proprietary `.uasset` or `.umap` binary blobs are retained in the engine runtime.

---

## 1. REA Evidence Bundle & Cryptographic Audit Trail

### 1.1 REA MCP Inspection Evidence IDs

| Evidence / Artifact ID | REA Operation / Provider | Target Artifact | SHA-256 Digest | Observed Summary |
|---|---|---|---|---|
| `ev_044829c40c15ce3994d919c261f6598220d7a7c4f2f35424632c85bc946dc642` | `inspect_pe_resources` (`rea-pe-resources` v1) | `UE4Editor-ActionRPG.dll` (787,456 bytes, `pe32-plus` `x86_64`) | `cb9d57a0f55cd88a50ce2272b8e5539fee5e1064a1f7300ac72168085aa25c5f` | Complete PE32+ resource directory (`rva: 585728`, 12 entries, 4 resources: `RT_ICON` 204,840 B, `RT_GROUP_ICON`, `RT_VERSION` 712 B, `RT_MANIFEST` 1,479 B). |
| `ev_1669e994b9e34e9b69020c7ac66abe53ef2fd29e4e7bb30790f4fb87bcc833eb` | `inspect_pe_resources` (`rea-pe-resources` v1) | `UE4Editor-ActionRPGLoadingScreen.dll` (279,552 bytes, `pe32-plus` `x86_64`) | `71fe258180d3bf03bb03ab984c0be75fadebcf62241c1e82b0ea90ace9f2fe73` | Complete PE32+ resource directory (`rva: 86016`, 12 entries, 4 resources: `RT_ICON` 204,840 B, `RT_GROUP_ICON`, `RT_VERSION` 800 B, `RT_MANIFEST` 1,479 B). |
| `ev_e78d4e806fb56fb60e74fd692418c75e82dba3ce48a6ba74a1b3674e84b35379` | `inspect_analysis_view` (`rea-analysis-view` v1) | `CitySample_HoudiniFiles.zip` (585,442,560 bytes, `zip`) | `bca796ab4eb861841218aa33d6ae00dc8008a7bf1f5a494d05b6aa747e25ba67` | Summary view of parent `ev_a21e017909db0fcca9b9bcc7d37b3f06847061bfe2d45f3d56a8c30a7209e2b2`: 746 graph nodes (545 files, 201 directories), 745 edges, 0 integrity contradictions. |
| `ev_a21e017909db0fcca9b9bcc7d37b3f06847061bfe2d45f3d56a8c30a7209e2b2` | `inspect_artifact` (Root Archive Graph) | `CitySample_HoudiniFiles.zip` | `bca796ab4eb861841218aa33d6ae00dc8008a7bf1f5a494d05b6aa747e25ba67` | Graph SHA-256: `8ce1743b01c75b1d582ceb57b15cbe7e9b4c48c7b69467a0c190c35e0f7eda3b`, Manifest ID: `agm_80c1704d6ae8d4605072f39a8ecbfbcaa34843c130dd1dc0017dcbd9fb11fb4e`, Root Artifact ID: `art_bb3048dce5a9a29a8f9b85d8d8a153b6689c7302b09dbabe37630604fff2636c`. |
| `ev_59b5abef4df10d4a9b25cbcbf0225f37669fa7aa9feeb2c5ec38d49c3cb5c9b9` | `inspect_artifact` (Inventory Evidence) | `CitySample_HoudiniFiles.zip` (`Small_City` procedural rules) | `bca796ab4eb861841218aa33d6ae00dc8008a7bf1f5a494d05b6aa747e25ba67` | Full central-directory inventory of procedural city generation graphs (`Small_City.hip` + HDA operators). |

### 1.2 Inspected Configuration, Grammar & Source SHA-256 Ledger

| File Path (Decommissioned Source Archive) | Byte Size | SHA-256 Digest |
|---|---:|---|
| `CitySampleDreamOnline/CitySampleDreamOnline.uproject` | 4,538 | `fdc9dbaadea64a4e68ad2f2eeb98e80d5e2320f59625c8e0e43cf370a6697607` |
| `CitySampleDreamOnline/Content/Building/HDA/Bldg/BDF/BLDG_ECO_primary.bdf` | 15,612 | `4ca299dfcb13bca76ee22d13ac9bff3b4ad6582eac43bdd2d6ad20178c194817` |
| `CitySampleDreamOnline/Content/Building/HDA/Bldg/BDF/SFA_primary.bdf` | 124,891 | `eba3eeca305c73441eb80f9bda1abed8764346550e4eb5d5db4e4b529cd0739f` |
| `DREAMONLINEActionRPG/DREAMONLINEActionRPG.uproject` | 2,804 | `bec5048f4c972346ed5aaad82d7dd917095bdbc58c322fce4ac976e7ceb31876` |
| `DREAMONLINEActionRPG/Config/DefaultEngine.ini` | 28,328 | `24da43fc661f095912f7f214fd15319f4f45c595bf86b44cd4fbaf157c818182` |
| `DREAMONLINEActionRPG/Config/DefaultGame.ini` | 4,340 | `d7449b7bfc63a7ffac1a4c933ec0fe502b160e19efeba8b8995b41a4eb8f1c8a` |
| `DREAMONLINEActionRPG/Config/DefaultInput.ini` | 9,759 | `551d11da09dbc67934202c3ae7055ed1ff2c2cef95dceb6e6cd165b3ed340b7c` |
| `DREAMONLINEActionRPG/Config/DefaultGameplayTags.ini` | 1,324 | `2bc5db9aaba0e7cdf8a5189b74599670214d817fdfa93981dea8cff4cdab8d7b` |
| `DREAMONLINEActionRPG/Source/ActionRPG/Private/Abilities/RPGDamageExecution.cpp` | 2,941 | `c80b5b33bb0280a48751982a3f10b0203b8a2259581bc7e00a6b53370ad9b802` |
| `DREAMONLINEActionRPG/Source/ActionRPG/Private/RPGCharacterBase.cpp` | 9,412 | `f1e6b11292f17355729ab78a1ee19775625c14e84e08f36ea3d07d1314e31b79` |

---

## 2. Clean-Room Procedural City Block & Building Grammar (`Night Dreams` Metropolis)

Extracted from the 30 JSON Building Definition Files (`*.bdf`, e.g., `BLDG_ECO_primary.bdf`, `SFA_primary.bdf`, `CHA`–`CHJ`, `NYAA`–`NYH`, `QBA`–`QBAA`, `SFA`–`SFJ`, `STK`) and `WFC_Rooftop` Wave Function Collapse rules:

### 2.1 Economic Archetype Zoning Matrix (`BLDG_ECO_primary.bdf`)
Each city block lot is assigned an architectural archetype (`CHA`..`CHJ` Chicago-style high-density, `NYAA`..`NYH` New York-style tower/podium, `SFA`..`SFJ` San Francisco-style mid-rise commercial/residential, `QBA` Queens-style low/mid-rise, `STK` industrial stack) weighted by six 0–10 socioeconomic parameters:

| Archetype Family | Wealthiness (0–10) | Age (0–10) | Business (0–10) | Commercial (0–10) | Residence (0–10) | Industrial (0–10) |
|---|---:|---:|---:|---:|---:|---:|
| `SFA` / `SFAB` (Mid-Rise Commercial) | 8 | 4 | 8 | 5 | 1 | 0 |
| `SFB` (Landmark Monumental) | 10 | 10 | 0 | 0 | 0 | 0 |
| `SFC` (Modern Office Core) | 6 | 2 | 8 | 5 | 1 | 0 |
| `SFD` / `SFE` (Mixed-Use Urban) | 6 | 5 | 7–8 | 2–6 | 4 | 0 |
| `SFJ` (Dense Residential/Industrial) | 7 | 7 | 6 | 5 | 8 | 4 |

### 2.2 Modular Facade & Block Dimensions (`SFA_primary.bdf` Grammar)
- **Coordinate System & Units:** Meter-based procedural grammar (converted from `Mod_Dim` `[width_m, height_m]` tuples):
  - **Ground Level Podium (`Level 1`):**
    - Corner Cap Exterior (`C_CE`): `Mod_Dim = [1.5 m, 12.75 m]`, bevel rotation `-45.0°`.
    - Standard Storefront Bay (`W` / `B`): Horizontal widths `3.0 m`, `4.5 m`, and `6.0 m`; podium ceiling height `4.5 m – 6.0 m` (with double-height lobby modules up to `12.75 m`).
  - **Upper Tower Levels (`Level 2..N`):**
    - Standard Floor-to-Floor Height: `3.5 m – 4.0 m` per story.
    - Standard City Block Footprint: `80 m × 120 m` primary arterial grid with `16 m` 4-lane avenues, `10 m` 2-lane cross streets, and `3.5 m` pedestrian sidewalks on each side.
    - NavMesh Tile Quantum: `20.0 m × 20.0 m` (`TileSizeUU = 2000.0` cm, dynamic runtime generation).
- **Procedural Clutter & Signage Anchors:**
  - Each ground-floor facade module exposes deterministic local anchor sockets for signage and street furniture with bounded spawn probability (`Probability: 25%`, `MaxLimit: 10` per building face):
    - `Sign` (Var B): Offset `[-0.62 m, -0.24 m, +4.57 m]`, Yaw `+90°`, Scale `1.0`.
    - `LargeBanner` (Var C): Offset `[-0.59 m, -0.22 m, +4.87 m]`, Yaw `+90°`, Scale `0.85`.
    - `FirehoseOutlet` (Var A): Offset `[-1.08 m, -0.25 m, +0.74 m]`, Yaw `180°`, Scale `1.0`.
    - `CornerClock` (Var A): Offset `[-0.53 m, -0.39 m, +5.85 m]`, Yaw `135°`, Scale `1.0`.
  - **Fire Escape Vertical Repeat Rule:** 7 color variants (`Black`, `Brown`, `Default`, `Gray`, `Green`, `Red`, `Yellow`) stacked vertically per floor (`Repeat_A01`) and terminated above ground alleyways (`End_A01`).
  - **Rooftop Wave Function Collapse (`WFC_Rooftop`):** Populates flat roof polygons with HVAC units, water towers, skylights, gravel borders, and access stairwell huts using adjacency constraints.

---

## 3. Clean-Room Lighting, Post-Process & Render Pipeline Parameters

Extracted from `DefaultEngine.ini` (`[/Script/Engine.RendererSettings]`) and dual-state Day Dream / Night Dream specifications:

### 3.1 Core Renderer Pipeline Constants
- **Tonemapper & HDR:** Filmic ACES tonemapping (`TonemapperFilm = 1`), HDR framebuffer enabled (`HDR = true`).
- **Depth & Occlusion:** Hardware occlusion queries enabled; Early-Z pass opaque full depth (`EarlyZPass = 3`); minimum screen radius for lights `0.03`; minimum screen radius for depth prepass `0.03`.
- **Shadowing & Reflections:**
  - Shadowmap streaming mips: `3`, max LOD `1024`, anisotropic filtering.
  - Distance field penumbra size: `0.05`.
  - Reflection capture probe resolution: `64×64` cubemap cells per district node.
- **Post-Processing Defaults:**
  - Bloom: `Enabled` (`r.DefaultFeature.Bloom = True`).
  - Anti-Aliasing: Temporal / MSAA 2x–4x (`AntiAliasing = 2`, `MobileMSAA = 2`).
  - Motion Blur & Lens Flare: `Disabled` (`False`) to preserve crisp action-combat readability.
  - UI Scaling Curve: Shortest-side scaling (`1.0x` at `1080p` → `2.0x` at `2560p`).

### 3.2 Dual-State Atmosphere & Lighting Matrix (`DREAM-Engine` WebGPU Shader Uniforms)

| Parameter | Day Dreams (Old-World Ruin Field) | Night Dreams / Nightfall (Neon Metropolis) |
|---|---|---|
| **Sun / Moon Directional Light** | Elevation `14°` (low golden sun), Azimuth `215°`, Color `#FFB86C` (`1.8` intensity), long warm shadows | Elevation `42°` (cold moon rim), Azimuth `140°`, Color `#6488EA` (`0.28` intensity) |
| **Sky & Zenith Gradient** | Zenith `#3B2D54` (violet dusk) → Horizon `#E08A44` (ochre/gold) | Zenith `#020617` (deep midnight) → Horizon `#0F172A` (urban haze) |
| **Volumetric / Exponential Fog** | Density `0.018`, Height Falloff `0.22`, Albedo `#C89D7C` (warm dust + low-ground cool mist `#6E7F91`) | Density `0.025`, Height Falloff `0.35`, Albedo `#0E294B` (neon scatter) |
| **Window Interior Cubemap Grid** | Inactive (`0.0` emissive) | Procedural parallax window shader: `65%` lit probability, warm `#FFE4B5` (`3200K`) vs cool `#A5F3FC` (`6500K`) per cell |
| **Street Surface BRDF** | Dry packed earth & slate (`Roughness = 0.88`, `Metallic = 0.0`) | Wet rain-slicked asphalt (`Roughness = 0.18`, puddle mask `Roughness = 0.04`, planar/SSR neon reflection) |

---

## 4. Clean-Room Input Bindings, Axis Curves & Camera Spring-Arm Specification

Extracted from `DefaultInput.ini` (`[/Script/Engine.InputSettings]`) and DREAM Action Combat controls:

### 4.1 Analog Axis Deadzones & Sensitivities
- **Mouse Look:** `MouseX` / `MouseY` `DeadZone = 0.0`, `Sensitivity = 0.07`, `Exponent = 1.0`, `bEnableFOVScaling = true`, `FOVScale = 0.01111`, `DoubleClickTime = 0.20 s`.
- **Gamepad Thumbsticks:** `Gamepad_LeftX/Y` and `Gamepad_RightX/Y` `DeadZone = 0.25`, `Sensitivity = 1.0`, `Exponent = 1.0`.
- **Camera Rotation Scales:** `RotateCamera (Yaw) = +1.0` (`MouseX` / `Gamepad_RightX`), `ChangePitch = -1.0` (`MouseY` / `Gamepad_RightY`).

### 4.2 Action & Movement Input Table

| Action / Axis Intent | Primary Keyboard / Mouse | Secondary Keyboard | Gamepad Binding |
|---|---|---|---|
| **Move Forward / Back** | `W` (`+1.0`) / `S` (`-1.0`) | `Up` / `Down` | `Gamepad_LeftY` |
| **Move Right / Left** | `D` (`+1.0`) / `A` (`-1.0`) | — | `Gamepad_LeftX` |
| **Normal / Light Attack Chain** | `LeftMouseButton` | `Left Arrow` | `Gamepad_FaceButton_Left` (X / Square) |
| **Special / Heavy Attack** | `F` / `RightMouseButton` (Combo) | `Up Arrow` | `Gamepad_FaceButton_Top` (Y / Triangle) |
| **Dodge Roll / Evade (i-frames)** | `SpaceBar` / `RightMouseButton` | `Down Arrow` | `Gamepad_FaceButton_Bottom` (A / Cross) |
| **Guard / Parry Stance** | `Q` | — | `Gamepad_LeftShoulder` |
| **Sprint / Run** | `LeftShift` / `LeftControl` | — | `Gamepad_LeftThumbstickButton` |
| **Use Slotted Item / Tonic** | `R` | `1`–`4` Hotbar | `Gamepad_DPad_Up` |
| **Switch Weapon Path** | `MouseWheelAxis` | `Right Arrow` | `Gamepad_FaceButton_Right` (B / Circle) |
| **Inventory / Character Sheet** | `Tab` / `I` | — | `Gamepad_Special_Right` |
| **Sup@ Companion Dance / Ping** | `B` | — | `Gamepad_DPad_Down` |
| **Pause / System Menu** | `Escape` | — | `Gamepad_Special_Left` |

### 4.3 Third-Person Action Camera Spring-Arm Parameters
- **Target Arm Length:** `4.2 m` default (`3.2 m` indoor/sanctuary, `5.5 m` boss arena zoom-out), smooth mouse-wheel interpolation.
- **Socket Offset:** `[0.0 m, +0.55 m, +1.65 m]` (over-the-right-shoulder framing keeping the character's sheathed back-sword and floating Sup@ orb clearly visible).
- **Camera Lag:** Position lag enabled (`LagSpeed = 12.0`), Rotation lag enabled (`RotationLagSpeed = 18.0`), Max lag distance `1.2 m`.
- **Pitch Clamps:** `MinPitch = -65.0°` (looking up at towers), `MaxPitch = +45.0°` (overhead ground combat readability).
- **Collision Probe:** Sphere sweep radius `0.22 m` against `WorldStatic` channel (`Pawn` and `CharacterMesh` explicitly ignored per `DefaultEngine.ini` line 199: `CustomResponses=((Channel="Camera",Response=ECR_Ignore))`).

---

## 5. Clean-Room Action RPG Combat Mathematics & State Machine

Extracted from `RPGAttributeSet.h`, `RPGDamageExecution.cpp`, `RPGCharacterBase.cpp`, `RPGAbilityTask_PlayMontageAndWaitForEvent.h`, and `DefaultGameplayTags.ini`:

### 5.1 Core Character Attribute Set (`URPGAttributeSet` Clean-Room Equivalent)
Every combat actor (Player, Boss, Hostile Mob) instantiates an authoritative attribute vector:
- `Health` $\in [0, \text{MaxHealth}]$ — death triggers when $\text{Health} \le 0$.
- `MaxHealth` — when `MaxHealth` changes dynamically (buffs, level-up, Nightfall surge), current `Health` scales proportionally:
  $$\text{Health}_{\text{new}} = \text{Clamp}\left(\text{Health}_{\text{old}} \times \frac{\text{MaxHealth}_{\text{new}}}{\text{MaxHealth}_{\text{old}}}, \, 0, \, \text{MaxHealth}_{\text{new}}\right)$$
- `Stamina` / `Mana` $\in [0, \text{MaxStamina}]$ — consumed by dodge rolls, gap-closers, and special attacks.
- `AttackPower` (baseline `1.0`) — snapshot at the moment an attack or projectile spec is created (`Snapshot = true`).
- `DefensePower` (baseline `1.0`) — evaluated live on the target at the exact frame of hit impact (`Snapshot = false`).
- `MoveSpeed` — directly drives `CharacterMovement.MaxWalkSpeed`.

### 5.2 Server-Authoritative Damage Execution Formula (`RPGDamageExecution.cpp`)
On valid hit-shape intersection (when target does not carry tag `Status.DamageImmune`), final health reduction is computed deterministically:
$$\text{EffectiveDefense} = \begin{cases} 1.0 & \text{if } \text{DefensePower} = 0 \\ \text{DefensePower} & \text{otherwise} \end{cases}$$
$$\text{DamageDone} = \max\left(0, \, \frac{\text{BaseAbilityDamage} \times \text{SourceAttackPower}_{\text{snapshot}}}{\text{TargetEffectiveDefense}_{\text{live}}} \times \text{DurabilityPenalty}\right)$$
where $\text{DurabilityPenalty} = 0.5$ if the attacker's weapon durability is $0$, else $1.0$.

### 5.3 Action Montage Event Tag Vocabulary & Frame Windows (`DefaultGameplayTags.ini`)
Abilities run a unified state task (`PlayMontageAndWaitForEvent`) that binds animation clip playback to discrete event notifies:
- **Ability Category Tags:**
  - `Ability.Melee.Close`, `Ability.Melee.Far`, `Ability.Ranged`, `Ability.Skill`, `Ability.Item`, `Cooldown.Skill`
- **Combo & Impact Montage Event Tags:**
  - `Event.Montage.Player.Combo.FrontalAttack` — Light 3-hit chain (`Startup: 0.12 s`, `Active: 0.16 s`, `Recovery: 0.22 s`, cancel window opens at `0.24 s`).
  - `Event.Montage.Player.Combo.ChestKick` — Close-range posture/guard break (`Startup: 0.18 s`, `Active: 0.10 s`, `Stagger: 0.80 s`).
  - `Event.Montage.Player.Combo.BurstPound` / `GroundPound` — Radial AoE slam (`Radius: 4.5 m`, `Startup: 0.35 s`, `Active: 0.15 s`).
  - `Event.Montage.Player.Combo.JumpSlam` — Gap-closing leap strike (`GapClose: 6.0 m`, `Startup: 0.40 s`).
  - `Event.Montage.Shared.WeaponHit` — Exact frame notify when server hit-shape trace executes.
  - `Event.Montage.Shared.UseSkill` / `Event.Montage.Shared.UseItem` — Frame notify when stamina/item charge is consumed.
  - `Status.DamageImmune` — Active during Dodge Roll invulnerability window (`0.04 s – 0.32 s` of a `0.50 s` roll).

### 5.4 Slotted Inventory & Ability Grant Lifecycle (`RPGCharacterBase.cpp`)
- **Item Categories (`DefaultGame.ini`):** `Map`, `Potion`, `Skill`, `Token`, `Weapon`.
- **Slotted Override Rule:** Characters initialize `DefaultSlottedAbilities` at spawn (`CharacterLevel = 1`). When a `Weapon` or `Skill` item is equipped into an `FRPGItemSlot(ItemType, SlotNumber)`, the slot's `AbilityLevel` overrides to `SlottedItem->AbilityLevel` and grants `SlottedItem->GrantedAbility` on the authoritative server.

---

## 6. Clean-Room Procedural Crowd, Traffic & Spatial Sensor Grid Rules

Extracted from `CitySampleDreamOnline.uproject` modules (`CitySampleMassCrowd`, `Traffic`, `ZoneGraph`, `CitySampleSensorGrid`, `AnimToTexture`):

1. **Vertex-Animation Texture (`AnimToTexture`) Instanced Crowd Rendering:**
   - Ambient T0 city pedestrians and distant traffic vehicles do not evaluate full skeletal bone hierarchies beyond `25 m`. Instead, skeletal animations (walk, run, idle, look-at) are baked into GPU textures (`AnimToTexture`) and rendered via single-draw-call `THREE.InstancedMesh` / WebGPU storage buffers in `DREAM-Engine`.
2. **ZoneGraph Spline Lanes (`ZoneGraph` + `Traffic`):**
   - Sidewalks and roadways are represented as directed hermite spline lanes with width, speed limit (`12 m/s` urban avenues, `1.4 m/s` pedestrian walkways), and intersection phase masks.
3. **2D Spatial Hash Sensor Grid (`CitySampleSensorGrid`):**
   - Crowd and traffic entities query a uniform 2D spatial hash grid (`4.0 m × 4.0 m` cells) rather than $O(N^2)$ raycasts to maintain separation distance, yield at crosswalks, and clear paths around combat arenas during Nightfall.
