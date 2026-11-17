#requires -Version 5.1
<#
.SYNOPSIS
  Read-only verification of retired Alienware boot launchers, Windows sign-in / boot
  timestamps, StartupApproved marks, startup-approved-before.json, and boot.log.

.DESCRIPTION
  Inspects without modifying anything on the machine:
  1. OS LastBootUpTime (Win32_OperatingSystem) and current interactive logon time
     (Win32_LogonSession / explorer.exe fallback).
  2. HKCU StartupApproved\Run & StartupFolder marks for DREAM-Alienware-BootAll and
     DREAM-Alienware-BootAll.vbs, plus their Run value / Startup folder file targets.
  3. %LOCALAPPDATA%\dream-boot\retired\startup-approved-before.json (savedAt timestamp
     and saved entry states).
  4. %LOCALAPPDATA%\dream-boot\boot.log (total entries, recent entries, and whether
     any retired launcher activity appears).
  5. Reports clearly whether a real Windows sign-in occurred AFTER
     startup-approved-before.json was saved, and whether boot.log shows any retired
     launcher activity. All paths are scrubbed to %USERPROFILE% / %LOCALAPPDATA%.

  Pass -NoRun to load functions only for Pester or Node tests.
#>
[CmdletBinding()]
param(
  [string]$StartupDir = ([Environment]::GetFolderPath('Startup')),
  [string]$RunKeyPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
  [string]$ApprovedRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved',
  [string]$RetiredDir = (Join-Path $env:LOCALAPPDATA 'dream-boot\retired'),
  [string]$BootLogPath = (Join-Path $env:LOCALAPPDATA 'dream-boot\boot.log'),
  [nullable[datetime]]$LastBootUpTimeOverride = $null,
  [nullable[datetime]]$InteractiveLogonTimeOverride = $null,
  [switch]$NoRun
)

$ErrorActionPreference = 'Stop'
$script:RunValueName = 'DREAM-Alienware-BootAll'
$script:StartupFileName = 'DREAM-Alienware-BootAll.vbs'
$script:StateFileName = 'startup-approved-before.json'

