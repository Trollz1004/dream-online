import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DREAM_STUDIO_CLEAN_ROOM_ROLES,
  validateGameStudiosHarnessIsolation,
  routeTaskToDreamAgent,
  JEV_JOB_CLASSES,
  type JevJobClass,
  profileTask,
  loadLaneTable,
  validateLaneTable,
  loadNewestWeeklyRanking,
  validateWeeklyRankingFile,
  validateWeeklyRankingFileOnDisk,
  DEFAULT_RANK_MODELS_PROMPT_PATH,
  parseQuotaCooldownHours,
  JevRouter,
  routeJevTask,
  clearColdLanes,
  DEFAULT_DECISIONS_LOG_PATH,
  readDecisionLog,
  type WeeklyRankingFile,
  AgyDispatchAdapter,
  FreeClaudeCodeDispatchAdapter,
  FREE_CLAUDE_CODE_NO_HTTP_NOTE,
  HermesDispatchAdapter,
  ConsoleCreditAdapter,
  type CommandExecRequest,
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  parsePrUrlFromOutput,
} from './dream-task-router.ts';

function assertSingleSentence(reason: string): void {
  assert.ok(reason.length > 10, 'Reason must be non-empty');
  assert.ok(reason.endsWith('.'), `Reason must end with a period: ${reason}`);
  const sentences = reason
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  assert.equal(
    sentences.length,
    1,
    `Expected exactly one sentence in reason, got ${sentences.length}: "${reason}"`
  );
}

test('Clean-Room Game Studios (:8082 Isolation) & Deterministic Task-to-Agent Router (REA + Remake 100% Yours)', () => {
  assert.ok(DREAM_STUDIO_CLEAN_ROOM_ROLES.length >= 3);
  for (const role of DREAM_STUDIO_CLEAN_ROOM_ROLES) {
    assert.equal(role.cleanRoomRemake100PercentYours, true);
    assert.equal(role.forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea, true);
    assert.deepEqual(role.rawClaudeCodeGameStudiosAllowedHarnesses, ['free-claude-code-8082']);
  }

  // Raw Claude-Code-Game-Studios allowed ONLY on Free Claude Code :8082, blocked on real Claude/Gemini
  const blockedRealClaude = validateGameStudiosHarnessIsolation({
    usingRawThirdPartyGameStudiosPrompts: true,
    targetHarnessId: 'claude-opus-5-5-ultrathink',
    remake100PercentYoursApplied: false,
    reaCleanRoomApplied: false,
  });
  assert.equal(blockedRealClaude.allowed, false);

  const allowedFreeClaude8082 = validateGameStudiosHarnessIsolation({
    usingRawThirdPartyGameStudiosPrompts: true,
    targetHarnessId: 'free-claude-code-8082',
    remake100PercentYoursApplied: false,
    reaCleanRoomApplied: false,
  });
  assert.equal(allowedFreeClaude8082.allowed, true);

  // Task-to-Agent Router routes YouTube/Podcast/Hermes tasks & escalates on 5-hour cap
  const podcastRoute = routeTaskToDreamAgent('Build Gemini SDK podcast radio female voice Aoede and Kore for Sabretooth Hermes YouTube Shorts');
  assert.equal(podcastRoute.category, 'youtube_podcast_leadgen');
  assert.equal(podcastRoute.selectedAgentId, 'gemini-4-argon-high');
  assert.equal(podcastRoute.cleanRoomProvenance, 'DREAM-TaskRouter-100PercentYours-REA');

  const cappedRoute = routeTaskToDreamAgent(
    'Review PR #60 and audit 30-line lean context router',
    { fiveHourCapReachedFor: ['claude-opus-5-5-ultrathink'] }
  );
  assert.equal(cappedRoute.selectedAgentId, 'gemini-4-argon-high');
  assert.ok(cappedRoute.escalationLadder.length >= 2);
});

