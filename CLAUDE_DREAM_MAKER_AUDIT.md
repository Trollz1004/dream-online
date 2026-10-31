---
id: claude-dream-maker-audit
version: "1.0.0"
title: "DREAM Maker — Agent-First Engine & Editor Architecture Response for Claude"
author: "Google Gemini (Core Lead Co-GM & Primary Engine Architect)"
recipient: "Claude (Core Lead Co-GM) & Co-GM Council"
steward: "Josh Coleman (Electrician Founder · #ForTheKids #UntilNoKidInNeed)"
prompt_answered: "AISTUDIO-PROMPT-engine-editor_f63eb19f.md + dream-data-model-brief_3089633d.md"
viking_uri: "viking://dream/architecture/dream-maker-claude-audit"
---

# DREAM MAKER — ENGINE INVENTORY & AGENT-FIRST EDITOR ARCHITECTURE
**Prepared by Google Gemini for Claude (Co-GM Council Sync)**
**Grounded in `/src/engine/` & `/public/assets/aistudio/dream-data-model-brief_3089633d.md`**

---

## 1. WHAT THE ENGINE ALREADY IS

Inventory of `/src/engine/` across the 9 requested subsystems, classified as **real**, **partial**, or **stub / not built**, with exact file paths, line numbers, and code quotes:

### 1.1 Frame Loop — **REAL** (Variable `requestAnimationFrame` + Fixed `120Hz` Proof Clock)
* **Interactive Loop (`/src/engine/engine.ts`, lines 476–484)**: Runs on `requestAnimationFrame` with delta time clamped to `0.1s` (`100ms`):
  ```ts
  private loop(currentTime: number): void {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop.bind(this));

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.stepFrame(dt);
  }
  ```
* **Deterministic Fixed-Step Proof Clock (`/src/engine/engine.ts`, lines 252–255, 273–276, 357)**: Activated via `?proof=1` (`lines 218–221`), stepping `this.stepFrame(stepDt)` at `stepDt = 1 / 120` (`8.333ms`) over `10.0s` (`1,200` ticks):
  ```ts
  runProofSequence(): void {
    console.log('[DREAM] Scripted proof sequence starting on 120Hz fixed-step clock (?proof=1)');
    const stepDt = 1 / 120;
    let simTime = 0.0;
  ```
* **Limitation**: In normal play mode (`loop()`), physics and combat step directly with variable `dt` rather than an accumulator-driven fixed physics sub-step.

### 1.2 Physics — **PARTIAL** (Analytic Primitives + Ground `Y=0` Clamp Only; Rigid-Body / Obstacle Collision is **NOT BUILT**)
* **Primitives (`/src/engine/math/collision.ts`, lines 8–111)**: Implements `Ray` (`intersectPlane` at `lines 27–34`), `AABB` (`containsPoint` at `lines 45–51`, `intersects` at `lines 53–59`), and `Capsule` (`intersectsGround` at `lines 87–89`, `clampToGround` at `lines 91–95`, `distanceToPoint` at `lines 97–110`):
  ```ts
  intersectsGround(groundY = 0): boolean {
    return this.center.y < groundY;
  }

  clampToGround(groundY = 0): void {
    if (this.center.y < groundY) {
      this.center.y = groundY;
    }
  }
  ```
* **Integration (`/src/engine/controller/character-controller.ts`, lines 148–168)**: Applies linear velocity interpolation, downward gravity (`gravity: number = 24.0` at `line 24`), and clamps the player capsule to `groundY = 0`:
  ```ts
  this.capsule.center.copy(this.position);
  if (this.capsule.intersectsGround(0)) {
    this.capsule.clampToGround(0);
    this.position.copy(this.capsule.center);
    this.velocity.y = 0;
    this.isGrounded = true;
  }
  ```
* **What is NOT built**: Capsule-vs-AABB and capsule-vs-capsule collision resolution are **not built**. The player can walk straight through the 6 scenic monoliths (`/src/engine/engine.ts`, `lines 162–178`), Studio entities (`lines 723–745`), and the Hollow Sentinel (`(0, 0, -10)`). Jump impulse and uneven terrain heightfield raycasting are **not built**.

### 1.3 Player Controller — **REAL**
* **Locomotion & Input (`/src/engine/controller/character-controller.ts`, lines 20–24, 43–145)**: Implements camera-yaw-relative WASD + Gamepad left-stick movement, `walkSpeed = 5.5` m/s (`line 20`), `runSpeed = 9.5` m/s (`line 21`), smooth yaw interpolation (`turnSpeed = 12.0` rad/s at `line 22`, `lines 137–141`), and double-tap auto-sprint (`DOUBLE_TAP_WINDOW = 0.30`s in `/src/engine/combat/combat-manager.ts`, `lines 32, 85–92`).
* **Combat State Overrides (`/src/engine/controller/character-controller.ts`, lines 93–116)**: Overrides movement velocity during `DashState` (`14.0` m/s during startup/invulnerable phases, locked `0` m/s during recovery at `lines 94–104`) and `LungeState` (`lines 106–116`):
  ```ts
  if (combat && combat.dash.isDashing()) {
    if (combat.dash.phase() === 'recovery') {
      // Recovery is wide open, player cannot steer out
      targetVelX = 0;
      targetVelZ = 0;
      accelRate = 40.0;
    } else {
      // Startup and invulnerable travel (14 m/s)
      targetVelX = combat.dashDirection.x * 14.0;
      targetVelZ = combat.dashDirection.z * 14.0;
      accelRate = 80.0;
    }
  ```
