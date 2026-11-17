@echo off
if "%ALIENWARE_HOST%"=="" set ALIENWARE_HOST=192.168.0.40
if "%T5500_HOST%"=="" set T5500_HOST=192.168.0.15
title ALIENWARE LEAD-GEN COMMAND STUDIO — SELF-HEAL & RED/GREEN LIGHT MONITOR
color 0A
echo ===============================================================================
echo   ALIENWARE (%ALIENWARE_HOST%) LEAD-GEN COMMAND STUDIO BOOTSTRAP ^& SELF-HEAL
echo   CLI Enforced: agy --dangerously-skip-permissions (Never gemini cmd)
echo   Ports Monitored ^& Auto-Healed:
echo     - :8392  Alienware Lead-Gen Command Studio GUI (http://%ALIENWARE_HOST%:8392/)
echo     - :9119  Hermes OPSis Orchestrator (http://192.168.0.40:9119/chat?profile=default^&resume=local-profile)
echo     - :8082  Free Claude Code Admin ^& MCP (http://192.168.0.40:8082/admin)
echo     - :8391  Alienware GPU Media ^& Female Voice Worker
echo     - :11434 Ollama 16GB AMD GPU Offload
echo     - :27123 Obsidian Local REST API ^& Sync
echo     - :49374 T5500 Shared ai-memory MCP (http://%T5500_HOST%:49374)
echo   Strictly Scoped — Separate from T5500 (:3130) ^& Port :9180 Game Engine
echo ===============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\ops\node\boot-alienware-services.ps1"

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [RED LIGHT WARNING] One or more checks on 8392 / 9119 / 8082 / 27123 reported an issue above.
    echo Window stays open so Founder Joshua Coleman can inspect the status.
) else (
    echo.
    echo [ALL GREEN LIGHTS] Alienware Lead-Gen Command Studio stack ^(8392, 9119, 8082, 8391, 11434, 27123^) is online!
)

echo.
echo ===============================================================================
echo   Terminal stays open (never auto-closes on error). Press any key to keep
echo   this shell open, or close this window when finished.
echo ===============================================================================
pause
cmd /k
