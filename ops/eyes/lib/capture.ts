/**
 * Eyes gate — capture the target at desktop 1920x1080 and phone 390x844,
 * both at device scale 2, collecting real page evidence on the way:
 * console errors, page errors, failed requests, broken images, visible text
 * and text runs for the pixel contrast measurement.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const DOM_JS = fs.readFileSync(path.join(here, 'dom.browser.cjs'), 'utf8');

export const DSF = 2;
export const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, isMobile: false },
  phone: { width: 390, height: 844, isMobile: true },
} as const;
export type ShotName = keyof typeof VIEWPORTS;

export interface DomRun {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontWeight: number;
  chars: number;
  text: string;
}

export interface DomFacts {
  title: string;
  runs: DomRun[];
  visibleText: string;
  brokenImages: string[];
  hasCanvas: boolean;
}

export interface ShotCapture {
  name: ShotName;
  file: string;
  dom: DomFacts | null;
  status: number | null;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  unreachedSteps: string[];
}

export interface CaptureOptions {
  clicks: string[];
  waitFor: string | null;
  settleMs: number;
}

export function isLocalUrl(target: string): boolean {
  try {
    const u = new URL(target);
    return /^https?:$/.test(u.protocol) && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(u.hostname);
  } catch {
    return false;
  }
}

const firstLineOf = (e: unknown) => String((e as Error)?.message ?? e).split('\n')[0].slice(0, 240);

export async function captureShot(
  browser: Browser,
  target: string,
  name: ShotName,
  dest: string,
  opts: CaptureOptions,
): Promise<ShotCapture> {
  const vp = VIEWPORTS[name];
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: DSF,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
  });
  const out: ShotCapture = {
    name,
    file: dest,
    dom: null,
    status: null,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    unreachedSteps: [],
  };
  try {
    const page = await ctx.newPage();
    if (isLocalUrl(target)) {
      page.on('console', (m) => {
        if (m.type() === 'error') out.consoleErrors.push(m.text().slice(0, 240));
      });
      page.on('pageerror', (e) => out.pageErrors.push(firstLineOf(e)));
      page.on('requestfailed', (r) => {
        const why = r.failure()?.errorText ?? '';
        if (!/ERR_ABORTED/.test(why)) out.failedRequests.push(`${why} ${r.url().slice(0, 160)}`);
      });
      page.on('response', (r) => {
        if (r.status() >= 400) out.failedRequests.push(`HTTP ${r.status()} ${r.url().slice(0, 160)}`);
      });
      const resp = await page.goto(target, { waitUntil: 'load', timeout: 90000 });
      out.status = resp?.status() ?? null;
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
      for (const sel of opts.clicks) {
        try {
          await page.click(sel, { timeout: 15000 });
        } catch (e) {
          out.unreachedSteps.push(`click "${sel}" at ${name}: ${firstLineOf(e)}`);
        }
      }
      if (opts.waitFor) {
        try {
          await page.waitForSelector(opts.waitFor, { state: 'visible', timeout: 20000 });
        } catch (e) {
          out.unreachedSteps.push(`wait for "${opts.waitFor}" at ${name}: ${firstLineOf(e)}`);
        }
      }
      await page.waitForTimeout(opts.settleMs);
      await page.evaluate(DOM_JS);
      out.dom = (await page.evaluate('window.__eyesDom.collect(800)')) as DomFacts;
    } else {
      // A PNG target: show it letterboxed on ink at each viewport. No DOM facts.
      const file = path.resolve(target);
      await ctx.route('http://eyes.invalid/**', (route) =>
        route.fulfill({ body: fs.readFileSync(file), contentType: /\.jpe?g$/i.test(file) ? 'image/jpeg' : 'image/png' }),
      );
      await page.setContent(
        '<!doctype html><html><body style="margin:0;background:#0A0B0D"><img src="http://eyes.invalid/target" style="display:block;width:100vw;height:100vh;object-fit:contain"></body></html>',
      );
      await page.evaluate(`document.images[0].decode()`);
    }
    await page.screenshot({ path: dest, type: 'png', caret: 'hide' });
  } finally {
    await ctx.close();
  }
  return out;
}

export interface FontSummary {
  titlePx: number;
  titleWeight: number;
  titleText: string;
  bodyPx: number;
}

/** Title = largest visible text run; body = character-weighted median size. */
export function summarizeFonts(dom: DomFacts | null): FontSummary | null {
  if (!dom || !dom.runs.length) return null;
  let title = dom.runs[0];
  for (const r of dom.runs) if (r.fontSize > title.fontSize) title = r;
  const bySize = [...dom.runs].sort((a, b) => a.fontSize - b.fontSize);
  const total = bySize.reduce((a, r) => a + r.chars, 0);
  let acc = 0;
  let body = bySize[0].fontSize;
  for (const r of bySize) {
    acc += r.chars;
    if (acc >= total / 2) {
      body = r.fontSize;
      break;
    }
  }
  return { titlePx: title.fontSize, titleWeight: title.fontWeight, titleText: title.text, bodyPx: body };
}
