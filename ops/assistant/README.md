# The judge's assistant on the Max API credit

This folder holds a headless helper for the judge session. It takes one order file, runs it to the end on the official Claude Agent SDK for Python, writes `NAME.report.md` beside the kitchen logs in `%USERPROFILE%\antigravity\.fable-kitchen\orders`, adds one line to a run log, and exits. It runs on the monthly API credit that comes with the Max plan instead of the plan's own usage cap, so scouting and legwork stop eating the cap.

It uses Claude Sonnet 5.5 (`claude-sonnet-5-5`) by default. The `-Model opus` switch picks Claude Opus 5.5 (`claude-opus-5-5`). No other model is accepted.

## How the judge runs it

From any PowerShell window on the node:

```powershell
& "$env:USERPROFILE\antigravity\build\dream-online\ops\assistant\run-assistant.ps1" -Order "$env:USERPROFILE\antigravity\.fable-kitchen\orders\ORDER-SOMETHING.md" -Name something -Mode scout
```

Add `-Model opus` for the bigger model and `-Mode worker` when the order needs to write files or push a branch. The launcher starts Python with no window, logs a start line and an exit line to `orders\NAME-yyyyMMdd-HHmm.log`, and returns the assistant's exit code. The report lands in `orders\NAME.report.md`.

Exit codes: 0 done, 1 the run failed, 2 `CLAUDE_CONSOLE_KEY` is missing, 3 a spend cap was reached so it refused to start, 4 the API said the credit balance is too low (it stopped and did not retry).

## What keeps it safe

The key is read from one environment variable, `CLAUDE_CONSOLE_KEY`. The launcher reads only that one line from the node env file (by default this repository's root `.env`, the same file `ops/node/backup-node.mjs` reads) and puts it into the Python child process only. Python hands it to the SDK's own child process as `ANTHROPIC_API_KEY` through `ClaudeAgentOptions(env=...)`. Nothing sets `ANTHROPIC_API_KEY` for the user or the machine, so the signed-in Claude Code on this PC is never moved onto the key. If the variable is missing, the assistant prints one line naming it and exits with code 2. There is no fallback to any other key or sign-in.

Every run adds one JSON line to the ledger (`%USERPROFILE%\antigravity\.fable-kitchen\assistant\ledger.jsonl`) with the date, order name, model, input and output tokens, estimated dollars and status. The estimate uses `prices.json`, which carries its source link and the date it was read. The assistant refuses to start when this month's total reaches the monthly cap (90 dollars) or today's total reaches the daily cap (8 dollars). Both caps live in `config.json`. Each run also passes the remaining headroom to the SDK as `max_budget_usd`.

A guard written in plain Python checks every tool call, through both the SDK's `can_use_tool` callback and a `PreToolUse` hook. In both modes it refuses reading or printing `.env` files or anything named like a secret, key, token or vault; anything under folders named hermes, grin-droid, GrinDroid, mira or trolly; delete commands; pushes to main; `--force`; `--no-verify`; creating scheduled tasks; and anything that opens a window. Scout mode is read-only and its only write is its report, which the Python code writes itself. Worker mode may also write under `%USERPROFILE%\antigravity\build` and the kitchen folder and push feature branches. When the guard is unsure, it refuses.

## The three things only Josh does

1. Confirm the Max plan's API credit is claimed on claude.ai (Settings, Billing, API credits) and linked to the Console organization the key comes from.
2. Put a key from that Console organization in the node env file under the name `CLAUDE_CONSOLE_KEY`.
3. Keep auto-reload off and buy no credits in that Console organization, so that when the credit runs out requests simply stop and it can never cost money.

## Tests

```powershell
cd ops\assistant
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest -q
```

The SDK is mocked in every test, so the tests make no API call and need no key. They use an obviously fake placeholder value.

## Sources

- API credit for subscribers: https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
- Agent SDK with a Claude plan: https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
- Agent SDK Python reference: https://code.claude.com/docs/en/agent-sdk/python
- Models: https://platform.claude.com/docs/en/about-claude/models/overview
- Pricing: https://platform.claude.com/docs/en/about-claude/pricing
