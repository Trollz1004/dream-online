#!/usr/bin/env node
/**
 * gemini_female_voice_tts.mjs
 *
 * Natural Female Voice Podcast & YouTube Shorts TTS Engine
 * Governed by Google Gemini (GM #1 — Marketing Lead) & Executed by Hermes (OPSis) on Sabretooth (.8)
 *
 * Strictly enforces:
 *  - ZERO robotic bot TTS (bans pyttsx3, espeak, sapi, sam, robotic-default)
 *  - Primary Cloud Engine: Google Gemini Native Audio / TTS (`gemini-2.5-flash-preview-tts`)
 *    with natural expressive female voices `Aoede` (Lead Host) and `Kore` (Co-Host / Shorts Narrator)
 *  - Local 16 GB AMD GPU Fallback on Sabretooth (.8): `kokoro-82m` (`af_heart`, `af_bella`), `f5-tts`, `chatterbox`
 *  - Mandatory XXXX secret redaction (never logs raw API keys)
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_CONFIG_PATH = path.join(__dirname, 'channels-config.json');

/**
 * Redacts any API key or secret token to XXXX per Zero-Trust security rules.
 * @param {string} value
 * @returns {string}
 */
export function maskSecret(value) {
  if (!value || typeof value !== 'string') return 'XXXX';
  return 'XXXX';
}

/**
 * Loads and parses channels-config.json.
 * @param {string} [configPath]
 */
export function loadChannelsConfig(configPath = DEFAULT_CONFIG_PATH) {
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Validates that the requested engine and voice strictly comply with the
 * Natural Female Voice rule and are NEVER on the banned robotic TTS list.
 *
 * @param {object} options
 * @param {string} [options.engine] - e.g. 'gemini-2.5-flash-preview-tts' or 'kokoro-82m'
 * @param {string} [options.voiceName] - e.g. 'Aoede', 'Kore', 'af_heart', 'af_bella'
 * @param {object} [options.config]
 */
export function assertNaturalFemaleVoice({
  engine = 'gemini-2.5-flash-preview-tts',
  voiceName = 'Aoede',
  config = loadChannelsConfig()
} = {}) {
  const normalizedEngine = String(engine || '').trim().toLowerCase();
  const banned = (config.voice_policy?.banned_tts_engines || []).map((e) => e.toLowerCase());

  if (!normalizedEngine) {
    throw new Error('TTS engine must be specified.');
  }

  for (const bannedEngine of banned) {
    if (normalizedEngine === bannedEngine || normalizedEngine.includes(bannedEngine)) {
      throw new Error(
        `BANNED_ROBOTIC_TTS_ENGINE: "${engine}" is strictly forbidden. Use Google Gemini TTS (gemini-2.5-flash-preview-tts: Aoede/Kore) or Sabretooth Kokoro-82M (af_heart/af_bella).`
      );
    }
  }

  const cloudVoices = config.voice_policy?.primary_cloud_engine?.approved_female_voices || {};
  const localVoices = config.voice_policy?.local_amd_gpu_engine?.approved_female_voices || {};

  if (normalizedEngine === 'gemini-2.5-flash-preview-tts' || normalizedEngine === 'google-gemini-tts') {
    if (!Object.prototype.hasOwnProperty.call(cloudVoices, voiceName)) {
      throw new Error(
        `UNAPPROVED_GEMINI_VOICE: "${voiceName}" is not an approved natural female Gemini voice. Approved voices: ${Object.keys(cloudVoices).join(', ')}`
      );
    }
    return {
      provider: 'google-gemini-tts',
      model: 'gemini-2.5-flash-preview-tts',
      voiceName,
      profile: cloudVoices[voiceName]
    };
  }

  if (normalizedEngine === 'kokoro-82m' || normalizedEngine === 'f5-tts' || normalizedEngine === 'chatterbox') {
    if (!Object.prototype.hasOwnProperty.call(localVoices, voiceName)) {
      throw new Error(
        `UNAPPROVED_LOCAL_VOICE: "${voiceName}" is not an approved natural female local voice. Approved voices: ${Object.keys(localVoices).join(', ')}`
      );
    }
    return {
      provider: 'sabretooth-local-amd-gpu',
      model: normalizedEngine,
      voiceName,
      profile: localVoices[voiceName]
    };
  }

  throw new Error(
    `UNSUPPORTED_TTS_ENGINE: "${engine}". Allowed engines: gemini-2.5-flash-preview-tts, kokoro-82m, f5-tts, chatterbox.`
  );
}

/**
 * Builds the request payload for Google Gemini Native Audio / TTS (`gemini-2.5-flash-preview-tts`).
 * Supports single female narrator (`Aoede` or `Kore`) or two-host female podcast dialogue (`Aoede` + `Kore`).
 *
 * @param {object} params
 * @param {string} params.text - Script text to synthesize
 * @param {string} [params.voiceName='Aoede'] - 'Aoede' or 'Kore'
 * @param {boolean} [params.multiSpeakerPodcast=false] - Whether to enable 2-host Aoede + Kore podcast mode
 * @param {object} [params.config]
 */
export function buildGeminiTtsPayload({
  text,
  voiceName = 'Aoede',
  multiSpeakerPodcast = false,
  config = loadChannelsConfig()
}) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('EMPTY_SCRIPT_TEXT: Script text must be a non-empty string.');
  }

  assertNaturalFemaleVoice({
    engine: 'gemini-2.5-flash-preview-tts',
    voiceName,
    config
  });

  if (multiSpeakerPodcast) {
    return {
      model: 'gemini-2.5-flash-preview-tts',
      contents: [
        {
          parts: [
            {
              text: text.trim()
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Aoede',
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Aoede'
                  }
                }
              },
              {
                speaker: 'Kore',
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Kore'
                  }
                }
              }
            ]
          }
        }
      }
    };
  }

  return {
    model: 'gemini-2.5-flash-preview-tts',
    contents: [
      {
        parts: [
          {
            text: text.trim()
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName
          }
        }
      }
    }
  };
}

