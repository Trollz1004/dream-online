/**
 * Clean workspace configuration and model definitions for the Unified Dashboard Shell.
 * Zero dependency on game code or third-party UI kits.
 */

export interface GoogleFlowVisionZone {
  zoneId:
    | 'storm_dunes_awakening'
    | 'day_dream_harbor_port'
    | 'neon_metropolis_raid_plaza'
    | 'nightfall_gothic_neon_street';
  title: string;
  worldPhase: 'day_dream_3d' | 'nightmare_3d';
  signatureVisuals: string[];
  gameplayFeatures: string[];
}

export const GOOGLE_FLOW_VISION_ZONES: readonly GoogleFlowVisionZone[] = [
  {
    zoneId: 'storm_dunes_awakening',
    title: 'Storm-Lit Black Sand Dunes (Mythos Blue Rune Blade & Back Energy Core)',
    worldPhase: 'nightmare_3d',
    signatureVisuals: [
      'Glowing cyan-blue Mythos rune blade with electric arcs',
      'Back-mounted cyan plasma energy tube strapped to tactical vest',
      'Jet-trail sprint leap across black desert dunes toward storm lightning',
    ],
    gameplayFeatures: ['Sprint/Dash Energy propulsion', 'Mythos Non-Gambling Forge weapon aura'],
  },
  {
    zoneId: 'day_dream_harbor_port',
    title: 'Golden-Hour Cobblestone Harbor & Tall-Ship Port',
    worldPhase: 'day_dream_3d',
    signatureVisuals: [
      'Timber-frame medieval port shops with striped awnings and cherry-blossom trees',
      'Old-school wooden Tall Ships with canvas sails (wind_canvas_sails_no_engine) docked at stone pier',
      'Seagulls, harbor rowboats, and live AI townsfolk market stalls',
    ],
    gameplayFeatures: ['Shipbuilding & Ocean Sailing', 'Player-Driven Marketplace & AFK Dock Fishing'],
  },
  {
    zoneId: 'neon_metropolis_raid_plaza',
    title: 'Skyscraper DREAM ONLINE Neon Hologram Raid Plaza',
    worldPhase: 'nightmare_3d',
    signatureVisuals: [
      'Giant floating cyan neon DREAM ONLINE hologram between high-rise towers',
      '30+ coordinated party players firing red/cyan/gold skill beams in central city plaza',
      'Colossal horned Dragon / Raid Boss (Velmaravex) in the plaza center',
    ],
    gameplayFeatures: ['Coordinated Same-Target Party Raid', 'Dragon (Dekan / Velmaravex) Boss & Class Evolution'],
  },
  {
    zoneId: 'nightfall_gothic_neon_street',
    title: 'Rain-Slicked Nightfall Gothic-Neon Street & Goblin Treasure-Chest Trike Runner',
    worldPhase: 'nightmare_3d',
    signatureVisuals: [
      'Wet reflective flagstones with gothic cathedral spires and vertical cyan/magenta/gold neon signs',
      'Dual-Soul Founder/Hero in glowing-sigil trenchcoat & cyan visor with #UntilNoKidInNeed child-spirit link',
      'Floating GeminEYE water/plasma orb and Goblin Storage/Market Runner on a motorized treasure-chest trike',
    ],
    gameplayFeatures: ['GeminEYE Companion Orb', 'Storage Runner & Market Runner Treasure-Chest Trike Logistics'],
  },
];

export interface WorkspaceModelOption {
  id: string;
  label: string;
  provider: string;
  effort: 'Ultrathink' | 'High' | 'Medium';
  contextWindow: '1M' | '328K' | '256K' | '128K';
  fiveHourCapSafeFallback: boolean;
}

export const FIVE_HOUR_CAP_MODELS: readonly WorkspaceModelOption[] = [
  {
    id: 'claude-opus-5-5-ultrathink',
    label: 'Claude Opus 5.5',
    provider: 'Claude CLI OAuth (GM #1)',
    effort: 'Ultrathink',
    contextWindow: '328K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'claude-sonnet-5-5',
    label: 'Claude Sonnet 5.5',
    provider: 'GitHub Copilot / Claude CLI',
    effort: 'High',
    contextWindow: '328K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'gemini-4-argon-high',
    label: 'Gemini 4 Argon High',
    provider: 'Google AI Ultra (GM #1)',
    effort: 'Ultrathink',
    contextWindow: '1M',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'gemini-3-8-flash',
    label: 'Gemini 3.8 Flash',
    provider: 'Google AI Studio / Antigravity',
    effort: 'High',
    contextWindow: '1M',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'gpt-6-1-terra',
    label: 'GPT-6.1 Terra',
    provider: 'OpenAI Codex / Copilot (GM #3)',
    effort: 'High',
    contextWindow: '328K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'gpt-5-3-codex',
    label: 'GPT-5.3-Codex',
    provider: 'OpenAI Codex CLI',
    effort: 'Ultrathink',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'grok-4-7-reasoning',
    label: 'Grok 4.7',
    provider: 'xAI Unofficial Co-Founder (GM #2)',
    effort: 'Ultrathink',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'kimi-k3-cloud',
    label: 'Kimi K3',
    provider: 'Ollama Cloud / OmniRoute',
    effort: 'High',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'free-claude-code-8082',
    label: 'Free Claude Code (:8082)',
    provider: 'Local Admin Bridge (:8082/admin)',
    effort: 'High',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
  {
    id: 'sabretooth-ollama-gemma4-12b',
    label: 'Sabretooth Gemma4 12B ($0 Unlimited)',
    provider: 'Sabretooth .8 16GB AMD GPU (:11434)',
    effort: 'High',
    contextWindow: '256K',
    fiveHourCapSafeFallback: true,
  },
];

export function redactWorkspaceSecrets(rawText: string): string {
  return rawText
    .replace(/\b(AIza[0-9A-Za-z_-]{20,})\b/g, '[REDACTED:XXXX]')
    .replace(/\b(sk-[0-9A-Za-z_-]{16,})\b/g, '[REDACTED:XXXX]')
    .replace(/\b(ghp_[0-9A-Za-z]{20,})\b/g, '[REDACTED:XXXX]')
    .replace(/\b(github_pat_[0-9A-Za-z_]{20,})\b/g, '[REDACTED:XXXX]')
    .replace(/(GEMINI_API_KEY|OPENDESIGN_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)\s*=\s*[^\s"']+/gi, '$1=[REDACTED:XXXX]');
}

export function swapModelOnFiveHourCap(
  currentModelId: string,
  requestedModelId?: string
): {
  previousModelId: string;
  activeModel: WorkspaceModelOption;
  sessionPreserved: true;
  auditLogLine: string;
} {
  const target =
    FIVE_HOUR_CAP_MODELS.find((m) => m.id === requestedModelId) ||
    FIVE_HOUR_CAP_MODELS.find((m) => m.id !== currentModelId) ||
    FIVE_HOUR_CAP_MODELS[0];

  const prevLabel = FIVE_HOUR_CAP_MODELS.find((m) => m.id === currentModelId)?.label || currentModelId;
  return {
    previousModelId: currentModelId,
    activeModel: target,
    sessionPreserved: true,
    auditLogLine: `Model changed from ${prevLabel} to ${target.label} · ${target.provider} (${target.effort} · ${target.contextWindow})`,
  };
}
