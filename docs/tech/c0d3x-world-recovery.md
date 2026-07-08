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
