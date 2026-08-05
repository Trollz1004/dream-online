# Test Plan

## Testing Philosophy

Test feel before scale. A boring 1-player prototype will not become fun at 1000 players.

## Milestone 0: Workstation Ready

Pass conditions:

- Unreal installed.
- Visual Studio C++ build tools installed.
- Git LFS works.
- Can compile a blank C++ UE project.
- Can launch standalone game.

## Milestone 1: Combat Sandbox

Pass conditions:

- Player can move, sprint, dodge, block.
- Five command-input skills work.
- Hitboxes match animation timing.
- Stamina prevents infinite spam.
- Combat feels readable at 60 FPS or acceptable prototype FPS.

## Milestone 2: Network Combat

Pass conditions:

- Dedicated server launches.
- Two clients connect.
- Server validates hits.
- Client prediction does not feel broken.
- PvP damage can be enabled/disabled by flag state.

## Milestone 3: Life Skill Loop

Pass conditions:

- Gather node with tool.
- Tool durability decreases.
- Process resource.
- Cook one meal.
- Fish actively and AFK.
- Repair tool or gear.

## Milestone 4: Dream Shift

Pass conditions:

- Server clock triggers day/night state.
- At least 3 NPCs change schedule.
- At least 3 resources/vendors/mobs change availability.
- Transition hides streaming with blackout/fade.
- No gameplay-critical actor disappears during active combat.

## Milestone 5: 8-16 Player Slice

Pass conditions:

- 8-16 clients can join.
- Combat, chat, movement, harvesting, and inventory remain stable.
- No major desync in PvP.
- Server logs critical failures.
