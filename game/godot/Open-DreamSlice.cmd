@echo off
setlocal

rem DREAM ONLINE combat slice. Opens the playable window straight away.
rem Godot needs no compiler and no editor to run this.

set "GODOT=%LOCALAPPDATA%\Microsoft\WinGet\Links\godot.exe"
set "PROJECT=C:\DREAM\dream-online\game\godot\DreamSlice"

if not exist "%GODOT%" (
    echo Godot was not found at %GODOT%. Install it with: winget install --id GodotEngine.GodotEngine -e
    exit /b 1
)

if not exist "%PROJECT%\project.godot" (
    echo The combat slice project was not found at %PROJECT%.
    exit /b 1
)

start "" "%GODOT%" --path "%PROJECT%" --windowed --resolution 1600x900
exit /b 0
