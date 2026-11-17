<#
.SYNOPSIS
  Checks repo and node agent files against canonical Trollz1004 Spine rendered blocks.
  Windows PowerShell 5.1 compatible. Read-only against agent files; writes status JSON unless -NoWriteStatus.
#>
[CmdletBinding()]
param(
  [ValidateSet('alienware', 't5500')]
  [string]$Node = 'alienware',

  [ValidateSet('all', 'repo', 'node')]
  [string]$Scope = 'all',

  [string]$RepoRoot = '',

  [string]$SpineSourceRepo = '',

  [string]$UserProfileRoot = $env:USERPROFILE,

  [string]$LocalAppDataRoot = $env:LOCALAPPDATA,

  [string]$FreebuffRoot = 'C:\freebuff-leadgen',

  [string]$StatusJsonPath = '',

  [switch]$NoWriteStatus,

  [switch]$SoftExit,

  [switch]$NoRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:CheckNoRun = [bool]$NoRun
$script:CheckNode = $Node
$script:CheckScope = $Scope
$script:CheckRepoRoot = if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
} else {
  $RepoRoot
}
$script:CheckSpineSourceRepo = $SpineSourceRepo
$script:CheckUserProfileRoot = $UserProfileRoot
$script:CheckLocalAppDataRoot = $LocalAppDataRoot
$script:CheckFreebuffRoot = $FreebuffRoot
$script:CheckStatusJsonPath = if ([string]::IsNullOrWhiteSpace($StatusJsonPath)) {
  Join-Path $LocalAppDataRoot 'dream-boot\agent-drift.json'
} else {
  $StatusJsonPath
}
$script:CheckNoWriteStatus = [bool]$NoWriteStatus
$script:CheckSoftExit = [bool]$SoftExit
$script:LastDriftReport = $null

. (Join-Path $PSScriptRoot 'render-agent-files.ps1') `
  -NoRun `
  -Node $script:CheckNode `
  -Scope $script:CheckScope `
  -RepoRoot $script:CheckRepoRoot `
  -SpineSourceRepo $script:CheckSpineSourceRepo `
  -UserProfileRoot $script:CheckUserProfileRoot `
  -LocalAppDataRoot $script:CheckLocalAppDataRoot `
  -FreebuffRoot $script:CheckFreebuffRoot

function Get-DriftReason {
  param(
    [string]$Kind,
    [bool]$Exists,
    [string]$ExistingText
  )
  if (-not $Exists) {
    return 'missing'
  }
  switch ($Kind) {
    'md' {
      $hasStart = $ExistingText.Contains('<!-- TROLLZ1004-SPINE:START -->')
      $hasEnd = $ExistingText.Contains('<!-- TROLLZ1004-SPINE:END -->')
      if (-not $hasStart -or -not $hasEnd) { return 'missing-block' }
      return 'drifted'
    }
    'toml' {
      $hasStart = $ExistingText.Contains('# --- TROLLZ1004-SPINE:START ---')
      $hasEnd = $ExistingText.Contains('# --- TROLLZ1004-SPINE:END ---')
      if (-not $hasStart -or -not $hasEnd) { return 'missing-block' }
      return 'drifted'
    }
    'yaml' {
      $hasStart = $ExistingText.Contains('# --- TROLLZ1004-SPINE:START ---')
      $hasEnd = $ExistingText.Contains('# --- TROLLZ1004-SPINE:END ---')
      $hasTop = ($ExistingText -match '(?m)^trollz1004_spine\s*:')
      if ((-not $hasStart -or -not $hasEnd) -and -not $hasTop) { return 'missing-block' }
      return 'drifted'
    }
    'json' {
      try {
        $parsed = $ExistingText | ConvertFrom-Json
        if ($null -eq $parsed) { return 'missing-block' }
        $hasStart = $null -ne $parsed.PSObject.Properties['_trollz1004_spine_start']
        $hasSpine = $null -ne $parsed.PSObject.Properties['trollz1004_spine']
        $hasEnd = $null -ne $parsed.PSObject.Properties['_trollz1004_spine_end']
        if (-not ($hasStart -and $hasSpine -and $hasEnd)) { return 'missing-block' }
        return 'drifted'
      } catch {
        if ($ExistingText -notmatch '"trollz1004_spine"') { return 'missing-block' }
        return 'drifted'
      }
    }
    default {
      return 'drifted'
    }
  }
}

