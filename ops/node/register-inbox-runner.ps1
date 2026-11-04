<#
.SYNOPSIS
  Registers (or removes) the hidden scheduled task "DreamRouterInbox" on the Alienware node.
  Starts ops/router/inbox-runner.ts at logon with the window completely hidden (-WindowStyle Hidden
  and ScheduledTask -Hidden), never opening a visible console window or taking keyboard focus.

  Run from the main checkout in Windows PowerShell (run by Josh or the judge once):
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\register-inbox-runner.ps1"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\unregister-inbox-runner.ps1"
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Join-Path $env:USERPROFILE 'antigravity\DREAM-Engine'),
  [string]$RunnerRelativePath = 'ops\router\inbox-runner.ts',
  [switch]$Uninstall,
  [switch]$DefinitionOnly
)

$TaskName = 'DreamRouterInbox'

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  "Scheduled task '$TaskName' removed."
  return
}

$RunnerFullPath = Join-Path $RepoRoot $RunnerRelativePath
if (-not (Test-Path -LiteralPath $RunnerFullPath)) {
  throw "Inbox runner not found at $RunnerFullPath"
}

$InboxRoot = Join-Path $env:USERPROFILE 'antigravity\.fable-kitchen\inbox'
foreach ($sub in 'queued', 'running', 'done', 'failed') {
  $subPath = Join-Path $InboxRoot $sub
  if (-not (Test-Path -LiteralPath $subPath)) {
    New-Item -ItemType Directory -Path $subPath -Force | Out-Null
  }
}

$user = "$env:USERDOMAIN\$env:USERNAME"
$psArgs = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$RepoRoot'; npx tsx '$RunnerFullPath'`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $psArgs -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$settings = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

if ($DefinitionOnly) {
  return [pscustomobject]@{
    TaskName  = $TaskName
    Action    = $action
    Trigger   = $trigger
    Settings  = $settings
    Principal = $principal
  }
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Headless Jev router inbox runner (the wheel) on Alienware. Starts at logon with window hidden.' `
  -Force `
  -ErrorAction Stop | Out-Null

"Scheduled task '$TaskName' registered for $user (AtLogOn, Hidden window, MultipleInstances=IgnoreNew)."
