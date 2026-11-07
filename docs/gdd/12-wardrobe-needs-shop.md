# Wardrobe and the NEEDs shop

Status: founder ruling, 2026-11-03

The wardrobe is the NEEDs shop. The character creator shapes a body only and everyone leaves it in kid-safe basics (`docs/gdd/07-character-creation.md`); every outfit comes from here.

## Rules

- **Bought is owned.** A skin a player buys stays theirs.
- **Skins never expire.** No rental, no season lock, no timed loss.
- **Every skin reaches the in-game currency store.** A few months after release, each skin can be earned with in-game currency through play. The lore bible's Six-Month Cosmetic Rule (`docs/gdd/canon-lore-inhouse.md`) sets the current figure.
- **One exception: TrollinlootNScoot, the founder pet.** It never reaches the in-game currency store.
- **Free to all.** The game is free for everyone, including players who cannot pay anything.
- **Cosmetics and convenience only.** The shop sells how things look and how much walking and attention they save.
- **Pay-to-win never.** Nothing in the shop sells combat power, and nothing in the shop is a loot box or a gamble.

## The rules as code

The rules above live in a pure module with no UI: `src/game/economy/wardrobe/`. Tests: `tests/wardrobe-rules.test.ts`.

- **Bought is owned, never expires.** An owned-skin record is `skinId`, `acquiredAt`, `channel` and nothing else. The types have no end date and no rental state, the module has no function that removes or reverses an acquisition, and stored data with any extra field is refused. A test scans the module source for expiry and rental wording.
- **Store release delay: 6 months by default.** Each skin carries a first-sale date and reaches the in-game currency store that many calendar months later (a day past month end clamps to the last day). **Josh can change the number:** edit `DEFAULT_CURRENCY_STORE_DELAY_MONTHS` in `src/game/economy/wardrobe/config.ts` (one line, whole months, 0 to 120), or pass `createWardrobeConfig({ currencyStoreDelayMonths: n })`. The module reads no environment value.
- **The one exception: `TrollinlootNScoot`.** It is in `CURRENCY_STORE_EXCLUDED_IDS` and never reaches the currency store under any date or delay. It is still a normal NEEDs-shop purchase and, once bought, owned forever. Tests hard-code the id and the count of one, so removing the exception fails the build.
- **The stat rule in code.** Items carry stats at the same percentage per tier on their catalogue entry (choice, never how much; everything sold for cash is also earnable in game; nothing buys power), while raw `Skin` and `ConvenienceItem` records carry no ad-hoc stat field. The types reject one at compile time (`npm run lint`), the builders `defineSkin` and `defineConvenienceItem` reject it even from a variable, and the runtime validator accepts only the exact allowed field names.
- **Kid-safe basics.** `KID_SAFE_BASICS` (top, bottom, shoes) is the one default set. The creator's exit test imports `isKidSafeBasicsOutfit` and `createDefaultOutfit` from the module. Basics are never sold, and no shop item may reuse a basic id.

> Open question for Josh or the judge lane: the lore bible's Six-Month Cosmetic Rule (`docs/gdd/canon-lore-inhouse.md`) still says 6 months, while the module default is 3 months as ordered for this recipe. The lore file was not touched here. Pick one figure and align the two.

## Where this connects

- `docs/gdd/03-life-skills-economy.md`: how Sols and NEEDs are earned and spent.
- `docs/gdd/canon-lore-inhouse.md`: the Six-Month Cosmetic Rule and the pet rules.
- `docs/gdd/07-character-creation.md`: the body-only creator.