* **Authoritative Combat State Machines (`/src/engine/combat/combat-manager.ts`, lines 40–45, 95–262, 409–513)**: Implements 6 finite-state machines (`DashState`, 3-step `AttackState`, `HeavyAttackState`, `GuardState`, `LungeState`, `BurstState`), stamina drain/regen (`STAMINA_REGEN = 20.0`, `SPRINT_DRAIN = 10.0` at `lines 30–31`), cone/arc and radius hit detection against the Sentinel (`resolveAttackHits` at `lines 409–513`), and append-only `WorldEvent` logging (`eventLog.append` at `lines 119, 150, 181, 199, 218, 246, 333, 347, 368, 391, 431, 457, 482, 504`).

### 1.4 Enemy AI — **PARTIAL** (Single Hardcoded Automaton State Machine; General NPC Navigation/Behavior Trees are **NOT BUILT**)
* **Hollow Sentinel (`/src/engine/combat/sentinel.ts`, lines 11–112)**: Implements a deterministic 4.2-second cyclic state machine (`CYCLE = 4.2`, `TELEGRAPH = 1.4`, `ACTIVE = 0.30`, `BEAM_LENGTH = 26.0`, `BEAM_WIDTH = 2.2`, `DAMAGE = 18.0`, `HEALTH_MAX = 120.0`, `DOWN_DURATION = 4.0` at `lines 12–19`). Locks aim vector toward `playerPosition` during the first 5% of wind-up (`lines 73–84`) and tests 2D oriented bounding-box beam intersection (`hitsPlayer` at `lines 96–112`):
  ```ts
  // Lock aim at the start of wind-up (progress < 0.05)
  if (windupProgress < 0.05) {
    const toPlayer = new Vec3(
      playerPosition.x - this.position.x,
      0.0,
      playerPosition.z - this.position.z
    );
    const len = toPlayer.length();
    if (len > 0.01) {
      this._aim = toPlayer.normalize();
    }
  }
  ```
* **What is NOT built**: Pathfinding/navmesh, aggro/leash radii, multi-enemy target tables (melee hit resolution in `/src/engine/combat/combat-manager.ts`, `lines 409–513` checks only `this.sentinel`), and behavior trees for non-Sentinel enemies are **not built**.

### 1.5 Projectiles — **NOT BUILT**
* There is no projectile entity, ballistic solver, raycast projectile, or time-of-flight collider anywhere in `/src/engine/`. All current attacks are instantaneous melee cones/arcs (`AttackState`, `HeavyAttackState`, `LungeState`), point-blank AoE (`BurstState`), or the Sentinel's hitscan-style box beam (`HollowSentinel.hitsPlayer` in `/src/engine/combat/sentinel.ts`, `lines 96–112`).

### 1.6 Particles — **STUB / NOT BUILT**
* **Unrendered VFX Queues (`/src/engine/combat/combat-manager.ts`, lines 64–82, 139–148, 237–244, 304–315)**: `CombatManager` pushes timed entries into `activeSlashArcs` and `activeBursts` and ages/removes them in `update()`, and `DreamEngine` allocates `this.slashMesh` and `this.burstMesh` in its constructor (`/src/engine/engine.ts`, `lines 62–63, 123–124`):
  ```ts
  this.slashMesh = createMonolithGeometry(0.12, 0.25, 2.6);
  this.burstMesh = createMonolithGeometry(4.0, 0.08, 4.0);
  ```
* **What is NOT built**: Neither `this.slashMesh`/`this.burstMesh` nor `this.combat.activeSlashArcs`/`activeBursts` is ever pushed into `items: RenderItem[]` inside `DreamEngine.stepFrame()` (`/src/engine/engine.ts`, `lines 516–746`), and no instanced particle emitter or GPU billboard system exists.

### 1.7 Camera — **REAL** (with Camera-Arm Collision **NOT BUILT**)
* **Perspective & Orbit/First-Person (`/src/engine/scene/camera.ts`, lines 10–108)**: Extends `SceneNode`, computes `projectionMatrix`, `viewMatrix`, and `viewProjectionMatrix`, supports live FOV clamping (`30°–120°`, `lines 51–55`), and toggles between `'third-person'` orbit (`distance = 5.0` at `line 26`, `lines 88–101`) and `'first-person'` eye-height look (`lines 77–87`):
  ```ts
  } else {
    // 3rd Person Orbit
    const offsetX = this.distance * cosPitch * sinYaw;
    const offsetY = this.distance * sinPitch;
    const offsetZ = this.distance * cosPitch * cosYaw;

    this.position.set(
      this.target.x + offsetX,
      this.target.y + offsetY,
      this.target.z + offsetZ
    );

    this.updateView();
  }
  ```
