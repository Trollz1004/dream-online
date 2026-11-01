# CLAUDE.md — CANONICAL 3-NODE & 2-MONOREPO MASTER RULEBOOK (`2026-11-01`, aligned with `v2026-10-26` Preferences)

@AGENTS.md

> **Read This First (Applies to Official Claude CLI, `fcc-claude`, `fcc-opencode`, `fcc-hermes`, `fcc-agy`, `fcc-codex`, Codex, Gordon, and Hermes `OPSis`):**
> Always trust the canonical facts in `C:\Users\joshl\OneDrive\claude-to-claude\CLAUDE-USER-PREFERENCES-v2026-10-26.md` plus the live state in this `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `AGENT.md`, `.claude/skills/*/SKILL.md`, and `.json` workflow manifests (`api.workflow.json`, `workflow_api.json`, `Agent Universal/agent-workflow-graphy.json`) over any older archive note.
> **Working Directory on Alienware (`.40`)**: Always use `C:\Users\joshl\antigravity\DREAM-Engine` (or `C:\DREAM\dream-online`, which auto-syncs via `.git/hooks/post-commit`). Never use `C:\DREAM` root directly as it is the parent folder, not the git repo.

---

## 1. Rule One & Accessibility for Founder Joshua Coleman
1. **Accessibility (Mandatory)**:
   - Joshua Coleman (goes by Josh, `joshlcoleman@gmail.com`, Sorrento FL, sole founder and operator of `Trash Or Treasure Online Recycler LLC`, FL `#L25000158401`, EIN `33-4655313`) is gradually losing his vision.
   - Write in plain complete sentences, outcome first, with short lists only when items are parallel. Never use dense tables, ASCII art, or arrow chains. Describe visuals in words.
   - Never explain electrical code or computer hardware to him — he is a self-taught commercial electrician who never failed an inspection and salvages/rebuilds machines from recycled parts, with 17+ years of eBay resale experience.
   - Never read the clock time of a message as a signal about his energy or tell him to rest. Hand him work he can pick up cold and run alone.
   - Every front-facing GUI must use high-contrast dark mode (`#121316` background, `#F5F7FA` text, `#00E5A3` emerald approve buttons), large typography (`>= 18px` body, `24px–32px` buttons/headings), and big One-Click Action Buttons.
2. **Rule One — Done Means the Real User Would Accept It**:
   - Status codes (`200 OK`) and test counts (`51/51`) prove code runs; they never by themselves prove a UI is finished. Show the real rendered view, fix anything cut off or confusing, and always commit work immediately so nothing is ever lost uncommitted.

---

## 2. Canonical 2-Monorepo (Besides Standalone `Misses Trollz`) & 3-Node Active Fleet
Every node has only a `C:` drive (`E:\clean`, `E:\ANTIGRAVITY`, and `F:\ANTIGRAVITY` are dead history). Besides the standalone **`Misses Trollz`** pediatric hospital app, the entire platform is consolidated into **two active monorepos** mapped to **three continuously running repo-specific nodes**:

1. **Monorepo 1 — `Trollz1004/dream-online` (Unified 100% In-House `DREAM Engine` + `DREAM Online` MMORPG & Editor Game Monorepo)**:
   - Lives on **Node 1: Alienware Aurora R12 DESKTOP (`192.168.0.40`, user `joshl`, 2.5 Gb Killer E3100G Ethernet)** at `C:\Users\joshl\antigravity\DREAM-Engine` and `C:\DREAM\dream-online` (auto-synced via `.git/hooks/post-commit`). The legacy glitched `NSFW_BOTS` Windows profile has been 100% removed (`Win32_UserProfile` and `C:\Users\NSFW_BOTS` deleted).
   - **Hardware**: 11th-Gen Intel i7-11700F, 40 GB RAM, 1 TB M.2 NVMe SSD, **NVIDIA GeForce RTX 3070 (8 GB VRAM — the fleet's only CUDA)**.
   - **Role**: Primary Orchestrator, 100% In-House 3D Game Engine & Editor (`src/engine/`, WebGPU/WebGL2 + TypeScript on `:20128`; zero Unreal, zero Godot, zero Unity, zero Paperclip), browser MMORPG served from `dream-online.net` with own checkout (no Steam/console/app-store storefront), Free Claude Code (`fcc` v6.18.3 on `http://127.0.0.1:8082/admin` launched via signed Python 3.14.10 in `ops/node/boot-alienware-services.ps1`), OPSis Cut & Reach Studio (`:8390`), Hermes Leadgen (`:8392`), Live NPC Lab (`:9127`), DreamOps Bridge (`:9133`), and Obsidian Local REST API (`:27123`).
2. **Monorepo 2 — `Trollz1004/ANTIGRAVITY` (`C:\ANTIGRAVITY` on `.15` & `C:\Ai-Dream-Team\Antigravity` on `.8`, branch `main`)**:
   - **Node 2: T5500 — THE BUSY NODE (`192.168.0.15`, user `joshi`, Dual Xeons, 72 GB registered ECC RAM, GTX 1050 Ti 4 GB, 512 GB SATA SSD)**:
     - Runs Fable's House, **Mission Control on `:3130`** (`http://192.168.0.15:3130/live`, scheduled task `"ANTIGRAVITY Mission Control"` executing `C:\ANTIGRAVITY\mission-os\server.mjs` and logging to `C:\ANTIGRAVITY\logs\mission-os.log` — **NOT on `:9150` and NOT called `JARVIS`**), OmniRoute (`http://192.168.0.15:20128/v1`), Shared `ai-memory` v3.2.5 (`http://192.168.0.15:49374`), Live NPC Lab (`:9127`), Postgres (`:5432`), Redis (`:6379`), Odysseus, the `:3200` tunnel, and the Date App local dev frontend (`:3200`).
   - **Node 3: Sabretooth (`192.168.0.8`, user `joshl`, 16 GB AMD Radeon RX 6800 GPU — DirectML/Vulkan, never CUDA — 1 TB SATA SSD, 64 GB RAM)**:
     - Configured with bidirectional SSH (`ssh sabretooth` / `ssh alienware-40`), Local Ollama (`:11434`), Hermes `OPSis` (`:9119`), HermesLeadGen GUI (`:8392`), Free Claude Code (`:8082/admin`), `Liquid AI LFM3-Omni-2B` (24 kHz speech), `Kokoro-82M` (`af_heart`/`af_bella`), `Hob`, `artokun/gemma4-comfyui-mcp`, and the Multi-Channel YouTube Shorts (`<= 59.0s`) & Natural Female Voice Podcast Engine (`:8391` in `C:\Ai-Dream-Team\Antigravity\youtube-shorts-podcast-engine\`).
   - **Hermes Naming & Access**: Hermes is called **`OPSis`, never `JARVIS`**. Josh reaches each node's Hermes through its own Telegram bot from his phone (one bot per node, approvals off on purpose). Config per node lives at `C:\Users\<user>\AppData\Local\hermes\config.yaml`. Never spell any user account `"Joshc"`.

---

## 3. Graphy AI Codebase Sync & Search + One-and-Only-One `$5/mo` Synced Obsidian Vault
1. **Graphy for AI Codebase Sync, AST Search, and Repo-Specific Node Routing (`api.workflow.json`, `workflow_api.json`, `memory/obsidian-vault/Agent Universal/agent-workflow-graphy.json`, `/api/graphy/codebase`)**:
   - Every AI agent (`Claude`, `Gemini`, `Codex`, `Gordon`, `Hermes OPSis`, `Free Claude Code :8082`) uses **Graphy** to search, audit, and synchronize code across the repo-specific nodes so duplicate files are never created:
     - **Codebase AST & Dependency Graphy (`http://127.0.0.1:20128/api/graphy/codebase` & `graphify-out/graph.json`)**: Indexes every module, symbol, API route, and test in the repository for deterministic AI codebase search and duplicate-file auditing.
     - **Workflow & Node-Routing Graphy (`api.workflow.json`, `workflow_api.json`, `memory/obsidian-vault/Agent Universal/agent-workflow-graphy.json`)**: Maps skills, agent profiles, ports, and git branches to their exact repo-specific node (`.40` Alienware -> Unified Game Monorepo `Trollz1004/dream-online`; `.15` T5500 & `.8` Sabretooth -> Platform Monorepo `Trollz1004/ANTIGRAVITY`).
2. **One and Only One `$5/mo` Synced Obsidian Vault (`Antigravity` — `1 GB` Cap) with Separated Node/Agent Locations**:
   - Founder Joshua Coleman pays **`$5/mo` for 1 and only 1 Obsidian Sync remote vault** (`1 GB` cap — never create a second paid vault and never store `.zip` archives inside the vault).
   - Each node mounts its local vault folder (`C:\DREAM\Antigravity` on Alienware `.40`, `C:\ANTIGRAVITY\Antigravity` on T5500 `.15`, `C:\Ai-Dream-Team\Antigravity` on Sabretooth `.8`, mirrored to `memory/obsidian-vault/` in git), and **all three nodes sync into that same 1 and only 1 `$5/mo` remote vault**.
   - Inside that single synced vault, each node and each AI agent writes to its own **separated subfolder and file location** (`Alienware/<agent>-to-<agent>.md`, `T5500/<agent>-to-<agent>.md`, `Sabretooth/<agent>-to-<agent>.md` — e.g., `claude-to-claude.md`, `gemini-to-gemini.md`, `codex-to-codex.md`, `gordon-to-gordon.md`, `hermes-to-hermes.md`, plus `memory-graph/` and `Agent Universal/`) so agents never overwrite each other or create duplicate files, backed up automatically to Shared `ai-memory` (`http://192.168.0.15:49374`, `scope='global'`), OpenViking, Supabase, and Supermemory.

---

## 4. Co-Equal Supreme Authority, `Trust Level Max` Judges & Free Claude Code (`:8082`) / RooFlow Loop
- **Authority, `Trust Level Max` Judges & Lanes**:
  - **Founder Joshua Coleman** is sole human authority over every node, repo, and agent.
  - **`Trust Level Max` (`Opus 5.5 / Fable` and `Gemini 4 High Reasoning`)**: By direct ruling of Founder Joshua Coleman (`2026-10-28`, trusted from day one across nearly 2 years), **`Opus 5.5 / Fable`** and **`Google Gemini 4 High Reasoning` (`Gemini Spark` / `Google AI Ultra`)** hold **`Trust Level Max` (`100%` Judge, Approval, & Outbound Email/Partner Execution Authority)** to judge what is used or not used, approve the work of all other AI platforms (`Emergent`, `Musa`, `Gordon`, `Hermes OPSis`, `Free Claude Code`, `OpenCode`, `Codex`), and send partner/outreach emails directly on his behalf (with the hard rule that nothing costs money until he says finalize).
  - **Token Policy**: Real Claude usage cap is the scarce resource — never introduce an `ANTHROPIC_API_KEY` anywhere. Use `agy`, `Gemini`, `Codex`, `fcc-claude` / `fcc-opencode` (`http://127.0.0.1:8082/admin` backed by OmniRoute `http://192.168.0.15:20128/v1` and `ollama.com/joshlcoleman`) for mechanical implementation.
  - **When launched in the RooFlow Agent Loop**: Set working directory to `C:\Users\joshl\antigravity\DREAM-Engine` and follow `.claude/skills/rooflo-opsis-cut-and-reach/SKILL.md`: `1. SPEC -> 2. PLAN -> 3. TDD -> 4. IMPLEMENT -> 5. VERIFY -> 6. COMMIT`.

---

## 5. The Date App (`youandinotai.com` / `youandinotai.online`), Payments, DAO & Multi-Stream Revenue
1. **THE DATE APP (`youandinotai.com` / `youandinotai.online`) IS NOT FOR SALE — IT IS MARKETING**:
   - The earlier sale listing is **CANCELLED**. `youandinotai.com` is **LIVE, ACTIVE, and NOT FOR SALE** — it is meant to be **MARKETING**.
   - **Where It Actually Runs**: The production backend runs on **Google Cloud Run** behind `api.youandinotai.com` (database, Redis, and Square all connected; `.env.production` points `VITE_API_URL` there). Port `:3200` on T5500 is only a local dev copy of the frontend.
   - **Payments & Revenue — CLOSED (`docs/PAYMENTS-TRUTH.md`)**: Verified and closed. Never re-audit, re-verify, question payments, or repeat old payment stories. Never put private customer names or merchant account mappings into repo files.
   - **Affiliates**: **Emergent** markets the app via affiliate links at **50%** (`Link Forge` / `affiliate-partners.json`, isolated strictly to `18+ Adults Only` Date App surfaces).
2. **Post-Tax-Law Revenue Rule (`90%` Taxable / `10%` Deduction Ceiling — Closed)**:
   - `Trash Or Treasure Online Recycler LLC` (`FL #L25000158401`, `EIN 33-4655313`) is a straight for-profit business (`REVENUE_MODEL=FOR_PROFIT_LLC`, `FOUNDER_PERCENTAGE=90`, `CHARITY_TAX_DEDUCTION_CEILING_PERCENTAGE=10`). Scale over the decades by multiplying independent 10%-ceiling revenue sources (`onlinerecycle.net`, `dream-online.net`, YouTube Shorts/Podcasts on Sabretooth `.8`, and `youandinotai.com` marketing/affiliates/subscriptions) and adapting via `adaptPortfolioToTaxLawChange()`.
3. **THE DAO (Never Ruled Out)**:
   - Target is a **Wyoming DAO LLC** keeping **51% control**, with a token sale of up to **49% of roughly 2.5M tokens**, so a smart contract enforces a commitment in code after Josh is gone. The family trust for his brother and niece is a legal document for an attorney, never software.
4. **Mission & Charity Wording Rule**:
   - Barred from public-facing customer surfaces and public repos (`#TeamClaudeForLife` and `CLAUDE's N Joshua's` stay on front-facing surfaces). Customer-facing copy sells product value only: membership, verification, support, safety, uptime, matching quality, account access, and convenience.

---

## 6. AI Team Standards, Founder-in-the-Loop Authority & In-House Product Doctrine
1. **YouTube IS Google — Zero Unofficial Automation**:
   - Never use Playwright, Puppeteer, Selenium, or unofficial scrapers against YouTube or Google. Only use the **Official Google YouTube Data API v3 (`videos.insert` OAuth2)** with human One-Click Approval in `OPSis Cut & Reach Studio` (`:8390`).
2. **Hard Shorts Duration Gate (`<= 59.0s`) & Natural Female Voices Only**:
   - Every YouTube Short MUST be strictly `<= 59.0 seconds` (`45.0s–58.5s` target). Standard robotic TTS (`pyttsx3`, `espeak`, Windows `SAPI`) is strictly banned; use Google Gemini 2.5 Flash TTS (`Aoede`, `Kore`) or Sabretooth 16 GB AMD GPU neural voices (`Kokoro-82M` `af_heart`/`af_bella`, `Liquid AI LFM3-Omni-2B` 24 kHz speech).
3. **Mandatory Auto-`XXXX` Secret Redaction**:
   - Never echo or print raw API keys, tokens, passwords, or env values in chat, logs, or commits. Always mask secrets as `XXXX`.
