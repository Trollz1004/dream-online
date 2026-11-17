# t5500-health.Tests.ps1
#
# Pester 3.4 tests for t5500-health.ps1. Dot-sourced with -NoRun so no real
# probe runs on load. Every network and system probe is mocked; these tests
# check the status rules (GREEN/YELLOW/RED), the self-heal behavior (the
# marketing gateway gets one heal attempt and a re-probe; OmniRoute never
# does), and the shape of what gets written.

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $here 't5500-health.ps1'
. $scriptPath -NoRun

function New-HealthyCheck { @{ Healthy = $true; Detail = 'ok' } }
function New-UnhealthyCheck { param([string]$Detail = 'down') @{ Healthy = $false; Detail = $Detail } }

Describe 'Get-T5500HealthStatus' {

    It 'is GREEN when every check passes' {
        $checks = @{
            MarketingGateway = New-HealthyCheck
            OmniRoute        = New-HealthyCheck
            GhAuth           = New-HealthyCheck
            FreeDisk         = New-HealthyCheck
        }
        Get-T5500HealthStatus -Checks $checks | Should Be 'GREEN'
    }

    It 'is RED when the marketing gateway is unhealthy' {
        $checks = @{
            MarketingGateway = New-UnhealthyCheck
            OmniRoute        = New-HealthyCheck
            GhAuth           = New-HealthyCheck
            FreeDisk         = New-HealthyCheck
        }
        Get-T5500HealthStatus -Checks $checks | Should Be 'RED'
    }

    It 'is RED when free disk is unhealthy, even if everything else passes' {
        $checks = @{
            MarketingGateway = New-HealthyCheck
            OmniRoute        = New-HealthyCheck
            GhAuth           = New-HealthyCheck
            FreeDisk         = New-UnhealthyCheck
        }
        Get-T5500HealthStatus -Checks $checks | Should Be 'RED'
    }

    It 'is YELLOW when only OmniRoute is unhealthy' {
        $checks = @{
            MarketingGateway = New-HealthyCheck
            OmniRoute        = New-UnhealthyCheck
            GhAuth           = New-HealthyCheck
            FreeDisk         = New-HealthyCheck
        }
        Get-T5500HealthStatus -Checks $checks | Should Be 'YELLOW'
    }

    It 'is YELLOW when only gh auth is unhealthy' {
        $checks = @{
            MarketingGateway = New-HealthyCheck
            OmniRoute        = New-HealthyCheck
            GhAuth           = New-UnhealthyCheck
            FreeDisk         = New-HealthyCheck
        }
        Get-T5500HealthStatus -Checks $checks | Should Be 'YELLOW'
    }

    It 'is AMBER when services and disk are healthy and AgentDrift has drifted files' {
        $checks = @{
            MarketingGateway = New-HealthyCheck
            OmniRoute        = New-HealthyCheck
            GhAuth           = New-HealthyCheck
            FreeDisk         = New-HealthyCheck
            AgentDrift       = @{ Healthy = $false; Ok = $false; Light = 'amber'; DriftedFiles = @(@{ file = 'ops/t5500/AGENTS.t5500.md'; reason = 'drifted' }); Detail = 'drifted files: ops/t5500/AGENTS.t5500.md' }
        }
        Get-T5500HealthStatus -Checks $checks | Should Be 'AMBER'
    }

    It 'remains RED when marketing gateway is unhealthy even if AgentDrift has drifted files' {
        $checks = @{
            MarketingGateway = New-UnhealthyCheck
            OmniRoute        = New-HealthyCheck
            GhAuth           = New-HealthyCheck
            FreeDisk         = New-HealthyCheck
            AgentDrift       = @{ Healthy = $false; Ok = $false; Light = 'amber'; DriftedFiles = @(@{ file = 'AGENTS.md'; reason = 'drifted' }); Detail = 'drifted' }
        }
        Get-T5500HealthStatus -Checks $checks | Should Be 'RED'
    }
}

