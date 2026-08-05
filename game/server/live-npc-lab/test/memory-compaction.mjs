import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dream-memory-compaction-"));
process.env.DREAM_ENABLE_CLOUD_AI = "";
process.env.DREAM_AI_PROVIDER = "mock";
process.env.DREAM_LIVE_NPC_DATA = tempRoot;

const { compactMemory, handleDialogue, readMemory } = await import("../src/npcEngine.js");

const playerId = "compaction-player";

for (let index = 0; index < 5; index += 1) {
  await handleDialogue({
    npcId: index % 2 === 0 ? "sup-guide" : "camp-guard",
    playerId,
    message: `Remember route step ${index + 1}.`,
    worldState: {
      zone: index < 3 ? "first-gate" : "danger-road",
      threat: index < 3 ? "low" : "medium"
    }
  });
}

const beforeRaw = await fs.readFile(path.join(tempRoot, "npc-memory.jsonl"), "utf8");
assert.equal(beforeRaw.trim().split(/\r?\n/).length, 5);

const compacted = await compactMemory({
  playerId,
  keepLatest: 2
});

assert.equal(compacted.ok, true);
assert.equal(compacted.summariesWritten, 1);
assert.equal(compacted.rawRowsPreserved, 5);
assert.equal(compacted.summaries[0].sourceCount, 3);
assert.deepEqual(compacted.summaries[0].npcIds, ["camp-guard", "sup-guide"]);
assert.deepEqual(compacted.summaries[0].zones, ["first-gate"]);

const afterRaw = await fs.readFile(path.join(tempRoot, "npc-memory.jsonl"), "utf8");
assert.equal(afterRaw, beforeRaw);

const summaryRaw = await fs.readFile(path.join(tempRoot, "npc-memory-summaries.jsonl"), "utf8");
const summaryRows = summaryRaw.trim().split(/\r?\n/).map((line) => JSON.parse(line));
assert.equal(summaryRows.length, 1);
assert.equal(summaryRows[0].kind, "dialogue_summary");
assert.equal(summaryRows[0].playerId, playerId);

const memory = await readMemory({
  playerId,
  scopes: ["player"]
});

assert.equal(memory.ok, true);
assert.equal(memory.count, 6);
assert.equal(memory.rows.filter((row) => row.source === "memory-summaries").length, 1);
assert.equal(memory.rows.filter((row) => row.source === "npc-memory").length, 5);

const repeated = await compactMemory({
  playerId,
  keepLatest: 2
});
assert.equal(repeated.summariesWritten, 0);

console.log("memory compaction passed");
