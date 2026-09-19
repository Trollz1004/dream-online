<#
.SYNOPSIS
  Alienware node deterministic health probe. No AI CLI is invoked anywhere in this script. It is
  plain Windows PowerShell 5.1 code with no modules: it probes, logs, and on a failed required
  service runs the node's own bring-up (hermes\scripts\dream-stack.ps1 -Once) one time.

.DESCRIPTION
  Runs every 30 minutes from the scheduled task "DREAM-Alienware-Health" and on demand as
  `drift health`. Every probe is an identity check: a port answering is never proof of a service.
  States: UP, DOWN, WRONG SERVICE, AUTH MISSING, AUTH REJECTED.

  Outputs, all beside this script in .\heartbeat (gitignored):
    alienware-health.json   the last snapshot, overall GREEN, YELLOW or RED
    health.log              one line per run
    TRIGGERS.jsonl          one line per failure the bring-up was asked to clear; the launch
                            skill reads this first on every `drift`

  Groups: "required" services are local and trigger the bring-up when they fail. "optional" are
  local and only reported. "remote" live on Sabretooth (192.168.0.8); this node reports them and
  never tries to heal them. OmniRoute is remote only: nothing on this node serves port 20128.

  There is deliberately no unattended model run and no command read from a flag file here.

  -Verbose  print the table (used by `drift health`)
  -NoHeal   probe and report only, never run the bring-up
  -NoRun    define the functions and return (used by the Pester tests)
#>
[CmdletBinding()]
param(
  [switch]$NoHeal,
  [switch]$NoRun
)

$ErrorActionPreference = 'Continue'

$script:NodeName = 'alienware'
$script:NodeLan = '192.168.0.40'
$script:ProbeTimeoutSec = 6
$script:StackScript = 'C:\DREAM\hermes\scripts\dream-stack.ps1'

function Get-NowZ { (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }

function Get-Targets {
  # Identity strings verified against the live services on 2026-09-19.
  @(
    [pscustomobject]@{ name = 'live_npc_lab_9127';      group = 'required'; url = 'http://127.0.0.1:9127/health';        mustContain = 'dream-live-npc-lab' }
    [pscustomobject]@{ name = 'dreamops_bridge_9133';   group = 'required'; url = 'http://127.0.0.1:9133/health';        mustContain = 'dreamops-bridge' }
    [pscustomobject]@{ name = 'hermes_dashboard_9119';  group = 'optional'; url = 'http://127.0.0.1:9119/api/health';    mustContain = '"ok":true' }
    [pscustomobject]@{ name = 'ollama_11434';           group = 'optional'; url = 'http://127.0.0.1:11434/api/tags';     mustContain = '"models":[' }
    [pscustomobject]@{ name = 'jarvis_hud_9150';        group = 'optional'; url = 'http://127.0.0.1:9150/health';        mustContain = 'airi-dashboard' }
    [pscustomobject]@{ name = 'crosslisting_3000';      group = 'optional'; url = 'http://127.0.0.1:3000/';              mustContain = '<div id="root">' }
    [pscustomobject]@{ name = 'omniroute_sabretooth';   group = 'remote';   url = 'http://192.168.0.8:20128/v1/models';  mustContain = '"data":[' }
    [pscustomobject]@{ name = 'jarvis_sabretooth_9150'; group = 'remote';   url = 'http://192.168.0.8:9150/health';      mustContain = 'jarvis-dashboard' }
  )
}

function Get-ProbeState {
  param([int]$StatusCode, [string]$Body, [string]$MustContain)
  if ($StatusCode -eq 0) { return 'DOWN' }
  if ($StatusCode -eq 401) { return 'AUTH MISSING' }
  if ($StatusCode -eq 403) { return 'AUTH REJECTED' }
  if ($StatusCode -eq 200 -and $Body -and $Body.Contains($MustContain)) { return 'UP' }
  'WRONG SERVICE'
}

function Invoke-Probe {
  param($Target)
  $code = 0; $body = ''; $detail = ''
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $r = Invoke-WebRequest -Uri $Target.url -UseBasicParsing -TimeoutSec $script:ProbeTimeoutSec -ErrorAction Stop -Verbose:$false
    $code = [int]$r.StatusCode
    $body = [string]$r.Content
  } catch {
    $detail = $_.Exception.Message
    if ($_.Exception.Response) { try { $code = [int]$_.Exception.Response.StatusCode } catch { $code = 0 } }
  }
  $sw.Stop()
  $state = Get-ProbeState -StatusCode $code -Body $body -MustContain $Target.mustContain
  if ($state -eq 'UP') { $detail = 'identity ok' }
  elseif ($state -eq 'WRONG SERVICE') { $detail = "HTTP $code, identity '$($Target.mustContain)' not found" }
  elseif (-not $detail) { $detail = "HTTP $code" }
  [pscustomobject]@{ name = $Target.name; group = $Target.group; status = $state; detail = $detail; ms = [int]$sw.ElapsedMilliseconds }
}

