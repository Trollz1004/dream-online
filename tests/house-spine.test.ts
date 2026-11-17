import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as fleetMjs from '../ops/fleet/fleet-map.mjs';

const require = createRequire(import.meta.url);
const fleetCjs = require('../ops/fleet/fleet-map.cjs') as Record<string, unknown>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const HOUSE_DOC_PATHS = [
  'docs/house/SPINE.md',
  'docs/house/ADDRESS-DOCTRINE.md',
  'docs/house/NODES.md',
  'docs/house/PIPELINE.md',
  'docs/house/TRUSTED-MODELS.md',
  'docs/house/THE-HOUSE.md',
] as const;

const SPINE_POINTER_TARGETS = [
  'docs/house/ADDRESS-DOCTRINE.md',
  'docs/house/NODES.md',
  'docs/house/PIPELINE.md',
  'docs/house/TRUSTED-MODELS.md',
  'docs/house/THE-HOUSE.md',
  'docs/house/HOUSE-MOTION-RULE.md',
  'docs/house/PAYMENT-ACCOUNTS-RULE.md',
  'ops/fleet/fleet-map.json',
] as const;

const STAGE_E2_E4_TOOL_PATHS = [
  'ops/agents/render-agent-files.ps1',
  'ops/agents/check-agent-drift.ps1',
  'ops/agents/env-names-check.ps1',
  'env.required.json',
] as const;

const DOCTRINE_FILES_NO_COPY = [
  'docs/house/ADDRESS-DOCTRINE.md',
  'docs/house/NODES.md',
  'docs/house/PIPELINE.md',
  'docs/house/TRUSTED-MODELS.md',
  'docs/house/THE-HOUSE.md',
  'docs/house/HOUSE-MOTION-RULE.md',
  'docs/house/PAYMENT-ACCOUNTS-RULE.md',
] as const;

// Build forbidden patterns dynamically so this test file itself never contains literal triggers.
const RETIRED_THIRD_NODE_RE = new RegExp(
  [
    'sabre' + 'tooth',
    'saber' + 'tooth',
    '\\b90' + '20\\b',
    ['192', '168', '0', '8'].join('\\.'),
    '\\bjar' + 'vis\\b',
  ].join('|'),
  'i',
);

const LOOPBACK_REACH_RE = new RegExp(
  [
    '(?:https?|wss?):\\/\\/(?:local' + 'host|127\\.0\\.0\\.1)\\b',
    '\\b(?:local' + 'host|127\\.0\\.0\\.1):\\d{2,5}\\b',
  ].join('|'),
  'i',
);

const LITERAL_USER_PATH_RE = new RegExp(
  [
    '(?<![A-Za-z0-9])[cC]:[\\/]+(?:[uU]sers)[\\/]+[a-zA-Z0-9_.-]+',
    '(?:\\/Users\\/' + 'joshl)',
    'NSFW_' + 'BOTS',
  ].join('|'),
);

const MISSION_CHARITY_RE = new RegExp(
  [
    '\\bchar' + 'ity\\b',
    '\\bshri' + 'ners\\b',
    'for' + 'thekids',
    '\\bnon-?prof' + 'it\\b',
    'our\\s+miss' + 'ion\\s+is',
    'miss' + 'ion\\s+statement',
    'until\\s+no\\s+kid\\s+in\\s+need',
  ].join('|'),
  'i',
);

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

function extractProseClauses(markdown: string): string[] {
  const clauses: string[] = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('```')) continue;
    const stripped = line.replace(/^[-*\d.)\s]+/, '').trim();
    if (stripped.length >= 45) {
      clauses.push(stripped);
    }
    for (const sentence of stripped.split(/(?<=[.!?])\s+/)) {
      const cleanSentence = sentence.trim();
      const words = cleanSentence.split(/\s+/).filter(Boolean);
      if (words.length >= 8 && cleanSentence.length >= 40) {
        clauses.push(cleanSentence);
      }
    }
  }
  return clauses;
}

test('Stage E1: all six docs/house doctrine and spine files exist', () => {
  for (const relPath of HOUSE_DOC_PATHS) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, relPath)), `Missing ${relPath}`);
  }
});

