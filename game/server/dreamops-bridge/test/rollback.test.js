import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { route } from "../src/routes.js";
import {
  createDreamOpsServer,
  resolveDreamOpsBindHost,
  resolveDreamOpsTokens,
  startDreamOpsServer,
  validateDreamOpsBindConfig
} from "../src/server.js";
import { checkpointDir, ensureStorage, readJson } from "../src/storage.js";

let root, server, base;
const previousRoot = process.env.DREAM_ROOT;
before(async () => {
  root = await mkdtemp(join(tmpdir(), "dreamops-test-"));
  process.env.DREAM_ROOT = root;
  server = createServer((req, res) => route(req, res).catch(() => {
    res.writeHead(500).end();
  }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (previousRoot === undefined) delete process.env.DREAM_ROOT;
  else process.env.DREAM_ROOT = previousRoot;
  if (root) await rm(root, { recursive: true, force: true });
});
beforeEach(async () => {
  await rm(join(root, "game"), { recursive: true, force: true });
  await ensureStorage();
});
async function plan(body = {}) {
  const response = await fetch(`${base}/rollback/plan`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}
async function checkpoint(id, verified, createdAt) {
  await writeFile(join(checkpointDir(), `${id}.json`), JSON.stringify({ id, verified, createdAt }));
}

test("fresh storage makes no all-green recovery claim", async () => {
  assert.equal((await readJson("world_state.json")).lastGreenCheckpoint, null);
  const seed = JSON.parse(await readFile(join(checkpointDir(), "checkpoint-0001.json")));
  assert.equal(seed.verified, false);
});
test("seed-only storage cannot produce a rollback plan", async () => {
  const result = await plan();
  assert.equal(result.status, 409);
  assert.equal(result.body.error, "no_verified_checkpoint");
});
test("default plan skips a newer failed checkpoint", async () => {
  await checkpoint("green", true, "2026-11-10T00:00:00Z");
  await checkpoint("failed", false, "2099-01-01T00:00:00Z");
  const result = await plan();
  assert.equal(result.status, 200);
  assert.equal(result.body.plan.targetCheckpoint.id, "green");
  assert.equal(result.body.plan.destructiveExecutionAvailable, false);
  const audit = JSON.parse((await readFile(join(root, "game/server/audit.log"), "utf8")).trim());
  assert.equal(audit.detail.checkpointId, "green");
});
test("explicit unverified target cannot bypass selection", async () => {
  await checkpoint("failed", false, "2099-01-01T00:00:00Z");
  const result = await plan({ checkpointId: "failed" });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, "checkpoint_not_verified");
});
test("legacy seed marked verified is still ineligible", async () => {
  await writeFile(join(checkpointDir(), "checkpoint-0001.json"), JSON.stringify({
    id: "checkpoint-0001", verified: true,
    notes: "Seed checkpoint only. Not a production rollback artifact."
  }));
  assert.equal((await plan({ checkpointId: "checkpoint-0001" })).status, 409);
});
test("unknown explicit target remains not found", async () => {
  assert.equal((await plan({ checkpointId: "missing" })).status, 404);
});

test("no-token defaults bind to 127.0.0.1 with warning, explicit LAN without token refuses to start, and LAN mode guards POST routes", async () => {
  const loopback = ["127", "0", "0", "1"].join(".");
  assert.deepEqual(resolveDreamOpsTokens({ DREAMOPS_TOKEN: "", FLEET_SHARED_TOKEN: "" }), []);
  assert.equal(resolveDreamOpsBindHost({ DREAMOPS_TOKEN: "", FLEET_SHARED_TOKEN: "" }), "127.0.0.1");
  assert.equal(resolveDreamOpsBindHost({ DREAMOPS_TOKEN: "ops-secret" }), "0.0.0.0");
  assert.equal(resolveDreamOpsBindHost({ FLEET_SHARED_TOKEN: "fleet-secret" }), "0.0.0.0");
  assert.equal(resolveDreamOpsBindHost({ DREAMOPS_HOST: "127.0.0.1", DREAMOPS_TOKEN: "ops-secret" }), "127.0.0.1");
  assert.equal(resolveDreamOpsBindHost({ DREAMOPS_HOST: "0.0.0.0" }), "0.0.0.0");

  const noTokenCfg = validateDreamOpsBindConfig({ DREAMOPS_TOKEN: "", FLEET_SHARED_TOKEN: "" });
  assert.equal(noTokenCfg.host, "127.0.0.1");
  assert.match(String(noTokenCfg.warning), /DREAMOPS_TOKEN/);
  assert.match(String(noTokenCfg.warning), /FLEET_SHARED_TOKEN/);

  assert.throws(
    () => validateDreamOpsBindConfig({ DREAMOPS_HOST: "0.0.0.0", DREAMOPS_TOKEN: "", FLEET_SHARED_TOKEN: "" }),
    /DREAMOPS_TOKEN/i
  );
  assert.throws(
    () => validateDreamOpsBindConfig({ DREAMOPS_HOST: "192.168.0.40", DREAMOPS_TOKEN: "", FLEET_SHARED_TOKEN: "" }),
    /DREAMOPS_TOKEN/i
  );
  await assert.rejects(
    () => startDreamOpsServer({ env: { DREAMOPS_HOST: "0.0.0.0", DREAMOPS_TOKEN: "   ", FLEET_SHARED_TOKEN: "" }, port: 0 }),
    /DREAMOPS_TOKEN/i
  );

  // Live-start without token binds 127.0.0.1, emits one warning naming missing setting, and serves health + POST
  const liveRoot = await mkdtemp(join(tmpdir(), "dreamops-live-"));
  const serverPath = fileURLToPath(new URL("../src/server.js", import.meta.url));
  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      DREAM_ROOT: liveRoot,
      DREAMOPS_PORT: "0",
      DREAMOPS_HOST: "",
      DREAMOPS_TOKEN: "",
      FLEET_SHARED_TOKEN: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  const listenRe = new RegExp(`listening on http:\\/\\/${loopback.replace(/\./g, "\\.")}:(\\d+)`);
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for dreamops-bridge: stdout=${stdout} stderr=${stderr}`)), 10000);
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
        const m = listenRe.exec(stdout);
        if (m) {
          clearTimeout(timer);
          resolve(Number(m[1]));
        }
      });
      child.stderr.on("data", (chunk) => { stderr += String(chunk); });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`dreamops-bridge exited early (${code}): stdout=${stdout} stderr=${stderr}`));
      });
    });

    const warningLines = stderr.trim().split(/\r?\n/).filter(Boolean);
    assert.equal(warningLines.length, 2);
    assert.match(warningLines[0], /DREAMOPS_TOKEN/);
    assert.match(warningLines[0], /FLEET_SHARED_TOKEN/);
    assert.match(warningLines[0], /127\.0\.0\.1/);
    assert.match(warningLines[1], /\[dreamops-bridge\] Startup env check: missing required setting names: DREAMOPS_TOKEN/);

    const liveBase = `http://${loopback}:${port}`;
    const healthRes = await fetch(`${liveBase}/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.service, "dreamops-bridge");
    assert.equal(health.localOnly, true);
    assert.deepEqual(health.missingEnv, ["DREAMOPS_TOKEN"]);

    const postRes = await fetch(`${liveBase}/hotfix/propose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "loopback test" })
    });
    assert.equal(postRes.status, 200);
  } finally {
    child.kill();
    await once(child, "exit");
    await rm(liveRoot, { recursive: true, force: true });
  }

  // Token-set LAN mode sets localOnly=false and requires Bearer / X-Fleet-Token on POST routes
  const lanEnv = { DREAMOPS_HOST: "0.0.0.0", DREAMOPS_TOKEN: "dreamops-lan-secret", FLEET_SHARED_TOKEN: "fleet-shared-secret" };
  assert.equal(validateDreamOpsBindConfig(lanEnv).host, "0.0.0.0");
  const lanServer = createDreamOpsServer({ bindHost: "0.0.0.0", env: lanEnv });
  await new Promise((resolve) => lanServer.listen(0, loopback, resolve));
  try {
    const lanBase = `http://${loopback}:${lanServer.address().port}`;
    const lanHealthRes = await fetch(`${lanBase}/health`);
    const lanHealthRaw = await lanHealthRes.text();
    assert.equal(lanHealthRaw.includes("dreamops-lan-secret"), false);
    assert.equal(lanHealthRaw.includes("fleet-shared-secret"), false);
    const lanHealth = JSON.parse(lanHealthRaw);
    assert.equal(lanHealth.service, "dreamops-bridge");
    assert.equal(lanHealth.localOnly, false);
    assert.deepEqual(lanHealth.missingEnv, []);

    const { readFileSync, existsSync } = await import("node:fs");
    const manifestUrl = new URL("../env.required.json", import.meta.url);
    assert.equal(existsSync(manifestUrl), true, "game/server/dreamops-bridge/env.required.json must exist");
    const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));
    assert.equal(manifest.service, "dreamops-bridge");
    assert.deepEqual(manifest.required, ["DREAMOPS_TOKEN"]);
    assert.deepEqual(manifest.alternatives, { DREAMOPS_TOKEN: ["FLEET_SHARED_TOKEN"] });

    assert.equal((await fetch(`${lanBase}/hotfix/propose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    })).status, 401);

    assert.equal((await fetch(`${lanBase}/hotfix/propose`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer wrong-token" },
      body: "{}"
    })).status, 401);

    assert.equal((await fetch(`${lanBase}/hotfix/propose`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer dreamops-lan-secret" },
      body: "{}"
    })).status, 200);

    assert.equal((await fetch(`${lanBase}/hotfix/propose`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-fleet-token": "fleet-shared-secret" },
      body: "{}"
    })).status, 200);
  } finally {
    await new Promise((resolve) => lanServer.close(resolve));
  }
});
