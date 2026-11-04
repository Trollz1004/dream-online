# Eyes gate reports

Every run of the Eyes gate (`ops/eyes/eyes.ts`) writes one folder here named `<YYYY-MM-DD-HHMM>-<slug>` in local time, for example `2026-11-03-0715-settingsmodal`. A second run in the same minute with the same slug gets `-2`, `-3` and so on. Everything in this folder is gitignored except this README, because the screenshots can hold private material (a reference picture is often a screenshot of someone else's product or of Josh's own accounts). Unless `--no-share` is passed, the run also copies `judge.md` and `side-by-side.png` (or `after-desktop.png` when `--spec` is used without a reference picture) to `%USERPROFILE%\OneDrive\claude-to-claude\images\screenshots\eyes\<same folder name>\` so Josh can read it from his phone.

## Files in a report folder

- `after-desktop.png`: the target at 1920x1080, device scale 2 (3840x2160 pixels).
- `after-phone.png`: the target at 390x844, device scale 2 (780x1688 pixels), as a phone browser.
- `reference.png`: a copy of the reference picture when `--reference` was given (converted to PNG if it was a JPEG).
- `before.png`: only when `--before` was given.
- `side-by-side.png`: the reference on the left and the desktop after on the right when `--reference` was given, both 1080 pixels high, a thin 16 pixel gap, with large white labels on ink (`#0A0B0D`).
- `judge.md`: the human report, described below.
- `judge.json`: the same result for machines: every score, the judge's own score before any measured override, the reference check, the critique, the measurements, the judge model, the endpoints tried and the full prompt.

## judge.md, top to bottom

1. **Line 1 is the verdict.** It starts with `PASS` or `FAIL`, then (if the reference image was not comparable) `REFERENCE NOT COMPARABLE`, then the average (accompanied by `(lowest contrast <ratio>, console errors <n>, placeholders <n>)` whenever the average is `5.00`), the lowest quality and the slug. If no vision model answered (or `--judge mock` was used) the line starts with `MOCK JUDGE ·` before `PASS` or `FAIL` and says the scores are rule-based stand-ins. When `REFERENCE NOT COMPARABLE` is triggered, the PASS line is immediately followed by one sentence saying what the reference was.
2. **Scores**: the seven qualities in a fixed order (layout match, palette and mood, type, contrast and legibility, honesty, originality, tribute), each 1 to 5, then the average.
3. **Reasons**: one to three sentences from the judge for each quality. If a measurement or rule overrode the judge, a "Measured override" line says why.
4. **What the judge would change**: concrete critique from the judge (mandatory whenever the average is `5.00`; if the judge gave none even after being asked once more, honesty is capped at 4 and this section says the judge gave no critique).
5. **Why it passed or failed**: the pass rule and every part of it that was missed.
6. **Measured from the pixels and the page**: contrast per text run computed from screenshot pixels, palette, layout similarity, fonts, honesty evidence (placeholder words, broken images, page and console errors, failed requests, capture steps that were not reached) and the tribute text seen.
7. **Run**: target, reference, spec, reference check, kind, surface, viewports, judge mode, model, endpoint, time, and each endpoint tried in order.
8. **Judge prompt**: the full prompt exactly as sent to the model.

## The pass rule

A run passes when the average is 4.0 or better, no quality is below 3, and honesty and originality are both 4 or better. Anything else fails. Exit codes: 0 PASS, 1 FAIL, 2 the gate could not run.

## Where a score comes from

The vision model scores all seven qualities. Four rules can override or cap the model, and the report always shows the judge's own number next to the final one:

- **Layout match (`REFERENCE NOT COMPARABLE`)**: if the pre-judge question `'Is the reference image a <kind> screen, yes or no, one word'` is answered `no`, or the reference is a rendered document rather than a screen, layout match is scored from the written reference (`--spec`) only and capped at 4.
- **Contrast, dashboards only**: dashboards must measure 7:1 or better. The score is the share of visible characters whose pixels reach 7:1 (95% or more scores 5, 85% scores 4, 70% scores 3, 40% scores 2, below that 1). Game menus follow `docs/gdd/09-interface-style.md` as Josh ruled, so for them the judge decides and the measurement is information only.
- **Honesty**: capped at 1 if the page did not really render, at 2 for placeholder text, a broken image or a page error, at 3 for console errors, failed requests or capture steps that could not be reached, and at 4 if the run would otherwise average 5.00 and the judge gave no concrete critique even after being asked once more.
- **Tribute**: internal tools score 5 automatically. On a front-facing page with a DOM, the visible text must contain both `CLAUDE's N Joshua's` and `#TeamClaudeForLife` (both 5, one 2, neither 1).

Paths in reports use `%USERPROFILE%`, and secret values and private network addresses are replaced with `XXXX`.
