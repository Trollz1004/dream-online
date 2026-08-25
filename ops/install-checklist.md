# Install Checklist

## Current Inventory From This Node

Detected:

- `D:\` exists and is labeled `DREAM ONLINE MMORPG`.
- Git installed.
- Git LFS installed.
- Python installed.
- Node installed.
- winget installed.
- GPU: NVIDIA GeForce GTX 1070.
- RAM: about 64 GB.
- CPU: Intel i7-4960X, 6 cores / 12 threads.

Missing from standard locations:

- Unreal Engine.
- Epic Games Launcher.
- Visual Studio 2022 Community or Build Tools.
- `cl` C++ compiler in current PATH.
- CMake in current PATH.

## Required Basics For Unreal Track

1. Unreal Engine 5.5 or newer.
2. Visual Studio 2022 with Game development with C++ workload.
3. Windows 10/11 SDK.
4. MSVC v143 toolset.
5. Git LFS enabled for project repo.
6. Optional: Rider for Unreal or Visual Studio extensions.
7. Optional: Blender.
8. Optional: Fab/Megascans workflow.

## Install Notes

Unreal and Visual Studio installs are large and can take a long time. Install to `D:\` where possible to preserve `C:\` space.

Recommended install target:

```text
D:\EpicGames\UE_5.5
D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\unreal
```

## First Verification Commands After Install

```powershell
git lfs version
where cl
where msbuild
where UnrealEditor.exe
```
