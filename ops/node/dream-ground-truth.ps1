<#
.SYNOPSIS
  Prints the true state of the DREAM work on this node, read from the machine
  rather than from any note. Plain Windows PowerShell 5.1, no modules, no AI call.

.DESCRIPTION
  The health probe answers "are the services up". This answers the other question,
  the one that kept costing sessions: "is what the records say still true, and is
  anything half-finished".

  Every session on 2026-09-19, 20 and 21 lost time to the same four things. Work
  was left uncommitted between sessions. The dispatch still described Unreal after
  the engine changed. The README pointed at ports nothing serves. And a note was
  trusted over the machine, then a true line was removed because nobody checked it.
  Each of those is visible in one command, so it should be one command.

  States: PASS, CURRENT, STALE, MISSING, DIRTY, BROKEN.
  Overall: GREEN (all good), YELLOW (something stale), RED (dirty or broken).

  -NoRun   define the functions and return, for the Pester tests
#>
[CmdletBinding()]
param(
  [switch]$NoRun
)

$ErrorActionPreference = 'Continue'

$script:Repo = 'C:\DREAM\dream-online'
$script:VaultPath = 'C:\DREAM\dream-online\DREAM-ONLINE'
$script:McpUrl = 'http://127.0.0.1:27123/mcp'


# Reads the newest dated "## 2026-09-21 ..." heading out of a records file. The
# newest date wins even when the headings are not in order, because a session that
# appends in the wrong place should not make a record look older than it is.
function Get-NewestRecordDate {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) { return $null }

  $newest = $null
  foreach ($line in (Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue)) {
    # Either a dated heading, or an explicit "Last updated: 2026-09-21" marker for
    # records whose headings are words rather than dates, such as the dispatch.
    if ($line -match '^#{1,6}\s+(\d{4})-(\d{2})-(\d{2})' -or
        $line -match '^\s*Last updated:\s*(\d{4})-(\d{2})-(\d{2})') {
      # Built from the captured numbers rather than parsed from a string.
      # [datetime]::TryParseExact needs a [ref] out-parameter that Windows
      # PowerShell 5.1 will not bind from script, which cost a red run here.
      try {
        $candidate = Get-Date -Year ([int]$matches[1]) -Month ([int]$matches[2]) `
          -Day ([int]$matches[3]) -Hour 0 -Minute 0 -Second 0
        if ($null -eq $newest -or $candidate -gt $newest) { $newest = $candidate }
      } catch {
        # A heading that looks like a date but is not one is skipped, not fatal.
      }
    }
  }
  return $newest
}


# Two copies of a protected file must be byte-identical. A missing copy is not in
# sync; it is never an error to report, because reporting is the whole job here.
function Test-CopiesInSync {
  param(
    [Parameter(Mandatory = $true)][string]$First,
    [Parameter(Mandatory = $true)][string]$Second
  )

  if (-not (Test-Path -LiteralPath $First)) { return $false }
  if (-not (Test-Path -LiteralPath $Second)) { return $false }

  $a = (Get-FileHash -LiteralPath $First -Algorithm SHA256).Hash
  $b = (Get-FileHash -LiteralPath $Second -Algorithm SHA256).Hash
  return ($a -eq $b)
}


# A record is stale when code landed after the record was last written. Same day
# counts as current: a record written today describes today's work.
function Get-StalenessVerdict {
  param($RecordDate, $CommitDate)

  if ($null -eq $RecordDate) { return 'MISSING' }
  if ($null -eq $CommitDate) { return 'CURRENT' }
  if ($RecordDate.Date -lt $CommitDate.Date) { return 'STALE' }
  return 'CURRENT'
}


# git's answer can arrive wrapped in the quotes PowerShell left on the format
# string, so the digits are picked out rather than the whole string parsed.
function ConvertTo-CommitDate {
  param([string]$Text)

  if (-not $Text) { return $null }
  if ($Text -notmatch '(\d{4})-(\d{2})-(\d{2})') { return $null }
  try {
    return Get-Date -Year ([int]$matches[1]) -Month ([int]$matches[2]) `
      -Day ([int]$matches[3]) -Hour 0 -Minute 0 -Second 0
  } catch {
    return $null
  }
}


function Format-Date {
  param($Value)
  if ($null -eq $Value) { return 'unknown' }
  return $Value.ToString('yyyy-MM-dd')
}


function Format-Line {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$State,
    [string]$Detail = ''
  )
  return ('{0,8}  {1,-22}  {2}' -f $State, $Name, $Detail).TrimEnd()
}


