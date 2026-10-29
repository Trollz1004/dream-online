---
name: supabase
description: "Supabase pgvector & SQL checkpoint backup layer for Obsidian session memory and multi-stream CRM telemetry."
version: 2.0.0
platforms: [windows, linux, macos]
---

# Supabase pgvector & SQL Backup Skill (2026-10-28)

## Protocol
- Mirrors Obsidian Vault session entries and `agent-workflow-graphy.json` checkpoints into the `supabase-pgvector` tier via `http://127.0.0.1:20128/api/memory/store`.
- If Supabase experiences rate-limiting, automatic zero-loss failover promotes Obsidian + Viking (`/api/memory/failover-test`).
