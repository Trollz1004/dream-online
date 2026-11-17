# Pester 3.4 tests for ops/agents/render-agent-files.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $here '..\..')).Path
$scriptPath = Join-Path $here 'render-agent-files.ps1'

function Write-Utf8NoBom {
  param([string]$Path, [string]$Text)
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

function New-FakeTestFixture {
  param([string]$BaseDir)
  $fakeRepo = Join-Path $BaseDir 'sample-dream-repo'
  $fakeProfile = Join-Path $BaseDir 'UserProfile'
  $fakeLocalApp = Join-Path $fakeProfile 'AppData\Local'
  $fakeFreebuff = Join-Path $BaseDir 'freebuff-leadgen'

  New-Item -ItemType Directory -Path $fakeRepo -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeProfile '.gemini\config') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeProfile '.codex') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeProfile '.claude') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeProfile '.openclaw\workspace') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fakeLocalApp 'hermes\profiles\t5500') -Force | Out-Null
  New-Item -ItemType Directory -Path $fakeFreebuff -Force | Out-Null

  $hrBullet = '- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.'
  $cbBullet = '- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).'

  Write-Utf8NoBom -Path (Join-Path $fakeRepo 'AGENTS.md') -Text ("# AGENTS`n`nExisting body line.`n$hrBullet`n$cbBullet`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\demo\SKILL.md') -Text ("---`nname: demo`n---`nBody.`n$hrBullet`n$cbBullet`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\demo\skill.json') -Text ("{`n  `"house_rules`": `"docs/house/HOUSE-MOTION-RULE.md, docs/house/THE-HOUSE.md and docs/house/PAYMENT-ACCOUNTS-RULE.md`",`n  `"current_beats_existing`": `"Current beats existing: fetch and pull main first`",`n  `"name`": `"demo`"`n}`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\demo\agents\gemini.toml') -Text ("name = `"demo`"`nmodel = `"gemini-4-carbon-high`"`nhouse_rules = `"docs/house/HOUSE-MOTION-RULE.md`"`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\demo\agents\openai.yaml') -Text ("name: demo`nmodel: gpt-6-astra`nhouse_rules: `"docs/house/HOUSE-MOTION-RULE.md`"`n")

  # Vendored and excluded files must never be touched
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\hallmark\SKILL.md') -Text "# Vendored Hallmark`n"
  Write-Utf8NoBom -Path (Join-Path $fakeRepo '.agents\skills\hallmark\HOUSE-NOTE.md') -Text ("Note.`n$hrBullet`n$cbBullet`n")
  Write-Utf8NoBom -Path (Join-Path $fakeRepo 'docs\house\SPINE.md') -Text "# House Spine`n"
  Write-Utf8NoBom -Path (Join-Path $fakeRepo 'wrangler.toml') -Text "name = `"worker`"`n"
  Write-Utf8NoBom -Path (Join-Path $fakeRepo 'pyproject.toml') -Text "[project]`nname = `"py`"`n"
  Write-Utf8NoBom -Path (Join-Path $fakeRepo 'Cargo.toml') -Text "[package]`nname = `"rs`"`n"

  # Node files with synthetic fake secret and private-project marker
  $fakeSk = 'sk-' + 'test99887766554433221100aabb'
  $fakeGoogle = 'AIza' + 'SyD9a8b7c6d5e4f3g2h1i0j9k8l7m6'
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.gemini\settings.json') -Text ("{`n  `"trustedWorkspaces`": [`"demo`"],`n  `"apiSecret`": `"$fakeSk`"`n}`n")
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.gemini\config\mcp_config.json') -Text ("{`n  `"mcpServers`": {`n    `"rea`": {`n      `"command`": `"cmd.exe`",`n      `"env`": { `"KEY`": `"$fakeGoogle`" }`n    }`n  }`n}`n")
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.codex\config.toml') -Text ("# Existing comment`nmodel = `"gpt-6-astra`"`n`n[mcp_servers.kit]`ncommand = `"cmd.exe`"`n")
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.claude\settings.json') -Text ("{`n  `"model`": `"opus`"`n}`n")
  Write-Utf8NoBom -Path (Join-Path $fakeProfile '.openclaw\openclaw.json') -Text ("{`n  `"gateway`": { `"port`": 18789 }`n}`n")

  # Private-project files that MUST be skipped
  Write-Utf8NoBom -Path (Join-Path $fakeLocalApp 'hermes\SOUL.md') -Text "Workspace at D:\mira — Legal NSFW only.`n"
  Write-Utf8NoBom -Path (Join-Path $fakeLocalApp 'hermes\profile.yaml') -Text "project: mira`n"
  Write-Utf8NoBom -Path (Join-Path $fakeLocalApp 'hermes\ALIENWARE-SOUL.md') -Text "# Hermes Alienware Soul`n"
  Write-Utf8NoBom -Path (Join-Path $fakeRepo 'nsfw-helper\SOUL.md') -Text "# Private path skip`n"

  return @{
    FakeRepo = $fakeRepo
    FakeProfile = $fakeProfile
    FakeLocalApp = $fakeLocalApp
    FakeFreebuff = $fakeFreebuff
    FakeSk = $fakeSk
    FakeGoogle = $fakeGoogle
  }
}

