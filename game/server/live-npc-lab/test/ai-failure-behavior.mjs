import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dream-ai-failures-"));
process.env.DREAM_ENABLE_CLOUD_AI = "1";
process.env.DREAM_AI_PROVIDER = "test-provider";
process.env.DREAM_LIVE_NPC_DATA = tempRoot;

const { handleDialogue, readAiFailures } = await import("../src/npcEngine.js");

const baseInput = {
  npcId: "sup-guide",
  playerId: "failure-policy-player",
  message: "Guide this step.",
  worldState: {
    zone: "first-gate",
    threat: "low"
  }
};

const disabled = await handleDialogue(baseInput);
assert.equal(disabled.ok, true);
assert.equal(disabled.degraded, true);
assert.equal(disabled.failureMode, "ai_provider_outage");
assert.match(disabled.reply, /Local guide is active/);

const timedOut = await handleDialogue(baseInput, {
  timeoutMs: 5,
  providerCall: () => new Promise(() => {})
});
assert.equal(timedOut.ok, true);
assert.equal(timedOut.degraded, true);
assert.equal(timedOut.failureMode, "ai_slow_response");
assert.match(timedOut.reply, /Keep moving/);

const unsafe = await handleDialogue(baseInput, {
  providerCall: () => ({
    reply: "Take this marker.",
    proposedActions: [
      {
        type: "execute_inventory_change",
        label: "Grant item"
      }
    ]
  })
});
assert.equal(unsafe.ok, true);
assert.equal(unsafe.degraded, true);
assert.equal(unsafe.failureMode, "ai_unsafe_output");
assert.equal(unsafe.fallbackLineId, "fallback_safe_route");

const failures = await readAiFailures("failure-policy-player");
assert.equal(failures.ok, true);
assert.equal(failures.count, 3);
assert.deepEqual(
  failures.rows.map((row) => row.kind),
  ["ai_provider_outage", "ai_slow_response", "ai_unsafe_output"]
);

for (const row of failures.rows) {
  assert.equal(row.playerId, "failure-policy-player");
  assert.equal(row.npcId, "sup-guide");
  assert.equal(row.zone, "first-gate");
  assert.equal(row.providerRouteName, "test-provider");
  assert.equal(typeof row.fallbackLineId, "string");
  assert.equal("message" in row, false);
  assert.equal("reply" in row, false);
}

console.log("AI failure behavior policy passed");
