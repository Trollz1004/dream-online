# Pester 3.4 tests for ops/agents/env-names-check.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$checkScript = Join-Path $here 'env-names-check.ps1'

function Write-Utf8NoBomTestFile {
  param([string]$Path, [string]$Text)
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

function New-EnvCheckFixture {
  param([string]$BaseDir)
  $fakeRepo = Join-Path $BaseDir 'repo'
  $fakeEnvRoot = Join-Path $BaseDir 'env-root'
  New-Item -ItemType Directory -Path $fakeRepo -Force | Out-Null
  New-Item -ItemType Directory -Path $fakeEnvRoot -Force | Out-Null

  $rootManifest = '{"service":"svc-root","node":"alienware","envFile":".env","required":["ROOT_TOK","GEMINI_KEY"],"alternatives":{"ROOT_TOK":["FLEET_SHARED_TOKEN"]}}'
  $subManifest = '{"service":"svc-sub","node":"t5500","envFile":".env","required":["SUB_KEY"]}'
  $sharedManifest = '{"service":"svc-shared","node":"all","envFile":"repo:shared.env","required":["SHARED_KEY"]}'

  Write-Utf8NoBomTestFile -Path (Join-Path $fakeRepo 'env.required.json') -Text $rootManifest
  Write-Utf8NoBomTestFile -Path (Join-Path $fakeRepo 'apps\sub\env.required.json') -Text $subManifest
  Write-Utf8NoBomTestFile -Path (Join-Path $fakeRepo 'ops\shared\env.required.json') -Text $sharedManifest

  # Ignored directories must be skipped
  foreach ($skip in @('node_modules', '.git', 'dist', 'archive', '.venv')) {
    Write-Utf8NoBomTestFile -Path (Join-Path $fakeRepo "$skip\ignored\env.required.json") -Text '{"service":"ignored-svc","node":"alienware","envFile":".env","required":["IGNORED_VAR"]}'
  }

  return @{
    FakeRepo = $fakeRepo
    FakeEnvRoot = $fakeEnvRoot
  }
}

Describe 'ops/agents/env-names-check.ps1' {
  It 'exists at ops/agents/env-names-check.ps1' {
    (Test-Path -LiteralPath $checkScript) | Should Be $true
  }

  It 'lists targets without reading .env files in -ListTargetsOnly mode and skips ignored dirs' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-EnvCheckFixture -BaseDir $base
    $canary = 'canary-' + ([guid]::NewGuid().ToString('N'))
    Write-Utf8NoBomTestFile -Path (Join-Path $fx.FakeRepo '.env') -Text "ROOT_TOK=$canary`nGEMINI_KEY=$canary`n"

    $out = (& $checkScript -RepoRoot $fx.FakeRepo -ListTargetsOnly | Out-String)
    $LASTEXITCODE | Should Be 0
    $out | Should Match 'svc-root'
    $out | Should Match 'svc-sub'
    $out | Should Match 'svc-shared'
    $out | Should Not Match 'ignored-svc'
    $out | Should Not Match ([regex]::Escape($canary))

    $jsonRaw = (& $checkScript -RepoRoot $fx.FakeRepo -ListTargetsOnly -Node alienware -Json | Out-String)
    $LASTEXITCODE | Should Be 0
    $jsonRaw | Should Not Match ([regex]::Escape($canary))
    $parsed = $jsonRaw | ConvertFrom-Json
    $parsed.ok | Should Be $true
    $parsed.listTargetsOnly | Should Be $true
    @($parsed.services).Count | Should Be 2
  }

  It 'checks -EnvRoot and repo: targets, handles alternatives and empty quotes, and never leaks values' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $fx = New-EnvCheckFixture -BaseDir $base
    $secretA = 'secA-' + ([guid]::NewGuid().ToString('N'))
    $secretB = 'secB-' + ([guid]::NewGuid().ToString('N'))
    $secretC = 'secC-' + ([guid]::NewGuid().ToString('N'))

    # Root satisfies ROOT_TOK via alternative FLEET_SHARED_TOKEN and GEMINI_KEY with inline comment
    Write-Utf8NoBomTestFile -Path (Join-Path $fx.FakeEnvRoot '.env') -Text "export FLEET_SHARED_TOKEN=""$secretA""`nGEMINI_KEY=$secretB # comment`n"
    # Sub has empty single-quoted value -> counts as missing
    Write-Utf8NoBomTestFile -Path (Join-Path $fx.FakeEnvRoot 'apps\sub\.env') -Text "SUB_KEY=''`n"
    # Shared resolves via repo:shared.env
    Write-Utf8NoBomTestFile -Path (Join-Path $fx.FakeRepo 'shared.env') -Text "SHARED_KEY='$secretC'`n"

    $out = (& $checkScript -RepoRoot $fx.FakeRepo -EnvRoot $fx.FakeEnvRoot | Out-String)
    $LASTEXITCODE | Should Be 1
    $out | Should Match '\[OK\].*svc-root'
    $out | Should Match '\[MISSING\].*svc-sub.*SUB_KEY'
    $out | Should Match '\[OK\].*svc-shared'
    $out | Should Not Match ([regex]::Escape($secretA))
    $out | Should Not Match ([regex]::Escape($secretB))
    $out | Should Not Match ([regex]::Escape($secretC))

    $softJson = (& $checkScript -RepoRoot $fx.FakeRepo -EnvRoot $fx.FakeEnvRoot -SoftExit -Json | Out-String)
    $LASTEXITCODE | Should Be 0
    $softJson | Should Not Match ([regex]::Escape($secretA))
    $softJson | Should Not Match ([regex]::Escape($secretB))
    $softJson | Should Not Match ([regex]::Escape($secretC))
    $parsed = $softJson | ConvertFrom-Json
    $parsed.ok | Should Be $false
    $parsed.missingCount | Should Be 1
    $subItem = $parsed.services | Where-Object { $_.service -eq 'svc-sub' }
    $subItem.status | Should Be 'MISSING'
    @($subItem.missingEnv) -contains 'SUB_KEY' | Should Be $true
  }

  It 'reports FILE-MISSING and preserves single-element JSON arrays under PowerShell 5.1' {
    $base = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
    $singleRepo = Join-Path $base 'single-repo'
    New-Item -ItemType Directory -Path $singleRepo -Force | Out-Null
    Write-Utf8NoBomTestFile -Path (Join-Path $singleRepo 'env.required.json') -Text '{"service":"solo-svc","node":"alienware","envFile":".env","required":["SOLO_KEY"]}'

    $out = (& $checkScript -RepoRoot $singleRepo | Out-String)
    $LASTEXITCODE | Should Be 1
    $out | Should Match '\[FILE-MISSING\].*solo-svc'
    $out | Should Match 'SOLO_KEY'

    $jsonRaw = (& $checkScript -RepoRoot $singleRepo -SoftExit -Json | Out-String)
    $LASTEXITCODE | Should Be 0
    $jsonRaw | Should Match '"services"\s*:\s*\['
    $jsonRaw | Should Match '"missingEnv"\s*:\s*\['
    $parsed = $jsonRaw | ConvertFrom-Json
    @($parsed.services).Count | Should Be 1
    @($parsed.services)[0].status | Should Be 'FILE-MISSING'
    @(@($parsed.services)[0].missingEnv)[0] | Should Be 'SOLO_KEY'
  }
}
