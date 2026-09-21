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

Ruled by Joshua on 2026-09-20. Action combat here is skill based and driven by key combinations. Every distinct set of keys is its own separate skill. There is no tab target and no auto-attack timer.

A combo is built from three parts:

- A direction key: W, A, S or D. It may be left out.
- A modifier: Shift. It may be left out.
- An action key: F, the left mouse button, or the right mouse button. It may be left out when a direction and a modifier are held.

His own examples, each one a separate skill:

| Input | Status |
|---|---|
| W + Shift | A skill of its own |
| S + Shift | A different skill |
| W + Shift + F | A different skill, already in the input table above |
| A + F | A different skill |
| A + Shift + F | A different skill |

The rule to follow when new skills are added: never reuse a key set that is already spoken for, and never treat two sets as the same skill because they share keys. W + Shift and W + Shift + F are two skills, not one skill with a variation.

### Movement, ruled by Joshua on 2026-09-20

- Holding a direction key walks or runs in the normal way.
- Holding Shift with a direction key sprints, for as long as both are held.
- A double tap latches auto-sprint, so long travel needs no keys held down. The character keeps sprinting until the player stops, turns sharply or acts.

### Defensive movement, ruled by Joshua on 2026-09-20

This is the heart of the combat and it is a ruling, not a suggestion.

- **The dash with invulnerability frames is the real defence.** A class dashes with Shift and a direction, an animation plays, and the character cannot be hit through the middle of it. Shift + A dashes left, Shift + D dashes right, Shift + S dashes back. In player against player fighting this is what keeps you alive, and reading the enemy's wind-up so the dash lands on their active frames is the whole skill of the game.
- **The plain dodge roll on Space is the weak fallback.** It works, and a new player or a player who cannot perform combinations can live on it, but it is deliberately worse than a dash: a shorter invulnerable window and a longer recovery. Nobody good will use it, and that is the intent.
- **A dash is punishable when mistimed.** The frame shape is: a few startup frames where the character can still be hit, the invulnerable window through the travel, then recovery frames that are wide open. Dashing early or late loses the trade. Without that, dashing would simply be free.
- **A dash costs stamina and cannot be chained without limit.** Stamina is the brake. A player who spends it all on dashes has nothing left for attacks and is helpless.
- **Invulnerability is decided by the server.** The client plays the dash straight away so it feels instant, and the server decides whether the hit landed, using the same frame windows. In player against player this cannot be left to the client or the fight is decided by whoever has the better connection or the worse intentions.

### The sprint clash, and how it is resolved

A dash has to fire the instant the keys go down, because it is a defence and a defence that arrives late is no defence. Sprint also has to start the instant the keys go down. Those two only collide on one pair, and the way out is that **sprint is forward only**.

- **Shift + A, Shift + S and Shift + D fire on the press, with no delay of any kind.** Nobody sprints sideways or backwards, so nothing competes for those pairs. They are the dashes.
- **Shift + W held is sprint**, starting immediately.
- **Shift + W is also a skill**, as Joshua listed. It is the one pair that needs a split, so it fires on a quick release: the pair let go inside about 150 milliseconds. A sprint that lasted a sixth of a second is invisible to the player. A forward skill that must be instant belongs on W + Shift + F instead, which the input table above already holds.
- **Auto-sprint latches on a double tap of the direction key alone, with no Shift.** A double tap of Shift and a direction together would read as two quick releases, which is the skill firing twice. Shift is not needed to keep the latch running. This is the lane's ruling, with a yes or no owed from Joshua.

Skills that carry an action key, such as W + Shift + F or A + F, never clash. They fire on the press of the action key.

### Patterns taken from the combo-driven action games of this type

Joshua pointed at a player discussion of a long-running combo-driven action game on 2026-09-20 as the shape he wants. The page itself refuses an automated fetch, so these are the generic design patterns of that family, written in our own terms. No art, name or asset of any other game enters this project; only the mechanics are studied, which is the rule in the workspace rulebook.

- **Every skill is a key combination first.** The combination is the real binding and the thing a player builds muscle memory for. This is Joshua's ruling above.
- **The same skill also sits in a slot on the bar.** A player who cannot perform a combination, or who is on a controller, fires the identical skill from a slot. Nothing is combination-only. This is an accessibility requirement here, not an option.
- **Skills chain.** A skill entered during the previous skill's cancel window flows straight out of it instead of waiting for the recovery to finish. Chains, not single hits, are where damage comes from, and they are what makes the combat feel fast.
- **Cancelling is a skill of its own.** A movement input or another skill may cut a recovery short. The cancel window per skill is already in the skill data fields below, so this costs nothing new to support.
- **Defence lives on the skill, not on one button.** Each skill carries a defensive tag: invulnerability frames, super armour, a forward guard, or nothing at all. Choosing the right skill is the defence. The dodge on Space stays as the plain answer for a player who has not learned the tags.
- **The usual complaint about this family is that nothing is discoverable.** Players cannot see which combinations exist or what each one does. Our answer is a combo list screen that shows every combination in plain words with its defensive tag, and a practice dummy in the test zone to try them against. That screen follows the interface direction in `docs/gdd/09-interface-style.md`: dark see-through panel, three columns, plain words.

### How this is built in Unreal

Enhanced Input in Unreal 5.8 has a chorded action trigger, which is exactly this shape: Shift and the direction key are the chord, the action key fires it. That means the input layer can be built in Blueprints without a C++ compiler. The frame data for each skill (startup, active, recovery, cancel windows) still comes from the skill data fields listed below.

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
- `Blade.Dash.Left` (Shift + A, i-frames)
- `Blade.Dash.Right` (Shift + D, i-frames)
- `Blade.Dash.Back` (Shift + S, i-frames)

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