test('Stage E1: docs/house/SPINE.md is concise (<= 40 non-empty lines), pointers-only, and copies no doctrine prose', () => {
  const spineText = readRepoFile('docs/house/SPINE.md');
  const nonEmptyLines = spineText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  assert.ok(
    nonEmptyLines.length > 0 && nonEmptyLines.length <= 40,
    `SPINE.md must have <= 40 non-empty lines (got ${nonEmptyLines.length})`,
  );

  for (const target of SPINE_POINTER_TARGETS) {
    assert.ok(
      spineText.includes(target),
      `SPINE.md must link/point to ${target}`,
    );
  }

  for (const toolPath of STAGE_E2_E4_TOOL_PATHS) {
    assert.ok(
      spineText.includes(toolPath),
      `SPINE.md must note Stage E2-E4 tooling path ${toolPath}`,
    );
  }

  for (const docPath of DOCTRINE_FILES_NO_COPY) {
    const docText = readRepoFile(docPath);
    const proseClauses = extractProseClauses(docText);
    for (const clause of proseClauses) {
      assert.equal(
        spineText.includes(clause),
        false,
        `SPINE.md must not copy prose from ${docPath}: "${clause.slice(0, 60)}..."`,
      );
    }
  }
});

test('Stage E1: none of the six docs/house/*.md files contain retired node names, jarvis, loopback reach URLs, literal user paths, or mission/charity wording', () => {
  for (const relPath of HOUSE_DOC_PATHS) {
    const content = readRepoFile(relPath);
    assert.equal(
      RETIRED_THIRD_NODE_RE.test(content),
      false,
      `${relPath} must not contain retired third-node names/IPs or jarvis`,
    );
    assert.equal(
      LOOPBACK_REACH_RE.test(content),
      false,
      `${relPath} must not contain loopback reach URLs`,
    );
    assert.equal(
      LITERAL_USER_PATH_RE.test(content),
      false,
      `${relPath} must not contain literal Windows/macOS user paths or private project path names`,
    );
    assert.equal(
      MISSION_CHARITY_RE.test(content),
      false,
      `${relPath} must not contain mission or charity wording`,
    );
  }
});

