# Memmy Memory Service (`memmy-memory`) Read-Only Study (2026-11-15)

**Verdict: build its ideas ourselves.**

- **Target repository**: `https://github.com/MemTensor/memmy-agent` (MIT license)
- **Clone path**: `%USERPROFILE%\antigravity\study\memmy-agent` (shallow clone, read-only study; nothing installed, built, or executed)
- **Evaluated commit**: `e640129a40807522c6c1e4db0c2d3f4f0cb3477d`

---

## 1. Standalone Windows 11 Execution (`127.0.0.1:18960`)

**Can `memmy-memory` (`127.0.0.1:18960`) run by itself on Windows 11 without the Memmy agent, the desktop app, a Memmy account, or systemd?**

**Yes.** The `Memory/` package is a self-contained Node.js HTTP + SQLite service that binds to loopback `127.0.0.1:18960` and runs on Windows 11 without the Memmy agent (`App/memmy-agent`), the Electron desktop app (`App/`), a Memmy cloud account, or Linux `systemd`:

- **Default local SQLite mode with no account or token required**: `DEFAULT_CONFIG` in `Memory/src/config/index.ts:332-338` sets `storage.mode: "local"`, `storage.backend: "sqlite"`, `storage.endpoint: "http://127.0.0.1:18960"`, `storage.dbPath: defaultDatabasePath()`, and `storage.token: undefined`.
- **Loopback HTTP server and anonymous local access**: `startMemoryServer` in `Memory/src/server/index.ts:69-74` defaults to `host = "127.0.0.1"` and `port = 18960`, enforces a loopback bind via `assertLoopbackBindHost(host)` (`Memory/src/server/index.ts:441-456`), and sets `allowAnonymous: !storage.token` (`Memory/src/server/index.ts:201-203`) with default user ID `"local-user"` (`Memory/src/config/index.ts:300`).

**What exactly would start it?**

- **Important caveat (`memmy-memory serve` is a deprecated no-op)**: Running `memmy-memory serve` from the CLI does **not** start the server; `handleServe` in `Memory/src/cli/commands.ts:96-98` and `Memory/src/cli/commands.ts:271-286` only prints a deprecation notice and exits (`Memory/readme.md:151-152`).
- **Direct server entrypoints**:
  1. **Compiled Node entrypoint**: `node Memory/dist/src/server/index.js --config <path> --host 127.0.0.1 --port 18960 --db <path>` (`Memory/package.json:16-17`, `Memory/src/server/index.ts:23-56`, `Memory/src/server/index.ts:494-498`).
  2. **TypeScript source entrypoint**: `tsx Memory/src/server/index.ts` (`Memory/package.json:14`, `Memory/package.json:18`).
  3. **Standalone packaged Windows binary**: `memmy-memory.exe` built with `@yao-pkg/pkg` targeting `node22-win-x64` (`Memory/src/cli/scripts/build-standalone.mjs:32`, `Memory/src/cli/scripts/build-standalone.mjs:47`, `Memory/src/cli/scripts/build-standalone.mjs:98-103`).
- **Windows 11 background service installer (`memmy-memory install` / `Memory/installers/install.ps1`)**:
  1. `Memory/installers/install.ps1:25-32` extracts `memmy-memory-$Version-windows-$arch.tar.gz` into `%USERPROFILE%\.memmy\cli\versions\$Version\$target`, copies `memmy-memory.cmd` to `%USERPROFILE%\.memmy\bin\memmy-memory.cmd`, and runs `& $stableCommand install @InstallArguments`.
  2. `installMemoryRuntime` (`Memory/src/cli/runtime-installer.ts:60-210`) writes `%USERPROFILE%\.memmy\memory-service\current.json` (`Memory/src/cli/runtime-installer.ts:136-149`, `Memory/src/cli/runtime-installer.ts:616-625`) pointing `serverEntryPath` to `dist/src/server/index.js`.
  3. `writeStableLauncher` (`Memory/src/cli/runtime-installer.ts:634-716`) generates three launcher wrappers in `%USERPROFILE%\.memmy\bin\`:
     - `memmy-memory-service.cjs` (`Memory/src/cli/runtime-installer.ts:637`, `Memory/src/cli/runtime-installer.ts:644-699`), which reads `current.json` and spawns `node` on `dist/src/server/index.js` with `windowsHide: true`, redirecting stdout/stderr to `service.log` and `service-error.log`.
     - `memmy-memory-service.cmd` (`Memory/src/cli/runtime-installer.ts:637`, `Memory/src/cli/runtime-installer.ts:701`), which sets `ELECTRON_RUN_AS_NODE=1` and runs `"<nodeExecutable>" "<memmy-memory-service.cjs>" %*`.
     - `memmy-memory-service.js` (`Memory/src/cli/runtime-installer.ts:637`, `Memory/src/cli/runtime-installer.ts:704-711`), a Windows Script Host JScript wrapper calling `WScript.Shell.Run('"' + cmd + '"', 0, true)`.
  4. `registerAndStartUserService` (`Memory/src/cli/runtime-installer.ts:785-800`) writes UTF-16LE `%USERPROFILE%\.memmy\memory-service\service-task.xml` with a `LogonTrigger` that runs `C:\Windows\System32\wscript.exe` with arguments `/B /Nologo /E:JScript "%USERPROFILE%\.memmy\bin\memmy-memory-service.js"`, registers it via `schtasks /Create /TN "Memmy Memory Service" /XML <taskPath> /F`, and starts it via `schtasks /Run /TN "Memmy Memory Service"` (service registration can be skipped with `--skip-service-registration`, `Memory/src/cli/runtime-installer.ts:158`).

---

## 2. Required Model Calls, Local Ollama (`127.0.0.1`) Without Key, and No-Model Failure Modes

### Which model calls does memory need (extraction, consolidation, embeddings)?

`memmy-memory` defines **three model roles** in `Memory/src/config/index.ts:302-304`, routes task stages in `Memory/src/model/task-routing.ts:14-21`, instantiates clients in `Memory/src/service/memory-service.ts:478-480`, and classifies worker jobs in `Memory/src/service/worker/job-policy-registry.ts:67-95`:

1. **`summary` role (`this.llm` — extraction, turn judgment, episode routing/titles, reward scoring, retrieval filtering)**:
   - Turn and span summarization (`capture.summarize`) in `Memory/src/service/evolution/span-pipeline.ts:713`, `Memory/src/service/evolution/span-pipeline.ts:804`, and `Memory/src/service/evolution/span-pipeline.ts:888`.
   - Single-call post-turn judge (`turn.judge.v1` — extracts L1 step summary, `user_memories`, and implicit user feedback/attitude) in `Memory/src/service/evolution/turn-judge.ts:18` (invoked by `Memory/src/service/session/session-turn-service.ts:2314-2322`).
   - Observation fact extraction (`capture.observation_extract`) in `Memory/src/service/evidence/observation-memory-pipeline.ts:140`.
   - Work memory extraction and merge (`capture.work_memory_extract`, `capture.work_memory_merge`) in `Memory/src/service/work-memory/work-memory-pipeline.ts:273` and `Memory/src/service/work-memory/work-memory-pipeline.ts:483`.
   - Span topic drift and reflection (`capture.alpha.*`, `capture.reflection.batch.*`, `capture.reflection.synth`) in `Memory/src/service/evolution/span-pipeline.ts:226`, `Memory/src/service/evolution/span-pipeline.ts:343`, `Memory/src/service/evolution/span-pipeline.ts:413`, `Memory/src/service/evolution/span-pipeline.ts:615`, and `Memory/src/service/evolution/span-pipeline.ts:624`.
   - Multi-subtask big-turn segmentation (`span.big_turn.v1`) in `Memory/src/service/evolution/big-turn-span-pipeline.ts:118`.
   - Episode routing (`episode.select.v1`) in `Memory/src/service/session/episode-selection.ts:68`, episode title generation (`episode_title.<stage>`) in `Memory/src/service/episode-title/episode-title-service.ts:139`, and episode relation classification/arbitration (`relation.classify.v1`, `relation.arbitration.v1`) in `Memory/src/algorithm/plugin-algorithms.ts:889` and `Memory/src/algorithm/plugin-algorithms.ts:926`.
   - Human-attitude reward scoring (`reward.r_human.*`) in `Memory/src/service/evolution/reward-pipeline.ts:395` and `Memory/src/service/evolution/reward-pipeline.ts:421`.
   - Retrieval candidate filtering and query keyword extraction (`retrieval.filter.*`, `retrieval.query_extract.*`) in `Memory/src/service/retrieval/retrieval-service.ts:2606` and `Memory/src/service/retrieval/retrieval-service.ts:2772`.
2. **`evolution` role (`this.skillLlm` — consolidation, policy/world-model synthesis, skill evolution, failure/repair analysis, query rewrite)**:
   - L2 policy induction (`l2_induction.*`) in `Memory/src/service/evolution/policy-induction.ts:563`.
   - L3 world model consolidation (`l3_world_model.<targetField>`) in `Memory/src/service/evolution/l3-world-model-pipeline.ts:123`.
   - Project environment code and folder profiling (`project_environment_code_profile`, `project_environment_folder_profile`) in `Memory/src/service/project-environment/profile-pipeline.ts:92-94` (bound to `this.skillLlm` in `Memory/src/service/memory-service.ts:492`).
   - Skill induction, upgrading, merging, and external evidence suggestion (`skill.*`, `skill.batch_evolve.*`, `skill.external_evidence.suggest`) in `Memory/src/service/evolution/skill-pipeline.ts:1240`, `Memory/src/service/evolution/skill-cluster-pipeline.ts:537`, `Memory/src/service/evolution/skill-cluster-pipeline.ts:697`, and `Memory/src/service/memory-service.ts:2009`.
   - Feedback refinement, decision repair, failure experience sink, and negative experience synthesis (`feedback.refine.v1`, `decision_repair.*`, `failure_experience_sink.*`, `negative_experience`) in `Memory/src/service/feedback/feedback-experience.ts:1008`, `Memory/src/service/feedback/feedback-experience.ts:1038`, `Memory/src/service/feedback/feedback-experience.ts:2157`, `Memory/src/service/feedback/feedback-experience.ts:2253`, `Memory/src/service/evolution/negative-experience-pipeline.ts:72`, and `Memory/src/service/evolution/evolution-job-processor.ts:178`.
   - Retrieval query rewrite (`retrieval.query_rewrite.v1`) in `Memory/src/service/retrieval/retrieval-service.ts:2719`.
3. **`embedding` role (`this.embedder` — document and query vector generation)**:
   - Document and query embeddings (`embedding.document`, `embedding.query`) in `Memory/src/model/embedder.ts:87`, `Memory/src/model/embedder.ts:95`, `Memory/src/model/embedder.ts:265`, `Memory/src/service/embedding/embedding-job-processor.ts:217-298`, and `Memory/src/service/retrieval/retrieval-service.ts:2917`.

### Can every one of them point at a local Ollama on `127.0.0.1` with no key?

**Yes.** Every model role (`summary`, `evolution`, and `embedding`) can point to a local Ollama OpenAI-compatible endpoint (`http://127.0.0.1:11434/v1`) with an empty or omitted API key:

