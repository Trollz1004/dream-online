@echo off
rem Bootstrap-T5500.cmd
rem
rem Launcher for Bootstrap-T5500.ps1 on a fresh Windows 10 T5500. It elevates
rem itself if needed, then runs the PowerShell step engine with -NoExit, so
rem the window stays open no matter what the script does or hits. Pass any
rem extra arguments straight through, for example:
rem   Bootstrap-T5500.cmd -DryRun

setlocal
set "SCRIPT_DIR=%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This needs an elevated PowerShell. Requesting administrator rights...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '%*' -Verb RunAs"
    exit /b
)

powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Bootstrap-T5500.ps1" %*
