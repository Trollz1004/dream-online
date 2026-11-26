<#
.SYNOPSIS
  Renders canonical Trollz1004 Spine managed blocks across repo and node agent files.
  Windows PowerShell 5.1 compatible. Defaults to [DRY RUN] unless -Apply is passed.
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

  [switch]$Apply,

  [switch]$RemoteExecuted,

  [switch]$NoRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$EmDash = [string][char]0x2014

function ConvertTo-PortablePath {
  param([string]$InputPath)
  if ([string]::IsNullOrEmpty($InputPath)) { return $InputPath }
  $out = $InputPath
  if (-not [string]::IsNullOrEmpty($LocalAppDataRoot)) {
    $normLocal = $LocalAppDataRoot.TrimEnd('\', '/')
    if ($out.StartsWith($normLocal, [System.StringComparison]::OrdinalIgnoreCase)) {
      $out = '%LOCALAPPDATA%' + $out.Substring($normLocal.Length)
    }
  }
  if (-not [string]::IsNullOrEmpty($UserProfileRoot)) {
    $normProfile = $UserProfileRoot.TrimEnd('\', '/')
    if ($out.StartsWith($normProfile, [System.StringComparison]::OrdinalIgnoreCase)) {
      $out = '%USERPROFILE%' + $out.Substring($normProfile.Length)
    }
  }
  $out = [regex]::Replace($out, '(?i)(?<![A-Za-z0-9])[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"' + "'" + '`|)\]]+', '%USERPROFILE%')
  return $out
}

function Protect-DiffText {
  param([string]$Text)
  if ([string]::IsNullOrEmpty($Text)) { return $Text }
  $s = ConvertTo-PortablePath -InputPath $Text
  $s = [regex]::Replace($s, '(?<![A-Za-z0-9])sk-(?:ant-|proj-)?[A-Za-z0-9_-]{8,}', '[REDACTED]')
  $s = [regex]::Replace($s, '(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{12,}', '[REDACTED]')
  $s = [regex]::Replace($s, '(?<![A-Za-z0-9])(?:gh[opsur]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,})', '[REDACTED]')
  $s = [regex]::Replace($s, '(?<![A-Za-z0-9_-])(?:EAAA[A-Za-z0-9_-]{16,}|(?:sandbox-)?sq0(?:atp|atb|csp)-[A-Za-z0-9_-]{12,})', '[REDACTED]')
  $s = [regex]::Replace($s, '(?<![A-Za-z0-9_-])A21AA[A-Za-z0-9_-]{16,}', '[REDACTED]')
  $s = [regex]::Replace($s, '\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}', '[REDACTED]')
  $s = [regex]::Replace($s, '(?i)(Bearer\s+)[A-Za-z0-9._-]+', '$1[REDACTED]')
  $s = [regex]::Replace($s, '(?i)\b((?:api[_-]?key|apikey|token|secret|password|passwd|auth)[A-Za-z_]*\s*[=:]\s*[''"]?)[^\s''",;)\]}]+', '$1[REDACTED]')
  return $s
}

function Test-PrivateProjectFile {
  param(
    [string]$FullPath,
    [string]$ExistingText
  )
  if ($FullPath -match '(?i)(nsfw|grin|mira)' -or $FullPath -match '^[dD]:[\\/]') {
    return $true
  }
  if (-not [string]::IsNullOrEmpty($ExistingText)) {
    $privContentPattern = '(?i)(\bD:[\\/]mira\b|Legal NSFW only|You''re\s+\*\*Mira\*\*|(?m)^\s*title:\s*Mira\b)'
    if ($ExistingText -match $privContentPattern) {
      return $true
    }
  }
  return $false
}

function Resolve-SpineSourceRepoPath {
  param(
    [string]$Explicit,
    [string]$TargetRepo,
    [string]$ProfileRoot
  )
  $candidates = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
    $candidates.Add($Explicit)
  } else {
    if (-not [string]::IsNullOrWhiteSpace($TargetRepo)) {
      $candidates.Add($TargetRepo)
      $parent = Split-Path -Parent $TargetRepo
      if ($parent) {
        $candidates.Add((Join-Path $parent 'dream-online'))
        $candidates.Add((Join-Path $parent 'wt-af-do-e1'))
        $candidates.Add((Join-Path $parent 'wt-af-do-e2'))
      }
    }
    $candidates.Add('C:\DREAM\dream-online')
    if (-not [string]::IsNullOrWhiteSpace($ProfileRoot)) {
      $candidates.Add((Join-Path $ProfileRoot 'antigravity\DREAM-Engine-runner'))
    }
  }

  foreach ($cand in $candidates) {
    if ([string]::IsNullOrWhiteSpace($cand) -or -not (Test-Path -LiteralPath $cand)) { continue }
    $fm = Join-Path $cand 'ops\fleet\fleet-map.json'
    $sp = Join-Path $cand 'docs\house\SPINE.md'
    if ((Test-Path -LiteralPath $fm) -and (Test-Path -LiteralPath $sp)) {
      return (Resolve-Path -LiteralPath $cand).Path
    }
  }

  $standaloneCandidates = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
    $standaloneCandidates.Add($Explicit)
  } elseif (-not [string]::IsNullOrWhiteSpace($TargetRepo)) {
    $standaloneCandidates.Add($TargetRepo)
  }
  foreach ($cand in $standaloneCandidates) {
    if ([string]::IsNullOrWhiteSpace($cand) -or -not (Test-Path -LiteralPath $cand)) { continue }
    $fm = Join-Path $cand 'ops\fleet\fleet-map.json'
    if (Test-Path -LiteralPath $fm) {
      return (Resolve-Path -LiteralPath $cand).Path
    }
  }

  throw 'Could not locate spine source repository containing ops/fleet/fleet-map.json.'
}

function Resolve-CanonicalRepoName {
  param([string]$TargetRepo)
  $resolved = (Resolve-Path -LiteralPath $TargetRepo).Path
  $gitEntry = Join-Path $resolved '.git'
  if (Test-Path -LiteralPath $gitEntry) {
    try {
      $originUrl = & git -C $resolved config --get remote.origin.url 2>$null
      if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($originUrl)) {
        $trimmed = $originUrl.Trim()
        if ($trimmed -match '([^/:]+?)(?:\.git)?$') {
          return $Matches[1]
        }
      }
    } catch {
      # Fall back to folder leaf when git remote is absent
    }
  }
  return (Split-Path -Leaf $resolved)
}

