import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { assemble, MAX_SHORT_US } from './timeline-engine.mjs';
import { planSocialStrike, planMusaCampaign, scoreLeadForgeBatch, judgeApproveAndDispatch, TRUST_LEVEL_MAX_JUDGES } from './inbound-crm-engine.mjs';

export const SABRETOOTH_WORKER_CONFIG = Object.freeze({
  node: 'Sabretooth-192.168.0.8',
  gpu: '16GB AMD Radeon RX 6800 (DirectML/Vulkan)',
  port: 8391,
  max_short_us: MAX_SHORT_US,
  hard_ceiling_us: 59_000_000,
  allowed_female_voices: Object.freeze(['Aoede', 'Kore', 'af_heart', 'af_bella', 'LFM3-Omni-2B']),
  channels: Object.freeze(['@DreamOnlineMMO', '@UntilNoKidInNeed', '@AIDreamTeamStudio']),
  trust_level_max_judges: TRUST_LEVEL_MAX_JUDGES,
  omniroute_url: 'http://192.168.0.15:20128/v1',
  mission_control_url: 'http://192.168.0.15:3130/live'
});

export function createSabretoothWorkerServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200).end(JSON.stringify({ status: 'ok', worker: SABRETOOTH_WORKER_CONFIG }));
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 100_000) throw new Error('Request too large');
      }
      const body = raw ? JSON.parse(raw) : {};
      if (req.url === '/api/dry-run-timeline') {
        const plan = assemble(body);
        res.writeHead(200).end(JSON.stringify({ ok: true, plan }));
        return;
      }
      if (req.url === '/api/strike-drafts') {
        const social = planSocialStrike(body.social || {});
        const musa = planMusaCampaign(body.musa || {});
        const leadforge = scoreLeadForgeBatch(body.tier || 'starter', body.leads || []);
        const judge = judgeApproveAndDispatch({
          judge_lane: body.judge_lane || 'gemini-4-high-reasoning',
          source_agent: 'sabretooth-hermes-opsis',
          item_type: 'social_strike',
          cost_usd: 0,
          copy: social.drafts[0].body
        });
        res.writeHead(200).end(JSON.stringify({ ok: true, judge, social, musa, leadforge }));
        return;
      }
      res.writeHead(404).end(JSON.stringify({ error: 'Route not found' }));
    } catch (err) {
      res.writeHead(400).end(JSON.stringify({ error: err.message || 'Invalid worker request' }));
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createSabretoothWorkerServer().listen(8391, '127.0.0.1', () => {
    console.log('Sabretooth OPSis Worker listening on http://127.0.0.1:8391');
  });
}
