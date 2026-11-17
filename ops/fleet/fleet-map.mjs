import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FLEET_MAP_PATH = path.join(__dirname, 'fleet-map.json');

const SERVICE_ALIASES = Object.freeze({
  'lead-gen': 'hermes-leadgen',
  leadgen: 'hermes-leadgen',
  'opsis-cut-and-reach-studio': 'opsis-studio',
  ollama: 'alienware-ollama',
  postgres: 't5500-postgres',
  redis: 't5500-redis',
  'obsidian-rest': 'alienware-obsidian-rest',
});

let cachedMap = null;
let cachedPath = null;

export function loadFleetMap(customPath = FLEET_MAP_PATH) {
  const resolved = path.resolve(customPath);
  if (cachedMap && cachedPath === resolved) {
    return cachedMap;
  }
  const raw = fs.readFileSync(resolved, 'utf8');
  const parsed = JSON.parse(raw);
  if (resolved === FLEET_MAP_PATH) {
    cachedMap = parsed;
    cachedPath = resolved;
  }
  return parsed;
}

export function getNode(nodeId, map = loadFleetMap()) {
  const key = String(nodeId || '').trim().toLowerCase();
  const node = map?.nodes?.[key];
  if (!node) {
    throw new Error(`Unknown fleet node "${nodeId}" in fleet-map.json`);
  }
  return node;
}

export function getNodeHost(nodeId, map = loadFleetMap()) {
  return getNode(nodeId, map).host;
}

export function getAllowedNodeHosts(map = loadFleetMap()) {
  const nodes = Object.values(map?.nodes || {});
  return nodes.map((n) => String(n.host).trim()).filter(Boolean);
}

export function getService(serviceIdOrPort, nodeId = null, map = loadFleetMap()) {
  const services = Array.isArray(map?.services) ? map.services : [];
  const normalizedNode = nodeId ? String(nodeId).trim().toLowerCase() : null;

  if (typeof serviceIdOrPort === 'number' || /^\d+$/.test(String(serviceIdOrPort))) {
    const portNum = Number(serviceIdOrPort);
    const match = services.find(
      (s) => s.port === portNum && (!normalizedNode || s.node === normalizedNode)
    );
    if (!match) {
      throw new Error(`Unknown fleet service on port ${portNum} in fleet-map.json`);
    }
    return match;
  }

  const rawId = String(serviceIdOrPort || '').trim().toLowerCase();
  const canonicalId = SERVICE_ALIASES[rawId] || rawId;
  const match = services.find(
    (s) =>
      (s.id.toLowerCase() === canonicalId || s.id.toLowerCase() === rawId) &&
      (!normalizedNode || s.node === normalizedNode)
  );
  if (!match) {
    throw new Error(`Unknown fleet service "${serviceIdOrPort}" in fleet-map.json`);
  }
  return match;
}

export function getServiceBindHost(serviceIdOrPort, envBindValue = '', map = loadFleetMap()) {
  const trimmed = String(envBindValue || '').trim();
  if (trimmed) return trimmed;
  const svc = getService(serviceIdOrPort, null, map);
  return svc.bind;
}

export function getServicePort(serviceIdOrPort, envPortValue = '', map = loadFleetMap()) {
  const n = Number(envPortValue);
  if (Number.isInteger(n) && n > 0) return n;
  const svc = getService(serviceIdOrPort, null, map);
  return svc.port;
}

export function getServiceUrl(serviceIdOrPort, pathOverride = '', map = loadFleetMap()) {
  const svc = getService(serviceIdOrPort, null, map);
  const rawSuffix = pathOverride ? String(pathOverride) : '';
  const suffix = rawSuffix && !rawSuffix.startsWith('/') ? `/${rawSuffix}` : rawSuffix;
  return `${svc.protocol}://${svc.host}:${svc.port}${suffix}`;
}

export function getServiceHealthUrl(serviceIdOrPort, map = loadFleetMap()) {
  const svc = getService(serviceIdOrPort, null, map);
  return getServiceUrl(svc.id, svc.healthPath || '/health', map);
}

export function getServicesByNode(nodeId, map = loadFleetMap()) {
  const key = String(nodeId || '').trim().toLowerCase();
  return (map?.services || []).filter((s) => s.node === key);
}

export function getServicesByScope(scope, map = loadFleetMap()) {
  const key = String(scope || '').trim().toLowerCase();
  return (map?.services || []).filter((s) => String(s.scope).toLowerCase() === key);
}

export const load_fleet_map = loadFleetMap;
export const get_node = getNode;
export const get_node_host = getNodeHost;
export const get_allowed_node_hosts = getAllowedNodeHosts;
export const get_service = getService;
export const get_service_url = getServiceUrl;
export const get_service_health_url = getServiceHealthUrl;
