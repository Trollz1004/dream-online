# Weekly Model Ranking Prompt (`ops/router/rank-models.md`)

CLAUDE's N Joshua's · #TeamClaudeForLife

## Who Runs This Prompt

Run this prompt once a week in a live session on an official trusted lane only:

- **Fable** on signed-in Claude Code or `claude.ai`, or
- **Gemini 4 Argon High** in a live Antigravity (`agy`) session.

This job is never run by a wrapper, an unattended harness, or a local model (`Hermes`, `Free Claude Code :8082`, `OmniRoute`, or `Ollama`).

---

## Prompt to Paste into a Live Fable or Argon Session

```text
Use your highest reasoning level. Read docs/standards/AGENT-STANDARD.md, ops/router/lanes.json, and ops/router/dream-task-router.ts before anything else. Never push to main or master, never merge, never use --no-verify or --force. Never type a Windows user folder name in any file; write %USERPROFILE%. Never print an environment variable value, a secret, or a private LAN address. Never scrape YouTube or any Google site.

You are running the weekly Jev router model ranking refresh in a live official session (Fable or Gemini 4 Argon). Do the following steps in order:

1. Review the ten fixed Jev job classes defined in ops/router/dream-task-router.ts and ops/router/lanes.json:
   - route
   - mechanical
   - code-bulk
   - code-hard
   - engine
   - design-visual
   - research
   - judge
   - post-x
   - youtube-upload

2. Research and verify the current best model and fallback ladder for each job class using official documentation, release notes, and benchmark sources whose terms allow access. Record at least one real source citation or URL per job class in the sources array.

3. Enforce the non-negotiable platform rules from docs/standards/AGENT-STANDARD.md and ops/router/lanes.json:
   - Claude models inside agy (claude-opus-5-5 and claude-sonnet-5-5) share one quota separate from Gemini models, so any Claude primary lane in agy must keep a Gemini fallback lane (such as gemini-4-argon) and never another Claude lane in agy.
   - route and mechanical default to gemini-3.8-flash in agy.
   - judge is always fable on signed-in Claude Code and never receives route tasks.
   - research uses official Opus (claude-opus-5-5) or Argon (gemini-4-argon) lanes only.
   - design-visual uses claude-opus-5-5 or gemini-4-argon and is always followed by the mandatory Eyes gate.
   - post-x uses grok through Hermes on Sabretooth.
   - youtube-upload uses youtube-data-api (private only, never a model).

4. Write the new weekly ranking file to ops/router/rankings/<YYYY-MM-DD>.json using today's UTC date in strict YYYY-MM-DD format and this exact JSON shape:
{
  "date": "YYYY-MM-DD",
  "generated_by": "fable or gemini-4-argon",
  "classes": {
    "route": {
      "ranked": ["gemini-3.8-flash", "gemini-4-argon"],
      "lane": "gemini-3.8-flash",
      "reason": "One plain sentence explaining why this lane ranks first for route.",
      "sources": ["https://...", "ops/router/lanes.json"]
    }
  }
}
Include all ten job classes in the classes object, with a non-empty sources array and a single-sentence reason for each class.

5. Validate the new file using validateWeeklyRankingFile in ops/router/dream-task-router.ts and run npm test and npm run lint. Paste the real command output.

6. Open a pull request on a branch named ai/router/ranking-<YYYY-MM-DD> and finish with a caveman Obsidian note (DID, BROKE, NEXT, BLOCKED, FILES).
```
