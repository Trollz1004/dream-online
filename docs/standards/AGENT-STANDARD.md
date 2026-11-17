# ANTIGRAVITY Agent Standard (pointer)

CLAUDE's N Joshua's · #TeamClaudeForLife · Built with Google Gemini

The one canonical House spine lives in `docs/house/SPINE.md` (`ops/fleet/fleet-map.json`), and the canonical agent standard lives in `Trollz1004/ANTIGRAVITY` at `docs/standards/AGENT-STANDARD.md` (repo-relative). This file is only a pointer so the two copies cannot drift. Read `docs/house/SPINE.md` and the canonical copy first. Public repositories never hold secrets, private addresses, keys, or personal details.

DREAM Online additions that do not belong in the canon live in `docs/standards/DREAM-ROUTER-ISOLATION.md` (off-repo backups, Game-Studios isolation, task router).

## Rulings every lane must see even when only this repo is read

- **Remake gate.** The `remake` `100% Yours` gate passes on three things: features matched (at least 98 percent of what the source does), a clear visual difference from the source, and our own code. It never passes on likeness, and scrubbing brand or analytics strings out of copied code is not clean-room work. The lane that studies the source writes a feature spec only; a different lane that never saw the source builds from that spec; an independent judge runs the gate (`REA`, `remake`, `Agent-Reach`, and `last30days` are locked strictly to the trusted three: `Claude Opus 5.5 / Fable`, `Gemini 4 Carbon`, `GPT-6 Astra / GPT-6.1 Sol / Codex`).
- **Judges & Merges.** `Gemini 4 Carbon` and signed-in `Codex` judge primary and stacked add-on PRs; `Fable` or the rotating trusted-three merges once GitHub CI checks are green. When AI lanes disagree, the judge states its reason in one line. Josh can overrule any call. Executor lanes open PRs and never merge.
- **Address doctrine.** Read `docs/house/ADDRESS-DOCTRINE.md` and `ops/fleet/fleet-map.json`: use `192.168.0.40` (Alienware) and `192.168.0.15` (T5500) reach addresses, never loopback reach URLs and never retired third-node names or IPs.
- **Paths.** Never type a Windows user folder name in any file. Use `%USERPROFILE%`, `%LOCALAPPDATA%` or `$env:USERPROFILE`.

## Hard rules

- No Anthropic API key anywhere, ever. Real Claude is sign-in only.
- No provider key on any machine.
- Nothing costs money until Josh says finalize.
- Never break the law or any site's or platform's terms.
- Own work only.
- Claude is the brain, not the hands. Claude finds and diagnoses; mechanical fixing goes to the cheaper lanes.
- When a claim rests on one query, say so in the same sentence.
- Secrets live in the local env files and personal vault only. Never in git, chat, logs, notes, or memory.
- Never scrape YouTube or any Google site, by any tool. Videos upload as private only, and Josh publishes them himself.
- Customer-facing copy sells product value only: membership, verification, support, safety, uptime, matching quality, account access, gameplay.
- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).
