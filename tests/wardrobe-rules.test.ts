/**
 * Wardrobe rules: tests for every rule in docs/gdd/12-wardrobe-needs-shop.md.
 *  1. Bought is owned, skins never expire.
 *  2. Store release after a configurable delay; TrollinlootNScoot never reaches the currency store.
 *  3. Pay-to-win guard: no stat field on any shop item.
 *  4. Kid-safe basics: the default set, defined once.
 *
 * The `@ts-expect-error` lines are compile-time proofs. `npm run lint` fails with
 * "Unused '@ts-expect-error' directive" if the type system ever stops forbidding them.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import * as wardrobeApi from '../src/game/economy/wardrobe/index.ts';
import {
  ACQUIRE_CHANNELS,
  BASIC_SLOTS,
  CURRENCY_STORE_EXCLUDED_IDS,
  DEFAULT_CURRENCY_STORE_DELAY_MONTHS,
  DEFAULT_WARDROBE_CONFIG,
  KID_SAFE_BASICS,
  KID_SAFE_BASIC_IDS,
  STAT_KEYS,
  WardrobeRuleError,
  acquireSkin,
  addMonthsUtc,
  createDefaultOutfit,
  createWardrobe,
  createWardrobeConfig,
  currencyStoreReleaseDate,
  defineConvenienceItem,
  defineSkin,
  isCurrencyStoreExcluded,
  isInCurrencyStore,
  isKidSafeBasicsOutfit,
  isOnNeedsShop,
  listCurrencyStore,
  ownsSkin,
  parseWardrobe,
  validateCatalog,
  validateShopItem,
  type OwnedSkin,
  type Skin,
  type Wardrobe,
} from '../src/game/economy/wardrobe/index.ts';

const day = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const sampleSkin = (id = 'moonlit-cloak', firstSaleDate = '2026-01-15'): Skin =>
  defineSkin({ id, name: 'Moonlit Cloak', slot: 'back', firstSaleDate });

/** Unwrap a successful acquire or fail the test. */
function mustAcquire(w: Wardrobe, skin: Skin, channel: 'needs-shop' | 'currency-store', now: Date): Wardrobe {
  const r = acquireSkin(w, skin, channel, now);
  assert.equal(r.ok, true, `expected ${skin.id} via ${channel} to succeed`);
  if (!r.ok) throw new Error('unreachable');
  return r.wardrobe;
}

// ---------------------------------------------------------------- 1. bought is owned

test('rule 1: a bought skin is owned, and owned has no clock', () => {
  const skin = sampleSkin();
  const w = mustAcquire(createWardrobe('acct-1'), skin, 'needs-shop', day('2026-02-01'));
  assert.equal(ownsSkin(w, skin.id), true);
  assert.equal(w.owned.length, 1);
  // ownsSkin takes (wardrobe, skinId) and nothing else: there is no "as of" date to expire against.
  assert.equal(ownsSkin.length, 2);
  assert.equal(ownsSkin(w, skin.id), true, 'still owned when asked again, years later');
});

test('rule 1: an owned record has exactly who/what/how/when and no end date or rental field', () => {
  const skin = sampleSkin();
  const w = mustAcquire(createWardrobe('acct-1'), skin, 'needs-shop', day('2026-02-01'));
  assert.deepEqual(Object.keys(w.owned[0]!).sort(), ['acquiredAt', 'channel', 'skinId']);
  assert.deepEqual(Object.keys(w).sort(), ['accountId', 'owned']);
  // Compile-time: the type has no end-date or rental field, so these cannot be written.
  // @ts-expect-error OwnedSkin has no end date field
  const _noEndDate: OwnedSkin = { skinId: 'a', acquiredAt: '2026-01-01T00:00:00Z', channel: 'needs-shop', endsAt: '2027-01-01' };
  // @ts-expect-error OwnedSkin has no rental flag
  const _noRental: OwnedSkin = { skinId: 'a', acquiredAt: '2026-01-01T00:00:00Z', channel: 'needs-shop', isRental: true };
  void _noEndDate;
  void _noRental;
});