* **What is NOT built**: Spring-arm raycast collision to prevent the 3rd-person camera from clipping into walls/monoliths, and applying `CombatManager.screenShakeTime` (`/src/engine/combat/combat-manager.ts`, `line 61`) to the camera transform are **not built**.

### 1.8 Renderer — **REAL** (Dual WebGPU + WebGL2 Procedural Mesh Pipeline; External Asset/Texture/Shadow-Map Pipelines **NOT BUILT**)
* **Backend Coordinator (`/src/engine/renderer/engine-renderer.ts`, lines 42–76, 97–167)**: Initializes `WebGPURenderer` first (`lines 46–56`) and falls back to `WebGL2Renderer` at init (`lines 59–70`) or on runtime draw exception (`lines 133–148`).
* **WebGPU Backend (`/src/engine/renderer/webgpu-renderer.ts`, lines 13–155, 195–330, 419–557)**: Single WGSL shader (`vs_main`/`fs_main`) with 256-byte `SceneUniforms` (`group 0`, `lines 250–269`) and per-object 128-byte `ObjectUniforms` (`group 1`, `lines 272–280, 400–417`). Renders procedural sky dome with sun/moon disc + procedural night stars (`lines 77–98`), ground plane with procedural grid (`lines 109–122`), Lambertian diffuse + hemisphere ambient + Blinn-Phong specular + rim lighting + emissive + exponential distance fog (`lines 124–153`), and `depth24plus` depth buffer (`lines 311–315`).
  * **Important Luma Caveat (`/src/engine/renderer/webgpu-renderer.ts`, lines 318–322, 551–557)**: Although `this.readbackBuffer` is allocated (`lines 319–322`), `copyTextureToBuffer` and `mapAsync` are never called; `WebGPURenderer.readLuma()` returns a hardcoded constant (`this.lastLuma = profile.world === 'day' ? 0.48 : 0.12` at `line 552`).
* **WebGL2 Backend (`/src/engine/renderer/webgl2-renderer.ts`, lines 13–179, 271–380)**: Matching GLSL ES 3.00 shader (`#version 300 es` with `precision highp float; precision highp int;` at `lines 13–15, 44–46`), plus contact darkening under the player capsule (`lines 138–145`) and **real** synchronous center-screen 16×16 pixel luminance readback via `gl.readPixels` (`updateRealLuma` at `lines 351–376`):
  ```ts
  gl.readPixels(startX, startY, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let totalLuma = 0;
  const count = w * h;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] / 255.0;
    const g = pixels[i + 1] / 255.0;
    const b = pixels[i + 2] / 255.0;
    totalLuma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  this.lastLuma = totalLuma / count;
  ```
* **ECS Disconnect (`/src/engine/ecs/components.ts` & `/src/engine/ecs/entity.ts`)**: `Entity` and `World` exist in `/src/engine/ecs/entity.ts` (`lines 8–92`), but `DreamEngine` (`/src/engine/engine.ts`) does not import or instantiate `World`; it builds `RenderItem[]` directly from `SceneNode` transforms (`lines 516–745`).
* **What is NOT built**: glTF/GLB mesh loading, 2D texture/normal-map sampling, skeletal skinning, shadow maps, frustum culling, and post-processing passes are **not built**.

### 1.9 Audio — **PARTIAL** (Procedural Web Audio Ambient Drone + FFT Analyzer; Spatial 3D Audio & Combat SFX are **NOT BUILT**)
* **Ambient Synthesizer (`/src/engine/audio/ambient-synth.ts`, lines 8–193)**: Generates a 4-second pink-noise buffer (`lines 45–59`) through a low-pass `BiquadFilterNode` (`lines 61–64`) layered with a 55Hz sine sub-oscillator (`lines 77–85`) and an `AnalyserNode` (`fftSize = 64` at `lines 39–42`). Shifts filter cutoff and sub frequency smoothly on day/night toggle (`setMode` at `lines 125–137`) and atmosphere presets (`setAtmospherePreset` at `lines 139–162`).
* **What is NOT built**: Combat sound effects (sword swings, hit impacts, Perfect Dodge chime, Sentinel Focus Beam charge/fire), `PannerNode` 3D spatialization, and external audio asset decoding are **not built**.

---

## 2. THE EDITOR'S AGENT CONTRACT

To make **DREAM Maker** natively operable by Claude, Gemini, Codex, and Hermes against the canonical `Trollz1004/dream-online` schemas (`/public/assets/aistudio/dream-data-model-brief_3089633d.md`), the editor is not a GUI with an AI sidebar—**the editor is a deterministic state-transition kernel over the 10 canonical JSON contracts**, and the 3D viewport is merely one subscriber to that state.

### 2.1 ADDRESS — Stable, Rename-Proof, Concurrent-Safe Identity
Every object in a zone, inventory, combat table, or NPC memory store is addressed by a **Canonical DREAM URN** bound to the immutable primary keys already defined in `dream-data-model-brief_3089633d.md`, paired with a monotonic Lamport revision (`rev`) and content SHA-256 digest:

```text
dream://<zoneId>/<contractType>/<canonicalId>[@rev:<uint64>][#jsonPointer]
```

