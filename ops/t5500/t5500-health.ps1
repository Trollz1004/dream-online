#requires -Version 5.1
<#
.SYNOPSIS
    The T5500's self-healing health check: heals first, then tells.

.DESCRIPTION
    Probes four things, each by identity, never by an open port alone:
      - the Hermes "marketing" gateway at http://127.0.0.1:8377/health,
        confirmed by the identity its own /health route returns
        ("platform":"hermes-agent"), not just a 200;
      - OmniRoute on Sabretooth at http://192.168.0.8:20128/v1/models,
        confirmed by the response containing "data":[ — remote, reported,
        never healed from here;
      - gh auth status, confirmed by its exit code;
      - free disk space on the system drive, above 10 GB.

    The marketing gateway is the only thing this script heals: if it is
    down, it runs `hermes -p marketing gateway start` once, waits briefly,
    and re-probes before deciding the final status. Nothing else gets a
    heal attempt — a remote dependency and a sign-in state are reported,
    not fixed from here.

    Writes C:\DREAM\ops-state\t5500\health.json (status GREEN, YELLOW, or
    RED, with per-check detail and times) and appends one line to
    health.log. With -Verbose, also prints a plain-words table.

.PARAMETER Verbose
    Print a plain-words table of every check after probing.

.PARAMETER NoRun
    Load every function in this file without probing anything. Used by
    t5500-health.Tests.ps1 to dot-source the script and mock the probes.
#>
param(
    [switch]$Verbose,
    [switch]$NoRun
)

# ---------------------------------------------------------------------------
# Paths and constants
# ---------------------------------------------------------------------------

$script:OpsStateRoot   = 'C:\DREAM\ops-state\t5500'
$script:HealthJsonPath = Join-Path $script:OpsStateRoot 'health.json'
$script:HealthLogPath  = Join-Path $script:OpsStateRoot 'health.log'

$script:MarketingGatewayUrl = 'http://127.0.0.1:8377/health'
$script:MarketingGatewayIdentity = '"platform":"hermes-agent"'
$script:OmniRouteUrl = 'http://192.168.0.8:20128/v1/models'
$script:OmniRouteIdentity = '"data":['
$script:MinimumFreeDiskGB = 10
$script:SystemDriveLetter = 'C'

# ---------------------------------------------------------------------------
# Probes — each one returns @{ Healthy = [bool]; Detail = [string] }
# ---------------------------------------------------------------------------

function Test-MarketingGateway {
    param([string]$Url = $script:MarketingGatewayUrl, [string]$Identity = $script:MarketingGatewayIdentity)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        if ($response.Content -match [regex]::Escape($Identity)) {
            return @{ Healthy = $true; Detail = 'responded with the hermes-agent platform identity' }
        }
        return @{ Healthy = $false; Detail = 'responded but without the expected platform identity' }
    } catch {
        return @{ Healthy = $false; Detail = "unreachable: $($_.Exception.Message)" }
    }
}

function Test-OmniRoute {
    param([string]$Url = $script:OmniRouteUrl, [string]$Identity = $script:OmniRouteIdentity)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        if ($response.Content -match [regex]::Escape($Identity)) {
            return @{ Healthy = $true; Detail = 'responded with a models data array' }
        }
        return @{ Healthy = $false; Detail = 'responded but without a models data array' }
    } catch {
        return @{ Healthy = $false; Detail = "unreachable: $($_.Exception.Message)" }
    }
}

function Test-GhAuth {
    try {
        & gh auth status 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            return @{ Healthy = $true; Detail = 'gh auth status exited 0' }
        }
        return @{ Healthy = $false; Detail = 'gh auth status exited non-zero; not signed in' }
    } catch {
        return @{ Healthy = $false; Detail = "gh is not available: $($_.Exception.Message)" }
    }
}

function Test-FreeDisk {
    param([string]$DriveLetter = $script:SystemDriveLetter, [double]$MinimumGB = $script:MinimumFreeDiskGB)
    try {
        $drive = Get-PSDrive -Name $DriveLetter -ErrorAction Stop
        $freeGB = [math]::Round($drive.Free / 1GB, 2)
        if ($freeGB -ge $MinimumGB) {
            return @{ Healthy = $true; Detail = "$freeGB GB free" }
        }
        return @{ Healthy = $false; Detail = "$freeGB GB free, below the ${MinimumGB} GB floor" }
    } catch {
        return @{ Healthy = $false; Detail = "could not read drive ${DriveLetter}: $($_.Exception.Message)" }
    }
}

function Invoke-MarketingGatewayHeal {
    try {
        & hermes -p marketing gateway start 2>$null | Out-Null
        Start-Sleep -Seconds 5
        return $true
    } catch {
        return $false
    }
}