- **`summary` and `evolution` (`HttpLlmClient`)**: `HttpLlmClient.isConfigured()` in `Memory/src/model/llm.ts:116-127` (specifically line `126`) evaluates `Boolean(this.config.model && (this.config.apiKey || this.config.endpoint))`. When configured with `provider: "openai_compatible"`, `endpoint: "http://127.0.0.1:11434/v1"`, `model: "<ollama-model>"`, and no `apiKey`, `completeOpenAiCompatible` (`Memory/src/model/llm.ts:339-388`) posts to `http://127.0.0.1:11434/v1/chat/completions`, and `bearer(undefined)` in `Memory/src/model/http.ts:105-107` returns `{}` so no `Authorization` header is sent.
- **`embedding` (`HttpEmbedder` or `LocalXenovaEmbedder`)**: `HttpEmbedder.embedBatch` in `Memory/src/model/embedder.ts:142-144` and `Memory/src/model/embedder.ts:229-263` (specifically line `236`) only throws if `(!this.config.apiKey && !this.config.endpoint)` when `provider: "openai_compatible"` and `mode: "custom"`. With `endpoint: "http://127.0.0.1:11434/v1"` and no `apiKey`, it posts to `http://127.0.0.1:11434/v1/embeddings` without an `Authorization` header (`bearer(this.config.apiKey)` at `Memory/src/model/embedder.ts:262`). Alternatively, `embedding.provider: "local"` runs CPU ONNX embeddings (`Xenova/all-MiniLM-L6-v2`) in-process with no key (`Memory/src/config/index.ts:365-376`, `Memory/src/model/embedder.ts:56`, `Memory/src/model/embedder.ts:177-210`).

### What breaks with no model at all?

