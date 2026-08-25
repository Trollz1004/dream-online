# health-check.ps1 — Claude Code adapter availability check
# Returns exit 0 + JSON if the real CLI is present; exit 1 if not.
#
# There is no proxy to probe. A reachable local port in front of Claude is the
# FCC pattern and FCC is permanently banned, so this checks the CLI itself and
# then verifies nothing is redirecting it.

param([switch]$Json)

$result = [ordered]@{
  adapter    = 'claude'
  claude_cli = $false
  version    = $null
  clean_env  = $false
  healthy    = $false
  message    = ''
}

# 1. the real CLI is on PATH
$cli = Get-Command claude -ErrorAction SilentlyContinue
if (-not $cli) {
  $result.message = "'claude' not found in PATH"
  if ($Json) { $result | ConvertTo-Json -Compress } else { Write-Host "FAIL: 'claude' not in PATH" }
  exit 1
}
$result.claude_cli = $true
try { $result.version = (& claude --version 2>&1 | Select-Object -First 1) } catch {}

# 2. nothing is intercepting it
$redirects = @()
if ($env:ANTHROPIC_BASE_URL)  { $redirects += 'ANTHROPIC_BASE_URL' }
if ($env:ANTHROPIC_AUTH_TOKEN) { $redirects += 'ANTHROPIC_AUTH_TOKEN' }
if ($env:CLAUDE_CONFIG_DIR -and $env:CLAUDE_CONFIG_DIR -notmatch '\.claude$') { $redirects += 'CLAUDE_CONFIG_DIR' }

if ($redirects.Count -gt 0) {
  $result.message = "Claude is being redirected by: $($redirects -join ', '). Unset them - this is the FCC pattern and FCC is banned."
  if ($Json) { $result | ConvertTo-Json -Compress } else { Write-Host "FAIL: $($result.message)" }
  exit 1
}
$result.clean_env = $true

$result.healthy = $true
$result.message = 'Claude adapter ready (real CLI, no redirect)'
if ($Json) { $result | ConvertTo-Json -Compress }
else { Write-Host "PASS: Claude adapter healthy ($($result.version)), no base-URL or config-dir redirect" }
exit 0
