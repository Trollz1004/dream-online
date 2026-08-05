# Local Command Reference

Status: P0 operator reference

Purpose: provide a small, safe start/stop checklist for the current local Dream
prototypes. Keep this file free of secrets, provider keys, local auth material,
classified plot notes, and payment data.

## Requirements

- Node.js 20 or newer.
- `DREAM_ROOT` points to `E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG`.
- Default ports are kept in `docs/tech/local-prototype-ports.md`.

## Start Live NPC Lab

```powershell
cd "E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\server\live-npc-lab"
npm start
```

Health check:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:9127/health" -UseBasicParsing
```

Local tests:

```powershell
cd "E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\server\live-npc-lab"
npm test
npm run test:contracts
```

## Start DreamOps Bridge

```powershell
cd "E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\server\dreamops-bridge"
npm start
```

Health check:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:9119/health" -UseBasicParsing
```

## Check Running Services

```powershell
Get-NetTCPConnection -LocalPort 9119,9127 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,State,OwningProcess
```

If the owning process needs inspection:

```powershell
Get-Process -Id <OwningProcess>
```

## Stop Local Services

Preferred stop path when the service is running in the current terminal:

```text
Ctrl+C
```

If a previous local process is still holding a Dream prototype port, verify the
owning process first, then stop only that process:

```powershell
Stop-Process -Id <OwningProcess>
```

Do not stop unrelated processes just because a port is busy. If the port belongs
to non-Dream software that should keep running, use a temporary local override for
the current shell and leave the defaults unchanged in repo docs.

## Temporary Port Overrides

DreamOps Bridge:

```powershell
$env:DREAMOPS_PORT="9219"
cd "E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\server\dreamops-bridge"
npm start
```

Live NPC Lab:

```powershell
$env:DREAM_LIVE_NPC_PORT="9227"
cd "E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\server\live-npc-lab"
npm start
```

Temporary overrides are operator-local. Do not commit local override values as new
defaults unless `docs/tech/local-prototype-ports.md`, `STATE.md`, and service
README health examples are updated together.

## First-Playable Use

For the current first playable, the local command order is:

1. Start DreamOps Bridge when testing world-event inspection or safe recovery
   proposals.
2. Start Live NPC Lab when testing NPC dialogue, local memory, schemas, samples,
   or first-zone seeds.
3. Run Live NPC Lab tests after data contract or NPC engine changes.
4. Stop services when finished so future runs can use the documented default
   ports.
