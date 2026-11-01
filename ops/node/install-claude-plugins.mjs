import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const homeDir = os.homedir();

// 1. Fix agy CLI settings.json by removing "modelProvider": "gemini" so OAuth default backend works for Hermes & Joshua
const agySettingsPaths = [
  path.join(homeDir, '.gemini', 'antigravity-cli', 'settings.json'),
  path.join(homeDir, '.gemini', 'settings.json'),
  path.join(homeDir, '.gemini', 'antigravity', 'settings.json')
];

function parseJsonSafe(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  let raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  try {
    return JSON.parse(raw);
  } catch (_) {
    raw = raw.replace(/C:\\Users\\/g, 'C:\\\\Users\\\\');
    try {
      return JSON.parse(raw);
    } catch (e2) {
      return fallback;
    }
  }
}

for (const sp of agySettingsPaths) {
  if (fs.existsSync(sp)) {
    const data = parseJsonSafe(sp, {});
    if ('modelProvider' in data) {
      delete data.modelProvider;
      fs.writeFileSync(sp, JSON.stringify(data, null, 2), 'utf8');
      console.log(`FIXED agy OAuth: Removed "modelProvider" from ${sp}`);
    } else {
      console.log(`VERIFIED agy OAuth clean (no modelProvider): ${sp}`);
    }
  }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.name.endsWith('.json')) {
      const clean = fs.readFileSync(srcPath, 'utf8').replace(/^\uFEFF/, '');
      fs.writeFileSync(destPath, clean, 'utf8');
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const stageRoot = fs.existsSync('C:\\DREAM\\org-plugins-staging')
  ? 'C:\\DREAM\\org-plugins-staging'
  : 'C:\\Ai-Dream-Team\\org-plugins-staging';
fs.mkdirSync(stageRoot, { recursive: true });

// 2. Build dedicated "remake" plugin bundle (rubenhassid1/remake + redesign-existing-projects)
const remakeRepoSrc = fs.existsSync('C:\\DREAM\\Antigravity\\remake')
  ? 'C:\\DREAM\\Antigravity\\remake'
  : 'C:\\Ai-Dream-Team\\Antigravity\\remake';

if (fs.existsSync(remakeRepoSrc)) {
  const remakePluginSrc = path.join(remakeRepoSrc, 'plugins', 'remake');
  const remakeStageDir = path.join(stageRoot, 'remake');
  if (fs.existsSync(remakePluginSrc)) {
    copyDirRecursive(remakePluginSrc, remakeStageDir);
  }
  const remakeMetaDir = path.join(remakeStageDir, '.claude-plugin');
  fs.mkdirSync(remakeMetaDir, { recursive: true });
  fs.writeFileSync(
    path.join(remakeMetaDir, 'plugin.json'),
    JSON.stringify(
      {
        name: 'remake',
        version: '1.0.0',
        description:
          'Remake (github.com/rubenhassid1/remake) + Redesign Existing Projects: capture, freeze time, pixel-score, repair, and customize any website with a swap board.',
        repository: 'https://github.com/rubenhassid1/remake',
        author: { name: 'Ruben Hassid' }
      },
      null,
      2
    ),
    'utf8'
  );
  // Also include redesign-existing-projects skill inside remake bundle
  const redesignSrc = path.join(homeDir, '.claude', 'skills', 'redesign-existing-projects');
  if (fs.existsSync(redesignSrc)) {
    copyDirRecursive(redesignSrc, path.join(remakeStageDir, 'skills', 'redesign-existing-projects'));
  }
  // Sync remake skill into .agents/skills/remake and .claude/skills/remake
  const remakeSkillSrc = path.join(remakeStageDir, 'skills', 'remake');
  if (fs.existsSync(remakeSkillSrc)) {
    copyDirRecursive(remakeSkillSrc, path.join(homeDir, '.claude', 'skills', 'remake'));
    copyDirRecursive(remakeSkillSrc, path.join(homeDir, '.agents', 'skills', 'remake'));
    if (fs.existsSync('C:\\Users\\joshl\\antigravity\\DREAM-Engine\\.agents\\skills')) {
      copyDirRecursive(remakeSkillSrc, 'C:\\Users\\joshl\\antigravity\\DREAM-Engine\\.agents\\skills\\remake');
    }
  }
}

// 3. Build dedicated "rea" plugin bundle (morluto/rea reverse engineering suite)
const reaStageDir = path.join(stageRoot, 'rea');
const reaMetaDir = path.join(reaStageDir, '.claude-plugin');
fs.mkdirSync(reaMetaDir, { recursive: true });
fs.writeFileSync(
  path.join(reaMetaDir, 'plugin.json'),
  JSON.stringify(
    {
      name: 'rea',
      version: '1.0.0',
      description:
        'REA (github.com/morluto/rea) Reverse Engineering Suite: reverse-engineer-anything, rea-analysis-optimization, rea-changelog-update, rea-ci-tests-audit, and rea-tool-design.',
      repository: 'https://github.com/morluto/rea',
      author: { name: 'morluto' }
    },
    null,
    2
  ),
  'utf8'
);
for (const reaSkill of [
  'reverse-engineer-anything',
  'rea-analysis-optimization',
  'rea-changelog-update',
  'rea-ci-tests-audit',
  'rea-tool-design'
]) {
  const sPath = path.join(homeDir, '.claude', 'skills', reaSkill);
  if (fs.existsSync(sPath)) {
    copyDirRecursive(sPath, path.join(reaStageDir, 'skills', reaSkill));
    if (fs.existsSync('C:\\Users\\joshl\\antigravity\\DREAM-Engine\\.agents\\skills')) {
      copyDirRecursive(sPath, path.join('C:\\Users\\joshl\\antigravity\\DREAM-Engine\\.agents\\skills', reaSkill));
    }
  }
}

// 4. Register all staged bundles in .claude/plugins & settings.json
const claudeDir = path.join(homeDir, '.claude');
const pluginsDir = path.join(claudeDir, 'plugins');
const cacheRoot = path.join(pluginsDir, 'cache', 'antigravity-org-plugins');
const marketRoot = path.join(pluginsDir, 'marketplaces', 'antigravity-org-plugins');
const nowIso = new Date().toISOString();

fs.mkdirSync(cacheRoot, { recursive: true });
fs.mkdirSync(path.join(marketRoot, 'plugins'), { recursive: true });
fs.mkdirSync(path.join(marketRoot, '.claude-plugin'), { recursive: true });

const installedPath = path.join(pluginsDir, 'installed_plugins.json');
const existingInstalled = parseJsonSafe(installedPath, { version: 2, plugins: {} });

const pluginsMap = existingInstalled.plugins || {};
const enabledMap = {};
const marketCatalog = [];

for (const k of Object.keys(pluginsMap)) {
  enabledMap[k] = true;
}

for (const name of fs.readdirSync(stageRoot)) {
  const srcBundle = path.join(stageRoot, name);
  const manifestPath = path.join(srcBundle, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifestPath)) continue;
  const manifest = parseJsonSafe(manifestPath, { name, version: '1.0.0', description: '' });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  const ver = manifest.version || '1.0.0';

  const destCache = path.join(cacheRoot, name, ver);
  copyDirRecursive(srcBundle, destCache);

  const destMarket = path.join(marketRoot, 'plugins', name);
  copyDirRecursive(srcBundle, destMarket);

  // Also mount directly into C:\Program Files\Claude\org-plugins if writable
  try {
    const orgDir = path.join('C:\\Program Files\\Claude\\org-plugins', name);
    copyDirRecursive(srcBundle, orgDir);
  } catch (_) {}

  const key = `${name}@antigravity-org-plugins`;
  pluginsMap[key] = [
    {
      scope: 'user',
      installPath: destCache,
      version: ver,
      installedAt: nowIso,
      lastUpdated: nowIso,
      gitCommitSha: '1529b6f'
    }
  ];
  enabledMap[key] = true;
  marketCatalog.push({
    name,
    source: `./plugins/${name}`,
    description: manifest.description || ''
  });
}

