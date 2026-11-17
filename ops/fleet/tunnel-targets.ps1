#requires -Version 5.1
<#
.SYNOPSIS
    Updates %USERPROFILE%\.cloudflared\config.yml on the T5500 so LAN service ingress
    targets point to 192.168.0.15:PORT instead of loopback and removes stale
    dashboard.aidoesitall.website entries.

.DESCRIPTION
    Reads ops/fleet/fleet-map.json for the T5500 host (192.168.0.15) and its LAN ports.
    Prints [DRY RUN] by default and writes nothing unless -Apply is passed.
    When -Apply is passed, writes a timestamped backup of %USERPROFILE%\.cloudflared\config.yml
    before updating the file in place.
#>
[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$ConfigPath = (Join-Path $env:USERPROFILE '.cloudflared\config.yml'),
    [string]$FleetMapPath = '',
    [switch]$NoRun
)

if (-not $FleetMapPath) {
    $FleetMapPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'fleet-map.json'
}

function ConvertTo-PortableUserPath {
    param([string]$InputPath)
    if ([string]::IsNullOrWhiteSpace($InputPath)) { return '' }
    $homeDir = $env:USERPROFILE
    if ($homeDir -and $InputPath.StartsWith($homeDir, [System.StringComparison]::OrdinalIgnoreCase)) {
        return ('%USERPROFILE%' + $InputPath.Substring($homeDir.Length))
    }
    return $InputPath
}

function Get-T5500LanPorts {
    param([string]$MapPath = $FleetMapPath)
    $map = Get-Content -LiteralPath $MapPath -Raw | ConvertFrom-Json
    $ports = @(
        $map.services |
            Where-Object { $_.node -eq 't5500' -and $_.scope -ne 'this machine only' -and $_.bind -ne '127.0.0.1' } |
            ForEach-Object { [int]$_.port } |
            Select-Object -Unique |
            Sort-Object
    )
    return $ports
}

function Update-CloudflaredConfigText {
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string]$Content,
        [string]$NodeHost = '192.168.0.15',
        [int[]]$LanPorts = @(3130, 3200, 8000, 8377, 8643, 9119, 9127, 9160, 9165, 11434, 20128, 49374)
    )
    $lines = $Content -split "\r?\n"
    $keptLines = New-Object System.Collections.Generic.List[string]
    $skipNextServiceLine = $false

    foreach ($line in $lines) {
        if ($line -match '(?i)dashboard\.aidoesitall\.website') {
            $skipNextServiceLine = $true
            continue
        }
        if ($skipNextServiceLine -and $line -match '^\s*service\s*:') {
            $skipNextServiceLine = $false
            continue
        }
        $skipNextServiceLine = $false

        $updatedLine = $line
        foreach ($port in $LanPorts) {
            $pattern = '(?i)\b(?:127\.0\.0\.1|localhost):' + [regex]::Escape([string]$port) + '\b'
            $updatedLine = [regex]::Replace($updatedLine, $pattern, "${NodeHost}:${port}")
        }
        $keptLines.Add($updatedLine) | Out-Null
    }

    return ($keptLines -join "`r`n")
}

function Invoke-TunnelTargetsUpdate {
    param(
        [switch]$Apply,
        [string]$TargetConfigPath = $ConfigPath,
        [string]$MapPath = $FleetMapPath
    )
    $map = Get-Content -LiteralPath $MapPath -Raw | ConvertFrom-Json
    $t5500Host = [string]$map.nodes.t5500.host
    $lanPorts = Get-T5500LanPorts -MapPath $MapPath
    $portableConfig = ConvertTo-PortableUserPath -InputPath $TargetConfigPath
    $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
    $backupPath = "${TargetConfigPath}.bak-${stamp}"
    $portableBackup = ConvertTo-PortableUserPath -InputPath $backupPath

    if (-not $Apply) {
        Write-Host ("[DRY RUN] Would back up {0} -> {1}" -f $portableConfig, $portableBackup)
        Write-Host ("[DRY RUN] Would rewrite 127.0.0.1:PORT targets to {0}:PORT for LAN ports: {1}" -f $t5500Host, ($lanPorts -join ', '))
        Write-Host "[DRY RUN] Would drop stale hostname dashboard.aidoesitall.website from ingress rules"
        return [pscustomobject]@{
            Applied      = $false
            ConfigPath   = $portableConfig
            BackupPath   = $portableBackup
            NodeHost     = $t5500Host
            LanPorts     = $lanPorts
        }
    }

    if (-not (Test-Path -LiteralPath $TargetConfigPath)) {
        throw "Cloudflared config not found at $portableConfig"
    }

    Copy-Item -LiteralPath $TargetConfigPath -Destination $backupPath -Force
    $raw = Get-Content -LiteralPath $TargetConfigPath -Raw
    $updated = Update-CloudflaredConfigText -Content $raw -NodeHost $t5500Host -LanPorts $lanPorts
    Set-Content -LiteralPath $TargetConfigPath -Value $updated -Encoding UTF8
    Write-Host ("[APPLIED] Backed up {0} -> {1} and updated LAN tunnel targets to {2}" -f $portableConfig, $portableBackup, $t5500Host)

    return [pscustomobject]@{
        Applied      = $true
        ConfigPath   = $portableConfig
        BackupPath   = $portableBackup
        NodeHost     = $t5500Host
        LanPorts     = $lanPorts
    }
}

if (-not $NoRun) {
    Invoke-TunnelTargetsUpdate -Apply:$Apply -TargetConfigPath $ConfigPath -MapPath $FleetMapPath | Out-Null
}