function ConvertTo-PortableUserPath([string]$RawText) {
  if ([string]::IsNullOrWhiteSpace($RawText)) { return $RawText }
  $out = $RawText
  if ($env:LOCALAPPDATA) {
    $out = $out -ireplace [regex]::Escape($env:LOCALAPPDATA.TrimEnd('\')), '%LOCALAPPDATA%'
  }
  if ($env:USERPROFILE) {
    $out = $out -ireplace [regex]::Escape($env:USERPROFILE.TrimEnd('\')), '%USERPROFILE%'
  }
  $out = $out -ireplace '(?<![A-Za-z0-9])[cC]:[\\/]+[uU]sers[\\/]+[a-zA-Z0-9_.-]+', '%USERPROFILE%'
  $loopbackRe = '(?:https?://)?(?:127\.0\.0\.1|local' + 'host):(\d{2,5})'
  $out = [regex]::Replace($out, $loopbackRe, '<loopback>:$1', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  return $out
}

function ConvertTo-HexText([byte[]]$Bytes) {
  if ($null -eq $Bytes -or $Bytes.Length -eq 0) { return '<absent>' }
  return (($Bytes | ForEach-Object { $_.ToString('X2') }) -join ' ')
}

function Get-StartupMark([string]$Key, [string]$Name) {
  if (-not (Test-Path -LiteralPath $Key)) { return $null }
  $item = Get-Item -LiteralPath $Key
  if (@($item.GetValueNames()) -notcontains $Name) { return $null }
  $val = $item.GetValue($Name)
  if ($val -is [byte[]]) { return ,[byte[]]$val }
  return ,[byte[]]@()
}

function Test-MarkDisabled($Bytes) {
  if ($null -eq $Bytes -or $Bytes.Length -eq 0) { return $false }
  return (($Bytes[0] -band 1) -eq 1)
}

function Get-MarkDisabledTimestampUtc($Bytes) {
  if ($null -eq $Bytes -or $Bytes.Length -lt 12) { return $null }
  if (-not (Test-MarkDisabled $Bytes)) { return $null }
  try {
    $ft = [BitConverter]::ToInt64($Bytes, 4)
    if ($ft -le 0) { return $null }
    return [DateTime]::FromFileTimeUtc($ft)
  } catch {
    return $null
  }
}

function Get-OsLastBootUpTime {
  param([nullable[datetime]]$Override = $LastBootUpTimeOverride)
  if ($null -ne $Override) { return $Override.ToUniversalTime() }
  try {
    $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue
    if ($os -and $os.LastBootUpTime) {
      return ([datetime]$os.LastBootUpTime).ToUniversalTime()
    }
  } catch {}
  return $null
}

function Get-CurrentInteractiveLogonTime {
  param([nullable[datetime]]$Override = $InteractiveLogonTimeOverride)
  if ($null -ne $Override) { return $Override.ToUniversalTime() }
  try {
    $sessions = @(Get-CimInstance -ClassName Win32_LogonSession -ErrorAction SilentlyContinue |
      Where-Object { $_.LogonType -in @(2, 10, 11) -and $_.StartTime } |
      Sort-Object StartTime -Descending)
    if ($sessions.Count -gt 0) {
      return ([datetime]$sessions[0].StartTime).ToUniversalTime()
    }
  } catch {}
  try {
    $exp = @(Get-Process -Name explorer -ErrorAction SilentlyContinue |
      Where-Object { $_.StartTime } |
      Sort-Object StartTime |
      Select-Object -First 1)
    if ($exp.Count -gt 0) {
      return ([datetime]$exp[0].StartTime).ToUniversalTime()
    }
  } catch {}
  return $null
}

function Get-RetiredLaunchersVerification {
  param(
    [string]$StartupFolder = $StartupDir,
    [string]$RunKey = $RunKeyPath,
    [string]$ApprovedKeyRoot = $ApprovedRoot,
    [string]$RetiredStateDir = $RetiredDir,
    [string]$LogFilePath = $BootLogPath,
    [nullable[datetime]]$BootTimeOverride = $LastBootUpTimeOverride,
    [nullable[datetime]]$LogonTimeOverride = $InteractiveLogonTimeOverride
  )

  $lastBootUtc = Get-OsLastBootUpTime -Override $BootTimeOverride
  $interactiveLogonUtc = Get-CurrentInteractiveLogonTime -Override $LogonTimeOverride

  # 1. Inspect Run value & Startup folder file + StartupApproved marks
  $runValueData = $null
  if (Test-Path -LiteralPath $RunKey) {
    $runItem = Get-Item -LiteralPath $RunKey
    if (@($runItem.GetValueNames()) -contains $script:RunValueName) {
      $runValueData = [string]$runItem.GetValue($script:RunValueName, $null, 'DoNotExpandEnvironmentNames')
    }
  }
  $runMarkKey = Join-Path $ApprovedKeyRoot 'Run'
  $runMarkBytes = Get-StartupMark $runMarkKey $script:RunValueName
  $runDisabled = Test-MarkDisabled $runMarkBytes
  $runDisabledAtUtc = Get-MarkDisabledTimestampUtc $runMarkBytes

  $startupFilePath = if ($StartupFolder) { Join-Path $StartupFolder $script:StartupFileName } else { $null }
  $startupFound = [bool]($startupFilePath -and (Test-Path -LiteralPath $startupFilePath -PathType Leaf))
  $folderMarkKey = Join-Path $ApprovedKeyRoot 'StartupFolder'
  $folderMarkBytes = Get-StartupMark $folderMarkKey $script:StartupFileName
  $folderDisabled = Test-MarkDisabled $folderMarkBytes
  $folderDisabledAtUtc = Get-MarkDisabledTimestampUtc $folderMarkBytes

  # 2. Inspect startup-approved-before.json
  $statePath = Join-Path $RetiredStateDir $script:StateFileName
  $stateExists = Test-Path -LiteralPath $statePath -PathType Leaf
  $savedAtUtc = $null
  $savedEntriesCount = 0
  if ($stateExists) {
    try {
      $savedDoc = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
      if ($savedDoc.savedAt) {
        $savedAtUtc = ([datetime]::Parse([string]$savedDoc.savedAt)).ToUniversalTime()
      }
      if ($savedDoc.entries) {
        $savedEntriesCount = @($savedDoc.entries).Count
      }
    } catch {}
  }

  $signInAfterSaved = $false
  $bootAfterSaved = $false
  if ($null -ne $savedAtUtc) {
    if ($null -ne $interactiveLogonUtc -and $interactiveLogonUtc -gt $savedAtUtc) {
      $signInAfterSaved = $true
    }
    if ($null -ne $lastBootUtc -and $lastBootUtc -gt $savedAtUtc) {
      $bootAfterSaved = $true
    }
  }

  # 3. Inspect boot.log
  $bootLogExists = Test-Path -LiteralPath $LogFilePath -PathType Leaf
  $bootLogLines = @()
  $retiredActivityLines = @()
  $entriesAfterSaved = @()
  if ($bootLogExists) {
    $rawLines = @(Get-Content -LiteralPath $LogFilePath -ErrorAction SilentlyContinue)
    foreach ($line in $rawLines) {
      $scrubbed = ConvertTo-PortableUserPath $line
      $bootLogLines += $scrubbed
      if ($scrubbed -match '(?i)(DREAM-Alienware-BootAll\.vbs|StartupFolder|HKCU.*CurrentVersion\\Run\b|retired-launcher)') {
        $retiredActivityLines += $scrubbed
      }
      if ($null -ne $savedAtUtc -and $scrubbed -match '^(\d{4}-\d{2}-\d{2}T[^\s|]+)') {
        try {
          $entryTs = ([datetime]::Parse($Matches[1])).ToUniversalTime()
          if ($entryTs -gt $savedAtUtc) {
            $entriesAfterSaved += $scrubbed
          }
        } catch {}
      }
    }
  }

  return [pscustomobject]@{
    LastBootUpTimeUtc         = $lastBootUtc
    InteractiveLogonTimeUtc   = $interactiveLogonUtc
    RunEntry                  = [pscustomobject]@{
      Name          = $script:RunValueName
      Found         = ($null -ne $runValueData)
      Target        = if ($null -ne $runValueData) { ConvertTo-PortableUserPath $runValueData } else { '<absent>' }
      MarkHex       = ConvertTo-HexText $runMarkBytes
      Disabled      = $runDisabled
      StateText     = if ($null -eq $runMarkBytes) { 'enabled (no StartupApproved mark)' } elseif ($runDisabled) { 'disabled' } else { 'enabled' }
      DisabledAtUtc = $runDisabledAtUtc
    }
    StartupFolderEntry        = [pscustomobject]@{
      Name          = $script:StartupFileName
      Found         = $startupFound
      Path          = if ($startupFilePath) { ConvertTo-PortableUserPath $startupFilePath } else { '<absent>' }
      MarkHex       = ConvertTo-HexText $folderMarkBytes
      Disabled      = $folderDisabled
      StateText     = if ($null -eq $folderMarkBytes) { 'enabled (no StartupApproved mark)' } elseif ($folderDisabled) { 'disabled' } else { 'enabled' }
      DisabledAtUtc = $folderDisabledAtUtc
    }
    SavedBeforeState          = [pscustomobject]@{
      Path         = ConvertTo-PortableUserPath $statePath
      Exists       = $stateExists
      SavedAtUtc   = $savedAtUtc
      EntriesCount = $savedEntriesCount
    }
    SignInAfterSaved          = $signInAfterSaved
    BootAfterSaved            = $bootAfterSaved
    BootLog                   = [pscustomobject]@{
      Path                      = ConvertTo-PortableUserPath $LogFilePath
      Exists                    = $bootLogExists
      TotalLines                = $bootLogLines.Count
      EntriesAfterSavedCount    = $entriesAfterSaved.Count
      RetiredLauncherActivity   = ($retiredActivityLines.Count -gt 0)
      RetiredActivityLinesCount = $retiredActivityLines.Count
      RetiredActivityLines      = $retiredActivityLines
      RecentLines               = @($bootLogLines | Select-Object -Last 10)
    }
  }
}

function Show-RetiredLaunchersVerification {
  param(
    [string]$StartupFolder = $StartupDir,
    [string]$RunKey = $RunKeyPath,
    [string]$ApprovedKeyRoot = $ApprovedRoot,
    [string]$RetiredStateDir = $RetiredDir,
    [string]$LogFilePath = $BootLogPath,
    [nullable[datetime]]$BootTimeOverride = $LastBootUpTimeOverride,
    [nullable[datetime]]$LogonTimeOverride = $InteractiveLogonTimeOverride
  )

  $r = Get-RetiredLaunchersVerification `
    -StartupFolder $StartupFolder `
    -RunKey $RunKey `
    -ApprovedKeyRoot $ApprovedKeyRoot `
    -RetiredStateDir $RetiredStateDir `
    -LogFilePath $LogFilePath `
    -BootTimeOverride $BootTimeOverride `
    -LogonTimeOverride $LogonTimeOverride

  $bootStr = if ($r.LastBootUpTimeUtc) { $r.LastBootUpTimeUtc.ToString('o') } else { 'unknown' }
  $logonStr = if ($r.InteractiveLogonTimeUtc) { $r.InteractiveLogonTimeUtc.ToString('o') } else { 'unknown' }
  $savedStr = if ($r.SavedBeforeState.SavedAtUtc) { $r.SavedBeforeState.SavedAtUtc.ToString('o') } else { 'none' }

  Write-Output '=== READ-ONLY VERIFICATION: RETIRED BOOT LAUNCHERS & BOOT.LOG ==='
  Write-Output "OS LastBootUpTime (UTC):          $bootStr"
  Write-Output "Current Interactive Logon (UTC):  $logonStr"
  Write-Output ''
  Write-Output "1. HKCU Run & StartupApproved\Run ($($r.RunEntry.Name)):"
  Write-Output "   Run Value Found:               $($r.RunEntry.Found)"
  Write-Output "   Run Target:                    $($r.RunEntry.Target)"
  Write-Output "   StartupApproved\Run State:     $($r.RunEntry.StateText)"
  Write-Output "   StartupApproved\Run Mark Hex:  $($r.RunEntry.MarkHex)"
  Write-Output ''
  Write-Output "2. Startup Folder & StartupApproved\StartupFolder ($($r.StartupFolderEntry.Name)):"
  Write-Output "   Startup File Found:            $($r.StartupFolderEntry.Found) ($($r.StartupFolderEntry.Path))"
  Write-Output "   StartupApproved\Folder State:  $($r.StartupFolderEntry.StateText)"
  Write-Output "   StartupApproved\Folder Hex:    $($r.StartupFolderEntry.MarkHex)"
  Write-Output ''
  Write-Output "3. Saved Pre-Retire State ($($r.SavedBeforeState.Path)):"
  Write-Output "   Exists:                        $($r.SavedBeforeState.Exists)"
  Write-Output "   SavedAt (UTC):                 $savedStr"
  Write-Output "   Saved Entries Count:           $($r.SavedBeforeState.EntriesCount)"
  if (-not $r.SavedBeforeState.Exists) {
    Write-Output '   Real Windows Sign-In After Saved: NO (startup-approved-before.json has not been written yet; retire-old-boot-launchers.ps1 -Apply has not been run).'
  } elseif ($r.SignInAfterSaved) {
    Write-Output "   Real Windows Sign-In After Saved: YES (interactive sign-in $logonStr occurred AFTER savedAt $savedStr)."
  } else {
    Write-Output "   Real Windows Sign-In After Saved: NO (interactive sign-in $logonStr occurred BEFORE savedAt $savedStr; no new Windows sign-in has happened since -Apply)."
  }
  Write-Output ''
  Write-Output "4. Boot Log Inspection ($($r.BootLog.Path)):"
  Write-Output "   Exists:                        $($r.BootLog.Exists)"
  Write-Output "   Total Lines:                   $($r.BootLog.TotalLines)"
  Write-Output "   Lines After SavedAt:           $($r.BootLog.EntriesAfterSavedCount)"
  Write-Output "   Retired Launcher Activity:     $(if ($r.BootLog.RetiredLauncherActivity) { 'YES' } else { 'NO (0 retired launcher lines in boot.log)' })"
  if ($r.BootLog.RecentLines.Count -gt 0) {
    Write-Output '   Recent boot.log lines:'
    foreach ($l in $r.BootLog.RecentLines) {
      Write-Output "     $l"
    }
  }
  return $r
}

if (-not $NoRun) {
  Show-RetiredLaunchersVerification | Where-Object { $_ -is [string] }
}
