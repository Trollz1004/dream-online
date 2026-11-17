#!/usr/bin/env node
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  getAllowedNodeHosts,
  getNodeHost,
  getService,
  getServiceBindHost,
  getServicePort,
  getServicesByNode,
} from './fleet-map.mjs';

const DEFAULT_PROBE_TIMEOUT_MS = 1500;

export function resolveFleetNode(env = process.env, explicitNode = '') {
  const candidate = String(explicitNode || env.FLEET_NODE || '').trim().toLowerCase();
  if (candidate === 'alienware' || candidate === 't5500') {
    return candidate;
  }
  const host = String(os.hostname() || '').trim().toLowerCase();
  if (host.startsWith('t5500')) {
    return 't5500';
  }
  return 'alienware';
}

export function getFleetStatusServiceId(nodeId) {
  return nodeId === 't5500' ? 't5500-fleet-status' : 'alienware-fleet-status';
}

export function resolveFleetStatusBindHost(env = process.env, serviceId = 'alienware-fleet-status') {
  const explicit = String(env.FLEET_STATUS_BIND || '').trim();
  const allowedHosts = new Set(['127.0.0.1', ...getAllowedNodeHosts()]);
  if (explicit === '127.0.0.1' || explicit === '0.0.0.0' || allowedHosts.has(explicit)) {
    return explicit;
  }
  const token = String(env.FLEET_SHARED_TOKEN || '').trim();
  if (!token) {
    return '127.0.0.1';
  }
  return getServiceBindHost(serviceId);
}

export function resolveFleetStatusPort(env = process.env, serviceId = 'alienware-fleet-status') {
  const raw = String(env.FLEET_STATUS_PORT ?? env.PORT ?? '').trim();
  if (raw === '0') return 0;
  return getServicePort(serviceId, raw);
}

export function validateFleetStatusBindConfig(env = process.env, serviceId = 'alienware-fleet-status') {
  const host = resolveFleetStatusBindHost(env, serviceId);
  const token = String(env.FLEET_SHARED_TOKEN || '').trim();
  if (host !== '127.0.0.1' && !token) {
    throw new Error(
      `Refusing to start ${serviceId} on ${host} without FLEET_SHARED_TOKEN: set a non-empty FLEET_SHARED_TOKEN or bind to 127.0.0.1.`,
    );
  }
  const explicit = String(env.FLEET_STATUS_BIND || '').trim();
  const configuredPort = getServicePort(serviceId, env.FLEET_STATUS_PORT || env.PORT);
  const warning =
    !token && explicit !== '127.0.0.1'
      ? `[fleet-status] WARNING: FLEET_SHARED_TOKEN is not set; binding 127.0.0.1 on port ${configuredPort} (this machine only).`
      : null;
  return { host, token, warning };
}

export function resolveAgentDriftPath(env = process.env, overridePath = '') {
  if (String(overridePath || '').trim()) {
    return String(overridePath).trim();
  }
  if (String(env.AGENT_DRIFT_PATH || '').trim()) {
    return String(env.AGENT_DRIFT_PATH).trim();
  }
  return path.join(env.LOCALAPPDATA || os.homedir(), 'dream-boot', 'agent-drift.json');
}

export function readAgentDrift(driftPath) {
  if (!driftPath || !fs.existsSync(driftPath)) {
    return { present: false, driftedFiles: [] };
  }
  try {
    const raw = fs.readFileSync(driftPath, 'utf8').replace(/^\uFEFF/, '');
    if (!raw.trim()) return { present: true, driftedFiles: [] };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.driftedFiles) ? parsed.driftedFiles : [];
    const driftedFiles = items
      .map((entry) => {
        if (typeof entry === 'string') {
          return { file: entry, reason: 'drifted' };
        }
        return {
          file: String(entry?.file || ''),
          reason: String(entry?.reason || 'drifted'),
        };
      })
      .filter((entry) => entry.file.length > 0);
    return { present: true, driftedFiles };
  } catch (err) {
    return {
      present: true,
      driftedFiles: [{ file: path.basename(driftPath), reason: 'drifted' }],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function normalizeMissingEnvEntries(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const name = item.name || item.env || item.key || '';
        const svc = item.service ? `${item.service}:` : '';
        return name ? `${svc}${String(name).trim()}` : '';
      }
      return '';
    })
    .filter(Boolean);
}

