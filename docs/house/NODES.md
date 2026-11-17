# Nodes

Plain sentences by design so any person or agent can read which machine owns what in one minute.

## 1. Two `Trollz1004` nodes

- **Alienware (`192.168.0.40`) — the workshop**: builds, runs, and tests active work.
  - DREAM Engine & Studio (`:9180`), wheel inbox runner, Panda Router (`:8765`), Swarm Command (`:8000`), Lead-Gen Studio (`:8392`), OPSis Studio (`:8390`), Free Claude Code (`:8082`), and the Freebuff lead-gen folder.
- **T5500 (`192.168.0.15`) — front-of-house**: runs finished products and customer support.
  - Mission OS (`:3130`) with stream-safe redaction, Domains Server (`:9160`), Date App (`:3200` web and `:8000` API), OmniRoute (`:20128`), Shared `ai-memory` (`:49374`), and Hermes API (`:8643`).

## 2. Build and boundary rules

- **Heavy builds go to the wheel**: heavy builds requested from Mission OS route to the Alienware wheel through the inbox. They are never built on the T5500.
- **Third machine boundary**: the third machine is a separate test node under a separate GitHub account and is never named or reached from `Trollz1004` code.
- **Separate private project boundary**: never open, edit, or attach files or profiles of any separate private project. Coordinate only via a handoff note in the drop box.
- **Machine-local services**: Postgres (bind `"127.0.0.1"` on port `5432`), Redis (port `6379`), and Obsidian Local REST API (port `27123`) stay local to their host machine.

## 3. Single source of node facts

- Every host IP, port, guard scope, repo list, and harness list lives in `ops/fleet/fleet-map.json`.
- Address rules and token-guard requirements live in `docs/house/ADDRESS-DOCTRINE.md`.
