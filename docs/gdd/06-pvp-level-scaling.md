# PvP Level Scaling

Status: design draft
Audience: Codex, Claude, combat design, backend design

## Design goal

PvP should be simple to understand: level matters. A high-level player earned that power
through time and risk, so a much lower-level player should not expect a fair duel against
them in open PvP.

The system should avoid fake equalization while still preventing starter-zone grief loops.

## Core rule

Combat uses level authority plus small role modifiers.

Primary inputs:

- Attacker level.
- Defender level.
- Skill cooldown profile.
- Range profile.
- Melee profile.
- Current PvP state.

The level gap is the strongest modifier. If a level 20 player chooses to fight a level 50
player in valid PvP, the level 20 can be one-shot or near one-shot. That is intentional.

## Modifier Stack

Keep the stack readable:

1. Level gap modifier.
2. Skill cooldown modifier.
3. Range modifier.
4. Melee modifier.
5. PvP-state modifier.

Do not build an overcomplicated hidden formula that players cannot feel.

## Level Gap Modifier

Placeholder brackets:

| Level Gap | Result Intent |
|---:|---|
| 0-4 | Mostly skill matchup |
| 5-9 | Higher level has clear advantage |
| 10-19 | Lower level is in serious danger |
| 20-29 | Lower level can be burst down quickly |
| 30+ | Lower level can be one-shot in valid PvP |

This makes the level 50 grind meaningful while keeping equal-level fights skill-driven.

## Skill Cooldown Modifier

Cooldown profile should matter but not override level.

Draft roles:

- Fast cooldown kit: lower burst, more pressure uptime.
- Long cooldown kit: higher burst, bigger punish window if missed.
- Awakening skills: stronger identity, larger cooldown consequences.

The modifier should reward good timing and punish missed high-impact skills.

## Range And Melee Modifiers

Range and melee should each have a readable advantage window.

Range profile:

- Advantage before contact.
- Better poke and field control.
- Punished if caught without escape.

Melee profile:

- Advantage after engage.
- Better burst and pressure inside close range.
- Punished if kited or baited into cooldown waste.

Draft rule:

- Range receives advantage while distance is maintained.
- Melee receives advantage after confirmed engage or successful gap close.
- Level gap still dominates extreme mismatches.

## Starter Protection And Anti-Grief Boundary

High level power should not become low-level farming.

Keep these separate from the level-scaling formula:

- Starter and onboarding zones can restrict hostile actions.
- Repeated killing can trigger corruption, bounty, or guard response.
- PvP death EXP loss uses separate rules from PvE death.
- Certain PvP states should require opt-in, flagging, or zone eligibility.

The design can allow a level 50 to destroy a level 20 in valid PvP while still preventing
spawn-camp abuse.

## Pink Flag And Red Name PK Consequence

Open-world PvP needs a simple consequence loop for player killing outside future
organized war systems.

Draft flow:

1. Player attacks or kills outside safe/war rules and enters Pink Flag status.
2. After 3 player kills while Pink Flagged, the player becomes Red Name.
3. Red Name marks the player as an enemy to the world.
4. Ranged guard NPCs, magic guards, or projectile guards can one-shot Red Name players
   in protected settlements, roads, or controlled areas.
5. Red Name clears after 3 hours of in-game logged-in time.
6. If a Red Name player dies, 50% of carried/drop-eligible items can drop.
7. Any player can loot dropped Red Name items.

UI rule:

- The player's nameplate/name text turns red to signal Red Name status.
- Keep the signal obvious and readable. Players should know immediately that the target
  is hostile and loot-risk flagged.

Structured war zones:

- Future node wars, castle sieges, city sieges, guild wars, or other organized war modes
  are primary PvP areas.
- These modes should have their own gear-risk rules where multiplayer kills, deaths, or
  war participation can cost gear or durability.
- Red Name punishment handles uncontrolled open-world PK.
- Structured war gear loss should be explicit to players before they enter the war state.

Design intent:

- Let dangerous open-world PvP exist.
- Make murder sprees risky.
- Give regular players and settlements a defense mechanism.
- Create loot drama without letting high-level players farm low-level areas safely.
- Make organized war feel serious because gear is actually at risk.

## Prototype Formula Shape

Data-first formula outline:

```text
levelGap = attackerLevel - defenderLevel
levelPower = bracket(levelGap)
cooldownPower = cooldownProfileModifier(attackerSkill, defenderState)
rangePower = rangeModifier(distance, attackerProfile, defenderProfile)
meleePower = meleeModifier(distance, engageConfirmed, attackerProfile, defenderProfile)
pvpStatePower = pvpStateModifier(attackerState, defenderState, zoneRules)

finalDamage = baseDamage * levelPower * cooldownPower * rangePower * meleePower * pvpStatePower
```

All values are placeholders until combat tests exist.

## Acceptance Criteria

- Equal-level fights feel skill-driven.
- A 5-9 level gap is obvious.
- A 20+ level gap is dangerous enough that the lower-level player understands the risk.
- A level 20 fighting a level 50 in valid PvP can be one-shot.
- Starter protection prevents abuse without flattening the whole game.
- The formula can be explained in plain player language.
