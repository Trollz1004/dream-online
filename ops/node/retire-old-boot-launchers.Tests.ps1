# Pester 3.4 tests for retire-old-boot-launchers.ps1 (the version that ships with Windows PowerShell 5.1).
# Run: powershell -NoProfile -Command "Import-Module Pester -RequiredVersion 3.4.0; Invoke-Pester -Path ops/node/retire-old-boot-launchers.Tests.ps1"
# Every registry write goes to a throwaway key under HKCU:\Software\DreamBootTest that the test creates and removes.
# The real Run key, StartupApproved key and Startup folder are never passed to the script.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$retire = Join-Path $here 'retire-old-boot-launchers.ps1'

function Get-TestMark([string]$Key, [string]$Name) {
  $item = Get-Item -LiteralPath $Key
  if (@($item.GetValueNames()) -notcontains $Name) { return $null }
  return ,[byte[]]$item.GetValue($Name)
}
function HexOf($Bytes) { if ($null -eq $Bytes) { return '<absent>' }; ($Bytes | ForEach-Object { $_.ToString('X2') }) -join ' ' }

Describe 'retire-old-boot-launchers.ps1 (StartupApproved marks)' {
  $testRoot = 'HKCU:\Software\DreamBootTest'
  $base = Join-Path $testRoot ([guid]::NewGuid().ToString('N'))
  $runKey = Join-Path $base 'Run'
  $approved = Join-Path $base 'StartupApproved'
  $approvedRun = Join-Path $approved 'Run'
  $approvedFolder = Join-Path $approved 'StartupFolder'
  $startupDir = Join-Path $TestDrive 'Startup'
  $retiredDir = Join-Path $TestDrive 'retired'
  $statePath = Join-Path $retiredDir 'startup-approved-before.json'
  $runData = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%USERPROFILE%\antigravity\DREAM-Engine\ops\node\boot-alienware-services.ps1"'
  $otherMark = [byte[]](2,0,0,0,0,0,0,0,0,0,0,0)
  $otherDisabled = [byte[]](3,0,0,0,1,2,3,4,5,6,7,8)

  New-Item -Path $runKey -Force | Out-Null
  New-Item -Path $approvedRun -Force | Out-Null
  New-Item -Path $approvedFolder -Force | Out-Null
  New-ItemProperty -LiteralPath $runKey -Name 'DREAM-Alienware-BootAll' -PropertyType String -Value $runData | Out-Null
  New-ItemProperty -LiteralPath $runKey -Name 'DREAM-Alienware-Obsidian' -PropertyType String -Value 'obsidian.exe' | Out-Null
  New-ItemProperty -LiteralPath $runKey -Name 'DREAM-Alienware-BootAll.retired' -PropertyType String -Value 'old.exe' | Out-Null
  New-ItemProperty -LiteralPath $approvedRun -Name 'DREAM-Alienware-Obsidian' -PropertyType Binary -Value $otherMark | Out-Null
  New-ItemProperty -LiteralPath $approvedFolder -Name 'Other.lnk' -PropertyType Binary -Value $otherDisabled | Out-Null
  New-Item -ItemType Directory -Path $startupDir -Force | Out-Null
  $vbs = Join-Path $startupDir 'DREAM-Alienware-BootAll.vbs'
  Set-Content -LiteralPath $vbs -Value 'psCmd = "powershell.exe -File ""%USERPROFILE%\antigravity\DREAM-Engine\ops\node\boot-alienware-services.ps1"""' -Encoding ASCII
  $otherFile = Join-Path $startupDir 'Other.lnk'
  Set-Content -LiteralPath $otherFile -Value 'x' -Encoding ASCII
  $vbsBefore = Get-Content -LiteralPath $vbs -Raw

  $common = @{ StartupDir = $startupDir; RunKeyPath = $runKey; ApprovedRoot = $approved; RetiredDir = $retiredDir }

  try {
    It 'dry run: reports both entries found, enabled, with %USERPROFILE%, and writes nothing' {
      $out = & $retire @common | Out-String
      $out | Should Match 'DRY RUN'
      $out | Should Match 'Run key entry: DREAM-Alienware-BootAll'
      $out | Should Match 'Startup folder file: DREAM-Alienware-BootAll\.vbs'
      $out | Should Match 'enabled \(no StartupApproved mark\)'
      $out | Should Match '%USERPROFILE%\\antigravity\\DREAM-Engine\\ops\\node\\boot-alienware-services\.ps1'
      $out | Should Match '03 00 00 00'
      $out | Should Not Match '(?i)[A-Z]:\\Users\\'
      (Get-TestMark $approvedRun 'DREAM-Alienware-BootAll') | Should Be $null
      (Get-TestMark $approvedFolder 'DREAM-Alienware-BootAll.vbs') | Should Be $null
      (Test-Path -LiteralPath $statePath) | Should Be $false
    }

    It '-Apply: saves absent to the state file, then marks both disabled (03, 12 bytes)' {
      $out = & $retire @common -Apply | Out-String
      $out | Should Match 'APPLY'
      $saved = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
      @($saved.entries).Count | Should Be 2
      @($saved.entries | Where-Object { $_.state -eq 'absent' }).Count | Should Be 2
      foreach ($pair in @(@($approvedRun, 'DREAM-Alienware-BootAll'), @($approvedFolder, 'DREAM-Alienware-BootAll.vbs'))) {
        $m = Get-TestMark $pair[0] $pair[1]
        $m.Length | Should Be 12
        $m[0] | Should Be 3
      }
    }

    It '-Apply leaves the Run value, the Startup file and every other entry untouched' {
      (Get-ItemProperty -LiteralPath $runKey).'DREAM-Alienware-BootAll' | Should Be $runData
      (Get-ItemProperty -LiteralPath $runKey).'DREAM-Alienware-Obsidian' | Should Be 'obsidian.exe'
      (Get-ItemProperty -LiteralPath $runKey).'DREAM-Alienware-BootAll.retired' | Should Be 'old.exe'
      (Get-Content -LiteralPath $vbs -Raw) | Should Be $vbsBefore
      (Test-Path -LiteralPath $otherFile) | Should Be $true
      (HexOf (Get-TestMark $approvedRun 'DREAM-Alienware-Obsidian')) | Should Be (HexOf $otherMark)
      (HexOf (Get-TestMark $approvedFolder 'Other.lnk')) | Should Be (HexOf $otherDisabled)
      @((Get-Item -LiteralPath $approvedRun).GetValueNames()).Count | Should Be 2
      @((Get-Item -LiteralPath $approvedFolder).GetValueNames()).Count | Should Be 2
      @(Get-ChildItem -LiteralPath $startupDir).Count | Should Be 2
    }

    It 'a second -Apply changes nothing' {
      $runBefore = HexOf (Get-TestMark $approvedRun 'DREAM-Alienware-BootAll')
      $folderBefore = HexOf (Get-TestMark $approvedFolder 'DREAM-Alienware-BootAll.vbs')
      $stateBefore = Get-Content -LiteralPath $statePath -Raw
      $out = & $retire @common -Apply | Out-String
      $out | Should Match 'nothing to change'
      (HexOf (Get-TestMark $approvedRun 'DREAM-Alienware-BootAll')) | Should Be $runBefore
      (HexOf (Get-TestMark $approvedFolder 'DREAM-Alienware-BootAll.vbs')) | Should Be $folderBefore
      (Get-Content -LiteralPath $statePath -Raw) | Should Be $stateBefore
    }

    It 'dry run after -Apply reports both disabled' {
      $out = & $retire @common | Out-String
      @([regex]::Matches($out, 'Now:\s+disabled')).Count | Should Be 2
    }

    It '-Undo: absent marks come back as enabled (02 + zeros); other entries untouched' {
      $out = & $retire @common -Undo | Out-String
      $out | Should Match 'UNDO'
      (HexOf (Get-TestMark $approvedRun 'DREAM-Alienware-BootAll')) | Should Be '02 00 00 00 00 00 00 00 00 00 00 00'
      (HexOf (Get-TestMark $approvedFolder 'DREAM-Alienware-BootAll.vbs')) | Should Be '02 00 00 00 00 00 00 00 00 00 00 00'
      (HexOf (Get-TestMark $approvedRun 'DREAM-Alienware-Obsidian')) | Should Be (HexOf $otherMark)
      (HexOf (Get-TestMark $approvedFolder 'Other.lnk')) | Should Be (HexOf $otherDisabled)
      (Get-ItemProperty -LiteralPath $runKey).'DREAM-Alienware-BootAll' | Should Be $runData
    }

    It '-Undo restores a mark that existed before -Apply to its exact bytes' {
      $prior = [byte[]](6,0,0,0,0,0,0,0,0,0,0,0)
      New-ItemProperty -LiteralPath $approvedRun -Name 'DREAM-Alienware-BootAll' -PropertyType Binary -Value $prior -Force | Out-Null
      Remove-Item -LiteralPath $statePath
      & $retire @common -Apply | Out-Null
      (Get-TestMark $approvedRun 'DREAM-Alienware-BootAll')[0] | Should Be 3
      & $retire @common -Undo | Out-Null
      (HexOf (Get-TestMark $approvedRun 'DREAM-Alienware-BootAll')) | Should Be (HexOf $prior)
    }

    It 'touches nothing when neither entry is present' {
      $emptyRun = Join-Path $base 'EmptyRun'
      New-Item -Path $emptyRun -Force | Out-Null
      $emptyStartup = Join-Path $TestDrive 'EmptyStartup'
      New-Item -ItemType Directory -Path $emptyStartup -Force | Out-Null
      $emptyApproved = Join-Path $base 'EmptyApproved'
      $out = & $retire -StartupDir $emptyStartup -RunKeyPath $emptyRun -ApprovedRoot $emptyApproved -RetiredDir (Join-Path $TestDrive 'retired-empty') -Apply | Out-String
      $out | Should Match 'Found:  no'
      $out | Should Match 'nothing to change'
      (Test-Path -LiteralPath $emptyApproved) | Should Be $false
    }

    It 'source never deletes, renames or moves anything' {
      $src = Get-Content -LiteralPath $retire -Raw
      $src | Should Not Match '\b(Remove-Item(Property)?|Rename-Item(Property)?|Move-Item)\b'
    }
  } finally {
    Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue
    if ((Test-Path -LiteralPath $testRoot) -and @(Get-ChildItem -LiteralPath $testRoot).Count -eq 0) {
      Remove-Item -LiteralPath $testRoot -Force -ErrorAction SilentlyContinue
    }
  }

  It 'removes its throwaway registry key' {
    (Test-Path -LiteralPath $base) | Should Be $false
  }
}