fs.writeFileSync(
  path.join(marketRoot, '.claude-plugin', 'marketplace.json'),
  JSON.stringify(
    {
      name: 'antigravity-org-plugins',
      owner: { name: 'Joshua Coleman (Trollz1004)' },
      plugins: marketCatalog
    },
    null,
    2
  ),
  'utf8'
);

const knownPath = path.join(pluginsDir, 'known_marketplaces.json');
const known = parseJsonSafe(knownPath, {});
known['antigravity-org-plugins'] = {
  source: { source: 'directory', path: marketRoot },
  installLocation: marketRoot,
  lastUpdated: nowIso
};
known['remake'] = {
  source: { source: 'github', repo: 'rubenhassid1/remake' },
  installLocation: path.join(marketRoot, 'plugins', 'remake'),
  lastUpdated: nowIso
};
known['rea'] = {
  source: { source: 'github', repo: 'morluto/rea' },
  installLocation: path.join(marketRoot, 'plugins', 'rea'),
  lastUpdated: nowIso
};
fs.writeFileSync(knownPath, JSON.stringify(known, null, 2), 'utf8');

fs.writeFileSync(
  installedPath,
  JSON.stringify(
    {
      version: 2,
      plugins: pluginsMap
    },
    null,
    2
  ),
  'utf8'
);

const settingsPath = path.join(claudeDir, 'settings.json');
const settings = parseJsonSafe(settingsPath, {});
settings.extraKnownMarketplaces = settings.extraKnownMarketplaces || {};
settings.extraKnownMarketplaces['antigravity-org-plugins'] = {
  source: { source: 'directory', path: marketRoot }
};
settings.extraKnownMarketplaces['remake'] = {
  source: { source: 'github', repo: 'rubenhassid1/remake' }
};
settings.extraKnownMarketplaces['rea'] = {
  source: { source: 'github', repo: 'morluto/rea' }
};
settings.enabledPlugins = Object.assign({}, settings.enabledPlugins || {}, enabledMap);
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

console.log(`SUCCESS: Installed & enabled ${Object.keys(enabledMap).length} Claude plugins (including remake & rea)!`);
