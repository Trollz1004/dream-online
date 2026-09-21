# Action Combat Specification

## Combat Type

DREAM ONLINE uses directional real-time action combat. Tab-targeting is not the foundation. Soft target assist can exist for accessibility, gathering, interaction focus, and controller comfort.

## Input Language

| Input | Intent |
|---|---|
| Left Mouse | Light attack chain |
| Right Mouse | Heavy attack / class special |
| W + Shift + F | Forward gap-close strike |
| S + Left Mouse | Retreating slash / counter poke |
| Shift + S + Right Mouse | Backstep heavy / guard-break attack |
| A/D + Shift + Left Mouse | Side evade attack |
| W + Right Mouse | Forward heavy opener |
| Q | Guard / parry stance |
| E | Grab / interrupt / contextual action |
| Space | Dodge / vault / recovery cancel |

## Combo Grammar

Ruled by Joshua on 2026-09-20 and corrected by him the same evening. Action combat here is skill based and driven by key combinations. There is no tab target and no auto-attack timer.

### Movement keys are movement, never a skill

- A direction key walks or runs: W, A, S, D.
- Shift held with a direction sprints.
- A double tap of Shift and the direction latches auto-sprint, so long travel needs no keys held down.
- **A direction with Shift and nothing else is movement and nothing else.** No skill is ever bound to a bare direction and Shift.

### A skill is a direction, an optional Shift, and an action key

The action keys are **Q, E, R, F, Z, C, the left mouse button and the right mouse button**. A skill needs one of them. Every distinct set of keys is its own separate skill.

| Input | What it is |
|---|---|
| W + Shift | Sprint forward. Movement, not a skill. |
| S + Shift | Sprint backward. Movement, not a skill. |
| W + Shift + F | A skill. Already in the input table above as the forward gap-close strike. |
| W + F | A different skill. No Shift, so it is not the same skill as W + Shift + F. |
| S + F | A different skill. |
| S + Shift + F | A different skill again. |
| A + F | A different skill. |
| A + Shift + F | A different skill again. |
| Shift + A + Q | A different skill again. |

The Shift is itself part of the set. W + F and W + Shift + F are two separate skills, not one skill pressed two ways. Joshua's reason for the whole grammar, in his words on 2026-09-20: it makes gameplay fun. The breadth of distinct moves under the player's fingers, with no menu and no pause, is the point.

Two rules hold when new skills are added. Never reuse a key set that is already spoken for. Never treat two sets as the same skill because they share keys: A + F and A + Shift + F are two skills, not one skill with a variation.

### Why this grammar is the right one

Because every skill carries an action key, no skill competes with movement. That means **every skill fires on the press of its action key, instantly, with no delay and no tap-against-hold guessing**. An earlier version of this document proposed a quick-release rule to separate a bare Shift + W skill from sprint; Joshua's correction removes the need for it, and that rule is withdrawn.

The space is large enough for any class: five direction states (W, A, S, D or none), times two for Shift, times eight action keys, is eighty distinct bindings before chains are counted.

### Defensive movement, ruled by Joshua on 2026-09-20

This is the heart of the combat and it is a ruling, not a suggestion.

- **The dash with invulnerability frames is the real defence.** A class dashes sideways or backward, an animation plays, and the character cannot be hit through the middle of it. In player against player fighting this is what keeps you alive, and reading the enemy's wind-up so the dash covers their active frames is the whole skill of the game. Its binding follows the grammar above: Shift, the direction, and an action key.
- **The plain dodge roll on Space is the weak fallback.** It works, and a new player or a player who cannot perform combinations can live on it, but it is deliberately worse than a dash: a shorter invulnerable window and a longer recovery. Nobody good will use it, and that is the intent.
- **A dash is punishable when mistimed.** The frame shape is a few startup frames where the character can still be hit, the invulnerable window through the travel, then recovery frames that are wide open. Dashing early or late loses the trade. Without that, dashing would be free.
- **A dash costs stamina and cannot be chained without limit.** Stamina is the brake. A player who spends it all on dashes has nothing left to attack with.
- **Invulnerability is decided by the server.** The client plays the dash straight away so it feels instant, and the server decides whether the hit landed, using the same frame windows. In player against player this cannot be left to the client, or the fight is decided by whoever has the better connection or the worse intentions.

