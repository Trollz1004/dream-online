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

### How this is built

In the in-house DREAM Engine (`src/engine/combat/`): `combo.ts` resolves a key set to a skill name, with the Shift counted as part of the set, and each skill's frame data (startup, active, recovery, cancel windows, invulnerability) lives in its own state file beside it (`dash-state.ts`, `attack-state.ts`, `heavy-attack-state.ts`, `guard-state.ts`, `lunge-state.ts`, `burst-state.ts`). All of it is plain data and geometry, so the same rules can run on a server later.

Reference note only, not a claim about our engine: Enhanced Input in Unreal 5.8 has a chorded action trigger of exactly this shape, Shift and the direction key as the chord and the action key firing it, which is where the chord idea came from.

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

## Classes and group rules (founder, 2026-09-24)

Five starting classes. The founder's own class image (made with Gemini from his text) sets the mood for four of them; every class must also look right in the Night Dreams city, following the one-outfit-both-worlds rule in `08-day-dreams-night-dreams-world.md`.

1. **Knight**: plate, sword and crest shield. Front line.
2. **Elf archer**: leather, hooded cloak, longbow. Light and quick.
3. **Mage**: robes with glowing runes, staff, spell light at the hand.
4. **Dark knight**: jagged black and red plate, polearm, dragon motif.
5. **Healer** (new, founder 2026-09-24): the support class that keeps a group alive. At its awakening (a job change reached through a quest checkpoint) the Healer becomes a **Priest**. Its look is still to be designed.

### Awakening: two paths for every class (founder, 2026-09-24)

At the awakening level each of the five classes chooses one of two paths. The two path families use the canon names:

- **Nightmare Class**: damage-focused. Full damage, and its party buffs raise the party's damage output.
- **DREAM Class**: support-focused. Vitality and protection; it can still deal damage, but it absorbs damage meant for others and its party buffs are defensive and supportive.

Known splits so far:

- **Human knight line**: awakens as the **Knight** (Nightmare Class: full damage, damage party buffs such as Empower) or the **Defender** (DREAM Class: vitality-focused, can absorb damage taken by party members, support party buffs, still deals damage).
- **Healer line**: awakens as the **Priest** (heals, Obli-type protection skills, health buff) or takes the **damage path**, whose melee damage scales with a psychic/intelligence multiplier.
- **Elf archer line** (founder, 2026-09-25: "the ranger that can be melee as second skill awakening"): starts as the ranged archer with the longbow. The second awakening path is a **melee ranger**: a strength-built archer who closes in and kills with daggers, keeping the hooded ranger look (the Quaternius CC0 ranger outfit merged on 2026-09-25). It breaks the usual rule that an archer stays at range, on purpose. Which of the two paths is the Nightmare Class and which the DREAM Class is still to be ruled.
- The mage and dark knight splits are still to be named.

Design secret, not for player-facing copy: the Healer line, played well, ends up the highest damage dealer in a party, and players will not expect it, because few people play a healer. Tuning must keep that true without making the class feel mandatory for damage.

Rules, in the founder's words and meaning:

- **Sup@ cannot be beaten without a healer.** The fight is tuned so a group with no healer fails; this is a design requirement, not a difficulty setting.
- **Obli** is a Priest skill cast on the party: it reduces incoming damage by **60% when leveled to its maximum** (lower levels give less), for a short window, on a long cooldown.
- **Party-only buffs.** Auras and group buffs reach only the caster's party, never the raid at large or bystanders; that is what makes the party matter. Examples in the founder's numbers: the Knight's **Empower** aura, +30% damage for the whole party; a Priest's health buff, +20% maximum health for the whole party.
- **Cooldown-acceleration skill** (working name **Chrono**): a self-buff that makes the next skill cast come back immediately, then Chrono itself goes on its own cooldown. The intended use is getting Obli up again sooner in a hard fight.

All numbers above are the founder's targets and stay [PLACEHOLDER] until playtested. The generic research behind these patterns is kept privately on the Alienware node (`recon/research/party-mechanics-2026-09-24.md` under the workspace root); competitor names never appear in this document.

## Bosses (founder, 2026-09-24)

- **Sup@**: cannot be beaten without a healer in the party (see above).
- **Captain Brine** (working name, ruled 2026-09-28): the rival boss of the Dream Oceans, holding a harbour seaport. Fight design is open; original design only.
- **Myth@s** (new): a towering dark knight in spiked black and red plate over tactical gear, glowing red seams, a red visor, a torn red cape and a huge glowing red polearm-axe. The founder's own concept image shows him arriving in the Night Dreams city with a crowd pulling back around him. Fight design is open.

