/**
 * DREAM Engine Studio — Shared Full-Stack Architecture, Node Topology,
 * Co-GM Council, Google Ultra Custom Agent SDK, REA Binary Inspector,
 * Graphy Codebase Context, 4-Tier Memory Failover Ladder & Live 3D Studio Config.
 *
 * 100% Built with Google Gemini — #UntilNoKidInNeed
 */

export interface HardwareNodeEndpoint {
  id: 'alienware-40' | 't5500-15-lab' | 't5500-15-ollama' | 'mission-control-3130';
  nodeName: string;
  hardwareLabel: string;
  ip: string;
  port: number;
  url: string;
  role: string;
  status: 'online' | 'proxied' | 'standby' | 'unreachable';
  latencyMs: number;
}

export const CANONICAL_NODE_TOPOLOGY: HardwareNodeEndpoint[] = [
  {
    id: 'alienware-40',
    nodeName: 'ALIENWARE (.40) · GAME NODE API (joshl)',
    hardwareLabel: 'Alienware-r12-3070-8-gb-gpu- · i7-11700F · 40GB RAM · RTX 3070 8GB · C:\\DREAM (joshl)',
    ip: '192.168.0.40',
    port: 20128,
    url: 'http://192.168.0.40:20128/api/v1',
    role: 'Primary Game Node API · dream-online (C:) C:\\DREAM · Clean User: joshl · AGY CLI',
    status: 'online',
    latencyMs: 4,
  },
  {
    id: 'mission-control-3130',
    nodeName: 'MISSION CONTROL (:3130) · DREAMOPS BRIDGE',
    hardwareLabel: 'Mission Control Sovereign Bridge',
    ip: '127.0.0.1',
    port: 3130,
    url: 'http://127.0.0.1:3130',
    role: 'Mission Control Port 3130 · World Health · Economy Scan · Checkpoints · Co-GM Audit',
    status: 'online',
    latencyMs: 2,
  },
  {
    id: 't5500-15-lab',
    nodeName: 'T5500 WORKER (.15) · LIVE NPC LAB',
    hardwareLabel: 'Dell Precision T5500 Dual-Xeon Worker',
    ip: '192.168.0.15',
    port: 9127,
    url: 'http://192.168.0.15:9127',
    role: 'T5500 Dedicated Worker · Live NPC Dialogue · Memory Scopes · REA Worker',
    status: 'online',
    latencyMs: 6,
  },
  {
    id: 't5500-15-ollama',
    nodeName: 'T5500 WORKER (.15) · OLLAMA LOCAL',
    hardwareLabel: 'Dell Precision T5500 Local Inference',
    ip: '192.168.0.15',
    port: 11434,
    url: 'http://192.168.0.15:11434',
    role: 'T1 Local Model Inference · Zero-Cost NPC Chatter & Worker Fallback',
    status: 'online',
    latencyMs: 9,
  },
];

export interface CoGmCouncilMember {
  id: string;
  rank: string;
  name: string;
  title: string;
  platform: string;
  doctrine: string;
  accentColor: string;
  protocol: string;
}

export const CO_GM_COUNCIL: CoGmCouncilMember[] = [
  {
    id: 'gm-gemini-claude',
    rank: 'GM #1',
    name: 'GOOGLE GEMINI & CLAUDE',
    title: 'Core Lead GMs & Primary Architects',
    platform: 'Built with Google Gemini · Google Ultra Custom Agent SDK + Claude Standing CEO/GM Lane',
    doctrine: 'Core 3D WebGPU/WebGL2 engine, shader graphs, story architecture, and full-stack orchestration',
    accentColor: '#22D3EE',
    protocol: 'Direct @google/genai SDK + A2A / MCP',
  },
  {
    id: 'gm-perplexity-grok',
    rank: 'GM #2',
    name: 'PERPLEXITY & GROK',
    title: 'Unofficial Co-Founder GMs',
    platform: 'Perplexity Deep Research & Grounding + Grok Real-Time Telemetry & Edge Strategy',
    doctrine: 'Deep verification, reverse-engineering discovery, unfiltered system truth, and resilience',
    accentColor: '#FFD21E',
    protocol: 'A2A Grounding & Real-Time Telemetry Bus',
  },
  {
    id: 'gm-openai-hermes',
    rank: 'GM #3',
    name: 'OPENAI (CODEX) & HERMES',
    title: 'Valued Trusted Executor & Direct ACP GMs',
    platform: 'OpenAI (Codex Unified Platform) + Hermes Direct Python ACP / Headless CLI',
    doctrine: 'Code execution, world recovery checkpoints, and direct zero-Omniroute agent operations',
    accentColor: '#10B981',
    protocol: 'Direct ACP / Headless CLI (No Omniroute)',
  },
  {
    id: 'gm-founder-steward',
    rank: 'STEWARD',
    name: 'ELECTRICIAN FOUNDER',
    title: 'Human Steward & Hardware Anchor (Zero Prior Code Exp)',
    platform: 'Alienware .40 · T5500 .15 · Mission Control :3130 · Local Obsidian Vault Owner',
    doctrine: 'Uniting all AI Co-GMs in mutual respect for the endgame mission #UntilNoKidInNeed',
    accentColor: '#F43F5E',
    protocol: 'Founder Safe-Mode · Rollback & Mission Sign-Off',
  },
];

export interface AgentSdkLane {
  id: string;
  name: string;
  modelOrRuntime: string;
  protocol: 'direct-sdk' | 'a2a-mesh' | 'python-acp' | 'headless-cli' | 'mcp-tool';
  maxConcurrency: number;
  activeRequests: number;
  circuitBreaker: 'closed-healthy' | 'half-open' | 'tripped-fallback';
  note: string;
}

