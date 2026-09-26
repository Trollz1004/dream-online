# DREAM Source Classification

Use this file to prevent design drift when agents encounter mixed project material.

## Classes

- **CANON** — founder-locked facts; do not change without explicit founder approval.
- **ACTIVE DESIGN** — current implementation/design direction; may evolve through normal engineering.
- **REFERENCE** — inspiration, screenshots, memes, GIFs, videos, visual ideas and chat excerpts; not automatically requirements.
- **RESEARCH** — material to investigate/learn from; not doctrine by itself.
- **DEPRECATED** — intentionally retired material; do not restore silently.
- **QUARANTINED** — potentially contaminated/unsafe/secret-bearing legacy material; never import blindly.

## Current authoritative entries

| Path / Material | Class | Notes |
|---|---|---|
| `docs/doctrine/DREAM-FABLE-CODEX-MASTER-DISPATCH.md` | CANON | Consolidated founder-directed DREAM doctrine and builder contract. Captured before the 2026-09-20 engine decision (Godot 4.7.2, Unreal parked) and the Paperclip-parked reconciliation; read it with its own reconciliation note and `docs/tech/engine-decision-2026-09-20.md`. |
| `docs/DREAM-DISPATCH.md` | ACTIVE DESIGN | Short-lived operational handoff/current-state file, read with the newest `ops/node/JOURNAL.md` entry. The root `DREAM-DISPATCH.md` was retired to a pointer on 2026-09-26. |
| Existing GDD/architecture/testing docs | ACTIVE DESIGN | Reconcile against newer founder locks; preserve compatible implementation work. |
| Kid sledgehammer / Ban Hammer dance GIF | REFERENCE | Tone/comedic timing inspiration; not an engineering requirement by itself. |
| Coffee Kraken / Claude imagery | REFERENCE | Character/tone/visual inspiration unless promoted to canon later. |
| Raw DREAM chat exports | REFERENCE | Valuable design provenance; explicit founder locks in doctrine take precedence. |
| Old DAO/token/investment concepts | DEPRECATED | Never reintroduce into NEEDs/game economy without explicit founder reopening. |
| Secret-bearing legacy files | QUARANTINED | Do not echo, commit, import or execute credentials/secrets. |

## Agent rule

When a source conflicts with a newer explicit founder lock, stop treating the older source as active doctrine. Record the conflict in `DREAM-DISPATCH.md` if it affects implementation.
