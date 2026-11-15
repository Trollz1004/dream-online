# Scout Report: Why the Panda Pick Has Fallen Back on Every Task Since 02:00

**Date:** 2026-11-15  
**Subject:** Root cause analysis of Panda Router fallback to `gemini-4-argon` across runner tasks since 02:00 UTC  
**Scope:** Read-only analysis of `ops/router/panda-route.ts`, `ops/router/inbox-runner.ts`, task logs under `%USERPROFILE%\antigravity\.fable-kitchen\inbox\done`, and `%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\router\decisions.log`.

---

## 1. Code Reasons for Fallback (`panda-route.ts` & `inbox-runner.ts`)

### In `ops/router/panda-route.ts`
When `askPandaRouteDetailed` is called, it returns `{ model: null, pandaModelId, reason }` in these specific cases:

1. **Lines 140–147 (`loadPandaPool` failure)**:
   The pool file at `%USERPROFILE%\antigravity\tools\panda-router\panda-pool.json` is missing, unreadable, or invalid JSON.
   - *Reason*: `Panda pool unavailable at %USERPROFILE%\antigravity\tools\panda-router\panda-pool.json`
2. **Lines 149–156 (fetch unavailable)**:
   No fetch function is present in global scope or options.
   - *Reason*: `Panda fetch implementation unavailable`
3. **Lines 197–204 (HTTP error response)**:
   The Panda service HTTP response is not ok (`!response.ok`).
   - *Reason*: `Panda /route HTTP <status>`
4. **Lines 221–227 (empty response / missing model id)**:
   The JSON body returned by `/route` contains no string in `choice.model_id`, `model_id`, or `model`.
   - *Reason*: `Panda /route returned no model_id`
5. **Lines 229–236 (model not in configured pool)**:
   The model returned by Panda does not match any card or key in `panda-pool.json`.
   - *Reason*: `Panda /route model "<id>" is not in pool`
6. **Lines 243–250 (timeout or network error)**:
   Network exception or request exceeds the timeout (default 2000 ms).
   - *Reason*: `Panda /route timed out (<N>ms limit)` or `Panda /route unreachable (<error>)`

### In `ops/router/inbox-runner.ts` (`selectModelBeforeAgyRun`)
In `ops/router/inbox-runner.ts` lines 1426–1589, the inbox runner calls Panda and evaluates the result:

1. **Lines 1452–1466 (Task header model line on engine lane clamped by floor)**:
   If a task header requests an engine lane but the requested model is below the engine floor (`claude-opus-5-5` or `gemini-4-argon`), and all warm floor models are cold, it falls back:
   - *Return*: `pickedBy: 'fallback'`, `pandaFallbackLogLine: null`.
2. **Lines 1478–1540 (customPandaRoute mock path)**:
   Mirrors the failure modes of `askPandaRouteDetailed` above.
3. **Line 1551 (`this.router.isLaneCold(pandaRes.model, now)`)**:
   Panda successfully answered with a valid model in the pool, but that model is currently marked **cold** (due to a prior 429 / quota error) in the router's active `cold_lanes` map.
4. **Lines 1552–1566 (Engine floor clamp on Panda selection)**:
   The task is in the `engine` lane, Panda picks a model below the engine floor (e.g. `gemini-3.8-flash` or `claude-sonnet-5-5`), and `resolveWarmEngineFloorModel` fails to find any warm engine floor model.
   - *Return*: `pickedBy: 'fallback'`.
5. **Lines 1574–1589 (Fallback execution path)**:
   Whenever Panda returns no model, fails, or returns a model that is currently cold:
   - If cold: `reasonText = "Panda /route selected cold lane " + pandaRes.model`
   - Otherwise: `reasonText = pandaRes.reason`
   - Logs: `[panda] fallback to <fallbackLane>: <reasonText>`
   - *Return*: `pickedBy: 'fallback'`, `decision.lane: fallbackLane`.