function Get-SpineContext {
  param(
    [string]$SourceRepo,
    [string]$TargetNode,
    [string]$TargetRepoName
  )
  $fleetPath = Join-Path $SourceRepo 'ops\fleet\fleet-map.json'
  $spinePath = Join-Path $SourceRepo 'docs\house\SPINE.md'

  $fleetRaw = [System.IO.File]::ReadAllText($fleetPath, $Utf8NoBom)
  $fleet = $fleetRaw | ConvertFrom-Json

  $spineDocPath = 'docs/house/SPINE.md'
  if ($fleet.PSObject.Properties['spine'] -and -not [string]::IsNullOrWhiteSpace([string]$fleet.spine)) {
    $spineDocPath = [string]$fleet.spine
  }

  $pointerNames = @('ADDRESS-DOCTRINE.md', 'NODES.md', 'PIPELINE.md', 'TRUSTED-MODELS.md', 'THE-HOUSE.md')
  $foundPointers = New-Object System.Collections.Generic.List[string]
  if (Test-Path -LiteralPath $spinePath) {
    $spineRaw = [System.IO.File]::ReadAllText($spinePath, $Utf8NoBom)
    foreach ($p in $pointerNames) {
      if ($spineRaw -match [regex]::Escape($p)) {
        $foundPointers.Add($p)
      }
    }
    if ($foundPointers.Count -eq 0) {
      throw "docs/house/SPINE.md at $SourceRepo did not list expected doctrine pointers."
    }
  } else {
    foreach ($p in $pointerNames) {
      $foundPointers.Add($p)
    }
  }

  $aw = $fleet.nodes.alienware
  $t5 = $fleet.nodes.t5500
  $nodeObj = $fleet.nodes.$TargetNode
  if (-not $nodeObj) {
    throw "Node '$TargetNode' not found in ops/fleet/fleet-map.json"
  }

  $localServices = @($fleet.services | Where-Object { $_.scope -eq 'this machine only' })
  $pgPort = 5432
  $rdPort = 6379
  $obPort = 27123
  foreach ($svc in $localServices) {
    if ($svc.id -like '*postgres*') { $pgPort = $svc.port }
    elseif ($svc.id -like '*redis*') { $rdPort = $svc.port }
    elseif ($svc.id -like '*obsidian*') { $obPort = $svc.port }
  }

  return [PSCustomObject]@{
    Fleet = $fleet
    Alienware = $aw
    T5500 = $t5
    NodeMeta = $nodeObj
    RepoName = $TargetRepoName
    SpineDocPath = $spineDocPath
    PointersText = ($foundPointers -join ', ')
    PostgresPort = $pgPort
    RedisPort = $rdPort
    ObsidianPort = $obPort
    McpCommand = 'cmd.exe'
    McpArgs = @('/d', '/c', 'node', '%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\kit\server.mjs')
    TrustedThreeIds = @('claude-opus-5.5', 'fable', 'gemini-4-carbon', 'gpt-6-astra', 'gpt-6.1-sol', 'codex')
  }
}

function Get-EolStyle {
  param([string]$Text, [string]$DefaultEol = "`n")
  if ([string]::IsNullOrEmpty($Text)) { return $DefaultEol }
  if ($Text.Contains("`r`n")) { return "`r`n" }
  return "`n"
}

function ConvertTo-TargetEol {
  param([string]$Text, [string]$Eol)
  $lf = $Text.Replace("`r`n", "`n")
  if ($Eol -eq "`r`n") {
    return $lf.Replace("`n", "`r`n")
  }
  return $lf
}

function Build-MarkdownManagedBlock {
  param(
    [object]$Ctx,
    [ValidateSet('repo', 'node')]
    [string]$RenderScope
  )
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('<!-- TROLLZ1004-SPINE:START -->')
  if ($RenderScope -eq 'node') {
    $harnesses = ($Ctx.NodeMeta.harnesses -join ', ')
    $lines.Add(('- `Node: {0} ({1}) {2} {3} | GitHub: {4} | Harnesses: {5} (ops/fleet/fleet-map.json).`' -f $Ctx.NodeMeta.name, $Ctx.NodeMeta.ip, $EmDash, $Ctx.NodeMeta.role, $Ctx.NodeMeta.githubAccount, $harnesses))
  } else {
    $lines.Add(('- `Repo: {0} | Fleet: {1} ({2}, {3}) & {4} ({5}, {6}) | GitHub: {7} (ops/fleet/fleet-map.json).`' -f $Ctx.RepoName, $Ctx.Alienware.name, $Ctx.Alienware.ip, $Ctx.Alienware.role, $Ctx.T5500.name, $Ctx.T5500.ip, $Ctx.T5500.role, $Ctx.Alienware.githubAccount))
  }
  $lines.Add(('- `Spine: Trollz1004/dream-online {0} (pointers: {1}).`' -f $Ctx.SpineDocPath, $Ctx.PointersText))
  $lines.Add(('- `Address doctrine: use {0} and {1} from ops/fleet/fleet-map.json; never use loopback reach URLs; Postgres (port {2}), Redis (port {3}), and Obsidian REST (port {4}) bind "127.0.0.1" on their own machine only.`' -f $Ctx.Alienware.ip, $Ctx.T5500.ip, $Ctx.PostgresPort, $Ctx.RedisPort, $Ctx.ObsidianPort))
  $lines.Add('- `Trusted three: Claude Opus 5.5 / Fable (Claude Code), Gemini 4 Carbon (agy), and GPT-6 Astra / GPT-6.1 Sol / Codex (Codex CLI); superpowers is in every kit on demand, while REA, remake, Agent-Reach, and last30days are locked to the trusted three.`')
  $lines.Add('- `Pipeline: brainstorm first, route role + <=2 skills, build [A]/[B] with failing test first, expediter rubric + 5 stacked add-on PRs, Carbon + Codex judge, Fable / rotating trusted-three merges green checks.`')
  $lines.Add('- `Starter kit MCP ("kit"): cmd.exe /d /c node "%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\kit\server.mjs" (tools: map_search, map_section, memory_search, memory_add, role_get, method_get).`')
  $lines.Add('- `First read: the house index, https://github.com/Trollz1004/dream-online/blob/main/docs/house/INDEX.md, then the newest rulings in the claude.ai project Ai-Dream-Team as the index describes.`')
  $lines.Add('- `Funding comes first and game work is paused (ruled 2026-11-13).`')
  $lines.Add('- `The wheel: tickets in the .fable-kitchen inbox on the Alienware; runner ops/router/inbox-runner.ts in dream-online; lane rules in orders/RULES.md in the kitchen.`')
  $lines.Add('- `Merging (ruled 2026-11-16): nothing merges with a failing required check; platform and marketing changes need the checks plus one trusted review; game and engine work keeps two offerings and two judges; whoever merges looks at the files and leaves a one-line verdict.`')
  $lines.Add('- `Public text passes the go gate: the product does what the text says, stop-slop plus a humanizer pass, only what is true, every outside fact links the exact page.`')
  $lines.Add('- `Marketing team log: https://github.com/Trollz1004/ANTIGRAVITY/tree/main/marketing/team (public; nothing private goes in).`')
  $lines.Add('<!-- TROLLZ1004-SPINE:END -->')
  return ($lines -join "`n")
}

