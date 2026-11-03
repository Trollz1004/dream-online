# Software Install Plan

Status note (2026-09-26): superseded by the engine decision of 2026-09-30: the engine is built in-house and needs
no third-party install, so no Unreal, Godot, Visual Studio, or CMake install is pending. This file is kept as the July 2026 record.

Status: draft

## Current installed tools

- Git.
- GitHub CLI.
- Node.js and npm.
- Python.
- winget.

## Missing heavy game-dev tools

- Epic Games Launcher.
- Unreal Engine.
- Visual Studio 2022 C++ toolchain.
- MSVC `cl`.
- CMake.

## Install principle

Do not install heavy interactive software from background automations. Install engine
software only when Joshua is present or explicitly approves the long download/login flow.

## Recommended order

1. Epic Games Launcher.
2. Unreal Engine current stable production target.
3. Visual Studio 2022 with C++ game development workload and Windows SDK.
4. CMake if required by native tooling or plugins.
5. Git LFS if missing.
6. Optional art/audio tools after the first playable scope is locked.

## First playable before heavy installs

Continue using Node.js for:

- Live NPC Lab.
- DreamOps Bridge.
- Data contracts.
- Marketplace schemas.
- AI provider boundaries.
- Simulation tests.

## Avoid for now

- Random asset packs.
- Unlicensed logos.
- Unreviewed marketplace plugins.
- Paid tools without a direct first-playable use.
- Public deployment before repo hygiene is clean.
