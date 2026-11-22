# Small-Wheel Loop Rules

Helper workers (`fcc` on `192.168.0.40:8082`, `hermes-t5500` on `192.168.0.15:8643`, and `freebuff`) run repeating routines on small wheels and drop reports in `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\<worker>\` for the head of the kitchen.

1. **Read and report only.** A routine only reads and writes its inbox report. It never merges, deploys, posts, sends mail to people, opens env files, or changes a setting.
2. **Founder Telegram exception (`support-audit` only).** Only `support-audit` on `hermes-t5500` may send one short plain Telegram message to the founder via its existing founder bot when a customer matter needs the founder himself, and must note it in the report. It messages no one else.
3. **Own surfaces and official APIs only.** A routine never reads another platform's pages by script. It reads only own repos, own health pages, and official APIs.
4. **Headless and zero focus steal.** On the Alienware (`192.168.0.40`), routines run headless and never open a window or take keyboard focus.
5. **Hard time limit and fail-safe report.** Every routine stops itself at its time limit and writes a report in `ops/loops/REPORT-SHAPE.md` format even when a check fails or times out (`needs the judge: yes`).
6. **Privacy and path hygiene.** Never read or print env files, secrets, Personal Vault, `DO-NOT-COMMIT`, `payments-private`, or customer data beyond a booking ID. Never touch folders named `hermes`, `grin-droid`, `GrinDroid`, `mira`, or `trolly`.
7. **Archive safety (`storage-audit`).** Storage audits read file names and sizes only, never download cloud-only placeholders, and never zip, move, or delete files. Any archive step requires written head-of-kitchen approval and runs as zip plus checksum with the original kept until verified.
8. **Stay under worker caps.** Active loops stay under worker limits: Claude Code `CronCreateTool` caps scheduled jobs at `50` (`var D=50`, 7-day auto-expiry) and Free Claude Code caps provider concurrency at `2` (`PROVIDER_MAX_CONCURRENCY=2`, `/admin/code` list limit `25`); Hermes scheduled-job cap is `not found` in repo docs, so routines stay at 3 `fcc` jobs and 2 `hermes-t5500` jobs (5 total).
