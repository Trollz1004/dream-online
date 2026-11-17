# Pester 3.4 tests for ops/agents/check-agent-drift.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $here '..\..')).Path
$renderScript = Join-Path $here 'render-agent-files.ps1'
$driftScript = Join-Path $here 'check-agent-drift.ps1'

function Write-Utf8NoBom {
  param([string]$Path, [string]$Text)
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

function New-DriftTestFixture {
  param([string]$BaseDir)
  $fakeRepo = Join-Path $BaseDir 'sample-repo'
  $fakeProfile = Join-Path $BaseDir 'UserProfile'
  $fakeLocalApp = Join-Path $fakeProfile 'AppData\Local'
  $fakeFreebuff = Join-Path $BaseDir 'freebuff-leadgen'
  $statusPath = Join-Path $fakeLocalApp 'dream-boot\agent-drift.json'

  New-Item -ItemType Directory -Path $fakeRepo -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeProfile '.gemini\config') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeProfile '.codex') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeProfile '.claude') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeLocalApp 'hermes\profiles\default') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeLocalApp 'hermes\profiles\t5500') -Force | Out-Null
  New-Item -ItemType Directory -Path $fakeFreebuff -Force | Out-Null

  $hrBullet = '- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.'
  $cbBullet = '- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).'

  Write-Utf8NoBom -Path (Join-Path $fakeRepo 'AGENTS.md') -Text ("# AGENTS`n`nBody.`n$hrBullet`n$cbBullet`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo 'CLAUDE.md') -Text ("Workspace at D:\mira " + [char]0x2014 + " Legal NSFW only.`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\demo\SKILL.md') -Text ("---`nname: demo`n---`nBody.`n$hrBullet`n$cbBullet`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\demo\skill.json') -Text ("{`n  `"house_rules`": `"docs/house/HOUSE-MOTION-RULE.md`",`n  `"name`": `"demo`"`n}`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\demo\agents\gemini.toml') -Text ("name = `"demo`"`nhouse_rules = `"docs/house/HOUSE-MOTION-RULE.md`"`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\demo\agents\openai.yaml') -Text ("name: demo`nhouse_rules: `"docs/house/HOUSE-MOTION-RULE.md`"`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\hallmark\SKILL.md') -Text "# Vendored Hallmark`n"

  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.gemini\GEMINI.md') -Text "# Gemini`n"
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.gemini\settings.json') -Text "{`n  `"trustedWorkspaces`": [`"demo`"]`n}`n"
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.gemini\config\mcp_config.json') -Text "{`n  `"mcpServers`": {}`n}`n"
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.codex\config.toml') -Text "model = `"gpt-6-astra`"`n"
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.codex\AGENTS.md') -Text "# Codex Agents`n"
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.claude\CLAUDE.md') -Text "# Claude`n"
  Write-Utf8NoBom -Path (Join-Path $fakeLocalApp 'hermes\ALIENWARE-SOUL.md') -Text "# Alienware Soul`n<!-- TROLLZ1004-SPINE:START -->`nSTALE`n<!-- TROLLZ1004-SPINE:END -->`n"
  Write-Utf8NoBom -Path (Join-Path $fakeLocalApp 'hermes\SOUL.md') -Text ("Workspace at D:\mira " + [char]0x2014 + " Legal NSFW only.`n")
  Write-Utf8NoBom -Path (Join-Path $fakeLocalApp 'hermes\profile.yaml') -Text "name: default`nmodel: local`n"
  Write-Utf8NoBom -Path (Join-Path $fakeLocalApp 'hermes\profiles\default\SOUL.md') -Text "# Default Profile Soul`n"
  Write-Utf8NoBom -Path (Join-Path $fakeLocalApp 'hermes\profiles\t5500\SOUL.md') -Text "# T5500 Soul`n"
  Write-Utf8NoBom -Path (Join-Path $fakeFreebuff 'AGENTS.md') -Text "# Freebuff Agents`n"
  Write-Utf8NoBom -Path (Join-Path $fakeFreebuff 'CLAUDE.md') -Text "# Freebuff Claude`n"
  Write-Utf8NoBom -Path (Join-Path $fakeFreebuff 'GEMINI.md') -Text "# Freebuff Gemini`n"

  return @{
    FakeRepo = $fakeRepo
    FakeProfile = $fakeProfile
    FakeLocalApp = $fakeLocalApp
    FakeFreebuff = $fakeFreebuff
    StatusPath = $statusPath
  }
}