### Founder ruling, 2026-09-28: the bottled-energy NPC, the dual events and the hardest fight

Joshua gave the shape of the boss story on 2026-09-28. The part that players will see in ordinary play is recorded here. The rest of it (what happens between these characters, why, and how it ends) is founder-only end-game material and stays in the private vault under the rule in `docs/gdd/00-vision.md`; nothing below is the story, only the systems.

- **Ember (working name, ruled 2026-09-28; Myth@s is his father, and that much is public by the same ruling).** He carries a bottled energy on the order of a singularity or a sun, and he struggles to keep control of it. Public-facing, he reads as a guide figure placed the way the OpenAeYe pet is placed in the slice, close to the player, not as a monster. His visual is the contained black-hole or sun-in-a-bottle: a small body around a light that is plainly too big for it, with the bleed of that light as the tell that control is slipping. Original design only; no other franchise's look enters.
- **He leaves.** Unpredictably, mid-conversation or mid-fight, the energy gets away from him and he departs with a short apology in character. Players will learn to read the tell before it happens. The apologies are written lines in the lab's approved language, never live-generated excuses.
- **Dual events, father and son.** Myth@s and Ember fight as a pair against players who have learned the lure of the game slowly enough to be there. These are two-boss encounters. Their mechanics are vault material; they need a boss-events spec of their own under `specs/` before any code (spec 001 covers only the CrossEyed four-event catalog and does not stretch to them), and they replace nothing already ruled about Myth@s.
- **Sup@ helps.** In these events Sup@ stands with the player side and helps, for now. What that help costs and where it ends is vault material.
- **The hardest fight in the game.** One encounter is tuned for a full party of six at maximum level in end-game gear, and even that party should not expect to win on the first attempts. Who it is against and why is founder-only. The tuning rule is public: six, max level, max gear, healer required (the healer rule above still holds), and no fewer.

Numbers stay [PLACEHOLDER] until the fight exists. The classified rule stands: nothing in this file, in a commit message or in a pull request body describes the reveal, the accident or the ending.

## Small smart parties beat big crowds (founder, 2026-09-24)

DREAM is **action combat**: aimed attacks, dodges and positioning, never tab-target lock-on. The founder's older group-fight footage (reference only, kept privately) is used for what it shows about tactics, not controls: a coordinated party of six beating a much larger crowd because the party plays together.

- **Rotating protection.** Obli's long cooldown means a party with more than one caster takes turns, so one window starts as the last one ends ("your obli now" was the call in the footage). Tuning should reward that planning.
- **Fast cooldown calls.** Players need a one-button party ping for key cooldowns ("Obli ready", "cast yours now", "Empower up") shown on the party interface, so coordination does not depend on typing in chat mid-fight.
- The design goal: a small, well-built, well-played party can beat larger numbers; raw headcount alone should not decide a group fight.

## Master Class & Weapon Matrix, Hidden Awakened Gems & 7-Factor PvP Hierarchy (Founder Ruling, 2026-11-01)

### 1. Strict Weapon & Dual-Wield Rules by Class
- **Universal Dagger Rule:** Every class can equip a **Dagger / Knife** in their off-hand or as a specialized primary weapon (which remains niche unless paired with a specific endgame Awakened skill-tree build).
- **Awakened 3rd Class-Specific Weapon:** Every class unlocks a third, class-exclusive Awakened weapon through their Awakened skill tree. It is never shared across classes, is farmed strictly in-game, and upgrades along the same deterministic in-game currency (`Sols`) forge path—never purchased with real money.
- **Human Melee Classes (Warrior, Knight, Defender, Assassin):**
  - Permitted weapons: `1H Sword`, `2H Sword`, `1H Mace`, `1H Club`, `1H Axe`, `2H Spear`, `Dagger`, `Shield`.
  - **Dual-Wield & Off-Hand Rule:** Only Humans (and Monks with Dual Swords) can dual-wield. A Human wielding a 1-handed main-hand weapon (never a Crossbow) may equip **only a Dagger or a Shield** in their off-hand.
  - **Human Defender (`Vitality` / `+HP%` Scaling):** Defenders absorb damage meant for party members via group protection auras and scale their solo-farming and PvP damage off **Vitality** and random-rolled **`+HP%`** marketplace gear.
