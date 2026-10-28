# OPSis Cut & Reach Studio

Run `node ops/opsis-cut-and-reach-studio/server.mjs` and open `http://127.0.0.1:8390/`. Run checks with `node --test ops/opsis-cut-and-reach-studio/test/*.mjs`.

This is a local, in-memory planning prototype. It accepts an already timestamped transcript and produces deterministic edit decisions; it does not transcribe, render media, generate voice, detect music beats, upload, or integrate with Square. The hook uses word density, not measured retention; crop positions are layout metadata, not subject tracking. Approval keeps a plan only until the server exits.

## Content staging (all manual-review only)

- Partner registry: `affiliate-partners.json` lists DarLink AI (isolated to verified-18+ Date App contexts; `validatePublication` blocks it from YouTube drafts) and 5 Date App referral slugs with 50% lifetime creator math. This file does not verify ages and cannot control reposting elsewhere.
- `planSocialStrike` drafts disclosed founder-promotion posts for Reddit and verified-18+ Discord servers for the `joshlcoleman/Fable` local model. `auto_post` is impossible; Josh must copy, review, and hand-post per each community's rules.
- `planMusaCampaign` drafts Instagram/Facebook cards for onlinerecycle.net pickup, intake, and refurbishing.
- `scoreLeadForgeBatch` scores leads against the $29 Starter (10/day) and $99 Pro (50/day) tiers using the local determination path at zero LLM cost; no contacts are made automatically.

Customer-facing copy is product-value only and rejects mission/charity wording. The 90/10 values are internal policy parameters, not tax advice. No affiliate link is displayed in the studio UI. There is no YouTube upload implementation.
