# run-with-env-payload.ps1 — FCC adapter launcher (hardened 2026-07-02, Fable)
# Fixes baked in from live debugging:
#  - argv 32K limit: prompt via PAPERCLIP_PROMPT_FILE / PAPERCLIP_PROMPT / stdin (TRO-41)
#  - free-provider context limits: output capped 8192, global MCP servers stripped
#    (--strict-mcp-config) so tool schemas don't add ~78K tokens per request
# Paperclip run command:
#   pwsh -NoProfile -File C:\antigravity\adapters\claude\run-with-env-payload.ps1

$ErrorActionPreference = "Stop"

# Fail fast if the proxy is down.
try {
  $health = Invoke-WebRequest -Uri "http://127.0.0.1:8082/health" -UseBasicParsing -TimeoutSec 5
  if ($health.StatusCode -ne 200) { throw "proxy returned $($health.StatusCode)" }
} catch {
  Write-Error "[fcc-adapter] fcc-server not reachable at 127.0.0.1:8082 — start it first (fcc-server). $_"
  exit 12
}

# Keep requests small enough for free providers (Groq 32K out-cap, OpenRouter 64K ctx).
$env:CLAUDE_CODE_MAX_OUTPUT_TOKENS = "8192"

# LANE ISOLATION (Joshua doctrine 2026-07-02): claude/fcc-claude/ollama-claude must
# NEVER share config state — claude loads .claude.json + CLAUDE.md every run, and the
# last lane logged in absorbs everyone's auth. FCC gets its own config universe.
# Tell: "Pro plan" banner = real Max login leaked in; "API usage" = correct for FCC.
$env:CLAUDE_CONFIG_DIR = "C:\Users\joshl\.claude-fcc"

# Resolve prompt source
$prompt = $null
if ($env:PAPERCLIP_PROMPT_FILE -and (Test-Path $env:PAPERCLIP_PROMPT_FILE)) {
  $prompt = Get-Content -Path $env:PAPERCLIP_PROMPT_FILE -Raw -Encoding UTF8
} elseif ($env:PAPERCLIP_PROMPT) {
  $prompt = $env:PAPERCLIP_PROMPT
}

if ($null -ne $prompt -and $prompt.Trim().Length -gt 0) {
  $prompt | fcc-claude -p --output-format text --strict-mcp-config @args
  exit $LASTEXITCODE
} else {
  fcc-claude --strict-mcp-config @args
  exit $LASTEXITCODE
}