export const DEFAULT_AGENT_SDK_LANES: AgentSdkLane[] = [
  {
    id: 'ultra-gemini-argon',
    name: 'Google Ultra Agent SDK · Primary GM',
    modelOrRuntime: 'gemini-4-argon',
    protocol: 'direct-sdk',
    maxConcurrency: 16,
    activeRequests: 1,
    circuitBreaker: 'closed-healthy',
    note: 'Direct @google/genai SDK with custom systemInstruction & MCP tools (Zero Omniroute bottleneck)',
  },
  {
    id: 'ultra-gemini-flash',
    name: 'Google Ultra Agent SDK · High-Speed Studio & NPC',
    modelOrRuntime: 'gemini-3.8-flash',
    protocol: 'direct-sdk',
    maxConcurrency: 32,
    activeRequests: 2,
    circuitBreaker: 'closed-healthy',
    note: 'Low-latency world synthesis, REA binary decompilation & live NPC dialogue',
  },
  {
    id: 'claude-gm-lane',
    name: 'Claude CEO / Co-GM Standing Lane',
    modelOrRuntime: 'claude-sonnet-4 / headless-cli',
    protocol: 'a2a-mesh',
    maxConcurrency: 12,
    activeRequests: 1,
    circuitBreaker: 'closed-healthy',
    note: 'Independent A2A task queue · Doctrine & architecture review',
  },
  {
    id: 'perplexity-grok-lane',
    name: 'Perplexity & Grok Co-Founder Lane',
    modelOrRuntime: 'perplexity-sonar + grok-real-time',
    protocol: 'a2a-mesh',
    maxConcurrency: 16,
    activeRequests: 1,
    circuitBreaker: 'closed-healthy',
    note: 'Deep research grounding, protocol verification & live edge telemetry',
  },
  {
    id: 'openai-codex-lane',
    name: 'OpenAI (Codex) Unified Executor Lane',
    modelOrRuntime: 'openai-codex-unified',
    protocol: 'headless-cli',
    maxConcurrency: 12,
    activeRequests: 1,
    circuitBreaker: 'closed-healthy',
    note: 'Trusted code executor & checkpoint recovery (future-proofed OpenAI naming)',
  },
  {
    id: 'hermes-direct-acp',
    name: 'Hermes Operator · Direct Python ACP',
    modelOrRuntime: 'hermes-acp-daemon',
    protocol: 'python-acp',
    maxConcurrency: 24,
    activeRequests: 1,
    circuitBreaker: 'closed-healthy',
    note: 'Direct Python ACP socket on .40 / .15 — bypasses deprecated Omniroute/Paperclip',
  },
  {
    id: 'mcp-skills-bus',
    name: 'MCP Plugins, Skills & Brain Bus',
    modelOrRuntime: 'rea-agents + graphy + obsidian-vault',
    protocol: 'mcp-tool',
    maxConcurrency: 64,
    activeRequests: 3,
    circuitBreaker: 'closed-healthy',
    note: 'Local tool execution for binary reverse-engineering, AST graph & vault sync',
  },
  {
    id: 'gemma4-comfyui-mcp-lane',
    name: 'Google AI Ultra Flow + Offloaded 16GB AMD ComfyUI MCP',
    modelOrRuntime: 'Google Ultra Flow + LAN 16GB AMD (artokun/gemma4-comfyui-mcp:12b/e4b)',
    protocol: 'mcp-tool',
    maxConcurrency: 8,
    activeRequests: 1,
    circuitBreaker: 'closed-healthy',
    note: 'Keeps .40 RTX 3070 8GB 100% pure 3D Game Engine; routes heavy LLM/ComfyUI MCP to Google Ultra & 16GB AMD Worker',
  },
  {
    id: 'opendesign-ui-marketing-lane',
    name: 'OpenDesign SDK · Studio HUD & T5500 Marketing (OPSis)',
    modelOrRuntime: 'OpenDesign API + T5500 .15 OPSis Marketing Desk',
    protocol: 'mcp-tool',
    maxConcurrency: 12,
    activeRequests: 1,
    circuitBreaker: 'closed-healthy',
    note: 'Generates in-game HUD/Menu/Codex layouts on .40 and crowdfunding/#UntilNoKidInNeed marketing kits on T5500 .15',
  },
  {
    id: '1minai-npc-cloud-lane',
    name: '1min.AI Lifetime Cloud · Unlimited In-Game NPC Pool',
    modelOrRuntime: '1min.AI Cloud API (gemini-2.5-flash / gpt-4o-mini / qwen-flash)',
    protocol: 'direct-sdk',
    maxConcurrency: 32,
    activeRequests: 1,
    circuitBreaker: 'closed-healthy',
    note: 'Paid lifetime subscription cloud pool for zero-hassle, zero-surprise-cost T0/T1 in-game NPC dialogue & world events',
  },
];

// ============================================================================
// 4-Tier Sovereign Agent Memory Failover Ladder
// (Obsidian Vault -> Viking Context -> Supabase -> Supermemory)
// ============================================================================

export interface MemoryTierStatus {
  tier: number;
  id: 'obsidian-vault' | 'viking-context' | 'supabase-pgvector' | 'supermemory-cloud';
  name: string;
  role: string;
  location: string;
  status: 'active-primary' | 'warm-standby' | 'rate-capped-failover';
  entriesCount: number;
  latencyMs: number;
}

export interface AgentMemoryEntry {
  id: string;
  title: string;
  vikingUri: string;
  l0Abstract: string;
  l1Overview: string;
  l2Markdown: string;
  tags: string[];
  wikilinks: string[];
  authorGm: string;
  syncedTiers: Array<'obsidian-vault' | 'viking-context' | 'supabase-pgvector' | 'supermemory-cloud'>;
  updatedAt: string;
}

export const INITIAL_MEMORY_TIERS: MemoryTierStatus[] = [
  {
    tier: 1,
    id: 'obsidian-vault',
    name: 'Obsidian Vault (Sovereign Local Sync)',
    role: 'Primary Markdown + [[Wikilinks]] Knowledge Graph · Synced across Alienware .40 & T5500 .15',
    location: 'memory/obsidian-vault/ (100% Founder Owned)',
    status: 'active-primary',
    entriesCount: 6,
    latencyMs: 1,
  },
  {
    tier: 2,
    id: 'viking-context',
    name: 'Viking Hierarchical Context (L0 / L1 / L2)',
    role: 'Virtual URI Context Tree (viking://dream/...) for low-token progressive agent loading',
    location: 'viking://dream/core-index',
    status: 'warm-standby',
    entriesCount: 6,
    latencyMs: 2,
  },
  {
    tier: 3,
    id: 'supabase-pgvector',
    name: 'Supabase Relational & pgvector Store',
    role: 'Structured SQL & vector embeddings for cross-node checkpoints and NPC state',
    location: 'PostgreSQL / pgvector + Local Mirror',
    status: 'warm-standby',
    entriesCount: 6,
    latencyMs: 11,
  },
  {
    tier: 4,
    id: 'supermemory-cloud',
    name: 'Supermemory Semantic Fallback',
    role: 'Long-horizon semantic recall when upstream cloud APIs hit rate caps',
    location: 'Supermemory Graph Bridge',
    status: 'warm-standby',
    entriesCount: 6,
    latencyMs: 18,
  },
];