function Build-TomlManagedBlock {
  param(
    [object]$Ctx,
    [ValidateSet('repo', 'node')]
    [string]$RenderScope,
    [bool]$IncludeCodexMcpKitTable
  )
  $escapedServerPath = '%USERPROFILE%\\antigravity\\DREAM-Engine-runner\\ops\\kit\\server.mjs'
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('# --- TROLLZ1004-SPINE:START ---')
  $lines.Add('[trollz1004_spine]')
  $lines.Add(('scope = "{0}"' -f $RenderScope))
  if ($RenderScope -eq 'node') {
    $lines.Add(('node = "{0}"' -f $Ctx.NodeMeta.name))
    $lines.Add(('host = "{0}"' -f $Ctx.NodeMeta.ip))
    $lines.Add(('role = "{0}"' -f $Ctx.NodeMeta.role))
    $lines.Add(('github_account = "{0}"' -f $Ctx.NodeMeta.githubAccount))
  } else {
    $lines.Add(('repo = "{0}"' -f $Ctx.RepoName))
    $lines.Add(('alienware_ip = "{0}"' -f $Ctx.Alienware.ip))
    $lines.Add(('t5500_ip = "{0}"' -f $Ctx.T5500.ip))
  }
  $lines.Add(('spine = "{0}"' -f $Ctx.SpineDocPath))
  $lines.Add('fleet_map = "ops/fleet/fleet-map.json"')
  $lines.Add('trusted_three = ["claude-opus-5.5", "fable", "gemini-4-carbon", "gpt-6-astra", "gpt-6.1-sol", "codex"]')
  $lines.Add('')
  if ($IncludeCodexMcpKitTable) {
    $lines.Add('[mcp_servers.kit]')
  } else {
    $lines.Add('[trollz1004_spine.mcp_servers.kit]')
  }
  $lines.Add('command = "cmd.exe"')
  $lines.Add(('args = ["/d", "/c", "node", "{0}"]' -f $escapedServerPath))
  $lines.Add('# --- TROLLZ1004-SPINE:END ---')
  return ($lines -join "`n")
}

function Build-YamlManagedBlock {
  param(
    [object]$Ctx,
    [ValidateSet('repo', 'node')]
    [string]$RenderScope
  )
  $escapedServerPath = '%USERPROFILE%\\antigravity\\DREAM-Engine-runner\\ops\\kit\\server.mjs'
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('# --- TROLLZ1004-SPINE:START ---')
  $lines.Add('trollz1004_spine:')
  $lines.Add(('  scope: "{0}"' -f $RenderScope))
  if ($RenderScope -eq 'node') {
    $lines.Add(('  node: "{0}"' -f $Ctx.NodeMeta.name))
    $lines.Add(('  host: "{0}"' -f $Ctx.NodeMeta.ip))
    $lines.Add(('  role: "{0}"' -f $Ctx.NodeMeta.role))
    $lines.Add(('  github_account: "{0}"' -f $Ctx.NodeMeta.githubAccount))
  } else {
    $lines.Add(('  repo: "{0}"' -f $Ctx.RepoName))
  }
  $lines.Add(('  spine: "{0}"' -f $Ctx.SpineDocPath))
  $lines.Add('  fleet_map: "ops/fleet/fleet-map.json"')
  $lines.Add('  nodes:')
  $lines.Add(('    alienware: "{0}"' -f $Ctx.Alienware.ip))
  $lines.Add(('    t5500: "{0}"' -f $Ctx.T5500.ip))
  $lines.Add('  trusted_three:')
  foreach ($m in $Ctx.TrustedThreeIds) {
    $lines.Add(('    - "{0}"' -f $m))
  }
  $lines.Add('  mcp_kit:')
  $lines.Add('    command: "cmd.exe"')
  $lines.Add('    args:')
  $lines.Add('      - "/d"')
  $lines.Add('      - "/c"')
  $lines.Add('      - "node"')
  $lines.Add(('      - "{0}"' -f $escapedServerPath))
  $lines.Add('# --- TROLLZ1004-SPINE:END ---')
  return ($lines -join "`n")
}

function Build-JsonKitServerSnippet {
  param([string]$BaseIndent, [string]$StepIndent)
  $i1 = $BaseIndent + $StepIndent
  $i2 = $i1 + $StepIndent
  $escapedServerPath = '%USERPROFILE%\\antigravity\\DREAM-Engine-runner\\ops\\kit\\server.mjs'
  $lines = @(
    '{'
    ($i1 + '"command": "cmd.exe",')
    ($i1 + '"args": [')
    ($i2 + '"/d",')
    ($i2 + '"/c",')
    ($i2 + '"node",')
    ($i2 + '"' + $escapedServerPath + '"')
    ($i1 + '],')
    ($i1 + '"timeoutSeconds": 120')
    ($BaseIndent + '}')
  )
  return ($lines -join "`n")
}