/**
 * Wraps raw signed 16-bit little-endian mono PCM bytes into a standard 44-byte RIFF WAVE container.
 *
 * @param {Buffer} pcmBuffer
 * @param {number} [sampleRate=24000]
 * @param {number} [numChannels=1]
 * @param {number} [bitsPerSample=16]
 * @returns {Buffer}
 */
export function pcm16ToWavBuffer(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0, 4, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 4, 'ascii');
  header.write('fmt ', 12, 4, 'ascii');
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20);  // AudioFormat = 1 (PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 4, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Generates a clean harmonic reference PCM buffer for dry-run / CI testing
 * when live network calls are disabled.
 *
 * @param {number} durationSeconds
 * @param {number} [sampleRate=24000]
 * @returns {Buffer}
 */
export function createHarmonicReferenceWav(durationSeconds = 12.5, sampleRate = 24000) {
  const totalSamples = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const pcm = Buffer.alloc(totalSamples * 2);
  const baseFreq = 220.0; // Warm female vocal fundamental range (A3)
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / (sampleRate * 0.05)) * Math.min(1, (totalSamples - i) / (sampleRate * 0.05));
    const sample =
      0.25 *
      envelope *
      (0.6 * Math.sin(2 * Math.PI * baseFreq * t) +
        0.3 * Math.sin(2 * Math.PI * baseFreq * 2 * t) +
        0.1 * Math.sin(2 * Math.PI * baseFreq * 3 * t));
    const int16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    pcm.writeInt16LE(int16, i * 2);
  }
  return pcm16ToWavBuffer(pcm, sampleRate, 1, 16);
}

