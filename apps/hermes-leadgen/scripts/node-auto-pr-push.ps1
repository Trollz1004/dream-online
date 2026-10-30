param(
  [string]$Agent = "gemini",
  [string]$Profile = "default",
  [string]$Message = "feat(sabretooth): add apps/hermes-leadgen Command Studio for Cloud Judge review",
  [string]$Branch = "sabretooth/hermes-leadgen",
  [string]$BaseBranch = "main",
  [string]$Repo = "Trollz1004/ANTIGRAVITY"
)

$ErrorActionPreference = "Continue"
$env:GIT_TERMINAL_PROMPT = "0"
$env:GCM_INTERACTIVE = "never"

$VaultRepo = "C:\Ai-Dream-Team\Antigravity"
$SourceDir = "C:\Ai-Dream-Team\Antigravity\HermesLeadGen"
$WorktreeRoot = "C:\Ai-Dream-Team\_pr-worktree"
$TargetAppDir = Join-Path $WorktreeRoot "apps\hermes-leadgen"
$GhExe = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $GhExe)) { $GhExe = "gh" }

# Explicit HermesLeadGen file list (excludes graphify-out/graph.json, GRAPH_REPORT.md, and youtube-shorts-podcast-engine/*)
$explicitFiles = @(
  ".gitignore",
  ".specify/extensions.yml",
  "README.md",
  "SABRETOOTH-GEMINI-EASY-BUTTON.bat",
  "index.html",
  "launch.bat",
  "main.js",
  "package-lock.json",
  "package.json",
  "preload.js",
  "renderer.js",
  "scripts/node-auto-pr-push.ps1",
  "server.js",
  "skills.json",
  "souls/default-orchestrator-agent.md",
  "souls/editor-agent.md",
  "souls/fcc-agent.md",
  "souls/harvey-agent.md",
  "souls/kanban-agent.md",
  "souls/notes-agent.md",
  "souls/youtube-agent.md",
  "styles.css",
  "test/hermes-leadgen.test.js"
)

# 1. Ensure Worktree Exists Outside Vault Root and Tracks origin/main
if (Test-Path $VaultRepo) {
  Set-Location $VaultRepo
  $fetchOut = & git fetch origin 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    $fail = @{
      ok = $false
      timestamp = (Get-Date).ToString("o")
      node = "Sabretooth"
      branch = $Branch
      pushSuccess = $false
      prNumber = $null
      prUrl = $null
      prStatus = "FAILED_GIT_FETCH"
      error = $fetchOut.Trim()
    }
    $fail | ConvertTo-Json -Compress
    exit 1
  }
}

if (-not (Test-Path $WorktreeRoot)) {
  Set-Location $VaultRepo
  & git worktree add $WorktreeRoot -B $Branch "origin/$BaseBranch" 2>&1 | Out-Null
}

if (-not (Test-Path $WorktreeRoot)) {
  $fail = @{
    ok = $false
    timestamp = (Get-Date).ToString("o")
    node = "Sabretooth"
    branch = $Branch
    pushSuccess = $false
    prNumber = $null
    prUrl = $null
    prStatus = "FAILED_WORKTREE_MISSING"
    error = "Worktree $WorktreeRoot could not be initialized"
  }
  $fail | ConvertTo-Json -Compress
  exit 1
}

