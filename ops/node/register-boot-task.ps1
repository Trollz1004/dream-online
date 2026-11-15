<#
.SYNOPSIS
  Registers the hidden scheduled task "DREAM-Alienware-BootAll" on the Alienware node.
  It runs ops\node\boot-alienware-services.vbs (which runs boot-alienware-services.ps1 with no window) from the
  DREAM-Engine-runner clone, which stays on main, at sign-in and every 15 minutes, and restarts on failure.
  Defaults to dry run: prints what it would change and registers nothing unless -Apply is passed.

  Run in Windows PowerShell (the judge runs it once with -Apply after merge):
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\node\register-boot-task.ps1"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\node\register-boot-task.ps1" -Apply
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$RunnerRoot,
  [switch]$DefinitionOnly
)

$ErrorActionPreference = 'Stop'
$TaskName = 'DREAM-Alienware-BootAll'

$userHome = if ($env:USERPROFILE) { $env:USERPROFILE } else { '.' }
if ([string]::IsNullOrWhiteSpace($RunnerRoot)) { $RunnerRoot = Join-Path $userHome 'antigravity\DREAM-Engine-runner' }
$vbsPath = Join-Path $RunnerRoot 'ops\node\boot-alienware-services.vbs'

function ConvertTo-PortablePath([string]$RawPath) {
  if ([string]::IsNullOrWhiteSpace($RawPath) -or -not $env:USERPROFILE) { return $RawPath }
  return ($RawPath -ireplace [regex]::Escape($env:USERPROFILE.TrimEnd('\')), '%USERPROFILE%')
}

$taskArgs = "//B //Nologo `"$vbsPath`""
$user = if ($env:USERDOMAIN -and $env:USERNAME) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument $taskArgs -WorkingDirectory $RunnerRoot
$atSignIn = New-ScheduledTaskTrigger -AtLogOn -User $user
$every15 = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 15)
$triggers = @($atSignIn, $every15)
$settings = New-ScheduledTaskSettingsSet -Hidden -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

if ($DefinitionOnly) {
  return [pscustomobject]@{ TaskName = $TaskName; Action = $action; Trigger = $triggers; Settings = $settings; Principal = $principal }
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$current = if ($existing) {
  $a = $existing.Actions | Select-Object -First 1
  "$($a.Execute) $(ConvertTo-PortablePath $a.Arguments)"
} else { '(no task registered)' }

Write-Output "Task name: $TaskName"
Write-Output "Now:   $current"
Write-Output "After: wscript.exe $(ConvertTo-PortablePath $taskArgs)"
Write-Output "Working folder: $(ConvertTo-PortablePath $RunnerRoot)"
Write-Output "Triggers: at sign-in of the current user; every 15 minutes, indefinitely"
Write-Output "Settings: hidden, one instance at a time (IgnoreNew), restart on failure 3 times 1 minute apart, 10 minute limit"
Write-Output "Runs as: the current user, Interactive, Limited (no elevation, no stored password)"

if (-not $Apply) {
  Write-Output "[DRY RUN] nothing registered; pass -Apply to write"
  return
}

if (-not (Test-Path -LiteralPath $vbsPath)) { throw "Boot launcher not found at $(ConvertTo-PortablePath $vbsPath)" }

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Settings $settings -Principal $principal `
  -Description 'Alienware auto-heal: runs ops\node\boot-alienware-services.ps1 hidden from the DREAM-Engine-runner clone at sign-in and every 15 minutes.' `
  -Force | Out-Null
Write-Output "[APPLIED] Scheduled task '$TaskName' registered."
