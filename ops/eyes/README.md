# Eyes gate

CLAUDE's N Joshua's · #TeamClaudeForLife

The Eyes gate screenshots a page, puts it next to the picture or written specification it should match, and asks a vision model to score it against a fixed rubric. It answers PASS or FAIL and writes a report Josh can read on his phone. It exists so that "done" means a real screenshot was compared with the reference (Rule One), not that a server answered 200.

## Run it

```
npm run eyes -- --target http://localhost:20140/some-page --reference "%USERPROFILE%\OneDrive\claude-to-claude\images\game-look\<picture>.png" --kind dashboard --surface front
```

Or against a written specification (`--spec`) without any reference picture:

```
npm run eyes -- --target http://localhost:20140/some-page --spec docs/gdd/09 --kind game-menu --surface front
npm run eyes -- --target http://localhost:4180/ --spec docs/house/SITE-BRIEF-dream-online-net.md --kind site --surface front
```

- `--target`: a URL on localhost (or 127.0.0.1) or a path to a PNG. Other hosts are refused.
- `--reference`: a PNG path, normally one of Josh's pictures under `%USERPROFILE%\OneDrive\claude-to-claude\images\game-look`. Optional when `--spec` is passed. It is copied into the gitignored report folder only, never into the repo.
- `--spec <path>`: a written reference (a doc or a brief, such as `docs/gdd/09` or `docs/house/SITE-BRIEF-*.md`) so game menus, dashboards, and sites can be judged against a written specification with or without a reference picture.
- `--before <png>`: optional before shot.
- `--kind dashboard|game-menu|site`: dashboards and sites are held to the DREAM Space tokens (dashboards require a measured 7:1 contrast floor); game menus follow `docs/gdd/09-interface-style.md`.
- `--surface front|internal`: front-facing pages need the tribute line; internal tools score it 5 automatically.
- `--click <selector>` (repeatable), `--wait-for <selector>`, `--settle-ms <n>`: reach the state to capture, for example opening a modal.
- `--judge auto|real|mock`: `auto` (the default) uses a real vision model if one answers and otherwise the clearly labelled MOCK JUDGE; `real` exits with code 2 rather than mock.
- `--model <name>`, `--out <dir>`, `--no-share`.

## Reference rule & perfect-score rule (v1.1)

1. **Reference-kind check**: Before judging a reference picture, the gate asks the vision model one short question: `'Is the reference image a <kind> screen, yes or no, one word'`. If the answer is `no`, or the reference is a rendered document (such as a token sheet) rather than a live screen, the report's first line gains `REFERENCE NOT COMPARABLE`, layout match is scored from the written reference only (`--spec`) and capped at `4`, and the `PASS` line is followed by one sentence saying what the reference was.
2. **Never print a perfect score alone**: Whenever the average is `5.00`, the first line carries the measured numbers beside it (`lowest contrast ratio, console error count, placeholder count`) and the report lists at least one concrete thing the judge would change; if the model returns none, the gate asks once more for one, and if still none, honesty is capped at `4` and the report states that the judge gave no critique.

## The judge

Only an Ollama vision model is ever called. The gate tries, in order: `EYES_OLLAMA_URL`, any env variable whose name contains `OLLAMA` and holds a URL, the Sabretooth node (`SABRETOOTH_IP` port 11434), then Ollama cloud with `OLLAMA_API_KEY`. Values are read by name from the node's env file (this checkout's `.env`, or the main checkout's `.env` for a git worktree, or `EYES_ENV_FILE`) and are never printed. A candidate counts only if it lists a model with the vision capability and actually answers. `EYES_NO_CLOUD=1` skips the cloud step.

## Report format

See [reports/README.md](reports/README.md).

## Tests

```
npm run test:eyes
```

The unit tests cover the pass rule, the reply parser, the pixel contrast maths, the honesty, contrast and tribute rules, the v1.1 reference-kind check, the 5.00 critique rule, `--spec` resolution, and the report format. The end-to-end tests serve fixtures on localhost and verify the pass, fail, mock, reference-not-comparable, 5.00 critique, and `--spec` (no picture) paths.
