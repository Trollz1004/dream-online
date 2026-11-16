import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
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

const html = await readFile(new URL('./public/index.html', import.meta.url));
const partners = JSON.parse(
  await readFile(new URL('./affiliate-partners.json', import.meta.url), 'utf8')
);

const ALLOWED_HOSTNAMES = new Set(['127.0.0.1', ...getAllowedNodeHosts()]);

export function resolveStudioBindHost(env = process.env) {
  const explicit = String(env.OPSIS_STUDIO_BIND || '').trim();
  if (explicit === '127.0.0.1' || explicit === '0.0.0.0' || ALLOWED_HOSTNAMES.has(explicit)) {
    return explicit;
  }
  return getServiceBindHost('opsis-studio');
}

export function resolveStudioPort(env = process.env) {
  return getServicePort('opsis-studio', env.OPSIS_STUDIO_PORT || env.PORT);
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

export function createStudioServer() {
  const store = new TimelineStore();
  const token = randomBytes(32).toString('hex');
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
    if (req.method === 'GET' && req.url === '/api/session') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ token }));
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
    if (
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bindHost = resolveStudioBindHost();
  const port = resolveStudioPort();
  createStudioServer().listen(port, bindHost, () =>
    console.log(`OPSis studio listening on ${bindHost}:${port}`)
  );
}
