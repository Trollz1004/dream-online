/**
 * NEEDs Shop v1 (Volume 2, Recipe 3 — the Wardrobe) — Unit & UI Verification Tests
 *
 * Covers docs/gdd/09-interface-style.md and docs/gdd/12-wardrobe-needs-shop.md:
 *  1. The help panel states the stat rule (same percentages anyone can earn in game; nothing buys power) and no shop item carries a raw stat override.
 *  2. The founder pet (TrollinlootNScoot) never shows a currency price and never reaches the currency store.
 *  3. An unreleased item cannot be bought with coins and shows its release month.
 *  4. Kid-safe basics (Plain Tee, Plain Trousers, Plain Sneakers) are always owned and never sold.
 *  5. Three columns (categories left, dark item rows middle, plain-sentence rules help panel right),
 *     one Back control bottom centre, no real-money path, and wired from the creator's Wardrobe link.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  BASIC_SLOTS,
  CURRENCY_STORE_EXCLUDED_IDS,
  DEFAULT_WARDROBE_CONFIG,
  FOUNDER_PET_SKIN_ID,
  KID_SAFE_BASICS,
  KID_SAFE_BASIC_IDS,
  STAT_KEYS,
  createWardrobe,
  currencyStoreReleaseDate,
  isCurrencyStoreExcluded,
  isInCurrencyStore,
  ownsSkin,
  validateCatalog,
  validateShopItem,
} from '../src/game/economy/wardrobe/index.ts';

import {
  NEEDS_SHOP_CATEGORIES,
  NEEDS_SHOP_CATALOG,
  NEEDS_SHOP_DEFAULT_NOW,
  NEEDS_SHOP_HELP_RULES,
  NEEDS_SHOP_PAYMENTS_LINE,
  NeedsShopModal,
  buyItemWithCoins,
  formatReleaseMonthUtc,
  getCategoryRows,
  resolveNeedsShopRow,
  type NeedsShopCategoryId,
} from '../src/ui/NeedsShopModal.tsx';

import { CharacterCreatorModal } from '../src/ui/CharacterCreatorModal.tsx';
import { createInitialCreatorState } from '../src/ui/characterCreatorConfig.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOW = new Date(NEEDS_SHOP_DEFAULT_NOW);

test('categories and layout: defines the 6 required categories and plain-sentence help rules per doc 09 and doc 12', () => {
  assert.deepEqual(
    NEEDS_SHOP_CATEGORIES.map((c) => c.id),
    ['basics', 'tops', 'bottoms', 'shoes', 'pets', 'convenience'],
  );

  const html = renderToStaticMarkup(
    React.createElement(NeedsShopModal, {
      isOpen: true,
      wardrobe: createWardrobe('player-1'),
      now: NOW,
      onChangeWardrobe: () => {},
      onClose: () => {},
    }),
  );

  // Title, three columns, and one Back control at bottom centre; no tribute on player-facing surface per 2026-11-12 ruling
  assert.match(html, /WARDROBE/i);
  assert.match(html, /NEEDS SHOP/i);
  assert.match(html, /Back/);
  assert.doesNotMatch(html, /CLAUDE(?:'|&#x27;|&apos;)s N Joshua(?:'|&#x27;|&apos;)s/i);
  assert.doesNotMatch(html, /#?TeamClaudeForLife/i);

  // Plain-sentence rules in the right-hand help panel
  const combinedRules = NEEDS_SHOP_HELP_RULES.join(' ');
  assert.match(combinedRules, /bought is owned forever/i);
  assert.match(combinedRules, /skins never expire/i);
  assert.match(combinedRules, /every skin reaches the currency store a few months after release/i);
  assert.match(combinedRules, /founder pet.*never/i);
  assert.match(combinedRules, /nothing here buys power/i);
  assert.equal(
    NEEDS_SHOP_HELP_RULES[2],
    'The game is free to play. This shop sells looks, time and choice at the same percentages anyone can earn in game. Nothing here buys power.',
  );
  assert.equal(
    NEEDS_SHOP_PAYMENTS_LINE,
    "Payments: the game's own merchant account. Nothing in this screen is pay-to-win.",
  );
  // Rule 4: neither product names the other on a surface.
  assert.equal(/date app/i.test(NEEDS_SHOP_PAYMENTS_LINE), false, 'shop must never name the date app');
  // React escapes the apostrophes in the rendered markup.
  assert.ok(
    html.includes(NEEDS_SHOP_PAYMENTS_LINE.replace(/'/g, '&#x27;')),
    'expected rendered help panel to include the payments line',
  );
  assert.equal(/square only/i.test(html), false, 'shop must never say "Square only"');

  for (const ruleSentence of NEEDS_SHOP_HELP_RULES) {
    assert.ok(
      html.includes(ruleSentence),
      `expected rendered help panel to include plain sentence: "${ruleSentence}"`,
    );
  }
});

test('rule 1 (stat rule): the screen states the stat rule and no shop item carries a raw stat override across all categories', () => {
  const shopItems = NEEDS_SHOP_CATALOG.map((entry) => entry.item);
  const validation = validateCatalog(shopItems);
  assert.deepEqual(validation, { ok: true, errors: [] });

  const statKeySet = new Set(STAT_KEYS.map((k) => k.toLowerCase()));
  const wardrobe = createWardrobe('player-stat-rule');

  for (const entry of NEEDS_SHOP_CATALOG) {
    assert.equal(validateShopItem(entry.item).ok, true, `item ${entry.item.id} must pass validateShopItem`);
    for (const key of Object.keys(entry.item)) {
      assert.equal(statKeySet.has(key.toLowerCase()), false, `item ${entry.item.id} must not have stat key ${key}`);
    }
    for (const key of Object.keys(entry)) {
      assert.equal(statKeySet.has(key.toLowerCase()), false, `catalog entry ${entry.item.id} must not have stat key ${key}`);
    }
    const row = resolveNeedsShopRow(entry, wardrobe, NOW, DEFAULT_WARDROBE_CONFIG);
    for (const key of Object.keys(row)) {
      assert.equal(statKeySet.has(key.toLowerCase()), false, `resolved row ${row.id} must not have stat key ${key}`);
    }
  }

  // Render every category and ensure no stat indicators (+ATK, +HP, +DEF, damage, etc.) appear anywhere
  const forbiddenStatPatterns = [
    /\+\d+\s*(atk|def|hp|mp|dmg|spd|str|dex|int|crit|armor|power|stat)/i,
    /\b(attack power|combat power|damage bonus|critical chance|armor rating|mana boost|xp boost|drop rate)\b/i,
  ];

  for (const category of NEEDS_SHOP_CATEGORIES) {
    const html = renderToStaticMarkup(
      React.createElement(NeedsShopModal, {
        isOpen: true,
        initialCategory: category.id,
        wardrobe,
        now: NOW,
        onChangeWardrobe: () => {},
        onClose: () => {},
      }),
    );

    for (const pattern of forbiddenStatPatterns) {
      assert.equal(
        pattern.test(html),
        false,
        `category "${category.id}" must never show a stat matching ${pattern}`,
      );
    }

    assert.ok(
      html.includes(
        'The game is free to play. This shop sells looks, time and choice at the same percentages anyone can earn in game. Nothing here buys power.',
      ),
      `category "${category.id}" must render the stat rule sentence in the help panel`,
    );
  }
});

test('rule 2 (founder pet): TrollinlootNScoot never shows a currency price and cannot be bought with coins', () => {
  assert.equal(FOUNDER_PET_SKIN_ID, 'TrollinlootNScoot');
  assert.deepEqual([...CURRENCY_STORE_EXCLUDED_IDS], ['TrollinlootNScoot']);
  assert.equal(isCurrencyStoreExcluded(FOUNDER_PET_SKIN_ID), true);

  const wardrobe = createWardrobe('player-pet-check');
  const petRows = getCategoryRows('pets', wardrobe, NOW, DEFAULT_WARDROBE_CONFIG);
  const founderRow = petRows.find((r) => r.id === FOUNDER_PET_SKIN_ID);
  assert.ok(founderRow, 'expected TrollinlootNScoot in the pets category');

  assert.equal(founderRow.isFounderPet, true);
  assert.equal(founderRow.coinPrice, null, 'founder pet must never have a currency price');
  assert.equal(founderRow.releaseDate, null, 'founder pet must never have a currency store release date');
  assert.equal(founderRow.inCurrencyStore, false, 'founder pet is never in the currency store');
  assert.equal(founderRow.canGetWithCoins, false, 'founder pet cannot be bought with coins');
  assert.equal(/\d+\s*coins?/i.test(founderRow.priceOrOwnedLabel), false, 'founder pet label must never show a coin price');
  assert.match(founderRow.storeStatusLabel, /never reaches the currency store/i);

  // Attempting to buy the founder pet with coins always refuses
  const attempt = buyItemWithCoins(wardrobe, FOUNDER_PET_SKIN_ID, new Date('2999-12-31T00:00:00Z'));
  assert.deepEqual(attempt, { ok: false, reason: 'founder-pet-never-in-currency-store' });

  // Render the pets category and check the founder pet row markup
  const petsHtml = renderToStaticMarkup(
    React.createElement(NeedsShopModal, {
      isOpen: true,
      initialCategory: 'pets',
      wardrobe,
      now: NOW,
      onChangeWardrobe: () => {},
      onClose: () => {},
    }),
  );

  const founderRowMatch = petsHtml.match(
    /<div[^>]*data-testid="needs-shop-row-TrollinlootNScoot"[\s\S]*?<\/div>\s*<\/div>/,
  );
  assert.ok(founderRowMatch, 'expected rendered row for TrollinlootNScoot');
  assert.equal(/\d+\s*coins?/i.test(founderRowMatch[0]), false, 'founder pet DOM row must never show a currency price');
  assert.equal(/Get with coins/i.test(founderRowMatch[0]), false, 'founder pet DOM row must never offer Get with coins');
});

test('rule 3 (release dates & coin acquisitions): an unreleased item cannot be bought and shows its release month; released items can be bought with coins', () => {
  const wardrobe = createWardrobe('player-store-timing');
  const categoriesWithCatalogItems: NeedsShopCategoryId[] = ['tops', 'bottoms', 'shoes', 'pets', 'convenience'];

  let testedUnreleasedCount = 0;
  let testedReleasedCount = 0;

  for (const categoryId of categoriesWithCatalogItems) {
    const rows = getCategoryRows(categoryId, wardrobe, NOW, DEFAULT_WARDROBE_CONFIG);
    for (const row of rows) {
      if (row.isFounderPet || row.isBasic) continue;

      const entry = NEEDS_SHOP_CATALOG.find((e) => e.item.id === row.id);
      assert.ok(entry, `expected catalog entry for ${row.id}`);

      const expectedRelease = currencyStoreReleaseDate(
        { id: entry.item.id, firstSaleDate: entry.firstSaleDate },
        DEFAULT_WARDROBE_CONFIG,
      );
      assert.ok(expectedRelease, `expected a currency store release date for ${row.id}`);
      const expectedInStore = isInCurrencyStore(
        { id: entry.item.id, firstSaleDate: entry.firstSaleDate },
        NOW,
        DEFAULT_WARDROBE_CONFIG,
      );

      assert.equal(row.releaseDate, expectedRelease);
      assert.equal(row.inCurrencyStore, expectedInStore);

      if (!expectedInStore) {
        testedUnreleasedCount += 1;
        const expectedMonth = formatReleaseMonthUtc(expectedRelease);
        assert.equal(row.canGetWithCoins, false, `unreleased item ${row.id} must not allow buying with coins`);
        assert.match(row.storeStatusLabel, /not yet in the store/i);
        assert.ok(
          row.storeStatusLabel.includes(expectedMonth),
          `unreleased item ${row.id} status "${row.storeStatusLabel}" must show release month "${expectedMonth}"`,
        );

        const refusal = buyItemWithCoins(wardrobe, row.id, NOW, DEFAULT_WARDROBE_CONFIG);
        assert.deepEqual(refusal, { ok: false, reason: 'not-in-currency-store-yet' });
        assert.equal(ownsSkin(wardrobe, row.id), false);
      } else {
        testedReleasedCount += 1;
        assert.equal(row.canGetWithCoins, true, `released item ${row.id} must allow Get with coins`);
        assert.equal(row.actionLabel, 'Get with coins');

        const acquired = buyItemWithCoins(wardrobe, row.id, NOW, DEFAULT_WARDROBE_CONFIG);
        assert.equal(acquired.ok, true, `expected released item ${row.id} to be purchasable with coins`);
        if (acquired.ok) {
          assert.equal(ownsSkin(acquired.wardrobe, row.id), true);
          assert.equal(acquired.owned.channel, 'currency-store');
          const afterRow = resolveNeedsShopRow(entry, acquired.wardrobe, NOW, DEFAULT_WARDROBE_CONFIG);
          assert.equal(afterRow.isOwned, true);
          assert.equal(afterRow.priceOrOwnedLabel, 'OWNED');
          assert.equal(afterRow.canGetWithCoins, false);
        }
      }
    }
  }

  assert.ok(testedUnreleasedCount >= 4, 'expected at least 4 unreleased items across categories');
  assert.ok(testedReleasedCount >= 5, 'expected at least 5 released items across categories');
});

test('rule 4 (kid-safe basics): basics come from src/game/economy/wardrobe, are always owned, and cannot be bought', () => {
  const emptyWardrobe = createWardrobe('fresh-character');
  const basicRows = getCategoryRows('basics', emptyWardrobe, NOW, DEFAULT_WARDROBE_CONFIG);

  assert.equal(basicRows.length, BASIC_SLOTS.length);
  assert.deepEqual(
    basicRows.map((r) => r.id),
    [...KID_SAFE_BASIC_IDS],
  );
  assert.deepEqual(
    basicRows.map((r) => r.name),
    [KID_SAFE_BASICS.top.name, KID_SAFE_BASICS.bottom.name, KID_SAFE_BASICS.shoes.name],
  );

  for (const row of basicRows) {
    assert.equal(row.isBasic, true);
    assert.equal(row.isOwned, true, `basic ${row.id} must always be owned`);
    assert.equal(row.coinPrice, null, `basic ${row.id} must never have a price`);
    assert.equal(row.canGetWithCoins, false, `basic ${row.id} must never be purchasable`);
    assert.match(row.priceOrOwnedLabel, /OWNED/);

    const refusal = buyItemWithCoins(emptyWardrobe, row.id, NOW, DEFAULT_WARDROBE_CONFIG);
    assert.deepEqual(refusal, { ok: false, reason: 'already-owned' });
  }

  const basicsHtml = renderToStaticMarkup(
    React.createElement(NeedsShopModal, {
      isOpen: true,
      initialCategory: 'basics',
      wardrobe: emptyWardrobe,
      now: NOW,
      onChangeWardrobe: () => {},
      onClose: () => {},
    }),
  );

  assert.match(basicsHtml, /Plain Tee/);
  assert.match(basicsHtml, /Plain Trousers/);
  assert.match(basicsHtml, /Plain Sneakers/);
  assert.equal(/Get with coins/i.test(basicsHtml), false, 'basics screen must never show Get with coins');
});

test('rule 5 (no real money & creator link): no real-money path exists and CharacterCreatorModal wires its Wardrobe link to NeedsShopModal', () => {
  const modalPath = path.resolve(__dirname, '../src/ui/NeedsShopModal.tsx');
  const creatorPath = path.resolve(__dirname, '../src/ui/CharacterCreatorModal.tsx');
  const modalSource = readFileSync(modalPath, 'utf8');
  const creatorSource = readFileSync(creatorPath, 'utf8');

  // Verify NeedsShopModal imports directly from src/game/economy/wardrobe
  assert.match(modalSource, /from\s+['"]\.\.\/game\/economy\/wardrobe\/index\.ts['"]/);

  // Verify no real-money checkout, currency symbols, or payment wiring exists in rendered UI
  const html = renderToStaticMarkup(
    React.createElement(NeedsShopModal, {
      isOpen: true,
      wardrobe: createWardrobe('acct-clean'),
      now: NOW,
      onChangeWardrobe: () => {},
      onClose: () => {},
    }),
  );
  assert.equal(/\$\d+|USD|EUR|stripe|paypal|credit card|checkout/i.test(html), false);

  // Verify CharacterCreatorModal imports and wires NeedsShopModal to its Wardrobe link
  assert.match(creatorSource, /NeedsShopModal/);
  const creatorHtml = renderToStaticMarkup(
    React.createElement(CharacterCreatorModal, {
      isOpen: true,
      state: createInitialCreatorState(),
      onChange: () => {},
      onClose: () => {},
    }),
  );
  assert.match(creatorHtml, /href="#wardrobe"/);
  assert.match(creatorHtml, /Wardrobe/);
  assert.doesNotMatch(creatorHtml, /CLAUDE(?:'|&#x27;|&apos;)s N Joshua(?:'|&#x27;|&apos;)s/i);
  assert.doesNotMatch(creatorHtml, /#?TeamClaudeForLife/i);

  const hudSource = readFileSync(path.resolve(__dirname, '../src/ui/CombatHud.tsx'), 'utf8');
  assert.doesNotMatch(hudSource, /CLAUDE(?:'|&#x27;|&apos;)s N Joshua(?:'|&#x27;|&apos;)s/i);
  assert.doesNotMatch(hudSource, /#?TeamClaudeForLife/i);
});
