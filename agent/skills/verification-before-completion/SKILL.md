---
name: verification-before-completion
description: "Rule One enforcement: done means the real human user would accept it. Requires live HTTP/process verification, full test pass, and real screenshots for any UI."
version: 2.0.0
platforms: [windows, linux, macos]
---

# Verification Before Completion — Rule One (2026-10-28)

## Before Calling Anything Done, Working, Fixed, or Verified:
1. State who the human viewer is (e.g., Founder Joshua Coleman reading on his screen with tired eyes; a player in DREAM Online; a customer on `onlinerecycle.net` or `youandinotai.com`).
2. Run the real test suites (`npm test`, `npm run lint`, `node --test`) AND probe the live HTTP endpoint (using real TCP/HTTP checks, never trusting a single process list).
3. For any front-facing HTML/UI, capture and inspect the real screenshot, fix anything cut off or low-contrast, and commit to `main`.