- **When `summary` and `evolution` have no LLM configured (`provider: ""` or `"local_only"`, `Memory/src/model/llm.ts:117-119`, `Memory/src/model/llm.ts:159-164`)**:
  1. **Five summary worker queues stall indefinitely in `summary_pending`**: `SUMMARY_JOBS_REQUIRING_MODEL` (`["episode_assignment", "trace_summary", "import_summary", "observation_extract", "episode_title"]`, `Memory/src/service/worker/worker-runner.ts:70`, `Memory/src/service/worker/worker-runner.ts:1405-1407`) throw `SummaryModelUnconfiguredError` (`Memory/src/service/embedding/embedding-job-processor.ts:376`, `Memory/src/service/embedding/embedding-job-processor.ts:414`, `Memory/src/service/episode-title/episode-title-service.ts:127-129`, `Memory/src/service/evidence/observation-memory-pipeline.ts:120`) and are held indefinitely in `queued` / `summary_pending` by `holdUnconfiguredSummaryJob` (`Memory/src/service/worker/worker-runner.ts:940-942`, `Memory/src/service/worker/worker-runner.ts:1429-1450`).
  2. **Imported outside-agent memories never get embedded**: `processEmbeddingJob` checks `memoryNeedsImportSummary(existing)` in `Memory/src/service/embedding/embedding-job-processor.ts:280-289`; for agent-source imports without `import_summary` completed, it re-enqueues `import_summary` and returns `null`, leaving imported transcripts unembedded.
  3. **L3 world model and project profiling jobs fail into `blockedReason: "configuration"`**: `L3WorldModelPipeline.SynthesizeField` (`Memory/src/service/evolution/l3-world-model-pipeline.ts:121-128`) and `ProjectEnvironmentProfilePipeline.generateDigest` (`Memory/src/service/project-environment/profile-pipeline.ts:90-106`) call `completeStrictJson` (`Memory/src/service/l3-world-model/strict-json-completion.ts:45-61`) without checking `isConfigured()`, which throws `"LLM provider is not configured"` and blocks the job (`Memory/src/service/worker/worker-runner.ts:1078-1094`). External skill suggestion (`POST /api/v1/evidence/skills/suggest`) throws HTTP 409 `conflict` (`Memory/src/service/memory-service.ts:1985`).
  4. **Work memory and big-turn segmentation become no-ops**: `WorkMemoryPipeline` (`Memory/src/service/work-memory/work-memory-pipeline.ts:265`, `Memory/src/service/work-memory/work-memory-pipeline.ts:439`) and `BigTurnSpanPipeline` (`Memory/src/service/evolution/big-turn-span-pipeline.ts:93`) immediately return empty results when `!this.llm.isConfigured()`.
  5. **What still works via heuristic fallbacks**: Direct `POST /api/v1/memory/add` and `POST /api/v1/turns/:turnId/complete` still write rows to SQLite; `session-turn-service.ts` skips `turn.judge.v1`, marks L1 traces `"active"` using raw turn text (`Memory/src/service/session/session-turn-service.ts:2314-2345`), and falls back to regex user-memory extraction (`Memory/src/service/session/session-turn-service.ts:3550`). L2 policy induction (`Memory/src/service/evolution/policy-induction.ts:515`), skill induction (`Memory/src/service/evolution/skill-pipeline.ts:1123`), reward scoring (`Memory/src/service/evolution/reward-pipeline.ts:366`), and feedback/decision repair (`Memory/src/service/feedback/feedback-experience.ts:641`, `Memory/src/service/feedback/feedback-experience.ts:669`, `Memory/src/service/feedback/feedback-experience.ts:977`) fall back to deterministic heuristics.
- **When no embedding model is available either**:
  - `embedding` and `user_memory_embedding` jobs fail into `embedding_retry_queue` / `blockedReason: "configuration"` (`Memory/src/service/worker/worker-runner.ts:1007-1009`, `Memory/src/service/worker/worker-runner.ts:1030-1040`, `Memory/src/service/worker/worker-runner.ts:1360-1379`), and `RetrievalService.queryVector` (`Memory/src/service/retrieval/retrieval-service.ts:2915-2926`) catches the embedder failure and degrades search to `text_only_retrieval` (SQLite FTS5 BM25 + keyword/tag scoring).

---

## 3. Outside Agents Read and Modified by `memmy-memory`

### Supported agent registries and how `memmy-memory init` writes to agent folders

- **Registered outside agents (10 total)**: Defined in `createBuiltinSourceRegistry` (`Memory/src/agent-source/runtime.ts:921-934`), `createBuiltinIntegrationRegistry` (`Memory/src/agent-source/runtime.ts:936-949`), and `SUPPORTED_MEMMY_AGENT_IDS` (`Memory/src/cli/skill-writer/index.ts:6-17`).
- **Cross-agent skill ingestion (all 10 agents, read-only)**: During source scans, `ingestAgentSkills` (`Memory/src/agent-source/runtime.ts:1465-1607`) walks `<agentRoot>/skills/**/SKILL.md` up to depth 2 (excluding `memmy-memory`, `node_modules`, and `.git`) using read-only `readFile(filePath, "utf8")` (`Memory/src/agent-source/runtime.ts:1506`).
- **How `memmy-memory init` writes into agent folders**: `installConfiguredAgents` (`Memory/src/cli/setup.ts:199-216`) runs in two modes (unless `--skip-agent-skills` is passed, `Memory/src/cli/setup.ts:81`, `Memory/src/cli/setup.ts:200`):
  1. **Skill-writer mode** (default in standalone `Memory/` or with `--skills-only`, `Memory/src/cli/skill-writer/index.ts:46-95`, `Memory/src/cli/skill-writer/index.ts:158-197`): copies `skills/memmy-memory/` (`SKILL.md`, `references/cli.md`, `references/config.md`, `references/Setup.md`) into `<agentRoot>/skills/memmy-memory/` and injects a `<!-- memmy:start v=1 --> ... <!-- memmy:end v=1 -->` block into the agent's root instruction file (`injectFile`).
  2. **Full plugin/hook adapter mode** (when `MEMMY_AGENT_INTEGRATION_ROOT` points to `App/backend/dist/src`, `Memory/src/cli/adapter-installer.ts:34-70`): invokes `target.installPlugin ?? target.install` (`Memory/src/agent-source/runtime.ts:619-630`), which writes hook scripts, plugins, and config mutations into each agent's folder.

### Per-agent breakdown

