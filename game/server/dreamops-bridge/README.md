# DreamOps Bridge Prototype

Local-only prototype for DREAM ONLINE operational visibility.

## Purpose

DreamOps Bridge gives authorized agents a safe way to inspect world state, active events, economy health, NPC memory queues, checkpoints, rollback plans, and hotfix proposals.

This is the internal operations layer behind the in-world C0D3X recovery fantasy.

## Run

```powershell
$env:DREAM_ROOT="C:\DREAM\dream-online"
cd "$env:DREAM_ROOT\game\server\dreamops-bridge"
npm start
```

Default URL:

```text
http://127.0.0.1:9133
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

- A fresh install contains an unverified sample checkpoint and has no last-green checkpoint.
- Rollback planning selects the newest checkpoint explicitly marked `verified: true`; an explicitly requested unverified checkpoint returns HTTP 409. No eligible checkpoint returns HTTP 409; an unknown explicit ID returns HTTP 404.
- Known legacy metadata-only seeds are reported as unverified even if their stored flag says otherwise. Existing files are not rewritten.
- Verification flags on other operator-supplied records remain declarations: this prototype does not yet validate snapshot contents, hashes, or perform a restore drill. A plan is not recovery proof.
- No destructive rollback execution exists yet.
- Mutations write to `game/server/audit.log`.
- Storage is JSON files only.
- No secrets are loaded or printed.
- This is not public-facing.

## Verify

Run `npm test` and `npm run lint` from this directory. Tests use temporary storage and a loopback HTTP server; they never touch a running world's files.
