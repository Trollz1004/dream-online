<#
.SYNOPSIS
Unregisters judge-memory hooks and stdio MCP server from the signed-in Claude Code settings on this node.
Defaults to dry-run mode: prints what it would change and writes nothing unless -Apply is passed.
Leaves the SQLite store under %LOCALAPPDATA%\dream-judge-memory\ untouched.
#>
[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$SettingsPath = "$env:USERPROFILE\.claude\settings.json"
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

$portableSettings = ConvertTo-PortablePath $SettingsPath

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

if ($existing.ContainsKey('hooks') -and $null -ne $existing['hooks']) {
    $hooksObj = $existing['hooks']
    $newHooks = @{}
    if ($hooksObj -is [System.Collections.IDictionary]) {
        foreach ($k in $hooksObj.Keys) {
            if ($k -notin @('SessionStart', 'PostToolUse', 'Stop', 'SessionEnd')) {
                $newHooks[$k] = $hooksObj[$k]
            }
        }
    } else {
        foreach ($p in $hooksObj.PSObject.Properties) {
            if ($p.Name -notin @('SessionStart', 'PostToolUse', 'Stop', 'SessionEnd')) {
                $newHooks[$p.Name] = $p.Value
            }
        }
    }
    if ($newHooks.Count -eq 0) {
        $existing.Remove('hooks')
    } else {
        $existing['hooks'] = $newHooks
    }
}

if ($existing.ContainsKey('mcpServers') -and $null -ne $existing['mcpServers']) {
    $mcpObj = $existing['mcpServers']
    $newMcp = @{}
    if ($mcpObj -is [System.Collections.IDictionary]) {
        foreach ($k in $mcpObj.Keys) {
            if ($k -ne 'dream-judge-memory') {
                $newMcp[$k] = $mcpObj[$k]
            }
        }
    } else {
        foreach ($p in $mcpObj.PSObject.Properties) {
            if ($p.Name -ne 'dream-judge-memory') {
                $newMcp[$p.Name] = $p.Value
            }
        }
    }
    if ($newMcp.Count -eq 0) {
        $existing.Remove('mcpServers')
    } else {
        $existing['mcpServers'] = $newMcp
    }
}

$plannedJson = ConvertTo-Json $existing -Depth 10
$portablePlannedJson = ConvertTo-PortablePath $plannedJson

if (-not $Apply) {
    Write-Output "[DRY RUN] unregister-judge-memory.ps1 (no files modified; pass -Apply to write changes)"
    Write-Output "Target settings file: $portableSettings"
    Write-Output "Would remove hooks: SessionStart, PostToolUse, Stop, SessionEnd"
    Write-Output "Would remove MCP server: dream-judge-memory"
    Write-Output "Planned settings JSON after removal:"
    Write-Output $portablePlannedJson
    exit 0
}

if (Test-Path -LiteralPath $SettingsPath) {
    $stamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
    Copy-Item -LiteralPath $SettingsPath -Destination "$SettingsPath.bak-$stamp" -Force
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($SettingsPath, $plannedJson, $utf8NoBom)
}

Write-Output "[APPLIED] Unregistered judge-memory hooks and dream-judge-memory MCP server from $portableSettings"