1. **Claude Code (`claude_code`)**
   - **Files read (read-only)**: `%USERPROFILE%\.claude\projects\**\*.jsonl` (ignoring `.jsonl.bak-*`), streamed via `fs.createReadStream` (`Memory/src/agent-source/agent-paths.ts:44-50`, `Memory/src/agent-source/adapters/claude-code/project-discovery.ts:23-79`, `Memory/src/agent-source/adapters/claude-code/transcript-reader.ts:14-21`, `Memory/AgentSourceCore/src/claude-code-source-turn.ts:39-70`, `Memory/AgentSourceCore/src/jsonl-lines.ts:16-17`), plus `<workspace>\.git` stat check (`Memory/src/agent-source/adapters/claude-code/project-discovery.ts:96-106`) and `%USERPROFILE%\.claude\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1596`).
   - **What `memmy-memory init` writes**:
     - `writeAllAgentSkills` (`Memory/src/cli/skill-writer/index.ts:51-55`): injects `<!-- memmy:start v=1 -->` block into `%USERPROFILE%\.claude\CLAUDE.md` and writes `%USERPROFILE%\.claude\skills\memmy-memory\`.
     - `installPlugin` (`Memory/src/agent-source/integration/claude-code/target.ts:88-121`, `Memory/src/agent-source/integration/claude-code/target.ts:223-270`): writes `%USERPROFILE%\.claude\hooks\memmy-resume-hook.mjs`, `%USERPROFILE%\.claude\hooks\memmy-memory-config.json`, `%USERPROFILE%\.claude\hooks\memmy-workspace-bridge.mjs`, `%USERPROFILE%\.claude\commands\memmy-resume.md`, and modifies `%USERPROFILE%\.claude\settings.json` (`hooks.UserPromptSubmit`, `hooks.Stop`, `hooks.SessionStart`, `hooks.PreCompact`, `hooks.SessionEnd`).
2. **Codex (`codex`)**
   - **Files read (read-only)**: `%USERPROFILE%\.codex\sessions\**\rollout-*.jsonl` (or `$CODEX_HOME/sessions`), streamed via `fs.createReadStream` (`Memory/src/agent-source/agent-paths.ts:52-59`, `Memory/src/agent-source/adapters/codex/session-discovery.ts:23-90`, `Memory/AgentSourceCore/src/jsonl-lines.ts:16-17`), plus `%USERPROFILE%\.codex\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1597`).
   - **What `memmy-memory init` writes**:
     - `writeAllAgentSkills` (`Memory/src/cli/skill-writer/index.ts:56-60`): injects `<!-- memmy:start v=1 -->` block into `%USERPROFILE%\.codex\AGENTS.md` and writes `%USERPROFILE%\.codex\skills\memmy-memory\`.
     - `installPlugin` (`Memory/src/agent-source/integration/codex/target.ts:94-131`, `Memory/src/agent-source/integration/codex/target.ts:206-240`, `Memory/src/agent-source/integration/codex/hook-trust.ts:54-95`): writes `%USERPROFILE%\.codex\hooks\memmy-resume-hook.mjs`, `%USERPROFILE%\.codex\hooks\memmy-memory-config.json`, `%USERPROFILE%\.codex\hooks\memmy-workspace-bridge.mjs`, `%USERPROFILE%\.codex\skills\memmy-resume\SKILL.md`, modifies `%USERPROFILE%\.codex\hooks.json`, and spawns `codex app-server` (`config/value/write`) to enable `features.codex_hooks` in Codex's user config.
3. **Cursor (`cursor`)**
   - **Files read (read-only)**: `%USERPROFILE%\AppData\Roaming\Cursor\User\workspaceStorage\<hash>\state.vscdb`, `%USERPROFILE%\AppData\Roaming\Cursor\User\workspaceStorage\<hash>\workspace.json`, and `%USERPROFILE%\AppData\Roaming\Cursor\User\globalStorage\state.vscdb` (`Memory/src/agent-source/agent-paths.ts:18-41`, `Memory/src/agent-source/adapters/cursor/workspace-discovery.ts:25-74`). Opens SQLite `state.vscdb` strictly read-only via `new Database(path, { readonly: true, fileMustExist: true })` (`Memory/src/agent-source/adapters/cursor/vscdb-reader.ts:16-33`), reading `ItemTable` (`composer.composerData`) and `cursorDiskKV` (`bubbleId:*`, `Memory/src/agent-source/adapters/cursor/vscdb-reader.ts:44-63`). Also reads `%USERPROFILE%\.cursor\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1595`).
   - **What `memmy-memory init` writes**:
     - `writeAllAgentSkills` (`Memory/src/cli/skill-writer/index.ts:61-65`): writes `%USERPROFILE%\.cursor\skills\memmy-memory\` (`injectFile: null`).
     - `installPlugin` (`Memory/src/agent-source/integration/cursor/target.ts:62-86`, `Memory/src/agent-source/integration/cursor/target.ts:123-153`): writes `%USERPROFILE%\.cursor\hooks\memmy-resume-hook.mjs`, `%USERPROFILE%\.cursor\hooks\memmy-memory-config.json`, `%USERPROFILE%\.cursor\hooks\memmy-workspace-bridge.mjs`, `%USERPROFILE%\.cursor\skills\memmy-resume\SKILL.md`, and modifies `%USERPROFILE%\.cursor\hooks.json` (`beforeSubmitPrompt`, `afterAgentResponse`, `stop`, `sessionStart`, `preCompact`, `sessionEnd`).
4. **Gemini**
   - **Files read / written**: **`not found`**. Neither `createBuiltinSourceRegistry` (`Memory/src/agent-source/runtime.ts:921-934`), `createBuiltinIntegrationRegistry` (`Memory/src/agent-source/runtime.ts:936-949`), nor `SUPPORTED_MEMMY_AGENT_IDS` (`Memory/src/cli/skill-writer/index.ts:6-17`) includes a Gemini CLI / Antigravity transcript reader or skill target (only `gemini` as an LLM API provider in `Memory/src/model/llm.ts:289` and `AIza...` Google key redaction in `Memory/AgentSourceCore/src/secret-redactor.ts:29-32`).
5. **OpenCode (`opencode`)**
   - **Files read (read-only)**: `%LOCALAPPDATA%\opencode\opencode.db` on Windows (`Memory/src/agent-source/agent-paths.ts:61-74`), opened via `new DatabaseSync(path, { readOnly: true })` (`Memory/src/agent-source/adapters/opencode/db-reader.ts:21-34`), plus `%USERPROFILE%\.config\opencode\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1598`).
   - **What `memmy-memory init` writes**:
     - `writeAllAgentSkills` (`Memory/src/cli/skill-writer/index.ts:66-70`): injects `<!-- memmy:start v=1 -->` block into `%USERPROFILE%\.config\opencode\AGENTS.md` and writes `%USERPROFILE%\.config\opencode\skills\memmy-memory\`.
     - `installPlugin` (`Memory/src/agent-source/integration/opencode/target.ts:90-122`, `Memory/src/agent-source/agent-paths.ts:76-82`): writes `plugins/memmy-memory.js`, `plugins/memmy-workspace-bridge.mjs`, `plugins/memmy-memory-config.json`, `commands/memmy-resume.md`, and `AGENTS.md` under `%USERPROFILE%\AppData\Roaming\opencode\` (or `$XDG_CONFIG_HOME/opencode`).
6. **OpenClaw (`openclaw`)**
   - **Files read (read-only)**: `%USERPROFILE%\.openclaw\**\*.{db,sqlite,sqlite3}` (`Memory/src/agent-source/agent-paths.ts:84-90`, `Memory/src/agent-source/adapters/openclaw/db-discovery.ts:26-116`), opened via `new Database(path, { readonly: true, fileMustExist: true })` (`Memory/src/agent-source/adapters/openclaw/db-discovery.ts:71`, `Memory/src/agent-source/adapters/openclaw/db-reader.ts:20-31`), plus `%USERPROFILE%\.openclaw\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1599`).
   - **What `memmy-memory init` writes**:
     - `writeAllAgentSkills` (`Memory/src/cli/skill-writer/index.ts:71-75`): injects `<!-- memmy:start v=1 -->` block into `%USERPROFILE%\.openclaw\workspace\AGENTS.md` and writes `%USERPROFILE%\.openclaw\skills\memmy-memory\`.
     - `installPlugin` (`Memory/src/agent-source/integration/openclaw/target.ts:94-132`, `Memory/src/agent-source/integration/openclaw/target.ts:238-295`): writes `%USERPROFILE%\.openclaw\extensions\memmy-memory\{package.json,openclaw.plugin.json,index.mjs,memmy-workspace-bridge.mjs,memmy-memory-config.json}` and modifies `%USERPROFILE%\.openclaw\openclaw.json`.
7. **Hermes (`hermes`)**
   - **Files read (read-only)**: `%USERPROFILE%\.hermes\sessions\**\*.jsonl` via `fs.createReadStream` (`Memory/src/agent-source/agent-paths.ts:96-102`, `Memory/src/agent-source/adapters/hermes/session-discovery.ts:22-73`, `Memory/src/agent-source/adapters/hermes/rollout-reader.ts:24-45`) and `%USERPROFILE%\.hermes\state.db` opened via `new Database(path, { readonly: true, fileMustExist: true })` (`Memory/src/agent-source/adapters/hermes/adapter.ts:117-130`, `Memory/src/agent-source/adapters/hermes/state-db-reader.ts:22-35`), plus `%USERPROFILE%\.hermes\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1600`).
   - **What `memmy-memory init` writes**:
     - `writeAllAgentSkills` (`Memory/src/cli/skill-writer/index.ts:76-80`): injects `<!-- memmy:start v=1 -->` block into `%USERPROFILE%\.hermes\SOUL.md` and writes `%USERPROFILE%\.hermes\skills\memmy-memory\`.
     - `installPlugin` (`Memory/src/agent-source/integration/hermes/target.ts:82-110`, `Memory/src/agent-source/integration/hermes/target.ts:168-177`): writes `%USERPROFILE%\.hermes\plugins\memmy-memory\{plugin.yaml,config.json,__init__.py}`, `%USERPROFILE%\.hermes\plugins\memmy-resume\{plugin.yaml,config.json,__init__.py}`, and modifies `%USERPROFILE%\.hermes\config.yaml` (`memory.provider = "memmy-memory"`, `toolsets`, `plugins.enabled`).
8. **DeepSeek Harness (`deepseek_harness`)**
   - **Files read (read-only)**: `%USERPROFILE%\.dsh\sessions\**\session(.vN).jsonl(.zstd)` read via `fs.promises.readFile` (`Memory/src/agent-source/agent-paths.ts:104-110`, `Memory/AgentSourceCore/src/deepseek-session-files.ts:23-64`, `Memory/AgentSourceCore/src/deepseek-session-files.ts:119-128`), plus `%USERPROFILE%\.dsh\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1601`).
   - **What `memmy-memory init` writes**:
     - `writeAllAgentSkills` (`Memory/src/cli/skill-writer/index.ts:81-85`): writes `%USERPROFILE%\.dsh\skills\memmy-memory\` (`injectFile: null`).
     - `installPlugin` (`Memory/src/agent-source/integration/deepseek-harness/target.ts:92-110`): writes `%USERPROFILE%\.dsh\profiles\node_modules\@memmy\memmy-memory\{package.json,index.mjs,client.js,memmy-workspace-bridge.mjs,memmy-memory-config.json}`, `%USERPROFILE%\.dsh\skills\memmy-resume\SKILL.md`, and modifies `%USERPROFILE%\.dsh\cordis.patch.yml`.
9. **WorkBuddy (`workbuddy`)**
   - **Files read (read-only)**: `%USERPROFILE%\.workbuddy\projects\**\*.jsonl` and sibling `<session>.meta.json` (`Memory/src/agent-source/agent-paths.ts:112-118`, `Memory/src/agent-source/adapters/workbuddy/session-discovery.ts:18-98`, `Memory/src/agent-source/adapters/workbuddy/history-reader.ts:22-55`), plus `%USERPROFILE%\.workbuddy\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1602`).
   - **What `memmy-memory init` writes**: writes `%USERPROFILE%\.workbuddy\skills\memmy-memory\` (`Memory/src/cli/skill-writer/index.ts:86-87`) and `%USERPROFILE%\.workbuddy\skills\memmy-resume\SKILL.md` (`Memory/src/agent-source/integration/workbuddy/target.ts:30-37`).
10. **Pi (`pi`)**
    - **Files read (read-only)**: `%USERPROFILE%\.pi\agent\sessions\**\*.jsonl` (`Memory/src/agent-source/agent-paths.ts:120-126`, `Memory/src/agent-source/adapters/pi/adapter.ts:44-68`), plus `%USERPROFILE%\.pi\agent\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1603`).
    - **What `memmy-memory init` writes**: writes `%USERPROFILE%\.pi\agent\skills\memmy-memory\` (`Memory/src/cli/skill-writer/index.ts:88`) and `%USERPROFILE%\.pi\agent\skills\memmy-resume\SKILL.md` (`Memory/src/agent-source/integration/pi/target.ts:9-15`, `Memory/src/agent-source/integration/skill-only-target.ts:27-34`).
11. **QwenWork (`qwenwork`)**
    - **Files read (read-only)**: `%USERPROFILE%\.qwenwork\projects\**\*.jsonl` (`Memory/src/agent-source/agent-paths.ts:128-134`, `Memory/src/agent-source/adapters/qwenwork/adapter.ts:44-68`), plus `%USERPROFILE%\.qwenwork\skills\**\SKILL.md` (`Memory/src/agent-source/runtime.ts:1482`, `Memory/src/agent-source/runtime.ts:1604`).
    - **What `memmy-memory init` writes**: writes `%USERPROFILE%\.qwenwork\skills\memmy-memory\` (`Memory/src/cli/skill-writer/index.ts:89`) and `%USERPROFILE%\.qwenwork\skills\memmy-resume\SKILL.md` (`Memory/src/agent-source/integration/qwenwork/target.ts:9-15`, `Memory/src/agent-source/integration/skill-only-target.ts:27-34`).

---

## 4. Credential Harvesting into `gateway.env` (and Legacy Plugin Migration)

### 1. Launcher writing provider credentials into `gateway.env`

- **Where it writes**: `%USERPROFILE%\.memmy\systemd\gateway.env` (or `process.env.MEMMY_GATEWAY_ENV_FILE`, `App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:327-330`, `scripts/install.sh:16`, `scripts/install.sh:228`, `scripts/install.sh:308-311`).
- **Where it looks**:
  1. `prepareSystemdGatewayEnvironment` reads `%USERPROFILE%\.memmy\config.yaml` (`getConfigPath()`, `App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:361-368`) and extracts every `${VAR}` name matching `/\$\{([A-Z_][A-Z0-9_]*)(?::[^}]*)?\}/gi` (`referencedEnvironmentKeys`, `App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:332-338`).
  2. It combines those keys with the 50-key allowlist `PERSISTED_GATEWAY_ENV_KEYS` (`App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:26-76`, `App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:370`).
  3. It reads the values from `process.env` (`App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:353`, `App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:374-378`) — which includes the caller's shell environment plus any ancestor `.env` file loaded at startup by `loadMemmyAgentEnv` (`App/memmy-agent/src/load-env.ts:28-42`, `App/memmy-agent/src/load-env.ts:88-95`) — and writes them as `KEY="value"` to `gateway.env` with mode `0o600` (`App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:371-411`).
- **What it copies (`PERSISTED_GATEWAY_ENV_KEYS` in `App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:26-76`)**:
  - **Model & search provider keys**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `DEEPSEEK_API_KEY`, `TAVILY_API_KEY`, `BRAVE_API_KEY`, `JINA_API_KEY`, `KAGI_API_KEY`, `OLOSTEP_API_KEY`, `SEARXNG_BASE_URL`, `OPENAI_TRANSCRIPTION_BASE_URL` (`App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:42-55`).
  - **GitHub, AWS, Codex, and ChatGPT OAuth/tokens**: `GITHUB_TOKEN`, `GH_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_PROFILE`, `AWS_REGION`, `AWS_DEFAULT_REGION`, `AWS_BEARER_TOKEN_BEDROCK`, `OAUTH_CLI_KIT_TOKEN_PATH`, `OPENAI_CODEX_TOKEN_PATH`, `CHATGPT_TOKEN_PATH`, `OPENAI_CODEX_ACCESS_TOKEN`, `CHATGPT_ACCESS_TOKEN`, `OPENAI_CODEX_ACCOUNT_ID`, `CHATGPT_ACCOUNT_ID` (`App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:56-71`).
  - **System, proxy, TLS, and Memmy runtime variables**: `PATH`, `SHELL`, `LANG`, `LC_ALL`, `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY`, `http_proxy`, `https_proxy`, `all_proxy`, `no_proxy`, `SSL_CERT_FILE`, `NODE_EXTRA_CA_CERTS`, `GIT_SSH_COMMAND`, `MEMMY_AGENT_PATH_APPEND`, `MEMMY_AGENT_STREAM_IDLE_TIMEOUT_S`, `MEMMY_CLOUD_SERVICE`, `MEMMY_APP_EDITION` (`App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:27-41`, `App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:72-76`), plus any `${VAR}` referenced in `%USERPROFILE%\.memmy\config.yaml` (`App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:332-338`).
- **Can that be turned off?**
  - **Yes.** `runLinuxRootTerminal` (`App/memmy-agent/src/entrypoints/cli/linux-systemd-gateway.ts:551-561`) only executes when `platform === "linux" && stdinIsTTY && stdoutIsTTY && process.env.MEMMY_LINUX_SYSTEMD_GATEWAY === "1"`. On Windows (`win32`), or when `MEMMY_LINUX_SYSTEMD_GATEWAY` is not `"1"`, or when running `memmy-memory` standalone without `memmy-agent`, `prepareSystemdGatewayEnvironment` is never invoked.

### 2. Legacy plugin credential copying inside `memmy-memory init`

- **Where it looks and what it copies**: During `memmy-memory init` (`Memory/src/cli/setup.ts:154-162`), if `%USERPROFILE%\.memmy\config.yaml` did not previously exist (`memmyConfigExisted === false`), `migrateLegacyLocalPlugins` (`Memory/src/cli/legacy-migration.ts:46-79`, `Memory/src/cli/legacy-migration.ts:107-124`, `Memory/src/cli/legacy-migration.ts:154-221`) inspects `%USERPROFILE%\.openclaw\memos-plugin\config.yaml`, `%USERPROFILE%\.hermes\memos-plugin\config.yaml`, and `%USERPROFILE%\.dsh\memos-plugin\config.yaml` and copies `llm.apiKey`, `skillEvolver.apiKey`, `embedding.apiKey`, `provider`, `endpoint`, and `model` into `%USERPROFILE%\.memmy\config.yaml`.
- **Can that be turned off?**
  - **Yes.** Pre-creating `%USERPROFILE%\.memmy\config.yaml` before `memmy-memory init` sets `memmyConfigExisted = true` (`Memory/src/cli/legacy-migration.ts:61-63`), which skips credential import, or starting `Memory/dist/src/server/index.js` directly without `memmy-memory init` never runs `migrateLegacyLocalPlugins`.

---

## 5. Outbound Network Calls When Running Memory Only

When running `memmy-memory` (`Memory/src/server/index.ts`) by itself, there are **six outbound network call paths**:

1. **Telemetry / Analytics (`POST <MEMMY_CLOUD_SERVICE>/api/analytics/events`)**
   - **Host**: `https://api.memmy.cn/api/analytics/events` (default in `.env.example:5`; resolved by `resolveAnalyticsBaseUrl` from `process.env.MEMMY_CLOUD_SERVICE` in `Memory/src/cli/analytics.ts:61-71` and `Memory/src/cli/analytics.ts:240-251`, which is populated at startup from a packaged `desktop-edition.json` manifest or ancestor `.env` by `loadMemmyMemoryEnv` in `Memory/src/cli/load-env.ts:38-80` and `Memory/src/cli/load-env.ts:96`).
   - **Purpose**: Sends `memmy_cli_invoked`, `memmy_cli_completed`, `memmy_cli_failed` (`Memory/src/cli/analytics.ts:14-18`), `memory_desktop_add_started/succeeded/failed` (`Memory/src/server/memory-add-analytics.ts:12-16`, `Memory/src/server/memory-add-analytics.ts:80-122`), and `memory_plugin_hook_*` / `memory_plugin_tool_call_*` (`Memory/src/server/plugin-runtime-analytics.ts:13-23`, `Memory/src/server/plugin-runtime-analytics.ts:61-92`), wired into the HTTP server at `Memory/src/server/http.ts:182-197`.
   - **Can it be turned off?** **Yes.** If `MEMMY_CLOUD_SERVICE` is unset/empty and no `.env` or `desktop-edition.json` defines it (`Memory/src/cli/load-env.ts:62-69`), `resolveAnalyticsBaseUrl` returns `null` (`Memory/src/cli/analytics.ts:67-71`) and `postAnalyticsEvents` returns `Promise.resolve()` without calling `fetch` (`Memory/src/cli/analytics.ts:204-210`).
