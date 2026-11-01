import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import {
  createOneMinAiProvider,
  getProvider,
  listProviders
} from "../src/providers.js";

const originalEnvironment = {
  DREAM_ENABLE_CLOUD_AI: process.env.DREAM_ENABLE_CLOUD_AI,
  DREAM_AI_PROVIDER: process.env.DREAM_AI_PROVIDER,
  DREAM_AI_TIMEOUT_MS: process.env.DREAM_AI_TIMEOUT_MS,
  DREAM_LIVE_NPC_DATA: process.env.DREAM_LIVE_NPC_DATA,
  ONEMINAI_API_KEY: process.env.ONEMINAI_API_KEY,
  NPC_1MINAI_API_URL: process.env.NPC_1MINAI_API_URL,
  NPC_1MINAI_MODEL: process.env.NPC_1MINAI_MODEL
};

function restoreEnvironment() {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function startOneMinStub({ delayMs = 0, response }) {
  let receivedBody = null;
  let receivedHeaders = null;
  const server = http.createServer(async (req, res) => {
    receivedHeaders = req.headers;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    receivedBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(response));
  });
  const port = await listen(server);

  return {
    url: `http://127.0.0.1:${port}/api/v1/oneai/chat`,
    close: () => close(server),
    receivedBody: () => receivedBody,
    receivedHeaders: () => receivedHeaders
  };
}

const baseInput = {
  npcId: "market-runner",
  playerId: "onemin-provider-player",
  message: "How does the market runner convenience bag work?",
  worldState: {
    zone: "first-gate",
    threat: "low"
  }
};

try {
  delete process.env.ONEMINAI_API_KEY;
  delete process.env.DREAM_ENABLE_CLOUD_AI;
  delete process.env.DREAM_AI_PROVIDER;

  assert.deepEqual(
    listProviders().find((provider) => provider.name === "1min-ai"),
    { name: "1min-ai", enabled: false }
  );
  await assert.rejects(
    getProvider("1min-ai").generateDialogue({ context: baseInput, route: { provider: "1min-ai" } }),
    (error) => error.code === "PROVIDER_DISABLED" && error.provider === "1min-ai"
  );

  const stub = await startOneMinStub({
    response: {
      aiRecord: {
        aiRecordDetail: {
          resultObject: [
            "The Market Runner carries convenience parcels between safe camps—never combat power."
          ]
        }
      },
      proposedActions: [
        { type: "suggest_hint", label: "Inspect the Market Runner ledger." },
        { type: "grant_combat_buff", label: "Forbidden action." }
      ]
    }
  });

  const provider = createOneMinAiProvider({
    apiKey: "test-1min-lifetime-token",
    url: stub.url,
    model: "gemini-2.5-flash"
  });
  assert.equal(provider.enabled, true);
  assert.equal(provider.model, "gemini-2.5-flash");

  const result = await provider.generateDialogue({
    context: {
      ...baseInput,
      recentMemory: ["Player visited First Gate camp."]
    }
  });

  assert.equal(
    result.reply,
    "The Market Runner carries convenience parcels between safe camps—never combat power."
  );
  assert.deepEqual(result.proposedActions, [
    { type: "suggest_hint", label: "Inspect the Market Runner ledger." }
  ]);
  assert.equal(stub.receivedBody().model, "gemini-2.5-flash");
  assert.equal(stub.receivedHeaders()["api-key"], "test-1min-lifetime-token");
  await stub.close();

  console.log("1min.AI cloud NPC provider behavior passed");
} finally {
  restoreEnvironment();
}
