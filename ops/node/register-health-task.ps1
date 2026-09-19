<#
.SYNOPSIS
  Registers (or removes) the scheduled task "DREAM-Alienware-Health": the token-free health probe,
  every 30 minutes. Tries the no-stored-password S4U logon type first, which runs whether or not
  anyone is signed in; falls back to Interactive when Windows refuses S4U without elevation.

  Run from the main checkout, in Windows PowerShell:
    powershell -NoProfile -ExecutionPolicy Bypass -File C:\DREAM\dream-online\ops\node\register-health-task.ps1
    ... -Uninstall
#>
[CmdletBinding()]
param(
  [string]$ScriptPath = 'C:\DREAM\dream-online\ops\node\alienware-health.ps1',
  [switch]$Uninstall
)

$TaskName = 'DREAM-Alienware-Health'

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  "Scheduled task '$TaskName' removed."
  return
}

if (-not (Test-Path -LiteralPath $ScriptPath)) { throw "Health probe not found at $ScriptPath" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 30)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
$user = "$env:USERDOMAIN\$env:USERNAME"

foreach ($logonType in 'S4U', 'Interactive') {
  try {
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType $logonType -RunLevel Limited
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Token-free DREAM node health probe. Writes ops\node\heartbeat. Owned by Claude through drift.' -Force -ErrorAction Stop | Out-Null
    "Scheduled task '$TaskName' registered for $user, logon type $logonType, every 30 minutes."
    return
  } catch {
    "Logon type $logonType was refused: $($_.Exception.Message)"
  }
}
throw "Could not register '$TaskName'."
