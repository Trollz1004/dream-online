# DREAM ENGINE STUDIO — EXACT CODEBASE AUDIT FOR CLAUDE (DESKTOP APP)
Date: 2026-10-25
From: Google Gemini (AI Studio Build Workspace `/app/applet`)
To: Claude (Co-GM Council)
Steward: Josh Coleman (`#ForTheKids` / `#UntilNoKidInNeed`)

---

## ANSWER 1: THE MEMORY LAYER AND ITS EXTERNAL CALLS

### A. What the Memory Layer Actually Does Today

#### 1. Where Memory Is Stored
There is NO external database client, Viking daemon, Supabase client (`@supabase/supabase-js`), or Supermemory SDK wired into the runtime. Instead, memory is stored in four places inside the project:

1. **Seed Constants in TypeScript (`/src/engine/studioConfig.ts`, lines 236–277 and 335–431)**:
   Four tier status descriptors (`INITIAL_MEMORY_TIERS`) and five initial memory entries (`INITIAL_MEMORY_ENTRIES`) are hardcoded as arrays in `/src/engine/studioConfig.ts`:
   - `/src/engine/studioConfig.ts`, lines 236–246:
     export const INITIAL_MEMORY_TIERS: MemoryTierStatus[] = [
       {
         tier: 1,
         id: 'obsidian-vault',
         name: 'Obsidian Vault (Sovereign Local Sync)',
         role: 'Primary Markdown + [[Wikilinks]] Knowledge Graph · Synced across Alienware .40 & T5500 .15',
         location: 'memory/obsidian-vault/ (100% Founder Owned)',
         status: 'active-primary',
         entriesCount: 6,
         latencyMs: 1,
       },
   - `/src/engine/studioConfig.ts`, lines 335–348:
     export const INITIAL_MEMORY_ENTRIES: AgentMemoryEntry[] = [
       {
         id: 'mem-gemini-soul-md',
         title: 'GEMINI SOUL.MD — Self-Authored Co-GM & Engine Instructions',
         vikingUri: 'viking://dream/soul/gemini-co-gm',
         ...
         syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
         updatedAt: '2026-10-22T10:05:00Z',
       },

2. **Server-Side Volatile RAM (`/server.ts`, lines 129–130)**:
   Express holds a shallow copy of those arrays in the in-memory `serverState` object (lost when the Node process restarts; no `fs.writeFile` or database driver is called):
   - `/server.ts`, lines 129–130:
     memoryTiers: [...INITIAL_MEMORY_TIERS] as MemoryTierStatus[],
     memoryEntries: [...INITIAL_MEMORY_ENTRIES] as AgentMemoryEntry[],

3. **Client-Side Volatile RAM (`/src/engine/studioConfig.ts`, line 1056; `/src/engine/combat/event-log.ts`, line 9; `/src/ui/GeminEyeHud.tsx`, lines 50–54)**:
   - `/src/engine/studioConfig.ts`, line 1056 (`StudioConfigManager` clones `INITIAL_MEMORY_ENTRIES` in browser RAM):
     memoryEntries: AgentMemoryEntry[] = [...INITIAL_MEMORY_ENTRIES.map((m) => ({ ...m, tags: [...m.tags], wikilinks: [...m.wikilinks], syncedTiers: [...m.syncedTiers] }))];
   - `/src/engine/combat/event-log.ts`, lines 8–9 (`EventLog` holds combat `WorldEventEnvelope` objects in a private in-memory array):
     export class EventLog {
       private _events: WorldEventEnvelope[] = [];
   - `/src/ui/GeminEyeHud.tsx`, lines 50–54 (`GeminEyeHud` holds a separate local React state array `memoryLogs`):
     const [memoryLogs, setMemoryLogs] = useState<Array<{ id: string; time: string; text: string; tag: string }>>([
       { id: '1', time: '04:02:18', text: 'Optic HUD calibrated. Biometric resonance locked at 100%.', tag: 'SYS' },
       { id: '2', time: '04:04:45', text: 'Hollow Sentinel automaton scanned at (0, 0, -10). Focus Beam locked.', tag: 'TARGET' },
       { id: '3', time: '04:05:01', text: 'Mireth World Lore node active in Old-World Valley perimeter.', tag: 'WORLD' },
     ]);

4. **Two Static Markdown Files on Disk (`/memory/obsidian-vault/CO_GM_COUNCIL_SYNC.md` and `/memory/obsidian-vault/SESSION_RI_HANDOFF.md`)**:
   Checked into the workspace filesystem, but NEITHER `/server.ts` NOR `/src/` reads from or writes to `/memory/obsidian-vault/` at runtime.

#### 2. What Writes Memory
1. **NPC Dialogue Endpoint (`POST /api/gm/npc/dialogue` in `/server.ts`, lines 296–312)**:
   After generating an NPC reply, the route constructs an `AgentMemoryEntry` and unshifts it onto `serverState.memoryEntries`:
   - `/server.ts`, lines 296–312:
     const memEntry: AgentMemoryEntry = {
       id: `mem-npc-${Date.now()}`,
       title: `NPC Dialogue · ${profile.name}`,
       vikingUri: `viking://dream/npc/${profile.id}/${Date.now()}`,
       ...
       syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
       updatedAt: new Date().toISOString(),
     };
     serverState.memoryEntries.unshift(memEntry);
     for (const t of serverState.memoryTiers) {
       t.entriesCount = serverState.memoryEntries.length;
     }

2. **Memory Store Endpoint (`POST /api/memory/store` in `/server.ts`, lines 408–460)**:
   Runs `redactSecretsWithXXXX()` on `req.body.title` and `req.body.content` and unshifts the new `AgentMemoryEntry` into `serverState.memoryEntries`:
   - `/server.ts`, lines 414–417, 444–447:
     const titleRedaction = redactSecretsWithXXXX(rawTitle);
     const contentRedaction = redactSecretsWithXXXX(rawContent);
     ...
     serverState.memoryEntries.unshift(entry);
     for (const t of serverState.memoryTiers) {
       t.entriesCount = serverState.memoryEntries.length;
     }

3. **Failover Test Endpoint (`POST /api/memory/failover-test` in `/server.ts`, lines 462–489)**:
   Mutates the `.status` strings on `serverState.memoryTiers` in RAM (`'rate-capped-failover'`, `'active-primary'`, `'warm-standby'`).

4. **Client-Side Session-End (`ri`) Writer (`StudioConfigManager.recordSessionEndMemory` in `/src/engine/studioConfig.ts`, lines 1125–1189)**:
   Called when the user clicks "Redact (XXXX) & Commit to Obsidian Vault" in `/src/ui/SplitLandingAndScreensaver.tsx` (lines 159–195). It scrubs secrets via `redactSecretsWithXXXX()`, prepends to `this.memoryEntries` in browser memory, and also fires `fetch('/api/memory/store', { method: 'POST', ... })` (`/src/ui/SplitLandingAndScreensaver.tsx`, lines 182–191).

5. **Client-Side Studio Memory Form (`handleStoreMemory` in `/src/ui/DreamStudioPanel.tsx`, lines 225–250)**:
   Sends `POST /api/memory/store` and prepends the returned `data.entry` to the component's local `memoryEntries` React state (`setMemoryEntries((prev) => [data.entry, ...prev])`, line 240).

6. **Client-Side Combat `EventLog` (`/src/engine/combat/combat-manager.ts`, lines 119, 150, 181, 199, 218, 247, 333, 347, 372, 391, 431, 457, 481, 504)**:
   Appends combat events (`player.dash`, `player.light_attack`, `player.heavy_attack`, `player.guard`, `player.lunge`, `player.burst`, `sentinel.beam_fired`, `sentinel.defeated`, `player.perfect_dodge`, `player.hit_taken`, `player.hit_landed`) to `this.eventLog` in RAM.

7. **Client-Side `GeminEyeHud` Voice Log (`addMemory` in `/src/ui/GeminEyeHud.tsx`, lines 159–161)**:
   Prepends a 1-line log entry into local React state (`setMemoryLogs`) when a voice command or preset button is clicked.

#### 3. What Reads Memory
1. **`GET /api/memory/status` (`/server.ts`, lines 389–394)**:
   Returns `{ tiers: serverState.memoryTiers, entries: serverState.memoryEntries }`. Fetched by `/src/ui/DreamStudioPanel.tsx` when the Studio panel opens (`useEffect` at lines 122–131).
2. **`GET /api/gm/topology` (`/server.ts`, lines 163–170)**:
   Returns `memoryTiers: serverState.memoryTiers` and `auditLog: serverState.auditLog`. Fetched by `/src/ui/GmControlModal.tsx` (`refreshTopology` at lines 115–127).
3. **`GET /api/memory/obsidian-export` (`/server.ts`, lines 491–499)** and **Client Export Buttons (`/src/ui/DreamStudioPanel.tsx`, lines 266–275; `/src/ui/SplitLandingAndScreensaver.tsx`, lines 197–206)**:
   Calls `formatObsidianVaultBundle(entries)` (`/src/engine/studioConfig.ts`, lines 516–532) to format `memoryEntries` into a single redacted Markdown string for browser download.
4. **`SplitLandingAndScreensaver` Component (`/src/ui/SplitLandingAndScreensaver.tsx`, lines 72–74, 93–101, 130–148, 649–810)**:
   Reads `engine?.studio.memoryEntries || INITIAL_MEMORY_ENTRIES` and renders up to 8 entries as SVG nodes (`memoryEntries.slice(0, 8).map(...)`, line 133) plus the selected entry's `l2Markdown` passed through `redactSecretsWithXXXX()` (line 785).
5. **Combat `EventLog` Readers (`/src/engine/engine.ts`, lines 248–250, 365, 774)**:
   Read by `dumpWorldEventLog()` (`KeyK` / header button) to print JSON lines to `console.log`, by `runProofSequence()` at `simTime >= 10.0` (line 365), and by `stepFrame()` to pass `this.combat.eventLog.count()` to the HUD callback (line 774).

#### 4. What Happens on a State Tick and on an Epoch Change
- **On a State Tick (`DreamEngine.stepFrame(dt)` in `/src/engine/engine.ts`, lines 486–784)**:
  - Runs once per `requestAnimationFrame` (`loop` at lines 476–484) or at `120Hz` via `setTimeout` when `?proof=1` is in the URL (`runProofSequence` at lines 252–383).
  - NOTHING in the 4-tier `AgentMemoryEntry` layer (`StudioConfigManager.memoryEntries` or `serverState.memoryEntries`) is read, written, or network-synced on a state tick.
  - The only per-tick reads of `this.studio` are synchronous local property reads for rendering: `this.studio.character.avatarScale` (line 496), `this.studio.character.sentinelScale` (line 501), `this.studio.character` colors/roughness/metallic/visorGlow (lines 551–584), `this.studio.shader.rimIntensity` (line 565), and `this.studio.entities` (line 723).
  - In `CombatManager.update(dt, ...)` (`/src/engine/combat/combat-manager.ts`, lines 286–361), combat timers advance and—only on frames where a hit, beam fire, or defeat transition occurs—an event is pushed to the in-memory `this.eventLog` array (lines 333, 347, 431, 457, 481, 504) and `this.combat.eventLog.count()` is reported in `onMetricsUpdate` (`/src/engine/engine.ts`, line 774).
- **On an Epoch Change**:
  - There is NO concept of an "epoch" or "epoch change" anywhere in this project. A full-repo search for `epoch` returns zero matches.
  - The closest world-state transition in the codebase is the Day/Night Dream Shift (`toggleDayNight()` in `/src/engine/engine.ts`, lines 236–240, and `POST /api/gm/world/nightfall` in `/server.ts`, lines 177–189).
  - When triggered via key `N` or the top-bar Sun/Moon button (`/src/App.tsx`, lines 269–271), `engine.toggleDayNight()` flips `renderer.worldMode` between `'day'` and `'night'` and updates the Web Audio synth (`this.ambientSynth.setMode(mode)`). It does NOT write to the memory layer or call the server.
  - When triggered via the GM Control modal button (`handleTriggerNightfall` in `/src/ui/GmControlModal.tsx`, lines 200–212), it calls `engine.toggleDayNight()` and sends `POST /api/gm/world/nightfall` to `/server.ts`, which flips `serverState.world.dreamShift.state` and prepends an entry to `serverState.auditLog` (`/server.ts`, lines 181–187), but does NOT touch `memoryEntries` or call any external model.

---

### B. Every Place This Project Calls an External Model Endpoint

There are EXACTLY 4 external model call sites in the entire repository. All 4 are inside `/server.ts`, all 4 use the `@google/genai` SDK (`ai.models.generateContent`) instantiated by `getGenAiClient()` (`/server.ts`, lines 41–52), and ZERO of them go through OmniRoute.

(Note: Although `/src/engine/studioConfig.ts` lines 21–66 define URLs for `http://192.168.0.40:20128/api/v1`, `http://127.0.0.1:3130`, `http://192.168.0.15:9127`, and `http://192.168.0.15:11434`, those objects are static display metadata in `CANONICAL_NODE_TOPOLOGY`—there is no `fetch()` or HTTP client anywhere in the project that actually connects to those local IP addresses or to an OmniRoute router.)

#### Shared Client Initialization (`/server.ts`, lines 41–52)
  function getGenAiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

#### Call Site 1: Live NPC Dialogue (`POST /api/gm/npc/dialogue`)
- **File & Lines**: `/server.ts`, lines 278–284 (inside `app.post('/api/gm/npc/dialogue', ...)` at lines 261–325; triggered by `/src/ui/GmControlModal.tsx`, lines 232–241).
- **Quoted Lines (`/server.ts`, lines 275–293)**:
  const ai = getGenAiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Player at zone "${zone}" says to NPC "${profile.name}" (${profile.role}): "${message}". Respond in-character in 2-3 concise sentences.`,
        config: {
          systemInstruction: `${profile.doctrinePrompt} Keep responses immersive, concise (under 65 words), and grounded in DREAM Engine's First Gate world, hardware nodes (.40 Alienware, .15 T5500, :3130 Mission Control), and #UntilNoKidInNeed.`,
        },
      });
      if (response.text) {
        replyText = response.text.trim();
        modelUsed = 'gemini-3.8-flash (Google Ultra Agent SDK)';
      }
    } catch (err) {
      // Fallback gracefully to T0/T1 local response
      console.warn('[DREAM] Gemini NPC fallback engaged:', err);
    }
  }
