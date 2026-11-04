import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const batPath = path.join(repoRoot, 'ops', 'node', 'FIX-ALIENWARE-SSH-FOR-T5500.bat');

test('Finding 4.6: FIX-ALIENWARE-SSH-FOR-T5500.bat hardening', (t) => {
  const content = fs.readFileSync(batPath, 'utf8');

  // Must not have typed Windows user profile paths
  assert.doesNotMatch(
    content,
    /[cC]:[\\/]+[uU]sers[\\/]+[a-zA-Z0-9_.-]+/,
    'must not contain hardcoded Windows user folder paths',
  );

  // Must use $env:USERPROFILE
  assert.match(content, /\$env:USERPROFILE/, 'must use $env:USERPROFILE for user path');

  // Must not contain hardcoded public keys
  assert.doesNotMatch(content, /ssh-ed25519|ssh-rsa/, 'must not embed hardcoded SSH keys');

  // Must never read or merge user authorized_keys into admin keys
  assert.doesNotMatch(
    content,
    /Get-Content\s+\$userKeyFile/,
    'must never read or merge user authorized_keys',
  );

  // Must refuse to run when the fleet bundle argument is missing
  const res = spawnSync('cmd.exe', ['/c', batPath], {
    encoding: 'utf8',
  });
  assert.notEqual(res.status, 0, 'script must exit non-zero when argument is missing');
  assert.match(
    res.stdout + res.stderr,
    /argument is required|missing/i,
    'script must print error about missing fleet bundle argument',
  );
});