- **Ranger (Elf Archer):**
  - **Exclusive Bows & Crossbows:** Only Rangers can equip a **2H Bow**, **1H Crossbow**, or **Dual Crossbows**. Dual Crossbows fire with faster attack animations while a 2H Bow fires slower, heavier ranged skill shots—tuned so both achieve equal sustained DPS.
  - **Never Swords:** Rangers can **never** wield a sword or dual-wield swords.
  - **Cross-Archetype Wind/Caster Option:** Depending on weapon choice and skill point investment, Rangers can unlock and cast elemental skills such as **Tornado / Whirlwind** with weapon-specific damage modifiers.
  - **Hidden Endgame Easter Egg (`STR + Dagger` Awakening):** At low levels, equipping a Dagger or stacking `STR` on a Ranger is weak. However, at **Endgame Level 45+ with the Awakened Skill Tree maxed**, a hidden weapon-specific node converts **`STR` + `Dagger`** into armor-piercing lethality that out-damages a standard `DEX` Bow/Crossbow build.
- **Mages, Wizards, Warlocks & Healers / Priests:**
  - **2H Caster Staff Exclusivity:** Only Mage, Wizard, Warlock, and Healer/Priest classes can wield a **2-Handed Caster Staff**.
  - **Hidden Endgame Easter Egg (`INT + 1H Mace + Shield` Priest):** Standard Priests heal and buff their party using **`PSY`** (mana-based skills) with a `2H Staff` or `1H Club`. However, if an endgame Priest invests in **`INT`** (Warlock-style stat allocation instead of `PSY`), levels their **Awakened Skill Tree**, and equips a **One-Handed `Mace`** (specifically a `1H Mace`—never a `1H Club` and never a `2H Staff`) paired with a **`Shield`**, they become a melee damage dealer. When stacked with full group party buffs, this hidden build achieves the **highest achievable melee damage in the entire game**.
- **Monk (`Sprint / Dash Energy` Class):**
  - Cannot equip a caster `2H Staff`; wields a **2-Handed Martial Long-Staff**, **Dual Swords**, or **Dagger**.
  - **Shared Sprint/Dash Energy Pool:** Monks do not use Mana or PSY. Every Monk combat skill and aura draws from **`Energy`**—the **exact same Energy pool used for Sprint and Dash**—making mobility versus burst output a signature skill ceiling.
- **Dragon Class (`Dekan / Velmaravex` — Exclusive `Zhen` Weapon):**
  - **Exclusive Weapon (`Zhen`):** Only the Dragon class can wield the **`Zhen`** (either as a **2-Handed Zhen** or **Split Dual-Wield Zhen**).
  - **Dragon Evolution & Full-HP Healing:** Evolves visually and mechanically into a **literal Dragon (`Velmaravex`)** across skill and Awakening tiers, with long-cooldown self and party heals that scale off **Full HP**.
  - **Standard vs. Hidden Endgame Build:** Most players build Dragon as an **`INT` Sage** (scaling off `INT`, not `PSY`) or **`STR` Split Dual-Wield Zhen**. The **Hidden Endgame Easter Egg** triggers when a player builds **full `Vitality` / `Max HP`** with the endgame Awakened Zhen skill tree, unlocking massive AoE and single-target damage scaled directly off Max HP that can out-scale even a Human Defender.

### 2. The 7-Factor PvP Damage & Outcome Hierarchy
In group and open-world PvP, **Coordinated Team Play & Same-Target Focus** (calling and striking the same target together as a coordinated party with active mana/psy/energy-draining group auras) is the ultimate real-world deciding factor. Mathematically, combat damage modifiers follow this strict priority order:
1. **Character Level (`Level > All`)** — Level advantage is the #1 mathematical multiplier.
2. **Party-Up & Group Auras (`Party > Solo Always`)** — Castable party buffs and sustained auras make grouped players substantially stronger than solo players, encouraging players to team up and help each other level.
3. **Skill Paths & Awakened Skill-Tree Synergies** — Including level-based, weapon-specific hidden gems.
4. **Weapon Base & Random-Rolled Loot Affixes** — Dropped marketplace stats (`+Damage%`, `+HP%`, `+Magic Attack`, `+Melee Attack`, `+Ranged Attack`).
5. **Deterministic Forge Enhancement Tier** — `Common` → `Uncommon` → `Rare` → `Legend` → `Mythos`.
6. **In-Game PvP Skill Rating + Armor/Gear + Active Free Pet Summoned** — Every player can earn and summon a free pet (`+10%` class-branded boost); forgetting to have your pet out when your opponent has theirs summoned forfeits that edge.
7. **Crafted Elixirs, Feasts & Food Buffs (Solo & Party)** — Produced through Fishing, Gathering, Forging, and Alchemy.

