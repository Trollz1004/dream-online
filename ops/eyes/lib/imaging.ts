/**
 * Eyes gate — image work done inside headless Chromium (no extra image
 * libraries): reference conversion, the side-by-side, judge-size JPEGs and
 * the pixel measurements. Local files are served to the page through a
 * Playwright route on http://eyes.invalid so canvas reads are same-origin.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, BrowserContext, Page } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const PIXELS_JS = fs.readFileSync(path.join(here, 'pixels.browser.cjs'), 'utf8');
const ORIGIN = 'http://eyes.invalid';

const mimeOf = (f: string) =>
  /\.jpe?g$/i.test(f) ? 'image/jpeg' : /\.webp$/i.test(f) ? 'image/webp' : 'image/png';

async function imagePage(
  browser: Browser,
  files: Record<string, string>,
  viewport = { width: 1280, height: 720 },
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.route(`${ORIGIN}/**`, (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#0A0B0D"></body></html>',
      });
    }
    const f = files[decodeURIComponent(u.pathname.replace(/^\/img\//, ''))];
    if (!f) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ body: fs.readFileSync(f), contentType: mimeOf(f) });
  });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/`);
  return { ctx, page };
}

const sizesJs = (names: string[]) =>
  `(async () => { const r = {}; for (const n of ${JSON.stringify(names)}) { const im = new Image(); im.src = '/img/' + n; await im.decode(); r[n] = [im.naturalWidth, im.naturalHeight]; } return r; })()`;

async function waitImages(page: Page) {
  await page.evaluate(
    `Promise.all(Array.from(document.images).map((im) => im.decode().catch(() => { throw new Error('image failed: ' + im.src); })))`,
  );
}

/** Copy a PNG byte-for-byte, or convert JPEG/WebP to PNG at natural size. */
export async function toPng(browser: Browser, src: string, dest: string): Promise<void> {
  if (/\.png$/i.test(src)) {
    fs.copyFileSync(src, dest);
    return;
  }
  const { ctx, page } = await imagePage(browser, { src });
  try {
    const sizes = (await page.evaluate(sizesJs(['src']))) as Record<string, [number, number]>;
    const [w, h] = sizes.src;
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(`document.body.innerHTML = '<img src="/img/src" style="display:block;width:${w}px;height:${h}px">'`);
    await waitImages(page);
    await page.screenshot({ path: dest, type: 'png' });
  } finally {
    await ctx.close();
  }
}

/** Reference on the left, after on the right, same height, thin gap, large white labels on dark. */
export async function composeSideBySide(
  browser: Browser,
  refPng: string,
  afterPng: string,
  dest: string,
  labels: [string, string],
): Promise<{ width: number; height: number }> {
  const { ctx, page } = await imagePage(browser, { ref: refPng, after: afterPng });
  try {
    const s = (await page.evaluate(sizesJs(['ref', 'after']))) as Record<string, [number, number]>;
    const H = 1080;
    const band = 128;
    const padPx = 24;
    const gap = 16;
    const wr = Math.round((s.ref[0] * H) / s.ref[1]);
    const wa = Math.round((s.after[0] * H) / s.after[1]);
    const width = padPx + wr + gap + wa + padPx;
    const height = padPx + band + H + padPx;
    await page.setViewportSize({ width, height });
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    const lab = `height:${band}px;color:#FFFFFF;background:#0A0B0D;font:600 64px/${band}px 'Segoe UI',system-ui,sans-serif;letter-spacing:0.04em;white-space:nowrap;overflow:hidden`;
    const html =
      `<div style="display:flex;gap:${gap}px;padding:${padPx}px;background:#0A0B0D;width:${width}px;height:${height}px;box-sizing:border-box">` +
      `<div style="width:${wr}px"><div style="${lab}">${esc(labels[0])}</div><img src="/img/ref" style="display:block;width:${wr}px;height:${H}px"></div>` +
      `<div style="width:${wa}px"><div style="${lab}">${esc(labels[1])}</div><img src="/img/after" style="display:block;width:${wa}px;height:${H}px"></div>` +
      `</div>`;
    await page.evaluate(`document.body.innerHTML = ${JSON.stringify(html)}`);
    await waitImages(page);
    await page.screenshot({ path: dest, type: 'png' });
    return { width, height };
  } finally {
    await ctx.close();
  }
}

/** A smaller JPEG copy for the judge (the saved PNGs stay full size). */
export async function judgeJpeg(browser: Browser, src: string, dest: string, maxDim = 1600): Promise<void> {
  const { ctx, page } = await imagePage(browser, { src });
  try {
    const s = (await page.evaluate(sizesJs(['src']))) as Record<string, [number, number]>;
    const [w0, h0] = s.src;
    const k = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.round(w0 * k);
    const h = Math.round(h0 * k);
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(`document.body.innerHTML = '<img src="/img/src" style="display:block;width:${w}px;height:${h}px">'`);
    await waitImages(page);
    await page.screenshot({ path: dest, type: 'jpeg', quality: 88 });
  } finally {
    await ctx.close();
  }
}

export interface RunBox {
  x: number;
  y: number;
  w: number;
  h: number;
  chars: number;
  text: string;
}

/** Pixel measurements for each shot (contrast, palette, similarity to the reference). */
export async function analyzeShots(
  browser: Browser,
  shots: Array<{ name: string; file: string; runs: RunBox[] | null }>,
  refPng: string,
): Promise<any> {
  const files: Record<string, string> = { ref: refPng };
  for (const s of shots) files[s.name] = s.file;
  const { ctx, page } = await imagePage(browser, files);
  try {
    await page.evaluate(PIXELS_JS);
    const spec = {
      refUrl: '/img/ref',
      shots: shots.map((s) => ({ name: s.name, url: `/img/${s.name}`, runs: s.runs })),
    };
    return await page.evaluate(`window.__eyes.analyzeAll(${JSON.stringify(spec)})`);
  } finally {
    await ctx.close();
  }
}
