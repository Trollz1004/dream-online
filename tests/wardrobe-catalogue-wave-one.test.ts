/**
 * Wardrobe catalogue Wave One tests.
 * Ruled by Josh 2026-11-05 (NEEDs Shop v1.1 design sheet).
 * Docs: docs/gdd/10-wardrobe-catalogue.md and docs/gdd/12-wardrobe-needs-shop.md.
 *
 * Mandatory verifications:
 *  1. Blu's Tee cannot be bought with coins or money (Blue Charge only).
 *  2. TrollinlootNScoot (the founder pet) never enters the currency store.
 *  3. No skin carries a stat (pay-to-win guard, looks only, never numbers).
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
  CURRENCY_STORE_EXCLUDED_IDS,
  FOUNDER_PET_SKIN_ID,
  KID_SAFE_BASICS,
  KID_SAFE_BASIC_IDS,
  PLASTIC_T_BALL_BAT,
  SKIN_SLOTS,
  STAT_KEYS,
  TEAM_BLUE_ALLOY_BAT,
  TEAM_BLUE_ASH_BAT,
  TEAM_BLUE_BASEBALL_CAP,
  TEAM_BLUE_BASEBALL_CLEATS,
  TEAM_BLUE_BASEBALL_JERSEY,
  TEAM_BLUE_BASEBALL_PANTS,
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
  validateShopItem,
  type Skin,
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
  assert.match(entry.note, /never in the coin store or through the game's own square account/i);
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

// ---------------------------------------------------------------- 3. Pay-to-win guard
test('Pay-to-win guard: no skin in Wave One carries any stat', () => {
  const waveOneSkins: Skin[] = WAVE_ONE_CATALOGUE.filter(
    (e): e is WaveOneCatalogueEntry & { item: Skin } => e.kind === 'skin',
  ).map((e) => e.item);

  assert.equal(waveOneSkins.length, 13, '13 skins in Wave One');

  for (const skin of waveOneSkins) {
    // 1. Strict schema validation
    const validation = validateShopItem(skin);
    assert.equal(validation.ok, true, `${skin.id} must be a valid shop item: ${validation.errors.join('; ')}`);

    // 2. Exact allowed keys only: ['firstSaleDate', 'id', 'kind', 'name', 'slot']
    const keys = Object.keys(skin).sort();
    assert.deepEqual(
      keys,
      ['firstSaleDate', 'id', 'kind', 'name', 'slot'],
      `${skin.id} has unexpected keys: ${keys.join(', ')}`,
    );

    // 3. No stat keys present
    for (const stat of STAT_KEYS) {
      assert.equal(stat in skin, false, `${skin.id} must not contain stat key "${stat}"`);
    }

    // 4. Object is frozen
    assert.equal(Object.isFrozen(skin), true, `${skin.id} must be frozen`);
    assert.throws(
      () => {
        (skin as unknown as Record<string, unknown>).attack = 10;
      },
      TypeError,
      'cannot add stat to frozen skin',
    );

    // 5. Injected stat is rejected by validateShopItem
    for (const stat of ['attack', 'dmg', 'defense', 'hp', 'power', 'speed']) {
      const contaminated = { ...skin, [stat]: 50 };
      const res = validateShopItem(contaminated);
      assert.equal(res.ok, false, `injected ${stat} must fail`);
      assert.match(res.errors.join(' '), /stat/);
    }
  }

  // Weapon skins: look only, never numbers
  const weaponSkins = [TEAM_BLUE_ASH_BAT, TEAM_BLUE_ALLOY_BAT, PLASTIC_T_BALL_BAT];
  for (const bat of weaponSkins) {
    assert.equal(bat.slot, 'weapon');
    assert.equal(SKIN_SLOTS.includes('weapon'), true);
    const entry = getCatalogueEntry(bat.id);
    assert.ok(entry);
    assert.match(entry.note, /look only, never numbers/i);
  }

  // Kid-safe basics are the plain default look and carry no stat field
  for (const slot of ['top', 'bottom', 'shoes'] as const) {
    const basic = KID_SAFE_BASICS[slot];
    assert.deepEqual(Object.keys(basic).sort(), ['id', 'kind', 'name', 'slot']);
    for (const stat of STAT_KEYS) {
      assert.equal(stat in basic, false);
    }
  }
});

// ---------------------------------------------------------------- 4. Catalogue integrity
test('Wave One catalogue: completeness, 6-month release, and [YOUR PRICE] placeholders', () => {
  // Entire catalogue has 16 items: 4 fishing, 4 baseball, 3 bats, 1 tee, 1 pet, 3 basics
  assert.equal(WAVE_ONE_CATALOGUE.length, 16);

  // No duplicate IDs
  const ids = WAVE_ONE_CATALOGUE.map((e) => e.id.toLowerCase());
  assert.equal(new Set(ids).size, 16, 'all 16 IDs must be unique');

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
