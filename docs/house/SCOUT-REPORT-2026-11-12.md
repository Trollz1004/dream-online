# Scout Report: 2026-11-12

Comprehensive repository audit, failed task analysis, and visual reference inventory for Founder Joshua Coleman and the Judge Lane.

---

## Part 1. Repositories Audit

A complete listing of all open pull requests and open issues across `Trollz1004/dream-online`, `Trollz1004/ANTIGRAVITY`, and `Trollz1004/dream-intake` using the authenticated GitHub CLI (`gh`).

### Repository: `Trollz1004/dream-online`
- Open Issues: 0 open issues.
- Open Pull Requests: 8 open pull requests.

#### PR #113: `research: picture-to-3D converter pipeline for DREAM Studio`
- Branch: `ai/inbox/research-image-to-3d-converter-for-studio`
- Author / Model: `gemini-4-argon` (engine lane)
- Files Changed (1):
  - `docs/tech/studio-converter-pipeline-study-2026-11-11.md`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: None (Engine headless suite and Local smoke checks passed; CodeRabbit review rate-limited).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Evaluates picture-to-3D converter pipelines (Tripo, Rodin, Hunyuan3D, Trellis, Meshy) to turn 2D character artwork into rigged 60 FPS PBR 3D models for DREAM Studio and the NEEDs shop.
- Flags: None.

#### PR #112: `feat(look): light, shadow, atmosphere and ground, pass 2`
- Branch: `ai/inbox/look-pass-2-light-shadow-ground`
- Author / Model: `gemini-4-argon` (engine lane)
- Files Changed (3):
  - `src/engine/scene/look-pass-2-light-shadow-ground.ts`
  - `src/ui/AaaVisualWorldCanvas.tsx`
  - `tests/look-pass-2-light-shadow-ground.test.ts`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: None (Engine headless suite and Local smoke checks passed; CodeRabbit posted 4 routine comments).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Adds quality presets (high, balanced, performance), a three-point mood lighting rig, procedural worn stone flagging PBR ground, gothic props, atmospheric haze, light shafts, and embers to the visual world canvas.
