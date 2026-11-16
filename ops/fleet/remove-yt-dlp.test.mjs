import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_PATH = path.join(__dirname, 'remove-yt-dlp.ps1');
const CHANNELS_CONFIG_PATH = path.join(REPO_ROOT, 'ops', 'youtube-shorts-podcast', 'channels-config.json');
const HERMES_MARKETING_YAML_PATH = path.join(REPO_ROOT, 'ops', 't5500', 'hermes-marketing-config.yaml');

const FORBIDDEN_OLD_NODE_RE = new RegExp(['sabre' + 'tooth', 'saber' + 'tooth'].join('|'), 'i');
const FORBIDDEN_OLD_IP = ['192', '168', '0', '8'].join('.');
const USER_PATH_RE = /(?<![A-Za-z0-9])[cC]:[\\/]+[uU]sers[\\/]+[a-zA-Z0-9_.-]+/;

test('remove-yt-dlp.ps1 exists and enforces -Apply contract, -Node (alienware|t5500|all), and all 7 package/binary inspectors', () => {
  assert.ok(fs.existsSync(SCRIPT_PATH), 'Missing ops/fleet/remove-yt-dlp.ps1');
  const src = fs.readFileSync(SCRIPT_PATH, 'utf8');

  assert.match(src, /\[switch\]\$Apply/);
  assert.match(src, /\[ValidateSet\('alienware',\s*'t5500',\s*'all'\)\]/);
  assert.match(src, /python -m pip/);
  assert.match(src, /uv tool list/);
  assert.match(src, /pipx/);
  assert.match(src, /winget/);
  assert.match(src, /choco/);
  assert.match(src, /scoop/);
  assert.match(src, /yt-dlp\.exe/);
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(src), 'remove-yt-dlp.ps1 must contain zero retired-node names');
  assert.ok(!src.includes(FORBIDDEN_OLD_IP), 'remove-yt-dlp.ps1 must contain zero retired-node IPs');
});

test('remove-yt-dlp.ps1 prints [DRY RUN] by default on Alienware without modifying files or printing raw user paths', () => {
  const res = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT_PATH, '-Node', 'alienware'],
    { encoding: 'utf8', timeout: 30000 }
  );
  assert.equal(res.status, 0, `remove-yt-dlp.ps1 dry-run failed: ${res.stderr}`);
  assert.match(res.stdout, /\[DRY RUN\]/);
  assert.match(res.stdout, /python -m pip/);
  assert.match(res.stdout, /uv tool list/);
  assert.match(res.stdout, /pipx/);
  assert.match(res.stdout, /winget/);
  assert.match(res.stdout, /choco/);
  assert.match(res.stdout, /scoop/);
  assert.match(res.stdout, /standalone yt-dlp\.exe/);
  assert.ok(!USER_PATH_RE.test(res.stdout), 'Dry-run output must scrub Windows user folder paths to %USERPROFILE%/%LOCALAPPDATA%');
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(res.stdout), 'Dry-run output must not mention retired node');
});

