#!/usr/bin/env node
/**
 * 1-Click Rollback / Restore Script for Full-Context Agent Instruction Files
 * Restores AGENTS.md, AGENT.md, CLAUDE.md, GEMINI.md, GEMINI_SPARK_INSTRUCTIONS.md,
 * api.workflow.json, and workflow_api.json from docs/standards/backups-full-context/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const BACKUP_DIR = path.join(ROOT, 'docs', 'standards', 'backups-full-context');

const FILES = [
  'AGENTS.md',
  'AGENT.md',
  'CLAUDE.md',
  'GEMINI.md',
  'GEMINI_SPARK_INSTRUCTIONS.md',
  'api.workflow.json',
  'workflow_api.json',
];

for (const file of FILES) {
  const backupPath = path.join(BACKUP_DIR, `${file}.full-backup`);
  const targetPath = path.join(ROOT, file);
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, targetPath);
    console.log(`[RESTORED] ${file} <- docs/standards/backups-full-context/${file}.full-backup`);
  }
}
