# claude-to-claude — T5500

Claude's own session memory on the T5500. Read at session start, append at session end. Format and rules: `docs/memory-layer/agent-workflow-graphy.json` → `memoryLayer.sessionProtocol`.

## 2026-10-17 10:42 EDT | node: T5500 | use case: agent-workflow-graphy.json roles + memory protocol

- Done: updated `Antigravity/Agent Universal/agent-workflow-graphy.json` to v1.3.0. T5500 is the only node. Alienware is dev only. Sabretooth isn't a node. Mission Control is JARVIS/OPSIS on :3130, not Paperclip; Paperclip is marketing only. Hermes is JARVIS on :9119, gets all support, and runs YouTube automation. OpenClaw is watchdog/sentry only. Obsidian is mandatory per-agent session memory; Supabase, Supermemory, OpenViking and Vercel are backups.
- Proven: JSON parses (PowerShell ConvertFrom-Json). Pushed to `main` as commit `7fe99cc7` (`docs/memory-layer/agent-workflow-graphy.json`, one file only, built on origin/main without touching the working tree).
- Open: local `C:\ANTIGRAVITY` main is 2 behind origin. Its `git pull` is blocked by untracked `content/yesterday-news/20261016/` (script.txt differs from origin). Left alone as someone else's work. The rest of this session's Obsidian file is mirrored to backups only once those MCPs are confirmed.
- Next: AGENTS.md still says Alienware is OFF until funding, which conflicts with "dev only". Joshua to decide.

## 2026-10-17 10:52 EDT | node: T5500 | use case: sync every session entry file to the 2026-10-17 rulings

