#requires -Version 5.1
<#
.SYNOPSIS
    Audits and removes standalone yt-dlp installations across fleet nodes while leaving
    tools that bundled it in place and ensuring YouTube scraping channel flags are
    disabled (enabled=false, yt_dlp_enabled=false, YouTube Data API v3 private uploads only).

.DESCRIPTION
    Supports -Node (alienware|t5500|all).
    Inspects:
      - python -m pip
      - uv tool list
      - pipx
      - winget
      - choco
      - scoop
      - standalone yt-dlp.exe paths
    Uninstalls standalone yt-dlp packages/binaries ONLY when -Apply is passed.
    Leaves tools that bundled yt-dlp (e.g. agent-reach, hermes) in place while setting
    any YouTube scraping channel flag enabled=false in tool configs (never touches secrets
    or .env* files).

    Prints [DRY RUN] by default and modifies nothing unless -Apply is passed.
#>
[CmdletBinding()]
param(
    [switch]$Apply,
    [ValidateSet('alienware', 't5500', 'all')]
    [string]$Node = 'all',
    [string]$RepoRoot = '',
    [string[]]$ConfigPaths = @(),
    [switch]$SkipManagerProbes,
    [switch]$NoRun
)

$ErrorActionPreference = 'Continue'

if (-not $RepoRoot) {
    $RepoRoot = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\..') | Select-Object -ExpandProperty Path
}

