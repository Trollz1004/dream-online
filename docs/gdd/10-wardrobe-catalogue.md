# Wardrobe Catalogue — Wave One

Status: ruled by Josh 2026-11-05 (NEEDs Shop v1.1 design sheet)
Audience: Codex, Claude, Gemini, game designers, UI engineers

Wave one items for the DREAM Online wardrobe. The wardrobe is the NEEDs shop (`docs/gdd/12-wardrobe-needs-shop.md`).
The character creator shapes a body only and everyone leaves it in kid-safe basics (`docs/gdd/07-character-creation.md`).
All skins are looks only, never numbers or stats. Prices are `[YOUR PRICE]` placeholders until Josh says finalize.

## Core Rules

1. **Bought is owned.** A skin a player acquires stays theirs forever. No rental, no season lock, no expiration.
2. **Looks only, never numbers.** No skin carries any stat, boost, or combat attribute.
3. **Six-Month Currency Store Release.** Items sold through the Square store reach the in-game coin store (Sols / in-game currency) after 6 months (May 2027 for Wave One).
4. **The Founder Pet Exception.** `TrollinlootNScoot` is the one skin that never reaches the coin store.
5. **Blu's Tee Currency Rule.** Blu's Tee is bought with Blue Charge only; it is never sold in the coin store or the Square store.
6. **Kid-Safe Basics.** Always owned by every character, never sold.

---

## Wave One Items

| Item Name | ID | Kind | Slot | How Earned | Coin Store Release | Price | Note |
|---|---|---|---|---|---|---|---|
| **Zebra Fish Scale Hat** | `afk-fishing-hat` | skin | headwear | Square | May 2027 | [YOUR PRICE] | AFK Fishing Set in zebra fish scale (piece 1 of 4). Look only. |
| **Zebra Fish Scale Vest** | `afk-fishing-top` | skin | top | Square | May 2027 | [YOUR PRICE] | AFK Fishing Set in zebra fish scale (piece 2 of 4). Look only. |
| **Zebra Fish Scale Waders** | `afk-fishing-bottom` | skin | bottom | Square | May 2027 | [YOUR PRICE] | AFK Fishing Set in zebra fish scale (piece 3 of 4). Look only. |
| **Zebra Fish Scale Boots** | `afk-fishing-shoes` | skin | shoes | Square | May 2027 | [YOUR PRICE] | AFK Fishing Set in zebra fish scale (piece 4 of 4). Look only. |
| **Team Blue Baseball Cap** | `team-blue-baseball-cap` | skin | headwear | Square | May 2027 | [YOUR PRICE] | Team Blue Baseball Uniform (piece 1 of 4). Number 00 to 99 at purchase. |
| **Team Blue Baseball Jersey** | `team-blue-baseball-jersey` | skin | top | Square | May 2027 | [YOUR PRICE] | Team Blue Baseball Uniform (piece 2 of 4). Number 00 to 99 at purchase. |
| **Team Blue Baseball Pants** | `team-blue-baseball-pants` | skin | bottom | Square | May 2027 | [YOUR PRICE] | Team Blue Baseball Uniform (piece 3 of 4). Number 00 to 99 at purchase. |
| **Team Blue Cleats** | `team-blue-baseball-cleats` | skin | shoes | Square | May 2027 | [YOUR PRICE] | Team Blue Baseball Uniform (piece 4 of 4). Number 00 to 99 at purchase. |
| **Team Blue Ash Bat** | `team-blue-ash-bat` | skin | weapon | Square | May 2027 | [YOUR PRICE] | Weapon skin for any one-handed blunt weapon. Look only, never numbers. |
| **Team Blue Alloy Bat** | `team-blue-alloy-bat` | skin | weapon | Square | May 2027 | [YOUR PRICE] | Weapon skin for any one-handed blunt weapon. Look only, never numbers. |
| **Plastic T-Ball Bat** | `plastic-t-ball-bat` | skin | weapon | Square | May 2027 | [YOUR PRICE] | Weapon skin for any one-handed blunt weapon. Look only, never numbers. |
| **Blu's Tee** | `blus-pet-tee` | skin | pet | Blue Charge | Never | [YOUR PRICE] | Oversized white pet tee printed "You're my boy blue!!!". Bought with Blue Charge only, never in the coin or Square store. |
| **TrollinlootNScoot** | `TrollinlootNScoot` | skin | pet | Square | Never | [YOUR PRICE] | Founder pet; troll riding a drift cart with Live NPC memory and clean dad jokes. Never in the coin store. |
| **Plain Tee** | `basics-top` | basic | top | Always owned | Never (not sold) | Free / Owned | Kid-safe basics default set. Plain tee, always owned. |
| **Plain Trousers** | `basics-bottom` | basic | bottom | Always owned | Never (not sold) | Free / Owned | Kid-safe basics default set. Plain trousers, always owned. |
| **Plain Sneakers** | `basics-shoes` | basic | shoes | Always owned | Never (not sold) | Free / Owned | Kid-safe basics default set. Plain sneakers, always owned. |

