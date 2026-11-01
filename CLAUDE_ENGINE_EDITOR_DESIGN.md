================================================================================
DREAM ENGINE & DREAM MAKER EDITOR — ARCHITECTURE AUDIT & AGENT CONTRACT DESIGN
================================================================================

================================================================================
1. WHAT THE ENGINE ALREADY IS (HONEST INVENTORY OF /src/engine/)
================================================================================

Below is the exact status (REAL, PARTIAL, STUB, or NOT BUILT) of every subsystem
in `/src/engine/`, with file paths and quoted lines proving each status.

--------------------------------------------------------------------------------
1.1 FRAME LOOP — Status: REAL (Variable rAF + 120Hz Fixed-Step Proof Mode)
--------------------------------------------------------------------------------
* File: `/src/engine/engine.ts`
* What is real:
  - Live browser `requestAnimationFrame` loop with delta clamping (`dt <= 0.1s`)
    and ordered subsystem execution (`controller.update`, `combat.update`,
    scene node transform sync, `sceneRoot.updateWorldMatrix()`, `RenderItem`
    gathering, `renderer.render()`, metrics calculation, `input.endFrame()`).
  - Also includes a deterministic 120Hz fixed-step headless/automated proof runner
    (`runProofSequence()`, lines 252–383) activated via `?proof=1` (line 218).
