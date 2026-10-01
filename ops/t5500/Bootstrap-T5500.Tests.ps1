# Bootstrap-T5500.Tests.ps1
#
# Pester 3.4 tests for the Bootstrap-T5500.ps1 step engine. The script is
# dot-sourced with -NoRun so every function loads without starting the real
# bootstrap (no winget, no npm, no sign-ins, no admin check). Real system
# calls (winget, npm, hermes, gh, claude, codex) are never exercised here —
# only the engine: state, logging, the key generator, and the step logic.

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $here 'Bootstrap-T5500.ps1'
. $scriptPath -NoRun

Describe 'Bootstrap-T5500 state persistence' {

    It 'Read-BootstrapState returns an empty steps table when the file does not exist' {
        $path = Join-Path $TestDrive 'missing-state.json'
        $state = Read-BootstrapState -Path $path
        $state.steps.Count | Should Be 0
    }

    It 'Write-BootstrapState then Read-BootstrapState round-trips a step status' {
        $path = Join-Path $TestDrive 'state.json'
        $state = @{ steps = @{} }
        $state = Set-StepStatus -State $state -Name 'Preflight' -Status 'completed'
        Write-BootstrapState -Path $path -State $state
        $reloaded = Read-BootstrapState -Path $path
        $reloaded.steps['Preflight'].status | Should Be 'completed'
    }

    It 'Write-BootstrapState creates its parent directory if missing' {
        $dir = Join-Path $TestDrive 'nested\dir'
        $path = Join-Path $dir 'state.json'
        Write-BootstrapState -Path $path -State @{ steps = @{} }
        (Test-Path $path) | Should Be $true
    }

    It 'Set-StepStatus stamps a time on the step' {
        $state = Set-StepStatus -State @{ steps = @{} } -Name 'Git' -Status 'skipped'
        $state.steps['Git'].time | Should Not BeNullOrEmpty
    }
}

Describe 'Bootstrap-T5500 logging' {

    It 'Write-BootstrapLog appends a timestamped line' {
        $path = Join-Path $TestDrive 'log.txt'
        Write-BootstrapLog -Message 'hello from a test' -Path $path
        $content = Get-Content $path -Raw
        $content | Should Match 'hello from a test'
        $content | Should Match '^\['
    }
}

Describe 'New-ApiKey' {

    It 'returns 48 characters by default' {
        (New-ApiKey).Length | Should Be 48
    }

    It 'uses only a safe alphanumeric alphabet' {
        New-ApiKey | Should Match '^[A-Za-z0-9]{48}$'
    }

    It 'generates a different key on each call' {
        $a = New-ApiKey
        $b = New-ApiKey
        $a | Should Not Be $b
    }

    It 'never writes to the log file' {
        $path = Join-Path $TestDrive 'key-log.txt'
        New-ApiKey | Out-Null
        (Test-Path $path) | Should Be $false
    }
}

