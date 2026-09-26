# Local Prototype Ports

Status: P0 local prototype contract

Purpose: keep DreamOps Bridge, Live NPC Lab, and future local game services from
colliding while the first playable is still running on local tools.

## Port Ownership

| Service | Default Host | Default Port | Env Overrides | Current Role |
| --- | --- | --- | --- | --- |
| DreamOps Bridge | `127.0.0.1` | `9133` | `DREAMOPS_HOST`, `DREAMOPS_PORT` | Local world operations, event inspection, rollback dry-run planning, hotfix proposals |
| Live NPC Lab | `127.0.0.1` | `9127` | `DREAM_LIVE_NPC_HOST`, `DREAM_LIVE_NPC_PORT` | Local NPC dialogue, event logging, memory reads, schema and seed inspection |
| Future game server | `127.0.0.1` | `9130` reserved | `DREAM_GAME_HOST`, `DREAM_GAME_PORT` planned | First playable game loop once implementation begins |
| Future web client | `127.0.0.1` | `9131` reserved | `DREAM_WEB_HOST`, `DREAM_WEB_PORT` planned | Local browser-facing prototype, if one is ever needed beside the Godot browser build on `8099` |
| Future agent bridge | `127.0.0.1` | `9132` reserved | `DREAM_AGENT_HOST`, `DREAM_AGENT_PORT` planned | Local bridge from game events to safe NPC/provider routing |

## Ports owned by other services on the same box

These are not Dream services, but they listen on the Alienware node and no Dream
service may take their ports (identity strings are in
`ops/node/skills/alienware-node/SKILL.md`, section 3):

| Port | Owner | Identity check |
| --- | --- | --- |
| `9119` | Hermes dashboard (optional) | `/api/health` contains `"ok":true` |
| `11434` | Ollama (optional, T0 ambient NPCs only) | `/api/tags` contains `"models":[` |
| `9150` | The older JARVIS HUD copy in the stack (optional) | `/health` contains `airi-dashboard` |
| `3000` | Crosslisting OS (optional, not game work; Obsidian may also answer on `127.0.0.1:3000`) | `/` contains `<div id="root">` |
| `27123` | Obsidian Local REST API (the game vault's MCP handshake) | answers `initialize` as `obsidian-local-rest-api` |
| `8099` | The combat slice's browser build, only while `game\godot\Serve-DreamSlice-Web.cmd` runs | serves `build\web` |

`20128` (OmniRoute) exists only on Sabretooth (`192.168.0.8`); nothing on this
node serves it and nothing here should.

## Rules

- Default services bind to `127.0.0.1` only.
- Do not reuse a port already assigned in this file, including the ports owned
  by other services above.
- Do not expose any local prototype service publicly from this repo.
- Do not add provider keys, `.env` values, payment tokens, private auth configs, or
  classified material to port docs, README files, or startup logs.
- A service may accept a local env override, but the default must remain stable
  enough for docs, tests, and handoffs.
- If a port must change, update this file, `STATE.md`, the service README, and any
  health-check examples in the same change.

## Collision Check

Before starting both current services, check whether the default ports are already
owned by another process (on the Alienware node the stack supervisor normally owns
them already; `drift health` reports every service by identity string):

```powershell
Get-NetTCPConnection -LocalPort 9133,9127 -ErrorAction SilentlyContinue |
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
http://127.0.0.1:9133/health
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
