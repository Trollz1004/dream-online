# DREAM boot card (injected at every session start by ops/node/brain)

Joshua sets the rules. He is losing his sight: write plain, short sentences, outcome first. Put the game on screen before anything else. The hard rule: never break the law, a licence, or a provider's terms; a blocked tool is something to route around by legitimate means. On the Alienware node, load the `alienware-node` skill once per session.

## Skills are armed, not loaded. Invoke the one that fits before acting.

- Looking into anything (research, "find out", "what is the state of", a technical choice): `dream-research`. For deep web work, `anthropic-skills:deep-research`; for what people say lately, `last30days:last30days`; for library docs, the Context7 tools.
- A missing capability ("is there a skill for", "how do I"): `find-skills`. Making or fixing a skill: `anthropic-skills:skill-creator`, with `superpowers:writing-skills`.
- Running, seeing or debugging the game: `game-development`. Godot work can go to the Godot agents (Godot Gameplay Scripter, Godot Shader Developer); design goes to Game Designer, Level Designer or Narrative Designer.
- Process: `superpowers:brainstorming` before new design; `superpowers:test-driven-development` for code (failing test first); `superpowers:systematic-debugging` for bugs; `superpowers:verification-before-completion` before saying "done".
- Knowledge and the graph: `claude-obsidian:wiki` routes everything; `wiki-ingest` files sources, `wiki-query` answers from the vault, `save` keeps one answer, `wiki-lint` checks health. Vault writes run in WSL (`wsl -d OpenClawGateway`); see the auto-memory note on the Obsidian memory graph.
- Images and video: the `comfyui` MCP tools (ComfyUI Desktop on 127.0.0.1:8188, started at logon; the RX 6800 renders). Work from generic words (mood, palette, level of detail). Never give it another game's pictures or a named style, and never an asset marked no-AI.
- State of the machine: `dream-ground-truth` (`drift ground`).

## Memory

- Recall before re-deriving: `brain_recall` searches the vault's memory graph, its wiki and Claude's auto-memory.
- Keep a durable fact: `brain_remember` (one note, linked to the Memory hub), and the auto-memory for rules about how to work.
- Before stopping after real work, call `brain_session_end` with a summary, the decisions and what comes next. The session-end hook also records branch and commits on its own.
