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
| `docs/doctrine/DREAM-FABLE-CODEX-MASTER-DISPATCH.md` | CANON | Current consolidated founder-directed DREAM doctrine and builder contract. |
| `DREAM-DISPATCH.md` | ACTIVE DESIGN | Short-lived operational handoff/current-state file. |
| Existing GDD/architecture/testing docs | ACTIVE DESIGN | Reconcile against newer founder locks; preserve compatible implementation work. |
| Kid sledgehammer / Ban Hammer dance GIF | REFERENCE | Tone/comedic timing inspiration; not an engineering requirement by itself. |
| Coffee Kraken / Claude imagery | REFERENCE | Character/tone/visual inspiration unless promoted to canon later. |
| Raw DREAM chat exports | REFERENCE | Valuable design provenance; explicit founder locks in doctrine take precedence. |
| Old DAO/token/investment concepts | DEPRECATED | Never reintroduce into NEEDs/game economy without explicit founder reopening. |
| Secret-bearing legacy files | QUARANTINED | Do not echo, commit, import or execute credentials/secrets. |

## Agent rule

When a source conflicts with a newer explicit founder lock, stop treating the older source as active doctrine. Record the conflict in `DREAM-DISPATCH.md` if it affects implementation.
