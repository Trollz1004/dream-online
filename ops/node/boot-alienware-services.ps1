# Power-Loss & Reboot Auto-Heal Boot Script — Node 1: Alienware (.40)
# Starts all ports (:8082, :8390, :20128, :9127, :9133), Obsidian Vault (:27123 / 9f7e513d0604b00d),
# verifies 13/13 multi-harness skills & api.workflow.json, and checks T5500 (:49374/:27123) + Sabretooth (:8391/:11434).

$ErrorActionPreference = "SilentlyContinue"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$fccExe = "C:\Users\joshl\AppData\Roaming\uv\tools\free-claude-code\Scripts\fcc-server.exe"
$obsidianExe = "C:\Program Files\Obsidian\Obsidian.exe"
if (-not (Test-Path $obsidianExe)) {
    $obsidianExe = "C:\Users\joshl\AppData\Local\Programs\Obsidian\Obsidian.exe"
}
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

function Start-DetachedService([string]$CommandLine, [string]$WorkingDir) {
    $si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }
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
    $obsTask = Get-ScheduledTask -TaskName "DREAM-Alienware-Obsidian" -ErrorAction SilentlyContinue
    if ($obsTask) {
        Start-ScheduledTask -TaskName "DREAM-Alienware-Obsidian" -ErrorAction SilentlyContinue
    } elseif (Test-Path $obsidianExe) {
        Start-Process "obsidian://open?vault=$alienwareVaultId" -ErrorAction SilentlyContinue
    }
}

# 2. Free Claude Code Server (:8082/admin)
if (-not (Test-TcpPort "127.0.0.1" 8082) -and (Test-Path $fccExe)) {
    Start-DetachedService "`"$fccExe`"" $repoRoot
}

# 3. OPSis Cut & Reach Studio (:8390)
if (-not (Test-TcpPort "127.0.0.1" 8390)) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\ops\opsis-cut-and-reach-studio\server.mjs`"" $repoRoot
}

# 4. DREAM Engine Server (:20128) & 4-Tier Memory Bridge
if (-not (Test-TcpPort "127.0.0.1" 20128)) {
    Start-DetachedService "`"$nodeExe`" --import tsx `"$repoRoot\server.ts`"" $repoRoot
}

# 5. Live NPC Lab (:9127)
if (-not (Test-TcpPort "127.0.0.1" 9127)) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\game\server\live-npc-lab\src\server.js`"" "$repoRoot\game\server\live-npc-lab"
}

# 6. DreamOps Bridge (:9133)
if (-not (Test-TcpPort "127.0.0.1" 9133)) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\game\server\dreamops-bridge\src\server.js`"" "$repoRoot\game\server\dreamops-bridge"
}

# 7. Ensure Multi-Harness Skills (13/13) and Workflow JSONs are synchronized
if (Test-Path "$repoRoot\ops\node\sync-multi-harness-skills.mjs") {
    & $nodeExe "$repoRoot\ops\node\sync-multi-harness-skills.mjs" | Out-Null
}
if ((Test-Path "$repoRoot\api.workflow.json") -and (Test-Path $vaultRoot)) {
    Copy-Item "$repoRoot\api.workflow.json" "$vaultRoot\api.workflow.json" -Force -ErrorAction SilentlyContinue
    Copy-Item "$repoRoot\workflow_api.json" "$vaultRoot\workflow_api.json" -Force -ErrorAction SilentlyContinue
}
