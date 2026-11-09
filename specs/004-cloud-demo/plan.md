# Implementation Plan: The slice demo hosted from the cloud

**Branch**: `004-cloud-demo` | **Date**: 2026-09-26 | **Spec**: `specs/004-cloud-demo/spec.md`

**Input**: Feature specification from `specs/004-cloud-demo/spec.md`

**Note**: This plan was written by the Claude judge lane in the cloud session, from Joshua's ruling of 2026-09-26, following the `/speckit-plan` template.

## Summary

The public slice will be the in-house engine on dream-online.net, gated by `.github/workflows/engine-suite.yml` for the in-house DREAM Engine (`src/engine/`) headless suite.

## Technical Context

**Language/Version**: TypeScript (the in-house DREAM Engine in `src/engine/`, superseding the retired reference slice); the publish pipeline itself is shell steps, no new source language.

**Primary Dependencies**: the in-house DREAM Engine runtime (`src/engine/`, verified by `.github/workflows/engine-suite.yml` with zero third-party engine dependencies). The public slice will be the in-house engine on dream-online.net.

**Storage**: N/A. Static files only; no database and no player data leave the browser.

**Testing**: the in-house DREAM Engine headless suite (`npm run lint` and `npm test` in `.github/workflows/engine-suite.yml`) is the merge gate; a headless-Chromium pass against the published URL proves a clean boot (zero console errors, zero failed requests) as the new publish gate; frame rate is read separately, on real hardware.

**Target Platform**: any browser with WebGPU or WebGL 2, served from a plain static host with no cross-origin-isolation headers, matching the single-threaded "Web" export preset.

**Project Type**: static hosting of a pre-built engine export; no new application code and no new runtime.

**Performance Goals**: 60 frames per second on desktop hardware, read from the readout in a real browser. Verified: the export step itself takes about 8 seconds after the import pass, and the exported build boots cleanly in headless Chromium (in-house DREAM Engine WebGPU/WebGL 2 runtime through SwiftShader, single-threaded) with zero page errors and zero failed requests, but that software renderer draws this scene at roughly 1 frame per second at 1920x1080, so it is never used to measure or claim a frame rate.

**Constraints**: the export template is fetched, never committed; `build/` stays git-ignored; no secrets in the repository or the hosting configuration; no analytics that identify players; the demo shows only what `STATE.md` records as built. The public slice will be the in-house engine on dream-online.net.

**Scale/Scope**: one hosted page, republished on every merge to `main`; one player at a time, since the slice has no networked multiplayer yet.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (founder locks)**: not touched. No combat, economy or world rule changes; this is a hosting recipe for an unchanged build.
- **Principle IV (test first, nothing lands without the gate)**: the existing 789-check gate is unchanged and stays required before any publish; the new screenshot check is an added gate on the publish step itself, not a replacement.
- **Principle V (spec first, small slices)**: this is the smallest complete slice - hosting the build that already exists, not new gameplay.
- **Principle VI (evidence over assumptions)**: every publish is checked by an actual boot screenshot and a frame-rate reading taken on real hardware, never assumed to work; the headless renderer is trusted only for what it can actually prove (a clean boot), not for a frame rate it cannot produce at speed.
- **Security and public surface**: the export template is fetched by byte range and never vendored; `build/` stays ignored; no secret or token enters the repository or the hosting config, matching the constitution's public-repository rule.

No violation requiring the Complexity Tracking table below.

## Project Structure

### Documentation (this feature)

```text
specs/004-cloud-demo/
├── spec.md    # Feature specification
├── plan.md    # This file
└── tasks.md   # Phase 2 output (numbered, dependency-ordered tasks)
```

### Source Code (repository root)

No new source tree. This feature adds a build-and-publish recipe over the existing project:

```text
src/engine/                               # in-house DREAM Engine runtime and slice
build/web/                                # git-ignored export output this feature publishes
.github/workflows/engine-suite.yml        # required in-house DREAM Engine lint and test check on main
The public slice will be the in-house engine on dream-online.net.
.github/scripts/fetch_web_template.py     # new: byte-range fetch helper for the retired reference slice
.github/scripts/stamp_demo.py             # new: inserts the commit/date/real-gameplay label into index.html
ops/node/JOURNAL.md                       # where each publish is recorded (User Story 3)
```

**Structure Decision**: The public slice will be the in-house engine on dream-online.net, layered on the in-house DREAM Engine (`src/engine/`) and `.github/workflows/engine-suite.yml`.

## Phases (gated by `.github/workflows/engine-suite.yml`)

1. **Fetch** - prepare the build environment (and for the retired reference slice, `.github/scripts/fetch_web_template.py` reads only the `web_nothreads_release.zip` member by HTTP byte range and writes `version.txt` beside it).
2. **Import** - `--headless --import` on a fresh checkout, exactly as the CI job does before running tests, so the "Web" preset has a current import cache.
3. **Export** - `--headless --export-release "Web" ../../../build/web/index.html`, using the existing preset unmodified (verified: about 8 seconds after the import pass), then run `.github/scripts/stamp_demo.py`, which prefixes the page title and inserts a fixed, click-through label naming the commit, the date, "real gameplay in your browser, nothing enhanced," and the roughly 130 MB first load (User Story 1).
4. **Verify** - load the published URL in headless Chromium at 1280x720, wait for the canvas, and confirm zero console errors, zero failed network requests, and the label and commit hash in the first frame; this proves a clean boot only, never a frame rate (User Story 3).
5. **Publish** - The public slice will be the in-house engine on dream-online.net.

Phase 1 (Fetch) is its own step, separate from Phase 2 (Import), specifically so the byte-range template fetch can be measured and retried without re-running the full project import. Phase 4's clean-boot check and the real-hardware frame-rate reading (User Story 3, `tasks.md`) are two separate checks, not one, because the headless software renderer draws this scene at roughly 1 frame per second at 1920x1080 and cannot stand in for the real number.

## Complexity Tracking

*No entries: the Constitution Check above found no violation to justify.*