test('rule 1: the module offers no way to take a skin away', () => {
  const taking = new Set(['remove', 'revoke', 'delete', 'expire', 'lapse', 'rent', 'lease', 'reclaim', 'forfeit', 'reverse', 'refund', 'strip']);
  const words = (name: string): string[] => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[\s_]+/);
  const offenders = Object.keys(wardrobeApi).filter((name) => words(name).some((w) => taking.has(w)));
  assert.deepEqual(offenders, [], 'no exported function may remove or end ownership');
});

test('rule 1: no expiry or rental wording exists in any wardrobe source identifier', () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/game/economy/wardrobe');
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
  assert.ok(files.length >= 6, 'expected the wardrobe module files');
  const banned = [
    /expir/i, /rental/i, /\brent/i, /\blease/i, /\bttl\b/i, /\btrial/i, /\blapse/i,
    /\btimed/i, /season/i, /\buntil\b/i, /\bborrow/i, /\bloan/i, /\bendsAt\b/i, /\bvalidUntil\b/i,
  ];
  for (const file of files) {
    const code = readFileSync(path.join(dir, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const re of banned) {
      assert.equal(re.test(code), false, `${file} contains banned expiry/rental wording ${re}`);
    }
  }
});

test('rule 1: acquiring twice is refused and never rewrites the original record', () => {
  const skin = sampleSkin();
  const first = mustAcquire(createWardrobe('acct-1'), skin, 'needs-shop', day('2026-02-01'));
  const again = acquireSkin(first, skin, 'needs-shop', day('2026-09-09'));
  assert.deepEqual(again, { ok: false, reason: 'already-owned' });
  assert.equal(first.owned[0]!.acquiredAt, '2026-02-01T00:00:00.000Z');
  // Even the other door cannot touch an owned skin.
  const viaStore = acquireSkin(first, skin, 'currency-store', day('2030-01-01'));
  assert.deepEqual(viaStore, { ok: false, reason: 'already-owned' });
});

test('rule 1: wardrobes are frozen and only ever grow', () => {
  const a = sampleSkin('skin-a');
  const b = sampleSkin('skin-b');
  const w0 = createWardrobe('acct-1');
  const w1 = mustAcquire(w0, a, 'needs-shop', day('2026-02-01'));
  const w2 = mustAcquire(w1, b, 'needs-shop', day('2026-02-02'));
  assert.equal(w0.owned.length, 0, 'old wardrobe untouched');
  assert.equal(w1.owned.length, 1);
  assert.deepEqual(w2.owned.map((o) => o.skinId), ['skin-a', 'skin-b']);
  assert.throws(() => (w2.owned as OwnedSkin[]).pop(), TypeError, 'cannot pop from a frozen list');
  assert.throws(() => ((w2 as { owned: unknown }).owned = []), TypeError, 'cannot reassign owned');
  assert.throws(() => ((w2.owned[0] as { skinId: string }).skinId = 'other'), TypeError);
});

test('rule 1: stored data with an end date or rental field is refused; clean data round-trips', () => {
  const w = mustAcquire(createWardrobe('acct-1'), sampleSkin(), 'needs-shop', day('2026-02-01'));
  assert.deepEqual(parseWardrobe(JSON.parse(JSON.stringify(w))), w);
  const withEnd = { accountId: 'acct-1', owned: [{ skinId: 'x', acquiredAt: '2026-01-01T00:00:00Z', channel: 'needs-shop', expiresAt: '2027-01-01' }] };
  assert.throws(() => parseWardrobe(withEnd), WardrobeRuleError);
  const withRental = { accountId: 'acct-1', owned: [{ skinId: 'x', acquiredAt: '2026-01-01T00:00:00Z', channel: 'needs-shop', rental: true }] };
  assert.throws(() => parseWardrobe(withRental), WardrobeRuleError);
  const topLevel = { accountId: 'acct-1', owned: [], seasonPass: 'winter' };
  assert.throws(() => parseWardrobe(topLevel), WardrobeRuleError);
  const dupes = { accountId: 'acct-1', owned: [
    { skinId: 'x', acquiredAt: '2026-01-01T00:00:00Z', channel: 'needs-shop' },
    { skinId: 'x', acquiredAt: '2026-01-02T00:00:00Z', channel: 'currency-store' },
  ] };
  assert.throws(() => parseWardrobe(dupes), WardrobeRuleError);
  assert.throws(() => parseWardrobe(null), WardrobeRuleError);
});

