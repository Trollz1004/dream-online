/**
 * Eyes gate — pixel measurements.
 *
 * Plain JavaScript on purpose: it is injected into headless Chromium with
 * page.addScriptTag (where it registers window.__eyes) and also loaded by the
 * Node unit tests with require (where it exports the same functions).
 * Every number here is computed from screenshot pixels, never from CSS.
 */
(function (root) {
  'use strict';

  // WCAG 2.x relative luminance of an sRGB colour (0..255 channels).
  function channel(v) {
    var c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function relativeLuminance(r, g, b) {
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }
  function contrastRatio(l1, l2) {
    var hi = Math.max(l1, l2);
    var lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  // Luminance lookup table so per-pixel work is one array read per channel.
  var LIN = new Float64Array(256);
  for (var i = 0; i < 256; i++) LIN[i] = channel(i);
  function lumAt(d, idx) {
    return 0.2126 * LIN[d[idx]] + 0.7152 * LIN[d[idx + 1]] + 0.0722 * LIN[d[idx + 2]];
  }

  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    var k = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
    return sorted[k];
  }

  /**
   * Contrast of one run of text, read from pixels.
   * Background = the most common luminance inside the run's box (text strokes
   * are a minority of a line box). Foreground = the 98th percentile of
   * contrast against that background, which lands on glyph cores and skips
   * the odd stray pixel. Returns null when the box holds no visible ink.
   */
  function measureRun(img, box) {
    var x0 = Math.max(0, Math.floor(box.x));
    var y0 = Math.max(0, Math.floor(box.y));
    var x1 = Math.min(img.width, Math.ceil(box.x + box.w));
    var y1 = Math.min(img.height, Math.ceil(box.y + box.h));
    if (x1 - x0 < 2 || y1 - y0 < 2) return null;
    var area = (x1 - x0) * (y1 - y0);
    var step = area > 40000 ? Math.ceil(Math.sqrt(area / 40000)) : 1;
    var bins = new Uint32Array(512);
    var lums = [];
    var d = img.data;
    for (var y = y0; y < y1; y += step) {
      for (var x = x0; x < x1; x += step) {
        var l = lumAt(d, (y * img.width + x) * 4);
        lums.push(l);
        bins[Math.min(511, Math.floor(l * 511))]++;
      }
    }
    var mode = 0;
    for (var b = 1; b < 512; b++) if (bins[b] > bins[mode]) mode = b;
    // Background luminance = mean of samples that fall in the modal bin.
    var bgSum = 0;
    var bgN = 0;
    for (var j = 0; j < lums.length; j++) {
      if (Math.min(511, Math.floor(lums[j] * 511)) === mode) {
        bgSum += lums[j];
        bgN++;
      }
    }
    var bg = bgN ? bgSum / bgN : mode / 511;
    var ratios = lums.map(function (v) { return contrastRatio(v, bg); }).sort(function (a, c) { return a - c; });
    var ratio = percentile(ratios, 0.98);
    if (ratio < 1.15) return null;
    return { ratio: Math.round(ratio * 100) / 100, bgLum: bg };
  }

  function summarizeRuns(measured) {
    // measured: [{ratio, chars, text}]
    var total = 0;
    var ok7 = 0;
    var ok45 = 0;
    measured.forEach(function (m) {
      total += m.chars;
      if (m.ratio >= 7) ok7 += m.chars;
      if (m.ratio >= 4.5) ok45 += m.chars;
    });
    var sorted = measured.map(function (m) { return m.ratio; }).sort(function (a, b) { return a - b; });
    var worst = measured.slice().sort(function (a, b) { return a.ratio - b.ratio; }).slice(0, 5);
    return {
      runs: measured.length,
      chars: total,
      min: sorted.length ? sorted[0] : 0,
      p10: Math.round(percentile(sorted, 0.1) * 100) / 100,
      median: Math.round(percentile(sorted, 0.5) * 100) / 100,
      share7: total ? Math.round((ok7 / total) * 1000) / 1000 : 0,
      share45: total ? Math.round((ok45 / total) * 1000) / 1000 : 0,
      worst: worst.map(function (w) { return { ratio: w.ratio, text: w.text }; }),
    };
  }

  // Tile estimate for PNG targets with no DOM: every busy 32x32 tile is
  // treated as possible text and measured the same way as a text run.
  function tileRuns(img, tile) {
    var out = [];
    for (var y = 0; y + tile <= img.height; y += tile) {
      for (var x = 0; x + tile <= img.width; x += tile) {
        var m = measureRun(img, { x: x, y: y, w: tile, h: tile });
        if (m && m.ratio >= 1.5) out.push({ ratio: m.ratio, chars: 1, text: 'tile ' + x + ',' + y });
      }
    }
    return out;
  }

  var TOKENS = [
    ['ink', 0x0a, 0x0b, 0x0d], ['porcelain', 0xf4, 0xf1, 0xea], ['fog', 0xc9, 0xcb, 0xce],
    ['slate', 0x9d, 0xa3, 0xaa], ['hull', 0x3a, 0x3f, 0x45], ['signal', 0xff, 0xd2, 0x1e],
  ];

  function palette(img) {
    var d = img.data;
    var n = img.width * img.height;
    var step = Math.max(1, Math.floor(n / 250000));
    var hist = {};
    var count = 0;
    var lumSum = 0;
    var lumSq = 0;
    var sat = 0;
    var tokenHits = 0;
    for (var p = 0; p < n; p += step) {
      var i4 = p * 4;
      var r = d[i4], g = d[i4 + 1], b = d[i4 + 2];
      var key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      hist[key] = (hist[key] || 0) + 1;
      var l = lumAt(d, i4);
      lumSum += l;
      lumSq += l * l;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx > 64 && (mx - mn) / mx > 0.35) sat++;
      for (var t = 0; t < TOKENS.length; t++) {
        var dr = r - TOKENS[t][1], dg = g - TOKENS[t][2], db = b - TOKENS[t][3];
        if (dr * dr + dg * dg + db * db <= 24 * 24) { tokenHits++; break; }
      }
      count++;
    }
    var keys = Object.keys(hist).sort(function (a, c) { return hist[c] - hist[a]; }).slice(0, 8);
    var hex = function (k) {
      k = Number(k);
      var r = ((k >> 8) & 15) * 17, g = ((k >> 4) & 15) * 17, b = (k & 15) * 17;
      return '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('').toUpperCase();
    };
    var mean = lumSum / count;
    return {
      dominant: keys.map(function (k) { return { hex: hex(k), share: Math.round((hist[k] / count) * 1000) / 1000 }; }),
      meanLum: Math.round(mean * 1000) / 1000,
      lumStd: Math.round(Math.sqrt(Math.max(0, lumSq / count - mean * mean)) * 1000) / 1000,
      saturatedShare: Math.round((sat / count) * 1000) / 1000,
      tokenShare: Math.round((tokenHits / count) * 1000) / 1000,
      distinctColors: Object.keys(hist).length,
    };
  }

  // Layout similarity: Pearson correlation of 64x36 luminance thumbnails.
  function thumb(img, w, h) {
    var out = new Float64Array(w * h);
    for (var ty = 0; ty < h; ty++) {
      for (var tx = 0; tx < w; tx++) {
        var sx0 = Math.floor((tx * img.width) / w), sx1 = Math.max(sx0 + 1, Math.floor(((tx + 1) * img.width) / w));
        var sy0 = Math.floor((ty * img.height) / h), sy1 = Math.max(sy0 + 1, Math.floor(((ty + 1) * img.height) / h));
        var s = 0, c = 0;
        var stx = Math.max(1, Math.floor((sx1 - sx0) / 6)), sty = Math.max(1, Math.floor((sy1 - sy0) / 6));
        for (var y = sy0; y < sy1; y += sty) for (var x = sx0; x < sx1; x += stx) { s += lumAt(img.data, (y * img.width + x) * 4); c++; }
        out[ty * w + tx] = s / c;
      }
    }
    return out;
  }
  function similarity(a, b) {
    var ta = thumb(a, 64, 36), tb = thumb(b, 64, 36);
    var n = ta.length, ma = 0, mb = 0;
    for (var i2 = 0; i2 < n; i2++) { ma += ta[i2]; mb += tb[i2]; }
    ma /= n; mb /= n;
    var num = 0, da = 0, db = 0;
    for (var k = 0; k < n; k++) { var x = ta[k] - ma, y = tb[k] - mb; num += x * y; da += x * x; db += y * y; }
    if (da === 0 || db === 0) return da === db && ma === mb ? 1 : 0;
    return Math.round((num / Math.sqrt(da * db)) * 1000) / 1000;
  }

  // ---- browser-only helpers -------------------------------------------------
  function loadImageData(url) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas');
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        var ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(im, 0, 0);
        var data = ctx.getImageData(0, 0, c.width, c.height);
        resolve({ data: data.data, width: c.width, height: c.height });
      };
      im.onerror = function () { reject(new Error('could not decode ' + url)); };
      im.src = url;
    });
  }

  /**
   * spec: { shots: [{name, url, runs: [{x,y,w,h,chars,text}] | null}], refUrl }
   * Runs are already in device pixels.
   */
  async function analyzeAll(spec) {
    var out = { shots: {} };
    var ref = spec.refUrl ? await loadImageData(spec.refUrl) : null;
    for (var s = 0; s < spec.shots.length; s++) {
      var shot = spec.shots[s];
      var img = await loadImageData(shot.url);
      var measured;
      var method;
      if (shot.runs) {
        method = 'dom-text-runs';
        measured = [];
        shot.runs.forEach(function (r) {
          var m = measureRun(img, r);
          if (m) measured.push({ ratio: m.ratio, chars: r.chars, text: r.text });
        });
      } else {
        method = 'busy-tiles (no DOM)';
        measured = tileRuns(img, 64);
      }
      var c = summarizeRuns(measured);
      c.method = method;
      out.shots[shot.name] = {
        width: img.width,
        height: img.height,
        palette: palette(img),
        contrast: c,
        similarityToReference: ref ? similarity(img, ref) : null,
      };
    }
    return out;
  }

  var api = {
    relativeLuminance: relativeLuminance,
    contrastRatio: contrastRatio,
    measureRun: measureRun,
    summarizeRuns: summarizeRuns,
    tileRuns: tileRuns,
    palette: palette,
    similarity: similarity,
    analyzeAll: analyzeAll,
    TOKENS: TOKENS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.__eyes = api;
})(typeof window !== 'undefined' ? window : globalThis);
