import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const batPath = path.join(repoRoot, 'ops', 'node', 'FIX-ALIENWARE-SSH-FOR-T5500.bat');

function resolveCmdExe(): string | null {
  if (process.platform !== 'win32') {
    return null;
  }
  for (const candidate of [process.env.ComSpec, 'cmd.exe'].filter(Boolean) as string[]) {
    try {
      const probe = spawnSync(candidate, ['/c', 'exit 0'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      if (!probe.error && probe.status === 0) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

test('Finding 4.6: FIX-ALIENWARE-SSH-FOR-T5500.bat hardening', async (t) => {
  // (a) static checks that run everywhere by reading the .bat text
  await t.test('static checks', () => {
    const content = fs.readFileSync(batPath, 'utf8');

    // it contains the missing-argument check and exit /b 1
    assert.match(
      content,
      /if\s+"%~1"==""/i,
      'script must check for missing argument',
    );
    assert.match(
      content,
      /exit\s+\/b\s+1/i,
      'script must exit /b 1 when argument is missing',
    );

    // it never references authorized_keys under the user profile for reading (no Get-Content of $userKeyFile)
    assert.doesNotMatch(
      content,
      /Get-Content\s+\$userKeyFile/,
      'must never read or merge user authorized_keys',
    );

    // it contains no key material (no 'ssh-ed25519', 'ssh-rsa', 'BEGIN' lines)
    assert.doesNotMatch(
      content,
      /ssh-ed25519|ssh-rsa|BEGIN/,
      'must not contain SSH key material',
    );

    // it contains no typed user folder (regex for C:\Users\<name>)
    assert.doesNotMatch(
      content,
      /[cC]:[\\/]+[uU]sers[\\/]+[a-zA-Z0-9_.-]+/i,
      'must not contain hardcoded Windows user folder paths',
    );

    // it uses $env:USERPROFILE
    assert.match(
      content,
      /\$env:USERPROFILE/,
      'must use $env:USERPROFILE for user path',
    );
  });

  // (b) the execution check runs only when process.platform === 'win32' and cmd.exe resolves;
  // otherwise call the test's skip with 'cmd.exe not available on this runner'.
  // Keep the Windows execution assertions as they are.
  await t.test('execution check', (st) => {
    const cmd = resolveCmdExe();
    if (process.platform !== 'win32' || !cmd) {
      st.skip('cmd.exe not available on this runner');
      return;
    }

    // Must refuse to run when the fleet bundle argument is missing
    const res = spawnSync(cmd, ['/c', batPath], {
      encoding: 'utf8',
    });
    assert.notEqual(res.status, 0, 'script must exit non-zero when argument is missing');
    assert.match(
      res.stdout + res.stderr,
      /argument is required|missing/i,
      'script must print error about missing fleet bundle argument',
    );
  });
});
