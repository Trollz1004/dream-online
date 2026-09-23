// Wires the DREAM brain into Claude Code's user settings. Idempotent.
// Adds a SessionStart and a SessionEnd hook, and MCP_TIMEOUT so slow MCP servers
// (the ComfyUI one starts through npx) get 90 s instead of 30 s. Backs the file up
// first and never prints it, because its env block holds API keys.
//   node install-brain.mjs [--settings <file>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argIdx = process.argv.indexOf('--settings');
const file = argIdx > 0 ? process.argv[argIdx + 1] : path.join(os.homedir(), '.claude', 'settings.json');
const hookScript = path.join(here, 'brain-hook.mjs').replace(/\\/g, '/');
const MARK = 'dream-brain';

const settings = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
fs.copyFileSync(file, `${file}.bak-dream-brain`);

settings.hooks ??= {};
const want = { SessionStart: 'start', SessionEnd: 'end' };
const changed = [];
for (const [event, arg] of Object.entries(want)) {
  const groups = (settings.hooks[event] ??= []);
  const has = groups.some((g) => (g.hooks || []).some((h) => String(h.command).includes(MARK)));
  if (has) continue;
  groups.push({ hooks: [{ type: 'command', command: `node "${hookScript}" ${arg} # ${MARK}`, timeout: 20 }] });
  changed.push(`hook ${event}`);
}
settings.env ??= {};
if (settings.env.MCP_TIMEOUT !== '90000') { settings.env.MCP_TIMEOUT = '90000'; changed.push('env MCP_TIMEOUT=90000'); }

fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
console.log(changed.length ? `changed: ${changed.join(', ')}` : 'already installed');
