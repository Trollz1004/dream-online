@echo off
rem =======================================================================
rem  drift - Joshua's one way in on the Alienware node.   updated 2026-09-19b
rem
rem  Brings the DREAM stack up AND opens real Claude with the alienware-node
rem  launch skill loaded. It is never a wrapper around Claude: the last line
rem  is Joshua's own claude command with only the quoted prompt appended.
rem
rem  DO NOT RENAME THIS FILE. Standing rule, same word on every node.
rem  Tracked copy:   C:\DREAM\dream-online\ops\node\drift.cmd
rem  Installed copy: %USERPROFILE%\.local\bin\drift.cmd  (on the user PATH)
rem  Keep the two byte-identical. Only Claude edits them, and every edit
rem  gets a line in ops\node\runbook\PROTECTED-CHANGELOG.md.
rem
rem  Usage:
rem    drift          make sure the stack supervisor runs, then open Claude
rem    drift bare     open Claude only, touch nothing
rem    drift house    make sure the stack supervisor runs, then print the
rem                   health table; no Claude
rem    drift health   run the 30-minute health probe now and print the table
rem                   (a failed required service gets one bring-up pass)
rem    drift ue       open the Unreal Editor (UE 5.8) on the DREAM project,
rem                   or the project browser while no .uproject exists
rem    drift jarvis   open Mission Control on Sabretooth in the browser
rem    drift help     this list
rem
rem  The stack is C:\DREAM\hermes\scripts\dream-stack.ps1, run by the logon
rem  scheduled task "DREAM Stack". It supervises, by identity string:
rem    JARVIS HUD 9150, Hermes dashboard 9119, Ollama 11434, Live NPC Lab
rem    9127, DreamOps Bridge 9133, Crosslisting OS 3000, and it probes
rem    OmniRoute on Sabretooth (http://192.168.0.8:20128/v1, the only URL).
rem  One supervisor only: drift starts the task when it is not running and
rem  never starts a second copy. Claude is the judge lane and never routes
rem  through OmniRoute.
rem =======================================================================
setlocal
title DREAM drift

set "ROOT=C:\DREAM\dream-online"
set "HEALTH=%ROOT%\ops\node\alienware-health.ps1"
set "STACKTASK=DREAM Stack"
set "STACK=C:\DREAM\hermes\scripts\dream-stack.cmd"
set "UE=C:\DREAM\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"
rem Set UPROJECT to the full path of the DREAM .uproject once it exists.
set "UPROJECT="
set "HEALTHARGS=-Verbose"
set "RC=0"

if not exist "%ROOT%" (
  echo [drift] %ROOT% not found. Nothing started.
  exit /b 1
)
cd /d "%ROOT%"

if "%~1"=="" goto :default
if /I "%~1"=="bare"   goto :claude
if /I "%~1"=="house"  goto :house
if /I "%~1"=="health" goto :health
if /I "%~1"=="ue"     goto :ue
if /I "%~1"=="jarvis" goto :jarvis
if /I "%~1"=="help"   goto :usage
echo [drift] Unknown subcommand "%~1".
set "RC=2"
goto :usage

:default
call :stackup
goto :claude

:house
call :stackup
echo [drift] Giving the services 10 seconds, then probing by identity...
timeout /t 10 /nobreak >nul
set "HEALTHARGS=-NoHeal -Verbose"
goto :health

:claude
claude "/alienware-node"
exit /b %ERRORLEVEL%

:health
if not exist "%HEALTH%" (
  echo [drift] Health probe not found at %HEALTH%
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%HEALTH%" %HEALTHARGS%
exit /b %ERRORLEVEL%

:ue
if not exist "%UE%" (
  echo [drift] Unreal Editor not found at %UE%
  exit /b 1
)
if defined UPROJECT if exist "%UPROJECT%" (
  start "" "%UE%" "%UPROJECT%"
  exit /b 0
)
echo [drift] No DREAM .uproject exists yet. Opening the Unreal project browser.
start "" "%UE%"
exit /b 0

:jarvis
start "" http://192.168.0.8:9150/
exit /b 0

:usage
echo.
echo   drift          stack up, then Claude with /alienware-node
echo   drift bare     Claude only
echo   drift house    stack up, then the health table
echo   drift health   run the health probe now
echo   drift ue       open the Unreal Editor
echo   drift jarvis   open Mission Control on Sabretooth
echo.
exit /b %RC%

:stackup
rem One supervisor only. It counts as running when a powershell process holds dream-stack.ps1
rem without -Once or -Status, however it was started (the logon task, npm start, or drift).
powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -match 'dream-stack\.ps1' -and $_.CommandLine -notmatch '-Once|-Status|-Install' }) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo [drift] DREAM stack supervisor is already running.
  exit /b 0
)
schtasks /query /tn "%STACKTASK%" >nul 2>&1
if not errorlevel 1 (
  echo [drift] Starting the DREAM stack supervisor, scheduled task "%STACKTASK%".
  schtasks /run /tn "%STACKTASK%" >nul
  exit /b 0
)
if exist "%STACK%" (
  echo [drift] Task "%STACKTASK%" is not registered. Starting the supervisor in a minimized window.
  start "DREAM Stack" /min cmd /k "%STACK%"
  exit /b 0
)
echo [drift] Stack script not found at %STACK%. The stack was NOT started.
exit /b 0
