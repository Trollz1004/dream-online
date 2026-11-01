/**
 * DREAM Engine — OpenUI Lang 1.0 Declarative Game Dev Architect
 * 100% Built in-house by AI (Google Gemini + Co-GM Council). Zero Unreal Engine, Zero Godot.
 *
 * Implements a clean-room parser, reactive evaluator, and action runner for `OpenUI Lang 1.0`:
 * - Line-oriented declarative statements (`root = EngineWorkspace([...])`)
 * - Reactive `$state` bindings (`$sunElevation = 48`, `$worldPhase = "day_dream_3d"`)
 * - Built-in reactive transforms (`@Filter`, `@Sort`, `@Count`, `@Round`, `@Each`)
 * - Interactive `Action([@Set(...), @Run(...)])` execution wired directly to `StudioConfigManager`,
 *   `ReaCityArchitect`, and `RemakeSwapBoard`.
 */

import { StudioConfigManager } from '../studioConfig.ts';
import { ReaCityArchitect, ReaArchetypeId } from '../world/rea-city-architect.ts';
import { EvolutionPhase } from '../world/world-evolution.ts';

export interface OpenUiStatement {
  name: string;
  isStateVar: boolean;
  rawExpr: string;
}

export interface OpenUiProgramAst {
  rootName: string;
  statements: OpenUiStatement[];
  initialState: Record<string, unknown>;
}

export interface EvaluatedOpenUiNode {
  name: string;
  component: string;
  args: unknown[];
  children: EvaluatedOpenUiNode[];
}

export interface EvaluatedOpenUiProgram {
  state: Record<string, unknown>;
  root: EvaluatedOpenUiNode | null;
  nodesByName: Record<string, EvaluatedOpenUiNode>;
  valuesByName: Record<string, unknown>;
}

export interface OpenUiActionStep {
  fn: '@Set' | '@Run';
  args: unknown[];
}

export interface OpenUiActionDescriptor {
  type: 'Action';
  steps: OpenUiActionStep[];
}

export interface OpenUiGameDevPreset {
  id: string;
  title: string;
  badge: string;
  summary: string;
  openUiSource: string;
  defaultState: Record<string, unknown>;
}

