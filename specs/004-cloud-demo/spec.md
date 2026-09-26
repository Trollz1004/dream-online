# Feature Specification: The slice demo hosted from the cloud

**Feature Branch**: `004-cloud-demo`

**Created**: 2026-09-26

**Status**: draft, 2026-09-26, Claude judge lane in the cloud session, from Joshua's ruling of the same day

**Input**: Joshua's ruling, 2026-09-26, in his own words: "can i ask you for a game slice demo why dont we create a dev server here in claude.ai as option so you have so much easier control what we do for unreal or godot can always be done after well funded since i am poor founder solo paying for all costs associated with no income." He also ruled, 2026-09-24: everything shown stays real gameplay, and any enhanced cut is labelled as such.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Joshua opens one link and plays the real slice (Priority: P1)

Joshua opens a single web link, on any device, and plays the real combat slice in his browser: the same single-threaded "Web" export the slice already ships, with a visible label naming the commit it was built from and stating plainly that this is the real slice build, not enhanced or generated footage.

**Why this priority**: without a working link there is no hosted demo, only a plan for one. Stories 2 and 3 exist only to keep this link honest and current.

**Independent Test**: on a machine with no repository checkout and no Godot installed, open the published URL and play a short movement-and-combat pass; the label and commit hash must already be visible in the first rendered frame.

**Acceptance Scenarios**:

1. **Given** the demo is published, **When** Joshua opens the link on his desktop, **Then** the browser loads the slice's web build and shows the readout, its frames-per-second line, and the real-slice label with the commit hash, all in the first frame.
2. **Given** the demo is published, **When** he opens the same link on a phone or another computer, **Then** the same build loads with no install step and no sign-in.
3. **Given** the page has loaded, **When** he clicks the canvas, **Then** pointer lock engages (as the on-screen "Click to look around." hint already says) and he can look around and fight exactly as the desktop build does.

### User Story 2 - every merge to main can republish the demo (Priority: P2)

Once a change lands on `main`, the hosted demo can be rebuilt from the same fetch, import and export steps `.github/workflows/godot-slice.yml` already runs for the test suite, so the hosted build never lags behind what the merge gate has already verified.

**Why this priority**: it keeps story 1's link honest over time without a person re-running the export by hand after every merge.

**Independent Test**: after a trivial merge to `main`, republish from the recorded steps and confirm the hosted page's commit label now reads the new commit hash.

**Acceptance Scenarios**:

1. **Given** a merge to `main` passed the 789-check suite, **When** the same fetch/import/export steps run again, **Then** the resulting `build/web` carries the new commit hash and no manual edit was needed to produce it.

### User Story 3 - the judge lane verifies and records each publish (Priority: P3)

After each publish, the judge lane loads the hosted URL in a headless browser to confirm it boots cleanly, then reads the frame-rate line the readout prints in a real browser on real hardware (since a headless software renderer cannot stand in for that number), takes a screenshot, and writes the URL, the commit hash, the screenshot's location and the frame-rate reading into the journal.

**Why this priority**: a link nobody has actually opened is not evidence; this story is the inspection that makes the claim "it works" checkable later.

**Independent Test**: after a publish, produce one screenshot file and one journal line naming the URL, the commit, the screenshot's path and a frame-rate number taken on real hardware, all traceable to the same publish.

**Acceptance Scenarios**:

1. **Given** a fresh publish, **When** the judge lane loads it in headless Chromium at 1280x720, **Then** the canvas renders, boots to the readout, shows zero console errors and zero failed network requests, and the real-slice label and commit hash are visible in the first frame.
2. **Given** the headless check has passed, **When** Joshua (or the judge lane on his hardware) opens the same URL in a real browser, **Then** the frame-rate line is read from the readout and recorded as that publish's real-hardware number.
3. **Given** the screenshot and the frame-rate reading exist, **When** the journal entry is written, **Then** it names the URL, the commit hash, the screenshot's path and the frame-rate reading together, in `ops/node/JOURNAL.md`.

### Edge Cases