function Build-JsonManagedPropertiesText {
  param(
    [object]$Ctx,
    [ValidateSet('repo', 'node')]
    [string]$RenderScope,
    [string]$Indent,
    [bool]$IncludeMcpServersWrapper
  )
  $i1 = $Indent
  $i2 = $Indent + $Indent
  $i3 = $i2 + $Indent
  $escapedServerPath = '%USERPROFILE%\\antigravity\\DREAM-Engine-runner\\ops\\kit\\server.mjs'
  $lines = New-Object System.Collections.Generic.List[string]

  if ($IncludeMcpServersWrapper) {
    $lines.Add($i1 + '"mcpServers": {')
    $lines.Add($i2 + '"kit": ' + (Build-JsonKitServerSnippet -BaseIndent $i2 -StepIndent $Indent))
    $lines.Add($i1 + '},')
  }

  $lines.Add($i1 + '"_trollz1004_spine_start": "managed-by-render-agent-files",')
  $lines.Add($i1 + '"trollz1004_spine": {')
  $lines.Add($i2 + ('"scope": "{0}",' -f $RenderScope))
  if ($RenderScope -eq 'node') {
    $lines.Add($i2 + ('"node": "{0}",' -f $Ctx.NodeMeta.name))
    $lines.Add($i2 + ('"host": "{0}",' -f $Ctx.NodeMeta.ip))
    $lines.Add($i2 + ('"role": "{0}",' -f $Ctx.NodeMeta.role))
    $lines.Add($i2 + ('"githubAccount": "{0}",' -f $Ctx.NodeMeta.githubAccount))
  } else {
    $lines.Add($i2 + ('"repo": "{0}",' -f $Ctx.RepoName))
  }
  $lines.Add($i2 + ('"spine": "{0}",' -f $Ctx.SpineDocPath))
  $lines.Add($i2 + '"fleetMap": "ops/fleet/fleet-map.json",')
  $lines.Add($i2 + '"nodes": {')
  $lines.Add($i3 + ('"alienware": "{0}",' -f $Ctx.Alienware.ip))
  $lines.Add($i3 + ('"t5500": "{0}"' -f $Ctx.T5500.ip))
  $lines.Add($i2 + '},')
  $lines.Add($i2 + '"trustedThree": [')
  for ($idx = 0; $idx -lt $Ctx.TrustedThreeIds.Count; $idx++) {
    $comma = if ($idx -lt ($Ctx.TrustedThreeIds.Count - 1)) { ',' } else { '' }
    $lines.Add($i3 + ('"{0}"{1}' -f $Ctx.TrustedThreeIds[$idx], $comma))
  }
  $lines.Add($i2 + '],')
  $lines.Add($i2 + '"mcpKit": {')
  $lines.Add($i3 + '"command": "cmd.exe",')
  $lines.Add($i3 + '"args": [')
  $lines.Add($i3 + $Indent + '"/d",')
  $lines.Add($i3 + $Indent + '"/c",')
  $lines.Add($i3 + $Indent + '"node",')
  $lines.Add($i3 + $Indent + ('"{0}"' -f $escapedServerPath))
  $lines.Add($i3 + ']')
  $lines.Add($i2 + '}')
  $lines.Add($i1 + '},')
  $lines.Add($i1 + '"_trollz1004_spine_end": "managed-by-render-agent-files"')
  return ($lines -join "`n")
}

function Set-ManagedTextBlock {
  param(
    [string]$ExistingText,
    [string]$ManagedBlock,
    [string]$StartMarker,
    [string]$EndMarker,
    [string]$DefaultEol = "`n"
  )
  $eol = Get-EolStyle -Text $ExistingText -DefaultEol $DefaultEol
  $lfExisting = if ($null -eq $ExistingText) { '' } else { $ExistingText.Replace("`r`n", "`n") }
  $lfBlock = $ManagedBlock.Replace("`r`n", "`n")

  $hasStart = $lfExisting.Contains($StartMarker)
  $hasEnd = $lfExisting.Contains($EndMarker)
  if ($hasStart -xor $hasEnd) {
    throw "Mismatched managed block markers ($StartMarker / $EndMarker)."
  }

  $oldBlock = ''
  if ($hasStart -and $hasEnd) {
    $startIdx = $lfExisting.IndexOf($StartMarker, [System.StringComparison]::Ordinal)
    $endIdx = $lfExisting.IndexOf($EndMarker, $startIdx, [System.StringComparison]::Ordinal)
    if ($endIdx -lt $startIdx) {
      throw "Invalid managed block marker order."
    }
    $endAfter = $endIdx + $EndMarker.Length
    $oldBlock = $lfExisting.Substring($startIdx, $endAfter - $startIdx)
    $lfNew = $lfExisting.Substring(0, $startIdx) + $lfBlock + $lfExisting.Substring($endAfter)
  } else {
    $trimmed = $lfExisting.TrimEnd("`n")
    if ([string]::IsNullOrEmpty($trimmed)) {
      $lfNew = $lfBlock + "`n"
    } else {
      $lfNew = $trimmed + "`n`n" + $lfBlock + "`n"
    }
  }

  return [PSCustomObject]@{
    NewText = (ConvertTo-TargetEol -Text $lfNew -Eol $eol)
    OldManaged = $oldBlock
    NewManaged = $lfBlock
  }
}

function Skip-JsonWhitespace {
  param([string]$Text, [int]$Index)
  $len = $Text.Length
  while ($Index -lt $len) {
    $ch = $Text[$Index]
    if ($ch -eq ' ' -or $ch -eq "`t" -or $ch -eq "`r" -or $ch -eq "`n") {
      $Index++
    } else {
      break
    }
  }
  return $Index
}

function Read-JsonStringEnd {
  param([string]$Text, [int]$QuoteStart)
  $len = $Text.Length
  $i = $QuoteStart + 1
  while ($i -lt $len) {
    $ch = $Text[$i]
    if ($ch -eq '\') {
      $i += 2
      continue
    }
    if ($ch -eq '"') {
      return $i
    }
    $i++
  }
  throw "Unterminated JSON string at index $QuoteStart"
}

function Read-JsonValueEnd {
  param([string]$Text, [int]$StartIdx)
  $len = $Text.Length
  $ch = $Text[$StartIdx]
  if ($ch -eq '"') {
    return (Read-JsonStringEnd -Text $Text -QuoteStart $StartIdx)
  }
  if ($ch -eq '{' -or $ch -eq '[') {
    $depth = 0
    $i = $StartIdx
    while ($i -lt $len) {
      $c = $Text[$i]
      if ($c -eq '"') {
        $i = (Read-JsonStringEnd -Text $Text -QuoteStart $i) + 1
        continue
      }
      if ($c -eq '{' -or $c -eq '[') {
        $depth++
      } elseif ($c -eq '}' -or $c -eq ']') {
        $depth--
        if ($depth -eq 0) { return $i }
      }
      $i++
    }
    throw "Unterminated JSON container at index $StartIdx"
  }
  $i = $StartIdx
  while ($i -lt $len) {
    $c = $Text[$i]
    if ($c -eq ',' -or $c -eq '}' -or $c -eq ']' -or $c -eq ' ' -or $c -eq "`t" -or $c -eq "`r" -or $c -eq "`n") {
      return ($i - 1)
    }
    $i++
  }
  return ($len - 1)
}

