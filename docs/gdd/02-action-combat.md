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

### Open question for Joshua

W + Shift is the chord almost every game uses for sprint. If W + Shift fires a skill, sprint needs somewhere else to live. The three ways out, for him to pick:

1. Sprint moves to a double tap of the direction key, and W + Shift stays a skill.
2. Sprint stays on W + Shift when it is held, and the skill fires on a quick tap of the pair.
3. There is no sprint. Movement speed is one speed, and the gap closers are the fast travel in a fight.

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

- Command input.
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
