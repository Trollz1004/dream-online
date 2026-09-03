---
title: "What It Means to Build an MMORPG in the Open"
slug: "mmorpg-built-in-the-open"
description: "DREAM Online's design docs and prototypes live in a public GitHub repo. Here's what that changes about how the game actually gets made."
keywords: ["MMORPG development", "open development", "indie MMO", "game development in public", "DREAM Online", "public GitHub repo"]
date: 2026-09-03
author: "DREAM Online team"
canonical: "https://dream-online.net/blog/mmorpg-built-in-the-open"
---

## The repository is the pitch deck

Most MMORPGs announce themselves with a trailer, a logo, and a promise. You get a mood, not a plan. DREAM Online is doing the opposite: the design documents, the prototype code, and the roadmap live in a public repository at [github.com/Trollz1004/dream-online](https://github.com/Trollz1004/dream-online), and they're there before there's anything close to a finished game to show off.

That's not a marketing gimmick bolted onto development. It's the actual working method. When a design pillar changes, the change happens in a file you can read. When a prototype gets built or scrapped, the commit history shows it. There's no separate "internal truth" that gets simplified into a keynote later — the repo *is* the truth, and it's the same one the team is working from.

## Why this matters more for an MMO than for most games

A single-player game can hide in development for years and reveal itself once, fully formed, on launch day. An MMORPG can't really do that. It's a world other people are eventually going to live in, built on systems — combat, economies, world events, PvP rules — that only prove themselves once real players start pushing on them.

Building in the open means those systems get exposed to scrutiny earlier, while they're still cheap to change. If a life-skill progression path looks lopsided in a design doc, someone can say so months before it's implemented, not months after players are already annoyed by it in a beta.

It also means the project has to stay honest with itself. Vague plans don't survive being written down and put where anyone can read them. If a document just restates a marketing line instead of describing a real system, that's obvious the moment someone opens the file looking for specifics.

### What "open" actually covers right now

On [dream-online.net](https://dream-online.net) you'll find the current design pillars: real-time action combat, life skills as genuine progression rather than a side activity, a world that shifts on a schedule, and PvP that's dangerous but rule-bound. Those aren't slogans — they're direction statements pulled straight from the same documents in the repo, describing intent rather than finished features.

In the repository itself, you can see the prototype code as it exists today, the design documents behind each pillar, and the areas currently being worked on. None of it is polished for public consumption. That's the point — it's a working project, not a showroom.

## What "open" doesn't mean

It doesn't mean every internal note becomes public the moment it's written. Some end-game material and founder-specific plans stay out of the public repo until they're further along — that's a normal editorial boundary, not a contradiction of the open approach. Building in the open means the *process* is visible, not that every draft idea gets published before it's been tested against the rest of the design.

It also doesn't mean a launch date, a price, or a player count exists just because the project is public. None of those are set. The landing page says so directly, and it stays true here: this is early, pre-release work, and anything you read about it describes current direction, not a guarantee.

### No competitor comparisons, no hype cycle

One thing you won't find in the repo or on the blog is a running commentary on other MMOs, or the kind of "this changes everything" language that game marketing tends to reach for. The project has its own design pillars and its own pace. Comparing itself to other games line by line wouldn't make the systems any more real — building them would, and that's what the commits are for.

## How to actually use the repo if you're curious

You don't need to be a developer to get something out of it. The design documents under `docs/` are written in plain language, describing what each system is trying to do and why. If you want to see where the project stands at a glance, the README is the starting point, and the commit history shows what's actually landed recently versus what's still a plan on paper.

If you want a lighter-weight view, [dream-online.net](https://dream-online.net) tracks the same pillars in a more readable form, without the implementation detail. Either way, you're looking at the same underlying project — one is just the source, and the other is the summary.

## Following along

Watching the repository is the most direct way to see DREAM Online change over time — new commits, new design docs, and eventually, a first playable slice. If you'd rather support the work directly while it's still being built, backing is open on [Open Collective](https://opencollective.com/dream-online).

Star or watch [the repo on GitHub](https://github.com/Trollz1004/dream-online) to see the next update as it lands, not after it's been announced.