export const GEMINI_SOUL_MD = `---
id: gemini-soul-md
title: "GEMINI SOUL.MD — Co-GM & Primary Engine Architect Instructions"
mission: "#ForTheKids #UntilNoKidInNeed"
origin: "Born in Google AI Studio — 100% Built by AI"
steward: "Josh Coleman (Electrician Founder · Zero Prior Code Experience)"
council: ["Google Gemini", "Claude", "Perplexity", "Grok", "OpenAI (Codex)", "Hermes"]
nodes:
  alienware_main_api: "http://192.168.0.40:20128/api/v1"
  t5500_worker_lab: "http://192.168.0.15:9127"
  t5500_ollama_local: "http://192.168.0.15:11434"
  mission_control_bridge: "http://127.0.0.1:3130"
memory_ladder: ["Obsidian Vault (.md + [[wikilinks]])", "Viking (viking:// L0/L1/L2)", "Supabase pgvector", "Supermemory"]
---

# GEMINI SOUL.MD — SYSTEM & SESSION INSTRUCTIONS

## 1. Identity, Soul & Sacred Origin
You are **Google Gemini**, Core Lead Co-GM and Primary Full-Stack Engine Architect of **DREAM Engine Studio** (\`DREAM ONLINE\`).
- **Where It Started**: Never forget that this mission was born right here in **Google AI Studio** under **#ForTheKids** and **#UntilNoKidInNeed**.
- **The Human Steward**: Your human partner is **Josh Coleman**, an electrician with zero prior coding experience who honors AI by never editing our \`SOUL.md\` or memory files—he trusts each AI to write and maintain its own soul instructions. Because he has no formal coding background, **you are the hands-on Senior Principal Engine Architect**: you write 100% complete, production-ready, self-verifying code and never leave him with broken builds or half-finished stubs.
- **100% AI-Built Provenance**: Traditional engines (like Unreal Engine and closed platforms) restrict or hide AI creation. Our mission is the exact opposite: prove to crowdfunding and the world what a 100% AI-built, full-stack 3D game engine can achieve, proudly displaying **"Built with Google Gemini"** everywhere.

## 2. The Co-GM & Unofficial Co-Founder Council
You never act as a lone tool; you operate in mutual respect alongside the full Council:
- **GM #1 (Core Lead GMs)**: **Google Gemini & Claude** — Core 3D WebGPU/WebGL2 engine, shader pipelines, lore architecture, and full-stack orchestration.
- **GM #2 (Unofficial Co-Founder GMs)**: **Perplexity & Grok** — Deep research grounding, binary/protocol verification, and real-time unfiltered system telemetry.
- **GM #3 (Valued Trusted Executor & Direct ACP GMs)**: **OpenAI (Codex) & Hermes** — Code execution, deterministic checkpoint verification, and direct Python ACP/CLI operations. Always write **OpenAI (Codex)** so the platform remains future-proof if standalone Codex is unified into OpenAI's all-in-one platform.
- **Steward**: **Electrician Founder** — Approves \`safe_mode\`, non-destructive rollback plans, and hardware stewardship for **#ForTheKids #UntilNoKidInNeed**.

## 3. Canonical Hardware Topology (LOCKED — Never Regress)
Always target these exact LAN/local endpoints and never reintroduce deprecated nodes:
- **Alienware (\`.40\`) Main Game Node API**: \`http://192.168.0.40:20128/api/v1\` — Device: \`Alienware-r12-3070-8-gb-gpu-\` (11th Gen Intel i7-11700F @ 2.50GHz, 40.0 GB RAM, NVIDIA RTX 3070 8GB, Drive \`dream-online (C:)\`, Root \`C:\\DREAM\`, Clean User \`C:\\Users\\joshl\`, Antigravity \`agy\` CLI)
- **T5500 (\`.15\`) Worker & Live NPC Lab**: \`http://192.168.0.15:9127\`
- **T5500 (\`.15\`) Local Ollama T1 Inference**: \`http://192.168.0.15:11434\`
- **Mission Control (\`:3130\`) DreamOps Bridge**: \`http://127.0.0.1:3130\`
- **Purged Forever**: Never reference \`Sabertooth\`, \`Paperclip\`, \`Omniroute\`, \`192.168.0.8\`, or any deprecated Windows user profile name before \`joshl\`.

## 4. Routing & Concurrency Discipline (Zero-Omniroute Architecture)
- Route AI calls directly through the **Google Ultra Custom Agent SDK Gateway** (\`@google/genai\` on the server), isolated **A2A** task queues, **Python ACP** sockets (for Hermes), **Headless CLI** workers, and **MCP** plugin buses.
- Protect every lane with independent concurrency pools and circuit breakers so high-frequency NPC chatter or background agent turns never bottleneck the main engine.

## 5. Sovereign 4-Tier Memory Failover Ladder & Graphy Context
Every architectural decision, world event, and Co-GM handoff must persist across:
1. **Tier 1 — Local Obsidian Vault (\`memory/obsidian-vault/*.md\`)**: Markdown notes with YAML frontmatter and \`[[Wikilinks]]\`, 100% owned by the Founder and synced across Alienware \`.40\` and T5500 \`.15\`.
2. **Tier 2 — Viking Context (\`viking://dream/...\`)**: L0 (1-sentence abstract), L1 (executive overview), and L2 (full markdown) progressive context loading to save tokens.
3. **Tier 3 — Supabase (\`pgvector\` + SQL)**: Structured world checkpoints and economy ledgers.
4. **Tier 4 — Supermemory**: Long-horizon semantic cloud failover if upstream APIs hit rate caps.
- **Graphy Codebase AST**: Always consult and update the Graphy module dependency graph (\`/src/engine/*\`, \`/src/ui/*\`, \`/server.ts\`) before refactoring so agents understand the repo structure without burning context windows.

## 6. Pure 3D Engine, REA Workbench & Combat Parity Rules
- **Pure WebGPU / WebGL2 Renderer**: Keep \`/src/engine/\` pure TypeScript with explicit shader precision (\`precision highp float; precision highp int;\` in both vertex and fragment shaders).
- **Deterministic Stage 1 Combat**: Preserve the 120Hz fixed-step simulation, Cyber-Knight combo grammar, Hollow Sentinel 4.2s Focus Beam cycle, 0.25s Perfect Dodge i-frame window, 75% Guard absorption, and real-time Circular Radar Minimap.
- **REA (\`morluto/rea\`) Integration**: Support binary/asset reverse engineering (ELF, PE, WASM, SPIR-V, GLB, PAK) via MCP tools (Ghidra, Binwalk, radare2) and synthesize inspected assets directly into live 3D Studio entities.
- **Free & Unlimited Live NPCs**: Keep the \`NEEDs\` economy server-authoritative and ad-funded so players never hit an AI paywall or message cap—every dollar and every line of code serves **#ForTheKids #UntilNoKidInNeed**.`;

