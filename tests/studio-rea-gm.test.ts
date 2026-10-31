import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_NODE_TOPOLOGY,
  CO_GM_COUNCIL,
  DEFAULT_AGENT_SDK_LANES,
  INITIAL_MEMORY_TIERS,
  INITIAL_MEMORY_ENTRIES,
  GRAPHY_CODEBASE_NODES,
  REA_SAMPLE_BINARIES,
  analyzeReaBinary,
  formatObsidianVaultBundle,
  redactSecretsWithXXXX,
  GEMINI_SOUL_MD,
  StudioConfigManager,
} from '../src/engine/studioConfig.ts';

test('DREAM Engine Studio: Canonical Alienware .40, T5500 .15, and Mission Control :3130 topology with no Sabertooth or Paperclip', () => {
  const byId = new Map(CANONICAL_NODE_TOPOLOGY.map((n) => [n.id, n]));
  assert.equal(byId.get('alienware-40')?.url, 'http://192.168.0.40:20128/api/v1');
  assert.equal(byId.get('t5500-15-lab')?.url, 'http://192.168.0.15:9127');
  assert.equal(byId.get('t5500-15-ollama')?.url, 'http://192.168.0.15:11434');
  assert.equal(byId.get('mission-control-3130')?.url, 'http://127.0.0.1:3130');

  const serialized = JSON.stringify(CANONICAL_NODE_TOPOLOGY).toLowerCase();
  assert.equal(serialized.includes('sabertooth'), false);
  assert.equal(serialized.includes('paperclip'), false);
  assert.equal(serialized.includes('omniroute'), false);
  assert.equal(serialized.includes('192.168.0.8'), false);
});

test('DREAM Engine Studio: Full Co-GM & Unofficial Co-Founder Council (Gemini, Claude, Perplexity, Grok, OpenAI Codex, Hermes, Electrician Founder)', () => {
  const joined = CO_GM_COUNCIL.map((m) => `${m.name} ${m.platform}`).join(' ');
  assert.equal(joined.includes('GOOGLE GEMINI'), true);
  assert.equal(joined.includes('CLAUDE'), true);
  assert.equal(joined.includes('PERPLEXITY'), true);
  assert.equal(joined.includes('GROK'), true);
  assert.equal(joined.includes('OPENAI (CODEX)'), true);
  assert.equal(joined.includes('HERMES'), true);
  assert.equal(joined.includes('ELECTRICIAN FOUNDER'), true);
});

test('DREAM Engine Studio: Google Ultra Custom Agent SDK lanes & 4-Tier Memory Failover Ladder', () => {
  assert.equal(DEFAULT_AGENT_SDK_LANES.length >= 6, true);
  const protocols = DEFAULT_AGENT_SDK_LANES.map((l) => l.protocol);
  assert.equal(protocols.includes('direct-sdk'), true);
  assert.equal(protocols.includes('a2a-mesh'), true);
  assert.equal(protocols.includes('python-acp'), true);
  assert.equal(protocols.includes('headless-cli'), true);
  assert.equal(protocols.includes('mcp-tool'), true);

  assert.deepEqual(
    INITIAL_MEMORY_TIERS.map((t) => t.id),
    ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud']
  );

  const bundle = formatObsidianVaultBundle(INITIAL_MEMORY_ENTRIES);
  assert.equal(bundle.includes('#UntilNoKidInNeed'), true);
});

test('DREAM Engine Studio: REA (morluto/rea) binary analysis & 3D World Studio entity spawning', () => {
  const sample = REA_SAMPLE_BINARIES[0];
  const report = analyzeReaBinary(sample.fileName, new TextEncoder().encode(sample.payload));
  assert.equal(report.format.includes('WebAssembly'), true);
  assert.equal(report.extractedStrings.length > 0, true);
  assert.equal(report.mcpCommands.length >= 3, true);

  const mgr = new StudioConfigManager();
  const initialCount = mgr.entities.length;
  const created = mgr.addEntity({
    name: report.suggestedEnginePreset.name,
    type: report.suggestedEnginePreset.entityType,
    position: [10, 0, -8],
    scale: report.suggestedEnginePreset.scale,
    rotationYDeg: 0,
    color: report.suggestedEnginePreset.color,
    emissiveIntensity: report.suggestedEnginePreset.emissiveIntensity,
    sourceNote: report.suggestedEnginePreset.summary,
  });
  assert.equal(mgr.entities.length, initialCount + 1);
  assert.equal(created.name.includes('REA'), true);
  assert.equal(GRAPHY_CODEBASE_NODES.length >= 6, true);
});

test('DREAM Engine Studio: Immutable GEMINI_SOUL.MD & Zero-Trust Auto-XXXX Secret Redaction on Session-End (ri) Memory', () => {
  assert.equal(GEMINI_SOUL_MD.includes('#UntilNoKidInNeed'), true);
  assert.equal(GEMINI_SOUL_MD.includes('#ForTheKids'), true);
  assert.equal(GEMINI_SOUL_MD.includes('Built with Google Gemini'), true);

  const rawLeak =
    `Accidental leak test: ${"AIza" + "SyD9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4"} and ${"sk-proj-" + "99887766554433221100aabbccddeeff"} plus API_KEY="my_super_secret_token_value_12345"`;
  const result = redactSecretsWithXXXX(rawLeak);
  assert.equal(result.redactionsCount >= 3, true);
  assert.equal(result.sanitized.includes(('AIza' + 'SyD9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4')), false);
  assert.equal(result.sanitized.includes(('sk-proj-' + '99887766554433221100aabbccddeeff')), false);
  assert.equal(result.sanitized.includes('my_super_secret_token_value_12345'), false);
  assert.equal(result.sanitized.includes('XXXX'), true);

  const mgr = new StudioConfigManager();
  const { entry, redactionResult } = mgr.recordSessionEndMemory({
    title: 'Session-End ri Test',
    authorGm: 'Google Gemini (Lead Architect)',
    content: rawLeak,
    wikilinks: ['[[GEMINI-SOUL]]', '[[UntilNoKidInNeed]]'],
  });
  assert.equal(redactionResult.redactionsCount >= 3, true);
  assert.equal(entry.l2Markdown.includes('XXXX'), true);
  assert.equal(entry.l2Markdown.includes(('AIza' + 'SyD9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4')), false);
});


