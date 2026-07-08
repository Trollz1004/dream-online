# First Playable Walkthrough

Status: draft

Purpose: a 15-minute founder/tester route for the first playable. This is the human
test script that turns the data contracts and First Gate seed into a concrete play path.

## Test setup

Local prototype target:

```text
http://127.0.0.1:9127
```

Reference files:

- `docs/testing/first-playable-acceptance.md`
- `game/server/live-npc-lab/data/first-zone.seed.json`
- `game/server/live-npc-lab/data/schema-index.json`

## Route overview

Total target time: 15 minutes.

The route should prove:

- The player understands where they are.
- The player sees a live-world signal.
- The player talks to the guide.
- The player gathers one resource.
- The player fights one starter enemy pocket.
- The player sees Day/Nightfall routine differences.
- The player understands inventory, durability, repair, and Runner convenience at a basic level.

## Minute 0-2: Arrival

Player starts at `Old Road Arrival`.

Expected:

- Moon Gate Ruin is visible without opening a map.
- Guide NPC is visible or easily discoverable.
- Gate Guard communicates protected-area safety.
- Player can move, rotate camera, sprint, and stop without confusion.

Pass criteria:

- Tester can point to the primary landmark within 10 seconds.
- Tester can identify the likely guide NPC within 30 seconds.

## Minute 2-4: Guide contact

Player talks to `Sup Guide`.

Guide should explain:

- This is First Gate.
- Moon Gate is safe enough to learn.
- Worker Camp teaches life-skill basics.
- Low Road is dangerous, especially at Nightfall.
- The world can change through live events.

Pass criteria:

- Guide gives one clear next action.
- Guide does not mention developer tooling, vendors, or real-world systems.
- Guide can store a compact memory that the player asked for direction.

## Minute 4-6: First gathering

Player travels to Worker Camp and gathers from one node.

Preferred node:

- `first-ore-01` with pickaxe.

Fallback:

- `first-herb-01` with hoe.

Expected:

- Tool requirement is readable.
- Gather timing is clear.
- Item appears in inventory.
- Tool wear or durability warning is visible.
- Day life-skill bonus is hinted.

Pass criteria:

- Tester gathers one resource without asking what to press.
- Tester can identify the gathered item in inventory.

## Minute 6-8: Inventory and repair hint

Player checks inventory after gathering.

Expected:

- Bag capacity is visible.
- Item stack is visible.
- Durability concept is visible.
- Field Gatherer or UI hints repair.
- Storage Runner is described as one-transaction convenience, not fast travel.

Pass criteria:

- Tester understands inventory space matters.
- Tester understands repair is friction management, not power selling.

## Minute 8-11: First combat

Player approaches Low Road and fights `low-road-wolves-01`.

Expected:

- Enemy threat is readable before damage.
- First hit confirm is visible.
- Stamina cost is visible.
- Cooldown feedback is visible.
- Player has a readable retreat path.

Pass criteria:

- Tester lands one attack and can tell it connected.
- Tester notices stamina or cooldown pressure.
- Tester can retreat toward Moon Gate if overmatched.

## Minute 11-13: Nightfall preview

Trigger or simulate `first-nightfall-surge-01`.

Expected:

- Lighting/audio/world state shifts.
- Guide or world UI explains Nightfall.
- Monster danger increases.
- Life-skill efficiency decreases or risk interrupts.
- Safe exit messaging appears.

Pass criteria:

- Tester understands Nightfall is a combat-risk/reward window.
- Tester understands daytime is better for routine life-skill work.

## Minute 13-15: Live-world event close

Trigger or preview `first-gate-flicker-01`.

Expected:

- Moon Gate visibly reacts.
- Guide can explain what changed.
- Event has audit/rollback data.
- Wilderness-to-city Dream Shift remains founder-test/future-scope only.

Pass criteria:

- Tester understands the world can change.
- Tester is not promised a full seamless world replacement before the tech proves it.

## Stop and record

After the route, record:

- What confused the tester first.
- Whether combat felt readable.
- Whether gathering felt worth repeating.
- Whether Nightfall felt scary or merely annoying.
- Whether the guide helped without over-talking.
- Whether any system sounded like paid power.
- Whether any language felt like developer jargon.

## First fixes to prioritize

1. Fix navigation confusion before adding more land.
2. Fix hit-confirm before adding more skills.
3. Fix inventory clarity before adding more item types.
4. Fix Nightfall messaging before increasing danger.
5. Fix guide brevity before adding deeper memory.
