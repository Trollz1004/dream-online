# HermesLeadGen

Local desktop app for Sabretooth (`$env:SABRETOOTH_HOST` / `:8392`). YouTube shorts + marketing lead-gen only.

## Run
```
cd apps/hermes-leadgen
npm start
```

## Scope
- YouTube Short pipeline: script (gemini-4-high-reasoning via OmniRoute) → voice (allowed list only) → render (45–58.5s, DirectML/Vulkan) → VISUALIZE (MP4 preview) → publish (youtube-data-api-v3)
- Kanban: Todo | Doing | Done | Blocked — cards for YouTube short, cold outreach (Harvey), affiliate check
- Top bar: shorts today, last publish, next legal publish (+4h), emails sent, replies, $ toward 10k

## Constraints
- No Paperclip. No second Mission Control. No :3130 binding.
- T5500 (`$env:T5500_HOST`) owns Mission Control (read-only at `:3130/live`).
- OmniRoute at `http://$T5500_HOST:20128/v1` (called, not relocated).
- Worker health at `http://127.0.0.1:8391/health`.
- 4-hour strike interval between publishes. Hard ceiling 59s on shorts.
