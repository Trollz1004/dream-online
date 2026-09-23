@echo off
setlocal

rem DREAM ONLINE crowdfunding demo (specs/002-crowdfunding-demo). Records the
rem ~80 second --demo timeline with Godot's own --write-movie, then re-encodes
rem the AVI to MP4 with ffmpeg. Fixed 30 FPS, 1920x1080. The recorded video is
rem git-ignored; this recipe is what is committed. Offline, fine if slow.
rem
rem Usage:
rem   Record-Demo.cmd
rem       records against the shared node-wide lab at 127.0.0.1:9127
rem   Record-Demo.cmd http://127.0.0.1:9227
rem       records against a lane's own lab instance instead (--lab-url is
rem       only passed when this first argument is given)

set "GODOT=%LOCALAPPDATA%\Microsoft\WinGet\Links\godot.exe"
set "PROJECT=%~dp0DreamSlice"
set "DEMO_DIR=%PROJECT%\demo"
set "AVI=%DEMO_DIR%\dream-demo.avi"
set "MP4=%DEMO_DIR%\dream-demo.mp4"

if not exist "%GODOT%" (
    echo Godot was not found at %GODOT%. Install it with: winget install --id GodotEngine.GodotEngine -e
    exit /b 1
)

if not exist "%PROJECT%\project.godot" (
    echo The combat slice project was not found at %PROJECT%.
    exit /b 1
)

if not exist "%DEMO_DIR%" mkdir "%DEMO_DIR%"

set "LAB_ARGS="
if not "%~1"=="" set "LAB_ARGS=--lab-url %~1"

echo Recording the demo to %AVI% ...
"%GODOT%" --path "%PROJECT%" --write-movie "%AVI%" --fixed-fps 30 --resolution 1920x1080 -- --demo %LAB_ARGS%
if errorlevel 1 (
    echo Recording failed.
    exit /b 1
)

if not exist "%AVI%" (
    echo Recording did not produce %AVI%.
    exit /b 1
)

echo Encoding %AVI% to %MP4% ...
ffmpeg -y -i "%AVI%" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p "%MP4%"
if errorlevel 1 (
    echo Encoding failed.
    exit /b 1
)

del "%AVI%"

echo Done: %MP4%
exit /b 0