Describe 'Test-AgentDrift and T5500 AMBER table/json' {
    It 'reads drifted files from AGENT_DRIFT_PATH and reports AMBER with file names in Show-T5500HealthTable' {
        $driftPath = Join-Path $TestDrive 't5500-agent-drift.json'
        '{"checkedAt":"2026-11-16T00:00:00Z","node":"t5500","ok":false,"light":"amber","driftedCount":2,"driftedFiles":[{"file":"ops/t5500/AGENTS.t5500.md","reason":"drifted"},{"file":"%LOCALAPPDATA%\\hermes\\profiles\\t5500\\SOUL.md","reason":"missing-block"}]}' | Set-Content -LiteralPath $driftPath -Encoding UTF8
        $saved = $env:AGENT_DRIFT_PATH
        $env:AGENT_DRIFT_PATH = $driftPath
        try {
            (Get-T5500AgentDriftPath) | Should Be $driftPath
            $drift = Test-AgentDrift
            $drift.Healthy | Should Be $false
            $drift.Ok | Should Be $false
            $drift.Light | Should Be 'amber'
            @($drift.DriftedFiles).Count | Should Be 2

            $checks = @{
                MarketingGateway = New-HealthyCheck
                OmniRoute        = New-HealthyCheck
                GhAuth           = New-HealthyCheck
                FreeDisk         = New-HealthyCheck
                AgentDrift       = $drift
            }
            Mock Write-Host {}
            Show-T5500HealthTable -Checks $checks -Status 'AMBER'
            Assert-MockCalled Write-Host -Times 1 -Exactly -Scope It -ParameterFilter {
                $Object -like '*AMBER (agent drift: ops/t5500/AGENTS.t5500.md, %LOCALAPPDATA%\hermes\profiles\t5500\SOUL.md)*'
            }
        } finally {
            if ($null -eq $saved) { Remove-Item Env:\AGENT_DRIFT_PATH -ErrorAction SilentlyContinue } else { $env:AGENT_DRIFT_PATH = $saved }
        }
    }
}

Describe 'Test-FreeDisk' {

    It 'is healthy when free space is above the floor' {
        Mock Get-PSDrive { [PSCustomObject]@{ Free = 50GB } }
        (Test-FreeDisk -DriveLetter 'C' -MinimumGB 10).Healthy | Should Be $true
    }

    It 'is unhealthy when free space is below the floor' {
        Mock Get-PSDrive { [PSCustomObject]@{ Free = 2GB } }
        (Test-FreeDisk -DriveLetter 'C' -MinimumGB 10).Healthy | Should Be $false
    }
}

