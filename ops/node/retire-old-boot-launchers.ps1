<#
.SYNOPSIS
  Retires older duplicate launchers for boot-alienware-services.ps1 that still point at the DREAM-Engine clone:
  1. The DREAM-Alienware-BootAll file in the current user's Startup folder.
  2. The DREAM-Alienware-BootAll value under HKCU:\Software\Microsoft\Windows\CurrentVersion\Run.

  With the DREAM-Alienware-BootAll scheduled task in place, those two entries are duplicates that run an older copy
  of the script at sign-in.
  Defaults to dry run: lists what it finds (names and targets, with the user folder shown as %USERPROFILE%) and
  changes nothing unless -Apply is passed.
  With -Apply:
  - Moves the Startup file into %LOCALAPPDATA%\dream-boot\retired\
  - Renames the Run value to DREAM-Alienware-BootAll.retired and writes its data to a text file beside the retired
    Startup file (%LOCALAPPDATA%\dream-boot\retired\DREAM-Alienware-BootAll.retired.txt).
  Nothing is deleted. Only entries named DREAM-Alienware-BootAll are touched.

  Run in Windows PowerShell (the judge runs it with -Apply after merge):
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\node\retire-old-boot-launchers.ps1"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\node\retire-old-boot-launchers.ps1" -Apply
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$StartupDir = ([Environment]::GetFolderPath('Startup')),
  [string]$RunKeyPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
  [string]$RetiredDir = (Join-Path $env:LOCALAPPDATA 'dream-boot\retired')
)

$ErrorActionPreference = 'Stop'
$EntryName = 'DREAM-Alienware-BootAll'
$RetiredValueName = 'DREAM-Alienware-BootAll.retired'

function ConvertTo-PortableUserPath([string]$RawText) {
  if ([string]::IsNullOrWhiteSpace($RawText) -or -not $env:USERPROFILE) { return $RawText }
  return ($RawText -ireplace [regex]::Escape($env:USERPROFILE.TrimEnd('\')), '%USERPROFILE%')
}

function ConvertTo-PortableLocalAppDataPath([string]$RawText) {
  if ([string]::IsNullOrWhiteSpace($RawText)) { return $RawText }
  $out = $RawText
  if ($env:LOCALAPPDATA) {
    $out = $out -ireplace [regex]::Escape($env:LOCALAPPDATA.TrimEnd('\')), '%LOCALAPPDATA%'
  }
  return (ConvertTo-PortableUserPath $out)
}

function Get-StartupFileTarget([System.IO.FileInfo]$File) {
  if ($null -eq $File -or -not (Test-Path -LiteralPath $File.FullName)) { return '' }
  try {
    $raw = Get-Content -LiteralPath $File.FullName -Raw -ErrorAction Stop
    $repoRootVal = $null
    if ($raw -match 'repoRoot\s*=\s*sh\.ExpandEnvironmentStrings\("([^"]+)"\)\s*&\s*"([^"]+)"') {
      $repoRootVal = $Matches[1] + $Matches[2]
    }
    if ($raw -match 'psCmd\s*=\s*"(.*)"') {
      $cmd = $Matches[1]
      if ($repoRootVal) {
        $cmd = $cmd -replace '"\s*&\s*repoRoot\s*&\s*"', $repoRootVal
      }
      $cmd = $cmd -replace '""', '"'
      return (ConvertTo-PortableUserPath $cmd.Trim())
    }
    $lines = @($raw -split "\r?\n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch "^('|\s*rem\b|@echo\b|Option\s+Explicit|Dim\s+|Set\s+)" })
    if ($lines.Count -gt 0) {
      return (ConvertTo-PortableUserPath $lines[0])
    }
  } catch {}
  return (ConvertTo-PortableUserPath $File.FullName)
}

$startupFiles = @()
if ($StartupDir -and (Test-Path -LiteralPath $StartupDir)) {
  $startupFiles = @(
    Get-ChildItem -LiteralPath $StartupDir -File -Force -ErrorAction SilentlyContinue |
      Where-Object {
        ($_.Name -eq $EntryName) -or
        ($_.BaseName -eq $EntryName -and $_.Extension -ne '.retired')
      }
  )
}

$runProp = $null
try {
  $runProp = Get-ItemProperty -LiteralPath $RunKeyPath -Name $EntryName -ErrorAction SilentlyContinue
} catch {
  $runProp = $null
}
$runValueData = if ($null -ne $runProp -and $null -ne $runProp.$EntryName) { [string]$runProp.$EntryName } else { $null }

$retiredDirPortable = ConvertTo-PortableLocalAppDataPath $RetiredDir

if ($startupFiles.Count -gt 0) {
  foreach ($f in $startupFiles) {
    $target = Get-StartupFileTarget $f
    $destPortable = Join-Path $retiredDirPortable $f.Name
    Write-Output "Startup entry: $($f.Name)"
    Write-Output "  Path:   $(ConvertTo-PortableUserPath $f.FullName)"
    Write-Output "  Target: $target"
    Write-Output "  Retire: move to $destPortable"
  }
} else {
  Write-Output "Startup entry: (no $EntryName file found in $(ConvertTo-PortableUserPath $StartupDir))"
}

$runTextFilePortable = Join-Path $retiredDirPortable "$RetiredValueName.txt"
if ($null -ne $runValueData) {
  Write-Output "Run key entry: $EntryName"
  Write-Output "  Key:    $RunKeyPath"
  Write-Output "  Target: $(ConvertTo-PortableUserPath $runValueData)"
  Write-Output "  Retire: rename value to $RetiredValueName and save data to $runTextFilePortable"
} else {
  Write-Output "Run key entry: (no $EntryName value found under $RunKeyPath)"
}

if (-not $Apply) {
  Write-Output "[DRY RUN] nothing changed; pass -Apply to move the Startup file and rename the Run value."
  return
}

if ($startupFiles.Count -gt 0 -or $null -ne $runValueData) {
  if (-not (Test-Path -LiteralPath $RetiredDir)) {
    New-Item -ItemType Directory -Path $RetiredDir -Force | Out-Null
  }
}

foreach ($f in $startupFiles) {
  $destPath = Join-Path $RetiredDir $f.Name
  Move-Item -LiteralPath $f.FullName -Destination $destPath -Force
  Write-Output "[APPLIED] Moved Startup file $(ConvertTo-PortableUserPath $f.FullName) -> $(ConvertTo-PortableLocalAppDataPath $destPath)"
}

if ($null -ne $runValueData) {
  $runTextFilePath = Join-Path $RetiredDir "$RetiredValueName.txt"
  Set-Content -LiteralPath $runTextFilePath -Value $runValueData -Encoding UTF8 -Force
  Rename-ItemProperty -LiteralPath $RunKeyPath -Name $EntryName -NewName $RetiredValueName
  Write-Output "[APPLIED] Renamed Run value '$EntryName' -> '$RetiredValueName' and saved data to $(ConvertTo-PortableLocalAppDataPath $runTextFilePath)"
}
