#requires -Version 5.1
<#
.SYNOPSIS
    Configures LAN bind environment and launch settings for Free Claude Code (:8082),
    Panda Router (:8765), and Ollama (:11434) with a token gate.

.DESCRIPTION
    Reads ops/fleet/fleet-map.json and prepares the LAN bind settings for:
      - Free Claude Code (:8082) on 192.168.0.40:8082 (lan-guarded, requires FLEET_SHARED_TOKEN)
      - Panda Router (:8765) on 192.168.0.40:8765 (lan-guarded, requires FLEET_SHARED_TOKEN)
      - Ollama (:11434) on 192.168.0.40:11434 and 192.168.0.15:11434 (lan-guarded, requires FLEET_SHARED_TOKEN)

    Prints [DRY RUN] by default and changes no environment variables or service state
    unless -Apply is passed. When -Apply is passed, refuses to bind guarded services
    to 0.0.0.0 if FLEET_SHARED_TOKEN is not set.
#>
[CmdletBinding()]
param(
    [switch]$Apply,
    [ValidateSet('all', 'alienware', 't5500')]
    [string]$Node = 'all',
    [string]$FleetMapPath = '',
    [switch]$NoRun
)

if (-not $FleetMapPath) {
    $FleetMapPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'fleet-map.json'
}

function Get-LanBindPlan {
    param(
        [string]$MapPath = $FleetMapPath,
        [string]$TargetNode = $Node
    )
    $map = Get-Content -LiteralPath $MapPath -Raw | ConvertFrom-Json
    $fcc = $map.services | Where-Object { $_.id -eq 'free-claude-code' } | Select-Object -First 1
    $panda = $map.services | Where-Object { $_.id -eq 'panda-router' } | Select-Object -First 1
    $ollamaAw = $map.services | Where-Object { $_.id -eq 'alienware-ollama' } | Select-Object -First 1
    $ollamaT5 = $map.services | Where-Object { $_.id -eq 't5500-ollama' } | Select-Object -First 1

    $items = @()
    if ($TargetNode -eq 'all' -or $TargetNode -eq 'alienware') {
        $items += [pscustomobject]@{
            ServiceId    = 'free-claude-code'
            Node         = [string]$fcc.node
            Port         = [int]$fcc.port
            Bind         = [string]$fcc.bind
            ReachUrl     = "http://$($fcc.host):$($fcc.port)/admin"
            EnvName      = 'FCC_HOST'
            EnvValue     = [string]$fcc.bind
            TokenGateEnv = [string]$fcc.authTokenEnv
            LaunchHint   = "serve(['--auto-started', '--host', '$($fcc.bind)', '--port', '$($fcc.port)'])"
        }
        $items += [pscustomobject]@{
            ServiceId    = 'panda-router'
            Node         = [string]$panda.node
            Port         = [int]$panda.port
            Bind         = [string]$panda.bind
            ReachUrl     = "http://$($panda.host):$($panda.port)/route"
            EnvName      = 'PANDA_ROUTER_BIND'
            EnvValue     = [string]$panda.bind
            TokenGateEnv = [string]$panda.authTokenEnv
            LaunchHint   = "uvicorn panda_router:app --host $($panda.bind) --port $($panda.port)"
        }
    }
    $items += [pscustomobject]@{
        ServiceId    = 'ollama'
        Node         = if ($TargetNode -eq 't5500') { [string]$ollamaT5.node } else { [string]$ollamaAw.node }
        Port         = [int]$ollamaAw.port
        Bind         = [string]$ollamaAw.bind
        ReachUrl     = "http://$($ollamaAw.host):$($ollamaAw.port)/api/tags, http://$($ollamaT5.host):$($ollamaT5.port)/api/tags"
        EnvName      = 'OLLAMA_HOST'
        EnvValue     = "$($ollamaAw.bind):$($ollamaAw.port)"
        TokenGateEnv = [string]$ollamaAw.authTokenEnv
        LaunchHint   = "OLLAMA_HOST=$($ollamaAw.bind):$($ollamaAw.port) ollama serve"
    }
    return $items
}

function Invoke-ConfigureLanBinds {
    param(
        [switch]$Apply,
        [string]$MapPath = $FleetMapPath,
        [string]$TargetNode = $Node
    )
    $plan = Get-LanBindPlan -MapPath $MapPath -TargetNode $TargetNode
    $tokenPresent = -not [string]::IsNullOrWhiteSpace($env:FLEET_SHARED_TOKEN)
    $tokenStatus = if ($tokenPresent) { 'present' } else { 'missing (set FLEET_SHARED_TOKEN before -Apply)' }

    foreach ($item in $plan) {
        $gateInfo = if ($item.TokenGateEnv) { "token gate $($item.TokenGateEnv)=$tokenStatus" } else { 'no token gate required' }
        if (-not $Apply) {
            Write-Host ("[DRY RUN] {0} (:{1}) -> set {2}={3} | launch: {4} | reach: {5} ({6})" -f $item.ServiceId, $item.Port, $item.EnvName, $item.EnvValue, $item.LaunchHint, $item.ReachUrl, $gateInfo)
            continue
        }
        if ($item.TokenGateEnv -and -not $tokenPresent) {
            throw "Refusing to apply LAN bind for $($item.ServiceId) (:$($item.Port)) without $($item.TokenGateEnv) set in environment."
        }
        [Environment]::SetEnvironmentVariable($item.EnvName, $item.EnvValue, 'User')
        Write-Host ("[APPLIED] {0} (:{1}) -> User env {2}={3} ({4})" -f $item.ServiceId, $item.Port, $item.EnvName, $item.EnvValue, $gateInfo)
    }

    return $plan
}

if (-not $NoRun) {
    Invoke-ConfigureLanBinds -Apply:$Apply -MapPath $FleetMapPath -TargetNode $Node | Out-Null
}
