# Routine Definition: `onlinerecycle-bookings-watch`

- **job**: `onlinerecycle-bookings-watch` — Poll OnlineRecycle public health endpoint by script (`ops/loops/scripts/bookings-watch.mjs`) with no model agent (`--no-agent`) and report booking notice state and any unnotified booking IDs.
- **worker**: `hermes-t5500` (Hermes on T5500 `192.168.0.15:8643`, moved from Free Claude Code `fcc` because Free Claude Code has no lasting scheduler; writes to `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500\` for `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\hermes-t5500\`)
- **mode**: Script mode (`--script ... --no-agent` using `C:\Program Files\nodejs\node.exe` on T5500)
- **schedule**: Hourly at minute `:05` (`5 * * * *`)
- **time limit**: `10 seconds` HTTP request timeout (`10000 ms`). Writes a fail-safe report even on timeout or error.

## Exact Read-Only Steps (`ops/loops/scripts/bookings-watch.mjs`)

1. Move any existing `.md` reports in `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500\` older than 14 days into `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500\older\` (`fs.renameSync`; never delete).
2. Perform a single read-only HTTP `GET` request to `https://onlinerecycle.net/health` with a 10-second request timeout and no retries that mutate state.
3. Parse the JSON response body and read:
   - `bookingNotices`
   - `unnotifiedBookings`
   - Any booking ID listed as not yet notified (record booking IDs only; never record customer names, emails, phone numbers, or addresses).
4. Do not send notifications, do not call any POST/PUT/DELETE route, do not open any `.env` file, and do not touch any mailbox.
5. Write one UTF-8 report (no BOM) named `YYYY-MM-DDTHHMM-onlinerecycle-bookings-watch.md` to `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500\` following `ops/loops/REPORT-SHAPE.md`:
   - Line 1: `outcome: <one sentence with HTTP status and unnotifiedBookings count>`
   - Line 2: `needs the judge: <yes|no>`
   - Line 3: `evidence: https://onlinerecycle.net/health`
   - Short numbered findings listing `bookingNotices` (including one-line duration note when off pending founder's values), `unnotifiedBookings`, and any unnotified booking IDs (or `none`).

## What Counts as `needs the judge: yes`

- `https://onlinerecycle.net/health` fails to answer, returns a non-`200` HTTP status, returns invalid JSON, or omits `bookingNotices` / `unnotifiedBookings`.
- `unnotifiedBookings` is above `0` (or any booking ID is listed as not yet notified).
- `bookingNotices` is not `'on'` for more than 24 hours (today it is `'off'` pending the founder's values, so report it in one line and keep `needs the judge: no` for that alone while under 24 hours).
