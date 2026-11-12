import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readDoc(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

test('docs/gdd/13-equipment-and-costume-slots.md pins 2026-11-12 rulings', () => {
  const content = readDoc('docs/gdd/13-equipment-and-costume-slots.md');

  // Equipment slots
  assert.ok(content.includes('Main hand, off hand, and awakening weapon'), 'Weapons slots pinned');
  assert.ok(content.includes('Armor pieces'), 'Armor slots pinned');
  assert.ok(content.includes('Jewelry') && content.includes('gem slots'), 'Jewelry with gem slots pinned');

  // Costume slots & mix-and-match
  assert.ok(content.includes('Costume slots sit over the gear as the visual look'), 'Costume look layer pinned');
  assert.ok(content.includes('An expensive costume fills more slots'), 'Expensive costume pinned');
  assert.ok(content.includes('A life-skill costume is only a chest skin and a helm skin'), 'Life-skill costume pinned');
  assert.ok(content.includes('fish head') && content.includes('swimsuit bottom in PvP'), 'Mix and match example pinned');

  // Whole-set reading pending Josh
  assert.ok(
    content.includes('Whole-set reading (pending Josh)') ||
    content.includes('Claude\'s reading, pending Josh: the set effect needs the whole set worn'),
    'Whole-set reading marked pending Josh',
  );

  // Life-skill outfit bonuses
  assert.ok(content.includes('wear cut applies to every tool'), 'Wear cut applies to every tool pinned');
  assert.ok(content.includes('increases skill speed') && content.includes('Speed is the main reason to wear it'), 'Skill speed pinned');

  // Equipment window study-only reference
  assert.ok(content.includes('STUDY-ONLY-bdo-equipment-window-2026-11-12.jpg'), 'Equipment window reference image pinned');
  assert.ok(content.includes('Study-only rule') && content.includes('Nothing from that screenshot is copied'), 'Study-only rule pinned');
});

test('docs/gdd/14-crystals-and-jewls.md pins approved proposals and rulings', () => {
  const content = readDoc('docs/gdd/14-crystals-and-jewls.md');

  // Approval status and Jewls
  assert.ok(content.includes('Jewls') && content.includes("Jewls' Jewelry Box"), 'Jewls and her shop pinned');
  assert.ok(
    content.includes("The crystal numbers are approved by Claude's reading of 'etc all fine'"),
    "Crystal numbers approved by Claude's reading of etc all fine in one line",
  );
  assert.ok(
    content.includes('Crystals never add attack or defense and never change rarity'),
    'Crystals stat and rarity law pinned',
  );

  // Open question
  assert.ok(
    content.includes('Whether the crystal effect shows on top of a rarity\'s aura or replaces it'),
    'Open question on crystal effect vs rarity aura pinned',
  );

  // Salvage yields
  assert.ok(content.includes('Common or Uncommon item:') && content.includes('2 tier 1 crystals'), 'Common salvage pinned');
  assert.ok(content.includes('Rare item:') && content.includes('1 tier 2 crystal and 2 tier 1 crystals'), 'Rare salvage pinned');
  assert.ok(content.includes('Forged tier 3 item:') && content.includes('1 tier 3 crystal, 2 tier 2 crystals, and 4 tier 1 crystals'), 'Forged tier 3 salvage pinned');

  // Enhancement stages and caps
  assert.ok(content.includes('15 stages'), '15 enhancement stages pinned');
  assert.ok(content.includes('Cooldown reduction') && content.includes('+0.5%') && content.includes('20%'), 'Cooldown reduction cap pinned');
  assert.ok(content.includes('Mana recovery') && content.includes('+1%') && content.includes('40%'), 'Mana recovery cap pinned');
  assert.ok(content.includes('Stamina') && content.includes('+1%') && content.includes('40%'), 'Stamina cap pinned');
  assert.ok(content.includes('Energy') && content.includes('+1%') && content.includes('40%'), 'Energy cap pinned');

  // Visuals: weapon effects and armor wings
  assert.ok(content.includes('glow, flame, or smoke'), 'Weapon effect choices pinned');
  assert.ok(content.includes('Wings sprout on every armor piece') && content.includes('Platinum with diamond inlay'), 'Armor wings progression pinned');

  // Jewls accessory slots & sockets
  assert.ok(content.includes('1 necklace') && content.includes('2 rings') && content.includes('2 earrings') && content.includes('1 bracelet'), 'Six accessory slots pinned');
  assert.ok(content.includes('10 Sockets Total Fully Enhanced') || content.includes('10 sockets'), 'Ten sockets total pinned');

  // Gems and elements
  assert.ok(content.includes('Ruby') && content.includes('Fire'), 'Ruby fire pinned');
  assert.ok(content.includes('Sapphire') && content.includes('Water and Ice'), 'Sapphire water and ice pinned');
  assert.ok(content.includes('Emerald') && content.includes('Earth and Nature'), 'Emerald earth pinned');
  assert.ok(content.includes('Topaz') && content.includes('Lightning'), 'Topaz lightning pinned');
  assert.ok(content.includes('Amethyst') && content.includes('Dream and Shadow'), 'Amethyst dream and shadow pinned');
  assert.ok(content.includes('Diamond') && content.includes('Light'), 'Diamond light pinned');

  // Gem tiers & Opal crushing
  assert.ok(content.includes('Tier 1') && content.includes('Chip') && content.includes('+1%'), 'Chip tier pinned');
  assert.ok(content.includes('Tier 2') && content.includes('Cut') && content.includes('+2%'), 'Cut tier pinned');
  assert.ok(content.includes('Tier 3') && content.includes('Flawless') && content.includes('+4%'), 'Flawless tier pinned');
  assert.ok(
    content.includes('Tier 4') &&
    content.includes('Fossilized') &&
    content.includes('+6%') &&
    content.includes('crushing 1 Opal together with 2 Flawless gems'),
    'Fossilized tier pinned',
  );
  assert.ok(content.includes('Each element is capped at +30% damage and +30% resistance'), 'Element cap 30% pinned');
  assert.ok(content.includes('Cash never buys any of them, and cash never buys Sols'), 'Monetization law pinned');
});

test('docs/gdd/10-crowdfunding-readiness.md replaces AI memory lead with visuals-first pitch order', () => {
  const content = readDoc('docs/gdd/10-crowdfunding-readiness.md');

  assert.ok(content.includes('Stop leading with AI memory'), 'Replaces AI memory lead');
  assert.ok(content.includes('Lead with, in this exact order:'), 'Exact order header pinned');
  assert.ok(content.includes('The visuals and feel of play'), 'Pitch order 1 pinned');
  assert.ok(content.includes('The world that shifts between a fantasy day and a city night'), 'Pitch order 2 pinned');
  assert.ok(content.includes('No pay to win and free to play'), 'Pitch order 3 pinned');
  assert.ok(content.includes('Real AI that speaks back'), 'Pitch order 4 pinned');
  assert.ok(
    content.includes('No crowdfunding and no funding ask goes out until a slice passes the Eyes gate against Josh\'s references'),
    'Eyes gate funding requirement pinned',
  );
  assert.ok(content.includes('The equipment and costume window belongs in the slice'), 'Equipment window in slice pinned');
});

test('docs/gdd/00-vision.md includes end-game rule', () => {
  const content = readDoc('docs/gdd/00-vision.md');

  assert.ok(content.includes('No player can beat the end game solo') && content.includes('no solo win'), 'No solo win pinned');
  assert.ok(content.includes('A group barely wins') && content.includes('a group can barely beat it'), 'Group barely wins pinned');
  assert.ok(content.includes('A group with no healer has no chance') && content.includes('no healer means no chance'), 'No healer no chance pinned');
});

test('Reference list docs pin the top character reference and study-only equipment screenshot', () => {
  const worldDoc = readDoc('docs/gdd/08-day-dreams-night-dreams-world.md');
  const interfaceDoc = readDoc('docs/gdd/09-interface-style.md');
  const sourcesDoc = readDoc('docs/research/sources.md');
  const loreDoc = readDoc('docs/gdd/canon-lore-inhouse.md');

  // Top character reference
  for (const doc of [worldDoc, sourcesDoc, loreDoc]) {
    assert.ok(doc.includes('four-classes-nightfall-city-2026-11-12.jpg'), 'Top character reference image path pinned');
    assert.ok(doc.includes('realism bar'), 'Realism bar pinned');
    assert.ok(doc.includes('dragon'), 'Panel 4 dragon form pinned');
    assert.ok(!doc.includes('a dark knight in spiked crimson'), 'Panel 4 is not mislabeled a dark knight');
  }

  // Equipment screenshot study-only rule
  for (const doc of [worldDoc, interfaceDoc, sourcesDoc]) {
    assert.ok(doc.includes('STUDY-ONLY-bdo-equipment-window-2026-11-12.jpg'), 'Equipment window screenshot pinned');
    assert.ok(doc.includes('study only') || doc.includes('Study-only'), 'Study-only marked');
    assert.ok(doc.includes('Nothing from that screenshot is copied'), 'Nothing copied rule pinned');
  }
});
