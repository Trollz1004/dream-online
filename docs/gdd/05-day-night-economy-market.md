# Day/Night Risk, Progression, Pets, Boosters, And Marketplace

Status: design draft
Audience: Codex, Claude, systems design, economy design, backend design

## Design goal

Make daily play routines matter. Daytime should feel productive, social, and safer.
Night should feel dangerous, profitable for prepared combat players, and risky for
under-geared players.

Use player-facing terms:

- Day: life-skill work, gathering, crafting, trade prep, safer travel.
- Nightfall: monster danger, higher combat reward, harder survival, higher stakes.

Avoid real-world brand names and direct competitor labels in system names.

## Day/Night XP Rotation

Day rules:

- Life-skill EXP is boosted.
- Gathering, cooking, processing, fishing, farming, and worker planning are more efficient.
- Monster EXP is normal or slightly reduced compared with night.
- Safer social and economy routines are encouraged.

Nightfall rules:

- Monster EXP is boosted.
- Monster HP and damage are increased.
- Life-skill EXP is reduced.
- Night farming is allowed but intentionally inefficient and dangerous.
- Under-geared players should feel real fear without being trapped.

Initial tuning placeholders:

| State | Life Skill EXP | Monster EXP | Monster HP | Monster Damage | Intent |
|---|---:|---:|---:|---:|---|
| Day | +25% | 100% | 100% | 100% | Productive routine window |
| Nightfall | -25% | +35% | +25% | +20% | Risk/reward combat window |

All numbers are placeholders until playtested.

## Death EXP Loss

PvE death should matter after the early game. PvP death should use separate rules so
players are not griefed into progression loss.

Draft rules:

- No meaningful EXP loss in the first onboarding levels.
- After the early learning threshold, PvE death can remove progress toward the next level.
- Minimum loss at higher levels: 1% progress toward the next level.
- Current working cap target: level 50.
- Low levels can use a higher percentage only if the absolute recovery time stays fair.
- PvP death should not apply the same PvE EXP loss unless a specific high-risk opt-in
  state is active.

Open tuning questions:

- Exact no-loss range.
- Exact level when death penalty starts.
- Whether protection items exist and how they are earned or purchased.
- Whether night death has a different penalty than day death.

## Level 20 Combat Shift

Levels 1-20 should be reachable without punishing grind. Level 20 is the first major
combat identity unlock.

Level 20 design intent:

- Player learns a cooler, more expressive skill.
- Combat opens into wider AOE and group-pull potential.
- Solo players can start mass monster grinding safely if geared.
- Party players can coordinate larger pulls and shared boosts.
- The grind after level 20 slows down, but action combat should make it satisfying.

## Level 45 Class Awakening

Level 45 is the first prestige identity spike. This should feel like the player becomes
visibly different from the crowd, not just numerically stronger.

Two working class-awakening lanes:

- Nightmare Class: dark assassin-style melee path for non-mage players.
- DREAM Class: mage/projectile-style path for non-melee players.

Design intent:

- Level 45 unlocks new class image, effects, silhouettes, idle stance, combat trail,
  and skill presentation.
- The fantasy target is "five times more fun and impactful," not a locked 5x raw damage
  multiplier.
- Damage can spike through better AOE shape, combo windows, execution effects, mobility,
  control, or burst timing, but raw numbers must stay tunable for PvP and party balance.
- Awakening should become the minimum serious identity goal after the level 20 combat
  shift.

Nightmare Class draft:

- Focus: dark melee, assassin pressure, fast engage, execution windows, shadow movement,
  bleed or mark-style pressure.
- Not a mage path.
- Visual identity: darker effects, sharper silhouettes, aggressive trails, threat aura.
- Gameplay identity: close-range burst, evasive movement, target isolation, high-risk
  high-reward timing.

DREAM Class draft:

- Focus: mage/projectile, ranged pressure, spell-like projectile shaping, field control,
  radiant or surreal effects.
- Not a melee assassin path.
- Visual identity: brighter or stranger effects, projectile signatures, floating accents,
  altered casting stance.
- Gameplay identity: ranged damage, zone control, projectile combos, group utility, and
  high-visibility skill expression.

Open tuning questions:

- Whether players choose one lane permanently, temporarily, or through a costly reset.
- Whether Nightmare/DREAM unlock through level alone or through a class trial.
- Whether PvP uses separate scaling for awakened skills.
- Whether awakened cosmetics are earned, sold, or both.

