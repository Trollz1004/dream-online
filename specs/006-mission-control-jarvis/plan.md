# Implementation Plan: Mission Control with JARVIS on the Echo Show

**Branch**: `006-mission-control-jarvis` | **Date**: 2026-09-30 | **Spec**: `spec.md`

**Status**: draft, evening of 2026-09-30, Claude judge lane on the Alienware node. The voice-path section is filled from the research report of the same evening (`C:\DREAM\recon\mission-control\research-echo-jarvis-2026-09-30.md`); the monitoring sections come from the survey of ANTIGRAVITY (`C:\DREAM\recon\mission-control\antigravity-map-2026-09-30.md`). Where a fact was not verified it says so.

## Summary

JARVIS is Hermes on Sabretooth. Mission Control is the existing `mission-control/` dashboard in `Trollz1004/ANTIGRAVITY` (a zero-dependency `node:http` server on port 9150 with twenty-two tabs and a probe engine that judges services by identity string), extended with: a voice endpoint behind a verified signature and an allowlist of commands; two validators that run on a schedule (every Trollz1004 repository, every public link); a Date App tab that proves each notification path with an end-to-end test in the provider's test mode; an AI Studio stage board; and a Voice tab that shows every exchange. Nothing costs money to run. Sabretooth's own lanes land the ANTIGRAVITY changes; this node's lane delivers the tools, the target lists, the CI patch and the cards through the drop box.

## Technical Context