function Invoke-CheckTargetDrift {
  param(
    [string]$FilePath,
    [string]$DisplayPath,
    [string]$Kind,
    [object]$Ctx,
    [ValidateSet('repo', 'node')]
    [string]$RenderScope
  )
  $exists = Test-Path -LiteralPath $FilePath
  $existingText = if ($exists) { [System.IO.File]::ReadAllText($FilePath, $Utf8NoBom) } else { '' }

  if (Test-PrivateProjectFile -FullPath $FilePath -ExistingText $existingText) {
    return [PSCustomObject]@{
      File = $DisplayPath
      Status = 'skipped-private'
      Reason = $null
    }
  }

  if (-not $exists) {
    return [PSCustomObject]@{
      File = $DisplayPath
      Status = 'drifted'
      Reason = 'missing'
    }
  }

  try {
    $res = Invoke-RenderTargetFile -FilePath $FilePath -Kind $Kind -Ctx $Ctx -RenderScope $RenderScope -IsApply $false
    if ($res.Action -eq 'skipped-private') {
      return [PSCustomObject]@{
        File = $DisplayPath
        Status = 'skipped-private'
        Reason = $null
      }
    }
    if ($res.Changed) {
      $reason = Get-DriftReason -Kind $Kind -Exists $true -ExistingText $existingText
      return [PSCustomObject]@{
        File = $DisplayPath
        Status = 'drifted'
        Reason = $reason
      }
    }
    return [PSCustomObject]@{
      File = $DisplayPath
      Status = 'clean'
      Reason = $null
    }
  } catch {
    $reason = Get-DriftReason -Kind $Kind -Exists $true -ExistingText $existingText
    return [PSCustomObject]@{
      File = $DisplayPath
      Status = 'drifted'
      Reason = $reason
    }
  }
}

function Get-AgentDriftReport {
  param(
    [ValidateSet('alienware', 't5500')]
    [string]$Node = $script:CheckNode,

    [ValidateSet('all', 'repo', 'node')]
    [string]$Scope = $script:CheckScope,

    [string]$RepoRoot = $script:CheckRepoRoot,

    [string]$SpineSourceRepo = $script:CheckSpineSourceRepo,

    [string]$UserProfileRoot = $script:CheckUserProfileRoot,

    [string]$LocalAppDataRoot = $script:CheckLocalAppDataRoot,

    [string]$FreebuffRoot = $script:CheckFreebuffRoot
  )

  $resolvedSpineRepo = Resolve-SpineSourceRepoPath -Explicit $SpineSourceRepo -TargetRepo $RepoRoot -ProfileRoot $UserProfileRoot
  $repoName = if (Test-Path -LiteralPath $RepoRoot) { Resolve-CanonicalRepoName -TargetRepo $RepoRoot } else { 'dream-online' }
  $ctx = Get-SpineContext -SourceRepo $resolvedSpineRepo -TargetNode $Node -TargetRepoName $repoName

  $scanned = 0
  $skippedPrivate = New-Object System.Collections.Generic.List[string]
  $driftedFiles = New-Object System.Collections.Generic.List[object]

  if ($Scope -eq 'all' -or $Scope -eq 'repo') {
    if (-not (Test-Path -LiteralPath $RepoRoot)) {
      throw "RepoRoot not found: $RepoRoot"
    }
    $repoTargets = @(Get-RepoTargetFiles -TargetRepoRoot $RepoRoot)
    foreach ($t in $repoTargets) {
      $scanned++
      $itemResult = Invoke-CheckTargetDrift -FilePath $t.FullPath -DisplayPath $t.RelPath -Kind $t.Kind -Ctx $ctx -RenderScope 'repo'
      if ($itemResult.Status -eq 'skipped-private') {
        $skippedPrivate.Add($itemResult.File)
      } elseif ($itemResult.Status -eq 'drifted') {
        $driftedFiles.Add([ordered]@{
          file = $itemResult.File
          reason = $itemResult.Reason
        })
      }
    }
  }

  if ($Scope -eq 'all' -or $Scope -eq 'node') {
    $nodeTargets = @(Get-NodeTargetFiles -TargetNode $Node -ProfileRoot $UserProfileRoot -LocalAppRoot $LocalAppDataRoot -FreebuffDir $FreebuffRoot -IncludeAbsentDirsForPreview $false)
    foreach ($t in $nodeTargets) {
      $scanned++
      $portable = ConvertTo-PortablePath -InputPath $t.FullPath
      $itemResult = Invoke-CheckTargetDrift -FilePath $t.FullPath -DisplayPath $portable -Kind $t.Kind -Ctx $ctx -RenderScope 'node'
      if ($itemResult.Status -eq 'skipped-private') {
        $skippedPrivate.Add($itemResult.File)
      } elseif ($itemResult.Status -eq 'drifted') {
        $driftedFiles.Add([ordered]@{
          file = $itemResult.File
          reason = $itemResult.Reason
        })
      }
    }
  }

  $driftedCount = $driftedFiles.Count
  $isOk = ($driftedCount -eq 0)
  $light = if ($isOk) { 'green' } else { 'amber' }
  $checkedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

  return [PSCustomObject]@{
    checkedAt = $checkedAt
    node = $Node
    scope = $Scope
    ok = $isOk
    light = $light
    driftedCount = $driftedCount
    driftedFiles = @($driftedFiles.ToArray())
    scannedCount = $scanned
    skippedPrivateCount = $skippedPrivate.Count
    skippedPrivateFiles = @($skippedPrivate.ToArray())
  }
}

