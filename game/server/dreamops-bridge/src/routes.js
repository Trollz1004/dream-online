import { audit } from "./audit.js";
import { dreamRoot, listCheckpoints, readJson, writeJson } from "./storage.js";

function ok(res, body, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

function notFound(res) {
  ok(res, { error: "not_found" }, 404);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function scanEconomy(snapshot) {
  const warnings = [];
  const needs = snapshot.currency?.NEEDs || {};
  if ((needs.totalMinted || 0) < 0) warnings.push("NEEDs totalMinted is negative");
  if ((needs.totalSpent || 0) < 0) warnings.push("NEEDs totalSpent is negative");
  if ((needs.suspiciousDelta || 0) !== 0) warnings.push("NEEDs suspiciousDelta is non-zero");
  for (const key of ["duplicateWarnings", "negativeBalanceWarnings", "impossibleDurabilityWarnings"]) {
    const values = snapshot.items?.[key] || [];
    for (const value of values) warnings.push(`${key}: ${value}`);
  }
  return {
    status: warnings.length ? "review" : "ok",
    warningCount: warnings.length,
    warnings,
    snapshot
  };
}

export async function route(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  const path = url.pathname;

  if (req.method === "GET" && path === "/health") {
    return ok(res, {
      status: "ok",
      service: "dreamops-bridge",
      dreamRoot: dreamRoot(),
      localOnly: true
    });
  }

  if (req.method === "GET" && path === "/world/health") {
    const world = await readJson("world_state.json");
    const events = await readJson("events.json");
    const queue = await readJson("npc_memory_queue.json");
    return ok(res, {
      status: "ok",
      world,
      activeEventCount: events.events?.filter((event) => event.state === "active").length || 0,
      pausedEventCount: events.events?.filter((event) => event.state === "paused").length || 0,
      npcMemoryPending: queue.pending?.length || 0
    });
  }

  if (req.method === "GET" && path === "/events") {
    return ok(res, await readJson("events.json"));
  }

  const pauseMatch = path.match(/^\/events\/([^/]+)\/pause$/);
  if (req.method === "POST" && pauseMatch) {
    const id = decodeURIComponent(pauseMatch[1]);
    const body = await readBody(req);
    const data = await readJson("events.json");
    const event = data.events.find((item) => item.id === id);
    if (!event) return ok(res, { error: "event_not_found", id }, 404);
    event.previousState = event.state;
    event.state = "paused";
    event.pauseReason = body.reason || "manual prototype pause";
    event.pausedAt = new Date().toISOString();
    const saved = await writeJson("events.json", data);
    const auditEntry = await audit("event.pause", body.actor, { id, reason: event.pauseReason });
    return ok(res, { event, audit: auditEntry, savedAt: saved.updatedAt });
  }

  if (req.method === "GET" && path === "/economy/scan") {
    return ok(res, scanEconomy(await readJson("economy_snapshot.json")));
  }

  if (req.method === "GET" && path === "/npc/memory-queue") {
    return ok(res, await readJson("npc_memory_queue.json"));
  }

  if (req.method === "GET" && path === "/checkpoints") {
    return ok(res, { checkpoints: await listCheckpoints() });
  }

  if (req.method === "POST" && path === "/rollback/plan") {
    const body = await readBody(req);
    const checkpoints = await listCheckpoints();
    const target = body.checkpointId
      ? checkpoints.find((checkpoint) => checkpoint.id === body.checkpointId)
      : checkpoints[0];
    if (!target) return ok(res, { error: "checkpoint_not_found" }, 404);
    const plan = {
      mode: "dry-run-only",
      targetCheckpoint: target,
      requiredApprovals: ["founder-or-authorized-operator"],
      destructiveExecutionAvailable: false,
      steps: [
        "Pause affected world events.",
        "Snapshot current broken state for forensics.",
        "Verify target checkpoint hashes and schema version.",
        "Prepare player-facing C0D3X lore-safe notice.",
        "Execute only after explicit approval in a future implementation."
      ]
    };
    const auditEntry = await audit("rollback.plan", body.actor, { checkpointId: target.id });
    return ok(res, { plan, audit: auditEntry });
  }

  if (req.method === "POST" && path === "/hotfix/propose") {
    const body = await readBody(req);
    const proposal = {
      status: "proposal-only",
      title: body.title || "Untitled hotfix proposal",
      risk: body.risk || "unknown",
      summary: body.summary || "No summary provided.",
      files: body.files || [],
      requiredChecks: [
        "review affected system",
        "run relevant prototype checks",
        "record audit entry",
        "obtain approval before apply"
      ],
      applyAvailable: false
    };
    const auditEntry = await audit("hotfix.propose", body.actor, proposal);
    return ok(res, { proposal, audit: auditEntry });
  }

  return notFound(res);
}
