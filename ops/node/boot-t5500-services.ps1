# Power-Loss & Reboot Auto-Heal Boot Script — Node 2: T5500 (.15)
# Ensures Obsidian Vault (518a720fa231c3cc -> C:\ANTIGRAVITY\Antigravity, Port :27123),
# Shared ai-memory (:49374), Domains Server (:9160), Date App (:3200/:8000), and OPSis (:8377) stay online.

$ErrorActionPreference = "SilentlyContinue"
$vaultRoot = "C:\ANTIGRAVITY\Antigravity"
$t5500VaultId = "518a720fa231c3cc"
$obsidianExe = "C:\Program Files\Obsidian\Obsidian.exe"
if (-not (Test-Path $obsidianExe)) {
    $obsidianExe = "C:\Users\joshi\AppData\Local\Programs\Obsidian\Obsidian.exe"
}

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

# 0. Clean any stray .zip archives from Obsidian Vault so 1 GB Obsidian Sync is never bloated
Get-ChildItem $vaultRoot -Filter "*.zip" -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# 1. Ensure Obsidian (Vault 518a720fa231c3cc -> C:\ANTIGRAVITY\Antigravity, Port :27123) is running for $5 Obsidian Sync
if (-not (Test-TcpPort "127.0.0.1" 27123) -and -not (Get-Process Obsidian -ErrorAction SilentlyContinue)) {
    $obsTask = Get-ScheduledTask -TaskName "DREAM-T5500-Obsidian" -ErrorAction SilentlyContinue
    if ($obsTask) {
        Start-ScheduledTask -TaskName "DREAM-T5500-Obsidian" -ErrorAction SilentlyContinue
    } else {
        Start-Process "obsidian://open?vault=$t5500VaultId" -ErrorAction SilentlyContinue
    }
}
