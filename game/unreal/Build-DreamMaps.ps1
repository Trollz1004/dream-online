
# Build-DreamMaps.ps1
#
# Builds and verifies the Day Dream / Night Dream blockout maps using the
# editor Python scripts under game\unreal\scripts. Two engine passes:
#   1. build_dream_maps.py  - creates/saves the two maps and their materials.
#   2. verify_dream_maps.py - loads them back and checks the 002B card rules,
#      writing C:\DREAM\recon\002B-verify.json.
#
# Both scripts require the PythonScriptPlugin and EditorScriptingUtilities
# plugins to be enabled in DreamOnline.uproject (also written by
# New-DreamTestZone.ps1's uproject writer, so a rebuild keeps them).
#
# The commandlet form (UnrealEditor-Cmd.exe -run=pythonscript) is tried
# first: it is confirmed working for this project (creates and saves new
# levels and material assets, then loads them back for inspection, all
# without a viewport or GPU/RHI). If a run's own log shows the specific
# signature of a commandlet-only failure to create or save a level (the
# "new_level failed" RuntimeError this project's build script raises when
# LevelEditorSubsystem.new_level() returns false), the same step is retried
# once against the full UnrealEditor.exe with -ExecutePythonScript, which
# makes the script quit the editor itself when it is done.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File Build-DreamMaps.ps1

[CmdletBinding()]
param(
    [string]$EngineRoot = 'C:\DREAM\UE_5.8',
    [string]$ProjectRoot = 'C:\DREAM\dream-online\game\unreal\DreamOnline',
    [string]$ReconDir = 'C:\DREAM\recon',
    [int]$TimeoutSeconds = 480
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildScript = Join-Path $scriptRoot 'scripts\build_dream_maps.py'
$verifyScript = Join-Path $scriptRoot 'scripts\verify_dream_maps.py'
$uproject = Join-Path $ProjectRoot 'DreamOnline.uproject'
$editorCmdExe = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$editorExe = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'

if (-not (Test-Path -LiteralPath $uproject)) {
    throw "Project not found: $uproject. Rebuild it first with New-DreamTestZone.ps1."
}
if (-not (Test-Path -LiteralPath $editorCmdExe)) {
    throw "UnrealEditor-Cmd.exe not found at $editorCmdExe."
}
if (-not (Test-Path -LiteralPath $buildScript) -or -not (Test-Path -LiteralPath $verifyScript)) {
    throw "build_dream_maps.py / verify_dream_maps.py not found under $scriptRoot\scripts."
}
if (-not (Test-Path -LiteralPath $ReconDir)) {
    New-Item -ItemType Directory -Path $ReconDir -Force | Out-Null
}

function Invoke-CommandletPython {
    param(
        [Parameter(Mandatory)] [string]$PyScript,
        [Parameter(Mandatory)] [string]$LogPrefix
    )

    $engineLog = Join-Path $ReconDir "$LogPrefix.log"
    $stdout = Join-Path $ReconDir "$LogPrefix-stdout.log"
    $stderr = Join-Path $ReconDir "$LogPrefix-stderr.log"

    $processArgs = @(
        "`"$uproject`"",
        '-run=pythonscript',
        "-script=`"$PyScript`"",
        '-unattended',
        '-nopause',
        '-nosplash',
        '-nullrhi',
        "-abslog=`"$engineLog`""
    )

    $p = Start-Process -FilePath $editorCmdExe -ArgumentList $processArgs `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr `
        -PassThru -WindowStyle Hidden -Wait

    return [PSCustomObject]@{
        ExitCode  = $p.ExitCode
        EngineLog = $engineLog
        StdOut    = $stdout
        StdErr    = $stderr
        Form      = 'commandlet'
    }
}

function Invoke-FullEditorPython {
    param(
        [Parameter(Mandatory)] [string]$PyScript,
        [Parameter(Mandatory)] [string]$LogPrefix
    )

    $engineLog = Join-Path $ReconDir "$LogPrefix-fallback.log"
    $stdout = Join-Path $ReconDir "$LogPrefix-fallback-stdout.log"
    $stderr = Join-Path $ReconDir "$LogPrefix-fallback-stderr.log"

    $processArgs = @(
        "`"$uproject`"",
        "-ExecutePythonScript=`"$PyScript`"",
        '-unattended',
        '-nosplash',
        "-abslog=`"$engineLog`""
    )

    $p = Start-Process -FilePath $editorExe -ArgumentList $processArgs `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr `
        -PassThru -WindowStyle Hidden

    if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
        Write-Warning "Full-editor fallback run did not exit within $TimeoutSeconds seconds; killing it."
        $p.Kill()
    }

    return [PSCustomObject]@{
        ExitCode  = $p.ExitCode
        EngineLog = $engineLog
        StdOut    = $stdout
        StdErr    = $stderr
        Form      = 'full-editor-fallback'
    }
}

