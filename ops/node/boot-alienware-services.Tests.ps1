# Pester 3.4 tests for the Alienware boot script (the version that ships with Windows PowerShell 5.1).
# Run: powershell -NoProfile -Command "Import-Module Pester -RequiredVersion 3.4.0; Invoke-Pester -Path ops/node/boot-alienware-services.Tests.ps1"
# Nothing here starts a process, a task or a window: every start is mocked.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'boot-alienware-services.ps1') -NoRun

Describe 'Panda Router check' {
  Mock Write-BootLog {}
  Mock Start-DreamTask {}
  Mock Get-DreamTaskState { 'Ready' }

  It 'health down: starts the DreamPandaRouter task once and logs it' {
    Mock Test-HttpOk { $false }
    Invoke-PandaRouterCheck | Should Be $true
    Assert-MockCalled Start-DreamTask -Times 1 -Exactly -Scope It -ParameterFilter { $TaskName -eq 'DreamPandaRouter' }
    Assert-MockCalled Write-BootLog -Times 1 -Exactly -Scope It
  }
  It 'health up: calls nothing' {
    Mock Test-HttpOk { $true }
    Invoke-PandaRouterCheck | Should Be $false
    Assert-MockCalled Start-DreamTask -Times 0 -Exactly -Scope It
    Assert-MockCalled Write-BootLog -Times 0 -Exactly -Scope It
  }
  It 'health down but the task is already running: no second copy' {
    Mock Test-HttpOk { $false }
    Mock Get-DreamTaskState { 'Running' }
    Invoke-PandaRouterCheck | Should Be $false
    Assert-MockCalled Start-DreamTask -Times 0 -Exactly -Scope It
  }
  It 'probes the health address on loopback port 8765' {
    $pandaRouterHealthUrl | Should Be 'http://127.0.0.1:8765/health'
  }
}

Describe 'Inbox runner check' {
  Mock Write-BootLog {}
  Mock Start-DreamTask {}
  Mock Get-DreamTaskState { 'Ready' }

  It 'no runner process: starts the DreamRouterInbox task once and logs it' {
    Mock Get-InboxRunnerProcessCount { 0 }
    Invoke-InboxRunnerCheck | Should Be $true
    Assert-MockCalled Start-DreamTask -Times 1 -Exactly -Scope It -ParameterFilter { $TaskName -eq 'DreamRouterInbox' }
    Assert-MockCalled Write-BootLog -Times 1 -Exactly -Scope It
  }
  It 'a runner is alive: never starts a second runner' {
    Mock Get-InboxRunnerProcessCount { 1 }
    Invoke-InboxRunnerCheck | Should Be $false
    Assert-MockCalled Start-DreamTask -Times 0 -Exactly -Scope It
  }
  It 'no node process but the task loop is running: never starts a second runner' {
    Mock Get-InboxRunnerProcessCount { 0 }
    Mock Get-DreamTaskState { 'Running' }
    Invoke-InboxRunnerCheck | Should Be $false
    Assert-MockCalled Start-DreamTask -Times 0 -Exactly -Scope It
  }
  It 'two repeat runs with a live runner: still zero starts' {
    Mock Get-InboxRunnerProcessCount { 1 }
    Invoke-InboxRunnerCheck | Out-Null
    Invoke-InboxRunnerCheck | Out-Null
    Assert-MockCalled Start-DreamTask -Times 0 -Exactly -Scope It
  }
}

Describe 'Swarm Command check' {
  Mock Write-BootLog {}
  Mock Start-DetachedService {}
  Mock Test-Path { $true } -ParameterFilter { $LiteralPath -like '*swarm-command*' }

  It 'port 8000 down: starts backend once, hidden, on 127.0.0.1:8000 and never starts a separate server on 3001' {
    Mock Get-SwarmPython { 'X:\venv\Scripts\python.exe' }
    Mock Test-TcpPort { $false }
    $started = @(Invoke-SwarmCommandCheck)
    $started.Count | Should Be 1
    $started[0] | Should Be 'backend'
    Assert-MockCalled Start-DetachedService -Times 1 -Exactly -Scope It -ParameterFilter { $CommandLine -like '*run_server(port=8000)*' -and $ShowWindow -eq 0 }
    Assert-MockCalled Start-DetachedService -Times 0 -Exactly -Scope It -ParameterFilter { $CommandLine -like '*3001*' -or $CommandLine -like '*http.server*' }
    Assert-MockCalled Write-BootLog -Times 1 -Exactly -Scope It
  }
  It 'port 8000 up: calls nothing' {
    Mock Get-SwarmPython { 'X:\venv\Scripts\python.exe' }
    Mock Test-TcpPort { $true }
    @(Invoke-SwarmCommandCheck).Count | Should Be 0
    Assert-MockCalled Start-DetachedService -Times 0 -Exactly -Scope It
  }
  It 'no Python with its packages on this node: starts nothing' {
    Mock Get-SwarmPython { $null }
    Mock Test-TcpPort { $false }
    @(Invoke-SwarmCommandCheck).Count | Should Be 0
    Assert-MockCalled Start-DetachedService -Times 0 -Exactly -Scope It
  }
  It 'defines port 8000 and no separate front end port variable' {
    $swarmBackendPort | Should Be 8000
    (Get-Variable -Name swarmFrontendPort -ErrorAction SilentlyContinue) | Should Be $null
  }
}

