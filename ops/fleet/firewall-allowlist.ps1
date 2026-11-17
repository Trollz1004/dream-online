#requires -Version 5.1
<#
.SYNOPSIS
    Configures inbound Windows Firewall rules for LAN fleet ports limited to
    Alienware (192.168.0.40) and T5500 (192.168.0.15).

.DESCRIPTION
    Reads ops/fleet/fleet-map.json and creates one inbound TCP allow rule per LAN
    service port, scoped strictly to -RemoteAddress 192.168.0.15,192.168.0.40.
    Services marked "this machine only" (Postgres 5432, Redis 6379, Obsidian REST 27123)
    bind 127.0.0.1 and never receive an inbound LAN firewall rule.

    Prints [DRY RUN] by default and modifies nothing unless -Apply is passed.
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

function Get-FleetFirewallPlan {
    param(
        [string]$MapPath = $FleetMapPath,
        [string]$TargetNode = $Node
    )
    $map = Get-Content -LiteralPath $MapPath -Raw | ConvertFrom-Json
    $remoteAddresses = @('192.168.0.15', '192.168.0.40')
    $rules = @()
    $skippedLoopback = @()

    foreach ($svc in $map.services) {
        if ($TargetNode -ne 'all' -and $svc.node -ne $TargetNode) { continue }
        if ($svc.scope -eq 'this machine only' -or $svc.bind -eq '127.0.0.1') {
            $skippedLoopback += [pscustomobject]@{
                Id   = [string]$svc.id
                Node = [string]$svc.node
                Port = [int]$svc.port
                Bind = [string]$svc.bind
            }
            continue
        }
        $ruleName = "DREAM-Fleet-$($svc.node)-$($svc.id)-TCP-$($svc.port)"
        $rules += [pscustomobject]@{
            RuleName      = $ruleName
            ServiceId     = [string]$svc.id
            ServiceName   = [string]$svc.name
            Node          = [string]$svc.node
            LocalPort     = [int]$svc.port
            Scope         = [string]$svc.scope
            RemoteAddress = $remoteAddresses
        }
    }

    return [pscustomobject]@{
        RemoteAddress   = $remoteAddresses
        Rules           = $rules
        SkippedLoopback = $skippedLoopback
    }
}

function Invoke-FleetFirewallAllowlist {
    param(
        [switch]$Apply,
        [string]$MapPath = $FleetMapPath,
        [string]$TargetNode = $Node
    )
    $plan = Get-FleetFirewallPlan -MapPath $MapPath -TargetNode $TargetNode
    $remoteJoined = $plan.RemoteAddress -join ','

    foreach ($skip in $plan.SkippedLoopback) {
        $prefix = if ($Apply) { '[SKIP]' } else { '[DRY RUN]' }
        Write-Host ("{0} Skip loopback-only service {1} ({2}:{3}, bind {4})" -f $prefix, $skip.Id, $skip.Node, $skip.Port, $skip.Bind)
    }

    foreach ($rule in $plan.Rules) {
        if (-not $Apply) {
            Write-Host ("[DRY RUN] New-NetFirewallRule -DisplayName '{0}' -Direction Inbound -Action Allow -Protocol TCP -LocalPort {1} -RemoteAddress {2}" -f $rule.RuleName, $rule.LocalPort, $remoteJoined)
            continue
        }
        $existing = Get-NetFirewallRule -DisplayName $rule.RuleName -ErrorAction SilentlyContinue
        if ($existing) {
            Remove-NetFirewallRule -DisplayName $rule.RuleName -ErrorAction SilentlyContinue
        }
        New-NetFirewallRule `
            -DisplayName $rule.RuleName `
            -Direction Inbound `
            -Action Allow `
            -Protocol TCP `
            -LocalPort $rule.LocalPort `
            -RemoteAddress $plan.RemoteAddress | Out-Null
        Write-Host ("[APPLIED] Firewall rule '{0}' on TCP port {1} limited to -RemoteAddress {2}" -f $rule.RuleName, $rule.LocalPort, $remoteJoined)
    }

    return $plan
}

if (-not $NoRun) {
    Invoke-FleetFirewallAllowlist -Apply:$Apply -MapPath $FleetMapPath -TargetNode $Node | Out-Null
}
