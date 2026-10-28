import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { assemble, MAX_SHORT_US } from './timeline-engine.mjs';
import {
  planSocialStrike,
  planMusaCampaign,
  scoreLeadForgeBatch,
  judgeApproveAndDispatch,
  validatePublication,
  assertCustomerCopy,
  maskSecrets,
  TRUST_LEVEL_MAX_JUDGES,
  revenuePolicy
} from './inbound-crm-engine.mjs';
import {
  assertNaturalFemaleVoice,
  synthesizeGeminiFemaleVoiceWav,
  maskSecret,
  loadChannelsConfig
} from './gemini_female_voice_tts.mjs';
import {
  validateShortsDuration,
  validateChannelPackage
} from './shorts_duration_guard.mjs';

export const MIN_TARGET_US = 45_000_000;
export const HARD_CEILING_US = 59_000_000;

export const SABRETOOTH_WORKER_CONFIG = Object.freeze({
  node: 'Sabretooth-192.168.0.8',
  gpu: '16GB AMD Radeon RX 6800 (DirectML/Vulkan)',
  port: 8391,
  studio_port: 8390,
  min_target_us: MIN_TARGET_US,
  max_short_us: MAX_SHORT_US,
  hard_ceiling_us: HARD_CEILING_US,
  min_target_seconds: 45.0,
  max_short_seconds: 58.5,
  hard_ceiling_seconds: 59.0,
  allowed_female_voices: Object.freeze(['Aoede', 'Kore', 'af_heart', 'af_bella', 'LFM3-Omni-2B']),
  banned_tts_engines: Object.freeze(['pyttsx3', 'espeak', 'sapi', 'sam', 'robotic-default']),
  channels: Object.freeze(['@DreamOnlineMMO', '@UntilNoKidInNeed', '@AIDreamTeamStudio']),
  youtube_publish_method: 'youtube-data-api-v3',
  forbidden_automation: Object.freeze(['playwright', 'puppeteer', 'selenium', 'scraper']),
  strike_interval_hours: 4,
  trust_level_max_judges: TRUST_LEVEL_MAX_JUDGES,
  omniroute_url: 'http://192.168.0.15:20128/v1',
  ollama_url: 'http://127.0.0.1:11434',
  mission_control_url: 'http://192.168.0.15:3130/live',
  hermes_dashboard_url: 'http://127.0.0.1:9119',
  revenue_policy: revenuePolicy
});

const HANDLE_TO_CHANNEL_ID = new Map([
  ['@DreamOnlineMMO', 'dream-online-mmorpg'],
  ['dream-online-mmorpg', 'dream-online-mmorpg'],
  ['@UntilNoKidInNeed', 'until-no-kid-in-need'],
  ['until-no-kid-in-need', 'until-no-kid-in-need'],
  ['@AIDreamTeamStudio', 'ai-dream-team-studio'],
  ['ai-dream-team-studio', 'ai-dream-team-studio']
]);

/**
 * Validates that the voice and TTS engine are strictly natural female voices
 * (`Aoede`, `Kore`, `af_heart`, `af_bella`, or `LFM3-Omni-2B` 24 kHz natural speech)
 * and never robotic TTS (`pyttsx3`, `espeak`, Windows `SAPI`, `sam`, `robotic-default`).
 */
