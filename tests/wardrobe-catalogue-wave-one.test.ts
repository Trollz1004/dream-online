/**
 * Wardrobe catalogue Wave One tests.
 * Ruled by Josh 2026-11-05 (NEEDs Shop v1.1 design sheet).
 * Docs: docs/gdd/10-wardrobe-catalogue.md and docs/gdd/12-wardrobe-needs-shop.md.
 *
 * Mandatory verifications:
 *  1. Blu's Tee cannot be bought with coins or money (Blue Charge only).
 *  2. TrollinlootNScoot (the founder pet) never enters the currency store.
 *  3. The stat rule (docs/gdd/GAME-SYSTEMS-RULING-2026-11-07.md), two tests:
 *     every item in a tier carries the same percentage as every other item in that tier, and
 *     every cash-sold item has an in-game acquisition path (coins or craft) recorded on it.
 *  4. Catalogue schema integrity and release dates (May 2027 for Square skins).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AFK_FISHING_BOTTOM,
  AFK_FISHING_HAT,
  AFK_FISHING_SHOES,
  AFK_FISHING_TOP,
  BLUS_PET_TEE,
  BLUS_PET_TEE_ID,
  CHEFS_HAT,
  COOKING_APRON,
  CURRENCY_STORE_EXCLUDED_IDS,
  FOUNDER_PET_SKIN_ID,
  KID_SAFE_BASICS,
  KID_SAFE_BASIC_IDS,
  PLASTIC_T_BALL_BAT,
  TEAM_BLUE_ALLOY_BAT,
  TEAM_BLUE_ASH_BAT,
  TEAM_BLUE_BASEBALL_CAP,
  TEAM_BLUE_BASEBALL_CLEATS,
  TEAM_BLUE_BASEBALL_JERSEY,
  TEAM_BLUE_BASEBALL_PANTS,
  TIER_PERCENT_PLACEHOLDER,
  WardrobeRuleError,
  WAVE_ONE_CATALOGUE,
  WAVE_ONE_FOUNDER_PET,
  acquireSkin,
  canBuyWithCoins,
  canBuyWithMoney,
  createWardrobe,
  createWardrobeConfig,
  currencyStoreReleaseDate,
  defineSkin,
  getCatalogueEntry,
  isBlueChargeOnly,
  isCurrencyStoreExcluded,
  isInCurrencyStore,
  listCurrencyStore,
  ownsSkin,
  validateCatalog,
  type WaveOneCatalogueEntry,
} from '../src/game/economy/wardrobe/index.ts';

const day = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

// ---------------------------------------------------------------- 1. Blu's Tee
test("Blu's Tee: cannot be bought with coins or money (Blue Charge only)", () => {
  // Query helper checks
  assert.equal(isBlueChargeOnly(BLUS_PET_TEE_ID), true);
  assert.equal(isBlueChargeOnly('blus-pet-tee'), true);
  assert.equal(isBlueChargeOnly('BLUS-PET-TEE'), true);
  assert.equal(canBuyWithCoins(BLUS_PET_TEE_ID), false);
  assert.equal(canBuyWithMoney(BLUS_PET_TEE_ID), false);

  // Even far into the future, coins cannot buy Blu's Tee
  for (const futureDate of ['2026-11-05', '2027-05-05', '2030-01-01', '2999-12-31']) {
    assert.equal(canBuyWithCoins(BLUS_PET_TEE_ID, day(futureDate)), false);
  }

  // Attempting to acquire Blu's Tee via standard shop doors is strictly refused
  const w0 = createWardrobe('player-blue');
  const onSaleDay = day('2026-11-05');
  const futureDay = day('2030-01-01');

  // Door 1: NEEDs shop (money / Square checkout)
  const moneyAttempt = acquireSkin(w0, BLUS_PET_TEE, 'needs-shop', onSaleDay);
  assert.deepEqual(moneyAttempt, { ok: false, reason: 'blu-tee-never-in-shop' });
  assert.equal(ownsSkin(w0, BLUS_PET_TEE_ID), false);

  // Door 2: In-game currency store (coins / Sols)
  const coinsAttempt = acquireSkin(w0, BLUS_PET_TEE, 'currency-store', futureDay);
  assert.deepEqual(coinsAttempt, { ok: false, reason: 'blu-tee-never-in-shop' });
  assert.equal(ownsSkin(w0, BLUS_PET_TEE_ID), false);

  // Catalogue metadata verification
  const entry = getCatalogueEntry(BLUS_PET_TEE_ID);
  assert.ok(entry);
  assert.equal(entry.howEarned, 'Blue Charge');
  assert.equal(entry.coinStoreRelease, 'Never');
  assert.match(entry.note, /bought with blue charge only/i);
  assert.match(entry.note, /never in the coin or square store/i);
});

// ---------------------------------------------------------------- 2. Founder Pet
test('Founder Pet (TrollinlootNScoot): never enters the currency store', () => {
  // Exception list & queries
  assert.equal(isCurrencyStoreExcluded(FOUNDER_PET_SKIN_ID), true);
  assert.equal(isCurrencyStoreExcluded('trollinlootnscoot'), true);
  assert.equal(isCurrencyStoreExcluded('TROLLINLOOTNSCOOT'), true);
  assert.equal(canBuyWithCoins(FOUNDER_PET_SKIN_ID), false);

  // Coin store release is permanently null
  assert.equal(currencyStoreReleaseDate(WAVE_ONE_FOUNDER_PET), null);
  for (const config of [
    createWardrobeConfig({ currencyStoreDelayMonths: 0 }),
    createWardrobeConfig({ currencyStoreDelayMonths: 6 }),
    createWardrobeConfig({ currencyStoreDelayMonths: 120 }),
  ]) {
    assert.equal(currencyStoreReleaseDate(WAVE_ONE_FOUNDER_PET, config), null);
    assert.equal(isInCurrencyStore(WAVE_ONE_FOUNDER_PET, day('2999-12-31'), config), false);
    assert.deepEqual(listCurrencyStore([WAVE_ONE_FOUNDER_PET], day('2999-12-31'), config), []);
  }

  // Acquisition via currency store is refused permanently
  const w0 = createWardrobe('player-troll');
  const coinAttempt = acquireSkin(w0, WAVE_ONE_FOUNDER_PET, 'currency-store', day('2999-12-31'));
  assert.deepEqual(coinAttempt, { ok: false, reason: 'founder-pet-never-in-currency-store' });

  // But founder pet CAN still be acquired through NEEDs shop (money/Square founder funding)
  assert.equal(canBuyWithMoney(FOUNDER_PET_SKIN_ID), true);
  const moneyBuy = acquireSkin(w0, WAVE_ONE_FOUNDER_PET, 'needs-shop', day('2026-11-05'));
  assert.equal(moneyBuy.ok, true);
  if (moneyBuy.ok) {
    assert.equal(ownsSkin(moneyBuy.wardrobe, FOUNDER_PET_SKIN_ID), true);
  }

  // Catalogue entry verification
  const entry = getCatalogueEntry(FOUNDER_PET_SKIN_ID);
  assert.ok(entry);
  assert.equal(entry.howEarned, 'Square');
  assert.equal(entry.coinStoreRelease, 'Never');
  assert.match(entry.note, /never in the coin store/i);
});

// ---------------------------------------------------------------- 3. The stat rule: same percentage per tier
/** Names every tier whose items do not all carry the same percentage as the first item of the tier. */
function tierPercentViolations(entries: readonly WaveOneCatalogueEntry[]): string[] {
  const firstSeen = new Map<string, { id: string; percent: number | string }>();
  const violations: string[] = [];
  for (const entry of entries) {
    if (entry.tier === null) continue;
    if (entry.bonus === null) {
      violations.push(`${entry.id}: tier "${entry.tier}" but no bonus recorded`);
      continue;
    }
    const first = firstSeen.get(entry.tier);
    if (!first) {
      firstSeen.set(entry.tier, { id: entry.id, percent: entry.bonus.percent });
    } else if (first.percent !== entry.bonus.percent) {
      violations.push(
        `tier "${entry.tier}": ${entry.id} carries ${entry.bonus.percent} but ${first.id} carries ${first.percent}`,
      );
    }
  }
  return violations;
}