// ---------------------------------------------------------------- 2. store release

test('rule 2: default delay is 6 months and the config is tunable and validated', () => {
  assert.equal(DEFAULT_CURRENCY_STORE_DELAY_MONTHS, 6);
  assert.equal(DEFAULT_WARDROBE_CONFIG.currencyStoreDelayMonths, 6);
  assert.equal(createWardrobeConfig().currencyStoreDelayMonths, 6);
  assert.equal(createWardrobeConfig({ currencyStoreDelayMonths: 12 }).currencyStoreDelayMonths, 12);
  assert.equal(createWardrobeConfig({ currencyStoreDelayMonths: 0 }).currencyStoreDelayMonths, 0);
  for (const bad of [-1, 1.5, Number.NaN, Infinity, 121]) {
    assert.throws(() => createWardrobeConfig({ currencyStoreDelayMonths: bad }), WardrobeRuleError, `rejects ${bad}`);
  }
  assert.throws(() => ((DEFAULT_WARDROBE_CONFIG as { currencyStoreDelayMonths: number }).currencyStoreDelayMonths = 1), TypeError);
});

test('rule 2: a skin reaches the currency store exactly 6 months after first sale', () => {
  const skin = sampleSkin('moonlit-cloak', '2026-01-15');
  assert.equal(currencyStoreReleaseDate(skin), '2026-07-15');
  assert.equal(isInCurrencyStore(skin, new Date('2026-07-14T23:59:59Z')), false);
  assert.equal(isInCurrencyStore(skin, new Date('2026-07-15T00:00:00Z')), true);
  assert.equal(isInCurrencyStore(skin, day('2040-01-01')), true, 'and it stays there');
});

test('rule 2: the delay follows the config, including a founder change to 12 months', () => {
  const skin = sampleSkin('moonlit-cloak', '2026-01-15');
  const twelve = createWardrobeConfig({ currencyStoreDelayMonths: 12 });
  assert.equal(currencyStoreReleaseDate(skin, twelve), '2027-01-15');
  assert.equal(isInCurrencyStore(skin, day('2026-08-01'), twelve), false);
  assert.equal(isInCurrencyStore(skin, day('2026-08-01')), true);
  const zero = createWardrobeConfig({ currencyStoreDelayMonths: 0 });
  assert.equal(currencyStoreReleaseDate(skin, zero), '2026-01-15');
});

test('rule 2: month math clamps to month end and rolls the year', () => {
  assert.equal(addMonthsUtc('2026-11-30', 3), '2027-02-28');
  assert.equal(addMonthsUtc('2027-11-30', 3), '2028-02-29');
  assert.equal(addMonthsUtc('2026-08-31', 6), '2027-02-28');
  assert.equal(addMonthsUtc('2026-11-03', 3), '2027-02-03');
  assert.equal(addMonthsUtc('2026-12-31', 12), '2027-12-31');
  assert.equal(addMonthsUtc('2026-05-31', 1), '2026-06-30');
  assert.throws(() => addMonthsUtc('2026-02-30', 3), WardrobeRuleError);
  assert.throws(() => addMonthsUtc('2026-01-01', -1), WardrobeRuleError);
});

test('rule 2: a skin cannot be taken before its first sale, and the NEEDs shop door opens on that day', () => {
  const skin = sampleSkin('moonlit-cloak', '2026-06-01');
  assert.equal(isOnNeedsShop(skin, new Date('2026-05-31T23:59:59Z')), false);
  assert.equal(isOnNeedsShop(skin, day('2026-06-01')), true);
  assert.deepEqual(acquireSkin(createWardrobe('a1'), skin, 'needs-shop', day('2026-05-31')), { ok: false, reason: 'not-yet-on-sale' });
  assert.deepEqual(acquireSkin(createWardrobe('a1'), skin, 'currency-store', day('2026-05-31')), { ok: false, reason: 'not-yet-on-sale' });
});

