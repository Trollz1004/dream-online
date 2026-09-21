<#
  Tests for the ground-truth checker. Pester 3.4 syntax (Should Be), because that
  is the version on this node and the health probe's tests already use it.

  Run:  Invoke-Pester -Path ops\node\dream-ground-truth.Tests.ps1
#>

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'dream-ground-truth.ps1') -NoRun

Describe 'Get-NewestRecordDate' {

  It 'reads the date out of the newest dated heading' {
    $file = Join-Path $TestDrive 'journal.md'
    @(
      '# A journal',
      '',
      '## 2026-09-21 about 15:10 EDT, seventh session',
      'did things',
      '',
      '## 2026-09-19 about 17:00 EDT, first session',
      'did other things'
    ) | Set-Content -Path $file -Encoding UTF8

    $got = Get-NewestRecordDate -Path $file
    $got.ToString('yyyy-MM-dd') | Should Be '2026-09-21'
  }

  It 'takes the newest date even when the headings are out of order' {
    $file = Join-Path $TestDrive 'unordered.md'
    @(
      '## 2026-09-10 something',
      '## 2026-09-28 something later',
      '## 2026-09-14 something middling'
    ) | Set-Content -Path $file -Encoding UTF8

    (Get-NewestRecordDate -Path $file).ToString('yyyy-MM-dd') | Should Be '2026-09-28'
  }

  # A file like the dispatch has headings that are words, not dates, so it
  # carries an explicit marker line instead.
  It 'reads a Last updated marker when there is no dated heading' {
    $file = Join-Path $TestDrive 'dispatch.md'
    @(
      '# Dispatch',
      'Last updated: 2026-09-21',
      '',
      '## CURRENT OBJECTIVE',
      'something'
    ) | Set-Content -Path $file -Encoding UTF8

    (Get-NewestRecordDate -Path $file).ToString('yyyy-MM-dd') | Should Be '2026-09-21'
  }

  It 'prefers whichever is newer, the marker or a dated heading' {
    $file = Join-Path $TestDrive 'both.md'
    @(
      'Last updated: 2026-09-14',
      '## 2026-09-22 a later session'
    ) | Set-Content -Path $file -Encoding UTF8

    (Get-NewestRecordDate -Path $file).ToString('yyyy-MM-dd') | Should Be '2026-09-22'
  }

  It 'returns nothing for a file with no dated heading' {
    $file = Join-Path $TestDrive 'undated.md'
    'just prose, no headings with dates' | Set-Content -Path $file -Encoding UTF8
    Get-NewestRecordDate -Path $file | Should BeNullOrEmpty
  }

  It 'returns nothing for a file that is not there' {
    Get-NewestRecordDate -Path (Join-Path $TestDrive 'absent.md') | Should BeNullOrEmpty
  }
}

Describe 'Test-CopiesInSync' {

  It 'says two identical files are in sync' {
    $a = Join-Path $TestDrive 'a.txt'
    $b = Join-Path $TestDrive 'b.txt'
    'same bytes' | Set-Content -Path $a -Encoding UTF8
    'same bytes' | Set-Content -Path $b -Encoding UTF8
    Test-CopiesInSync -First $a -Second $b | Should Be $true
  }

  It 'says two different files are not in sync' {
    $a = Join-Path $TestDrive 'c.txt'
    $b = Join-Path $TestDrive 'd.txt'
    'one thing' | Set-Content -Path $a -Encoding UTF8
    'another thing' | Set-Content -Path $b -Encoding UTF8
    Test-CopiesInSync -First $a -Second $b | Should Be $false
  }

  It 'says a missing file is not in sync rather than throwing' {
    $a = Join-Path $TestDrive 'e.txt'
    'present' | Set-Content -Path $a -Encoding UTF8
    Test-CopiesInSync -First $a -Second (Join-Path $TestDrive 'gone.txt') | Should Be $false
  }
}

Describe 'Get-StalenessVerdict' {

  It 'calls a record current when it is not older than the newest commit' {
    $verdict = Get-StalenessVerdict -RecordDate ([datetime]'2026-09-21') -CommitDate ([datetime]'2026-09-21')
    $verdict | Should Be 'CURRENT'
  }

  It 'calls a record stale when work landed after it was last written' {
    $verdict = Get-StalenessVerdict -RecordDate ([datetime]'2026-09-19') -CommitDate ([datetime]'2026-09-21')
    $verdict | Should Be 'STALE'
  }

  It 'calls a missing record MISSING rather than guessing' {
    Get-StalenessVerdict -RecordDate $null -CommitDate ([datetime]'2026-09-21') | Should Be 'MISSING'
  }
}

Describe 'ConvertTo-CommitDate' {

  It 'reads a plain date' {
    (ConvertTo-CommitDate -Text '2026-09-21').ToString('yyyy-MM-dd') | Should Be '2026-09-21'
  }

  # PowerShell passes --format='%ad' through to git with the quotes still on it,
  # so the answer can come back wrapped. That cost a red run on 2026-09-21.
  It 'tolerates the stray quotes PowerShell leaves on a git format string' {
    (ConvertTo-CommitDate -Text "'2026-09-21'").ToString('yyyy-MM-dd') | Should Be '2026-09-21'
  }

  It 'returns nothing for empty text instead of throwing' {
    ConvertTo-CommitDate -Text '' | Should BeNullOrEmpty
  }

  It 'returns nothing for text that is not a date instead of throwing' {
    ConvertTo-CommitDate -Text 'not a date at all' | Should BeNullOrEmpty
  }
}

Describe 'Format-Date' {

  It 'shows a date plainly' {
    Format-Date -Value ([datetime]'2026-09-21') | Should Be '2026-09-21'
  }

  It 'says so rather than throwing when there is no date' {
    Format-Date -Value $null | Should Be 'unknown'
  }
}

Describe 'Format-Line' {

  It 'puts the state where a reader can scan a column of them' {
    $line = Format-Line -Name 'working tree' -State 'PASS' -Detail 'clean'
    $line | Should Match '^\s*PASS\s+working tree\s+clean$'
  }

  It 'keeps the detail even when it is long' {
    $line = Format-Line -Name 'records' -State 'STALE' -Detail ('x' * 60)
    $line | Should Match 'x{60}'
  }
}

Describe 'Get-OverallVerdict' {

  It 'is GREEN when everything passed' {
    Get-OverallVerdict -States @('PASS', 'PASS', 'CURRENT') | Should Be 'GREEN'
  }

  It 'is YELLOW when something is stale but nothing is broken' {
    Get-OverallVerdict -States @('PASS', 'STALE') | Should Be 'YELLOW'
  }

  It 'is RED when anything is broken' {
    Get-OverallVerdict -States @('PASS', 'STALE', 'BROKEN') | Should Be 'RED'
  }

  It 'treats dirty work in the tree as RED, because it is lost work waiting to happen' {
    Get-OverallVerdict -States @('DIRTY') | Should Be 'RED'
  }
}