function Test-CommandletLevelFailure {
    param([string]$EngineLogPath)
    if (-not (Test-Path -LiteralPath $EngineLogPath)) {
        return $false
    }
    $text = Get-Content -LiteralPath $EngineLogPath -Raw
    return ($text -match 'new_level failed') -or ($text -match 'RuntimeError: new_level')
}

function Write-PythonTracebacks {
    param([string]$EngineLogPath, [string]$Label)
    if (-not (Test-Path -LiteralPath $EngineLogPath)) {
        Write-Output "$Label log not found at $EngineLogPath"
        return
    }
    $errorLines = Select-String -LiteralPath $EngineLogPath -Pattern 'LogPython: Error' -SimpleMatch
    if ($errorLines) {
        Write-Output "--- $Label Python errors ($($errorLines.Count) line(s)) ---"
        $errorLines | Select-Object -First 40 | ForEach-Object { Write-Output $_.Line }
    }
    else {
        Write-Output "$Label : no LogPython: Error lines found."
    }
}

# --- 1. Build ---------------------------------------------------------------

Write-Output "Building Day Dream / Night Dream maps (commandlet form)..."
$buildResult = Invoke-CommandletPython -PyScript $buildScript -LogPrefix '002B-build'

if ($buildResult.ExitCode -ne 0 -and (Test-CommandletLevelFailure -EngineLogPath $buildResult.EngineLog)) {
    Write-Warning "Commandlet form could not create/save a level; retrying build with the full-editor fallback form."
    $buildResult = Invoke-FullEditorPython -PyScript $buildScript -LogPrefix '002B-build'
}

Write-Output "Build finished (form: $($buildResult.Form), exit code: $($buildResult.ExitCode))."
Write-PythonTracebacks -EngineLogPath $buildResult.EngineLog -Label 'Build'

if ($buildResult.ExitCode -ne 0) {
    Write-Error "Build step failed (form: $($buildResult.Form)). See $($buildResult.EngineLog)."
    exit 1
}

# --- 2. Verify ----------------------------------------------------------------

Write-Output "Verifying Day Dream / Night Dream maps (commandlet form)..."
$verifyResult = Invoke-CommandletPython -PyScript $verifyScript -LogPrefix '002B-verify'

if ($verifyResult.Form -eq 'commandlet' -and (Test-CommandletLevelFailure -EngineLogPath $verifyResult.EngineLog)) {
    Write-Warning "Commandlet form could not load a level for verification; retrying verify with the full-editor fallback form."
    $verifyResult = Invoke-FullEditorPython -PyScript $verifyScript -LogPrefix '002B-verify'
}

Write-Output "Verify finished (form: $($verifyResult.Form), exit code: $($verifyResult.ExitCode))."
Write-PythonTracebacks -EngineLogPath $verifyResult.EngineLog -Label 'Verify'

# --- 3. Read the JSON result (authoritative pass/fail) -----------------------

$verifyJsonPath = Join-Path $ReconDir '002B-verify.json'
$verifyExitCode = $verifyResult.ExitCode

if (Test-Path -LiteralPath $verifyJsonPath) {
    try {
        $verifyJson = Get-Content -LiteralPath $verifyJsonPath -Raw | ConvertFrom-Json
        Write-Output "Verify result: $($verifyJson.passed)/$($verifyJson.total) checks passed."
        if ($verifyJson.failed -gt 0) {
            Write-Output "Failing checks:"
            foreach ($check in $verifyJson.checks) {
                if (-not $check.pass) {
                    Write-Output "  [$($check.map)] $($check.name) -- $($check.detail)"
                }
            }
        }
        $verifyExitCode = if ($verifyJson.failed -gt 0) { 1 } else { 0 }
    }
    catch {
        Write-Warning "Could not parse $verifyJsonPath ($($_.Exception.Message)); falling back to the engine process exit code."
    }
}
else {
    Write-Warning "$verifyJsonPath was not written; falling back to the engine process exit code."
}

exit $verifyExitCode
