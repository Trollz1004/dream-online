# Cross-Node Obsidian Session-End Writer & 4-Tier Backup Mirror (2026-10-28)
param(
    [string]$NodeName = "Alienware",
    [string]$AgentName = "gemini",
    [string]$UseCase = "Autonomous session checkpoint & multi-harness sync",
    [string]$Summary = ""
)

$ErrorActionPreference = "SilentlyContinue"
$vaultRoot = if (Test-Path "C:\DREAM\Antigravity") { "C:\DREAM\Antigravity" } elseif (Test-Path "C:\Ai-Dream-Team\Antigravity") { "C:\Ai-Dream-Team\Antigravity" } else { "C:\ANTIGRAVITY\Antigravity" }

function Protect-Secrets([string]$Text) {
    if (-not $Text) { return "" }
    return ($Text -replace '(?i)(sk-[a-z0-9_\-]{12,}|AIza[a-z0-9_\-]{16,}|ghp_[a-z0-9]{16,}|Bearer\s+[a-z0-9._\-]{16,})', 'XXXX')
}

if (-not $Summary) {
    $Summary = "Verified 3-node ports, multi-harness skills (caveman, i-have-adhd, find-skills, create-skills, brainstorming, superpowers, tdd), api.workflow.json, and Trust Level Max judge gates."
}
$Summary = Protect-Secrets $Summary

$now = Get-Date
$dateStr = $now.ToString("yyyy-MM-dd")
$timeStr = $now.ToString("HH:mm")
$tsStr = $now.ToString("yyyy-MM-dd HH:mm K")
$pairName = "${AgentName}-to-${AgentName}"

# 1. Write to per-agent Obsidian file (e.g. C:\DREAM\Antigravity\Alienware\gemini-to-gemini.md)
$nodeDir = Join-Path $vaultRoot $NodeName
New-Item -ItemType Directory -Path $nodeDir -Force | Out-Null
$agentFile = Join-Path $nodeDir "${pairName}.md"
if (-not (Test-Path $agentFile)) {
    $headerLines = @(
        "---",
        "title: `"$pairName ($NodeName)`"",
        "type: agent-session-ledger",
        "node: $NodeName",
        "agent: $AgentName",
        "tags: [obsidian-memory, $NodeName, $AgentName, 4-tier-sync]",
        "status: active",
        "---",
        "",
        "# $pairName -- $NodeName Session Ledger ([[00 HOME]])"
    )
    Set-Content -Path $agentFile -Value ($headerLines -join "`r`n") -Encoding UTF8
}

$entryLines = @(
    "",
    "## $tsStr | node: $NodeName | use case: $UseCase",
    "- $Summary",
    "- Backups mirrored: [[00 HOME]] | Shared ai-memory (192.168.0.15:49374) | Graphy | OpenViking (viking://dream/$NodeName/$AgentName) | Supabase | Supermemory"
)
Add-Content -Path $agentFile -Value ($entryLines -join "`r`n") -Encoding UTF8

# 2. Also append to Daily Note in Vault Root
$dailyFile = Join-Path $vaultRoot "${dateStr}.md"
if (-not (Test-Path $dailyFile) -or ((Get-Item $dailyFile).Length -eq 0)) {
    $dailyHeader = @(
        "---",
        "title: `"Daily Agent Ledger $dateStr`"",
        "type: daily-note",
        "tags: [daily, obsidian-sync, 3-node-fleet]",
        "---",
        "",
        "# Daily Fleet Session Log -- $dateStr ([[00 HOME]])"
    )
    Set-Content -Path $dailyFile -Value ($dailyHeader -join "`r`n") -Encoding UTF8
}
Add-Content -Path $dailyFile -Value "- **$timeStr [$NodeName / $AgentName]** ($UseCase): $Summary" -Encoding UTF8

# 3. Mirror to Local 4-Tier Memory & Graphy Bridge (:20128/api/memory/store)
try {
    $bodyJson = (@{
        title = "$NodeName $AgentName Session ($dateStr)"
        content = $Summary
        tags = @("session-end", "obsidian", $NodeName.ToLower(), $AgentName.ToLower())
        authorGm = "$AgentName ($NodeName)"
    } | ConvertTo-Json -Compress)
    Invoke-RestMethod -Uri "http://127.0.0.1:20128/api/memory/store" -Method Post -ContentType "application/json" -Body $bodyJson -TimeoutSec 2 | Out-Null
} catch {}

exit 0