test('Stat rule: every item in a tier carries the same percentage as every other item in that tier', () => {
  assert.deepEqual(tierPercentViolations(WAVE_ONE_CATALOGUE), []);

  const byTier = new Map<string, WaveOneCatalogueEntry[]>();
  for (const entry of WAVE_ONE_CATALOGUE) {
    if (entry.tier === null) continue;
    byTier.set(entry.tier, [...(byTier.get(entry.tier) ?? []), entry]);
  }
  assert.deepEqual([...byTier.keys()].sort(), ['cooking', 'fishing-set', 'hat', 'team-blue']);

  // Ruled percentages (docs/gdd/GAME-SYSTEMS-RULING-2026-11-07.md).
  for (const hat of [AFK_FISHING_HAT, CHEFS_HAT, TEAM_BLUE_BASEBALL_CAP]) {
    assert.equal(getCatalogueEntry(hat.id)?.bonus?.percent, 10, `${hat.id}: any hat is 10 percent`);
  }
  for (const piece of [AFK_FISHING_TOP, AFK_FISHING_BOTTOM, AFK_FISHING_SHOES]) {
    assert.deepEqual(getCatalogueEntry(piece.id)?.bonus, { stat: 'fishing-experience', percent: 10 });
  }
  assert.deepEqual(getCatalogueEntry(AFK_FISHING_HAT.id)?.bonus, { stat: 'fishing-experience', percent: 10 });
  assert.deepEqual(getCatalogueEntry(COOKING_APRON.id)?.bonus, { stat: 'cooking-experience', percent: 10 });
  assert.deepEqual(getCatalogueEntry(CHEFS_HAT.id)?.bonus, { stat: 'cooking-experience', percent: 10 });
  assert.deepEqual(getCatalogueEntry(TEAM_BLUE_BASEBALL_CAP.id)?.bonus, { stat: 'experience', percent: 10 });

  // Team Blue pieces and the bat skins share one tier percentage, still Josh's placeholder.
  const teamBlue = byTier.get('team-blue') ?? [];
  assert.equal(teamBlue.length, 6, 'jersey, pants, cleats and three bats');
  for (const entry of teamBlue) {
    assert.equal(entry.bonus?.percent, TIER_PERCENT_PLACEHOLDER, `${entry.id} uses the [TIER %] placeholder`);
  }

  // Apron and chef's hat are both for any body.
  for (const id of [COOKING_APRON.id, CHEFS_HAT.id]) {
    assert.match(getCatalogueEntry(id)?.note ?? '', /any body/i);
  }

  // Blu's Tee and the founder pet are cosmetic only and say so.
  for (const id of [BLUS_PET_TEE_ID, FOUNDER_PET_SKIN_ID]) {
    const entry = getCatalogueEntry(id);
    assert.ok(entry);
    assert.equal(entry.tier, null);
    assert.equal(entry.bonus, null);
    assert.match(entry.note, /cosmetic only/i);
  }

  // A different number inside a tier fails the check.
  const tampered = WAVE_ONE_CATALOGUE.map((entry) =>
    entry.id === CHEFS_HAT.id && entry.bonus
      ? { ...entry, bonus: { ...entry.bonus, percent: 11 } }
      : entry,
  );
  assert.equal(tierPercentViolations(tampered).length > 0, true, 'an 11 percent chef hat must fail');
  const tamperedPlaceholder = WAVE_ONE_CATALOGUE.map((entry) =>
    entry.id === TEAM_BLUE_ASH_BAT.id && entry.bonus ? { ...entry, bonus: { ...entry.bonus, percent: 12 } } : entry,
  );
  assert.equal(tierPercentViolations(tamperedPlaceholder).length > 0, true, 'a 12 percent bat must fail');

  // Kid-safe basics are the plain default look and sit in no tier.
  for (const slot of ['top', 'bottom', 'shoes'] as const) {
    const entry = getCatalogueEntry(KID_SAFE_BASICS[slot].id);
    assert.equal(entry?.tier, null);
    assert.equal(entry?.bonus, null);
  }
});

