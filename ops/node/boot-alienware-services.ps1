# Power-Loss & Reboot Auto-Heal Boot Script — Node 1: Alienware (.40)
# Uses real TCP socket probes and Win32_Process.Create so services stay alive outside Task Scheduler's job object.

$ErrorActionPreference = "SilentlyContinue"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$fccExe = "C:\Users\joshl\AppData\Roaming\uv\tools\free-claude-code\Scripts\fcc-server.exe"
$repoRoot = "C:\Users\joshl\antigravity\DREAM-Engine"

function Test-TcpPort([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
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

# 1. Free Claude Code Server (:8082/admin)
if (-not (Test-TcpPort 8082) -and (Test-Path $fccExe)) {
    Start-DetachedService "`"$fccExe`"" $repoRoot
}

# 2. OPSis Cut & Reach Studio (:8390)
if (-not (Test-TcpPort 8390)) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\ops\opsis-cut-and-reach-studio\server.mjs`"" $repoRoot
}

# 3. DREAM Engine Server (:20128)
if (-not (Test-TcpPort 20128)) {
    Start-DetachedService "`"$nodeExe`" --import tsx `"$repoRoot\server.ts`"" $repoRoot
}

# 4. Live NPC Lab (:9127)
if (-not (Test-TcpPort 9127)) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\game\server\live-npc-lab\src\server.js`"" "$repoRoot\game\server\live-npc-lab"
}

# 5. DreamOps Bridge (:9133)
if (-not (Test-TcpPort 9133)) {
    Start-DetachedService "`"$nodeExe`" `"$repoRoot\game\server\dreamops-bridge\src\server.js`"" "$repoRoot\game\server\dreamops-bridge"
}
