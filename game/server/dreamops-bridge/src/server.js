import { createServer } from "node:http";
import { audit } from "./audit.js";
import { route } from "./routes.js";
import { ensureStorage } from "./storage.js";
import { getServiceBindHost, getServicePort } from "../../../../ops/fleet/fleet-map.mjs";

const host = getServiceBindHost("dreamops-bridge", process.env.DREAMOPS_HOST);
// 9133, not 9119. Hermes owns 9119 and is listening on it in normal operation;
// a clean checkout defaulting to 9119 either fails to bind or silently takes
// Hermes' port while Hermes happens to be down. Joshua moved the bridge to 9133
// on 2026-08-25. Do not move it back.
const port = getServicePort("dreamops-bridge", process.env.DREAMOPS_PORT);

await ensureStorage();
await audit("service.start", "dreamops-bridge", { host, port });

const server = createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (error) {
    res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error)
    }, null, 2));
  }
});

server.listen(port, host, () => {
  console.log(`[dreamops-bridge] listening on http://${host}:${port}`);
});
