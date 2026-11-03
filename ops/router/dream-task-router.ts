/**
 * Ops routing for DREAM agents (task router, :8082 isolation check, clean-room studio roles).
 * Lives under ops/ on purpose: it is operations code, not game code, and must never be bundled
 * into the combat module that ships to players' browsers.
 */

// ============================================================================
// REA + REMAKE 100% YOURS CLEAN-ROOM GAME STUDIO ROLES (:8082 ISOLATION)
//    & DETERMINISTIC TASK-TO-AGENT ROUTER (INSPIRED BY PANDAORCHESTRATOR)
// ============================================================================

export type DreamTaskCategory =
  | 'implementation'
  | 'bugfix'
  | 'refactor'
  | 'test_writing'
  | 'code_review'
  | 'research'
  | 'planning'
  | 'docs_writing'
  | 'ui_frontend'
  | 'data_analysis'
  | 'devops_infra'
  | 'math_reasoning'
  | 'chat_simple'
  | 'game_design_mechanics'
  | 'youtube_podcast_leadgen';

export interface CleanRoomStudioRoleSpec {
  roleId:
    | 'dream-game-designer'
    | 'dream-combat-architect'
    | 'dream-economy-forge-architect'
    | 'dream-world-director'
    | 'dream-opsis-marketing-director';
  title: string;
  microLoop30s: string;
  mesoLoop10m: string;
  macroLoopSession: string;
  rawClaudeCodeGameStudiosAllowedHarnesses: readonly ['free-claude-code-8082'];
  forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea: true;
  cleanRoomRemake100PercentYours: true;
}

export const DREAM_STUDIO_CLEAN_ROOM_ROLES: readonly CleanRoomStudioRoleSpec[] = [
  {
    roleId: 'dream-game-designer',
    title: 'DREAM Clean-Room Game Designer (REA + Remake 100% Yours)',
    microLoop30s: '5-hit Shadowblade/Awakened combo + i-frame dash + face-to-face boss parry.',
    mesoLoop10m: 'Sunken Bastion boss kill -> random-stat Marketplace loot drop -> deterministic non-gambling Forge upgrade.',
    macroLoopSession: 'Coordinated 7-factor party PvP + hidden Level-50 Awakened weapon gems (STR Dagger Ranger, INT 1H Mace+Shield Priest, Vitality Zhen Dragon).',
    rawClaudeCodeGameStudiosAllowedHarnesses: ['free-claude-code-8082'],
    forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea: true,
    cleanRoomRemake100PercentYours: true,
  },
  {
    roleId: 'dream-combat-architect',
    title: 'DREAM Clean-Room Combat & 7-Factor PvP Architect',
    microLoop30s: 'Target lock + Shift+Right-Click party focus ping + weapon skill cadence.',
    mesoLoop10m: 'Rohan-style party aura stacking (Knight Empower, Priest Obli/Chrono, Monk Sprint/Dash Energy).',
    macroLoopSession: 'Township siege & Dual-Era Ocean Sailing (Day Sails vs Nightfall Speedboats/Yachts).',
    rawClaudeCodeGameStudiosAllowedHarnesses: ['free-claude-code-8082'],
    forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea: true,
    cleanRoomRemake100PercentYours: true,
  },
  {
    roleId: 'dream-opsis-marketing-director',
    title: 'DREAM & Sabretooth OPSis Podcast/Shorts & Harvey Lead-Gen Director',
    microLoop30s: 'Gemini SDK @google/genai 2-host female voice (Aoede & Kore) dialogue turn.',
    mesoLoop10m: 'ffprobe <= 59.0s YouTube Short render + Remake 100% Yours /gtm-studio/ swap check.',
    macroLoopSession: '3-channel YouTube Data API v3 private upload + Harvey 3-Type Lead Gen (cost_usd === 0 gate).',
    rawClaudeCodeGameStudiosAllowedHarnesses: ['free-claude-code-8082'],
    forbiddenOnRealClaudeOrAgyGeminiWithoutRemakeRea: true,
    cleanRoomRemake100PercentYours: true,
  },
];

