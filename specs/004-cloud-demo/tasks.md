---

description: "Task list for the slice demo hosted from the cloud"

---

# Tasks: The slice demo hosted from the cloud

**Input**: Design documents from `specs/004-cloud-demo/` (`spec.md`, `plan.md`)

**Tests**: the slice's existing headless suite is the merge gate; the headless-Chromium screenshot in Phase 5 below is the publish gate this feature adds.

**Organization**: tasks are grouped by user story, in the same fetch/import/export/verify/publish order as `.github/workflows/godot-slice.yml`, so each story is independently demonstrable.

## Phase 1: Setup

- [ ] T001 Confirm the current `main` commit's headless suite still reads 789 of 789 (`game/godot/DreamSlice/tests/run_tests.gd`) before building anything meant to be published.
- [ ] T002 Fetch the Godot 4.7.2 Linux headless binary the same way `.github/workflows/godot-slice.yml` already does.
- [ ] T003 [P] Run `.github/scripts/fetch_web_template.py`, which fetches by HTTP byte range only the `web_nothreads_release.zip` member of `Godot_v4.7.2-stable_export_templates.tpz` from the official GitHub release, places it at `~/.local/share/godot/export_templates/4.7.2.stable/`, and writes a `version.txt` beside it.

## Phase 2: Foundational

**⚠️ Blocking**: no export can happen until this phase is done.

- [ ] T004 Run `--headless --path game/godot/DreamSlice --import` on a fresh checkout so the "Web" preset has a current import cache.
- [ ] T005 Confirm `export_presets.cfg`'s "Web" preset still sets `variant/thread_support=false` and both extension options off, so the export needs no cross-origin-isolation headers.

**Checkpoint**: the project is fetched, templated and imported; export can begin.

## Phase 3: User Story 1 - Joshua opens one link (Priority: P1) 🎯 MVP

**Goal**: one published URL that boots to the real slice in-browser, labelled with its commit hash and the real-slice notice.

**Independent Test**: open the URL cold, with no repository checkout, and see the label and commit hash in the first frame, then play a movement-and-combat pass.

- [ ] T006 [US1] Export the "Web" preset to `build/web/index.html` from the imported project (depends on T004, T005; verified: about 8 seconds after the import pass).
- [ ] T007 [US1] Run `.github/scripts/stamp_demo.py` on the exported page: it prefixes the page title and inserts a fixed, click-through label naming the commit, the date, "real gameplay in your browser, nothing enhanced," and the roughly 130 MB first load, visible at or before the first rendered frame.
- [ ] T008 [US1] Confirm the exported build still shows the existing frames-per-second readout and the "Click to look around." pointer-lock hint, unchanged from the desktop and local web builds.
- [ ] T009 [US1] Merge to `main` and let `.github/workflows/demo-pages.yml` publish; then read the page URL (`https://trollz1004.github.io/dream-online/`) from the workflow's `github-pages` environment.
- [ ] T010 [US1] Open the published URL in headless Chromium at 1280x720, confirm the canvas renders with zero console errors and zero failed network requests, and confirm the label and commit hash are visible in the first frame.

**Checkpoint**: Joshua has one working link; User Story 1 is demonstrable on its own.

## Phase 4: User Story 2 - every merge republishes the demo (Priority: P2)

**Goal**: the hosted demo rebuilds from the same steps CI already runs, so it never lags `main`.

**Independent Test**: merge a trivial change to `main` and confirm the hosted URL's label now reads the new commit hash, with no manual export step.

- [ ] T011 [US2] Create `.github/workflows/demo-pages.yml`, triggered on a push to `main` that touches `game/godot/**` and on `workflow_dispatch`, with a job that runs only after the headless-suite check passes.
- [ ] T012 [US2] In that workflow, call `.github/scripts/fetch_web_template.py` as its own step (T003's logic), so it never downloads the full 1.28 GB archive.
- [ ] T013 [US2] In that workflow, run the import, export and `.github/scripts/stamp_demo.py` steps (T004, T006, T007) so every automated build carries the commit it was built from.
- [ ] T014 [US2] In that workflow, deploy `build/web` to GitHub Pages (`enablement: true`) so it publishes at `https://trollz1004.github.io/dream-online/`, gated on the headless-suite check's success so a red suite never republishes; if the workflow's token lacks the Pages right, Joshua enables it once at Settings, Pages, Source: GitHub Actions.

**Checkpoint**: User Stories 1 and 2 both work; the link now stays current with `main` on its own.

## Phase 5: User Story 3 - the judge lane verifies and records each publish (Priority: P3)

**Goal**: every publish is checked by a real screenshot and its frame-rate line, and the result is written down.

**Independent Test**: after a publish, produce one screenshot file and one journal line naming the URL, the commit and the screenshot's path, traceable to the same publish.

- [ ] T015 [US3] After each publish, load the hosted URL in headless Chromium, wait for the canvas, confirm zero console errors and zero failed network requests, and save a screenshot (depends on T009 or T014). This proves a clean boot only; do not read a frame rate from it, since this renderer draws the scene at roughly 1 frame per second at 1920x1080.
- [ ] T016 [US3] Open the same URL in a real browser on real hardware (Joshua's, typically), read the frame-rate line from the readout, and note the number (expected 60 on desktop hardware).
- [ ] T017 [US3] Record the URL, the commit hash, the screenshot's location and the real-hardware frame-rate reading as a new entry in `ops/node/JOURNAL.md`.

**Checkpoint**: all three stories work independently; the last task closes the loop with a written record.

## Dependencies & Execution Order

- Setup (Phase 1) has no dependencies and can start immediately.
- Foundational (Phase 2) depends on Setup and blocks every user story.
- User Story 1 depends only on Foundational; User Story 2 depends on User Story 1's export and label steps (T006, T007) existing to script; User Story 3 depends on a publish existing to verify (from either User Story 1 or 2).
- T003 and T002 can run in parallel (different downloads, no shared file).

## Notes

- [P] tasks touch different files or downloads and carry no ordering dependency on each other.
- Each user story is independently demonstrable: a link (US1), that link staying current (US2), and proof it was checked (US3).
- T017 is the closing task: nothing in this feature is done until the record exists.