export async function collectMissingEnv(options = {}, env = process.env, probedServices = []) {
  const collected = [];

  if (typeof options.serviceMissingEnv === 'function') {
    collected.push(...normalizeMissingEnvEntries(await options.serviceMissingEnv()));
  } else if (Array.isArray(options.serviceMissingEnv)) {
    collected.push(...normalizeMissingEnvEntries(options.serviceMissingEnv));
  }

  const envStatusPath =
    String(options.envStatusPath || env.ENV_STATUS_PATH || env.SERVICE_MISSING_ENV_PATH || '').trim() ||
    path.join(env.LOCALAPPDATA || os.homedir(), 'dream-boot', 'env-status.json');
  if (envStatusPath && fs.existsSync(envStatusPath)) {
    try {
      const raw = fs.readFileSync(envStatusPath, 'utf8').replace(/^\uFEFF/, '');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        collected.push(
          ...normalizeMissingEnvEntries(parsed?.serviceMissingEnv || parsed?.missingEnv || parsed?.missing),
        );
      }
    } catch {
      // Ignore malformed optional env-status file
    }
  }

  const rawEnvMissing = String(env.SERVICE_MISSING_ENV || '').trim();
  if (rawEnvMissing) {
    if (rawEnvMissing.startsWith('[')) {
      try {
        collected.push(...normalizeMissingEnvEntries(JSON.parse(rawEnvMissing)));
      } catch {
        collected.push(...rawEnvMissing.split(',').map((s) => s.trim()).filter(Boolean));
      }
    } else {
      collected.push(...rawEnvMissing.split(',').map((s) => s.trim()).filter(Boolean));
    }
  }

  for (const svc of probedServices) {
    if (Array.isArray(svc?.missingEnv)) {
      collected.push(...normalizeMissingEnvEntries(svc.missingEnv));
    }
    if (Array.isArray(svc?.serviceMissingEnv)) {
      collected.push(...normalizeMissingEnvEntries(svc.serviceMissingEnv));
    }
  }

  return Array.from(new Set(collected));
}

function probeTcp(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let settled = false;
    const done = (up, detail) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve({ up, detail });
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => done(true, 'tcp ok'));
    sock.once('timeout', () => done(false, 'tcp timeout'));
    sock.once('error', (err) => done(false, err.message));
    sock.connect(port, host);
  });
}

function probeHttp(target, env, timeoutMs) {
  return new Promise((resolve) => {
    const host = target.host;
    const port = target.port;
    const pathSuffix = target.healthPath || '/health';
    const headers = {};
    if (target.authTokenEnv && env[target.authTokenEnv]) {
      headers.Authorization = `Bearer ${String(env[target.authTokenEnv]).trim()}`;
    }

    const req = http.request(
      {
        hostname: host,
        port,
        path: pathSuffix,
        method: 'GET',
        headers,
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          if (body.length < 65536) body += chunk;
        });
        res.on('end', () => {
          const identity = String(target.expectedIdentity || '');
          const statusOk = res.statusCode === 200;
          const identityOk = !identity || body.includes(identity);
          const up = statusOk && identityOk;
          let missingEnv = [];
          try {
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed?.serviceMissingEnv)) {
              missingEnv = normalizeMissingEnvEntries(parsed.serviceMissingEnv);
            } else if (Array.isArray(parsed?.missingEnv)) {
              missingEnv = normalizeMissingEnvEntries(parsed.missingEnv);
            }
          } catch {
            // Non-JSON response is valid for HTML health endpoints
          }
          const detail = up
            ? 'ok'
            : !statusOk
              ? `HTTP ${res.statusCode}`
              : `missing identity '${identity}'`;
          resolve({ up, detail, missingEnv });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (err) => {
      resolve({ up: false, detail: err.message || 'unreachable', missingEnv: [] });
    });
    req.end();
  });
}

export function resolveMonitoredTargets(nodeId, serviceId, options = {}, env = process.env) {
  if (Array.isArray(options.targets)) {
    return options.targets;
  }
  const rawTargets = String(env.FLEET_STATUS_TARGETS || '').trim();
  if (rawTargets) {
    const parsed = JSON.parse(rawTargets);
    return Array.isArray(parsed) ? parsed : [];
  }
  return getServicesByNode(nodeId)
    .filter((svc) => svc.id !== serviceId)
    .map((svc) => ({
      id: svc.id,
      name: svc.name,
      host: svc.host,
      port: svc.port,
      protocol: svc.protocol,
      healthPath: svc.healthPath,
      expectedIdentity: svc.expectedIdentity,
      authTokenEnv: svc.authTokenEnv,
      required: true,
    }));
}