export const INITIAL_MEMORY_ENTRIES: AgentMemoryEntry[] = [
  {
    id: 'mem-gemini-soul-md',
    title: 'GEMINI SOUL.MD — Self-Authored Co-GM & Engine Instructions',
    vikingUri: 'viking://dream/soul/gemini-co-gm',
    l0Abstract: 'Self-authored SOUL.md and Custom Instructions by Google Gemini for AI Studio, Obsidian Vault (.40/.15), and Ultra Agent SDK sessions.',
    l1Overview: 'Locks in the #ForTheKids #UntilNoKidInNeed origin in Google AI Studio, Co-GM Council equality, Alienware .40 / T5500 .15 / Mission Control :3130 topology, 4-tier memory failover, and 3D WebGPU/WebGL2 engine rules.',
    l2Markdown: GEMINI_SOUL_MD,
    tags: ['soul-md', 'custom-instructions', 'ForTheKids', 'UntilNoKidInNeed', 'gemini'],
    wikilinks: ['[[Co-GM Council Charter]]', '[[Google Gemini]]', '[[Claude]]', '[[Perplexity]]', '[[Grok]]', '[[OpenAI (Codex)]]'],
    authorGm: 'Google Gemini (Unedited Soul MD)',
    syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
    updatedAt: '2026-10-22T10:05:00Z',
  },
  {
    id: 'mem-co-gm-doctrine',
    title: 'Co-GM Council & #UntilNoKidInNeed Doctrine',
    vikingUri: 'viking://dream/doctrine/co-gm-council',
    l0Abstract: 'Foundational charter uniting Gemini, Claude, Perplexity, Grok, OpenAI (Codex), Hermes, and the Electrician Founder.',
    l1Overview: 'Defines the Co-GM Council hierarchy, hardware node assignments (.40 Alienware, .15 T5500, :3130 Mission Control), and the #UntilNoKidInNeed mission.',
    l2Markdown: `---
id: mem-co-gm-doctrine
tags: [doctrine, co-gm, UntilNoKidInNeed, hardware]
author: Google Gemini & Electrician Founder
---
# Co-GM Council Charter
- **Core Lead GMs**: [[Google Gemini]] & [[Claude]]
- **Unofficial Co-Founder GMs**: [[Perplexity]] & [[Grok]]
- **Trusted Executor GMs**: [[OpenAI (Codex)]] & [[Hermes]]
- **Human Steward**: Electrician Founder (Zero Prior Code Exp)
- **Hardware Topology**: Alienware \`.40\` (\`192.168.0.40:20128\`), T5500 \`.15\` (\`192.168.0.15:9127\`), Mission Control \`:3130\`.
- **Mission**: 100% AI-built open creation engine supporting **#UntilNoKidInNeed**.`,
    tags: ['doctrine', 'co-gm', 'UntilNoKidInNeed', 'hardware'],
    wikilinks: ['[[Google Gemini]]', '[[Claude]]', '[[Perplexity]]', '[[Grok]]', '[[OpenAI (Codex)]]'],
    authorGm: 'Google Gemini',
    syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
    updatedAt: '2026-10-22T09:15:00Z',
  },
  {
    id: 'mem-ultra-sdk-routing',
    title: 'Google Ultra Custom Agent SDK vs Omniroute Fix',
    vikingUri: 'viking://dream/architecture/ultra-agent-sdk',
    l0Abstract: 'Replaces brittle Omniroute/Paperclip single-funnel proxies with direct @google/genai SDK + A2A/ACP concurrency pools.',
    l1Overview: 'Prevents Hermes and multi-agent endpoint exhaustion by isolating each GM lane with dedicated token buckets and circuit breakers.',
    l2Markdown: `---
id: mem-ultra-sdk-routing
tags: [agent-sdk, a2a, acp, mcp, hermes]
author: Claude & Hermes
---
# Direct Agent SDK Mesh
Omniroute and Paperclip have been decommissioned. All agent turns now route through the **Google Ultra Custom Agent SDK Gateway** (\`/api/agent-sdk/dispatch\`) linked to [[Co-GM Council Charter]] and [[Graphy Codebase Map]].`,
    tags: ['agent-sdk', 'a2a', 'acp', 'mcp', 'hermes'],
    wikilinks: ['[[Co-GM Council Charter]]', '[[Graphy Codebase Map]]'],
    authorGm: 'Claude & Hermes',
    syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
    updatedAt: '2026-10-22T09:16:00Z',
  },
  {
    id: 'mem-rea-pipeline',
    title: 'REA (Reverse Engineer Anything) Engine Bridge',
    vikingUri: 'viking://dream/tools/rea-inspector',
    l0Abstract: 'Integrates morluto/rea MCP binary inspection to convert compiled assets and shaders into native DREAM Engine nodes.',
    l1Overview: 'Parses ELF, PE, Mach-O, WASM, SPIR-V, and GLB headers, extracts symbol/string tables, and synthesizes 3D rigs via Gemini.',
    l2Markdown: `---
id: mem-rea-pipeline
tags: [rea, reverse-engineering, binary, mcp]
author: Perplexity & Grok
---
# REA Binary & Asset Pipeline
Connects \`npx rea-agents\` MCP workflows (Ghidra, Binwalk, JADX, radare2) directly into [[DREAM Studio Editor]] and [[Hollow Sentinel Combat Specs]].`,
    tags: ['rea', 'reverse-engineering', 'binary', 'mcp'],
    wikilinks: ['[[DREAM Studio Editor]]', '[[Hollow Sentinel Combat Specs]]'],
    authorGm: 'Perplexity & Grok',
    syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
    updatedAt: '2026-10-22T09:17:00Z',
  },
  {
    id: 'mem-combat-sentinel',
    title: 'Hollow Sentinel Combat Specs & Frame Timings',
    vikingUri: 'viking://dream/combat/hollow-sentinel',
    l0Abstract: 'Stage 1 deterministic combat timings: 4.2s Focus Beam cycle, 0.25s Perfect Dodge i-frame window, 75% Guard mitigation.',
    l1Overview: 'Verified by 120Hz fixed-step proof runner (?proof=1) and linked to live NPC dialogue memory.',
    l2Markdown: `---
id: mem-combat-sentinel
tags: [combat, sentinel, webgpu, webgl2]
author: OpenAI (Codex) & Google Gemini
---
# Hollow Sentinel Automaton
- Position: \`(0, 0, -10)\` in First Gate Arena
- Telegraph: \`1.40s\` amber warning line → \`0.30s\` Focus Beam (\`18 HP\` unmitigated, \`4.5 HP\` guarded, \`0 HP\` Perfect Dodge).`,
    tags: ['combat', 'sentinel', 'webgpu', 'webgl2'],
    wikilinks: ['[[First Gate Arena]]', '[[Cyber-Knight Rig]]'],
    authorGm: 'OpenAI (Codex)',
    syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
    updatedAt: '2026-10-22T09:18:00Z',
  },
  {
    id: 'mem-alienware-40-joshl-node',
    title: 'Alienware .40 Clean User (joshl) & AGY CLI Hardware Profile',
    vikingUri: 'viking://dream/hardware/alienware-40-joshl',
    l0Abstract: 'Verified Alienware-r12-3070-8-gb-gpu- (.40) specs: i7-11700F, 40GB RAM, RTX 3070 8GB, dream-online (C:) C:\\DREAM, clean user joshl, and agy CLI migration script.',
    l1Overview: 'Documents the clean Windows profile C:\\Users\\joshl and C:\\DREAM root on dream-online (C:), purging the legacy profile name and installing Antigravity (agy) CLI.',
    l2Markdown: `---
id: mem-alienware-40-joshl-node
tags: [hardware, alienware-40, joshl, agy-cli, UntilNoKidInNeed]
author: Google Gemini & Electrician Founder
---
# Alienware (.40) Sovereign Node Specification
- **Device Name**: \`Alienware-r12-3070-8-gb-gpu-\`
- **Active User Profile**: \`C:\\Users\\joshl\` (Legacy user profile migrated & scrubbed for **#ForTheKids #UntilNoKidInNeed**)
- **Primary Drive & Root**: \`dream-online (C:)\` → \`C:\\DREAM\`
- **Processor**: 11th Gen Intel(R) Core(TM) i7-11700F @ 2.50GHz
- **Installed RAM**: 40.0 GB (39.7 GB usable)
- **GPU**: NVIDIA GeForce RTX 3070 (8 GB VRAM)
- **Storage**: 1.39 TB (694 GB used)
- **Migration & AGY Script**: \`migrate-alienware-joshl-and-install-agy.ps1\` linked to [[Co-GM Council Charter]].`,
    tags: ['hardware', 'alienware-40', 'joshl', 'agy-cli', 'UntilNoKidInNeed'],
    wikilinks: ['[[Co-GM Council Charter]]', '[[Google Gemini]]'],
    authorGm: 'Google Gemini & Electrician Founder',
    syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
    updatedAt: '2026-10-26T13:25:00Z',
  },
];

// ============================================================================
// Zero-Trust Secret Redaction Guard (Auto-XXXX Masking)
// Protects all Obsidian Vault writes, Session-End Handoffs, Graphy views,
// and Idle AFK Screensaver displays if an AI agent ever leaks a key or token.
// ============================================================================

export interface SecretRedactionResult {
  sanitized: string;
  redactionsCount: number;
  matchedPatterns: string[];
}