function Get-OverallVerdict {
  param([string[]]$States)

  if ($States -contains 'BROKEN' -or $States -contains 'DIRTY') { return 'RED' }
  if ($States -contains 'STALE' -or $States -contains 'MISSING') { return 'YELLOW' }
  return 'GREEN'
}


function Get-RepoState {
  param([string]$Path = $script:Repo)

  $porcelain = & git -C $Path status --porcelain 2>$null
  $dirty = @($porcelain | Where-Object { $_ -ne '' })

  $behindAhead = & git -C $Path rev-list --left-right --count 'origin/main...main' 2>$null
  $behind = 0
  $ahead = 0
  if ($behindAhead -match '^(\d+)\s+(\d+)$') {
    $behind = [int]$matches[1]
    $ahead = [int]$matches[2]
  }

  # --date=short, not --date=format:..., because git's strftime does not know
  # yyyy-MM-dd and hands back that literal string, which then parses as nothing.
  $iso = & git -C $Path log -1 --format=%ad --date=short 2>$null
  $lastCommit = ConvertTo-CommitDate -Text ($iso | Out-String)

  return [pscustomobject]@{
    DirtyCount = $dirty.Count
    DirtyFiles = $dirty
    Ahead      = $ahead
    Behind     = $behind
    LastCommit = $lastCommit
  }
}


# An MCP endpoint is judged by a real initialize handshake. A port answering, or a
# 200 on the root, has never been proof of anything on this node.
function Test-McpEndpoint {
  param([string]$Url = $script:McpUrl)

  $pluginData = Join-Path $script:VaultPath '.obsidian\plugins\obsidian-local-rest-api\data.json'
  if (-not (Test-Path -LiteralPath $pluginData)) {
    return [pscustomobject]@{ State = 'BROKEN'; Detail = 'the Local REST API plugin data is not on disk' }
  }

  try {
    $key = (Get-Content -LiteralPath $pluginData -Raw | ConvertFrom-Json).apiKey
  } catch {
    return [pscustomobject]@{ State = 'BROKEN'; Detail = 'the plugin data would not parse' }
  }
  if (-not $key) {
    return [pscustomobject]@{ State = 'BROKEN'; Detail = 'the plugin holds no API key' }
  }

  $body = @{
    jsonrpc = '2.0'; id = 1; method = 'initialize'
    params  = @{ protocolVersion = '2025-06-18'; capabilities = @{}
      clientInfo = @{ name = 'dream-ground-truth'; version = '1.0' }
    }
  } | ConvertTo-Json -Depth 6

  try {
    $resp = Invoke-WebRequest -Uri $Url -Method Post -Body $body -TimeoutSec 8 -UseBasicParsing -Headers @{
      Authorization  = "Bearer $key"
      'Content-Type' = 'application/json'
      Accept         = 'application/json, text/event-stream'
    }
  } catch {
    return [pscustomobject]@{ State = 'BROKEN'; Detail = "no handshake: $($_.Exception.Message)" }
  }

  if ($resp.Content -match '"serverInfo"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"') {
    return [pscustomobject]@{ State = 'PASS'; Detail = "handshake ok, server is $($matches[1])" }
  }
  return [pscustomobject]@{ State = 'BROKEN'; Detail = 'answered, but not as an MCP server' }
}


