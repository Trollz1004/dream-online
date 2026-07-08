import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));

export function nowIso() {
  return new Date().toISOString();
}

export function dreamRoot() {
  return process.env.DREAM_ROOT || resolve(here, "../../../..");
}

export function serverDataDir() {
  return join(dreamRoot(), "game", "server");
}

export function checkpointDir() {
  return join(serverDataDir(), "checkpoints");
}

export function auditLogPath() {
  return join(serverDataDir(), "audit.log");
}

export function dataPath(name) {
  return join(serverDataDir(), name);
}

const defaults = {
  "world_state.json": {
    game: "DREAM ONLINE",
    status: "prototype",
    server: "local-dreamops",
    phase: "design-to-slice",
    activePlayers: 0,
    dreamShift: {
      state: "day",
      nextShiftHint: "manual prototype trigger later"
    },
    lastGreenCheckpoint: "checkpoint-0001",
    updatedAt: null
  },
  "events.json": {
    events: [
      {
        id: "dream-shift-smoke-test",
        name: "Dream Shift Smoke Test",
        state: "scheduled",
        risk: "low",
        notes: "Prototype event for day/night world-state transition."
      },
      {
        id: "fishing-hotspot-test",
        name: "Fishing Hotspot Test",
        state: "draft",
        risk: "low",
        notes: "Prototype AFK/active fishing economy loop."
      }
    ]
  },
  "npc_memory_queue.json": {
    pending: [],
    processing: [],
    completed: [],
    failed: []
  },
  "economy_snapshot.json": {
    currency: {
      NEEDs: {
        totalMinted: 0,
        totalSpent: 0,
        suspiciousDelta: 0
      }
    },
    items: {
      duplicateWarnings: [],
      negativeBalanceWarnings: [],
      impossibleDurabilityWarnings: []
    },
    updatedAt: null
  }
};

export async function ensureStorage() {
  await mkdir(serverDataDir(), { recursive: true });
  await mkdir(checkpointDir(), { recursive: true });

  for (const [name, value] of Object.entries(defaults)) {
    const path = dataPath(name);
    try {
      await readFile(path, "utf8");
    } catch {
      value.updatedAt = nowIso();
      await writeJson(name, value);
    }
  }

  const checkpointPath = join(checkpointDir(), "checkpoint-0001.json");
  try {
    await readFile(checkpointPath, "utf8");
  } catch {
    await writeFile(checkpointPath, JSON.stringify({
      id: "checkpoint-0001",
      label: "Initial all-green prototype checkpoint",
      createdAt: nowIso(),
      worldStateFile: "world_state.json",
      schemaVersion: "prototype-0.1",
      verified: true,
      notes: "Seed checkpoint only. Not a production rollback artifact."
    }, null, 2), "utf8");
  }
}

export async function readJson(name) {
  const raw = await readFile(dataPath(name), "utf8");
  return JSON.parse(raw);
}

export async function writeJson(name, data) {
  const next = { ...data, updatedAt: nowIso() };
  await writeFile(dataPath(name), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function listCheckpoints() {
  await mkdir(checkpointDir(), { recursive: true });
  const names = await readdir(checkpointDir());
  const checkpoints = [];
  for (const name of names.filter((x) => x.endsWith(".json"))) {
    const raw = await readFile(join(checkpointDir(), name), "utf8");
    checkpoints.push(JSON.parse(raw));
  }
  return checkpoints.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
