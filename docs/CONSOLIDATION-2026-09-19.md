# Consolidation of old DREAM Online copies, 2026-09-19

Joshua ruled on 2026-09-19 that the Alienware node's `C:\DREAM\dream-online` is the one root for the game, and asked that two older copies be folded into it and removed so nothing drifts. This note records what was compared, what was kept, where it went, and what was let go. Written by the Claude judge lane on Alienware.

## The two old copies

- A OneDrive folder named `DREAM-ONLINE-BACKUP-2026-08-05`. It was a git clone of this repository stopped at commit `5d7366c` from July 2026.
- A folder on the D: drive named for Claude and Joshua's MMORPG. It was a git clone of this repository stopped at commit `c4e225b` from 2026-09-03, on a disk that came from another Windows install.

## What the comparison found

Every commit in both clones is already in `main` here. That includes their branch tips, their reflogs and their unreachable commits. The one remote branch that no longer exists on GitHub (`docs/fable-dream-online-start-here`) carries a single file, and that file is byte-identical to `docs/handoffs/FABLE-DREAM-ONLINE-START-HERE-2026-08-25.md` in `main`. The five blog posts in a stray commit on D: are the same blobs as `docs/blog/` in `main`. An early "initialize" commit has the same tree as this repository's root commit.

Every modified or untracked file in the OneDrive clone is either identical to the file in `main` or an older draft of it. Its `memory/glossary.md` is the older text; the version in `main` is the cleaned successor. Its `adapters/README-DREAM.md` was an empty, truncated file.

So the only material worth carrying was uncommitted, and it came to 31 small files, about 4 MB.

## What was kept, and where

At the paths this repository already expects and already ignores:

- `paperclip-tro/` (five files, the newer D: set). `paperclip-tro/projects/PROJECT-2-DREAM-ONLINE.md` is the full canon that `AGENTS.md` points to. It was identical in both copies.
- `opencode/opencode.json`, the OpenCode provider and model config that `AGENTS.md` points to. Identical in both copies. A pattern check found no key-like strings in it.
- `game/server/live-npc-lab/data/lore-snippets.json`, the story snippets the Live NPC Lab reads at run time. Identical in both copies. It stays ignored; story material never goes into this public repository.

Under `references/_unreviewed/`, which is ignored until someone checks each item is safe for a public repository:

- `design-handoff-2026-09-02/`: the complete design handoff bundle as a zip, and the `sup-companion.glb` model of Sup@. The bundle's design document, plan and two standalone pages are already in `Trollz1004/ANTIGRAVITY` under `hermes/docs/handoffs/jarvis-dashboard/design-refs/`; its prototype scripts, the NPC style guide and the model are in no repository. The two loose HTML pages on D: were copies of the two standalone pages inside the zip and already on GitHub, so they were not copied again.
- `early-gdd-2026-07-08/`: the first drafts of the design documents, from before this repository existed. Their successors are `docs/gdd/`, `docs/tech/`, `docs/testing/` and `ops/` here. Classification: DEPRECATED.
- `older-variants/paperclip-tro-2026-07/`: the older OneDrive set of the Paperclip notes.
- `non-game/support/`: a support knowledge base for another product. It is not game material and is kept only because no other copy was found.
- `old-logs/`: one small agent log from July.

Each copy was checked against its source by SHA-256 before anything was removed. The list of paths and hashes is in the node journal entry for this date.

## What was let go, and why

- Both `.env` files. They were never opened. The repository's own `.env.example` says real values live in Joshua's OneDrive env vault. This node takes no provider keys: every model call goes through OmniRoute on Sabretooth.
- Three placeholder lines in the D: copy's `.env.example` for an Unreal MCP URL, a skills folder and a Python environment. The Unreal MCP plugin is parked.
- Run-time state and logs (`world_state.json`, `events.json`, checkpoints, `npc-memory.jsonl`, `world-events.jsonl`, `audit.log`, `server.log`). The running services here write newer ones.
- Everything tracked in git, because it is already in `main`.

## Removal

Both old folders were sent to the Recycle Bin, not erased, so either can be restored for a while. The OneDrive one can also be restored from OneDrive's own recycle bin. A sealed zip of the 31 kept files, `DREAM-ONLINE-PRIVATE-ARCHIVE-2026-09-19.zip`, sits in OneDrive as the off-disk copy of material that is in no git repository. It is an archive and not a working tree, so it cannot drift.

## Follow-up

Review `references/_unreviewed/design-handoff-2026-09-02/` for anything that must not be public (competitor names, private notes). What passes moves to a tracked `references/` folder and gets a row in `docs/SOURCE-MANIFEST.md`. The Sup@ model needs its origin confirmed before it is published.
