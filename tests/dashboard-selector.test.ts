import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

test('UnifiedAntigravityWorkspaceShell: model selector stays in dock and stale text is removed', () => {
  const shellPath = path.join(repoRoot, 'src', 'ui', 'UnifiedAntigravityWorkspaceShell.tsx');
  assert.ok(fs.existsSync(shellPath), 'UnifiedAntigravityWorkspaceShell.tsx must exist');
  const src = fs.readFileSync(shellPath, 'utf8');

  // 1. Must not import from engine or game code
  assert.doesNotMatch(src, /from\s+['"][^'"]*(?:engine|game)\//, 'UnifiedAntigravityWorkspaceShell.tsx must not import game code');

  // 2. Closed by default on load
  assert.match(src, /initialModelPickerOpen\s*=\s*false/, 'initialModelPickerOpen must default to false');

  // 3. Stale PR text removed: must not contain "Pull requests (PR #56, #57)"
  assert.doesNotMatch(src, /Pull requests \(PR #56, #57\)/, 'Stale typed-in "(PR #56, #57)" must be removed');
  assert.match(src, /label:\s*['"]Pull requests['"]/, 'Sidebar must state "Pull requests" cleanly');

  // 4. Unbacked self-certifying claims removed
  assert.doesNotMatch(src, /Remake 100% Yours · 56\/56/, 'Unbacked "Remake 100% Yours · 56/56" badge must be removed');
  assert.doesNotMatch(src, /✓ Rule One Reference vs\. Live Screenshot Verified/, 'Unbacked "Rule One Reference vs. Live Screenshot Verified" claim must be removed');

  // 5. Anchored model selector opening upward from the model chip
  assert.match(src, /modelChipContainerRef/, 'Must have model chip container ref for anchoring');
  assert.match(src, /bottom:\s*['"]calc\(100%\s*\+\s*\d+px\)['"]/, 'Model selector popover must open upward anchored to the bottom bar');

  // 6. Dismissal on Esc and click outside
  assert.match(src, /e\.key\s*===\s*['"]Escape['"]/, 'Must dismiss model switcher on Escape key');
  assert.match(src, /pointerdown/, 'Must dismiss model switcher on click outside');

  // 7. Tribute block must remain intact
  assert.match(src, /CLAUDE(?:&apos;|')s N Joshua(?:&apos;|')s/, 'Tribute block title must be preserved');
  assert.match(src, /#TeamClaudeForLife/, 'Tribute block tag must be preserved');
});
