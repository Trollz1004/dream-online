# Engine decision record: Godot now, Unreal on defined revisit terms

Drafted by the Hermes lane (Aside) at Joshua's direction after he raised the engine question again, and judged, corrected and merged by the Claude judge lane on 2026-09-21. Status: standing. It matches what the dispatch already said and what the repository already contains.

The judge lane's corrections are named here rather than made silently, because a record that future sessions read as settled should show where it was wrong: the reason the Unreal toolchain is missing was stated as a founder rule and is not one (see "Why Godot", point 2), and the description of the founder's own use of reference material was moved out of this public file and left where it was recorded.

Purpose: one file every future session reads, so the engine question is answered once with reasons instead of relitigated by every lane with an opinion.

## The decision

DREAM ONLINE builds on **Godot 4.7.2** until the revisit conditions below are met. Unreal Engine 5.8 stays parked, not deleted, with City Sample and the other Unreal projects kept on disk. The server spine (world-event envelope, NPC profile contracts, the buzz/world bus, Live NPC Lab, DreamOps Bridge) stays engine-agnostic in both engines, so the client remains a swappable renderer.

## Why Godot from the start of real gameplay

1. The brain is not in the client. Joshua's stated vision, 2026-09-20: one seamless open world, no loading screens, every NPC a single persistent profile (memory belongs to the character, never the player), all NPCs coordinating through the buzz, AI platforms watching the event stream and planning events and responses, text generated fresh so no NPC ever repeats canned lines. Every part of that lives on the server and the nodes, in the Node services and the AI platforms. The engine only draws it. Switching engines changes none of it.
2. The Unreal path stalled on record, not on opinion. There is no C++ compiler on this box. Joshua approved installing one on 2026-09-19 at about 23:45 EDT, in his own words, telling the lane to install what was needed; the install was then refused by Claude Code's own permission classifier, not by any rule of his. The command has been handed to him to run himself and is still waiting. No founder rule blocks it, and no future lane should say one does. And Blueprints cannot be authored by agents: the engine's own `BlueprintEditorLibrary` exposes graphs and variables but no node creation and no pin connection, checked in the engine source. Unreal gameplay today means the only human, who is losing vision, hand-wiring logic in an editor.
3. Godot produced the first playable in days. The combat slice (dash with invulnerability frames, attack chain, telegraphed dummy, perfect dodge writing a world event) exists, runs in a window and in a browser on port 8099, and passes 87 of 87 headless checks, all written as text with nothing for anyone to click.
4. Browser delivery matches the growth plan. The web build runs on a plain static host with no install, which serves crowdfunding and showing the game anywhere. Unreal's browser story is streamed video from render servers, which is not a realistic standing cost for this project.

## What is conceded about Unreal, honestly

Unreal is the industry engine for seamless photoreal open worlds, and it is where a large-scale seamless DREAM world most plausibly lands long term. Godot has never shipped an MMO-scale seamless world; Unreal has shipped several. No-limits photoreal night city and World Partition are real Unreal advantages. That is why Unreal is parked with its assets intact, not deleted. This record does not claim Godot is the better engine forever; it claims Godot is the only engine that produces playable DREAM work under today's constraints.

## Revisit conditions (all must be true)

- The world-scale milestone: the game needs a seamless world bigger than Godot's streaming has been proven to handle, with the funding to build it.
- The Visual Studio toolchain is installed and someone other than Joshua can do editor-facing work (a team, or the toolchain gap is closed).
- The spine is done and stable: the buzz, NPC profiles, and event contracts are running and proven, because that is what makes a client swap cost weeks instead of a rebuild.
- Joshua makes the call explicitly, in a session, as a new decision record superseding this one.

A partial switch is allowed without reopening the engine question: Unreal may be used for cinematics, marketing visuals, or reference exploration at any time, with nothing generated there entering the public repository and every output judged under the originality rule.

## What stays true in any engine

- The originality rule, in Joshua's words of 2026-09-20 ("def very important"): DREAM makes its own styles and takes no copyright risk over anything. No copying or tracing another game's designs, no reference picture into this repository or the game project, nothing marked "Allows usage with AI: No" ever fed to a generator, and words only as the input a lane uses (mood, palette, level of detail, silhouette weight). A founder amendment covering his own personal use of reference material is recorded in the drop box and stays there; it is his to make and it changes nothing a lane does.
- No secrets, no competitor name drops, nothing paid selling combat power.
- No player-facing sandbox jargon; the world's own words (Nightfall, Nightmare Class, DREAM Class, Storage Runner, Market Runner, NEEDs).
- Combat and world rules stay plain data and geometry so they can run server-side, where invulnerability must be decided anyway.

## For any lane reading this later

Do not re-argue the engine in dispatches or handoffs. If you believe the revisit conditions are met, say which one and how, addressed to Joshua. Otherwise the answer is: Godot now, Unreal parked, spine engine-agnostic, City Sample on disk.