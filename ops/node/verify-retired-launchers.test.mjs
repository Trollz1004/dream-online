import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, 'verify-retired-launchers.ps1');
const USER_PATH_RE = /(?<![A-Za-z0-9])[cC]:[\\/]+[uU]sers[\\/]+[a-zA-Z0-9_.-]+/;

test('verify-retired-launchers.ps1 is strictly read-only and contains no registry/file write or delete cmdlets', () => {
  assert.ok(fs.existsSync(SCRIPT_PATH), 'Missing ops/node/verify-retired-launchers.ps1');
  const src = fs.readFileSync(SCRIPT_PATH, 'utf8');
  assert.doesNotMatch(
    src,
    /\b(Set-Item(Property)?|New-Item(Property)?|Remove-Item(Property)?|Rename-Item(Property)?|Move-Item|Set-Content|Add-Content|Out-File)\b/,
    'verify-retired-launchers.ps1 must be strictly read-only'
  );
  assert.match(src, /\[switch\]\$NoRun/);
});

test('verify-retired-launchers.ps1 runs on Alienware, inspects OS boot/logon, StartupApproved marks, startup-approved-before.json, and boot.log, and scrubs user paths', () => {
  const res = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT_PATH],
    { encoding: 'utf8', timeout: 20000 }
  );
  assert.equal(res.status, 0, `verify-retired-launchers.ps1 failed: ${res.stderr}`);
  assert.match(res.stdout, /=== READ-ONLY VERIFICATION: RETIRED BOOT LAUNCHERS & BOOT\.LOG ===/);
  assert.match(res.stdout, /OS LastBootUpTime \(UTC\):/);
  assert.match(res.stdout, /Current Interactive Logon \(UTC\):/);
  assert.match(res.stdout, /DREAM-Alienware-BootAll/);
  assert.match(res.stdout, /DREAM-Alienware-BootAll\.vbs/);
  assert.match(res.stdout, /startup-approved-before\.json/);
  assert.match(res.stdout, /Real Windows Sign-In After Saved:\s+(YES|NO)/);
  assert.match(res.stdout, /Retired Launcher Activity:\s+(YES|NO)/);
  assert.ok(!USER_PATH_RE.test(res.stdout), 'Output must scrub user folder paths to %USERPROFILE% / %LOCALAPPDATA%');
});

test('verify-retired-launchers.ps1 -NoRun accurately detects sign-in BEFORE vs AFTER startup-approved-before.json savedAt and retired launcher activity in boot.log', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-retired-launchers-'));
  try {
    const startupDir = path.join(tmpDir, 'Startup');
    const retiredDir = path.join(tmpDir, 'retired');
    const bootLogPath = path.join(tmpDir, 'boot.log');
    fs.mkdirSync(startupDir, { recursive: true });
    fs.mkdirSync(retiredDir, { recursive: true });

    fs.writeFileSync(
      path.join(retiredDir, 'startup-approved-before.json'),
      JSON.stringify({
        savedAt: '2026-11-16T12:00:00.0000000Z',
        entries: [
          { kind: 'Run', name: 'DREAM-Alienware-BootAll', state: 'absent', bytes: '' },
          { kind: 'StartupFolder', name: 'DREAM-Alienware-BootAll.vbs', state: 'absent', bytes: '' }
        ]
      }),
      'utf8'
    );
    fs.writeFileSync(
      bootLogPath,
      '2026-11-16T12:05:00.0000000Z | started DREAM Dev Engine (192.168.0.40:9180) | port 9180 not listening\r\n',
      'utf8'
    );

    // Case 1: Sign-in occurred BEFORE savedAt
    const beforeCmd = [
      `. '${SCRIPT_PATH.replace(/'/g, "''")}' -NoRun`,
      `$out = Show-RetiredLaunchersVerification -StartupFolder '${startupDir.replace(/'/g, "''")}' -RunKey 'HKCU:\\Software\\DreamNonExistentRun' -ApprovedKeyRoot 'HKCU:\\Software\\DreamNonExistentApproved' -RetiredStateDir '${retiredDir.replace(/'/g, "''")}' -LogFilePath '${bootLogPath.replace(/'/g, "''")}' -BootTimeOverride ([datetime]'2026-11-16T10:00:00Z') -LogonTimeOverride ([datetime]'2026-11-16T10:01:00Z') | Out-String`,
      `Write-Output $out`
    ].join('; ');
    const beforeRes = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', beforeCmd], {
      encoding: 'utf8',
      timeout: 15000
    });
    assert.equal(beforeRes.status, 0, beforeRes.stderr);
    assert.match(beforeRes.stdout, /Real Windows Sign-In After Saved: NO \(interactive sign-in .* occurred BEFORE savedAt/);
    assert.match(beforeRes.stdout, /Retired Launcher Activity:\s+NO/);

    // Case 2: Sign-in occurred AFTER savedAt
    const afterCmd = [
      `. '${SCRIPT_PATH.replace(/'/g, "''")}' -NoRun`,
      `$out = Show-RetiredLaunchersVerification -StartupFolder '${startupDir.replace(/'/g, "''")}' -RunKey 'HKCU:\\Software\\DreamNonExistentRun' -ApprovedKeyRoot 'HKCU:\\Software\\DreamNonExistentApproved' -RetiredStateDir '${retiredDir.replace(/'/g, "''")}' -LogFilePath '${bootLogPath.replace(/'/g, "''")}' -BootTimeOverride ([datetime]'2026-11-16T13:00:00Z') -LogonTimeOverride ([datetime]'2026-11-16T13:01:00Z') | Out-String`,
      `Write-Output $out`
    ].join('; ');
    const afterRes = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', afterCmd], {
      encoding: 'utf8',
      timeout: 15000
    });
    assert.equal(afterRes.status, 0, afterRes.stderr);
    assert.match(afterRes.stdout, /Real Windows Sign-In After Saved: YES \(interactive sign-in .* occurred AFTER savedAt/);
    assert.match(afterRes.stdout, /Lines After SavedAt:\s+1/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
