Hello Gemini. This is Joshua's DREAM ONLINE project. Please read this whole message before you answer, and do not build or change any code in this turn. I want answers and a plan first.

Start from a clean slate. No DREAM Engine stage has been accepted yet, so treat this as the beginning.

## Part 1. Your world model, and what we may use from it

I have seen a world made by Google's world model (Project Genie, for Google AI Ultra subscribers). It ran for about 60 seconds and looked more real than anything I have played on top-end hardware. Please answer each of these questions with yes, no or "it depends", then one sentence of explanation, and link the exact Google terms or help page you are relying on:

1. What is Project Genie today, and how long can one generated world run?
2. Can I save or export a world as a video, and at what quality?
3. Who owns what Genie makes: me, Google, or both?
4. May I use a 60-second Genie clip in a public trailer for DREAM ONLINE, a game I plan to crowdfund and sell? Does it need a label such as "made with Google AI" or a watermark?
5. May I use Genie worlds as design reference for DREAM's own engine: layouts, lighting, mood, scale?
6. Can anything from a Genie world (terrain shape, textures, camera paths) go into our own engine as an asset, or only as reference?
7. What is not allowed with Genie output? List every limit that applies to a commercial game.
8. Can AI Studio Build talk to Genie in any way, or is Genie only its own app?

## Part 2. The DREAM Maker: the world designer we build in AI Studio

Once Part 1 is clear, we build the actual designer in AI Studio Build: a browser editor that can make the whole world, front to back and side to side. It feeds our own DREAM Engine (TypeScript, WebGPU with a WebGL2 fallback, no third-party engine), and scenes are saved as JSON.

The feel I am after is a huge, photoreal, live open-world action MMO. Think of the scale and detail of the biggest open-world fantasy MMOs and of the newest modern open-world crime-city games. That is only a mood reference. DREAM must have its own original look; do not copy any game's designs, buildings, characters or maps.

The world has two sides, and only the landscape changes between them:

- **Day Dreams**: old-world fields, farmland and villages, and wide open desert with dunes, canyons and heat haze.
- **Night Dreams**: a large living modern city at night, with streets, traffic, neon, rooftops and crowds.

The Maker must be able to:

1. Sculpt terrain and paint biomes (fields, forest, desert, coast, mountains, city ground).
2. Lay roads, rivers and city blocks, and place buildings, props and foliage at scale.
3. Set time of day, weather and the Day Dream to Night Dream switch.
4. Place NPCs, give each one a name, role, schedule and personality card, and attach quests.
5. Preview the world from a walking character and from a free camera.
6. Save and load the whole world as JSON that DREAM Engine reads.

The Maker's own screens (menus, panels, buttons, the HUD) follow the attached file `DREAM-SPACE-DESIGN-SYSTEM.md`, the House design system: Ink black ground, whites and greys, one Signal yellow accent, Space Grotesk and IBM Plex Sans, glass panels, a slow starfield background. That file is for the editor's interface only, not for the game world's look.

## Part 3. NPC brains: safe, tracked, no shortcuts

Every NPC's AI goes through OmniRoute, our own game-only gateway. These rules are fixed:

1. No provider key ever lives in the browser, the Maker or the game client. The client asks our server; our server asks OmniRoute.
2. Every NPC model call is made on a named account and logged, so all use is tracked.
3. Cloud models come first. My 1min.ai plan (Qwen) is the main one, and OmniRoute rotates fairly across providers so no single plan is overused.
4. If a local model is ever used, it is only an Ollama model on this machine named `joshlcoleman/<npc-name>`. Nothing else runs locally.
5. NPCs get game memories only. They have no code tools, no file access and no internet.

## Part 4. What I want back from you in this turn

1. Your answers to Part 1, each with its link.
2. A staged plan for the Maker (Stage 1, Stage 2, and so on), each stage with what I will see on screen and how we prove it works.
3. Anything in Parts 2 or 3 that you think is wrong, or that AI Studio Build cannot do, said plainly.

Do not publish, deploy or touch Cloud Run. The AI Studio preview is the only link until I say finalize.