## Boost Items: Seals And Scrolls

Boosters are convenience items. They must be clearly described and capped so stacking
does not create runaway progression.

Draft categories:

| Item Type | Scope | Duration | Function |
|---|---|---:|---|
| Solo Seal | Solo | 3-7 days | Long convenience boost for one player |
| Solo Scroll | Solo | 2-4 hours | Short active-session boost for one player |
| Party Seal | Party | 3-7 days | Long boost shared with party members |
| Party Scroll | Party | 2-4 hours | Short active-session boost shared with party members |

Stacking draft:

| Active Boosts | Effective Boost Placeholder |
|---|---:|
| 1 solo seal | +100% |
| Solo seal + solo scroll | +175% |
| Party boost active | +225% |
| Party seal plus party scroll | +250% |

Stacking rule:

- Stacked boosts use diminishing returns.
- Fine print must explain that adding more boosts reduces the extra boost gained from
  each additional item.
- Cap the total boost so players cannot create extreme 400%+ progression states.
- Party boosts can affect EXP and loot chances only within strict economy limits.

Open tuning questions:

- Whether boosts affect combat EXP, life-skill EXP, drop rate, or only some of them.
- Whether loot boosts apply to rare items or only common/material drops.
- Whether party boosts require proximity, active participation, or contribution checks.

## Pets

Pets are convenience and identity systems, not combat power sales.

Baseline:

- No pet means players can manually loot.
- Manual loot should not require annoying repeated input forever; it should be acceptable,
  but slower than having the right convenience pet.

Earnable non-loot pets:

- Bear: defensive fantasy, presence, possible non-power utility.
- Hawk: scouting fantasy, visibility or awareness utility.

Paid or premium convenience pet concepts:

- Loot companion: auto-pickup convenience.
- Monkey-like companion: faster pickup/range or better pickup priority.
- Durability/repair companion: durability warnings or field-repair support.
- Storage-assist companion: helps prepare items for Storage Runner transfer.

Hard boundary:

- Paid pets must not sell direct combat power.
- Paid pets should not increase rare drop rate unless an earnable equivalent exists and the
  boost is tightly capped.
- Preferred paid value is pickup speed, pickup range, sorting, alerting, durability support,
  and style.

### Founder ruling, 2026-09-28: what every pet does, the roster, and the troll in the cart

Joshua gave the pet design in one message on 2026-09-28. Recorded here in his shape, with one judge note where it meets the hard boundary above.

**What every pet does.** Three things, the same for every pet in the roster:

- **Looter.** Picks up drops for the player (the GeminEYE pet in the slice already does this).
- **Weight boost.** More carry weight before the player slows.
- **A class-branded boost.** One number, identical for every pet and every class, wearing the label of the owner's class: melee attack for a melee class, magic attack for a caster, health for a defender, and so on. The label is branding; the size is the same.

**The only edge between players.** A pet gives its owner a ten percent advantage only against a player whose own pet is not out. Two players with pets out are even. The founder's number is a target and stays [PLACEHOLDER] until playtested.

> **Judge note and the founder's answer (2026-09-28).** The judge lane flagged that the class-branded boost and the ten percent edge are combat power, which the hard boundary in this file and the table in `docs/gdd/03-life-skills-economy.md` forbid selling. Joshua answered the same day, in his words: "Founder funding limited edition no play bonuses from 99 dollars pet skin of skins." So the wall stands unchanged. The looter, the weight boost, the class-branded boost and the ten percent edge belong to the pets every player can have without paying: earned through play or given at creation, per the table in `docs/gdd/03`. The paid special edition carries **no play bonus of any kind**; it is a skin, the skin of skins, sold once as a founder-funding limited edition.

**The roster.** Monkeys, lions, baby tigers, and a troll riding a drift cart as the special edition. Original creatures and an original cart; no other franchise's kart, character or voice is referenced in the game or in the copy (the cart is the founder's own drift cart from the governance lock in the README, always updated, always new).

**The troll in the cart, working name TrollinlootNScoot.** The founder-funding limited edition: a skin, the skin of skins, with no play bonus. It loots, carries and boosts exactly as the free pet does, no more. What the money buys is the character: voiced, interactive, and with a memory of its owner, which no other pet has; the memory runs through the Live NPC Lab on the named tier (T1), never on Claude CLI auth, which is Sup@'s alone. Its content is kept fresh with the founder's cart updates. The founder's number is 99 dollars, a [PLACEHOLDER] for the funding window, and it is a limited edition: sold during founder funding and not again.