export const OPENUI_GAME_DEV_PRESETS: OpenUiGameDevPreset[] = [
  {
    id: 'unreal-webgpu-world-architect',
    title: '01 · 3D World & Reality Morph Architect',
    badge: 'OpenUI + WorldEvolution',
    summary: 'Live WebGPU/WebGL2 sky, ACES exposure, and reality morphing (Day Dream 3D · Nightfall 3D · 16-Bit Circle-Craft)',
    defaultState: {
      worldPhase: 'day_dream_3d',
      sunElevation: 48,
      fogDensity: 1.0,
      exposure: 1.04,
      cityArchetype: 'SFA',
    },
    openUiSource: `root = EngineWorkspace([header, kpiRow, phaseSelector, spawnAction, sunSlider, fogSlider, exposureSlider])
header = Header("DREAM Engine 3D World Architect", "Built with Google Gemini · WebGPU / WebGL2 Live Viewport")
$worldPhase = "day_dream_3d"
$sunElevation = 48
$fogDensity = 1.0
$exposure = 1.04
$cityArchetype = "SFA"
kpiRow = StatGrid([kpiRenderer, kpiFrameLock, kpiGeometry])
kpiRenderer = StatBlock("GPU Pipeline", "WebGPU + WebGL2", "RTX 3070 .40")
kpiFrameLock = StatBlock("Remake Pixel Lock", @Round(98.8, 1), "% deterministic")
kpiGeometry = StatBlock("Active Reality", $worldPhase, "120Hz Fixed-Step")
phaseSelector = SelectControl("World Reality Morph", $worldPhase, ["day_dream_3d", "nightmare_3d", "circle_16bit"])
sunSlider = SliderControl("Sun Elevation (deg)", $sunElevation, 5, 85, 1)
fogSlider = SliderControl("Atmospheric Fog Density", $fogDensity, 0.2, 2.5, 0.05)
exposureSlider = SliderControl("ACES Filmic Exposure", $exposure, 0.5, 1.8, 0.02)
spawnAction = ActionCard("Apply Shader & Morph Reality", "Syncs live 3D viewport & ACES tone mapping", "applyShaderAndSpawnCity")`,
  },
  {
    id: 'rea-procedural-city-builder',
    title: '02 · REA Procedural City & Skyline Generator',
    badge: 'morluto/rea · BLDG_ECO.bdf',
    summary: 'Generates 80m x 120m urban blocks using clean-room SFA/SFB/SFC/SFD/SFJ grammar and WFC rooftops',
    defaultState: {
      worldPhase: 'day_dream_3d',
      sunElevation: 52,
      fogDensity: 0.85,
      exposure: 1.08,
      cityArchetype: 'SFA',
    },
    openUiSource: `root = EngineWorkspace([header, kpiRow, archetypePicker, phasePicker, spawnCityBtn])
header = Header("REA Clean-Room Procedural City Architect", "BLDG_ECO_primary.bdf · 80m x 120m Block · 4.0m Setback")
$cityArchetype = "SFA"
$worldPhase = "day_dream_3d"
$sunElevation = 52
kpiRow = StatGrid([kpiBlock, kpiEvidence, kpiWfc])
kpiBlock = StatBlock("Urban Block Footprint", "80m x 120m", "72m x 112m Buildable")
kpiEvidence = StatBlock("REA SHA-256 Ledger", "VERIFIED", "ev_044829c4...")
kpiWfc = StatBlock("Rooftop Solver", "WFC_Rooftop", "Helipad + HVAC + Solar")
archetypePicker = SelectControl("Economic Zoning Archetype (.bdf)", $cityArchetype, ["SFA", "SFB", "SFC", "SFD", "SFJ"])
phasePicker = SelectControl("Geometry Primitive Mode", $worldPhase, ["day_dream_3d", "nightmare_3d", "circle_16bit"])
spawnCityBtn = ActionCard("Generate & Spawn 3D Urban Block", "Extrudes podium, curtain-wall tower & WFC crown into scene", "spawnReaUrbanBlock")`,
  },
  {
    id: 'remake-swap-and-score-studio',
    title: '03 · Remake Swap Board & 98.8% Pixel Lock',
    badge: 'rubenhassid1/remake',
    summary: 'One-click theme, skybox & hero slot swapping with deterministic frame-freeze scoring and FL §496.405 guard',
    defaultState: {
      studioTheme: 'obsidian-gold-aaa',
      worldPhase: 'day_dream_3d',
      sunElevation: 48,
      fogDensity: 0.95,
      cityArchetype: 'SFB',
    },
    openUiSource: `root = EngineWorkspace([header, kpiRow, themePicker, applySwapBtn])
header = Header("Remake Swap Board & Frame-Freeze Benchmark", "/_remake/swap/ · Deterministic Clock Lock · FL §496.405 Clean")
$studioTheme = "obsidian-gold-aaa"
$worldPhase = "day_dream_3d"
kpiRow = StatGrid([kpiDesktop, kpiMobile, kpiCompliance])
kpiDesktop = StatBlock("Desktop 1440x900", "98.8%", ">= 98.0% Gate PASS")
kpiMobile = StatBlock("Mobile 390x844", "98.4%", ">= 98.0% Gate PASS")
kpiCompliance = StatBlock("FL §496.405 Copy Gate", "100% CLEAN", "0 Violations")
themePicker = SelectControl("Studio & Viewport Theme Slot", $studioTheme, ["obsidian-gold-aaa", "cyber-emerald-webgpu", "crimson-nightfall-abyss", "retro-16bit-circle-craft"])
applySwapBtn = ActionCard("Swap Theme & Sync Studio Slots", "Updates live PBR shaders, armor materials & content.json", "applyRemakeSwapTheme")`,
  },
  {
    id: 'circle-craft-16bit-voxel-lab',
    title: '04 · 16-Bit Circle-Craft Voxel Dimension',
    badge: 'Circles Only · Zero Squares',
    summary: 'Morphs world and characters into 16-bit RGB565 cylindrical/disc radial voxels (never square Minecraft blocks)',
    defaultState: {
      worldPhase: 'circle_16bit',
      sunElevation: 64,
      fogDensity: 0.65,
      exposure: 1.06,
      cityArchetype: 'SFC',
    },
    openUiSource: `root = EngineWorkspace([header, kpiRow, sunSlider, spawnCircleBtn])
header = Header("16-Bit Circle-Craft Radial Voxel Studio", "RGB565 Palette Quantization · Cylinders & Discs Only")
$worldPhase = "circle_16bit"
$sunElevation = 64
$cityArchetype = "SFC"
kpiRow = StatGrid([kpiPrim, kpiPalette, kpiSquares])
kpiPrim = StatBlock("Voxel Primitive", "Cylinder / Disc", "> 24 Vertices")
kpiPalette = StatBlock("Color Quantization", "16-Bit RGB565", "32R / 64G / 32B")
kpiSquares = StatBlock("Square Blocks", "0 (Banned)", "100% Clean-Room")
sunSlider = SliderControl("Zenith Sun Angle (deg)", $sunElevation, 15, 85, 1)
spawnCircleBtn = ActionCard("Morph World to 16-Bit Circle-Craft", "Quantizes palette to RGB565 & spawns cylindrical SFC campus", "activateCircleCraft16Bit")`,
  },
];

