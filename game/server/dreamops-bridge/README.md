# DreamOps Bridge Prototype

Local-only prototype for DREAM ONLINE operational visibility.

## Purpose

DreamOps Bridge gives authorized agents a safe way to inspect world state, active events, economy health, NPC memory queues, checkpoints, rollback plans, and hotfix proposals.

This is the internal operations layer behind the in-world C0D3X recovery fantasy.

## Run

```powershell
$env:DREAM_ROOT="D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG"
cd "$env:DREAM_ROOT\game\server\dreamops-bridge"
npm start
```

Default URL:

```text
http://127.0.0.1:9119
```

## Endpoints

- `GET /health`
- `GET /world/health`
- `GET /events`
- `POST /events/:id/pause`
- `GET /economy/scan`
- `GET /npc/memory-queue`
- `GET /checkpoints`
- `POST /rollback/plan`
- `POST /hotfix/propose`

## Safety

- No destructive rollback execution exists yet.
- Mutations write to `game/server/audit.log`.
- Storage is JSON files only.
- No secrets are loaded or printed.
- This is not public-facing.
