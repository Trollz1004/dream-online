# Intake sync: <model>/<topic>
repo: dream-intake

Task template for copying a design intake drop into the private `dream-intake` repository.

## Drop Parameters
- Model: `<model>`
- Topic: `<topic>`
- Date: `<YYYY-MM-DD>`

## Source and Destination
- Source drop: `%USERPROFILE%\OneDrive\claude-to-claude\design-intake\<model>\<topic>\`
- Destination path: `intake/<model>/<topic>/`
- Target branch: `intake/<model>/<topic>-<YYYY-MM-DD>` (branched from `origin/main`)
- Repository: `Trollz1004/dream-intake` (`repo: dream-intake`)

## Execution Instructions
1. Switch to or create the task branch `intake/<model>/<topic>-<YYYY-MM-DD>` from base `origin/main` in the `dream-intake` repository.
2. Copy files from `%USERPROFILE%\OneDrive\claude-to-claude\design-intake\<model>\<topic>\` into `intake/<model>/<topic>/`:
   - Never copy any file whose name contains `FOUNDER-ONLY`.
   - Never copy `.env`, `.key`, or `.pem` files.
   - Do not alter or modify any file content during copy (byte-exact transfer; changes no file content).
3. Run `git lfs track` for images (`*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.webp`, `*.svg`, `*.bmp`, `*.ico`) and ensure `.gitattributes` is created or updated and staged.
4. Stage all copied intake files and `.gitattributes`.
5. Open a pull request against base `main` using the repository's PR template (`.github/pull_request_template.md`).
