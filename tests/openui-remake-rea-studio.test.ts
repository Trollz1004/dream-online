import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOpenUiProgram,
  evaluateOpenUiProgram,
  OPENUI_GAME_DEV_PRESETS,
  executeOpenUiAction,
} from '../src/engine/openui/openui-engine.ts';
import {
  ReaCityArchitect,
  REA_CITY_ARCHETYPES,
  REA_RECONSTRUCTION_EVIDENCE_LEDGER,
} from '../src/engine/world/rea-city-architect.ts';
import {
  RemakeSwapBoard,
  DEFAULT_REMAKE_CONTENT_SLOTS,
  IDE_BENCHMARK_PROFILES,
  verifyFl496405PublicCopyGate,
} from '../src/engine/remake/remake-swap-board.ts';
import { StudioConfigManager } from '../src/engine/studioConfig.ts';

test('OpenUI Lang 1.0 Engine: parses line-oriented declarative UI statements, resolves root graph, and evaluates @Filter, @Sort, @Count, @Round, and $state bindings', () => {
  const source = `
root = EngineWorkspace([header, statsRow, sliderSun, filteredList])
header = Header("DREAM Engine Cloud IDE", "Built with Google Gemini · OpenUI Lang 1.0")
$sunElevation = 48
$minFps = 60
statsRow = StatGrid([statFps, statSun])
statFps = StatBlock("Target FPS", @Round(119.84, 0), "fps")
statSun = StatBlock("Sun Elevation", $sunElevation, "deg")
sliderSun = SliderControl("Sun Elevation", $sunElevation, 5, 85, 1)
rawNodes = [{"name": "Day Dream", "fps": 120}, {"name": "Legacy", "fps": 45}, {"name": "Circle-Craft", "fps": 144}]
activeNodes = @Filter(rawNodes, "fps", ">=", $minFps)
sortedNodes = @Sort(activeNodes, "fps", "desc")
filteredList = NodeCountBadge(@Count(sortedNodes), sortedNodes)
`;

  const ast = parseOpenUiProgram(source);
  assert.equal(ast.rootName, 'root');
  assert.equal(ast.statements.length >= 9, true);
  assert.equal(ast.initialState.sunElevation, 48);
  assert.equal(ast.initialState.minFps, 60);

  const evaluated = evaluateOpenUiProgram(ast, { sunElevation: 62 });
  assert.equal(evaluated.state.sunElevation, 62);
  assert.equal(evaluated.root?.component, 'EngineWorkspace');
  assert.equal(evaluated.root?.children.length, 4);

  const badge = evaluated.nodesByName['filteredList'];
  assert.ok(badge);
  assert.equal(badge.args[0], 2); // 120 and 144 pass >= 60
  const sorted = badge.args[1] as Array<{ name: string; fps: number }>;
  assert.equal(sorted[0].name, 'Circle-Craft');
  assert.equal(sorted[1].name, 'Day Dream');
});

test('OpenUI Lang 1.0 Engine: executes Action([@Set(...), @Run(...)]) and mutates live StudioConfigManager state across all built-in Game Dev Presets', () => {
  assert.equal(OPENUI_GAME_DEV_PRESETS.length >= 4, true);

  const studio = new StudioConfigManager();
  const state: Record<string, unknown> = {
    worldPhase: 'day_dream_3d',
    sunElevation: 48,
    fogDensity: 1.0,
    cityArchetype: 'SFA',
  };

  const result = executeOpenUiAction(
    {
      type: 'Action',
      steps: [
        { fn: '@Set', args: ['$worldPhase', 'circle_16bit'] },
        { fn: '@Set', args: ['$sunElevation', 68] },
        { fn: '@Run', args: ['applyShaderAndSpawnCity', 'SFA', 'circle_16bit'] },
      ],
    },
    state,
    studio
  );

  assert.equal(result.updatedState.worldPhase, 'circle_16bit');
  assert.equal(result.updatedState.sunElevation, 68);
  assert.equal(studio.shader.sunElevationDeg, 68);
  assert.equal(studio.entities.some((e) => e.name.includes('SFA')), true);
});

