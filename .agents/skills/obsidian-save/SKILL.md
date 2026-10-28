---
name: obsidian-save
description: "Mandatory session-start read and session-end write to the Obsidian Vault (C:\DREAM\Antigravity\<NODE>\<agent>-to-<agent>.md) with automatic backup to Shared ai-memory (:49374), Graphy, OpenViking, Supabase, and Supermemory."
version: 2.0.0
platforms: [windows, linux, macos]
---

# Obsidian Authoritative Session Memory & 4-Tier Backup Skill (2026-10-28)

## Mandatory Session Protocol (Every Agent, Every Node, Every Session)
1. **Session Start**:
   - Read C:\DREAM\Antigravity\T5500\gemini-to-gemini.md and C:\DREAM\Antigravity\<NODE>\<agent>-to-<agent>.md (Alienware, T5500, Sabretooth).
   - Query Shared i-memory MCP (http://192.168.0.15:49374) with scope: "global".
2. **Session End (scripts/obsidian/session-note.ps1)**:
   - Append a timestamped entry (## YYYY-MM-DD HH:MM TZ | node: <NODE> | use case: <summary>) to C:\DREAM\Antigravity\<NODE>\<agent>-to-<agent>.md and memory/obsidian-vault/.
   - Mirror the entry to:
     - **Shared i-memory MCP**: http://192.168.0.15:49374 (memory_write_page)
     - **Graphy & Local 4-Tier Bridge**: POST http://127.0.0.1:20128/api/memory/store (syncs Obsidian + Viking iking://dream/... + Supabase pgvector + Supermemory recall backup)
   - Never write raw secrets, API keys, or tokens (always redact as XXXX).
