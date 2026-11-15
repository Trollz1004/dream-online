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

Task c2 wires this into the inbox runner.
