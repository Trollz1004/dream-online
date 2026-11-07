import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const HOUSE_MOTION_RULE_PATH = 'docs/house/HOUSE-MOTION-RULE.md';
export const HOUSE_MOTION_RULE_HEADER =
  'Canonical copy. The drop box copy is the draft; this file is what lanes read.';
export const HOUSE_MOTION_RULE_SHA256 =
  '823d60135160daa8f514e85622958063d3a8626eb3feffc1adeaaacc5f2c22e9';

export const VENDORED_SKILL_FOLDERS: readonly string[] = [
  '.agents/skills/hallmark',
  '.agents/skills/impeccable',
  '.agents/skills/security-audit',
];

export const VENDORED_UPSTREAM_FILES: readonly string[] = [
  '.agents/skills/hallmark/SKILL.md',
  '.agents/skills/hallmark/agents/openai.yaml',
  '.agents/skills/impeccable/SKILL.md',
  '.agents/skills/impeccable/agents/openai.yaml',
  '.agents/skills/security-audit/SKILL.md',
];


export const DEFINITION_GLOBS: readonly string[] = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'CODEX.md',
  'OPENCODE.md',
  'GROK.md',
  'GEMINI_SOUL.md',
  'hermes/AGENTS.md',
  'hermes/CLAUDE.md',
  'hermes/GEMINI.md',
  'nodes/9020/AGENTS.md',
  'ops/t5500/AGENTS.t5500.md',
  'ops/paperclip-ceo/CEO-AGENTS.md',
  'ops/paperclip-ceo/JUDGE-AGENTS.md',
  'ops/paperclip-ceo/X-MARKETING-AGENTS.md',
  '.opencode/agent/*.md',
  '.agents/skills/*/AGENTS.md',
  '.agents/subagents/*/SOUL.md',
  'docs/standards/*.md',
  'ops/**/*SOUL*.md',
  'apps/hermes-leadgen/souls/*.md',
  '.agents/skills/*/SKILL.md',
  '.agents/skills/*/skill.json',
  'agent/skills/*/SKILL.md',
  'agent/skills/*/skill.json',
  'ops/node/skills/*/SKILL.md',
  'ops/node/skills/*/skill.json',
  'ops/skills/*/SKILL.md',
  'hermes/skills/*/SKILL.md',
  'ops/skills/SKILLS-HUB.md',
  'ops/skills/skills-hub-reference.md',
  'agent-contracts/*.md',
  'agent-contracts/*.json',
  '**/gemini.toml',
  '**/openai.yaml',
  '**/agents.yaml',
  '**/lanes.json',
  '**/skills-lock.json',
];

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.claude',
  'archive',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
]);

function globToRegExp(glob: string): RegExp {
  let re = '^';
  for (let i = 0; i < glob.length; i++) {
    if (glob.slice(i, i + 3) === '**/') {
      re += '(?:.+/)?';
      i += 2;
    } else if (glob.slice(i, i + 2) === '**') {
      re += '.*';
      i += 1;
    } else if (glob[i] === '*') {
      re += '[^/]*';
    } else if ('.+?^${}()|[]\\'.includes(glob[i])) {
      re += '\\' + glob[i];
    } else {
      re += glob[i];
    }
  }
  re += '$';
  return new RegExp(re);
}

export function walkDefinitionFiles(
  rootDir: string = REPO_ROOT,
  globs: readonly string[] = DEFINITION_GLOBS,
): string[] {
  const regexes = globs.map(globToRegExp);
  const matched = new Set<string>();

  function visit(dir: string, relPrefix: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        visit(path.join(dir, entry.name), relPrefix ? `${relPrefix}/${entry.name}` : entry.name);
      } else if (entry.isFile()) {
        const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        const inVF = VENDORED_SKILL_FOLDERS.some((vf) => rel.startsWith(vf + '/'));
        if (inVF) {
          if (rel.endsWith('/HOUSE-NOTE.md')) matched.add(rel);
          continue;
        }
        if (regexes.some((rx) => rx.test(rel))) {
          matched.add(rel);
        }
      }
    }
  }

  visit(rootDir, '');
  for (const vf of VENDORED_SKILL_FOLDERS) {
    const nr = vf + '/HOUSE-NOTE.md';
    if (fs.existsSync(path.join(rootDir, nr))) matched.add(nr);
  }
  return Array.from(matched).sort();
}