2. **Account / Quota / BYOK Metering (`GET /api/app/byok-token-usage/memory-pipeline-usage` and `POST /api/app/byok-token-usage/events`)**
   - **Host**: `<runtime.baseUrl>` read from `%USERPROFILE%\.memmy\runtime.json` (`resolveDefaultRuntimeConfigPath` in `Memory/src/model/token-usage.ts:77-84` and `Memory/src/model/token-usage.ts:600-621`), which points to the Memmy desktop backend (and from there to Memmy cloud metering).
   - **Purpose**: `fetchAppMemoryBudget` (`Memory/src/model/token-usage.ts:563-598`, called by `Memory/src/service/memory-service.ts:472` and `Memory/src/service/memory-service.ts:979-1019`) checks daily/lifetime token budgets; `HttpByokTokenUsageRecorder` (`Memory/src/model/token-usage.ts:161-427`, started in `Memory/src/service/memory-service.ts:512-529`) flushes `token_usage_outbox` rows when `actualModelContext.source === "byok"`.
   - **Can it be turned off?** **Yes.** When `%USERPROFILE%\.memmy\runtime.json` does not exist (and `MEMMY_RUNTIME_CONFIG_PATH` is unset), `readRuntimeConfig` returns `null` (`Memory/src/model/token-usage.ts:600-603`) so `fetchAppMemoryBudget` makes zero network calls, and without `actualModelContext` on model calls, `recordUsage` returns `"skipped"` (`Memory/src/model/token-usage.ts:210-213`).