test('Stage E1: docs/house/NODES.md covers both nodes, heavy-build wheel rule, third-machine rule, private boundary, and fleet-map', () => {
  const text = readRepoFile('docs/house/NODES.md');
  const normalized = text.replace(/`/g, '');
  assert.match(text, /Alienware/i);
  assert.match(text, /192\.168\.0\.40/);
  assert.match(text, /:9180/);
  assert.match(text, /:8765/);
  assert.match(text, /:8000/);
  assert.match(text, /:8392/);
  assert.match(text, /:8390/);
  assert.match(text, /:8082/);
  assert.match(text, /T5500/i);
  assert.match(text, /192\.168\.0\.15/);
  assert.match(text, /Mission OS/i);
  assert.match(text, /:3130/);
  assert.match(text, /:9160/);
  assert.match(text, /:3200/);
  assert.match(text, /:20128/);
  assert.match(text, /:49374/);
  assert.match(text, /:8643/);
  assert.match(text, /inbox/i);
  assert.match(text, /wheel/i);
  assert.ok(
    normalized.includes(
      'the third machine is a separate test node under a separate GitHub account and is never named or reached from Trollz1004 code',
    ),
    'NODES.md must include the exact third machine boundary statement',
  );
  assert.match(text, /drop box/i);
  assert.match(text, /ops\/fleet\/fleet-map\.json/);
});

test('Stage E1: docs/house/PIPELINE.md covers brainstorm, Panda routing, [A]/[B] TDD, expediter 5 upgrades, judges, and PR/commit format', () => {
  const text = readRepoFile('docs/house/PIPELINE.md');
  assert.match(text, /superpowers/i);
  assert.match(text, /192\.168\.0\.40:8765/);
  assert.match(text, /gemini-3\.8-flash/);
  assert.match(text, /gemini-4-hydrogen/);
  assert.match(text, /\[A\]/);
  assert.match(text, /\[B\]/);
  assert.match(text, /TDD/i);
  assert.match(text, /task goal/i);
  assert.match(text, /funding goal/i);
  assert.match(text, /five/i);
  assert.match(text, /Gemini 4 Carbon/);
  assert.match(text, /Codex/);
  assert.match(text, /Fable/);
  assert.match(text, /\[YYYY-MM-DD #NNNN\] title, by NAME/);
  assert.match(text, /Authored-by: NAME/);
  for (const name of ['Josh', 'Gemini Carbon', 'GPT-6 Astra', 'GPT-6.1 Sol', 'Codex', 'Opus', 'Fable']) {
    assert.ok(text.includes(name), `PIPELINE.md must list author name ${name}`);
  }
});

test('Stage E1: docs/house/TRUSTED-MODELS.md covers trusted three families, Builder vs Trusted-three tool gate, and official browsers', () => {
  const text = readRepoFile('docs/house/TRUSTED-MODELS.md');
  assert.match(text, /Opus 5\.5/);
  assert.match(text, /Fable/);
  assert.match(text, /Gemini 4 Carbon/);
  assert.match(text, /GPT-6 Astra/);
  assert.match(text, /GPT-6\.1 Sol/);
  assert.match(text, /Codex/);
  assert.match(text, /No raw provider API keys/i);
  assert.match(text, /Builder/);
  assert.match(text, /Trusted-three/);
  assert.match(text, /morluto\/rea/);
  assert.match(text, /remake/i);
  assert.match(text, /Agent-Reach/);
  assert.match(text, /last30days/);
  assert.match(text, /YouTube/i);
  assert.match(text, /Gemini in Chrome/);
  assert.match(text, /Claude in Chrome/);
  assert.match(text, /Codex for Chrome/);
});

test('Stage E1: docs/house/THE-HOUSE.md preserves the 10 House rules and tribute while updating nodes and monitoring', () => {
  const text = readRepoFile('docs/house/THE-HOUSE.md');
  assert.match(text, /## The nodes/);
  assert.match(text, /192\.168\.0\.40/);
  assert.match(text, /192\.168\.0\.15/);
  assert.match(text, /Mission OS/);
  assert.match(text, /192\.168\.0\.15:3130/);
  assert.match(text, /docs\/ops\/MISSION-OS-API\.md/);
  assert.match(text, /## The rules that stand above everything/);
  for (let i = 1; i <= 10; i += 1) {
    assert.match(text, new RegExp(`^${i}\\.\\s+\\*\\*`, 'm'), `THE-HOUSE.md missing rule ${i}`);
  }
  assert.match(text, /## The tribute/);
  assert.match(text, /tribute to Claude/i);
});

test('Stage E1: ops/fleet/fleet-map.json, .mjs, and .cjs expose spine, repos, harnesses, and helper functions', () => {
  const map = fleetMjs.loadFleetMap() as Record<string, unknown>;
  assert.equal(map.spine, 'docs/house/SPINE.md');

  const getSpinePathMjs = (fleetMjs as Record<string, unknown>).getSpinePath as ((m?: unknown) => string) | undefined;
  const getNodeReposMjs = (fleetMjs as Record<string, unknown>).getNodeRepos as ((id: string, m?: unknown) => string[]) | undefined;
  const getNodeHarnessesMjs = (fleetMjs as Record<string, unknown>).getNodeHarnesses as ((id: string, m?: unknown) => string[]) | undefined;
  const getSpinePathCjs = fleetCjs.getSpinePath as ((m?: unknown) => string) | undefined;
  const getNodeReposCjs = fleetCjs.getNodeRepos as ((id: string, m?: unknown) => string[]) | undefined;
  const getNodeHarnessesCjs = fleetCjs.getNodeHarnesses as ((id: string, m?: unknown) => string[]) | undefined;

  assert.equal(typeof getSpinePathMjs, 'function');
  assert.equal(typeof getNodeReposMjs, 'function');
  assert.equal(typeof getNodeHarnessesMjs, 'function');
  assert.equal(typeof getSpinePathCjs, 'function');
  assert.equal(typeof getNodeReposCjs, 'function');
  assert.equal(typeof getNodeHarnessesCjs, 'function');

  assert.equal(getSpinePathMjs!(), 'docs/house/SPINE.md');
  assert.equal(getSpinePathCjs!(), 'docs/house/SPINE.md');

  const aw = fleetMjs.getNode('alienware') as Record<string, unknown>;
  const t5 = fleetMjs.getNode('t5500') as Record<string, unknown>;
  assert.equal(aw.githubAccount, 'Trollz1004');
  assert.equal(t5.githubAccount, 'Trollz1004');

  assert.deepEqual(getNodeReposMjs!('alienware'), [
    'Trollz1004/dream-online',
    'Trollz1004/swarm-command',
    'Trollz1004/ANTIGRAVITY',
  ]);
  assert.deepEqual(getNodeReposCjs!('t5500'), [
    'Trollz1004/ANTIGRAVITY',
    'Trollz1004/dream-online',
  ]);

  assert.deepEqual(getNodeHarnessesMjs!('alienware'), [
    'agy',
    'claude-code',
    'codex',
    'gemini',
    'hermes',
    'openclaw',
    'freebuff',
    'free-claude-code',
  ]);
  assert.deepEqual(getNodeHarnessesCjs!('t5500'), [
    'agy',
    'claude-code',
    'codex',
    'gemini',
    'hermes',
    'openclaw',
    'omniroute',
  ]);
});
