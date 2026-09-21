# Asset licensing: what may go into the game, and what may not

Read this before using any asset, model, texture, sound or template in DREAM
ONLINE. It is short on purpose.

## The two rules

**Nothing paid.** No lane buys anything. Free tools and free assets only. Godot is
free and MIT licensed, which is why the toolchain costs nothing to keep.

**Free of charge is not free to use.** Price and licence are different questions.
An asset that costs nothing can still be licensed in a way that forbids what this
project wants to do with it. Read the licence line, not the price.

## The restriction that bites hardest here

Some content on Fab is marked **"UE-Only Content — Licensed for Use Only with
Unreal Engine-based Products"**. That licence permits use only in a product built
on Unreal Engine. It does not permit use in a Godot game.

DREAM's engine is Godot (`engine-decision-2026-09-20.md`). So UE-only content
cannot ship in the game, however free it was and however much of it is already on
this machine.

Verified on 2026-09-21: **City Sample carries that UE-only label.** All 112 GB of
it that sits in the launcher's vault cache is therefore out of bounds for the Godot
client. It stays on disk because it is still legitimate for Unreal work, and the
engine decision record allows Unreal for cinematics, marketing visuals and
reference exploration at any time.

Treat anything whose Fab seller is **Epic Games** as UE-only until its own listing
is read and says otherwise. Epic-owned content is the category that carries this
restriction; the same has historically applied to MetaHumans, Quixel Megascans and
the Paragon assets. Most third-party Fab listings are not restricted this way, but
that is a per-listing fact, never an assumption.

## The other flag, and where to read it

Fab listings also carry an "Allows usage with AI" line. The Epic launcher stores it
as `is_ai_forbidden` in `FabLibrary\listings_v1.db`, so it can be read from disk
without visiting the site (the Fab web listing answers this machine with HTTP 403).
A listing flagged there is never given to a generator by any lane.

As read on 2026-09-21: Action RPG and ArchViz Template Lite are flagged 1, meaning
no. Content Examples is flagged 0.

## What is safe to build on

- Godot itself, and anything under a permissive licence (MIT, Apache 2.0, BSD).
- CC0 and public-domain assets, which carry no engine restriction at all. This is
  the right source for stand-in characters and props while DREAM's own art is made.
- Anything DREAM makes for itself, which is the direction anyway under the
  originality rule in `docs/gdd/08-day-dreams-night-dreams-world.md`.

## Before using anything, answer these

1. What is its licence, in its own words?
2. Does that licence restrict which engine it may be used in?
3. Does it forbid use with a generative model?
4. Does it allow the finished game to be given to players?

If any answer is unknown, it is not cleared, and a lane says so rather than
guessing.
