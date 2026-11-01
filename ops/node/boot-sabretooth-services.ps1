# Power-Loss & Reboot Auto-Heal Boot Script — Node 3: Sabretooth (.8)
# Runs via S4U (whether user is logged on or at the Windows Lock Screen LogonUI).
# Starts Obsidian Vault (:27123 / c5231ee3994c364e), Ollama (:11434), Sabretooth OPSis Worker (:8391),
# and Hermes Dashboard & Gateway (:9119) with zero manual login required.

$ErrorActionPreference = "SilentlyContinue"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$ollamaExe = "C:\Users\joshl\AppData\Local\Programs\Ollama\ollama.exe"
$obsidianExe = "C:\Program Files\Obsidian\Obsidian.exe"
$hermesExe = "C:\Users\joshl\AppData\Local\hermes\bin\hermes.exe"
$hermesGatewayVbs = "C:\Users\joshl\AppData\Local\hermes\gateway-service\Hermes_Gateway.vbs"
$vaultRoot = "C:\Ai-Dream-Team\Antigravity"
$sabretoothVaultId = "c5231ee3994c364e"
$engineDir = "C:\Ai-Dream-Team\Antigravity\youtube-shorts-podcast-engine"

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

# 1. Ensure Obsidian (Vault c5231ee3994c364e -> C:\Ai-Dream-Team\Antigravity, Port :27123) is running for $5 Obsidian Sync
# Uses Win32_Process.Create so Obsidian starts even at the Windows Lock Screen (LogonUI / Session 0) without waiting for login.
if (-not (Test-TcpPort "127.0.0.1" 27123) -and -not (Get-Process Obsidian -ErrorAction SilentlyContinue)) {
    if (Test-Path $obsidianExe) {
        Start-DetachedService "`"$obsidianExe`"" $vaultRoot
    }
}

# 2. Ollama 16 GB AMD GPU Server (:11434)
if (-not (Test-TcpPort "127.0.0.1" 11434) -and (Test-Path $ollamaExe)) {
    Start-DetachedService "`"$ollamaExe`" serve" "C:\Users\joshl"
}

# 3. Sabretooth OPSis Worker (:8391)
if (-not (Test-TcpPort "127.0.0.1" 8391) -and (Test-Path "$engineDir\sabretooth_opsis_worker.mjs")) {
    Start-DetachedService "`"$nodeExe`" `"$engineDir\sabretooth_opsis_worker.mjs`"" $engineDir
}

# 4. Hermes Agent Dashboard (:9119) & Gateway
if (-not (Test-TcpPort "127.0.0.1" 9119)) {
    if (Test-Path $hermesGatewayVbs) {
        Start-DetachedService "wscript.exe //B //Nologo `"$hermesGatewayVbs`"" "C:\Users\joshl\AppData\Local\hermes\gateway-service"
    }
    if (Test-Path $hermesExe) {
        Start-DetachedService "`"$hermesExe`" dashboard --skip-build --no-open" "C:\Users\joshl\AppData\Local\hermes"
    }
}
