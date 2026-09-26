# Implementation Plan: The slice demo hosted from the cloud

**Branch**: `004-cloud-demo` | **Date**: 2026-09-26 | **Spec**: `specs/004-cloud-demo/spec.md`

**Input**: Feature specification from `specs/004-cloud-demo/spec.md`

**Note**: This plan was written by the Claude judge lane in the cloud session, from Joshua's ruling of 2026-09-26, following the `/speckit-plan` template.

## Summary

Host the existing Godot 4.7.2 web export of `game/godot/DreamSlice` on GitHub Pages, reachable at one link, published by a new workflow that reuses the same fetch, import and export steps `.github/workflows/godot-slice.yml` already runs for the headless suite, verified per publish with a headless-browser screenshot for a clean boot and a frame-rate reading taken on real hardware, and recorded in `ops/node/JOURNAL.md`.

## Technical Context

**Language/Version**: GDScript (the existing `game/godot/DreamSlice` project, Godot 4.7.2); the publish pipeline itself is shell steps, no new source language.

**Primary Dependencies**: the Godot 4.7.2 Linux headless binary (already fetched by the CI workflow); Godot's official export-templates archive, read by HTTP byte range through `.github/scripts/fetch_web_template.py` for only the `web_nothreads_release.zip` member; `.github/scripts/stamp_demo.py` to label the exported page; Playwright's headless Chromium, already installed in the cloud session, for the boot check; GitHub's Pages deployment action, reached through the new `.github/workflows/demo-pages.yml`, for publishing. The container's Vercel connector cannot carry the exported files (`index.wasm` about 39.5 MB, `index.pck` about 86 MB), so it and any other static host stay a later option, not used for this feature.

**Storage**: N/A. Static files only; no database and no player data leave the browser.

**Testing**: the slice's own headless suite (789 of 789) stays the merge gate, unchanged; a headless-Chromium pass against the published URL proves a clean boot (zero console errors, zero failed requests) as the new publish gate; frame rate is read separately, on real hardware.

**Target Platform**: any browser with WebGL 2, served from a plain static host with no cross-origin-isolation headers, matching the single-threaded "Web" export preset.

**Project Type**: static hosting of a pre-built engine export; no new application code and no new runtime.

**Performance Goals**: 60 frames per second on desktop hardware, read from the readout in a real browser. Verified: the export step itself takes about 8 seconds after the import pass, and the exported build boots cleanly in headless Chromium (Godot 4.7.2, WebGL 2 through SwiftShader, single-threaded) with zero page errors and zero failed requests, but that software renderer draws this scene at roughly 1 frame per second at 1920x1080, so it is never used to measure or claim a frame rate.

**Constraints**: the export template is fetched, never committed; `build/` stays git-ignored; no secrets in the repository or the hosting configuration; no analytics that identify players; the demo shows only what `STATE.md` records as built; GitHub Pages needs one-time enabling for this repository (the workflow's `enablement: true` attempts it, and Joshua sets Settings, Pages, Source: GitHub Actions if the token lacks the right).

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
game/godot/DreamSlice/                    # existing project; unchanged by this feature
game/godot/DreamSlice/export_presets.cfg  # already defines the single-threaded "Web" preset used
build/web/                                # git-ignored export output this feature publishes
.github/workflows/godot-slice.yml         # existing fetch/import/export/test steps this feature reuses
.github/workflows/demo-pages.yml          # new workflow: publishes build/web to GitHub Pages
.github/scripts/fetch_web_template.py     # new: byte-range fetch of web_nothreads_release.zip, writes version.txt
.github/scripts/stamp_demo.py             # new: inserts the commit/date/real-gameplay label into index.html
ops/node/JOURNAL.md                       # where each publish is recorded (User Story 3)
```

**Structure Decision**: one new workflow file and two new scripts, all under `.github/`, layered on the existing slice and its existing CI workflow. No other new directories. `demo-pages.yml` triggers on a push to `main` that touches `game/godot/**`, and on `workflow_dispatch` for an on-demand run.

## Phases (matching `.github/workflows/godot-slice.yml`)

1. **Fetch** - download the Godot 4.7.2 Linux headless binary exactly as the CI job does, then run `.github/scripts/fetch_web_template.py`, which reads only the export-templates archive's `web_nothreads_release.zip` member by HTTP byte range into `~/.local/share/godot/export_templates/4.7.2.stable/` and writes a `version.txt` beside it.
2. **Import** - `--headless --import` on a fresh checkout, exactly as the CI job does before running tests, so the "Web" preset has a current import cache.
3. **Export** - `--headless --export-release "Web" ../../../build/web/index.html`, using the existing preset unmodified (verified: about 8 seconds after the import pass), then run `.github/scripts/stamp_demo.py`, which prefixes the page title and inserts a fixed, click-through label naming the commit, the date, "real gameplay in your browser, nothing enhanced," and the roughly 130 MB first load (User Story 1).
4. **Verify** - load the published URL in headless Chromium at 1280x720, wait for the canvas, and confirm zero console errors, zero failed network requests, and the label and commit hash in the first frame; this proves a clean boot only, never a frame rate (User Story 3).
5. **Publish** - deploy `build/web` to GitHub Pages through `.github/workflows/demo-pages.yml`, at `https://trollz1004.github.io/dream-online/`; Pages needs one-time enabling for the repository, which the workflow's `enablement: true` requests. Vercel or another static host stays a documented later option, not used here because the container's Vercel connector cannot carry files this large.

Phase 1 (Fetch) is its own step, separate from Phase 2 (Import), specifically so the byte-range template fetch can be measured and retried without re-running the full project import. Phase 4's clean-boot check and the real-hardware frame-rate reading (User Story 3, `tasks.md`) are two separate checks, not one, because the headless software renderer draws this scene at roughly 1 frame per second at 1920x1080 and cannot stand in for the real number.

## Complexity Tracking

*No entries: the Constitution Check above found no violation to justify.*
