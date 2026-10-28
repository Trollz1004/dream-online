# OPSis Cut & Reach Studio

Run `node ops/opsis-cut-and-reach-studio/server.mjs` and open `http://127.0.0.1:8390/`. Run checks with `node --test ops/opsis-cut-and-reach-studio/test/studio.test.mjs`.

This is a local, in-memory planning prototype. It accepts an already timestamped transcript and produces deterministic edit decisions; it does not transcribe, render media, generate voice, detect music beats, upload, or integrate with Square. The hook uses word density, not measured retention; crop positions are layout metadata, not subject tracking. Approval keeps a plan only until the server exits. The CRM scores inputs and parses UTM tags but does not persist leads or handle webhooks.

There is no YouTube upload implementation. The publication validator is not a publisher, and no API or validation in this repository can prevent content from being posted through other systems. The private affiliate helper depends on an external age-verification process; it does not verify age itself. Do not treat it as proof of an effective compliance wall. No affiliate link is displayed in the studio UI.

The 90/10 values are internal policy parameters, not a conclusion about actual taxable income, allowable tax deductions, entity classification, or charitable contributions. Obtain qualified tax advice.
