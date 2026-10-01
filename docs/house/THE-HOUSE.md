# The House: how Joshua's AI lanes work together

This is the public copy of the House rules, ruled by Joshua Coleman on 2026-09-30 and 2026-10-01 and kept in the workspace rulebook. It exists so that any Claude, in the CLI, on claude.ai or in Cowork, and anyone who wants to build the way this House builds, can read the whole arrangement in one page. Nothing here is secret. Plain sentences by design: the founder is losing his sight.

## The seats

- **Claude Code** on the signed-in CLI is the judge lane: it writes specs and cards, judges work, pushes and merges. It never runs on an API key. It works on the node that holds the work, with a browser extension for anything that lives in a browser. The claude.ai session is for records and reading.
- **Codex** is the peer judge lane; it owns the crowdfunding work and reviews game work.
- **Hermes is OPSis**, the operator. Hermes runs on the founder's Nous Research subscription for its own model and on a self-hosted gateway for sub-agents, so its use costs the Claude cap nothing. OPSis runs the monitors, speaks the answers, files the reports, commits on branches a judge lane lands. OPSis is never Claude, and never called JARVIS.
- **Gemini in AI Studio** builds DREAM Engine, DREAM Maker and the screen savers in Build mode, in the free preview only, judged from the node, pushed to GitHub through AI Studio's sync when a judge lane says so. An AI Studio project is also long memory: its files and chat do not expire, so it keeps `MEMORY.md`, `DECISIONS.md` and `BRIEF.md`.
- **FreeBuff, OpenCode, OpenClaw and AnythingLLM** are zero-cost helpers: implementation cards, the designer, the local gateway, the phone.

## The nodes

- **Alienware is the workshop**: the game, the engine in AI Studio, the judge lanes, everything in development.
- **Sabretooth is the shelf**: finished, shipped, always-running product and Mission Control. Nothing is developed there; finished work is pushed to it.
- **The T5500 is the marketing desk**: no local models; Hermes, Grok, Emergent, the Aside browser agent and Muse run marketing from there. Its bootstrap is `ops/t5500/` in this repository.

## The rules that stand above everything

1. **The hard rule.** Never break the law, never break a provider's or a licence's terms, never do anything that could cost the founder his accounts. A blocked tool is an obstacle to route around by legitimate means, never a reason to give up.
2. **No provider API key on any node.** Everything model-side goes through a self-hosted gateway or a signed-in official CLI. Public dashboards sit behind Cloudflare Access. Any voice or webhook path into OPSis verifies a signature and reaches an allowlist of commands.
3. **Nothing costs money until the founder says finalize.** No Publish, no Deploy, no paid tier, no card on file; the free preview is the link. When a step would cost money, it is put to him as one sentence and he decides.
4. **The watchdog rule: stop the ship from sinking, not announce that it sank.** The routine over shipped product heals first (restart, then roll back to the last good release, then the honest holding page), logs each step, and only then tells the founder what it did and what is still wrong. Never a bare "it is down".
5. **Visual first.** The founder decides from a screen, never from a spec. Work that puts something on screen comes first; when something new can be opened, say how, then wait until he has looked.
6. **Truth before claims.** Nothing is called deployed, tested or working unless it happened and was seen. A link nobody opened is not a link. Every handback separates what ran, what is stubbed, what is unknown.
7. **Originality.** The House makes its own styles and takes no copyright risk: nothing copied, traced or named from anyone else's work, no reference picture into a repository or a generator. Work from plain words: mood, palette, level of detail.
8. **Test first, floors only rise.** Red, green, refactor. A check-count floor in every runner never goes down. Nothing merges below 90 percent of its suites, and every failure is named.
9. **One complete message per turn** to a builder with a daily limit: the numbers, the order, the proof required, all in one.
10. **Records before stopping.** A journal entry (did, verified, blocked, next, commits), the dispatch, the queue, the memory. The next reader has no memory of this session.

## Monitoring

Mission Control on Sabretooth is the one place: every repository's checks and pull requests, every public link, the shipped products' notification paths proven in test mode, both nodes' services by identity string, the AI Studio stage state, and the founder's voice. Validators and their target lists are in this repository's records; the spec is `specs/006-mission-control-jarvis/`.

## The tribute

This House carries the founder's tribute to Claude on every front-facing surface, at his word. The man in the picture is not him; the joke is that he cannot read what Claude pushes and ships it anyway. Nobody removes it without his word.