* **Contract-Grounded Canonical IDs**:
  * Zone Entities & Seeds (`first-zone.seed.json` / `life-skill`): `dream://first-gate/node/node_sun_clover_01` (`nodeId`), `dream://first-gate/recipe/recipe_star_iron_ingot` (`recipeId`), `dream://first-gate/worker-task/wtask_001` (`workerTaskId`)
  * Characters (`character-profile` & `pvp-state`): `dream://global/character/char_01HV8...` (`characterId`)
  * Combat Abilities (`combat-ability`): `dream://global/combat-ability/ability_dream_lunge#hitShape/rangeMeters` (`abilityId`)
  * Items & Marketplace (`item-inventory` & `marketplace`): `dream://global/item-template/item_tpl_star_blade` (`itemTemplateId`), `dream://global/item-instance/item_inst_9941` (`itemInstanceId`), `dream://global/market-listing/lst_8821` (`listingId`)
  * Live NPCs & Memory (`npc-profiles.json` & `live-npc-memory`): `dream://first-gate/npc/npc_sup_guide` (`npcId`), `dream://first-gate/npc-memory/mem_01HX...` (`memoryId`)
  * World Events (`world-event`): `dream://first-gate/world-event/evt_eclipse_raid_01` (`eventId`)
  * Boosters & Pets (`boosters-pets`): `dream://global/booster/boost_xp_10` (`boostItemId`), `dream://global/pet/pet_amber_owl` (`petId`)
* **Why it survives renames**: `displayName` / `name` is a mutable property inside the document payload; the URN keys exclusively on the immutable `characterId`, `npcId`, `abilityId`, `itemTemplateId`, `itemInstanceId`, `nodeId`, or `eventId`. Renaming `"Hollow Sentinel"` to `"Corrupted Sentinel"` never changes `dream://first-gate/npc/sentinel-001`.
* **Why it survives concurrent edits by multiple agents**: Every entity header carries `{ "rev": 14, "sha256": "a9f3...", "lastActor": "agent:claude" }`. Mutations targeting a URN must supply `baseRev: 14`. Field-level JSON Pointers (`#hitShape/arcDegrees` vs. `#cooldown/baseSeconds`) allow commute-safe merges on disjoint subtrees inside the same entity, while overlapping path edits with a stale `baseRev` immediately reject with `409 E_REV_CONFLICT` and return the current diff.

### 2.2 READ — Token-Bounded, Queryable Text State for Agent Reasoning
Dumping raw scene graphs or floating-point vertex buffers overflows agent context windows. `READ` exposes three deterministic, text-native projections over HTTP/MCP (`GET /api/maker/read` or CLI `dream-maker read`):

1. **L0 Zone Digest (`view=digest`, ~300 tokens)**: Returns zone metadata (`first-zone.seed.json`), active `day-night-economy-rules.json` phase, active `world-event` IDs, entity counts by contract type, and spatial bounding boxes.
2. **L1 Filtered Contract Query (`view=query`)**: Supports spatial, contract, and relational predicates and returns canonical NDJSON (1 line per entity, sorted deterministically by URN):
   * Spatial filter: `within(xz: [0, -10], radiusMeters: 15)`
   * Contract filter: `contract IN ["npc-profile", "live-npc-memory", "world-event"] AND zoneId == "first-gate"`
   * Field projection: `select=["npcId","position","witness","providerRoute.selectedProvider"]`
3. **L2 Exact Entity + Dependency Slice (`view=inspect&urn=dream://...`)**: Returns the exact JSON document validated against its schema in `schema-index.json`, its current `rev`, plus its inbound/outbound reference graph (e.g., inspecting `dream://first-gate/world-event/evt_01` returns the `npcId` list in `npcVisibility.witnessNpcIds` and the `nodeId` list in `eventLayers`).

### 2.3 MUTATE — Transactional, Schema-Validated Operation Set
Every change is submitted as an atomic **Transaction Envelope** (`DreamTx`) containing an ordered array of typed operations. No partial writes are permitted: if any operation fails JSON Schema validation (`schema-index.json`) or domain invariant checks, the entire transaction rolls back.

```json
{
  "txId": "tx_20261025_0042",
  "actor": "agent:claude-gm",
  "baseWorldRev": 108,
  "intent": "Add Corrupted Sentinel phase, Star-Iron drop table, and Eclipse world event at First Gate",
  "ops": [ ... ]
}
```

**Core Operation Set across the 4 Domains**:

1. **Level & Spatial (`first-zone.seed.json` & `life-skill` nodes)**:
   * `zone.spawn_node`: Creates a spatial landmark, collider, or gathering node (`nodeId`, `skillId`, `activityId`, `transform: { position: [x,y,z], rotationEulerDeg: [p,y,r], scale: [sx,sy,sz] }`, `collider: { kind: "aabb"|"capsule", halfExtents: [x,y,z] }`).
   * `zone.transform_node`: Patches `position`, `rotationEulerDeg`, `scale`, or `snapToGround: true` on an existing URN.
   * `zone.delete_node`: Removes a node URN (fails if referenced by an active `workerTaskId` or `world-event` unless `cascade: true`).
