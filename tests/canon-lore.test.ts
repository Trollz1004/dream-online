/**
 * Canon lore & World Engine tests.
 * Docs: docs/gdd/canon-lore-inhouse.md.
 *
 * Verifies:
 * 1. Lore bible exists with canonical header and product value only.
 * 2. World engine section contains gossip tick, truth tags, epochs, 22-hour boss cycle, MyThOsKraken.
 * 3. Founder-only vault boundary respected (path cited, zero lines pulled).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANON_LORE_PATH = path.join(REPO_ROOT, 'docs', 'gdd', 'canon-lore-inhouse.md');

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