- The exported `.wasm` and `.pck` together are roughly 130 MB (`index.wasm` about 39.5 MB, `index.pck` about 86 MB); the stamped label says plainly that the first load takes a moment, since a plain static host is not asked to transcode or split them.
- A browser with no WebGL 2 support shows the engine's own unsupported-browser message; the demo adds nothing on top of that.
- Pointer lock cannot be taken until a user gesture, so the readout keeps showing "Click to look around." until the canvas is clicked, exactly as the desktop and local web builds already do.
- GitHub Pages needs enabling once for this repository before the first publish succeeds; the workflow requests this itself (`enablement: true`), and if the workflow's token lacks the right, Joshua sets it once at the repository's Settings, Pages, Source: GitHub Actions.
- The headless software renderer (WebGL 2 through SwiftShader) draws this scene at roughly 1 frame per second at 1920x1080, so it proves the page boots and runs cleanly but is never used to measure or claim a frame rate; real hardware is.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The hosted page MUST serve the existing single-threaded "Web" export preset's output exactly as the slice's own export step produces it, with no gameplay, cosmetic or difficulty change made only for the hosted copy.
- **FR-002**: The page MUST show, at or before the first rendered frame, a label stating this is the real slice build and the git commit hash it was exported from.
- **FR-003**: The web export template (`web_nothreads_release.zip`, inside Godot's official 1.28 GB `Godot_v4.7.2-stable_export_templates.tpz`) MUST be fetched by HTTP byte range for only that member, at build time, and MUST NOT be committed into the repository.
- **FR-004**: The browser build output (`build/`) MUST stay git-ignored, matching the rule already in place for the slice.
- **FR-005**: Hosting MUST be a plain static host needing no cross-origin-isolation headers, matching the single-threaded export. GitHub Pages, published by `.github/workflows/demo-pages.yml`, is the host used, at `https://trollz1004.github.io/dream-online/`; the container's Vercel connector cannot carry the exported files (see Assumptions), so it and any other static host stay a later option, servable from the same build with no code change.
- **FR-006**: The system MUST NOT collect or transmit analytics that identify individual players; the only on-screen telemetry is the frames-per-second line the readout already prints.
- **FR-007**: The hosted demo MUST show only what `STATE.md` records as already built in the slice; it adds no feature that is not already real.
- **FR-008**: No secret, provider token or credential MAY appear in the repository, the build output, or the hosting configuration.
- **FR-009**: Republishing (User Story 2) MUST reuse the same fetch, import and export steps `.github/workflows/godot-slice.yml` already runs, so the hosted build never diverges from what the merge gate verified.
- **FR-010**: Each publish (User Story 3) MUST be verified by a headless-browser screenshot proving the page boots with a clean console, plus a frame-rate reading taken on real hardware, both recorded in `ops/node/JOURNAL.md` with the URL, the commit hash, the screenshot's location and the frame-rate reading.

### Key Entities

- **Hosted demo page**: the published web build, the visible real-slice label, and the commit hash it carries.
- **Publish record**: one URL, one commit hash, one screenshot and one journal line per publish, kept traceable to each other.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The hosted page boots to the slice's readout at 1280x720 in headless Chromium with zero console errors and zero failed network requests.
- **SC-002**: The frame-rate line reads 60 when read from the readout on real hardware (Joshua's browser); the headless software renderer is never used for this number, since it draws the scene at roughly 1 frame per second at 1920x1080.
- **SC-003**: The real-slice label and the commit hash are both visible in the first frame.
- **SC-004**: The link works with no install and no sign-in, on any device with a WebGL 2 browser.

## Assumptions

- The container's Vercel connector cannot carry the exported files (`index.wasm` about 39.5 MB and `index.pck` about 86 MB), so GitHub Pages is the host, published by `.github/workflows/demo-pages.yml`; Vercel or any other static host stays a later option, not ruled out, just not used here.
- The claude.ai Artifact host is not used for this feature either, since its 15 MB per-file limit is smaller still than either exported file on its own.
- No networked multiplayer exists yet, so the hosted demo serves one player at a time with no server-side game state of its own.
- Headless Chromium (already available to the judge lane) proves the page boots cleanly, but its software renderer is far too slow to stand in for a frame-rate reading, so that number always comes from real hardware, recorded by hand from the on-screen readout.