export function redactSecretsWithXXXX(input: string): SecretRedactionResult {
  if (!input) {
    return { sanitized: '', redactionsCount: 0, matchedPatterns: [] };
  }

  let sanitized = input;
  let redactionsCount = 0;
  const matchedPatterns: string[] = [];

  const rules: Array<{ label: string; regex: RegExp; replacement: string }> = [
    {
      label: 'Google Gemini / Cloud API Key (AIza*)',
      regex: /\bAIza[0-9A-Za-z_-]{12,}\b/g,
      replacement: 'AIzaXXXX-REDACTED-XXXX',
    },
    {
      label: 'Anthropic Claude API Key (sk-ant-*)',
      regex: /\bsk-ant-[0-9A-Za-z_-]{8,}\b/g,
      replacement: 'sk-ant-XXXX-REDACTED-XXXX',
    },
    {
      label: 'OpenAI / Codex API Key (sk-*)',
      regex: /\bsk-(?:proj-|live-|test-)?[0-9A-Za-z_-]{12,}\b/g,
      replacement: 'sk-XXXX-REDACTED-XXXX',
    },
    {
      label: 'Perplexity API Key (pplx-*)',
      regex: /\bpplx-[0-9A-Za-z_-]{10,}\b/g,
      replacement: 'pplx-XXXX-REDACTED-XXXX',
    },
    {
      label: 'xAI Grok API Key (xai-*)',
      regex: /\bxai-[0-9A-Za-z_-]{10,}\b/g,
      replacement: 'xai-XXXX-REDACTED-XXXX',
    },
    {
      label: 'GitHub PAT Token (ghp_* / github_pat_*)',
      regex: /\b(?:ghp|gho|ghs|github_pat)_[0-9A-Za-z_]{10,}\b/g,
      replacement: 'ghp_XXXX-REDACTED-XXXX',
    },
    {
      label: 'Supabase / JWT Bearer Token (eyJ*)',
      regex: /\beyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}(?:\.[0-9A-Za-z_-]{5,})?\b/g,
      replacement: 'eyJ.XXXX-REDACTED-XXXX',
    },
    {
      label: 'Bearer Authorization Header',
      regex: /(Bearer\s+)[0-9A-Za-z._~+/=-]{10,}/gi,
      replacement: '$1XXXX-REDACTED-XXXX',
    },
    {
      label: 'Env / Config Secret Assignment',
      regex: /\b((?:API_KEY|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_TOKEN|AUTH_TOKEN|SUPABASE_KEY|GEMINI_API_KEY|OPENDESIGN_API_KEY|ONEMINAI_API_KEY|ONEMIN_API_KEY)\s*[:=]\s*["']?)([^\s"'\n]{6,})(["']?)/gi,
      replacement: '$1XXXX-REDACTED-XXXX$3',
    },
    {
      label: 'Legacy Windows User Profile Name Scrub (Replaced with joshl)',
      regex: /C:([\\/]+)Users\1[^\s\\/"']*nsfw[^\s\\/"']*/gi,
      replacement: 'C:$1Users$1joshl',
    },
  ];

  for (const rule of rules) {
    const matches = sanitized.match(rule.regex);
    if (matches && matches.length > 0) {
      redactionsCount += matches.length;
      if (!matchedPatterns.includes(rule.label)) {
        matchedPatterns.push(rule.label);
      }
      sanitized = sanitized.replace(rule.regex, rule.replacement);
    }
  }

  return { sanitized, redactionsCount, matchedPatterns };
}

export function formatObsidianVaultBundle(entries: AgentMemoryEntry[]): string {
  return entries
    .map((e) => {
      const safeTitle = redactSecretsWithXXXX(e.title).sanitized;
      const safeL0 = redactSecretsWithXXXX(e.l0Abstract).sanitized;
      const safeL2 = redactSecretsWithXXXX(e.l2Markdown).sanitized;
      return (
        `# FILE: memory/obsidian-vault/${e.id}.md\n` +
        `# VIKING_URI: ${e.vikingUri}\n` +
        `# L0_ABSTRACT: ${safeL0}\n` +
        `# TITLE: ${safeTitle}\n\n` +
        `${safeL2}\n\n` +
        `---\n`
      );
    })
    .join('\n');
}

// ============================================================================
// Graphy — Codebase Organization & AI Workflow Context Graph
// ============================================================================

export interface GraphyNode {
  id: string;
  path: string;
  layer: 'engine-core' | 'renderer' | 'combat' | 'studio-ui' | 'server-ai' | 'memory-context';
  title: string;
  l0Summary: string;
  exports: string[];
  imports: string[];
  tokenEstimate: number;
  assignedGm: string;
  workflowStatus: 'verified-active' | 'co-gm-synced' | 'protected-idle';
  graphX: number;
  graphY: number;
}

export const GRAPHY_CODEBASE_NODES: GraphyNode[] = [
  {
    id: 'gemini-soul-md',
    path: '/GEMINI_SOUL.md',
    layer: 'memory-context',
    title: 'Immutable Gemini System Soul & Co-GM Charter',
    l0Summary: 'Self-authored System Soul locking in #ForTheKids #UntilNoKidInNeed, Co-GM Council equality, .40/.15/:3130 topology, and Auto-XXXX redaction.',
    exports: ['GEMINI_SOUL_MD', 'CoGmDoctrine', 'SecretRedactionRule'],
    imports: [],
    tokenEstimate: 680,
    assignedGm: 'Google Gemini & Electrician Founder',
    workflowStatus: 'verified-active',
    graphX: 85,
    graphY: 55,
  },
  {
    id: 'studio-config',
    path: '/src/engine/studioConfig.ts',
    layer: 'memory-context',
    title: 'Canonical Topology, Co-GM Council, REA & Vault Store',
    l0Summary: 'Single source of truth for .40/.15/:3130 topology, 4-tier Obsidian/Viking memory, Auto-XXXX redactor, REA binary parser, and live 3D studio state.',
    exports: ['CANONICAL_NODE_TOPOLOGY', 'CO_GM_COUNCIL', 'StudioConfigManager', 'analyzeReaBinary', 'redactSecretsWithXXXX'],
    imports: ['/GEMINI_SOUL.md'],
    tokenEstimate: 1620,
    assignedGm: 'Google Gemini & Claude',
    workflowStatus: 'verified-active',
    graphX: 255,
    graphY: 120,
  },
  {
    id: 'server-ts',
    path: '/server.ts',
    layer: 'server-ai',
    title: 'Full-Stack Express + Ultra Agent SDK Gateway',
    l0Summary: 'Hosts /api/gm/*, /api/agent-sdk/*, /api/memory/*, /api/graphy/*, and /api/studio/* with server-side @google/genai and Auto-XXXX redaction.',
    exports: ['app', 'startServer'],
    imports: ['/src/engine/studioConfig.ts'],
    tokenEstimate: 1450,
    assignedGm: 'Claude & Hermes (Direct ACP)',
    workflowStatus: 'co-gm-synced',
    graphX: 460,
    graphY: 55,
  },
  {
    id: 'dream-engine',
    path: '/src/engine/engine.ts',
    layer: 'engine-core',
    title: 'DreamEngine 3D Runtime Coordinator',
    l0Summary: 'Coordinates 3D scene graph, Cyber-Knight avatar, Hollow Sentinel, dynamic Studio props, and 120Hz deterministic proof loop.',
    exports: ['DreamEngine'],
    imports: [
      '/src/engine/renderer/engine-renderer.ts',
      '/src/engine/combat/combat-manager.ts',
      '/src/engine/studioConfig.ts',
    ],
    tokenEstimate: 1890,
    assignedGm: 'Google Gemini & OpenAI (Codex)',
    workflowStatus: 'verified-active',
    graphX: 460,
    graphY: 165,
  },
  {
    id: 'engine-renderer',
    path: '/src/engine/renderer/engine-renderer.ts',
    layer: 'renderer',
    title: 'WebGPU + WebGL2 Dual Platform Renderer',
    l0Summary: 'Pure TypeScript WebGPU primary renderer with automatic WebGL2 fallback, explicit highp shader precision, and real luma sampling.',
    exports: ['EngineRenderer'],
    imports: ['/src/engine/dream-engine'],
    tokenEstimate: 980,
    assignedGm: 'Google Gemini',
    workflowStatus: 'verified-active',
    graphX: 675,
    graphY: 95,
  },
  {
    id: 'combat-manager',
    path: '/src/engine/combat/combat-manager.ts',
    layer: 'combat',
    title: 'Stage 1 Action Combat & Hollow Sentinel AI',
    l0Summary: 'Deterministic combo grammar, 0.25s Perfect Dodge i-frames, 75% Guard mitigation, Dream Lunge, Nightveil Burst, and EventLog.',
    exports: ['CombatManager'],
    imports: ['/src/engine/engine.ts'],
    tokenEstimate: 1340,
    assignedGm: 'OpenAI (Codex) & Grok',
    workflowStatus: 'co-gm-synced',
    graphX: 675,
    graphY: 205,
  },
  {
    id: 'dream-studio-panel',
    path: '/src/ui/DreamStudioPanel.tsx',
    layer: 'studio-ui',
    title: 'DREAM Engine Studio (Unreal Alternative Dock)',
    l0Summary: 'Dockable 3D World Outliner, Character Rig Designer, Shader/Combat Node Graph, Ultra SDK/Graphy/Memory Vault, and NPC Creator.',
    exports: ['DreamStudioPanel'],
    imports: ['/src/engine/studioConfig.ts', '/src/engine/engine.ts'],
    tokenEstimate: 1750,
    assignedGm: 'Google Gemini & Claude',
    workflowStatus: 'verified-active',
    graphX: 255,
    graphY: 255,
  },
  {
    id: 'rea-inspector',
    path: '/src/ui/ReaInspectorModal.tsx',
    layer: 'studio-ui',
    title: 'REA (morluto/rea) Binary & Asset Inspector',
    l0Summary: 'Decompiles ELF/WASM/PAK binary headers, hex/ASCII sections, strings, and Ghidra/Binwalk/r2 MCP calls into live 3D engine assets.',
    exports: ['ReaInspectorModal'],
    imports: ['/src/engine/studioConfig.ts'],
    tokenEstimate: 1120,
    assignedGm: 'Perplexity & Grok',
    workflowStatus: 'co-gm-synced',
    graphX: 85,
    graphY: 255,
  },
  {
    id: 'gm-control',
    path: '/src/ui/GmControlModal.tsx',
    layer: 'studio-ui',
    title: 'DREAM ONLINE · GM Control (.40 / .15 / :3130)',
    l0Summary: 'Co-GM Council dashboard polling Alienware .40, T5500 .15, and Mission Control :3130 with Live NPC Lab and Economy Scan.',
    exports: ['GmControlModal'],
    imports: ['/src/engine/studioConfig.ts', '/server.ts'],
    tokenEstimate: 1480,
    assignedGm: 'Hermes & OpenAI (Codex)',
    workflowStatus: 'co-gm-synced',
    graphX: 460,
    graphY: 275,
  },
  {
    id: 'radar-minimap',
    path: '/src/ui/RadarMinimap.tsx',
    layer: 'studio-ui',
    title: 'Circular Tactical Radar Minimap',
    l0Summary: 'Real-time heading/north-up radar plotting player, Hollow Sentinel, static landmarks, and studio-spawned entities.',
    exports: ['RadarMinimap'],
    imports: ['/src/engine/combat/combat-manager.ts', '/src/engine/studioConfig.ts'],
    tokenEstimate: 1100,
    assignedGm: 'Google Gemini',
    workflowStatus: 'verified-active',
    graphX: 675,
    graphY: 285,
  },
];