test('rule 2: currency-store door is closed before the delay and open after', () => {
  const skin = sampleSkin('moonlit-cloak', '2026-01-15');
  const w = createWardrobe('a1');
  assert.deepEqual(acquireSkin(w, skin, 'currency-store', day('2026-03-01')), { ok: false, reason: 'not-in-currency-store-yet' });
  const owned = mustAcquire(w, skin, 'currency-store', day('2026-07-15'));
  assert.equal(owned.owned[0]!.channel, 'currency-store');
  assert.deepEqual([...ACQUIRE_CHANNELS], ['needs-shop', 'currency-store']);
  assert.throws(() => acquireSkin(w, skin, 'cash-grab' as never, day('2026-08-01')), WardrobeRuleError);
});

test('rule 2: listCurrencyStore returns exactly the released skins', () => {
  const early = sampleSkin('early', '2026-01-01');
  const late = sampleSkin('late', '2026-06-01');
  const pet = sampleSkin('TrollinlootNScoot', '2026-01-01');
  const list = listCurrencyStore([early, late, pet], day('2026-08-01'));
  assert.deepEqual(list.map((s) => s.id), ['early']);
});

// The founder-pet exception. These tests hard-code the id string on purpose: if someone edits
// the exception list to remove it, they fail. Do not "fix" them by editing the literal.
test('rule 2 EXCEPTION: TrollinlootNScoot is the one id that never reaches the currency store', () => {
  assert.deepEqual([...CURRENCY_STORE_EXCLUDED_IDS], ['TrollinlootNScoot']);
  assert.equal(isCurrencyStoreExcluded('TrollinlootNScoot'), true);
  assert.equal(CURRENCY_STORE_EXCLUDED_IDS.length, 1, 'exactly one exception');
  assert.equal(isCurrencyStoreExcluded('moonlit-cloak'), false);
});

test('rule 2 EXCEPTION: no date, delay or config can put TrollinlootNScoot in the currency store', () => {
  const pet = defineSkin({ id: 'TrollinlootNScoot', name: 'TrollinlootNScoot', slot: 'pet', firstSaleDate: '2026-01-01' });
  const immediate = createWardrobeConfig({ currencyStoreDelayMonths: 0 });
  for (const config of [DEFAULT_WARDROBE_CONFIG, immediate, createWardrobeConfig({ currencyStoreDelayMonths: 120 })]) {
    assert.equal(currencyStoreReleaseDate(pet, config), null);
    assert.equal(isInCurrencyStore(pet, new Date('2999-12-31T00:00:00Z'), config), false);
    assert.deepEqual(listCurrencyStore([pet], new Date('2999-12-31T00:00:00Z'), config), []);
    assert.deepEqual(
      acquireSkin(createWardrobe('a1'), pet, 'currency-store', new Date('2999-12-31T00:00:00Z'), config),
      { ok: false, reason: 'founder-pet-never-in-currency-store' },
    );
  }
});

test('rule 2 EXCEPTION: re-cased ids cannot slip past, and the exception list cannot be edited at run time', () => {
  for (const id of ['trollinlootnscoot', 'TROLLINLOOTNSCOOT', 'TrollinLootNScoot']) {
    assert.equal(isCurrencyStoreExcluded(id), true, id);
    assert.equal(currencyStoreReleaseDate({ id, firstSaleDate: '2026-01-01' }), null, id);
  }
  assert.throws(() => (CURRENCY_STORE_EXCLUDED_IDS as string[]).pop(), TypeError);
  assert.throws(() => (CURRENCY_STORE_EXCLUDED_IDS as string[]).push('another'), TypeError);
  assert.equal(CURRENCY_STORE_EXCLUDED_IDS[0], 'TrollinlootNScoot');
});

test('rule 2 EXCEPTION: the founder pet is still a normal NEEDs-shop purchase and then owned forever', () => {
  const pet = defineSkin({ id: 'TrollinlootNScoot', name: 'TrollinlootNScoot', slot: 'pet', firstSaleDate: '2026-01-01' });
  const w = mustAcquire(createWardrobe('a1'), pet, 'needs-shop', day('2026-01-02'));
  assert.equal(ownsSkin(w, 'TrollinlootNScoot'), true);
});