3. **Cloud Sync / Remote Storage (`OpenMemCloudClient` and `MemoryRestClient`)**
   - **Host**: Configured `storage.endpoint` when `storage.mode === "cloud"` or `storage.backend === "openmem_cloud"` / `"rest"`.
   - **Purpose**: Mirrors messages and feedback to `POST /add/message` and `POST /add/feedback` (`Memory/src/client/openmem-cloud-client.ts:70-94`) or `/api/v1/*` (`Memory/src/client/rest-client.ts:144-167`), initialized in `Memory/src/service/memory-service.ts:461-469`.
   - **Can it be turned off?** **Yes (off by default).** Default configuration is `storage.mode: "local"`, `storage.backend: "sqlite"` (`Memory/src/config/index.ts:332-338`), which leaves `this.cloud` `undefined` (`Memory/src/service/memory-service.ts:461-469`).
4. **HuggingFace Hub Model Download (`@huggingface/transformers`)**
   - **Host**: `https://huggingface.co` (default `@huggingface/transformers` hub host when `embedding.provider === "local"` uses `Xenova/all-MiniLM-L6-v2`).
   - **Purpose**: `createLocalXenovaPipeline` sets `transformers.env.allowRemoteModels = true` (`Memory/src/model/embedder.ts:383-386`) and only switches `allowRemoteModels = false` (`Memory/src/model/embedder.ts:400`) if `resolveBundledEmbeddingModelDirectory` finds `onnx/model_quantized.onnx` under `MEMMY_EMBEDDING_MODEL_ROOT` or packaged resources (`Memory/src/model/embedder.ts:388-402`, `Memory/src/model/embedder.ts:444-478`).
   - **Can it be turned off?** **Yes.** Setting `MEMMY_EMBEDDING_MODEL_ROOT` to a pre-populated local directory sets `transformers.env.allowRemoteModels = false` (`Memory/src/model/embedder.ts:400`), or configuring `embedding.provider: "openai_compatible"` (`mode: "custom"`) pointing to local Ollama (`http://127.0.0.1:11434/v1`) bypasses `LocalXenovaEmbedder` entirely (`Memory/src/model/embedder.ts:135-146`).
