#requires -Version 5.1
<#
.SYNOPSIS
    Josh-proofed bootstrap for a fresh Windows 10 T5500: installs every
    dependency with winget and npm, in order, with state that survives a
    restart, pauses for sign-in clicks, and never closes the window on an
    error.

.DESCRIPTION
    Run this through Bootstrap-T5500.cmd, which elevates and keeps the
    PowerShell window open with -NoExit. This script is the step engine
    plus the real steps for the T5500. State lives in
    C:\DREAM\ops-state\t5500\bootstrap-state.json; the log lives next to it
    as bootstrap.log. Re-running the script resumes from whatever the state
    file says is already completed or skipped.

.PARAMETER DryRun
    Walk every step, printing what it would run, and run nothing: no
    checks, no actions, no verifies, no state or log writes.

.PARAMETER NoRun
    Load every function in this file without starting the bootstrap. Used
    by Bootstrap-T5500.Tests.ps1 to dot-source the script and test the step
    engine directly.
#>
param(
    [switch]$DryRun,
    [switch]$NoRun
)

# ---------------------------------------------------------------------------
# Paths and constants
# ---------------------------------------------------------------------------

$script:ScriptRoot    = $PSScriptRoot
$script:DreamRoot      = 'C:\DREAM'
$script:OpsStateRoot   = 'C:\DREAM\ops-state\t5500'
$script:ReconDir       = 'C:\DREAM\recon'
$script:StatePath      = Join-Path $script:OpsStateRoot 'bootstrap-state.json'
$script:LogPath        = Join-Path $script:OpsStateRoot 'bootstrap.log'
$script:DoneFilePath   = Join-Path $script:OpsStateRoot 'BOOTSTRAP-DONE.md'
$script:HermesLocalAppData = Join-Path $env:LOCALAPPDATA 'hermes'
$script:MarketingProfileDir = Join-Path $script:HermesLocalAppData 'profiles\marketing'
$script:ClaudeCredentialsPath = Join-Path $env:USERPROFILE '.claude\.credentials.json'
$script:HealthScheduledTaskName = 'DREAM-T5500-Health'

# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

function Test-CommandAvailable {
    param([Parameter(Mandatory)][string]$Name)
    return [bool](Get-Command -Name $Name -ErrorAction SilentlyContinue)
}

function Update-SessionPath {
    # A winget or npm install updates the machine/user PATH in the registry,
    # but this PowerShell session does not see it until we refresh $env:Path.
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts   = @($machine, $user) | Where-Object { $_ }
    $env:Path = ($parts -join ';')
}

function Test-WingetPackageInstalled {
    param([Parameter(Mandatory)][string]$Id)
    if (-not (Test-CommandAvailable -Name 'winget')) { return $false }
    $out = & winget list --id $Id -e --accept-source-agreements 2>$null
    return ($LASTEXITCODE -eq 0) -and ($out -match [regex]::Escape($Id))
}

function Install-WingetPackage {
    param([Parameter(Mandatory)][string]$Id)
    & winget install --id $Id -e --source winget --accept-source-agreements --accept-package-agreements -h
    Update-SessionPath
}

function Get-LanIPv4Address {
    $candidate = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' -and
            $_.InterfaceAlias -notmatch 'Loopback'
        } |
        Select-Object -First 1
    if ($candidate) { return $candidate.IPAddress }
    return '<this machine LAN IP>'
}

# ---------------------------------------------------------------------------
# State and log
# ---------------------------------------------------------------------------

function Read-BootstrapState {
    param([Parameter(Mandatory)][string]$Path)
    $state = @{ steps = @{} }
    if (-not (Test-Path -LiteralPath $Path)) { return $state }
    try {
        $raw = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
        if ($raw.PSObject.Properties.Name -contains 'steps' -and $raw.steps) {
            foreach ($prop in $raw.steps.PSObject.Properties) {
                $state.steps[$prop.Name] = @{
                    status = $prop.Value.status
                    time   = $prop.Value.time
                }
            }
        }
    } catch {
        # A corrupt or partially-written state file is treated as empty
        # rather than fatal; the resume logic just starts over.
        $state = @{ steps = @{} }
    }
    return $state
}

