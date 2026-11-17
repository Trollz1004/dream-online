import { timingSafeEqual } from "node:crypto";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compactMemory, handleDialogue, handleWorldEvent, readAiFailures, readMemory } from "./npcEngine.js";
import { getAllowedNodeHosts, getServiceBindHost, getServicePort } from "../../../../ops/fleet/fleet-map.mjs";
import { checkRequiredEnv, logStartupEnvCheck } from "../../../../ops/agents/env-required.mjs";

const LIVE_NPC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_PORT = getServicePort("live-npc-lab");
const CONTRACTS_DIR = path.resolve(process.cwd(), "data");
const SAMPLES_DIR = path.join(CONTRACTS_DIR, "samples");
const NPC_PROFILES_FILE = "npc-profiles.json";
const ZONES_BY_ID = new Map([
  ["first-gate", "first-zone.seed.json"]
]);

export function resolveLiveNpcTokens(env = process.env) {
  const candidates = [
    String(env.DREAM_LIVE_NPC_TOKEN || "").trim(),
    String(env.FLEET_SHARED_TOKEN || "").trim()
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

export function resolveLiveNpcBindHost(env = process.env) {
  const explicit = String(env.DREAM_LIVE_NPC_HOST || "").trim();
  const allowedLanHosts = getAllowedNodeHosts();
  if (explicit === "127.0.0.1" || explicit === "0.0.0.0" || allowedLanHosts.includes(explicit)) {
    return explicit;
  }
  if (resolveLiveNpcTokens(env).length === 0) {
    return "127.0.0.1";
  }
  return getServiceBindHost("live-npc-lab");
}

export function resolveLiveNpcPort(env = process.env) {
  const raw = String(env.DREAM_LIVE_NPC_PORT || env.PORT || "").trim();
  if (raw === "0") return 0;
  return getServicePort("live-npc-lab", raw);
}

export function validateLiveNpcBindConfig(env = process.env) {
  const host = resolveLiveNpcBindHost(env);
  const tokens = resolveLiveNpcTokens(env);
  const token = tokens[0] || "";
  if (host !== "127.0.0.1" && !token) {
    throw new Error(
      `Refusing to start live-npc-lab on ${host} without DREAM_LIVE_NPC_TOKEN or FLEET_SHARED_TOKEN: set a non-empty DREAM_LIVE_NPC_TOKEN / FLEET_SHARED_TOKEN or bind to 127.0.0.1.`
    );
  }
  const explicit = String(env.DREAM_LIVE_NPC_HOST || "").trim();
  const configuredPort = getServicePort("live-npc-lab", env.DREAM_LIVE_NPC_PORT || env.PORT);
  const warning =
    !token && explicit !== "127.0.0.1"
      ? `[live-npc-lab] WARNING: DREAM_LIVE_NPC_TOKEN or FLEET_SHARED_TOKEN is not set; binding 127.0.0.1 on port ${configuredPort} (this machine only).`
      : null;
  return { host, token, warning };
}

function matchesAnyTokenTimingSafe(providedToken, expectedTokens) {
  if (!providedToken || !Array.isArray(expectedTokens) || expectedTokens.length === 0) {
    return false;
  }
  const providedBuf = Buffer.from(String(providedToken), "utf8");
  let matched = false;
  for (const expected of expectedTokens) {
    const expectedBuf = Buffer.from(String(expected), "utf8");
    if (expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf)) {
      matched = true;
    }
  }
  return matched;
}

function hasValidLiveNpcAuth(req, expectedTokens) {
  const authHeader = String(req.headers.authorization || "").trim();
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  const fleetHeader = String(req.headers["x-fleet-token"] || "").trim();
  const providedToken = match ? match[1] : fleetHeader;
  return matchesAnyTokenTimingSafe(providedToken, expectedTokens);
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function readContractJson(fileName) {
  const safeName = path.basename(fileName);
  const fullPath = path.join(CONTRACTS_DIR, safeName);
  const raw = await fs.readFile(fullPath, "utf8");
  return JSON.parse(raw);
}

async function readSchemaIndex() {
  return readContractJson("schema-index.json");
}

async function readNpcProfileSet() {
  return readContractJson(NPC_PROFILES_FILE);
}

async function readSampleJson(fileName) {
  const safeName = path.basename(fileName);
  const fullPath = path.join(SAMPLES_DIR, safeName);
  const raw = await fs.readFile(fullPath, "utf8");
  return JSON.parse(raw);
}

async function readSampleIndex() {
  return readSampleJson("sample-index.json");
}

async function router(req, res, options = {}) {
  const activeEnv = options.env || process.env;
  const bindHost = options.bindHost || resolveLiveNpcBindHost(activeEnv);
  const url = new URL(req.url || "/", `http://${req.headers.host || `${bindHost}:${DEFAULT_PORT}`}`);

  if (req.method === "POST" && url.pathname.startsWith("/npc/") && bindHost !== "127.0.0.1") {
    const expectedTokens = resolveLiveNpcTokens(activeEnv);
    if (!hasValidLiveNpcAuth(req, expectedTokens)) {
      sendJson(res, 401, {
        ok: false,
        error: "unauthorized",
        message: "Valid Authorization Bearer token or X-Fleet-Token required when bound beyond loopback."
      });
      return;
    }
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      const envCheck = checkRequiredEnv(LIVE_NPC_DIR, activeEnv);
      sendJson(res, 200, {
        ok: true,
        service: "dream-live-npc-lab",
        missingEnv: envCheck.missingEnv,
        ts: new Date().toISOString()
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/contracts") {
      sendJson(res, 200, await readSchemaIndex());
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/contracts/")) {
      const contractId = decodeURIComponent(url.pathname.slice("/contracts/".length));
      const index = await readSchemaIndex();
      const entry = index.contracts.find((contract) => contract.id === contractId);

      if (!entry) {
        sendJson(res, 404, {
          ok: false,
          error: "contract_not_found"
        });
        return;
      }

      sendJson(res, 200, await readContractJson(path.basename(entry.path)));
      return;
    }

    if (req.method === "GET" && url.pathname === "/samples") {
      sendJson(res, 200, await readSampleIndex());
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/samples/")) {
      const sampleId = decodeURIComponent(url.pathname.slice("/samples/".length));
      const index = await readSampleIndex();
      const fileName = index.samples.find((sampleFile) => {
        const id = sampleFile.replace(/\.sample\.json$/, "");
        return sampleFile === sampleId || id === sampleId;
      });

      if (!fileName) {
        sendJson(res, 404, {
          ok: false,
          error: "sample_not_found"
        });
        return;
      }

      sendJson(res, 200, await readSampleJson(fileName));
      return;
    }

    if (req.method === "GET" && url.pathname === "/world/zones") {
      sendJson(res, 200, {
        ok: true,
        zones: [...ZONES_BY_ID.keys()]
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/world/zones/")) {
      const zoneId = decodeURIComponent(url.pathname.slice("/world/zones/".length));
      const fileName = ZONES_BY_ID.get(zoneId);

      if (!fileName) {
        sendJson(res, 404, {
          ok: false,
          error: "zone_not_found"
        });
        return;
      }

      sendJson(res, 200, await readContractJson(fileName));
      return;
    }

    if (req.method === "GET" && url.pathname === "/npc/profiles") {
      sendJson(res, 200, await readNpcProfileSet());
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/npc/profiles/")) {
      const npcId = decodeURIComponent(url.pathname.slice("/npc/profiles/".length));
      const profileSet = await readNpcProfileSet();
      const profile = profileSet.profiles.find((entry) => entry.npcId === npcId);

      if (!profile) {
        sendJson(res, 404, {
          ok: false,
          error: "npc_profile_not_found"
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        profile
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/npc/dialogue") {
      const body = await readJson(req);
      sendJson(res, 200, await handleDialogue(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/npc/event") {
      const body = await readJson(req);
      sendJson(res, 200, await handleWorldEvent(body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/npc/memory") {
      sendJson(res, 200, await readMemory({
        playerId: url.searchParams.get("playerId"),
        npcId: url.searchParams.get("npcId"),
        zone: url.searchParams.get("zone"),
        eventType: url.searchParams.get("eventType"),
        scopes: url.searchParams.get("scopes")
      }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/npc/memory/compact") {
      const body = await readJson(req);
      sendJson(res, 200, await compactMemory(body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/npc/ai-failures") {
      sendJson(res, 200, await readAiFailures(url.searchParams.get("playerId")));
      return;
    }

    sendJson(res, 404, {
      ok: false,
      error: "not_found"
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: "server_error",
      message: error.message
    });
  }
}

export function createLiveNpcServer(options = {}) {
  return http.createServer((req, res) => {
    router(req, res, options);
  });
}

export function startLiveNpcServer(opts = {}) {
  const env = opts.env || process.env;
  const { host, warning } = validateLiveNpcBindConfig(env);
  if (warning) {
    console.warn(warning);
  }
  logStartupEnvCheck(LIVE_NPC_DIR, env);
  const port = opts.port !== undefined ? opts.port : resolveLiveNpcPort(env);
  const server = createLiveNpcServer({ env, bindHost: host });
  return server.listen(port, host, () => {
    const addr = server.address();
    const actualPort = addr && typeof addr === "object" ? addr.port : port;
    console.log(`dream-live-npc-lab listening on http://${host}:${actualPort}`);
    if (typeof opts.onListening === "function") opts.onListening();
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    startLiveNpcServer();
  } catch (error) {
    console.error(`[live-npc-lab] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