6. **Lines 2248–2287 (Runtime 429 quota fallback during agy execution)**:
   When `agy` process exits with a 429 quota exhaustion (`RESOURCE_EXHAUSTED`), `inbox-runner.ts` marks the model's entire quota group cold via `this.router.reportQuotaError(decision.lane, ...)`, flags `quotaFallbackTriggered = true`, re-queues the task, and calls `selectModelBeforeAgyRun` to switch to the fallback lane.

---

## 2. Evidence from Task Logs and Decisions Log for the Six Tasks

### Tasks Before 02:00 EST / 07:00 UTC (Picked by Panda)
1. **`b1-boot` (01:37 EST / 06:37 UTC)**:
   - Task log (`b1-boot.log` line 1):
     ```text
     model: claude-opus-5-5 (picked by: panda)
     ```
   - Decisions log (`2026-11-15T06:37:18.966Z`):
     Classified as `code-bulk`, `cold_lanes: {}`. Panda returned `claude-opus-5.5` which was warm.
2. **`c1-codemap` (01:45 EST / 06:45 UTC)**:
   - Task log (`c1-codemap.log` line 1):
     ```text
     model: claude-opus-5-5 (picked by: panda)
     ```
   - Decisions log (`2026-11-15T06:45:09.917Z`):
     Classified as `engine`, `cold_lanes: {}`. Panda returned `claude-opus-5.5` which was warm.
3. **`c2-brief` (01:53 EST / 06:53 UTC)**:
   - Task log (`c2-brief.log` line 1):
     ```text
     model: claude-opus-5-5 (picked by: panda)
     ```
   - Decisions log (`2026-11-15T06:53:39.932Z`):
     Classified as `engine`, `cold_lanes: {}`. Panda returned `claude-opus-5.5` which was warm.

### Tasks At / After 02:00 EST / 07:00 UTC (Fallen Back)
4. **`m1-memmy` (02:00 EST / 07:00 UTC)**:
   - Task log (`m1-memmy.log`):
     - Line 1:
       ```text
       model: gemini-4-argon (picked by: fallback)
       ```
     - Attempt 1 ran on `claude-opus-5-5` (Panda pick, warm at start) and hit 429 at `07:04:45.576Z`:
       ```text
       error: Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 1h20m9s. (response may be truncated)
       AGY_ERROR: {"short_error":"RESOURCE_EXHAUSTED (code 429): Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 1h20m9s.","status":"RESOURCE_EXHAUSTED","error_code":429,"code_kind":"http","retryable":true,"error_id":"5e6c6b94-93c6-4fae-b05c-d47727b6025b-56"}
       agy exit 3 at 2026-11-15T07:04:45.576Z
       ```
     - Exact fallback log line (Attempt 2 & Attempt 3):
       ```text
       [panda] fallback to gemini-4-argon: Panda /route selected cold lane claude-opus-5-5
       ```
   - Decisions log (`2026-11-15T07:04:45.588Z`):
     Claude quota exhausted. Marked `claude-opus-5-5` and `claude-sonnet-5-5` cold for 24h until `2026-11-16T07:04:45.581Z` under quota group `agy-claude`.

5. **`r1-roster` (02:30 EST / 07:30 UTC)**:
   - Task log (`r1-roster.log`):
     - Line 1:
       ```text
       model: gemini-4-argon (picked by: fallback)
       ```
     - Line 2 (exact fallback line):
       ```text
       [panda] fallback to gemini-4-argon: Panda /route selected cold lane claude-opus-5-5
       ```
   - Decisions log (`2026-11-15T07:29:58.825Z`):
     `claude-opus-5-5` was cold. Runner selected fallback lane `gemini-4-argon`.