function Get-GitState {
  param([string]$Path, [string]$Branch = 'main')
  $result = [ordered]@{ path = $Path; branch = $null; head = $null; origin = $null; tracked_dirty_lines = $null; equal_to_origin = $null }
  if (-not (Test-Path -LiteralPath (Join-Path $Path '.git'))) { $result.detail = 'not a git checkout'; return $result }
  try {
    # No fetch here on purpose: the probe stays offline and deterministic. origin/<branch> is as fresh as the last fetch.
    $result.branch = (& git -C $Path rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
    $result.head = (& git -C $Path rev-parse HEAD 2>$null | Out-String).Trim()
    $result.origin = (& git -C $Path rev-parse "origin/$Branch" 2>$null | Out-String).Trim()
    $result.tracked_dirty_lines = @(& git -C $Path status --porcelain --untracked-files=no 2>$null).Count
    $result.equal_to_origin = [bool]($result.head -and $result.origin -and ($result.head -eq $result.origin))
  } catch { $result.detail = $_.Exception.Message }
  $result
}

function Get-Overall {
  param($Results, [bool]$GitOk)
  if (@($Results | Where-Object { $_.group -eq 'required' -and $_.status -ne 'UP' }).Count -gt 0) { return 'RED' }
  if (@($Results | Where-Object { $_.status -ne 'UP' }).Count -gt 0) { return 'YELLOW' }
  if (-not $GitOk) { return 'YELLOW' }
  'GREEN'
}

function Get-HealNeeded {
  param($Results)
  [bool](@($Results | Where-Object { $_.group -eq 'required' -and $_.status -ne 'UP' }).Count -gt 0)
}

function New-TriggerLine {
  param([string[]]$Stages, [string]$Detail)
  [ordered]@{ ts = Get-NowZ; node = $script:NodeName; kind = 'stage_failed'; stages = @($Stages); detail = $Detail } | ConvertTo-Json -Compress -Depth 4
}

function Invoke-ProbePass { foreach ($t in Get-Targets) { Invoke-Probe -Target $t } }

function ConvertTo-Snapshot {
  param($Results, $Git, [string]$Overall, [bool]$Healed)
  $groups = [ordered]@{ required = [ordered]@{}; optional = [ordered]@{}; remote = [ordered]@{} }
  foreach ($r in $Results) { $groups[$r.group][$r.name] = [ordered]@{ status = $r.status; detail = $r.detail; ms = $r.ms } }
  [ordered]@{
    ts = Get-NowZ; node = $script:NodeName; lan = $script:NodeLan
    required = $groups.required; optional = $groups.optional; remote = $groups.remote
    git = [ordered]@{ dream_online = $Git }
    bring_up_ran = $Healed
    overall = $Overall
  }
}

function Show-Table {
  param($Snapshot)
  Write-Host ''
  Write-Host ("ALIENWARE health at {0}, overall {1}" -f $Snapshot.ts, $Snapshot.overall) -ForegroundColor Cyan
  foreach ($g in 'required', 'optional', 'remote') {
    Write-Host ("-- {0} --" -f $g) -ForegroundColor DarkGray
    foreach ($k in $Snapshot[$g].Keys) {
      $v = $Snapshot[$g][$k]
      $color = if ($v.status -eq 'UP') { 'Green' } elseif ($g -eq 'required') { 'Red' } else { 'Yellow' }
      Write-Host ("  {0,-24} {1,-14} {2}" -f $k, $v.status, $v.detail) -ForegroundColor $color
    }
  }
  $git = $Snapshot.git.dream_online
  Write-Host ("git dream-online: branch {0}, {1} changed tracked files, equal to origin/main: {2}" -f $git.branch, $git.tracked_dirty_lines, $git.equal_to_origin) -ForegroundColor DarkGray
  if ($Snapshot.bring_up_ran) { Write-Host 'The bring-up ran once during this pass.' -ForegroundColor DarkYellow }
  Write-Host ''
}

function Invoke-HealthMain {
  $nodeDir = Split-Path -Parent $PSCommandPath
  $repoRoot = Split-Path -Parent (Split-Path -Parent $nodeDir)
  $heartbeat = Join-Path $nodeDir 'heartbeat'
  New-Item -ItemType Directory -Force -Path $heartbeat | Out-Null
  $jsonOut = Join-Path $heartbeat 'alienware-health.json'
  $logOut = Join-Path $heartbeat 'health.log'
  $triggersOut = Join-Path $heartbeat 'TRIGGERS.jsonl'

  # Localhost probes must never go through a system proxy.
  [System.Net.WebRequest]::DefaultWebProxy = $null

  $results = @(Invoke-ProbePass)
  $healed = $false
  if ((Get-HealNeeded -Results $results) -and -not $NoHeal) {
    $failed = @($results | Where-Object { $_.group -eq 'required' -and $_.status -ne 'UP' })
    $detail = ($failed | ForEach-Object { "$($_.name)=$($_.status): $($_.detail)" }) -join '; '
    Add-Content -LiteralPath $triggersOut -Value (New-TriggerLine -Stages @($failed | ForEach-Object { $_.name }) -Detail $detail) -Encoding UTF8
    if (Test-Path -LiteralPath $script:StackScript) {
      try { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script:StackScript -Once | Out-Null } catch { Write-Verbose "bring-up errored: $($_.Exception.Message)" }
      $healed = $true
      Start-Sleep -Seconds 8
      $results = @(Invoke-ProbePass)
    }
  }

  $git = Get-GitState -Path $repoRoot -Branch 'main'
  $gitOk = [bool]($git.equal_to_origin -and ($git.tracked_dirty_lines -eq 0))
  $overall = Get-Overall -Results $results -GitOk $gitOk
  $snapshot = ConvertTo-Snapshot -Results $results -Git $git -Overall $overall -Healed $healed

  $snapshot | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $jsonOut -Encoding UTF8
  $summary = ($results | ForEach-Object { "$($_.name):$($_.status)" }) -join ' '
  Add-Content -LiteralPath $logOut -Value ("[{0}] ALIENWARE {1} | {2}" -f (Get-NowZ), $overall, $summary) -Encoding UTF8

  if ($VerbosePreference -ne 'SilentlyContinue') { Show-Table -Snapshot $snapshot }
}

if (-not $NoRun) { Invoke-HealthMain; exit 0 }