**How it talks.** He loots and scoots, heckling mobs with dad jokes on the way. His running bit is the swerve:

- He starts a line that sounds as if it is heading somewhere dirty, then swerves: a dad joke, a "nah, trollin'", or he just goes quiet and keeps looting.
- Players eventually ask him to finish the joke. He stops the cart and answers in character, and the answer is another swerve. The founder's example: "Dirty joke? What is dirty? You make me loot and scoot all day. I'm guessing bedroom, bathroom, kitchen?" Dirty means housework. It never lands anywhere else.
- The bait lines play only for accounts in the age band the founder sets for them; younger accounts get straight dad jokes and the same silence. Every line is written and approved in the lab's language rules; the lab picks, times and remembers, it does not invent.

**Founder addendum, later on 2026-09-28: who buys the stat, what a skin is, pet death, and the six-month rule.**

- **The stat is bought with in-game currency, by everyone.** A pet with the three boosts above is a shop item priced in in-game currency, open to every player; the stat is the same on every pet, so no pet outranks another. The earnable path the table in `docs/gdd/03-life-skills-economy.md` requires still stands beside the shop.
- **Skins are cosmetic, everywhere.** Pet skins, character skins, armor skins, house skins and furniture skins change the look and nothing else. This is the lane the shop lives in.
- **Pets level, and the stat grows a little with them.** A pet gains levels with its owner and its boost rises by small steps as it does; the founder's shape is three steps, 5, 10 and 15, all [PLACEHOLDER]. The stat is never large, and every pet climbs the same steps, so a levelled pet outranks nobody who has levelled theirs. What the levels change is the cost of losing one: a fresh pet starts at the bottom of the steps, and that is the reason a revival is worth having.
- **Pets can die, and the player who lets it happen owns it.** A dead pet is the player's doing, not the game's. Revival tickets are close to free. The founder's limit is two revivals, three deaths at most, and then the pet is gone for good; he is between two and three and has not settled it. A paid revival past that limit exists as a cash item, the founder's number 20 dollars, [PLACEHOLDER] and undecided.
- **The six-month rule.** Every cash-shop skin becomes obtainable in-game six months after it goes on sale, no exceptions. Two things never do: the founder-funding limited edition pet above, and items tied to a limited event.

What this addendum does not carry: the founder's reasons for wanting NEEDs bought, and any split of a cash item's price with an outside cause. Both are business matters and stay in his own records; the compliance wall in `AGENTS.md` and `memory/glossary.md` keeps them out of game-facing files.

## Storage And Market Runners

No fast travel means item logistics become meaningful. Convenience can exist without
removing world friction.

Use clean names:

- Storage Runner: sends one item or one small bundle to storage.
- Market Runner: buys, lists, or retrieves one marketplace item.

Do not use real-world brand names for these systems.

Draft rules:

- Runners are purchased convenience.
- More than one Runner can be owned.
- Each Runner handles one transaction at a time.
- Cooldowns, travel time, or charges can tune value without breaking world friction.
- Market Runner can buy or list a rare item while the player remains in the field.
- Storage Runner can send items to storage so long sessions do not require fast travel.
- Runners should not teleport the player, bypass dangerous travel, or move unlimited cargo.

Open tuning questions:

- Whether Runners are reusable cooldown items, consumables, or account services.
- Whether Runners can be earned in-game at lower efficiency.
- Whether market listings require city tax, runner fee, or distance fee.
- Whether Storage Runner supports stack size limits by item rarity or weight.

## Marketplace

Marketplace is required for a no-fast-travel economy.

Core marketplace needs:

- Player listings.
- Buy orders.
- Price history.
- Item category filters.
- Listing tax or fee.
- Anti-duplication audit trail.
- Suspicious trade detection.
- Runner-compatible transaction locks.

Risk rules:

- No player-to-player direct real-money trading.
- No uncontrolled item duplication.
- No unlimited remote trading without cost.
- No paid item that guarantees market dominance.

## Prototype Acceptance

The first implementation can be data-only:

- Day/night state object.
- XP modifier table.
- death penalty function draft.
- boost stacking function draft.
- pet capability table.
- runner transaction contract.
- marketplace item listing schema.

Do not implement paid checkout until platform, account, and legal direction are explicit.
