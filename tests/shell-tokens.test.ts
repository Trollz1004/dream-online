/**
 * Tests for DREAM Space shell tokens (src/shell/tokens.ts):
 * - docs/house/DESIGN-SYSTEM.md points at src/shell/tokens.ts and every hex matches;
 * - every text, control, and focus pair in SHELL_COLOR_PAIRS computes to 7:1 or better (WCAG AAA);
 * - excluded low-contrast tokens stay out of the shell stylesheet;
 * - zero dependency on game code or third-party UI kits across src/shell/.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AAA_RATIO,
  MIN_FONT_PX,
  SHELL_COLOR_PAIRS,
  SHELL_CSS,
  color,
  colorNotUsed,
  contrastRatio,
  font,
  fontSize,
  groundHex,
  motion,
  pairRatio,
  size,
} from '../src/shell/index.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

test('docs/house/DESIGN-SYSTEM.md points at src/shell/tokens.ts and matches all DREAM Space tokens', () => {
  const docPath = path.join(repoRoot, 'docs', 'house', 'DESIGN-SYSTEM.md');
  const doc = fs.readFileSync(docPath, 'utf8');

  assert.match(doc, /src\/shell\/tokens\.ts/, 'DESIGN-SYSTEM.md must point at src/shell/tokens.ts');

  assert.equal(color.ink, '#0A0B0D');
  assert.equal(color.porcelain, '#F4F1EA');
  assert.equal(color.fog, '#C9CBCE');
  assert.equal(color.slate, '#9DA3AA');
  assert.equal(color.hull, '#3A3F45');
  assert.equal(color.signal, '#FFD21E');
  assert.equal(color.signalHover, '#E6B800');
  assert.equal(color.statusGreen, '#58D68D');
  assert.equal(color.statusAmber, '#F5B041');
  assert.equal(color.statusRed, '#FF6B6B');

  for (const hex of Object.values(color)) {
    assert.ok(doc.includes(hex), `DESIGN-SYSTEM.md must list token hex ${hex}`);
  }

  assert.match(font.display, /Space Grotesk/);
  assert.match(font.text, /IBM Plex Sans/);
  assert.equal(fontSize.body, 20);
  assert.equal(MIN_FONT_PX, 16);
  for (const [name, px] of Object.entries(fontSize)) {
    assert.ok(px >= MIN_FONT_PX, `fontSize.${name} (${px}px) must never go under ${MIN_FONT_PX}px`);
  }

  assert.equal(motion.press, 120);
  assert.equal(motion.reveal, 240);
  assert.equal(motion.scene, 480);
  assert.equal(size.hit, 44);
});

test('WCAG AAA: every text, control, and focus pair in SHELL_COLOR_PAIRS computes to 7:1 or better', () => {
  assert.equal(AAA_RATIO, 7);
  assert.ok(SHELL_COLOR_PAIRS.length >= 21, 'all shell foreground/background pairs must be registered');

  for (const pair of SHELL_COLOR_PAIRS) {
    const ratio = pairRatio(pair);
    const fgHex = color[pair.fg];
    const bgHex = groundHex(pair.bg);
    assert.ok(
      ratio >= AAA_RATIO,
      `${pair.kind} pair ${pair.fg} (${fgHex}) on ${pair.bg} (${bgHex}) for "${pair.use}" measured ${ratio.toFixed(2)}:1, below ${AAA_RATIO}:1`,
    );
  }

  // Non-text Hull border token is never used as a foreground colour in SHELL_COLOR_PAIRS.
  for (const pair of SHELL_COLOR_PAIRS) {
    assert.notEqual(pair.fg, 'hull', 'Hull (#3A3F45) is for borders and dividers, never text or control contrast');
  }

  // Explicitly excluded tokens fail 7:1 on Ink and must never appear in SHELL_CSS.
  assert.ok(contrastRatio(colorNotUsed.signalDim, color.ink) < AAA_RATIO);
  assert.ok(contrastRatio(colorNotUsed.statusGrey, color.ink) < AAA_RATIO);
  assert.ok(!SHELL_CSS.includes(colorNotUsed.signalDim));
  assert.ok(!SHELL_CSS.includes(colorNotUsed.statusGrey));
});

test('src/shell/ has zero dependency on game code or third-party UI kits', () => {
  const shellDir = path.join(repoRoot, 'src', 'shell');
  const files = fs.readdirSync(shellDir).filter((f) => /\.(ts|tsx)$/.test(f));
  assert.ok(files.length >= 10, 'expected full shell module set under src/shell/');

  for (const file of files) {
    const src = fs.readFileSync(path.join(shellDir, file), 'utf8');
    assert.doesNotMatch(src, /from\s+['"][^'"]*(?:engine|game)\//, `${file} must not import game code`);
    assert.doesNotMatch(src, /from\s+['"](?:lucide-react|@mui|@chakra-ui|@radix-ui|antd|tailwindcss)['"]/, `${file} must not use a third-party UI kit`);
  }

  const wrapperSrc = fs.readFileSync(path.join(repoRoot, 'src', 'ui', 'UnifiedAntigravityWorkspaceShell.tsx'), 'utf8');
  assert.doesNotMatch(wrapperSrc, /from\s+['"][^'"]*(?:engine|game)\//, 'UnifiedAntigravityWorkspaceShell.tsx must not import game code');
});
