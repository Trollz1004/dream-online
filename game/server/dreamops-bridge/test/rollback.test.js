import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { route } from "../src/routes.js";
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