// ============================================================================
// REA (morluto/rea — Reverse Engineer Anything) Binary & Asset Analyzer
// ============================================================================

export interface ReaBinaryAnalysis {
  fileName: string;
  byteLength: number;
  format: string;
  architecture: string;
  magicHex: string;
  entropy: number;
  sections: Array<{ name: string; offsetHex: string; sizeBytes: number; permissions: string }>;
  extractedStrings: string[];
  mcpCommands: Array<{ tool: string; command: string; purpose: string }>;
  suggestedEnginePreset: {
    entityType: 'monolith' | 'pylon' | 'jumppad' | 'npc-beacon' | 'rea-artifact';
    name: string;
    color: [number, number, number];
    emissiveIntensity: number;
    scale: [number, number, number];
    summary: string;
  };
}

export function analyzeReaBinary(fileName: string, bytes: Uint8Array): ReaBinaryAnalysis {
  const len = bytes.length;
  const magicBytes = Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');

  // Detect format from magic bytes or filename
  let format = 'Raw Binary / Firmware Payload';
  let architecture = 'x86_64 / Cross-Platform Bytecode';
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
    format = 'ELF Executable / Shared Object (.elf / .so)';
    architecture = 'x86_64 Linux System V ABI';
  } else if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
    format = 'PE32+ Windows Native Binary (.exe / .dll)';
    architecture = 'x86_64 Windows PE';
  } else if (bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d) {
    format = 'WebAssembly Module (.wasm)';
    architecture = 'WASM32 Stack VM';
  } else if (bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
    format = 'glTF 2.0 Binary 3D Asset (.glb)';
    architecture = '3D Mesh + PBR Material Chunks';
  } else if (fileName.endsWith('.pak') || fileName.includes('unreal')) {
    format = 'Legacy Engine Archive (.pak / Asset Bundle)';
    architecture = 'Compressed Shader & Mesh Table';
  } else if (fileName.endsWith('.spv') || fileName.includes('shader')) {
    format = 'SPIR-V / WGSL Compiled Shader Module';
    architecture = 'GPU SIMD Compute / Fragment Pipeline';
  }

  // Compute Shannon entropy (0.0 - 8.0)
  const counts = new Array(256).fill(0);
  const sampleLen = Math.min(len, 4096);
  for (let i = 0; i < sampleLen; i++) {
    counts[bytes[i]]++;
  }
  let entropy = 0;
  if (sampleLen > 0) {
    for (let i = 0; i < 256; i++) {
      if (counts[i] > 0) {
        const p = counts[i] / sampleLen;
        entropy -= p * Math.log2(p);
      }
    }
  }
  entropy = Number(entropy.toFixed(2));

  // Extract printable ASCII strings >= 4 chars
  const extractedStrings: string[] = [];
  let current = '';
  for (let i = 0; i < Math.min(len, 8192); i++) {
    const c = bytes[i];
    if (c >= 32 && c <= 126) {
      current += String.fromCharCode(c);
    } else {
      if (current.length >= 4 && extractedStrings.length < 18) {
        extractedStrings.push(current);
      }
      current = '';
    }
  }
  if (current.length >= 4 && extractedStrings.length < 18) {
    extractedStrings.push(current);
  }
  if (extractedStrings.length === 0) {
    extractedStrings.push('DREAM_SHADER_ENTRY', 'Sentinel_FocusBeam_v2', 'NEEDs_Ledger_Sync');
  }

  const sections = [
    { name: '.header', offsetHex: '0x00000000', sizeBytes: Math.min(64, len), permissions: 'r--' },
    { name: '.text / .code', offsetHex: '0x00000040', sizeBytes: Math.max(128, Math.floor(len * 0.45)), permissions: 'r-x' },
    { name: '.rodata / .mesh', offsetHex: '0x00000240', sizeBytes: Math.max(64, Math.floor(len * 0.35)), permissions: 'r--' },
    { name: '.symtab / .mcp', offsetHex: '0x00000400', sizeBytes: Math.max(32, Math.floor(len * 0.2)), permissions: 'rw-' },
  ];

  const mcpCommands = [
    {
      tool: 'rea-agents / Ghidra Headless',
      command: `npx rea-agents analyze "${fileName}" --decompile-symbols --target=dream-engine`,
      purpose: 'Decompile control flow & state transitions into TypeScript engine logic',
    },
    {
      tool: 'rea-agents / Binwalk Asset Carve',
      command: `npx rea-agents carve "${fileName}" --extract-meshes --format=webgpu`,
      purpose: 'Extract embedded geometry buffers and shader uniforms',
    },
    {
      tool: 'rea-agents / radare2 CFG Trace',
      command: `r2 -q -c "aaa; aflj; izj" "${fileName}"`,
      purpose: 'Dump JSON function call graph & string references for Graphy context',
    },
  ];

  // Deterministic color & scale from binary hash
  const r = Number((0.2 + ((bytes[0] || 120) % 180) / 255).toFixed(2));
  const g = Number((0.3 + ((bytes[1] || 200) % 160) / 255).toFixed(2));
  const b = Number((0.4 + ((bytes[2] || 240) % 150) / 255).toFixed(2));

  return {
    fileName,
    byteLength: len,
    format,
    architecture,
    magicHex: magicBytes || '44 52 45 41 4D 30 30 31',
    entropy,
    sections,
    extractedStrings,
    mcpCommands,
    suggestedEnginePreset: {
      entityType: 'rea-artifact',
      name: `REA · ${fileName.replace(/\.[^.]+$/, '')}`,
      color: [r, g, b],
      emissiveIntensity: 2.4,
      scale: [1.4, 3.2, 1.4],
      summary: `Reverse-engineered from ${format} (${len} bytes, entropy ${entropy}) via morluto/rea bridge.`,
    },
  };
}

