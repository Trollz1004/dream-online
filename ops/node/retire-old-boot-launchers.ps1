<#
.SYNOPSIS
  Switches off the two older duplicate launchers of boot-alienware-services.ps1 the way Windows does it, by writing
  the "disabled" mark Task Manager writes under StartupApproved. Nothing is moved, renamed or deleted.

  The two entries (touched only when named exactly like this):
  1. The value DREAM-Alienware-BootAll under HKCU:\Software\Microsoft\Windows\CurrentVersion\Run
     -> mark: binary value DREAM-Alienware-BootAll under ...\Explorer\StartupApproved\Run
  2. The file DREAM-Alienware-BootAll.vbs in the current user's Startup folder
     -> mark: binary value DREAM-Alienware-BootAll.vbs under ...\Explorer\StartupApproved\StartupFolder

  Why not rename: Windows runs every value under the Run key whatever it is called, so a renamed value still runs.
  Windows skips a Run value or Startup file whose StartupApproved mark is "disabled". The mark is 12 bytes: the first
  byte is the state (02 = enabled, 03 = disabled; an odd first byte means disabled), the last 8 bytes are a FILETIME
  of when it was disabled (zero when enabled). A missing mark means enabled.

  Modes:
  - (default) dry run: prints, for each entry, found or not, where it points (user folder shown as %USERPROFILE%),
    enabled or disabled now, and what -Apply would write. Changes nothing.
  - -Apply: saves the previous state of each mark (or 'absent') to
    %LOCALAPPDATA%\dream-boot\retired\startup-approved-before.json, then writes the disabled mark.
    A mark that is already disabled is left as it is, so a second -Apply changes nothing.
  - -Undo: restores each mark from that file. A mark that was absent before gets the enabled mark (02 + zeros), the
    same bytes Task Manager writes when an item is enabled again, so nothing is deleted.

  Run in Windows PowerShell (the judge runs it with -Apply after merge):
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\node\retire-old-boot-launchers.ps1"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\node\retire-old-boot-launchers.ps1" -Apply
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\node\retire-old-boot-launchers.ps1" -Undo
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$Undo,
  [string]$StartupDir = ([Environment]::GetFolderPath('Startup')),
  [string]$RunKeyPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
  [string]$ApprovedRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved',
  [string]$RetiredDir = (Join-Path $env:LOCALAPPDATA 'dream-boot\retired')
)

$ErrorActionPreference = 'Stop'
$RunValueName = 'DREAM-Alienware-BootAll'
$StartupFileName = 'DREAM-Alienware-BootAll.vbs'
$StateFileName = 'startup-approved-before.json'

if ($Apply -and $Undo) { throw 'Pass -Apply or -Undo, not both.' }

