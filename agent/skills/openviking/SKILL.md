---
name: openviking
description: "Hierarchical L0/L1/L2 context indexing and backup (viking://dream/...) paired with Obsidian and Shared ai-memory (:49374)."
version: 2.0.0
platforms: [windows, linux, macos]
---

# OpenViking L0/L1/L2 Context & Backup Skill (2026-10-28)

## Protocol
- Store every architectural and session checkpoint with ikingUri (iking://dream/<scope>/<slug>), l0Abstract (1-sentence summary), l1Overview (metadata & verification), and l2Markdown (full Obsidian Markdown with [[Wikilinks]]).
- Backed by POST http://127.0.0.1:20128/api/memory/store and Shared i-memory (http://192.168.0.15:49374).
