import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRoster } from './build-roster.mjs';

function makeTempFixture() {
  const root = mkdtempSync(join(tmpdir(), 'roster-test-'));
  const fakeProfile = join(root, 'fake-profile');
  const agencyAgentsDir = join(fakeProfile, 'antigravity', 'tools', 'agency-agents');
  const agencySkillsDir = join(fakeProfile, 'OneDrive', 'AGENCY SKILLS');
  const repoSkillsDir = join(fakeProfile, 'antigravity', 'DREAM-Engine', '.agents', 'skills');
  const outFile = join(fakeProfile, 'antigravity', '.fable-kitchen', 'roster', 'roster.json');

  mkdirSync(agencyAgentsDir, { recursive: true });
  mkdirSync(agencySkillsDir, { recursive: true });
  mkdirSync(repoSkillsDir, { recursive: true });

  return {
    root,
    fakeProfile,
    agencyAgentsDir,
    agencySkillsDir,
    repoSkillsDir,
    outFile,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test('a fake folder tree gives the right entries across agency-agents, agency-skills, and .agents/skills', () => {
  const fx = makeTempFixture();
  try {
    // 1. agency-agents divisions (including nested subdir under game-development and non-division strategy/examples)
    mkdirSync(join(fx.agencyAgentsDir, 'engineering'), { recursive: true });
    mkdirSync(join(fx.agencyAgentsDir, 'game-development', 'blender'), { recursive: true });
    mkdirSync(join(fx.agencyAgentsDir, 'examples'), { recursive: true });

    writeFileSync(
      join(fx.agencyAgentsDir, 'engineering', 'engineering-backend-architect.md'),
      [
        '---',
        'name: Backend Architect',
        'description: Designs resilient APIs and distributed systems in Node.js. Second sentence should be dropped.',
        '---',
        '# Backend Architect Body',
        'BODY_MARKER_BACKEND_NEVER_COPY',
      ].join('\n'),
    );

    writeFileSync(
      join(fx.agencyAgentsDir, 'game-development', 'blender', 'blender-rigging-artist.md'),
      [
        '---',
        'name: Blender Rigging Artist',
        'description: Builds clean skeletal rigs and weight maps for .glb export.',
        '---',
        '# Rigging Body',
      ].join('\n'),
    );

    // Non-division folder inside agency-agents should be ignored
    writeFileSync(
      join(fx.agencyAgentsDir, 'examples', 'example-workflow.md'),
      '---\nname: Example Workflow\ndescription: Should not be in roster.\n---\n',
    );

    // 2. OneDrive AGENCY SKILLS (with companions and sub-skill)
    mkdirSync(join(fx.agencySkillsDir, 'revenue-model'), { recursive: true });
    writeFileSync(
      join(fx.agencySkillsDir, 'revenue-model', 'SKILL.md'),
      [
        '---',
        'name: revenue-model',
        'description: "Core business-only revenue rules for every agent. Extra sentence ignored."',
        '---',
        '',
        '## Companions',
        '',
        '- payments: handles checkout rails.',
        '- workspace-memory and caveman: session notes.',
      ].join('\n'),
    );

    mkdirSync(join(fx.agencySkillsDir, 'dateapp-growth-agent', 'elite-affiliate'), { recursive: true });
    writeFileSync(
      join(fx.agencySkillsDir, 'dateapp-growth-agent', 'elite-affiliate', 'SKILL.md'),
      [
        '---',
        'name: elite-affiliate',
        'description: "Affiliate link rules for Elite tier. Never drop referral codes."',
        '---',
        '## Companions',
        '- revenue-model: business rules.',
      ].join('\n'),
    );

    // 3. Repo .agents/skills (with over-200-char first sentence to test 200-char cap)
    mkdirSync(join(fx.repoSkillsDir, 'superpowers'), { recursive: true });
    const longSentence = 'A'.repeat(240) + '. Second sentence.';
    writeFileSync(
      join(fx.repoSkillsDir, 'superpowers', 'SKILL.md'),
      [
        '---',
        'name: superpowers',
        `description: "${longSentence}"`,
        '---',
        '# Superpowers Body',
      ].join('\n'),
    );

    const entries = buildRoster({
      userProfile: fx.fakeProfile,
      agencyAgentsDir: fx.agencyAgentsDir,
      agencySkillsDir: fx.agencySkillsDir,
      repoSkillsDir: fx.repoSkillsDir,
      outFile: fx.outFile,
    });

    const written = JSON.parse(readFileSync(fx.outFile, 'utf8'));
    assert.deepEqual(entries, written);
    assert.equal(entries.length, 5);

    const backend = entries.find((e) => e.id === 'engineering-backend-architect');
    assert.ok(backend);
    assert.equal(backend.source, 'agency-agents');
    assert.equal(backend.division, 'engineering');
    assert.equal(backend.name, 'Backend Architect');
    assert.equal(backend.description, 'Designs resilient APIs and distributed systems in Node.js.');
    assert.equal(
      backend.path,
      '%USERPROFILE%\\antigravity\\tools\\agency-agents\\engineering\\engineering-backend-architect.md',
    );
    assert.equal(backend.companions, undefined);

    const blender = entries.find((e) => e.id === 'blender-rigging-artist');
    assert.ok(blender);
    assert.equal(blender.source, 'agency-agents');
    assert.equal(blender.division, 'game-development');
    assert.equal(blender.name, 'Blender Rigging Artist');

    const rev = entries.find((e) => e.id === 'revenue-model');
    assert.ok(rev);
    assert.equal(rev.source, 'agency-skills');
    assert.equal(rev.division, 'skills');
    assert.equal(rev.description, 'Core business-only revenue rules for every agent.');
    assert.deepEqual(rev.companions, ['payments', 'workspace-memory', 'caveman']);

    const subSkill = entries.find((e) => e.id === 'dateapp-growth-agent/elite-affiliate');
    assert.ok(subSkill);
    assert.equal(subSkill.source, 'agency-skills');
    assert.deepEqual(subSkill.companions, ['revenue-model']);

    const sp = entries.find((e) => e.id === 'superpowers');
    assert.ok(sp);
    assert.equal(sp.source, '.agents/skills');
    assert.equal(sp.description.length, 200);
    assert.equal(sp.description, 'A'.repeat(200));

    // Verify no user folder name appears anywhere in the serialized output
    const rawJson = readFileSync(fx.outFile, 'utf8');
    assert.ok(!/[cC]:[\\/]+[uU]sers[\\/]+/.test(rawJson), 'roster.json must never contain a Windows user folder path');
  } finally {
    fx.cleanup();
  }
});

test('a body is never copied into the roster', () => {
  const fx = makeTempFixture();
  try {
    mkdirSync(join(fx.agencyAgentsDir, 'design'), { recursive: true });
    writeFileSync(
      join(fx.agencyAgentsDir, 'design', 'design-ui-specialist.md'),
      [
        '---',
        'name: UI Specialist',
        'description: Short frontmatter summary.',
        '---',
        '# Detailed Body',
        'SECRET_BODY_SENTINEL_12345_NEVER_COPY',
        '## Companions',
        '- motion: SECRET_COMPANION_BODY_PROSE_67890',
      ].join('\n'),
    );

    mkdirSync(join(fx.agencyAgentsDir, 'engineering'), { recursive: true });
    writeFileSync(
      join(fx.agencyAgentsDir, 'engineering', 'no-fm-agent.md'),
      '# Heading Only\nNO_FM_BODY_SENTINEL_99999_NEVER_COPY\n',
    );

    buildRoster({
      userProfile: fx.fakeProfile,
      agencyAgentsDir: fx.agencyAgentsDir,
      agencySkillsDir: fx.agencySkillsDir,
      repoSkillsDir: fx.repoSkillsDir,
      outFile: fx.outFile,
    });

    const rawJson = readFileSync(fx.outFile, 'utf8');
    assert.ok(!rawJson.includes('SECRET_BODY_SENTINEL_12345_NEVER_COPY'));
    assert.ok(!rawJson.includes('SECRET_COMPANION_BODY_PROSE_67890'));
    assert.ok(!rawJson.includes('NO_FM_BODY_SENTINEL_99999_NEVER_COPY'));
    assert.ok(!rawJson.includes('Detailed Body'));
    assert.ok(!rawJson.includes('Heading Only'));
  } finally {
    fx.cleanup();
  }
});

test('excluded folders are skipped by default', () => {
  const fx = makeTempFixture();
  try {
    const excludedDirs = [
      'azure-ai',
      'azure-storage',
      'azure-custom-placeholder',
      'microsoft-foundry',
      'entra-app-registration',
      'appinsights-instrumentation',
      'marketing-fleet-prompts.RETIRED-2026-11-03',
      'old-skill-RETIRED',
      'antigravity-fleet',
    ];

    for (const dirName of excludedDirs) {
      mkdirSync(join(fx.agencySkillsDir, dirName), { recursive: true });
      writeFileSync(
        join(fx.agencySkillsDir, dirName, 'SKILL.md'),
        `---\nname: ${dirName}\ndescription: Should be excluded.\n---\n`,
      );
    }

    mkdirSync(join(fx.agencySkillsDir, 'workspace-memory'), { recursive: true });
    writeFileSync(
      join(fx.agencySkillsDir, 'workspace-memory', 'SKILL.md'),
      '---\nname: workspace-memory\ndescription: Kept skill.\n---\n',
    );

    const entries = buildRoster({
      userProfile: fx.fakeProfile,
      agencyAgentsDir: fx.agencyAgentsDir,
      agencySkillsDir: fx.agencySkillsDir,
      repoSkillsDir: fx.repoSkillsDir,
      outFile: fx.outFile,
    });

    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, 'workspace-memory');
  } finally {
    fx.cleanup();
  }
});

test('a file with no front matter still gets a name from its file name', () => {
  const fx = makeTempFixture();
  try {
    mkdirSync(join(fx.agencyAgentsDir, 'gis'), { recursive: true });
    writeFileSync(
      join(fx.agencyAgentsDir, 'gis', 'gis-cartography-specialist.md'),
      '# Cartography Specialist\nBuilds terrain and projection layers.\n',
    );

    mkdirSync(join(fx.repoSkillsDir, 'plain-skill-folder'), { recursive: true });
    writeFileSync(
      join(fx.repoSkillsDir, 'plain-skill-folder', 'bare-skill-file.md'),
      '# Bare Skill\nBody text that must not be copied.\n',
    );

    const entries = buildRoster({
      userProfile: fx.fakeProfile,
      agencyAgentsDir: fx.agencyAgentsDir,
      agencySkillsDir: fx.agencySkillsDir,
      repoSkillsDir: fx.repoSkillsDir,
      outFile: fx.outFile,
    });

    assert.equal(entries.length, 2);
    const gisEntry = entries.find((e) => e.id === 'gis-cartography-specialist');
    assert.ok(gisEntry);
    assert.equal(gisEntry.name, 'gis-cartography-specialist');
    assert.equal(gisEntry.description, '');
    assert.equal(gisEntry.division, 'gis');
    assert.equal(gisEntry.source, 'agency-agents');

    const skillEntry = entries.find((e) => e.id === 'plain-skill-folder/bare-skill-file');
    assert.ok(skillEntry);
    assert.equal(skillEntry.name, 'bare-skill-file');
    assert.equal(skillEntry.description, '');
    assert.equal(skillEntry.division, 'skills');
    assert.equal(skillEntry.source, '.agents/skills');
  } finally {
    fx.cleanup();
  }
});
