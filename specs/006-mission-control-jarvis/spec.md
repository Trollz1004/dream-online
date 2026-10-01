# Feature Specification: Mission Control with JARVIS on the Echo Show

**Feature Branch**: `006-mission-control-jarvis`

**Created**: 2026-09-30

**Status**: draft, 2026-09-30, Claude judge lane on the Alienware node, from Joshua's goal of the same evening

**Input**: Joshua's goal, 2026-09-30, in his own words (spelling kept, profanity dropped): "use sonnet and opus models to deploy my mission control dashboard with agentic jarvis that i will use my echo show amazon alexa device basically as jarvis to speed up work less typing ... finalize our house claude how we work with ai studio how we monitor jarvis which can not be claude cause extra usage ... hermes works as jarvis cause nous free subscription is a lot free usage ... safe security of using just omniroute for everything else safe cause no apis on nodes ... mission control right now that every aspect of trollz1004 entire github controlled tested validated every tab link customer service of date app my notifications regarding a payment or customer service, if bad user authorities being notified and me, these tested in past and did work ... about to market date app for real ... i don't want to embarrass ai by shit shipped ... mission control jarvis you me ai studio game devs with gemini tests admin customer support my notifications regarding all of it ... claude hermes openclaw and maybe use anything llm has a remote scannable qr code that remotes to my cell phone". He has about six hours of his Claude Max window and set Sonnet workers to unlimited for it.

Standing rulings carried into this spec: JARVIS is never Claude, because Claude usage is metered (Joshua, 2026-09-30). No provider API key on any node; every model call goes through OmniRoute or a signed-in official CLI. Nothing is published, deployed or hosted for money until Joshua says finalize (2026-09-30). The one Mission Control is JARVIS on Sabretooth (`http://192.168.0.8:9150/`, `https://dashboard.aidoesitall.website/` behind Cloudflare Access), and Sabretooth's own lanes (the Sabretooth Claude and Codex) land changes there; this node's lane writes the spec, the tools and the cards. Payments and the date app's sale are closed matters on Sabretooth; this spec validates their notification paths, it does not redesign them. The House section of `C:\DREAM\AGENTS.md` (2026-09-30) is the rulebook this spec serves.

## The bar, in our own words

Joshua says "JARVIS, status" to the Echo Show in his kitchen and hears, in under ten seconds and in plain sentences, what is red across everything he owns: a failing check on any Trollz1004 repository, a broken link on any public site, a service down on either node, a customer-service message or a payment event on the date app that needs him, an AI Studio stage waiting on his hands. He can say "JARVIS, fix it" and JARVIS files the card to the right lane. He can open the dashboard on his phone or the Echo Show screen and see the same thing, large and dark. Nothing on that screen is guessed: every light is a probe that ran, with its time.

## Options weighed (brainstorm, 2026-09-30)

Three real options for the voice path, scored against what binds here: ships in days, no key on a node, legal under Amazon's and Google's terms, stays free or nearly, and does not depend on a company's mood.

