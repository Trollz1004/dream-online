# Eyes gate

CLAUDE's N Joshua's · #TeamClaudeForLife

The Eyes gate screenshots a page, puts it next to the picture it should look like, and asks a vision model to score it against a fixed rubric. It answers PASS or FAIL and writes a report Josh can read on his phone. It exists so that "done" means a real screenshot was compared with the reference (Rule One), not that a server answered 200.

## Run it

```
npm run eyes -- --target http://localhost:20140/some-page --reference "%USERPROFILE%\OneDrive\claude-to-claude\images\game-look\<picture>.png" --kind dashboard --surface front
```

- `--target`: a URL on localhost (or 127.0.0.1) or a path to a PNG. Other hosts are refused.
- `--reference`: a PNG path, normally one of Josh's pictures under `%USERPROFILE%\OneDrive\claude-to-claude\images\game-look`. Pass it as a path; it is copied into the gitignored report folder only, never into the repo.
- `--before <png>`: optional before shot.
- `--kind dashboard|game-menu`: dashboards are held to the DREAM Space tokens and a measured 7:1; game menus follow `docs/gdd/09-interface-style.md`.
- `--surface front|internal`: front-facing pages need the tribute line; internal tools score it 5 automatically.
- `--click <selector>` (repeatable), `--wait-for <selector>`, `--settle-ms <n>`: reach the state to capture, for example opening a modal.
- `--judge auto|real|mock`: `auto` (the default) uses a real vision model if one answers and otherwise the clearly labelled MOCK JUDGE; `real` exits with code 2 rather than mock.
- `--model <name>`, `--out <dir>`, `--no-share`.

## The judge

Only an Ollama vision model is ever called. The gate tries, in order: `EYES_OLLAMA_URL`, any env variable whose name contains `OLLAMA` and holds a URL, the Sabretooth node (`SABRETOOTH_IP` port 11434), then Ollama cloud with `OLLAMA_API_KEY`. Values are read by name from the node's env file (this checkout's `.env`, or the main checkout's `.env` for a git worktree, or `EYES_ENV_FILE`) and are never printed. A candidate counts only if it lists a model with the vision capability and actually answers. `EYES_NO_CLOUD=1` skips the cloud step.

## Report format

See [reports/README.md](reports/README.md).

## Tests

```
npm run test:eyes
```

The unit tests cover the pass rule, the reply parser, the pixel contrast maths, the honesty, contrast and tribute rules, and the report format. The end-to-end tests serve two fixtures on localhost. `fixtures/pass.html` must PASS against its own screenshot. `fixtures/fail.html`, with placeholder text and grey-on-grey text, must FAIL. A third test forces the mock judge and checks that the first line says MOCK JUDGE. Playwright's Chromium must be installed (`npx playwright install chromium`). These tests are kept out of `npm test` so the plain CI job, which installs without browsers, stays green.