function ConvertTo-AgentDriftJson {
  param([object]$Report)
  $entries = New-Object System.Collections.Generic.List[string]
  foreach ($item in @($Report.driftedFiles)) {
    $entryObj = [ordered]@{
      file = [string]$item.file
      reason = [string]$item.reason
    }
    $entries.Add(($entryObj | ConvertTo-Json -Compress))
  }
  $driftedJsonArray = if ($entries.Count -eq 0) {
    '[]'
  } else {
    "[" + [Environment]::NewLine + "    " + ($entries -join ("," + [Environment]::NewLine + "    ")) + [Environment]::NewLine + "  ]"
  }
  $headerObj = [ordered]@{
    checkedAt = [string]$Report.checkedAt
    node = [string]$Report.node
    ok = [bool]$Report.ok
    light = [string]$Report.light
    driftedCount = [int]$Report.driftedCount
  }
  $okText = if ($headerObj.ok) { 'true' } else { 'false' }
  $lines = @(
    '{'
    ('  "checkedAt": {0},' -f ($headerObj.checkedAt | ConvertTo-Json -Compress))
    ('  "node": {0},' -f ($headerObj.node | ConvertTo-Json -Compress))
    ('  "ok": {0},' -f $okText)
    ('  "light": {0},' -f ($headerObj.light | ConvertTo-Json -Compress))
    ('  "driftedCount": {0},' -f $headerObj.driftedCount)
    ('  "driftedFiles": {0}' -f $driftedJsonArray)
    '}'
  )
  return ($lines -join "`n") + "`n"
}

function Write-AgentDriftStatus {
  param(
    [object]$Report,
    [string]$Path = $script:CheckStatusJsonPath
  )
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  $parentDir = Split-Path -Parent $Path
  if ($parentDir -and -not (Test-Path -LiteralPath $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
  }
  $jsonText = ConvertTo-AgentDriftJson -Report $Report
  [System.IO.File]::WriteAllText($Path, $jsonText, $Utf8NoBom)
}

function Invoke-CheckAgentDriftMain {
  $report = Get-AgentDriftReport `
    -Node $script:CheckNode `
    -Scope $script:CheckScope `
    -RepoRoot $script:CheckRepoRoot `
    -SpineSourceRepo $script:CheckSpineSourceRepo `
    -UserProfileRoot $script:CheckUserProfileRoot `
    -LocalAppDataRoot $script:CheckLocalAppDataRoot `
    -FreebuffRoot $script:CheckFreebuffRoot

  $script:LastDriftReport = $report

  foreach ($priv in @($report.skippedPrivateFiles)) {
    Write-Output "[SKIP private-project] $priv"
  }
  foreach ($d in @($report.driftedFiles)) {
    Write-Output ("[DRIFT] ({0}) {1}" -f $d.reason, $d.file)
  }

  if (-not $script:CheckNoWriteStatus) {
    Write-AgentDriftStatus -Report $report -Path $script:CheckStatusJsonPath
    $portableStatus = ConvertTo-PortablePath -InputPath $script:CheckStatusJsonPath
    Write-Output "[STATUS] Wrote $portableStatus"
  } else {
    Write-Output "[STATUS] Skipped writing status (-NoWriteStatus)"
  }

  $okStr = if ($report.ok) { 'true' } else { 'false' }
  Write-Output ("[CHECK] Summary (Node={0}, Scope={1}): light={2}, ok={3}, scanned={4}, drifted={5}, skippedPrivate={6}" -f $report.node, $report.scope, $report.light, $okStr, $report.scannedCount, $report.driftedCount, $report.skippedPrivateCount)
}

if (-not $script:CheckNoRun) {
  Invoke-CheckAgentDriftMain
  if ($null -ne $script:LastDriftReport -and $script:LastDriftReport.driftedCount -gt 0 -and -not $script:CheckSoftExit) {
    exit 1
  }
  exit 0
}
