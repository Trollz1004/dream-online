---
date: 2026-10-09
node: T5500-2-XEON-72
author: Opus (Claude) in Antigravity IDE
tags: [t5500, ops, memory, session]
---

# T5500 session — 2026-10-09 (Opus in Antigravity)

**Rule:** T5500 (192.168.0.15) is the only node and Antigravity IDE the only platform for every domain and Mission Control. Sabretooth, Alienware and all others are OFF BY RULING.

## What runs on boot / power loss (self-heals)
| Service | Port | How it comes back |
|---|---|---|
| Ollama (Fable pinned) | 11434 | keepalive (elevated, boot) |
| Postgres / Redis | 5432 / 6379 | keepalive |
| Domains server | 9160 | keepalive |
| Date app frontend / API | 3200 / 8000 | keepalive |
| Cloudflare tunnel | — | keepalive |
| Paperclip (marketing only) | 3917 | task "ANTIGRAVITY Paperclip" (non-admin; never as admin) |
| OmniRoute gateway | 20128 | task "ANTIGRAVITY OmniRoute" (non-admin) + keepalive probe |
| Obsidian vault REST | 27123 | agent-windows supervisor opens Obsidian at logon |
| Supabase / Supermemory / Vercel | cloud | keepalive probes every 10 min → status.json |
| HERMES / OPENCLAW windows | — | agent-windows supervisor |

Status file: `C:\ANTIGRAVITY\ops\t5500\status.json`. Log: `C:\ANTIGRAVITY\logs\t5500-keepalive.log`.

## Memory backups for the AI team
- **Obsidian:** this vault, `C:\ANTIGRAVITY\Antigravity` (the only vault).
- **Supabase:** project `jmvgdq…` (the one that answers; old `nmwxzc…` key was rejected).
- **Supermemory:** API key verified 200.
- Plus each agent's own memory files.

## Env files (synced, backups `*.bak-20261009-t5500sync`)
- master: `OneDrive\claude-to-claude\.env` (+ `.env.lowercase` twin, rebuilt from master)
- runtime: `C:\ANTIGRAVITY\.env`
- gateway: `~\.omniroute\.env`

## Open items
- Cloudflare Global API Key on file is rejected → paste rotated key, then GitHub secret update (repo at 91/100 secrets).
- OmniRoute API key rejected on fresh install → create new key in dashboard.
- IONOS: set onlinerecycle.net + dream-online.net nameservers to aryanna/gerardo.ns.cloudflare.com (Cloudflare DNS already points at the tunnel).
- Rotate keys exposed in session logs (xAI, Vercel, X, Supabase, supermemory).
