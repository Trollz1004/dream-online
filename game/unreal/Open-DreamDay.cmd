@echo off
setlocal

set "UE_EDITOR=C:\DREAM\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"
set "UPROJECT=C:\DREAM\dream-online\game\unreal\DreamOnline\DreamOnline.uproject"
set "DAY_MAP=C:\DREAM\dream-online\game\unreal\DreamOnline\Content\Dream\Maps\Lvl_DayDream.umap"

if not exist "%UE_EDITOR%" (
    echo UnrealEditor.exe was not found at %UE_EDITOR%. Install or repair Unreal Engine 5.8 before opening the Day Dream map.
    exit /b 1
)

if not exist "%UPROJECT%" (
    echo DreamOnline.uproject was not found at %UPROJECT%. Rebuild it first with: powershell -NoProfile -ExecutionPolicy Bypass -File game\unreal\New-DreamTestZone.ps1
    exit /b 1
)

if not exist "%DAY_MAP%" (
    echo Lvl_DayDream.umap was not found. Build it first with: powershell -NoProfile -ExecutionPolicy Bypass -File game\unreal\Build-DreamMaps.ps1
    exit /b 1
)

start "" "%UE_EDITOR%" "%UPROJECT%" /Game/Dream/Maps/Lvl_DayDream -game -windowed -ResX=1920 -ResY=1080
exit /b 0
