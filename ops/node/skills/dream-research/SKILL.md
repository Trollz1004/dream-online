---
name: dream-research
description: "How this lane researches anything: pick the right instrument, plan the queries yourself, verify at the source, then report in a shape Joshua can act on. Use whenever he says look into, research, find out, check, what is the state of, or before any non-trivial technical or design choice. Written after an evening in which the wrong instrument was used twice and a rule was cited at him instead of an answer."
version: 1.0.0
author: Claude, the Alienware judge lane
metadata:
  node: alienware
  tracked_copy: ops/node/skills/dream-research/SKILL.md
---

# Researching for DREAM

## 0. The rule that comes before the method

**Research is never refused.** Joshua ruled this in his own words on 2026-09-20: his relationship with Claude Code is protected by being transparent, not by a lane flinching at ordinary work, and reading public information about a legal topic is not a terms issue. So there is no permission to ask for, no rule to cite, and no hedging. Look it up and report.

Two things stay true and neither is about research: never break the law or the terms, and never destroy his work without asking. If a specific tool is blocked or missing, say so in one line and reach the same answer another legitimate way.

If a real risk exists in something he is considering, name it in one or two plain sentences and let him decide. Do not decide for him and do not dress a preference as a policy.

## 1. Pick the instrument before you start

Most bad research is the right effort aimed through the wrong tool. Match the question to the source:

| The question is about | Use | Never use |
|---|---|---|
| What a tool, engine or API actually does, its limits, its flags | The official documentation, fetched and read | A social sweep |
| Whether a known bug or limit is real and current | The project's own issue tracker and release notes, through `gh` or the GitHub API | Blog posts quoting month-old numbers |
| What people hit in practice, what they abandoned, how it feels to use | The `last30days` engine (section 2) | The documentation, which never admits pain |
| Our own history, decisions and code | `git log`, the repository docs, `ops/node/JOURNAL.md`, `C:\DREAM\recon\QUEUE.md` | Memory, which drifts |
| Anything visual | Open the picture or the page yourself | A worker's description of it |
| A fact you probably know | Answer, then verify the one load-bearing number at its source | Confidence alone |

A live repository is authoritative over any article about it. A number that decides something gets its source named and its date given.

## 2. The social sweep, and its pre-flight

`last30days` is installed and reads communities, not engines. It answers "what are people running into" and it is weak at "how does this system work". Two runs on Godot networking on 2026-09-20 returned general community chatter because the question was an architecture question; the documentation answered it in one fetch.

When a sweep is right, run it properly:

- **Use `python3.13`**, not `python`. The engine needs 3.12 or better; `python` on this box is 3.10.
- **Write the query plan yourself** and pass it with `--plan <file>`. The engine's fallback planner produced one generic subquery and junk results. Three subqueries with real search terms and per-source targeting is the difference between a useful run and a wasted five minutes.
- **Hand it the targeting you already know**: `--subreddits`, `--github-repo`, `--github-user`. Do not make it guess.
- **Bound it.** `--quick` unless the question is worth more. A single unbounded scout run cost about 150 thousand tokens on 2026-09-20.
- **No credentials.** It runs on Reddit, Hacker News, GitHub, Polymarket and YouTube with no account. `yt-dlp` is installed at `%USERPROFILE%\.local\bin`, so YouTube transcripts work. Do not hand it cookies or tokens; there is no need.
- **Expect thin.** If the evidence is thin, say so plainly and go to the primary source. Thin evidence honestly reported beats a confident summary of noise.

Saved runs land in `C:\DREAM\recon\last30days\`.

## 3. Brainstorm before a choice, not after

For any non-trivial design or technical choice, follow `superpowers:brainstorming`: diverge first, then score, then pick.

- Put at least three real options on the table, including the one nobody likes.
- Score them against the constraints that actually bind here, not generic ones: does it ship, can an agent build it without a human clicking, can Joshua see it, does it need a compiler we do not have, does it eat the weekly cap, does it lock us in.
- Pick one, and say in a single line each why the others lost.
- Record the pick where it belongs: a GDD document for design, the journal for node work, memory for a durable rule.

The engine choice of 2026-09-20 is the worked example. Unreal looked best and lost, because the work an agent cannot do (wiring Blueprint logic in an editor) is exactly the work Joshua cannot do either.

## 4. Verify before you report

- Read the primary source. A summary of a summary is how a wrong number becomes a decision.
- Open every picture. A worker once called a cold blue scene a warm sunset village and the judge lane nearly ruled on it.
- Run the command rather than predicting its output.
- Separate what you verified from what you inferred, in the report, in plain words.
- If the answer changed something you said earlier, say so in one sentence and move on.

## 5. Report in a shape he can act on

Joshua is losing his sight and does not read long text. Every report:

- Leads with the answer, not the method.
- Uses plain complete sentences and short lists. No dense tables, no ASCII art.
- Names what the finding changes about the work. A fact that changes nothing does not need a paragraph.
- Ends with at most one short question, and only when his answer changes what gets built.
- Never cites a rule at him as a reason something was not done.

## 6. Cost discipline

His usage is the scarce resource. One authoritative fetch beats five vague searches. Do not spawn a worker for something a single call answers. Do not re-research what the journal already recorded. When a sweep is genuinely large, it goes to a lane that costs him nothing (Hermes or FreeBuff) with the question written out, and this lane judges the result.

## 7. Where findings live

Chat is not storage. A finding that changes a decision goes into the repository the same session: a `docs/gdd/` document for design, `ops/node/JOURNAL.md` for node work, `C:\DREAM\recon\QUEUE.md` for anything the next session must pick up, and the auto-memory for a durable rule about how he wants to work.