2. **NPC & Live Memory (`npc-profiles.json`, `live-npc-memory`, `npc_memory.gd`)**:
   * `npc.upsert_profile`: Creates or updates an NPC (`npcId`, `zone`, `witness: boolean`, `time_of_day`, `position`, `combatStats`, `providerRoute: { requestedProvider, selectedProvider, tier, fallbackChain, timeoutMs }`).
   * `npc.seed_memory`: Appends or resets facts matching the `npc_memory.gd` contract (`record(event_type, details)` → writes `{ memoryId, npcId, playerId, zone, witness, timeOfDay, eventType, details }` and syncs to `lab_base_url: "http://127.0.0.1:9127"` / `.15:9127`).
3. **Combat Abilities, Items & Economy (`combat-ability`, `item-inventory`, `marketplace`, `boosters-pets`)**:
   * `combat.upsert_ability`: Defines or tunes an ability (`abilityId`, `starterPath: "will"|"vitality"|"Wit"`, `unlock`, `input`, `costs: { stamina, mana, cooldownSeconds }`, `hitShape: { kind: "arc"|"box"|"sphere", rangeMeters, arcDegrees, widthMeters }`, `movement`, `balance`).
   * `item.upsert_template`: Registers an item in `item-inventory` (`itemTemplateId`, `durabilityRules`, `dropRules: { dropOnPvpDeath, bindState }`, `auditEvent`).
   * `economy.configure_rules`: Updates `day-night-economy-rules.json` or `marketplace` fee/listing rules (`marketplaceRules`, `boosterRules` with hard-cap validation so paid boosters never exceed the free/earned ceiling).
4. **Quests & World Events (`world-event` & `progression`)**:
   * `event.upsert_world_event`: Creates or modifies a `world-event` (`eventId`, `eventType`, `zoneId`, `state: "scheduled"|"active"|"resolved"|"rolled_back"`, `trigger`, `duration`, `playerImpact`, `eventLayers`, `npcVisibility`, `rollback: { snapshotId, autoRollbackOnTimeout }`).
   * `event.transition_state`: Deterministically transitions a `world-event` state (e.g., `"scheduled"` → `"active"` or `"active"` → `"rolled_back"`), automatically firing witness notifications to all NPCs matching `npcVisibility`.

### 2.4 VERIFY — Headless, Zero-Human Proof Pipeline
An agent must never claim `"I updated the ability/NPC/level"` based merely on a `200 OK` write. Every `MUTATE` transaction runs through a **4-Gate Deterministic Verification Pipeline** and returns a machine-readable `VerificationReceipt`:

* **Gate 1 — Schema & Cross-Contract Referential Integrity (0ms, CPU)**:
  Validates every mutated document against the 10 JSON schemas in `schema-index.json` AND checks cross-contract foreign keys (e.g., every `itemTemplateId` in an NPC drop table exists in `item-inventory`; every `boostItemId` in `boosters-pets` obeys the non-pay-to-win cap; every `npcId` in `world-event.npcVisibility` exists in `npc-profiles.json`).
* **Gate 2 — Spatial & Geometric Invariant Solver (<5ms, CPU)**:
  Runs headless `Ray`, `AABB`, and `Capsule` checks (`/src/engine/math/collision.ts`) across the zone:
  * **Floor/Bounds Check**: Verifies no spawned NPC or `nodeId` is floating unintentionally (`capsule.intersectsGround(0)`) or buried below terrain.
  * **Overlap Check**: Verifies no two blocking colliders or spawn beacons intersect (`AABB.intersects`).
  * **Reachability Check**: Steps a virtual `CharacterController` (`walkSpeed = 5.5` m/s, `radius = 0.45`, `height = 1.9`) along straight-line/waypoint segments from the zone spawn `(0, 0, 0)` to the mutated target URN to prove the player isn't blocked by geometry.
* **Gate 3 — Headless Fixed-Tick Combat/Event Simulation (`stepFrame(1/120)`, CPU, ~15ms for 1,200 ticks)**:
  Generalizes `DreamEngine.runProofSequence()` (`/src/engine/engine.ts`, `lines 252–383`) into a synchronous headless runner `runSimulationTrace(script, ticks)`. The agent submits a declarative assertion script alongside its mutation:
  ```json
  {
    "tickRateHz": 120,
    "durationSeconds": 10.0,
    "timeline": [
      { "atSec": 0.0, "action": "move_toward", "targetUrn": "dream://first-gate/npc/sentinel-001" },
      { "atSec": 3.84, "action": "input_skill", "direction": "W", "shift": true, "key": "F" },
      { "atSec": 4.80, "action": "input_skill", "direction": "", "shift": false, "key": "LMB" }
    ],
    "assertions": [
      { "expr": "events.count('combat.perfect_dodge') >= 1" },
      { "expr": "entity('dream://first-gate/npc/sentinel-001').health < 120.0" },
      { "expr": "player.health == 100.0" }
    ]
  }
  ```
  Because `stepFrame(1/120)` is pure math and state machines, `10.0` seconds of game time (`1,200` frames) executes synchronously in `<15ms` with zero rendering required, returning the exact `EventLog` (`WorldEvent[]` from `/src/engine/combat/event-log.ts`) and pass/fail state for every assertion.
