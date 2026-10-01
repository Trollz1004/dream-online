# T5500 bootstrap

What this is: a josh-proofed bootstrap for a fresh Windows 10 T5500 that
installs every dependency with winget and npm, in order, never closes its
window on an error, saves and resumes its own progress, pauses for your
sign-in clicks, connects the node to Mission Control's Hermes mesh through a
marketing profile named OPSis, and watches itself with a health check.

## The three lines to type on the fresh T5500

Open an elevated PowerShell (this machine has no Git yet, so these three
lines fetch the bootstrap files with `Invoke-WebRequest` before anything
else exists):

```powershell
New-Item -ItemType Directory -Force -Path C:\DREAM\ops\t5500 | Out-Null
foreach ($f in 'Bootstrap-T5500.cmd','Bootstrap-T5500.ps1','t5500-health.ps1','Register-T5500Health.ps1','AGENTS.t5500.md','hermes-marketing-config.yaml') { Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Trollz1004/dream-online/main/ops/t5500/$f" -OutFile "C:\DREAM\ops\t5500\$f" }
& C:\DREAM\ops\t5500\Bootstrap-T5500.cmd
```

The third line starts the bootstrap. It elevates itself if the window is not
already Administrator, then keeps the window open no matter what happens
next (`-NoExit`).

## What each step does

In order: confirm this is an elevated window and TLS 1.2 is on, and create
`C:\DREAM`, `C:\DREAM\ops-state\t5500`, and `C:\DREAM\recon`; make sure
winget is present (opens the Microsoft Store page for App Installer if not,
and waits for Enter); PowerShell 7; Windows Terminal; Git; Node.js LTS; the
GitHub CLI; Python 3.12 and uv; Google Chrome; 7-Zip; the agent CLIs
(`@anthropic-ai/claude-code`, `@openai/codex`, `opencode-ai`) over npm;
Hermes, with its official install line; then four sign-in gates that each
run a login command and wait for you — `gh auth login` until `gh auth
status` succeeds, `claude` until you sign in and type `/exit`, `codex login`
until `codex login status` succeeds, and `hermes setup --portal` until
`hermes status` succeeds; cloning `Trollz1004/hermes` and
`Trollz1004/dream-online` into `C:\DREAM` with the repo-local git identity;
writing `C:\DREAM\AGENTS.md` (from `AGENTS.t5500.md`) plus one-line
`CLAUDE.md` and `GEMINI.md` pointers; creating the Hermes `marketing`
profile (OPSis), writing its config from `hermes-marketing-config.yaml`,
generating a random 48-character `API_SERVER_KEY` into that profile's
`.env` (never printed, never logged), and starting its gateway; installing
`t5500-health.ps1` as the `DREAM-T5500-Health` scheduled task, every 30
minutes; and finally writing `BOOTSTRAP-DONE.md` and opening it in Notepad.

## How resume works

Every step's outcome is recorded in
`C:\DREAM\ops-state\t5500\bootstrap-state.json` as it finishes — completed
or skipped, with a timestamp. Everything the script does along the way is
also written to `C:\DREAM\ops-state\t5500\bootstrap.log`. If you close the
window, lose power, or quit on purpose, just run `Bootstrap-T5500.cmd`
again: it reads the state file and picks up after the last completed or
skipped step, without repeating any step the machine already finished.

## When a step asks for your click

A step that needs you to sign in or click something prints what to do and
waits — the GitHub, Claude, Codex, and Nous Portal sign-ins all work this
way, and the winget-present step does too if App Installer is missing. Do
the click, then come back to the window and press Enter (or, for the Claude
sign-in, type `/exit` once you're signed in).

If a step fails for some other reason, it prints a plain sentence about
what went wrong, writes it to the log, and asks:

- **Press Enter** to retry the step.
- **Type `skip`** to mark it skipped and move on. Skipped steps are
  recorded in the state file and listed at the end of the run, and again in
  `BOOTSTRAP-DONE.md`, so nothing silently falls through.
- **Type `quit`** to stop. The window stays open either way; re-run the
  `.cmd` later to resume.

## Try it without touching anything

```powershell
powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File C:\DREAM\ops\t5500\Bootstrap-T5500.ps1 -DryRun
```

`-DryRun` walks every step in order, prints what it would run, and runs
nothing: no installs, no sign-ins, no files, no state.

## Reading health.json

Once the `HealthScheduledTask` step runs, `t5500-health.ps1` runs every 30
minutes and writes `C:\DREAM\ops-state\t5500\health.json`. It probes four
things by identity, not just an open port: the marketing gateway at
`http://127.0.0.1:8377/health` (checked for the `"platform":"hermes-agent"`
identity its own health route returns), OmniRoute on Sabretooth at
`http://192.168.0.8:20128/v1/models` (checked for a `"data":[` models
array — remote, only ever reported, never healed from this machine), `gh
auth status`, and free disk space on `C:` staying above 10 GB.

`health.json`'s top-level `status` is one of:

- **GREEN** — every check passed.
- **YELLOW** — OmniRoute is unreachable or `gh` is not signed in, but the
  local gateway and disk are fine. Nothing here needs this machine fixed;
  OmniRoute is Sabretooth's problem and `gh` just needs a sign-in.
- **RED** — the marketing gateway is down even after this script tried
  `hermes -p marketing gateway start` once and re-probed, or free disk
  dropped below 10 GB. Either one needs a human on this machine.

`health.json` also carries `healed` (`true` if the gateway came back after
the one heal attempt this run) and a `checks` object with each probe's own
`healthy` flag and a plain-English `detail`. One summary line is appended to
`health.log` on every run. Run it by hand with `-Verbose` for a plain-words
table:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\DREAM\ops-state\t5500\t5500-health.ps1 -Verbose
```

To remove the scheduled task: `powershell -NoProfile -ExecutionPolicy
Bypass -File C:\DREAM\ops\t5500\Register-T5500Health.ps1 -Uninstall`.

## Giving Sabretooth control

`BOOTSTRAP-DONE.md` (written by the last step, and opened in Notepad) spells
out the exact `hermes peer add t5500 --url http://<this machine's LAN
IP>:8377 --key <API_SERVER_KEY>` line for the Sabretooth operator — with the
key left as a placeholder. Read the real key yourself from
`%LOCALAPPDATA%\hermes\profiles\marketing\.env` and hand it over outside of
chat or a committed file.

## Tests

`Invoke-Pester -Path ops/t5500` runs both suites (Pester 3.4, the version
that ships with Windows PowerShell 5.1): `Bootstrap-T5500.Tests.ps1` against
the step engine (state, logging, the key generator, retry/skip/quit,
resume, and `-DryRun`), and `t5500-health.Tests.ps1` against the health
status rules and the self-heal behavior, with every probe mocked.
