import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dream-lore-retrieval-"));
process.env.DREAM_ENABLE_CLOUD_AI = "";
process.env.DREAM_AI_PROVIDER = "mock";
process.env.DREAM_LIVE_NPC_DATA = tempRoot;

await fs.writeFile(
  path.join(tempRoot, "lore-snippets.json"),
  JSON.stringify({
    version: "test",
    snippets: [
      {
        snippetId: "test-low-road",
        title: "Low Road",
        zoneId: "first-gate",
        tags: ["low-road", "combat", "stamina"],
        text: "The Low Road teaches readable enemy tells and stamina discipline."
      },
      {
        snippetId: "test-market",
        title: "Market Yard",
        zoneId: "market-yard",
        tags: ["market", "trade"],
        text: "Market Yard is not part of this route."
      }
    ]
  }, null, 2),
  "utf8"
);

const { handleDialogue, readMemory, retrieveLoreSnippets } = await import("../src/npcEngine.js");

const context = {
  npcId: "sup-guide",
  playerId: "lore-player",
  message: "Guide me toward low-road combat without wasting stamina.",
  worldState: {
    zone: "first-gate",
    threat: "low"
  }
};

const snippets = await retrieveLoreSnippets(context);
assert.equal(snippets.length, 1);
assert.equal(snippets[0].snippetId, "test-low-road");

const dialogue = await handleDialogue(context);
assert.equal(dialogue.ok, true);
assert.equal(dialogue.provider, "mock");
assert.equal(dialogue.loreSnippets.length, 1);
assert.match(dialogue.reply, /Low Road/);
assert.match(dialogue.reply, /stamina discipline/);

const memory = await readMemory("lore-player");
assert.equal(memory.count, 1);
assert.deepEqual(memory.rows[0].loreSnippetIds, ["test-low-road"]);

console.log("local lore retrieval passed");
