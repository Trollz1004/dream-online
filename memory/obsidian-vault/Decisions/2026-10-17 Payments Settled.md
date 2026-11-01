---
type: decision-record
title: Payments Settled
date: 2026-10-17
created: 2026-10-17
updated: 2026-10-17
tags:
  - decision-record
  - decision
status: accepted
ai-first: true
related:
  - "[[00 HOME]]"
  - "[[Agent Universal]]"
aliases:
  - Payments record
  - Payments are settled
  - Test charges are not a blocker
---

## For future agent
Read this before you raise anything about payments, Square, or past test charges. This topic has turned into a blocker too many times over the same old test charges. It is closed. Do not reopen it.

## Ruling (Joshua, 2026-10-17)
- **Payments are settled. Read the record; never re-test.** The record is `docs/PAYMENTS-TRUTH.md` in the repo, with `docs/payment-flow-verification-2026-06-01.md` next to it.
- youandinotai.com takes payments through **Square only**.
- All **15 Square attempts** (2025-04 to 2026-08, including the one $10 refund) are **Joshua's own test charges**. Every buyer email is Joshua's. There has never been a third-party customer payment.
- The Square pipeline is **proven in production**: authorize, capture, decline handling, refund, order linkage.
- Past test charges are **not a blocker**. Their count does not matter; 100% of revenue stays with the business.
- **Never** re-verify, re-audit, re-test, or ask Joshua about them.

## The only two things that reopen payments
1. A real Square webhook failure in production.
2. A new payment in Square from someone other than Joshua. That is the first real customer: **report it to Joshua**, don't "verify" it.

## Private records
The bank statements in `OneDrive\claude-to-claude\payments-private-2026-09-17` are private. Never copy, quote, or commit them.

## Never delete
`docs/PAYMENTS-TRUTH.md` or `docs/payment-flow-verification-2026-06-01.md`. The first verification record was deleted once (2026-08-04), and agents started re-verifying all over again. That is why this note exists.

## Where else this is written (all must agree)
- Repo: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` (rulings of 2026-10-17)
- [[agent-workflow-graphy.json]] → `paymentsRecord` (v1.3.1)
- 17 skill files under `.agents/skills/` (section "Payments record (Joshua, 2026-10-17)")
- Agent contracts: `agent-contracts/HERMES-AGENT.md`, `OPENCLAW-AGENT.md`, `OPENCODE-AGENT.md`

## Notes that reference this
- [[00 HOME]]
- [[Agent Universal]]