// ---------------------------------------------------------------- 3b. The stat rule: earnable in game
test('Stat rule: every cash-sold item has an in-game acquisition path recorded on it', () => {
  const cashSold = WAVE_ONE_CATALOGUE.filter((e) => canBuyWithMoney(e.id));
  assert.equal(cashSold.length, 14, '13 Square skins plus the founder pet are sold for cash');

  const exceptions: string[] = [];
  for (const entry of cashSold) {
    if (entry.inGamePath === 'founder-exception') {
      exceptions.push(entry.id);
      continue;
    }
    assert.ok(
      entry.inGamePath === 'coins' || entry.inGamePath === 'craft',
      `${entry.id} is sold for cash and must record a coins or craft path, got "${entry.inGamePath}"`,
    );
    if (entry.inGamePath === 'coins') {
      // The recorded path is real: the coin store opens on the release date and not before.
      assert.equal(canBuyWithCoins(entry.id, day('2027-05-04')), false, `${entry.id} before release`);
      assert.equal(canBuyWithCoins(entry.id, day('2027-05-05')), true, `${entry.id} on release`);
    }
  }
  // The founder pet is the one recorded exception, and the currency-store rule still holds for it.
  assert.deepEqual(exceptions, [FOUNDER_PET_SKIN_ID]);
  assert.equal(canBuyWithCoins(FOUNDER_PET_SKIN_ID, day('2999-12-31')), false);

  // Items not sold for cash record the door they do use.
  assert.equal(getCatalogueEntry(BLUS_PET_TEE_ID)?.inGamePath, 'blue-charge');
  for (const basicId of KID_SAFE_BASIC_IDS) {
    assert.equal(getCatalogueEntry(basicId)?.inGamePath, 'always-owned');
  }

  // A cash-sold item with no recorded path is caught.
  const stripped = cashSold.map((e) => (e.id === CHEFS_HAT.id ? { ...e, inGamePath: 'always-owned' as const } : e));
  const missing = stripped.filter(
    (e) => e.inGamePath !== 'coins' && e.inGamePath !== 'craft' && e.inGamePath !== 'founder-exception',
  );
  assert.deepEqual(missing.map((e) => e.id), [CHEFS_HAT.id]);
});

