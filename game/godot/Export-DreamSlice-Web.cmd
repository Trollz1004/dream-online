@echo off
setlocal

rem Builds the browser version of the DREAM combat slice.
rem Needs Godot 4.7.2 and its export templates, both already installed on this node.
rem The build is deliberately single-threaded, so it runs on any plain static host
rem with no cross-origin isolation headers.

set "GODOT=%LOCALAPPDATA%\Microsoft\WinGet\Links\godot.exe"
set "PROJECT=C:\DREAM\dream-online\game\godot\DreamSlice"
set "OUT=C:\DREAM\dream-online\build\web"

if not exist "%GODOT%" (
    echo Godot was not found at %GODOT%.
    exit /b 1
)

if not exist "%OUT%" mkdir "%OUT%"

"%GODOT%" --headless --path "%PROJECT%" --export-release "Web" "%OUT%\index.html"
if errorlevel 1 (
    echo Export failed.
    exit /b 1
)

echo Built to %OUT%. Run Serve-DreamSlice-Web.cmd to play it in a browser.
exit /b 0
