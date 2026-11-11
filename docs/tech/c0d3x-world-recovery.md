# C0D3X World Recovery and DreamOps Bridge

## Purpose

C0D3X is the in-world face of verified recovery, rollback, and world damage control. The player sees lore. The operators see tools, telemetry, and controlled repair actions.

Do not use real platform or legal names in-world. C0D3X is fiction. Internally, the system is DreamOps.

## Fiction Layer

- C0D3X rides MOLLMA / M0LLAMA, the reverse-proxy mount.
- C0D3X appears during world instability, event corruption, exploit cleanup, rollback moments, and verified repairs.
- C0D3X does not break immersion with developer language.
- C0D3X explains restored world state as lore, not as database maintenance.

## Operations Layer

DreamOps is the internal world-state bridge that lets authorized agents inspect and repair the game safely.

It should expose MCP-style tools or equivalent internal API tools for:

- World health snapshot.
- Active event list.
- Economy anomaly detection.
- NPC memory queue status.
- Player support incident lookup.
- Recent deploy/version state.
- Last known good checkpoint.
- Rollback dry run.
- Rollback execute with authorization.
- Hotfix proposal.
- Hotfix apply only after policy gates.

## Core Tools

| Tool | Purpose |
|---|---|
| `dream_world_health` | Returns current shard/server status, event status, latency, queue depth |
| `dream_event_list` | Shows active and scheduled world events |
| `dream_event_pause` | Pauses a broken event without taking down the world |
| `dream_economy_scan` | Detects currency/item inflation, dupes, impossible balances |
| `dream_memory_queue` | Shows NPC memory backlog and provider health |
| `dream_checkpoint_list` | Lists verified snapshots and last all-green state |
| `dream_rollback_plan` | Generates rollback plan without executing |
| `dream_rollback_execute` | Executes rollback only with authorization and audit logging |
| `dream_hotfix_propose` | Drafts server/data patch with risk analysis |
| `dream_hotfix_apply` | Applies approved hotfix and records evidence |

## Safety Rules

- No autonomous destructive rollback.
- No direct database write without audit record.
- No hidden economy repair.
- No player punishment without evidence trail.
- No AI-generated hotfix goes live without tests or explicit authorization.
- All repair actions create a lore-safe C0D3X event message and an internal audit event.

## Checkpoint Strategy

Snapshots are required for:

- Before every world event.
- Before every economy migration.
- Before any NPC memory schema change.
- Before patch deploy.
- Every scheduled maintenance window.

Each checkpoint records:

- Game server version.
- Schema version.
- Item/economy hash.
- NPC memory schema hash.
- Active event state.
- Migration list.
- Test status.

## World Event Damage Control

If an evolving AI world event goes bad:

1. Pause event.
2. Freeze affected economy routes if needed.
3. Snapshot current broken state for forensic review.
4. Identify last all-green checkpoint.
5. Run rollback dry run.
6. Apply minimal repair if safe, full rollback if not.
7. Publish in-world C0D3X lore event.
8. Record internal incident note.

## First Prototype

Do not build a full ops system first. Start with a local JSON/world-state bridge:

- `world_state.json`
- `events.json`
- `npc_memory_queue.json`
- `economy_snapshot.json`
- `checkpoints/`
- `audit.log`

Then wrap it with HTTP/MCP-style tools when the prototype server exists.

## Approved visual direction and implementation plan (2026-11-11)

CLAUDE's N Joshua's · #TeamClaudeForLife · Built with Google Gemini

Status: visual design and implementation plan for Claude review. Character assets, animation, and recovery integration are planned work.

### Creative decision

C0D3X is a quiet road-mender: an ivory hood over a shadowed face, a weathered charcoal long coat, practical leather equipment, and restrained amber repair seams. His silhouette is recognizable before any glow appears. His hands are open and useful; he feels patient, reassuring, and a little strange.

Mollama is a white llama mount and companion. White fleece, upright ears, dark eyes, sturdy legs, and a worn dark saddle distinguish her at ordinary gameplay distance. Warm fittings connect her visually to C0D3X without turning her into a glowing machine. She can stand beside him as well as carry him. Keep existing internal aliases compatible; this proposal does not rename saved entities.

Three approaches considered: a heavily armored sentinel would overlap the guards; a translucent apparition would lose readability in daylight; the road-mender has a clear physical silhouette in both lighting states. Choose the road-mender because recovery should feel dependable and present in the world.

Day: ivory fabric and fleece remain textured rather than clipped white, charcoal has visible folds, amber is a small material accent.
Night: preserve the same materials and silhouette with soft environmental rim light; amber seams become legible without flooding the scene with bloom. No strobe, full-screen flash, or endless recovery pulse.

Concept reference: “COD3X & Mollama: Day-to-Night Repair.” The design is recorded in the screenshot and description. The full-resolution image could not be retrieved from the interrupted chat; production assets remain to be created.

### Canon and existing integration

Preserve the established character responsibilities:

| Character | Responsibility |
| --- | --- |
| C0D3X and Mollama | Verified recovery and world-state integrity |
| Perplexed | Life-skill quests |
| Grox | Monster-kill story quests |
| Jewls | Accessories |
| Sup@ and Fable's Forge | Existing weapon and armor responsibilities |
| Muse | Patrols and guards |

Do not transfer another NPC's quest or shop role to C0D3X. Do not invent additional Sup@ dialogue.

Existing source: `src/game/economy/smith/petInteraction.ts`.
Preserve `evaluateFounderPetInteraction`, `TROLL_COD3X_MOLLAMA_LINE`, the supported target aliases, and the existing eight-meter proximity behavior. Preserve this exact founder-pet line:

