# Plan: the judge's assistant on the Max API credit (2026-11-18)

Source order: `.fable-kitchen/orders/ORDER-CREDIT-ASSISTANT.md`.

## Brainstorm
1. Raw Messages API loop with hand-written tools. Rejected: the order names the Claude Agent SDK, and the SDK already brings the tool loop.
2. Claude Agent SDK `query()` with a custom permission guard (chosen). The SDK runs the agent; our pure-Python guard decides every tool call through `can_use_tool` plus a `PreToolUse` hook, so the same rules hold in both modes and are unit-testable without the SDK.
3. Shelling out to a signed-in CLI. Rejected: that draws from the plan cap, which is the thing we are trying to protect.

## Plan
1. `prices.json` (models and per-million prices, with source link and date) and `config.json` (monthly cap 90, daily cap 8, ledger, run log, kitchen paths resolved from `USERPROFILE`).
2. Tests first (pytest, SDK mocked through `sys.modules`, no network): missing key exits 2 naming `CLAUDE_CONSOLE_KEY`; each cap refuses; guard blocks env reads, deletes, push to main, force, no-verify, scheduled tasks, windows, forbidden folders; ledger sums; credit-too-low stops once, is recorded, distinct exit code; fake key never lands in a log, report or ledger line; parent `os.environ` never gains `ANTHROPIC_API_KEY`.
3. `assistant.py`: key only from `CLAUDE_CONSOLE_KEY`, passed to the SDK child only through `ClaudeAgentOptions(env=...)`; spend guard; modes scout and worker; report written by Python; one run-log line.
4. `run-assistant.ps1`: shaped like `run-chef.ps1`, loads only the `CLAUDE_CONSOLE_KEY` line from the node env file into the child process, starts Python hidden, logs start and exit lines.
5. `README.md`, verify (full suite green, diff grep for key-shaped strings), no merge.
