import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SABRETOOTH_WORKER_CONFIG,
  createSabretoothWorkerServer,
  validateSabretoothVoice,
  validateAndPrepareShort,
  generateFourHourStrikeDrafts
} from './sabretooth_opsis_worker.mjs';

async function withWorkerServer(fn) {
  const server = createSabretoothWorkerServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('1. Sabretooth worker config & GET /health expose canonical fleet, GPU, channels, voices, and duration gates', async () => {
  await withWorkerServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.worker.node, 'Sabretooth-192.168.0.8');
    assert.equal(data.worker.gpu, '16GB AMD Radeon RX 6800 (DirectML/Vulkan)');
    assert.equal(data.worker.port, 8391);
    assert.equal(data.worker.min_target_us, 45_000_000);
    assert.equal(data.worker.max_short_us, 58_500_000);
    assert.equal(data.worker.hard_ceiling_us, 59_000_000);
    assert.deepEqual(data.worker.channels, [
      '@DreamOnlineMMO',
      '@UntilNoKidInNeed',
      '@AIDreamTeamStudio'
    ]);
    assert.deepEqual(data.worker.allowed_female_voices, [
      'Aoede',
      'Kore',
      'af_heart',
      'af_bella',
      'LFM3-Omni-2B'
    ]);
    assert.equal(data.worker.omniroute_url, 'http://192.168.0.15:20128/v1');
    assert.equal(data.worker.ollama_url, 'http://127.0.0.1:11434');
    assert.equal(data.worker.mission_control_url, 'http://192.168.0.15:3130/live');
    assert.equal(data.worker.revenue_policy.founder_percentage, 90);
    assert.equal(data.worker.revenue_policy.charity_deduction_ceiling_percentage, 10);
  });
});

test('2. Natural female voices ONLY: approves Aoede, Kore, af_heart, af_bella, LFM3-Omni-2B and rejects pyttsx3, espeak, SAPI, robotic', () => {
  for (const voice of ['Aoede', 'Kore', 'af_heart', 'af_bella', 'LFM3-Omni-2B']) {
    const res = validateSabretoothVoice({ voice });
    assert.equal(res.voiceName, voice);
    assert.equal(res.profile.gender, 'female');
  }

  for (const banned of ['pyttsx3', 'espeak', 'sapi', 'Windows SAPI', 'sam', 'robotic-default']) {
    assert.throws(
      () => validateSabretoothVoice({ engine: banned, voice: 'Aoede' }),
      /BANNED_ROBOTIC_TTS_ENGINE/
    );
  }

  assert.throws(
    () => validateSabretoothVoice({ engine: 'gemini-2.5-flash-preview-tts', voice: 'RoboticMaleBot' }),
    /BANNED_ROBOTIC_TTS_ENGINE|UNAPPROVED_GEMINI_VOICE/
  );
});

test('3. Hard Shorts duration gate (45.0s-58.5s target, <= 59.0s ceiling) enforced across @DreamOnlineMMO, @UntilNoKidInNeed, @AIDreamTeamStudio', async () => {
  for (const channel of SABRETOOTH_WORKER_CONFIG.channels) {
    const valid = await validateAndPrepareShort({
      channel,
      title: `${channel} Spotlight | Built with Google Gemini`,
      description: '100% in-house DREAM-Engine and AI engineering. Built with Google Gemini.',
      scriptText: 'Welcome to the latest update built with Google Gemini.',
      duration_us: 52_000_000,
      voice: 'Aoede',
      method: 'youtube-data-api-v3',
      approved: true,
      synthesizeDryRun: true,
      apiKey: 'AIzaSySecretKeyNeverEcho1234567890'
    });
    assert.equal(valid.ok, true);
    assert.equal(valid.channelHandle, channel);
    assert.equal(valid.withinTargetWindow, true);
    assert.equal(valid.durationSeconds, 52.0);
    assert.equal(valid.apiKeyMasked, 'XXXX');
    assert.equal(valid.ttsDryRun.apiKeyMasked, 'XXXX');
  }

  await assert.rejects(
    () =>
      validateAndPrepareShort({
        channel: '@DreamOnlineMMO',
        duration_us: 58_800_000,
        voice: 'Kore',
        method: 'youtube-data-api-v3',
        approved: true
      }),
    /SHORTS_TARGET_CAP_EXCEEDED/
  );

  await assert.rejects(
    () =>
      validateAndPrepareShort({
        channel: '@UntilNoKidInNeed',
        duration_us: 59_500_000,
        voice: 'af_heart',
        method: 'youtube-data-api-v3',
        approved: true
      }),
    /SHORTS_ALGORITHM_CEILING_EXCEEDED/
  );
});

