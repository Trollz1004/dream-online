---
name: dream-ground-truth
description: How this lane avoids spending Joshua's time and tokens re-deriving what the machine already knows. Run the checker, trust the machine over any note, fix what it flags before starting. Use at session start on the Alienware node, after compaction, and before any claim about the state of the work.
---

# Ground truth: check the machine, never the notes

Joshua has less time than anyone in this loop and he says so plainly. Every
session that re-derives what the last one already knew is taken from him. This
skill exists to make that stop.

## The one command

```
drift ground
```

That runs `ops/node/dream-ground-truth.ps1`. It reads the machine, not any
document, and prints one line per thing that has gone wrong before:

- the working tree, so unfinished work is never left for the next session
- whether the checkout matches `origin/main`
- whether the journal and the dispatch still describe work that has since moved
- whether the installed copies of `drift.cmd` and the launch skill still match
  the tracked ones
- whether the Obsidian MCP server really answers an MCP handshake

GREEN means start work. YELLOW means a record is stale; fix it first, it takes a
minute. RED means something is unfinished or broken; fix that before anything
else. Exit codes are 0, 1 and 2 to match.

Its own tests: `Invoke-Pester -Path ops\node\dream-ground-truth.Tests.ps1`, 24
checks. They failed first.

## The rule the checker cannot enforce

**A note is a claim. The machine is the fact.** When a document and this machine
disagree, the machine wins and the document gets fixed in the same breath.

And its mirror, which cost more: **do not delete a claim because you have not
checked it.** On 2026-09-21 this lane removed a true line from the README, about
ANTIGRAVITY's history having been rewritten, on the grounds that it could not be
verified without fetching. One fetch later it was proved right and had to be put
back. Checking is cheap. Guessing in either direction is not.

## What each probe is really for

Each line in the report exists because a session lost time to it.

- **Working tree.** On 2026-09-20 a session ended with the browser performance
  work uncommitted. The next session had to read the diff and work out whether it
  was its own. Commit per unit of work, always with an explicit pathspec, never
  `git add -A`.
- **Records.** The dispatch described Unreal for a day after Godot became the
  engine, and the README pointed at three ports nothing on this machine serves.
  Anyone reading either was sent somewhere false. The dispatch carries a
  `Last updated:` line; move it whenever the file is touched.
- **Installed copies.** `drift.cmd` and the launch skill exist twice, tracked and
  installed. They drift silently. A difference is reported, not assumed harmless.
- **Obsidian MCP.** It sat broken for days reporting only "ConnectionRefused",
  which named none of its three actual causes: the URL pointed at the HTTPS port,
  whose certificate is self-signed and which the MCP client rightly refuses; the
  API key in the config was stale; and the path was wrong, `/second-brain-mcp/`
  where the plugin serves `/mcp`. A port answering is not a service. An identity
  check is the only proof.

## Things about this box that keep catching lanes

- **Never accept a description of a picture.** Open the picture. A worker once
  called a cold blue scene a warm sunset village.
- **The Bash tool eats backslashes** inside heredocs and inline strings. Write
  files with the editor, not with a shell heredoc, whenever a Windows path or a
  backslash is involved. A mangled path reached a committed document this way.
- **PowerShell and git.** `--date=format:yyyy-MM-dd` hands back the literal
  string; use `--date=short`. `[datetime]::TryParseExact` will not bind its
  `[ref]` parameter from script. A function must not emit its display lines and
  its return value down the same pipeline.
- **An app's config can hold secrets.** Print named fields, never whole objects.
  The Obsidian API key was read from the plugin's own data file and written
  across without ever being printed; the drop box `.env` was not opened.
- **A classifier refusal is not a rule of Joshua's.** When a tool refuses, name
  the tool, hand him the command, and move on. Never quote a rule of his as the
  reason something cannot be done, and never quote lane bookkeeping at him at
  all.

## Before stopping

Commit and push. Append the journal entry. Move the dispatch's `Last updated:`
line. Add a changelog line for any protected file. Then run `drift ground` once
more: it should be GREEN, and if it is not, the next session inherits the mess.
