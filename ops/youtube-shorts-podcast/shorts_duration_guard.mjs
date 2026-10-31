#!/usr/bin/env node
/**
 * shorts_duration_guard.mjs
 *
 * Hard Algorithm Gate (`<= 59.0s`, target `45.0s-58.5s`), Multi-Channel Metadata Validator,
 * and 24/7 OPSis/Jarvis Live Stream Honesty Gate.
 *
 * Governed by Google Gemini (GM #1 — Marketing Lead) & Executed by Hermes (OPSis) on Sabretooth (.8).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  loadChannelsConfig,
  assertNaturalFemaleVoice,
  createHarmonicReferenceWav,
  runSelfTests as runTtsSelfTests
} from './gemini_female_voice_tts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parses exact audio duration in seconds from a RIFF WAVE buffer or file.
 *
 * @param {Buffer|string} wavInput - Buffer or file path to .wav file
 * @returns {number} Duration in seconds (rounded to 3 decimal places)
 */
export function parseWavDurationSeconds(wavInput) {
  const buf = Buffer.isBuffer(wavInput) ? wavInput : fs.readFileSync(wavInput);
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('INVALID_WAV_CONTAINER: Input is not a valid RIFF WAVE file.');
  }

  let offset = 12;
  let byteRate = 0;
  let dataBytes = 0;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === 'fmt ' && chunkSize >= 16 && chunkDataStart + 16 <= buf.length) {
      byteRate = buf.readUInt32LE(chunkDataStart + 8);
    } else if (chunkId === 'data') {
      dataBytes = chunkSize;
      break;
    }

    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (byteRate <= 0) {
    throw new Error('INVALID_WAV_FMT: Could not determine positive byteRate from fmt chunk.');
  }

  return Number((dataBytes / byteRate).toFixed(3));
}

/**
 * Probes media duration in seconds using RIFF WAVE header parsing first (for .wav)
 * or ffprobe if available on the system PATH.
 *
 * @param {string} filePath
 * @returns {number}
 */
export function probeMediaDurationSeconds(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.wav') {
    return parseWavDurationSeconds(filePath);
  }

  const probe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { encoding: 'utf8' }
  );

  if (probe.status === 0 && probe.stdout) {
    const parsed = Number.parseFloat(probe.stdout.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return Number(parsed.toFixed(3));
    }
  }

  throw new Error(`MEDIA_DURATION_PROBE_FAILED: Unable to probe duration for "${filePath}".`);
}

/**
 * Enforces the hard YouTube Shorts duration gate:
 *  - Hard ceiling: strictly <= 59.0s (never spills into 60s+)
 *  - Target cap: <= 58.5s (configured in channels-config.json)
 *  - Ideal retention window: 45.0s - 58.5s
 *
 * @param {number} durationSeconds
 * @param {object} [options]
 * @param {boolean} [options.strictTargetCap=true] - Enforce <= 58.5s target cap in addition to <= 59.0s ceiling
 * @param {object} [options.config]
 */
export function validateShortsDuration(
  durationSeconds,
  { strictTargetCap = true, config = loadChannelsConfig() } = {}
) {
  const gate = config.shorts_algorithm_gate || {};
  const minTarget = gate.min_target_duration_seconds ?? 45.0;
  const maxTarget = gate.max_duration_seconds ?? 58.5;
  const hardCeiling = gate.hard_algorithm_ceiling_seconds ?? 59.0;

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`INVALID_SHORTS_DURATION: Duration must be a positive number (received ${durationSeconds}).`);
  }

  if (durationSeconds > hardCeiling) {
    throw new Error(
      `SHORTS_ALGORITHM_CEILING_EXCEEDED: ${durationSeconds}s exceeds the hard YouTube Shorts ceiling of ${hardCeiling}s (would spill into 60s+ long-form shelf).`
    );
  }

  if (strictTargetCap && durationSeconds > maxTarget) {
    throw new Error(
      `SHORTS_TARGET_CAP_EXCEEDED: ${durationSeconds}s exceeds the safe target cap of ${maxTarget}s (hard ceiling ${hardCeiling}s). Trim audio/video before publishing.`
    );
  }

  return {
    ok: true,
    durationSeconds,
    withinTargetWindow: durationSeconds >= minTarget && durationSeconds <= maxTarget,
    minTargetSeconds: minTarget,
    maxTargetSeconds: maxTarget,
    hardCeilingSeconds: hardCeiling
  };
}

/**
 * Validates a complete multi-channel YouTube Short / Podcast episode package.
 *
 * @param {object} pkg
 * @param {string} pkg.channelId - 'dream-online-mmorpg' | 'until-no-kid-in-need' | 'ai-dream-team-studio'
 * @param {string} pkg.title
 * @param {string} pkg.description
 * @param {string} pkg.scriptText
 * @param {number} pkg.durationSeconds
 * @param {string} [pkg.voiceEngine='gemini-2.5-flash-preview-tts']
 * @param {string} [pkg.voiceName='Aoede']
 * @param {object} [pkg.config]
 */