function Write-BootstrapState {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][hashtable]$State
    )
    $dir = Split-Path -Path $Path -Parent
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    ($State | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Set-StepStatus {
    param(
        [Parameter(Mandatory)][hashtable]$State,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][ValidateSet('completed', 'skipped')][string]$Status
    )
    if (-not $State.steps) { $State.steps = @{} }
    $State.steps[$Name] = @{
        status = $Status
        time   = (Get-Date).ToString('o')
    }
    return $State
}

function Write-BootstrapLog {
    param(
        [Parameter(Mandatory)][string]$Message,
        [Parameter(Mandatory)][string]$Path
    )
    $dir = Split-Path -Path $Path -Parent
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $line = '[{0}] {1}' -f (Get-Date).ToString('s'), $Message
    Add-Content -LiteralPath $Path -Value $line -Encoding UTF8
}

function New-ApiKey {
    # 48 characters from a safe alphanumeric alphabet. Cryptographically
    # random, and this function never logs or prints what it generates —
    # callers must write the result straight to the profile's .env file.
    param([int]$Length = 48)
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    $chars = New-Object char[] $Length
    for ($i = 0; $i -lt $Length; $i++) {
        $chars[$i] = $alphabet[$bytes[$i] % $alphabet.Length]
    }
    -join $chars
}

# ---------------------------------------------------------------------------
# The step engine
# ---------------------------------------------------------------------------

function Invoke-BootstrapStep {
    <#
        Runs one step to completion: Check decides whether it is already
        done; if not, Action runs and Verify confirms it. A failed Verify
        prints a plain sentence, logs it, and asks the operator to retry
        (Enter), skip (type 'skip'), or quit (type 'quit'). Returns an
        updated state plus a Result of 'Completed', 'Skipped', 'Quit', or
        'DryRun'.
    #>
    param(
        [Parameter(Mandatory)]$Step,
        [Parameter(Mandatory)][hashtable]$State,
        [Parameter(Mandatory)][string]$StatePath,
        [Parameter(Mandatory)][string]$LogPath,
        [switch]$DryRun
    )

    $name = $Step.Name

    if ($DryRun) {
        Write-Host ("[DryRun] Would run step '{0}': {1}" -f $name, $Step.Description)
        return @{ State = $State; Result = 'DryRun' }
    }

    if ($State.steps -and $State.steps.ContainsKey($name)) {
        $existing = $State.steps[$name].status
        if ($existing -eq 'completed' -or $existing -eq 'skipped') {
            Write-Host ("Step '{0}' was already {1}; resuming past it." -f $name, $existing)
            return @{ State = $State; Result = $existing }
        }
    }

    while ($true) {
        $already = $false
        try { $already = [bool](& $Step.Check) } catch { $already = $false }

        if ($already) {
            Write-Host ("Step '{0}' is already done." -f $name)
            Write-BootstrapLog -Message ("Step '{0}' check passed; already done." -f $name) -Path $LogPath
            $State = Set-StepStatus -State $State -Name $name -Status 'completed'
            Write-BootstrapState -Path $StatePath -State $State
            return @{ State = $State; Result = 'completed' }
        }

        $actionOk = $true
        try {
            & $Step.Action
        } catch {
            $actionOk = $false
            Write-BootstrapLog -Message ("Step '{0}' action failed: {1}" -f $name, $_.Exception.Message) -Path $LogPath
        }

        $verifyOk = $false
        if ($actionOk) {
            try { $verifyOk = [bool](& $Step.Verify) } catch { $verifyOk = $false }
        }

        if ($verifyOk) {
            Write-Host ("Step '{0}' finished." -f $name)
            Write-BootstrapLog -Message ("Step '{0}' completed." -f $name) -Path $LogPath
            $State = Set-StepStatus -State $State -Name $name -Status 'completed'
            Write-BootstrapState -Path $StatePath -State $State
            return @{ State = $State; Result = 'completed' }
        }

        Write-Host ("Step '{0}' did not finish: {1}" -f $name, $Step.Description)
        Write-BootstrapLog -Message ("Step '{0}' failed verification." -f $name) -Path $LogPath
        $response = Read-Host "Press Enter to retry, type 'skip' to skip this step, or type 'quit' to stop"
        $response = ('' + $response).Trim().ToLowerInvariant()

        if ($response -eq 'skip') {
            $State = Set-StepStatus -State $State -Name $name -Status 'skipped'
            Write-BootstrapState -Path $StatePath -State $State
            Write-BootstrapLog -Message ("Step '{0}' skipped by operator." -f $name) -Path $LogPath
            Write-Host ("Step '{0}' marked skipped." -f $name)
            return @{ State = $State; Result = 'skipped' }
        }
        if ($response -eq 'quit') {
            Write-BootstrapLog -Message ("Operator quit during step '{0}'." -f $name) -Path $LogPath
            Write-Host "Stopping. The window stays open; re-run Bootstrap-T5500.cmd to resume."
            return @{ State = $State; Result = 'Quit' }
        }
        # Anything else, including an empty Enter, retries the step.
    }
}

