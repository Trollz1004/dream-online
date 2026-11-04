# judge-memory — In-House Recall for the Signed-In Claude Code Judge Lane (v1)

CLAUDE's N Joshua's · #TeamClaudeForLife · Built with Google Gemini

`judge-memory` gives the signed-in Claude Code judge lane (`fable`) its own local, full-text searchable recall across sessions without spending the scarce judge cap on rebuilding context from cold files. It is built 100% in-house under our own terms with Node's built-in `node:sqlite` (`DatabaseSync` + FTS5), zero external services, zero API keys, and zero cloud sync.

## 1. Where It Runs and Wrapper Lockout

- The SQLite store lives on the node the judge lane runs on under `%LOCALAPPDATA%\dream-judge-memory\judge-memory.sqlite`, never inside a git repository and never inside the OneDrive `claude-to-claude` drop box.
- Every hook and the stdio MCP server verify the signed-in Claude Code session marker (`DREAM_JUDGE_LANE_SESSION=claude-code-signed-in`) and check that no wrapper or API-key indicator (`FREE_CLAUDE_CODE`, `FCC_SESSION`, `HERMES_SESSION`, `AGY_SESSION`, `ANTIGRAVITY_AGENT`, `OMNIROUTE_SESSION`, `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, or port `8082`) is present.
- When the marker is absent or any wrapper indicator is set, every hook and the MCP server exit immediately without opening or creating the store.

## 2. Lifecycle Capture Hooks (`ops/judge-memory/hooks/`)

- `hooks/session-start.mjs` (`SessionStart`): verifies the session marker, records the active session, and emits the budgeted session-start brief to standard output.
- `hooks/post-tool-use.mjs` (`PostToolUse`): records one rules-compressed observation per meaningful tool call (`tool`, normalized `target`, and one-line `outcome`), and automatically populates `verdicts` and `lane_facts` when a PR verdict or lane dispatch occurs.
- `hooks/stop.mjs` (`Stop`): records the session's final reply as the judge's own summary along with `NEXT` and `BLOCKED` lines.
- `hooks/session-end.mjs` (`SessionEnd`): writes the mandatory caveman Obsidian session note (`DID`, `BROKE`, `NEXT`, `BLOCKED`, `FILES`) directly from the stored session observations and summary so the Obsidian note and the SQLite memory never disagree.

## 3. Rules-Only Compression (`ops/judge-memory/store/rules.ts`)

- Version 1 makes all observations by deterministic rules without calling any model: `file_touched`, `command_run`, `pr_commented`, `verdict_posted`, `lane_dispatched`, and `picture_looked_at`.
- Daily digests are compressed to at most ten lines by rules (`createDailyDigest`) so the judge lane never spends its cap on compressing its own memory.

## 4. SQLite + FTS5 Store (`ops/judge-memory/store/database.ts`)

- Uses Node's built-in `node:sqlite` (`DatabaseSync`) with an FTS5 full-text virtual table (`memory_fts`) indexing five core tables: `sessions`, `observations`, `verdicts` (`pr_number`, `repo`, `verdict`, `reasons`, `commit_judged`, `pr_state`), `rulings` (`ruled_at`, `ruling`, `written_in`), and `lane_facts` (`lane`, `node`, `what_it_did`, `duration_seconds`, `what_it_broke`), plus `daily_digests`.
- Nightly maintenance (`runNightlyMaintenance`) enforces the size cap with oldest-first pruning of raw observations only after their daily digest exists in `daily_digests`, followed by `VACUUM`.

## 5. SessionStart Brief and 1,500-Token Hard Ceiling (`ops/judge-memory/store/brief.ts`)

- Injects at most 1,500 tokens containing strictly: the five newest rulings, the open PRs with the judge's last verdict on each, the last session's `NEXT` and `BLOCKED` lines, the three newest `lane_facts`, and a one-line pointer to the state page and the cookbook.
- The token budget is configurable (`JUDGE_MEMORY_BRIEF_TOKEN_BUDGET` or `budgetTokens`), with `1500` enforced as a hard ceiling even if a higher number is requested.

## 6. Progressive Retrieval MCP Server (`ops/judge-memory/server/mcp-server.mjs`)

- Local stdio JSON-RPC 2.0 MCP server exposing three tools:
  1. `search`: full-text FTS5 query across all tables, returning `id` and one line per hit.
  2. `timeline`: chronological activity around a `date` (`YYYY-MM-DD` or ISO timestamp) or a `pr` number.
  3. `get`: full stored records by ID (`[1, 2]` or `["obs:1", "verdict:2", "ruling:1"]`).

## 7. Privacy, Deny-List, Redaction, and `<private>` Tag (`ops/judge-memory/store/privacy.ts`)

- Deny-list paths are never read and never stored: `SUP@-VAULT-FOUNDER-ONLY.md` (and `SUP@-VAULT-FOUNDER-ONLY-PHRASES.md`), every `.env` and `*.env` file, the `payments` / `payments-private-*` folder, the `Personal Vault`, and the Obsidian memory of other lanes (`gemini-to-gemini.md`, `hermes-to-hermes.md`, `codex-to-codex.md`, `agy-argon`, `opsis`, etc.).
- Every stored string passes the router's `sanitizeDecisionLogText` redaction plus `%LOCALAPPDATA%` and `%USERPROFILE%` path normalization and pre-push secret-shape redaction.
- Any passage wrapped in `<private>...</private>` is stripped before storage.
- Any path citation to `SUP@-VAULT-FOUNDER-ONLY.md` is collapsed to its bare filename so no vault directory path or content ever enters the store.
- No screenshot or image ever enters the store; inspecting an image is recorded strictly as `looked at <file name>, verdict <one line>`.

## 8. Fleet Memory MCP Digest Push and Staging Backup (`ops/judge-memory/store/sync.ts`)

- Pushing the ten-line daily digest and the `rulings` table to the fleet memory MCP on the T5500 is guarded behind `JUDGE_MEMORY_FLEET_PUSH_ENABLED=true` (defaults off). When enabled, the MCP URL is read by environment variable name (`AI_MEMORY_MCP_URL` or `FLEET_MEMORY_MCP_URL`) and never printed.
- Nightly SQLite backups (`backupStoreToVaultStaging`) copy the database to `%USERPROFILE%\VAULT-STAGING-<YYYY-MM-DD>\` outside OneDrive and refuse any path inside the `claude-to-claude` drop box or a git repository.

## 9. Registration Scripts (`ops/judge-memory/scripts/`)

- `scripts/register-judge-memory.ps1` and `scripts/unregister-judge-memory.ps1` default to dry-run mode: they print the exact JSON changes they would make to `%USERPROFILE%\.claude\settings.json` and modify nothing on disk unless `-Apply` is passed.
- Worker lanes never run `-Apply`; only Josh or the signed-in Claude judge lane registers `judge-memory` on a node.
