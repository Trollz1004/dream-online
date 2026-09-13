import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import {
  createHermesWebhookProvider,
  getProvider,
  listProviders
} from "../src/providers.js";

const originalEnvironment = {
  DREAM_ENABLE_CLOUD_AI: process.env.DREAM_ENABLE_CLOUD_AI,
  DREAM_AI_PROVIDER: process.env.DREAM_AI_PROVIDER,
  DREAM_AI_TIMEOUT_MS: process.env.DREAM_AI_TIMEOUT_MS,
  DREAM_LIVE_NPC_DATA: process.env.DREAM_LIVE_NPC_DATA,
  NPC_HERMES_WEBHOOK_URL: process.env.NPC_HERMES_WEBHOOK_URL
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

async function startWebhookStub({ delayMs = 0, response }) {
  let received = null;
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(response));
  });
  const port = await listen(server);

  return {
    url: `http://127.0.0.1:${port}/hermes`,
    close: () => close(server),
    received: () => received
  };
}

async function waitForServer(url) {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw lastError || new Error("local dialogue server did not become ready");
}

async function startLabServer(dataDir) {
  const portProbe = http.createServer();
  const port = await listen(portProbe);
  await close(portProbe);
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: path.resolve(process.cwd()),
    env: {
      ...process.env,
      DREAM_ENABLE_CLOUD_AI: "1",
      DREAM_AI_PROVIDER: "hermes",
      DREAM_LIVE_NPC_PORT: String(port),
      DREAM_LIVE_NPC_DATA: dataDir,
      NPC_HERMES_WEBHOOK_URL: ""
    },
    stdio: "ignore"
  });
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return {
    url,
    async stop() {
      child.kill();
      await once(child, "exit");
    }
  };
}

const baseInput = {
  npcId: "sup-guide",
  playerId: "hermes-provider-player",
  message: "Guide the next visible step.",
  worldState: {
    zone: "first-gate",
    threat: "low"
  }
};

try {
  delete process.env.NPC_HERMES_WEBHOOK_URL;
  delete process.env.DREAM_ENABLE_CLOUD_AI;
  delete process.env.DREAM_AI_PROVIDER;

  assert.deepEqual(
    listProviders().find((provider) => provider.name === "hermes"),
    { name: "hermes", enabled: false }
  );
  await assert.rejects(
    getProvider("hermes").generateDialogue({ context: baseInput, route: { provider: "hermes" } }),
    (error) => error.code === "PROVIDER_DISABLED" && error.provider === "hermes"
  );

  process.env.DREAM_ENABLE_CLOUD_AI = "1";
  process.env.DREAM_AI_PROVIDER = "hermes";
  process.env.DREAM_AI_TIMEOUT_MS = "3000";
  process.env.DREAM_LIVE_NPC_DATA = await fs.mkdtemp(path.join(os.tmpdir(), "dream-hermes-provider-"));

  const { handleDialogue, readAiFailures } = await import("../src/npcEngine.js");
  const disabled = await handleDialogue(baseInput, {
    providerCall: (context, route) => getProvider("hermes").generateDialogue({ context, route })
  });
  assert.equal(disabled.degraded, true);
  assert.equal(disabled.failureMode, "ai_provider_outage");
  assert.equal(disabled.reply, "Local guide is active. Test movement, hit confirm, then the world event.");

  const webhook = await startWebhookStub({
    response: {
      reply: "x".repeat(450),
      proposedActions: [
        { type: "suggest_hint", label: "Check the marker." },
        { type: "execute_inventory_change", label: "Do not run this." }
      ]
    }
  });
  const provider = createHermesWebhookProvider({ url: webhook.url });
  const candidate = await provider.generateDialogue({
    context: {
      ...baseInput,
      recentMemory: ["Player checked the marker."]
    },
    route: { provider: "hermes" }
  });

  assert.deepEqual(webhook.received(), {
    npcId: "sup-guide",
    playerId: "hermes-provider-player",
    zone: "first-gate",
    recentMemory: ["Player checked the marker."],
    prompt: "Guide the next visible step."
  });
  assert.equal(candidate.reply.length, 400);
  assert.deepEqual(candidate.proposedActions, [
    { type: "suggest_hint", label: "Check the marker." }
  ]);
  await webhook.close();

  const slowWebhook = await startWebhookStub({
    delayMs: 3100,
    response: { reply: "Late reply.", proposedActions: [] }
  });
  const startedAt = Date.now();
  const timedOut = await handleDialogue(baseInput, {
    providerCall: (context, route) => createHermesWebhookProvider({ url: slowWebhook.url })
      .generateDialogue({ context, route })
  });
  const elapsedMs = Date.now() - startedAt;

  assert.equal(timedOut.degraded, true);
  assert.equal(timedOut.failureMode, "ai_slow_response");
  assert.equal(timedOut.failure.timeoutMs, 3000);
  assert.ok(elapsedMs < 3000, `provider timeout exceeded the 3000 ms budget: ${elapsedMs} ms`);
  await slowWebhook.close();

  const failures = await readAiFailures("hermes-provider-player");
  assert.equal(failures.count, 2);
  assert.deepEqual(failures.rows.map((row) => row.kind), ["ai_provider_outage", "ai_slow_response"]);
  for (const row of failures.rows) {
    assert.equal("reply" in row, false);
    assert.equal("message" in row, false);
    assert.equal("prompt" in row, false);
  }

  const endpointDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "dream-hermes-endpoint-"));
  const lab = await startLabServer(endpointDataDir);
  try {
    const response = await fetch(`${lab.url}/npc/dialogue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseInput)
    });
    const dialogue = await response.json();
    assert.equal(response.status, 200);
    assert.equal(dialogue.degraded, true);
    assert.equal(dialogue.reply, "Local guide is active. Test movement, hit confirm, then the world event.");
  } finally {
    await lab.stop();
  }

  console.log("Hermes webhook provider behavior passed");
} finally {
  restoreEnvironment();
}
