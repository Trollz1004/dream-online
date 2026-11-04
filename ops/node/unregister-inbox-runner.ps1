<#
.SYNOPSIS
  Unregisters the hidden scheduled task "DreamRouterInbox" on the Alienware node.

  Usage:
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\unregister-inbox-runner.ps1"
#>
[CmdletBinding()]
param(
  [string]$TaskName = 'DreamRouterInbox'
)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
"Scheduled task '$TaskName' removed."
