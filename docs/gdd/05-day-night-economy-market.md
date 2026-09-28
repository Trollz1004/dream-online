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

- **The stat is never sold; the pet that carries it can be bought sooner.** Every character has a pet with the three boosts above without paying anything: given at creation or earned through play, as the table in `docs/gdd/03-life-skills-economy.md` requires. A pet is also a shop item in NEEDs, open to every player, and it is the same pet with the same stat, no more. What the shop sells is the time and the play a player skips to have that pet now, which is the convenience lane this file allows, and the choice of creature. Because the identical stat is free to everyone, no purchase ever holds a stat that a non-paying player cannot hold, and the hard boundary above stands: no paid pet outranks a free one, in combat or anywhere.
- **Skins are cosmetic, everywhere.** Pet skins, character skins, armor skins, house skins and furniture skins change the look and nothing else. This is the lane the shop lives in.
- **Pets level, and the stat grows a little with them.** A pet gains levels with its owner and its boost rises by small steps as it does; the founder's shape is three steps, 5, 10 and 15, all [PLACEHOLDER]. The stat is never large, and every pet climbs the same steps, so a levelled pet outranks nobody who has levelled theirs. What the levels change is the cost of losing one: a fresh pet starts at the bottom of the steps, and that is the reason a revival is worth having.
- **Pets can die, and the player who lets it happen owns it.** A dead pet is the player's doing, not the game's. Revival tickets are close to free and a pet gets two of them. Ruled 2026-09-28, later: **two revivals, then the third death is permanent**, and the only way back from the third death is the paid raise-the-dead item, the founder's number 20 dollars, [PLACEHOLDER]. Its price is set by the maths, not by mood: it has to cost more than a new pet plus the play it takes to climb the levels again, or nobody would ever start over, and it has to stay short of feeling like a trap, because the death was the player's own doing and the raise is a way back, not a toll. This supersedes the older line in `docs/DREAM-MASTER-DIRECTIVE.md` (section 17) and the doctrine dispatch that said to avoid permanent destruction of a paid pet; both carry a reconciliation note pointing here. What is never destroyed is the purchase: a skin, the founder-funding troll included, is cosmetic and moves to the player's next pet, and the stat pet itself is free to every character, so a permanent death costs the player the levels and the creature, never the money.
- **Feeding, ruled 2026-09-28.** Pets need feeding, and feeding is where the shop sells attention and nothing else. A player can feed a pet by hand at any time with in-game feed, and a player who feeds attentively, on the shorter hand-feeding cycle, keeps the pet in better condition than the paid feed ever does. The paid feed is an auto-feeder: it feeds for a long duration, closes the hunger timer the instant it fires and never lets it run near the top, and its tiers differ only in duration. It gives no level speed, no time boost and no stat; it buys not having to remember. The maths is deliberate: hand-feeding on the shorter cycle beats the auto-feeder's longer cycle, so the attentive player is never behind the paying one. The exact cycle lengths and feed values are tuning and stay in the private tuning sheet, not this file. Two rules for the copy: the game never states the comparison (players work it out, which is the point), and the game never mocks either choice; nothing in the interface, the shop or an NPC's mouth talks down to a player for buying the feeder or for not buying it.
- **The raise, priced (founder, later on 2026-09-28, corrected by him the same night).** The raise-the-dead item brings back the same pet, at the same level, with the same feed state: the player buys back exactly what was lost. That is the whole reason it is worth paying for; a fresh pet at level 1 is cheap in-game currency and nobody would pay 20 for one. The price is about an in-game pet plus the value of the dead pet's levels, which is why it is set by the maths and rises with what the levels are worth in play time. The judge lane first read his words as a level-1 restart and he corrected it at once; this is the ruling.
- **Levelling is slow, and levels are mostly animations.** Pet levels come very slowly. What a level adds, beyond the small stat step above, is animation: new idles, new reactions, and interaction with other pets, which is the only interaction an ordinary pet has. The troll in the cart is the exception: from day one it interacts with players, mobs and Sup@, and its chatter is visible to everyone in the area when it talks to Sup@.
- **Revival events.** When the game's own numbers show many dead pets registered, a revival event can run. In it a dead pet comes back with its skin and one level added, once per account. The event's higher packages (the founder's tier 2 and 3) bundle a skin with a separately named revival entitlement, or with the matching pet; the entitlement is the package's, never the skin's, and the skin itself stays cosmetic as ruled above. What triggers the event and who it is run with are business matters and stay outside this file.
- **The troll's chatter.** Always in good fun, never negative, with one slow exception: over long play he lets slip small hints about negative energy he "heard" somewhere, on the in-world gossip feeds he follows (the founder's working names for those feeds are parodies of real platforms and need an originality pass before any of them ships), which he then explains away with a tall story, a backfiring cart, or a song. He likes to sing, badly and happily, and hopes Sup@ will sing with him one day. These are short skits for players who are hours into a grind: the little things, said to no one in particular. What the hints point at is vault material, and the rule for every line (founder, later on 2026-09-28) is that a hint is never a confirmation: gossip stays gossip, a song stays a song, and Sup@ singing along confirms nothing either. No line the troll speaks, and no reaction from Sup@, states as fact anything the vault holds.
- **Sunny Ledger (working name, ruled 2026-09-28).** A market NPC who deals in rare items on a karma basis: what he has, and whether he has it for you, depends on your karma, and he trades only at sunrise and sunset. He honours checks written in invisible ink, an in-world joke and nothing more; no line of his refers to real money, receipts or anything outside the game. He is bright enough that his father calls him sun. Numbers and the karma table are [PLACEHOLDER].
- **Younger accounts (ruled 2026-09-28).** Everything the troll does is extra clean for kids. Above the founder's age band he drinks Trollz Near Beer, non-alcoholic; below it he drinks milk, acts silly, and blames it on being star-struck because Sup@ is around, or so he thinks. The swerve bit and the bait lines never play for younger accounts, as ruled above.
- **The six-month rule.** Every cash-shop skin becomes obtainable in-game six months after it goes on sale, with exactly two exclusions that never become obtainable in-game: the founder-funding limited edition pet above, and items tied to a limited event. Nothing else is excluded.

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