test('rule 2: every other skin does reach the currency store, for any first-sale date and delay', () => {
  for (const months of [0, 1, 3, 6, 12]) {
    const config = createWardrobeConfig({ currencyStoreDelayMonths: months });
    for (const firstSaleDate of ['2026-01-31', '2026-02-28', '2028-02-29', '2026-12-31']) {
      const skin = sampleSkin('any-skin', firstSaleDate);
      const release = currencyStoreReleaseDate(skin, config);
      assert.ok(release, `${firstSaleDate} +${months}`);
      assert.equal(isInCurrencyStore(skin, new Date(`${release}T00:00:00Z`), config), true);
    }
  }
});

// ---------------------------------------------------------------- 3. pay-to-win guard

test('rule 3: a stat cannot be attached to a skin or convenience item (compile time)', () => {
  const base = { id: 'x', name: 'X', slot: 'back', firstSaleDate: '2026-01-01' } as const;
  const asVariable = { ...base, attack: 5 };

  // Object literal with a stat.
  // @ts-expect-error stat key on a skin literal is rejected
  const _a: Skin = { kind: 'skin', ...base, attack: 5 };
  // Through the builders, literal.
  // @ts-expect-error stat key rejected by defineSkin
  const _b = () => defineSkin({ ...base, damage: 9 });
  // Through the builders, from a variable (excess-property checks alone would miss this).
  // @ts-expect-error stat key from a variable rejected by defineSkin
  const _c = () => defineSkin(asVariable);
  // Convenience items too.
  // @ts-expect-error stat key rejected by defineConvenienceItem
  const _d = () => defineConvenienceItem({ id: 'runner', name: 'Runner', saves: 'walking', hp: 10 });
  // The only values a convenience item can save are walking and attention.
  // @ts-expect-error combat is not something a convenience item can save
  const _e = () => defineConvenienceItem({ id: 'runner', name: 'Runner', saves: 'combat' });
  void [_a, _b, _c, _d, _e];
  assert.ok(true);
});

test('rule 3: a stat cannot be attached to a skin or convenience item (run time, types bypassed)', () => {
  const base = { id: 'x', name: 'X', slot: 'back', firstSaleDate: '2026-01-01' };
  assert.throws(() => defineSkin({ ...base, attack: 5 } as never), /stat/);
  assert.throws(() => defineConvenienceItem({ id: 'r', name: 'R', saves: 'walking', speed: 2 } as never), /stat/);
  // Nested smuggling is refused too.
  assert.throws(() => defineSkin({ ...base, stats: { attack: 1 } } as never), WardrobeRuleError);
  assert.throws(() => defineSkin({ ...base, [Symbol('power')]: 1 } as never), WardrobeRuleError);
  // Every stat-like key name is refused on both kinds.
  for (const key of STAT_KEYS) {
    const skin = validateShopItem({ kind: 'skin', ...base, [key]: 1 });
    assert.equal(skin.ok, false, `skin with ${key}`);
    assert.match(skin.errors.join(' '), /stat/, `skin with ${key}`);
    const conv = validateShopItem({ kind: 'convenience', id: 'r', name: 'R', saves: 'walking', [key]: 1 });
    assert.equal(conv.ok, false, `convenience with ${key}`);
  }
  // Unknown non-stat fields are refused as well, so nothing extra rides along.
  assert.equal(validateShopItem({ kind: 'skin', ...base, flavor: 'x' }).ok, false);
});

test('rule 3: a defined item has exactly its allowed fields and is frozen against late stats', () => {
  const skin = sampleSkin();
  assert.deepEqual(Object.keys(skin).sort(), ['firstSaleDate', 'id', 'kind', 'name', 'slot']);
  const conv = defineConvenienceItem({ id: 'storage-runner', name: 'Storage Runner', saves: 'walking' });
  assert.deepEqual(Object.keys(conv).sort(), ['id', 'kind', 'name', 'saves']);
  assert.throws(() => ((skin as unknown as Record<string, unknown>).attack = 5), TypeError);
  assert.throws(() => ((conv as unknown as Record<string, unknown>).hp = 5), TypeError);
  assert.equal(Object.isFrozen(skin), true);
  assert.equal(Object.isFrozen(conv), true);
});

