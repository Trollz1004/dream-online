# Power-Loss & Reboot Auto-Heal Boot Script — Node 1: Alienware (.40)
# Starts and self-heals all Alienware ports:
# - :27123 Obsidian Vault (9f7e513d0604b00d -> C:\DREAM\Antigravity, $5 Obsidian Sync + Local REST API)
# - :20128 DREAM Dev Engine & OpenUI / REA / Remake Cloud Studio (server.ts)
# - :8082  Free Claude Code Server (fcc-server.exe)
# - :8390  OPSis Cut & Reach Studio (ops/opsis-cut-and-reach-studio/server.mjs)
# - :8392  Hermes Leadgen Command Studio (apps/hermes-leadgen/server.js)
# - :9127  Live NPC Lab (game/server/live-npc-lab/src/server.js)
# - :9133  DreamOps Bridge (game/server/dreamops-bridge/src/server.js)
# - Hermes Gateway daemon & 13/13 multi-harness skills sync.

$ErrorActionPreference = "SilentlyContinue"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$fccExe = "C:\Users\joshl\AppData\Roaming\uv\tools\free-claude-code\Scripts\fcc-server.exe"
$obsidianExe = "C:\Program Files\Obsidian\Obsidian.exe"
if (-not (Test-Path $obsidianExe)) {
    $obsidianExe = "C:\Users\joshl\AppData\Local\Programs\Obsidian\Obsidian.exe"
}
$hermesGatewayVbs = "C:\Users\joshl\AppData\Local\hermes\gateway-service\Hermes_Gateway.vbs"
$repoRoot = "C:\Users\joshl\antigravity\DREAM-Engine"
$vaultRoot = "C:\DREAM\Antigravity"
$alienwareVaultId = "9f7e513d0604b00d"

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

function Start-DetachedService([string]$CommandLine, [string]$WorkingDir, [uint16]$ShowWindow = 0) {
    $si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = $ShowWindow }
    Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = $CommandLine
        CurrentDirectory = $WorkingDir
        ProcessStartupInformation = $si
    } | Out-Null
}

# 0. Clean any stray .zip archives from Obsidian Vault so 1 GB Obsidian Sync is never bloated
Get-ChildItem $vaultRoot -Filter "*.zip" -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# 1. Ensure Obsidian (Vault 9f7e513d0604b00d -> C:\DREAM\Antigravity, Port :27123) is running for $5 Obsidian Sync
if (-not (Test-TcpPort "127.0.0.1" 27123) -and -not (Get-Process Obsidian -ErrorAction SilentlyContinue)) {
    try {
        Start-Process "obsidian://open?vault=$alienwareVaultId" -ErrorAction Stop
    } catch {
        if (Test-Path $obsidianExe) {
            Start-DetachedService "`"$obsidianExe`"" $vaultRoot 1
        }
    }
}

# 2. Free Claude Code Server (:8082/admin)
if (-not (Test-TcpPort "127.0.0.1" 8082) -and (Test-Path $fccExe)) {
    Start-DetachedService "`"$fccExe`"" $repoRoot 0
}

# 3. OPSis Cut & Reach Studio (:8390)
if (-not (Test-TcpPort "127.0.0.1" 8390) -and (Test-Path "$repoRoot\ops\opsis-cut-and-reach-studio\server.mjs")) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\ops\opsis-cut-and-reach-studio\server.mjs`"" $repoRoot 0
}

# 4. Hermes Leadgen Command Studio (:8392)
if (-not (Test-TcpPort "127.0.0.1" 8392) -and (Test-Path "$repoRoot\apps\hermes-leadgen\server.js")) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\apps\hermes-leadgen\server.js`"" "$repoRoot\apps\hermes-leadgen" 0
}

# 5. DREAM Dev Engine Server (:20128) — OpenUI Lang 1.0 + REA City + Remake 98.8% Cloud Studio
if (-not (Test-TcpPort "127.0.0.1" 20128)) {
    Start-DetachedService "`"$nodeExe`" --import tsx `"$repoRoot\server.ts`"" $repoRoot 0
}

# 6. Live NPC Lab (:9127)
if (-not (Test-TcpPort "127.0.0.1" 9127) -and (Test-Path "$repoRoot\game\server\live-npc-lab\src\server.js")) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\game\server\live-npc-lab\src\server.js`"" "$repoRoot\game\server\live-npc-lab" 0
}

# 7. DreamOps Bridge (:9133)
if (-not (Test-TcpPort "127.0.0.1" 9133) -and (Test-Path "$repoRoot\game\server\dreamops-bridge\src\server.js")) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\game\server\dreamops-bridge\src\server.js`"" "$repoRoot\game\server\dreamops-bridge" 0
}

# 8. Ensure Multi-Harness Skills and Workflow JSONs are synchronized
if (Test-Path "$repoRoot\ops\node\sync-multi-harness-skills.mjs") {
    & $nodeExe "$repoRoot\ops\node\sync-multi-harness-skills.mjs" | Out-Null
}
if ((Test-Path "$repoRoot\api.workflow.json") -and (Test-Path $vaultRoot)) {
    Copy-Item "$repoRoot\api.workflow.json" "$vaultRoot\api.workflow.json" -Force -ErrorAction SilentlyContinue
    Copy-Item "$repoRoot\workflow_api.json" "$vaultRoot\workflow_api.json" -Force -ErrorAction SilentlyContinue
}

# 9. Auto-open DREAM Dev Engine Studio (http://127.0.0.1:20128) once per boot session
$bootTimestamp = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).LastBootUpTime.ToString("yyyyMMddHHmmss")
$browserFlag = "$env:TEMP\dream-engine-opened-$bootTimestamp.flag"
if (-not (Test-Path $browserFlag)) {
    Start-Sleep -Seconds 3
    if (Test-TcpPort "127.0.0.1" 20128) {
        try {
            Start-Process "http://127.0.0.1:20128" -ErrorAction SilentlyContinue
            Set-Content -Path $browserFlag -Value (Get-Date -Format o) -Force -ErrorAction SilentlyContinue
        } catch {}
    }
}
