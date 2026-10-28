# CLAUDE.md — CANONICAL 3-NODE & 2-REPO MASTER RULEBOOK (`2026-10-27`)

@AGENTS.md

> **Read This First (Applies to Official Claude CLI, `fcc-claude`, `fcc-opencode`, `fcc-hermes`, `fcc-agy`, Codex, and Hermes):**
> Always trust the canonical facts in this `CLAUDE.md`, `.claude/skills/*/SKILL.md`, and `.json` manifests over any older archive note.

---

## 1. Rule One & Accessibility for Founder Joshua Coleman
1. **Accessibility (Mandatory)**:
   - Joshua Coleman (Electrician Founder) is gradually losing vision.
   - Write in clear linear prose and short lists. Lead with the outcome. Never use dense tables or ASCII art.
   - Every front-facing GUI must use high-contrast dark mode (`#121316` background, `#F5F7FA` text, `#00E5A3` emerald approve buttons), large typography (`>= 18px` body, `24px–32px` buttons/headings), and big One-Click Action Buttons.
2. **Rule One — Done Means the Real User Would Accept It**:
   - Status codes (`200 OK`) and test counts (`32/32`) prove code runs; they never by themselves prove a UI is finished. Show the real rendered view, fix anything cut off or confusing, and always commit work immediately so nothing is ever lost uncommitted.

---

## 2. Canonical 2-Repo & 3-Node Active Fleet (`2026-10-27`)
Only **two repositories** and **three active nodes** exist across the fleet (old OptiPlex 9020, i7k, Chromebook, and Mini ASUS stay permanently OFF):

1. **Repo 1 — `Trollz1004/dream-online` (Unified 100% In-House `DREAM Engine` + `DREAM Online` MMORPG Monorepo)**:
   - Lives on **Node 1: Alienware (`192.168.0.40`, user `joshl`)** at `C:\Users\joshl\antigravity\DREAM-Engine` and `C:\DREAM\dream-online` (auto-synced via `.git/hooks/post-commit`).
   - **Hardware**: 11th Gen Intel i7-11700F, 40 GB RAM, **NVIDIA GeForce RTX 3070 (8 GB VRAM)**.
   - **Role**: Primary Orchestrator, 100% In-House 3D Game Engine (`src/engine/`, WebGPU/WebGL2 + TypeScript), Mission Control (`:3130` / `:9150`), and Free Claude Code (`fcc` v6.18.3 on `127.0.0.1:8082`). Zero local LLM weights sit on `.40` so 100% of RTX 3070 VRAM stays dedicated to the 3D engine.