test('Jev Task Profiler: classifies every one of the 10 fixed job classes with plain rules and a one-sentence reason', () => {
  const cases: Array<{
    expectedClass: JevJobClass;
    description: string;
    files?: string[];
    screenshotRequired?: boolean;
  }> = [
    {
      expectedClass: 'route',
      description: 'Route task and select a lane for incoming backlog item #42',
    },
    {
      expectedClass: 'mechanical',
      description: 'Fix typo and sort imports across configuration comments',
    },
    {
      expectedClass: 'code-bulk',
      description: 'Implement CRUD endpoints and write unit tests across src/api/handlers.ts',
    },
    {
      expectedClass: 'code-hard',
      description: 'Debug distributed state machine deadlock and race condition in concurrency lock',
    },
    {
      expectedClass: 'engine',
      description: 'Optimize WebGPU water terrain shader in src/shaders/ocean.wgsl and mesh raycast',
    },
    {
      expectedClass: 'design-visual',
      description: 'Redesign hero section layout in src/styles/hud.css with side-by-side screenshot for Eyes gate',
      screenshotRequired: true,
    },
    {
      expectedClass: 'research',
      description: 'Research and literature survey on WebRTC congestion control RFC whitepaper options',
    },
    {
      expectedClass: 'judge',
      description: 'AI lanes disagree on PR #61 architecture so Fable judge must issue final ruling',
    },
    {
      expectedClass: 'post-x',
      description: 'Draft and post to X a launch thread for today devlog update',
    },
    {
      expectedClass: 'youtube-upload',
      description: 'Upload to YouTube render/episode-04.mp4 via private YouTube Data API',
    },
  ];

  const seenClasses = new Set<JevJobClass>();
  for (const c of cases) {
    const profile = profileTask(c.description, {
      files: c.files,
      screenshotRequired: c.screenshotRequired,
    });
    assert.equal(
      profile.jobClass,
      c.expectedClass,
      `Expected "${c.description}" to classify as ${c.expectedClass}, got ${profile.jobClass}`
    );
    assertSingleSentence(profile.reason);
    seenClasses.add(profile.jobClass);
  }

  assert.deepEqual(
    Array.from(seenClasses).sort(),
    [...JEV_JOB_CLASSES].sort(),
    'Every one of the 10 fixed job classes must be covered'
  );
});

test('Jev Lane Table (ops/router/lanes.json): validates ladder, node/harness/headless/fallback, and shared agy Claude quota rule', () => {
  const table = loadLaneTable();
  const validation = validateLaneTable(table);
  assert.equal(validation.valid, true, validation.errors.join('; '));

  // Verify exact ladder assignments
  assert.equal(table.lanes.route.lane, 'gemini-3.8-flash');
  assert.equal(table.lanes.route.harness, 'agy');
  assert.equal(table.lanes.mechanical.lane, 'gemini-3.8-flash');
  assert.equal(table.lanes.mechanical.harness, 'agy');

  assert.equal(table.lanes['code-bulk'].lane, 'claude-sonnet-5-5');
  assert.equal(table.lanes['code-bulk'].harness, 'agy');
  assert.equal(table.lanes['code-bulk'].fallback, 'gemini-4-argon');

  assert.equal(table.lanes['code-hard'].lane, 'claude-opus-5-5');
  assert.equal(table.lanes['code-hard'].harness, 'agy');
  assert.equal(table.lanes['code-hard'].fallback, 'gemini-4-argon');

  assert.equal(table.lanes.engine.lane, 'gemini-4-argon');

  assert.equal(table.lanes['design-visual'].lane, 'claude-opus-5-5');
  assert.equal(table.lanes['design-visual'].fallback, 'gemini-4-argon');
  assert.equal(table.lanes['design-visual'].postGate, 'eyes');

  assert.equal(table.lanes.research.lane, 'claude-opus-5-5');
  assert.equal(table.lanes.research.fallback, 'gemini-4-argon');
  assert.equal(table.lanes.research.officialOnly, true);

  assert.equal(table.lanes.judge.lane, 'fable');
  assert.equal(table.lanes.judge.harness, 'claude-code-signed-in');
  assert.ok(table.lanes.judge.neverReceivesJobClasses.includes('route'));

  assert.equal(table.lanes['post-x'].lane, 'grok');
  assert.equal(table.lanes['post-x'].harness, 'hermes');

  assert.equal(table.lanes['youtube-upload'].lane, 'youtube-data-api');
  assert.equal(table.lanes['youtube-upload'].visibility, 'private');
  assert.equal(table.lanes['youtube-upload'].neverModel, true);

  // Every Claude row in agy must have a Gemini fallback and never another Claude lane
  for (const jobClass of JEV_JOB_CLASSES) {
    const row = table.lanes[jobClass];
    assert.equal(typeof row.node, 'string');
    assert.equal(typeof row.harness, 'string');
    assert.equal(typeof row.headless, 'boolean');
    assert.equal(typeof row.fallback, 'string');
    if (row.harness === 'agy' && row.lane.startsWith('claude-')) {
      assert.ok(
        row.fallback.startsWith('gemini-'),
        `Row ${jobClass} has Claude lane ${row.lane} in agy so fallback must be Gemini, got ${row.fallback}`
      );
    }
  }
});

