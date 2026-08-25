# DreamOps Bridge

Implementation path:

`D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\server\dreamops-bridge`

## What Exists Now

A local-only JSON-backed bridge for world operations.

It provides:

- World health inspection.
- Active/scheduled event listing.
- Safe event pause mutation with audit log.
- Economy anomaly scan.
- NPC memory queue inspection.
- Checkpoint list.
- Rollback dry-run plan.
- Hotfix proposal capture.

It does not provide:

- Public access.
- Real game loop.
- Netcode.
- Destructive rollback execution.
- Provider API calls.
- Secret loading.

## Why This Comes First

The evolving AI world needs recovery and observability before live AI can change the world. C0D3X can be the in-world fiction, but DreamOps Bridge is the operator safety layer.

## Next Extensions

1. Add lightweight auth for local operators.
2. Add real checkpoint generation.
3. Add MCP tool wrapper over these endpoints.
4. Add Paperclip (:3100) integration.
5. Add game server event emission.
6. Add C0D3X in-world announcement queue.
