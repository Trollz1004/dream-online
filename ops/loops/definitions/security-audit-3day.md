# Routine Definition: `security-audit-3day`

- **job**: `security-audit-3day` — Read-only 3-day security audit of `Trollz1004/ANTIGRAVITY` `main` for unguarded routes, secret-shaped strings, request-body logging, and dependency check alerts.
- **worker**: `fcc` (Free Claude Code on Alienware `192.168.0.40:8082`, writing to `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\fcc\`)
- **model class**: Stronger model through OmniRoute (`http://192.168.0.15:20128/v1`, model `antigravity/claude-opus-5-5-high` or `auto/best-reasoning`)
- **schedule**: Every 3 days at `03:15` (`15 3 */3 * *`), staggered from hourly `:05` and weekly `:35` `fcc` jobs to stay within `PROVIDER_MAX_CONCURRENCY = 2` and the 50-job `CronCreateTool` cap.
- **time limit**: `12 minutes` (`720 seconds`). Stops itself at the limit and writes a report even when a check fails or times out.

## Exact Read-Only Steps

1. In a clean read-only checkout or worktree of `Trollz1004/ANTIGRAVITY` tracking `origin/main` (never opening `.env` files or touching protected folders), run `git fetch origin main` and inspect `origin/main` head SHA.
2. Scan `origin/main` route definitions across backend and server entry points for new or existing HTTP routes missing an explicit authentication or founder/admin guard, recording exact `file:line`.
3. Run the repo's read-only secret-shape scanner and pattern scan across tracked files on `origin/main` for secret-shaped strings, hardcoded fallbacks, or private addresses, recording `file:line` and rule matched without ever printing the matched value.
4. Scan tracked source files on `origin/main` for log statements that print raw request bodies, auth headers, cookies, or tokens, recording exact `file:line`.
5. Run or read the repo's own dependency check output (read-only audit / check commands configured in `ANTIGRAVITY`) and record any reported dependency alerts with package name, severity, and manifest `file:line`.
6. Write one UTF-8 report (no BOM) named `YYYY-MM-DDTHHMM-security-audit-3day.md` to `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\fcc\` following `ops/loops/REPORT-SHAPE.md`, where every finding names `file` and `line`.

## What Counts as `needs the judge: yes`

- Any high (or critical) finding in any of the four checks:
  - A state-changing, admin, or protected route without an auth guard.
  - Any secret-shaped string or hardcoded credential fallback in tracked files.
  - Any log line that prints request bodies, tokens, passwords, or auth headers.
  - Any high or critical dependency vulnerability alert from the repo's check output.
- The routine fails to read `origin/main` or hits its 12-minute time limit.