function Invoke-GroundTruth {
  $states = @()
  $lines = @()

  $repo = Get-RepoState
  if ($repo.DirtyCount -gt 0) {
    $states += 'DIRTY'
    $names = ($repo.DirtyFiles | Select-Object -First 4 | ForEach-Object { $_.Trim() }) -join '; '
    $lines += Format-Line -Name 'working tree' -State 'DIRTY' -Detail (
      "$($repo.DirtyCount) file(s) not committed: $names")
  } else {
    $states += 'PASS'
    $lines += Format-Line -Name 'working tree' -State 'PASS' -Detail 'clean'
  }

  if ($repo.Ahead -gt 0 -or $repo.Behind -gt 0) {
    $states += 'DIRTY'
    $lines += Format-Line -Name 'origin/main' -State 'DIRTY' -Detail (
      "ahead $($repo.Ahead), behind $($repo.Behind): push or pull before working")
  } else {
    $states += 'PASS'
    $lines += Format-Line -Name 'origin/main' -State 'PASS' -Detail 'equal'
  }

  $records = @{
    'journal'  = Join-Path $script:Repo 'ops\node\JOURNAL.md'
    'dispatch' = Join-Path $script:Repo 'docs\DREAM-DISPATCH.md'
  }
  foreach ($name in ($records.Keys | Sort-Object)) {
    $recordDate = Get-NewestRecordDate -Path $records[$name]
    $verdict = Get-StalenessVerdict -RecordDate $recordDate -CommitDate $repo.LastCommit
    $states += $verdict
    $shown = if ($recordDate) { Format-Date -Value $recordDate } else { 'no dated heading' }
    $lines += Format-Line -Name $name -State $verdict -Detail (
      "last written $shown, newest commit $(Format-Date -Value $repo.LastCommit)")
  }

  $pairs = @(
    @{ Name = 'drift.cmd copies'; A = (Join-Path $script:Repo 'ops\node\drift.cmd')
       B = (Join-Path $env:USERPROFILE '.local\bin\drift.cmd') },
    @{ Name = 'launch skill copies'; A = (Join-Path $script:Repo 'ops\node\skills\alienware-node\SKILL.md')
       B = (Join-Path $env:USERPROFILE '.claude\skills\alienware-node\SKILL.md') }
  )
  foreach ($pair in $pairs) {
    if (Test-CopiesInSync -First $pair.A -Second $pair.B) {
      $states += 'PASS'
      $lines += Format-Line -Name $pair.Name -State 'PASS' -Detail 'byte-identical'
    } else {
      $states += 'BROKEN'
      $lines += Format-Line -Name $pair.Name -State 'BROKEN' -Detail 'the installed copy differs; re-sync it'
    }
  }

  $mcp = Test-McpEndpoint
  $states += $mcp.State
  $lines += Format-Line -Name 'obsidian MCP' -State $mcp.State -Detail $mcp.Detail

  # Returned as one object, never written to the pipeline alongside the report.
  # A function that emits its display lines and its verdict down the same pipe
  # hands the caller an array where it expected a word, and the caller silently
  # gets it wrong. That happened here on 2026-09-21.
  return [pscustomobject]@{
    Lines   = $lines
    Overall = Get-OverallVerdict -States $states
  }
}


function Show-GroundTruth {
  $report = Invoke-GroundTruth

  Write-Output ''
  Write-Output "DREAM ground truth, read from this machine at $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  Write-Output ''
  $report.Lines | ForEach-Object { Write-Output $_ }
  Write-Output ''
  Write-Output "  overall: $($report.Overall)"
  Write-Output ''
  if ($report.Overall -ne 'GREEN') {
    Write-Output '  Fix what is flagged before starting new work. A flagged line is'
    Write-Output '  cheaper now than a session spent re-deriving it later.'
    Write-Output ''
  }

  return $report.Overall
}


if ($NoRun) { return }

$report = Invoke-GroundTruth
Write-Host ''
Write-Host "DREAM ground truth, read from this machine at $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host ''
$report.Lines | ForEach-Object { Write-Host $_ }
Write-Host ''
Write-Host "  overall: $($report.Overall)"
Write-Host ''
if ($report.Overall -ne 'GREEN') {
  Write-Host '  Fix what is flagged before starting new work. A flagged line is'
  Write-Host '  cheaper now than a session spent re-deriving it later.'
  Write-Host ''
}

if ($report.Overall -eq 'RED') { exit 2 }
if ($report.Overall -eq 'YELLOW') { exit 1 }
exit 0
