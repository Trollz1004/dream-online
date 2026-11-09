Security audit runs only in agy sandbox mode, output goes to ops/security/runs/, and only REPORT.md, FINDINGS-DETAIL.md and NEEDS-VALIDATION.md of each run are copied into docs/security/audit-<date>/run-<N>/ by PR.

- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).