* Quoted proof (`/src/engine/engine.ts`, lines 218–223 & 476–492):
    Line 218: const isProof = typeof window !== 'undefined' && window.location.search.includes('proof=1');
    Line 219: if (isProof) {
    Line 220:   this.runProofSequence();
    Line 221: } else {
    Line 222:   this.loop(this.lastTime);
    Line 223: }
    ...
    Line 476: private loop(currentTime: number): void {
    Line 477:   if (!this.isRunning) return;
    Line 478:   this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    Line 479: 
    Line 480:   const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    Line 481:   this.lastTime = currentTime;
    Line 482: 
    Line 483:   this.stepFrame(dt);
    Line 484: }
    Line 486: private stepFrame(dt: number): void {
    Line 488:   this.controller.update(dt, this.input, this.camera, this.combat);
    Line 491:   this.combat.update(dt, this.controller.position, this.controller.isSprinting, this.camera.yaw);

--------------------------------------------------------------------------------
1.2 PHYSICS — Status: PARTIAL (Flat Ground Y=0 Clamping + Primitives; No World Collider Solver)
--------------------------------------------------------------------------------
* Files: `/src/engine/math/collision.ts` (lines 1–112) & `/src/engine/controller/character-controller.ts` (lines 147–169)
* What is real:
  - Pure TypeScript math (`Vec3`, `Mat4`, `Quat`) and geometric primitives in
    `/src/engine/math/collision.ts`: `Ray.intersectPlane` (lines 27–34),
    `AABB.containsPoint` / `AABB.intersects` (lines 46–60), `Capsule.intersectsGround` /
    `Capsule.clampToGround` (lines 87–95), and `Capsule.distanceToPoint` (lines 97–110).
  - Gravity integration (`gravity = 24.0`, line 24) and flat ground plane clamping at
    `y = 0` in `CharacterController.update`.
* What is missing / unused:
  - `Ray`, `AABB`, and `Capsule.distanceToPoint` in `/src/engine/math/collision.ts` are
    never called by `DreamEngine` or `CharacterController`. There is no broadphase/narrowphase
    rigid-body solver, no player-vs-monolith or player-vs-sentinel collision response
    (the player can walk straight through monoliths and the Hollow Sentinel), and no jump
    impulse (`this.isGrounded` starts `true` on line 26 and never becomes `false`).
* Quoted proof (`/src/engine/controller/character-controller.ts`, lines 151–168 & `/src/engine/math/collision.ts`, lines 87–95):
    Line 151: // Gravity
    Line 152: if (!this.isGrounded) {
    Line 153:   this.velocity.y -= this.gravity * dt;
    Line 154: }
    Line 156: // Apply movement
    Line 157: this.position.x += this.velocity.x * dt;
    Line 158: this.position.y += this.velocity.y * dt;
    Line 159: this.position.z += this.velocity.z * dt;
    Line 161: // 4. Ground Collision & Clamping
    Line 162: this.capsule.center.copy(this.position);
    Line 163: if (this.capsule.intersectsGround(0)) {
    Line 164:   this.capsule.clampToGround(0);
    Line 165:   this.position.copy(this.capsule.center);
    Line 166:   this.velocity.y = 0;
    Line 167:   this.isGrounded = true;
    Line 168: }
    ---
    `/src/engine/math/collision.ts`:
    Line 87: intersectsGround(groundY = 0): boolean {
    Line 88:   return this.center.y < groundY;
    Line 89: }
    Line 91: clampToGround(groundY = 0): void {
    Line 92:   if (this.center.y < groundY) {
    Line 93:     this.center.y = groundY;
    Line 94:   }
    Line 95: }

--------------------------------------------------------------------------------
1.3 PLAYER CONTROLLER & COMBAT STATE MACHINE — Status: REAL (With Honest Skill Stubs)
--------------------------------------------------------------------------------
* Files:
  - `/src/engine/controller/character-controller.ts` (lines 14–179)
  - `/src/engine/input/input-manager.ts` (lines 8–446)
  - `/src/engine/combat/combat-manager.ts` (lines 27–549)
  - `/src/engine/combat/dash-state.ts` (lines 9–81)
  - `/src/engine/combat/attack-state.ts` (lines 9–106)
  - `/src/engine/combat/heavy-attack-state.ts` (lines 8–84)
  - `/src/engine/combat/guard-state.ts` (lines 8–74)
  - `/src/engine/combat/lunge-state.ts` (lines 8–89)
  - `/src/engine/combat/burst-state.ts` (lines 8–94)
  - `/src/engine/combat/combo-list.ts` (lines 161–193)
* What is real:
  - Camera-relative WASD + HTML5 Gamepad stick movement, walk (`5.5 m/s`), sprint (`9.5 m/s`
    draining stamina at `10.0/s`), smooth yaw interpolation (`turnSpeed = 12.0 rad/s`),
    pointer lock with drag-to-look fallback (`/src/engine/input/input-manager.ts`, lines 153–163).
  - Six working combat state machines with exact startup/active/recovery/cooldown/stamina timing:
    1. `DashState` (`Shift + Dir + ActionKey`): `0.06s` startup, `0.25s` invulnerability i-frames
       at `14.0 m/s`, `0.30s` unsteerable recovery (`/src/engine/combat/dash-state.ts`, lines 10–15).
    2. `AttackState` (`LMB`): 3-step light combo chain (`10 / 14 / 21` damage, `3.4m` reach,
       `0.9 rad` half-arc, `/src/engine/combat/attack-state.ts`, lines 10–19).
    3. `HeavyAttackState` (`RMB`): single committed swing (`32.0` damage, `3.6m` reach,
       `/src/engine/combat/heavy-attack-state.ts`, lines 9–16).
    4. `GuardState` (`Q`): absorbs `75%` incoming damage for `0.45s` (`/src/engine/combat/guard-state.ts`, lines 9–14).
    5. `LungeState` (`W+F`): `6.0m` forward gap-closer in `0.25s` for `18.0` damage (`/src/engine/combat/lunge-state.ts`, lines 9–17).
    6. `BurstState` (`R`): `4.0m` radial shockwave for `25.0` damage (`/src/engine/combat/burst-state.ts`, lines 9–15).
  - Unimplemented key combinations (e.g. `E`, `Z`, `C`, directional `Q/R/F` other than `W+F`)
    are explicitly marked as stubs in `/src/engine/combat/combo-list.ts` (lines 169–193) and
    `/src/engine/combat/combat-manager.ts` (lines 259–261).
* Quoted proof (`/src/engine/combat/combat-manager.ts`, lines 259–261 & `/src/engine/combat/combo-list.ts`, lines 180–187):
    `/src/engine/combat/combat-manager.ts`:
    Line 259: // Any other skill without move implementation marks its name on screen
    Line 260: this.say(`Skill ${skill}`);
    Line 261: return skill;
    ---
    `/src/engine/combat/combo-list.ts`:
    Line 180: rows.push({
    Line 181:   id: `stub_${key.toLowerCase()}`,
    Line 182:   name: `${key} key sets`,
    Line 183:   keys: sets.join(', '),
    Line 184:   sentence: 'These key sets are read and named on screen, but no move is behind them yet.',
    Line 185:   tag: NOT_YET,
    Line 186:   section: SECTION_NOT_YET,
    Line 187:   stub: true,

--------------------------------------------------------------------------------
1.4 ENEMY AI — Status: PARTIAL (1 Real Fixed-Cycle Boss Automaton; General NPC AI is Config Stub)
--------------------------------------------------------------------------------
* Files: `/src/engine/combat/sentinel.ts` (lines 11–177) & `/src/engine/studioConfig.ts` (lines 993–1049)
* What is real:
  - `HollowSentinel` at `(0, 0, -10)` runs a deterministic `4.2s` state machine:
    `2.5s` idle -> `1.4s` telegraph (locks `this._aim` vector toward `playerPosition` during the
    first 5% of wind-up, lines 74–84) -> `0.30s` active Focus Beam firing (`26.0m` length,
    `2.2m` width, `18.0` damage, OBB/line-corridor hit check in `hitsPlayer`, lines 96–112).
  - Takes hits (`120.0` max HP), collapses (`y = -0.8`, `/src/engine/engine.ts` line 504) for
    `4.0s` when defeated, and revives at full health (`/src/engine/combat/sentinel.ts`, lines 47–57).
* What is stub:
  - Pathfinding/navigation is not built (`position` is static at `(0, 0, -10)`).
  - The 5 friendly NPCs in `INITIAL_CUSTOM_NPCS` (`/src/engine/studioConfig.ts`, lines 993–1049)
    render only as static glowing monolith boxes (`npc-beacon`) with no AI update tick.
* Quoted proof (`/src/engine/combat/sentinel.ts`, lines 59–93):
    Line 59: this._t = (this._t + delta) % HollowSentinel.CYCLE;
    Line 60: const telegraphStart =
    Line 61:   HollowSentinel.CYCLE - HollowSentinel.TELEGRAPH - HollowSentinel.ACTIVE; // 2.5s
    Line 62: const activeStart = HollowSentinel.CYCLE - HollowSentinel.ACTIVE; // 3.9s
    ...
    Line 74: if (windupProgress < 0.05) {
    Line 75:   const toPlayer = new Vec3(
    Line 76:     playerPosition.x - this.position.x,
    Line 77:     0.0,
    Line 78:     playerPosition.z - this.position.z
    Line 79:   );
    Line 80:   const len = toPlayer.length();
    Line 81:   if (len > 0.01) {
    Line 82:     this._aim = toPlayer.normalize();
    Line 83:   }
    Line 84: }

--------------------------------------------------------------------------------
1.5 PROJECTILES — Status: NOT BUILT (Instant Corridor Ray/Box Beam Only)
--------------------------------------------------------------------------------
* Files: `/src/engine/combat/sentinel.ts` (lines 96–112) & `/src/engine/engine.ts` (lines 676–704)
* Proof:
  - There is no projectile entity, velocity integration, or ballistic solver in `/src/engine/`.
  - The only ranged attack is the Sentinel's `Focus Beam`, which resolves instantaneously
    across a `26.0m x 2.2m` box corridor on the frame it fires (`hitsPlayer`, `/src/engine/combat/sentinel.ts`, lines 96–112).

--------------------------------------------------------------------------------
1.6 PARTICLES & VFX — Status: STUB (Timers Tracked in CombatManager, Never Drawn by Engine)
--------------------------------------------------------------------------------
* Files: `/src/engine/combat/combat-manager.ts` (lines 64–82, 139–148, 237–244, 304–315) & `/src/engine/engine.ts` (lines 62–63)
* What is stub:
  - There is no particle emitter or billboard system in `/src/engine/`.
  - `DreamEngine` creates `this.slashMesh` and `this.burstMesh` in its constructor
    (`/src/engine/engine.ts`, lines 62–63 & 123–124), and `CombatManager` pushes timed objects
    into `this.activeSlashArcs` and `this.activeBursts` (`/src/engine/combat/combat-manager.ts`,
    lines 64–82) and ages them every frame (lines 304–315).
  - However, `DreamEngine.stepFrame()` (`/src/engine/engine.ts`, lines 515–746) **never reads**
    `this.combat.activeSlashArcs`, `this.combat.activeBursts`, `this.slashMesh`, or `this.burstMesh`.
    They are never added to `items: RenderItem[]`.
* Quoted proof (`/src/engine/engine.ts`, lines 62–63, 123–124 & `/src/engine/combat/combat-manager.ts`, lines 63–75):
    `/src/engine/engine.ts`:
    Line 62: private slashMesh: MeshGeometry;
    Line 63: private burstMesh: MeshGeometry;
    Line 123: this.slashMesh = createMonolithGeometry(0.12, 0.25, 2.6);
    Line 124: this.burstMesh = createMonolithGeometry(4.0, 0.08, 4.0);
    (Neither `this.slashMesh` nor `this.burstMesh` appears anywhere else in `/src/engine/engine.ts`.)
    ---
    `/src/engine/combat/combat-manager.ts`:
    Line 63: // Visual effects queues for renderer
    Line 64: activeSlashArcs: Array<{ ... }> = [];
    Line 75: activeBursts: Array<{ ... }> = [];

--------------------------------------------------------------------------------
1.7 CAMERA — Status: REAL
--------------------------------------------------------------------------------
* File: `/src/engine/scene/camera.ts` (lines 10–108)
* What is real:
  - Extends `SceneNode`; computes perspective projection (`makePerspective`, line 59) and
    `viewMatrix`/`viewProjectionMatrix` (`makeLookAt`, lines 86 & 105).
  - Supports live toggling between `'third-person'`spherical orbit (`distance = 5.0`,
    `yaw`, `pitch` clamped to `[-0.6, 1.2]` in `/src/engine/controller/character-controller.ts` line 51)
    and `'first-person'` eye-height view (`updateOrbit`, lines 69–102).
  - No spring-arm camera-vs-wall raycast collision yet.
* Quoted proof (`/src/engine/scene/camera.ts`, lines 77–101):
    Line 77: if (this.viewMode === 'first-person') {
    Line 79:   this.position.set(this.target.x, this.target.y, this.target.z);
    ...
    Line 88: } else {
    Line 90:   const offsetX = this.distance * cosPitch * sinYaw;
    Line 91:   const offsetY = this.distance * sinPitch;
    Line 92:   const offsetZ = this.distance * cosPitch * cosYaw;
    Line 94:   this.position.set(this.target.x + offsetX, this.target.y + offsetY, this.target.z + offsetZ);
    Line 100:  this.updateView();
    Line 101: }

--------------------------------------------------------------------------------
1.8 RENDERER — Status: REAL (Dual WebGPU + WebGL2 Backend with Named Profile Fallbacks; Partial Luma Readback on WebGPU)
--------------------------------------------------------------------------------
* Files:
  - `/src/engine/renderer/engine-renderer.ts` (lines 15–193)
  - `/src/engine/renderer/webgpu-renderer.ts` (lines 13–568)
  - `/src/engine/renderer/webgl2-renderer.ts` (lines 13–466)
  - `/src/engine/renderer/render-profile.ts` (lines 10–168)
* What is real:
  - Zero-dependency `WebGPURenderer` (WGSL shader, `depth24plus`, 256B scene uniform buffer,
    per-object 128B uniform buffers, `WeakMap<MeshGeometry, CachedGPUMesh>`) with automatic
    init and draw-time crash failover to `WebGL2Renderer` (GLSL `#version 300 es`, VAO/VBO cache).
  - Procedural sky dome gradient, sun/moon disc, night stars (`hash`), ground grid, Lambertian
    diffuse, hemisphere ambient, Blinn-Phong specular, Fresnel rim lighting, emissive glow,
    and exponential height/distance fog.
* What is partial / stub inside Renderer:
  - **Luma readback**: In `WebGL2Renderer.updateRealLuma()` (`/src/engine/renderer/webgl2-renderer.ts`,
    lines 351–376), it performs a real `gl.readPixels` on a `16x16` center patch. However, in
    `WebGPURenderer` (`/src/engine/renderer/webgpu-renderer.ts`, lines 319–322 & 551–557),
    `this.readbackBuffer` is allocated on the GPU, **never copied to or mapped**, and `readLuma()`
    returns a hardcoded constant (`0.48` for day, `0.12` for night)!
  - **RenderProfile flags**: `render-profile.ts` defines `clouds`, `key_shadows`, `haze_cards`,
    `light_shafts`, `mirror_layer`, and `emitter_halos` (lines 21–53), and `getActiveFallbacks`
    reports them in HUD metrics, but neither the WGSL nor GLSL shader implements clouds, shadow
    maps, haze cards, light shafts, mirror layers, or emitter halos (only `contact_darkening`
    is implemented, and only in the WebGL2 fragment shader at `/src/engine/renderer/webgl2-renderer.ts`, lines 138–145).
* Quoted proof (`/src/engine/renderer/webgpu-renderer.ts`, lines 551–557 & `/src/engine/renderer/webgl2-renderer.ts`, lines 363–372):
    `/src/engine/renderer/webgpu-renderer.ts`:
    Line 551: // Update estimated luma based on profile
    Line 552: this.lastLuma = profile.world === 'day' ? 0.48 : 0.12;
    Line 553: }
    Line 555: readLuma(): number {
    Line 556:   return this.lastLuma;
    Line 557: }
    ---
    `/src/engine/renderer/webgl2-renderer.ts`:
    Line 363: gl.readPixels(startX, startY, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    Line 366: for (let i = 0; i < pixels.length; i += 4) {
    Line 370:   totalLuma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    Line 371: }
    Line 372: this.lastLuma = totalLuma / count;

--------------------------------------------------------------------------------
1.9 AUDIO — Status: REAL (Procedural Ambient Drone Synth Only; SFX/Spatial Audio Not Built)
--------------------------------------------------------------------------------
* File: `/src/engine/audio/ambient-synth.ts` (lines 8–193)
* What is real:
  - Pure Web Audio API synthesizer generating a 4-second looping Paul Kellet pink-noise buffer
    (lines 45–59) through a lowpass `BiquadFilterNode` (lines 61–64) plus a `55Hz` sine sub-bass
    `OscillatorNode` (lines 77–85) and a 64-bin `AnalyserNode` (lines 39–42).
  - Transitions filter cutoff and sub-bass frequency smoothly (`setTargetAtTime`) on day/night
    mode switches (`setMode`, lines 125–137) and 4 atmosphere presets (`setAtmospherePreset`, lines 139–162).
* What is not built:
  - No combat sound effects (swings, hits, beam, dash), no spatial 3D `PannerNode`, and no audio asset loader.
* Quoted proof (`/src/engine/audio/ambient-synth.ts`, lines 48–59 & 125–136):
    Line 48: let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    Line 49: for (let i = 0; i < bufferSize; i++) {
    Line 50:   const white = Math.random() * 2 - 1;
    Line 51:   b0 = 0.99886 * b0 + white * 0.0555179;
    ...
    Line 57:   output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
    Line 59: }
    Line 125: setMode(mode: 'day' | 'night'): void {
    Line 130:   this.filterNode.frequency.setTargetAtTime(380, now, 1.2);
    Line 131:   this.subOsc.frequency.setTargetAtTime(55, now, 1.2);

--------------------------------------------------------------------------------
1.10 BONUS INVENTORY: ECS & SCENE FORMAT CONTRACTS — Status: DISCONNECTED STUBS
--------------------------------------------------------------------------------
Two foundational modules exist in `/src/engine/` that are tested in unit tests
but **never imported or used** by `DreamEngine` (`/src/engine/engine.ts`):
1. **ECS (`/src/engine/ecs/entity.ts` lines 1–93, `/src/engine/ecs/components.ts` lines 1–55)**:
   Implements `Entity`, `World`, and component interfaces (`Transform`, `MeshRenderer`,
   `CharacterController`, `Light`), but `DreamEngine` hardcodes `SceneNode` fields instead of
   using `ecs/World`.
2. **Scene Format Contract (`/src/engine/contracts/scene-format.ts` lines 1–80)**:
   Defines `DreamSceneDocument` (`formatVersion: '0.1.0'`), `serializeScene`, `parseScene`,
   and `instantiateSceneObjects`, but `DreamEngine` never calls it; instead it loops over
   `this.studio.entities` (`/src/engine/engine.ts`, lines 723–745) and allocates a throwaway
   `new SceneNode(ent.id)` on every single frame (line 725).


================================================================================
2. THE EDITOR'S AGENT CONTRACT (AI-FIRST, HUMAN-VIEW SECONDARY)
================================================================================

Today's codebase has three competing, incompatible ways of naming objects:
1. Random ephemeral IDs in `/src/engine/scene/node.ts` (line 26):
     this.id = id || Math.random().toString(36).substring(2, 9);
2. Timestamp-random IDs in `/src/engine/studioConfig.ts` (line 1087):
     id: entity.id || `entity-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
3. Domain-prefixed strings in `/src/engine/contracts/world-event.ts` (line 124):
     [`player:${playerId}`, `npc:${bossId}`, `encounter:${encounterId}`]

To make AI agents the primary operators of DREAM Maker across concurrent sessions,
the editor contract must unify `/src/engine/contracts/scene-format.ts`,
`/src/engine/contracts/world-event.ts`, and `/src/engine/engine.ts` around four
strict primitives: **ADDRESS**, **READ**, **MUTATE**, and **VERIFY**.

--------------------------------------------------------------------------------
2.1 ADDRESS — Rename-Proof, Concurrent-Safe Identity
--------------------------------------------------------------------------------
Every world object has a split identity: an **Immutable Content/ULID URI (`uid`)**
and a **Mutable Human/Semantic Alias (`alias`)**.

* Canonical Address Grammar:
    dream://<zone_id>/<kind>/<ulid>
  Examples:
    dream://first-gate/npc/01J8Z9K4M2P3Q4R5S6T7U8V9W0
    dream://first-gate/prop/01J8Z9K5A1B2C3D4E5F6G7H8J9
    dream://first-gate/quest/01J8Z9K6X9Y8Z7W6V5U4T3S2R1

* How it survives renames:
  - `name` (`"First Gate East Obelisk"`) and `alias` (`"first-gate/obelisk-east"`) are
    mutable component properties stored in an alias table mapping `alias -> uid`.
  - All scene graph links (`parentUid`), quest targets (`targetUid`), dialogue triggers,
    and `WorldEventEnvelope.involvedEntityIds` (`/src/engine/contracts/world-event.ts`, line 28)
    store the immutable `uid`, never the display `name`.
  - When Agent A renames `"Hollow Sentinel"` to `"Ash Sentinel"`, `uid` does not change;
    an alias history array `previousAliases: string[]` is retained on the entity so another
    agent holding a stale alias from an earlier prompt resolves transparently to the same `uid`.

* How it survives concurrent edits by multiple agents:
  - Client/Agent-generated ULIDs (128-bit: 48-bit millisecond timestamp + 80-bit CSPRNG)
    guarantee zero ID collision when Claude and Gemini spawn entities simultaneously without
    a central lock.
  - Every entity carries a monotonically increasing integer `revision: number` and a
    per-component Lamport timestamp (`updatedAtRev: Record<ComponentName, number>`).

--------------------------------------------------------------------------------
2.2 READ — Token-Bounded, Diffable Text State for Agent Reasoning
--------------------------------------------------------------------------------
Agents cannot reason over raw `Float32Array` vertex buffers or 10,000-line monolithic JSON dumps.
`READ` is exposed as a deterministic, queryable JSONL / NDJSON projection over HTTP/MCP
(`GET /api/maker/world`):

1. **L0 Zone Manifest (`?depth=manifest`)**:
   Returns one line per entity with `uid`, `revision`, `kind`, `alias`, quantized transform
   `pos: [x,y,z]` (rounded to `0.01m`), `boundsAabb: [[minX,minY,minZ],[maxX,maxY,maxZ]]`,
   and component list.
2. **L1 Spatial & Semantic Query (`?zone=first-gate&within=0,0,-10,25&kinds=npc,prop`)**:
   Returns full component JSON only for entities matching a bounding sphere/AABB, tag, or
   dependency graph (e.g., all entities referenced by `quest:01J8...`), plus computed spatial
   relationships (`distanceToPlayer`, `groundClearanceY`, `occludedBy`).
3. **L2 Causal Delta Read (`?sinceRev=42`)**:
   Returns only entities mutated since revision 42 plus the slice of `EventLog.toJSONL()`
   (`/src/engine/combat/event-log.ts`, lines 29–31) emitted since that revision.

--------------------------------------------------------------------------------
2.3 MUTATE — Transactional, CAS-Guarded Operation Set
--------------------------------------------------------------------------------
Instead of overwriting whole files, agents submit atomic **Transaction Envelopes**
(`POST /api/maker/mutate`) containing an ordered array of typed operations with
Compare-And-Swap (`baseRevision`) preconditions:

    interface MakerTransaction {
      txId: string;
      agentId: string;           // e.g. "claude-sonnet-4" | "gemini-4-argon"
      zoneId: string;            // e.g. "first-gate"
      baseRevision: number;      // Fails with 409 CONFLICT if modified on overlapping fields
      operations: MakerOp[];
      verificationPlan: VerificationSpec; // Mandatory — see 2.4 VERIFY
    }

The concrete `MakerOp` operation set covering **Level, NPC, Item, and Quest**:

* **LEVEL Ops**:
  - `entity.spawn`: `{ uid, kind: 'prop'|'zone_trigger'|'spawn_point'|'light', alias, transform: { pos, rotEulerDeg, scale }, mesh: { primitive: 'monolith'|'box'|'capsule'|'ground', dims: [w,h,d] }, material: MaterialProperties, collider: 'aabb'|'capsule'|'none' }`
  - `entity.patch_transform`: `{ uid, ifRevision, pos?, rotEulerDeg?, scale?, snapToGround?: boolean }`
  - `entity.patch_material`: `{ uid, ifRevision, baseColor?, roughness?, metallic?, emissive?, emissiveIntensity?, rimIntensity? }`
  - `entity.reparent`: `{ uid, parentUid }`
  - `entity.delete`: `{ uid, ifRevision }`
  - `env.set_profile`: `{ worldMode: 'day'|'night', patch: Partial<RenderProfileData> }` (maps directly to `/src/engine/renderer/render-profile.ts`, lines 10–53)
* **NPC Ops**:
  - `npc.upsert`: `{ uid, alias, displayName, tier: 'T0'|'T1'|'T2'|'T3', spawnPos: [x,y,z], capsule: [radius, height], combatProfile?: { healthMax, cycleSec, telegraphSec, activeSec, attackShape: 'corridor'|'arc'|'radial', range, widthOrArc, damage }, dialogueDoctrine?: { greeting, systemPrompt, voicePreset } }` (generalizes `HollowSentinel` in `/src/engine/combat/sentinel.ts` lines 11–22 and `CustomNpcProfile` in `/src/engine/studioConfig.ts` lines 908–918)
* **ITEM Ops**:
  - `item.define`: `{ uid, alias, displayName, slot: 'weapon'|'armor'|'consumable'|'key_item', statMods: Record<string, number>, skillOverride?: { triggerKeys: string, startupSec, activeSec, recoverySec, cooldownSec, staminaCost, damage, reach, halfArc }, visualAttach?: { boneOrNode: string, boxDims: [w,h,d], material: MaterialProperties } }`
* **QUEST Ops**:
  - `quest.upsert`: `{ uid, alias, title, stages: Array<{ stageId: string, description: string, completionPredicates: Array<{ matchEventName: string, matchInvolvedUids: string[], minCount: number, payloadFilter?: Record<string, unknown> }>, onCompleteOps: MakerOp[] }>, rewards: { itemUids: string[], needsLedgerGrant?: number } }`
  (Note how `completionPredicates` bind directly to the existing `WorldEventEnvelope` contract in `/src/engine/contracts/world-event.ts`, lines 21–33!)

--------------------------------------------------------------------------------
2.4 VERIFY — Zero-Human Proof of Effect (The Hardest Requirement)
--------------------------------------------------------------------------------
A design where `POST /api/maker/mutate` returns `{ ok: true }` because JSON was parsed
into an array is a **failed design**. (We already see why in `/src/engine/engine.ts`
lines 62–63 and `/src/engine/combat/combat-manager.ts` lines 64–82: `activeSlashArcs`
and `activeBursts` mutate state arrays cleanly, yet zero triangles are ever drawn for
them, and `WebGPURenderer.readLuma()` at `/src/engine/renderer/webgpu-renderer.ts`
line 552 returns a fake hardcoded number `0.48`!)

DREAM Engine already contains the seed of the right answer in `DreamEngine.runProofSequence()`
(`/src/engine/engine.ts`, lines 252–383), which steps `this.stepFrame(1 / 120)` deterministically
and asserts against `this.combat.eventLog` and `readLuma()`.

To make **VERIFY** mandatory and cheat-proof for every agent mutation, every transaction
executes a **4-Gate Automated Verification Pipeline** before a mutation is committed:

1. **GATE 1: Referential & Spatial Invariant Gate (Static AST/Physics Check, <5ms)**
   - Verifies zero dangling `uid` references across `parentUid`, `quest.stages.matchInvolvedUids`,
     and item attachments.
   - Computes world matrices (`sceneRoot.updateWorldMatrix()`, `/src/engine/scene/node.ts` line 56)
     and AABBs (`/src/engine/math/collision.ts` lines 37–61): rejects unintended collider
     interpenetration (e.g. spawning an NPC inside a monolith AABB or below `groundY = 0`)
     unless `allowOverlap: true` is explicit.

2. **GATE 2: Deterministic Headless Fixed-Step Simulation Receipt (Behavioral Proof, 120Hz)**
   - Extracts `DreamEngine.stepFrame(dt)` into a pure, deterministic simulation kernel
     (`stepSimulation(state, inputs, dt = 1/120)`) that runs both in the browser and in Node/Worker.
   - Every `MakerTransaction` includes a `verificationPlan.script`: a timed sequence of synthetic
     inputs or assertions (just like `runProofSequence()` at `/src/engine/engine.ts` lines 273–377):
     - For a **Level change** (e.g., adding a jump pad or monolith wall): spawns a test capsule,
       steps 240 ticks (`2.0s`) walking toward the object, and asserts the resulting `position`
       and collision event in `EventLog`.
     - For an **NPC / Combat / Item change**: runs a 120Hz combat micro-sim and asserts that the
       expected `WorldEventEnvelope` (`player.hit_landed`, `sentinel.beam_fired`, `player.perfect_dodge`)
       was appended to `EventLog` (`/src/engine/combat/event-log.ts`, lines 11–19) with the exact
       expected `damage` and `healthRemaining`.
     - For a **Quest change**: replays synthetic `WorldEventEnvelope` items into the quest state
       machine and asserts that every stage transitions from `stage_0 -> completed` with no deadlocks.

3. **GATE 3: GPU Framebuffer & Occlusion Readback Receipt (Visual Proof, Zero-Human)**
   - Fixes `WebGPURenderer.readLuma()` (`/src/engine/renderer/webgpu-renderer.ts`, line 319) to
     actually execute `commandEncoder.copyTextureToBuffer(...)` into `this.readbackBuffer` and
     `await this.readbackBuffer.mapAsync(GPUMapMode.READ)`.
   - Renders an offscreen/verification frame From a canonical camera pose looking at the mutated
     `uid`'s world AABB center and produces a **Visual Receipt**:
     - **Object ID / Stencil Hit Count**: Renders a fast ID pass (or raycast grid) confirming
       how many pixels of `uid` are actually visible on screen (proving the object has non-zero
       triangles in `items: RenderItem[]`, is inside the frustum, has scale > 0, and is not buried
       inside another mesh). If an agent adds a VFX or prop that isn't pushed to `items[]` (like
       the current `slashMesh` bug), `visiblePixelCount === 0` fails Gate 3 immediately!
     - **8x8 Patch Luma + RGB Histogram Hash**: Computes actual framebuffer luma/color statistics
       inside the entity's projected screen bounding box before and after the mutation, proving
       shader/material/lighting mutations visibly changed rendered pixels.

4. **GATE 4: Signed Verification Receipt Returned to Agent**
   - The agent never gets a bare `{ status: "ok" }`. It receives a structured `VerificationReceipt`
     containing:
     `{ committedRevision, worldStateHash, spatialChecksPassed, simTicksRun, emittedWorldEvents: WorldEventEnvelope[], renderReceipt: { drawCallsDelta, trianglesDelta, targetVisiblePixels, bboxLumaBefore, bboxLumaAfter }, rollbackTriggered: boolean }`.
   - If any assertion in Gate 1, 2, or 3 fails, the engine automatically rolls back to
     `baseRevision` and returns the exact assertion failure diff.


================================================================================
3. WHAT THIS MAKES POSSIBLE THAT UNREAL CANNOT
================================================================================

1. **Multi-Agent Git Branching & Line-Level 3-Way Merge of Live Levels and Quests**
   - **What Unreal Prevents**: Unreal stores levels (`.umap`) and Blueprints/Quests (`.uasset`)
     as opaque binary serialization blobs with internal byte offsets and export tables. Even with
     Unreal's "One File Per Actor" (OFPA), each actor file is still a binary `.uasset` that cannot
     be read in an LLM context window or merged line-by-line by `git merge` when two agents edit
     different properties of the same actor or quest graph.
   - **What DREAM Engine Enables**: Because `DreamSceneDocument` (`/src/engine/contracts/scene-format.ts`,
     lines 25–33) and the Agent Contract store every entity, NPC combat window, and quest predicate
     as deterministic, canonicalized JSON/JSONL keyed by ULID, Claude on branch `feat/combat-tuning`
     can modify an NPC's `telegraphSec` while Gemini on branch `feat/night-lighting` modifies the
     same NPC's `material.emissiveIntensity`, and standard `git merge` cleanly merges both changes
     with zero binary lock contention and zero Unreal Editor process required.

2. **Sub-Second CI/CD Gameplay & Frame-Data Verification in Headless Linux Containers**
   - **What Unreal Prevents**: Unreal's editor-first architecture tightly couples asset compilation,
     Blueprint VM execution, and level validation to a multi-gigabyte Editor binary and DDC
     (Derived Data Cache). Running automated gameplay verification on every agent commit requires
     spinning up heavy GPU build nodes and waiting minutes for asset cooking.
   - **What DREAM Engine Enables**: Because `/src/engine/` is pure zero-dependency TypeScript
     where the simulation loop (`stepFrame(dt)`, `/src/engine/engine.ts` line 486) and combat
     timing windows (`/src/engine/contracts/combat-windows.ts` lines 28–93) run in plain V8 memory,
     an agent can run a 10-second 120Hz combat & quest verification proof (`1,200` frames of
     `runProofSequence`, `/src/engine/engine.ts` lines 252–383) in **under 15 milliseconds** inside
     a lightweight Node process or browser worker on every single mutation before committing it.

3. **Runtime Live-World Mutation by Co-GM Agents in Production Without Asset Cooking or Client Patching**
   - **What Unreal Prevents**: A GUI-first editor with cooked binary `.pak` archives (`pak-unreal-legacy`
     referenced in `/src/engine/studioConfig.ts` line 852) compiles editor graphs into platform-specific
     cooked packages prior to deployment. An AI Game Master cannot invent a new boss mechanic,
     alter a level's geometry layout, or wire a new event-driven quest stage in a live MMO shard
     and have players render it 100ms later without a `.pak` cook and client download.
   - **What DREAM Engine Enables**: Because geometry is procedural/parametric (`createMonolithGeometry`,
     `createCapsuleGeometry`, `createBoxGeometry` in `/src/engine/scene/mesh.ts` lines 48–387) and
     scene/quest contracts are plain JSON transactions interpreted directly by the client runtime,
     a Co-GM agent can submit a `MakerTransaction` that passes the 4-Gate Verification Pipeline and
     streams as a 2KB JSON delta over WebSocket to connected browsers, mutating the live 3D world
     in a single frame without ever restarting or patching the client.


================================================================================
4. THE FIRST SLICE (SMALLEST DEMONSTRABLE PIECE FOR A BACKER)
================================================================================

* **Name of the First Slice**:
  **"Closed-Loop Agent Arena Mutator (`?proof=agent`)"** — Live Text-to-Level-and-Boss
  Mutation with Deterministic 120Hz Combat & Pixel Readback Proof.

* **What It Does (The Backer Demo)**:
  A backer (or Co-GM agent) types or dispatches a single structured mutation command (or
  natural-language prompt compiled to a `MakerTransaction`) in the browser—for example:
  *"Spawn two obsidian cover pillars at `[-4, 0, -6]` and `[4, 0, -6]`, shorten the Hollow
  Sentinel's Focus Beam telegraph from `1.4s` to `0.9s`, and prove the encounter is still
  dodgeable."*
  On screen, with zero human touching WASD:
  1. The transaction applies to the canonical `DreamSceneDocument` using ULID addresses.
  2. The engine runs a fast-forward 120Hz deterministic simulation + real GPU pixel readback
     verification pass, confirming the pillars rendered (`visiblePixels > 0`) and the test
     agent executed a `player.perfect_dodge` at the new `0.9s` timing window (`perfectDodgeDamage === 0`).
  3. A green cryptographic **Verification Receipt** card pops up showing the exact `WorldEventEnvelope`
     log, triangle/draw-call delta, and before/after pixel luma, and the live 3D scene hot-swaps
     in place so the backer can immediately click into the canvas and fight the modified Sentinel.

* **What It Needs (Concrete Code Changes Required)**:
  1. Wire `/src/engine/contracts/scene-format.ts` (`DreamSceneDocument`) into `/src/engine/engine.ts`
     as the single source of truth for scene nodes (replacing the per-frame `new SceneNode(ent.id)`
     allocation loop at `/src/engine/engine.ts` lines 723–745).
  2. Implement `ADDRESS` (ULID + alias map), `READ` (`engine.exportWorldStateJSONL()`), and
     `MUTATE` (`engine.applyTransaction(tx)`) covering `entity.spawn`, `entity.patch_transform`,
     `entity.patch_material`, and `sentinel.patch_timing`.
  3. Fix `WebGPURenderer.readLuma()` (`/src/engine/renderer/webgpu-renderer.ts` lines 319 & 551–557)
     so `readbackBuffer` performs a real async GPU texture-to-buffer copy, and fix `DreamEngine.stepFrame`
     so `activeSlashArcs` and `activeBursts` actually push `slashMesh` and `burstMesh` into `items: RenderItem[]`.
  4. Generalize `runProofSequence()` (`/src/engine/engine.ts` lines 252–383) into a reusable
     `verifyTransaction(tx)` runner that returns a `VerificationReceipt` JSON object and rolls
     back `DreamSceneDocument` if any spatial, simulation, or luma check fails.

* **What It Does NOT Need Yet**:
  - Does NOT need a multi-track timeline GUI, gizmo transform handles, or node-graph visual editor.
  - Does NOT need glTF/FBX binary mesh importing or skeletal animation skinning.
  - Does NOT need WebRTC/WebSocket multiplayer state replication across multiple players.
  - Does NOT need full quest dialogue trees or inventory UI—just Level Props + Sentinel Combat
    Parameters + the 4-Gate Verification Receipt.


================================================================================
5. BROWSER CONSTRAINTS (AND WHAT CHANGED IN THE DESIGN BECAUSE OF THEM)
================================================================================

Running DREAM Engine and DREAM Maker inside a player's browser on WebGPU/WebGL2 imposes
four hard platform constraints visible in the codebase today:

1. **Async-Only GPU Readback on WebGPU (`mapAsync`) vs. Synchronous Main-Thread Stall (`gl.readPixels`)**
   - **The Constraint**: In `/src/engine/renderer/webgl2-renderer.ts` (line 363), `gl.readPixels`
     synchronously stalls the GPU pipeline on every frame. In WebGPU (`/src/engine/renderer/webgpu-renderer.ts`,
     line 319), synchronous CPU readback of a `GPUTexture` does not exist in the WebGPU spec—you
     must encode `copyTextureToBuffer` (with `bytesPerRow` padded to a multiple of `256` bytes)
     and `await buffer.mapAsync(GPUMapMode.READ)`. That is why the original author left
     `WebGPURenderer.readLuma()` stubbed at `0.48 / 0.12` (line 552).
   - **What Changed in the Design**:
     - We **never** read back pixels on every 60Hz render frame.
     - Instead, **VERIFY Gate 3** triggers an on-demand asynchronous `captureVerificationSample()`
       only on the commit frame of an agent `MakerTransaction` (or once per second for telemetry),
       copying a single `64x64` downsampled target (`bytesPerRow = 256` bytes, matching WebGPU's
       mandatory 256-byte row alignment) and resolving the `VerificationReceipt` promise asynchronously
       without stalling the 60fps render loop.

2. **Main-Thread Frame Budget (16.6ms) & Web Worker Structured-Clone Overhead**
   - **The Constraint**: Browser JS runs on a single main UI thread unless offloaded to Web Workers,
     and `SharedArrayBuffer` requires strict `Cross-Origin-Opener-Policy: same-origin` (COOP) and
     `Cross-Origin-Embedder-Policy: require-corp` (COEP) headers (which often break third-party
     checkout/ad iframes or preview environments). Furthermore, `/src/engine/engine.ts` (lines 723–745)
     currently allocates `new SceneNode(ent.id)` on the heap every single frame, inviting GC pauses.
   - **What Changed in the Design**:
     - The deterministic simulation kernel (`stepSimulation` for **VERIFY Gate 2**) is decoupled
       from `HTMLCanvasElement` and DOM APIs so a 1,200-step (10-second) combat verification proof
       runs inside a dedicated **Verification Web Worker** using plain transferable `ArrayBuffer`
       snapshots (requiring zero `SharedArrayBuffer` COOP/COEP headers) in `<15ms` while the main
       thread keeps rendering at 60fps.
     - Persistent `SceneNode` instances are cached in a `Map<uid, SceneNode>` mutated only when
       `applyTransaction` increments `revision`, eliminating per-frame heap allocations in `stepFrame()`.

3. **Browser Memory Ceilings (ArrayBuffer / GPU Device Allocation Limits) & Zero-Pak Streaming**
   - **The Constraint**: Browser tabs face strict V8 heap limits (~2–4 GB) and WebGPU buffer ceilings
     (`maxBufferSize` defaults to 256MB on many adapters). Furthermore, `/src/engine/renderer/webgpu-renderer.ts`
     (lines 400–417) currently allocates a separate 128-byte `GPUBuffer` and `GPUBindGroup` per render
     item in `this.objectBuffers[]` and never shrinks the array unless `dispose()` is called.
   - **What Changed in the Design**:
     - Level geometry in the Agent Contract uses parametric procedural primitives (`monolith`, `box`,
       `capsule`, `ground` in `/src/engine/scene/mesh.ts`) and instanced/dynamic uniform ring buffers
       (`minUniformBufferOffsetAlignment = 256`) rather than unique vertex buffers per prop, keeping
       an entire zone's scene definition under 100KB of JSON and <16MB of VRAM.

4. **WebGPU Feature Variance & Context Loss Across Consumer Devices**
   - **The Constraint**: Not all player browsers or GPUs support WebGPU, optional features like
     `timestamp-query` or float32 filterable textures vary by OS/driver, and WebGPU devices can emit
     `uncapturederror` or `device.lost` at any moment. The engine already handles init and render-time
     failover to WebGL2 in `/src/engine/renderer/engine-renderer.ts` (lines 46–76 & 133–148) and
     defines named platform fallbacks in `/src/engine/renderer/render-profile.ts` (lines 55–61).
   - **What Changed in the Design**:
     - **VERIFY Gate 2 (Simulation)** and **VERIFY Gate 1 (Spatial/AABB)** are 100% backend-agnostic
       CPU math, so deterministic gameplay proofs produce identical results whether the client is on
       WebGPU, WebGL2, or a headless CI runner.
     - **VERIFY Gate 3 (Visual Receipt)** normalizes pixel assertions to relative luma deltas
       (`bboxLumaAfter - bboxLumaBefore > threshold`) and backend-independent bounding-box occupancy
       rather than brittle exact byte-for-byte PNG hashes that would fail between Dawn (Chrome),
       wgpu (Firefox), WebKit (Safari), and the WebGL2 fallback renderer.


================================================================================
6. WHAT COULD NOT BE DETERMINED FROM THE PROJECT FILES
================================================================================

1. **External Godot `DreamSlice` & Markdown Spec Files Referenced in File Headers**:
   Multiple files in `/src/engine/` cite external files in their top comments that do **not**
   exist in this repository:
   - `docs/gdd/02-action-combat.md` (cited in `/src/engine/combat/combat-manager.ts` line 5,
     `dash-state.ts` line 3, `sentinel.ts` line 3)
   - `docs/tech/data-contracts.md` and `specs/001-world-bus-cross-eyed-slice` (cited in
     `/src/engine/contracts/world-event.ts` line 3 and `/src/engine/combat/event-log.ts` line 3)
   - `game/godot/DreamSlice/scripts/render_profile.gd`, `player.gd`, `dummy.gd`, `combo.gd`,
     `combo_list.gd` (cited in `/src/engine/renderer/render-profile.ts` line 3,
     `/src/engine/controller/character-controller.ts` line 24, `/src/engine/combat/sentinel.ts` line 3,
     `/src/engine/combat/combo.ts` line 3).
   None of `docs/`, `specs/`, or `game/godot/` are present in the workspace directory tree.
2. **Checkout / Payment & `dream-online.net` Deployment Infrastructure**:
   While the prompt notes DREAM Online is served from `dream-online.net` with its own checkout,
   there are no checkout, payment, or deployment config files for `dream-online.net` inside this
   workspace.
3. **Multiplayer / Network Transport Layer**:
   There are no WebSocket, WebRTC, or MMO state-synchronization files in `/src/engine/` or `/server.ts`
   yet; all combat and movement currently execute locally in the browser client.
