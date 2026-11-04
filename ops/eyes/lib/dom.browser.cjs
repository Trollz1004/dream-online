/**
 * Eyes gate — DOM facts collected inside the captured page.
 * Self-contained evaluation: returns DomFacts directly, never touches window.__eyesDom.
 * Only text a person can actually see counts: hidden, transparent, off-screen
 * and covered (occluded) text is skipped. Rects are CSS pixels.
 */
(function (maxRuns) {
  'use strict';

  function related(a, b) {
    return a === b || a.contains(b) || b.contains(a);
  }

  var vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  var vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  var runs = [];
  var parts = [];
  var skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  var walker = typeof document !== 'undefined' && document.body
    ? document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    : null;
  var node;
  while (walker && (node = walker.nextNode()) && runs.length < maxRuns) {
    var raw = node.nodeValue;
    if (!raw || !raw.trim()) continue;
    var el = node.parentElement;
    if (!el || skip[el.tagName]) continue;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    var cs = getComputedStyle(el);
    var range = document.createRange();
    range.selectNodeContents(node);
    var rects = Array.prototype.slice.call(range.getClientRects());
    var seen = false;
    var text = raw.replace(/\s+/g, ' ').trim();
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var x0 = Math.max(0, r.left), y0 = Math.max(0, r.top);
      var x1 = Math.min(vw, r.right), y1 = Math.min(vh, r.bottom);
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;
      var top = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
      if (!top || !related(top, el)) continue;
      seen = true;
      runs.push({
        x: x0, y: y0, w: x1 - x0, h: y1 - y0,
        fontSize: parseFloat(cs.fontSize) || 0,
        fontWeight: parseInt(cs.fontWeight, 10) || 400,
        chars: Math.max(1, Math.round(text.length / rects.length)),
        text: text.slice(0, 60),
      });
    }
    if (seen) parts.push(text);
  }
  var broken = typeof document !== 'undefined'
    ? Array.prototype.slice.call(document.images)
        .filter(function (im) {
          var visible = im.checkVisibility ? im.checkVisibility() : true;
          return visible && (im.currentSrc || im.src) && im.complete && im.naturalWidth === 0;
        })
        .map(function (im) { return String(im.currentSrc || im.src).slice(0, 160); })
    : [];
  return {
    title: typeof document !== 'undefined' ? document.title : '',
    runs: runs,
    visibleText: parts.join('\n').slice(0, 30000),
    brokenImages: broken,
    hasCanvas: typeof document !== 'undefined' ? !!document.querySelector('canvas') : false,
  };
})(800);
