import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dream-cost-guards-"));
process.env.DREAM_ENABLE_CLOUD_AI = "1";
process.env.DREAM_AI_PROVIDER = "test-provider";
process.env.DREAM_AI_MAX_TOKENS = "300";
process.env.DREAM_AI_TIMEOUT_MS = "750";
process.env.DREAM_AI_MAX_CALLS_PER_PLAYER_PER_HOUR = "1";
process.env.DREAM_LIVE_NPC_DATA = tempRoot;

const { handleDialogue, readAiFailures, selectProvider } = await import("../src/npcEngine.js");

const route = selectProvider();
assert.equal(route.provider, "test-provider");
assert.equal(route.cloudEnabled, true);
assert.equal(route.maxTokens, 300);
assert.equal(route.timeoutMs, 750);
assert.equal(route.maxCallsPerPlayerPerHour, 1);
assert.equal(route.fallbackProvider, "mock");

const input = {
  npcId: "sup-guide",
  playerId: "cost-guard-player",
  message: "Guide the next step.",
  worldState: {
    zone: "first-gate",
    threat: "low"
  }
};

let providerCalls = 0;
const providerCall = () => {
  providerCalls += 1;
  return {
    reply: "Follow the gate marker, then test one local action.",
    proposedActions: [
      {
        type: "suggest_marker",
        label: "Moon Gate route"
      }
    ]
  };
};

const first = await handleDialogue(input, { providerCall });
assert.equal(first.ok, true);
assert.equal(first.provider, "test-provider");
assert.equal(first.degraded, undefined);
assert.equal(providerCalls, 1);

const second = await handleDialogue(input, { providerCall });
assert.equal(second.ok, true);
assert.equal(second.degraded, true);
assert.equal(second.failureMode, "ai_rate_limited");
assert.equal(second.fallbackLineId, "fallback_retry_later");
assert.equal(providerCalls, 1);

const failures = await readAiFailures("cost-guard-player");
assert.equal(failures.ok, true);
assert.equal(failures.count, 1);
assert.equal(failures.rows[0].kind, "ai_rate_limited");
assert.equal(failures.rows[0].rejectedReason, "player_hourly_call_budget_exceeded");
assert.equal("message" in failures.rows[0], false);
assert.equal("reply" in failures.rows[0], false);

console.log("AI cost guard policy passed");