6. **`sw1-gate` (02:55 EST / 07:55 UTC)**:
   - Note: The runner was restarted at 02:54:49 EST (`runner-restart.log`: `2026-11-15T02:54:49 judge restart to load a516eb7`), which cleared in-memory cold lanes.
   - Attempt 1 dispatched on `claude-sonnet-5-5` (from `lanes.json` for `code-bulk`) and immediately failed in 14 seconds at `07:55:31.512Z`:
     ```text
     error: Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 29m23s.
     AGY_ERROR: {"short_error":"RESOURCE_EXHAUSTED (code 429): Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 29m23s.","status":"RESOURCE_EXHAUSTED","error_code":429,"code_kind":"http","retryable":true,"error_id":"a031a950-ca21-40d6-a7c6-34dce030fd54-3"}
     agy exit 3 at 2026-11-15T07:55:31.512Z
     ```
   - Both Claude models were marked cold again for 24h until `2026-11-16T07:55:31.519Z`.
   - Exact fallback log line (Attempt 2 & Attempt 3):
     ```text
     [panda] fallback to gemini-4-argon: Panda /route selected cold lane claude-opus-5-5
     ```
   - First log line:
     ```text
     model: gemini-4-argon (picked by: fallback) | code map: rebuilt
     ```

---

## 3. Live Panda Router Verification

Using the exact payload and headers constructed by `askPandaRouteDetailed`:

### Call A: `lane: engine` task (`m1-memmy`)
- **Request Body**:
  ```json
  {
    "task": {
      "text": "# Study only: is Memmy's memory service usable on our Windows nodes inside our rules\nlane: engine\nrepo: dream-online\nbase: main\n\nRead-only study. Do not install, build or run anything from that repo. Stop at 15 minutes. One PR that adds one file: docs/research/memmy-study-2026-11-15.md.\n\nClone https://github.com/MemTensor/memmy-agent (MIT) into %USERPROFILE%\\antigravity\\study\\memmy-agent, shallow, and read the code. Answer each question with the file and line that proves it, or say \"not found\":\n1. Can the memory service (memmy-memory, 127.0.0.1:18960) run by itself on Windows 11 without the Memmy agent, the desktop app, a Memmy account or systemd? What exactly would start it?\n2. Which model calls does memory need (extraction, consolidation, embeddings)? Can every one of them point at a local Ollama on 127.0.0.1 with no key? What breaks with no model at all?\n3. For each outside agent it reads (Claude Code, Codex, Cursor, Gemini and the rest): which files, read-only or not, and what memmy-memory init writes into that agent's own folders.\n4. The launcher is said to write provider credentials it finds into a gateway env file. Where does it look, what does it copy, and can that be turned off?\n5. Every outbound network call when running memory only: host, purpose, and whether it can be turned off (account, quota, metering, cloud sync, update check, telemetry).\n6. Storage: where the SQLite file lives, the table names, and whether another tool can search and add through a local API or MCP without the Memmy agent.\n7. What it offers that we do not have today. We have: an Obsidian note per task, a fleet memory server on the T5500 reached as the ai-memory tool, and a code map per repo. Name the three ideas most worth building ourselves, in-house.\n"
    },
    "pool": [
      "openrouter-gemini-3.8-flash",
      "claude-sonnet-5.5",
      "claude-opus-5.5",
      "openrouter-gemini-4-argon"
    ],
    "mode": "cheapest_above_threshold",
    "min_p_success": 0.6,
    "min_success": 0.6,
    "preferences": {
      "mode": "cheapest_above_threshold",
      "min_p_success": 0.6,
      "min_success": 0.6
    }
  }
  ```
- **HTTP Status**: `200 OK`
- **Elapsed Time**: `142 ms`
- **Answer**:
  ```json
  {
    "choice": {
      "model_id": "claude-opus-5.5",
      "confidence": 0.3941,
      "decided_by": "policy:cheapest_above_threshold:relaxed",
      "propensity": 1,
      "explored": false,
      "confidence_lower": 0.3638
    }
  }
  ```

