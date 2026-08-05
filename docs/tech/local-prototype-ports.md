# Local Prototype Ports

Status: P0 local prototype contract

Purpose: keep DreamOps Bridge, Live NPC Lab, and future local game services from
colliding while the first playable is still running on local tools.

## Port Ownership

| Service | Default Host | Default Port | Env Overrides | Current Role |
| --- | --- | --- | --- | --- |
| DreamOps Bridge | `127.0.0.1` | `9119` | `DREAMOPS_HOST`, `DREAMOPS_PORT` | Local world operations, event inspection, rollback dry-run planning, hotfix proposals |
| Live NPC Lab | `127.0.0.1` | `9127` | `DREAM_LIVE_NPC_HOST`, `DREAM_LIVE_NPC_PORT` | Local NPC dialogue, event logging, memory reads, schema and seed inspection |
| Future game server | `127.0.0.1` | `9130` reserved | `DREAM_GAME_HOST`, `DREAM_GAME_PORT` planned | First playable game loop once implementation begins |
| Future web client | `127.0.0.1` | `9131` reserved | `DREAM_WEB_HOST`, `DREAM_WEB_PORT` planned | Local browser-facing prototype, if needed before Unreal work |
| Future agent bridge | `127.0.0.1` | `9132` reserved | `DREAM_AGENT_HOST`, `DREAM_AGENT_PORT` planned | Local bridge from game events to safe NPC/provider routing |

## Rules

- Default services bind to `127.0.0.1` only.
- Do not reuse a port already assigned in this file.
- Do not expose any local prototype service publicly from this repo.
- Do not add provider keys, `.env` values, payment tokens, private auth configs, or
  classified material to port docs, README files, or startup logs.
- A service may accept a local env override, but the default must remain stable
  enough for docs, tests, and handoffs.
- If a port must change, update this file, `STATE.md`, the service README, and any
  health-check examples in the same change.

## Collision Check

Before starting both current services, check whether the default ports are already
owned by another process:

```powershell
Get-NetTCPConnection -LocalPort 9119,9127 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,State,OwningProcess
```

If a port is busy, prefer stopping the old local Dream process. If the process is
unrelated and cannot be stopped, run the Dream service with an explicit temporary
override for that session:

```powershell
$env:DREAMOPS_PORT="9219"
npm start
```

```powershell
$env:DREAM_LIVE_NPC_PORT="9227"
npm start
```

Temporary overrides are local operator choices. Do not commit them as new defaults
unless the default ownership table changes.

## Health URLs

Current default health checks:

```text
http://127.0.0.1:9119/health
http://127.0.0.1:9127/health
```

Reserved future health checks:

```text
http://127.0.0.1:9130/health
http://127.0.0.1:9131/health
http://127.0.0.1:9132/health
```

## First-Playable Dependency

The first playable can depend on these ports only after the service exists and has
a local health endpoint. Until then, reserved ports are planning placeholders, not
runtime requirements.
