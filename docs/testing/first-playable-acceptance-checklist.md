# First Playable Acceptance Checklist

Purpose: give Codex, Claude, and Joshua a pass/fail gate for the first playable slice before scope expands.

This checklist covers the smallest proof of Dream ONLINE:

- Movement that feels responsive.
- One starter enemy.
- One gathering node.
- One NPC guide response.
- One world event.
- Local persistence for the player, NPC memory, and world event log.

## Test Setup

Pass conditions:

- `DREAM_ROOT` resolves to the repo root.
- Live NPC Lab health endpoint responds locally.
- DreamOps Bridge health endpoint responds locally.
- Test data uses mock or local providers only.
- No secrets, provider tokens, or classified material are required.
- The run can be repeated from a clean local state with documented seed data.

Fail conditions:

- The test depends on paid calls, real player accounts, private vault material, or external deployment.
- A pass requires manual edits to hidden local files.
- Logs include secrets, private chat exports, or unrelated business/accounting material.

## Movement

Pass conditions:

- Player can move forward, backward, left, and right.
- Camera control does not block movement.
- Sprint starts and stops reliably.
- Dodge or emergency movement has a visible stamina cost.
- Collision prevents walking through obvious blockers.
- Movement state can be logged as `idle`, `moving`, `sprinting`, or `evading`.

Fail conditions:

- Input drops often enough to break a 60-second movement test.
- Sprint or dodge can be spammed without cost.
- The player can leave the intended test area without a clear boundary.
- Movement logs cannot identify the current player state.

## Starter Enemy

Pass conditions:

- One enemy can idle, notice the player, attack, take damage, stagger or react, reset, and be defeated.
- Enemy tells are readable before damage lands.
- Damage is gated by hit timing, range, and facing rules.
- Enemy reset returns it to a valid position and health state.
- Defeat emits a local event log entry.

Fail conditions:

- Enemy damage lands without a readable tell.
- Enemy attacks from invalid range or through solid blockers.
- Enemy reset creates duplicate enemies or corrupts health state.
- The player can win only by exploiting stuck AI.

## Gathering Node

Pass conditions:

- One node can be discovered, interacted with, harvested, and placed on cooldown.
- The node grants one resource item.
- Tool or action durability cost is recorded.
- A failed gather attempt gives clear feedback.
- Node state survives a local reload during the test window.

Fail conditions:

- The node can be harvested endlessly with no cooldown.
- The resource appears without a recorded interaction.
- Durability or action cost is skipped.
- Reloading loses the node state when persistence is expected.

## NPC Guide

Pass conditions:

- One guide NPC can greet the player in world-native language.
- The guide can explain the next nearby action: move, fight, gather, or watch the event.
- The reply can include only approved safe proposals: `suggest_hint`, `suggest_marker`, `suggest_event_pause`, or `suggest_quest_note`.
- The NPC can recall at least one prior player interaction from local memory.
- Unsafe or unsupported output falls back to a short in-world response.

Fail conditions:

- The guide executes commands instead of proposing game actions.
- The guide references direct competitors, private material, real payment benefit, or developer-only setup language.
- The guide forgets the prior test interaction after local memory is saved.
- A failed model/provider response blocks the whole playable test.

## World Event

Pass conditions:

- One event can move through `calm`, `active`, `recovering`, and `calm` again.
- The event has a visible player-facing change in the test area.
- The event logs start time, trigger, current state, player impact, and rollback note.
- The event can be paused or rolled back through a safe local operator path.
- NPC guide dialogue can mention the event after it starts.

Fail conditions:

- The event changes gameplay without a logged trigger.
- The event cannot return to a valid calm state.
- Rollback requires deleting files or editing private state by hand.
- NPC dialogue contradicts the event state.

## Persistence

Pass conditions:

- Player state persists: position or checkpoint, health, stamina, inventory, and last guide interaction.
- NPC memory persists: latest player interaction and safe suggested action.
- World event state persists: event id, state, timestamp, and rollback note.
- Persistence files are local, reviewable, and free of secrets.
- Restarting local services does not lose the accepted test state.

Fail conditions:

- Restarting local services resets accepted state without an intentional reset command.
- Persistence requires account credentials or external infrastructure.
- Logs contain secrets, private vault material, or raw unrelated chat exports.
- The persistence format is undocumented.

## Acceptance Summary

The first playable slice is accepted only when every required area has a pass:

| Area | Required Result |
| --- | --- |
| Test setup | Pass |
| Movement | Pass |
| Starter enemy | Pass |
| Gathering node | Pass |
| NPC guide | Pass |
| World event | Pass |
| Persistence | Pass |

Any fail blocks first playable acceptance. Fix the failed area, rerun only the impacted checks, then rerun the full acceptance pass before expanding scope.