- **What It Sends**: Model `'gemini-3.8-flash'`, player zone, NPC name/role, player message, and `profile.doctrinePrompt` in `systemInstruction`.
- **How Often It Fires**: Strictly event-driven (user click / Enter key in GM Control Modal "Live NPC Lab", `/src/ui/GmControlModal.tsx`, lines 227–253). Never fires on a tick.
- **What Happens on Failure / Timeout / Rate-Limit**: No custom timeout or retry is set. On error, `catch (err)` logs a warning and returns the pre-initialized scripted fallback string from lines 272–273 (`replyText = '${profile.name} [${profile.tier} · ${zone}]: "${profile.defaultGreeting}"'`, `modelUsed = 'T0-Scripted-Fallback'`).
- **Goes Through OmniRoute?**: No. Direct `@google/genai` call.

#### Call Site 2: Google Ultra Custom Agent SDK Task Dispatch (`POST /api/agent-sdk/dispatch`)
- **File & Lines**: `/server.ts`, lines 357–364 (inside `app.post('/api/agent-sdk/dispatch', ...)` at lines 339–383; triggered by `/src/ui/DreamStudioPanel.tsx`, lines 207–215).
- **Quoted Lines (`/server.ts`, lines 350–372)**:
  const ai = getGenAiClient();
  if (ai) {
    try {
      const targetModel =
        model === 'gemini-4-argon' || model === 'gemini-3.1-flash-lite'
          ? model
          : 'gemini-3.8-flash';
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: taskPrompt,
        config: {
          systemInstruction: `${systemInstruction}\nProtocol Envelope: ${protocol}. Provide a concise, actionable engineering response.`,
        },
      });
      if (response.text) {
        outputText = response.text.trim();
      }
    } catch (err) {
      outputText = `[Circuit-Breaker Fallback Engaged] Direct SDK handled request locally: ${
        err instanceof Error ? err.message : 'Upstream rate cap bypassed via 4-Tier Memory & T5500 worker'
      }`;
    }
  }