test('REA Clean-Room Procedural City Architect: generates deterministic 80m x 120m blocks with BLDG_ECO_primary.bdf & SFA_primary.bdf WFC rooftop rules and circle_16bit cylindrical morph', () => {
  assert.equal(REA_CITY_ARCHETYPES.length, 5); // SFA, SFB, SFC, SFD, SFJ
  assert.equal(REA_RECONSTRUCTION_EVIDENCE_LEDGER.length >= 4, true);
  assert.equal(
    REA_RECONSTRUCTION_EVIDENCE_LEDGER.every((ev) => ev.sha256.length === 64 && ev.status === 'VERIFIED'),
    true
  );

  const architect = new ReaCityArchitect();
  const blockPbr = architect.generateUrbanBlock({
    archetypeId: 'SFA',
    seed: 1004,
    phase: 'day_dream_3d',
    centerX: 0,
    centerZ: -24,
  });

  assert.equal(blockPbr.footprintMeters[0], 80);
  assert.equal(blockPbr.footprintMeters[1], 120);
  assert.equal(blockPbr.sidewalkSetbackMeters, 4.0);
  assert.equal(blockPbr.geometryPrimitive, 'pbr-curtain-wall');
  assert.equal(blockPbr.rooftopModules.length >= 2, true);
  assert.equal(blockPbr.entities.length >= 4, true);

  const blockCircle = architect.generateUrbanBlock({
    archetypeId: 'SFA',
    seed: 1004,
    phase: 'circle_16bit',
    centerX: 0,
    centerZ: -24,
  });
  assert.equal(blockCircle.geometryPrimitive, 'cylinder-circle-16bit');
  assert.equal(blockCircle.colorDepthBits, 16);
});

test('Remake Swap Board & IDE Benchmark Engine: swaps content.json slots, reports the gate (features matched, clear visual difference, own code) with no pixel score, synthesizes Unreal/Unity/PlayCanvas/Spline patterns, and enforces FL §496.405 clean copy', () => {
  assert.equal(IDE_BENCHMARK_PROFILES.length >= 5, true);
  assert.equal(DEFAULT_REMAKE_CONTENT_SLOTS.length >= 6, true);

  const board = new RemakeSwapBoard();
  // The board never invents a measure: with no gate run it says NOT MEASURED, and there is no pixel score.
  const initialReport = board.computeGateReport();
  assert.equal(initialReport.gate, 'features matched, clear visual difference, own code');
  assert.equal(initialReport.status, 'NOT MEASURED');
  assert.equal(initialReport.featuresMatchedPercent, null);
  assert.equal(initialReport.featuresMatchedRequiredPercent, 98);
  assert.equal(JSON.stringify(initialReport).includes('98.8'), false);
  assert.equal(/pixel|frame.?freeze|desktopScore|mobileScore/i.test(JSON.stringify(initialReport)), false);

  // The gate passes on features matched (>= 98), a clear visual difference, and own code. Likeness never passes.
  const good = { featuresMatchedPercent: 98, clearVisualDifferenceFromSource: true, ownCode: true };
  assert.equal(board.computeGateReport(good).status, 'PASS');
  assert.equal(board.computeGateReport({ ...good, featuresMatchedPercent: 97.9 }).status, 'FAIL');
  assert.equal(board.computeGateReport({ ...good, clearVisualDifferenceFromSource: false }).status, 'FAIL');
  assert.equal(board.computeGateReport({ ...good, ownCode: false }).status, 'FAIL');

  // No public string on the board carries the old pixel-lock wording.
  const publicText = JSON.stringify([IDE_BENCHMARK_PROFILES, DEFAULT_REMAKE_CONTENT_SLOTS]);
  assert.equal(/98\.8|pixel.?lock|pixel.?freeze|frame.?freeze/i.test(publicText), false);

  // Swap theme and hero headline slot
  board.updateSlot('studio_theme_preset', 'cyber-emerald-webgpu');
  board.updateSlot('hero_headline', 'DREAM ENGINE 2.0 · 100% AI-BUILT WEBGPU CREATION STUDIO');
  assert.equal(board.getSlotValue('studio_theme_preset'), 'cyber-emerald-webgpu');

  const studio = new StudioConfigManager();
  board.applySlotsToStudio(studio);
  assert.equal(studio.shader.exposure >= 0.8, true);

  // Verify FL §496.405 compliance check across all default Remake slots
  const copyAudit = verifyFl496405PublicCopyGate(board.exportContentJson());
  assert.equal(copyAudit.compliant, true);
  assert.equal(copyAudit.violations.length, 0);
});
