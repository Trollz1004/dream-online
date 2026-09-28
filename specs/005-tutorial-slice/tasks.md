---

description: "Task list for the tutorial slice, worthy of the judge lane's name"

---

# Tasks: The tutorial slice, worthy of the judge lane's name

**Input**: `specs/005-tutorial-slice/spec.md` and `plan.md`

**Tests**: every code task lands with its headless checks in the same change, and `MINIMUM_CHECKS` in `game/godot/DreamSlice/tests/run_tests.gd` rises by the number added (never below 789). Frames are graded against the spec's Screenshot bar (SB-01 to SB-15).

**Lanes**: **[Opus]** is a code worker (Claude Opus) on a branch; **[Judge]** is the Claude judge lane, which captures and opens frames, grades them, runs the gates, merges with `--no-ff` and writes the journal. A worker never grades its own frames. [P] marks tasks that touch different files and can run in parallel.

## Phase 0: Baseline capture

- [ ] T001 [Judge] Run the headless suite on current `main`; record the count (expected 789 of 789).
- [ ] T002 [Judge] Export the web build and shoot day and night at 1920x1080 and 1280x720 with the plan's capture procedure; until `shoot_demo.mjs` exists (T055), use a one-off Playwright call with a fixed wait and switch worlds with N. Grade all four frames against SB-01 to SB-15 and journal the baseline grade. (SB-01 to SB-15)
- [ ] T003 [Judge] Measure the Compatibility renderer: export a throwaway build that turns on, one at a time, sun shadows, glow, AgX, adjustments, FXAA and a ReflectionProbe over the street; capture each; fill the plan's render table's web column with drawn or not drawn. Nothing from this build is merged. (FR-005)
- [ ] T004 [Opus] Add `.github/scripts/shoot_demo.mjs` skeleton and the `dreamFrameReady` flag plus the `dream` query-string read in `scripts/world.gd` (web only, `JavaScriptBridge`), with checks that the non-web path ignores it. (FR-001)

**Checkpoint**: the baseline grade and the web capability table exist; every later grade is compared with T002.

## Phase 1: Render settings, day

- [ ] T010 [Opus] Create `scripts/render_profile.gd` (pure `profile(world, web)`), move every day setting out of `_build_day_environment` in `scripts/dream_env.gd` into it, with no visual change yet; add `tests/test_render_profile.gd` for the day profile on both platforms. (FR-002)
- [ ] T011 [Opus] Day key light: shadows on in the web profile at the plan's low-cost settings, or blob shadows if T003 says no; long golden shadows across the lane. (FR-003; SB-01)
- [ ] T012 [Opus] Day sky: keep the gradient, strengthen the cloud plane so clouds read at 1920x1080 in the web frame. (FR-003; SB-02)
- [ ] T013 [Opus] Day air: tune depth and height fog and aerial perspective so near, mid and far planes separate; add haze cards if the web frame needs them. (FR-003, FR-005; SB-03)
- [ ] T014 [Opus] Day glow and grade: glow in the web profile if T003 says drawn, else soft billboards; AgX or its Filmic fallback. (FR-003, FR-005; SB-09)
- [ ] T015 [Opus] Day ground: break tiling toward the horizon (macro noise already in the ground shader, distance blend to a second scale) and add contact darkening around footprints. (FR-003; SB-06)
- [ ] T016 [Judge] Capture and grade the day frames; send back any failing item with the frame. (SB-01 to SB-07, SB-09)

## Phase 2: Render settings, night

- [ ] T020 [Opus] Move every night setting from `_build_night_environment` into `render_profile.gd`; extend `tests/test_render_profile.gd`. (FR-002)
- [ ] T021 [Opus] Night sky: add the star field and keep the horizon glow. (FR-004; SB-02)
- [ ] T022 [Opus] Moon shadows in the web profile, or blob shadows per T003. (FR-004, FR-005; SB-03, SB-04)
- [ ] T023 [Opus] Wet street for the web: the ReflectionProbe if T003 says drawn, else the mirrored reflection layer under a streaked overlay; SSR stays on the desktop. (FR-004, FR-005; SB-08)
- [ ] T024 [Opus] Lamp and sign glow and night light-shaft cards; haze between near and far towers. (FR-004, FR-005; SB-03, SB-09)
- [ ] T025 [Judge] Capture and grade the night frames. (SB-02 to SB-09)

## Phase 3: Camera and character read

- [ ] T030 [Opus] `scripts/player.gd`: new default chase framing and spawn yaw toward the landmark; keep `set_camera_distance` and every capture flag working; checks for the spring values and spawn yaw. (FR-006; SB-07)
- [ ] T031 [Opus] Hero rim: material rim in `scripts/character_model.gd` and a weak back light on the camera rig; checks that both exist. (FR-006; SB-05)
- [ ] T032 [Opus] Separate the hero's value from the ground at spawn in both worlds (cloak edge or ground around camp), guided by the T016 and T025 frames. (FR-006; SB-04)
- [ ] T033 [Judge] Grade SB-04, SB-05 and SB-07 on fresh day and night frames.

## Phase 4: HUD cleanup