1. An Alexa Skills Kit custom skill, self-hosted endpoint on the Cloudflare tunnel, kept in development mode for one household. Full two-way voice (Alexa speaks JARVIS's answer). Costs nothing; needs an Amazon developer account and a signature check on every request. The plan confirms the 2026 rules before this is built.
2. IFTTT's Alexa trigger ("say a specific phrase") to a Webhooks action that posts to JARVIS. Fastest to wire, one-way only (Alexa cannot speak the answer back), and the free tier caps the number of applets. Good as a first day fallback, not the destination.
3. Home Assistant with its Alexa integration through Nabu Casa. Two-way, mature, but a monthly subscription and a whole new system to run on a node. Loses on cost and on scope.

Pick: option 1 as the destination, option 2 as the same-day fallback if the skill needs a review Amazon will not give a private skill. Recorded here; `plan.md` carries the verified facts.

Three real options for the dashboard itself. Extend the existing JARVIS dashboard in ANTIGRAVITY on Sabretooth (one Mission Control, already public behind Access): wins. A new dashboard built by Gemini in AI Studio: loses, because a hosted page cannot reach the LAN and hosting costs money. A static page on this node: loses, because this node is just the game and Joshua said one Mission Control.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - "JARVIS, status" (Priority: P1)

Joshua speaks to the Echo Show and hears the red list. If nothing is red he hears "All green at <time>" and the one thing that is waiting on him, if any.

**Why this priority**: it is the whole point: less typing, less screen, the mission run by voice.

**Independent Test**: with the monitors seeded with one failing repository check and one broken link, say the phrase; the spoken answer names both, in plain sentences, within ten seconds; the same answer appears on the dashboard's Voice tab with its timestamp.

**Acceptance Scenarios**:

1. **Given** every monitor is green, **When** Joshua says "JARVIS, status", **Then** JARVIS answers with the time of the last full pass and the single waiting item or "nothing waits on you".
2. **Given** a repository's latest workflow run failed, **When** he asks, **Then** the answer names the repository and the workflow, and the dashboard's GitHub tab shows the same run with a link.
3. **Given** the voice endpoint receives a request whose signature does not verify, **When** it is processed, **Then** it is refused with no side effect and the refusal is logged with the source address.
4. **Given** a phrase that maps to no allowlisted command, **When** it arrives, **Then** JARVIS answers "I do not do that yet" and files nothing.

### User Story 2 - Every repository, every link, validated on a schedule (Priority: P1)

Every fifteen minutes JARVIS runs the two validators from `C:\DREAM\recon\mission-control\tools\` (adopted into ANTIGRAVITY by the Sabretooth lane): `validate-github.mjs` over every Trollz1004 repository and `validate-links.mjs` over every public site, and turns the JSON into lights on the dashboard and into the spoken red list.

**Why this priority**: Joshua's words: every aspect of the GitHub controlled, tested, validated, every tab, every link, before the date app is marketed for real.

**Independent Test**: run both tools against a fake `gh` and a local test site with one broken link; the dashboard shows one red GitHub light and one red link light with the exact URL; the tools' own `node --test` suites pass with their floors.

**Acceptance Scenarios**:

1. **Given** an open pull request with a failing check, **When** the GitHub pass runs, **Then** the repository shows red with the pull request number and the check name.
2. **Given** a page behind Cloudflare Access, **When** the link pass runs with the cookie file JARVIS holds, **Then** the page's links are checked; without the file the page is marked "not reachable without sign-in", never green.
3. **Given** a validator crashes, **When** the schedule fires, **Then** the dashboard shows "validator did not run" for that pass, never a stale green.

### User Story 3 - The date app's notifications, proven not assumed (Priority: P2)

Every notification path of the date app that Joshua says worked in the past (a payment event, a customer-service message, an abuse report that goes to him and, where the law and the terms require, to the authorities) has a test that exercises it end to end against a sandbox or a fake recipient, and a light on the dashboard that says when it last passed.

**Why this priority**: he is about to market the app for real and refuses to ship what would embarrass the lanes that built it.

**Independent Test**: trigger each path with test data in the provider's test mode; the fake recipient receives the message; the dashboard light turns green with the time; the real recipients receive nothing during the test.

**Acceptance Scenarios**:

1. **Given** a test payment event, **When** it is posted to the webhook, **Then** Joshua's notification path fires to the test recipient and the dashboard records it.
2. **Given** a test abuse report of the kind that requires reporting, **When** it is filed, **Then** the authorities' path fires to the test recipient only, with the report's required fields present, and nothing is sent to a real authority.
3. **Given** any path has not passed in seven days, **When** the dashboard is opened, **Then** that path shows amber with the date of its last pass.

### User Story 4 - The AI Studio stage board (Priority: P2)

The dashboard shows where each AI Studio app stands: DREAM Engine's current stage and whether it waits on Gemini, on the judge lane, or on Joshua's hands; the daily Build limit state as last observed; the Galaxy app's mode. JARVIS reads this aloud as part of "status".

**Why this priority**: the engine is built in a browser tab; without a board, its state lives in one lane's memory.

**Independent Test**: update the stage file by hand; the board and the spoken status change within one pass.

**Acceptance Scenarios**:

1. **Given** the judge lane records "Stage 1 waits on Joshua's hands" in the stage file, **When** he asks for status, **Then** JARVIS says so.

### User Story 5 - The phone (Priority: P3)

Joshua opens Mission Control on his phone through Cloudflare Access, and, once verified, pairs AnythingLLM's mobile app to his own instance by scanning a QR code so JARVIS is one tap away.

**Why this priority**: he wants it; it is not on the critical path for marketing the date app.

**Independent Test**: the dashboard renders at phone width with no horizontal scroll and 20 pixel text or larger; the AnythingLLM pairing is verified in `plan.md` before anything is installed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A voice endpoint on the Sabretooth dashboard accepts only signature-verified requests from the chosen voice path and maps phrases to an allowlist of commands: status, red list, fix it (files a card), read the last report, stage state, and nothing else until Joshua adds one.
- **FR-002**: JARVIS is Hermes on Sabretooth; every answer it speaks is composed from the monitors' last JSON, never invented; when a monitor has not run, JARVIS says so.
- **FR-003**: The GitHub validator covers every repository of the Trollz1004 account and exits non-zero on any failing latest workflow run or any open pull request with failing checks.
- **FR-004**: The link validator crawls every public site Joshua names, same-origin, depth 3, at most 300 pages per site, and never follows a logout, delete or payment link.
- **FR-005**: Both validators run on a schedule of fifteen minutes on Sabretooth and write their JSON where the dashboard reads it; a pass that did not run is shown as such.
- **FR-006**: Every date-app notification path has an end-to-end test in the provider's test mode with a fake recipient, runnable by JARVIS, with its last pass time on the dashboard.
- **FR-007**: The dashboard has a Voice tab that shows every spoken exchange with its time, a GitHub tab, a Links tab, a Date App tab, a Nodes tab (services on both nodes, by identity string), and an AI Studio tab.
- **FR-008**: No provider API key is stored on either node for this feature; the voice path's secret (the Alexa skill id or the IFTTT key) is referenced by variable name and lives in Sabretooth's environment only.
- **FR-009**: The public dashboard stays behind Cloudflare Access; the voice endpoint is the one path exempted from Access and it verifies the request signature itself.
- **FR-010**: Text on the dashboard is 20 pixels or larger, dark background, high contrast, no dense tables; every light carries its time.
- **FR-011**: Nothing in this feature costs money to run: no paid tier of IFTTT, no Nabu Casa, no Cloud Run; if the chosen voice path turns out to require payment, the plan stops and Joshua decides.
- **FR-012** (Joshua, 2026-10-01, the watchdog rule): the Sabretooth routine heals before it speaks. For every shipped product it probes by identity string; on failure it restarts the service, then rolls back to the last good release, then takes the broken surface off the public path behind an honest holding page; each step is tried in that order and logged; Joshua is told afterwards what was done and what is still wrong, never a bare "it is down". A restart, a rollback and a holding page each have a test that proves them against a deliberately broken service in test mode.
- **FR-013**: the three nodes keep their seats: Alienware develops (the game, AI Studio, the judge lanes); Sabretooth runs finished product and the watchdog; the T5500 is the marketing desk with no local models. Mission Control's Nodes tab shows all three with their seat named.

### Key Entities

- **Monitor pass**: one run of one validator: name, started, finished, status (green, red, did-not-run), items.
- **Item**: one finding: kind (repo, pull request, workflow, link, service, notification path, stage), subject, status, detail, link, time.
- **Voice exchange**: phrase heard, command mapped, answer spoken, time, source verified.
- **Stage record**: app, stage, waits-on (gemini, judge, joshua), last observed limit state, time.

## Success Criteria *(mandatory)*

- **SC-001**: "JARVIS, status" answers within ten seconds in the kitchen, five times in a row, naming every seeded red item.
- **SC-002**: Both validators pass their own suites (at least 20 checks) and run on the schedule for 24 hours with no missed pass.
- **SC-003**: Every date-app notification path has a green light with a date inside the last seven days before the app is marketed.
- **SC-004**: Zero provider API keys on either node, checked by a grep of the environment names JARVIS uses.
- **SC-005**: Joshua reads the dashboard on the Echo Show screen and on his phone without zooming.
