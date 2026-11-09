---
name: openviking
description: "Hierarchical L0/L1/L2 context indexing and backup (viking://dream/...) paired with Obsidian and Shared ai-memory (:49374)."
version: 2.1.0
platforms: [windows, linux, macos]
---

# OpenViking L0/L1/L2 Context & Backup Skill (2026-11-01)

## Protocol
- Store every architectural and session checkpoint with `vikingUri` (`viking://dream/<scope>/<slug>`), `l0Abstract` (1-sentence summary), `l1Overview` (metadata & verification), and `l2Markdown` (full Obsidian Markdown with `[[Wikilinks]]`).
- Backed by `POST http://127.0.0.1:9180/api/memory/store` and Shared `ai-memory` (`:49374`).
- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).
