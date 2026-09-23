// Claude Code session hooks for the DREAM brain.
//   node brain-hook.mjs start   (SessionStart) prints the boot card as additionalContext
//   node brain-hook.mjs end     (SessionEnd)   appends the mechanical facts to Session memory
// A hook must never break a session, so every failure exits 0 with empty output.
import fs from 'node:fs';
import path from 'node:path';
import * as brain from './brain-core.mjs';

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8').replace(/^﻿/, '').trim() || '{}'); } catch { return {}; }
}

function start(input) {
  const facts = brain.repoFacts();
  if (input.session_id) {
    const file = brain.sessionStatePath(input.session_id);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ started: new Date().toISOString(), cwd: input.cwd, source: input.source, head: facts.head }));
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: brain.bootCard() },
  }));
}

function end(input) {
  const id = input.session_id || 'unknown';
  let began = {};
  try { began = JSON.parse(fs.readFileSync(brain.sessionStatePath(id), 'utf8')); } catch { /* no start record */ }
  const facts = brain.repoFacts();
  const commits = brain.commitsSince(began.head);
  brain.appendSession({
    title: `session ${id} ended (${input.reason || 'unknown'})`,
    lines: [
      began.started ? `started ${began.started} (${began.source || '?'}) in ${began.cwd || '?'}` : 'start not recorded',
      facts.branch === null ? 'game repo not readable' : `game repo on ${facts.branch} at ${facts.head}, ${facts.dirty} uncommitted`,
      commits.length ? `commits this session: ${commits.join('; ')}` : 'no commits this session',
    ],
  });
  try { fs.unlinkSync(brain.sessionStatePath(id)); } catch { /* already gone */ }
}

try {
  const input = readStdin();
  if (process.argv[2] === 'start') start(input);
  else if (process.argv[2] === 'end') end(input);
} catch (err) {
  process.stderr.write(`dream-brain hook: ${err.message}\n`);
}
process.exit(0);