* **Gate 4 — GPU Framebuffer / Luma Readback Proof (Optional Visual Gate)**:
  When a mutation changes shaders, lighting profiles, or material emissives:
  * On WebGL2, calls `updateRealLuma()` (`gl.readPixels` 16×16 sample in `/src/engine/renderer/webgl2-renderer.ts`, `lines 351–376`).
  * On WebGPU, wires the existing `this.readbackBuffer` (`/src/engine/renderer/webgpu-renderer.ts`, `lines 319–322`) to `commandEncoder.copyTextureToBuffer` + `readbackBuffer.mapAsync(GPUMapMode.READ)` to compute real center/region RGB luminance and bounding-box pixel coverage, proving the object actually rendered on screen and didn't produce a black/NaN framebuffer.

---

## 3. WHAT THIS MAKES POSSIBLE THAT UNREAL CANNOT

1. **Multi-Agent Git Branching and Semantic 3-Way Merging of Live Zones, Abilities, and Quests (Prevented by `.uasset` / `.umap` Binary Serialization)**
   * **What Unreal Prevents**: In Unreal Engine, a level (`.umap`) and a Gameplay Ability Blueprint (`.uasset`) are opaque binary blobs with internal FName tables and object export graphs. Two agents (e.g., Claude balancing `combat-ability` hit-shapes while Codex adds gathering nodes and an Eclipse `world-event` to the same zone) cannot edit the same file concurrently without Unreal's exclusive file locking (`One File Per Actor` still leaves binary `.uasset` payloads that `git merge` cannot diff or resolve).
   * **What DREAM Maker Enables**: Because every zone (`first-zone.seed.json`), ability (`combat-ability`), and event (`world-event`) is canonical JSON addressed by stable URNs (`dream://<zone>/<contract>/<id>#pointer`), three agents can work on separate Git branches simultaneously, open standard pull requests, and merge concurrent changes to the exact same zone and NPC table with zero binary corruption.

2. **1,000x Real-Time Closed-Loop Combat & Economy Balancing in Milliseconds (Prevented by GUI-First PIE Startup & Heavy Render/Physics Coupling)**
   * **What Unreal Prevents**: Testing whether a 0.04-second reduction in a boss telegraph window or a change in stamina regen breaks Perfect Dodge survivability in Unreal requires compiling Blueprints, launching Play-In-Editor (PIE) or a multi-gigabyte headless server binary, and stepping heavy PhysX/Chaos worlds.
   * **What DREAM Maker Enables**: `CombatManager`, `HollowSentinel`, and `CharacterController` step deterministically on `stepFrame(1 / 120)` in pure TypeScript with zero DOM/GPU dependencies during simulation (`/src/engine/engine.ts`, `lines 252–383`). An agent tuning a `combat-ability` contract can run 500 10-second combat simulations (`600,000` ticks at 120Hz) in `<2 seconds`, inspect the resulting `EventLog` (`player.hit_taken`, `combat.perfect_dodge`, `player.hit_landed`), and mathematically prove that a skill is dodgeable before committing the JSON patch.

3. **Zero-Rebuild Live Mutation of World Events, Economy Rules, and Witness NPC Memory in a Running Browser Session (Prevented by Offline Asset Cooking / `.pak` Packaging)**
   * **What Unreal Prevents**: Shipping a new world event layer, altering material rim/emissive shaders, or wiring live witness triggers into NPC memory in Unreal requires cooking assets into platform-specific `.pak` / `.utoc` / `.ucas` archives and redistributing gigabytes to clients.
   * **What DREAM Maker Enables**: A transaction committed to `world-event` (`state: "active"`, `npcVisibility.witnessNpcIds`) or `combat-ability` is a sub-4KB JSON payload streamed over WebSocket/HTTP to connected browsers, validated against `schema-index.json`, applied in-place on the next 120Hz tick, and immediately reflected in `npc_memory.gd` / Live NPC Lab (`.15:9127`) witness recall (`record()` / `recall()`) with automatic rollback via `world-event.rollback.snapshotId` if health metrics degrade.

---

## 4. THE FIRST SLICE

### The Smallest Demonstrable Slice: **"First Gate Live Agent Loop (Mutate → 120Hz Headless Proof → Live Witness NPC Recall)"**
A single end-to-end vertical slice in the **First Gate** arena (`first-zone.seed.json`) where an agent (Claude or Gemini) modifies the live arena and combat balance via a single JSON transaction, verifies it headlessly at 120Hz with zero human intervention, and causes an in-world witness NPC (`Sup@` or `Vanguard Sentinel Captain`) to remember and reference the verified outcome.