Describe 'Invoke-T5500Health self-heal' {

    # Each case lives in its own Context: Pester 3.4 scopes a mock's call
    # history to the Describe/Context it was defined in, not to the single
    # It block, so Assert-MockCalled would otherwise see calls left over
    # from an earlier case in the same block.

    Context 'the gateway is down, then comes back after one heal attempt' {
        BeforeEach {
            $script:jsonPath = Join-Path $TestDrive 'health.json'
            $script:logPath = Join-Path $TestDrive 'health.log'
            $script:gatewayCallCount = 0
        }

        It 'heals the marketing gateway once and re-probes before reporting GREEN' {
            Mock Test-MarketingGateway {
                $script:gatewayCallCount++
                if ($script:gatewayCallCount -eq 1) { return New-UnhealthyCheck 'down' }
                return New-HealthyCheck
            }
            Mock Invoke-MarketingGatewayHeal { $true }
            Mock Test-OmniRoute { New-HealthyCheck }
            Mock Test-GhAuth { New-HealthyCheck }
            Mock Test-FreeDisk { New-HealthyCheck }
            Mock Test-AgentDrift { @{ Healthy = $true; Ok = $true; Light = 'green'; DriftedFiles = @(); Detail = 'ok' } }

            $result = Invoke-T5500Health -JsonPath $script:jsonPath -LogPath $script:logPath
            $result.Status | Should Be 'GREEN'
            $result.Healed | Should Be $true
            Assert-MockCalled Invoke-MarketingGatewayHeal -Times 1 -Exactly
            Assert-MockCalled Test-MarketingGateway -Times 2 -Exactly
        }
    }

    Context 'the gateway is already healthy' {
        BeforeEach {
            $script:jsonPath = Join-Path $TestDrive 'health2.json'
            $script:logPath = Join-Path $TestDrive 'health2.log'
        }

        It 'does not attempt a heal' {
            Mock Test-MarketingGateway { New-HealthyCheck }
            Mock Invoke-MarketingGatewayHeal { $true }
            Mock Test-OmniRoute { New-HealthyCheck }
            Mock Test-GhAuth { New-HealthyCheck }
            Mock Test-FreeDisk { New-HealthyCheck }
            Mock Test-AgentDrift { @{ Healthy = $true; Ok = $true; Light = 'green'; DriftedFiles = @(); Detail = 'ok' } }

            Invoke-T5500Health -JsonPath $script:jsonPath -LogPath $script:logPath | Out-Null
            Assert-MockCalled Invoke-MarketingGatewayHeal -Times 0 -Exactly
        }
    }

    Context 'OmniRoute is down' {
        BeforeEach {
            $script:jsonPath = Join-Path $TestDrive 'health3.json'
            $script:logPath = Join-Path $TestDrive 'health3.log'
        }

        It 'is probed once and only reported, never healed' {
            Mock Test-MarketingGateway { New-HealthyCheck }
            Mock Test-OmniRoute { New-UnhealthyCheck 'remote down' }
            Mock Test-GhAuth { New-HealthyCheck }
            Mock Test-FreeDisk { New-HealthyCheck }
            Mock Test-AgentDrift { @{ Healthy = $true; Ok = $true; Light = 'green'; DriftedFiles = @(); Detail = 'ok' } }

            $result = Invoke-T5500Health -JsonPath $script:jsonPath -LogPath $script:logPath
            $result.Status | Should Be 'YELLOW'
            Assert-MockCalled Test-OmniRoute -Times 1 -Exactly
        }
    }

    Context 'the heal attempt does not bring the gateway back' {
        BeforeEach {
            $script:jsonPath = Join-Path $TestDrive 'health4.json'
            $script:logPath = Join-Path $TestDrive 'health4.log'
        }

        It 'reports RED and Healed false' {
            Mock Test-MarketingGateway { New-UnhealthyCheck 'still down' }
            Mock Invoke-MarketingGatewayHeal { $true }
            Mock Test-OmniRoute { New-HealthyCheck }
            Mock Test-GhAuth { New-HealthyCheck }
            Mock Test-FreeDisk { New-HealthyCheck }
            Mock Test-AgentDrift { @{ Healthy = $true; Ok = $true; Light = 'green'; DriftedFiles = @(); Detail = 'ok' } }

            $result = Invoke-T5500Health -JsonPath $script:jsonPath -LogPath $script:logPath
            $result.Status | Should Be 'RED'
            $result.Healed | Should Be $false
        }
    }

    Context 'agent drift is detected while services are healthy' {
        BeforeEach {
            $script:jsonPath = Join-Path $TestDrive 'health5.json'
            $script:logPath = Join-Path $TestDrive 'health5.log'
        }

        It 'reports AMBER and writes agent_drift into health.json' {
            Mock Test-MarketingGateway { New-HealthyCheck }
            Mock Test-OmniRoute { New-HealthyCheck }
            Mock Test-GhAuth { New-HealthyCheck }
            Mock Test-FreeDisk { New-HealthyCheck }
            Mock Test-AgentDrift {
                @{
                    Healthy = $false
                    Ok = $false
                    Light = 'amber'
                    DriftedFiles = @(@{ file = 'ops/t5500/AGENTS.t5500.md'; reason = 'drifted' })
                    Detail = 'drifted files: ops/t5500/AGENTS.t5500.md'
                }
            }

            $result = Invoke-T5500Health -JsonPath $script:jsonPath -LogPath $script:logPath
            $result.Status | Should Be 'AMBER'
            $parsed = Get-Content $script:jsonPath -Raw | ConvertFrom-Json
            $parsed.status | Should Be 'AMBER'
            $parsed.agent_drift.ok | Should Be $false
            $parsed.agent_drift.light | Should Be 'amber'
            @($parsed.agent_drift.driftedFiles)[0].file | Should Be 'ops/t5500/AGENTS.t5500.md'
        }
    }
}