export async function computeNodeStatus(options = {}) {
  const env = options.env || process.env;
  const nodeId = resolveFleetNode(env, options.node);
  const serviceId = getFleetStatusServiceId(nodeId);
  const driftPath = resolveAgentDriftPath(env, options.agentDriftPath);
  const timeoutMs = Number(options.probeTimeoutMs || DEFAULT_PROBE_TIMEOUT_MS);

  let services;
  if (typeof options.probeServices === 'function') {
    services = await options.probeServices({ node: nodeId, serviceId });
  } else {
    const targets = resolveMonitoredTargets(nodeId, serviceId, options, env);
    services = await Promise.all(
      targets.map(async (target) => {
        const res =
          target.protocol === 'tcp'
            ? await probeTcp(target.host, target.port, timeoutMs)
            : await probeHttp(target, env, timeoutMs);
        return {
          id: target.id,
          name: target.name || target.id,
          host: target.host,
          port: target.port,
          required: target.required !== false,
          up: Boolean(res.up),
          detail: res.detail,
          missingEnv: res.missingEnv || [],
        };
      }),
    );
  }

  const { driftedFiles } = readAgentDrift(driftPath);
  const missingEnv = await collectMissingEnv(options, env, services);
  const downServices = services.filter((s) => s.required !== false && !s.up);

  let light = 'green';
  let flashing = false;
  if (downServices.length > 0) {
    light = 'red';
    flashing = true;
  } else if (driftedFiles.length > 0 || missingEnv.length > 0) {
    light = 'amber';
    flashing = false;
  }

  const reasons = [];
  for (const svc of downServices) {
    reasons.push(`service down: ${svc.name || svc.id} (${svc.host}:${svc.port}${svc.detail ? ` - ${svc.detail}` : ''})`);
  }
  for (const d of driftedFiles) {
    reasons.push(`agent drift (${d.reason}): ${d.file}`);
  }
  for (const envName of missingEnv) {
    reasons.push(`missing env: ${envName}`);
  }

  return {
    ok: true,
    service: serviceId,
    node: nodeId,
    light,
    flashing,
    driftedFiles,
    missingEnv,
    reasons,
    services: services.map(({ missingEnv: _m, ...rest }) => rest),
    checkedAt: new Date().toISOString(),
  };
}

export function createFleetStatusServer(options = {}) {
  const env = options.env || process.env;
  const nodeId = resolveFleetNode(env, options.node);
  const serviceId = getFleetStatusServiceId(nodeId);
  const serviceMeta = getService(serviceId);

  const server = http.createServer(async (req, res) => {
    try {
      const urlObj = new URL(req.url || '/', `http://${serviceMeta.host}:${serviceMeta.port}`);
      if (req.method === 'GET' && (urlObj.pathname === '/health' || urlObj.pathname === '/api/status')) {
        const snapshot = await computeNodeStatus({ ...options, env, node: nodeId });
        const body = JSON.stringify(snapshot);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(body);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    }
  });

  return { server, nodeId, serviceId };
}

export function startFleetStatusServer(options = {}) {
  const env = options.env || process.env;
  const nodeId = resolveFleetNode(env, options.node);
  const serviceId = getFleetStatusServiceId(nodeId);
  const { host, warning } = validateFleetStatusBindConfig(env, serviceId);
  const port = options.port !== undefined ? options.port : resolveFleetStatusPort(env, serviceId);
  if (warning) {
    console.warn(warning);
  }
  const { server } = createFleetStatusServer({ ...options, env, node: nodeId });
  const lanIp = getNodeHost(nodeId);

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const addr = server.address();
      const actualPort = addr && typeof addr === 'object' ? addr.port : port;
      console.log(`[${serviceId}] Listening on http://${host}:${actualPort} (http://${lanIp}:${actualPort}/health)`);
      resolve({ server, host, port: actualPort, nodeId, serviceId });
    });
  });
}

const isCli = Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  startFleetStatusServer().catch((err) => {
    console.error(`[fleet-status] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
