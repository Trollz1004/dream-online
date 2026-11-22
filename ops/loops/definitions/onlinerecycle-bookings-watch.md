# Routine Definition: `onlinerecycle-bookings-watch`

- **job**: `onlinerecycle-bookings-watch` — Poll OnlineRecycle public health endpoint and report booking notice state and any unnotified booking IDs.
- **worker**: `hermes-t5500` (Hermes on T5500 `192.168.0.15:8643`, moved from Free Claude Code `fcc` because Free Claude Code has no lasting scheduler; writes to `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500\` for `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\hermes-t5500\`)
- **model class**: Plain model (`auto/best-coding` or default plain tier on `fcc`)
- **schedule**: Hourly at minute `:05` (`5 * * * *`), staggered from other `fcc` routines to stay within `PROVIDER_MAX_CONCURRENCY = 2` and the 50-job `CronCreateTool` cap (`3` active `fcc` routines total).
- **time limit**: `3 minutes` (`180 seconds`). Stops itself at the limit and writes a fail-safe report even on timeout or error.

## Exact Read-Only Steps

1. Perform a single read-only HTTP `GET` request to `https://onlinerecycle.net/health` with a 30-second request timeout and no retries that mutate state.
2. Parse the JSON response body and read:
   - `bookingNotices`
   - `unnotifiedBookings`
   - Any booking ID listed as not yet notified (record booking IDs only; never record customer names, emails, phone numbers, or addresses).
3. Do not send notifications, do not call any POST/PUT/DELETE route, do not open any `.env` file, and do not touch any mailbox.
4. Write one UTF-8 report (no BOM) named `YYYY-MM-DDTHHMM-onlinerecycle-bookings-watch.md` to `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\fcc\` following `ops/loops/REPORT-SHAPE.md`:
   - Line 1: `outcome: <one sentence with HTTP status and unnotifiedBookings count>`
   - Line 2: `needs the judge: <yes|no>`
   - Line 3: `evidence: https://onlinerecycle.net/health`
   - Short numbered findings listing `bookingNotices`, `unnotifiedBookings`, and any unnotified booking IDs (or `none`).

## What Counts as `needs the judge: yes`

- `unnotifiedBookings` is above `0` (or any booking ID is listed as not yet notified).
- `https://onlinerecycle.net/health` does not answer, returns a non-`200` HTTP status, returns invalid JSON, or omits `bookingNotices` / `unnotifiedBookings`.
- The routine hits its 3-minute time limit before completing the read.