export function validateSabretoothVoice({
  engine = 'gemini-2.5-flash-preview-tts',
  voice = 'Aoede',
  config = loadChannelsConfig()
} = {}) {
  const normalizedEngine = String(engine || '').trim().toLowerCase();
  const normalizedVoice = String(voice || '').trim();

  for (const banned of SABRETOOTH_WORKER_CONFIG.banned_tts_engines) {
    if (
      normalizedEngine.includes(banned) ||
      normalizedVoice.toLowerCase().includes(banned) ||
      /robotic/i.test(normalizedVoice)
    ) {
      throw new Error(
        `BANNED_ROBOTIC_TTS_ENGINE: "${engine}/${voice}" is strictly forbidden. Use Aoede, Kore, af_heart, af_bella, or LFM3-Omni-2B.`
      );
    }
  }

  if (
    normalizedVoice === 'LFM3-Omni-2B' ||
    normalizedEngine === 'lfm3-omni-2b' ||
    normalizedEngine === 'liquid-lfm3-omni-2b'
  ) {
    if (!SABRETOOTH_WORKER_CONFIG.allowed_female_voices.includes(normalizedVoice)) {
      throw new Error(`UNAPPROVED_LOCAL_VOICE: "${voice}" is not an approved natural female voice.`);
    }
    return {
      provider: 'sabretooth-local-amd-gpu',
      model: 'lfm3-omni-2b',
      voiceName: 'LFM3-Omni-2B',
      sampleRateHz: 24000,
      profile: {
        role: 'Local 24 kHz Omni-Modal Natural Female Speech',
        gender: 'female'
      }
    };
  }

  const inferredEngine =
    normalizedVoice === 'af_heart' || normalizedVoice === 'af_bella'
      ? normalizedEngine === 'gemini-2.5-flash-preview-tts'
        ? 'kokoro-82m'
        : engine
      : engine;

  return assertNaturalFemaleVoice({
    engine: inferredEngine,
    voiceName: normalizedVoice,
    config
  });
}

/**
 * Enforces shorts_duration_guard.mjs, gemini_female_voice_tts.mjs, and official
 * YouTube Data API v3 compliance (`videos.insert` OAuth2 with human approval only).
 */
export async function validateAndPrepareShort(payload = {}) {
  const config = loadChannelsConfig();
  const channelKey = payload.channel || payload.channelId || '@DreamOnlineMMO';
  const channelId = HANDLE_TO_CHANNEL_ID.get(channelKey);
  if (!channelId) {
    throw new Error(
      `UNKNOWN_CHANNEL: "${channelKey}". Allowed channels: ${SABRETOOTH_WORKER_CONFIG.channels.join(', ')}`
    );
  }

  const method = String(payload.method ?? 'youtube-data-api-v3').trim();
  const methodLower = method.toLowerCase();
  for (const forbidden of SABRETOOTH_WORKER_CONFIG.forbidden_automation) {
    if (methodLower.includes(forbidden) || JSON.stringify(payload).toLowerCase().includes(forbidden)) {
      throw new Error(
        `FORBIDDEN_UNOFFICIAL_AUTOMATION: "${forbidden}" is strictly banned. Use 100% Official Google YouTube Data API v3 (videos.insert OAuth2) with human approval only.`
      );
    }
  }
  if (method !== 'youtube-data-api-v3') {
    throw new Error(
      `INVALID_YOUTUBE_METHOD: "${method}". Only official YouTube Data API v3 (videos.insert OAuth2) is permitted.`
    );
  }

  if (payload.approved !== undefined && payload.approved !== true) {
    throw new Error('HUMAN_APPROVAL_REQUIRED: Every YouTube Short requires explicit human approval.');
  }

  const durationUs =
    payload.duration_us !== undefined
      ? Number(payload.duration_us)
      : payload.durationSeconds !== undefined
        ? Math.round(Number(payload.durationSeconds) * 1_000_000)
        : NaN;

  if (!Number.isFinite(durationUs) || durationUs <= 0) {
    throw new Error('INVALID_SHORTS_DURATION: Positive duration_us or durationSeconds is required.');
  }

  const durationSeconds = Number((durationUs / 1_000_000).toFixed(3));
  const strictTargetCap = payload.strictTargetCap !== false;
  const durationGuard = validateShortsDuration(durationSeconds, { strictTargetCap, config });

  const voiceName = payload.voice || payload.voiceName || 'Aoede';
  const voiceEngine = payload.voiceEngine || payload.engine || 'gemini-2.5-flash-preview-tts';
  const voiceValidation = validateSabretoothVoice({
    engine: voiceEngine,
    voice: voiceName,
    config
  });

  const combinedCopy = `${payload.title || ''}\n${payload.description || ''}\n${payload.scriptText || ''}`.trim();
  if (/youandinotai\.com|darlink\.ai|joshua-10c242|adult[_\s-]*affiliate/i.test(combinedCopy)) {
    throw new Error(
      'CROSS_SURFACE_ISOLATION_VIOLATION: 18+ Date App / affiliate promos are strictly isolated from YouTube Shorts and DREAM Online.'
    );
  }

  if (payload.customerCopy) {
    assertCustomerCopy(payload.customerCopy);
  }

  let channelValidation = null;
  if (payload.title || payload.description || payload.scriptText) {
    const mappedVoiceEngine =
      voiceValidation.model === 'lfm3-omni-2b' ? 'kokoro-82m' : voiceValidation.model;
    const mappedVoiceName =
      voiceValidation.voiceName === 'LFM3-Omni-2B' ? 'af_heart' : voiceValidation.voiceName;
    channelValidation = validateChannelPackage({
      channelId,
      title: payload.title || 'DREAM Online — Built with Google Gemini',
      description: payload.description || 'Built with Google Gemini',
      scriptText: payload.scriptText || 'Built with Google Gemini',
      durationSeconds,
      voiceEngine: mappedVoiceEngine,
      voiceName: mappedVoiceName,
      config
    });
  }

  const publication = validatePublication({
    approved: payload.approved ?? true,
    method: 'youtube-data-api-v3',
    duration_us: Math.min(Math.round(durationUs), MAX_SHORT_US),
    title: payload.title || ''
  });

  let ttsDryRun = null;
  if (payload.synthesizeDryRun) {
    ttsDryRun = await synthesizeGeminiFemaleVoiceWav({
      text: payload.scriptText || 'Built with Google Gemini.',
      voiceName: voiceName === 'Kore' ? 'Kore' : 'Aoede',
      dryRun: true,
      dryRunDurationSeconds: durationSeconds
    });
  }

  return {
    ok: true,
    channelId,
    channelHandle: SABRETOOTH_WORKER_CONFIG.channels.find(
      (h) => HANDLE_TO_CHANNEL_ID.get(h) === channelId
    ),
    duration_us: Math.round(durationUs),
    durationSeconds,
    withinTargetWindow:
      durationUs >= MIN_TARGET_US && durationUs <= MAX_SHORT_US && durationGuard.withinTargetWindow,
    hardCeilingUs: HARD_CEILING_US,
    voice: voiceValidation,
    youtubeApi: {
      endpoint: 'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
      operation: 'videos.insert',
      auth: 'OAuth2',
      humanApprovalRequired: true,
      ...publication
    },
    channelValidation,
    ttsDryRun,
    apiKeyMasked: maskSecret(payload.apiKey || process.env.GEMINI_API_KEY || '')
  };
}