export function validateChannelPackage({
  channelId,
  title,
  description,
  scriptText,
  durationSeconds,
  voiceEngine = 'gemini-2.5-flash-preview-tts',
  voiceName = 'Aoede',
  config = loadChannelsConfig()
}) {
  const channel = (config.channels || []).find((c) => c.id === channelId);
  if (!channel) {
    throw new Error(
      `UNKNOWN_CHANNEL_ID: "${channelId}". Valid channels: ${(config.channels || []).map((c) => c.id).join(', ')}`
    );
  }

  const combinedCopy = `${title || ''}\n${description || ''}\n${scriptText || ''}`;

  // 1. No Paperclip rule
  if (/paperclip/i.test(combinedCopy)) {
    throw new Error(
      'FORBIDDEN_PAPERCLIP_REFERENCE: Paperclip references are permanently banned. Google Gemini (GM #1) is Marketing Lead.'
    );
  }

  // 2. 100% In-House AI Engine truth check (never claim built in Unreal or Godot for DREAM-Engine)
  if (/built in unreal|powered by unreal|built in godot|powered by godot/i.test(combinedCopy)) {
    throw new Error(
      'FORBIDDEN_ENGINE_MISREPRESENTATION: DREAM Online runs on the 100% in-house AI-built DREAM-Engine (zero Unreal Engine, zero Godot).'
    );
  }

  // 3. 16-bit circle-voxel rule (cylinders/circles, never square Minecraft blocks)
  if (/square minecraft block/i.test(combinedCopy)) {
    throw new Error(
      'FORBIDDEN_VOXEL_GEOMETRY_CLAIM: RETRO_16BIT_CIRCLES uses 16-bit cylindrical/circle-voxels, never square Minecraft blocks.'
    );
  }

  // 4. Built with Google Gemini attribution check
  if (!/Built with Google Gemini/i.test(combinedCopy)) {
    throw new Error(
      'MISSING_GEMINI_ATTRIBUTION: Public package must proudly include "Built with Google Gemini".'
    );
  }

  // 5. Natural female voice validation (blocks pyttsx3, espeak, sapi, sam, robotic-default)
  const voiceValidation = assertNaturalFemaleVoice({
    engine: voiceEngine,
    voiceName,
    config
  });

  // 6. Hard Shorts duration gate (<= 58.5s target / <= 59.0s ceiling)
  const durationValidation = validateShortsDuration(durationSeconds, {
    strictTargetCap: true,
    config
  });

  return {
    ok: true,
    channelId: channel.id,
    channelName: channel.name,
    marketingLead: config.governance.marketing_lead,
    voice: voiceValidation,
    duration: durationValidation
  };
}

/**
 * Evaluates the 24/7 OPSis / Jarvis Mission Control Live Stream Honesty & Verification Gate.
 *
 * Rule:
 *  - Locked until AI verifiably helps fund the mission (`public_dao_wallet_tracking`,
 *    `onlinerecycle_ai_intake_verified`, or `dream_online_mtx_verified`).
 *  - Founder Joshua Coleman's personal out-of-pocket eBay donations to Shriners are NEVER
 *    counted as AI-generated funding.
 *
 * @param {object} [stateOverride]
 * @param {object} [config]
 */
export function evaluateOpsisStreamGate(stateOverride = {}, config = loadChannelsConfig()) {
  const gateConfig = {
    ...(config.opsis_24x7_stream_gate || {}),
    ...stateOverride
  };

  const hasVerifiedAiFunding = Boolean(
    gateConfig.public_dao_wallet_tracking ||
      gateConfig.onlinerecycle_ai_intake_verified ||
      gateConfig.dream_online_mtx_verified
  );

  if (!hasVerifiedAiFunding) {
    const reason = gateConfig.founder_personal_ebay_donation_only
      ? 'FOUNDER_PERSONAL_EBAY_DONATIONS_NOT_COUNTED_AS_AI_FUNDING'
      : 'AWAITING_VERIFIABLE_AI_FUNDING_PROOF';
    return {
      allowed: false,
      reason,
      verifiedSources: {
        public_dao_wallet_tracking: Boolean(gateConfig.public_dao_wallet_tracking),
        onlinerecycle_ai_intake_verified: Boolean(gateConfig.onlinerecycle_ai_intake_verified),
        dream_online_mtx_verified: Boolean(gateConfig.dream_online_mtx_verified)
      },
      policy: gateConfig.verification_policy
    };
  }

  return {
    allowed: true,
    reason: 'VERIFIED_AI_FUNDING_ACTIVE',
    verifiedSources: {
      public_dao_wallet_tracking: Boolean(gateConfig.public_dao_wallet_tracking),
      onlinerecycle_ai_intake_verified: Boolean(gateConfig.onlinerecycle_ai_intake_verified),
      dream_online_mtx_verified: Boolean(gateConfig.dream_online_mtx_verified)
    },
    policy: gateConfig.verification_policy
  };
}

