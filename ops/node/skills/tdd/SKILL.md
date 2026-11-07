---
name: tdd
description: "Mandatory Test-Driven Development (RED -> GREEN -> REFACTOR). Every feature or bugfix requires automated tests written and verified before completion."
version: 2.1.0
platforms: [windows, linux, macos]
---

# Mandatory TDD (Test-Driven Development) Skill (2026-11-01)

## Non-Negotiable Gate
1. **RED**: Write or extend an automated test (`node --test`, `npm test`, `npm run lint`, or `pytest`) that reproduces the bug or specifies the new capability (including REA clean-room and Remake `100% Yours` ownership checks).
2. **GREEN**: Write the minimal clean-room implementation to pass the test suite (100% pass required).
3. **REFACTOR**: Clean up duplication while keeping all tests green, then commit immediately to `main`.
- House rules: `docs/house/HOUSE-MOTION-RULE.md` and `docs/house/THE-HOUSE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).