Describe 'ops/agents/render-agent-files.ps1' {
  It 'exists at ops/agents/render-agent-files.ps1' {
    (Test-Path -LiteralPath $scriptPath) | Should Be $true
  }

  It 'dry-run prints [DRY RUN], mutates zero bytes, and redacts secrets & user folder paths' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-FakeTestFixture -BaseDir $base
    $agentsBefore = [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo 'AGENTS.md'))
    $settingsBefore = [System.IO.File]::ReadAllText((Join-Path $fx.FakeProfile '.gemini\settings.json'))

    $out = (& $scriptPath -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff | Out-String)

    $out | Should Match '\[DRY RUN\]'
    $out | Should Not Match ([regex]::Escape($fx.FakeSk))
    $out | Should Not Match ([regex]::Escape($fx.FakeGoogle))
    $out | Should Not Match ([regex]::Escape($fx.FakeProfile))
    [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo 'AGENTS.md')) | Should Be $agentsBefore
    [System.IO.File]::ReadAllText((Join-Path $fx.FakeProfile '.gemini\settings.json')) | Should Be $settingsBefore
    @(Get-ChildItem -Path $fx.FakeRepo -Recurse -Filter '*.bak-*').Count | Should Be 0
  }

  It '-Apply renders MD, JSON, TOML, YAML cleanly, creates .bak-* backups, preserves outer text, and is idempotent' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-FakeTestFixture -BaseDir $base

    & $scriptPath -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -Apply | Out-Null

    # Backups created on initial write
    (Get-ChildItem -Path $fx.FakeRepo -Filter 'AGENTS.md.bak-*').Count | Should Be 1
    (Get-ChildItem -Path (Join-Path $fx.FakeProfile '.gemini') -Filter 'settings.json.bak-*').Count | Should Be 1

    # Markdown invariants & outer text preserved
    $agentsText = [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo 'AGENTS.md'))
    $agentsText | Should Match 'Existing body line\.'
    $agentsText | Should Match '(?m)^- House rules:'
    $agentsText | Should Match '(?m)^- Current beats existing:'
    $agentsText | Should Match '<!-- TROLLZ1004-SPINE:START -->'
    $agentsText | Should Match '<!-- TROLLZ1004-SPINE:END -->'
    $agentsText | Should Match '192\.168\.0\.40'
    $agentsText | Should Match '192\.168\.0\.15'

    # JSON validity & byte-preserved outer keys + mcpServers.kit timeoutSeconds=120
    $settingsText = [System.IO.File]::ReadAllText((Join-Path $fx.FakeProfile '.gemini\settings.json'))
    $settingsJson = $settingsText | ConvertFrom-Json
    $settingsJson.apiSecret | Should Be $fx.FakeSk
    $settingsJson._trollz1004_spine_start | Should Be 'managed-by-render-agent-files'
    $settingsJson.trollz1004_spine.node | Should Be 'Alienware'
    $settingsJson._trollz1004_spine_end | Should Be 'managed-by-render-agent-files'

    $mcpText = [System.IO.File]::ReadAllText((Join-Path $fx.FakeProfile '.gemini\config\mcp_config.json'))
    $mcpJson = $mcpText | ConvertFrom-Json
    $mcpJson.mcpServers.rea.env.KEY | Should Be $fx.FakeGoogle
    $mcpJson.mcpServers.kit.command | Should Be 'cmd.exe'
    $mcpJson.mcpServers.kit.timeoutSeconds | Should Be 120

    # TOML (.codex/config.toml must NOT duplicate [mcp_servers.kit] when already outside markers)
    $codexToml = [System.IO.File]::ReadAllText((Join-Path $fx.FakeProfile '.codex\config.toml'))
    $codexToml | Should Match '# --- TROLLZ1004-SPINE:START ---'
    $codexToml | Should Match '\[trollz1004_spine\]'
    ([regex]::Matches($codexToml, '(?m)^\s*\[mcp_servers\.kit\]')).Count | Should Be 1

    # YAML preserves existing keys
    $yamlText = [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo '.agents\skills\demo\agents\openai.yaml'))
    $yamlText | Should Match 'model: gpt-6-astra'
    $yamlText | Should Match 'trollz1004_spine:'

    # Excluded / vendored files untouched
    [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo '.agents\skills\hallmark\SKILL.md')) | Should Be "# Vendored Hallmark`n"
    [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo '.agents\skills\hallmark\HOUSE-NOTE.md')) | Should Match 'TROLLZ1004-SPINE:START'
    [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo 'wrangler.toml')) | Should Be "name = `"worker`"`n"
    [System.IO.File]::ReadAllText((Join-Path $fx.FakeRepo 'docs\house\SPINE.md')) | Should Be "# House Spine`n"

    # Idempotency: second run creates zero extra backups and zero diffs
    $beforeBakCount = @(Get-ChildItem -Path $fx.FakeRepo -Recurse -Filter '*.bak-*').Count
    $secondDry = (& $scriptPath -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff | Out-String)
    $secondDry | Should Not Match '\[DRY RUN\] Would (update|create)'

    & $scriptPath -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -Apply | Out-Null
    $afterBakCount = @(Get-ChildItem -Path $fx.FakeRepo -Recurse -Filter '*.bak-*').Count
    $afterBakCount | Should Be $beforeBakCount
  }

  It 'skips private-project files (Mira, D:\mira, nsfw, grin) even with -Apply' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-FakeTestFixture -BaseDir $base
    $soulBefore = [System.IO.File]::ReadAllText((Join-Path $fx.FakeLocalApp 'hermes\SOUL.md'))

    $out = (& $scriptPath -Node alienware -Scope all -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff -Apply | Out-String)

    $out | Should Match '\[SKIP private-project\].*hermes\\SOUL\.md'
    $out | Should Match '\[SKIP private-project\].*hermes\\profile\.yaml'
    $out | Should Match '\[SKIP private-project\].*nsfw-helper\\SOUL\.md'
    [System.IO.File]::ReadAllText((Join-Path $fx.FakeLocalApp 'hermes\SOUL.md')) | Should Be $soulBefore
  }

  It '-Node t5500 -Scope node dry-run prints ssh t5500 command and T5500 target list without invoking ssh' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-FakeTestFixture -BaseDir $base

    $out = (& $scriptPath -Node t5500 -Scope node -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff | Out-String)

    $out | Should Match '\[DRY RUN\] Would run over ssh t5500:'
    $out | Should Match 'T5500 \(192\.168\.0\.15\)'
    $out | Should Match '%LOCALAPPDATA%\\hermes\\profiles\\t5500\\SOUL\.md'
    $out | Should Match '%USERPROFILE%\\\.gemini\\config\\mcp_config\.json'
  }

  It '-Node t5500 -Scope node -RemoteExecuted -Apply updates stale markers in-place and skips private SOUL' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-FakeTestFixture -BaseDir $base
    $t5SoulPath = Join-Path $fx.FakeLocalApp 'hermes\profiles\t5500\SOUL.md'
    Write-Utf8NoBom -Path $t5SoulPath -Text ("# T5500 Soul`n`n<!-- TROLLZ1004-SPINE:START -->`nOLD STALE LINE`n<!-- TROLLZ1004-SPINE:END -->`nFooter line.`n")

    $out = (& $scriptPath -Node t5500 -Scope node -RemoteExecuted -Apply -RepoRoot $fx.FakeRepo -SpineSourceRepo $repoRoot -UserProfileRoot $fx.FakeProfile -LocalAppDataRoot $fx.FakeLocalApp -FreebuffRoot $fx.FakeFreebuff | Out-String)

    $out | Should Match '\[SKIP private-project\].*hermes\\SOUL\.md'
    $updated = [System.IO.File]::ReadAllText($t5SoulPath)
    $updated | Should Match '# T5500 Soul'
    $updated | Should Match 'Footer line\.'
    $updated | Should Not Match 'OLD STALE LINE'
    $updated | Should Match 'T5500 \(192\.168\.0\.15\)'
  }
}