Describe 'Invoke-BootstrapStep' {

    BeforeEach {
        $script:statePath = Join-Path $TestDrive 'engine-state.json'
        $script:logPath = Join-Path $TestDrive 'engine-log.txt'
        if (Test-Path $script:statePath) { Remove-Item $script:statePath -Force }
        if (Test-Path $script:logPath) { Remove-Item $script:logPath -Force }
        $script:emptyState = @{ steps = @{} }
    }

    It 'marks a step completed from Check alone, without calling Action' {
        $script:actionCalled = $false
        $step = [PSCustomObject]@{
            Name = 'AlreadyDone'; Description = 'test'
            Check = { $true }
            Action = { $script:actionCalled = $true }
            Verify = { $true }
        }
        $result = Invoke-BootstrapStep -Step $step -State $script:emptyState -StatePath $script:statePath -LogPath $script:logPath
        $result.Result | Should Be 'completed'
        $script:actionCalled | Should Be $false
        $result.State.steps['AlreadyDone'].status | Should Be 'completed'
    }

    It 'runs Action then Verify when Check is false, and completes on success' {
        $step = [PSCustomObject]@{
            Name = 'NeedsWork'; Description = 'test'
            Check = { $false }
            Action = { }
            Verify = { $true }
        }
        $result = Invoke-BootstrapStep -Step $step -State $script:emptyState -StatePath $script:statePath -LogPath $script:logPath
        $result.Result | Should Be 'completed'
    }

    It "marks a step skipped when the operator types 'skip' after a failed verify" {
        Mock Read-Host { 'skip' }
        $step = [PSCustomObject]@{
            Name = 'WillSkip'; Description = 'test'
            Check = { $false }
            Action = { }
            Verify = { $false }
        }
        $result = Invoke-BootstrapStep -Step $step -State $script:emptyState -StatePath $script:statePath -LogPath $script:logPath
        $result.Result | Should Be 'skipped'
        $result.State.steps['WillSkip'].status | Should Be 'skipped'
    }

    It "returns 'Quit' when the operator types 'quit' after a failed verify, and records nothing" {
        Mock Read-Host { 'quit' }
        $step = [PSCustomObject]@{
            Name = 'WillQuit'; Description = 'test'
            Check = { $false }
            Action = { }
            Verify = { $false }
        }
        $result = Invoke-BootstrapStep -Step $step -State $script:emptyState -StatePath $script:statePath -LogPath $script:logPath
        $result.Result | Should Be 'Quit'
        $result.State.steps.ContainsKey('WillQuit') | Should Be $false
    }

    It 'retries on a plain Enter and succeeds once Verify finally passes' {
        $script:attempts = 0
        Mock Read-Host { '' }
        $step = [PSCustomObject]@{
            Name = 'Retries'; Description = 'test'
            Check = { $false }
            Action = { $script:attempts++ }
            Verify = { $script:attempts -ge 2 }
        }
        $result = Invoke-BootstrapStep -Step $step -State $script:emptyState -StatePath $script:statePath -LogPath $script:logPath
        $result.Result | Should Be 'completed'
        $script:attempts | Should Be 2
    }

    It 'in DryRun, never calls Check, Action, or Verify, and writes no state file' {
        $script:dryRunCalled = $false
        $step = [PSCustomObject]@{
            Name = 'DryRunStep'; Description = 'test'
            Check = { $script:dryRunCalled = $true; $true }
            Action = { $script:dryRunCalled = $true }
            Verify = { $script:dryRunCalled = $true; $true }
        }
        $result = Invoke-BootstrapStep -Step $step -State $script:emptyState -StatePath $script:statePath -LogPath $script:logPath -DryRun
        $result.Result | Should Be 'DryRun'
        $script:dryRunCalled | Should Be $false
        (Test-Path $script:statePath) | Should Be $false
    }

    It 'resuming a step already completed in state skips it without calling Check' {
        $script:checkCalled = $false
        $priorState = @{ steps = @{ Done = @{ status = 'completed'; time = (Get-Date).ToString('o') } } }
        $step = [PSCustomObject]@{
            Name = 'Done'; Description = 'test'
            Check = { $script:checkCalled = $true; $false }
            Action = { }
            Verify = { $true }
        }
        $result = Invoke-BootstrapStep -Step $step -State $priorState -StatePath $script:statePath -LogPath $script:logPath
        $result.Result | Should Be 'completed'
        $script:checkCalled | Should Be $false
    }
}