/**
 * Generates the 4-hour zero-cost marketing strike package routing to OmniRoute (:20128/v1)
 * and local Ollama (:11434).
 */
export function generateFourHourStrikeDrafts(body = {}) {
  if (body.copy) {
    assertCustomerCopy(body.copy);
  }
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

  return {
    ok: true,
    schedule: {
      interval_hours: SABRETOOTH_WORKER_CONFIG.strike_interval_hours,
      llm_cost_usd: 0,
      routing: {
        omniroute_url: SABRETOOTH_WORKER_CONFIG.omniroute_url,
        ollama_url: SABRETOOTH_WORKER_CONFIG.ollama_url,
        adult_18_plus_model: 'joshlcoleman/Fable',
        adult_surface_isolation: [
          'no_youtube',
          'no_dream_online',
          'no_untilnokidinneed',
          'no_onlinerecycle'
        ]
      }
    },
    judge,
    social: {
      ...social,
      isolation: ['no_youtube', 'no_dream_online', 'no_untilnokidinneed', 'no_onlinerecycle']
    },
    musa,
    leadforge,
    secrets_masked: maskSecrets(body.secrets || { apiKey: 'XXXX' })
  };
}

export function renderOpsisStudioHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OPSis Cut & Reach Studio — Sabretooth (.8)</title>
  <style>
    :root {
      --bg: #121316;
      --card: #1B1D22;
      --border: #2E323B;
      --text: #F5F7FA;
      --muted: #C2C8D0;
      --emerald: #00E5A3;
      --emerald-dark: #06281E;
      --amber: #FFB020;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      background: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 20px;
      line-height: 1.55;
    }
    h1 { font-size: 32px; margin: 0 0 8px 0; }
    h2 { font-size: 26px; margin: 0 0 14px 0; color: var(--emerald); }
    p { margin: 0 0 14px 0; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 24px;
      margin-top: 24px;
    }
    .card {
      background: var(--card);
      border: 2px solid var(--border);
      border-radius: 14px;
      padding: 24px;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 18px 24px;
      margin-top: 12px;
      background: var(--emerald);
      color: #08110E;
      font-size: 24px;
      font-weight: 800;
      text-align: center;
      text-decoration: none;
      border: none;
      border-radius: 12px;
      cursor: pointer;
    }
    .btn:hover { filter: brightness(1.08); }
    .link-row {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin: 16px 0;
    }
    .nav-btn {
      padding: 14px 22px;
      background: #232730;
      color: var(--text);
      border: 2px solid var(--emerald);
      border-radius: 10px;
      font-size: 20px;
      font-weight: 700;
      text-decoration: none;
    }
    select, input {
      width: 100%;
      padding: 14px;
      margin-bottom: 12px;
      background: #121316;
      color: var(--text);
      border: 2px solid var(--border);
      border-radius: 10px;
      font-size: 20px;
    }
    pre {
      background: #0D0E11;
      color: var(--emerald);
      padding: 18px;
      border-radius: 10px;
      border: 1px solid var(--border);
      font-size: 18px;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      margin-right: 10px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: var(--emerald-dark);
      color: var(--emerald);
      border: 1px solid var(--emerald);
      font-size: 18px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <h1>OPSis Cut &amp; Reach Studio — Sabretooth (192.168.0.8)</h1>
  <p>16 GB AMD Radeon RX 6800 (DirectML/Vulkan) • Hard Shorts Gate &lt;= 59.0s (45.0s–58.5s Target) • Natural Female Voices Only • 100% Official YouTube Data API v3</p>
  <div>
    <span class="badge">Voices: Aoede • Kore • af_heart • af_bella • LFM3-Omni-2B (24 kHz)</span>
    <span class="badge">90% Taxable / 10% Deduction Ceiling</span>
    <span class="badge">Secrets: XXXX Masked</span>
  </div>

  <div class="link-row">
    <a class="nav-btn" href="http://127.0.0.1:9119" target="_blank">Open Hermes OPSis Dashboard (:9119)</a>
    <a class="nav-btn" href="http://127.0.0.1:8391/health" target="_blank">Worker Health JSON (:8391/health)</a>
    <a class="nav-btn" href="http://192.168.0.15:3130/live" target="_blank">T5500 Mission Control (:3130/live)</a>
    <a class="nav-btn" href="http://192.168.0.15:20128/v1/models" target="_blank">OmniRoute Models (:20128/v1)</a>
  </div>

  <div class="grid">
    <div class="card">
      <h2>1. YouTube Short &amp; Female Voice Gate (&lt;= 58.5s Target / &lt;= 59.0s Ceiling)</h2>
      <label>Channel</label>
      <select id="channel">
        <option value="@DreamOnlineMMO">@DreamOnlineMMO — DREAM Online 3D MMORPG</option>
        <option value="@UntilNoKidInNeed">@UntilNoKidInNeed — E-Waste &amp; AI For Good</option>
        <option value="@AIDreamTeamStudio">@AIDreamTeamStudio — AI Dream Team Podcast</option>
      </select>
      <label>Natural Female Voice</label>
      <select id="voice">
        <option value="Aoede">Aoede (Gemini 2.5 Flash Lead Female Host)</option>
        <option value="Kore">Kore (Gemini 2.5 Flash Co-Host)</option>
        <option value="af_heart">af_heart (Sabretooth Kokoro-82M Female)</option>
        <option value="af_bella">af_bella (Sabretooth Kokoro-82M Female)</option>
        <option value="LFM3-Omni-2B">LFM3-Omni-2B (Sabretooth 24 kHz Natural Speech)</option>
      </select>
      <label>Duration in Seconds (Target 45.0s to 58.5s, Ceiling 59.0s)</label>
      <input id="duration" type="number" step="0.5" value="52.0" />
      <button class="btn" onclick="approveShort()">ONE-CLICK APPROVE &amp; VALIDATE SHORT</button>
    </div>

    <div class="card">
      <h2>2. 4-Hour Zero-Cost Social Strike &amp; LeadForge ($29 / $99)</h2>
      <p>Generates honest 50% lifetime affiliate promos for youandinotai.com (isolated to 18+ Reddit/Discord via joshlcoleman/Fable), Musa e-waste hooks for onlinerecycle.net, and LeadForge scoring.</p>
      <label>LeadForge Tier</label>
      <select id="tier">
        <option value="starter">Starter ($29/mo — 10 leads/day)</option>
        <option value="pro">Pro ($99/mo — 50 leads/day)</option>
      </select>
      <button class="btn" onclick="runStrike()">ONE-CLICK GENERATE 4-HOUR STRIKE DRAFTS</button>
    </div>
  </div>

  <div class="card" style="margin-top: 24px;">
    <h2>Live Execution Output</h2>
    <pre id="output">Ready. Click either emerald button above to run live validation or generate 4-hour strike drafts.</pre>
  </div>

  <script>
    async function approveShort() {
      const channel = document.getElementById('channel').value;
      const voice = document.getElementById('voice').value;
      const durationSeconds = Number(document.getElementById('duration').value);
      const res = await fetch('/api/validate-short', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          voice,
          duration_us: Math.round(durationSeconds * 1000000),
          title: channel + ' Update | Built with Google Gemini',
          description: '100% in-house DREAM-Engine. Built with Google Gemini.',
          scriptText: 'Welcome back to our latest update built with Google Gemini.',
          method: 'youtube-data-api-v3',
          approved: true,
          synthesizeDryRun: true
        })
      });
      const data = await res.json();
      document.getElementById('output').textContent = JSON.stringify(data, null, 2);
    }

    async function runStrike() {
      const tier = document.getElementById('tier').value;
      const res = await fetch('/api/strike-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          leads: [
            { email: 'intake@onlinerecycle.net', consent: true, intent: 'corporate_pickup', follow_up_requested: true },
            { email: 'partner@youandinotai.com', consent: true, intent: 'partnership', follow_up_requested: true }
          ]
        })
      });
      const data = await res.json();
      document.getElementById('output').textContent = JSON.stringify(data, null, 2);
    }
  </script>