Describe 'ops/agents/check-agent-drift.ps1' {
  It 'exists at ops/agents/check-agent-drift.ps1' {
    (Test-Path -LiteralPath $driftScript) | Should Be $true
  }

  It 'reports green and writes UTF-8 no-BOM agent-drift.json when all rendered files match' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-DriftTestFixture -BaseDir $base

    & $renderScript -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -Apply | Out-Null

    $out = (& $driftScript -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -StatusJsonPath $fx.StatusPath | Out-String)
    $LASTEXITCODE | Should Be 0
    $out | Should Match 'light=green'
    $out | Should Match 'skippedPrivate=1'
    $out | Should Match '\[SKIP private-project\].*CLAUDE\.md'
    $out | Should Not Match 'hermes|ALIENWARE-SOUL\.md|profile\.yaml|profiles'

    $bytes = [System.IO.File]::ReadAllBytes($fx.StatusPath)
    ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) | Should Be $false
    $parsed = ([System.IO.File]::ReadAllText($fx.StatusPath)) | ConvertFrom-Json
    $parsed.node | Should Be 'alienware'
    $parsed.ok | Should Be $true
    $parsed.light | Should Be 'green'
    $parsed.driftedCount | Should Be 0
    @($parsed.driftedFiles).Count | Should Be 0
  }

  It 'detects single drifted item as JSON array (PS 5.1 ConvertTo-Json array check) and respects -SoftExit' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-DriftTestFixture -BaseDir $base

    & $renderScript -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -Apply | Out-Null

    $skillJsonPath = Join-Path $fx.FakeRepo '.agents\skills\demo\skill.json'
    Write-Utf8NoBom -Path $skillJsonPath -Text "{`n  `"house_rules`": `"docs/house/HOUSE-MOTION-RULE.md`",`n  `"name`": `"demo`"`n}`n"

    $out = (& $driftScript -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -StatusJsonPath $fx.StatusPath -SoftExit | Out-String)
    $LASTEXITCODE | Should Be 0
    $out | Should Match 'light=amber'
    $out | Should Match '\.agents/skills/demo/skill\.json'

    $rawJson = [System.IO.File]::ReadAllText($fx.StatusPath)
    $rawJson | Should Match '"driftedFiles"\s*:\s*\['
    $parsed = $rawJson | ConvertFrom-Json
    $parsed.ok | Should Be $false
    $parsed.light | Should Be 'amber'
    $parsed.driftedCount | Should Be 1
    @($parsed.driftedFiles).Count | Should Be 1
    @($parsed.driftedFiles)[0].file | Should Be '.agents/skills/demo/skill.json'
    @($parsed.driftedFiles)[0].reason | Should Be 'missing-block'
  }

  It 'classifies missing, missing-block, and drifted files, exits 1 without -SoftExit, and leaves private files untouched' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-DriftTestFixture -BaseDir $base

    & $renderScript -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -Apply | Out-Null

    $repoClaudeBefore = [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo 'CLAUDE.md'))
    $hermesPrivateBefore = [System.IO.File]::ReadAllText((Join-Path $fx.FakeLocalApp 'hermes\SOUL.md'))
    Remove-Item -LiteralPath (Join-Path $fx.FakeProfile '.codex\AGENTS.md') -Force
    Write-Utf8NoBom -Path (Join-Path $fx.FakeProfile '.claude\CLAUDE.md') -Text "# Claude bare`n"
    $agentsPath = Join-Path $fx.FakeRepo 'AGENTS.md'
    $staleAgents = ([System.IO.File]::ReadAllText($agentsPath)).Replace('192.168.0.40', '192.168.0.99')
    Write-Utf8NoBom -Path $agentsPath -Text $staleAgents

    $out = (& $driftScript -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -StatusJsonPath $fx.StatusPath | Out-String)
    $LASTEXITCODE | Should Be 1
    $out | Should Not Match ([regex]::Escape($fx.FakeProfile))
    $out | Should Not Match 'hermes|ALIENWARE-SOUL\.md|profile\.yaml|profiles'
    [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo 'CLAUDE.md')) | Should Be $repoClaudeBefore
    [System.IO.File]::ReadAllText((Join-Path $fx.FakeLocalApp 'hermes\SOUL.md')) | Should Be $hermesPrivateBefore

    $parsed = ([System.IO.File]::ReadAllText($fx.StatusPath)) | ConvertFrom-Json
    $parsed.ok | Should Be $false
    $parsed.light | Should Be 'amber'
    $parsed.driftedCount | Should Be 3
    ($parsed.driftedFiles | Where-Object { $_.file -eq '%USERPROFILE%\.codex\AGENTS.md' }).reason | Should Be 'missing'
    ($parsed.driftedFiles | Where-Object { $_.file -eq '%USERPROFILE%\.claude\CLAUDE.md' }).reason | Should Be 'missing-block'
    ($parsed.driftedFiles | Where-Object { $_.file -eq 'AGENTS.md' }).reason | Should Be 'drifted'
  }

  It 'supports -NoRun dot-sourcing and checks -Node t5500 -Scope node locally without ssh' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-DriftTestFixture -BaseDir $base
    Write-Utf8NoBom -Path (Join-Path $fx.FakeLocalApp 'hermes\profiles\t5500\SOUL.md') -Text "# T5500 Soul`n"

    . $driftScript -NoRun
    $report = Get-AgentDriftReport -Node t5500 -Scope node -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff
    $report.node | Should Be 't5500'
    $report.light | Should Be 'amber'
    (@($report.driftedFiles | Where-Object { $_.file -eq '%LOCALAPPDATA%\hermes\profiles\t5500\SOUL.md' }).Count) | Should Be 1
  }

  It 'never scans, skips, or flags %LOCALAPPDATA%\hermes for -Node alienware -Scope all while -Node t5500 -Scope node still flags %LOCALAPPDATA%\hermes\profiles\t5500\SOUL.md' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-DriftTestFixture -BaseDir $base
    $t5StatusPath = Join-Path $base 't5500-drift.json'

    & $renderScript -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -Apply | Out-Null

    $awOut = (& $driftScript -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -StatusJsonPath $fx.StatusPath | Out-String)
    $LASTEXITCODE | Should Be 0
    $awOut | Should Match 'light=green'
    $awOut | Should Match 'drifted=0'
    $awOut | Should Match 'skippedPrivate=1'
    $awOut | Should Match '\[SKIP private-project\].*CLAUDE\.md'
    $awOut | Should Not Match 'hermes|ALIENWARE-SOUL\.md|profile\.yaml|profiles'

    . $driftScript -NoRun
    $awReport = Get-AgentDriftReport -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff
    $awReport.driftedCount | Should Be 0
    @($awReport.skippedPrivateFiles | Where-Object { $_ -match 'hermes' }).Count | Should Be 0

    $t5Out = (& $driftScript -Node t5500 -Scope node -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -StatusJsonPath $t5StatusPath -SoftExit | Out-String)
    $LASTEXITCODE | Should Be 0
    $t5Out | Should Match 'light=amber'
    $t5Out | Should Match '%LOCALAPPDATA%\\hermes\\profiles\\t5500\\SOUL\.md'

    $t5Parsed = ([System.IO.File]::ReadAllText($t5StatusPath)) | ConvertFrom-Json
    $t5Parsed.node | Should Be 't5500'
    $t5Parsed.light | Should Be 'amber'
    (@($t5Parsed.driftedFiles | Where-Object { $_.file -eq '%LOCALAPPDATA%\hermes\profiles\t5500\SOUL.md' }).Count) | Should Be 1
  }
}
