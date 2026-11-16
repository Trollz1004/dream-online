import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildCodemap, maskSecrets, noteLink, isEnvFileName, MAX_LINES } from './build-codemap.mjs';

const SENTINEL = 'CODEMAP_SENTINEL_ENV_VALUE_7f3a';
const FAKE_KEY = 'ghp_' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function makeFakeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codemap-fake-'));
  const put = (rel, body) => {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  };
  put('README.md', '# Fake repo\n');
  put('package.json', JSON.stringify({ name: 'fake', scripts: { start: 'tsx web/server.ts', test: 'node --test web/' } }));
  put('api/README.md', '# API service\n\nPython things.\n');
  put('api/main.py', [
    '"""The API."""',
    'from fastapi import FastAPI',
    'from shared.util import helper',
    'import uvicorn',
    'app = FastAPI()',
    '@app.get("/items")',
    'def items():',
    '    return helper()',
    '@app.post("/items/{item_id}")',
    'def save(item_id: int):',
    '    return {}',
    'if __name__ == "__main__":',
    '    uvicorn.run(app, port=8000)',
    '',
  ].join('\n'));
  put('shared/util.py', 'def helper():\n    return 1\n');
  put('shared/lib.js', 'export const x = 1;\n');
  put('web/server.ts', [
    "import express from 'express';",
    "import { x } from '../shared/lib.js';",
    'const app = express();',
    "app.get('/health', (req, res) => res.json({ ok: x }));",
    "app.delete('/api/thing/:id', (req, res) => res.end());",
    'app.listen(3000);',
    '',
  ].join('\n'));
  put('web/app.test.ts', "import { test } from 'node:test';\ntest('x', () => {});\n");
  put('tests/test_api.py', 'def test_ok():\n    assert True\n');
  put('ops/nightly.ps1', `# Nightly cleanup job\n# token ${FAKE_KEY}\nRegister-ScheduledTask -TaskName Nightly\n`);
  put('ops/check.mjs', '// Checks the thing\nconsole.log(1);\n');
  // env files: must never be opened
  put('.env', `OPENAI_API_KEY=${SENTINEL}\n`);
  put('.env.local', `SECRET=${SENTINEL}\n`);
  put('web/.env.production', `TOKEN=${SENTINEL}\n`);
  // skipped folders
  put('node_modules/pkg/index.js', "app.get('/from-node-modules', () => {});\n");
  put('dist/out.js', "app.get('/from-dist', () => {});\n");
  put('archive/old.js', "app.get('/from-archive', () => {});\n");
  put('.venv/lib/x.py', '@app.get("/from-venv")\n');
  put('web/bundle.min.js', "app.get('/from-min', () => {});\n");
  // broken files
  put('web/broken.ts', Buffer.concat([Buffer.from("app.get('/broken"), Buffer.from([0, 0, 255, 254, 0]), Buffer.from('}}}{{{')]));
  put('api/bad_utf8.py', Buffer.from([0x66, 0x72, 0x6f, 0x6d, 0x20, 0xff, 0xfe, 0x20, 0x69, 0x6d, 0x70, 0x0a]));
  put('sub/package.json', '{ "scripts": { not json');
  put('web/unterminated.js', "import { a } from './nowhere\nconst s = `never closed\n");
  put('assets/logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0]));
  return root;
}

