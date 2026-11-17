import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { audit } from "./audit.js";
import { resolveDreamOpsTokens, route } from "./routes.js";
import { ensureStorage } from "./storage.js";
import { getAllowedNodeHosts, getServiceBindHost, getServicePort } from "../../../../ops/fleet/fleet-map.mjs";

export { resolveDreamOpsTokens };

export function resolveDreamOpsBindHost(env = process.env) {
  const explicit = String(env.DREAMOPS_HOST || "").trim();
  const allowedLanHosts = getAllowedNodeHosts();
  if (explicit === "127.0.0.1" || explicit === "0.0.0.0" || allowedLanHosts.includes(explicit)) {
    return explicit;
  }
  if (resolveDreamOpsTokens(env).length === 0) {
    return "127.0.0.1";
  }
  return getServiceBindHost("dreamops-bridge");
}

// 9133, not 9119. Hermes owns 9119 and is listening on it in normal operation;
// a clean checkout defaulting to 9119 either fails to bind or silently takes
// Hermes' port while Hermes happens to be down. Joshua moved the bridge to 9133
// on 2026-08-25. Do not move it back.
export function resolveDreamOpsPort(env = process.env) {
  const raw = String(env.DREAMOPS_PORT || env.PORT || "").trim();
  if (raw === "0") return 0;
  return getServicePort("dreamops-bridge", raw);
}

export function validateDreamOpsBindConfig(env = process.env) {
  const host = resolveDreamOpsBindHost(env);
  const tokens = resolveDreamOpsTokens(env);
  const token = tokens[0] || "";
  if (host !== "127.0.0.1" && !token) {
    throw new Error(
      `Refusing to start dreamops-bridge on ${host} without DREAMOPS_TOKEN or FLEET_SHARED_TOKEN: set a non-empty DREAMOPS_TOKEN / FLEET_SHARED_TOKEN or bind to 127.0.0.1.`
    );
  }
  const explicit = String(env.DREAMOPS_HOST || "").trim();
  const configuredPort = getServicePort("dreamops-bridge", env.DREAMOPS_PORT || env.PORT);
  const warning =
    !token && explicit !== "127.0.0.1"
      ? `[dreamops-bridge] WARNING: DREAMOPS_TOKEN or FLEET_SHARED_TOKEN is not set; binding 127.0.0.1 on port ${configuredPort} (this machine only).`
      : null;
  return { host, token, warning };
}

export function createDreamOpsServer(options = {}) {
  const bindHost = options.bindHost || "127.0.0.1";
  const env = options.env || process.env;
  return createServer(async (req, res) => {
    try {
      await route(req, res, { bindHost, env });
    } catch (error) {
      res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        error: "internal_error",
        message: error instanceof Error ? error.message : String(error)
      }, null, 2));
    }
  });
}

export async function startDreamOpsServer(opts = {}) {
  const env = opts.env || process.env;
  const { host, warning } = validateDreamOpsBindConfig(env);
  if (warning) {
    console.warn(warning);
  }
  const port = opts.port !== undefined ? opts.port : resolveDreamOpsPort(env);
  await ensureStorage();
  await audit("service.start", "dreamops-bridge", { host, port });

  const server = createDreamOpsServer({ bindHost: host, env });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const addr = server.address();
      const actualPort = addr && typeof addr === "object" ? addr.port : port;
      console.log(`[dreamops-bridge] listening on http://${host}:${actualPort}`);
      resolve();
    });
  });
  return server;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  startDreamOpsServer().catch((error) => {
    console.error(`[dreamops-bridge] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
