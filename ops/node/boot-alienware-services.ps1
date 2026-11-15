# Power-Loss & Reboot Auto-Heal Boot Script — Node 1: Alienware
# Run hidden by the scheduled task DREAM-Alienware-BootAll (see register-boot-task.ps1): at sign-in and every 15 minutes.
# Starts and self-heals all Alienware ports:
# - :27123 Obsidian Vault (9f7e513d0604b00d -> C:\DREAM\Antigravity, $5 Obsidian Sync + Local REST API) — first run after boot only
# - :9180 DREAM Dev Engine & OpenUI / REA / Remake Cloud Studio (server.ts)
# - :8082  Free Claude Code Server (fcc-server.exe)
# - :8390  OPSis Cut & Reach Studio (ops/opsis-cut-and-reach-studio/server.mjs)
# - :8392  Hermes Leadgen Command Studio (apps/hermes-leadgen/server.js)
# - :9127  Live NPC Lab (game/server/live-npc-lab/src/server.js)
# - :9133  DreamOps Bridge (game/server/dreamops-bridge/src/server.js)
# - :8765  Panda Router (scheduled task DreamPandaRouter; started through the task only)
# - inbox runner (scheduled task DreamRouterInbox; started through the task only, never a second runner)
# - :8000  Swarm Command page and API from backend (%USERPROFILE%\antigravity\tools\swarm-command), 127.0.0.1 only
# - 13/13 multi-harness skills sync.
# Repeat runs never open a window or a browser tab. Every start writes one line to %LOCALAPPDATA%\dream-boot\boot.log.
# Tests: powershell -NoProfile -Command "Import-Module Pester -RequiredVersion 3.4.0; Invoke-Pester -Path ops/node/boot-alienware-services.Tests.ps1"
[CmdletBinding()]
param([switch]$NoRun)

$ErrorActionPreference = "SilentlyContinue"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$fccPythonExe = "$env:USERPROFILE\AppData\Roaming\uv\python\cpython-3.14.10-windows-x86_64-none\python.exe"
$fccSitePackages = "$env:USERPROFILE\AppData\Roaming\uv\tools\free-claude-code\Lib\site-packages"
$obsidianExe = "C:\Program Files\Obsidian\Obsidian.exe"
if (-not (Test-Path $obsidianExe)) {
    $obsidianExe = "$env:LOCALAPPDATA\Programs\Obsidian\Obsidian.exe"
}
$repoRoot = "$env:USERPROFILE\antigravity\DREAM-Engine"
$vaultRoot = "C:\DREAM\Antigravity"
$alienwareVaultId = "9f7e513d0604b00d"
$bootLogDir = "$env:LOCALAPPDATA\dream-boot"
$bootLog = Join-Path $bootLogDir "boot.log"
$vaultZipsDir = Join-Path $bootLogDir "vault-zips"

# Panda Router and inbox runner are owned by their own scheduled tasks. This script only asks those tasks to start.
$pandaRouterTask = "DreamPandaRouter"
$pandaRouterHealthUrl = "http://127.0.0.1:8765/health"
$inboxRunnerTask = "DreamRouterInbox"

# Swarm Command: FastAPI backend (server.py binds 127.0.0.1 only, port 8000; serves its page and its API;
# no database needed, it falls back to in-memory).
$swarmRoot = "$env:USERPROFILE\antigravity\tools\swarm-command"
$swarmBackendDir = Join-Path $swarmRoot "backend"
$swarmBackendPort = 8000

function Test-TcpPort([string]$HostIp, [int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($HostIp, $Port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne(800, $false)
        if ($ok -and $client.Connected) { return $true }
        return $false
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Test-HttpOk([string]$Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Start-DetachedService([string]$CommandLine, [string]$WorkingDir, [uint16]$ShowWindow = 0) {
    $si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = $ShowWindow }
    Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = $CommandLine
        CurrentDirectory = $WorkingDir
        ProcessStartupInformation = $si
    } | Out-Null
}

# One line per start: time, what, why. Never writes an environment value.
function Write-BootLog([string]$What, [string]$Why) {
    try {
        if (-not (Test-Path -LiteralPath $bootLogDir)) { New-Item -ItemType Directory -Path $bootLogDir -Force | Out-Null }
        Add-Content -LiteralPath $bootLog -Value ("{0} | started {1} | {2}" -f (Get-Date -Format o), $What, $Why) -ErrorAction Stop
    } catch {}
}

function Get-DreamTaskState([string]$TaskName) {
    $t = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($null -eq $t) { return 'Missing' }
    return [string]$t.State
}

function Start-DreamTask([string]$TaskName) {
    Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
}

function Get-InboxRunnerProcessCount {
    return @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like '*inbox-runner*' }).Count
}