test('fake repo gives the expected sections', () => {
  const root = makeFakeRepo();
  try {
    const { markdown, stats } = buildCodemap(root, 'fake', { now: new Date('2026-11-15T00:00:00Z') });
    const lines = markdown.trimEnd().split('\n');
    assert.ok(lines.length <= MAX_LINES, `map has ${lines.length} lines`);
    for (const h of ['# Code map: fake', '## Top folders', '## Entry points and how to run them', '## HTTP routes',
      '## Which folder imports which', '## Tests', '## Ops and scheduled-task scripts', '## 15 largest source files']) {
      assert.ok(markdown.includes(h), `missing ${h}`);
    }
    assert.match(markdown, /- \[\[api\]\]: API service \(\d+ files\)/);
    assert.match(markdown, /`npm run start`: `tsx web\/server\.ts`/);
    assert.match(markdown, /\[\[api\/main\.py\]\]: port 8000; run `python api\/main\.py`/);
    assert.match(markdown, /\[\[web\/server\.ts\]\]: port 3000; run `npm run start`/);
    assert.match(markdown, /\| GET \| `\/items` \| \[\[api\/main\.py\]\] line 6 \|/);
    assert.match(markdown, /\| POST \| `\/items\/\{item_id\}` \| \[\[api\/main\.py\]\]/);
    assert.match(markdown, /\| GET \| `\/health` \| \[\[web\/server\.ts\]\]/);
    assert.match(markdown, /\| DELETE \| `\/api\/thing\/:id` \|/);
    assert.match(markdown, /\| \[\[api\]\] \| \[\[shared\]\] \| 1 \|/);
    assert.match(markdown, /\| \[\[web\]\] \| \[\[shared\]\] \| 1 \|/);
    assert.match(markdown, /\[\[tests\]\]: 1 test files \(py\); run `python -m pytest tests`/);
    assert.match(markdown, /\[\[web\]\]: 1 test files \(ts\); run `npm run test`/);
    assert.match(markdown, /\[\[ops\/nightly\.ps1\]\] \(scheduled\): Nightly cleanup job/);
    assert.match(markdown, /\[\[ops\/check\.mjs\]\]: Checks the thing/);
    assert.match(markdown, /1\. \[\[api\/main\.py\]\]/);
    for (const bad of ['/from-node-modules', '/from-dist', '/from-archive', '/from-venv', '/from-min', 'logo.png']) {
      assert.ok(!markdown.includes(bad), `skipped content leaked: ${bad}`);
    }
    assert.ok(!markdown.includes(root), 'map must not contain the absolute repo path');
    assert.ok(stats.routes >= 4);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an env file in the repo is never read and its value never printed', () => {
  const root = makeFakeRepo();
  try {
    const opened = [];
    const { markdown } = buildCodemap(root, 'fake', { onRead: (rel) => opened.push(rel) });
    assert.ok(opened.length > 5, 'reader hook saw files');
    const envOpened = opened.filter((rel) => isEnvFileName(path.posix.basename(rel)));
    assert.deepEqual(envOpened, []);
    assert.ok(!markdown.includes(SENTINEL));
    assert.ok(!markdown.includes('.env.local') && !markdown.includes('.env.production'));
    assert.ok(!markdown.includes(FAKE_KEY), 'key-looking value in a comment must be masked');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a broken file does not stop the build', () => {
  const root = makeFakeRepo();
  try {
    const { markdown, warnings } = buildCodemap(root, 'fake', {
      onRead: (rel) => { if (rel === 'shared/lib.js') throw Object.assign(new Error('EACCES: denied'), { code: 'EACCES' }); },
    });
    assert.match(markdown, /## 15 largest source files/);
    assert.ok(warnings.some((w) => w.includes('sub/package.json')), 'broken JSON is reported');
    assert.ok(warnings.some((w) => w.includes('shared/lib.js')), 'unreadable file is reported');
    assert.match(markdown, /## Build warnings/);
    assert.ok(!markdown.includes('/broken'), 'binary-looking source is skipped');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('names become Obsidian links only when a note of that name could exist', () => {
  assert.equal(noteLink('ops/router'), '[[ops/router]]');
  assert.equal(noteLink('server.ts'), '[[server.ts]]');
  assert.equal(noteLink('.github'), '`.github`');
  assert.equal(noteLink('docs/a|b.md'), '`docs/a|b.md`');
  assert.equal(noteLink('src/[id].tsx'), '`src/[id].tsx`');
});

test('maskSecrets hides keys, private addresses and user folders while allowing 192.168.0.15 and 192.168.0.40', () => {
  assert.equal(maskSecrets(`x ${FAKE_KEY} y`), 'x XXXX y');
  assert.equal(maskSecrets('api_key=abcdef123456'), 'api_key=XXXX');
  // fakes built at runtime so the repo never holds the shapes themselves
  const lanIp = ['192', '168', '1', '20'].join('.');
  const retiredIp = ['192', '168', '0', '8'].join('.');
  const userDir = ['C:', 'Users', 'fake-person', 'repo'].join('\\');
  assert.equal(maskSecrets(`http://${lanIp}:3000`), 'http://XXXX:3000');
  assert.equal(maskSecrets(`http://${retiredIp}:8392`), 'http://XXXX:8392');
  assert.equal(maskSecrets('http://192.168.0.40:9180 and http://192.168.0.15:20128'), 'http://192.168.0.40:9180 and http://192.168.0.15:20128');
  assert.equal(maskSecrets(userDir), '%USERPROFILE%\\repo');
  assert.equal(maskSecrets('DREAM-Engine-wt-inbox-a1-engine-load-real-character-models'), 'DREAM-Engine-wt-inbox-a1-engine-load-real-character-models');
});
