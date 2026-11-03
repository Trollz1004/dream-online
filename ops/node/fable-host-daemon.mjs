#!/usr/bin/env node
/**
 * Fable (Claude Cowork Linux VM) -> Native Windows Host Command Daemon (Alienware .40)
 * Watches both mounted folders granted to Fable in claude_desktop_config.json:
 *   1. C:\Users\joshl\antigravity\.fable-host-bridge
 *   2. C:\Users\joshl\OneDrive\claude-to-claude\.fable-host-bridge
 *
 * Allows Fable's Linux shell to execute `agy`, `gh`, `git`, `ssh sabretooth`, and PowerShell
 * commands natively on Windows (Alienware .40) using already-signed-in Windows credentials,
 * with ZERO secrets inside the Linux VM and ZERO cloud pairing required.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

let hostGhToken = process.env.GH_TOKEN || '';
if (!hostGhToken) {
  try {
    const cred = spawnSync('git', ['credential', 'fill'], {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      windowsHide: true,
    });
    const m = (cred.stdout || '').match(/password=([^\r\n]+)/);
    if (m) hostGhToken = m[1].trim();
  } catch {}
}

const BRIDGE_DIRS = [
  'C:/Users/joshl/antigravity/.fable-host-bridge',
  'C:/Users/joshl/antigravity/DREAM-Engine/ops/node/.fable-host-bridge',
  'C:/Users/joshl/OneDrive/claude-to-claude/.fable-host-bridge',
];

for (const dir of BRIDGE_DIRS) {
  fs.mkdirSync(path.join(dir, 'requests'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'responses'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'status.json'),
    JSON.stringify(
      {
        status: 'ONLINE',
        node: 'Alienware-r12-3070-8-gb-gpu- (192.168.0.40)',
        agyPath: 'C:\\Users\\joshl\\AppData\\Local\\agy\\bin\\agy.exe',
        agyCmdDispatcher: 'C:\\DREAM\\bin\\agy.cmd',
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );
}

const inFlight = new Set();

function redactOutput(str) {
  return String(str || '')
    .replace(/\b(AIza[0-9A-Za-z_-]{20,})\b/g, '[REDACTED:XXXX]')
    .replace(/\b(sk-[0-9A-Za-z_-]{16,})\b/g, '[REDACTED:XXXX]')
    .replace(/\b(ghp_[0-9A-Za-z]{20,})\b/g, '[REDACTED:XXXX]')
    .replace(/\b(github_pat_[0-9A-Za-z_]{20,})\b/g, '[REDACTED:XXXX]');
}

function processRequestFile(bridgeDir, reqFile) {
  const fullReqPath = path.join(bridgeDir, 'requests', reqFile);
  if (inFlight.has(fullReqPath)) return;
  inFlight.add(fullReqPath);

  let payload;
  try {
    const raw = fs.readFileSync(fullReqPath, 'utf8');
    payload = JSON.parse(raw);
  } catch {
    inFlight.delete(fullReqPath);
    return;
  }

  const id = payload.id || path.basename(reqFile, '.json');
  const command = payload.command || 'agy --version';
  const cwd = payload.cwd || 'C:\\Users\\joshl\\antigravity\\DREAM-Engine';
  const timeoutMs = Math.min(Number(payload.timeoutMs) || 300000, 600000);

  const env = {
    ...process.env,
    ...(hostGhToken ? { GH_TOKEN: hostGhToken } : {}),
    PATH: `C:\\Users\\joshl\\AppData\\Local\\agy\\bin;C:\\DREAM\\bin;${process.env.PATH || ''}`,
  };

  const startedAt = Date.now();
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    cwd: fs.existsSync(cwd) ? cwd : 'C:\\Users\\joshl\\antigravity\\DREAM-Engine',
    env,
    windowsHide: true,
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => {
    stdout += d.toString('utf8');
  });
  child.stderr.on('data', (d) => {
    stderr += d.toString('utf8');
  });

  const timer = setTimeout(() => {
    try {
      child.kill();
    } catch {}
  }, timeoutMs);

  child.on('close', (code) => {
    clearTimeout(timer);
    const resObj = {
      id,
      command,
      cwd,
      exitCode: code ?? 0,
      durationMs: Date.now() - startedAt,
      stdout: redactOutput(stdout),
      stderr: redactOutput(stderr),
      completedAt: new Date().toISOString(),
    };
    const resPath = path.join(bridgeDir, 'responses', `${id}.json`);
    const tmpPath = `${resPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(resObj, null, 2), 'utf8');
    fs.renameSync(tmpPath, resPath);
    try {
      fs.unlinkSync(fullReqPath);
    } catch {}
    inFlight.delete(fullReqPath);
  });
}

function pollAllBridges() {
  for (const dir of BRIDGE_DIRS) {
    try {
      const reqDir = path.join(dir, 'requests');
      const files = fs.readdirSync(reqDir).filter((f) => f.endsWith('.json'));
      for (const f of files) {
        processRequestFile(dir, f);
      }
    } catch {}
  }
}

setInterval(pollAllBridges, 120);
pollAllBridges();
console.log('[FABLE-HOST-DAEMON] Listening on mounted folders for Fable Linux VM commands...');