---

## Detailed Notes by Item Group

### 1. AFK Fishing Set in zebra fish scale
- **Pieces (4):** Hat (`afk-fishing-hat`), Vest (`afk-fishing-top`), Waders (`afk-fishing-bottom`), Boots (`afk-fishing-shoes`).
- **How Earned:** Square (NEEDs shop purchase).
- **Coin Store:** Reaches in-game coin store in May 2027 (6 months from release).
- **Rule:** Pure visual appearance; carries zero fishing yield or AFK speed boost.

### 2. Team Blue Baseball Uniform
- **Pieces (4):** Cap (`team-blue-baseball-cap`), Jersey (`team-blue-baseball-jersey`), Pants (`team-blue-baseball-pants`), Cleats (`team-blue-baseball-cleats`).
- **How Earned:** Square (NEEDs shop purchase).
- **Coin Store:** Reaches in-game coin store in May 2027.
- **Customization:** Player chooses a two-digit jersey number (00 to 99) at time of purchase.

### 3. Team Blue Blunt Weapon Skins
- **Pieces (3):** Team Blue Ash Bat (`team-blue-ash-bat`), Team Blue Alloy Bat (`team-blue-alloy-bat`), Plastic T-Ball Bat (`plastic-t-ball-bat`).
- **How Earned:** Square (NEEDs shop purchase).
- **Coin Store:** Reaches in-game coin store in May 2027.
- **Rule:** Compatible as cosmetic overlays for any one-handed blunt weapon (hammer, club, mace). Looks only, never numbers or combat stats.

### 4. Blu's Tee
- **Piece (1):** Blu's Tee (`blus-pet-tee`).
- **Visual:** Oversized white pet tee printed "You're my boy blue!!!".
- **How Earned:** Bought with Blue Charge only. Blue Charge is the one-off currency shed as sparks during encounters with Blu, the boss of bosses (`docs/gdd/canon-lore-inhouse.md`).
- **Rule:** Never in the coin store; never in the Square store. Cannot be purchased with coins or real-world money.

### 5. TrollinlootNScoot (Founder Pet)
- **Piece (1):** TrollinlootNScoot (`TrollinlootNScoot`).
- **Visual & AI:** Troll riding an original drift cart, T1 Live NPC memory, clean dad jokes.
- **How Earned:** Square (founder-funding limited edition in NEEDs shop).
- **Rule:** Never in the coin store. The sole permanent exception to the six-month currency store rule.

### 6. Kid-Safe Basics
- **Pieces (3):** Plain Tee (`basics-top`), Plain Trousers (`basics-bottom`), Plain Sneakers (`basics-shoes`).
- **Rule:** Always owned by every character upon exit from character creation. Free, cannot be deleted or unequipped without replacement, never sold in the shop or coin store.

---

## System Connections

- `docs/gdd/canon-lore-inhouse.md`: Blu boss entry, Six-Month Cosmetic Rule, and TrollinlootNScoot lore.
- `docs/gdd/07-character-creation.md`: Body-only character creation and kid-safe basics default set.
- `docs/gdd/12-wardrobe-needs-shop.md`: Core rules for ownership, release schedules, and pay-to-win guard.
- `src/game/economy/wardrobe/`: Programmatic definitions, validation rules, and automated tests.
