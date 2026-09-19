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
  It 'reaches OmniRoute only on Sabretooth and only as a remote target' {
    $omni = @($targets | Where-Object { $_.name -like 'omniroute*' })
    $omni.Count | Should Be 1
    $omni[0].group | Should Be 'remote'
    $omni[0].url.StartsWith('http://192.168.0.8:20128/v1') | Should Be $true
  }
  It 'never puts a Sabretooth service in the required group' {
    @($targets | Where-Object { $_.group -eq 'required' -and $_.url -notlike 'http://127.0.0.1:*' }).Count | Should Be 0
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
