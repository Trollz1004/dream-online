# Dream Field Vertical Slice

## Goal

Build one small playable test area that proves the core systems before scaling into a full MMO.

## Scope

World:

- One town hub.
- One wilderness field.
- One night dream-city overlay or district layer.
- One river or coast fishing area.
- One resource grove and one mining route.
- One PvP-risk road outside town.

Classes:

- Blade class: fast melee command chains.
- Guard class: shield, block, counter, guard break.
- Arc class: ranged/projectile action combat with stamina constraints.

Players:

- Local prototype: 1 player.
- First network test: 2 players.
- Slice target: 8-16 players.

NPCs:

- Sup@ companion stub first, full live-agent routing later.
- 10 town NPCs with day/night schedules.
- 5 worker NPCs.
- 5 hostile mobs.
- 1 rare night roaming enemy.

Life Skills:

- Gathering.
- Processing.
- Cooking.
- Fishing including AFK fishing.
- Worker node collection.
- Repair/camp/anvil loop.

PvP:

- Safe town.
- Wilderness PvP opt-in/flag test.
- One bounty/karma consequence path.

## Completion Standard

The slice is valid only when:

- Combat works without tab target.
- At least 5 command-input skills work.
- Hit validation is server authoritative in network mode.
- Players can gather, process, cook, fish, and repair.
- Durability decreases and can be repaired.
- Day/night state changes NPCs and available content.
- PvP flagging prevents accidental grief in safe areas.
- The loop is fun for 20 minutes without extra explanation.
