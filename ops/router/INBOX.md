# DREAM Router Headless Inbox (`ops/router/INBOX.md`)

CLAUDE's N Joshua's · #TeamClaudeForLife · Built with Google Gemini

The headless inbox on the Alienware turns a dropped Markdown task file into a profiled Jev router decision, an isolated git worktree, a headless `agy` lane run, a pull request, and a router report comment on the PR, with no live session.

## 1. Local Inbox Location & Subfolders

The inbox lives in a local folder on the Alienware only and never in OneDrive or the drop box:

- Root: `%USERPROFILE%\antigravity\.fable-kitchen\inbox\`
- `queued\` — Dropped `.md` task files waiting to run. The runner takes the oldest file first on each tick.
- `running\` — The single task currently executing. Only one task runs at a time, and never two `agy` runs for the same repository at once.
- `done\` — Completed tasks that opened a PR and passed the judge check, stored with `<id>.log` beside `<id>.md`.
- `failed\` — Tasks that failed after one re-queue (or were refused by a safety gate), stored with `<id>.log` beside `<id>.md`.
- `for-judge\` — Tasks for the judge lane. The runner never executes the judge job class: a task that profiles as `judge`, or whose forced `lane:` resolves to the `claude-code-signed-in` harness (the `fable` lane), is moved here with a one-line `<id>.log` note and `agy` is never started. The judge lane (a live signed-in Claude session) reads this folder. Parking is not a failure and does not count toward the three-failure stop.

## 2. Base Branch Configuration

The runner reads the base branch from the `base:` configuration line below (or from an optional `base:` line in a task file). Branch from `origin/main` by default; before each worktree the runner runs `git fetch origin` in the target repo so the base is current:

```text
base: origin/main
```

Each task creates an isolated worktree at `%USERPROFILE%\antigravity\<prefix><id>` (prefix from `ops/router/repos.json`: `DREAM-Engine-wt-inbox-` for `dream-online`, `ANTIGRAVITY-wt-inbox-` for `ANTIGRAVITY`, `dream-intake-wt-inbox-` for `dream-intake`, `swarm-command-wt-inbox-` for `swarm-command`) on branch `ai/inbox/<id>` starting from the configured base, inside the repo the task selected. The runner removes the worktree when the run finishes only if `ai/inbox/<id>` was pushed to `origin`.

## 3. Task File Format

A task file is a small `.md` file dropped into `%USERPROFILE%\antigravity\.fable-kitchen\inbox\queued\`. Its filename stem becomes the task `<id>`.

Format rules:

1. **Title line** (required): The first non-empty line, written as a Markdown heading (`# <Title>`) or plain sentence.
2. **Optional `lane:` or `model:` line**: If a task has an explicit `model:` header (or `lane:` header naming a known executor model in `ops/router/lanes.json`), that model line wins over Panda Router. If a task has an explicit `lane:` header naming an executor job class (`engine`, `mechanical`, `code-bulk`, `code-hard`, `design-visual`, `research`), that job class is used and body profiling cannot reclassify the job as the Fable class. The lane `engine` sets a floor: never below Opus 5.5 (`claude-opus-5-5`) or Gemini 4 Argon (`gemini-4-argon`). Only `lane: fable` parks a forced-lane task in `for-judge\`; an unknown `lane:` value falls back to profiling the task with the Jev router core.
3. **Optional `repo:` line**: `repo: <repo-name>` selects the target repository through the repo map in `ops/router/repos.json` (defaults to `dream-online`). `dream-online` is the runner's own repo root. `ANTIGRAVITY` is the sibling folder named in the `ANTIGRAVITY_REPO_ROOT` environment variable (default `%USERPROFILE%\antigravity\ANTIGRAVITY-wt-pr335`); that task gets its worktree, branch and PR in that repo. `dream-intake` is the private intake repo named in the `DREAM_INTAKE_REPO_ROOT` environment variable (default `%USERPROFILE%\antigravity\dream-intake`); that task gets its worktree, branch and PR in that repo. `swarm-command` is the Swarm Command repo named in the `SWARM_COMMAND_REPO_ROOT` environment variable (default `%USERPROFILE%\antigravity\tools\swarm-command`); that task gets its worktree, branch and PR in that repo. An unknown repo name is refused: the task moves to `failed\` with a log naming the known repos. The one-run-per-repo rule still holds.
4. **Task text**: Everything after the header lines is the task body sent to the selected lane with the cookbook's common rules prepended (`PR only`, `no user folder names`, `no secrets`, `proof pasted`, `Obsidian note`).

### Example Task File (`%USERPROFILE%\antigravity\.fable-kitchen\inbox\queued\fix-hud-spacing.md`)

```markdown
# Fix HUD spacing and add unit test
lane: claude-sonnet-5-5
repo: dream-online