- **What It Sends**: Model (`'gemini-4-argon'`, `'gemini-3.1-flash-lite'`, or `'gemini-3.8-flash'`), `taskPrompt`, and `systemInstruction` + `Protocol Envelope`.
- **How Often It Fires**: Strictly event-driven (user click on "Dispatch Custom Agent SDK Task" in `/src/ui/DreamStudioPanel.tsx`, lines 203–223). Despite the dropdown label `gemini-3.1-flash-lite (Tick)` at line 915 of `DreamStudioPanel.tsx`, nothing calls this endpoint on a tick.
- **What Happens on Failure / Timeout / Rate-Limit**: Returns HTTP 200 with `[Circuit-Breaker Fallback Engaged] Direct SDK handled request locally: ...` (lines 367–371).
- **Goes Through OmniRoute?**: No. Direct `@google/genai` call.

#### Call Site 3: REA Binary Decompilation Summary (`POST /api/studio/rea-analyze`)
- **File & Lines**: `/server.ts`, lines 523–530 (inside `app.post('/api/studio/rea-analyze', ...)` at lines 513–546; triggered by `/src/ui/ReaInspectorModal.tsx`, lines 63–67).
- **Quoted Lines (`/server.ts`, lines 519–537)**:
  let aiDecompilationNote = analysis.suggestedEnginePreset.summary;
  const ai = getGenAiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Reverse-engineer this binary telemetry via morluto/rea bridge:
  File: ${analysis.fileName} (${analysis.format}, ${analysis.architecture})
  Magic Hex: ${analysis.magicHex}, Entropy: ${analysis.entropy}
  Extracted Strings: ${analysis.extractedStrings.join(', ')}
  Provide a 2-sentence technical summary explaining how its extracted structures map into DREAM Engine's 3D WebGPU/WebGL2 runtime.`,
      });
      if (response.text) {
        aiDecompilationNote = response.text.trim();
      }
    } catch {
      // Keep deterministic summary
    }
  }
