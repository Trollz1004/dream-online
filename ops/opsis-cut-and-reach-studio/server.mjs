import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TimelineStore } from './timeline-engine.mjs';
import {
  scoreLead,
  trackAttribution,
  verifyPartnerConfig,
  planSocialStrike,
  planMusaCampaign,
  scoreLeadForgeBatch,
  judgeApproveAndDispatch,
} from './inbound-crm-engine.mjs';
import {
  getAllowedNodeHosts,
  getServiceBindHost,
  getServicePort,
} from '../fleet/fleet-map.mjs';
import {
  checkRequiredEnv,
  logStartupEnvCheck,
} from '../agents/env-required.mjs';

const STUDIO_DIR = path.dirname(fileURLToPath(import.meta.url));

const html = await readFile(new URL('./public/index.html', import.meta.url));
const partners = JSON.parse(
  await readFile(new URL('./affiliate-partners.json', import.meta.url), 'utf8')
);

const ALLOWED_HOSTNAMES = new Set(['127.0.0.1', ...getAllowedNodeHosts()]);

export function resolveStudioTokens(env = process.env) {
  const candidates = [
    String(env.OPSIS_STUDIO_TOKEN || '').trim(),
    String(env.FLEET_SHARED_TOKEN || '').trim(),
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

export function resolveStudioBindHost(env = process.env) {
  const explicit = String(env.OPSIS_STUDIO_BIND || '').trim();
  if (explicit === '127.0.0.1' || explicit === '0.0.0.0' || ALLOWED_HOSTNAMES.has(explicit)) {
    return explicit;
  }
  if (resolveStudioTokens(env).length === 0) {
    return '127.0.0.1';
  }
  return getServiceBindHost('opsis-studio');
}

export function resolveStudioPort(env = process.env) {
  const raw = String(env.OPSIS_STUDIO_PORT || env.PORT || '').trim();
  if (raw === '0') return 0;
  return getServicePort('opsis-studio', raw);
}

export function validateStudioBindConfig(env = process.env) {
  const host = resolveStudioBindHost(env);
  const tokens = resolveStudioTokens(env);
  const token = tokens[0] || '';
  if (host !== '127.0.0.1' && !token) {
    throw new Error(
      `Refusing to start OPSis Studio on ${host} without OPSIS_STUDIO_TOKEN or FLEET_SHARED_TOKEN: set a non-empty OPSIS_STUDIO_TOKEN / FLEET_SHARED_TOKEN or bind to 127.0.0.1.`
    );
  }
  const explicit = String(env.OPSIS_STUDIO_BIND || '').trim();
  const configuredPort = getServicePort('opsis-studio', env.OPSIS_STUDIO_PORT || env.PORT);
  const warning =
    !token && explicit !== '127.0.0.1'
      ? `[opsis-studio] WARNING: OPSIS_STUDIO_TOKEN or FLEET_SHARED_TOKEN is not set; binding 127.0.0.1 on port ${configuredPort} (this machine only).`
      : null;
  return { host, token, warning };
}

export function isAllowedStudioHost(hostHeader) {
  const raw = String(hostHeader || '').trim();
  const match = /^([^:]+):(\d{1,5})$/.exec(raw);
  if (!match) return false;
  const [, hostname, portStr] = match;
  const port = Number(portStr);
  return ALLOWED_HOSTNAMES.has(hostname) && port >= 1 && port <= 65535;
}

export function isAllowedStudioOrigin(originHeader, hostHeader) {
  const origin = String(originHeader || '').trim();
  const host = String(hostHeader || '').trim();
  if (!origin || !isAllowedStudioHost(host)) return false;
  if (origin === `http://${host}`) return true;
  const match = /^http:\/\/([^:/]+):(\d{1,5})$/.exec(origin);
  if (!match) return false;
  const [, originHost, originPort] = match;
  const hostPort = host.split(':')[1];
  return ALLOWED_HOSTNAMES.has(originHost) && originPort === hostPort;
}

async function json(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error('Request too large');
  }
  return raw ? JSON.parse(raw) : {};
}

function matchesAnyTokenTimingSafe(providedToken, expectedTokens) {
  if (!providedToken || !Array.isArray(expectedTokens) || expectedTokens.length === 0) {
    return false;
  }
  const providedBuf = Buffer.from(String(providedToken), 'utf8');
  let matched = false;
  for (const expected of expectedTokens) {
    const expectedBuf = Buffer.from(String(expected), 'utf8');
    if (expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf)) {
      matched = true;
    }
  }
  return matched;
}

