import assert from "node:assert/strict";

import {
  createProviderCall,
  getProvider,
  listProviders,
  PROVIDER_NAMES
} from "../src/providers.js";

assert.deepEqual(Object.keys(PROVIDER_NAMES), ["mock", "openai", "1min-ai", "ollama-local"]);
assert.deepEqual(listProviders(), [
  { name: "mock", enabled: true },
  { name: "openai", enabled: false },
  { name: "1min-ai", enabled: false },
  { name: "ollama-local", enabled: false }
]);

const mockCall = createProviderCall("mock");
const candidate = await mockCall({
  worldState: { zone: "first-gate" }
}, {
  provider: "mock",
  maxTokens: 200
});

assert.match(candidate.reply, /first-gate/);
assert.deepEqual(candidate.proposedActions.map((action) => action.type), ["suggest_hint"]);

for (const name of ["openai", "1min-ai", "ollama-local"]) {
  const provider = getProvider(name);
  assert.equal(provider.enabled, false);
  await assert.rejects(
    provider.generateDialogue({ context: {}, route: {} }),
    (error) => error.code === "PROVIDER_DISABLED" && error.provider === name
  );
}

assert.throws(
  () => getProvider("not-real"),
  (error) => error.code === "UNKNOWN_PROVIDER"
);

console.log("provider interface stubs passed");
