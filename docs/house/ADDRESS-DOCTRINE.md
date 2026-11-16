# Address Doctrine

Every service in the House has one canonical address. Plain sentences by design so any person or agent can read the rule in one minute.

## 1. The `192.168.0.XX:XXXX` rule

- Every reach URL in code, scripts, health probes, workflow maps, and documentation uses the node's LAN IPv4 address and port (`192.168.0.XX:XXXX`), never a loopback reach address (`localhost` or `127.0.0.1` with a port).
- Only two nodes exist in active configuration:
  - **Alienware**: `192.168.0.40` (workshop, game engine, router, and studios).
  - **T5500**: `192.168.0.15` (front of house, domains, OmniRoute, marketing gateway, and shared memory).
- Retired test nodes and legacy third-node addresses are never referenced in active configuration or service code.

## 2. Single source of truth: `ops/fleet/fleet-map.json`

- `ops/fleet/fleet-map.json` defines every node and service (`id`, `name`, `node`, `host`, `port`, `protocol`, `scope`, `bind`, `authTokenEnv`, `healthPath`, `expectedIdentity`, `ownerLane`).
- Loaders in `ops/fleet/fleet-map.mjs` and `ops/fleet/fleet-map.cjs` read `ops/fleet/fleet-map.json` so servers and routers never hardcode drift-prone host strings.
- Cross-repo copies of `ops/fleet/fleet-map.json` are kept byte-identical with `ops/fleet/copy-fleet-map.mjs`.

## 3. Bind rules and guarded services

- LAN services bind `0.0.0.0` by default (or `192.168.0.15` for OmniRoute `:20128`) so either node can reach them at `http://192.168.0.40:PORT` or `http://192.168.0.15:PORT`.
- Services marked `"lan-guarded"` in `ops/fleet/fleet-map.json` execute commands, mutate state, or spend model quota:
  - Swarm Command (`192.168.0.40:8000`)
  - Free Claude Code (`192.168.0.40:8082`)
  - Lead-Gen Studio (`192.168.0.40:8392`)
  - DREAM Engine (`192.168.0.40:9180`)
  - Mission OS (`192.168.0.15:3130`)
  - Hermes API (`192.168.0.15:8643`)
  - Ollama on both nodes (`192.168.0.40:11434` and `192.168.0.15:11434`)
- Every `"lan-guarded"` service enforces two layers of protection:
  1. **Token authentication**: requires its configured token (`DREAM_ENGINE_TOKEN`, `HERMES_LEADGEN_TOKEN`, or `FLEET_SHARED_TOKEN`) verified with constant-time comparison before any state-changing, agent, proxy, or model-spend route runs.
  2. **Firewall allowlist**: `ops/fleet/firewall-allowlist.ps1` restricts inbound TCP traffic on LAN service ports to `-RemoteAddress 192.168.0.15,192.168.0.40`.

## 4. The `127.0.0.1` exception ("this machine only")

- Only three services are marked `"this machine only"` with bind `"127.0.0.1"`:
  - **Postgres** (port `5432`, bind `"127.0.0.1"`)
  - **Redis** (port `6379`, bind `"127.0.0.1"`)
  - **Obsidian Local REST API** (port `27123`, bind `"127.0.0.1"`)
- These three services never bind `0.0.0.0` and never receive an inbound LAN firewall rule.
- A bare bind string `"127.0.0.1"` is allowed for a local socket bind override or an ephemeral test listener, while loopback reach URLs are blocked by `ops/hooks/secret-scan.mjs`.
