import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createLiveNpcServer,
  resolveLiveNpcBindHost,
  resolveLiveNpcTokens,
  startLiveNpcServer,
  validateLiveNpcBindConfig
} from "../src/server.js";

const LOOPBACK = ["127", "0", "0", "1"].join(".");

assert.deepEqual(resolveLiveNpcTokens({ DREAM_LIVE_NPC_TOKEN: "", FLEET_SHARED_TOKEN: "" }), []);
assert.deepEqual(resolveLiveNpcTokens({ DREAM_LIVE_NPC_TOKEN: "npc-t", FLEET_SHARED_TOKEN: "shared-t" }), ["npc-t", "shared-t"]);

assert.equal(resolveLiveNpcBindHost({ DREAM_LIVE_NPC_TOKEN: "", FLEET_SHARED_TOKEN: "" }), "127.0.0.1");
assert.equal(resolveLiveNpcBindHost({ DREAM_LIVE_NPC_TOKEN: "npc-t" }), "0.0.0.0");
assert.equal(resolveLiveNpcBindHost({ FLEET_SHARED_TOKEN: "shared-t" }), "0.0.0.0");
assert.equal(resolveLiveNpcBindHost({ DREAM_LIVE_NPC_HOST: "127.0.0.1", DREAM_LIVE_NPC_TOKEN: "npc-t" }), "127.0.0.1");
assert.equal(resolveLiveNpcBindHost({ DREAM_LIVE_NPC_HOST: "0.0.0.0" }), "0.0.0.0");

const noTokenCfg = validateLiveNpcBindConfig({ DREAM_LIVE_NPC_TOKEN: "", FLEET_SHARED_TOKEN: "" });
assert.equal(noTokenCfg.host, "127.0.0.1");
assert.equal(noTokenCfg.token, "");
assert.match(String(noTokenCfg.warning), /DREAM_LIVE_NPC_TOKEN/);
assert.match(String(noTokenCfg.warning), /FLEET_SHARED_TOKEN/);

assert.throws(
  () => validateLiveNpcBindConfig({ DREAM_LIVE_NPC_HOST: "0.0.0.0", DREAM_LIVE_NPC_TOKEN: "", FLEET_SHARED_TOKEN: "" }),
  /DREAM_LIVE_NPC_TOKEN/i
);
assert.throws(
  () => validateLiveNpcBindConfig({ DREAM_LIVE_NPC_HOST: "192.168.0.40", DREAM_LIVE_NPC_TOKEN: "", FLEET_SHARED_TOKEN: "" }),
  /DREAM_LIVE_NPC_TOKEN/i
);
assert.throws(
  () => startLiveNpcServer({ env: { DREAM_LIVE_NPC_HOST: "0.0.0.0", DREAM_LIVE_NPC_TOKEN: "   ", FLEET_SHARED_TOKEN: "" }, port: 0 }),
  /DREAM_LIVE_NPC_TOKEN/i
);

