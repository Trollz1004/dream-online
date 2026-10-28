# Power-Loss & Reboot Auto-Heal Boot Script — Node 3: Sabretooth (.8)
# Uses real TCP socket probes and Win32_Process.Create so services stay alive outside Task Scheduler's job object.

$ErrorActionPreference = "SilentlyContinue"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$engineDir = "C:\Ai-Dream-Team\Antigravity\youtube-shorts-podcast-engine"

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

# 1. Sabretooth OPSis Worker (:8391)
if (-not (Test-TcpPort 8391)) {
    Start-DetachedService "`"$nodeExe`" `"$engineDir\sabretooth_opsis_worker.mjs`"" $engineDir
}
