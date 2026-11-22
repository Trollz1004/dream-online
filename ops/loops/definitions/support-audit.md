# Routine Definition: `support-audit`

- **job**: `support-audit` — Daily read-only audit of customer-visible support paths across `onlinerecycle.net`, `youandinotai.com`, and the `eBay store` (named placeholder with no access yet). The T5500 Hermes is the support agent for all platforms and does support only. This routine reads and reports; it answers no customer and sends nothing to customers.
- **worker**: `hermes-t5500` (Hermes on T5500 `192.168.0.15:8643`, writing to `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\hermes-t5500\`)
- **model class**: Plain model
- **schedule**: Daily at `08:20` (`20 8 * * *`), keeping total `hermes-t5500` scheduled jobs at `2` (well under worker limits).
- **time limit**: `8 minutes` (`480 seconds`). Stops itself at the limit and writes a report even when a check fails or times out.

## Exact Read-Only Steps

1. Never open mailboxes, never open `.env` files, never answer a customer, and never post a synthetic customer ticket. Where verifying a destination would require opening a mailbox or `.env` file, report `not checked` and state why.
2. Check **`onlinerecycle.net`** (own repo routes and public read-only pages/health):
   - Enumerate visible customer support paths: contact form, phone line, help page, refund page, and booking confirmation path.
   - Report where each path's messages land from tracked route/config code (or `not checked` if destination lives only in `.env` or mailbox).
   - Check read-only that each visible page answers (`200 OK`), each form target maps to a live route in code/options without submitting spam, and `https://onlinerecycle.net/health` shows no stuck booking notices (`unnotifiedBookings === 0`).
3. Check **`youandinotai.com`** (own repo routes and public read-only pages/health):
   - Enumerate visible customer support paths: contact form, phone line, help page, refund page, and booking/account confirmation path.
   - Report where each path's messages land from tracked route/config code (or `not checked` if mailbox/`.env` access would be needed).
   - Check read-only that each visible support/help/refund page answers, each form target maps to a live route, and the health endpoint reports healthy status with no stuck support items.
4. Check **`eBay store`** (named placeholder with no access yet):
   - Record `eBay store: placeholder — not checked (no official API or store access configured yet)` for contact form, phone line, help page, refund page, and order/booking confirmation. Do not scrape eBay pages by script.
5. **Founder Telegram alert rule (added 2026-11-22 09:19)**:
   - The T5500 Hermes already has its own Telegram bot to the founder. When the audit finds a customer matter that needs the founder himself, Hermes sends the founder **one short plain message** on that Telegram bot and notes in the report that the founder Telegram message was sent. It messages no one else.
6. Write one UTF-8 report (no BOM) named `YYYY-MM-DDTHHMM-support-audit.md` to `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\hermes-t5500\` following `ops/loops/REPORT-SHAPE.md`.

## What Counts as `needs the judge: yes`

- Any visible customer support path on `onlinerecycle.net` or `youandinotai.com` leads nowhere (404/5xx page, dead form action route, missing handler, or broken confirmation path).
- Any customer message or booking notice could be lost (stuck items on a health page, unnotified bookings above 0, or a live support route dropping submissions).
- Any customer matter is found that requires the founder himself (also triggers the one short plain Telegram message to the founder).
- The routine hits its 8-minute time limit or a platform health/support surface fails to answer.