function Write-BootstrapSummary {
    param([Parameter(Mandatory)][array]$Summary)
    Write-Host ''
    Write-Host 'Bootstrap summary:'
    foreach ($row in $Summary) {
        Write-Host ("  {0}: {1}" -f $row.Name, $row.Result)
    }
    $skipped = $Summary | Where-Object { $_.Result -eq 'skipped' }
    if ($skipped) {
        Write-Host ''
        Write-Host 'Steps that were skipped and still need attention:'
        foreach ($row in $skipped) { Write-Host ("  - {0}" -f $row.Name) }
    }
}

function Write-BootstrapDoneFile {
    param(
        [Parameter(Mandatory)][string]$StatePath,
        [Parameter(Mandatory)][string]$DonePath
    )
    $state = Read-BootstrapState -Path $StatePath
    $completed = @()
    $skipped = @()
    foreach ($key in $state.steps.Keys) {
        if ($state.steps[$key].status -eq 'completed') { $completed += $key }
        elseif ($state.steps[$key].status -eq 'skipped') { $skipped += $key }
    }
    $ip = Get-LanIPv4Address
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('# T5500 bootstrap done') | Out-Null
    $lines.Add('') | Out-Null
    $lines.Add('What was installed:') | Out-Null
    if ($completed.Count -eq 0) { $lines.Add('- nothing recorded as completed') | Out-Null }
    foreach ($c in ($completed | Sort-Object)) { $lines.Add("- $c") | Out-Null }
    $lines.Add('') | Out-Null
    $lines.Add('What was skipped (needs a second look):') | Out-Null
    if ($skipped.Count -eq 0) { $lines.Add('- none') | Out-Null }
    foreach ($s in ($skipped | Sort-Object)) { $lines.Add("- $s") | Out-Null }
    $lines.Add('') | Out-Null
    $lines.Add('Give the Sabretooth operator this exact line, with the key read from') | Out-Null
    $lines.Add('this machine''s own profile .env file (never paste the key into chat,') | Out-Null
    $lines.Add('email, or this file):') | Out-Null
    $lines.Add('') | Out-Null
    $lines.Add("    hermes peer add t5500 --url http://${ip}:8377 --key <API_SERVER_KEY>") | Out-Null
    $lines.Add('') | Out-Null
    $lines.Add('The key itself is at:') | Out-Null
    $lines.Add("    $(Join-Path $script:MarketingProfileDir '.env')") | Out-Null
    $lines.Add('') | Out-Null
    $lines.Add('Three commands to run next:') | Out-Null
    $lines.Add('1. hermes -p marketing status') | Out-Null
    $lines.Add('2. powershell -NoProfile -ExecutionPolicy Bypass -File C:\DREAM\ops-state\t5500\t5500-health.ps1 -Verbose') | Out-Null
    $lines.Add('3. Get-Content C:\DREAM\ops-state\t5500\health.json') | Out-Null
    Set-Content -LiteralPath $DonePath -Value ($lines -join "`r`n") -Encoding UTF8
}

