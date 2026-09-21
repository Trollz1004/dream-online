@echo off
setlocal

rem Serves the browser build of the DREAM combat slice and opens it.
rem Build it first with Export-DreamSlice-Web.cmd if the folder is empty.
rem Close this window to stop serving.

set "WEB=C:\DREAM\dream-online\build\web"
set "PORT=8099"

if not exist "%WEB%\index.html" (
    echo No browser build found at %WEB%.
    echo Run Export-DreamSlice-Web.cmd first.
    pause
    exit /b 1
)

echo Serving the DREAM combat slice at http://localhost:%PORT%
echo Leave this window open while you play. Close it to stop.
start "" "http://localhost:%PORT%"
python3.13 -m http.server %PORT% --bind 127.0.0.1 --directory "%WEB%"
exit /b 0