# Panda Router: if /health does not answer, start the scheduled task. Never a second copy by hand: the task is the only
# launcher, and a task that is already running (MultipleInstances IgnoreNew) is left alone.
function Invoke-PandaRouterCheck {
    if (Test-HttpOk $pandaRouterHealthUrl) { return $false }
    $state = Get-DreamTaskState $pandaRouterTask
    if ($state -eq 'Missing' -or $state -eq 'Running' -or $state -eq 'Disabled') { return $false }
    Start-DreamTask $pandaRouterTask
    Write-BootLog "Panda Router (task $pandaRouterTask, 127.0.0.1:8765)" "$pandaRouterHealthUrl did not answer 200; task state was $state"
    return $true
}

# Inbox runner: if no node process has inbox-runner in its command line, start the scheduled task. A running task means
# its loop is between runner restarts; starting it again could make a second runner, so it is left alone.
function Invoke-InboxRunnerCheck {
    if ((Get-InboxRunnerProcessCount) -gt 0) { return $false }
    $state = Get-DreamTaskState $inboxRunnerTask
    if ($state -eq 'Missing' -or $state -eq 'Running' -or $state -eq 'Disabled') { return $false }
    Start-DreamTask $inboxRunnerTask
    Write-BootLog "inbox runner (task $inboxRunnerTask)" "no node process with inbox-runner in its command line; task state was $state"
    return $true
}

# The Swarm Command backend needs fastapi and uvicorn. No Python on this node has them today, so the check uses only a
# virtual environment inside the Swarm Command folder and does nothing until one exists.
function Get-SwarmPython {
    foreach ($candidate in @((Join-Path $swarmBackendDir ".venv\Scripts\python.exe"), (Join-Path $swarmRoot ".venv\Scripts\python.exe"))) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    return $null
}

function Invoke-SwarmCommandCheck {
    $started = @()
    $py = Get-SwarmPython
    if (-not $py) { return $started }
    if (-not (Test-TcpPort "127.0.0.1" $swarmBackendPort) -and (Test-Path -LiteralPath (Join-Path $swarmBackendDir "server.py"))) {
        # run_server() refuses any bind address but 127.0.0.1; the port is passed in so a stray PORT value cannot move it.
        Start-DetachedService "`"$py`" -c `"import server; server.run_server(port=$swarmBackendPort)`"" $swarmBackendDir 0
        Write-BootLog "Swarm Command backend (127.0.0.1:$swarmBackendPort)" "port $swarmBackendPort not listening"
        $started += 'backend'
    }
    return $started
}

# Step 0: Move any stray .zip archives out of the Obsidian Vault into %LOCALAPPDATA%\dream-boot\vault-zips\
# so the 1 GB Obsidian Sync cap is never bloated and nothing is deleted.
function Move-VaultZips([string]$VaultPath = $vaultRoot, [string]$DestDir = $vaultZipsDir) {
    $moved = @()
    if (-not $VaultPath -or -not (Test-Path -LiteralPath $VaultPath)) { return $moved }
    $zips = @(Get-ChildItem -LiteralPath $VaultPath -Filter "*.zip" -File -Force -ErrorAction SilentlyContinue)
    if ($zips.Count -eq 0) { return $moved }
    if (-not (Test-Path -LiteralPath $DestDir)) {
        New-Item -ItemType Directory -Path $DestDir -Force -ErrorAction SilentlyContinue | Out-Null
    }
    foreach ($z in $zips) {
        $target = Join-Path $DestDir $z.Name
        Move-Item -LiteralPath $z.FullName -Destination $target -Force -ErrorAction SilentlyContinue
        $moved += $target
    }
    return $moved
}