Describe 'Write-BootLog' {
  It 'writes one line with time, what and why' {
    $saved = $bootLogDir
    $script:bootLogDir = Join-Path $TestDrive 'dream-boot'
    $script:bootLog = Join-Path $script:bootLogDir 'boot.log'
    Write-BootLog 'thing (127.0.0.1:1)' 'port 1 not listening'
    $lines = @(Get-Content -LiteralPath $script:bootLog)
    $lines.Count | Should Be 1
    $lines[0] | Should Match '^\d{4}-\d{2}-\d{2}T.* \| started thing \(127\.0\.0\.1:1\) \| port 1 not listening$'
    $script:bootLogDir = $saved
    $script:bootLog = Join-Path $saved 'boot.log'
  }
}

Describe 'Repeat runs open no window and no browser tab' {
  $src = Get-Content -LiteralPath (Join-Path $here 'boot-alienware-services.ps1') -Raw
  It 'every Start-Process (Obsidian link and browser tabs) sits behind the first-run-after-boot gate' {
    $tokens = $null; $errors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseInput($src, [ref]$tokens, [ref]$errors)
    $calls = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.CommandAst] -and $n.GetCommandName() -eq 'Start-Process' }, $true)
    @($calls).Count | Should BeGreaterThan 0
    foreach ($c in $calls) {
      $p = $c.Parent; $gated = $false
      while ($p) {
        if ($p -is [System.Management.Automation.Language.IfStatementAst] -and $p.Clauses[0].Item1.Extent.Text -match '\$isFirstRun') { $gated = $true; break }
        $p = $p.Parent
      }
      $gated | Should Be $true
    }
  }
  It 'the only visible start (ShowWindow 1) is the first-run Obsidian fallback' {
    @([regex]::Matches($src, '(?m)^\s*Start-DetachedService .* 1\s*$')).Count | Should Be 1
  }
}