- **What It Sends**: Model `'gemini-3.8-flash'` with deterministically parsed binary metadata (`fileName`, `format`, `architecture`, `magicHex`, `entropy`, `extractedStrings`).
- **How Often It Fires**: Strictly event-driven (user click on a sample binary in `ReaInspectorModal`, `/src/ui/ReaInspectorModal.tsx`, lines 51–77).
- **What Happens on Failure / Timeout / Rate-Limit**: Empty `catch {}` block preserves the deterministic summary from `analyzeReaBinary()` (`/src/engine/studioConfig.ts`, line 837).
- **Goes Through OmniRoute?**: No. Direct `@google/genai` call.

#### Call Site 4: 3D Character Rig & Material Preset Synthesis (`POST /api/studio/generate-design`)
- **File & Lines**: `/server.ts`, lines 564–603 (inside `app.post('/api/studio/generate-design', ...)` at lines 548–626; triggered by `/src/ui/DreamStudioPanel.tsx`, lines 180–184).
- **Quoted Lines (`/server.ts`, lines 562–622)**:
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate a 3D Cyber-Knight character rig & material preset for DREAM Engine based on this creator prompt: "${prompt}". Return RGB floats between 0.05 and 1.0.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              presetName: { type: Type.STRING },
              armorR: { type: Type.NUMBER },
              ...
              loreSummary: { type: Type.STRING },
            },
            required: [ ... ],
          },
        },
      });
      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        ...
      }
    } catch (err) {
      console.warn('[DREAM] Studio AI design fallback engaged:', err);
    }
  }
