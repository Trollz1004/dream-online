# Pester 3.4 tests for register-drift-logon.ps1. Nothing is registered: every test uses -DefinitionOnly.
#   Invoke-Pester -Path ops/node/register-drift-logon.Tests.ps1

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $here 'register-drift-logon.ps1'

Describe 'register-drift-logon.ps1 task definition' {

  $fakeDrift = Join-Path $TestDrive 'drift.cmd'
  Set-Content -LiteralPath $fakeDrift -Value '@echo off' -Encoding ASCII
  $def = & $script -DriftPath $fakeDrift -DefinitionOnly

  It 'is named DREAM-Drift-Logon' {
    $def.TaskName | Should Be 'DREAM-Drift-Logon'
  }

  It 'opens a console that stays open and runs drift' {
    $def.Action.Execute | Should Be 'cmd.exe'
    $def.Action.Arguments | Should Be "/k `"$fakeDrift`""
  }

  It 'starts in the game checkout' {
    $def.Action.WorkingDirectory | Should Be 'C:\DREAM\dream-online'
  }

  It 'fires at sign-in of the current user, after the stack has had time to warm up' {
    $def.Trigger.CimClass.CimClassName | Should Be 'MSFT_TaskLogonTrigger'
    $def.Trigger.UserId | Should Be "$env:USERDOMAIN\$env:USERNAME"
    $def.Trigger.Delay | Should Be 'PT90S'
  }

  It 'honours a different delay' {
    $other = & $script -DriftPath $fakeDrift -DelaySeconds 30 -DefinitionOnly
    $other.Trigger.Delay | Should Be 'PT30S'
  }

  It 'runs on the desktop, not elevated' {
    $def.Principal.LogonType | Should Be 'Interactive'
    $def.Principal.RunLevel | Should Be 'Limited'
  }

  It 'never opens a second terminal and never kills a long session' {
    $def.Settings.MultipleInstances | Should Be 'IgnoreNew'
    $def.Settings.ExecutionTimeLimit | Should Be 'PT0S'
  }

  It 'refuses a drift path that does not exist' {
    { & $script -DriftPath (Join-Path $TestDrive 'missing.cmd') -DefinitionOnly } | Should Throw
  }
}
