param(
  [Parameter(Mandatory)][string]$Order,
  [Parameter(Mandatory)][string]$Name,
  [ValidateSet('sonnet','opus')][string]$Model = 'sonnet',
  [ValidateSet('scout','worker')][string]$Mode = 'scout',
  # The node env file is this repository's root .env (REPO_ROOT/.env), the same file ops/node/backup-node.mjs reads.
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\..\.env')
)
$ErrorActionPreference = 'Continue'
$k = Join-Path $env:USERPROFILE 'antigravity\.fable-kitchen'
$build = Join-Path $env:USERPROFILE 'antigravity\build'
New-Item -ItemType Directory -Force -Path (Join-Path $k 'orders') | Out-Null
New-Item -ItemType Directory -Force -Path $build | Out-Null
Set-Location -LiteralPath $build
$log = Join-Path $k ("orders\{0}-{1}.log" -f $Name, (Get-Date -Format 'yyyyMMdd-HHmm'))
("{0} start {1} model {2} mode {3}" -f (Get-Date -Format o), $Name, $Model, $Mode) | Out-File -LiteralPath $log -Encoding utf8

# Load ONLY the CLAUDE_CONSOLE_KEY line from the env file, into the child's environment. Never printed.
$consoleValue = $null
if (Test-Path -LiteralPath $EnvFile -PathType Leaf) {
  foreach ($line in [System.IO.File]::ReadLines((Resolve-Path -LiteralPath $EnvFile).Path)) {
    if ($line -match '^\s*(?:export\s+)?CLAUDE_CONSOLE_KEY\s*=\s*(.*?)\s*$') {
      $consoleValue = $Matches[1].Trim('"', "'")
      $Matches = $null
      break
    }
  }
}
if ([string]::IsNullOrEmpty($consoleValue)) {
  ("{0} note {1} CLAUDE_CONSOLE_KEY not found in the env file" -f (Get-Date -Format o), $Name) | Out-File -LiteralPath $log -Append -Encoding utf8
}

$py = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $py)) { $py = 'python' }
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $py
# Quote each argument (works on Windows PowerShell 5.1 and PowerShell 7).
$psi.Arguments = (@((Join-Path $PSScriptRoot 'assistant.py'), '--order', $Order, '--name', $Name, '--model', $Model, '--mode', $Mode) | ForEach-Object { '"' + ($_ -replace '"', '\"') + '"' }) -join ' '
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.WorkingDirectory = $build
# Child process only: this never touches the User or Machine environment.
$psi.EnvironmentVariables['GH_CONFIG_DIR'] = (Join-Path $k 'gh-runner')
$psi.EnvironmentVariables['PYTHONIOENCODING'] = 'utf-8'
if ($psi.EnvironmentVariables.ContainsKey('ANTHROPIC_API_KEY')) { $psi.EnvironmentVariables.Remove('ANTHROPIC_API_KEY') }
if ($consoleValue) { $psi.EnvironmentVariables['CLAUDE_CONSOLE_KEY'] = $consoleValue }
$consoleValue = $null

$p = [System.Diagnostics.Process]::Start($psi)
$outTask = $p.StandardOutput.ReadToEndAsync()
$errTask = $p.StandardError.ReadToEndAsync()
$p.WaitForExit()
$code = $p.ExitCode
$outTask.Result + $errTask.Result | Out-File -LiteralPath $log -Append -Encoding utf8
("{0} exit {1} code {2}" -f (Get-Date -Format o), $Name, $code) | Out-File -LiteralPath $log -Append -Encoding utf8
exit $code
