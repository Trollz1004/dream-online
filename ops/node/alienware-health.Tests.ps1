# Pester 3.4 tests for the Alienware node health probe (the version that ships with Windows PowerShell 5.1).
# Run: powershell -NoProfile -Command "Invoke-Pester -Path ops/node/alienware-health.Tests.ps1"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'alienware-health.ps1') -NoRun

Describe 'Get-ProbeState' {
  It 'reports DOWN when nothing answered' {
    Get-ProbeState -StatusCode 0 -Body '' -MustContain 'dreamops-bridge' | Should Be 'DOWN'
  }
  It 'reports UP on 200 with the identity string' {
    Get-ProbeState -StatusCode 200 -Body '{"status":"ok","service":"dreamops-bridge"}' -MustContain 'dreamops-bridge' | Should Be 'UP'
  }
  It 'reports WRONG SERVICE when a port answers 200 without the identity string' {
    Get-ProbeState -StatusCode 200 -Body '<html>something else</html>' -MustContain 'dreamops-bridge' | Should Be 'WRONG SERVICE'
  }
  It 'reports WRONG SERVICE on any other status code' {
    Get-ProbeState -StatusCode 404 -Body 'not_found' -MustContain 'dreamops-bridge' | Should Be 'WRONG SERVICE'
  }
  It 'reports AUTH MISSING on 401 and AUTH REJECTED on 403' {
    Get-ProbeState -StatusCode 401 -Body '' -MustContain 'x' | Should Be 'AUTH MISSING'
    Get-ProbeState -StatusCode 403 -Body '' -MustContain 'x' | Should Be 'AUTH REJECTED'
  }
}

Describe 'Get-Targets' {
  # Sabretooth's address is SABRETOOTH_HOST from the node env file; a reserved placeholder stands in when unset.
  $sabretoothHost = if ($env:SABRETOOTH_HOST) { $env:SABRETOOTH_HOST } else { 'sabretooth.test.invalid' }
  $targets = Get-Targets
  It 'gives every target a name, a group, a url and an identity string' {
    foreach ($t in $targets) {
      $t.name | Should Not BeNullOrEmpty
      (@('required', 'optional', 'remote') -contains $t.group) | Should Be $true
      $t.url | Should Not BeNullOrEmpty
      $t.mustContain | Should Not BeNullOrEmpty
    }
  }
  It 'requires the two game services' {
    $required = @($targets | Where-Object { $_.group -eq 'required' } | ForEach-Object { $_.name })
    ($required -contains 'live_npc_lab_9127') | Should Be $true
    ($required -contains 'dreamops_bridge_9133') | Should Be $true
  }
  It 'probes nothing on Sabretooth, which holds the date app and domains only' {
    @($targets | Where-Object { $_.url -like "*$sabretoothHost*" }).Count | Should Be 0
  }
  It 'never puts a Sabretooth service in the required group' {
    @($targets | Where-Object { $_.group -eq 'required' -and $_.url -notlike 'http://192.168.0.40:*' }).Count | Should Be 0
  }
}

Describe 'Get-Targets OmniRoute' {
  $savedHost = $env:T5500_HOST
  $sabretoothHost = if ($env:SABRETOOTH_HOST) { $env:SABRETOOTH_HOST } else { 'sabretooth.test.invalid' }
  $env:T5500_HOST = 't5500.test.invalid'
  $withHost = @(Get-Targets | Where-Object { $_.name -like 'omniroute*' })
  $allWithHost = @(Get-Targets)
  Remove-Item Env:\T5500_HOST -ErrorAction SilentlyContinue
  $withoutHost = @(Get-Targets | Where-Object { $_.name -like 'omniroute*' })
  $allWithoutHost = @(Get-Targets)
  if ($savedHost) { $env:T5500_HOST = $savedHost }
  It 'probes OmniRoute on the T5500 at the T5500_HOST address, as remote' {
    $withHost.Count | Should Be 1
    $withHost[0].group | Should Be 'remote'
    $withHost[0].url | Should Be 'http://t5500.test.invalid:20128/v1/models'
  }
  It 'has no OmniRoute target when T5500_HOST is not set' {
    $withoutHost.Count | Should Be 0
  }
  It 'never probes port 20128 on loopback or on Sabretooth, set or not' {
    $loopback20128 = ('127', '0', '0', '1' -join '.') + ':20128'
    $localhost20128 = 'local' + 'host:20128'
    @($allWithHost + $allWithoutHost | Where-Object { $_.url -like "*$loopback20128*" -or $_.url -like "*$localhost20128*" -or $_.url -like "*$sabretoothHost*" }).Count | Should Be 0
  }
}