- Look Pass 2 Status: A PR exists (PR #112), but screenshots are NOT in it (no image files committed and no screenshots attached in the description or comments).
- Flags: None.

#### PR #111: `canon: rulings addendum of 2026-11-11`
- Branch: `ai/inbox/canon-rulings-addendum-2026-11-11`
- Author / Model: `gemini-3.8-flash` (mechanical lane)
- Files Changed (16):
  - `docs/DREAM-DISPATCH.md`
  - `docs/gdd/01a-first-15-minute-journey.md`
  - `docs/gdd/02-action-combat.md`
  - `docs/gdd/03-life-skills-economy.md`
  - `docs/gdd/04-pvp-flagging-durability.md`
  - `docs/gdd/05-day-night-economy-market.md`
  - `docs/gdd/10-crowdfunding-readiness.md`
  - `docs/gdd/10-wardrobe-catalogue.md`
  - `docs/gdd/12-wardrobe-needs-shop.md`
  - `docs/gdd/canon-lore-inhouse.md`
  - `docs/standards/ALIENWARE-SOUL.md`
  - `src/engine/combat/mold-breaker-classes-forge-pvp.ts`
  - `src/engine/combat/pet-shop.ts`
  - `src/engine/combat/skill-vfx.ts`
  - `src/ui/NeedsShopModal.tsx`
  - `tests/canon-lore.test.ts`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: None (all engine and smoke checks passed).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Updates design documentation, combat modules, pet shop systems, and wardrobe modal UI to incorporate recent rulings on durability, life skills, and lore.
- Flags: Touches `src/ui/NeedsShopModal.tsx` and `docs/gdd/12-wardrobe-needs-shop.md` (in-game virtual wardrobe convenience shop, but not external payment gateways).

#### PR #110: `Fix DreamOps false-green checkpoint selection`
- Branch: `codex/dreamops-unverified-checkpoints`
- Author / Model: `OpenAI Codex` (codex lane)
- Files Changed (5):
  - `game/server/dreamops-bridge/README.md`
  - `game/server/dreamops-bridge/package.json`
  - `game/server/dreamops-bridge/src/routes.js`
  - `game/server/dreamops-bridge/src/storage.js`
  - `game/server/dreamops-bridge/test/rollback.test.js`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: None (all checks passed).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Prevents DreamOps rollback planning from targeting unverified initial seed metadata checkpoints by requiring explicitly verified records.
- Flags: None.

#### PR #109: `fix(dashboard): model selector stays in the dock; stale text removed`
- Branch: `ai/inbox/dashboard-model-selector-and-stale-text`
- Author / Model: `gemini-3.8-flash` (mechanical lane)
- Files Changed (9):
  - `docs/screenshots/dashboard-selector/after-selector-closed.png`
  - `docs/screenshots/dashboard-selector/after-selector-open.png`
  - `docs/screenshots/dashboard-selector/before-selector-closed.png`
  - `docs/screenshots/dashboard-selector/before-selector-open.png`
  - `src/shell/index.ts`
  - `src/shell/workspaceConfig.ts`
  - `src/ui/AaaVisualWorldCanvas.tsx`
  - `src/ui/UnifiedAntigravityWorkspaceShell.tsx`
  - `tests/dashboard-selector.test.ts`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: None (all 211 tests passed, lint clean, secret scan clean).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Anchors the model switcher popover to the bottom composer chip so it opens upward without covering center cards, and removes unverified self-certifying badge text.
- Flags: None.

#### PR #108: `docs: approved C0D3X and Mollama visuals and verified recovery plan`
- Branch: `codex/c0d3x-mollama-visual-recovery-plan`
- Author / Model: `OpenAI Codex` (codex lane)
- Files Changed (1):
  - `docs/tech/c0d3x-world-recovery.md`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: None (all checks passed).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Documents the character design, companion llama mount specifications, and testing plan for the C0D3X and Mollama recovery addition.
- Flags: None.

#### PR #103: `docs: truth sweep dream-online public files and dream-online.net`
- Branch: `ai/inbox/truth-sweep-dream-online`
- Author / Model: `gemini-3.8-flash` (mechanical lane)
- Files Changed (30):
  - `.agents/skills/cli-anything-blender/SKILL.md`
  - `.claude/skills/rooflo-opsis-cut-and-reach/SKILL.md`
  - `GEMINI_SPARK_INSTRUCTIONS.md`
  - `HANDBACK.md`
  - `README.md`
  - `STATE.md`
  - `TASKS.md`
  - `adapters/README-DREAM.md`
  - `adapters/claude/README.md`
  - `adapters/codex/README.md`
  - `adapters/gemini/README.md`
  - `adapters/grok/README.md`
  - `adapters/hermes/README.md`
  - `adapters/ollama-local/README.md`
  - `adapters/pi/README.md`
  - `docs/DESIGN-INDEX.md`
  - `docs/gdd/archived-cleanroom-notes/README-handoff-2026-09-02.md`
  - `docs/house/SITE-BRIEF-youandinotai-com.md`
  - `docs/house/TOOLS.md`
  - `docs/tech/dreamops-bridge.md`
  - `docs/tech/local-prototype-ports.md`
  - `docs/tech/prototype-architecture.md`
  - `dreamforge/README.md`
  - `ops/node/skills/alienware-node/SKILL.md`
  - `ops/node/skills/rooflo-opsis-cut-and-reach/SKILL.md`
  - `scripts/obsidian/session-note.ps1`
  - `scripts/sync-all-harnesses-and-skills.ps1`
  - `specs/006-mission-control-jarvis/plan.md`
  - `specs/006-mission-control-jarvis/spec.md`
  - `specs/006-mission-control-jarvis/tasks.md`
- Merge Status: Mergeable (conflicts with main resolved via commit `bc12fcf`).
- Failing Checks: None (all 220 tests passed, lint clean).
- Judge Verdict: CHANGES NEEDED on 2026-11-10 due to unverified `[DONE]` tags in `TASKS.md` and giving/charity copy in `GEMINI_SPARK_INSTRUCTIONS.md`. Both findings were addressed in commit `bc12fcf` and the PR now awaits re-review.
- Plain Summary: Cleans up public markdown files, retiring old tool names and aligning descriptions with the public truth sheet and product-value-only guidelines.
- Flags: Touches skill files (`.agents/skills/cli-anything-blender/SKILL.md`, `scripts/sync-all-harnesses-and-skills.ps1`) and payment processor wording in `docs/house/SITE-BRIEF-youandinotai-com.md`.

#### PR #84: `smoke: lane check 2026-11-04 codex`
- Branch: `ai/smoke/2026-11-04-codex`
- Author / Model: `OpenAI Codex` (codex lane)
- Files Changed (1):
  - `docs/standards/LANE-SMOKE-TESTS.md`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: None (all checks passed).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Records a dated smoke test log entry for the OpenAI Codex executor lane on Alienware.
- Flags: None.

---

### Repository: `Trollz1004/ANTIGRAVITY`
- Open Issues: 7 open issues (all automated integrity review alerts).
  - Issue #381: `INTEGRITY [REVIEW]: Hermes MD/config modified by Trollz1004`
  - Issue #380: `INTEGRITY [REVIEW]: Hermes MD/config modified by Trollz1004`
  - Issue #378: `INTEGRITY [REVIEW]: Hermes MD/config modified by Trollz1004`
  - Issue #370: `INTEGRITY [REVIEW]: Hermes MD/config modified by Trollz1004`
  - Issue #355: `INTEGRITY [REVIEW]: Hermes MD/config modified by Trollz1004`
  - Issue #354: `INTEGRITY [REVIEW]: Hermes MD/config modified by Trollz1004`
  - Issue #343: `INTEGRITY [REVIEW]: Hermes MD/config modified by Trollz1004`
- Open Pull Requests: 5 open pull requests.

#### PR #383: `build(deps): bump pillow from 12.2.0 to 13.0.0 in /backend`
- Branch: `dependabot/pip/backend/pillow-13.0.0`
- Author / Model: `Dependabot`
- Files Changed (1):
  - `backend/requirements.txt`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: `code` (FAILURE).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Bumps Pillow from version 12.2.0 to 13.0.0 in backend requirements.
- Flags: None.

#### PR #382: `build(deps): bump pillow from 12.1.1 to 13.0.0 in /crm/backend`
- Branch: `dependabot/pip/crm/backend/pillow-13.0.0`
- Author / Model: `Dependabot`
- Files Changed (1):
  - `crm/backend/requirements.txt`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: `code` (FAILURE).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Bumps Pillow from version 12.1.1 to 13.0.0 in CRM backend requirements.
- Flags: None.

#### PR #377: `chore: scrub LAN addresses and a merchant email from public agent journals`
- Branch: `ai/inbox/scrub-agent-journals-antigravity`
- Author / Model: `gemini-3.8-flash` (mechanical lane)
- Files Changed (12):
  - `.agents/journals/claude-judge/STATE.md`
  - `.agents/journals/gemini-spark/STATE.md`
  - `.agents/skills/dateapp-payments-agent/paypal-rail/SKILL.md`
  - `domains/dateapp.chat/TRUST.md`
  - Additional journal and skill files across `.agents/`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: None (all checks passed).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Replaces private LAN IP addresses and a merchant email address with clean redacted placeholders across public agent journals and skill definitions.
- Flags: FLAGGED for touching `.agents/skills/dateapp-payments-agent/paypal-rail/SKILL.md` (payments skill) and secrets sanitization.

#### PR #375: `docs: truth sweep 1 of 3 - ANTIGRAVITY product-facing files`
- Branch: `ai/inbox/truth-sweep-antigravity-products`
- Author / Model: `gemini-3.8-flash` (mechanical lane)
- Files Changed (14):
  - `README.md`
  - `SECURITY.md`
  - `CHANGELOG.md`
  - `domains/youandinotai.com/README.md`
  - `domains/youandinotai.com/index.html`
  - Additional product doc files
- Merge Status: Mergeable (conflicts with main resolved).
- Failing Checks: `eslint-prettier-check` (FAILURE), `code` (FAILURE).
- Judge Verdict: Reviewed on 2026-11-10 as "Not judged yet: this branch conflicts with main." Conflicts were subsequently resolved via merge commit `5d83f85`, but CI checks remain failing.
- Plain Summary: Synchronizes public-facing documentation and marketing copy with the verified truth sheet for live products.
- Flags: Touches root repository security and configuration documentation.

#### PR #349: `chore(deps): bump oauthlib from 3.3.1 to 4.0.1 in /backend`
- Branch: `dependabot/pip/backend/oauthlib-4.0.1`
- Author / Model: `Dependabot`
- Files Changed (1):
  - `backend/requirements.txt`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: `eslint-prettier-check` (FAILURE), `js-tests` (FAILURE), `code` (FAILURE).
- Judge Verdict: No judge review posted yet.
- Plain Summary: Upgrades oauthlib in backend requirements to patch known security vulnerabilities.
- Flags: Touches authentication dependencies (`oauthlib`).

---

### Repository: `Trollz1004/dream-intake`
- Open Issues: 0 open issues.
- Open Pull Requests: 1 open pull request.

#### PR #1: `intake(perplexity): life skills overview, fishing, sources (rev 1)`
- Branch: `intake/perplexity/lifeskills-2026-11-09`
- Author / Model: `Perplexity` (intake research transcribed into repository by `Claude judge lane`)
- Files Changed (4):
  - `intake/perplexity/lifeskills/lifeskill-fishing.md`
  - `intake/perplexity/lifeskills/lifeskills-overview.md`
  - `intake/perplexity/lifeskills/lifeskills-sources.md`
  - `reviews/LIFESKILLS-RULING-2026-11-10.md`
- Merge Status: Mergeable (no conflicts with main).
- Failing Checks: None (Intake guard passed).
- Judge Verdict: Reviewed on 2026-11-09 as "strong first pass. Not merged yet; one required fix and one number to settle." Followed on 2026-11-10 by Josh Coleman's official ruling establishing per-character progress and tool wear mechanics.
- Plain Summary: Introduces initial research and game design documentation for life skills, focusing on fishing systems and resource sources.
- Flags: None.

---

## Part 2. Inbox Failed Tasks Analysis

Investigation of the two tasks located in `%USERPROFILE%\antigravity\.fable-kitchen\inbox\failed`.

### Task 1: `look-pass-1-heroes-and-boss`
- Progress Reached: Successfully overhauled all four hero class meshes and the boss mesh, implemented `hero-and-boss-builder.ts` with tests, and opened PR #107 which was reviewed and merged by the judge into main.
- Reason for Failure: The runner timed out at the 20-minute hard limit while waiting on an idle background task attempting to capture the `after.png` screenshot.

### Task 2: `look-pass-2-light-shadow-ground`
- Progress Reached: Implemented quality presets, a three-point mood lighting rig, stone flagging PBR ground, gothic props, and atmospheric effects, pushing branch `ai/inbox/look-pass-2-light-shadow-ground` and opening PR #112.
- Reason for Failure: The runner hit the 20-minute execution timeout while waiting on a background screenshot capture task before screenshots could be captured, committed, or attached to the PR.

---

## Part 3. Reference Pictures Inventory

A thorough, firsthand visual inspection of all reference images under `%USERPROFILE%\OneDrive\claude-to-claude\images\game-look` (including the `phone-2026-09-24` directory) and `%USERPROFILE%\OneDrive\claude-to-claude\images\site-look`.

### Game Look (`images/game-look/`)

#### 1. `c0d3x-mollama-concept-2026-11-11.png`
- Dimensions: 1254 x 705 pixels
- Description: Shows C0D3X wearing an ivory cowl, sleek dark face mask with a golden vertical visor slit, and a long dark traveler's coat with brass navigation fittings beside Mollama, a fluffy white pack llama with strapped saddlebags. The dual presentation contrasts warm daytime sun spilling across stone ruins with rain-slicked nocturnal cobblestones glowing from yellow lantern light.
- Serves as Reference For: C0D3X playable hero / NPC, Mollama companion mount, and Day/Night world lighting transition shaders.
- Quality Mark: 5 / 5

#### 2. `c0d3x-mollama-concept-from-screenshot-2026-11-11.png`
- Dimensions: 822 x 418 pixels
- Description: Displays a slightly cropped, compressed web screenshot version of the C0D3X and Mollama concept artwork. The composition preserves the traveler and pack llama figures in both lighting moods but suffers from lower resolution and artifacting along the edges.
- Serves as Reference For: Secondary backup reference for C0D3X character costume and companion mount design.
- Quality Mark: 3.5 / 5

#### 3. `class examples.jpg`
- Dimensions: 1024 x 1024 pixels
- Description: A stylized high-contrast fantasy illustration showcasing the four core class archetypes standing on a cliffside with a distant castle and red dragon. Depicts a silver-armored knight with lion crest kite shield, a hooded female elf archer drawing a bow, a dark sorceress channeling blue runic spells, and an imposing crimson-and-black spiked dread knight with a glowing red polearm.
- Serves as Reference For: Core hero class silhouette differentiation (Knight, Elf Archer, Mage, Crimson Sovereign boss) and primary weapon/armor archetypes.
- Quality Mark: 5 / 5

#### 4. `dream char samples.png`
- Dimensions: 1920 x 1032 pixels
- Description: A Steam store browser capture of Black Desert Online showcasing two female combatants on a stone ruin battlefield. A kneeling elf archer in an emerald dress and black leather thigh boots aims an ornate silver bow beside a standing warrior in ornate golden filigree plate armor wielding an iron flail and heavy shield.
- Serves as Reference For: Female Archer and Paladin/Warrior class PBR armor modeling, filigree metal roughness, realistic hair shaders, and high-fidelity feminine body proportions.
- Quality Mark: 5 / 5

#### 5. `mythosbossfightcity.jpg`
- Dimensions: 1280 x 720 pixels
- Description: Illustrates an intense night battle where three modern heroes engage the colossal crimson-and-black Sovereign boss in a rain-soaked neon city street. The silver knight and tactical archer confront the boss from a lower balcony while a purple-robed mage hovers above casting dual swirling blue arcane portal rings against the boss's glowing red double-bladed spear.
- Serves as Reference For: Night Dream urban boss combat arena, multi-elevation combat staging, wet asphalt specular reflections, and emissive spell VFX.
- Quality Mark: 5 / 5

#### 6. `ref-hermesworld-agents-2026-09-20.png`
- Dimensions: 1425 x 1215 pixels
- Description: A web landing screen section titled "AI Agents are Citizens of the World" displaying two cards with dark background styling. Features value proposition bullet points for autonomous companions alongside a monospace terminal window displaying live quest logs and API routes.
- Serves as Reference For: Web dashboard agent cards, in-game companion telemetry console, and quest log UI presentation.
- Quality Mark: 2.5 / 5

#### 7. `ref-hermesworld-economy-2026-09-20.png`
- Dimensions: 1425 x 2282 pixels
- Description: A repeated web marketing graphic explaining the player-driven economy titled "FARM. SELL. EARN.". Displays a four-step horizontal process card layout detailing Gathering raw materials, Selling to merchants, Spending gold, and Earning ecosystem tokens.
- Serves as Reference For: Player economy flowcharts, auction house web screens, and transaction guide cards.
- Quality Mark: 2 / 5

#### 8. `ref-hermesworld-guide-2026-09-20.png`
- Dimensions: 1425 x 3534 pixels
- Description: A long vertical page layout repeating four times a beginner's guide titled "HOW TO PLAY HERMESWORLD". Outlines numbered navigation pills and card steps for wallet creation, browser launching, and first quest onboarding.
- Serves as Reference For: Web onboarding documentation layout, step-by-step tutorial interface, and player registration screens.
- Quality Mark: 2 / 5

#### 9. `ref-hermesworld-home-2026-09-20.png`
- Dimensions: 1425 x 1007 pixels
- Description: The hero section of the HermesWorld web portal with a centered modal popup titled "Enter the World" offering browser and desktop client downloads. In the blurred background, an autumnal grove reveals a circular stone gazebo framing a glowing blue portal.
- Serves as Reference For: Web portal game launcher modal, portal entrance environment concept, and autumn forest glade backdrop.
- Quality Mark: 3 / 5

#### 10. `ref-hermesworld-world-2026-09-20.png`
- Dimensions: 1425 x 1613 pixels
- Description: A web showcase section titled "A LIVING, MYTHIC 3D WORLD" displaying three regional thumbnail cards. Features AgoraTown Plaza with stylized red trees, HermesArena with rustic wooden timber barricades, and The Grove showing a cozy timber tavern interior.
- Serves as Reference For: Zone selection travel cards, regional world map previews, and indie/stylized 3D architectural sets.
- Quality Mark: 3 / 5

#### 11. `screen shot of samples that are free .png`
- Dimensions: 1546 x 831 pixels
- Description: A desktop capture of the Epic Games Fab marketplace interface displaying the free "Game Animation Sample" product listing. Shows UI panels for license details and promotional links pointing to Epic's City Sample and Electric Dreams Environment packs.
- Serves as Reference For: Asset pipeline sourcing reference and marketplace store UI structure.
- Quality Mark: 1 / 5

#### 12. `Screenshot 2026-09-18 125125.png`
- Dimensions: 1920 x 1032 pixels
- Description: An authentic high-resolution Black Desert Online gameplay capture showing a third-person mounted traveler riding a chestnut horse down a dirt road. Warm golden sunlight filters through an expansive autumn forest of crimson and amber maples casting crisp dynamic shadows across the road and surrounding stones.
- Serves as Reference For: Day Dream open-world biome, horseback riding locomotion, tree canopy light shafts, and dirt/foliage ground PBR materials.
- Quality Mark: 5 / 5

#### 13. `Screenshot 2026-09-18 125512.png`
- Dimensions: 1920 x 1080 pixels
- Description: A gameplay action frame capturing a massive dragon world boss (Garmoth) roaring violently as an explosive golden fire shockwave tears through the ground. A heavily armored player character braces their shield in the foreground as sparks and shockwave rings fill the screen.
- Serves as Reference For: Large-scale dragon world boss encounter, explosive radial shockwave VFX, screen-shake dynamics, and boss arena camera framing.
- Quality Mark: 4.5 / 5

#### 14. `Screenshot 2026-09-20 010201.png`
- Dimensions: 1928 x 1040 pixels
- Description: A scenic capture of a ruined stone cottage and collapsed drystone perimeter walls shrouded in low creeping ground fog at dusk. The dusky purple sky and barren leafless trees establish a melancholic, abandoned atmosphere across the stony earth.
- Serves as Reference For: Sunken Bastion ruined architecture, modular stone wall geometry, dusk skybox colors, and volumetric ground fog density.
- Quality Mark: 4 / 5

#### 15. `Screenshot 2026-09-20 010213.png`
- Dimensions: 1928 x 1040 pixels
- Description: Shows a medieval stone village road looking directly toward a blazing low sun cresting above a distant mountain peak. Blinding golden backlighting casts deep, elongated shadows from stone cottages and perimeter walls across the rocky wagon ruts.
- Serves as Reference For: High dynamic range sunrise/sunset key-lighting, volumetric lens glare, and rim-lit stone surface textures.
- Quality Mark: 4.5 / 5

#### 16. `Screenshot 2026-09-20 010231.png`
- Dimensions: 1928 x 1040 pixels
- Description: Depicts an alternate perspective of the stone hamlet road looking into a hazy, cloud-streaked sky with sunlight spilling around rugged mountain contours. Features detailed stone masonry on an adjacent rustic dwelling and weathered stone boundary fences bordering barren fields.
- Serves as Reference For: Day Dream mountain backdrop depth modeling, rustic stone cottage proportions, and wagon trail ground terrain.
- Quality Mark: 4 / 5

#### 17. `Screenshot city sample is for day time  .png`
- Dimensions: 1546 x 831 pixels
- Description: A high-altitude cinematic bird's-eye perspective over a vast, photorealistic modern metropolis from the Unreal Engine City Sample. Sunlight cuts through dense atmospheric haze, glinting brightly off hundreds of skyscraper rooftops and reflective urban towers extending to the horizon.
- Serves as Reference For: Daytime modern city environment, aerial horizon atmospheric scattering, skyscraper geometry generation, and metal/glass rooftop specular lighting.
- Quality Mark: 5 / 5

#### 18. `Screenshot what game should look like during day dreams night dreams should be city style.png`
- Dimensions: 1928 x 1040 pixels
- Description: A wide panorama of the rural stone village bathed in warm sunset hues, with low fog blanketing the road and ruined walls before a towering mountain silhouette. Clearly annotated in its title as the target aesthetic for rural Day Dream zones contrasting with urban Night Dream zones.
- Serves as Reference For: Day Dream village and farmland biome target, sunset lighting mood, and atmospheric fog layering.
- Quality Mark: 4.5 / 5

#### 19. `whats being downloaded.png`
- Dimensions: 1050 x 730 pixels
- Description: A screen grab of the Epic Games Launcher download queue actively downloading the 95.98 GB City Sample project for Unreal Engine 5.8. Shows network speeds and progress bars in a dark minimalist client window.
- Serves as Reference For: Launcher progress interface and external pipeline asset verification.
- Quality Mark: 1 / 5

---

### Game Look Phone Archive (`images/game-look/phone-2026-09-24/`)

#### 20. `photo_2026-09-24_21-02-13.jpg`
- Dimensions: 1280 x 720 pixels
- Description: A panoramic 4-class lineup depicting modern urban fantasy adaptations of the core classes on a rain-slicked city boulevard with neon signs and graffiti. Features a tactical knight with visor and golden lion shield, a crop-top streetwear mage channeling dual blue energy rings, an urban archer with glowing bow atop a parapet, and the spiked red-black dread boss with glowing spear in the wet street.
- Serves as Reference For: Modern urban fantasy hero costumes, weapon glow shaders, and night street reflections.
- Quality Mark: 5 / 5

#### 21. `photo_2026-09-24_21-02-24.jpg`
- Dimensions: 1254 x 1254 pixels
- Description: A four-panel fantasy portrait grid featuring detailed painted interpretations of the four classes in their regional realms. Includes the plate-armored knight atop a mountain peak, the elf archer drawing her bow beside a forest waterfall, the sorceress in purple robes casting runes in a lunar cathedral, and the spiked crimson dark knight boss holding a war axe before a volcanic fortress.
- Serves as Reference For: High fantasy class identities, biome environment themes (Alpine Fortress, Deep Forest, Arcane Sanctum, Volcanic Citadel), and iconic class color schemes.
- Quality Mark: 5 / 5

#### 22. `photo_2026-09-24_21-02-27.jpg`
- Dimensions: 1254 x 1254 pixels
- Description: An enhanced four-panel character composition refining the class costumes with greater armor and weapon complexity. The knight wears a closed visored bascinet with fur mantle, the elf ranger displays flowing red hair and an ornate leaf-etched recurve bow, the mage wears an elaborate hooded gown with floating runes, and the dark boss wields a glowing double-pronged fiery polearm.
- Serves as Reference For: Advanced character gear upgrades, helmet and headwear modeling, ornate weapon silhouettes, and spell rune VFX.
- Quality Mark: 5 / 5

#### 23. `photo_2026-09-24_21-02-29.jpg`
- Dimensions: 1280 x 720 pixels
- Description: A direct duplicate of the urban battle painting seen in `mythosbossfightcity.jpg` showing the knight, archer, and hovering mage fighting the giant Crimson Sovereign in a neon-lit rainstorm. Captures vibrant reflections on wet asphalt and dramatic blue versus red lighting contrast.
- Serves as Reference For: Night Dream boss encounter arena, wet surface PBR shaders, and multi-tier architectural combat zones.
- Quality Mark: 5 / 5

#### 24. `photo_2026-09-24_21-02-31.jpg`
- Dimensions: 1280 x 720 pixels
- Description: A four-column vertical lineup isolating each modern class against distinct urban city backdrops. Shows the tactical knight with camo tabard and lion shield in an alley, the hooded female archer perched on a skyscraper roof drawing an electric bow, the stylish mage with purple coat conjuring a lightning ring, and the crimson dread knight standing in the street holding a glowing jagged spear.
- Serves as Reference For: Individual 3D class modeling proportions, vertical silhouette readability, and modern weapon integration.
- Quality Mark: 5 / 5

#### 25. `photo_2026-09-24_21-02-33.jpg`
- Dimensions: 1280 x 720 pixels
- Description: An alternate perspective of the four modern classes staged across a rainy neon crosswalk during an impending standoff. The knight anchors the left foreground with drawn sword and lion shield, the archer is positioned on an elevated concrete pillar, the mage channels electric spheres in the center, and the spiked crimson dread knight stands ready on the right.
- Serves as Reference For: Arena spatial layout, crosswalk encounter geometry, dynamic team combat poses, and multi-source neon reflections.
- Quality Mark: 5 / 5

#### 26. `photo_2026-09-24_21-02-35.jpg`
- Dimensions: 1280 x 720 pixels
- Description: A duplicate image file matching `photo_2026-09-24_21-02-13.jpg` showing the wide panoramic collage of the tactical knight, streetwear mage, roof archer, and crimson dark knight. Emphasizes emissive blue magic, glowing red weapon edges, and reflective rain puddles.
- Serves as Reference For: Class modernization styling and wet night lighting benchmarks.
- Quality Mark: 5 / 5

#### 27. `photo_2026-09-24_21-20-03 (2).jpg`
- Dimensions: 1024 x 1536 pixels
- Description: A four-panel photorealistic character sheet depicting each class as an intricately detailed modern warrior walking through rain-drenched city streets at night. Features a bearded knight in weathered plate armor and tactical rig walking an alley, a blonde archer in leather and flowing coat walking a glass rooftop ledge, a bespectacled raven-haired sorceress in purple haute-couture walking a luxury shopping district, and a spiked red-black dread knight crossing a traffic-filled avenue.
- Serves as Reference For: Ultra-high fidelity Black Desert/Diablo standard character models, multi-layered fabric and plate texturing, realistic hair, and believable modern accessories.
- Quality Mark: 5 / 5

#### 28. `photo_2026-09-24_21-20-03.jpg`
- Dimensions: 1672 x 941 pixels
- Description: A widescreen 4-column master benchmark lineup displaying the four classes walking forward in rain-washed urban environments with breathtaking cinematic fidelity. Showcases the goggled heavy paladin with filigree shoulder armor, the dark-haired rogue archer with compound bow walking a high ledge, the elegant sorceress in glasses with an embroidered purple duster, and the massive spiked crimson sovereign boss carrying a massive broadsword.
- Serves as Reference For: Absolute visual gold standard for character realism, PBR leather/metal weathering, facial fidelity, and AAA lighting integration.
- Quality Mark: 5 / 5

---

### Site Look (`images/site-look/`)

#### 29. `reference-space-service-hero-2026-11-06.png`
- Dimensions: 1920 x 1008 pixels
- Description: A browser screenshot of an interactive web landing page featuring a stark dark space theme with massive typography "RANKED IDEAS" and a prominent "GO / SKIP" decision slider. A 3D glowing blue wireframe globe occupies the lower portion of the screen, anchored by priority meters and an AI roadmap CTA.
- Serves as Reference For: Marketing website hero design, interactive triage/decision components, dark-mode futuristic branding, and WebGL globe integration.
- Quality Mark: 4.5 / 5 for website interface design (1 / 5 for in-game 3D world).

---

### Top Selections

#### Top Five for Characters
1. `photo_2026-09-24_21-20-03.jpg` (1672 x 941): The definitive gold standard across all references, offering unmatched AAA character realism, PBR material layering (etched steel, worn leather, wet velvet), hair rendering, and facial anatomy that directly meets the Black Desert and Diablo 3 bar.
2. `photo_2026-09-24_21-20-03 (2).jpg` (1024 x 1536): Exceptional full-body character studies showing realistic walking poses, tactical gear integration, believable armor joints, and distinctive costume silhouettes for all four classes.
3. `c0d3x-mollama-concept-2026-11-11.png` (1254 x 705): The primary official concept art for C0D3X and Mollama, providing clear visual specifications for the ivory cowl, golden repair seams, sextant shoulder hardware, and woolly pack llama mount.
4. `dream char samples.png` (1920 x 1032): Direct in-engine Black Desert screenshot demonstrating female archer and paladin plate armor, ornate filigree metalwork, and top-tier AAA proportion standards.
5. `class examples.jpg` (1024 x 1024): The foundational archetype reference defining the silhouettes, color palettes, and signature weapons of the four core classes (winged-helm knight, green-cloaked elf archer, purple-robed mage, and crimson dark knight boss).

#### Top Three for Scenes
1. `Screenshot 2026-09-18 125125.png` (1920 x 1032): Direct Black Desert gameplay benchmark for the Day Dream environment, demonstrating sun-dappled autumn tree canopies, realistic horse locomotion, dirt road ruts, and expansive natural horizons.
2. `mythosbossfightcity.jpg` (1280 x 720): The definitive visual target for Night Dream urban combat, featuring reflective wet asphalt, neon sign bounce lighting, volumetric atmospheric fog, and multi-level vertical architecture.
3. `Screenshot city sample is for day time  .png` (1546 x 831): The benchmark for daytime city scale and atmosphere, showing realistic aerial perspective, sunlight scattering over high-density skyscraper geometry, and rooftop material specular response.