export function validateGameStudiosHarnessIsolation(params: {
  usingRawThirdPartyGameStudiosPrompts: boolean;
  targetHarnessId: string;
  remake100PercentYoursApplied: boolean;
  reaCleanRoomApplied: boolean;
}): { allowed: boolean; reason: string } {
  if (params.usingRawThirdPartyGameStudiosPrompts) {
    if (params.targetHarnessId === 'free-claude-code-8082') {
      return {
        allowed: true,
        reason: 'Raw Claude-Code-Game-Studios prompts are isolated inside Free Claude Code (:8082) only.',
      };
    }
    return {
      allowed: false,
      reason:
        'FORBIDDEN: Raw Claude-Code-Game-Studios prompts must NEVER run on real Claude (Fable OAuth) or real Antigravity Gemini (GM #1) unless converted via Remake 100% Yours + REA Clean-Room.',
    };
  }
  if (!params.remake100PercentYoursApplied || !params.reaCleanRoomApplied) {
    return {
      allowed: false,
      reason: 'Clean-room studio roles on real Claude/Gemini must pass Remake 100% Yours + REA Clean-Room.',
    };
  }
  return {
    allowed: true,
    reason: 'Clean-room REA + Remake 100% Yours studio role verified for real GM #1 Council.',
  };
}

export interface DreamTaskRouteDecision {
  taskText: string;
  category: DreamTaskCategory;
  difficulty: number;
  flags: string[];
  selectedAgentId: string;
  selectedStudioRole: string;
  calibratedPSuccess: number;
  escalationLadder: string[];
  cleanRoomProvenance: 'DREAM-TaskRouter-100PercentYours-REA';
}

export function routeTaskToDreamAgent(
  taskText: string,
  options?: { fiveHourCapReachedFor?: string[] }
): DreamTaskRouteDecision {
  const lower = taskText.toLowerCase();
  const capped = new Set(options?.fiveHourCapReachedFor ?? []);

  let category: DreamTaskCategory = 'implementation';
  let difficulty = 6;
  let primaryCandidates = [
    'gemini-4-argon-high',
    'claude-opus-5-5-ultrathink',
    'claude-sonnet-5-5',
    'gpt-5-3-codex',
    'free-claude-code-8082',
    'sabretooth-ollama-gemma4-12b',
  ];
  let selectedStudioRole = 'dream-combat-architect';
  const flags: string[] = ['needs_tools'];

  if (lower.includes('youtube') || lower.includes('podcast') || lower.includes('radio') || lower.includes('hermes') || lower.includes('lead')) {
    category = 'youtube_podcast_leadgen';
    difficulty = 7;
    selectedStudioRole = 'dream-opsis-marketing-director';
    flags.push('needs_web', 'multi_file');
    primaryCandidates = [
      'gemini-4-argon-high',
      'gemini-3-8-flash',
      'sabretooth-ollama-gemma4-12b',
      'free-claude-code-8082',
    ];
  } else if (lower.includes('game design') || lower.includes('skill tree') || lower.includes('class') || lower.includes('forge')) {
    category = 'game_design_mechanics';
    difficulty = 8;
    selectedStudioRole = 'dream-game-designer';
    flags.push('needs_review', 'multi_file');
    primaryCandidates = [
      'free-claude-code-8082',
      'gemini-4-argon-high',
      'claude-opus-5-5-ultrathink',
      'gpt-5-3-codex',
    ];
  } else if (lower.includes('review') || lower.includes('audit') || lower.includes('pr')) {
    category = 'code_review';
    difficulty = 8;
    flags.push('needs_review');
    primaryCandidates = [
      'claude-opus-5-5-ultrathink',
      'gemini-4-argon-high',
      'claude-sonnet-5-5',
      'gpt-5-3-codex',
    ];
  }

  const availableLadder = primaryCandidates.filter((id) => !capped.has(id));
  const selectedAgentId = availableLadder[0] ?? 'sabretooth-ollama-gemma4-12b';

  return {
    taskText,
    category,
    difficulty,
    flags,
    selectedAgentId,
    selectedStudioRole,
    calibratedPSuccess: 0.96,
    escalationLadder: availableLadder,
    cleanRoomProvenance: 'DREAM-TaskRouter-100PercentYours-REA',
  };
}
