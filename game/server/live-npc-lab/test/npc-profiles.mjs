import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const labRoot = process.cwd();
const profilePath = path.join(labRoot, "data", "npc-profiles.json");
const raw = await fs.readFile(profilePath, "utf8");
const profileSet = JSON.parse(raw);

assert.equal(profileSet.profileSetVersion, "0.1.0");
assert.equal(profileSet.project, "DREAM ONLINE");
assert.equal(profileSet.zoneId, "first-gate");
assert.equal(profileSet.rules.noSecrets, true);
assert.equal(profileSet.rules.noClassifiedPlotMaterial, true);
assert.equal(profileSet.rules.noCompetitorNameDrops, true);
assert.equal(profileSet.rules.proposalsOnly, true);
assert.ok(Array.isArray(profileSet.profiles));

const requiredIds = new Set([
  "sup-guide",
  "camp-guard",
  "market-runner",
  "field-gatherer",
  "c0d3x-rider"
]);
const requiredRoles = new Set([
  "guide",
  "guard",
  "merchant",
  "gatherer",
  "world_recovery"
]);
const allowedActionTypes = new Set([
  "suggest_hint",
  "suggest_marker",
  "suggest_event_pause",
  "suggest_quest_note",
  "suggest_safe_exit",
  "suggest_trade_warning",
  "suggest_repair_warning"
]);
const seenIds = new Set();
const seenRoles = new Set();

for (const profile of profileSet.profiles) {
  assert.equal(typeof profile.npcId, "string");
  assert.equal(seenIds.has(profile.npcId), false, `duplicate npcId: ${profile.npcId}`);
  seenIds.add(profile.npcId);
  seenRoles.add(profile.role);

  assert.equal(typeof profile.displayName, "string");
  assert.equal(typeof profile.firstPlayablePurpose, "string");
  assert.ok(profile.firstPlayablePurpose.length >= 20);
  assert.ok(Array.isArray(profile.memoryScope));
  assert.ok(profile.memoryScope.length >= 1);
  assert.ok(Array.isArray(profile.allowedActionTypes));
  assert.ok(profile.allowedActionTypes.length >= 1);

  for (const actionType of profile.allowedActionTypes) {
    assert.ok(allowedActionTypes.has(actionType), `unknown action type: ${actionType}`);
  }
}

for (const npcId of requiredIds) {
  assert.ok(seenIds.has(npcId), `missing required NPC profile: ${npcId}`);
}

for (const role of requiredRoles) {
  assert.ok(seenRoles.has(role), `missing required NPC role: ${role}`);
}

console.log(`npc profile registry ok: ${seenIds.size} profiles`);
