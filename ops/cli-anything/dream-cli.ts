#!/usr/bin/env node
/**
 * DREAM-CLI — HKUDS/CLI-Anything Compliant Text-In / Text-Out AI Agent CLI
 * Usage:
 *   npx tsx ops/cli-anything/dream-cli.ts --help
 *   npx tsx ops/cli-anything/dream-cli.ts inspect --json
 *   npx tsx ops/cli-anything/dream-cli.ts char set --class crimson-vanguard --vfx ember-wyrm-crimson
 *   npx tsx ops/cli-anything/dream-cli.ts skill cast --move combo-all
 *   npx tsx ops/cli-anything/dream-cli.ts security run --mode triple-team --json
 */

import { executeCliAnythingCommand } from '../../src/engine/cli-anything/cli-anything-bridge.ts';

const rawArgs = process.argv.slice(2);
const wantJson = rawArgs.includes('--json');
const cmdString = `dream-cli ${rawArgs.join(' ')}`;

const result = executeCliAnythingCommand(cmdString);

if (wantJson) {
  console.log(JSON.stringify(result.jsonOut, null, 2));
} else {
  console.log(result.textOut);
}

process.exit(result.exitCode);