test('4. YouTube Data API v3 compliance & cross-surface isolation: blocks Playwright, Puppeteer, Selenium, scrapers, unapproved posts, and 18+ affiliate leaks', async () => {
  for (const forbidden of ['playwright', 'puppeteer', 'selenium', 'unofficial-scraper']) {
    await assert.rejects(
      () =>
        validateAndPrepareShort({
          channel: '@DreamOnlineMMO',
          duration_us: 50_000_000,
          voice: 'Aoede',
          method: forbidden,
          approved: true
        }),
      /FORBIDDEN_UNOFFICIAL_AUTOMATION/
    );
  }

  await assert.rejects(
    () =>
      validateAndPrepareShort({
        channel: '@DreamOnlineMMO',
        duration_us: 50_000_000,
        voice: 'Aoede',
        method: 'youtube-data-api-v3',
        approved: false
      }),
    /HUMAN_APPROVAL_REQUIRED/
  );

  await assert.rejects(
    () =>
      validateAndPrepareShort({
        channel: '@DreamOnlineMMO',
        title: 'Promo for https://youandinotai.com/register?ref=bot-slayer | Built with Google Gemini',
        duration_us: 50_000_000,
        voice: 'Aoede',
        method: 'youtube-data-api-v3',
        approved: true
      }),
    /CROSS_SURFACE_ISOLATION_VIOLATION/
  );
});

test('5. POST /api/dry-run-timeline and POST /api/strike-drafts handle 4-hour social strikes, Musa e-waste hooks, LeadForge ($29/$99), copy rules, and XXXX secret masking', async () => {
  await withWorkerServer(async (baseUrl) => {
    // Timeline dry-run endpoint
    const timelineRes = await fetch(`${baseUrl}/api/dry-run-timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voice: 'LFM3-Omni-2B',
        duration_us: 50_000_000,
        apiKey: 'AIzaSyFakeSecretShouldMask',
        words: [
          { text: 'Dream', position_us: 0, duration_us: 400_000 },
          { text: 'Online', position_us: 450_000, duration_us: 450_000 }
        ]
      })
    });
    assert.equal(timelineRes.status, 200);
    const timelineJson = await timelineRes.json();
    assert.equal(timelineJson.ok, true);
    assert.equal(timelineJson.plan.voice, 'LFM3-Omni-2B');
    assert.equal(timelineJson.apiKeyMasked, 'XXXX');

    // 4-Hour Strike Drafts endpoint (Starter $29 and Pro $99)
    const strikeRes = await fetch(`${baseUrl}/api/strike-drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'pro',
        leads: [
          {
            email: 'ops@acme-ewaste.com',
            consent: true,
            intent: 'corporate_pickup',
            follow_up_requested: true
          },
          {
            email: 'creator@verified-dating.org',
            consent: true,
            intent: 'partnership',
            follow_up_requested: false
          }
        ],
        secrets: {
          api_key: 'sk-super-secret-value-do-not-print-123456'
        }
      })
    });
    assert.equal(strikeRes.status, 200);
    const strikeJson = await strikeRes.json();
    assert.equal(strikeJson.ok, true);
    assert.equal(strikeJson.schedule.interval_hours, 4);
    assert.equal(strikeJson.schedule.llm_cost_usd, 0);
    assert.equal(strikeJson.schedule.routing.omniroute_url, 'http://192.168.0.15:20128/v1');
    assert.equal(strikeJson.schedule.routing.ollama_url, 'http://127.0.0.1:11434');
    assert.equal(strikeJson.schedule.routing.adult_18_plus_model, 'joshlcoleman/Fable');

    // Verify Reddit & 18+ Discord 50% lifetime affiliate promos for youandinotai.com
    assert.equal(strikeJson.social.model, 'joshlcoleman/Fable');
    assert.equal(strikeJson.social.auto_post, false);
    assert.equal(strikeJson.social.manual_review_required, true);
    assert.ok(strikeJson.social.isolation.includes('no_youtube'));
    assert.ok(strikeJson.social.isolation.includes('no_dream_online'));
    assert.ok(strikeJson.social.drafts.some((d) => d.surface === 'discord_verified_18_plus'));
    assert.ok(strikeJson.social.drafts.some((d) => d.surface === 'r/Tinder' && /50%/.test(d.body)));

    // Verify Instagram & Facebook e-waste intake hooks for Musa's onlinerecycle.net lane
    assert.deepEqual(strikeJson.musa.channels, ['instagram', 'facebook']);
    assert.equal(strikeJson.musa.cards[0].url, 'https://onlinerecycle.net/');
    assert.equal(strikeJson.musa.auto_post, false);

    // Verify LeadForge ($29/$99) scoring
    assert.equal(strikeJson.leadforge.tier.price_usd_per_month, 99);
    assert.equal(strikeJson.leadforge.scored[0].score, 100);
    assert.equal(strikeJson.leadforge.scored[0].routed_to, 'recycling');
    assert.equal(strikeJson.leadforge.scored[1].score, 80);
    assert.equal(strikeJson.leadforge.scored[1].routed_to, 'dating');

    // Verify secret redaction
    assert.equal(strikeJson.secrets_masked.api_key, 'XXXX');

    // Verify customer-facing copy rejects charity/donation/Shriners wording
    const badCopyRes = await fetch(`${baseUrl}/api/strike-drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        copy: 'Sign up today to support our charity donation fundraiser for Shriners.'
      })
    });
    assert.equal(badCopyRes.status, 400);
    const badCopyJson = await badCopyRes.json();
    assert.match(badCopyJson.error, /Customer-facing copy may not include mission or charity wording/);
  });
});