- **Dashboard**: `mission-control/server.mjs` (ESM, `node:http`, port from `AIRI_DASHBOARD_PORT`, default 9150), tabs in `mission-control/index.html` (`data-tab`), probes in `mission-control/lib/sentry.mjs` driven by `mission-control/config/sentry-targets.json` (identity string per target), screenshot health in `mission-control/lib/screenshot-health.mjs`, tests with vitest in `mission-control/tests/`. Bridges in `mission-control/lib/bridges.mjs`: hermes (probed at `127.0.0.1:9119` and the gateway at `:8642/health`), openclaw, claude, codex, ollama, omniroute (proxied at `/api/omni/<path>` with `OMNI_ROUTE_API_KEY` from Sabretooth's `.env`, never sent to the browser), obsidian, browser-cdp, buzz, unreal, emergent, gemini.
- **Date app**: `domains/youandinotai.com/backend/app/` (Python; Postgres, Redis, Supabase migrations; Square is the sole payment processor; SMTP mail; WhatsApp and Telegram bot alerts for support). Routers and pages are listed in the survey and copied into `config/date-app-routes.json`.
- **Notifications today**: Square payment and booking webhooks with HMAC-SHA256 verification (`app/routers/webhooks.py`, tests `test_webhooks.py`, `test_square_webhook_security.py`); support tickets to WhatsApp and Telegram (`app/support_service.py`, test `test_support_notifications.py`); user reports become an internal `SupportTicket` only (`app/routers/safety.py`, tests `test_safety_routes.py`, `test_safety_privacy_flows.py`). There is no code path that reaches an authority or Joshua directly for an abuse report.
- **CI**: `.github/workflows/mission-control-ci.yml` watches `apps/mission-control/**` and `services/mission-control-api/**`, which do not exist; the real code has no gate. A corrected workflow is prepared at `C:\DREAM\recon\mission-control\patches/mission-control-ci.yml`.
- **Two Mission Controls**: `services/dateapp-desk-mcp/server.mjs` points at `MISSION_CONTROL_API=127.0.0.1:3151`, whose source is not in the repository. The Sabretooth lane says which one stands; this plan assumes the 9150 dashboard.
- **Validators (this node)**: `C:\DREAM\recon\mission-control\tools\validate-github.mjs` and `validate-links.mjs`, zero dependencies, `node --test` suites, target lists under `config/`.
- **Constraints**: no provider API key on any node beyond Sabretooth's existing OmniRoute gateway key; Cloudflare Access stays in front of the dashboard; nothing paid; JARVIS is Hermes, never Claude.

## The voice path (decision)

The research report is the source for this section. Five paths were weighed: an Alexa custom skill self-hosted on the tunnel; IFTTT's Alexa phrase trigger to a webhook; Home Assistant through Nabu Casa; Composio's Alexa connector (Joshua: free, the glue under Emergent); and the local path Joshua named last: the PC's microphone, speech-to-text and text-to-speech on the node, Hermes answering, the Echo Show as the loudspeaker over Bluetooth or the network.

Decision rule, in order: costs nothing to run; no key on a node beyond a single variable on Sabretooth; two-way (the Echo speaks the answer); legal under Amazon's and the connector's terms; buildable by a lane without a human clicking through a certification. The pick and its reasons are recorded in the section "Voice path, verified" below once the report lands; until then the same-day fallback is the local path, which needs no account of any kind.

## Voice path, verified

From `research-echo-jarvis-2026-09-30.md` (sources and dates inside it; verified and inferred are marked there).

- **Ruled out.** IFTTT: Amazon retired the native Alexa "say a specific phrase" trigger on 2023-10-31 and Webhooks is Pro-only now. Composio: its directory of more than 1,500 apps has no Amazon Alexa or voice-assistant connector; it is built for an agent calling apps, not for an Echo calling an agent; its free Hobby tier stays useful for JARVIS's outbound integrations later. AnythingLLM: a chat client, Android-only QR pairing to a self-hosted instance; not a voice trigger. Home Assistant through Nabu Casa: a paid subscription and a smart-home bridge, not question-and-answer.
- **Today, no account and no code: the local path.** Hermes ships its own Voice Mode (push-to-talk, local Faster-Whisper for speech-to-text, free text-to-speech backends, audio over PortAudio). The Echo Show pairs to a PC as a Bluetooth speaker (A2DP), so it becomes Hermes's loudspeaker with nothing to build. The Echo does not expose its microphone over Bluetooth (no source documents HFP or any microphone profile), so the microphone is the PC's or a headset near it. This runs on the Alienware node today and on Sabretooth when JARVIS moves there.
- **Destination, the Echo's own microphone in the kitchen: an Alexa custom skill kept in development mode.** Free, no certification, live on the Echo devices of Joshua's own Amazon account. The endpoint is a free-tier AWS Lambda so Amazon handles TLS and request signing; the Lambda posts to `dashboard.aidoesitall.website` with Cloudflare Access service-token headers, the tunnel forwards to Hermes, and Hermes's reply becomes the spoken answer. No key on any node: the service token lives in the Lambda's environment.
- **The one thing that would make the destination fail, said plainly:** it needs an Amazon developer account and an AWS account, and AWS asks for a payment method on file even when the free tier costs nothing. Both are Joshua's clicks and his decision under the no-cost rule; the local path stands until then.
- **Pick:** the local path now (Phase 2, T205 first), the development-mode skill as the destination (T201 to T204) once Joshua opens the two accounts.

## The compliance finding, verified

From `compliance-protocols-forensics-2026-09-30.md`. Joshua asked how the compliance and safety protocols were lost. They were not lost in code: in every version inspected, back to the stale clone and through the current `main`, a user report only creates a `SupportTicket` and alerts the human support queue over WhatsApp and Telegram; no version ever called NCMEC's CyberTipline, filed a report under 18 U.S.C. 2258A, or reached an authority or Joshua directly. What was lost is the paper trail: the Play Store child-safety declaration (`PLAY-STORE-COMPLIANCE-PACK-2026-07-15.md`) and the frontend safety, privacy and terms pages that stated the promise were deleted on 2026-08-04 by the cleanup commit `271039c2` ("remove 1.2GB of obsolete tools, legacy docs, and bloat"); a second, fuller safety implementation from the `Ai-Solutions-Store/Ai` repository was folded in on 2026-09-17 (`551ac7d3`) and deleted the same day (`62707da3`), and it had the same ticket-only pattern. The static pages `apps/youandinotai-static/child-safety.html` and `community-guidelines.html` still promise NCMEC and law-enforcement reporting on the live site today.

That is a live public promise with no code behind it, on an app about to be marketed. Phase 3 item 2 is therefore first among the date-app tasks: one function that files the CyberTipline report (or queues it with an audit row) whenever the support service's escalation marks a minor or CSAM-shaped reason, a direct alert to Joshua for every user report, tests that assert both fire, and the declaration restored as a living checklist beside the code.

## Project Structure (ANTIGRAVITY, landed by the Sabretooth lane)

```
mission-control/
  lib/voice.mjs            signature check, phrase allowlist, answer composer (reads monitor JSON)
  lib/validators.mjs       runs the two tools on the schedule, writes state/validators/*.json
  lib/notification-proof.mjs  runs the date-app path tests in test mode, writes state/notifications.json
  lib/stage-board.mjs      reads config/ai-studio-stages.json
  config/github-targets.json, links-targets.json, date-app-routes.json, notification-paths.json, ai-studio-stages.json
  tools/validate-github.mjs, tools/validate-links.mjs (adopted from this node), tests beside them
  index.html               new tabs: voice, github, links, dateapp, aistudio (nodes exists as sentry)
  tests/voice.test.js, validators.test.js, notification-proof.test.js, stage-board.test.js
.github/workflows/mission-control-ci.yml   corrected paths and steps
```

## Phases

### Phase 0: Gate and inputs (this node, tonight)

- The two validators with their suites, the four target lists, the CI patch, and this spec and plan, handed to the Sabretooth lane through the drop box with a `FABLE-TO-SABRETOOTH-<date>.md` card. Approver: the Alienware Claude judge lane.

### Phase 1: The gate and the monitors (Sabretooth lane)

1. Land the corrected CI workflow; the first green run on `main` is the proof.
2. Adopt the validators into `mission-control/tools/`, run their suites in CI, add `lib/validators.mjs` with a fifteen-minute schedule and the "did not run" state.
3. GitHub and Links tabs reading the JSON; every light carries its time.

### Phase 2: The voice (Sabretooth lane, path per the decision above)

1. `lib/voice.mjs`: verify the request, map the phrase to the allowlist (status, red list, fix it, read the last report, stage state), compose the answer from the monitors' last JSON only, log the exchange.
2. Hermes speaks: Hermes composes the sentence, the voice path carries it back (or the local text-to-speech reads it to the Echo speaker).
3. Voice tab.

### Phase 3: The date app's proof (Sabretooth lane, with Codex where the date app is Codex's)

1. `lib/notification-proof.mjs` runs the existing backend tests for the payment webhooks and the support alerts in test mode with fake recipients, on a schedule, and writes the last pass per path.
2. A new path for reports that the law and the terms require to reach an authority, with a fake recipient in test mode and a real one only when Joshua switches it on; and a direct alert to Joshua for every user report. This is the gap the survey found; it is built before the app is marketed.
3. Date App tab, amber after seven days without a pass.

### Phase 4: The AI Studio board and the phone

1. `config/ai-studio-stages.json` written by the judge lane at each stage change; the board and the spoken status read it.
2. Phone layout check at 390 pixels wide; the AnythingLLM pairing only after the report verifies it.

## Test-first rule for every phase

Each `lib/*.mjs` lands with its vitest file first (red), then the code (green). The validators' `node --test` floors only rise. No panel shows green without a probe that ran.

## Risks named plainly

- If the chosen voice path needs an Amazon certification a private skill cannot get, the local path is the fallback and loses only the Echo's own microphone.
- The OmniRoute gateway key already lives in Sabretooth's `.env`; this plan adds at most one more variable there (the voice path's secret) and none anywhere else.
- Abuse reports: today nothing reaches an authority. That is a legal and reputational exposure for a dating app about to be marketed; Phase 3 item 2 closes it, and the judge lane says so in the dispatch until it is closed.


## Correction, 2026-10-01 (later the same night, Joshua and the judge lane)

The finding above overstated the gap. Codex built and Joshua tested the working path: the report form has a minor-safety category, those reports escalate to a human review queue, and Joshua is alerted on Telegram or WhatsApp; he received the test. Filing with NCMEC's CyberTipline is done by the provider, a person, after review, not by automatic code, so the missing piece is not code: it is the business's CyberTipline registration as an electronic service provider (if not already done) and a one-page procedure for a minor-safety report. It does not block launch.
