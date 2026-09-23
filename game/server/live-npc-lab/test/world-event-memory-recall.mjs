import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Before this test, GET /npc/memory had no way to answer "what did this NPC
// witness for this player": eventScopeMatches only ever filtered a world
// event by zone or eventType, never by who posted it or who witnessed it.
// The crowdfunding demo needs exactly that question answered for Mireth's
// memory to be real (game/godot/DreamSlice/scripts/npc_memory.gd posts a
// world event per witnessed moment and reads it back at night), so this
// checks the new world_event scope does what it was added for.

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dream-world-event-memory-"));
process.env.DREAM_ENABLE_CLOUD_AI = "";
process.env.DREAM_AI_PROVIDER = "mock";
process.env.DREAM_LIVE_NPC_DATA = tempRoot;

const { handleWorldEvent, readMemory } = await import("../src/npcEngine.js");

// What npc_memory.gd posts: eventType and zone at the top level (the shape
// handleWorldEvent already expected), playerId and witness inside payload.
await handleWorldEvent({
  eventType: "perfect_dodge",
  actorId: "player-001",
  zone: "first-gate",
  payload: {
    playerId: "player-001",
    witness: "mireth",
    zone: "first-gate",
    timeOfDay: "day",
    attackName: "Focus Beam"
  }
});

await handleWorldEvent({
  eventType: "heavy_hit",
  actorId: "player-001",
  zone: "first-gate",
  payload: {
    playerId: "player-001",
    witness: "mireth",
    zone: "first-gate",
    timeOfDay: "day",
    damage: 24
  }
});

// A second player's event, same zone, same witness: it must not leak into
// the first player's recall.
await handleWorldEvent({
  eventType: "perfect_dodge",
  actorId: "player-002",
  zone: "first-gate",
  payload: {
    playerId: "player-002",
    witness: "mireth",
    zone: "first-gate",
    timeOfDay: "day",
    attackName: "Focus Beam"
  }
});

const recalled = await readMemory({
  playerId: "player-001",
  npcId: "mireth",
  zone: "first-gate",
  scopes: ["world_event"]
});

assert.equal(recalled.ok, true);
assert.equal(recalled.count, 2, "only the events witnessed for this player should come back");
assert.deepEqual(recalled.rows.map((row) => row.eventType).sort(), ["heavy_hit", "perfect_dodge"]);
for (const row of recalled.rows) {
  assert.equal(row.source, "world-events");
  assert.equal(row.scopeMatches[0].scope, "world_event");
  assert.equal(row.payload.playerId, "player-001");
  assert.equal(row.payload.witness, "mireth");
}

const otherPlayer = await readMemory({
  playerId: "player-002",
  npcId: "mireth",
  zone: "first-gate",
  scopes: ["world_event"]
});
assert.equal(otherPlayer.count, 1);
assert.equal(otherPlayer.rows[0].eventType, "perfect_dodge");
assert.equal(otherPlayer.rows[0].payload.playerId, "player-002");

// Without the world_event scope explicitly requested, the old behaviour is
// unchanged: no world events come back on scopes that never asked for them.
const npcOnly = await readMemory({
  playerId: "player-001",
  npcId: "mireth",
  scopes: ["npc"]
});
assert.equal(npcOnly.count, 0);

console.log("world event memory recall passed");
