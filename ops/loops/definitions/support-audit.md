# Routine Definition: `support-audit`

- **job**: `support-audit` — Daily read-only script audit (`ops/loops/scripts/support-audit.mjs`) of customer-visible support paths across `onlinerecycle.net`, `youandinotai.com`, and the `eBay store` (named placeholder with no access yet). Runs in script mode (`--no-agent`) with no model asked to browse.
- **worker**: `hermes-t5500` (Hermes on T5500 `192.168.0.15:8643`, writing to `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500\` for `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\hermes-t5500\`)
- **mode**: Script mode (`--script ... --no-agent` using `C:\Program Files\nodejs\node.exe` on T5500)
- **schedule**: Daily at `08:20` (`20 8 * * *`), keeping total active `hermes-t5500` scheduled jobs at `2`.
- **time limit**: `10 seconds` per HTTP check (`10000 ms`). Writes a report even when a check fails or times out.

## Exact Read-Only Steps (`ops/loops/scripts/support-audit.mjs`)

1. Move any existing `.md` reports in `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500\` older than 14 days into `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500\older\` (`fs.renameSync`; never delete).
2. Never open mailboxes, never open `.env` files, never answer a customer, and never post a synthetic customer ticket.
3. Run a fixed list of checks written in the script with their addresses:
   - **`onlinerecycle.net` visible support pages and expected headings**:
     - `https://onlinerecycle.net/` (`Florida Electronics Recycling & Free Pickup`)
     - `https://onlinerecycle.net/service-areas.html` (`Service Areas: Central Florida Electronics Recycling & Free Pickup`)
     - `https://onlinerecycle.net/about.html` (`About OnlineRecycle.net`)
     - `https://onlinerecycle.net/terms.html` (`Terms of Service`)
     - `https://onlinerecycle.net/privacy.html` (`Privacy Policy`)
     - `https://onlinerecycle.net/disclaimer.html` (`Disclaimer`)
     - List each contact address, email, or phone shown on those pages.
   - **`onlinerecycle.net` booking route and health**:
     - `https://onlinerecycle.net/api/booking-config` (`ok === true`)
     - `https://onlinerecycle.net/health` (`service === "domains-server"`, `unnotifiedBookings === 0`)
   - **`youandinotai.com` visible support pages and expected headings**:
     - `https://youandinotai.com/` (`YouAndINotAI | Verified Human Dating & Real-World Connection`)
     - `https://youandinotai.com/support` (`YouAndINotAI | Verified Human Dating & Real-World Connection`)
     - `https://youandinotai.com/AGENTS.md` (`# YouAndINotAI`)
     - List each contact address or phone shown on those pages (`contact@youandinotai.com`).
   - **`youandinotai.com` date app health**:
     - `https://youandinotai.com/health` (`status === "ok"`)
     - `https://api.youandinotai.com/health` (`status === "ok"`, `db_connected === true`)
   - **Unchecked items**:
     - One `not checked:` line for mailbox and `.env` delivery destinations.
     - One `not checked:` line for the `eBay store` placeholder.
4. Every numbered finding line in the report body uses `checked: <result>` or `not checked: <reason>`.
5. Send no Telegram message (a later ticket adds that on the founder's word).
6. Write one UTF-8 report (no BOM) named `YYYY-MM-DDTHHMM-support-audit.md` to `C:\ANTIGRAVITY\logs\loop-reports\hermes-t5500\` following `ops/loops/REPORT-SHAPE.md`.

## What Counts as `needs the judge: yes`

- Any visible support page on `onlinerecycle.net` or `youandinotai.com` fails to answer `200 OK` or is missing its expected heading.
- The booking route (`https://onlinerecycle.net/api/booking-config`), OnlineRecycle health (`https://onlinerecycle.net/health`), or Date App health (`https://youandinotai.com/health`, `https://api.youandinotai.com/health`) fails or reports stuck/unnotified items.