Describe 'Get-Overall' {
  function New-Result($group, $status) { [pscustomobject]@{ name = "t_$group"; group = $group; status = $status } }
  It 'is RED when a required service is not UP' {
    Get-Overall -Results @((New-Result 'required' 'DOWN'), (New-Result 'optional' 'UP')) -GitOk $true | Should Be 'RED'
    Get-Overall -Results @((New-Result 'required' 'WRONG SERVICE')) -GitOk $true | Should Be 'RED'
  }
  It 'is YELLOW when only an optional or remote service is not UP' {
    Get-Overall -Results @((New-Result 'required' 'UP'), (New-Result 'optional' 'DOWN')) -GitOk $true | Should Be 'YELLOW'
    Get-Overall -Results @((New-Result 'required' 'UP'), (New-Result 'remote' 'DOWN')) -GitOk $true | Should Be 'YELLOW'
  }
  It 'is YELLOW when the game repo has drifted from origin' {
    Get-Overall -Results @((New-Result 'required' 'UP')) -GitOk $false | Should Be 'YELLOW'
  }
  It 'is GREEN when everything is UP and git is in step' {
    Get-Overall -Results @((New-Result 'required' 'UP'), (New-Result 'optional' 'UP'), (New-Result 'remote' 'UP')) -GitOk $true | Should Be 'GREEN'
  }
  It 'is AMBER when services and git are healthy and agent_drift reports drifted files' {
    $drift = [ordered]@{
      ok = $false
      light = 'amber'
      driftedFiles = @([ordered]@{ file = 'AGENTS.md'; reason = 'drifted' })
    }
    Get-Overall -Results @((New-Result 'required' 'UP'), (New-Result 'optional' 'UP')) -GitOk $true -AgentDrift $drift | Should Be 'AMBER'
  }
  It 'stays RED when a required service is down even if agent_drift reports drifted files' {
    $drift = [ordered]@{
      ok = $false
      light = 'amber'
      driftedFiles = @([ordered]@{ file = 'AGENTS.md'; reason = 'drifted' })
    }
    Get-Overall -Results @((New-Result 'required' 'DOWN')) -GitOk $true -AgentDrift $drift | Should Be 'RED'
  }
}

