<#
.SYNOPSIS
  Boot-time supervisor for game/server/live-npc-lab (:9127).
  Probes http://127.0.0.1:9127/health for the real identity string "dream-live-npc-lab"
  every 15 seconds and starts or restarts node src/server.js if it is down or wedged.
#>
[CmdletBinding()]
param(
  [int]$Port = 9127,
  [int]$CheckIntervalSeconds = 15,
  [switch]$Once
)

$ErrorActionPreference = 'Continue'
[System.Net.WebRequest]::DefaultWebProxy = $null

$LabDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
$LogDir = Join-Path $LabDir 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$SupervisorLog = Join-Path $LogDir 'live-npc-lab-supervisor.log'
$ServerOutLog  = Join-Path $LogDir 'live-npc-lab.out.log'
$ServerErrLog  = Join-Path $LogDir 'live-npc-lab.err.log'

$created = $true
try {
  $mutex = New-Object System.Threading.Mutex($true, 'Global\DREAM-Live-NPC-Lab-Supervisor', [ref]$created)
  if (-not $created -and -not $Once) { exit 0 }
} catch {}

function Write-LabLog([string]$Message) {
  $line = '[{0}] {1}' -f (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'), $Message
  try {
    if ((Test-Path $SupervisorLog) -and ((Get-Item $SupervisorLog).Length -gt 2MB)) {
      Move-Item -Path $SupervisorLog -Destination ($SupervisorLog + '.1') -Force
    }
    Add-Content -LiteralPath $SupervisorLog -Value $line -Encoding UTF8
  } catch {}
}

function Test-LabIdentity {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ([int]$r.StatusCode -ne 200) { return $false }
    return ([string]$r.Content -match 'dream-live-npc-lab')
  } catch {
    return $false
  }
}

function Stop-LabPortOwner {
  try {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
      $ownPid = $_.OwningProcess
      if ($ownPid -and $ownPid -gt 4) {
        Stop-Process -Id $ownPid -Force -ErrorAction SilentlyContinue
        Write-LabLog "Stopped stale listener PID $ownPid on :$Port"
      }
    }
    $waited = 0
    while ($waited -lt 8 -and (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
      Start-Sleep -Seconds 1
      $waited++
    }
  } catch {}
}

function Resolve-NodeExe {
  $candidates = @(
    'C:\Program Files\nodejs\node.exe',
    (Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue)
  )
  foreach ($c in $candidates) {
    if ($c -and (Test-Path -LiteralPath $c)) { return $c }
  }
  return 'node.exe'
}

function Start-LabProcess {
  Stop-LabPortOwner
  $nodeExe = Resolve-NodeExe
  $env:DREAM_LIVE_NPC_HOST = '127.0.0.1'
  $env:DREAM_LIVE_NPC_PORT = [string]$Port
  $proc = Start-Process -FilePath $nodeExe `
    -ArgumentList @('src/server.js') `
    -WorkingDirectory $LabDir `
    -RedirectStandardOutput $ServerOutLog `
    -RedirectStandardError $ServerErrLog `
    -WindowStyle Hidden `
    -PassThru
  Write-LabLog "Started live-npc-lab PID $($proc.Id) on 127.0.0.1:$Port using $nodeExe"

  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline) {
    if (Test-LabIdentity) {
      Write-LabLog "Verified live-npc-lab identity response on http://127.0.0.1:$Port/health"
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  Write-LabLog "WARNING: live-npc-lab did not pass identity probe within 15s"
  return $false
}

Write-LabLog "Supervisor starting (Once=$([bool]$Once), PID=$PID, LabDir=$LabDir)"
do {
  if (-not (Test-LabIdentity)) {
    Write-LabLog "Identity probe failed on http://127.0.0.1:$Port/health; healing..."
    Start-LabProcess | Out-Null
  }
  if ($Once) { break }
  Start-Sleep -Seconds $CheckIntervalSeconds
} while ($true)
