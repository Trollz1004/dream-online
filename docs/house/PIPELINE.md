# Pipeline

Plain sentences by design so every builder, expediter, and judge follows the same build loop.

## 1. Brainstorm and route

- **Brainstorm first**: every lane starts with the starter-kit method card plus on-demand `superpowers` (`brainstorming`, planning, failing test first, systematic debugging, and verification before done).
- **Routing**: Panda Router (`192.168.0.40:8765`, using `gemini-3.8-flash` and `gemini-4-hydrogen`) plus the role router select one role and at most two companion skills per task.

## 2. Dual offerings and upgrades

- **Two offerings `[A]` and `[B]`**: two independent passes build `[A]` and `[B]` TDD-first, with no behavior change landed without a failing test first.
- **Expediter and five upgrades**: a second decision model scores `[A]` and `[B]` against a written rubric (`task goal`, `tests`, `funding goal`), keeps the stronger work, and names exactly five one-line add-on upgrades.
- **Stacked add-on loop**: each of the five add-on upgrades routes back through Panda Router and the role router as its own task and stacked PR.

## 3. Judges, merge, and commit format

- **Two judges and merge**: `Gemini 4 Carbon` and signed-in `Codex` review the primary work and stacked add-ons; `Fable` or the rotating trusted-three merges once GitHub CI checks are green.
- **PR title format**: `[YYYY-MM-DD #NNNN] title, by NAME`, where `NAME` is one of `Josh`, `Gemini Carbon`, `GPT-6 Astra`, `GPT-6.1 Sol`, `Codex`, `Opus`, or `Fable`.
- **Commit trailer**: every commit ends with a matching `Authored-by: NAME` trailer.