### Call B: `lane: code-bulk` task (`sw1-gate`)
- **Request Body**:
  ```json
  {
    "task": {
      "text": "# Swarm Command: the local copy opens on the request box, with no stale wording\nlane: code-bulk\nrepo: dream-online\nbase: main\n\nThe work is in the Swarm Command repo, not this one. Open the PR against main of Trollz1004/swarm-command. Push after each step. Stop at 18 minutes.\n\nThe clone at %USERPROFILE%\\antigravity\\tools\\swarm-command is live: the boot task serves its backend on 127.0.0.1:8000 and its built front end (frontend\\build) on 127.0.0.1:3001 with Python's http.server. Never switch that clone's branch and never rebuild inside it. Work in a git worktree beside it (git -C that clone worktree add ..\\swarm-command-wt-sw1 -b ai/inbox/sw1-gate origin/main).\n\nWhat the judge saw on the real screen at http://127.0.0.1:3001/ on 2026-11-15: the first page is a \"Restricted access\" gate. It asks for a date of birth and a tick that accepts the terms \"and the 10% charity commitment on all transactions\". The request box for the wheel is somewhere behind it.\n\n1. Remove the sentence about a 10 percent commitment on all transactions, and any other text that states a revenue split, everywhere in the front end and backend. No product has a split. Do not add any mission or charity wording in its place. Keep Emergent's credit and branding exactly as they are.\n2. When the page is served from 127.0.0.1 or localhost, skip the age gate and open straight on the wheel request box page. On any other host the gate stays as it is, minus the removed sentence. Say in the PR how the page decides, and add a test for both cases.\n3. Deep links: find out whether the front end uses path routes. If a refresh on any route would 404 under http.server, add a small static server script in the repo (Python standard library only, binds 127.0.0.1 only, falls back to index.html for unknown paths, refuses any other bind address) and say in the PR the exact command the boot script should run instead.\n4. Build the front end in your worktree and take screenshots with a headless browser at 1440 and 390 wide of the first page as served from 127.0.0.1: it must show the request box and the live wheel counts. Put them under docs/screenshots/sw1/. Paste the counts shown and the counts from GET /api/wheel/status side by side.\n"
    },
    "pool": [
      "openrouter-gemini-3.8-flash",
      "claude-sonnet-5.5",
      "claude-opus-5.5",
      "openrouter-gemini-4-argon"
    ],
    "mode": "cheapest_above_threshold",
    "min_p_success": 0.6,
    "min_success": 0.6,
    "preferences": {
      "mode": "cheapest_above_threshold",
      "min_p_success": 0.6,
      "min_success": 0.6
    }
  }
  ```
- **HTTP Status**: `200 OK`
- **Elapsed Time**: `82 ms`
- **Answer**:
  ```json
  {
    "choice": {
      "model_id": "claude-opus-5.5",
      "confidence": 0.3786,
      "decided_by": "policy:cheapest_above_threshold:relaxed",
      "propensity": 1,
      "explored": false,
      "confidence_lower": 0.3409
    }
  }
  ```

---

## 4. Pool File vs `agy models` Comparison

### Pool Map (`%USERPROFILE%\antigravity\tools\panda-router\panda-pool.json`):
```json
{
  "gemini-3.8-flash": "openrouter-gemini-3.8-flash",
  "claude-sonnet-5-5": "claude-sonnet-5.5",
  "claude-opus-5-5": "claude-opus-5.5",
  "gemini-4-argon": "openrouter-gemini-4-argon"
}
```

### Models Listed by `agy models` Today:
- `gemini-4-carbon-medium`, `gemini-4-carbon-high`, `gemini-4-carbon-low`
- `gemini-4-argon-medium`, `gemini-4-argon-high`, `gemini-4-argon-low`
- `gemini-4-hydrogen-high`, `gemini-4-hydrogen-xhigh`, `gemini-4-hydrogen-medium`, `gemini-4-hydrogen-low`
- `gemini-pro-orchestrator`, `gemini-pro-orchestrator-argon`
- `gemini-3.8-flash-high`, `gemini-3.8-flash-medium`, `gemini-3.8-flash-low`
- `claude-opus-5-5-low`, `claude-opus-5-5-medium`, `claude-opus-5-5-high`
- `claude-sonnet-5-5-low`, `claude-sonnet-5-5-medium`, `claude-sonnet-5-5-high`
- `gpt-oss-120b-medium`

