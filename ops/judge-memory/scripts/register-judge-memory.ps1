<#
.SYNOPSIS
Registers judge-memory hooks and stdio MCP server in the signed-in Claude Code settings on this node.
Run once by the judge or Josh, never by a worker lane.
Defaults to dry-run mode: prints what it would change and writes nothing unless -Apply is passed.
#>
[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$SettingsPath = "$env:USERPROFILE\.claude\settings.json",
    [string]$StoreDir = "$env:LOCALAPPDATA\dream-judge-memory"
)

$ErrorActionPreference = 'Stop'

function ConvertTo-PortablePath([string]$RawPath) {
    if ([string]::IsNullOrWhiteSpace($RawPath)) { return $RawPath }
    $out = $RawPath
    if ($env:LOCALAPPDATA) {
        $out = $out -ireplace [regex]::Escape($env:LOCALAPPDATA), '%LOCALAPPDATA%'
    }
    if ($env:USERPROFILE) {
        $out = $out -ireplace [regex]::Escape($env:USERPROFILE), '%USERPROFILE%'
    }
    return $out
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$judgeMemoryRoot = Split-Path -Parent $scriptRoot

$sessionStartScript = Join-Path $judgeMemoryRoot 'hooks\session-start.mjs'
$postToolUseScript  = Join-Path $judgeMemoryRoot 'hooks\post-tool-use.mjs'
$stopScript         = Join-Path $judgeMemoryRoot 'hooks\stop.mjs'
$sessionEndScript   = Join-Path $judgeMemoryRoot 'hooks\session-end.mjs'
$mcpServerScript    = Join-Path $judgeMemoryRoot 'server\mcp-server.mjs'

$portableSettings = ConvertTo-PortablePath $SettingsPath
$portableStore    = ConvertTo-PortablePath $StoreDir
$portableRoot     = ConvertTo-PortablePath $judgeMemoryRoot

$existing = @{}
if (Test-Path -LiteralPath $SettingsPath) {
    $rawContent = Get-Content -LiteralPath $SettingsPath -Raw -Encoding UTF8
    if (-not [string]::IsNullOrWhiteSpace($rawContent)) {
        $parsed = ConvertFrom-Json $rawContent
        foreach ($prop in $parsed.PSObject.Properties) {
            $existing[$prop.Name] = $prop.Value
        }
    }
}

$hooksConfig = @{
    SessionStart = @(
        @{
            matcher = '*'
            hooks   = @(
                @{
                    type    = 'command'
                    command = "node `"$portableRoot\hooks\session-start.mjs`""
                    env     = @{
                        DREAM_JUDGE_LANE_SESSION = 'claude-code-signed-in'
                        JUDGE_MEMORY_DIR         = $portableStore
                    }
                }
            )
        }
    )
    PostToolUse  = @(
        @{
            matcher = '*'
            hooks   = @(
                @{
                    type    = 'command'
                    command = "node `"$portableRoot\hooks\post-tool-use.mjs`""
                    env     = @{
                        DREAM_JUDGE_LANE_SESSION = 'claude-code-signed-in'
                        JUDGE_MEMORY_DIR         = $portableStore
                    }
                }
            )
        }
    )
    Stop         = @(
        @{
            matcher = '*'
            hooks   = @(
                @{
                    type    = 'command'
                    command = "node `"$portableRoot\hooks\stop.mjs`""
                    env     = @{
                        DREAM_JUDGE_LANE_SESSION = 'claude-code-signed-in'
                        JUDGE_MEMORY_DIR         = $portableStore
                    }
                }
            )
        }
    )
    SessionEnd   = @(
        @{
            matcher = '*'
            hooks   = @(
                @{
                    type    = 'command'
                    command = "node `"$portableRoot\hooks\session-end.mjs`""
                    env     = @{
                        DREAM_JUDGE_LANE_SESSION = 'claude-code-signed-in'
                        JUDGE_MEMORY_DIR         = $portableStore
                    }
                }
            )
        }
    )
}

$mcpServerEntry = @{
    command = 'node'
    args    = @("$portableRoot\server\mcp-server.mjs")
    env     = @{
        DREAM_JUDGE_LANE_SESSION          = 'claude-code-signed-in'
        JUDGE_MEMORY_DIR                  = $portableStore
        JUDGE_MEMORY_FLEET_PUSH_ENABLED   = 'false'
        JUDGE_MEMORY_BRIEF_TOKEN_BUDGET   = '1500'
    }
}

$existing['hooks'] = $hooksConfig
if (-not $existing.ContainsKey('mcpServers') -or $null -eq $existing['mcpServers']) {
    $existing['mcpServers'] = @{}
} elseif ($existing['mcpServers'] -is [pscustomobject]) {
    $mcpHash = @{}
    foreach ($p in $existing['mcpServers'].PSObject.Properties) {
        $mcpHash[$p.Name] = $p.Value
    }
    $existing['mcpServers'] = $mcpHash
}
$existing['mcpServers']['dream-judge-memory'] = $mcpServerEntry

$plannedJson = ConvertTo-Json $existing -Depth 10
$portablePlannedJson = ConvertTo-PortablePath $plannedJson

if (-not $Apply) {
    Write-Output "[DRY RUN] register-judge-memory.ps1 (no files modified; pass -Apply to write changes)"
    Write-Output "Target settings file: $portableSettings"
    Write-Output "Target store directory: $portableStore"
    Write-Output "Hooks to register: SessionStart, PostToolUse, Stop, SessionEnd"
    Write-Output "MCP server to register: dream-judge-memory (search, timeline, get)"
    Write-Output "Planned settings JSON:"
    Write-Output $portablePlannedJson
    exit 0
}

$settingsParent = Split-Path -Parent $SettingsPath
if (-not (Test-Path -LiteralPath $settingsParent)) {
    New-Item -ItemType Directory -Path $settingsParent -Force | Out-Null
}
if (-not (Test-Path -LiteralPath $StoreDir)) {
    New-Item -ItemType Directory -Path $StoreDir -Force | Out-Null
}

if (Test-Path -LiteralPath $SettingsPath) {
    $stamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
    Copy-Item -LiteralPath $SettingsPath -Destination "$SettingsPath.bak-$stamp" -Force
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($SettingsPath, $plannedJson, $utf8NoBom)

Write-Output "[APPLIED] Registered judge-memory hooks and dream-judge-memory MCP server in $portableSettings"
Write-Output "Store directory ready at $portableStore"
