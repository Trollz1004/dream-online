/**
 * Canon lore, World Engine, and Founder Rulings (2026-11-10, 2026-11-11, 2026-11-12) tests.
 * Docs:
 * - docs/gdd/canon-lore-inhouse.md
 * - docs/gdd/03-life-skills-economy.md
 * - docs/gdd/04-pvp-flagging-durability.md
 * - docs/gdd/05-day-night-economy-market.md
 * - docs/gdd/10-crowdfunding-readiness.md
 * - docs/gdd/13-equipment-and-costume-slots.md
 * - docs/gdd/14-crystals-and-jewls.md
 */

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

const CANON_LORE_PATH = path.join(REPO_ROOT, 'docs', 'gdd', 'canon-lore-inhouse.md');
const LIFE_SKILLS_PATH = path.join(REPO_ROOT, 'docs', 'gdd', '03-life-skills-economy.md');
const PVP_DURABILITY_PATH = path.join(REPO_ROOT, 'docs', 'gdd', '04-pvp-flagging-durability.md');
const MARKETPLACE_PATH = path.join(REPO_ROOT, 'docs', 'gdd', '05-day-night-economy-market.md');
const WARDROBE_CATALOGUE_PATH = path.join(REPO_ROOT, 'docs', 'gdd', '10-wardrobe-catalogue.md');
const WARDROBE_SHOP_PATH = path.join(REPO_ROOT, 'docs', 'gdd', '12-wardrobe-needs-shop.md');