Describe 'Get-AgentDriftState and AMBER snapshot/table' {
  It 'reads drifted files from AGENT_DRIFT_PATH and sets ok=false, light=amber' {
    $driftPath = Join-Path $TestDrive 'agent-drift-drifted.json'
    '{"checkedAt":"2026-11-16T00:00:00Z","node":"alienware","ok":false,"light":"amber","driftedCount":2,"driftedFiles":[{"file":"AGENTS.md","reason":"drifted"},{"file":"%USERPROFILE%\\.claude\\CLAUDE.md","reason":"missing-block"}]}' | Set-Content -LiteralPath $driftPath -Encoding UTF8
    $saved = $env:AGENT_DRIFT_PATH
    $env:AGENT_DRIFT_PATH = $driftPath
    try {
      (Get-AgentDriftPath) | Should Be $driftPath
      $state = Get-AgentDriftState
      $state.ok | Should Be $false
      $state.light | Should Be 'amber'
      @($state.driftedFiles).Count | Should Be 2
      @($state.driftedFiles)[0].file | Should Be 'AGENTS.md'

      $snap = ConvertTo-Snapshot -Results @() -Git ([ordered]@{}) -Overall 'AMBER' -Healed $false -AgentDrift $state
      $snap.overall | Should Be 'AMBER'
      $snap.agent_drift.light | Should Be 'amber'
      @($snap.agent_drift.driftedFiles).Count | Should Be 2

      Mock Write-Host {}
      Show-Table -Snapshot $snap
      Assert-MockCalled Write-Host -Times 1 -Exactly -Scope It -ParameterFilter {
        $Object -like '*AMBER (agent drift: AGENTS.md, %USERPROFILE%\.claude\CLAUDE.md)*'
      }
    } finally {
      if ($null -eq $saved) { Remove-Item Env:\AGENT_DRIFT_PATH -ErrorAction SilentlyContinue } else { $env:AGENT_DRIFT_PATH = $saved }
    }
  }

  It 'returns green default when agent-drift.json is absent' {
    $missing = Join-Path $TestDrive 'does-not-exist-agent-drift.json'
    $state = Get-AgentDriftState -Path $missing
    $state.ok | Should Be $true
    $state.light | Should Be 'green'
    @($state.driftedFiles).Count | Should Be 0
  }
}

Describe 'Get-HealNeeded' {
  function New-Result($group, $status) { [pscustomobject]@{ name = "t_$group"; group = $group; status = $status } }
  It 'asks for the bring-up only when a required local service failed' {
    Get-HealNeeded -Results @((New-Result 'required' 'DOWN')) | Should Be $true
    Get-HealNeeded -Results @((New-Result 'required' 'UP'), (New-Result 'remote' 'DOWN'), (New-Result 'optional' 'DOWN')) | Should Be $false
  }
}

Describe 'New-TriggerLine' {
  It 'writes one line of JSON that names the failed stages' {
    $line = New-TriggerLine -Stages @('live_npc_lab_9127') -Detail 'connect refused'
    ($line -split "`n").Count | Should Be 1
    $obj = $line | ConvertFrom-Json
    $obj.kind | Should Be 'stage_failed'
    $obj.node | Should Be 'alienware'
    @($obj.stages)[0] | Should Be 'live_npc_lab_9127'
  }
}

Describe 'Node files carry no user folder path and no loopback reach address' {
  $nodeDir = $here
  $files = @(
    'alienware-health.ps1', 'boot-alienware-services.cmd', 'boot-alienware-services.ps1',
    'boot-sabretooth-services.ps1', 'boot-t5500-services.ps1', 'drift.cmd',
    'purge-glitched-profile.ps1', 'runbook\ALIENWARE-NODE-RUNBOOK.md', 'runbook\PROTECTED-CHANGELOG.md'
  ) | ForEach-Object { Join-Path $nodeDir $_ }
  It 'has every file present' {
    foreach ($f in $files) { (Test-Path -LiteralPath $f) | Should Be $true }
  }
  It 'names no Windows user folder (use %USERPROFILE% or %LOCALAPPDATA%)' {
    $hits = @($files | ForEach-Object { Select-String -LiteralPath $_ -Pattern '(?i)[A-Z]:[\\/]+Users[\\/]+[^%\\/\s"]' })
    $hits.Count | Should Be 0
  }
  It 'names no loopback reach address (use 192.168.0.40 or 192.168.0.15 from ops/fleet/fleet-map.json)' {
    $hits = @($files | ForEach-Object { Select-String -LiteralPath $_ -Pattern '(?i)(?:https?|wss?)://(?:localhost|127\.0\.0\.1)\b|\b(?:localhost|127\.0\.0\.1):\d{2,5}\b' })
    $hits.Count | Should Be 0
  }
}