Adjust the spacing in src/ui/Hud.tsx and add a unit test verifying the layout props.
```

## 4. Judge Step, PR Report Comment & Safety Gates

- **Panda Router (`http://192.168.0.40:8765/route`, see `docs/house/ADDRESS-DOCTRINE.md` and `ops/fleet/fleet-map.json`)**: Before each `agy` run, the runner POSTs the task text to `/route` with the pool from `%USERPROFILE%\antigravity\tools\panda-router\panda-pool.json`, mode `cheapest_above_threshold`, minimum success `0.6`, and a 2-second limit (`ops/router/panda-route.ts`), then runs `agy` with the model Panda picks. A `model:` (or model-valued `lane:`) line in the task header wins over Panda (`header`), and `lane: engine` sets a floor so it never runs below Opus 5.5 (`claude-opus-5-5`) or Gemini 4 Argon (`gemini-4-argon`) (`floor`). If Panda is down, takes over 2 seconds, or answers something not in the pool, the runner logs one line and runs with today's Jev router fallback (`fallback`) so the wheel never stops. The first line of each task log (`<id>.log`) states the model picked and who picked it (`header`, `floor`, `panda`, or `fallback`).
- **Judge step**: When the `agy` handle finishes, the runner checks for a GitHub PR URL in the lane output and, for `design-visual` tasks, an Eyes gate report whose first line starts with `PASS`. Missing either re-queues the task once with the failure reason appended; failing a second time moves the task to `failed\`.
- **Quota / 429 fallback**: A quota or HTTP 429 error marks the lane cold through the Jev router core (`reportQuotaError`) and re-queues the task once on the fallback lane from `ops/router/lanes.json`.
- **PR comment**: On pass, the runner posts a comment on the PR whose first line is `Router report: <lane> on Alienware` followed by the lane, the job class, the routing reason, the decision hash, and the test summary extracted from the lane's log.
- **Judge class**: When no `lane:` header is given, Fable-class signals (such as a `Fable:` title prefix or ruling verbs like `review`, `verdict`, `approve`, `merge`, and `ruling`) are matched against the task title (first line) only, never the task body. A task that profiles as `judge` (or carries `lane: fable`) is parked in `for-judge\` (section 1) and never run by the runner, while body text with trigger words under a plain title runs as profiled by its other signals.
- **Lane liveness**: If a task sits in `running\` for more than ten minutes with no `agy` child process under the runner, the runner marks it failed with the reason `lane process missing` and re-queues it once. If the re-queued task fails again, the runner moves it to `failed\` with `lane process missing` in its log.
- **Effort per lane**: `ops/router/lanes.json` carries an optional `laneSettings.<lane>.effort` (`gemini-4-argon`, `claude-opus-5-5` and `claude-sonnet-5-5` are `high`; `gemini-3.8-flash` and `fable` are `none`). The `agy` adapter passes `--effort` only for a lane whose setting is `low`, `medium` or `high`, and omits the flag for `none` or a lane with no setting, because agy 1.5.0 rejects `--effort` for those models.
- **Token hygiene**: The runner removes `GH_TOKEN`, `GITHUB_TOKEN` and `GH_ENTERPRISE_TOKEN` from the environment it passes to every lane (and to its own git and gh calls), and never loads a `.env` file into a lane; `gh` uses its own stored sign-in.
- **Dedicated `gh` config folder (`GH_CONFIG_DIR`)**: Because the inbox runner (`Trollz1004`) shares the Alienware machine with other private projects that sign in to their own GitHub accounts, and `gh`'s default active account is machine-wide, the runner and every lane it starts set `GH_CONFIG_DIR` to `%USERPROFILE%\antigravity\.fable-kitchen\gh-runner` so no lane can switch another's GitHub sign-in. Those other projects are not part of this repo: never open, read, copy or mix their files, prompts or memory with it; a task for one of them is written as a handoff file for its own session in the drop box, and nothing else is done. To sign the runner in once, set `GH_CONFIG_DIR=%USERPROFILE%\antigravity\.fable-kitchen\gh-runner` and run `gh auth login` as `Trollz1004` (if that folder has no signed-in account, the runner logs `runner gh config empty: run gh auth login with GH_CONFIG_DIR set to %USERPROFILE%\antigravity\.fable-kitchen\gh-runner` to `decisions.log` and refuses tasks).
- **Owner check**: Before any other gh call the runner runs `gh api user` and compares the login to `expectedOwner` in `ops/router/repos.json` (`Trollz1004`). On a mismatch (or if `gh api user` fails) the task stays in `queued\` and the runner logs a clear line to `decisions.log` and returns `refused-gh-owner` (or `refused-gh-auth`) instead of failing silently later.
- **Runner opens the PR**: After a lane pushes `ai/inbox/<id>`, if the lane did not open a PR the runner reuses an open PR for the branch or opens one itself with `gh pr create` (title from a `PR title:` line in the lane report, otherwise the task title; body from the lane report), so a lane's own gh trouble never marks finished work as failed. If the branch was not pushed, or `gh pr create` fails, the task fails as before with the reason in its log.
- **Safety rules**:
  - Refuses any task file or configuration that names a path under `OneDrive` as its inbox.
  - Refuses to run if `gh` is not signed in (`gh auth status`) or is signed in as anyone but the expected owner.
  - Never merges and never touches `main` or `master`.
  - Writes every routing decision to `ops/router/decisions.log` through the core's secret, path, and private-IP redaction.
  - Stops after three consecutive failures until a human clears `failed\`.
  - Registration is by the judge or Josh by hand, with `-Apply`, never by a lane.

## 5. Scheduled Task Registration (Alienware)

Scheduled task registration (`DreamRouterInbox`) is performed by the judge or Josh by hand, with `-Apply`, never by a worker or executor lane.

- Both `ops/node/register-inbox-runner.ps1` and `ops/node/unregister-inbox-runner.ps1` are dry runs by default. Without `-Apply`, they describe what would be registered or removed, print `[DRY RUN]`, and exit without changing system state.
- **Dry run** (default, safe for verification):
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\register-inbox-runner.ps1"
  powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\unregister-inbox-runner.ps1"
  ```