function Get-JsonObjectMembers {
  param([string]$Text, [int]$OpenBraceIdx)
  $members = New-Object System.Collections.Generic.List[object]
  $i = Skip-JsonWhitespace -Text $Text -Index ($OpenBraceIdx + 1)
  if ($i -lt $Text.Length -and $Text[$i] -eq '}') {
    return [PSCustomObject]@{ OpenIdx = $OpenBraceIdx; CloseIdx = $i; Members = $members }
  }
  while ($i -lt $Text.Length) {
    if ($Text[$i] -ne '"') {
      throw "Expected JSON property name at index $i"
    }
    $keyStart = $i
    $keyEnd = Read-JsonStringEnd -Text $Text -QuoteStart $keyStart
    $rawKeyJson = $Text.Substring($keyStart, ($keyEnd - $keyStart) + 1)
    $keyName = $rawKeyJson | ConvertFrom-Json
    $i = Skip-JsonWhitespace -Text $Text -Index ($keyEnd + 1)
    if ($i -ge $Text.Length -or $Text[$i] -ne ':') {
      throw "Expected ':' after JSON key '$keyName' at index $i"
    }
    $valStart = Skip-JsonWhitespace -Text $Text -Index ($i + 1)
    $valEnd = Read-JsonValueEnd -Text $Text -StartIdx $valStart
    $members.Add([PSCustomObject]@{
      Name = $keyName
      KeyStart = $keyStart
      ValStart = $valStart
      ValEnd = $valEnd
    })
    $i = Skip-JsonWhitespace -Text $Text -Index ($valEnd + 1)
    if ($i -lt $Text.Length -and $Text[$i] -eq ',') {
      $i = Skip-JsonWhitespace -Text $Text -Index ($i + 1)
      continue
    }
    if ($i -lt $Text.Length -and $Text[$i] -eq '}') {
      return [PSCustomObject]@{ OpenIdx = $OpenBraceIdx; CloseIdx = $i; Members = $members }
    }
    throw "Expected ',' or '}' in JSON object at index $i"
  }
  throw "Unterminated JSON object starting at index $OpenBraceIdx"
}

function Set-ManagedJsonContent {
  param(
    [string]$ExistingText,
    [object]$Ctx,
    [ValidateSet('repo', 'node')]
    [string]$RenderScope,
    [bool]$IsMcpConfig
  )
  $eol = Get-EolStyle -Text $ExistingText -DefaultEol "`n"
  $lfText = if ([string]::IsNullOrWhiteSpace($ExistingText)) { "{`n}`n" } else { $ExistingText.Replace("`r`n", "`n") }

  # Parse first to guarantee valid input JSON
  [void]($lfText | ConvertFrom-Json)

  $indent = '  '
  if ($lfText -match '(?m)^([ \t]+)"') {
    $indent = $Matches[1]
  }

  $rootOpen = Skip-JsonWhitespace -Text $lfText -Index 0
  if ($rootOpen -ge $lfText.Length -or $lfText[$rootOpen] -ne '{') {
    throw 'Expected JSON root object.'
  }

  $oldManagedSnippets = New-Object System.Collections.Generic.List[string]
  $newManagedSnippets = New-Object System.Collections.Generic.List[string]

  # Step 1: If mcp_config.json, surgically update/insert mcpServers.kit
  $needMcpServersWrapper = $false
  if ($IsMcpConfig) {
    $rootObj = Get-JsonObjectMembers -Text $lfText -OpenBraceIdx $rootOpen
    $mcpMember = $rootObj.Members | Where-Object { $_.Name -eq 'mcpServers' } | Select-Object -First 1
    if ($mcpMember -and $lfText[$mcpMember.ValStart] -eq '{') {
      $mcpObj = Get-JsonObjectMembers -Text $lfText -OpenBraceIdx $mcpMember.ValStart
      $kitMember = $mcpObj.Members | Where-Object { $_.Name -eq 'kit' } | Select-Object -First 1
      $kitIndent = $indent + $indent
      $kitSnippet = Build-JsonKitServerSnippet -BaseIndent $kitIndent -StepIndent $indent
      $newManagedSnippets.Add(('"mcpServers"."kit": ' + $kitSnippet))
      if ($kitMember) {
        $oldKitText = $lfText.Substring($kitMember.ValStart, ($kitMember.ValEnd - $kitMember.ValStart) + 1)
        $oldManagedSnippets.Add(('"mcpServers"."kit": ' + $oldKitText))
        $lfText = $lfText.Substring(0, $kitMember.ValStart) + $kitSnippet + $lfText.Substring($kitMember.ValEnd + 1)
      } elseif ($mcpObj.Members.Count -gt 0) {
        $lastMcp = $mcpObj.Members[$mcpObj.Members.Count - 1]
        $insertPos = $lastMcp.ValEnd + 1
        $insertStr = ",`n" + $kitIndent + '"kit": ' + $kitSnippet
        $lfText = $lfText.Substring(0, $insertPos) + $insertStr + $lfText.Substring($insertPos)
      } else {
        $insertStr = "`n" + $kitIndent + '"kit": ' + $kitSnippet + "`n" + $indent
        $lfText = $lfText.Substring(0, $mcpObj.OpenIdx + 1) + $insertStr + $lfText.Substring($mcpObj.CloseIdx)
      }
    } else {
      $needMcpServersWrapper = $true
    }
  }

  # Step 2: Remove any existing root managed properties cleanly
  $managedKeys = @('_trollz1004_spine_start', 'trollz1004_spine', '_trollz1004_spine_end')
  $rootObj2 = Get-JsonObjectMembers -Text $lfText -OpenBraceIdx $rootOpen
  $toRemoveIdx = New-Object System.Collections.Generic.List[int]
  for ($idx = 0; $idx -lt $rootObj2.Members.Count; $idx++) {
    $m = $rootObj2.Members[$idx]
    if ($managedKeys -contains $m.Name) {
      $toRemoveIdx.Add($idx)
      $oldManagedSnippets.Add(('"' + $m.Name + '": ' + $lfText.Substring($m.ValStart, ($m.ValEnd - $m.ValStart) + 1)))
    }
  }

  if ($toRemoveIdx.Count -gt 0) {
    $keptIndices = New-Object System.Collections.Generic.List[int]
    for ($idx = 0; $idx -lt $rootObj2.Members.Count; $idx++) {
      if (-not ($toRemoveIdx.Contains($idx))) {
        $keptIndices.Add($idx)
      }
    }
    if ($keptIndices.Count -eq 0) {
      $lfText = $lfText.Substring(0, $rootObj2.OpenIdx + 1) + "`n" + $lfText.Substring($rootObj2.CloseIdx)
    } else {
      # Remove from highest index downward to keep earlier offsets valid
      for ($r = $toRemoveIdx.Count - 1; $r -ge 0; $r--) {
        $idx = $toRemoveIdx[$r]
        $curMembers = (Get-JsonObjectMembers -Text $lfText -OpenBraceIdx $rootOpen).Members
        $curClose = (Get-JsonObjectMembers -Text $lfText -OpenBraceIdx $rootOpen).CloseIdx
        $m = $curMembers[$idx]
        if ($idx -lt ($curMembers.Count - 1)) {
          $nextM = $curMembers[$idx + 1]
          $lfText = $lfText.Substring(0, $m.KeyStart) + $lfText.Substring($nextM.KeyStart)
        } else {
          $prevM = $curMembers[$idx - 1]
          $tailWs = ''
          $afterEnd = $m.ValEnd + 1
          if ($curClose -gt $afterEnd) {
            $tailWs = $lfText.Substring($afterEnd, $curClose - $afterEnd)
          }
          $lfText = $lfText.Substring(0, $prevM.ValEnd + 1) + $tailWs + $lfText.Substring($curClose)
        }
      }
    }
  }

  # Step 3: Splice fresh managed keys before root '}'
  $rootObj3 = Get-JsonObjectMembers -Text $lfText -OpenBraceIdx $rootOpen
  $propsText = Build-JsonManagedPropertiesText -Ctx $Ctx -RenderScope $RenderScope -Indent $indent -IncludeMcpServersWrapper $needMcpServersWrapper
  $newManagedSnippets.Add($propsText)

  if ($rootObj3.Members.Count -gt 0) {
    $lastKept = $rootObj3.Members[$rootObj3.Members.Count - 1]
    $insertAt = $lastKept.ValEnd + 1
    $tailToClose = $lfText.Substring($insertAt, $rootObj3.CloseIdx - $insertAt)
    $lfNew = $lfText.Substring(0, $insertAt) + ",`n" + $propsText + "`n" + $lfText.Substring($rootObj3.CloseIdx)
    if ($tailToClose -notmatch "`n") {
      # Preserve newline cleanly before closing brace
      $lfNew = $lfText.Substring(0, $insertAt) + ",`n" + $propsText + "`n" + $lfText.Substring($rootObj3.CloseIdx)
    }
  } else {
    $lfNew = $lfText.Substring(0, $rootObj3.OpenIdx + 1) + "`n" + $propsText + "`n" + $lfText.Substring($rootObj3.CloseIdx)
  }

  # Validate rendered JSON
  [void]($lfNew | ConvertFrom-Json)

  return [PSCustomObject]@{
    NewText = (ConvertTo-TargetEol -Text $lfNew -Eol $eol)
    OldManaged = ($oldManagedSnippets -join "`n")
    NewManaged = ($newManagedSnippets -join "`n")
  }
}

