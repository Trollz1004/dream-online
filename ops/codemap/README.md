# Code map

`build-codemap.mjs` writes one Markdown map of a repo so a lane can read where things live before it starts work.

- Node built-ins only. No packages, no outside service.
- Skips `node_modules`, `dist`, `build`, `.venv`, archive folders, generated and binary files.
- Never opens a file whose name starts with `.env`. Masks anything that looks like a key.

Run:

```
node ops/codemap/build-codemap.mjs <repo-folder> <name> [--out <file>]
```

With no `--out`, the map prints to standard output.

Test:

```
node --test ops/codemap/*.test.mjs
```

The inbox runner (`ops/router/inbox-runner.ts`, task c2) builds the map after each task's worktree is made and before the lane starts, when the map is missing or older than the worktree's base commit. It writes `%USERPROFILE%\antigravity\.fable-kitchen\codemap\<repo>.md` and copies it to `%USERPROFILE%\Obsidian\Alienware\codemap\<repo>.md`. A build that fails or takes over 60 seconds is skipped with one log line; the task goes on. Line 1 of the task log ends with `code map: fresh`, `code map: rebuilt` or `code map: skipped (<why>)`.