### Mismatch Analysis:
None of the four bare names in `panda-pool.json` (`gemini-3.8-flash`, `claude-sonnet-5-5`, `claude-opus-5-5`, `gemini-4-argon`) match the exact strings in `agy models` today, because `agy models` lists every model with an explicit reasoning effort suffix (`-low`, `-medium`, `-high`).  
While `agy` CLI accepts bare names as command-line aliases when combined with an effort flag (e.g. `--effort high`), strict string comparisons between pool keys and `agy models` output do not match.

---

## 5. Quota and Cold-Model Status

- **Was 429 involved?** Yes.
  - Task `m1-memmy` hit `RESOURCE_EXHAUSTED (code 429): Individual quota reached. Resets in 1h20m9s` at `2026-11-15T07:04:45.576Z`.
  - Task `sw1-gate` hit `RESOURCE_EXHAUSTED (code 429): Individual quota reached. Resets in 29m23s` at `2026-11-15T07:55:31.512Z`.
- **Was cold-model marking involved?** Yes.
  - In `dream-task-router.ts` / `lanes.json`, `claude-opus-5-5` and `claude-sonnet-5-5` share the `agy-claude` quota group.
  - When `m1-memmy` failed, `reportQuotaError` marked both models cold for 24 hours until `2026-11-16T07:04:45.581Z`.
  - When `sw1-gate` hit the remaining Claude quota after the 02:54 runner restart, both models were marked cold again for 24 hours until `2026-11-16T07:55:31.519Z`.
  - In `inbox-runner.ts` line 1551:
    ```typescript
    if (pandaRes.model && !this.router.isLaneCold(pandaRes.model, now))
    ```
    Because Panda chose `claude-opus-5-5` (card `claude-opus.5.5`), but `claude-opus-5-5` was cold, the check failed and the runner explicitly logged:
    `[panda] fallback to gemini-4-argon: Panda /route selected cold lane claude-opus-5-5`

---

## 6. Cause, Confidence, and Smallest Fix

- **Plain Cause:**  
  The Claude account reached its usage quota limit (HTTP 429 / `RESOURCE_EXHAUSTED`) during task `m1-memmy` at 02:04 AM EST (07:04:45 UTC). The inbox runner's quota handler placed all Claude models (`agy-claude` quota group) into a 24-hour cold state. While the Panda Router service is 100% healthy (answering `/route` in ~80–140 ms with `claude-opus-5.5`), the runner correctly refuses to dispatch on any cold model and falls back to `gemini-4-argon`.

- **Confidence:**  
  **100%**. Confirmed through the exact 429 error messages in `m1-memmy.log` and `sw1-gate.log`, the recorded `cold_lanes` timestamps in `DREAM-Engine-runner\ops\router\decisions.log`, live 200 OK queries to `http://127.0.0.1:8765/route`, and code verification in `inbox-runner.ts` (lines 1551–1589).

- **Smallest Fix (Do Not Apply):**  
  The quota exhaustion was temporary (~1 hour window, which indicated resetting by ~03:25 AM EST / 08:25 UTC). The smallest manual intervention is to restart the inbox runner process (scheduled task `DreamRouterInbox`) or clear the in-memory cold lane state (`this.router.clearColdLanes()`) now that the quota window has passed, which will allow the runner to accept Panda's Claude selections without waiting for the default 24-hour cooldown (`defaultCooldownHours: 24`). A small code improvement for the future would be to parse the `Resets in <duration>` string from the 429 message and set `until` to the actual reset time rather than the hardcoded 24-hour default.
