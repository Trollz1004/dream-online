# First 15-Minute Player Journey

Purpose: define the first playable route from login to movement, first combat, first resource, and first NPC memory event.

This is a prototype journey, not a full launch tutorial. It should prove that the smallest Dream ONLINE loop is understandable, repeatable, and worth expanding.

## Player Promise

In the first 15 minutes, a new player should understand:

- The world is shared, physical, and navigated by landmarks instead of fast travel.
- Action combat depends on movement, stamina, timing, and readable enemy tells.
- Life skills matter immediately through one useful resource node.
- The guide NPC remembers a prior interaction and reacts to a world event.
- A local world event can change the test area without breaking persistence.

## Required Systems

The journey only depends on the first playable scope:

- One spawn point.
- One guide NPC.
- One starter enemy.
- One gathering node.
- One world event.
- Local persistence for player state, NPC memory, and event state.

## Minute-By-Minute Flow

| Time | Player Beat | System Proof | Pass Signal |
| --- | --- | --- | --- |
| 0:00-1:00 | Player appears at the safe camp facing a readable landmark and exit path. | Spawn, camera, initial checkpoint. | Player can identify where to move without a minimap. |
| 1:00-3:00 | Player moves, sprints briefly, and uses one dodge or emergency movement. | Movement states and stamina cost. | Logs can distinguish idle, moving, sprinting, and evading. |
| 3:00-5:00 | Guide NPC gives one short in-world prompt toward the nearby road and field. | NPC response and safe action proposal. | Response may propose only `suggest_hint`, `suggest_marker`, `suggest_event_pause`, or `suggest_quest_note`. |
| 5:00-8:00 | Player meets one starter enemy and wins through readable tells, stamina use, and hit timing. | Combat, enemy state, defeat event. | Enemy idles, notices, attacks, reacts, resets if pulled too far, and logs defeat. |
| 8:00-10:00 | Player reaches one resource node and gathers one useful material. | Gathering interaction, cooldown, durability or action cost. | Node state changes from available to cooldown and persists locally. |
| 10:00-12:00 | A small world event starts near the route, such as a gate flicker or resource bloom. | Event state, visible area change, event log. | Event moves from calm to active with trigger, timestamp, player impact, and rollback note. |
| 12:00-14:00 | Player returns to the guide NPC. The guide recognizes the prior interaction and mentions the active event. | NPC memory and event retrieval. | NPC recalls at least one prior beat and stays in approved language. |
| 14:00-15:00 | Player exits at a safe camp checkpoint with inventory, health, stamina, NPC memory, and event state saved. | Local persistence. | Restart or reload preserves the accepted test state. |

## Player-Facing Tone

NPC and prompt language should be concise, protective, and world-native.

Use:

- "Stay near the camp until your footing is steady."
- "The road ahead is restless. Watch the enemy's shoulders before it strikes."
- "That bloom will fade soon. Gather once, then step back."

Avoid:

- Developer setup language.
- Real payment or ownership language.
- Direct competitor references.
- Private accounting, vendor, or classified material.
- Any promise that paid items create combat advantage.

## Failure Cases

The journey is not accepted if:

- The player needs external explanation to find the first enemy or node.
- Combat works only by exploiting stuck enemy behavior.
- Stamina, node cooldown, event state, or NPC memory cannot be verified.
- The guide NPC executes commands instead of proposing approved game actions.
- Reloading loses player inventory, guide memory, or event state during the test window.
- Logs include secrets, private vault material, or unrelated business notes.

## Handoff Links

- Scope: `docs/gdd/01-vertical-slice.md`
- Acceptance gate: `docs/testing/first-playable-acceptance-checklist.md`
- Current local state: `STATE.md`