function hasValidStudioFleetAuth(req, expectedTokens) {
  const authHeader = String(req.headers.authorization || '').trim();
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  const fleetHeader = String(req.headers['x-fleet-token'] || '').trim();
  const providedToken = match ? match[1] : fleetHeader;
  return matchesAnyTokenTimingSafe(providedToken, expectedTokens);
}

export function createStudioServer(options = {}) {
  const store = new TimelineStore();
  const token = randomBytes(32).toString('hex');
  const resolveEnv = () => options?.env || process.env;
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
    );
    const host = req.headers.host || '';
    if (!isAllowedStudioHost(host)) {
      res.writeHead(403).end();
      return;
    }
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      return;
    }
    const activeEnv = resolveEnv();
    const bindHost = resolveStudioBindHost(activeEnv);
    const isLanBound = bindHost !== '127.0.0.1';
    const expectedTokens = resolveStudioTokens(activeEnv);

    if (req.method === 'GET' && req.url === '/health') {
      const envCheck = checkRequiredEnv(STUDIO_DIR, activeEnv);
      res
        .writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ ok: true, service: 'opsis-studio', missingEnv: envCheck.missingEnv }));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/session') {
      if (isLanBound && !hasValidStudioFleetAuth(req, expectedTokens)) {
        res
          .writeHead(401, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Unauthorized: valid Authorization Bearer token or X-Fleet-Token required' }));
        return;
      }
      const envCheck = checkRequiredEnv(STUDIO_DIR, activeEnv);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({ token, missingEnv: envCheck.missingEnv })
      );
      return;
    }
    const routes = [
      '/api/timeline',
      '/api/lead',
      '/api/stage-social',
      '/api/verify-partners',
      '/api/stage-musa',
      '/api/leadforge',
      '/api/judge-approve',
    ];
    if (req.method !== 'POST' || !routes.includes(req.url)) {
      res.writeHead(404).end();
      return;
    }
    if (isLanBound) {
      if (!hasValidStudioFleetAuth(req, expectedTokens)) {
        res
          .writeHead(401, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Unauthorized: valid Authorization Bearer token or X-Fleet-Token required' }));
        return;
      }
      if (
        (req.headers.origin && !isAllowedStudioOrigin(req.headers.origin, host)) ||
        !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')
      ) {
        res.writeHead(403).end();
        return;
      }
    } else if (
      !isAllowedStudioOrigin(req.headers.origin, host) ||
      req.headers['x-studio-token'] !== token ||
      !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')
    ) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await json(req);
      let result;
      if (req.url === '/api/timeline') result = store.apply(body);
      else if (req.url === '/api/lead')
        result = { score: scoreLead(body.lead || {}), attribution: trackAttribution(body.site, body.url) };
      else if (req.url === '/api/stage-social') result = planSocialStrike(body || {});
      else if (req.url === '/api/verify-partners')
        result = { valid: true, partners: verifyPartnerConfig(partners).map((p) => ({ ...p, token: 'XXXX' })) };
      else if (req.url === '/api/stage-musa') result = planMusaCampaign(body || {});
      else if (req.url === '/api/judge-approve') result = judgeApproveAndDispatch(body || {});
      else {
        const leads = Array.isArray(body.leads) ? body.leads : [];
        const tier = body.tier || 'starter';
        result = scoreLeadForgeBatch(tier, leads);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
    } catch {
      res
        .writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Request rejected. Check the input, disclosure, duration, voice, and revision.' }));
    }
  });
}

export function startStudioServer(env = process.env, onListening) {
  const { host, warning } = validateStudioBindConfig(env);
  if (warning) {
    console.warn(warning);
  }
  logStartupEnvCheck(STUDIO_DIR, env);
  const port = resolveStudioPort(env);
  const server = createStudioServer({ env });
  return server.listen(port, host, () => {
    const addr = server.address();
    const actualPort = addr && typeof addr === 'object' ? addr.port : port;
    console.log(`OPSis studio listening on ${host}:${actualPort}`);
    if (typeof onListening === 'function') onListening();
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    startStudioServer(process.env);
  } catch (err) {
    console.error(`[opsis-studio] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