- **Registration** (Josh or judge lane by hand only, with `-Apply`):
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\register-inbox-runner.ps1" -Apply
  ```
- **Removal** (Josh or judge lane by hand only, with `-Apply`):
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\unregister-inbox-runner.ps1" -Apply
  ```

## 6. Routines (recurring tickets)

Routine work is done by the lanes from routines written once. The head of kitchen only checks it.

- A routine is a normal ticket file in the kitchen folder under `orders\routines\`, with one extra header line: `every: 6h` (units `m`, `h`, `d`) or `daily: 07:30` (local time).
- On each tick the runner looks at that folder. When a routine is due and no copy of it is in `queued\` or `running\`, it copies the routine into `queued\` with the date and time added to the file name (for example `scout-20261124-0730.md`) and the `every` or `daily` line removed. Everything else in the ticket stays as written.
- The last run of each routine is kept in `routines-state.json` in the kitchen folder, beside the inbox, never inside a repo. It survives a restart. A new routine with no last run is due at once; a `daily` routine with no last run is due once its time has passed that day.
- No routine runs more often than every 30 minutes, whatever its header says.
- A routine with no schedule line, a bad value, or two schedule lines is skipped with one line in `decisions.log` and never stops the runner. Fix the file and it is picked up on the next tick.
- Code: `ops/router/routines.ts`. Tests: `ops/router/routines.test.ts`, which use a temp folder and never touch the real kitchen.

## 7. Console credit lane (ships switched off)

The Console credit lane is for the judge side only. Code: `ops/router/adapters/console-credit.ts`. It never picks a lane.

- It refuses to run unless `ROUTER_CONSOLE_ENABLED` is `true`. It ships `false`.
- It runs for three purposes only: `judge-text-check`, `pre-judge` and `bracket`. Routing decisions and any other purpose are refused.
- `ROUTER_CONSOLE_DAILY_CAP` is a hard cap on calls per day. `ROUTER_CONSOLE_TOKEN_BUDGET` is a hard cap on tokens. Both are required and must be positive whole numbers.
- The token budget is the sum of total tokens over the lane's own lines in `ops/router/decisions.log`. The lane refuses once the budget is reached. Only token counts are kept: no prices and no dollar sums.
- `ROUTER_CONSOLE_MODEL` names the model. The default is `claude-sonnet-5-5`.
- The one Console key is read by name from the node env and never printed or logged. `docs/standards/AGENT-STANDARD.md` forbids an Anthropic API key on any machine, so only Josh switches this lane on.
- First read of a pull request: `npx tsx ops/router/console-prejudge.ts Trollz1004/<repo> <pull request number>`. It reads the title, body and diff with gh, sends them with purpose `pre-judge`, and posts the answer as a PR comment that begins "First read by MODEL on the Console credit. This is not the judge's verdict." If the lane is switched off it prints one line and exits 0.
- Tests: `ops/router/adapters/console-credit.test.ts` and `ops/router/console-prejudge.test.ts`. Both use a fake fetch and a fake gh and never call the real API.