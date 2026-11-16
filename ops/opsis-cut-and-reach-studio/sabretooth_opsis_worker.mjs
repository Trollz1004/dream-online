import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { assemble, MAX_SHORT_US } from './timeline-engine.mjs';
import { planSocialStrike, planMusaCampaign, scoreLeadForgeBatch, judgeApproveAndDispatch, TRUST_LEVEL_MAX_JUDGES } from './inbound-crm-engine.mjs';

export const ALIENWARE_WORKER_CONFIG = Object.freeze({
  node: 'Alienware (192.168.0.40)',
  studio_title: 'Alienware Lead-Gen Command Studio',
  studio_url: 'http://192.168.0.40:8392/',
  gpu: '16GB AMD Radeon RX 6800 (DirectML/Vulkan)',
  port: 8391,
  max_short_us: MAX_SHORT_US,
  hard_ceiling_us: 59_000_000,
  allowed_female_voices: Object.freeze(['Aoede', 'Kore', 'af_heart', 'af_bella', 'LFM3-Omni-2B']),
  channels: Object.freeze(['@DreamOnlineMMO', '@OnlineRecycle', '@AIDreamTeamStudio']),
  youtube_publish_method: 'youtube-data-api-v3',
  youtube_scraping_enabled: false,
  yt_dlp_enabled: false,
  youtube_studio_url: 'https://studio.youtube.com/channel/UCJnFUOdEfSOJiXLnx6lXSzg',
  youtube_made_with_ai_tos: Object.freeze({
    containsSyntheticMedia: true,
    selfDeclaredMadeForKids: false,
    disclosureLabel: 'Made with AI — Built with Google Gemini'
  }),
  gemini_notebook_remaster_source: Object.freeze({
    legacyVideoId: '9hNDPCQa3kw'
  }),
  trust_level_max_judges: TRUST_LEVEL_MAX_JUDGES,
  omniroute_url: 'http://192.168.0.15:20128/v1',
  ops_live_url: 'http://192.168.0.15:3130/live'
});

export function createAlienwareWorkerServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200).end(JSON.stringify({ status: 'ok', worker: ALIENWARE_WORKER_CONFIG }));
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
          source_agent: 'alienware-hermes-opsis',
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
  createAlienwareWorkerServer().listen(8391, '0.0.0.0', () => {
    console.log('Alienware Lead-Gen Command Studio OPSis Worker listening on http://192.168.0.40:8391');
  });
}