> If you ever get stuck in reverse, knee-deep in code, I can put this thing in three-wheel drive and do a Trollz Pull Request.

Keep this founder-pet joke alongside the lore-safe recovery dialogue. Regression coverage already lives in `tests/fables-anvil-and-town-smith.test.ts`; extend that suite where relevant rather than inventing a second pet interaction system.

### What is implemented and what is proposed

Reviewed against main `3fd65b8fe68d541154542d7d9fb5f54b4ecba414`.

- Existing: founder-pet interaction evaluator and related test source.
- Existing: JSON-backed DreamOps routes in `game/server/dreamops-bridge/src/routes.js`, including inspection, event pause, rollback planning, and hotfix proposals.
- Existing rollback plan explicitly returns `mode: "dry-run-only"` and `destructiveExecutionAvailable: false`. A plan is not a restore.
- Proposed: final rider and llama assets, rigs, animation, gameplay placement, presentation event adapter, recovery dialogue, real checkpoint verification and authorized restore integration.
- Unverified: live node health, current rendered appearance, restore execution, performance, and end-to-end delivery. Source inspection is not runtime proof.

Recovery implementation follows the existing Safety Rules above.

### Build sequence

1. Inspect the current scene registration and codebase graph on the game node. Reuse the authoritative gameplay path and NPC registry. Integrate the encounter into the existing game scene and world state.
2. Produce original rider and llama meshes with separate rigs. Include rider idle, walk, inspect, kneel/repair, mount, ride, and dismount; llama idle, ear movement, walk, stop, and turn. Keep saddle contact and foot placement stable. Supply lower-detail meshes and a low-effects material variant; measure final budgets in the actual scene.
3. Place the pair in one representative encounter in the existing game scene. Use a shared navigation destination with collision-safe spacing; Mollama must not block the player, clip through C0D3X, or disappear during mount transitions.
4. Route pet proximity through the existing evaluator. Add a presentation cooldown so an ongoing encounter does not repeat the long joke every frame. Do not change the evaluator's established output contract.
5. Add a read-only presentation adapter consuming authoritative recovery events. It controls animation and lore messages only. Dialogue and model responses cannot execute tools, mutate saves, grant items, repair the economy, or authorize recovery.
6. Build and verify checkpoint/restore infrastructure separately before connecting any “restored” presentation state. Have Claude judge the evidence and merge through the normal PR lane.

### Recovery presentation contract

The following states and event fields are proposed, not existing API claims.

- Observing: ordinary idle; no claim that a fault or restore occurred.
- Incident confirmed: approach and inspect only after the server identifies an affected event or area.
- Repair planned: quiet kneeling/inspection, with no success cue while approval or execution remains pending.
- Repair applied, verification pending: hold a neutral working pose; no completed-repair message.
- Restore verified: one restrained amber seam closes, Mollama relaxes, then return to ordinary idle.
- Failed or unavailable: stop the success animation and use an honest lore-safe failure line.

Candidate lines: “Let me check the road.” / “The seam is holding.” / “This road is not ready yet.”
Only the verified state may use the second line. These lines are proposed character dialogue.

Each authoritative event needs incident ID, unique event ID, shard/area scope, ordered revision, timestamp, checkpoint reference where relevant, and verification outcome. Reject duplicate, stale, out-of-order, and wrong-shard events. On reconnect, reconcile against current server state instead of replaying old success effects. Animation failure must never block or alter an operator action.

### Real recovery proof

A checkpoint is eligible only after schema compatibility, content hashes, game version, event state, economy/item invariants, and NPC memory compatibility are checked. Preserve an incident snapshot and an audit trail. Hash agreement alone is insufficient to prove a playable world.

Before a future executor can run: authenticate the operator, authorize the exact incident and checkpoint, make the dry run reviewable, define concurrent-write handling and post-checkpoint player progress treatment, and prove idempotency. Never silently erase legitimate progress or duplicate rewards.

Required isolated exercise: create a known-good world fixture, introduce a deliberate fault, reject an incompatible or tampered checkpoint, restore the eligible checkpoint with authorization, restart/reload, and compare the persistent result and gameplay invariants. Then inject failure during restore and prove recovery leaves a consistent state. Only a successful verification result can emit the success event.

### Acceptance scenarios

1. Given daylight and night lighting, the player recognizes the same rider and white llama without relying on bloom. Capture front, rear, side, and ordinary gameplay distance in both lighting states.
2. Given TrollinlootNScoot within the existing interaction radius of either supported NPC target, the original exact line is preserved. Out-of-range and unrelated-pet behavior remains unchanged; repeated frames do not spam presentation.
3. Given a planned or failed repair, no “restored” cue appears. Given a verified recovery event, the cue runs once. Replayed or wrong-shard events produce no duplicate cue.
4. Given untrusted NPC dialogue, no mutation or operator tool is reachable from the dialogue path.
5. Given an authorized restore in an isolated test, persistent state and gameplay invariants pass after restart. Tampering, stale schemas, repeated execution, and interrupted writes fail safely.
6. Given reduced-motion settings or the low-effects profile, the pair remains readable with a static success pose and plain text; status never depends on color alone.

### Delivery evidence and handoff

For implementation PRs: run the relevant pet and recovery tests, typecheck, and required repository suites. Record actual commands and failures. Include unbroken gameplay capture, day/night screenshots, mount and pet interaction footage, measured performance on ordinary hardware, and the recovery exercise audit with secrets excluded. Use gameplay captures to verify the implementation.

Validation for this documentation change: inspected the pet evaluator and DreamOps route source. Runtime tests and visual checks apply to the implementation PRs.

Next: Claude reviews the proposal; implementation follows the acceptance scenarios.
