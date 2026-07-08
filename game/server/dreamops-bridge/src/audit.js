import { appendFile, mkdir } from "node:fs/promises";
import { auditLogPath, nowIso } from "./storage.js";

export async function audit(action, actor, detail) {
  await mkdir(auditLogPath().split(/[\\/]/).slice(0, -1).join("/"), { recursive: true });
  const entry = {
    ts: nowIso(),
    action,
    actor: actor || "dreamops-local",
    detail: detail || {}
  };
  await appendFile(auditLogPath(), JSON.stringify(entry) + "\n", "utf8");
  return entry;
}