function ConvertTo-PortableUserPath([string]$RawText) {
  if ([string]::IsNullOrWhiteSpace($RawText)) { return $RawText }
  $out = $RawText
  if ($env:LOCALAPPDATA) { $out = $out -ireplace [regex]::Escape($env:LOCALAPPDATA.TrimEnd('\')), '%LOCALAPPDATA%' }
  if ($env:USERPROFILE) { $out = $out -ireplace [regex]::Escape($env:USERPROFILE.TrimEnd('\')), '%USERPROFILE%' }
  return $out
}

function Get-StartupFileTarget([string]$Path) {
  try {
    $raw = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
    $repoRootVal = $null
    if ($raw -match 'repoRoot\s*=\s*sh\.ExpandEnvironmentStrings\("([^"]+)"\)\s*&\s*"([^"]+)"') {
      $repoRootVal = $Matches[1] + $Matches[2]
    }
    if ($raw -match 'psCmd\s*=\s*"(.*)"') {
      $cmd = $Matches[1]
      if ($repoRootVal) { $cmd = $cmd -replace '"\s*&\s*repoRoot\s*&\s*"', $repoRootVal }
      $cmd = $cmd -replace '""', '"'
      return (ConvertTo-PortableUserPath $cmd.Trim())
    }
    $lines = @($raw -split "\r?\n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch "^('|\s*rem\b|@echo\b|Option\s+Explicit|Dim\s+|Set\s+)" })
    if ($lines.Count -gt 0) { return (ConvertTo-PortableUserPath $lines[0]) }
  } catch {}
  return (ConvertTo-PortableUserPath $Path)
}

function ConvertTo-HexText([byte[]]$Bytes) {
  if ($null -eq $Bytes) { return '' }
  return (($Bytes | ForEach-Object { $_.ToString('X2') }) -join ' ')
}

function ConvertFrom-HexText([string]$Text) {
  return [byte[]]@($Text -split '\s+' | Where-Object { $_ } | ForEach-Object { [Convert]::ToByte($_, 16) })
}

# Returns the mark bytes, or $null when there is no mark.
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

function Get-MarkStateText($Bytes) {
  if ($null -eq $Bytes) { return 'enabled (no StartupApproved mark)' }
  $state = if (Test-MarkDisabled $Bytes) { 'disabled' } else { 'enabled' }
  return "$state (mark: first byte 0x$('{0:X2}' -f $Bytes[0]), $($Bytes.Length) bytes)"
}

function New-DisabledMark {
  $ft = [BitConverter]::GetBytes([DateTime]::UtcNow.ToFileTimeUtc())
  return ,[byte[]](@([byte]3, [byte]0, [byte]0, [byte]0) + $ft)
}

function New-EnabledMark { return ,[byte[]](@([byte]2) + (@([byte]0) * 11)) }

function Set-StartupMark([string]$Key, [string]$Name, [byte[]]$Bytes) {
  if (-not (Test-Path -LiteralPath $Key)) { New-Item -Path $Key -Force | Out-Null }
  New-ItemProperty -LiteralPath $Key -Name $Name -PropertyType Binary -Value $Bytes -Force | Out-Null
}

# The two entries and where their marks live.
$runValueData = $null
if (Test-Path -LiteralPath $RunKeyPath) {
  $runItem = Get-Item -LiteralPath $RunKeyPath
  if (@($runItem.GetValueNames()) -contains $RunValueName) { $runValueData = [string]$runItem.GetValue($RunValueName, $null, 'DoNotExpandEnvironmentNames') }
}
$startupFilePath = if ($StartupDir) { Join-Path $StartupDir $StartupFileName } else { $null }
$startupFound = [bool]($startupFilePath -and (Test-Path -LiteralPath $startupFilePath -PathType Leaf))

$entries = @(
  [pscustomobject]@{
    Kind = 'Run'; Name = $RunValueName; Found = ($null -ne $runValueData)
    Where = "$RunKeyPath -> value $RunValueName"
    Target = if ($null -ne $runValueData) { ConvertTo-PortableUserPath $runValueData } else { '' }
    MarkKey = (Join-Path $ApprovedRoot 'Run')
  },
  [pscustomobject]@{
    Kind = 'StartupFolder'; Name = $StartupFileName; Found = $startupFound
    Where = if ($startupFilePath) { ConvertTo-PortableUserPath $startupFilePath } else { '(no Startup folder)' }
    Target = if ($startupFound) { Get-StartupFileTarget $startupFilePath } else { '' }
    MarkKey = (Join-Path $ApprovedRoot 'StartupFolder')
  }
)

$statePath = Join-Path $RetiredDir $StateFileName
$statePortable = ConvertTo-PortableUserPath $statePath

if ($Undo) {
  if (-not (Test-Path -LiteralPath $statePath)) { throw "No saved state at $statePortable; nothing to undo." }
  $saved = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
  foreach ($s in @($saved.entries)) {
    if (@($RunValueName, $StartupFileName) -notcontains $s.name) { continue }
    $key = if ($s.kind -eq 'Run') { Join-Path $ApprovedRoot 'Run' } else { Join-Path $ApprovedRoot 'StartupFolder' }
    $restore = if ($s.state -eq 'absent') { New-EnabledMark } else { ConvertFrom-HexText $s.bytes }
    $now = Get-StartupMark $key $s.name
    if ($null -ne $now -and (ConvertTo-HexText $now) -eq (ConvertTo-HexText $restore)) {
      Write-Output "[UNDO] $($s.kind) $($s.name): already $(ConvertTo-HexText $restore); unchanged"
      continue
    }
    Set-StartupMark $key $s.name $restore
    Write-Output "[UNDO] $($s.kind) $($s.name): wrote $(ConvertTo-HexText $restore) (saved state: $($s.state))"
  }
  return
}

$plan = @()
foreach ($e in $entries) {
  $mark = Get-StartupMark $e.MarkKey $e.Name
  $label = if ($e.Kind -eq 'Run') { 'Run key entry' } else { 'Startup folder file' }
  Write-Output "${label}: $($e.Name)"
  if (-not $e.Found) {
    Write-Output "  Found:  no ($($e.Where))"
    Write-Output "  -Apply: writes nothing for this entry"
    continue
  }
  Write-Output "  Found:  yes ($($e.Where))"
  Write-Output "  Target: $($e.Target)"
  Write-Output "  Now:    $(Get-MarkStateText $mark)"
  if (Test-MarkDisabled $mark) {
    Write-Output "  -Apply: nothing; already disabled"
  } else {
    Write-Output "  -Apply: writes binary value '$($e.Name)' under $($e.MarkKey) = 03 00 00 00 + 8-byte FILETIME of now (disabled)"
    $plan += [pscustomobject]@{ Entry = $e; Before = $mark }
  }
}

if (-not $Apply) {
  Write-Output "[DRY RUN] nothing changed; -Apply saves the previous marks to $statePortable and then writes the disabled marks."
  return
}

if ($plan.Count -eq 0) {
  Write-Output "[APPLY] nothing to change."
  return
}

# Save the previous state of each mark first. A record already saved for an entry we are not changing now is kept,
# so -Undo still returns to the state before the first -Apply.
$records = @{}
if (Test-Path -LiteralPath $statePath) {
  foreach ($s in @((Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json).entries)) { $records[$s.name] = $s }
}
foreach ($p in $plan) {
  $records[$p.Entry.Name] = [pscustomobject]@{
    kind = $p.Entry.Kind; name = $p.Entry.Name
    state = if ($null -eq $p.Before) { 'absent' } else { 'present' }
    bytes = ConvertTo-HexText $p.Before
  }
}
if (-not (Test-Path -LiteralPath $RetiredDir)) { New-Item -ItemType Directory -Path $RetiredDir -Force | Out-Null }
$doc = [pscustomobject]@{ savedAt = (Get-Date).ToString('o'); entries = @($records.Values | Sort-Object kind) }
Set-Content -LiteralPath $statePath -Value ($doc | ConvertTo-Json -Depth 4) -Encoding UTF8
Write-Output "[APPLY] saved previous marks to $statePortable"

foreach ($p in $plan) {
  $bytes = New-DisabledMark
  Set-StartupMark $p.Entry.MarkKey $p.Entry.Name $bytes
  Write-Output "[APPLY] $($p.Entry.Kind) $($p.Entry.Name): wrote $(ConvertTo-HexText $bytes) (disabled)"
}