# First run after a boot: the only run allowed to open anything visible (Obsidian, the two browser tabs).
function Get-BootFlagPath {
    $boot = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).LastBootUpTime
    $bootTimestamp = if ($boot) { $boot.ToString("yyyyMMddHHmmss") } else { "unknown" }
    return (Join-Path $bootLogDir "first-run-done-$bootTimestamp.flag")
}

function Invoke-BootAll {
    if (-not (Test-Path -LiteralPath $bootLogDir)) { New-Item -ItemType Directory -Path $bootLogDir -Force | Out-Null }
    $firstRunFlag = Get-BootFlagPath
    $isFirstRun = -not (Test-Path -LiteralPath $firstRunFlag)
    # The older script marked the page open in %TEMP%; honour that mark so the switch-over never opens a second time.
    $legacyFlag = Join-Path $env:TEMP ("dream-engine-opened-" + ([IO.Path]::GetFileNameWithoutExtension($firstRunFlag) -replace '^first-run-done-', '') + ".flag")
    if ($isFirstRun -and (Test-Path -LiteralPath $legacyFlag)) { $isFirstRun = $false }
    if ($isFirstRun -or -not (Test-Path -LiteralPath $firstRunFlag)) {
        # Mark the flag before anything visible happens, so a crash below can never make a repeat run open a window.
        Set-Content -Path $firstRunFlag -Value (Get-Date -Format o) -Force -ErrorAction SilentlyContinue
    }

    # 0. Move any stray .zip archives from Obsidian Vault into %LOCALAPPDATA%\dream-boot\vault-zips\ so 1 GB Obsidian Sync is never bloated and nothing is deleted
    Move-VaultZips | Out-Null

    # 1. Obsidian (Vault 9f7e513d0604b00d -> C:\DREAM\Antigravity, Port :27123) for $5 Obsidian Sync.
    #    Obsidian is a window, so it is opened on the first run after a boot only, never on a repeat run.
    if ($isFirstRun -and -not (Test-TcpPort "127.0.0.1" 27123) -and -not (Get-Process Obsidian -ErrorAction SilentlyContinue)) {
        try {
            Start-Process "obsidian://open?vault=$alienwareVaultId" -ErrorAction Stop
            Write-BootLog "Obsidian (vault $alienwareVaultId)" "first run after boot; port 27123 closed and no Obsidian process"
        } catch {
            if (Test-Path $obsidianExe) {
                Start-DetachedService "`"$obsidianExe`"" $vaultRoot 1
                Write-BootLog "Obsidian (exe)" "first run after boot; obsidian:// link failed, port 27123 closed"
            }
        }
    }

    # 2. Free Claude Code Server (:8082/admin) — invokes signed cpython-3.14.10 binary + site-packages
    if (-not (Test-TcpPort "127.0.0.1" 8082) -and (Test-Path $fccPythonExe)) {
        $fccCmd = "`"$fccPythonExe`" -c `"import sys; sys.path.insert(0, r'$fccSitePackages'); from free_claude_code.cli.entrypoints import serve; serve(['--auto-started'])`""
        Start-DetachedService $fccCmd $repoRoot 0
        Write-BootLog "Free Claude Code (127.0.0.1:8082)" "port 8082 not listening"
    }

    # 3. OPSis Cut & Reach Studio (:8390)
    if (-not (Test-TcpPort "127.0.0.1" 8390) -and (Test-Path "$repoRoot\ops\opsis-cut-and-reach-studio\server.mjs")) {
        Start-DetachedService "`"$nodeExe`" `"$repoRoot\ops\opsis-cut-and-reach-studio\server.mjs`"" $repoRoot 0
        Write-BootLog "OPSis Cut and Reach Studio (127.0.0.1:8390)" "port 8390 not listening"
    }

    # 4. Hermes Leadgen Command Studio (:8392)
    if (-not (Test-TcpPort "127.0.0.1" 8392) -and (Test-Path "$repoRoot\apps\hermes-leadgen\server.js")) {
        Start-DetachedService "`"$nodeExe`" `"$repoRoot\apps\hermes-leadgen\server.js`"" "$repoRoot\apps\hermes-leadgen" 0
        Write-BootLog "Hermes Leadgen Command Studio (127.0.0.1:8392)" "port 8392 not listening"
    }

    # 5. DREAM Dev Engine Server (:9180) — OpenUI Lang 1.0 + REA City + Remake 98.8% Cloud Studio
    $restart9180Flag = "$repoRoot\ops\node\.restart-9180.flag"
    if (Test-Path $restart9180Flag) {
        Remove-Item $restart9180Flag -Force -ErrorAction SilentlyContinue
        Get-NetTCPConnection -LocalPort 9180 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
            if ($_ -gt 4) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
        }
        Start-Sleep -Milliseconds 600
    }
    if (-not (Test-TcpPort "127.0.0.1" 9180)) {
        Start-DetachedService "`"$nodeExe`" --import tsx `"$repoRoot\server.ts`"" $repoRoot 0
        Write-BootLog "DREAM Dev Engine (127.0.0.1:9180)" "port 9180 not listening"
    }

    # 6. Live NPC Lab (:9127)
    if (-not (Test-TcpPort "127.0.0.1" 9127) -and (Test-Path "$repoRoot\game\server\live-npc-lab\src\server.js")) {
        Start-DetachedService "`"$nodeExe`" `"$repoRoot\game\server\live-npc-lab\src\server.js`"" "$repoRoot\game\server\live-npc-lab" 0
        Write-BootLog "Live NPC Lab (127.0.0.1:9127)" "port 9127 not listening"
    }

    # 7. DreamOps Bridge (:9133)
    if (-not (Test-TcpPort "127.0.0.1" 9133) -and (Test-Path "$repoRoot\game\server\dreamops-bridge\src\server.js")) {
        Start-DetachedService "`"$nodeExe`" `"$repoRoot\game\server\dreamops-bridge\src\server.js`"" "$repoRoot\game\server\dreamops-bridge" 0
        Write-BootLog "DreamOps Bridge (127.0.0.1:9133)" "port 9133 not listening"
    }

    # 8. Panda Router (:8765), inbox runner and Swarm Command (:8000)
    Invoke-PandaRouterCheck | Out-Null
    Invoke-InboxRunnerCheck | Out-Null
    Invoke-SwarmCommandCheck | Out-Null

    # 9. Ensure Multi-Harness Skills and Workflow JSONs are synchronized
    if (Test-Path "$repoRoot\ops\node\sync-multi-harness-skills.mjs") {
        & $nodeExe "$repoRoot\ops\node\sync-multi-harness-skills.mjs" | Out-Null
    }
    if ((Test-Path "$repoRoot\api.workflow.json") -and (Test-Path $vaultRoot)) {
        Copy-Item "$repoRoot\api.workflow.json" "$vaultRoot\api.workflow.json" -Force -ErrorAction SilentlyContinue
        Copy-Item "$repoRoot\workflow_api.json" "$vaultRoot\workflow_api.json" -Force -ErrorAction SilentlyContinue
    }

    # 10. Open DREAM Dev Engine Studio (http://127.0.0.1:9180) and Free Claude Code Admin (http://127.0.0.1:8082/admin)
    #     on the first run after a boot only. Waits up to 30 seconds for 9180; if it is still down, no tab opens this boot.
    if ($isFirstRun) {
        $deadline = (Get-Date).AddSeconds(30)
        while (-not (Test-TcpPort "127.0.0.1" 9180) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 2 }
        if (Test-TcpPort "127.0.0.1" 9180) {
            Start-Process "http://127.0.0.1:9180" -ErrorAction SilentlyContinue
            Write-BootLog "browser tab http://127.0.0.1:9180" "first run after boot"
            if (Test-TcpPort "127.0.0.1" 8082) {
                Start-Process "http://127.0.0.1:8082/admin" -ErrorAction SilentlyContinue
                Write-BootLog "browser tab http://127.0.0.1:8082/admin" "first run after boot"
            }
        }
    }
}

if (-not $NoRun) { Invoke-BootAll }
