import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DREAM_STUDIO_CLEAN_ROOM_ROLES,
  validateGameStudiosHarnessIsolation,
  routeTaskToDreamAgent,
} from './dream-task-router.ts';

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