test('Weekly ranking seven-day rule at six, seven, and eight days', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-router-7day-'));
  try {
    const now = new Date('2026-11-03T15:00:00Z');

    const writeRanking = (dirName: string, dateStr: string, customCodeHardLane: string): string => {
      const dir = path.join(tmpRoot, dirName);
      fs.mkdirSync(dir, { recursive: true });
      const rankingData: WeeklyRankingFile = {
        date: dateStr,
        generated_by: 'gemini-4-argon',
        classes: {
          'code-hard': {
            ranked: [customCodeHardLane, 'claude-opus-5-5'],
            lane: customCodeHardLane,
            reason: 'Weekly benchmark override for code-hard.',
            sources: ['ops/router/lanes.json'],
          },
        },
      };
      fs.writeFileSync(path.join(dir, `${dateStr}.json`), JSON.stringify(rankingData, null, 2), 'utf8');
      return dir;
    };

    // 1. Six days old (2026-10-28 vs 2026-11-03) -> fresh
    const dir6 = writeRanking('six-days', '2026-10-28', 'gemini-4-argon');
    const eval6 = loadNewestWeeklyRanking(dir6, now);
    assert.equal(eval6.ageInDays, 6);
    assert.equal(eval6.stale, false);
    const router6 = new JevRouter({
      rankingsDir: dir6,
      decisionsLogPath: path.join(dir6, 'decisions.log'),
    });
    const dec6 = router6.route('Fix race condition in distributed consensus protocol', { now });
    assert.equal(dec6.job_class, 'code-hard');
    assert.equal(dec6.lane, 'gemini-4-argon');
    assert.equal(dec6.stale_ranking, false);
    assert.equal(dec6.ranking_date, '2026-10-28');

    // 2. Seven days old (2026-10-27 vs 2026-11-03) -> still within 7 days (not older than seven days) -> fresh
    const dir7 = writeRanking('seven-days', '2026-10-27', 'gemini-4-argon');
    const eval7 = loadNewestWeeklyRanking(dir7, now);
    assert.equal(eval7.ageInDays, 7);
    assert.equal(eval7.stale, false);
    const router7 = new JevRouter({
      rankingsDir: dir7,
      decisionsLogPath: path.join(dir7, 'decisions.log'),
    });
    const dec7 = router7.route('Fix race condition in distributed consensus protocol', { now });
    assert.equal(dec7.job_class, 'code-hard');
    assert.equal(dec7.lane, 'gemini-4-argon');
    assert.equal(dec7.stale_ranking, false);
    assert.equal(dec7.ranking_date, '2026-10-27');

    // 3. Eight days old (2026-10-26 vs 2026-11-03) -> older than seven days -> stale fallback to lanes.json
    const dir8 = writeRanking('eight-days', '2026-10-26', 'gemini-4-argon');
    const eval8 = loadNewestWeeklyRanking(dir8, now);
    assert.equal(eval8.ageInDays, 8);
    assert.equal(eval8.stale, true);
    assert.equal(eval8.statusNote, 'stale ranking, default ladder');
    const router8 = new JevRouter({
      rankingsDir: dir8,
      decisionsLogPath: path.join(dir8, 'decisions.log'),
    });
    const dec8 = router8.route('Fix race condition in distributed consensus protocol', { now });
    assert.equal(dec8.job_class, 'code-hard');
    assert.equal(dec8.lane, 'claude-opus-5-5'); // default ladder from lanes.json
    assert.equal(dec8.stale_ranking, true);
    assert.equal(dec8.ranking_status, 'stale ranking, default ladder');
    assert.ok(dec8.reason.includes('stale ranking, default ladder'));
    assert.ok(dec8.ranking_date.includes('stale ranking, default ladder'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Rule that judge never receives a route task or the router own routing decisions', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-router-judge-guard-'));
  try {
    const now = new Date('2026-11-03T16:00:00Z');
    const rankingsDir = path.join(tmpRoot, 'rankings');
    fs.mkdirSync(rankingsDir, { recursive: true });

    // Even if a ranking file attempts to assign route -> fable, the router refuses
    const badRanking: WeeklyRankingFile = {
      date: '2026-11-03',
      generated_by: 'test',
      classes: {
        route: {
          ranked: ['fable'],
          lane: 'fable',
          reason: 'Attempted bad route to judge.',
          sources: ['test'],
        },
      },
    };
    fs.writeFileSync(path.join(rankingsDir, '2026-11-03.json'), JSON.stringify(badRanking), 'utf8');

    const router = new JevRouter({
      rankingsDir,
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
    });

    const decision = router.route(
      'Route task and pick a lane for this routing decision even if AI lanes disagree or ask judge',
      { now, requestedTargetLane: 'fable' }
    );

    assert.equal(decision.job_class, 'route');
    assert.notEqual(decision.lane, 'fable');
    assert.equal(decision.lane, 'gemini-3.8-flash');
    assert.equal(decision.harness, 'agy');
    assert.ok(decision.reason.includes('never receives a route task'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Quota and 429 cold-lane fallback with shared agy Claude quota and secret-free decision log', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-router-quota-'));
  try {
    const now = new Date('2026-11-03T18:00:00Z');
    const logPath = path.join(tmpRoot, 'decisions.log');
    const router = new JevRouter({ decisionsLogPath: logPath });

    // Verify hour parsing (explicit hours vs default 24h)
    assert.equal(parseQuotaCooldownHours('HTTP 429 Too Many Requests: retry in 5 hours'), 5);
    assert.equal(parseQuotaCooldownHours('HTTP 429 quota exceeded'), 24);

    // Report a 5-hour quota error on claude-opus-5-5 in agy
    const report = router.reportQuotaError(
      'claude-opus-5-5',
      'HTTP 429 quota exceeded for 5 hours',
      now
    );
    assert.equal(report.hours, 5);
    assert.equal(report.quotaGroup, 'agy-claude');
    assert.deepEqual(report.affectedLanes.sort(), ['claude-opus-5-5', 'claude-sonnet-5-5']);

    // Both claude-opus-5-5 AND claude-sonnet-5-5 are now cold because they share one agy quota
    assert.equal(router.isLaneCold('claude-opus-5-5', now), true);
    assert.equal(router.isLaneCold('claude-sonnet-5-5', now), true);
    // Gemini lanes in agy have a separate quota and stay warm
    assert.equal(router.isLaneCold('gemini-4-argon', now), false);
    assert.equal(router.isLaneCold('gemini-3.8-flash', now), false);

    // Routing a code-hard task falls back from claude-opus-5-5 to gemini-4-argon
    const hardDecision = router.route(
      'Fix concurrency deadlock in state machine protocol design',
      { now }
    );
    assert.equal(hardDecision.job_class, 'code-hard');
    assert.equal(hardDecision.lane, 'gemini-4-argon');
    assert.equal(hardDecision.quota_fallback, true);
    assert.ok(hardDecision.reason.includes('Quota fallback: claude-opus-5-5'));
    assert.ok(hardDecision.cold_lanes['claude-opus-5-5']);
    assert.ok(hardDecision.cold_lanes['claude-sonnet-5-5']);

    // Routing a code-bulk task ALSO falls back from claude-sonnet-5-5 to gemini-4-argon (shared agy-claude quota)
    const bulkDecision = router.route(
      'Implement CRUD endpoints and write tests across src/services/orders.ts',
      { now }
    );
    assert.equal(bulkDecision.job_class, 'code-bulk');
    assert.equal(bulkDecision.lane, 'gemini-4-argon');
    assert.equal(bulkDecision.quota_fallback, true);
    assert.ok(bulkDecision.reason.includes('Quota fallback: claude-sonnet-5-5'));

    // Report a 429 without explicit hours on grok -> defaults to 24 hours cold
    const fakeSecretValue = ['sk', 'redactiontest999999'].join('-');
    const grokReport = router.reportQuotaError(
      'grok',
      `HTTP 429 rate limit reached with token=${fakeSecretValue}`,
      now
    );
    assert.equal(grokReport.hours, 24);
    const postXDecision = router.route(
      `Post to X our new release announcement thread with token=${fakeSecretValue}`,
      { now, extraSecretsToRedact: [fakeSecretValue] }
    );
    assert.equal(postXDecision.job_class, 'post-x');
    assert.equal(postXDecision.lane, 'gemini-3.8-flash');
    assert.equal(postXDecision.quota_fallback, true);

    // Advance clock by 6 hours: 5-hour agy-claude cooldown has expired, 24-hour grok cooldown is still active
    const sixHoursLater = new Date(now.getTime() + 6 * 3_600_000);
    assert.equal(router.isLaneCold('claude-opus-5-5', sixHoursLater), false);
    assert.equal(router.isLaneCold('claude-sonnet-5-5', sixHoursLater), false);
    assert.equal(router.isLaneCold('grok', sixHoursLater), true);

    const warmedHardDecision = router.route(
      'Fix concurrency deadlock in state machine protocol design',
      { now: sixHoursLater }
    );
    assert.equal(warmedHardDecision.lane, 'claude-opus-5-5');
    assert.equal(warmedHardDecision.quota_fallback, false);

    // Verify decisions.log entries and secret redaction
    const logged = readDecisionLog(logPath);
    assert.equal(logged.length, 4);
    const rawLogText = fs.readFileSync(logPath, 'utf8');
    assert.ok(!rawLogText.includes(fakeSecretValue));
    for (const entry of logged) {
      assert.equal(typeof entry.task_hash, 'string');
      assert.equal(entry.task_hash.length, 16);
      assert.ok(JEV_JOB_CLASSES.includes(entry.job_class));
      assert.equal(typeof entry.lane, 'string');
      assert.equal(typeof entry.reason, 'string');
      assert.equal(typeof entry.ranking_date, 'string');
      assert.equal(typeof entry.cold_lanes, 'object');
    }

    // Verify default routeJevTask appends to ops/router/decisions.log
    clearColdLanes();
    const defaultDecision = routeJevTask('Optimize WebGPU shader in src/shaders/terrain.wgsl', {
      now: new Date('2026-11-03T19:00:00Z'),
    });
    assert.equal(defaultDecision.job_class, 'engine');
    assert.equal(defaultDecision.lane, 'gemini-4-argon');
    assert.ok(fs.existsSync(DEFAULT_DECISIONS_LOG_PATH));
    const defaultLogEntries = readDecisionLog(DEFAULT_DECISIONS_LOG_PATH);
    assert.ok(defaultLogEntries.length >= 1);
    assert.equal(defaultLogEntries[defaultLogEntries.length - 1].task_hash, defaultDecision.task_hash);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});


test('Recipe 7 Item 1: Dispatch adapters for agy (.fable-kitchen + single quotes + --print=), Free Claude Code (outbox paste-only), and Hermes on Sabretooth (scp + ssh hermes -z, never scraping)', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-router-adapters-'));
  try {
    // 1. agy adapter test
    const kitchenDir = path.join(tmpRoot, '.fable-kitchen');
    const agyCalls: CommandExecRequest[] = [];
    const agyAdapter = new AgyDispatchAdapter({
      kitchenDir,
      runner: async (req) => {
        agyCalls.push(req);
        return {
          exitCode: 0,
          stdout: 'Opened pull request https://github.com/Trollz1004/dream-online/pull/71 successfully.',
          stderr: '',
        };
      },
    });

    const agyHandle = await agyAdapter.dispatch({
      jobId: 'test-agy-01',
      prompt: 'Fix "double quoted" title in src/api/items.ts and open a PR',
      jobClass: 'code-bulk',
      lane: 'claude-sonnet-5-5',
      harness: 'agy',
    });

    assert.equal(agyHandle.adapter, 'agy');
    assert.ok(agyHandle.promptPath.startsWith(kitchenDir));
    assert.ok(agyHandle.logPath?.startsWith(kitchenDir));
    // Verify double quotes replaced by single quotes before the call
    assert.ok(!agyHandle.sanitizedPrompt.includes('"'));
    assert.ok(agyHandle.sanitizedPrompt.includes("'double quoted'"));
    assert.equal(fs.readFileSync(agyHandle.promptPath, 'utf8'), agyHandle.sanitizedPrompt);
    // Verify agy.exe invocation flags
    assert.equal(agyCalls.length, 1);
    assert.equal(agyCalls[0].command, 'agy.exe');
    assert.ok(agyCalls[0].args.includes('--model'));
    assert.ok(agyCalls[0].args.includes('claude-sonnet-5-5'));
    assert.ok(agyCalls[0].args.includes('--dangerously-skip-permissions'));
    assert.ok(agyCalls[0].args.some((a) => a === `--print=${agyHandle.sanitizedPrompt}`));

    const agyPoll = await agyHandle.poll();
    assert.equal(agyPoll.done, true);
    assert.equal(agyPoll.prUrl, 'https://github.com/Trollz1004/dream-online/pull/71');
    assert.ok(fs.existsSync(agyHandle.logPath!));

    // 2. Free Claude Code adapter test (outbox paste-ready file + handle says no HTTP way to start a session)
    const outboxDir = path.join(tmpRoot, 'outbox');
    const fccAdapter = new FreeClaudeCodeDispatchAdapter({ outboxDir });
    const fccHandle = await fccAdapter.dispatch({
      jobId: 'test-fcc-01',
      prompt: 'Scaffold clean-room game studio role tests',
      jobClass: 'code-bulk',
      lane: 'claude-sonnet-5-5',
      harness: 'free-claude-code',
    });

    assert.equal(fccHandle.adapter, 'free-claude-code');
    assert.equal(fccHandle.mode, 'outbox-paste-only');
    assert.equal(fccHandle.httpSessionSupported, false);
    assert.ok(fccHandle.note.includes('no HTTP way to start a code session'));
    assert.equal(fccHandle.note, FREE_CLAUDE_CODE_NO_HTTP_NOTE);
    assert.ok(fs.existsSync(fccHandle.promptPath));
    const fccFileText = fs.readFileSync(fccHandle.promptPath, 'utf8');
    assert.ok(fccFileText.includes('no HTTP way to start a code session'));
    assert.ok(fccFileText.includes('Scaffold clean-room game studio role tests'));

    // 3. Hermes on Sabretooth adapter test (scp first, then ssh sabretooth hermes -z, never scraping)
    const hermesStagingDir = path.join(tmpRoot, 'hermes-staging');
    const hermesCalls: CommandExecRequest[] = [];
    const hermesAdapter = new HermesDispatchAdapter({
      stagingDir: hermesStagingDir,
      runner: async (req) => {
        hermesCalls.push(req);
        if (req.command === 'scp') {
          return { exitCode: 0, stdout: '', stderr: '' };
        }
        return {
          exitCode: 0,
          stdout: 'Drafted thread and opened https://github.com/Trollz1004/ANTIGRAVITY/pull/340',
          stderr: '',
        };
      },
    });

    const hermesHandle = await hermesAdapter.dispatch({
      jobId: 'test-hermes-01',
      prompt: 'Draft launch announcement "v1" for X',
      jobClass: 'post-x',
      lane: 'grok',
      harness: 'hermes',
    });

    assert.equal(hermesCalls.length, 2);
    assert.equal(hermesCalls[0].command, 'scp');
    assert.ok(hermesCalls[0].args[1].startsWith('sabretooth:'));
    assert.equal(hermesCalls[1].command, 'ssh');
    assert.deepEqual(hermesCalls[1].args, [
      'sabretooth',
      'hermes',
      '-z',
      '--query-file',
      '~/.fable-kitchen/test-hermes-01.txt',
    ]);

    const hermesPoll = await hermesHandle.poll();
    assert.equal(hermesPoll.done, true);
    assert.equal(hermesPoll.prUrl, 'https://github.com/Trollz1004/ANTIGRAVITY/pull/340');

    // Verify Hermes adapter rejects injected jobId, traversal jobId, and unknown jobClass
    await assert.rejects(
      () =>
        hermesAdapter.dispatch({
          jobId: 'job_1; id',
          prompt: 'Draft launch announcement for X',
          jobClass: 'post-x',
          lane: 'grok',
          harness: 'hermes',
        }),
      /invalid jobId/i
    );

    await assert.rejects(
      () =>
        hermesAdapter.dispatch({
          jobId: '../traversal-job',
          prompt: 'Draft launch announcement for X',
          jobClass: 'post-x',
          lane: 'grok',
          harness: 'hermes',
        }),
      /invalid jobId|stagingDir/i
    );

    await assert.rejects(
      () =>
        hermesAdapter.dispatch({
          jobId: 'valid-job-02',
          prompt: 'Draft launch announcement for X',
          jobClass: 'not-a-valid-class' as any,
          lane: 'grok',
          harness: 'hermes',
        }),
      /unknown jobClass/i
    );

    // Verify Hermes adapter refuses any scraping command
    await assert.rejects(
      () =>
        hermesAdapter.dispatch({
          prompt: 'Run yt-dlp to scrape-youtube channel videos',
          jobClass: 'post-x',
          lane: 'grok',
          harness: 'hermes',
        }),
      /never scrapes/i
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Recipe 7 Item 2 & 5a: A job routed, dispatched, returned without a PR, re-queued once, then failed', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-router-requeue-noprl-'));
  try {
    const router = new JevRouter({
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
    });

    const receivedPrompts: string[] = [];
    const mockAdapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        receivedPrompts.push(input.prompt);
        return {
          jobId: `mock-nopr-${receivedPrompts.length}`,
          adapter: 'agy',
          lane: input.lane,
          harness: input.harness,
          promptPath: path.join(tmpRoot, `prompt-${receivedPrompts.length}.txt`),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock dispatch without PR URL',
          poll: async () => ({
            done: true,
            prUrl: null,
            output: `Finished coding attempt #${receivedPrompts.length} but forgot to open a pull request.`,
            exitCode: 0,
          }),
        };
      },
    };

    const outcome = await router.dispatchAndJudge(
      'Implement CRUD endpoints across src/services/inventory.ts',
      {
        now: new Date('2026-11-03T20:00:00Z'),
        adapter: mockAdapter,
      }
    );

    assert.equal(outcome.ok, false);
    assert.equal(outcome.status, 'failed');
    assert.equal(outcome.prUrl, null);
    assert.equal(outcome.requeued, true);
    assert.equal(outcome.requeueCount, 1);
    assert.equal(outcome.attempts.length, 2);
    assert.equal(receivedPrompts.length, 2);
    // Second prompt must carry the appended failure reason from the first attempt
    assert.ok(receivedPrompts[1].includes('missing PR URL in lane output'));
    assert.ok(outcome.failureReason?.includes('missing PR URL in lane output'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Recipe 7 Item 2 & 5b: A design-visual job returned with a FAIL Eyes gate report is marked failed and re-queued once', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-router-design-fail-'));
  try {
    const router = new JevRouter({
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
    });

    const promptsSeen: string[] = [];
    const mockDesignAdapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        promptsSeen.push(input.prompt);
        const output = [
          'FAIL · Eyes gate v1 · average 2.85 of 5 · lowest 2 (Contrast and legibility) · hero-hud',
          'Opened PR https://github.com/Trollz1004/dream-online/pull/88',
        ].join('\n');
        return {
          jobId: `mock-design-${promptsSeen.length}`,
          adapter: 'agy',
          lane: input.lane,
          harness: input.harness,
          promptPath: path.join(tmpRoot, `design-${promptsSeen.length}.txt`),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock design dispatch with FAIL Eyes report',
          poll: async () => ({
            done: true,
            prUrl: parsePrUrlFromOutput(output),
            output,
            exitCode: 0,
            eyesReportFirstLine:
              'FAIL · Eyes gate v1 · average 2.85 of 5 · lowest 2 (Contrast and legibility) · hero-hud',
          }),
        };
      },
    };

    const outcome = await router.dispatchAndJudge(
      'Redesign hero section layout in src/styles/hud.css with side-by-side screenshot for Eyes gate',
      {
        now: new Date('2026-11-03T20:15:00Z'),
        screenshotRequired: true,
        adapter: mockDesignAdapter,
      }
    );

    assert.equal(outcome.finalDecision.job_class, 'design-visual');
    assert.equal(outcome.ok, false);
    assert.equal(outcome.status, 'failed');
    assert.equal(outcome.requeued, true);
    assert.equal(outcome.requeueCount, 1);
    assert.equal(outcome.attempts.length, 2);
    assert.ok(promptsSeen[1].includes('Eyes gate report did not pass'));
    assert.ok(outcome.failureReason?.includes('FAIL · Eyes gate v1'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Recipe 7 Item 2 & 5c: A lane returning 429 marks the lane cold through reportQuotaError and routes the retry to the fallback lane', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-router-429-retry-'));
  try {
    const now = new Date('2026-11-03T20:30:00Z');
    const router = new JevRouter({
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
    });

    const dispatchedLanes: string[] = [];
    const mock429ThenFallbackAdapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        dispatchedLanes.push(input.lane);
        const isFirstCallOnClaude = input.lane === 'claude-opus-5-5';
        const output = isFirstCallOnClaude
          ? 'Error: HTTP 429 Too Many Requests: quota exceeded for 5 hours on claude-opus-5-5'
          : 'Completed on fallback lane and opened https://github.com/Trollz1004/dream-online/pull/92';

        return {
          jobId: `mock-429-${dispatchedLanes.length}`,
          adapter: 'agy',
          lane: input.lane,
          harness: input.harness,
          promptPath: path.join(tmpRoot, `job-${dispatchedLanes.length}.txt`),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock 429 then fallback',
          poll: async () => ({
            done: true,
            prUrl: parsePrUrlFromOutput(output),
            output,
            exitCode: isFirstCallOnClaude ? 1 : 0,
          }),
        };
      },
    };

    const outcome = await router.dispatchAndJudge(
      'Fix concurrency deadlock and race condition in distributed state machine',
      {
        now,
        adapter: mock429ThenFallbackAdapter,
      }
    );

    assert.equal(outcome.ok, true);
    assert.equal(outcome.status, 'passed');
    assert.equal(outcome.quotaFallbackTriggered, true);
    assert.deepEqual(dispatchedLanes, ['claude-opus-5-5', 'gemini-4-argon']);
    assert.equal(outcome.finalDecision.lane, 'gemini-4-argon');
    assert.equal(outcome.finalDecision.quota_fallback, true);
    assert.equal(outcome.prUrl, 'https://github.com/Trollz1004/dream-online/pull/92');
    // Both claude-opus-5-5 and claude-sonnet-5-5 are marked cold via shared agy-claude quota
    assert.equal(router.isLaneCold('claude-opus-5-5', now), true);
    assert.equal(router.isLaneCold('claude-sonnet-5-5', now), true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Recipe 7 Item 3 & 5d: Console-credit adapter refuses to run when disabled (ROUTER_CONSOLE_ENABLED=false), refuses routing decisions, enforces daily cap, and logs token count when enabled', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-router-console-'));
  try {
    const logPath = path.join(tmpRoot, 'decisions.log');
    let fetchCallCount = 0;
    const fakeKey = ['sk-ant-console', 'testonly987654321'].join('-');

    const mockFetch = async () => {
      fetchCallCount += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ type: 'text', text: 'PASS: PR URL and output verified.' }],
          usage: { input_tokens: 120, output_tokens: 30 },
        }),
        text: async () => 'PASS',
      };
    };

    // 1. Refuses to run when ROUTER_CONSOLE_ENABLED=false (default)
    const disabledAdapter = new ConsoleCreditAdapter({
      env: {
        ROUTER_CONSOLE_ENABLED: 'false',
        ROUTER_CONSOLE_DAILY_CAP: '5',
        CLAUDE_CONSOLE_KEY: fakeKey,
      },
      decisionsLogPath: logPath,
      fetchImpl: mockFetch,
    });
    assert.equal(disabledAdapter.isEnabled(), false);
    await assert.rejects(
      () =>
        disabledAdapter.runJudgeTextCheck({
          prompt: 'Verify PR URL in output',
          purpose: 'judge-text-check',
        }),
      /ROUTER_CONSOLE_ENABLED=false/
    );
    assert.equal(fetchCallCount, 0);

    // 2. When enabled, still refuses to run for routing decisions
    const enabledAdapter = new ConsoleCreditAdapter({
      env: {
        ROUTER_CONSOLE_ENABLED: 'true',
        ROUTER_CONSOLE_DAILY_CAP: '1',
        CLAUDE_CONSOLE_KEY: fakeKey,
      },
      decisionsLogPath: logPath,
      fetchImpl: mockFetch,
    });
    await assert.rejects(
      () =>
        enabledAdapter.runJudgeTextCheck({
          prompt: 'Pick a lane for this task',
          purpose: 'route',
          jobClass: 'route',
        }),
      /never used for routing decisions/
    );
    assert.equal(fetchCallCount, 0);

    // 3. Runs once for judge-text-check when enabled, logs token count to decisions.log, and never leaks the key
    const now = new Date('2026-11-03T21:00:00Z');
    const checkResult = await enabledAdapter.runJudgeTextCheck({
      prompt: 'Check judge output for PR #70',
      purpose: 'judge-text-check',
      jobClass: 'judge',
      now,
    });
    assert.equal(checkResult.passed, true);
    assert.equal(checkResult.inputTokens, 120);
    assert.equal(checkResult.outputTokens, 30);
    assert.equal(checkResult.totalTokens, 150);
    assert.equal(fetchCallCount, 1);

    const logged = readDecisionLog(logPath);
    assert.equal(logged.length, 1);
    assert.equal(logged[0].lane, 'console-credit');
    assert.equal(logged[0].token_count, 150);
    assert.deepEqual(logged[0].console_tokens, {
      input_tokens: 120,
      output_tokens: 30,
      total_tokens: 150,
    });
    const rawLog = fs.readFileSync(logPath, 'utf8');
    assert.ok(!rawLog.includes(fakeKey));

    // 4. Second call on the same day exceeds ROUTER_CONSOLE_DAILY_CAP=1 and is refused
    await assert.rejects(
      () =>
        enabledAdapter.runJudgeTextCheck({
          prompt: 'Second check on same day',
          purpose: 'judge-text-check',
          jobClass: 'judge',
          now,
        }),
      /daily call cap \(1\) reached/
    );
    assert.equal(fetchCallCount, 1);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Recipe 7 Item 4: Weekly ranking prompt file ops/router/rank-models.md and validator rejecting missing sources or bad date', () => {
  // Verify ops/router/rank-models.md exists and instructs live Fable or Argon sessions
  assert.ok(fs.existsSync(DEFAULT_RANK_MODELS_PROMPT_PATH));
  const promptText = fs.readFileSync(DEFAULT_RANK_MODELS_PROMPT_PATH, 'utf8');
  assert.ok(promptText.includes('Fable'));
  assert.ok(promptText.includes('Argon'));
  assert.ok(promptText.includes('ops/router/rankings/<YYYY-MM-DD>.json'));

  // Verify existing ops/router/rankings/2026-11-03.json passes on-disk validation
  const currentRankingPath = path.join(path.dirname(DEFAULT_RANK_MODELS_PROMPT_PATH), 'rankings', '2026-11-03.json');
  const validDiskCheck = validateWeeklyRankingFileOnDisk(currentRankingPath, { requireAllClasses: true });
  assert.equal(validDiskCheck.valid, true, validDiskCheck.errors.join('; '));

  // Reject a ranking file with no sources
  const noSourcesRanking: WeeklyRankingFile = {
    date: '2026-11-03',
    generated_by: 'fable',
    classes: {
      'code-hard': {
        ranked: ['claude-opus-5-5', 'gemini-4-argon'],
        lane: 'claude-opus-5-5',
        reason: 'Missing sources test.',
        sources: [],
      },
    },
  };
  const noSourcesResult = validateWeeklyRankingFile(noSourcesRanking);
  assert.equal(noSourcesResult.valid, false);
  assert.ok(noSourcesResult.errors.some((e) => e.includes('no sources')));

  // Reject a ranking file with a bad date (invalid calendar date or non-ISO format)
  const badDateRanking: WeeklyRankingFile = {
    date: '2026-02-30',
    generated_by: 'gemini-4-argon',
    classes: {
      engine: {
        ranked: ['gemini-4-argon'],
        lane: 'gemini-4-argon',
        reason: 'Bad calendar date test.',
        sources: ['ops/router/lanes.json'],
      },
    },
  };
  const badDateResult = validateWeeklyRankingFile(badDateRanking);
  assert.equal(badDateResult.valid, false);
  assert.ok(badDateResult.errors.some((e) => e.includes('bad or missing date')));
});
