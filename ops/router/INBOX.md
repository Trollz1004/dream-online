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

## 2. Base Branch Configuration

The runner reads the base branch from the `base:` configuration line below (or from an optional `base:` line in a task file). Once the stack branch has merged to `main`, change this line to `base: main`:

```text
base: origin/ai/stack2/2026-11-04
```

Each task creates an isolated worktree at `%USERPROFILE%\antigravity\DREAM-Engine-wt-inbox-<id>` on branch `ai/inbox/<id>` starting from the configured base. The runner removes the worktree when the run finishes only if `ai/inbox/<id>` was pushed to `origin`.

## 3. Task File Format

A task file is a small `.md` file dropped into `%USERPROFILE%\antigravity\.fable-kitchen\inbox\queued\`. Its filename stem becomes the task `<id>`.

Format rules:

1. **Title line** (required): The first non-empty line, written as a Markdown heading (`# <Title>`) or plain sentence.
2. **Optional `lane:` line**: `lane: <lane-id>` forces a specific lane. The runner honours a forced lane only if `<lane-id>` exists in `ops/router/lanes.json`; otherwise it falls back to profiling the task with the Jev router core.
3. **Optional `repo:` line**: `repo: <repo-name>` selects the target repository (defaults to `dream-online`).
4. **Task text**: Everything after the header lines is the task body sent to the selected lane with the cookbook's common rules prepended (`PR only`, `no user folder names`, `no secrets`, `proof pasted`, `Obsidian note`).

### Example Task File (`%USERPROFILE%\antigravity\.fable-kitchen\inbox\queued\fix-hud-spacing.md`)

```markdown
# Fix HUD spacing and add unit test
lane: claude-sonnet-5-5
repo: dream-online

Adjust the spacing in src/ui/Hud.tsx and add a unit test verifying the layout props.
```

## 4. Judge Step, PR Report Comment & Safety Gates

- **Judge step**: When the `agy` handle finishes, the runner checks for a GitHub PR URL in the lane output and, for `design-visual` tasks, an Eyes gate report whose first line starts with `PASS`. Missing either re-queues the task once with the failure reason appended; failing a second time moves the task to `failed\`.
- **Quota / 429 fallback**: A quota or HTTP 429 error marks the lane cold through the Jev router core (`reportQuotaError`) and re-queues the task once on the fallback lane from `ops/router/lanes.json`.
- **PR comment**: On pass, the runner posts a comment on the PR whose first line is `Router report: <lane> on Alienware` followed by the lane, the job class, the routing reason, the decision hash, and the test summary extracted from the lane's log.
- **Safety rules**:
  - Refuses any task file or configuration that names a path under `OneDrive` as its inbox.
  - Refuses to run if `gh` is not signed in (`gh auth status`).
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