### Patterns taken from the combo-driven action games of this type

Joshua pointed at a player discussion of a long-running combo-driven action game on 2026-09-20 as the shape he wants. The page refuses an automated fetch, so these are the generic design patterns of that family, written in our own terms. No art, name or asset of any other game enters this project; only the mechanics are studied, which is the rule in the workspace rulebook.

- **Every skill is a key combination first.** The combination is the real binding and the thing a player builds muscle memory for.
- **The skill bar exists to show cooldowns.** Ruled by Joshua on 2026-09-20. If a skill bar is on the screen, its job is to show what is ready and what is still cooling down. It is a readout first, not the way skills are meant to be fired.
- **A player may bind hot keys on that bar if they want to.** Also his ruling. The combination is the intended way to play, and the bar is there for the player who prefers a hot key, who is on a controller, or who cannot perform a combination. Nothing is combination-only.
- **Skills chain.** A skill entered during the previous skill's cancel window flows straight out of it instead of waiting for the recovery to finish. Chains, not single hits, are where damage comes from, and they are what makes the combat feel fast.
- **Cancelling is a skill of its own.** A movement input or another skill may cut a recovery short. The cancel window per skill is already in the skill data fields below.
- **Defence lives on the skill, not on one button.** Each skill carries a defensive tag: invulnerability frames, super armour, a forward guard, or nothing at all. Choosing the right skill is the defence.
- **The usual complaint about this family is that nothing is discoverable.** Players cannot see which combinations exist or what each one does. Our answer is a combo list screen that shows every combination in plain words with its defensive tag, and a practice dummy in the test zone to try them against. That screen follows the interface direction in `docs/gdd/09-interface-style.md`: dark see-through panel, three columns, plain words.

### How this is built in Unreal

Enhanced Input in Unreal 5.8 has a chorded action trigger, which is exactly this shape: Shift and the direction key are the chord, the action key fires it. The input layer can therefore be built in Blueprints with no C++ compiler. The frame data for each skill (startup, active, recovery, cancel windows, invulnerability) still comes from the skill data fields below.

## Combat Attributes

- Health.
- Stamina.
- Guard meter.
- Stability / posture.
- Movement speed.
- Attack speed.
- Cast speed where relevant.
- Crowd-control resistance.

## Skill Data Fields

Every skill needs:

- Command input, the key combination that fires it.
- Slot binding, so the same skill can be fired from the bar by a player who does not use the combination.
- Chains into: the skills this one may flow straight into during its cancel window.
- Startup frames.
- Active frames.
- Recovery frames.
- Cancel windows.
- Stamina cost.
- Cooldown if any.
- Hit shape: trace, cone, capsule, projectile, AOE.
- Super armor frames.
- I-frame frames if any.
- CC type.
- PvE modifier.
- PvP modifier.
- Durability impact.

## First Prototype Skills

Blade class:

- `Blade.Light.Chain01`
- `Blade.Light.Chain02`
- `Blade.Forward.GapClose`
- `Blade.Back.CounterSlash`
- `Blade.Side.EvadeCut`
- `Blade.Dash.Left` (Shift + A + action key, i-frames)
- `Blade.Dash.Right` (Shift + D + action key, i-frames)
- `Blade.Dash.Back` (Shift + S + action key, i-frames)

Guard class:

- `Guard.Light.Bash`
- `Guard.Q.Block`
- `Guard.Parry.Counter`
- `Guard.Forward.ShieldRush`
- `Guard.Heavy.GuardBreak`

Arc class:

- `Arc.Light.Shot`
- `Arc.Heavy.ChargedShot`
- `Arc.Back.RollShot`
- `Arc.Forward.PiercingShot`
- `Arc.E.TrapKick`

All values are [PLACEHOLDER] until playtested.