# ---------------------------------------------------------------------------
# The real steps, in order
# ---------------------------------------------------------------------------

function Get-BootstrapSteps {
    @(
        [PSCustomObject]@{
            Name = 'Preflight'
            Description = 'Confirm this window is elevated, turn on TLS 1.2, and create the base directories.'
            Check = {
                (Test-Path $script:DreamRoot) -and (Test-Path $script:OpsStateRoot) -and (Test-Path $script:ReconDir)
            }
            Action = {
                $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
                if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
                    throw 'This window is not Administrator. Close it and run Bootstrap-T5500.cmd, accepting the elevation prompt.'
                }
                [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
                foreach ($d in @($script:DreamRoot, $script:OpsStateRoot, $script:ReconDir)) {
                    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
                }
            }
            Verify = {
                (Test-Path $script:DreamRoot) -and (Test-Path $script:OpsStateRoot) -and (Test-Path $script:ReconDir)
            }
        }
        [PSCustomObject]@{
            Name = 'WingetPresent'
            Description = 'Make sure winget (App Installer) is on this machine.'
            Check  = { Test-CommandAvailable -Name 'winget' }
            Action = {
                Start-Process 'https://apps.microsoft.com/detail/9NBLGGH4NNS1'
                Read-Host 'Install App Installer from the Microsoft Store, then press Enter here to continue' | Out-Null
                Update-SessionPath
            }
            Verify = { Test-CommandAvailable -Name 'winget' }
        }
        [PSCustomObject]@{
            Name = 'PowerShell7'
            Description = 'Install PowerShell 7 (Microsoft.PowerShell).'
            Check  = { Test-WingetPackageInstalled -Id 'Microsoft.PowerShell' }
            Action = { Install-WingetPackage -Id 'Microsoft.PowerShell' }
            Verify = { Test-WingetPackageInstalled -Id 'Microsoft.PowerShell' }
        }
        [PSCustomObject]@{
            Name = 'WindowsTerminal'
            Description = 'Install Windows Terminal.'
            Check  = { Test-WingetPackageInstalled -Id 'Microsoft.WindowsTerminal' }
            Action = { Install-WingetPackage -Id 'Microsoft.WindowsTerminal' }
            Verify = { Test-WingetPackageInstalled -Id 'Microsoft.WindowsTerminal' }
        }
        [PSCustomObject]@{
            Name = 'Git'
            Description = 'Install Git.'
            Check  = { Test-WingetPackageInstalled -Id 'Git.Git' }
            Action = { Install-WingetPackage -Id 'Git.Git' }
            Verify = { Test-WingetPackageInstalled -Id 'Git.Git' }
        }
        [PSCustomObject]@{
            Name = 'NodeLTS'
            Description = 'Install Node.js LTS.'
            Check  = { Test-WingetPackageInstalled -Id 'OpenJS.NodeJS.LTS' }
            Action = { Install-WingetPackage -Id 'OpenJS.NodeJS.LTS' }
            Verify = { Test-WingetPackageInstalled -Id 'OpenJS.NodeJS.LTS' }
        }
        [PSCustomObject]@{
            Name = 'GitHubCLI'
            Description = 'Install the GitHub CLI.'
            Check  = { Test-WingetPackageInstalled -Id 'GitHub.cli' }
            Action = { Install-WingetPackage -Id 'GitHub.cli' }
            Verify = { Test-WingetPackageInstalled -Id 'GitHub.cli' }
        }
        [PSCustomObject]@{
            Name = 'Python312AndUv'
            Description = 'Install Python 3.12 and uv (astral-sh.uv).'
            Check  = { (Test-WingetPackageInstalled -Id 'Python.Python.3.12') -and (Test-WingetPackageInstalled -Id 'astral-sh.uv') }
            Action = {
                Install-WingetPackage -Id 'Python.Python.3.12'
                Install-WingetPackage -Id 'astral-sh.uv'
            }
            Verify = { (Test-WingetPackageInstalled -Id 'Python.Python.3.12') -and (Test-WingetPackageInstalled -Id 'astral-sh.uv') }
        }
        [PSCustomObject]@{
            Name = 'GoogleChrome'
            Description = 'Install Google Chrome.'
            Check  = { Test-WingetPackageInstalled -Id 'Google.Chrome' }
            Action = { Install-WingetPackage -Id 'Google.Chrome' }
            Verify = { Test-WingetPackageInstalled -Id 'Google.Chrome' }
        }
        [PSCustomObject]@{
            Name = 'SevenZip'
            Description = 'Install 7-Zip.'
            Check  = { Test-WingetPackageInstalled -Id '7zip.7zip' }
            Action = { Install-WingetPackage -Id '7zip.7zip' }
            Verify = { Test-WingetPackageInstalled -Id '7zip.7zip' }
        }
        [PSCustomObject]@{
            Name = 'NpmGlobals'
            Description = 'Install the agent CLIs: @anthropic-ai/claude-code, @openai/codex, opencode-ai.'
            Check = {
                (Test-CommandAvailable 'claude') -and (Test-CommandAvailable 'codex') -and (Test-CommandAvailable 'opencode')
            }
            Action = {
                & npm install -g '@anthropic-ai/claude-code'
                & npm install -g '@openai/codex'
                & npm install -g 'opencode-ai'
                Update-SessionPath
            }
            Verify = {
                $claudeOk = $false; $codexOk = $false; $opencodeOk = $false
                try { & claude --version 2>$null | Out-Null; $claudeOk = ($LASTEXITCODE -eq 0) } catch { $claudeOk = $false }
                try { & codex --version 2>$null | Out-Null; $codexOk = ($LASTEXITCODE -eq 0) } catch { $codexOk = $false }
                try { & opencode --version 2>$null | Out-Null; $opencodeOk = ($LASTEXITCODE -eq 0) } catch { $opencodeOk = $false }
                $claudeOk -and $codexOk -and $opencodeOk
            }
        }
        [PSCustomObject]@{
            Name = 'HermesInstall'
            Description = 'Install Hermes with the official install line.'
            Check  = { Test-CommandAvailable -Name 'hermes' }
            Action = {
                Invoke-Expression (Invoke-RestMethod 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1')
                Update-SessionPath
            }
            Verify = {
                try { & hermes --version 2>$null | Out-Null; $LASTEXITCODE -eq 0 } catch { $false }
            }
        }
        [PSCustomObject]@{
            Name = 'SignInGitHub'
            Description = "Sign in to GitHub (gh auth login). It loops until 'gh auth status' succeeds."
            Check  = { try { & gh auth status 2>$null | Out-Null; $LASTEXITCODE -eq 0 } catch { $false } }
            Action = { & gh auth login }
            Verify = { try { & gh auth status 2>$null | Out-Null; $LASTEXITCODE -eq 0 } catch { $false } }
        }
        [PSCustomObject]@{
            Name = 'SignInClaude'
            Description = "Sign in to Claude Code. Type /exit once signed in; this waits for $script:ClaudeCredentialsPath."
            Check  = { Test-Path $script:ClaudeCredentialsPath }
            Action = {
                Write-Host 'Signing in to Claude. Once you are signed in, type /exit to return to this window.'
                & claude
            }
            Verify = { Test-Path $script:ClaudeCredentialsPath }
        }
        [PSCustomObject]@{
            Name = 'SignInCodex'
            Description = "Sign in to Codex (codex login). It loops until 'codex login status' succeeds."
            Check  = { try { & codex login status 2>$null | Out-Null; $LASTEXITCODE -eq 0 } catch { $false } }
            Action = { & codex login }
            Verify = { try { & codex login status 2>$null | Out-Null; $LASTEXITCODE -eq 0 } catch { $false } }
        }
        [PSCustomObject]@{
            Name = 'SignInHermesPortal'
            Description = "Sign in to Nous Portal (hermes setup --portal). It loops until 'hermes status' succeeds."
            Check  = { try { & hermes status 2>$null | Out-Null; $LASTEXITCODE -eq 0 } catch { $false } }
            Action = { & hermes setup --portal }
            Verify = { try { & hermes status 2>$null | Out-Null; $LASTEXITCODE -eq 0 } catch { $false } }
        }
        [PSCustomObject]@{
            Name = 'CloneRepos'
            Description = 'Clone Trollz1004/hermes and Trollz1004/dream-online with the repo-local git identity.'
            Check = {
                (Test-Path (Join-Path $script:DreamRoot 'hermes\.git')) -and (Test-Path (Join-Path $script:DreamRoot 'dream-online\.git'))
            }
            Action = {
                $identityName = 'Joshua Coleman'
                $identityEmail = '132442315+Trollz1004@users.noreply.github.com'
                $hermesDir = Join-Path $script:DreamRoot 'hermes'
                $dreamOnlineDir = Join-Path $script:DreamRoot 'dream-online'
                if (-not (Test-Path $hermesDir)) {
                    & git clone 'https://github.com/Trollz1004/hermes.git' $hermesDir
                }
                & git -C $hermesDir config user.name $identityName
                & git -C $hermesDir config user.email $identityEmail
                if (-not (Test-Path $dreamOnlineDir)) {
                    & git clone 'https://github.com/Trollz1004/dream-online.git' $dreamOnlineDir
                }
                & git -C $dreamOnlineDir config user.name $identityName
                & git -C $dreamOnlineDir config user.email $identityEmail
            }
            Verify = {
                (Test-Path (Join-Path $script:DreamRoot 'hermes\.git')) -and (Test-Path (Join-Path $script:DreamRoot 'dream-online\.git'))
            }
        }
        [PSCustomObject]@{
            Name = 'WriteAgentsFiles'
            Description = 'Write C:\DREAM\AGENTS.md from the T5500 template, plus CLAUDE.md and GEMINI.md pointers.'
            Check = {
                (Test-Path (Join-Path $script:DreamRoot 'AGENTS.md')) -and
                (Test-Path (Join-Path $script:DreamRoot 'CLAUDE.md')) -and
                (Test-Path (Join-Path $script:DreamRoot 'GEMINI.md'))
            }
            Action = {
                $templatePath = Join-Path $script:ScriptRoot 'AGENTS.t5500.md'
                Copy-Item -LiteralPath $templatePath -Destination (Join-Path $script:DreamRoot 'AGENTS.md') -Force
                Set-Content -LiteralPath (Join-Path $script:DreamRoot 'CLAUDE.md') -Value "# CLAUDE.md`r`n`r`n@AGENTS.md`r`n" -Encoding UTF8
                Set-Content -LiteralPath (Join-Path $script:DreamRoot 'GEMINI.md') -Value "# GEMINI.md`r`n`r`n@AGENTS.md`r`n" -Encoding UTF8
            }
            Verify = {
                (Test-Path (Join-Path $script:DreamRoot 'AGENTS.md')) -and
                (Test-Path (Join-Path $script:DreamRoot 'CLAUDE.md')) -and
                (Test-Path (Join-Path $script:DreamRoot 'GEMINI.md'))
            }
        }
        [PSCustomObject]@{
            Name = 'HermesMarketingProfile'
            Description = 'Create the Hermes marketing profile (OPSis), its config, a random API_SERVER_KEY, and start its gateway.'
            Check = { Test-Path (Join-Path $script:MarketingProfileDir 'config.yaml') }
            Action = {
                & hermes profile create marketing
                if (-not (Test-Path $script:MarketingProfileDir)) {
                    New-Item -ItemType Directory -Path $script:MarketingProfileDir -Force | Out-Null
                }
                $templatePath = Join-Path $script:ScriptRoot 'hermes-marketing-config.yaml'
                Copy-Item -LiteralPath $templatePath -Destination (Join-Path $script:MarketingProfileDir 'config.yaml') -Force
                $key = New-ApiKey -Length 48
                $envPath = Join-Path $script:MarketingProfileDir '.env'
                Add-Content -LiteralPath $envPath -Value "API_SERVER_KEY=$key" -Encoding UTF8
                & hermes -p marketing gateway install
                & hermes -p marketing gateway start
            }
            Verify = { Test-Path (Join-Path $script:MarketingProfileDir 'config.yaml') }
        }
        [PSCustomObject]@{
            Name = 'HealthScheduledTask'
            Description = "Install t5500-health.ps1 and register it as the '$script:HealthScheduledTaskName' scheduled task, every 30 minutes."
            Check = { [bool](Get-ScheduledTask -TaskName $script:HealthScheduledTaskName -ErrorAction SilentlyContinue) }
            Action = {
                $healthSrc = Join-Path $script:ScriptRoot 't5500-health.ps1'
                $healthDest = Join-Path $script:OpsStateRoot 't5500-health.ps1'
                Copy-Item -LiteralPath $healthSrc -Destination $healthDest -Force
                $registerScript = Join-Path $script:ScriptRoot 'Register-T5500Health.ps1'
                & powershell -NoProfile -ExecutionPolicy Bypass -File $registerScript -ScriptPath $healthDest
            }
            Verify = { [bool](Get-ScheduledTask -TaskName $script:HealthScheduledTaskName -ErrorAction SilentlyContinue) }
        }
        [PSCustomObject]@{
            Name = 'Done'
            Description = 'Write BOOTSTRAP-DONE.md and open it in Notepad.'
            Check  = { Test-Path $script:DoneFilePath }
            Action = {
                Write-BootstrapDoneFile -StatePath $script:StatePath -DonePath $script:DoneFilePath
                Start-Process -FilePath 'notepad.exe' -ArgumentList $script:DoneFilePath
            }
            Verify = { Test-Path $script:DoneFilePath }
        }
    )
}

# ---------------------------------------------------------------------------
# Main entry
# ---------------------------------------------------------------------------

function Start-Bootstrap {
    param(
        [switch]$DryRun,
        [string]$StatePath = $script:StatePath,
        [string]$LogPath = $script:LogPath,
        [array]$Steps
    )

    if (-not $Steps) { $Steps = Get-BootstrapSteps }

    if ($DryRun) {
        $State = @{ steps = @{} }
    } else {
        $dir = Split-Path -Path $StatePath -Parent
        if ($dir -and -not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        $State = Read-BootstrapState -Path $StatePath
    }

    $summary = @()
    foreach ($step in $Steps) {
        $result = Invoke-BootstrapStep -Step $step -State $State -StatePath $StatePath -LogPath $LogPath -DryRun:$DryRun
        $State = $result.State
        $summary += [PSCustomObject]@{ Name = $step.Name; Result = $result.Result }
        if ($result.Result -eq 'Quit') { break }
    }

    if (-not $DryRun) { Write-BootstrapSummary -Summary $summary }
    # The unary comma keeps a single-step result an array of one, instead of
    # letting the pipeline unwrap it to a bare object on return.
    return ,$summary
}

# ---------------------------------------------------------------------------
# Run, unless a test harness dot-sourced this file with -NoRun
# ---------------------------------------------------------------------------

if (-not $NoRun) {
    Start-Bootstrap -DryRun:$DryRun | Out-Null
}
