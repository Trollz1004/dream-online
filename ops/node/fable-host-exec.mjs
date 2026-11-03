#!/usr/bin/env node
/**
 * Fable Linux VM Client Helper — Run any Windows command (agy, gh, git, ssh sabretooth, powershell)
 * on Alienware (.40) directly from Fable's mounted Linux folder!
 *
 * Usage inside Fable's Linux shell:
 *   node fable-host-exec.mjs "agy --version"
 *   node fable-host-exec.mjs "agy --dangerously-skip-permissions --help"
 *   node fable-host-exec.mjs "gh pr list --repo Trollz1004/dream-online"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const command = process.argv.slice(2).join(' ').trim() || 'agy.exe --version';
const cwd = process.env.FABLE_WIN_CWD || 'C:\\Users\\joshl\\antigravity\\DREAM-Engine';

const candidates = [
  path.join(__dirname, '.fable-host-bridge'),
  path.join(__dirname, '..', '..', '.fable-host-bridge'),
  path.resolve('.fable-host-bridge'),
];

const bridgeDir = candidates.find((d) => fs.existsSync(d)) || candidates[0];
fs.mkdirSync(path.join(bridgeDir, 'requests'), { recursive: true });
fs.mkdirSync(path.join(bridgeDir, 'responses'), { recursive: true });

const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const reqPath = path.join(bridgeDir, 'requests', `${id}.json`);
const resPath = path.join(bridgeDir, 'responses', `${id}.json`);

fs.writeFileSync(
  reqPath,
  JSON.stringify({ id, command, cwd, createdAt: new Date().toISOString() }, null, 2),
  'utf8'
);

const deadline = Date.now() + 300000;
while (Date.now() < deadline) {
  if (fs.existsSync(resPath)) {
    const raw = fs.readFileSync(resPath, 'utf8');
    try {
      fs.unlinkSync(resPath);
    } catch {}
    const res = JSON.parse(raw);
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    process.exit(res.exitCode ?? 0);
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
}

console.error('Timed out waiting for Windows host bridge response.');
process.exit(124);
