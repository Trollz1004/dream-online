<#
.SYNOPSIS
  Registers (or removes) the hidden scheduled task "DreamRouterInbox" on the Alienware node.
  Starts ops/router/inbox-runner.ts at logon with the window completely hidden (-WindowStyle Hidden
  and ScheduledTask -Hidden), never opening a visible console window or taking keyboard focus.
  Defaults to dry run: prints what would be registered and registers nothing unless -Apply is passed.

  Run from the main checkout in Windows PowerShell (run by Josh or the judge once, with -Apply):
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\register-inbox-runner.ps1"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\register-inbox-runner.ps1" -Apply
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\unregister-inbox-runner.ps1"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\unregister-inbox-runner.ps1" -Apply
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$RepoRoot = (Join-Path $env:USERPROFILE 'antigravity\DREAM-Engine'),
  [string]$RunnerRelativePath = 'ops\router\inbox-runner.ts',
  [switch]$Uninstall,
  [switch]$DefinitionOnly
)

$ErrorActionPreference = 'Stop'

function ConvertTo-PortablePath([string]$RawPath) {
  if ([string]::IsNullOrWhiteSpace($RawPath)) { return $RawPath }
  $out = $RawPath
  if ($env:LOCALAPPDATA) {
    $normLocal = $env:LOCALAPPDATA.TrimEnd('\', '/')
    $out = $out -ireplace [regex]::Escape($normLocal), '%LOCALAPPDATA%'
    $out = $out -ireplace [regex]::Escape($normLocal.Replace('\', '/')), '%LOCALAPPDATA%'
  }
  if ($env:USERPROFILE) {
    $normUser = $env:USERPROFILE.TrimEnd('\', '/')
    $out = $out -ireplace [regex]::Escape($normUser), '%USERPROFILE%'
    $out = $out -ireplace [regex]::Escape($normUser.Replace('\', '/')), '%USERPROFILE%'
  }
  if ($env:HOME) {
    $normHome = $env:HOME.TrimEnd('\', '/')
    $out = $out -ireplace [regex]::Escape($normHome), '%USERPROFILE%'
    $out = $out -ireplace [regex]::Escape($normHome.Replace('\', '/')), '%USERPROFILE%'
  }
  return $out
}

$TaskName = 'DreamRouterInbox'

if ($Uninstall) {
  if (-not $Apply) {
    Write-Output "Task name: $TaskName"
    Write-Output "[DRY RUN] nothing unregistered; pass -Apply to write"
    exit 0
  }
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output "Scheduled task '$TaskName' removed."
  return
}

$portableRepoRoot = ConvertTo-PortablePath $RepoRoot
$RunnerFullPath = Join-Path $RepoRoot $RunnerRelativePath
$portableRunnerPath = ConvertTo-PortablePath $RunnerFullPath

$psArgs = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$portableRepoRoot'; npx tsx '$portableRunnerPath'`""
$actionDescription = "powershell.exe $psArgs"
$runLevel = 'Limited'
$triggerDescription = 'AtLogOn'

if (-not $Apply -and -not $DefinitionOnly) {
  Write-Output "Task name: $TaskName"
  Write-Output "Action: $actionDescription"
  Write-Output "Trigger: $triggerDescription"
  Write-Output "Run level: $runLevel"
  Write-Output "Working folder: $portableRepoRoot"
  Write-Output "[DRY RUN] nothing registered; pass -Apply to write"
  exit 0
}

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

$user = if ($env:USERDOMAIN -and $env:USERNAME) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }
$actualPsArgs = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$RepoRoot'; npx tsx '$RunnerFullPath'`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $actualPsArgs -WorkingDirectory $RepoRoot
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

Write-Output "Scheduled task '$TaskName' registered (AtLogOn, Hidden window, MultipleInstances=IgnoreNew)."