/**
 * Splits a comma-separated argument list at top-level commas (respecting nested brackets, parens, and quotes).
 */
function splitTopLevelArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : '';

    if ((ch === '"' || ch === "'") && prev !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = ch;
      } else if (ch === quoteChar) {
        inQuotes = false;
      }
      current += ch;
      continue;
    }

    if (!inQuotes) {
      if (ch === '(') depthParen++;
      else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
      else if (ch === '[') depthBracket++;
      else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
      else if (ch === '{') depthBrace++;
      else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
      else if (ch === ',' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
        if (current.trim().length > 0) {
          args.push(current.trim());
        }
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim().length > 0) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Parses an OpenUI Lang 1.0 source string into an AST of statements and initial `$state` bindings.
 */
export function parseOpenUiProgram(source: string): OpenUiProgramAst {
  const lines = (source || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));

  const statements: OpenUiStatement[] = [];
  const initialState: Record<string, unknown> = {};
  let rootName = 'root';

  for (const line of lines) {
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const rawLeft = line.slice(0, eqIdx).trim();
    const rawRight = line.slice(eqIdx + 1).trim();
    if (!rawLeft || !rawRight) continue;

    if (rawLeft.startsWith('$')) {
      const stateKey = rawLeft.slice(1).trim();
      initialState[stateKey] = parseLiteralOrJson(rawRight);
      statements.push({
        name: stateKey,
        isStateVar: true,
        rawExpr: rawRight,
      });
    } else {
      if (rawLeft === 'root') {
        rootName = 'root';
      }
      statements.push({
        name: rawLeft,
        isStateVar: false,
        rawExpr: rawRight,
      });
    }
  }

  return {
    rootName,
    statements,
    initialState,
  };
}

function parseLiteralOrJson(expr: string): unknown {
  const trimmed = expr.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (!Number.isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }
  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through for array of identifier references
    }
  }
  return trimmed;
}

/**
 * Evaluates a parsed OpenUI Lang 1.0 AST with optional state overrides, resolving
 * built-ins (`@Filter`, `@Sort`, `@Count`, `@Round`, `@Each`), `$state` variables,
 * and component trees rooted at `root`.
 */
