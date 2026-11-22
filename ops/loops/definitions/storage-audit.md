# Routine Definition: `storage-audit`

- **job**: `storage-audit` — Weekly read-only disk, cloud-folder, and repo checkout storage audit ending with a proposed numbered archive plan. The routine never zips, moves, or deletes anything.
- **worker**: `fcc` for the Alienware (`192.168.0.40`, writing to `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\fcc\`) and `hermes-t5500` for the T5500 (`192.168.0.15`, writing to `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\hermes-t5500\`)
- **model class**: Plain model
- **schedule**: Weekly on Sundays (`35 4 * * 0` on `fcc` for Alienware; `50 4 * * 0` on `hermes-t5500` for T5500), staggered so total scheduled jobs stay at `3` on `fcc` and `2` on `hermes-t5500`.
- **time limit**: `15 minutes` (`900 seconds`). Stops itself at the limit and writes a report even if a directory walk times out.

## Exact Read-Only Steps

1. **Mandatory skip list (never enter or read, and list each in the report as skipped)**:
   - Any `.env` or `.env.*` file.
   - The OneDrive `Personal Vault`.
   - Any folder whose name contains `DO-NOT-COMMIT` or `payments-private`.
   - Any folder named `hermes`, `grin-droid`, `GrinDroid`, `mira`, or `trolly`.
2. **Metadata-only & cloud-placeholder safety**:
   - Read file/folder names, timestamps, attributes, and sizes only; never open or print file contents except when computing a SHA-256 hash on local non-placeholder files over `100 MB` that share an identical byte size.
   - Check Windows file attributes (`FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS` / `FILE_ATTRIBUTE_OFFLINE` / ReparsePoint cloud placeholders) before hashing: never download or hydrate cloud-only OneDrive or Google Drive placeholder files to measure or hash them.
3. **Targets to measure on the worker's own node**:
   - Every fixed local disk on the node (`total` space, `free` space, and `% free`).
   - `%USERPROFILE%\OneDrive` (excluding `Personal Vault` and skipped folders).
   - The Google Drive sync folder if present on the node (report `not present` if absent).
   - Each repo checkout under `%USERPROFILE%\antigravity` on Alienware or `C:\ANTIGRAVITY` on T5500 (excluding skipped folder names).
4. **Items to report**:
   - Total and free space (GB and percentage) for each fixed disk and target root.
   - The 20 largest folders (path using `%USERPROFILE%` / `%LOCALAPPDATA%` and size in GB/MB).
   - Build and cache folders that can be cleanly rebuilt (`node_modules`, `dist`, `.vite`, `.next`, `__pycache__`, `.pytest_cache`, `target`, temp build caches) with their sizes.
   - Duplicate large files over `100 MB` only, matched by exact byte size and SHA-256 hash (local resident files only, outside skipped folders).
   - `.zip` archives or repo clones/worktrees with last-modified timestamp older than `60 days`.
   - The explicit list of skipped files and folders from Step 1.
5. **Proposed Archive Plan (report tail)**:
   - End the report with a proposed archive plan as numbered steps: what would be zipped, to what destination path, and how much space it frees.
   - State explicitly that the routine never zips, moves, or deletes anything; an archive step runs only after the head of the kitchen approves that step in writing, executed as `zip + SHA-256 checksum` with the original kept until the copy is verified.
6. Write one UTF-8 report (no BOM) named `YYYY-MM-DDTHHMM-storage-audit.md` to the worker's inbox folder (`%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\fcc\` on Alienware or `%USERPROFILE%\antigravity\.fable-kitchen\loops\inbox\hermes-t5500\` on T5500) following `ops/loops/REPORT-SHAPE.md`.

## What Counts as `needs the judge: yes`

- Any fixed disk on the node is under `15 percent` free space (`free_bytes / total_bytes < 0.15`).
- A fixed disk or target root cannot be queried or the routine hits its 15-minute time limit.