- [ ] T040 [Opus] `scripts/hud.gd`: the bottom bar becomes the default HUD on a dark see-through panel; the text column hidden by default (getters kept); the frame-rate line small at bottom right; the help block no longer on the play screen; the one-line prompt label added. Update `tests/test_hud.gd`. (FR-007; SB-10, SB-14)
- [ ] T041 [Opus] `scripts/hotbar_layout.gd` and `scripts/keyboard_panel.gd`: bottom-left default, `layout_rects(viewport_size)`, and a clamp that keeps a restored saved position clear of the prompt; overlap checks at 1280x720 and 1920x1080 in `tests/test_keyboard_hotbar.gd`. (FR-008; SB-13)
- [ ] T042 [P] [Opus] `scripts/keycap.gd`: real code-drawn icons (red bottle, blue bottle, bread, skill glyphs); a check that no keycap uses the dot. (FR-009; SB-11)
- [ ] T043 [P] [Opus] `scripts/combo_list_panel.gd` on L, the three-column see-through screen; `tests/test_combo_list.gd` checks one row per resolved skill with its tag and honest stubs. (FR-016; SB-10, SB-13) (User Story 4)
- [ ] T044 [Judge] Grade SB-10 to SB-15 at both resolutions, the combo list screen open and closed.

## Phase 5: Tutorial director beats

- [ ] T050 [Opus] `scripts/tutorial_beats.gd` and `scripts/tutorial_director.gd`: the eleven beats, one prompt each, cues, completion by signal, out-of-order handling, neutral retries; `world.gd` creates it unless `--demo` or `--no-tutorial`. `tests/test_tutorial_director.gd`. (FR-010, FR-017; SB-14)
- [ ] T051 [Opus] Keycap and world cues: `keyboard_panel.gd` gains a highlight call; ground marker; Sentinel wind-up glow tied to the dash beat in `scripts/dummy.gd` (the 1.4 s telegraph is unchanged). (FR-010)
- [ ] T052 [P] [Opus] `scripts/gather_node.gd`, placed on the route in both worlds, with its footprint registered; checks for available, gathered, cooldown. (FR-011)
- [ ] T053 [P] [Opus] The resource-bloom event through `scripts/world_event.gd`, with a visible area change; checks for the envelope's calm-to-active move. (FR-011)
- [ ] T054 [Opus] Mireth's callback beat: after the event, her line recalls a prior beat and names the event, lab up and lab down; checks in `tests/test_npc_memory.gd`. (FR-012)
- [ ] T055 [Opus] `scripts/checkpoint_save.gd` and the camp fire; `tests/test_gather_and_checkpoint.gd` round-trips every FR-013 field. Finish `.github/scripts/shoot_demo.mjs` from T004. (FR-013)
- [ ] T056 [Judge] Play spawn to checkpoint once on real hardware with no outside explanation; journal what was unclear. (SC-004)

## Phase 6: Ember and GeminEYE placement

- [ ] T060 [Opus] `scripts/ember.gd`: the original figure, emissive core, light, bleed tell, fixed departure lines, placed on the route in both worlds outside the clear radii; `tests/test_ember.gd` including no Label child and no prompt naming him. (FR-014; SB-09, SB-11) (User Story 3)
- [ ] T061 [P] [Opus] GeminEYE: the eye's glow or billboard per the render table; a check that the pet exists at the shoulder offset through every beat and its shop stays convenience only. (FR-015, FR-020; SB-09, SB-11)
- [ ] T062 [Judge] Grade one frame with Ember in view and one with the pet looting, both worlds; confirm nothing names or explains him. (SB-09, SB-11, SB-15)

## Phase 7: Tests

- [ ] T070 [Opus] Load every new test file from `tests/run_tests.gd`; raise `MINIMUM_CHECKS` by exactly the checks added; run a headless import so every new `.gd` has its `.uid`. (FR-018)
- [ ] T071 [Opus] A text-wall sweep check: walk every visible Label under the HUD, tutorial and prompt layers at each beat; at most two tutorial lines, none over 90 characters. (FR-010; SB-14; SC-006)
- [ ] T072 [Opus] A copy check over every new prompt, Ember line and Mireth line against the competitor, real-money and mocking word lists kept in the test. (FR-017, FR-020)
- [ ] T073 [Judge] Run the full suite; it passes every check at or above the new floor; both required GitHub checks green on the pull request. (SC-003)

## Phase 8: Export and screenshot review

- [ ] T080 [Judge] Export the web build from the merge candidate, stamp it, and shoot day and night at 1920x1080 and 1280x720 with `shoot_demo.mjs`; zero console errors, zero failed requests. (SB-12)
- [ ] T081 [Judge] Grade all four frames against SB-01 to SB-15, opening each; any no goes back to its phase's worker with the frame. (SC-001, SC-002)
- [ ] T082 [Judge] Merge with `git merge --no-ff` into `main` through the pull request; let `demo-pages.yml` republish.
- [ ] T083 [Judge] Ask Joshua (or the node lane) for the real-hardware frame-rate reading from the published page; if under the SC-005 floor, drop the costliest render-table item to its fallback and re-grade. (SC-005)
- [ ] T084 [Judge] Journal the commit, the frame paths, the SB grade next to the T002 baseline, the frame-rate reading, and update `STATE.md`, `docs/gdd/10-crowdfunding-readiness.md` (combo list screen done) and the slice `README.md` (tutorial, L key).

## Dependencies & Execution Order

- Phase 0 first: T003's capability table decides every web fallback in Phases 1 and 2.
- Phase 1 (T010) before Phase 2 (T020): both edit `render_profile.gd` and `dream_env.gd`.
- Phase 3 after Phases 1 and 2, since the hero's read depends on the final light.
- Phase 4 can run beside Phases 1 to 3 (different files); T043 and T042 are parallel.
- Phase 5 depends on T040 (the prompt label) and T041 (the highlight target); T052 and T053 are parallel.
- Phase 6 depends on the route positions from T052 and T053.
- Phase 7 closes each phase's checks; T070 runs last among code tasks.
- Phase 8 depends on everything; nothing merges until T081 passes and T073 is green.

## Notes

- The graded frame is the browser build's; a desktop-only improvement does not pass an SB item.
- Frames and exports never enter the repository; `build/` stays ignored.
- No task adds networking, marketplace or monetisation work (spec, Out of scope).