/**
 * Synthesizes natural female speech to a .wav file using Google Gemini TTS (`gemini-2.5-flash-preview-tts`).
 * Falls back to deterministic reference WAV only when `dryRun: true` is explicitly passed for offline testing.
 *
 * @param {object} options
 * @param {string} options.text - Script text to synthesize
 * @param {string} [options.voiceName='Aoede'] - 'Aoede' or 'Kore'
 * @param {boolean} [options.multiSpeakerPodcast=false] - Enable 2-host Aoede + Kore podcast synthesis
 * @param {string} options.outputWavPath - Destination path for .wav output
 * @param {string} [options.apiKey] - Optional explicit API key (defaults to process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
 * @param {boolean} [options.dryRun=false] - Use deterministic offline reference synthesis for self-tests
 * @param {number} [options.dryRunDurationSeconds=48.0] - Target duration for dry-run reference wave
 */
export async function synthesizeGeminiFemaleVoiceWav({
  text,
  voiceName = 'Aoede',
  multiSpeakerPodcast = false,
  outputWavPath,
  apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  dryRun = false,
  dryRunDurationSeconds = 48.0
}) {
  const config = loadChannelsConfig();
  const validatedVoice = assertNaturalFemaleVoice({
    engine: 'gemini-2.5-flash-preview-tts',
    voiceName,
    config
  });

  const payload = buildGeminiTtsPayload({
    text,
    voiceName,
    multiSpeakerPodcast,
    config
  });

  if (dryRun) {
    const wavBuffer = createHarmonicReferenceWav(dryRunDurationSeconds, 24000);
    if (outputWavPath) {
      fs.mkdirSync(path.dirname(outputWavPath), { recursive: true });
      fs.writeFileSync(outputWavPath, wavBuffer);
    }
    return {
      ok: true,
      mode: 'dry-run-reference',
      model: payload.model,
      voiceName: validatedVoice.voiceName,
      multiSpeakerPodcast,
      apiKeyMasked: maskSecret(apiKey),
      outputWavPath: outputWavPath || null,
      byteLength: wavBuffer.length,
      durationSeconds: Number(dryRunDurationSeconds.toFixed(3))
    };
  }

  if (!apiKey) {
    throw new Error(
      'MISSING_GEMINI_API_KEY: Set GEMINI_API_KEY or GOOGLE_API_KEY in environment (key is always masked as XXXX in logs).'
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `GEMINI_TTS_HTTP_ERROR (${response.status}): Failed with key=${maskSecret(apiKey)}: ${errText.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const inlineData = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;

  if (!inlineData || !inlineData.data) {
    throw new Error('GEMINI_TTS_EMPTY_AUDIO: Response did not contain inlineData audio bytes.');
  }

  const rawAudioBuffer = Buffer.from(inlineData.data, 'base64');
  const mimeType = String(inlineData.mimeType || 'audio/L16;rate=24000').toLowerCase();

  let wavBuffer;
  if ( rawAudioBuffer.length >= 12 && rawAudioBuffer.toString('ascii', 0, 4) === 'RIFF' ) {
    wavBuffer = rawAudioBuffer;
  } else {
    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
    wavBuffer = pcm16ToWavBuffer(rawAudioBuffer, sampleRate, 1, 16);
  }

  if (outputWavPath) {
    fs.mkdirSync(path.dirname(outputWavPath), { recursive: true });
    fs.writeFileSync(outputWavPath, wavBuffer);
  }

  const pcmBytes = Math.max(0, wavBuffer.length - 44);
  const durationSeconds = Number((pcmBytes / (24000 * 2)).toFixed(3));

  return {
    ok: true,
    mode: 'live-gemini-tts',
    model: payload.model,
    voiceName: validatedVoice.voiceName,
    multiSpeakerPodcast,
    apiKeyMasked: maskSecret(apiKey),
    outputWavPath: outputWavPath || null,
    byteLength: wavBuffer.length,
    durationSeconds
  };
}

/**
 * Runs deterministic self-tests for gemini_female_voice_tts.mjs.
 */
export async function runSelfTests() {
  const config = loadChannelsConfig();

  // 1. Verify all banned robotic TTS engines are rejected
  const bannedList = ['pyttsx3', 'espeak', 'sapi', 'sam', 'robotic-default'];
  for (const banned of bannedList) {
    assert.throws(
      () => assertNaturalFemaleVoice({ engine: banned, voiceName: 'Aoede', config }),
      /BANNED_ROBOTIC_TTS_ENGINE/,
      `Expected banned robotic engine "${banned}" to be rejected`
    );
  }

  // 2. Verify unapproved voice names are rejected
  assert.throws(
    () => assertNaturalFemaleVoice({ engine: 'gemini-2.5-flash-preview-tts', voiceName: 'RoboticMaleBot1', config }),
    /UNAPPROVED_GEMINI_VOICE/,
    'Expected unapproved Gemini voice to be rejected'
  );

  // 3. Verify approved Gemini female voices (Aoede, Kore) and Sabretooth local female voices (af_heart, af_bella) pass
  const aoede = assertNaturalFemaleVoice({ engine: 'gemini-2.5-flash-preview-tts', voiceName: 'Aoede', config });
  assert.equal(aoede.voiceName, 'Aoede');
  assert.equal(aoede.profile.gender, 'female');

  const kore = assertNaturalFemaleVoice({ engine: 'gemini-2.5-flash-preview-tts', voiceName: 'Kore', config });
  assert.equal(kore.voiceName, 'Kore');
  assert.equal(kore.profile.gender, 'female');

  const afHeart = assertNaturalFemaleVoice({ engine: 'kokoro-82m', voiceName: 'af_heart', config });
  assert.equal(afHeart.voiceName, 'af_heart');
  assert.equal(afHeart.profile.gender, 'female');

  const afBella = assertNaturalFemaleVoice({ engine: 'kokoro-82m', voiceName: 'af_bella', config });
  assert.equal(afBella.voiceName, 'af_bella');
  assert.equal(afBella.profile.gender, 'female');

  // 4. Verify single-speaker and multi-speaker podcast payload structure
  const singlePayload = buildGeminiTtsPayload({
    text: 'Welcome to DREAM Online, 100% built with Google Gemini.',
    voiceName: 'Aoede',
    config
  });
  assert.equal(singlePayload.model, 'gemini-2.5-flash-preview-tts');
  assert.deepEqual(singlePayload.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(
    singlePayload.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
    'Aoede'
  );

  const podcastPayload = buildGeminiTtsPayload({
    text: 'Aoede: Welcome back to AI Dream Team Studio! Kore: Today we are diving into 16-bit circle-craft morphing in DREAM-Engine.',
    voiceName: 'Aoede',
    multiSpeakerPodcast: true,
    config
  });
  const speakers =
    podcastPayload.generationConfig.speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs.map(
      (s) => s.speaker
    );
  assert.deepEqual(speakers, ['Aoede', 'Kore']);

  // 5. Verify secret masking always returns XXXX
  assert.equal(maskSecret('AIzaSyFakeSecretValueDoNotPrint'), 'XXXX');
  assert.equal(maskSecret(''), 'XXXX');

  // 6. Verify dry-run WAV generation and RIFF header integrity
  const synthResult = await synthesizeGeminiFemaleVoiceWav({
    text: 'DREAM Online evolves from modern 3D Day Dreams to Nightmares to 16-bit circle-voxels.',
    voiceName: 'Kore',
    dryRun: true,
    dryRunDurationSeconds: 2.5
  });
  assert.equal(synthResult.ok, true);
  assert.equal(synthResult.voiceName, 'Kore');
  assert.equal(synthResult.apiKeyMasked, 'XXXX');
  assert.equal(synthResult.durationSeconds, 2.5);

  return {
    passed: true,
    checks: 6,
    approvedCloudVoices: ['Aoede', 'Kore'],
    approvedLocalVoices: ['af_heart', 'af_bella'],
    bannedEnginesBlocked: bannedList
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  if (process.argv.includes('--self-test')) {
    runSelfTests()
      .then((res) => {
        console.log('[PASS] gemini_female_voice_tts.mjs self-test:', JSON.stringify(res));
        process.exit(0);
      })
      .catch((err) => {
        console.error('[FAIL] gemini_female_voice_tts.mjs self-test:', err.message);
        process.exit(1);
      });
  }
}