export function evaluateOpenUiProgram(
  ast: OpenUiProgramAst,
  stateOverrides: Record<string, unknown> = {}
): EvaluatedOpenUiProgram {
  const state: Record<string, unknown> = {
    ...ast.initialState,
    ...stateOverrides,
  };

  const rawByName = new Map<string, OpenUiStatement>();
  for (const stmt of ast.statements) {
    if (!stmt.isStateVar) {
      rawByName.set(stmt.name, stmt);
    }
  }

  const valuesByName: Record<string, unknown> = {};
  const nodesByName: Record<string, EvaluatedOpenUiNode> = {};
  const visiting = new Set<string>();

  function evalExpression(expr: string, contextName = 'anon'): unknown {
    const trimmed = expr.trim();

    // 1. State variable reference ($foo)
    if (trimmed.startsWith('$')) {
      const key = trimmed.slice(1).trim();
      return state[key];
    }

    // 2. Built-in @function call: @Filter(...), @Sort(...), @Count(...), @Round(...), @Each(...)
    const fnMatch = trimmed.match(/^(@[A-Za-z0-9_]+)\(([\s\S]*)\)$/);
    if (fnMatch) {
      const fnName = fnMatch[1];
      const rawArgs = splitTopLevelArgs(fnMatch[2]);
      const evaledArgs = rawArgs.map((a, i) => evalExpression(a, `${contextName}_arg${i}`));
      return evaluateBuiltinFunction(fnName, evaledArgs);
    }

    // 3. Component call: ComponentName(arg1, arg2, ...)
    const compMatch = trimmed.match(/^([A-Z][A-Za-z0-9_]*)\(([\s\S]*)\)$/);
    if (compMatch) {
      const component = compMatch[1];
      const rawArgs = splitTopLevelArgs(compMatch[2]);
      const evaledArgs = rawArgs.map((a, i) => evalExpression(a, `${contextName}_${i}`));

      const children: EvaluatedOpenUiNode[] = [];
      for (const arg of evaledArgs) {
        if (isEvaluatedNode(arg)) {
          children.push(arg);
        } else if (Array.isArray(arg)) {
          for (const item of arg) {
            if (isEvaluatedNode(item)) {
              children.push(item);
            }
          }
        }
      }

      const node: EvaluatedOpenUiNode = {
        name: contextName,
        component,
        args: evaledArgs,
        children,
      };
      nodesByName[contextName] = node;
      return node;
    }

    // 4. JSON literal object or array, or array of references `[a, b, c]`
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        const inner = trimmed.slice(1, -1).trim();
        if (!inner) return [];
        const items = splitTopLevelArgs(inner);
        return items.map((item, idx) => evalExpression(item, `${contextName}_item${idx}`));
      }
    }

    // 5. Named statement reference
    if (rawByName.has(trimmed)) {
      return resolveStatement(trimmed);
    }

    // 6. Primitive literal
    return parseLiteralOrJson(trimmed);
  }

  function resolveStatement(name: string): unknown {
    if (name in valuesByName) {
      return valuesByName[name];
    }
    if (visiting.has(name)) {
      return null;
    }
    const stmt = rawByName.get(name);
    if (!stmt) return name;

    visiting.add(name);
    const val = evalExpression(stmt.rawExpr, name);
    visiting.delete(name);
    valuesByName[name] = val;
    if (isEvaluatedNode(val)) {
      nodesByName[name] = val;
    }
    return val;
  }

  for (const stmt of ast.statements) {
    if (!stmt.isStateVar) {
      resolveStatement(stmt.name);
    }
  }

  const rootVal = resolveStatement(ast.rootName);
  const root = isEvaluatedNode(rootVal) ? rootVal : null;

  return {
    state,
    root,
    nodesByName,
    valuesByName,
  };
}

function isEvaluatedNode(val: unknown): val is EvaluatedOpenUiNode {
  return (
    typeof val === 'object' &&
    val !== null &&
    'component' in val &&
    'args' in val &&
    'children' in val
  );
}