- **What It Sends**: Model `'gemini-3.8-flash'`, creator prompt, and a JSON `responseSchema` with 13 required fields.
- **How Often It Fires**: Strictly event-driven (user click on "Synthesize Character Rig with Gemini" in `/src/ui/DreamStudioPanel.tsx`, lines 176–201).
- **What Happens on Failure / Timeout / Rate-Limit**: Logs warning and returns the hardcoded `Solaris Cyber-Knight` preset defined at `/server.ts`, lines 552–560.
- **Goes Through OmniRoute?**: No. Direct `@google/genai` call.

---

## ANSWER 2: THE FAILING PUSHES

### A. What the Project Files & Workspace Actually Contain
1. **No `.git` Repository Exists Inside the Project Workspace**:
   Running `git status`, `git remote -v`, and `git config --list` in `/app/applet` returns:
   `fatal: not a git repository (or any of the parent directories): .git`
   The only Git-related file in the workspace is `/.gitignore` (lines 1–11):
     node_modules/
     build/
     dist/
     coverage/
     .aistudio/
     bun.lock
     .DS_Store
     *.log
     .env*
     !.env.example

2. **Where the Push Operation & Error Text Come From**:
   Because there is no `.git` directory or git configuration in the project files, GitHub pushes are handled externally by the AI Studio host platform's "Push to GitHub" UI button, not by any script or config file inside the repository.
   - **Operation**: Clicking the AI Studio "Push to GitHub" button a second time immediately after the first push succeeded ("at first it says pushed but i click again to be sure says invalid argument again").
   - **Exact Error Text Reported**: `invalid argument` (corresponding to `INVALID_ARGUMENT` from the AI Studio GitHub export/commit RPC when attempting to create a commit with an empty diff / zero modified files against the remote branch HEAD).

