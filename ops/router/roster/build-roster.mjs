#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(THIS_DIR, '..', '..', '..');
const DEFAULT_EXCLUDE_FILE = join(THIS_DIR, 'exclude.json');

const NON_DIVISION_DIRS = new Set([
  '.git',
  '.github',
  'examples',
  'integrations',
  'scripts',
  'strategy',
  'node_modules',
]);

const SKILL_HELPER_DIRS = new Set([
  '.git',
  '.github',
  'node_modules',
  'references',
  'reference',
  'scripts',
  'assets',
  'templates',
  'examples',
  'data',
  'agents',
]);

const KNOWN_DESIGN_COMPANIONS = [
  'ui-ux-pro-max',
  'the 21st.dev designer',
  'motion',
  'impeccable',
  'humanizer',
  'the judges',
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(pattern) {
  const parts = String(pattern)
    .split('*')
    .map((segment) => escapeRegExp(segment));
  return new RegExp(`^${parts.join('.*')}$`, 'i');
}

export function loadExcludeMatcher(excludeInput = DEFAULT_EXCLUDE_FILE) {
  let raw = excludeInput;
  if (typeof excludeInput === 'string') {
    raw = existsSync(excludeInput) ? JSON.parse(readFileSync(excludeInput, 'utf8')) : {};
  }

  const patterns = [];
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.patterns)) {
      for (const item of raw.patterns) {
        if (typeof item === 'string') patterns.push(item);
        else if (item && typeof item.pattern === 'string') patterns.push(item.pattern);
      }
    }
    if (raw.folders && typeof raw.folders === 'object') {
      for (const key of Object.keys(raw.folders)) {
        patterns.push(key);
      }
    }
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === 'string') patterns.push(item);
        else if (item && typeof item.pattern === 'string') patterns.push(item.pattern);
      }
    }
  }

  const regexes = patterns.map(globToRegExp);
  return function isExcluded(folderName) {
    const name = String(folderName || '');
    if (!name) return false;
    if (/RETIRED/i.test(name)) return true;
    return regexes.some((re) => re.test(name));
  };
}

export function parseFrontMatter(text) {
  const normalized = String(text || '').replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;

  const lines = match[1].split(/\r?\n/);
  const result = {};
  let currentKey = null;
  let currentMode = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      const rawVal = keyMatch[2].trim();
      if (rawVal === '>' || rawVal === '|') {
        currentMode = rawVal;
        result[currentKey] = '';
      } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        currentMode = null;
        result[currentKey] = rawVal
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      } else {
        currentMode = null;
        result[currentKey] = rawVal.replace(/^["']|["']$/g, '').trim();
      }
    } else if (currentKey && /^\s+/.test(line)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        if (!Array.isArray(result[currentKey])) result[currentKey] = [];
        result[currentKey].push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''));
      } else if (typeof result[currentKey] === 'string') {
        result[currentKey] = result[currentKey]
          ? `${result[currentKey]} ${trimmed.replace(/^["']|["']$/g, '')}`
          : trimmed.replace(/^["']|["']$/g, '');
      }
    } else {
      currentKey = null;
      currentMode = null;
    }
  }

  return result;
}

export function extractOneLineDescription(rawDescription, maxChars = 200) {
  if (!rawDescription || typeof rawDescription !== 'string') return '';
  const collapsed = rawDescription.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';

  // Match first sentence ending with '.', '!' or '?' followed by whitespace or end-of-string,
  // avoiding splits inside tokens like Node.js, 21st.dev, .glb, e.g., i.e.
  const sentenceMatch = collapsed.match(/^(.+?(?<!\be\.g|\bi\.e)[.!?])(?=\s|$)/i);
  const firstSentence = sentenceMatch ? sentenceMatch[1].trim() : collapsed;

  if (firstSentence.length <= maxChars) return firstSentence;
  return firstSentence.slice(0, maxChars).trimEnd();
}

export function extractCompanions(text, frontMatter) {
  const result = [];
  const seen = new Set();
  const add = (candidate) => {
    const cleaned = String(candidate || '')
      .trim()
      .replace(/^`|`$/g, '')
      .replace(/[.;,]+$/, '')
      .trim();
    if (!cleaned) return;
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      result.push(cleaned);
    }
  };

  if (frontMatter && frontMatter.companions) {
    if (Array.isArray(frontMatter.companions)) {
      frontMatter.companions.forEach(add);
    } else if (typeof frontMatter.companions === 'string') {
      frontMatter.companions
        .replace(/^\[|\]$/g, '')
        .split(/,|\band\b/i)
        .forEach(add);
    }
  }

  const normalized = String(text || '');
  const parts = normalized.split(/^##\s+Companions\s*\r?\n/m);
  if (parts.length > 1) {
    const section = parts[1].split(/^##\s+/m)[0] || '';
    for (const line of section.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('-')) continue;
      const bullet = trimmed.replace(/^-\s+/, '').trim();
      const colonIdx = bullet.indexOf(':');
      if (colonIdx !== -1) {
        const left = bullet.slice(0, colonIdx).trim();
        if (/^(when|for|if)\b/i.test(left)) {
          const right = bullet.slice(colonIdx + 1);
          for (const known of KNOWN_DESIGN_COMPANIONS) {
            if (right.includes(known)) add(known);
          }
          continue;
        }
        for (const piece of left.split(/,|\band\b/i)) {
          add(piece);
        }
      } else if (/also name\s+(.+)/i.test(bullet)) {
        const listStr = bullet.match(/also name\s+(.+)/i)[1];
        for (const piece of listStr.split(/,|\band\b/i)) {
          add(piece);
        }
      } else if (bullet.length <= 60) {
        for (const piece of bullet.split(/,|\band\b/i)) {
          add(piece);
        }
      }
    }
  }

  return result;
}