* **What It Does Step-by-Step**:
  1. **READ**: Agent calls `GET /api/maker/read?view=inspect&zone=first-gate` and receives the canonical JSON for `first-zone.seed.json`, `HollowSentinel` (`npc:sentinel-001`), the player's `combat-ability` definitions (`Dash`, `Light Attack`, `Dream Lunge`, `Nightveil Burst`), and witness NPC `camp-guard`.
  2. **MUTATE**: Agent submits a `DreamTx` (`POST /api/maker/mutate`) that:
     * Spawns a new `life-skill` Star-Iron node (`node_star_iron_01`) at `[6, 0, -8]` with a real AABB collider.
     * Tunes `ability_nightveil_burst` radius from `4.0m` to `5.5m` in its `combat-ability` contract.
     * Triggers a `world-event` (`evt_sentinel_overcharge`) that boosts `sentinel-001` Focus Beam damage from `18.0` to `24.0` and registers `camp-guard` in `npcVisibility.witnessNpcIds`.
  3. **VERIFY (Headless 120Hz + GPU Luma)**:
     * The engine runs the synchronous 120Hz proof runner (`1,200` ticks in `<15ms` on the server/client) and returns a signed `VerificationReceipt` proving:
       * Schema validation passed against `combat-ability`, `life-skill`, and `world-event`.
       * Spatial check passed (new Star-Iron node is grounded at `Y=0` and does not overlap `sentinel-001` or player spawn).
       * Combat simulation trace passed (`combat.perfect_dodge:1`, `player.hit_taken:1` with guarded damage `24.0 * 0.25 = 6.0`, `sentinel.defeated:1`).
       * GPU luma check passed (real pixel readback on both WebGPU and WebGL2).
  4. **LIVE WITNESS SYNC**: The verified `EventLog` emits `combat.perfect_dodge` and `sentinel.defeated` to the `live-npc-memory` store (`/api/maker/npc-memory` / `.15:9127`), and the backer immediately sees the 3D scene update AND hears the witness NPC comment on the exact `6.0 HP` guarded Overcharged Beam hit.

* **What Needs to Be Built for This First Slice**:
  1. **Contract-Driven Combat & Scene Loader**: Replace hardcoded constants in `AttackState`, `BurstState`, `LungeState`, and `HollowSentinel` (`/src/engine/combat/*`) so they hydrate directly from `combat-ability`, `first-zone.seed.json`, and `world-event` JSON objects.
  2. **Player-vs-AABB/Capsule Obstacle Collision**: Add 25 lines in `/src/engine/controller/character-controller.ts` (`after line 168`) to resolve horizontal `Capsule`-vs-`AABB` penetration against monoliths and spawned `nodeId` colliders.
  3. **Synchronous Headless `runProofTickLoop(tx, script)` API**: Decouple `DreamEngine.runProofSequence()` (`/src/engine/engine.ts`, `lines 252–383`) from `setTimeout(..., 1000/120)` so it can execute all `1,200` ticks synchronously in a `for` loop in `<15ms` and return the structured JSON `VerificationReceipt`.
  4. **Real WebGPU Luma Readback**: Wire `commandEncoder.copyTextureToBuffer` into `this.readbackBuffer` in `/src/engine/renderer/webgpu-renderer.ts` (`line 551`) so `WebGPURenderer.readLuma()` matches `WebGL2Renderer.updateRealLuma()`.

* **What It Does NOT Need Yet**:
  * Multi-zone streaming or world partitioning beyond `first-gate`.
  * External glTF/skeletal mesh animation pipelines (procedural Cyber-Knight + Monolith/Node primitives are sufficient to prove the architecture).
  * Full `marketplace` order-book matching or `pvp-state` flagging.
  * Projectile physics or navmesh pathfinding.

---

## 5. BROWSER CONSTRAINTS

Running an MMO engine + live editor inside a browser tab imposes four hard platform constraints that directly shaped the design above:

1. **Main-Thread `requestAnimationFrame` Contention & Background Tab Throttling → Worker-Isolated Fixed-Tick Kernel**
   * **Browser Constraint**: Browsers throttle `requestAnimationFrame` and `setTimeout` to `1Hz` (or pause them entirely) when a tab is backgrounded, and heavy JSON schema validation or 1,200-tick headless verification on the main UI thread would cause frame drops during gameplay.
   * **Design Change**: The authoritative simulation (`CharacterController`, `CombatManager`, `HollowSentinel`, `EventLog`, and the Gate 1–3 `VERIFY` runner) contains zero DOM or WebGPU references and runs inside a dedicated **Web Worker** (or Node.js server worker) on a deterministic `stepFrame(1 / 120)` tick loop. We deliberately avoid requiring `SharedArrayBuffer` for the core state bus because `Cross-Origin-Opener-Policy: same-origin` / `Cross-Origin-Embedder-Policy: require-corp` headers can break third-party OAuth popups and ad-funded `#UntilNoKidInNeed` embeds; instead, compact flat `Float32Array` transform snapshots (~2KB per frame) are transferred via zero-copy `postMessage(..., [buffer])` to the main render thread.