Describe 'register-boot-task.ps1' {
  $reg = Join-Path $here 'register-boot-task.ps1'
  It 'prints what it would change and registers nothing without -Apply' {
    Mock Register-ScheduledTask {}
    $out = & $reg | Out-String
    $out | Should Match 'DRY RUN'
    $out | Should Match 'DREAM-Alienware-BootAll'
    $out | Should Match 'DREAM-Engine-runner'
    Assert-MockCalled Register-ScheduledTask -Times 0 -Exactly -Scope It
  }
  It 'defines sign-in plus every 15 minutes, hidden, one instance, restart on failure' {
    $def = & $reg -DefinitionOnly
    $def.TaskName | Should Be 'DREAM-Alienware-BootAll'
    @($def.Trigger).Count | Should Be 2
    (@($def.Trigger | Where-Object { $_.Repetition.Interval -eq 'PT15M' })).Count | Should Be 1
    (@($def.Trigger | Where-Object { $_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger' })).Count | Should Be 1
    $def.Settings.Hidden | Should Be $true
    $def.Settings.MultipleInstances | Should Be 'IgnoreNew'
    $def.Settings.RestartCount | Should BeGreaterThan 0
    $def.Action.Execute | Should Be 'wscript.exe'
    $def.Action.Arguments | Should Match 'DREAM-Engine-runner\\ops\\node\\boot-alienware-services\.vbs'
  }
}

Describe 'retire-old-boot-launchers.ps1' {
  $retire = Join-Path $here 'retire-old-boot-launchers.ps1'

  It 'dry-run lists DREAM-Alienware-BootAll Startup and Run entries with %USERPROFILE% and changes nothing' {
    $fakeStartup = Join-Path $TestDrive 'startup-dry'
    $fakeRetired = Join-Path $TestDrive 'retired-dry'
    $fakeRunKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
    New-Item -ItemType Directory -Path $fakeStartup -Force | Out-Null
    $startupVbs = Join-Path $fakeStartup 'DREAM-Alienware-BootAll.vbs'
    Set-Content -LiteralPath $startupVbs -Value 'psCmd = "powershell.exe -File ""%USERPROFILE%\antigravity\DREAM-Engine\ops\node\boot-alienware-services.ps1"""' -Encoding UTF8
    $otherFile = Join-Path $fakeStartup 'GrinDroid.cmd'
    Set-Content -LiteralPath $otherFile -Value '@echo off' -Encoding UTF8

    Mock Get-ItemProperty {
      [pscustomobject]@{
        'DREAM-Alienware-BootAll' = "$env:USERPROFILE\antigravity\DREAM-Engine\ops\node\boot-alienware-services.ps1"
        'GrinDroid' = 'C:\GrinDroid\run.exe'
      }
    } -ParameterFilter { $LiteralPath -eq $fakeRunKey }
    Mock Rename-ItemProperty {}

    $out = & $retire -StartupDir $fakeStartup -RunKeyPath $fakeRunKey -RetiredDir $fakeRetired | Out-String
    $out | Should Match 'DRY RUN'
    $out | Should Match 'DREAM-Alienware-BootAll\.vbs'
    $out | Should Match '%USERPROFILE%\\antigravity\\DREAM-Engine\\ops\\node\\boot-alienware-services\.ps1'
    $out | Should Not Match '(?i)[A-Z]:\\Users\\'
    $out | Should Not Match 'GrinDroid'
    (Test-Path -LiteralPath $startupVbs) | Should Be $true
    (Test-Path -LiteralPath $otherFile) | Should Be $true
    (Test-Path -LiteralPath $fakeRetired) | Should Be $false
    Assert-MockCalled Rename-ItemProperty -Times 0 -Exactly -Scope It
  }

  It 'with -Apply moves only DREAM-Alienware-BootAll Startup file into retired and renames Run value to .retired with data file beside it' {
    $fakeStartup = Join-Path $TestDrive 'startup-apply'
    $fakeRetired = Join-Path $TestDrive 'retired-apply'
    $fakeRunKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
    New-Item -ItemType Directory -Path $fakeStartup -Force | Out-Null
    $startupVbs = Join-Path $fakeStartup 'DREAM-Alienware-BootAll.vbs'
    Set-Content -LiteralPath $startupVbs -Value 'psCmd = "powershell.exe -File ""%USERPROFILE%\antigravity\DREAM-Engine\ops\node\boot-alienware-services.ps1"""' -Encoding UTF8
    $otherFile = Join-Path $fakeStartup 'GrinDroid.cmd'
    Set-Content -LiteralPath $otherFile -Value '@echo off' -Encoding UTF8

    $runValueData = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\boot-alienware-services.ps1"'
    Mock Get-ItemProperty {
      [pscustomobject]@{
        'DREAM-Alienware-BootAll' = $runValueData
        'GrinDroid' = 'C:\GrinDroid\run.exe'
      }
    } -ParameterFilter { $LiteralPath -eq $fakeRunKey }
    Mock Rename-ItemProperty {}

    $out = & $retire -StartupDir $fakeStartup -RunKeyPath $fakeRunKey -RetiredDir $fakeRetired -Apply | Out-String
    $out | Should Match 'APPLIED'
    (Test-Path -LiteralPath $startupVbs) | Should Be $false
    (Test-Path -LiteralPath (Join-Path $fakeRetired 'DREAM-Alienware-BootAll.vbs')) | Should Be $true
    (Test-Path -LiteralPath $otherFile) | Should Be $true

    $savedRunText = Join-Path $fakeRetired 'DREAM-Alienware-BootAll.retired.txt'
    (Test-Path -LiteralPath $savedRunText) | Should Be $true
    (Get-Content -LiteralPath $savedRunText -Raw).Trim() | Should Be $runValueData

    Assert-MockCalled Rename-ItemProperty -Times 1 -Exactly -Scope It -ParameterFilter {
      $LiteralPath -eq $fakeRunKey -and $Name -eq 'DREAM-Alienware-BootAll' -and $NewName -eq 'DREAM-Alienware-BootAll.retired'
    }
  }

  It 'never calls Remove-Item or Remove-ItemProperty' {
    $src = Get-Content -LiteralPath $retire -Raw
    $src | Should Not Match '\bRemove-Item(Property)?\b'
  }
}

Describe 'New boot files carry no user folder path and no private LAN address' {
  $files = @('boot-alienware-services.ps1', 'boot-alienware-services.vbs', 'boot-alienware-services.Tests.ps1', 'register-boot-task.ps1', 'retire-old-boot-launchers.ps1') | ForEach-Object { Join-Path $here $_ }
  It 'names no Windows user folder' {
    @($files | ForEach-Object { Select-String -LiteralPath $_ -Pattern '(?i)[A-Z]:[\\/]+Users[\\/]+[^%\\/\s"]' }).Count | Should Be 0
  }
  It 'names no private LAN address' {
    @($files | ForEach-Object { Select-String -LiteralPath $_ -Pattern '\b(192\.168|10\.\d{1,3}|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b' }).Count | Should Be 0
  }
}