# ---------------------------------------------------------------------------
# Status rules
# ---------------------------------------------------------------------------

function Get-T5500HealthStatus {
    <#
        RED  — the local marketing gateway is still down after a heal
               attempt, or free disk is below the floor. Either one is a
               this-machine problem that needs a human.
        YELLOW — OmniRoute is unreachable (a Sabretooth dependency, never
               healed from here) or gh is not signed in, but the gateway
               and disk are fine.
        GREEN — every check passes.
    #>
    param([Parameter(Mandatory)][hashtable]$Checks)

    if (-not $Checks.MarketingGateway.Healthy -or -not $Checks.FreeDisk.Healthy) {
        return 'RED'
    }
    if (-not $Checks.OmniRoute.Healthy -or -not $Checks.GhAuth.Healthy) {
        return 'YELLOW'
    }
    return 'GREEN'
}

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

function Write-T5500HealthJson {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Status,
        [Parameter(Mandatory)][hashtable]$Checks,
        [Parameter(Mandatory)][bool]$Healed
    )
    $dir = Split-Path -Path $Path -Parent
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $payload = @{
        status = $Status
        time = (Get-Date).ToString('o')
        healed = $Healed
        checks = @{
            marketing_gateway = @{ healthy = $Checks.MarketingGateway.Healthy; detail = $Checks.MarketingGateway.Detail }
            omniroute          = @{ healthy = $Checks.OmniRoute.Healthy; detail = $Checks.OmniRoute.Detail; note = 'remote, reported, never healed from this machine' }
            gh_auth            = @{ healthy = $Checks.GhAuth.Healthy; detail = $Checks.GhAuth.Detail }
            free_disk          = @{ healthy = $Checks.FreeDisk.Healthy; detail = $Checks.FreeDisk.Detail }
        }
    }
    ($payload | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Write-T5500HealthLogLine {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Status
    )
    $dir = Split-Path -Path $Path -Parent
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $line = '[{0}] {1}' -f (Get-Date).ToString('s'), $Status
    Add-Content -LiteralPath $Path -Value $line -Encoding UTF8
}

function Show-T5500HealthTable {
    param([Parameter(Mandatory)][hashtable]$Checks, [Parameter(Mandatory)][string]$Status)
    Write-Host ("Overall status: {0}" -f $Status)
    Write-Host ("  Marketing gateway (127.0.0.1:8377): {0} - {1}" -f (Get-HealthWord $Checks.MarketingGateway.Healthy), $Checks.MarketingGateway.Detail)
    Write-Host ("  OmniRoute (192.168.0.8:20128, remote, never healed): {0} - {1}" -f (Get-HealthWord $Checks.OmniRoute.Healthy), $Checks.OmniRoute.Detail)
    Write-Host ("  GitHub CLI sign-in: {0} - {1}" -f (Get-HealthWord $Checks.GhAuth.Healthy), $Checks.GhAuth.Detail)
    Write-Host ("  Free disk space: {0} - {1}" -f (Get-HealthWord $Checks.FreeDisk.Healthy), $Checks.FreeDisk.Detail)
}

function Get-HealthWord {
    param([bool]$Healthy)
    if ($Healthy) { 'OK' } else { 'FAIL' }
}

# ---------------------------------------------------------------------------
# Main entry
# ---------------------------------------------------------------------------

function Invoke-T5500Health {
    param(
        [switch]$Verbose,
        [string]$JsonPath = $script:HealthJsonPath,
        [string]$LogPath = $script:HealthLogPath
    )

    $checks = @{
        MarketingGateway = Test-MarketingGateway
        OmniRoute        = Test-OmniRoute
        GhAuth           = Test-GhAuth
        FreeDisk         = Test-FreeDisk
    }

    $healed = $false
    if (-not $checks.MarketingGateway.Healthy) {
        if (Invoke-MarketingGatewayHeal) {
            $recheck = Test-MarketingGateway
            if ($recheck.Healthy) {
                $healed = $true
                $checks.MarketingGateway = $recheck
            }
        }
    }

    $status = Get-T5500HealthStatus -Checks $checks

    Write-T5500HealthJson -Path $JsonPath -Status $status -Checks $checks -Healed $healed
    Write-T5500HealthLogLine -Path $LogPath -Status $status

    if ($Verbose) { Show-T5500HealthTable -Checks $checks -Status $status }

    return @{ Status = $status; Checks = $checks; Healed = $healed }
}

# ---------------------------------------------------------------------------
# Run, unless a test harness dot-sourced this file with -NoRun
# ---------------------------------------------------------------------------

if (-not $NoRun) {
    Invoke-T5500Health -Verbose:$Verbose | Out-Null
}
