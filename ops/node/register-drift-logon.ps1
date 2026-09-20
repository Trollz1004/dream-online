<#
.SYNOPSIS
  Registers (or removes) the scheduled task "DREAM-Drift-Logon": at sign-in it opens one console
  window on Joshua's desktop and runs `drift`, so Claude is already up after a restart.
  Asked for by Joshua on 2026-09-19.

  The task waits 90 seconds after sign-in so the "DREAM Stack" supervisor has started its services
  before drift looks for it. It is Interactive and not elevated, the same as "DREAM Stack".
  Each sign-in spends one Claude session start; remove the task with -Uninstall if that is not wanted.

  Run from the main checkout, in Windows PowerShell:
    powershell -NoProfile -ExecutionPolicy Bypass -File C:\DREAM\dream-online\ops\node\register-drift-logon.ps1
    ... -Uninstall
    ... -DefinitionOnly   (returns the task definition and registers nothing; used by the tests)
#>
[CmdletBinding()]
param(
  [string]$DriftPath = (Join-Path $env:USERPROFILE '.local\bin\drift.cmd'),
  [int]$DelaySeconds = 90,
  [switch]$Uninstall,
  [switch]$DefinitionOnly
)

$TaskName = 'DREAM-Drift-Logon'

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  "Scheduled task '$TaskName' removed."
  return
}

if (-not (Test-Path -LiteralPath $DriftPath)) { throw "drift not found at $DriftPath" }

$user = "$env:USERDOMAIN\$env:USERNAME"
# cmd /k keeps the window open after Claude exits, so an error stays readable.
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/k `"$DriftPath`"" -WorkingDirectory 'C:\DREAM\dream-online'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$trigger.Delay = "PT${DelaySeconds}S"
# No time limit: a Claude session may stay open for days. IgnoreNew: never a second terminal.
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

if ($DefinitionOnly) {
  return [pscustomobject]@{ TaskName = $TaskName; Action = $action; Trigger = $trigger; Settings = $settings; Principal = $principal }
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Opens drift (Claude with the alienware-node launch skill) at sign-in. Owned by Claude through drift.' -Force -ErrorAction Stop | Out-Null
"Scheduled task '$TaskName' registered for ${user}: at sign-in plus $DelaySeconds seconds, runs $DriftPath."
