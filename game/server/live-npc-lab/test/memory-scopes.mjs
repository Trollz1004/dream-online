import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dream-memory-scopes-"));
process.env.DREAM_ENABLE_CLOUD_AI = "";
process.env.DREAM_AI_PROVIDER = "mock";
process.env.DREAM_LIVE_NPC_DATA = tempRoot;

const { handleDialogue, handleWorldEvent, readMemory } = await import("../src/npcEngine.js");

await handleDialogue({
  npcId: "sup-guide",
  playerId: "scope-player-a",
  message: "Remember this route.",
  worldState: {
    zone: "first-gate",
    threat: "low"
  }
});

await handleDialogue({
  npcId: "camp-guard",
  playerId: "scope-player-b",
  message: "Watch the danger road.",
  worldState: {
    zone: "danger-road",
    threat: "medium"
  }
});

await handleWorldEvent({
  eventType: "gate_flicker",
  actorId: "system",
  zone: "first-gate",
  payload: {
    result: "memory_scope_check"
  }
});

const playerMemory = await readMemory("scope-player-a");
assert.equal(playerMemory.ok, true);
assert.equal(playerMemory.count, 1);
assert.equal(playerMemory.rows[0].context.playerId, "scope-player-a");
assert.deepEqual(playerMemory.rows[0].scopeMatches, [
  {
    scope: "player",
    subjectId: "scope-player-a"
  }
]);

const npcMemory = await readMemory({
  npcId: "camp-guard",
  scopes: ["npc"]
});
assert.equal(npcMemory.count, 1);
assert.equal(npcMemory.rows[0].context.npcId, "camp-guard");
assert.equal(npcMemory.rows[0].scopeMatches[0].scope, "npc");

const zoneMemory = await readMemory({
  zone: "first-gate",
  scopes: ["zone"]
});
assert.equal(zoneMemory.count, 2);
assert.deepEqual(
  zoneMemory.rows.map((row) => row.source),
  ["npc-memory", "world-events"]
);

const globalEventMemory = await readMemory({
  eventType: "gate_flicker",
  scopes: ["global_event"]
});
assert.equal(globalEventMemory.count, 1);
assert.equal(globalEventMemory.rows[0].source, "world-events");
assert.equal(globalEventMemory.rows[0].eventType, "gate_flicker");

console.log("memory scope retrieval passed");