5. **Model Inference & Embedding Endpoints (`HttpLlmClient` and `HttpEmbedder`)**
   - **Host**: Configured `summary.endpoint`, `evolution.endpoint`, and `embedding.endpoint`, or provider defaults (`https://api.openai.com/v1`, `https://api.anthropic.com/v1`, `https://generativelanguage.googleapis.com/v1beta`, `https://dashscope.aliyuncs.com/compatible-mode/v1` in `Memory/src/config/index.ts:39-44`, `Memory/src/model/llm.ts:192-388`, `Memory/src/model/embedder.ts:240-360`, `Memory/src/model/http.ts:40`).
   - **Can it be turned off / kept on loopback?** **Yes.** Pointing `endpoint` to `http://127.0.0.1:11434/v1` keeps all inference on `127.0.0.1`, or setting `provider: ""` / `"local_only"` disables LLM HTTP calls (`Memory/src/model/llm.ts:116-127`).
6. **Update Checks**
   - **Inside the running memory server (`Memory/src/server/index.ts`)**: **`not found`** (the server has no background update check).
   - **Inside the CLI runtime installer (`memmy-memory install` only)**: `resolveGithubReleaseAssetUrl` and `downloadRuntimeArchive` (`Memory/src/cli/runtime-installer.ts:33`, `Memory/src/cli/runtime-installer.ts:551-594`) request `https://github.com/MemTensor/memmy-agent/releases/latest` and download release tarballs unless `--archive <local-path>` is passed (`Memory/src/cli/runtime-installer.ts:75-87`) or the server is started directly without `memmy-memory install`.

---

## 6. SQLite Storage Locations, Table Names, and External Local API / MCP Access

### Where the SQLite files live

1. **Primary database**: `%USERPROFILE%\.memmy\memory-service\memory.sqlite` (`defaultDatabasePath()` in `Memory/src/storage/db.ts:185-191`; overridable via `--db`, `MEMMY_MEMORY_DB`, `MEMMY_MEMORY_HOME`, `MEMORY_SERVICE_HOME`, or `memmyMemory.storage.dbPath` in `Memory/src/config/index.ts:335`, `Memory/src/config/index.ts:612`, `Memory/src/config/index.ts:728-733`). Loads the native `sqlite-vec` (`v0.1.9`) extension on open (`Memory/src/storage/db.ts:56-64`, `Memory/src/storage/sqlite-vec-store.ts:4`).
2. **Panel cache sidecar database**: `%USERPROFILE%\.memmy\memory-service\memory.sqlite.panel-cache.sqlite` (`openPanelCache` in `Memory/src/storage/panel-cache-db.ts:6-8`).
3. **Agent-source checkpoints database**: `%USERPROFILE%\.memmy\memory-service\agent-sources.json.checkpoints.sqlite` (`Memory/src/agent-source/runtime.ts:169`, `Memory/src/agent-source/runtime.ts:179`, `Memory/src/agent-source/runtime.ts:810`, `Memory/src/agent-source/source-checkpoints.ts:9-26`).
4. **Per-scan staging databases**: `%USERPROFILE%\.memmy\memory-service\agent-source-scans\scan-<jobId>.sqlite` (`Memory/src/agent-source/runtime.ts:171-174`, `Memory/src/agent-source/scan-store.ts:36-56`).

### Table names

- **In `memory.sqlite` (36 base tables + 2 FTS5 virtual tables + 1 worker counter table + dynamic `sqlite-vec` virtual tables)**:
  - Defined in `Memory/src/storage/schema.ts:21-742`:
    1. `schema_migrations` (`Memory/src/storage/schema.ts:22`)
    2. `memories` (`Memory/src/storage/schema.ts:29`)
    3. `l3_world_model_scopes` (`Memory/src/storage/schema.ts:93`)
    4. `user_memories` (`Memory/src/storage/schema.ts:110`)
    5. `user_memories_fts` (`USING fts5`, `Memory/src/storage/schema.ts:140`)
    6. `memories_fts` (`USING fts5`, `Memory/src/storage/schema.ts:147`)
    7. `memory_vector_entries` (`Memory/src/storage/schema.ts:155`)
    8. `sessions` (`Memory/src/storage/schema.ts:168`)
    9. `l3_world_model_session_cursors` (`Memory/src/storage/schema.ts:193`)
    10. `work_memory_session_cursors` (`Memory/src/storage/schema.ts:199`)
    11. `episodes` (`Memory/src/storage/schema.ts:205`)
    12. `raw_turns` (`Memory/src/storage/schema.ts:243`)
    13. `l3_world_model_input_traces` (`Memory/src/storage/schema.ts:269`)
    14. `feedback` (`Memory/src/storage/schema.ts:282`)
    15. `l3_world_model_evidence_batches` (`Memory/src/storage/schema.ts:312`)
    16. `l3_world_model_batch_targets` (`Memory/src/storage/schema.ts:339`)
    17. `decision_repairs` (`Memory/src/storage/schema.ts:357`)
    18. `l2_candidate_pool` (`Memory/src/storage/schema.ts:383`)
    19. `trace_policy_links` (`Memory/src/storage/schema.ts:402`)
    20. `skill_trials` (`Memory/src/storage/schema.ts:417`)
    21. `skill_clusters` (`Memory/src/storage/schema.ts:447`)
    22. `skill_cluster_members` (`Memory/src/storage/schema.ts:467`)
    23. `recall_events` (`Memory/src/storage/schema.ts:479`)
    24. `api_logs` (`Memory/src/storage/schema.ts:505`)
    25. `memory_change_log` (`Memory/src/storage/schema.ts:520`)
    26. `idempotency_keys` (`Memory/src/storage/schema.ts:540`)
    27. `source_turn_captures` (`Memory/src/storage/schema.ts:548`)
    28. `memory_capture_claims` (`Memory/src/storage/schema.ts:579`)
    29. `l3_world_model_project_environment_state` (`Memory/src/storage/schema.ts:591`)
    30. `evolution_jobs` (`Memory/src/storage/schema.ts:608`)
    31. `embedding_retry_queue` (`Memory/src/storage/schema.ts:651`)
    32. `memory_processing_state` (`Memory/src/storage/schema.ts:679`)
    33. `artifacts` (`Memory/src/storage/schema.ts:701`)
    34. `runtime_kv` (`Memory/src/storage/schema.ts:715`)
    35. `audit_logs` (`Memory/src/storage/schema.ts:721`)
    36. `token_usage_outbox` (`Memory/src/storage/schema.ts:737`)
  - Defined in `Memory/src/storage/source-changes.ts:7-13`:
    37. `source_change_state` (`Memory/src/storage/source-changes.ts:7`)
    38. `source_changes` (`Memory/src/storage/source-changes.ts:11`)
  - Defined in `Memory/src/storage/queue-scheduling-schema.ts:25-27`:
    39. `worker_enqueue_counter` (`Memory/src/storage/queue-scheduling-schema.ts:25`)
  - Defined in `Memory/src/storage/sqlite-vec-store.ts:328-346`:
    40. `memory_vec_<dimension>` (`USING vec0(embedding float[<dimension>])`, e.g. `memory_vec_384`, `Memory/src/storage/sqlite-vec-store.ts:334`, `Memory/src/storage/sqlite-vec-store.ts:344`).