export function toPortableUserPath(targetPath, userProfile) {
  const resolvedTarget = resolve(targetPath);
  const resolvedProfile = resolve(userProfile || process.env.USERPROFILE || process.env.HOME || homedir());

  let out = resolvedTarget;
  if (out.toLowerCase().startsWith(resolvedProfile.toLowerCase())) {
    const suffix = out.slice(resolvedProfile.length).replace(/\//g, '\\');
    out = `%USERPROFILE%${suffix.startsWith('\\') ? suffix : `\\${suffix}`}`;
  } else {
    out = out.replace(/\//g, '\\');
  }

  // Scrub any Windows or POSIX user folder path that could remain
  out = out.replace(/[A-Za-z]:\\+[Uu]sers\\+[^\\]+/g, '%USERPROFILE%');
  out = out.replace(/^\\+home\\+[^\\]+/i, '%USERPROFILE%');
  out = out.replace(/^\\+Users\\+[^\\]+/i, '%USERPROFILE%');
  return out;
}

function buildEntryFromFile({ filePath, id, source, division, userProfile }) {
  const text = readFileSync(filePath, 'utf8');
  const fm = parseFrontMatter(text);
  const stem = basename(filePath, extname(filePath));
  const fallbackName =
    stem.toUpperCase() === 'SKILL' || stem.toUpperCase() === 'README'
      ? basename(dirname(filePath)) || stem
      : stem;
  const name = (fm && (fm.name || fm.title)) ? String(fm.name || fm.title).trim() : fallbackName;
  const description = fm && fm.description ? extractOneLineDescription(String(fm.description), 200) : '';
  const companions = extractCompanions(text, fm);

  const entry = {
    id,
    source,
    division,
    name,
    description,
    path: toPortableUserPath(filePath, userProfile),
  };

  if (companions.length > 0) {
    entry.companions = companions;
  }

  return entry;
}

function scanAgencyAgents(agencyAgentsDir, isExcluded, userProfile) {
  if (!agencyAgentsDir || !existsSync(agencyAgentsDir)) return [];
  const entries = [];
  const topDirs = readdirSync(agencyAgentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !NON_DIVISION_DIRS.has(d.name) && !isExcluded(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  for (const division of topDirs) {
    const divRoot = join(agencyAgentsDir, division);
    function walkDivision(currentDir) {
      const children = readdirSync(currentDir, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      for (const child of children) {
        if (child.name.startsWith('.')) continue;
        if (isExcluded(child.name)) continue;
        const full = join(currentDir, child.name);
        if (child.isDirectory()) {
          walkDivision(full);
        } else if (child.isFile() && child.name.toLowerCase().endsWith('.md')) {
          const id = basename(child.name, extname(child.name));
          entries.push(
            buildEntryFromFile({
              filePath: full,
              id,
              source: 'agency-agents',
              division,
              userProfile,
            }),
          );
        }
      }
    }
    walkDivision(divRoot);
  }

  return entries;
}

function scanSkillSource(skillRootDir, sourceName, isExcluded, userProfile) {
  if (!skillRootDir || !existsSync(skillRootDir)) return [];
  const entries = [];
  const topLevelEntries = readdirSync(skillRootDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const topLevelDirNames = new Set(
    topLevelEntries.filter((e) => e.isDirectory()).map((e) => e.name.toLowerCase()),
  );

  function walkSkillFolder(folderPath, relPrefix) {
    const skillMd = join(folderPath, 'SKILL.md');
    if (existsSync(skillMd)) {
      entries.push(
        buildEntryFromFile({
          filePath: skillMd,
          id: relPrefix,
          source: sourceName,
          division: 'skills',
          userProfile,
        }),
      );
    } else {
      const mdFiles = readdirSync(folderPath, { withFileTypes: true })
        .filter(
          (f) =>
            f.isFile() &&
            f.name.toLowerCase().endsWith('.md') &&
            !['house-note.md', 'changelog.md'].includes(f.name.toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const mdFile of mdFiles) {
        const stem = basename(mdFile.name, extname(mdFile.name));
        const id = stem.toLowerCase() === 'readme' ? relPrefix : `${relPrefix}/${stem}`;
        entries.push(
          buildEntryFromFile({
            filePath: join(folderPath, mdFile.name),
            id,
            source: sourceName,
            division: 'skills',
            userProfile,
          }),
        );
      }
    }

    const subDirs = readdirSync(folderPath, { withFileTypes: true })
      .filter(
        (d) =>
          d.isDirectory() &&
          !d.name.startsWith('.') &&
          !SKILL_HELPER_DIRS.has(d.name.toLowerCase()) &&
          !isExcluded(d.name),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const sub of subDirs) {
      walkSkillFolder(join(folderPath, sub.name), `${relPrefix}/${sub.name}`);
    }
  }

  for (const ent of topLevelEntries) {
    if (ent.name.startsWith('.')) continue;
    if (isExcluded(ent.name)) continue;

    // Skip the "skills/" mirror directory inside OneDrive AGENCY SKILLS when its children mirror top-level folders
    if (ent.isDirectory() && ent.name.toLowerCase() === 'skills') {
      const mirrorChildren = readdirSync(join(skillRootDir, ent.name), { withFileTypes: true }).filter((c) =>
        c.isDirectory(),
      );
      if (
        mirrorChildren.length > 0 &&
        mirrorChildren.every((c) => topLevelDirNames.has(c.name.toLowerCase()))
      ) {
        continue;
      }
    }

    const full = join(skillRootDir, ent.name);
    if (ent.isDirectory()) {
      if (SKILL_HELPER_DIRS.has(ent.name.toLowerCase())) continue;
      walkSkillFolder(full, ent.name);
    } else if (
      ent.isFile() &&
      ent.name.toLowerCase().endsWith('.md') &&
      !['agency-skills-index.md', 'readme.md'].includes(ent.name.toLowerCase())
    ) {
      const id = basename(ent.name, extname(ent.name));
      entries.push(
        buildEntryFromFile({
          filePath: full,
          id,
          source: sourceName,
          division: 'skills',
          userProfile,
        }),
      );
    }
  }

  return entries;
}

export function buildRoster(options = {}) {
  const userProfile = options.userProfile || process.env.USERPROFILE || process.env.HOME || homedir();
  const agencyAgentsDir =
    options.agencyAgentsDir ?? join(userProfile, 'antigravity', 'tools', 'agency-agents');
  const agencySkillsDir = options.agencySkillsDir ?? join(userProfile, 'OneDrive', 'AGENCY SKILLS');
  const repoSkillsDir = options.repoSkillsDir ?? join(REPO_ROOT, '.agents', 'skills');
  const excludeFile = options.excludeFile ?? DEFAULT_EXCLUDE_FILE;
  const outFile =
    options.outFile ?? join(userProfile, 'antigravity', '.fable-kitchen', 'roster', 'roster.json');

  const isExcluded = loadExcludeMatcher(excludeFile);

  const entries = [
    ...scanAgencyAgents(agencyAgentsDir, isExcluded, userProfile),
    ...scanSkillSource(agencySkillsDir, 'agency-skills', isExcluded, userProfile),
    ...scanSkillSource(repoSkillsDir, '.agents/skills', isExcluded, userProfile),
  ];

  if (outFile) {
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  }

  return entries;
}

export function summarizeRoster(entries, outFile) {
  const bySource = {};
  const byDivision = {};
  for (const e of entries) {
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    byDivision[e.division] = (byDivision[e.division] || 0) + 1;
  }
  const bytes = outFile && existsSync(outFile) ? statSync(outFile).size : Buffer.byteLength(JSON.stringify(entries, null, 2) + '\n', 'utf8');
  const kilobytes = Number((bytes / 1024).toFixed(2));
  return {
    total: entries.length,
    bytes,
    kilobytes,
    bySource,
    byDivision,
  };
}

const isCli =
  Boolean(process.argv[1]) && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  const userProfile = process.env.USERPROFILE || process.env.HOME || homedir();
  const outFile = join(userProfile, 'antigravity', '.fable-kitchen', 'roster', 'roster.json');
  const entries = buildRoster({ userProfile, outFile });
  const summary = summarizeRoster(entries, outFile);
  const sampleAgencyEntries = entries.filter((e) => e.source === 'agency-agents').slice(0, 10);

  console.log(
    JSON.stringify(
      {
        output: toPortableUserPath(outFile, userProfile),
        total: summary.total,
        bytes: summary.bytes,
        kilobytes: summary.kilobytes,
        bySource: summary.bySource,
        byDivision: summary.byDivision,
        sampleAgencyAgents: sampleAgencyEntries,
      },
      null,
      2,
    ),
  );
}
