'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FLEET_MAP_PATH = path.join(__dirname, 'fleet-map.json');

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

function loadFleetMap(customPath = FLEET_MAP_PATH) {
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

function getSpinePath(map = loadFleetMap()) {
  const spine = map && typeof map.spine === 'string' ? map.spine.trim() : '';
  if (!spine) {
    throw new Error('Missing "spine" path in fleet-map.json');
  }
  return spine;
}

function getNode(nodeId, map = loadFleetMap()) {
  const key = String(nodeId || '').trim().toLowerCase();
  const node = map && map.nodes ? map.nodes[key] : null;
  if (!node) {
    throw new Error(`Unknown fleet node "${nodeId}" in fleet-map.json`);
  }
  return node;
}

function getNodeHost(nodeId, map = loadFleetMap()) {
  return getNode(nodeId, map).host;
}

function getNodeRepos(nodeId, map = loadFleetMap()) {
  const node = getNode(nodeId, map);
  return Array.isArray(node.repos) ? [...node.repos] : [];
}

function getNodeHarnesses(nodeId, map = loadFleetMap()) {
  const node = getNode(nodeId, map);
  return Array.isArray(node.harnesses) ? [...node.harnesses] : [];
}

function getAllowedNodeHosts(map = loadFleetMap()) {
  const nodes = Object.values((map && map.nodes) || {});
  return nodes.map((n) => String(n.host).trim()).filter(Boolean);
}

function getService(serviceIdOrPort, nodeId = null, map = loadFleetMap()) {
  const services = Array.isArray(map && map.services) ? map.services : [];
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

function getServiceBindHost(serviceIdOrPort, envBindValue = '', map = loadFleetMap()) {
  const trimmed = String(envBindValue || '').trim();
  if (trimmed) return trimmed;
  const svc = getService(serviceIdOrPort, null, map);
  return svc.bind;
}

function getServicePort(serviceIdOrPort, envPortValue = '', map = loadFleetMap()) {
  const n = Number(envPortValue);
  if (Number.isInteger(n) && n > 0) return n;
  const svc = getService(serviceIdOrPort, null, map);
  return svc.port;
}

function getServiceUrl(serviceIdOrPort, pathOverride = '', map = loadFleetMap()) {
  const svc = getService(serviceIdOrPort, null, map);
  const rawSuffix = pathOverride ? String(pathOverride) : '';
  const suffix = rawSuffix && !rawSuffix.startsWith('/') ? `/${rawSuffix}` : rawSuffix;
  return `${svc.protocol}://${svc.host}:${svc.port}${suffix}`;
}

function getServiceHealthUrl(serviceIdOrPort, map = loadFleetMap()) {
  const svc = getService(serviceIdOrPort, null, map);
  return getServiceUrl(svc.id, svc.healthPath || '/health', map);
}

function getServicesByNode(nodeId, map = loadFleetMap()) {
  const key = String(nodeId || '').trim().toLowerCase();
  return ((map && map.services) || []).filter((s) => s.node === key);
}

function getServicesByScope(scope, map = loadFleetMap()) {
  const key = String(scope || '').trim().toLowerCase();
  return ((map && map.services) || []).filter((s) => String(s.scope).toLowerCase() === key);
}

module.exports = {
  FLEET_MAP_PATH,
  loadFleetMap,
  getSpinePath,
  getNode,
  getNodeHost,
  getNodeRepos,
  getNodeHarnesses,
  getAllowedNodeHosts,
  getService,
  getServiceBindHost,
  getServicePort,
  getServiceUrl,
  getServiceHealthUrl,
  getServicesByNode,
  getServicesByScope,
  load_fleet_map: loadFleetMap,
  get_spine_path: getSpinePath,
  get_node: getNode,
  get_node_host: getNodeHost,
  get_node_repos: getNodeRepos,
  get_node_harnesses: getNodeHarnesses,
  get_allowed_node_hosts: getAllowedNodeHosts,
  get_service: getService,
  get_service_url: getServiceUrl,
  get_service_health_url: getServiceHealthUrl,
};
