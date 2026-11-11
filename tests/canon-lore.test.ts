/**
 * Canon lore, World Engine, and 2026-11-10 Founder Rulings (life skills, PvP/durability, Marketplace trade) tests.
 * Docs:
 * - docs/gdd/canon-lore-inhouse.md
 * - docs/gdd/03-life-skills-economy.md
 * - docs/gdd/04-pvp-flagging-durability.md
 * - docs/gdd/05-day-night-economy-market.md
 *
 * Verifies:
 * 1. Lore bible exists with canonical header and product value only.
 * 2. World engine section contains gossip tick, truth tags, epochs, 22-hour boss cycle, MyThOsKraken.
 * 3. Founder-only vault boundary respected (path cited, zero lines pulled).
 * 4. Founder ruling 2026-11-10: life skills in docs/gdd/03-life-skills-economy.md.
 * 5. Founder ruling 2026-11-10: gear upgrade protection, red names, Muse Guards, and pending Josh readings in docs/gdd/04-pvp-flagging-durability.md.
 * 6. Founder ruling 2026-11-10: Marketplace-only trading and potion drops in docs/gdd/05-day-night-economy-market.md.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANON_LORE_PATH = path.join(REPO_ROOT, 'docs', 'gdd', 'canon-lore-inhouse.md');
const LIFE_SKILLS_PATH = path.join(REPO_ROOT, 'docs', 'gdd', '03-life-skills-economy.md');
const PVP_DURABILITY_PATH = path.join(REPO_ROOT, 'docs', 'gdd', '04-pvp-flagging-durability.md');
const MARKETPLACE_PATH = path.join(REPO_ROOT, 'docs', 'gdd', '05-day-night-economy-market.md');

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

test('canon ruling 2026-11-10: 04-pvp-flagging-durability.md pins upgrade protection, red names, Muse Guards, and pending Josh items', () => {
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
  assert.match(content, /area attack to wipe low-level players turns.*red at once/i);
  assert.match(content, /Red status lasts 1 hour for each player kill/i);
  assert.match(content, /red-named player who is killed drops half of their gear/i);
  assert.match(content, /Muse Guards/);
  assert.match(content, /one-shot red-named players/i);
  assert.match(content, /speed-burst dash/i);

  // All 4 readings from Section 5 must be marked as pending Josh
  assert.match(content, /10 or more levels below the attacker.*pending Josh|pending Josh.*10 or more levels below the attacker/i);
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


