# Loop Report Shape

Every routine writes one UTF-8 Markdown file per pass into its worker inbox subfolder:

- `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\fcc\`
- `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\hermes-t5500\`
- `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\freebuff\`

## File Name

`YYYY-MM-DDTHHMM-<routine>.md` (24-hour timestamp and routine slug, for example `2026-11-22T0900-onlinerecycle-bookings-watch.md`).

## First Three Lines (Required Header)

Line 1: `outcome: <one short sentence summarizing what the pass found or why it stopped>`
Line 2: `needs the judge: <yes|no>`
Line 3: `evidence: <comma-separated repo paths, file:line references, or canonical reach addresses>`

## Findings Body

After line 3, leave one blank line and list findings as short numbered lines (`1.`, `2.`, `3.`).

```markdown
outcome: OnlineRecycle health answered 200 OK with 0 unnotified bookings.
needs the judge: no
evidence: https://onlinerecycle.net/health

1. bookingNotices: all recent bookings notified.
2. unnotifiedBookings: 0.
3. Unnotified booking IDs: none.
```

## Redaction and Privacy Rules

- No secrets, tokens, keys, or environment variable values anywhere in a report.
- No customer personal data (names, emails, phone numbers, street addresses) beyond a booking ID.
- Use `%USERPROFILE%` and `%LOCALAPPDATA%` instead of Windows user folder names, and use `192.168.0.40` or `192.168.0.15` reach addresses per `docs/house/ADDRESS-DOCTRINE.md`.