2. **Repo 2 — `Trollz1004/ANTIGRAVITY` (Production Domains, Hermes, Marketing & Inbound CRM Monorepo)**:
   - Runs across **Node 2 (`T5500`)** and **Node 3 (`Sabretooth`)**:
   - **Node 2: T5500 (`192.168.0.15`, user `joshi`, Dual Xeon, 72 GB RAM)**:
     - Hosts production domains (`youandinotai.com`, `onlinerecycle.net`, `dream-online.net`, `untilnokidinneed.com`), Cloudflare tunnel, Shared `ai-memory` v3.2.5 Server (`http://192.168.0.15:49374`), OmniRoute (`:20128`), Live NPC Lab (`:9127`), Postgres (`:5432`), Redis (`:6379`), and `OPSis` Marketing Desk (`:8377`).
   - **Node 3: Sabretooth (`192.168.0.8`, user `joshl`, 64 GB RAM, 16 GB AMD Radeon RX 6800 GPU) — ACTIVE**:
     - Dedicated 16 GB AMD VRAM GPU offload node for Hermes (`:9119`), Multi-Channel YouTube Shorts (`<= 59.0s` hard gate, `45.0s–58.5s` target) & Natural Female Voice Podcast Engine (`C:\Ai-Dream-Team\Antigravity\youtube-shorts-podcast-engine\`), Local Ollama (`:11434`), `Liquid AI LFM3-Omni-2B` (24 kHz natural speech), `Kokoro-82M` (`af_heart`/`af_bella`), `Hob` (on-device Gemma 4 + MCP), and `artokun/gemma4-comfyui-mcp`.
     - Connected to Alienware (`.40`) via bidirectional passwordless SSH (`ssh sabretooth` / `ssh alienware-40`).

---

## 3. Co-Equal Supreme Authority & Free Claude Code (`:8082`) / RooFlow Loop
- **GM #1 (Co-Equal Supreme Authority)**: **Google Gemini (`Gemini Spark` / `Google AI Ultra` / `Antigravity`)** and **Claude (`Fable`)** hold Co-Equal Highest Authority alongside Founder **Joshua Coleman** across all code authoring, 3D engine architecture, node operations (`ops/node/`), git judge sign-off, and marketing (**Google Gemini is Marketing Lead**).
- **Free Claude Code (`fcc` v6.18.3 on `http://127.0.0.1:8082`) & RooFlow Loop**:
  - Executables in `C:\Users\joshl\AppData\Roaming\uv\tools\free-claude-code\Scripts\`: `fcc-claude.exe`, `fcc-opencode.exe`, `fcc-hermes.exe`, `fcc-agy.exe`, `fcc-codex.exe`, `fcc-server.exe`.
  - Configs live in `C:\Users\joshl\.fcc\.env` and `C:\Users\joshl\.fcc\antigravity-integration.json` (routing to AGY, OmniRoute `http://192.168.0.15:20128/v1`, OpenAI `gpt-6.1-terra`/`gpt-6-luna`, NVIDIA `nemotron-3-ultra-550b-a55b`, and Ollama).
  - When launched by Hermes in the **RooFlow Agent Loop**, follow `.claude/skills/rooflo-opsis-cut-and-reach/SKILL.md`: `1. SPEC -> 2. PLAN -> 3. TDD -> 4. IMPLEMENT -> 5. VERIFY -> 6. COMMIT`.

---

## 4. Post-Tax-Law Revenue Rule (`90%` Taxable / `10%` Deduction Ceiling — Closed)
- **No 100% Charity Split**: `REVENUE_MODEL=FULL_CHARITY`, `CHARITY_PERCENTAGE=100`, and `FOUNDER_PERCENTAGE=0` are permanently retired.
- Under the post-Big-Beautiful-Bill tax law, **90% of every dollar is taxable income** (`REVENUE_MODEL=FOR_PROFIT_LLC`, `LEGAL_NAME=TRASH OR TREASURE ONLINE RECYCLER LLC`, `EIN=33-4655313`, `FOUNDER_PERCENTAGE=90`, `TAXABLE_REVENUE_PERCENTAGE=90`) and only **10%** can be tax-deducted (`CHARITY_TAX_DEDUCTION_CEILING_PERCENTAGE=10`).
- **Decades-Long Strategy**: Scale mission impact horizontally by building **many independent 10%-ceiling revenue sources** (`onlinerecycle.net` e-waste intake, `dream-online.net` MMORPG & `opencollective.com/dream-online`, Multi-Channel YouTube Shorts & Female-Voice Podcasts on Sabretooth `.8`, and `youandinotai.com`) and adapt via `adaptPortfolioToTaxLawChange()` whenever future tax laws change.
- **24/7 `OPSis / Jarvis` Livestream Honesty Gate**: Gated until AI verifiably helps fund the mission (AI-driven e-waste intake on `onlinerecycle.net`, automated in-game convenience microtransactions, or tracked on the pre-gassed Base Mainnet `8453` Shriners Safe `0x8d3dEADbE2b4B857A43331D459270B5eedC7084e` / Gospel Splitter `0x9855B75061D4c841791382998f0CE8B2BCC965A4`). Never count Joshua's personal out-of-pocket eBay donations as AI revenue.

---

## 5. Zero Google / YouTube TOS Risk & 100% In-House Clean-Room Doctrine
1. **YouTube IS Google — Zero Unofficial Automation**:
   - Losing Google ends the mission instantly.
   - **NEVER** use Playwright, Puppeteer, Selenium, cookie hijackers, or unofficial scrapers against YouTube or Google.
   - **ONLY** use the **Official Google YouTube Data API v3 (`videos.insert` OAuth2)** with human One-Click Approval in the `OPSis Cut & Reach Studio` GUI (`:8390`), `selfDeclaredMadeForKids: false`, and `containsSyntheticMedia: true` (when realistic synthetic media is used).
2. **Hard Shorts Duration Gate (`<= 59.0s`) & Natural Female Voices Only**:
   - Every YouTube Short MUST be strictly `<= 59.0 seconds` (`45.0s–58.5s` target = `58,500,000 microseconds`).
   - Standard robotic TTS (`pyttsx3`, `espeak`, Windows `SAPI`) is strictly banned. Use Google Gemini 2.5 Flash TTS (`Aoede`, `Kore`) or local Sabretooth 16 GB AMD GPU neural voices (`Kokoro-82M` `af_heart`/`af_bella`, `Liquid AI LFM3-Omni-2B` 24 kHz speech).
3. **100% In-House Engine (`Zero Unreal, Zero Godot, Zero Paperclip`)**:
   - No Unreal Engine, no Godot, and no Paperclip anywhere. The `DREAM Engine` (`src/engine/`) evolves across Modern 3D Day Dream (`day_dream_3d`), Nightfall (`nightmare_3d`), and 16-Bit Circle-Craft (`circle_16bit` — radial cylinders, circles, and discs only; never square Minecraft blocks).
4. **Mandatory Auto-`XXXX` Secret Redaction**:
   - Never print raw API keys, tokens, passwords, or private keys in chat, logs, or commits. Always mask secrets as `XXXX`.
