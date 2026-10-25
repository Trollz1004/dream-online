<#
.SYNOPSIS
  Registers (or removes) the boot-time scheduled task "DREAM-Live-NPC-Lab" so
  game/server/live-npc-lab starts on boot without a login (AtStartup + S4U/SYSTEM)
  and restarts automatically if it dies.
#>
[CmdletBinding()]
param(
  [string]$ScriptPath = '',
  [string]$TaskName = 'DREAM-Live-NPC-Lab',
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

if (-not $ScriptPath) {
  $ScriptPath = Join-Path $PSScriptRoot 'start-live-npc-lab.ps1'
}

if ($Uninstall) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output "Scheduled task '$TaskName' removed."
  return
}

if (-not (Test-Path -LiteralPath $ScriptPath)) {
  throw "Supervisor script not found at $ScriptPath"
}

$psArgs = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $psArgs -WorkingDirectory (Split-Path -Parent $ScriptPath)
$bootTrigger = New-ScheduledTaskTrigger -AtStartup
$bootTrigger.Delay = 'PT15S'
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 5)

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

$registered = $false
$user = "$env:USERDOMAIN\$env:USERNAME"

foreach ($candidate in @(
  @{ UserId = $user; LogonType = 'S4U'; RunLevel = 'Highest' },
  @{ UserId = 'NT AUTHORITY\SYSTEM'; LogonType = 'ServiceAccount'; RunLevel = 'Highest' },
  @{ UserId = $user; LogonType = 'S4U'; RunLevel = 'Limited' }
)) {
  try {
    $principal = New-ScheduledTaskPrincipal -UserId $candidate.UserId -LogonType $candidate.LogonType -RunLevel $candidate.RunLevel
    Register-ScheduledTask -TaskName $TaskName `
      -Action $action `
      -Trigger @($bootTrigger, $repeatTrigger) `
      -Settings $settings `
      -Principal $principal `
      -Description 'Starts game/server/live-npc-lab (:9127) at boot without login and restarts it if it dies.' `
      -Force -ErrorAction Stop | Out-Null
    Write-Output "Registered '$TaskName' with UserId=$($candidate.UserId), LogonType=$($candidate.LogonType), RunLevel=$($candidate.RunLevel), Triggers=AtStartup+5m"
    $registered = $true
    break
  } catch {
    Write-Warning "Principal $($candidate.UserId) ($($candidate.LogonType)/$($candidate.RunLevel)) refused: $($_.Exception.Message)"
  }
}

if (-not $registered) {
  throw "Could not register '$TaskName' with a boot-safe non-interactive logon type."
}

Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 4
$health = Invoke-WebRequest -Uri 'http://127.0.0.1:9127/health' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
Write-Output "Health response (HTTP $($health.StatusCode)): $($health.Content)"