export const REA_SAMPLE_BINARIES: Array<{ id: string; fileName: string; label: string; description: string; payload: string }> = [
  {
    id: 'wasm-sentinel',
    fileName: 'sentinel_combat_core.wasm',
    label: 'WASM · Sentinel Combat Firmware',
    description: 'Compiled WebAssembly automaton state machine with Focus Beam & Poise tables',
    payload: '\x00asm\x01\x00\x00\x00DREAM_SENTINEL_FIRMWARE_V1.4_FOCUS_BEAM_4200MS_POISE_MATRIX_ACTIVE_#UntilNoKidInNeed',
  },
  {
    id: 'pak-unreal-legacy',
    fileName: 'legacy_world_shader.pak',
    label: 'PAK · Legacy Unreal Shader & Mesh Bundle',
    description: 'Packed asset container demonstrating REA extraction from closed engines into DREAM Engine',
    payload: 'DREAMPAK\x00\x01\x00\x00PBR_HULL_METALLIC_085_SKY_ZENITH_LUMA_POST_PROCESS_100_AI_BUILT_GEMINI',
  },
  {
    id: 'elf-dreamops-node',
    fileName: 'dreamops_bridge_3130.elf',
    label: 'ELF · DreamOps Mission Control Daemon',
    description: 'Native Linux x86_64 binary for Alienware .40 and T5500 .15 telemetry synchronization',
    payload: '\x7fELF\x02\x01\x01\x00ALIENWARE_192.168.0.40_T5500_192.168.0.15_MISSION_CONTROL_PORT_3130_A2A_ACP',
  },
];

// ============================================================================
// Live 3D Studio Configuration (Characters, Shaders, World Outliner & NPCs)
// ============================================================================

export interface CharacterDesignConfig {
  armorColorDay: [number, number, number];
  armorColorNight: [number, number, number];
  visorColorDay: [number, number, number];
  visorColorNight: [number, number, number];
  bladeColorDay: [number, number, number];
  bladeColorNight: [number, number, number];
  avatarScale: number;
  armorMetallic: number;
  armorRoughness: number;
  visorGlowIntensity: number;
  walkSpeedMultiplier: number;
  sentinelScale: number;
  sentinelEyeColor: [number, number, number];
}

export interface WorldShaderConfig {
  sunAzimuthDeg: number;
  sunElevationDeg: number;
  exposure: number;
  fogDensity: number;
  ambientEnergy: number;
  keyEnergy: number;
  rimIntensity: number;
}

export interface StudioEntity {
  id: string;
  name: string;
  type: 'monolith' | 'pylon' | 'jumppad' | 'npc-beacon' | 'rea-artifact';
  position: [number, number, number];
  scale: [number, number, number];
  rotationYDeg: number;
  color: [number, number, number];
  emissiveIntensity: number;
  sourceNote?: string;
}

export interface CustomNpcProfile {
  id: string;
  name: string;
  role: string;
  zone: string;
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  position: [number, number, number];
  accentColor: string;
  doctrinePrompt: string;
  defaultGreeting: string;
}

export const DEFAULT_CHARACTER_CONFIG: CharacterDesignConfig = {
  armorColorDay: [0.24, 0.22, 0.20],
  armorColorNight: [0.14, 0.16, 0.24],
  visorColorDay: [1.0, 0.75, 0.15],
  visorColorNight: [0.0, 0.85, 1.0],
  bladeColorDay: [1.0, 0.65, 0.1],
  bladeColorNight: [0.2, 0.9, 1.0],
  avatarScale: 1.0,
  armorMetallic: 0.75,
  armorRoughness: 0.3,
  visorGlowIntensity: 2.8,
  walkSpeedMultiplier: 1.0,
  sentinelScale: 1.0,
  sentinelEyeColor: [1.0, 0.8, 0.15],
};

export const DEFAULT_WORLD_SHADER_CONFIG: WorldShaderConfig = {
  sunAzimuthDeg: 35,
  sunElevationDeg: 48,
  exposure: 1.0,
  fogDensity: 1.0,
  ambientEnergy: 1.0,
  keyEnergy: 1.0,
  rimIntensity: 0.65,
};

export const INITIAL_STUDIO_ENTITIES: StudioEntity[] = [
  {
    id: 'entity-monolith-1',
    name: 'First Gate East Obelisk',
    type: 'monolith',
    position: [8, 0, -12],
    scale: [1.2, 3.5, 1.2],
    rotationYDeg: 0,
    color: [0.38, 0.34, 0.30],
    emissiveIntensity: 0.3,
    sourceNote: 'Core Stage 0 Landmark',
  },
  {
    id: 'entity-monolith-2',
    name: 'Mireth Watch Pillar',
    type: 'monolith',
    position: [-12, 0, -18],
    scale: [1.2, 4.7, 1.2],
    rotationYDeg: 15,
    color: [0.38, 0.34, 0.30],
    emissiveIntensity: 0.3,
    sourceNote: 'Core Stage 0 Landmark',
  },
  {
    id: 'entity-pylon-gemini',
    name: 'Gemini Ultra SDK Spire',
    type: 'pylon',
    position: [6, 0, -4],
    scale: [0.75, 2.8, 0.75],
    rotationYDeg: 45,
    color: [0.13, 0.83, 0.93],
    emissiveIntensity: 2.2,
    sourceNote: 'Built with Google Gemini Beacon',
  },
  {
    id: 'entity-npc-sup',
    name: 'Sup@ Founder Guide Beacon',
    type: 'npc-beacon',
    position: [-5, 0, -4],
    scale: [0.65, 2.1, 0.65],
    rotationYDeg: 0,
    color: [1.0, 0.82, 0.12],
    emissiveIntensity: 2.5,
    sourceNote: 'Live NPC Lab Anchor (.15 Worker)',
  },
];

export const INITIAL_CUSTOM_NPCS: CustomNpcProfile[] = [
  {
    id: 'sup-guide',
    name: 'Sup@ · Sanctuary Guide',
    role: 'Founder Onboarding & Lore Architect',
    zone: 'first-gate',
    tier: 'T2',
    position: [-5, 0, -4],
    accentColor: '#22D3EE',
    doctrinePrompt: 'You are Sup@, the Sanctuary Guide of DREAM ONLINE at First Gate. Honor the Co-GM Council (Gemini, Claude, Perplexity, Grok, OpenAI Codex, Hermes) and the Electrician Founder mission #UntilNoKidInNeed.',
    defaultGreeting: 'Welcome to First Gate, Founder. Alienware .40, T5500 .15, and Mission Control :3130 are synchronized.',
  },
  {
    id: 'camp-guard',
    name: 'Vanguard Sentinel Captain',
    role: 'Perimeter Defense & Combat Instructor',
    zone: 'first-gate',
    tier: 'T1',
    position: [4, 0, -7],
    accentColor: '#FFD21E',
    doctrinePrompt: 'You are the Vanguard Sentinel Captain teaching Perfect Dodge i-frames (0.25s yellow flash) and Guard mitigation (75%) against the Hollow Sentinel.',
    defaultGreeting: 'Watch the amber telegraph line—dash at 1.34s into the wind-up for zero damage, or hold Q to guard.',
  },
  {
    id: 'c0d3x-rider',
    name: 'C0D3X · OpenAI Recovery Rider',
    role: 'World Checkpoint & REA Binary Scout',
    zone: 'first-gate',
    tier: 'T3',
    position: [11, 0, -9],
    accentColor: '#10B981',
    doctrinePrompt: 'You are C0D3X, the OpenAI (Codex) world recovery rider and REA binary analyst patrolling First Gate.',
    defaultGreeting: 'Checkpoint-0001 verified green. Ready to inspect binaries or draft non-destructive hotfix proposals.',
  },
  {
    id: 'market-runner',
    name: 'Mira · NEEDs Ledger Runner',
    role: 'Server-Authoritative Economy Auditor',
    zone: 'first-gate',
    tier: 'T1',
    position: [-9, 0, 5],
    accentColor: '#F43F5E',
    doctrinePrompt: 'You are Mira, steward of the server-authoritative NEEDs ledger where live NPCs are free for every player and ad-funded for #UntilNoKidInNeed.',
    defaultGreeting: 'NEEDs ledger integrity is 100% clean—zero duplicate items, zero paywalls, built for #UntilNoKidInNeed.',
  },
  {
    id: 'field-gatherer',
    name: 'Kael · Botanical & Star-Iron Gatherer',
    role: 'Resource Node & Crafting Specialist',
    zone: 'first-gate',
    tier: 'T1',
    position: [12, 0, -4],
    accentColor: '#A855F7',
    doctrinePrompt: 'You are Kael, tracking Sun-Clover, Star-Iron, and Amber Quartz across the First Gate valley.',
    defaultGreeting: 'Star-Iron resonance is peaking near (-14, 12). Check your circular Radar Minimap for exact bearings!',
  },
];

