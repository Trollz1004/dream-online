import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const labRoot = process.cwd();
const dataDir = path.join(labRoot, "data");
const indexPath = path.join(dataDir, "schema-index.json");

function normalizeRepoPath(repoPath) {
  return repoPath.replaceAll("\\", "/");
}

function pathFromRepoRoot(repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  const prefix = "game/server/live-npc-lab/";

  assert.ok(
    normalized.startsWith(prefix),
    `contract path must stay under ${prefix}: ${repoPath}`
  );

  return path.join(labRoot, normalized.slice(prefix.length));
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

const index = await readJson(indexPath);

assert.equal(index.schemaIndexVersion, "0.1.0");
assert.equal(index.project, "DREAM ONLINE");
assert.ok(Array.isArray(index.contracts));
assert.ok(index.contracts.length >= 1);
assert.equal(index.rules.noSecrets, true);
assert.equal(index.rules.noClassifiedPlotMaterial, true);
assert.equal(index.rules.noCompetitorNameDrops, true);

const ids = new Set();

for (const contract of index.contracts) {
  assert.equal(typeof contract.id, "string");
  assert.equal(typeof contract.path, "string");
  assert.equal(typeof contract.domain, "string");
  assert.ok(Array.isArray(contract.covers));
  assert.ok(contract.covers.length >= 1);
  assert.equal(ids.has(contract.id), false, `duplicate contract id: ${contract.id}`);
  ids.add(contract.id);

  const fullPath = pathFromRepoRoot(contract.path);
  const parsed = await readJson(fullPath);
  assert.ok(parsed, `contract JSON must parse: ${contract.path}`);
}

console.log(`contract index ok: ${ids.size} contracts`);
