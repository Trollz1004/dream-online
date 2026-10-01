# AGENTS.md — the T5500 (the House, marketing desk)

This file is written to `C:\DREAM\AGENTS.md` on the T5500 by `Bootstrap-T5500.ps1`
(the `WriteAgentsFiles` step), from this template. `CLAUDE.md` and `GEMINI.md`
next to it are one-line pointers (`@AGENTS.md`); edit this file, not them.

## The seat

The T5500 is the marketing desk and nothing else. It runs no local models and
holds no game code, no game assets, and no provider API keys of its own
beyond what a signed-in CLI or a Hermes profile needs to operate. Development
work, the game itself, and anything that touches `C:\DREAM\dream-online\ops\node`
belong to the Alienware node, not here.

## The lanes present on this machine

- **Hermes, running the `marketing` profile, answering to the display name
  OPSis.** OPSis is the Hermes operator for this desk. Its gateway listens on
  this machine's LAN address, port 8377, so the Sabretooth operator can
  control it as a peer (`hermes peer add t5500 --url http://<this machine's
  LAN IP>:8377 --key <API_SERVER_KEY>`, the key read from
  `%LOCALAPPDATA%\hermes\profiles\marketing\.env` and never pasted into chat
  or committed anywhere). OPSis's own sub-agents route through OmniRoute
  (`http://192.168.0.8:20128/v1` on Sabretooth); OPSis itself runs on Nous
  Portal, never a bare API key.
- **Grok**, **Emergent**, the **Aside** browser agent, and **Muse** run
  marketing work from this desk alongside OPSis: campaign copy, social
  content, outreach drafts, research, and anything else that serves DREAM
  ONLINE's public-facing presence.
- **Claude Code** is the judge lane when Joshua opens it here. It is not
  resident on this machine the way OPSis is; it shows up for review, for
  publishing decisions, and for anything that needs push-and-merge
  authority, the same role it holds on the Alienware node and in the
  `dream-online` and `hermes` repos.

## What is never done on this desk

- No game development, no engine work, no gameplay code. That is the
  Alienware node's job (`C:\DREAM\dream-online`, Godot 4.7.2).
- No local models and no local inference. `local_runtime.enabled` stays
  `false` in every profile on this machine.
- No provider API keys stored on this node outside a signed-in CLI's own
  credential store or a Hermes profile's `.env`. Nothing gets typed into a
  chat, a commit, or a file under source control.
- No publishing — no public post, no public page, no release — without a
  judge lane's review. A marketing lane drafts and proposes; Claude Code (or
  Codex, when assigned) approves before anything goes out under DREAM
  ONLINE's name.
- Nothing here edits `C:\DREAM\dream-online\ops\node`. That directory is the
  Alienware node's protected runbook and journal, edited only by the Claude
  judge lane on that machine.

## Control from Sabretooth

The Sabretooth operator reaches this desk's Hermes profile the same way any
Hermes peer reaches another: `hermes peer add t5500 --url
http://<this machine's LAN IP>:8377 --key <API_SERVER_KEY>`. From there it
can message OPSis and its agents the way it would any other peer profile.
This machine does not reach back into Sabretooth's or the Alienware node's
own protected material; the peer relationship is Sabretooth controlling
OPSis, not the reverse.

## Project language

Use the same player-readable terms as the rest of DREAM ONLINE's public
language: live-world open-world MMO, action combat, life skills,
player-driven marketplace, Nightfall, Nightmare Class, DREAM Class, Storage
Runner, Market Runner. Avoid direct competitor name drops, real-world brand
names for in-game systems, sandbox jargon in player-facing copy, and
classified OneDrive plot material. See `dream-online/AGENTS.md` for the full
rulebook this desk's output has to answer to before anything publishes.