test('rule 3: catalog validation catches bad shapes, bad dates and duplicate ids', () => {
  const good = [sampleSkin('a'), defineConvenienceItem({ id: 'b', name: 'B', saves: 'attention' })];
  assert.deepEqual(validateCatalog(good), { ok: true, errors: [] });
  const bad = validateCatalog([sampleSkin('Dup'), sampleSkin('dup'), { kind: 'skin', id: 'z', name: 'Z', slot: 'back', firstSaleDate: '2026-02-30' }, 'nope']);
  assert.equal(bad.ok, false);
  assert.match(bad.errors.join('\n'), /duplicate id/);
  assert.match(bad.errors.join('\n'), /firstSaleDate/);
  assert.match(bad.errors.join('\n'), /plain object/);
});

// ---------------------------------------------------------------- 4. kid-safe basics

test('rule 4: the default set covers every basic slot with one plain item each', () => {
  assert.deepEqual([...BASIC_SLOTS], ['top', 'bottom', 'shoes']);
  for (const slot of BASIC_SLOTS) {
    assert.equal(KID_SAFE_BASICS[slot].slot, slot);
    assert.equal(KID_SAFE_BASICS[slot].kind, 'basic');
  }
  assert.equal(new Set(KID_SAFE_BASIC_IDS).size, BASIC_SLOTS.length, 'ids unique');
  assert.equal(Object.isFrozen(KID_SAFE_BASICS), true);
  assert.equal(Object.isFrozen(KID_SAFE_BASICS.top), true);
  assert.throws(() => ((KID_SAFE_BASICS as unknown as Record<string, unknown>).hat = {}), TypeError);
});

test('rule 4: basics carry no stats and are never in the shop or the currency store', () => {
  for (const slot of BASIC_SLOTS) {
    const item = KID_SAFE_BASICS[slot];
    assert.deepEqual(Object.keys(item).sort(), ['id', 'kind', 'name', 'slot']);
    assert.equal(validateShopItem(item).ok, false, 'a basic is not a shop item');
    assert.equal(isCurrencyStoreExcluded(item.id), false);
  }
});

test('rule 4: a fresh default outfit passes the creator exit check, anything else fails', () => {
  const outfit = createDefaultOutfit();
  assert.equal(isKidSafeBasicsOutfit(outfit), true);
  assert.deepEqual(outfit, { top: 'basics-top', bottom: 'basics-bottom', shoes: 'basics-shoes' });
  assert.notEqual(createDefaultOutfit(), outfit, 'each call is a fresh object');
  assert.equal(Object.isFrozen(outfit), true);

  const { top, bottom } = outfit;
  assert.equal(isKidSafeBasicsOutfit({ top, bottom }), false, 'missing shoes');
  assert.equal(isKidSafeBasicsOutfit({ ...outfit, shoes: 'moonlit-cloak' }), false, 'a shop skin is not basics');
  assert.equal(isKidSafeBasicsOutfit({ ...outfit, back: 'moonlit-cloak' }), false, 'extra worn slot');
  assert.equal(isKidSafeBasicsOutfit({ top: 'basics-bottom', bottom: 'basics-top', shoes: 'basics-shoes' }), false, 'swapped slots');
  assert.equal(isKidSafeBasicsOutfit({}), false);
  assert.equal(isKidSafeBasicsOutfit(null), false);
  assert.equal(isKidSafeBasicsOutfit(undefined), false);
  assert.equal(isKidSafeBasicsOutfit([]), false);
});

test('rule 4: no shop skin can reuse a basic id and so pose as the default set', () => {
  for (const id of [...KID_SAFE_BASIC_IDS, ...KID_SAFE_BASIC_IDS.map((b) => b.toUpperCase())]) {
    assert.throws(() => sampleSkin(id), /reserved for the kid-safe basics/, id);
    const clash = validateCatalog([{ kind: 'skin', id, name: 'Imposter', slot: 'top', firstSaleDate: '2026-01-01' }]);
    assert.equal(clash.ok, false, id);
    assert.match(clash.errors.join(' '), /reserved/);
  }
  const outfitWithSkinId = { top: sampleSkin('anything').id, bottom: 'basics-bottom', shoes: 'basics-shoes' };
  assert.equal(isKidSafeBasicsOutfit(outfitWithSkinId), false);
});