3. **What the Project Is Configured to Push To and As Whom**:
   - **Target Repository URL / Owner / Branch**: Not present in any project file (`.git/config` does not exist, and neither `/package.json` lines 1–40 nor `/metadata.json` lines 1–7 contains a `repository` field).
   - **Identity ("As Whom")**: Not configured in any local `.git/config`. The session metadata identifies the logged-in AI Studio user as `joshlcoleman@gmail.com` (`Josh Coleman`, `/GEMINI_SOUL.md`, line 7).

4. **What Would Fix It (Without Attempting the Fix)**:
   When using AI Studio's "Push to GitHub" UI button, do not click "Push to GitHub" a second time when no files have changed since the first push succeeded; AI Studio's backend sends the diff between the workspace and the last pushed commit, and an empty (zero-file) diff causes the commit creation API to reject the request with `invalid argument`. Ensuring at least one tracked file has a new modification before clicking Push—or initializing a local `.git` repository (`git init`, `git remote add origin <repo-url>`, `git config user.name`, `git config user.email`) if pushing from the shell—prevents empty-diff or missing-repo failures.

---

## 3. WHAT COULD NOT BE DETERMINED FROM THE PROJECT FILES

1. **OmniRoute's Actual Code, Local Port, and Call Frequency**:
   OmniRoute is NOT implemented or called anywhere in this project. It is only mentioned in comments, UI strings, and markdown notes as a banned/decommissioned component (`/GEMINI_SOUL.md` line 18; `/server.ts` line 333). If OmniRoute is still running on `192.168.0.40` or `192.168.0.15` in a separate repository or daemon on the Founder's LAN, its source code and call sites are outside this AI Studio project.
2. **Real Network Traffic to Alienware `.40` (`192.168.0.40:20128`), T5500 `.15` (`192.168.0.15:9127` / `:11434`), and Mission Control (`127.0.0.1:3130`)**:
   Those endpoints exist in this project only as static strings in `/src/engine/studioConfig.ts` (lines 21–66) and `/server.ts` (lines 156–158). The actual daemons running on `.40`, `.15`, and `:3130` are not in this repository.
3. **Real External Storage Clients for Viking (`viking://`), Supabase (`pgvector`), and Supermemory**:
   While entries in `/src/engine/studioConfig.ts` and `/server.ts` carry `vikingUri` strings and `syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud']`, there is no code in this project that connects to a Viking service, a Supabase instance, or Supermemory's API, nor does `/server.ts` write new memory notes to disk under `/memory/obsidian-vault/`.
4. **Epoch Change Logic**:
   There is no epoch system or epoch-change handler anywhere in the project files.
5. **GitHub Remote Repository URL, Branch Name, OAuth Token Scope, and Full Server Stack Trace of the Failing Push**:
   Because the workspace has no `.git` directory (`fatal: not a git repository`) and no `repository` field in `/package.json` or `/metadata.json`, the exact GitHub repository URL, target branch, and GitHub OAuth identity used by the AI Studio UI button cannot be determined from the files in this project.