Describe 'Write-T5500HealthJson' {

    It 'writes a status field and per-check detail that round-trips as JSON' {
        $path = Join-Path $TestDrive 'out.json'
        $checks = @{
            MarketingGateway = New-HealthyCheck
            OmniRoute        = New-UnhealthyCheck 'remote down'
            GhAuth           = New-HealthyCheck
            FreeDisk         = New-HealthyCheck
        }
        Write-T5500HealthJson -Path $path -Status 'YELLOW' -Checks $checks -Healed $false
        $parsed = Get-Content $path -Raw | ConvertFrom-Json
        $parsed.status | Should Be 'YELLOW'
        $parsed.checks.omniroute.healthy | Should Be $false
        $parsed.checks.marketing_gateway.healthy | Should Be $true
    }
}

Describe 'Write-T5500HealthLogLine' {

    It 'appends one timestamped line per call' {
        $path = Join-Path $TestDrive 'health.log'
        Write-T5500HealthLogLine -Path $path -Status 'GREEN'
        Write-T5500HealthLogLine -Path $path -Status 'RED'
        $lines = Get-Content $path
        $lines.Count | Should Be 2
        $lines[0] | Should Match '^\[.*\] GREEN$'
        $lines[1] | Should Match '^\[.*\] RED$'
    }
}

Describe 'OmniRoute location' {

    It 'builds the URL from T5500_HOST and never from a literal address' {
        $saved = $env:T5500_HOST
        $env:T5500_HOST = 't5500.test.invalid'
        try {
            Get-OmniRouteUrl | Should Be 'http://t5500.test.invalid:20128/v1/models'
        } finally {
            if ($saved) { $env:T5500_HOST = $saved } else { Remove-Item Env:\T5500_HOST -ErrorAction SilentlyContinue }
        }
    }

    It 'has no URL, and reports unhealthy with a clear detail, when T5500_HOST is not set' {
        $saved = $env:T5500_HOST
        Remove-Item Env:\T5500_HOST -ErrorAction SilentlyContinue
        try {
            Get-OmniRouteUrl | Should Be ''
            $r = Test-OmniRoute
            $r.Healthy | Should Be $false
            $r.Detail | Should Match 'T5500_HOST'
        } finally {
            if ($saved) { $env:T5500_HOST = $saved }
        }
    }
}

Describe 'T5500 files carry no user folder path and no loopback reach address' {
    $files = @(
        't5500-health.ps1', 't5500-health.Tests.ps1', 'Bootstrap-T5500.ps1',
        'Bootstrap-T5500.Tests.ps1', 'Register-T5500Health.ps1',
        'AGENTS.t5500.md', 'README.md', 'hermes-marketing-config.yaml'
    ) | ForEach-Object { Join-Path $here $_ }

    It 'names no Windows user folder' {
        @($files | ForEach-Object { Select-String -LiteralPath $_ -Pattern '(?i)[A-Z]:[\\/]+Users[\\/]+[^%\\/\s"]' }).Count | Should Be 0
    }

    It 'names no loopback reach address (use 192.168.0.15 from ops/fleet/fleet-map.json)' {
        @($files | ForEach-Object { Select-String -LiteralPath $_ -Pattern '(?i)(?:https?|wss?)://(?:localhost|127\.0\.0\.1)\b|\b(?:localhost|127\.0\.0\.1):\d{2,5}\b' }).Count | Should Be 0
    }
}
