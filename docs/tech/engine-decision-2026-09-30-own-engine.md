# Engine decision record: DREAM builds its own engine

Written by the Claude judge lane on the Alienware node on 2026-09-30, in
session, at Joshua's explicit direction. This record supersedes
`engine-decision-2026-09-20.md` under that record's own fourth revisit
condition: the founder makes the call in a session as a new decision record.
The earlier record stays on disk as history.

## Joshua's words, 2026-09-30

He wants his own game maker, seriously. No more "I can't because" from an
engine someone else controls. He will build his own everything. A real dream is
an ever-evolving world that we control and do not depend on another for. Gemini
in AI Studio builds it, Google hosts it, and AI Studio pushes it to the
repository, the way the screen saver of an earlier app was built and hosted.
Claude works alongside Gemini in the browser as a cofounder, not as a spectator.

## The decision

DREAM ONLINE builds on **DREAM Engine**, its own runtime, and **DREAM Maker**,
its own browser editor, both in TypeScript, both owned outright. The brief is
`docs/handoffs/GEMINI-DREAM-ENGINE-2026-09-30.md`; the code lives in a new
repository, `dream-engine`, created and synced by AI Studio.

- Client: a WebGPU renderer with a WebGL2 fallback, written from the platform
  APIs. No third-party engine or framework in runtime code.
- Server: Node, zero runtime dependencies, authoritative, one shared world.
- Editor: browser, scenes as JSON in git, play in place.
- Delivery: runs in AI Studio's free preview, one stage at a time, synced to
  GitHub. Nothing is published or deployed until Joshua says finalize (his
  ruling the same afternoon: that step costs money and is his own, last).

## What the options were and why this one won

Three real options were scored against the constraints that bind here: does it
ship, can an agent build it without a human clicking, can Joshua see it, does
it need a compiler this box does not have, does it lock us in.

1. Fork Godot (MIT). Full control of the code, but every engine change is a
   C++ build on a box with no compiler, and the editor still needs clicking.
   Lost on the compiler and the clicking.
2. A from-scratch C++ or Rust engine. Owned outright, but the same compiler
   problem, months before a frame, and AI Studio does not build it. Lost on
   time and tooling.
3. A TypeScript engine on WebGPU, built by Gemini in AI Studio, hosted by
   Google. Text end to end, agents write and test it, Joshua opens a link, no
   compiler, no lock-in, and AI Studio's own shape (React client, Node server,
   GitHub sync, Cloud Run deploy) matches it exactly. Won.

Unreal stays parked, not deleted, for cinematics and reference only, as before.

## The one risk, named plainly

An engine is a bigger build than a game. The way this stays honest is that
every stage ends with something on a hosted screen, Stage 1 must match the
Godot slice that already runs, and the Godot slice stays the public demo until
the judge lane has seen the new engine beat it. Nothing is deleted on the way.

## What stays true

- The spine is engine-agnostic and unchanged: the world-event envelope, NPC
  profile contracts, Live NPC Lab, DreamOps Bridge. It plugs into Stage 3.
- The originality rule, the licence rule, no secrets, no competitor names,
  world-native words, nothing paid sells combat power, Sup@ only on the
  signed-in Claude CLI.
- Judges are Claude and Codex. Gemini pushes only to `dream-engine` through
  AI Studio's sync and never to `dream-online`.

## For any lane reading this later

Do not re-argue the engine. The answer is: DREAM Engine, staged, hosted, one
link per stage, Godot slice as the demo until Stage 1 is verified on screen.
