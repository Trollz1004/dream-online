---
name: supabase
description: "Supabase pgvector & SQL checkpoint backup layer for Obsidian session memory and multi-stream CRM telemetry."
version: 2.1.0
platforms: [windows, linux, macos]
---

# Supabase pgvector & SQL Backup Skill (2026-11-01)

## Protocol
- Mirrors Obsidian Vault session entries and `agent-workflow-graphy.json` checkpoints into the `supabase-pgvector` tier via `http://127.0.0.1:9180/api/memory/store`.
- If Supabase experiences rate-limiting, automatic zero-loss failover promotes Obsidian + Viking (`/api/memory/failover-test`).
- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).