Describe 'Start-Bootstrap orchestration' {

    BeforeEach {
        $script:orchStatePath = Join-Path $TestDrive 'orch-state.json'
        $script:orchLogPath = Join-Path $TestDrive 'orch-log.txt'
        if (Test-Path $script:orchStatePath) { Remove-Item $script:orchStatePath -Force }
        if (Test-Path $script:orchLogPath) { Remove-Item $script:orchLogPath -Force }
    }

    It 'DryRun runs nothing across every step and writes no state file' {
        $script:hits = 0
        $steps = @(
            [PSCustomObject]@{ Name='A'; Description='a'; Check={ $script:hits++; $true }; Action={ $script:hits++ }; Verify={ $script:hits++; $true } }
            [PSCustomObject]@{ Name='B'; Description='b'; Check={ $script:hits++; $true }; Action={ $script:hits++ }; Verify={ $script:hits++; $true } }
        )
        $summary = Start-Bootstrap -DryRun -StatePath $script:orchStatePath -LogPath $script:orchLogPath -Steps $steps
        $script:hits | Should Be 0
        (Test-Path $script:orchStatePath) | Should Be $false
        ($summary | Where-Object { $_.Result -ne 'DryRun' }).Count | Should Be 0
    }

    It 'resume skips a completed step (never calling its Check) and runs the remaining one' {
        $preState = @{ steps = @{ A = @{ status = 'completed'; time = (Get-Date).ToString('o') } } }
        Write-BootstrapState -Path $script:orchStatePath -State $preState
        $script:bRan = $false
        $steps = @(
            [PSCustomObject]@{ Name='A'; Description='a'; Check={ throw 'A Check must not run on resume' }; Action={}; Verify={ $true } }
            [PSCustomObject]@{ Name='B'; Description='b'; Check={ $false }; Action={ $script:bRan = $true }; Verify={ $true } }
        )
        $summary = Start-Bootstrap -StatePath $script:orchStatePath -LogPath $script:orchLogPath -Steps $steps
        $script:bRan | Should Be $true
        ($summary | Where-Object { $_.Name -eq 'A' }).Result | Should Be 'completed'
        ($summary | Where-Object { $_.Name -eq 'B' }).Result | Should Be 'completed'
    }

    It 'a quit on one step gates the next: later steps never run' {
        Mock Read-Host { 'quit' }
        $script:bRan = $false
        $steps = @(
            [PSCustomObject]@{ Name='A'; Description='a'; Check={ $false }; Action={}; Verify={ $false } }
            [PSCustomObject]@{ Name='B'; Description='b'; Check={ $false }; Action={ $script:bRan = $true }; Verify={ $true } }
        )
        $summary = Start-Bootstrap -StatePath $script:orchStatePath -LogPath $script:orchLogPath -Steps $steps
        $script:bRan | Should Be $false
        $summary.Count | Should Be 1
        $summary[0].Result | Should Be 'Quit'
    }

    It 'a skip on one step still lets the next step run' {
        Mock Read-Host { 'skip' }
        $script:bRan = $false
        $steps = @(
            [PSCustomObject]@{ Name='A'; Description='a'; Check={ $false }; Action={}; Verify={ $false } }
            [PSCustomObject]@{ Name='B'; Description='b'; Check={ $false }; Action={ $script:bRan = $true }; Verify={ $true } }
        )
        $summary = Start-Bootstrap -StatePath $script:orchStatePath -LogPath $script:orchLogPath -Steps $steps
        $script:bRan | Should Be $true
        ($summary | Where-Object { $_.Name -eq 'A' }).Result | Should Be 'skipped'
    }
}

Describe 'Write-BootstrapDoneFile' {

    It 'writes the hermes peer add line with the LAN IP but never the key itself' {
        $statePath = Join-Path $TestDrive 'done-state.json'
        $donePath = Join-Path $TestDrive 'DONE.md'
        Write-BootstrapState -Path $statePath -State @{ steps = @{ Git = @{ status = 'completed'; time = (Get-Date).ToString('o') } } }
        Mock Get-NetIPAddress { [PSCustomObject]@{ IPAddress = '192.168.0.99'; InterfaceAlias = 'Ethernet' } }
        Write-BootstrapDoneFile -StatePath $statePath -DonePath $donePath
        $content = Get-Content $donePath -Raw
        $content | Should Match ([regex]::Escape('hermes peer add t5500 --url http://192.168.0.99:8377 --key <API_SERVER_KEY>'))
        $content | Should Match 'Git'
        $content | Should Not Match 'API_SERVER_KEY=[A-Za-z0-9]{40,}'
    }
}