/**
 * Runs all self-tests for shorts_duration_guard.mjs and gemini_female_voice_tts.mjs.
 */
export async function runSelfTests() {
  const ttsResults = await runTtsSelfTests();
  const config = loadChannelsConfig();

  // 1. Verify 3 specialized channels exist in config
  assert.equal(config.channels.length, 3);
  assert.equal(config.governance.paperclip_enabled, false);

  // 2. Verify WAV duration probing on a real temporary .wav file (52.4s <= 58.5s passes)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dream-shorts-guard-'));
  const validWavPath = path.join(tmpDir, 'short_52_4s.wav');
  const over60WavPath = path.join(tmpDir, 'short_60_2s.wav');
  try {
    fs.writeFileSync(validWavPath, createHarmonicReferenceWav(52.4, 24000));
    const probedValid = probeMediaDurationSeconds(validWavPath);
    assert.equal(probedValid, 52.4);
    const durCheck = validateShortsDuration(probedValid, { config });
    assert.equal(durCheck.ok, true);
    assert.equal(durCheck.withinTargetWindow, true);

    // 3. Verify > 59.0s (e.g. 60.2s) and > 58.5s (e.g. 58.8s) are strictly blocked
    fs.writeFileSync(over60WavPath, createHarmonicReferenceWav(60.2, 24000));
    const probedOver60 = probeMediaDurationSeconds(over60WavPath);
    assert.throws(
      () => validateShortsDuration(probedOver60, { config }),
      /SHORTS_ALGORITHM_CEILING_EXCEEDED/,
      '60.2s Short must be blocked by <= 59.0s ceiling'
    );
    assert.throws(
      () => validateShortsDuration(58.8, { strictTargetCap: true, config }),
      /SHORTS_TARGET_CAP_EXCEEDED/,
      '58.8s Short must be blocked by <= 58.5s target cap'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 4. Verify valid multi-channel package passes
  const validPkg = validateChannelPackage({
    channelId: 'dream-online-mmorpg',
    title: 'Day Dream to Nightmare to 16-Bit Circle-Craft! | Built with Google Gemini',
    description: '100% AI-built in-house DREAM-Engine evolving into RETRO_16BIT_CIRCLES cylindrical circle-voxels. Built with Google Gemini.',
    scriptText: 'Watch the world morph in real time from high-craft 3D Day Dream into Nightmare Crisis and 16-bit circle-craft.',
    durationSeconds: 54.0,
    voiceEngine: 'gemini-2.5-flash-preview-tts',
    voiceName: 'Aoede',
    config
  });
  assert.equal(validPkg.ok, true);
  assert.equal(validPkg.voice.voiceName, 'Aoede');

  // 5. Verify Paperclip reference is blocked
  assert.throws(
    () =>
      validateChannelPackage({
        channelId: 'ai-dream-team-studio',
        title: 'Managed by Paperclip | Built with Google Gemini',
        description: 'Built with Google Gemini',
        scriptText: 'Test script',
        durationSeconds: 50.0,
        voiceName: 'Kore',
        config
      }),
    /FORBIDDEN_PAPERCLIP_REFERENCE/
  );

  // 6. Verify 24/7 OPSis / Jarvis stream honesty gate
  const defaultGate = evaluateOpsisStreamGate({}, config);
  assert.equal(defaultGate.allowed, false);

  const personalEbayOnlyGate = evaluateOpsisStreamGate(
    { founder_personal_ebay_donation_only: true },
    config
  );
  assert.equal(personalEbayOnlyGate.allowed, false);
  assert.equal(
    personalEbayOnlyGate.reason,
    'FOUNDER_PERSONAL_EBAY_DONATIONS_NOT_COUNTED_AS_AI_FUNDING'
  );

  const verifiedDaoGate = evaluateOpsisStreamGate(
    { public_dao_wallet_tracking: true },
    config
  );
  assert.equal(verifiedDaoGate.allowed, true);
  assert.equal(verifiedDaoGate.reason, 'VERIFIED_AI_FUNDING_ACTIVE');

  return {
    passed: true,
    ttsSelfTests: ttsResults,
    channelsValidated: config.channels.map((c) => c.id),
    maxDurationTargetSeconds: config.shorts_algorithm_gate.max_duration_seconds,
    hardCeilingSeconds: config.shorts_algorithm_gate.hard_algorithm_ceiling_seconds,
    opsis24x7GateDefaultAllowed: defaultGate.allowed
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  if (process.argv.includes('--self-test')) {
    runSelfTests()
      .then((res) => {
        console.log('[PASS] shorts_duration_guard.mjs self-test:', JSON.stringify(res));
        process.exit(0);
      })
      .catch((err) => {
        console.error('[FAIL] shorts_duration_guard.mjs self-test:', err.message);
        process.exit(1);
      });
  }
}
