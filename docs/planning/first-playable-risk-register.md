# First Playable Risk Register

Status: P0 planning control

Purpose: track the risks most likely to block the first playable slice before the
team spends time on larger world, economy, PvP, or live-service systems.

## Risk Summary

| Risk | Current Status | Impact | Early Signal | Mitigation | Owner Lane |
| --- | --- | --- | --- | --- | --- |
| Engine missing | Open | High | No verified Unreal editor version, no project file, no local packaged build path | Keep current work to docs, data contracts, local services, and test seeds until engine install is approved and verified | Codex/Claude planning; Joshua approval for install |
| C++ toolchain missing | Open | High | No confirmed Visual Studio C++ workload, compiler, SDK, or Unreal build pass | Do not schedule native gameplay implementation until toolchain checklist is complete; keep gameplay contracts engine-ready | Codex/Claude planning; Joshua approval for install |
| Art assets missing | Open | Medium | First zone has no confirmed greybox kit, enemy mesh, resource node mesh, VFX, or UI pass | Use placeholder-safe asset requirements and text layouts first; require visible landmark, road, enemy, node, and event state before polish | Design and future Unreal lane |
| AI cost unknown | Open | Medium | Live NPC Lab can run locally, but no per-player call budget or provider routing proof exists | Default to mock/local replies for first playable; require call caps, timeout, fallback, and no-key local path before provider use | Live NPC Lab lane |
| Network scale unknown | Open | High | No game server, replication model, relevancy budget, or persistence strategy has been proven | Treat first playable as local proof; document one shared world direction separately from current local prototype limits | Tech planning lane |

## First Playable Gate

The first playable can move into implementation only when these checks are true:

- The target Unreal version is chosen and installed on an approved local machine.
- The C++ toolchain can compile a minimal Unreal project.
- The first zone can be represented with placeholders that clearly show spawn, road,
  guide NPC, resource node, enemy pocket, world event area, and return route.
- Live NPC Lab can answer through mock or local mode without provider keys.
- DreamOps Bridge and Live NPC Lab ports match `docs/tech/local-prototype-ports.md`.
- Persistence files for player, NPC memory, node state, and world event state are
  local, reviewable, and free of secrets.

## Blocker Policy

- Engine and C++ setup are explicit-approval blockers, not automation tasks.
- Paid provider calls are blocked until cost guards and no-key fallback behavior are
  implemented and tested.
- Public copy, monetization text, and store-facing language must stay
  convenience/style/access focused and must not promise gameplay power.
- Classified founder-only material must not be used to unblock first playable tasks.
- Direct competitor names and developer-only setup language must not appear in
  player-facing first playable copy.

## Review Cadence

Update this register whenever a first-playable task changes one of these facts:

- A blocker becomes verified complete.
- A mitigation moves from planning to implemented.
- A risk gets a concrete test failure.
- A new risk can block movement, combat, gathering, NPC memory, world events, or
  persistence.

## Next Safe Actions

- Finish setup-safe contributor docs and local command references.
- Keep expanding data contracts and seed files that do not require Unreal.
- Add mock/local NPC failure behavior before any paid provider path.
- Prepare engine install checklist for Joshua approval, then verify toolchain state
  in a separate run.
