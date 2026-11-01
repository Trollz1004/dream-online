import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const homeDir = os.homedir();
const stageRoot = fs.existsSync('C:\\DREAM\\org-plugins-staging')
  ? 'C:\\DREAM\\org-plugins-staging'
  : 'C:\\Ai-Dream-Team\\org-plugins-staging';

const claudeDir = path.join(homeDir, '.claude');
const pluginsDir = path.join(claudeDir, 'plugins');
const cacheRoot = path.join(pluginsDir, 'cache', 'antigravity-org-plugins');
const marketRoot = path.join(pluginsDir, 'marketplaces', 'antigravity-org-plugins');
const nowIso = new Date().toISOString();

fs.mkdirSync(cacheRoot, { recursive: true });
fs.mkdirSync(path.join(marketRoot, 'plugins'), { recursive: true });
fs.mkdirSync(path.join(marketRoot, '.claude-plugin'), { recursive: true });

function parseJsonSafe(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  let raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  try {
    return JSON.parse(raw);
  } catch (_) {
    // Fix unescaped single backslashes in Windows paths if present
    raw = raw.replace(/C:\\Users\\/g, 'C:\\\\Users\\\\');
    try {
      return JSON.parse(raw);
    } catch (e2) {
      return fallback;
    }
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.name.endsWith('.json')) {
      const clean = fs.readFileSync(srcPath, 'utf8').replace(/^\uFEFF/, '');
      fs.writeFileSync(destPath, clean, 'utf8');
      fs.writeFileSync(srcPath, clean, 'utf8');
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

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
  // Rewrite manifest without BOM
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  const ver = manifest.version || '1.0.0';

  const destCache = path.join(cacheRoot, name, ver);
  copyDirRecursive(srcBundle, destCache);

  const destMarket = path.join(marketRoot, 'plugins', name);
  copyDirRecursive(srcBundle, destMarket);

  // Also strip BOM in C:\Program Files\Claude\org-plugins if accessible
  const orgPluginManifest = path.join('C:\\Program Files\\Claude\\org-plugins', name, '.claude-plugin', 'plugin.json');
  try {
    if (fs.existsSync(orgPluginManifest)) {
      fs.writeFileSync(orgPluginManifest, JSON.stringify(manifest, null, 2), 'utf8');
    }
  } catch (_) {}

  const key = `${name}@antigravity-org-plugins`;
  pluginsMap[key] = [
    {
      scope: 'user',
      installPath: destCache,
      version: ver,
      installedAt: nowIso,
      lastUpdated: nowIso,
      gitCommitSha: 'c8cfbdb6b4b7e0fe34351ccac39a212646529c89'
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
settings.enabledPlugins = Object.assign({}, settings.enabledPlugins || {}, enabledMap);
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

console.log(`SUCCESS: Installed & enabled ${Object.keys(enabledMap).length} Claude plugins in ${pluginsDir}`);
