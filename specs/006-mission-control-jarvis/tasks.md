# Tasks: Mission Control with JARVIS on the Echo Show

**Input**: `spec.md`, `plan.md`. **Prerequisite**: the research report and the ANTIGRAVITY survey under `C:\DREAM\recon\mission-control\`.

Tasks are ordered so that every phase ends with something Joshua can see or hear. Each task names its lane. "Alienware" is the Claude judge lane on this node; "Sabretooth" is the Sabretooth Claude judge lane; "Codex" is the peer judge for the date app; "Hermes" implements cards a judge writes. A task is done only when its proof exists.

## Phase 0: Gate and inputs (Alienware, tonight)

- [ ] T001 Validators built test-first in `C:\DREAM\recon\mission-control\tools\` (`validate-github.mjs`, `validate-links.mjs`, `node --test`, at least 20 checks, README). Proof: the test count in the worker's report, re-run by the judge lane.
- [ ] T002 Target lists under `C:\DREAM\recon\mission-control\config\`: `github-targets.json`, `links-targets.json`, `date-app-routes.json`, `notification-paths.json`. Proof: files present, every entry with a source.
- [ ] T003 CI patch `patches/mission-control-ci.yml` with `patches/README.md`. Proof: the YAML parses and its paths exist in ANTIGRAVITY's tree.
- [ ] T004 Research report on the voice path with sources; the plan's "Voice path, verified" section filled and the pick recorded. Proof: the section names the path, the cost (zero), and the one thing that would make it fail.
- [ ] T005 Drop box card `FABLE-TO-SABRETOOTH-2026-09-30.md` (and a copy addressed to Codex for the date-app items) pointing at the spec, plan, tasks, tools, configs and patch, with the judge lane named as approver. Proof: the file in the drop box, a changelog line.
- [ ] T006 Journal, dispatch and queue entries; auto-memory for durable rulings (JARVIS is Hermes; The House). Proof: pull request merged.

## Phase 1: The gate and the monitors (Sabretooth)

- [ ] T101 Land the corrected CI workflow on ANTIGRAVITY `main`; first green run is the proof.
- [ ] T102 Adopt the two validators into `mission-control/tools/` with their suites in CI.
- [ ] T103 `mission-control/lib/validators.mjs` test-first: runs both tools every fifteen minutes, writes `state/validators/<tool>.json` with started, finished, status (green, red, did-not-run), items.
- [ ] T104 GitHub tab and Links tab in `index.html` reading that state; every light with its time; 20 pixel text or larger.
- [ ] T105 Twenty-four hours on the schedule with no missed pass (SC-002). Proof: the state files' timestamps.

## Phase 2: The voice (Sabretooth; the path per the plan's decision)

- [ ] T201 `mission-control/lib/voice.mjs` test-first: request verification for the chosen path, phrase allowlist (status, red list, fix it, read the last report, stage state), refusal for anything else, exchange log.
- [ ] T202 Answer composer: sentences built only from the monitors' last JSON; "did not run" spoken as such; the single waiting item named.
- [ ] T203 Hermes as the speaker: the card that makes Hermes turn the composed facts into the spoken answer within the ten-second budget, on Nous and OmniRoute only.
- [ ] T204 The path end to end in Joshua's kitchen: "JARVIS, status" five times in a row, every seeded red item named (SC-001). Proof: the Voice tab entries with times.
- [ ] T205 If the path is the local one: speech-to-text and text-to-speech on the Alienware node per the research report, the Echo Show paired as the loudspeaker, a `drift voice` command that starts the loop. Alienware lane lands this part.

## Phase 3: The date app's proof (Sabretooth with Codex)

- [ ] T301 `mission-control/lib/notification-proof.mjs` test-first: runs the backend tests for the Square payment webhook, the Square booking webhook and the support alerts in test mode with fake recipients; writes `state/notifications.json` with the last pass per path.
- [ ] T302 New path: a report of a kind the law or the terms require to reach an authority goes to a configured recipient, fake in test mode, real only when Joshua switches it on; every user report also alerts Joshua directly. Tests first. Proof: the test recipient receives the required fields; the real recipients receive nothing during tests.
- [ ] T303 Date App tab: one light per path, green with a date, amber after seven days, red on a failed pass.
- [ ] T304 Before marketing: every path green inside seven days (SC-003). Joshua's go.

## Phase 4: The board and the phone

- [ ] T401 `config/ai-studio-stages.json` schema and the AI Studio tab; the judge lane writes the file at every stage change (Alienware writes, Sabretooth reads).
- [ ] T402 Spoken status includes the stage line.
- [ ] T403 Dashboard at 390 pixels wide with no horizontal scroll (SC-005).
- [ ] T404 AnythingLLM pairing only after the research report verifies the QR flow; otherwise the phone uses the dashboard through Cloudflare Access.

## Cross-cutting checks (every phase)

- No provider API key on either node beyond Sabretooth's existing gateway variable; grep the environment names (SC-004).
- Nothing paid; if a step would cost money, stop and put it to Joshua as one sentence.
- Every panel light is a probe that ran; a stale green is a bug.
