import assert from "node:assert/strict";
import { handleDialogue, handleWorldEvent, readMemory, selectProvider } from "../src/npcEngine.js";

process.env.DREAM_ENABLE_CLOUD_AI = "";
process.env.DREAM_AI_PROVIDER = "mock";

const route = selectProvider();
assert.equal(route.provider, "mock");

const dialogue = await handleDialogue({
  npcId: "sup-guide",
  playerId: "founder-smoke",
  message: "What should I test first?",
  worldState: {
    zone: "first-gate",
    threat: "low"
  }
});

assert.equal(dialogue.ok, true);
assert.equal(dialogue.provider, "mock");
assert.match(dialogue.reply, /movement feel/);

const event = await handleWorldEvent({
  eventType: "gate_opened",
  actorId: "founder-smoke",
  zone: "first-gate",
  payload: {
    note: "smoke test"
  }
});

assert.equal(event.ok, true);
assert.equal(event.recorded.eventType, "gate_opened");

const memory = await readMemory("founder-smoke");
assert.equal(memory.ok, true);
assert.ok(memory.count >= 1);

console.log("live-npc-lab smoke test passed");