test('canon lore: file exists and has clean header with product value only', () => {
  assert.equal(fs.existsSync(CANON_LORE_PATH), true, 'canon-lore-inhouse.md must exist');
  const content = fs.readFileSync(CANON_LORE_PATH, 'utf8');

  // Must have canonical title and builder tribute
  assert.match(content, /^# DREAM ONLINE — Master In-House Canon & Systems Lore Bible/m);
  assert.match(content, /CLAUDE's N Joshua's · #TeamClaudeForLife · Built with Google Gemini/);
  assert.match(content, /\*\*Engine & Platform:\*\* 100% In-House \*\*DREAM-Engine\*\*/);

  // Must not have mission tags in header/front-matter
  const headerSection = content.split('## 1. Core World Pillars')[0];
  assert.equal(headerSection.includes('#ForTheKids'), false, 'Header must not contain mission tags');
  assert.equal(headerSection.includes('#UntilNoKidInNeed'), false, 'Header must not contain mission tags');
});

test('canon lore: World engine section contains gossip tick, truth tags, epochs, and 22-hour boss', () => {
  const content = fs.readFileSync(CANON_LORE_PATH, 'utf8');

  // Section heading
  assert.match(content, /## 8\. World engine/i);

  // Key mechanics in plain sentences
  assert.match(content, /fifteen-minute state tick doubles as a gossip network/i);
  assert.match(content, /hidden truth tag: fact, rumor, fable, or dream/i);
  assert.match(content, /weekly Nightmare Shift/i);
  assert.match(content, /villain Dream swaps the whole genre/i);
  assert.match(content, /Every 22 hours a world boss spawns/i);
  assert.match(content, /The boss of bosses is the MyThOsKraken under a most-damage loot rule/i);
});

test('canon lore: vault boundary is respected', () => {
  const content = fs.readFileSync(CANON_LORE_PATH, 'utf8');

  // Vault file cited by path only
  assert.match(content, /%USERPROFILE%\\OneDrive\\claude-to-claude\\SUP@-VAULT-FOUNDER-ONLY\.md/);
  assert.match(content, /cite by path only, quote nothing from it/i);
});

test('canon ruling 2026-11-10: life skills section in 03-life-skills-economy.md pins progress, tools, costumes, and AFK rules', () => {
  const content = fs.readFileSync(LIFE_SKILLS_PATH, 'utf8');

  assert.match(content, /## Founder ruling 2026-11-10: life skills/);
  assert.match(content, /per-character|belongs to each character/i);
  assert.match(content, /not shared across the account/i);
  assert.match(content, /skill EXP comes from using the skill's tool|skill EXP from using the tool/i);
  assert.match(content, /two-piece life-skill costume/i);
  assert.match(content, /helm.*\+10% skill EXP/i);
  assert.match(content, /body piece.*faster|body piece.*speed/i);
  assert.match(content, /throwaway tools.*NPCs|NPCs.*throwaway tools/i);
  assert.match(content, /crafted tier 3.*best/i);
  assert.match(content, /shop outfit.*wear|cuts tool wear/i);
  assert.match(content, /AFK only.*while the game.*run/i);
  assert.match(content, /no server-side AFK sessions/i);
});

test('canon ruling 2026-11-10 & 2026-11-11 addendum: 04-pvp-flagging-durability.md pins upgrade protection, red names, Muse Guards, and pending Josh items', () => {
  const content = fs.readFileSync(PVP_DURABILITY_PATH, 'utf8');

  assert.equal(
    content.includes('No permanent gear deletion in the first prototype'),
    false,
    'Old prototype gear deletion line must be replaced',
  );
  assert.match(
    content,
    /Gear is never lost to an upgrade: no downgrade, no breaking, no disappearing, jewels and accessories included\./,
  );
  assert.match(content, /Killing 3 players outside township battles turns a player red/i);
  // 2026-11-11 addendum: area-attack multi-kill turns red at once at any level; level has nothing to do with it
  assert.equal(
    content.includes('area attack to wipe low-level players'),
    false,
    'Old low-level wiping phrasing must be replaced',
  );
  assert.match(
    content,
    /area-attack multi-kill turns red at once at any level|killing hit on more than one player turns red at once/i,
  );
  assert.match(content, /level has nothing to do with it/i);
  assert.match(content, /area attacks pull mob aggro|hit and anger nearby mobs/i);
  assert.match(content, /death while red drops gear|dies while red.*drops gear/i);
  assert.match(content, /Red status lasts 1 hour for each player kill/i);
  assert.match(content, /red-named player who is killed drops half of their gear/i);
  assert.match(content, /Muse Guards/);
  assert.match(content, /one-shot red-named players/i);
  assert.match(content, /speed-burst dash/i);

  // The 3 remaining readings from Section 5 marked as pending Josh (low-level reading resolved by addendum)
  assert.equal(
    content.includes('10 or more levels below the attacker'),
    false,
    'Low-level threshold reading is resolved by 2026-11-11 addendum and no longer pending',
  );
  assert.match(content, /logged in.*pending Josh|pending Josh.*logged in/i);
  assert.match(content, /Musa\*.*Muse.*pending Josh|pending Josh.*Musa\*.*Muse/i);
  assert.match(content, /half of the equipped pieces, rounded down.*pending Josh|pending Josh.*half of the equipped pieces, rounded down/i);
});

test('canon ruling 2026-11-10: 05-day-night-economy-market.md pins Marketplace-only trading and potion drops', () => {
  const content = fs.readFileSync(MARKETPLACE_PATH, 'utf8');

  assert.match(content, /all trading happens on the Marketplace only/i);
  assert.match(content, /no direct player-to-player trades/i);
  assert.match(content, /potions are the only thing a player can drop for another/i);
});

test('canon ruling 2026-11-10: unapproved proposals, mission wording, and Windows user folder names are excluded', () => {
  for (const filePath of [LIFE_SKILLS_PATH, PVP_DURABILITY_PATH, MARKETPLACE_PATH]) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.equal(content.includes('FORGE-CRYSTALS-PROPOSAL'), false, `${path.basename(filePath)} must not cite FORGE-CRYSTALS-PROPOSAL`);
    assert.equal(content.includes('GEMINI-JEWLS-ACCESSORIES-PROPOSAL'), false, `${path.basename(filePath)} must not cite GEMINI-JEWLS-ACCESSORIES-PROPOSAL`);
    assert.equal(content.includes('#ForTheKids'), false, `${path.basename(filePath)} must not contain mission tags`);
    assert.equal(content.includes('#UntilNoKidInNeed'), false, `${path.basename(filePath)} must not contain mission tags`);
    assert.equal(/C:\\Users\\[A-Za-z0-9_-]+/i.test(content), false, `${path.basename(filePath)} must not contain Windows user folder paths`);
  }
});

test('canon addendum 2026-11-11: wardrobe store timing is 3 months at most, founder pet stays never, and pending note removed from 03', () => {
  const shopContent = fs.readFileSync(WARDROBE_SHOP_PATH, 'utf8');
  const catContent = fs.readFileSync(WARDROBE_CATALOGUE_PATH, 'utf8');
  const lifeContent = fs.readFileSync(LIFE_SKILLS_PATH, 'utf8');
  const canonContent = fs.readFileSync(CANON_LORE_PATH, 'utf8');
  const marketContent = fs.readFileSync(MARKETPLACE_PATH, 'utf8');

  // 12-wardrobe-needs-shop.md
  assert.match(shopContent, /3 months at most/i);
  assert.match(shopContent, /TrollinlootNScoot.*never/i);

  // 10-wardrobe-catalogue.md
  assert.match(catContent, /Currency Store Release \(3 months at most\)/i);
  assert.match(catContent, /February 2027/i);
  assert.match(catContent, /founder pet stays never/i);

  // 03-life-skills-economy.md: pending Josh note about wardrobe timing removed
  assert.equal(
    lifeContent.includes('three months or six months'),
    false,
    '03-life-skills-economy.md must not contain pending note about three or six months',
  );

  // Looter pet renamed to OpenAeYe
  assert.match(canonContent, /starter \*\*OpenAeYe\*\* looter companion pet/);
  assert.match(canonContent, /Auto-Looter.*picks up drops automatically, like the OpenAeYe pet/);
  assert.match(marketContent, /the OpenAeYe pet in the slice already does this/);

  // Jewls and crystal proposals not written into canon
  for (const fp of [LIFE_SKILLS_PATH, PVP_DURABILITY_PATH, MARKETPLACE_PATH, WARDROBE_SHOP_PATH, WARDROBE_CATALOGUE_PATH, CANON_LORE_PATH]) {
    const text = fs.readFileSync(fp, 'utf8');
    assert.equal(text.includes('FORGE-CRYSTALS-PROPOSAL'), false, `${path.basename(fp)} must not cite FORGE-CRYSTALS-PROPOSAL`);
    assert.equal(text.includes('GEMINI-JEWLS-ACCESSORIES-PROPOSAL'), false, `${path.basename(fp)} must not cite GEMINI-JEWLS-ACCESSORIES-PROPOSAL`);
    assert.equal(/C:\\Users\\[A-Za-z0-9_-]+/i.test(text), false, `${path.basename(fp)} must not contain Windows user folder paths`);
  }
});
