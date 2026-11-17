# Pester 3.4 tests for verify-retired-launchers.ps1
# Run: powershell -NoProfile -Command "Import-Module Pester -RequiredVersion 3.4.0; Invoke-Pester -Path ops/node/verify-retired-launchers.Tests.ps1"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$verifyScript = Join-Path $here 'verify-retired-launchers.ps1'
. $verifyScript -NoRun

Describe 'verify-retired-launchers.ps1 (read-only retired launcher & boot.log verifier)' {
  $testRoot = 'HKCU:\Software\DreamBootVerifyTest'
  $base = Join-Path $testRoot ([guid]::NewGuid().ToString('N'))
  $runKey = Join-Path $base 'Run'
  $approved = Join-Path $base 'StartupApproved'
  $approvedRun = Join-Path $approved 'Run'
  $approvedFolder = Join-Path $approved 'StartupFolder'
  $startupDir = Join-Path $TestDrive 'Startup'
  $retiredDir = Join-Path $TestDrive 'retired'
  $statePath = Join-Path $retiredDir 'startup-approved-before.json'
  $bootLogPath = Join-Path $TestDrive 'boot.log'
  $disabledMark = [byte[]](3,0,0,0,0,128,62,213,187,77,220,1)

  New-Item -Path $runKey -Force | Out-Null
  New-Item -Path $approvedRun -Force | Out-Null
  New-Item -Path $approvedFolder -Force | Out-Null
  New-ItemProperty -LiteralPath $runKey -Name 'DREAM-Alienware-BootAll' -PropertyType String -Value 'powershell.exe -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\boot-alienware-services.ps1"' | Out-Null
  New-ItemProperty -LiteralPath $approvedRun -Name 'DREAM-Alienware-BootAll' -PropertyType Binary -Value $disabledMark | Out-Null
  New-ItemProperty -LiteralPath $approvedFolder -Name 'DREAM-Alienware-BootAll.vbs' -PropertyType Binary -Value $disabledMark | Out-Null
  New-Item -ItemType Directory -Path $startupDir -Force | Out-Null
  New-Item -ItemType Directory -Path $retiredDir -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $startupDir 'DREAM-Alienware-BootAll.vbs') -Value 'Option Explicit' -Encoding ASCII
  Set-Content -LiteralPath $statePath -Value '{"savedAt":"2026-11-16T12:00:00.0000000Z","entries":[{"kind":"Run","name":"DREAM-Alienware-BootAll","state":"absent","bytes":""},{"kind":"StartupFolder","name":"DREAM-Alienware-BootAll.vbs","state":"absent","bytes":""}]}' -Encoding UTF8
  Set-Content -LiteralPath $bootLogPath -Value '2026-11-16T12:10:00.0000000Z | started DREAM Dev Engine (192.168.0.40:9180) | port 9180 not listening' -Encoding UTF8

  try {
    It 'reports disabled marks, sign-in BEFORE savedAt when logon is older, and zero retired launcher activity in boot.log' {
      $r = Get-RetiredLaunchersVerification `
        -StartupFolder $startupDir `
        -RunKey $runKey `
        -ApprovedKeyRoot $approved `
        -RetiredStateDir $retiredDir `
        -LogFilePath $bootLogPath `
        -BootTimeOverride ([datetime]'2026-11-16T08:00:00Z') `
        -LogonTimeOverride ([datetime]'2026-11-16T08:05:00Z')
      $r.RunEntry.Found | Should Be $true
      $r.RunEntry.Disabled | Should Be $true
      $r.StartupFolderEntry.Found | Should Be $true
      $r.StartupFolderEntry.Disabled | Should Be $true
      $r.SavedBeforeState.Exists | Should Be $true
      $r.SignInAfterSaved | Should Be $false
      $r.BootLog.RetiredLauncherActivity | Should Be $false
    }

    It 'reports SignInAfterSaved = true when interactive logon is newer than savedAt' {
      $r = Get-RetiredLaunchersVerification `
        -StartupFolder $startupDir `
        -RunKey $runKey `
        -ApprovedKeyRoot $approved `
        -RetiredStateDir $retiredDir `
        -LogFilePath $bootLogPath `
        -BootTimeOverride ([datetime]'2026-11-16T14:00:00Z') `
        -LogonTimeOverride ([datetime]'2026-11-16T14:02:00Z')
      $r.SignInAfterSaved | Should Be $true
      $r.BootAfterSaved | Should Be $true
      $r.BootLog.EntriesAfterSavedCount | Should Be 1
    }

    It 'never writes, renames, or deletes anything in source' {
      $src = Get-Content -LiteralPath $verifyScript -Raw
      $src | Should Not Match '\b(Set-Item(Property)?|New-Item(Property)?|Remove-Item(Property)?|Rename-Item(Property)?|Move-Item|Set-Content|Add-Content)\b'
    }
  } finally {
    Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue
    if ((Test-Path -LiteralPath $testRoot) -and @(Get-ChildItem -LiteralPath $testRoot).Count -eq 0) {
      Remove-Item -LiteralPath $testRoot -Force -ErrorAction SilentlyContinue
    }
  }
}