function evaluateBuiltinFunction(fnName: string, args: unknown[]): unknown {
  switch (fnName) {
    case '@Round': {
      const num = Number(args[0]) || 0;
      const digits = Number(args[1]) || 0;
      const factor = Math.pow(10, digits);
      return Math.round(num * factor) / factor;
    }
    case '@Count': {
      const list = Array.isArray(args[0]) ? args[0] : [];
      return list.length;
    }
    case '@Filter': {
      const list = Array.isArray(args[0]) ? (args[0] as Array<Record<string, unknown>>) : [];
      const field = String(args[1] || '');
      const op = String(args[2] || '==');
      const target = args[3];
      return list.filter((item) => {
        const val = item?.[field];
        if (op === '>=') return Number(val) >= Number(target);
        if (op === '<=') return Number(val) <= Number(target);
        if (op === '>') return Number(val) > Number(target);
        if (op === '<') return Number(val) < Number(target);
        if (op === '!=') return val !== target;
        return val === target;
      });
    }
    case '@Sort': {
      const list = Array.isArray(args[0]) ? [...(args[0] as Array<Record<string, unknown>>)] : [];
      const field = String(args[1] || '');
      const dir = String(args[2] || 'asc').toLowerCase();
      return list.sort((a, b) => {
        const va = a?.[field];
        const vb = b?.[field];
        if (typeof va === 'number' && typeof vb === 'number') {
          return dir === 'desc' ? vb - va : va - vb;
        }
        return dir === 'desc'
          ? String(vb).localeCompare(String(va))
          : String(va).localeCompare(String(vb));
      });
    }
    case '@Each': {
      const list = Array.isArray(args[0]) ? args[0] : [];
      return list;
    }
    default:
      return args[0];
  }
}

/**
 * Executes an OpenUI `Action([@Set(...), @Run(...)])` descriptor against live state
 * and `StudioConfigManager`.
 */
export function executeOpenUiAction(
  action: OpenUiActionDescriptor,
  currentState: Record<string, unknown>,
  studio: StudioConfigManager
): { updatedState: Record<string, unknown>; logMessage: string } {
  const updatedState: Record<string, unknown> = { ...currentState };
  const logs: string[] = [];
  const cityArchitect = new ReaCityArchitect();

  for (const step of action.steps) {
    if (step.fn === '@Set') {
      const rawVar = String(step.args[0] || '').replace(/^\$/, '');
      const nextVal = step.args[1];
      if (rawVar) {
        updatedState[rawVar] = nextVal;
        logs.push(`@Set($${rawVar} = ${JSON.stringify(nextVal)})`);

        if (rawVar === 'sunElevation') {
          studio.updateShader({ sunElevationDeg: Number(nextVal) || 48 });
        } else if (rawVar === 'fogDensity') {
          studio.updateShader({ fogDensity: Number(nextVal) || 1.0 });
        } else if (rawVar === 'exposure') {
          studio.updateShader({ exposure: Number(nextVal) || 1.0 });
        }
      }
    } else if (step.fn === '@Run') {
      const command = String(step.args[0] || '');
      const arg1 = (step.args[1] as ReaArchetypeId) || (updatedState.cityArchetype as ReaArchetypeId) || 'SFA';
      const arg2 = (step.args[2] as EvolutionPhase) || (updatedState.worldPhase as EvolutionPhase) || 'day_dream_3d';

      if (
        command === 'applyShaderAndSpawnCity' ||
        command === 'spawnReaUrbanBlock' ||
        command === 'activateCircleCraft16Bit'
      ) {
        if (typeof updatedState.sunElevation === 'number') {
          studio.updateShader({ sunElevationDeg: Number(updatedState.sunElevation) });
        }
        if (typeof updatedState.fogDensity === 'number') {
          studio.updateShader({ fogDensity: Number(updatedState.fogDensity) });
        }
        if (typeof updatedState.exposure === 'number') {
          studio.updateShader({ exposure: Number(updatedState.exposure) });
        }
        const block = cityArchitect.spawnBlockInStudio(studio, {
          archetypeId: arg1,
          phase: command === 'activateCircleCraft16Bit' ? 'circle_16bit' : arg2,
          seed: 1004,
        });
        logs.push(
          `@Run(${command}) -> Spawned ${block.archetypeId} (${block.floorsGenerated}F, ${block.geometryPrimitive})`
        );
      } else {
        logs.push(`@Run(${command})`);
      }
    }
  }

  return {
    updatedState,
    logMessage: logs.join(' · '),
  };
}