export function computeNormalizedSha256(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function checkDefinitionContent(relPath: string, content: string): string | null {
  const ext = path.extname(relPath).toLowerCase();
  const requiredSubstrings = [
    'docs/house/HOUSE-MOTION-RULE.md',
    'docs/house/THE-HOUSE.md',
    'Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.',
    'Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports',
    'ops/handoffs/FABLE-HANDOFFS-2026-11-06.md',
  ];

  for (const needle of requiredSubstrings) {
    if (!content.includes(needle)) {
      return `${relPath}: missing required pointer text "${needle}"`;
    }
  }

  if (content.includes('The page is a journey, not a document.')) {
    return `${relPath}: must not paste rule text into a definition file`;
  }

  if (ext === '.md') {
    if (!/^- House rules:/m.test(content)) {
      return `${relPath}: missing markdown bullet "- House rules:"`;
    }
    if (!/^- Current beats existing:/m.test(content)) {
      return `${relPath}: missing markdown bullet "- Current beats existing:"`;
    }
  } else if (ext === '.json') {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch (err) {
      return `${relPath}: invalid JSON (${(err as Error).message})`;
    }
    if (
      typeof parsed.house_rules !== 'string' ||
      !parsed.house_rules.includes('docs/house/HOUSE-MOTION-RULE.md')
    ) {
      return `${relPath}: missing JSON field "house_rules"`;
    }
  } else if (ext === '.toml') {
    if (!/^house_rules\s*=\s*"/m.test(content)) {
      return `${relPath}: missing TOML key "house_rules"`;
    }
  } else if (ext === '.yaml' || ext === '.yml') {
    if (!/^house_rules:\s*"/m.test(content)) {
      return `${relPath}: missing YAML key "house_rules"`;
    }
  }

  return null;
}

test('docs/house/HOUSE-MOTION-RULE.md exists, carries canonical header, and matches recorded SHA-256 fixture', () => {
  const fullPath = path.join(REPO_ROOT, HOUSE_MOTION_RULE_PATH);
  assert.ok(fs.existsSync(fullPath), `Missing ${HOUSE_MOTION_RULE_PATH}`);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const firstLine = raw.split(/\r?\n/)[0];
  assert.equal(firstLine, HOUSE_MOTION_RULE_HEADER);
  const actualSha = computeNormalizedSha256(raw);
  assert.equal(
    actualSha,
    HOUSE_MOTION_RULE_SHA256,
    `${HOUSE_MOTION_RULE_PATH} SHA-256 drifted from fixture (got ${actualSha}, expected ${HOUSE_MOTION_RULE_SHA256})`,
  );
});

test('silent edit to HOUSE-MOTION-RULE.md or missing pointer in a definition file fails with the file name', () => {
  const fullPath = path.join(REPO_ROOT, HOUSE_MOTION_RULE_PATH);
  const raw = fs.readFileSync(fullPath, 'utf8');
  assert.notEqual(computeNormalizedSha256(raw + ' '), HOUSE_MOTION_RULE_SHA256);

  const errMd = checkDefinitionContent('AGENTS.md', '# AGENTS.md\n');
  assert.ok(errMd && errMd.includes('AGENTS.md'));

  const errJson = checkDefinitionContent('skills-lock.json', '{"version": 1}');
  assert.ok(errJson && errJson.includes('skills-lock.json'));
  const errNote = checkDefinitionContent('.agents/skills/hallmark/HOUSE-NOTE.md', '# Note\n');
  assert.ok(errNote && errNote.includes('.agents/skills/hallmark/HOUSE-NOTE.md'));
});

test('every agent definition file matched by glob carries the house rule and pull-first pointers in its own format', () => {
  const files = walkDefinitionFiles();
  assert.ok(files.length >= 150, `Expected at least 150 definition files, found ${files.length}`);

  const failures: string[] = [];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const err = checkDefinitionContent(rel, content);
    if (err) failures.push(err);
  }

  assert.deepEqual(failures, [], `Definition drift detected:\n${failures.join('\n')}`);
});

test('five vendored files are byte-identical to SOURCE-MANIFEST recorded upstream tree on origin/main', () => {
  for (const rel of VENDORED_UPSTREAM_FILES) {
    const fullPath = path.join(REPO_ROOT, rel);
    assert.ok(fs.existsSync(fullPath), 'Missing vendored file: ' + rel);
    const diskHash = childProcess.execFileSync('git', ['hash-object', fullPath], { encoding: 'utf8' }).trim();
    const originHash = childProcess.execFileSync('git', ['rev-parse', 'origin/main:' + rel], { encoding: 'utf8' }).trim();
    assert.equal(diskHash, originHash, 'Vendored file ' + rel + ' drifted from origin/main blob hash');
  }
});