# 2. Copy Explicit HermesLeadGen Files into Worktree under apps/hermes-leadgen/
if (Test-Path $SourceDir) {
  foreach ($rel in $explicitFiles) {
    $srcFile = Join-Path $SourceDir ($rel -replace '/', '\')
    $dstFile = Join-Path $TargetAppDir ($rel -replace '/', '\')
    if (Test-Path $srcFile) {
      $dstParent = Split-Path -Parent $dstFile
      if (-not (Test-Path $dstParent)) {
        New-Item -ItemType Directory -Path $dstParent -Force | Out-Null
      }
      Copy-Item -Path $srcFile -Destination $dstFile -Force
    }
  }
}

Set-Location $WorktreeRoot

# 3. Run Mandatory TDD Tests + Doctrine Check Before Staging/Committing
$testOut = & node --test "$TargetAppDir\test\hermes-leadgen.test.js" 2>&1 | Out-String
$testsPassed = ($LASTEXITCODE -eq 0)
if (-not $testsPassed) {
  $fail = @{
    ok = $false
    timestamp = (Get-Date).ToString("o")
    node = "Sabretooth"
    branch = $Branch
    testsPassed = $false
    pushSuccess = $false
    prNumber = $null
    prUrl = $null
    prStatus = "FAILED_TDD_TESTS"
    error = "TDD test suite failed in $TargetAppDir"
  }
  $fail | ConvertTo-Json -Compress
  exit 1
}

$doctrineOut = & python "scripts/doctrine/doctrine-check.py" 2>&1 | Out-String
$doctrinePassed = ($LASTEXITCODE -eq 0)
if (-not $doctrinePassed) {
  $fail = @{
    ok = $false
    timestamp = (Get-Date).ToString("o")
    node = "Sabretooth"
    branch = $Branch
    testsPassed = $true
    doctrinePassed = $false
    pushSuccess = $false
    prNumber = $null
    prUrl = $null
    prStatus = "FAILED_DOCTRINE_CHECK"
    error = $doctrineOut.Trim()
  }
  $fail | ConvertTo-Json -Compress
  exit 1
}

# 4. Stage ONLY Explicit apps/hermes-leadgen/ Paths by Name
foreach ($rel in $explicitFiles) {
  $wtPath = "apps/hermes-leadgen/$rel"
  if (Test-Path (Join-Path $WorktreeRoot ($wtPath -replace '/', '\'))) {
    & git add -- "$wtPath" 2>&1 | Out-Null
  }
}

# Ensure no .env file is ever staged
& git reset HEAD -- "*.env*" "**/.env*" 2>&1 | Out-Null

# 5. Re-run Doctrine Check on Tracked Index and Commit if Diff Exists
$doctrineStagedOut = & python "scripts/doctrine/doctrine-check.py" 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
  $fail = @{
    ok = $false
    timestamp = (Get-Date).ToString("o")
    node = "Sabretooth"
    branch = $Branch
    pushSuccess = $false
    prNumber = $null
    prUrl = $null
    prStatus = "FAILED_DOCTRINE_CHECK"
    error = $doctrineStagedOut.Trim()
  }
  $fail | ConvertTo-Json -Compress
  exit 1
}

$staged = (& git diff --cached --name-only 2>&1 | Out-String).Trim()
$commitCreated = $false
if ($staged) {
  $commitOut = & git commit -m "$Message" 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    $fail = @{
      ok = $false
      timestamp = (Get-Date).ToString("o")
      node = "Sabretooth"
      branch = $Branch
      pushSuccess = $false
      prNumber = $null
      prUrl = $null
      prStatus = "FAILED_GIT_COMMIT"
      error = $commitOut.Trim()
    }
    $fail | ConvertTo-Json -Compress
    exit 1
  }
  $commitCreated = $true
}

$headSha = (& git rev-parse --short HEAD 2>&1 | Out-String).Trim()

# 6. Push Branch to GitHub Remote (origin) and Verify Exit Code
$pushOut = & git push -u origin "HEAD:refs/heads/$Branch" 2>&1 | Out-String
$pushSuccess = ($LASTEXITCODE -eq 0)
if (-not $pushSuccess) {
  $fail = @{
    ok = $false
    timestamp = (Get-Date).ToString("o")
    node = "Sabretooth"
    agent = $Agent
    profile = $Profile
    repo = $Repo
    branch = $Branch
    baseBranch = $BaseBranch
    commitSha = $headSha
    commitCreated = $commitCreated
    testsPassed = $testsPassed
    pushSuccess = $false
    prNumber = $null
    prUrl = $null
    prStatus = "FAILED_GIT_PUSH"
    error = $pushOut.Trim()
  }
  $fail | ConvertTo-Json -Compress
  exit 1
}

# 7. Open or Query Real PR via gh CLI and Log Real PR Number
$prNumber = $null
$prUrl = $null
$prStatus = "FAILED_PR_LOOKUP"
$prError = $null

$existingJson = (& $GhExe pr list --repo $Repo --head $Branch --base $BaseBranch --state open --json number,url 2>$null | Out-String).Trim()
if ($LASTEXITCODE -eq 0 -and $existingJson.StartsWith("[")) {
  try {
    $prList = $existingJson | ConvertFrom-Json
    if ($prList -and $prList.Count -gt 0) {
      $prNumber = $prList[0].number
      $prUrl = $prList[0].url
      $prStatus = "PR_#$($prNumber)_UPDATED"
    }
  } catch {}
}

if (-not $prNumber) {
  $prTitle = "feat(sabretooth): add apps/hermes-leadgen Command Studio ($headSha)"
  $prBody = @(
    "## Sabretooth Automated Agent PR -> Cloud Judges Gate",
    "",
    "- **Worktree Branch**: $Branch -> $BaseBranch",
    "- **Scoped Path**: apps/hermes-leadgen/ only (fenced outside Obsidian vault)",
    "- **Commit SHA**: $headSha",
    "- **Local TDD (node --test)**: PASSED",
    "- **Doctrine & Secret Scan (scripts/doctrine/doctrine-check.py)**: PASSED",
    "- **Judge Review Required**: Awaiting review from Claude, Codex, Gemini, or Jules before merge."
  ) -join "`n"
  $createOut = (& $GhExe pr create --repo $Repo --base $BaseBranch --head $Branch --title "$prTitle" --body "$prBody" 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -eq 0) {
    $viewJson = (& $GhExe pr list --repo $Repo --head $Branch --base $BaseBranch --state open --json number,url 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -eq 0 -and $viewJson.StartsWith("[")) {
      $prList = $viewJson | ConvertFrom-Json
      if ($prList -and $prList.Count -gt 0) {
        $prNumber = $prList[0].number
        $prUrl = $prList[0].url
        $prStatus = "PR_#$($prNumber)_CREATED"
      }
    }
  } else {
    $prError = $createOut
    $prStatus = "FAILED_GH_PR_CREATE"
  }
}

$overallOk = [bool]($pushSuccess -and $prNumber)
$result = @{
  ok = $overallOk
  timestamp = (Get-Date).ToString("o")
  node = "Sabretooth"
  agent = $Agent
  profile = $Profile
  repo = $Repo
  branch = $Branch
  baseBranch = $BaseBranch
  commitSha = $headSha
  commitCreated = $commitCreated
  testsPassed = $testsPassed
  pushSuccess = $pushSuccess
  prNumber = $prNumber
  prUrl = $prUrl
  prStatus = $prStatus
  error = $prError
  judges = @("Gemini (GitHub Judge)", "Jules (GitHub Judge)", "Claude (GitHub Judge)", "Codex (GitHub Judge)")
}

$result | ConvertTo-Json -Compress
if (-not $overallOk) { exit 1 }
