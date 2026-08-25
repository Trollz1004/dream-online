# run-with-env-payload.ps1 — Claude Code adapter launcher
#
# Paperclip run command:
#   pwsh -NoProfile -File <DREAM_ROOT>\adapters\claude\run-with-env-payload.ps1
#
# Fixes kept from live debugging:
#  - argv 32K limit: prompt arrives via PAPERCLIP_PROMPT_FILE / PAPERCLIP_PROMPT
#  - --strict-mcp-config so global MCP servers do not add ~78K tokens of tool
#    schema to every request
#
# This launcher deliberately sets no ANTHROPIC_BASE_URL, no ANTHROPIC_AUTH_TOKEN,
# and no CLAUDE_CONFIG_DIR. It runs the real signed-in CLI against its default
# config dir. Pointing the base URL at a local port is exactly how the banned FCC
# lane worked; if you find that here again, remove it.

$ErrorActionPreference = "Stop"

$claude = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claude) {
  Write-Error "[claude-adapter] 'claude' not found in PATH. Install Claude Code and sign in."
  exit 12
}

$env:CLAUDE_CODE_MAX_OUTPUT_TOKENS = "8192"

# Resolve prompt source
$prompt = $null
if ($env:PAPERCLIP_PROMPT_FILE -and (Test-Path $env:PAPERCLIP_PROMPT_FILE)) {
  $prompt = Get-Content -Path $env:PAPERCLIP_PROMPT_FILE -Raw -Encoding UTF8
} elseif ($env:PAPERCLIP_PROMPT) {
  $prompt = $env:PAPERCLIP_PROMPT
}

if ($null -ne $prompt -and $prompt.Trim().Length -gt 0) {
  $prompt | claude -p --output-format text --strict-mcp-config @args
  exit $LASTEXITCODE
} else {
  claude --strict-mcp-config @args
  exit $LASTEXITCODE
}