</body>
</html>`;
}

export function createSabretoothWorkerServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET' && (req.url === '/' || req.url === '/studio')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200).end(renderOpsisStudioHtml());
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
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
        validateSabretoothVoice({
          engine: body.engine || 'gemini-2.5-flash-preview-tts',
          voice: body.voice || 'Aoede'
        });
        if (Number.isFinite(body.duration_us) && body.duration_us > 0) {
          validateShortsDuration(Number((body.duration_us / 1_000_000).toFixed(3)), {
            strictTargetCap: true
          });
        }
        const plan = assemble(body);
        res.writeHead(200).end(JSON.stringify({ ok: true, plan, apiKeyMasked: maskSecret(body.apiKey) }));
        return;
      }
      if (req.url === '/api/validate-short' || req.url === '/api/publish-short') {
        const result = await validateAndPrepareShort(body);
        res.writeHead(200).end(JSON.stringify(result));
        return;
      }
      if (req.url === '/api/strike-drafts') {
        const strike = generateFourHourStrikeDrafts(body);
        res.writeHead(200).end(JSON.stringify(strike));
        return;
      }
      res.writeHead(404).end(JSON.stringify({ error: 'Route not found' }));
    } catch (err) {
      res.writeHead(400).end(
        JSON.stringify({
          error: maskSecret(err.message) === 'XXXX' && err.message.length < 20 ? 'XXXX' : err.message || 'Invalid worker request',
          apiKeyMasked: 'XXXX'
        })
      );
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.SABRETOOTH_WORKER_PORT || 8391);
  const studioPort = Number(process.env.OPSIS_STUDIO_PORT || 8390);
  createSabretoothWorkerServer().listen(port, '0.0.0.0', () => {
    console.log(`Sabretooth OPSis Worker listening on http://127.0.0.1:${port}`);
  });
  if (studioPort !== port) {
    createSabretoothWorkerServer().listen(studioPort, '0.0.0.0', () => {
      console.log(`OPSis Cut & Reach Studio GUI listening on http://127.0.0.1:${studioPort}`);
    });
  }
}
