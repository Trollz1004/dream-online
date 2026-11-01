---
type: decision-record
title: One Mission Control
date: 2026-09-17
created: 2026-09-17
updated: 2026-09-17
tags:
  - decision-record
status: accepted
ai-first: true
related:
  - "[[Sabretooth Node]]"
  - "[[JARVIS]]"
aliases:
  - One Mission Control ruling
---

## For future agent
This decision record captures the 2026-09-17 ruling that named a single Mission Control dashboard on the [[Sabretooth Node]], superseding every earlier Mission Control claim (Paperclip, AIRI, MC5 as a standalone page). Read this before assuming any other dashboard is authoritative.

## Ruling
- [[JARVIS]], served on `http://192.168.0.8:9150/` (repo home `mission-control/`, moved from `ops/dashboard-jarvis` by the repo consolidation, 2026-09-17), is the single Mission Control on the [[Sabretooth Node]]. It is a superset of the retired AIRI dashboard and its dispatch absorbs the Sentry wall, the MC5 fleet view, Emergent task views, and crosslisting.
- AIRI is retired. JARVIS holds the `:9150` port.
- MC5 on `:3151` is an optional embedded data source only - not a page anyone opens.
- Nobody builds another dashboard; a new view is added as a JARVIS panel.
- The House is the only way to start or heal a service on this node, and it runs the boot task and health loop described in `ops/runbook/SABRETOOTH-NODE-RUNBOOK.md`.
- The date app (youandinotai.com) stays frozen and listed for sale as of the 2026-09-16 ruling: no new features, no growth engine runs, no digests, no campaigns, no experiments, no audits. Growth crons for it are paused.
- DREAM Online runs on the Alienware node, not on Sabretooth.

Source: `CLAUDE.md` sections "One Mission Control (ruling 2026-09-17)" and "Date App FROZEN and FOR SALE (ruling 2026-09-16)" in the repo root.

## Notes that reference this
- [[00 HOME]]
- [[JARVIS]]
