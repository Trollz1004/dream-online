# First Playable Promise

Status: P0 prototype scope

Purpose: define the smallest playable Dream ONLINE proof that is worth building before
larger world, economy, PvP, or live-service expansion.

## One-Sentence Promise

A player enters one readable field, learns movement through landmarks, defeats one
starter enemy with stamina-based action combat, gathers one useful resource, speaks
with one guide NPC that remembers the interaction, and sees one local world event
persist across reload.

## Required Playable Loop

The first playable loop is accepted only if the player can complete this sequence
without external explanation:

1. Spawn at a safe camp with a clear landmark and a visible road.
2. Move, sprint, stop, turn, and use one defensive movement action.
3. Speak to the guide NPC and receive one short in-world direction.
4. Fight one starter enemy using readable tells, stamina cost, and hit reaction.
5. Gather one resource node and see its state change.
6. Trigger or witness one world event near the route.
7. Return to the guide NPC and receive a response that reflects the earlier action
   or active event.
8. Reload the local prototype and confirm player state, NPC memory, node state, and
   event state are still present.

## Minimum Content

| Slice Part | Minimum Proof | Not In Scope Yet |
| --- | --- | --- |
| Movement | Walk, sprint, turn, stop, defensive move, stamina change | Mounts, traversal skills, fast relocation |
| Enemy | One starter enemy with idle, notice, attack, stagger, reset, defeat | Bosses, swarm AI, advanced PvP tuning |
| Gathering | One resource node with action time, output item, cooldown, persistence | Full crafting economy, rare-drop markets |
| NPC Guide | One guide profile, one memory read, one approved action proposal | Full voice pipeline, unrestricted agent actions |
| World Event | One local event with trigger, visible state, duration, rollback note | Large city changes, global event scheduling |
| Persistence | Local save of player, NPC, node, inventory, and event state | Production database, account entitlements |

## Acceptance Signals

- The player can identify the road, enemy, node, and return path from world cues.
- Combat requires timing and positioning, not menu targeting.
- Stamina changes are visible enough to guide player behavior.
- The resource node cannot be gathered infinitely without cooldown or state change.
- The guide NPC can propose only approved game actions and cannot execute commands.
- The world event has a clear start, player-visible change, and recovery or rollback note.
- Reloading preserves the proof state for the full route.

## Boundary Rules

- Paid systems are not part of the first playable proof.
- NEEDs are not used as a real-money benefit or player promise in this slice.
- No direct competitor names belong in first-playable docs, prompts, task titles, or
  public copy.
- Founder-only plot material stays outside the repo.
- The slice may use local mock AI behavior; it must not require provider keys.

## Follow-On Links

- Player journey: `docs/gdd/01a-first-15-minute-journey.md`
- Vertical slice: `docs/gdd/01-vertical-slice.md`
- Acceptance gate: `docs/testing/first-playable-acceptance-checklist.md`
- Current local state: `STATE.md`
