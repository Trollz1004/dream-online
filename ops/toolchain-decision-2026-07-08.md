# Dream ONLINE Toolchain Decision - 2026-07-08

## Decision

Keep Codex focused on DREAM.

Do not start a heavyweight Unreal/Epic/Visual Studio install from automation until the
machine is ready for an interactive install window and a long download. Build the first
useful backend prototype now with the installed Node.js toolchain, then attach Unreal
once the editor and C++ build stack are present.

## Local machine state

Detected:

- Git installed.
- Node.js installed.
- npm installed.
- Python installed.
- winget installed.

Missing:

- Epic Games Launcher / Unreal Engine.
- Visual Studio C++ toolchain.
- `cl`.
- `cmake`.

## Official engine requirements checked

- Unreal download flow requires Epic Games Launcher first, then Unreal Engine install
  through the launcher.
- Unreal C++ work needs Visual Studio 2022 integration, MSVC, Windows SDK, and game/C++
  workloads.
- Unreal dedicated-server work should be treated as a C++ project with source-build
  requirements when following Epic's dedicated server path.

Reference sources:

- https://www.unrealengine.com/download
- https://dev.epicgames.com/documentation/unreal-engine/setting-up-visual-studio-development-environment-for-cplusplus-projects-in-unreal-engine
- https://dev.epicgames.com/documentation/unreal-engine/setting-up-dedicated-servers-in-unreal-engine

## OpenAI architecture notes checked

Use OpenAI APIs server-side only. The game client should never hold provider secrets.

Recommended split:

- Responses API for custom NPC orchestration where Dream owns the loop.
- Function calling for letting NPC systems request approved game actions.
- Retrieval/vector stores for lore, item, quest, and NPC memory lookup after cost review.
- Realtime API only for voice/live guide experiments where latency matters.
- Agents SDK later for bounded workflows with specialist agents, guardrails, tracing, or
  resumable approval flows.

Reference sources:

- https://platform.openai.com/docs/guides/function-calling
- https://platform.openai.com/docs/guides/retrieval
- https://platform.openai.com/docs/guides/realtime
- https://platform.openai.com/docs/guides/agents

## Immediate build path

Build a local `live-npc-lab` first:

- No provider dependency.
- No secrets.
- Deterministic mock responses for local testing.
- Timestamped JSONL memory/event logs.
- Explicit cloud-AI opt-in later through environment flags.
- Clean-room public language: no direct competitor labels, no vendor/TOS language in
  in-game copy, no private accounting or charity language.

## Install queue

Install only when Joshua is ready for long downloads and interactive windows:

1. Epic Games Launcher.
2. Unreal Engine 5.8 or the current stable production target at install time.
3. Visual Studio 2022 with Unreal/C++ workloads and Windows SDK.
4. CMake if required by plugins or native tooling.

Do not install random game-dev tools unless they directly support the current prototype.