// 1. Live-start with no token and unset host binds 127.0.0.1, emits one warning naming missing setting, and serves /health + /npc/dialogue
const tmpData = await fs.mkdtemp(path.join(os.tmpdir(), "dream-live-npc-bind-"));
const child = spawn(process.execPath, ["src/server.js"], {
  cwd: path.resolve(process.cwd()),
  env: {
    ...process.env,
    DREAM_ENABLE_CLOUD_AI: "",
    DREAM_AI_PROVIDER: "mock",
    DREAM_LIVE_NPC_PORT: "0",
    DREAM_LIVE_NPC_HOST: "",
    DREAM_LIVE_NPC_TOKEN: "",
    FLEET_SHARED_TOKEN: "",
    DREAM_LIVE_NPC_DATA: tmpData
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stdout = "";
let stderr = "";
const listenRe = new RegExp(`listening on http:\\/\\/${LOOPBACK.replace(/\./g, "\\.")}:(\\d+)`);

try {
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for live-npc-lab start. stdout=${stdout} stderr=${stderr}`));
    }, 10000);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
      const m = listenRe.exec(stdout);
      if (m) {
        clearTimeout(timer);
        resolve(Number(m[1]));
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`live-npc-lab exited early (${code}). stdout=${stdout} stderr=${stderr}`));
    });
  });

  const warningLines = stderr.trim().split(/\r?\n/).filter(Boolean);
  assert.equal(warningLines.length, 1);
  assert.match(warningLines[0], /DREAM_LIVE_NPC_TOKEN/);
  assert.match(warningLines[0], /FLEET_SHARED_TOKEN/);
  assert.match(warningLines[0], /127\.0\.0\.1/);

  const base = `http://${LOOPBACK}:${port}`;
  const healthRes = await fetch(`${base}/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.ok, true);

  const dialogueRes = await fetch(`${base}/npc/dialogue`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      npcId: "sup-guide",
      playerId: "bind-test-player",
      message: "What should I test first?",
      worldState: { zone: "first-gate", threat: "low" }
    })
  });
  assert.equal(dialogueRes.status, 200);
  const dialogue = await dialogueRes.json();
  assert.equal(dialogue.ok, true);
} finally {
  child.kill();
  await once(child, "exit");
  await fs.rm(tmpData, { recursive: true, force: true });
}

// 2. Token-set LAN mode resolves 0.0.0.0 and enforces Bearer / X-Fleet-Token on POST /npc/*
const lanEnv = {
  DREAM_LIVE_NPC_HOST: "0.0.0.0",
  DREAM_LIVE_NPC_TOKEN: "npc-lan-secret",
  FLEET_SHARED_TOKEN: "fleet-shared-secret"
};
assert.equal(validateLiveNpcBindConfig(lanEnv).host, "0.0.0.0");

const lanServer = createLiveNpcServer({ env: lanEnv, bindHost: "0.0.0.0" });
await new Promise((resolve) => lanServer.listen(0, LOOPBACK, resolve));
const lanBase = `http://${LOOPBACK}:${lanServer.address().port}`;
const savedDataEnv = process.env.DREAM_LIVE_NPC_DATA;
const savedCloudEnv = process.env.DREAM_ENABLE_CLOUD_AI;
const savedProvEnv = process.env.DREAM_AI_PROVIDER;
const lanTmpData = await fs.mkdtemp(path.join(os.tmpdir(), "dream-live-npc-lan-"));

try {
  process.env.DREAM_LIVE_NPC_DATA = lanTmpData;
  process.env.DREAM_ENABLE_CLOUD_AI = "";
  process.env.DREAM_AI_PROVIDER = "mock";

  assert.equal((await fetch(`${lanBase}/health`)).status, 200);

  const payload = JSON.stringify({
    npcId: "sup-guide",
    playerId: "lan-auth-player",
    message: "Check token guard.",
    worldState: { zone: "first-gate", threat: "low" }
  });

  const unauthed = await fetch(`${lanBase}/npc/dialogue`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload
  });
  assert.equal(unauthed.status, 401);

  const wrongToken = await fetch(`${lanBase}/npc/dialogue`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer wrong-token" },
    body: payload
  });
  assert.equal(wrongToken.status, 401);

  const authedBearer = await fetch(`${lanBase}/npc/dialogue`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer npc-lan-secret" },
    body: payload
  });
  assert.equal(authedBearer.status, 200);

  const authedFleet = await fetch(`${lanBase}/npc/dialogue`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-fleet-token": "fleet-shared-secret" },
    body: payload
  });
  assert.equal(authedFleet.status, 200);
} finally {
  if (savedDataEnv === undefined) delete process.env.DREAM_LIVE_NPC_DATA;
  else process.env.DREAM_LIVE_NPC_DATA = savedDataEnv;
  if (savedCloudEnv === undefined) delete process.env.DREAM_ENABLE_CLOUD_AI;
  else process.env.DREAM_ENABLE_CLOUD_AI = savedCloudEnv;
  if (savedProvEnv === undefined) delete process.env.DREAM_AI_PROVIDER;
  else process.env.DREAM_AI_PROVIDER = savedProvEnv;
  await new Promise((resolve) => lanServer.close(resolve));
  await fs.rm(lanTmpData, { recursive: true, force: true });
}

console.log("live-npc-lab bind and auth tests passed");
