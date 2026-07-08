import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { handleDialogue, handleWorldEvent, readMemory } from "./npcEngine.js";

const HOST = process.env.DREAM_LIVE_NPC_HOST || "127.0.0.1";
const PORT = Number(process.env.DREAM_LIVE_NPC_PORT || 9127);
const CONTRACTS_DIR = path.resolve(process.cwd(), "data");

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

async function router(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        service: "dream-live-npc-lab",
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
      sendJson(res, 200, await readMemory(url.searchParams.get("playerId")));
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

const server = http.createServer((req, res) => {
  router(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`dream-live-npc-lab listening on http://${HOST}:${PORT}`);
});