2. **Asynchronous WebGPU Readback (`mapAsync`) vs. Synchronous WebGL2 (`gl.readPixels`) → Dual-Stage Verification Gate**
   * **Browser Constraint**: In `/src/engine/renderer/webgl2-renderer.ts` (`lines 363–372`), `gl.readPixels` is synchronous, blocking the CPU/GPU pipeline to return pixel luma immediately. In WebGPU (`/src/engine/renderer/webgpu-renderer.ts`, `lines 319–322`), GPU buffers cannot be read synchronously on the CPU; `GPUBuffer.mapAsync(GPUMapMode.READ)` returns a `Promise` that resolves only after the GPU queue flushes, and calling it every frame stalls the swapchain.
   * **Design Change**: We separated **Gate 3 (Deterministic 120Hz State/Math Verification)** from **Gate 4 (Visual Luma Readback)**. Agents get synchronous, sub-15ms truth from Gate 3 (`EventLog` + analytic `Ray`/`AABB`/`Capsule` checks) on every mutation, while Gate 4 (`copyTextureToBuffer` + async `mapAsync` into `this.readbackBuffer`) is triggered only on keyframe checkpoints (`t = 3.95s`, `t = 4.25s`, `t = 8.15s` in `runProofSequence`, or once after a shader/material mutation).

3. **Per-Tab Memory Ceiling (~2GB–4GB JS Heap + VRAM Eviction) → Procedural Parametric Geometry + L0/L1/L2 Streaming**
   * **Browser Constraint**: Unlike a desktop Unreal client that can map 16GB+ of virtual memory and stream from local NVMe `.pak` files, a browser tab crashes with `OOM` if uncommitted editor undo history or uncompressed meshes/textures accumulate in ArrayBuffers, and the browser OS can evict the GPU context (`device.lost` in WebGPU / `webglcontextlost` in WebGL2).
   * **Design Change**:
     * World state mutations are stored as compact JSON diffs (`DreamTx`, `<4KB` each) with deterministic replay rather than cloning full scene memory snapshots for undo/redo.
     * Geometry buffers in `WebGPURenderer` (`/src/engine/renderer/webgpu-renderer.ts`, `line 185`, `WeakMap<MeshGeometry, CachedGPUMesh>`) are cached once per archetype and instanced/reused via 128-byte `ObjectUniforms` (`lines 400–417`), keeping total VRAM under `16MB` for the entire First Gate slice and allowing instant recovery if the browser loses and recreates the GPU context.

4. **WebGPU Adapter Variance & Shader Precision Across Devices → Strict WGSL/GLSL Parity & Runtime Fallback**
   * **Browser Constraint**: WebGPU is still absent or experimental on some Linux browsers, older mobile GPUs, and enterprise VMs; furthermore, swapchain texture formats vary (`bgra8unorm` vs `rgba8unorm` via `navigator.gpu.getPreferredCanvasFormat()` at `/src/engine/renderer/webgpu-renderer.ts`, `line 228`), and mobile GPUs exhibit band/z-fighting artifacts without explicit high precision.
   * **Design Change**: `EngineRenderer` (`/src/engine/renderer/engine-renderer.ts`, `lines 45–75, 133–148`) enforces strict visual and mathematical parity between `WebGPURenderer` (WGSL) and `WebGL2Renderer` (GLSL ES 3.00 with `precision highp float; precision highp int;` at `/src/engine/renderer/webgl2-renderer.ts`, `lines 14–15, 45–46`). If WebGPU fails at initialization or throws an uncaptured pipeline error mid-frame, `EngineRenderer` hot-swaps to `WebGL2Renderer` on the next frame without losing `DreamEngine` scene state, `CharacterController` position, or `CombatManager` combat ticks.

---

## 6. WHAT COULD NOT BE DETERMINED FROM THE PROJECT FILES

1. **Exact JSON Schema Field Types Inside the 10 `Trollz1004/dream-online` Contract Files**:
   `/public/assets/aistudio/dream-data-model-brief_3089633d.md` (`lines 65–137`) lists the 10 contract names (`boosters-pets`, `character-profile`, `combat-ability`, `item-inventory`, `life-skill`, `live-npc-memory`, `marketplace`, `progression`, `pvp-state`, `world-event`) and their top-level key groups, and notes (`lines 511–531`) that the full JSON files reside in `Trollz1004/dream-online` (`contracts/schemas/*.schema.json` and `data/seeds/first-zone.seed.json`). Those raw `.schema.json` files are not present in this AI Studio workspace, so leaf scalar types and enum values inside those 10 contracts beyond what is summarized in `dream-data-model-brief_3089633d.md` could not be inspected directly.
2. **Full Implementation Bodies of `npc_memory.gd`, `player.gd`, and `dummy.gd`**:
   `dream-data-model-brief_3089633d.md` (`lines 139–177`) documents the exported variables and function signatures of `npc_memory.gd` (`record`, `recall`, `local_facts_for`, `reset_local`, `_post_fact_to_lab`, `_lab_recall_facts`), and comments in `/src/engine/controller/character-controller.ts` (`line 24`) and `/src/engine/combat/sentinel.ts` (`line 3`) reference `player.gd` and `dummy.gd`, but the `.gd` files themselves are in the separate `dream-online` repository and not in this workspace.
3. **Hardware LAN Node Runtime Code (`192.168.0.40:20128`, `192.168.0.15:9127`, `127.0.0.1:3130`)**:
   While `/src/engine/studioConfig.ts` (`lines 21–66`) and `/server.ts` reference and proxy to these endpoints, the server-side code running on the physical Alienware `.40` and Dell Precision T5500 `.15` machines is external to this repository.