// ---------------------------------------------------------------- 4. Catalogue integrity
test('Wave One catalogue: completeness, 6-month release, and [YOUR PRICE] placeholders', () => {
  // Entire catalogue has 18 items: 4 fishing, 2 cooking, 4 baseball, 3 bats, 1 tee, 1 pet, 3 basics
  assert.equal(WAVE_ONE_CATALOGUE.length, 18);

  // No duplicate IDs
  const ids = WAVE_ONE_CATALOGUE.map((e) => e.id.toLowerCase());
  assert.equal(new Set(ids).size, 18, 'all 18 IDs must be unique');

  // Validate catalog with validateCatalog for all skins
  const skinsOnly = WAVE_ONE_CATALOGUE.filter((e) => e.kind === 'skin').map((e) => e.item);
  const catalogCheck = validateCatalog(skinsOnly);
  assert.equal(catalogCheck.ok, true, `catalogCheck: ${catalogCheck.errors.join('; ')}`);

  // Square skins release in coin store in May 2027 (firstSaleDate 2026-11-05 + 6 months = 2027-05-05)
  const squareWaveOneSkins = [
    AFK_FISHING_HAT,
    AFK_FISHING_TOP,
    AFK_FISHING_BOTTOM,
    AFK_FISHING_SHOES,
    COOKING_APRON,
    CHEFS_HAT,
    TEAM_BLUE_BASEBALL_CAP,
    TEAM_BLUE_BASEBALL_JERSEY,
    TEAM_BLUE_BASEBALL_PANTS,
    TEAM_BLUE_BASEBALL_CLEATS,
    TEAM_BLUE_ASH_BAT,
    TEAM_BLUE_ALLOY_BAT,
    PLASTIC_T_BALL_BAT,
  ];

  for (const skin of squareWaveOneSkins) {
    assert.equal(currencyStoreReleaseDate(skin), '2027-05-05');
    // Not in coin store on 2027-05-04
    assert.equal(canBuyWithCoins(skin.id, day('2027-05-04')), false);
    // In coin store on 2027-05-05 (May 2027)
    assert.equal(canBuyWithCoins(skin.id, day('2027-05-05')), true);
    assert.equal(canBuyWithMoney(skin.id), true);

    const entry = getCatalogueEntry(skin.id);
    assert.ok(entry);
    assert.equal(entry.coinStoreRelease, 'May 2027');
    assert.equal(entry.price, '[YOUR PRICE]');
  }

  // Kid-safe basics are always owned and never sold
  for (const basicId of KID_SAFE_BASIC_IDS) {
    assert.equal(canBuyWithCoins(basicId), false);
    assert.equal(canBuyWithMoney(basicId), false);
    const entry = getCatalogueEntry(basicId);
    assert.ok(entry);
    assert.equal(entry.howEarned, 'always owned');
    assert.equal(entry.coinStoreRelease, 'Never');
  }
});
