# health-check.ps1 — FCC adapter availability check
# Returns exit 0 + JSON if FCC proxy is reachable; exit 1 if not.
# Used by: check-adapter-health.ps1, Paperclip agent wake, adapter registry.

param(
  [switch]$Json,
  [int]$TimeoutSec = 5
)

$result = @{
  adapter    = 'claude'
  type       = 'claude_local'
  proxy      = 'http://127.0.0.1:8082'
  status     = 'unknown'
  fcc_cli    = $false
  proxy_up   = $false
  config_dir = $false
  message    = ''
}

# 1. Check fcc-claude CLI exists
$fcc = Get-Command fcc-claude -ErrorAction SilentlyContinue
if ($fcc) {
  $result.fcc_cli = $true
} else {
  $result.message = 'fcc-claude not found in PATH'
  $result.status = 'unavailable'
  if ($Json) { $result | ConvertTo-Json -Compress | Write-Output }
  else { Write-Host "FAIL: fcc-claude not in PATH" }
  exit 1
}

# 2. Check FCC proxy health endpoint
try {
  $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8082/health" -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
  if ($resp.StatusCode -eq 200) {
    $result.proxy_up = $true
  }
} catch {
  $result.message = "FCC proxy unreachable at 127.0.0.1:8082 — start fcc-server"
  $result.status = 'unavailable'
  if ($Json) { $result | ConvertTo-Json -Compress | Write-Output }
  else { Write-Host "FAIL: FCC proxy not responding at :8082" }
  exit 1
}

# 3. Check isolated config dir exists
$configDir = 'C:\Users\joshl\.claude-fcc'
if (Test-Path $configDir) {
  $result.config_dir = $true
} else {
  $result.message = "Config dir $configDir missing — lane isolation broken"
  $result.status = 'degraded'
  if ($Json) { $result | ConvertTo-Json -Compress | Write-Output }
  else { Write-Host "WARN: config dir missing at $configDir (will be created on first run)" }
  exit 0
}

$result.status = 'healthy'
$result.message = 'FCC adapter ready (cli + proxy + config dir)'

if ($Json) {
  $result | ConvertTo-Json -Compress | Write-Output
} else {
  Write-Host "PASS: FCC adapter healthy (proxy up, cli present, config isolated)"
}
exit 0