- **In `memory.sqlite.panel-cache.sqlite`** (`Memory/src/storage/panel-cache-db.ts:33`, `Memory/src/storage/panel-cache.ts:26-49`):
  - `panel_source_file`, `panel_cache_meta`, `panel_memory_dirty`, `panel_log_dirty`, `panel_metric_dirty`, `panel_memory_facts`, `panel_memory_visibility`, `panel_visibility_dirty`, `panel_log_facts`, `panel_log_refs`, `panel_log_metrics`, `panel_sync_state`, `panel_statistics`.
- **In `agent-sources.json.checkpoints.sqlite`** (`Memory/src/agent-source/source-checkpoints.ts:15-25`):
  - `sources`, `messages`, `conversations`.
- **In `agent-source-scans/scan-<jobId>.sqlite`** (`Memory/src/agent-source/scan-store.ts:42-56`):
  - `scan_meta`, `schema_meta`, `scan_import_memories`, `scan_options`, `staged_messages`, `scan_source_state`, `scan_cursors`, `checkpoints`, `conversation_meta`, `turn_meta`, `scan_results`.

### Can another tool search and add through a local API or MCP without the Memmy agent?

- **Local HTTP REST API and CLI**: **Yes.** Any local tool can call `POST http://127.0.0.1:18960/api/v1/memory/search`, `POST http://127.0.0.1:18960/api/v1/memory/add`, `GET http://127.0.0.1:18960/api/v1/memory/:id`, `POST http://127.0.0.1:18960/api/v1/turns/start`, `POST http://127.0.0.1:18960/api/v1/turns/:turnId/complete`, and `POST http://127.0.0.1:18960/api/v1/source-turns/complete` (`Memory/src/server/http.ts:71-119`, `Memory/src/client/rest-client.ts:30-142`), or invoke `memmy-memory search --query ...` and `memmy-memory add --content ...` (`Memory/src/cli/commands.ts:52-63`, `Memory/src/cli/commands.ts:167-205`) without the Memmy agent. When `storage.token` is unset, loopback requests are accepted without a token (`Memory/src/server/index.ts:201-203`); when set, requests pass `Authorization: Bearer <token>` or `x-memmy-service-token` (`Memory/src/server/http.ts:1590-1635`).
- **MCP server**: **`not found` (explicitly absent).** `memmy-memory` does not provide an MCP server; `Memory/tests/cli.test.ts:36-40` explicitly asserts `it("does not expose MCP commands in this release")` and verifies that `memmy-memory mcp serve` exits with `"unknown command: mcp serve"`.

---

## 7. What Memmy Offers Beyond Our Stack & Top 3 Ideas to Build In-House

### What `memmy-memory` offers that we do not have today

Today we have per-task Obsidian handoff notes (`%USERPROFILE%\Obsidian\<Node>\`), a centralized fleet `ai-memory` MCP server on the T5500, and per-repo Graphy code maps (`graphify-out/graph.json`). Compared to those three primitives, `memmy-memory` adds:

- **Automatic multi-layer memory stratification (`L1` / `L2` / `L3` / `Skill` / `user_memories`)**: Raw turn transcripts (`raw_turns`) are automatically distilled into `L1` step traces with dual embeddings (`vec_summary` + `vec_action`), clustered into `L2` behavioral policies (`l2_candidate_pool`), consolidated into monotonic-cursor `L3` world-model scopes (`l3_world_model_scopes`), and promoted into reusable `Skill` memories (`Memory/src/storage/schema.ts:29-164`, `Memory/src/storage/schema.ts:383-478`, `Memory/src/service/embedding/embedding-job-processor.ts:217-298`).
- **Closed-loop recall telemetry and failure repair**: Every recall logs a `recall_events` row (`Memory/src/storage/schema.ts:479-501`) and links injected skills/policies to subsequent turn outcomes (`skill_trials` in `Memory/src/storage/schema.ts:417-446` and `decision_repairs` in `Memory/src/storage/schema.ts:357-382`), automatically synthesizing negative experiences (`Memory/src/service/evolution/negative-experience-pipeline.ts:70-150`) when an agent fails or is corrected.
- **Incremental, watermarked multi-agent transcript harvesting with pre-ingest redaction**: Background adapters tail local session logs across Claude Code, Codex, Cursor, Hermes, OpenCode, and OpenClaw using SQLite watermarks (`Memory/src/agent-source/source-checkpoints.ts:9-26`), QA-pair hash deduplication (`memory_capture_claims` in `Memory/src/storage/schema.ts:579-590`), and regex secret/base64 stripping (`Memory/AgentSourceCore/src/secret-redactor.ts:11-61`).

### Three ideas most worth building ourselves, in-house

1. **Read-Only Watermarked Transcript Harvester with Pre-Ingest Secret Redaction (into T5500 `ai-memory`)**
   - **Source inspiration**: `Memory/src/agent-source/runtime.ts:1302-1406`, `Memory/src/agent-source/source-checkpoints.ts:9-26`, `Memory/src/storage/schema.ts:579-590` (`memory_capture_claims`), and `Memory/AgentSourceCore/src/secret-redactor.ts:11-61`.
   - **In-house design**: Build a small read-only harvester in `ops/node/` that tails local Claude Code, Codex, Cursor, Gemini, and Hermes transcripts using per-conversation SHA-256 watermarks, runs deterministic `[REDACTED:XXXX]` secret/token/base64 scrubbing before any network hop, and writes deduplicated turn summaries directly to our T5500 `ai-memory` MCP server—without ever mutating `CLAUDE.md`, `AGENTS.md`, `SOUL.md`, or `settings.json`.
2. **Single-Pass Post-Turn Judge & Anti-Pattern (`decision_repairs`) Extractor on Sabretooth Ollama**
   - **Source inspiration**: `turn.judge.v1` in `Memory/src/service/evolution/turn-judge.ts:18-92`, `decision_repairs` in `Memory/src/storage/schema.ts:357-382`, and `Memory/src/service/feedback/feedback-experience.ts:1008-1045`.
   - **In-house design**: Run a single structured JSON prompt against Sabretooth's local Ollama (`:11434`, zero API cost, zero GPU load on Alienware) after task completion to extract `{step_summary, user_preference, issue, anti_pattern, repair_rule}` and promote recurring fixes into `ai-memory` rule pages.
3. **Recall Outcome & Skill Trial Ledger (`recall_events` + `skill_trials`) inside `ai-memory`**
   - **Source inspiration**: `recall_events` (`Memory/src/storage/schema.ts:479-501`), `skill_trials` (`Memory/src/storage/schema.ts:417-446`), and `RewardPipeline` (`Memory/src/service/evolution/reward-pipeline.ts:360-430`).
   - **In-house design**: Record which `ai-memory` pages were retrieved for a task and whether the resulting PR/test run passed or required user correction, automatically boosting high-signal pages and decaying stale or misleading memories.

---

## Verdict

**build its ideas ourselves**