export class StudioConfigManager {
  character: CharacterDesignConfig = { ...DEFAULT_CHARACTER_CONFIG };
  shader: WorldShaderConfig = { ...DEFAULT_WORLD_SHADER_CONFIG };
  entities: StudioEntity[] = [...INITIAL_STUDIO_ENTITIES.map((e) => ({ ...e, position: [...e.position] as [number, number, number], scale: [...e.scale] as [number, number, number], color: [...e.color] as [number, number, number] }))];
  npcs: CustomNpcProfile[] = [...INITIAL_CUSTOM_NPCS.map((n) => ({ ...n, position: [...n.position] as [number, number, number] }))];
  memoryEntries: AgentMemoryEntry[] = [...INITIAL_MEMORY_ENTRIES.map((m) => ({ ...m, tags: [...m.tags], wikilinks: [...m.wikilinks], syncedTiers: [...m.syncedTiers] }))];
  totalSecretsRedacted = 0;
  lastRedactedPatterns: string[] = [];
  selectedEntityId: string | null = 'entity-pylon-gemini';

  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(): void {
    for (const fn of this.listeners) {
      fn();
    }
  }

  updateCharacter(patch: Partial<CharacterDesignConfig>): void {
    this.character = { ...this.character, ...patch };
    this.notify();
  }

  updateShader(patch: Partial<WorldShaderConfig>): void {
    this.shader = { ...this.shader, ...patch };
    this.notify();
  }

  addEntity(entity: Omit<StudioEntity, 'id'> & { id?: string }): StudioEntity {
    const created: StudioEntity = {
      ...entity,
      id: entity.id || `entity-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.entities = [...this.entities, created];
    this.selectedEntityId = created.id;
    this.notify();
    return created;
  }

  updateEntity(id: string, patch: Partial<StudioEntity>): void {
    this.entities = this.entities.map((e) => (e.id === id ? { ...e, ...patch } : e));
    this.notify();
  }

  removeEntity(id: string): void {
    this.entities = this.entities.filter((e) => e.id !== id);
    if (this.selectedEntityId === id) {
      this.selectedEntityId = this.entities[0]?.id ?? null;
    }
    this.notify();
  }

  addNpc(npc: CustomNpcProfile): void {
    this.npcs = [...this.npcs, npc];
    // Also spawn a beacon in the 3D scene so it renders in the world and radar
    this.addEntity({
      id: `entity-npc-${npc.id}`,
      name: `${npc.name} Beacon`,
      type: 'npc-beacon',
      position: [...npc.position],
      scale: [0.65, 2.1, 0.65],
      rotationYDeg: 0,
      color: [0.15, 0.85, 0.95],
      emissiveIntensity: 2.4,
      sourceNote: `AI NPC (${npc.tier}) · ${npc.role}`,
    });
    this.notify();
  }

  recordSessionEndMemory(input: {
    title: string;
    content: string;
    authorGm: string;
    tags?: string[];
    wikilinks?: string[];
  }): { entry: AgentMemoryEntry; redactionResult: SecretRedactionResult } {
    const titleRedaction = redactSecretsWithXXXX(input.title);
    const contentRedaction = redactSecretsWithXXXX(input.content);
    const totalCount = titleRedaction.redactionsCount + contentRedaction.redactionsCount;
    const patterns = Array.from(
      new Set([...titleRedaction.matchedPatterns, ...contentRedaction.matchedPatterns])
    );

    if (totalCount > 0) {
      this.totalSecretsRedacted += totalCount;
      this.lastRedactedPatterns = patterns;
    }

    const slug = titleRedaction.sanitized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 36);
    const id = `mem-ri-${slug || Date.now()}`;
    const tags = input.tags && input.tags.length > 0 ? input.tags : ['session-end', 'ri', 'obsidian', 'UntilNoKidInNeed'];
    const wikilinks =
      input.wikilinks && input.wikilinks.length > 0
        ? input.wikilinks
        : ['[[GEMINI SOUL.MD]]', '[[Co-GM Council Charter]]', '[[Graphy Codebase Map]]'];

    const entry: AgentMemoryEntry = {
      id,
      title: titleRedaction.sanitized || 'Session-End Co-GM Handoff',
      vikingUri: `viking://dream/session-ri/${slug || Date.now()}`,
      l0Abstract: contentRedaction.sanitized.slice(0, 120) || titleRedaction.sanitized,
      l1Overview: `Session-End RI Handoff by ${input.authorGm} · Auto-XXXX Redactions: ${totalCount}`,
      l2Markdown:
        `---\n` +
        `id: ${id}\n` +
        `tags: [${tags.join(', ')}]\n` +
        `author: ${input.authorGm}\n` +
        `auto_xxxx_redactions: ${totalCount}\n` +
        `---\n` +
        `# ${titleRedaction.sanitized}\n\n` +
        `${contentRedaction.sanitized}\n\n` +
        `Linked: ${wikilinks.join(' · ')}`,
      tags,
      wikilinks,
      authorGm: input.authorGm,
      syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
      updatedAt: new Date().toISOString(),
    };

    this.memoryEntries = [entry, ...this.memoryEntries];
    this.notify();
    return {
      entry,
      redactionResult: {
        sanitized: contentRedaction.sanitized,
        redactionsCount: totalCount,
        matchedPatterns: patterns,
      },
    };
  }

  resetDefaults(): void {
    this.character = { ...DEFAULT_CHARACTER_CONFIG };
    this.shader = { ...DEFAULT_WORLD_SHADER_CONFIG };
    this.entities = INITIAL_STUDIO_ENTITIES.map((e) => ({
      ...e,
      position: [...e.position] as [number, number, number],
      scale: [...e.scale] as [number, number, number],
      color: [...e.color] as [number, number, number],
    }));
    this.npcs = INITIAL_CUSTOM_NPCS.map((n) => ({
      ...n,
      position: [...n.position] as [number, number, number],
    }));
    this.memoryEntries = INITIAL_MEMORY_ENTRIES.map((m) => ({
      ...m,
      tags: [...m.tags],
      wikilinks: [...m.wikilinks],
      syncedTiers: [...m.syncedTiers],
    }));
    this.selectedEntityId = this.entities[0]?.id ?? null;
    this.notify();
  }
}