function Invoke-RenderTargetFile {
  param(
    [string]$FilePath,
    [string]$Kind,
    [object]$Ctx,
    [ValidateSet('repo', 'node')]
    [string]$RenderScope,
    [bool]$IsApply
  )
  $msgs = New-Object System.Collections.Generic.List[string]
  $exists = Test-Path -LiteralPath $FilePath
  $existingText = if ($exists) { [System.IO.File]::ReadAllText($FilePath, $Utf8NoBom) } else { '' }
  $portablePath = ConvertTo-PortablePath -InputPath $FilePath

  if (Test-PrivateProjectFile -FullPath $FilePath -ExistingText $existingText) {
    $msgs.Add("[SKIP private-project] $portablePath")
    return [PSCustomObject]@{ Path = $portablePath; Action = 'skipped-private'; Changed = $false; Messages = $msgs }
  }

  $renderResult = $null
  switch ($Kind) {
    'md' {
      $block = Build-MarkdownManagedBlock -Ctx $Ctx -RenderScope $RenderScope
      $renderResult = Set-ManagedTextBlock -ExistingText $existingText -ManagedBlock $block -StartMarker '<!-- TROLLZ1004-SPINE:START -->' -EndMarker '<!-- TROLLZ1004-SPINE:END -->'
    }
    'toml' {
      $startMarker = '# --- TROLLZ1004-SPINE:START ---'
      $endMarker = '# --- TROLLZ1004-SPINE:END ---'
      $lfExisting = $existingText.Replace("`r`n", "`n")
      $outsideText = $lfExisting
      if ($lfExisting.Contains($startMarker) -and $lfExisting.Contains($endMarker)) {
        $sIdx = $lfExisting.IndexOf($startMarker, [System.StringComparison]::Ordinal)
        $eIdx = $lfExisting.IndexOf($endMarker, $sIdx, [System.StringComparison]::Ordinal) + $endMarker.Length
        $outsideText = $lfExisting.Substring(0, $sIdx) + $lfExisting.Substring($eIdx)
      }
      $isCodexConfig = ($FilePath -match '(?i)[\\/]\.codex[\\/]config\.toml$')
      $hasKitOutside = ($outsideText -match '(?m)^\s*\[mcp_servers\.kit\]\s*$')
      $includeCodexKit = ($isCodexConfig -and -not $hasKitOutside)
      $block = Build-TomlManagedBlock -Ctx $Ctx -RenderScope $RenderScope -IncludeCodexMcpKitTable $includeCodexKit
      $renderResult = Set-ManagedTextBlock -ExistingText $existingText -ManagedBlock $block -StartMarker $startMarker -EndMarker $endMarker
    }
    'yaml' {
      $startMarker = '# --- TROLLZ1004-SPINE:START ---'
      $endMarker = '# --- TROLLZ1004-SPINE:END ---'
      $lfExisting = $existingText.Replace("`r`n", "`n")
      $outsideText = $lfExisting
      if ($lfExisting.Contains($startMarker) -and $lfExisting.Contains($endMarker)) {
        $sIdx = $lfExisting.IndexOf($startMarker, [System.StringComparison]::Ordinal)
        $eIdx = $lfExisting.IndexOf($endMarker, $sIdx, [System.StringComparison]::Ordinal) + $endMarker.Length
        $outsideText = $lfExisting.Substring(0, $sIdx) + $lfExisting.Substring($eIdx)
      }
      if ($outsideText -match '(?m)^trollz1004_spine\s*:') {
        return [PSCustomObject]@{ Path = $portablePath; Action = 'unchanged'; Changed = $false; Messages = $msgs }
      }
      $block = Build-YamlManagedBlock -Ctx $Ctx -RenderScope $RenderScope
      $renderResult = Set-ManagedTextBlock -ExistingText $existingText -ManagedBlock $block -StartMarker $startMarker -EndMarker $endMarker
    }
    'json' {
      $isMcp = ($FilePath -match '(?i)[\\/]mcp_config\.json$')
      $renderResult = Set-ManagedJsonContent -ExistingText $existingText -Ctx $Ctx -RenderScope $RenderScope -IsMcpConfig $isMcp
    }
    default {
      throw "Unsupported target kind: $Kind"
    }
  }

  $changed = (-not $exists) -or ($renderResult.NewText -cne $existingText)
  if (-not $changed) {
    return [PSCustomObject]@{ Path = $portablePath; Action = 'unchanged'; Changed = $false; Messages = $msgs }
  }

  if (-not $IsApply) {
    $verb = if ($exists) { 'Would update' } else { 'Would create' }
    $msgs.Add("[DRY RUN] $verb $portablePath ($Kind)")
    if (-not [string]::IsNullOrEmpty($renderResult.OldManaged)) {
      $msgs.Add("  - old managed:")
      foreach ($line in ($renderResult.OldManaged -split "`n")) {
        $msgs.Add(("    - " + (Protect-DiffText -Text $line)))
      }
    }
    $msgs.Add("  + new managed:")
    foreach ($line in ($renderResult.NewManaged -split "`n")) {
      $msgs.Add(("    + " + (Protect-DiffText -Text $line)))
    }
    return [PSCustomObject]@{ Path = $portablePath; Action = 'dry-run-diff'; Changed = $true; Messages = $msgs }
  }

  if ($exists) {
    $stamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
    $backupPath = "$FilePath.bak-$stamp"
    [System.IO.File]::Copy($FilePath, $backupPath, $true)
  } else {
    $parentDir = Split-Path -Parent $FilePath
    if ($parentDir -and -not (Test-Path -LiteralPath $parentDir)) {
      New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
  }
  [System.IO.File]::WriteAllText($FilePath, $renderResult.NewText, $Utf8NoBom)
  $appliedVerb = if ($exists) { 'Updated' } else { 'Created' }
  $msgs.Add("[APPLY] $appliedVerb $portablePath")
  return [PSCustomObject]@{ Path = $portablePath; Action = 'applied'; Changed = $true; Messages = $msgs }
}

function Get-RepoTargetFiles {
  param([string]$TargetRepoRoot)
  $rootResolved = (Resolve-Path -LiteralPath $TargetRepoRoot).Path
  $skipDirs = @('.git', 'node_modules', '.venv', 'archive', 'dist', 'build', 'coverage', '.next', '.turbo')
  $skipFiles = @('wrangler.toml', 'pyproject.toml', 'Cargo.toml', 'package.json', 'package-lock.json', 'tsconfig.json')
  $vendoredRel = @(
    '.agents/skills/hallmark/SKILL.md',
    '.agents/skills/hallmark/agents/openai.yaml',
    '.agents/skills/impeccable/SKILL.md',
    '.agents/skills/impeccable/agents/openai.yaml',
    '.agents/skills/security-audit/SKILL.md',
    '.agents/skills/microsoft-foundry/SKILL.md',
    '.agents/skills/microsoft-foundry/agents/openai.yaml'
  )
  $explicitRel = @(
    'AGENTS.md',
    'AGENT.md',
    'CLAUDE.md',
    'GEMINI.md',
    'CODEX.md',
    'OPENCODE.md',
    'GROK.md',
    'GEMINI_SOUL.md',
    'SOUL.md',
    'hermes/AGENTS.md',
    'hermes/CLAUDE.md',
    'hermes/GEMINI.md',
    'ops/t5500/AGENTS.t5500.md'
  )

  $results = New-Object System.Collections.Generic.List[object]
  $stack = New-Object System.Collections.Generic.Stack[string]
  $stack.Push('')

  while ($stack.Count -gt 0) {
    $relDir = $stack.Pop()
    $absDir = if ([string]::IsNullOrEmpty($relDir)) { $rootResolved } else { Join-Path $rootResolved ($relDir.Replace('/', '\')) }
    if (-not (Test-Path -LiteralPath $absDir)) { continue }

    $items = Get-ChildItem -LiteralPath $absDir -Force -ErrorAction SilentlyContinue
    foreach ($item in $items) {
      $relPath = if ([string]::IsNullOrEmpty($relDir)) { $item.Name } else { "$relDir/$($item.Name)" }
      if ($item.PSIsContainer) {
        if ($skipDirs -contains $item.Name) { continue }
        if ($relPath -eq 'docs/house' -or $relPath -eq 'docs/standards/backups-full-context' -or $relPath -eq 'tests/fixtures') { continue }
        $stack.Push($relPath)
      } else {
        if ($skipFiles -contains $item.Name) { continue }
        if ($item.Name -like '*.bak-*') { continue }
        if ($vendoredRel -contains $relPath) { continue }

        $kind = $null
        if (($explicitRel -contains $relPath) -or ($item.Name -like '*SOUL*.md') -or ($item.Name -eq 'SKILL.md') -or ($item.Name -eq 'HOUSE-NOTE.md')) {
          $kind = 'md'
        } elseif ($item.Name -eq 'skill.json') {
          $kind = 'json'
        } elseif ($item.Name -eq 'gemini.toml' -or ($relPath -match '^\.codex/[^/]+\.toml$')) {
          $kind = 'toml'
        } elseif ($item.Name -eq 'openai.yaml' -or $item.Name -eq 'agents.yaml') {
          $kind = 'yaml'
        }

        if ($kind) {
          $results.Add([PSCustomObject]@{ FullPath = $item.FullName; RelPath = $relPath; Kind = $kind })
        }
      }
    }
  }

  return @($results | Sort-Object RelPath)
}

function Get-NodeTargetFiles {
  param(
    [ValidateSet('alienware', 't5500')]
    [string]$TargetNode,
    [string]$ProfileRoot,
    [string]$LocalAppRoot,
    [string]$FreebuffDir,
    [bool]$IncludeAbsentDirsForPreview = $false
  )
  $targets = New-Object System.Collections.Generic.List[object]

  $geminiDir = Join-Path $ProfileRoot '.gemini'
  if ($IncludeAbsentDirsForPreview -or (Test-Path -LiteralPath $geminiDir)) {
    $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $geminiDir 'GEMINI.md'); Kind = 'md' })
    $settingsPath = Join-Path $geminiDir 'settings.json'
    if ($IncludeAbsentDirsForPreview -or (Test-Path -LiteralPath $settingsPath)) {
      $targets.Add([PSCustomObject]@{ FullPath = $settingsPath; Kind = 'json' })
    }
    $mcpPath = Join-Path $geminiDir 'config\mcp_config.json'
    if ($IncludeAbsentDirsForPreview -or (Test-Path -LiteralPath $mcpPath)) {
      $targets.Add([PSCustomObject]@{ FullPath = $mcpPath; Kind = 'json' })
    }
  }

  $codexDir = Join-Path $ProfileRoot '.codex'
  if ($IncludeAbsentDirsForPreview -or (Test-Path -LiteralPath $codexDir)) {
    $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $codexDir 'config.toml'); Kind = 'toml' })
    $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $codexDir 'AGENTS.md'); Kind = 'md' })
  }

  $claudeDir = Join-Path $ProfileRoot '.claude'
  if ($IncludeAbsentDirsForPreview -or (Test-Path -LiteralPath $claudeDir)) {
    $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $claudeDir 'CLAUDE.md'); Kind = 'md' })
    $claudeSettings = Join-Path $claudeDir 'settings.json'
    if ($IncludeAbsentDirsForPreview -or (Test-Path -LiteralPath $claudeSettings)) {
      $targets.Add([PSCustomObject]@{ FullPath = $claudeSettings; Kind = 'json' })
    }
  }

  if ($TargetNode -eq 't5500') {
    $hermesDir = Join-Path $LocalAppRoot 'hermes'
    if ($IncludeAbsentDirsForPreview -or (Test-Path -LiteralPath $hermesDir)) {
      $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $hermesDir 'SOUL.md'); Kind = 'md' })
      $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $hermesDir 'profiles\t5500\SOUL.md'); Kind = 'md' })
    }
  }

  $openclawDir = Join-Path $ProfileRoot '.openclaw'
  if ($IncludeAbsentDirsForPreview -or (Test-Path -LiteralPath $openclawDir)) {
    $openclawJson = Join-Path $openclawDir 'openclaw.json'
    if ($IncludeAbsentDirsForPreview -or (Test-Path -LiteralPath $openclawJson)) {
      $targets.Add([PSCustomObject]@{ FullPath = $openclawJson; Kind = 'json' })
    }
    $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $openclawDir 'workspace\AGENTS.md'); Kind = 'md' })
    $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $openclawDir 'workspace\SOUL.md'); Kind = 'md' })
  }

  if ($TargetNode -eq 'alienware' -and -not [string]::IsNullOrWhiteSpace($FreebuffDir) -and (Test-Path -LiteralPath $FreebuffDir)) {
    $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $FreebuffDir 'AGENTS.md'); Kind = 'md' })
    $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $FreebuffDir 'CLAUDE.md'); Kind = 'md' })
    $targets.Add([PSCustomObject]@{ FullPath = (Join-Path $FreebuffDir 'GEMINI.md'); Kind = 'md' })
  }

  return $targets
}