- Done: added "Rulings of 2026-10-17" to AGENTS.md and CLAUDE.md, covering authority (Joshua only human, no AI commands another, judges review, not command), nodes, Mission Control/Paperclip, Hermes JARVIS/support/YouTube, OpenClaw only sentry, Obsidian memory, and entry files must agree. Amended the older Hermes node-watch and Alienware lines. Rewrote GEMINI.md. Fixed stale "Paperclip = Mission Control" and garbled MC5 ports in 10 skills. Landed the uncommitted 2026-10-15 rulings and the t5500-node skill.
- Proven: pushed to main as 6ed9555c (authority block in the workflow-graph JSON) and 982e2f9d (13 files). Built on origin/main with a temp index, so the working tree was untouched. Secret scan clean. Re-audit found no remaining "Paperclip = Mission Control" lines.
- Open: paperclip-ceo skill is gitignored, so its edit is local only. Hermes cron T5500 node watch still runs (turning it off is runtime, Joshua's call). No cloudflared.exe process visible to a non-elevated CIM query, so tunnel state is UNVERIFIED. Local main is behind origin, and its pull is blocked by untracked content/yesterday-news/20261016/. Other uncommitted skill edits (README, c-drive-workspace, dateapp-support-desk, skills.md, affiliate, gemini-perpetual-wheel) were left alone.
- Next: Joshua decides on the Hermes cron and the yesterday-news folder.

## 2026-10-17 11:42 EDT | node: T5500 | use case: payments record ruling in every entry file
- Joshua: past test charges keep becoming a blocker; put the payments record in every agent file.
- Added "Payments are settled: read docs/PAYMENTS-TRUTH.md, never re-test" to AGENTS.md, CLAUDE.md, GEMINI.md, graph v1.3.1 (paymentsRecord), 17 skills. Pushed 84b682a7 + 8e5f6ec3. Universal MCP pushed 48116462.
- Skipped (others' in-flight / untracked): dateapp-support-desk, gemini-perpetual-wheel, self-improving-system, affiliate-offer-of-offers, dateapp-growth-agent, product-copy, paperclip-ceo. ultracode-house already had it.
- Open: OneDrive claude-to-claude still denied to file tools (needs IDE reload + new chat); env sync + game .gitignore wait on that.

## 2026-10-17 13:06 EDT | node: T5500 | use case: mcp.youandinotai.com tunnel routing, watchdog/keepalive update, reboot readiness
- Joshua directive: route mcp.youandinotai.com to Paperclip, update watchdogs, sentrys, memory, skills, and confirm node is safe to restart.
- Cloudflare Tunnel ingress updated: `mcp.youandinotai.com` -> `http://127.0.0.1:3917` with `httpHostHeader: 127.0.0.1:3917`.
- AllowedHostnames updated in Paperclip config.
- `ops/t5500/keepalive.ps1`, `ops/t5500/verify-node.ps1`, and `.agents/skills/t5500-node/SKILL.md` updated and pushed to `main` (commit edf8e58d).
- All 3 repos (ANTIGRAVITY, misses-trollz, dream-online) strictly on 1 branch (`main`).
- Node is safe to reboot: keepalive and scheduled tasks bring up all ports, tunnels, and services automatically on boot.

## 2026-10-22 16:10 EDT | node: T5500 | use case: doctrine update
- Wrote Rulings of 2026-10-22 into CLAUDE.md, AGENTS.md, GEMINI.md, FCC-STATUS.md: any of Claude/Codex/Jules judges, GitHub rule is final gate; OmniRoute is a convenience not the gate; official lanes sign-in only (claude.ai, Antigravity extension + CLI, Claude in Chrome); keyed lanes (OpenRouter, free-claude-code, Ollama Cloud) keys in env/GitHub secrets only; free-claude-code allowed back as worker MCP under terms; Paperclip gone.
- Narrowed .claude/hookify.block-fcc.local.md to wrapper/bridge names.
- Open: AI Studio pushed GEMINI_SOUL.md + landing page straight to GitHub without review; send read-only review to Codex or Jules and check the repo's ruleset. Nothing committed this session.

## 2026-10-26 13:54 EDT | node: T5500 | use case: cross-node agent memory (ai-memory)

- Did: reviewed github.com/akitaonrails/ai-memory (MIT, Rust, zero-LLM default, git-backed markdown wiki, claim-once handoffs, supports Claude Code/Codex/Gemini/Antigravity/OpenCode/Pi/Grok/Kimi/OpenClaw/Hermes). Joshua said yes. Wrote proposal packet ops/packets/ai-memory-cross-node-2026-10-26/PACKET.md.
- Design: server on T5500 native Windows (Experimental upstream), LAN-only :49374, bearer token in env only, no tunnel. Obsidian stays primary; ai-memory = cross-node project memory + handoffs only. Native exe hooks only (PS fallback hooks skip capture-policy v1). 3-node pilot: Claude T5500 -> Gemini Alienware -> Hermes Sabretooth.
- DREAM Online: yes for dev repo memory; no for in-game NPC runtime (700 writes/s ceiling, no per-NPC isolation). Borrow its zero-LLM decay/compaction model for NPC episodic layer.
- Open: judge approval (Claude/Codex/Jules). Nothing installed. AGENTS.md has stale Sabretooth OFF lines vs 2026-10-23 ACTIVE.
- Next: on approval, install server on T5500, wire Claude first, run pilot, screenshots to Joshua.

## 2026-10-26 14:27 EDT | node: T5500 | use case: Joshua direction notes (Orca, Mission Control, cause stream)

- Orca (Stably AI multi-CLI ADE): NOT on T5500. Joshua: work on it on the dev node (Alienware) later, after the ai-memory pilot. Watch: per-task worktree branches vs one-branch rule; commit .ai-memory.toml so worktrees are captured.
- Mission Control (:3130) is mainly Gemini + marketing (Joshua, 2026-10-26).
- Future, Joshua's words paraphrased: one day stream AI helping a real cause, not for greed. Gate: a charity partner, OR proof of a donation made from what AI automates. His long-running personal eBay Giving Fund donations (via PayPal on eBay, ~20 years, recent too) do NOT count as that proof: AI never helped with eBay. Internal only; no public copy. Existing AGENTS.md partner rule still holds until Joshua says otherwise.
- ai-memory: LAN bind live (0.0.0.0:49374, allowed_hosts set, insecure-human-auth env accepted for home LAN), firewall rule added by Joshua (TCP 49374 from .40 and .8 only). Web user joshua created; temp password + bearer token in C:\ANTIGRAVITY\.env and OneDrive .env/.env.lowercase. Next: Alienware client.

## 2026-10-26 15:18 EDT | node: T5500 | use case: ai-memory pilot, Alienware client + NSFW removal

- Joshua permanently removed all NSFW/GrinDroid bot work from the fleet (agy on Alienware did it; archive offline in OneDrive DO NOT COMMIT TO GIT HUB). Recorded in ops/handoffs/GEMINI-NODES-2026-10-22.md.
- Alienware ai-memory client: installed by agy, v3.2.5 checksum ok, status authenticated to http://192.168.0.15:49374, allowlist mode, native hooks for antigravity-cli. Markers in 6 checkouts (3 are archive/vault copies: recommend removal).
- Judge notes on agy run: deviated from STOP rule by pulling the token from T5500 over SSH (not printed; outcome ok). Appended token to Alienware's OneDrive claude-to-claude .env, which has not synced since 10-19: conflict-copy risk when sync resumes; recommend reverting that append.
- T5500 known_hosts for 192.168.0.40 updated after fingerprint matched agy's on-box read (SHA256:bGTexZG8...). SSH from T5500 still fails auth: ssh config User=joshi but Alienware user is NSFW_BOTS (OS reinstalled 10/7). alienware_exec MCP is broken until fixed.
- Next: Sabretooth via agy, then 3-node handoff test.

## 2026-10-27 17:58 EDT | node: T5500 | use case: ai-memory pilot, Alienware leg (user joshl)
- Did: wrote one self-sufficient Gemini prompt for Alienware (ops/packets/ai-memory-cross-node-2026-10-26/AGY-ALIENWARE-MEMORY-PROMPT.md); old NSFW_BOTS user is deleted, joshl is fresh. Added t5500-admin.ps1 (self-elevating helper) but UAC elevation from the agent terminal fails ("request not supported").
- Proof (Gemini report, unverified by me except where noted): ai-memory 3.2.5 sha ok on .40, status authenticated to T5500, antigravity-cli hooks+MCP wired, markers in C:\DREAM\dream-online and C:\Users\joshl\antigravity\DREAM-Engine, doctor captured, briefing 0 handoffs, finalize-session run.
- Open: joshl pubkey (joshl@alienware-40) not yet in T5500 administrators_authorized_keys (sshd uses Match Group administrators, so user authorized_keys is ignored); needs admin on T5500 or the one-password step from Alienware. Gemini's section 7 (env split into env-game-dream-online.env / env-t5500-hermes-monorepo.env, env-inventory promoted, env backups purged) was out of scope; those files do NOT exist in T5500 OneDrive. C:\DREAM\unlock-ssh-and-sync-nodes.cmd not reviewed.
- Next: install joshl key, test ssh both ways, Sabretooth leg, then pilot handoff test.
