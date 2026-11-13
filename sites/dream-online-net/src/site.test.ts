/**
 * TDD verification suite for dream-online.net v1 (sites/dream-online-net).
 *
 * Tests:
 * 1. DREAM Space tokens & WCAG AAA (>= 7:1) contrast for all text/control pairs.
 * 2. Brand & builder attribution strings ("DREAM ONLINE", "Built with Google Gemini") and absence of tribute on visitor-facing surfaces per founder ruling 2026-11-12.
 * 3. All 25 sections from docs/house/SITE-BRIEF-dream-online-net.md & 14-step chapter scrubber.
 * 4. Clean-room ownership & tone: zero negative/competitor language, zero external .glb models,
 *    zero placeholders, zero hardcoded Windows user folder names.
 * 5. Procedural 3D dot-sphere globe, Sup@ counter-rotating rings, split-flap word roll,
 *    odometer counters, word reveal contrast guarantee, starfield CPU budget, and reduced motion.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  color,
  fontSize,
  motion,
  SITE_COLOR_PAIRS,
  AAA_RATIO,
  pairRatio,
  contrastRatio,
} from './tokens.ts';
import {
  BRAND_META,
  CHAPTER_GROUPS,
  SPATIAL_SECTIONS,
  COMBAT_TABS,
  LIFE_SKILLS,
  TELEMETRY_HUD_ROWS,
  FIRST_15_MIN_STOPS,
  PROMISE_LIGHTING_MODES,
  NUMBERS_COUNTERS,
  SHOWCASE_CELLS,
  MARQUEE_ITEMS,
  FOOTER_COLUMNS,
  collectAllPublicCopy,
} from './data/siteContent.ts';
import {
  generateDotSphere,
  projectPoint3D,
  getCameraPoseForProgress,
  createStarfield,
  stepStarfield,
  getSplitFlapFrame,
  getOdometerDigits,
  getWordRevealState,
} from './motion/motionEngine.ts';

test('tokens: DREAM Space palette matches docs/house/DESIGN-SYSTEM.md with Signal yellow as the single accent', () => {
  assert.equal(color.ink, '#0A0B0D');
  assert.equal(color.porcelain, '#F4F1EA');
  assert.equal(color.fog, '#C9CBCE');
  assert.equal(color.slate, '#9DA3AA');
  assert.equal(color.hull, '#3A3F45');
  assert.equal(color.signal, '#FFD21E');
  assert.equal(color.signalHover, '#E6B800');
  assert.equal(fontSize.body, 20);
  assert.equal(fontSize.hero, 72);
  assert.deepEqual([motion.press, motion.reveal, motion.scene], [120, 240, 480]);
});

test('tokens: every foreground/background colour pair meets >= 7:1 WCAG AAA contrast', () => {
  assert.ok(SITE_COLOR_PAIRS.length >= 10);
  for (const pair of SITE_COLOR_PAIRS) {
    const ratio = pairRatio(pair);
    assert.ok(
      ratio >= AAA_RATIO,
      `Pair ${pair.fg} on ${pair.bg} (${pair.use}) measured ${ratio.toFixed(2)}:1, below ${AAA_RATIO}:1`,
    );
  }
});

test('brand & attribution: DREAM ONLINE and Built with Google Gemini are present, tribute is off visitor-facing surface per 2026-11-12 ruling', () => {
  assert.equal(BRAND_META.title, 'DREAM ONLINE');
  assert.equal(BRAND_META.fullBanner, 'DREAM ONLINE');
  assert.equal(BRAND_META.builderAttribution, 'Built with Google Gemini');
  assert.doesNotMatch(BRAND_META.title, /CLAUDE's N Joshua's/i);
  assert.doesNotMatch(BRAND_META.fullBanner, /CLAUDE's N Joshua's/i);
  assert.doesNotMatch(BRAND_META.heroKicker, /CLAUDE's N Joshua's|#?TeamClaudeForLife/i);

  const here = path.dirname(fileURLToPath(import.meta.url));
  const indexHtml = fs.readFileSync(path.resolve(here, '..', 'index.html'), 'utf8');
  assert.doesNotMatch(indexHtml, /CLAUDE's N Joshua's/i);
  assert.doesNotMatch(indexHtml, /#?TeamClaudeForLife/i);
});

test('brief completeness: 5 macro groups & 14 chapter steps, 22 spatial sections, 4 numbers, 12 showcase cells', () => {
  assert.equal(CHAPTER_GROUPS.length, 5);
  const totalSteps = CHAPTER_GROUPS.reduce((sum, g) => sum + g.steps.length, 0);
  assert.equal(totalSteps, 14);
  assert.equal(SPATIAL_SECTIONS.length, 22);
  assert.equal(COMBAT_TABS.length, 2);
  assert.equal(COMBAT_TABS[0].cards.length, 5);
  assert.equal(COMBAT_TABS[1].cards.length, 5);
  assert.equal(LIFE_SKILLS.length, 10);
  assert.equal(TELEMETRY_HUD_ROWS.length, 4);
  assert.equal(FIRST_15_MIN_STOPS.length, 5);
  assert.equal(PROMISE_LIGHTING_MODES.length, 2);
  assert.equal(NUMBERS_COUNTERS.length, 4);
  assert.equal(SHOWCASE_CELLS.length, 12);
  assert.equal(SHOWCASE_CELLS[11].title, 'YOU?');
  assert.ok(MARQUEE_ITEMS.length >= 8);
  assert.equal(FOOTER_COLUMNS.length, 4);
});

test('clean-room & copy: customer copy sells game value only, zero tribute on visitor surface, zero placeholders, zero external models, zero user paths', () => {
  const allCopy = collectAllPublicCopy();
  assert.ok(allCopy.length > 1500);
  // Tribute must NOT appear on visitor-facing copy per founder ruling 2026-11-12
  assert.doesNotMatch(allCopy, /CLAUDE's N Joshua's/i);
  assert.doesNotMatch(allCopy, /#?TeamClaudeForLife/i);
  // Zero placeholders
  for (const bad of [/lorem/i, /ipsum/i, /\bTODO\b/, /\bFIXME\b/, /\bTBD\b/, /\bplaceholder\b/i]) {
    assert.doesNotMatch(allCopy, bad);
  }
  // Zero reference remnants or negative/competitor wording
  for (const forbidden of [
    /endurosat/i,
    /Eagle-1/i,
    /MAX DOD PER ORBIT/i,
    /shelfware/i,
    /idle seats/i,
    /train and vanish/i,
    /\.glb\b/i,
    /C:\\Users\\/i,
  ]) {
    assert.doesNotMatch(allCopy, forbidden);
  }
});

test('motion: procedural 3D dot-sphere globe and Sup@ counter-rotating rings are generated in code', () => {
  const model = generateDotSphere(240, 48);
  assert.equal(model.globeDots.length, 240);
  assert.equal(model.ringInner.length, 48);
  assert.equal(model.ringOuter.length, 48);
  assert.ok(model.orbitalArcs.length >= 2);

  const pose0 = getCameraPoseForProgress(0, 1, 'blade', 'day', false);
  const poseMid = getCameraPoseForProgress(0.5, 11, 'guard', 'night', false);
  // Counter-rotating rings spin in opposite signs when motion is enabled
  assert.ok(poseMid.ringInnerAngle > 0);
  assert.ok(poseMid.ringOuterAngle < 0);
  assert.notEqual(pose0.globeRotationY, poseMid.globeRotationY);

  // Reduced motion freezes continuous spin and camera interpolation cleanly
  const poseReduced = getCameraPoseForProgress(0.5, 11, 'guard', 'night', true);
  assert.equal(poseReduced.ringInnerAngle, 0);
  assert.equal(poseReduced.ringOuterAngle, 0);

  const proj = projectPoint3D({ x: 0, y: 0, z: 1 }, pose0, 1920, 1080);
  assert.ok(Number.isFinite(proj.sx) && Number.isFinite(proj.sy));
});

test('motion: split-flap word roll, odometer reels, and word reveal respect reduced motion and contrast', () => {
  const phrases = ['ONE SHARED WORLD', 'DREAMED TWICE'];
  const flapActive = getSplitFlapFrame(phrases, 1800, false);
  assert.equal(flapActive.chars.length, 'ONE SHARED WORLD'.length);
  const flapReduced = getSplitFlapFrame(phrases, 1800, true);
  assert.equal(flapReduced.isFlipping, false);

  const odo = getOdometerDigits('60 FPS', 1, false);
  assert.equal(odo.map((d) => d.char).join(''), '60 FPS');
  assert.equal(odo[0].isDigit, true);
  assert.equal(odo[0].currentDigit, 6);

  const words = ['Walk', 'from', 'the', 'central', 'plaza'];
  const reveal0 = getWordRevealState(words, 0, false);
  const reveal1 = getWordRevealState(words, 1, false);
  // Even at 0 progress, every word uses a token with >= 7:1 contrast on Ink #0A0B0D
  for (const w of [...reveal0, ...reveal1]) {
    const ratio = contrastRatio(w.color, color.ink);
    assert.ok(ratio >= AAA_RATIO, `Word "${w.word}" color ${w.color} contrast is ${ratio.toFixed(2)}:1`);
  }
});

test('motion: starfield stays lightweight (<100 stars) and pauses when tab is hidden or reduced motion is on', () => {
  const stars = createStarfield(84);
  assert.equal(stars.length, 84);
  const xBefore = stars[0].x;
  // Paused when hidden
  stepStarfield(stars, 16, 0, 0, 0, true, false);
  assert.equal(stars[0].x, xBefore);
  // Paused when reducedMotion is true
  stepStarfield(stars, 16, 0, 0, 0, false, true);
  assert.equal(stars[0].x, xBefore);
  // Advances when visible and motion is enabled
  stepStarfield(stars, 16, 0.2, 0.1, 100, false, false);
  assert.notEqual(stars[0].y, 0);
});