function Invoke-RenderAgentFilesMain {
  $resolvedSpineRepo = Resolve-SpineSourceRepoPath -Explicit $SpineSourceRepo -TargetRepo $RepoRoot -ProfileRoot $UserProfileRoot
  $repoName = if (Test-Path -LiteralPath $RepoRoot) { Resolve-CanonicalRepoName -TargetRepo $RepoRoot } else { 'dream-online' }
  $ctx = Get-SpineContext -SourceRepo $resolvedSpineRepo -TargetNode $Node -TargetRepoName $repoName

  $stats = @{ Scanned = 0; Changed = 0; Applied = 0; SkippedPrivate = 0; Unchanged = 0 }

  if ($Scope -eq 'all' -or $Scope -eq 'repo') {
    if (-not (Test-Path -LiteralPath $RepoRoot)) {
      throw "RepoRoot not found: $RepoRoot"
    }
    $repoTargets = @(Get-RepoTargetFiles -TargetRepoRoot $RepoRoot)
    foreach ($t in $repoTargets) {
      $stats.Scanned++
      $res = Invoke-RenderTargetFile -FilePath $t.FullPath -Kind $t.Kind -Ctx $ctx -RenderScope 'repo' -IsApply ([bool]$Apply)
      foreach ($m in $res.Messages) { Write-Output $m }
      if ($res.Action -eq 'skipped-private') { $stats.SkippedPrivate++ }
      elseif ($res.Action -eq 'unchanged') { $stats.Unchanged++ }
      elseif ($res.Action -eq 'applied') { $stats.Changed++; $stats.Applied++ }
      else { $stats.Changed++ }
    }
  }

  if ($Scope -eq 'all' -or $Scope -eq 'node') {
    if ($Node -eq 't5500' -and -not $RemoteExecuted) {
      $remoteScript = '%USERPROFILE%\antigravity\DREAM-Engine-runner\ops\agents\render-agent-files.ps1'
      $remoteCmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$remoteScript`" -Node t5500 -Scope $Scope -Apply -RemoteExecuted"
      $t5Targets = Get-NodeTargetFiles -TargetNode 't5500' -ProfileRoot $UserProfileRoot -LocalAppRoot $LocalAppDataRoot -FreebuffDir '' -IncludeAbsentDirsForPreview $true

      if (-not $Apply) {
        Write-Output "[DRY RUN] Would run over ssh t5500: $remoteCmd"
        Write-Output ("[DRY RUN] Target Node: {0} ({1}) {2} {3} | GitHub: {4}" -f $ctx.T5500.name, $ctx.T5500.ip, $EmDash, $ctx.T5500.role, $ctx.T5500.githubAccount)
        Write-Output "[DRY RUN] T5500 node targets:"
        foreach ($nt in $t5Targets) {
          Write-Output ("  - " + (ConvertTo-PortablePath -InputPath $nt.FullPath) + " (" + $nt.Kind + ")")
        }
        Write-Output "[DRY RUN] Rendered T5500 managed block (Markdown):"
        Write-Output (Build-MarkdownManagedBlock -Ctx $ctx -RenderScope 'node')
        Write-Output "[DRY RUN] Rendered T5500 managed block (JSON):"
        Write-Output (Build-JsonManagedPropertiesText -Ctx $ctx -RenderScope 'node' -Indent '  ' -IncludeMcpServersWrapper $false)
        Write-Output "[DRY RUN] Rendered T5500 managed block (TOML):"
        Write-Output (Build-TomlManagedBlock -Ctx $ctx -RenderScope 'node' -IncludeCodexMcpKitTable $true)
        Write-Output "[DRY RUN] Rendered T5500 managed block (YAML):"
        Write-Output (Build-YamlManagedBlock -Ctx $ctx -RenderScope 'node')
      } else {
        & ssh t5500 $remoteCmd
        if ($LASTEXITCODE -ne 0) {
          throw "ssh t5500 exited with code $LASTEXITCODE"
        }
      }
    } else {
      $nodeTargets = @(Get-NodeTargetFiles -TargetNode $Node -ProfileRoot $UserProfileRoot -LocalAppRoot $LocalAppDataRoot -FreebuffDir $FreebuffRoot -IncludeAbsentDirsForPreview $false)
      foreach ($t in $nodeTargets) {
        $stats.Scanned++
        $res = Invoke-RenderTargetFile -FilePath $t.FullPath -Kind $t.Kind -Ctx $ctx -RenderScope 'node' -IsApply ([bool]$Apply)
        foreach ($m in $res.Messages) { Write-Output $m }
        if ($res.Action -eq 'skipped-private') { $stats.SkippedPrivate++ }
        elseif ($res.Action -eq 'unchanged') { $stats.Unchanged++ }
        elseif ($res.Action -eq 'applied') { $stats.Changed++; $stats.Applied++ }
        else { $stats.Changed++ }
      }
    }
  }

  $modeLabel = if ($Apply) { 'APPLY' } else { 'DRY RUN' }
  Write-Output ("[{0}] Summary (Node={1}, Scope={2}): scanned={3}, diffs={4}, applied={5}, unchanged={6}, skippedPrivate={7}" -f $modeLabel, $Node, $Scope, $stats.Scanned, $stats.Changed, $stats.Applied, $stats.Unchanged, $stats.SkippedPrivate)
}

if (-not $NoRun) {
  Invoke-RenderAgentFilesMain
}