function ConvertTo-PortablePath {
    param([string]$RawText)
    if ([string]::IsNullOrWhiteSpace($RawText)) { return $RawText }
    $out = $RawText
    if ($env:LOCALAPPDATA) {
        $out = $out -ireplace [regex]::Escape($env:LOCALAPPDATA.TrimEnd('\')), '%LOCALAPPDATA%'
    }
    if ($env:USERPROFILE) {
        $out = $out -ireplace [regex]::Escape($env:USERPROFILE.TrimEnd('\')), '%USERPROFILE%'
    }
    $out = $out -ireplace '(?<![A-Za-z0-9])[cC]:[\\/]+[uU]sers[\\/]+[a-zA-Z0-9_.-]+', '%USERPROFILE%'
    return $out
}

function Get-TargetNodes {
    param([string]$RequestedNode = $Node)
    if ($RequestedNode -eq 'all') {
        return @('alienware', 't5500')
    }
    return @($RequestedNode.ToLowerInvariant())
}

function Test-IsBundledToolPath {
    param([string]$CandidatePath)
    if ([string]::IsNullOrWhiteSpace($CandidatePath)) { return $false }
    return ($CandidatePath -match '(?i)(\\|/)(agent-reach|hermes|open-webui|uv\\tools\\(?!yt-dlp)|pipx\\venvs\\(?!yt-dlp))(\\|/)')
}

function Get-YtDlpInspectionPlan {
    param(
        [string]$TargetNode = $Node,
        [string]$RootPath = $RepoRoot,
        [string[]]$ExplicitConfigs = $ConfigPaths,
        [switch]$SkipProbes = $SkipManagerProbes
    )

    $nodes = Get-TargetNodes -RequestedNode $TargetNode
    $managers = @()

    # 1. python -m pip
    $pipFound = $false
    if (-not $SkipProbes -and (Get-Command python -ErrorAction SilentlyContinue)) {
        $pipOut = & python -m pip show yt-dlp 2>$null | Out-String
        if ($LASTEXITCODE -eq 0 -and $pipOut -match '(?m)^Name:\s*yt-dlp\b') {
            $pipFound = $true
        }
    }
    $managers += [pscustomobject]@{
        Manager      = 'python -m pip'
        CheckCommand = 'python -m pip show yt-dlp'
        Found        = $pipFound
        ApplyCommand = 'python -m pip uninstall -y yt-dlp'
        Action       = if ($pipFound) { 'uninstall-package' } else { 'none' }
        Note         = 'Uninstalls standalone pip package yt-dlp only; leaves bundled tools intact'
    }

    # 2. uv tool list
    $uvFound = $false
    if (-not $SkipProbes -and (Get-Command uv -ErrorAction SilentlyContinue)) {
        $uvOut = & uv tool list 2>$null | Out-String
        if ($LASTEXITCODE -eq 0 -and $uvOut -match '(?m)^yt-dlp\s+v?[0-9]') {
            $uvFound = $true
        }
    }
    $managers += [pscustomobject]@{
        Manager      = 'uv tool list'
        CheckCommand = 'uv tool list'
        Found        = $uvFound
        ApplyCommand = 'uv tool uninstall yt-dlp'
        Action       = if ($uvFound) { 'uninstall-package' } else { 'none' }
        Note         = 'Uninstalls standalone uv tool yt-dlp only; leaves tools that bundled it in place'
    }

    # 3. pipx
    $pipxFound = $false
    if (-not $SkipProbes -and (Get-Command pipx -ErrorAction SilentlyContinue)) {
        $pipxOut = & pipx list 2>$null | Out-String
        if ($LASTEXITCODE -eq 0 -and $pipxOut -match 'package\s+yt-dlp\b') {
            $pipxFound = $true
        }
    }
    $managers += [pscustomobject]@{
        Manager      = 'pipx'
        CheckCommand = 'pipx list'
        Found        = $pipxFound
        ApplyCommand = 'pipx uninstall yt-dlp'
        Action       = if ($pipxFound) { 'uninstall-package' } else { 'none' }
        Note         = 'Uninstalls standalone pipx venv yt-dlp only; leaves bundled tools in place'
    }

    # 4. winget
    $wingetFound = $false
    if (-not $SkipProbes -and (Get-Command winget -ErrorAction SilentlyContinue)) {
        $wingetOut = & winget list --id yt-dlp.yt-dlp --accept-source-agreements 2>$null | Out-String
        if ($LASTEXITCODE -eq 0 -and $wingetOut -match 'yt-dlp\.yt-dlp') {
            $wingetFound = $true
        }
    }
    $managers += [pscustomobject]@{
        Manager      = 'winget'
        CheckCommand = 'winget list --id yt-dlp.yt-dlp'
        Found        = $wingetFound
        ApplyCommand = 'winget uninstall --id yt-dlp.yt-dlp --silent'
        Action       = if ($wingetFound) { 'uninstall-package' } else { 'none' }
        Note         = 'Uninstalls standalone winget package yt-dlp.yt-dlp'
    }

    # 5. choco
    $chocoFound = $false
    if (-not $SkipProbes -and (Get-Command choco -ErrorAction SilentlyContinue)) {
        $chocoOut = & choco list --local-only yt-dlp 2>$null | Out-String
        if ($LASTEXITCODE -eq 0 -and $chocoOut -match '(?m)^yt-dlp\s+[0-9]') {
            $chocoFound = $true
        }
    }
    $managers += [pscustomobject]@{
        Manager      = 'choco'
        CheckCommand = 'choco list --local-only yt-dlp'
        Found        = $chocoFound
        ApplyCommand = 'choco uninstall yt-dlp -y'
        Action       = if ($chocoFound) { 'uninstall-package' } else { 'none' }
        Note         = 'Uninstalls standalone Chocolatey package yt-dlp'
    }

    # 6. scoop
    $scoopFound = $false
    if (-not $SkipProbes -and (Get-Command scoop -ErrorAction SilentlyContinue)) {
        $scoopOut = & scoop list yt-dlp 2>$null | Out-String
        if ($LASTEXITCODE -eq 0 -and $scoopOut -match '(?m)^\s*yt-dlp\b') {
            $scoopFound = $true
        }
    }
    $managers += [pscustomobject]@{
        Manager      = 'scoop'
        CheckCommand = 'scoop list yt-dlp'
        Found        = $scoopFound
        ApplyCommand = 'scoop uninstall yt-dlp'
        Action       = if ($scoopFound) { 'uninstall-package' } else { 'none' }
        Note         = 'Uninstalls standalone Scoop package yt-dlp'
    }

    # 7. Standalone yt-dlp.exe paths
    $candidateExePaths = @()
    if ($env:LOCALAPPDATA) {
        $candidateExePaths += Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\yt-dlp.exe'
        $candidateExePaths += Join-Path $env:LOCALAPPDATA 'Programs\yt-dlp\yt-dlp.exe'
    }
    if ($env:USERPROFILE) {
        $candidateExePaths += Join-Path $env:USERPROFILE '.local\bin\yt-dlp.exe'
        $candidateExePaths += Join-Path $env:USERPROFILE 'scoop\shims\yt-dlp.exe'
    }
    if (-not $SkipProbes) {
        $cmdHits = @(Get-Command yt-dlp.exe -All -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
        foreach ($hit in $cmdHits) {
            if ($hit -and ($candidateExePaths -notcontains $hit)) {
                $candidateExePaths += $hit
            }
        }
    }

    $standaloneBinaries = @()
    foreach ($exePath in $candidateExePaths) {
        $exists = Test-Path -LiteralPath $exePath -PathType Leaf
        $bundled = Test-IsBundledToolPath -CandidatePath $exePath
        $standaloneBinaries += [pscustomobject]@{
            Path         = $exePath
            PortablePath = ConvertTo-PortablePath $exePath
            Found        = $exists
            BundledTool  = $bundled
            Action       = if ($exists -and -not $bundled) { 'remove-standalone-exe' } elseif ($exists -and $bundled) { 'keep-bundled-tool' } else { 'none' }
        }
    }

    # 8. Tool configs (never touches secrets or .env* files)
    $resolvedConfigs = @()
    if ($ExplicitConfigs -and $ExplicitConfigs.Count -gt 0) {
        $resolvedConfigs = @($ExplicitConfigs)
    } else {
        $resolvedConfigs = @(
            (Join-Path $RootPath 'ops\youtube-shorts-podcast\channels-config.json'),
            (Join-Path $RootPath 'ops\t5500\hermes-marketing-config.yaml')
        )
    }

    $configChecks = @()
    foreach ($cfgPath in $resolvedConfigs) {
        if ($cfgPath -match '(?i)(^|\\|/)\.env') {
            continue
        }
        $exists = Test-Path -LiteralPath $cfgPath -PathType Leaf
        $portableCfg = ConvertTo-PortablePath $cfgPath
        $alreadyDisabled = $false
        if ($exists) {
            $raw = Get-Content -LiteralPath $cfgPath -Raw -ErrorAction SilentlyContinue
            if ($cfgPath.EndsWith('.json')) {
                $alreadyDisabled = ($raw -match '"yt_dlp_enabled"\s*:\s*false') -and ($raw -match '"youtube_scraping_enabled"\s*:\s*false')
            } else {
                $alreadyDisabled = ($raw -match 'yt_dlp_enabled:\s*false')
            }
        }
        $configChecks += [pscustomobject]@{
            Path            = $cfgPath
            PortablePath    = $portableCfg
            Exists          = $exists
            AlreadyDisabled = $alreadyDisabled
            Action          = if (-not $exists) { 'missing' } elseif ($alreadyDisabled) { 'verified-disabled' } else { 'disable-youtube-scraping' }
        }
    }

    return [pscustomobject]@{
        Nodes              = $nodes
        Managers           = $managers
        StandaloneBinaries = $standaloneBinaries
        ConfigChecks       = $configChecks
    }
}

function Set-ToolConfigYouTubeScrapingDisabled {
    param([string]$ConfigPath)
    if ($ConfigPath -match '(?i)(^|\\|/)\.env') {
        throw 'Refusing to touch .env or secret files.'
    }
    if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
        return $false
    }
    if ($ConfigPath.EndsWith('.json')) {
        $json = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
        $json | Add-Member -NotePropertyName 'yt_dlp_enabled' -NotePropertyValue $false -Force
        $json | Add-Member -NotePropertyName 'youtube_scraping_enabled' -NotePropertyValue $false -Force
        $json | Add-Member -NotePropertyName 'youtube_publish_method' -NotePropertyValue 'youtube-data-api-v3' -Force
        if ($json.PSObject.Properties['channels'] -and $json.channels) {
            foreach ($ch in $json.channels) {
                $ch | Add-Member -NotePropertyName 'enabled' -NotePropertyValue $false -Force
                $ch | Add-Member -NotePropertyName 'yt_dlp_enabled' -NotePropertyValue $false -Force
                $ch | Add-Member -NotePropertyName 'youtube_scraping_enabled' -NotePropertyValue $false -Force
            }
        }
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($ConfigPath, ($json | ConvertTo-Json -Depth 10), $utf8NoBom)
        return $true
    }
    if ($ConfigPath.EndsWith('.yaml') -or $ConfigPath.EndsWith('.yml')) {
        $raw = Get-Content -LiteralPath $ConfigPath -Raw
        if ($raw -notmatch 'yt_dlp_enabled:\s*false') {
            $block = @(
                '',
                'youtube:',
                '  enabled: false',
                '  yt_dlp_enabled: false',
                '  youtube_scraping_enabled: false',
                '  publish_method: youtube-data-api-v3',
                '  upload_privacy: private',
                '  policy: "YouTube Data API v3 private uploads only (yt_dlp_enabled: false)"'
            ) -join "`r`n"
            $raw = $raw.TrimEnd() + "`r`n" + $block + "`r`n"
        } else {
            $raw = $raw -replace 'yt_dlp_enabled:\s*true', 'yt_dlp_enabled: false'
            $raw = $raw -replace 'youtube_scraping_enabled:\s*true', 'youtube_scraping_enabled: false'
        }
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($ConfigPath, $raw, $utf8NoBom)
        return $true
    }
    return $false
}

function Invoke-RemoveYtDlp {
    param(
        [switch]$Apply,
        [string]$TargetNode = $Node,
        [string]$RootPath = $RepoRoot,
        [string[]]$ExplicitConfigs = $ConfigPaths,
        [switch]$SkipProbes = $SkipManagerProbes
    )

    $plan = Get-YtDlpInspectionPlan -TargetNode $TargetNode -RootPath $RootPath -ExplicitConfigs $ExplicitConfigs -SkipProbes:$SkipProbes
    $prefix = if ($Apply) { '[APPLY]' } else { '[DRY RUN]' }

    Write-Host ("{0} Node scope: {1} (Alienware=192.168.0.40, T5500=192.168.0.15)" -f $prefix, ($plan.Nodes -join ', '))
    Write-Host ("{0} Policy: Uninstall standalone yt-dlp only with -Apply; keep bundled tools in place; set YouTube scraping channel enabled=false (YouTube Data API v3 private uploads only); never touch secrets." -f $prefix)

    foreach ($mgr in $plan.Managers) {
        if ($mgr.Found) {
            if (-not $Apply) {
                Write-Host ("{0} [{1}] yt-dlp detected via '{2}' -> would run: {3}" -f $prefix, $mgr.Manager, $mgr.CheckCommand, $mgr.ApplyCommand)
            } else {
                Write-Host ("{0} [{1}] Uninstalling standalone yt-dlp via: {2}" -f $prefix, $mgr.Manager, $mgr.ApplyCommand)
                switch ($mgr.Manager) {
                    'python -m pip' { & python -m pip uninstall -y yt-dlp | Out-Null }
                    'uv tool list'  { & uv tool uninstall yt-dlp | Out-Null }
                    'pipx'          { & pipx uninstall yt-dlp | Out-Null }
                    'winget'        { & winget uninstall --id yt-dlp.yt-dlp --silent | Out-Null }
                    'choco'         { & choco uninstall yt-dlp -y | Out-Null }
                    'scoop'         { & scoop uninstall yt-dlp | Out-Null }
                }
            }
        } else {
            Write-Host ("{0} [{1}] checked ({2}): standalone yt-dlp not installed (would run '{3}' if found with -Apply)" -f $prefix, $mgr.Manager, $mgr.CheckCommand, $mgr.ApplyCommand)
        }
    }

    foreach ($bin in $plan.StandaloneBinaries) {
        if ($bin.Action -eq 'remove-standalone-exe') {
            if (-not $Apply) {
                Write-Host ("{0} [standalone yt-dlp.exe] Found at {1} -> would remove standalone binary with -Apply" -f $prefix, $bin.PortablePath)
            } else {
                Remove-Item -LiteralPath $bin.Path -Force -ErrorAction SilentlyContinue
                Write-Host ("{0} [standalone yt-dlp.exe] Removed standalone binary at {1}" -f $prefix, $bin.PortablePath)
            }
        } elseif ($bin.Action -eq 'keep-bundled-tool') {
            Write-Host ("{0} [bundled tool] Keeping bundled tool at {1} in place (channel scraping disabled in config)" -f $prefix, $bin.PortablePath)
        } else {
            Write-Host ("{0} [standalone yt-dlp.exe] Absent at {1}" -f $prefix, $bin.PortablePath)
        }
    }

    foreach ($cfg in $plan.ConfigChecks) {
        if ($cfg.Action -eq 'verified-disabled') {
            Write-Host ("{0} [config] {1}: yt_dlp_enabled=false & YouTube scraping disabled (YouTube Data API v3 private uploads only)" -f $prefix, $cfg.PortablePath)
        } elseif ($cfg.Action -eq 'disable-youtube-scraping') {
            if (-not $Apply) {
                Write-Host ("{0} [config] {1}: would set enabled=false, yt_dlp_enabled=false, youtube_scraping_enabled=false (never touching secrets)" -f $prefix, $cfg.PortablePath)
            } else {
                Set-ToolConfigYouTubeScrapingDisabled -ConfigPath $cfg.Path | Out-Null
                Write-Host ("{0} [config] {1}: set enabled=false, yt_dlp_enabled=false, youtube_scraping_enabled=false" -f $prefix, $cfg.PortablePath)
            }
        } else {
            Write-Host ("{0} [config] {1}: not present on this checkout" -f $prefix, $cfg.PortablePath)
        }
    }

    return $plan
}

if (-not $NoRun) {
    Invoke-RemoveYtDlp -Apply:$Apply -TargetNode $Node -RootPath $RepoRoot -ExplicitConfigs $ConfigPaths -SkipProbes:$SkipManagerProbes | Out-Null
}
