<#
.SYNOPSIS
  Unregisters the hidden scheduled task "DreamRouterInbox" on the Alienware node.
  Defaults to dry run: prints what would be unregistered and removes nothing unless -Apply is passed.

  Usage:
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\unregister-inbox-runner.ps1"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\unregister-inbox-runner.ps1" -Apply
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$TaskName = 'DreamRouterInbox'
)

$ErrorActionPreference = 'Stop'

if (-not $Apply) {
  Write-Output "Task name: $TaskName"
  Write-Output "[DRY RUN] nothing unregistered; pass -Apply to write"
  exit 0
}

$isOnWindows = if (Test-Path Variable:IsWindows) { [bool]$IsWindows } else { [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT }
if ($isOnWindows) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
}
Write-Output "Scheduled task '$TaskName' removed."