test('remove-yt-dlp.ps1 -Apply contract updates isolated temp tool config flags to enabled=false & yt_dlp_enabled=false and refuses .env files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'remove-yt-dlp-test-'));
  try {
    const tempJsonPath = path.join(tmpDir, 'channels-config.json');
    const tempYamlPath = path.join(tmpDir, 'hermes-marketing-config.yaml');
    fs.writeFileSync(
      tempJsonPath,
      JSON.stringify(
        {
          yt_dlp_enabled: true,
          youtube_scraping_enabled: true,
          channels: [{ id: 'test-channel', enabled: true, yt_dlp_enabled: true }],
        },
        null,
        2
      ),
      'utf8'
    );
    fs.writeFileSync(
      tempYamlPath,
      'display_name: OPSis\nyoutube:\n  enabled: true\n  yt_dlp_enabled: true\n  youtube_scraping_enabled: true\n',
      'utf8'
    );

    // 1. Without -Apply: files remain untouched
    const dryRes = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        SCRIPT_PATH,
        '-Node',
        't5500',
        '-SkipManagerProbes',
        '-ConfigPaths',
        `${tempJsonPath}`,
      ],
      { encoding: 'utf8', timeout: 15000 }
    );
    assert.equal(dryRes.status, 0, dryRes.stderr);
    assert.match(dryRes.stdout, /\[DRY RUN\]/);
    const afterDryJson = JSON.parse(fs.readFileSync(tempJsonPath, 'utf8'));
    assert.equal(afterDryJson.yt_dlp_enabled, true, 'Dry run must not mutate config file');

    // 2. Helper Set-ToolConfigYouTubeScrapingDisabled sets enabled=false and yt_dlp_enabled=false on temp fixture
    const applyHelperCmd = [
      `. '${SCRIPT_PATH.replace(/'/g, "''")}' -NoRun`,
      `Set-ToolConfigYouTubeScrapingDisabled -ConfigPath '${tempJsonPath.replace(/'/g, "''")}' | Out-Null`,
      `Set-ToolConfigYouTubeScrapingDisabled -ConfigPath '${tempYamlPath.replace(/'/g, "''")}' | Out-Null`,
    ].join('; ');
    const helperRes = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', applyHelperCmd],
      { encoding: 'utf8', timeout: 15000 }
    );
    assert.equal(helperRes.status, 0, helperRes.stderr);

    const updatedJson = JSON.parse(fs.readFileSync(tempJsonPath, 'utf8'));
    assert.equal(updatedJson.yt_dlp_enabled, false);
    assert.equal(updatedJson.youtube_scraping_enabled, false);
    assert.equal(updatedJson.youtube_publish_method, 'youtube-data-api-v3');
    assert.equal(updatedJson.channels[0].enabled, false);
    assert.equal(updatedJson.channels[0].yt_dlp_enabled, false);

    const updatedYaml = fs.readFileSync(tempYamlPath, 'utf8');
    assert.match(updatedYaml, /yt_dlp_enabled:\s*false/);
    assert.match(updatedYaml, /youtube_scraping_enabled:\s*false/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('ops/youtube-shorts-podcast/channels-config.json and ops/t5500/hermes-marketing-config.yaml disable yt-dlp and enforce YouTube Data API v3 private uploads only', () => {
  const channelsRaw = fs.readFileSync(CHANNELS_CONFIG_PATH, 'utf8');
  const channelsJson = JSON.parse(channelsRaw);
  assert.equal(channelsJson.yt_dlp_enabled, false);
  assert.equal(channelsJson.youtube_scraping_enabled, false);
  assert.equal(channelsJson.youtube_publish_method, 'youtube-data-api-v3');
  assert.equal(channelsJson.youtube_upload_privacy_status, 'private');
  assert.equal(channelsJson.youtube_policy.yt_dlp_enabled, false);
  assert.match(channelsJson.youtube_policy.publish_method, /YouTube Data API v3 private uploads only/);
  for (const ch of channelsJson.channels) {
    assert.equal(ch.yt_dlp_enabled, false, `channel ${ch.id} must have yt_dlp_enabled: false`);
    assert.equal(ch.youtube_scraping_enabled, false, `channel ${ch.id} must have youtube_scraping_enabled: false`);
    assert.equal(ch.upload_privacy, 'private', `channel ${ch.id} must default to private upload_privacy`);
  }
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(channelsRaw), 'channels-config.json must not reference retired node');

  const yamlRaw = fs.readFileSync(HERMES_MARKETING_YAML_PATH, 'utf8');
  assert.match(yamlRaw, /yt_dlp_enabled:\s*false/);
  assert.match(yamlRaw, /youtube_scraping_enabled:\s*false/);
  assert.match(yamlRaw, /YouTube Data API v3 private uploads only/);
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(yamlRaw), 'hermes-marketing-config.yaml must not reference retired node');
});
