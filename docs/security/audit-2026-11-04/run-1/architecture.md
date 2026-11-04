# Architecture and Threat Model (`Trollz1004/dream-online`)

## 1. Stack and Execution Model
The repository is a polyglot TypeScript/JavaScript, Electron, and PowerShell/Batch monorepo across three operational nodes:
- **DREAM Engine & Studio Server (`server.ts`, `src/engine/`, `src/ui/`, `src/shell/`)**: Node.js + Express 4 HTTP API server (`server.ts:62-834`) coupled with a Vite + React 19 + WebGPU/WebGL2/Three.js client. Listens on `0.0.0.0:9180` (`server.ts:809, 827`).
- **Dream Task Router (`ops/router/`)**: TypeScript task dispatcher (`ops/router/resolve-route.ts`, `ops/router/validate-config.ts`) and execution adapters (`ops/router/adapters/agy.ts`, `ops/router/adapters/hermes.ts`, `ops/router/adapters/types.ts`) that spawn local CLIs (`agy`, `claude`) or stage prompt files over `scp`/`ssh` to remote nodes.
- **Eyes Visual Verification Gate (`ops/eyes/`)**: Headless Playwright + Chromium visual inspection CLI (`ops/eyes/eyes.ts`) that navigates to target URLs (`ops/eyes/lib/capture.ts`), evaluates browser DOM/pixel scripts (`ops/eyes/lib/dom.browser.cjs`, `ops/eyes/lib/pixels.browser.cjs`), composites screenshots (`ops/eyes/lib/imaging.ts`), and invokes vision model APIs (`ops/eyes/lib/judge.ts`).
- **Sabretooth Command Studio (`apps/hermes-leadgen/`)**: Electron 35 desktop shell (`main.js`, `preload.js`, `renderer.js`) wrapping a Node.js `http.createServer` backend (`apps/hermes-leadgen/server.js`) listening on `0.0.0.0:8392` (`server.js:1588`).
- **Public Marketing Site (`sites/dream-online-net/`)**: Static HTML/CSS landing page (`sites/dream-online-net/index.html`, `sites/dream-online-net/styles.css`).
- **Git Hooks & Node Operations (`ops/hooks/`, `ops/node/`)**: Pre-push secret and private-IP scanner (`ops/hooks/secret-scan.mjs`), hook installer (`ops/hooks/install-hooks.mjs`), scheduled tasks (`ops/node/register-drift-logon.ps1`, `ops/node/register-health-task.ps1`), node boot scripts (`ops/node/boot-alienware-services.vbs`, `ops/node/install-alienware-autostart.ps1`), and SSH key repair script (`ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat`).

## 2. Trust Boundaries and Principals
1. **Unauthenticated LAN / Network Caller**: Both `server.ts:827` (`0.0.0.0:9180`) and `apps/hermes-leadgen/server.js:1588` (`0.0.0.0:8392`) bind to all network interfaces (`0.0.0.0`), exposing HTTP APIs to any host on the local network.
2. **Untrusted Browser Origin (Cross-Website Caller)**: `apps/hermes-leadgen/server.js:882-898` checks `Origin` only when `req.headers.origin` is present and only when `req.method === 'POST'`, leaving `GET`, `PUT`, `DELETE`, and `PATCH` requests (including `/proxy/fcc/*` and `/proxy/hermes/*`) unchecked for `Origin`.
3. **Autonomous AI Agent / Task Queue Input**: Task dispatch inputs (`DispatchJobInput` in `ops/router/adapters/hermes.ts`), NPC dialogue inputs (`server.ts:300-364`), and agent memory sync payloads (`apps/hermes-leadgen/server.js:1430-1434`) cross into remote SSH command strings and shared Obsidian/memory ledgers.
4. **Inspected Preview Page (`ops/eyes/`)**: Local web servers inspected by Playwright in `ops/eyes/lib/capture.ts:95-127` execute untrusted page JavaScript in the same main world where `window.__eyesDom.collect(800)` is invoked.
5. **Local OS User (`%USERPROFILE%`) & Administrator Context**: Scheduled tasks (`register-drift-logon.ps1`, `register-health-task.ps1`) execute at `-RunLevel Limited`, whereas `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat` auto-elevates via `-Verb RunAs` to Windows `Administrator`.

## 3. Entrypoints and Attack Surface
- **DREAM Engine Express API (`server.ts:192-806`, `0.0.0.0:9180`)**:
  - `POST /api/gm/world/nightfall`, `POST /api/gm/events/:id/pause`, `POST /api/gm/economy/mint`, `POST /api/gm/hotfix/propose`, `POST /api/gm/rollback/plan`, `POST /api/gm/npc/dialogue`
  - `POST /api/agent-sdk/dispatch`, `POST /api/memory/store`, `POST /api/memory/failover-test`, `POST /api/openui/evaluate`, `POST /api/cli-anything/exec`, `POST /api/dreamforge/generate`
- **Hermes LeadGen HTTP Server (`apps/hermes-leadgen/server.js:891-1585`, `0.0.0.0:8392`)**:
  - Reverse proxies: `/proxy/fcc/*` -> `127.0.0.1:8082` (`server.js:904-906`), `/proxy/hermes/*` -> `127.0.0.1:9119` (`server.js:907-909`) via `proxyHttpRequest` (`server.js:802-831`)
  - State/Execution endpoints: `POST /api/node/heal` (`server.js:917`), `POST /api/graphy/rebuild` (`server.js:940`), `POST /api/orchestrate` (`server.js:960`), `POST /api/leads` (`server.js:1082`), `POST /api/leads/prospect` (`server.js:1112`), `POST /api/leads/approve` (`server.js:1172`), `POST /api/terminal/exec` (`server.js:1190`), `POST /api/tts/female` (`server.js:1227`), `POST /api/youtube/remaster-notebook` (`server.js:1337`), `POST /api/hooks/trigger` & `POST /api/hooks/push-pr` (`server.js:1414`), `POST /api/memory/sync` (`server.js:1430`), `GET /api/memory/ledger` (`server.js:1436`)
- **CLI & Adapter Entrypoints**:
  - `ops/router/adapters/hermes.ts:55` (`HermesDispatchAdapter.dispatch`), `ops/eyes/eyes.ts:86` (`main`), `ops/hooks/secret-scan.mjs:167` (`main`).

## 4. Sensitive Sinks and Assets
- **Process Execution (`child_process.spawn` / `execFile` / `execFileSync`)**:
  - `ops/router/adapters/hermes.ts:79, 106-110`: `ssh <sshHost> "hermes -z --query-file <remotePromptPath>"`
  - `apps/hermes-leadgen/server.js:299-302`: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/node-auto-pr-push.ps1 -Agent <agent> -Profile <profile> -Message <message>`
  - `ops/hooks/secret-scan.mjs:75`: `git log --no-color --no-ext-diff --no-textconv -U0 --format=%x01%H ...revArgs`
- **Filesystem & Persistent Agent Memory Writes**:
  - `apps/hermes-leadgen/server.js:765-797`: Appends caller-supplied Markdown to `Sabretooth/{gemini-to-gemini,hermes-to-hermes,claude-to-claude}.md`
  - `ops/router/adapters/hermes.ts:68-76`: Writes `${jobId}.txt` and `${jobId}.log` into `this.stagingDir`
  - `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:15-20`: Merges `%USERPROFILE%\.ssh\authorized_keys` into `C:\ProgramData\ssh\administrators_authorized_keys`
- **Secrets & Environment Files**:
  - `ops/eyes/lib/env.ts:26-49`: Loads API keys (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`) from node `.env` files.

## 5. Existing Security Controls
- **Pre-push Secret Scanner (`ops/hooks/secret-scan.mjs`)**: Blocks git pushes containing matched credential token prefixes, private LAN IPv4 literals, or Windows user profile paths (`%USERPROFILE%` enforced).
- **Host / Origin Guard (`apps/hermes-leadgen/server.js:859-898`)**: Restricts `Host` header to `ALLOWED_HOSTS` (loopback + all local LAN IPv4 addresses) and checks `Origin` when `req.headers.origin` is present on `POST` requests.
- **Secret Redactor (`src/engine/world-engine.ts:440-476`, `ops/eyes/lib/report.ts:71-84`)**: Regex-based `redactSecretsWithXXXX()` and `redact()` helpers.

## 6. Verification and Build Mechanics
- Tests run via `vitest` (`npm test`, `npm run router:test`, `npm run eyes:test`) and Node's built-in test runner (`node --test`).
- Under the `agy` audit sandbox, external network access and target process startup are restricted; source-level verification is authoritative, and any candidate requiring live runtime reachability validation is recorded as `needs_validation`.

## 7. Priority Hunt List
1. `ops/router/adapters/hermes.ts:55-110` — Remote command injection & local path traversal via unvalidated `jobId`/`jobClass` in `scp` staging and remote `ssh` shell command string.
2. `apps/hermes-leadgen/server.js:802-831, 904-909, 1588` — Unauthenticated `0.0.0.0:8392` reverse proxy (`/proxy/fcc/*`, `/proxy/hermes/*`) exposing loopback-only agent services (`127.0.0.1:8082`, `127.0.0.1:9119`) to the LAN and stripping framing headers.
3. `apps/hermes-leadgen/server.js:765-797, 1430-1444` — Unauthenticated persistent agent memory poisoning (`POST /api/memory/sync`) and cross-agent ledger disclosure (`GET /api/memory/ledger`).
4. `apps/hermes-leadgen/server.js:288-339, 1082-1212, 1414-1427` — Unauthenticated LAN trigger of `node-auto-pr-push.ps1` (`POST /api/hooks/push-pr`), subprocess execution, and lead approval forgery (`POST /api/leads/approve`).
5. `server.ts:248-364, 427-498, 827` — Unauthenticated `0.0.0.0:9180` Express API allowing state mutation, unredacted NPC dialogue secret storage (`POST /api/gm/npc/dialogue`), and unbounded array growth.
6. `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:8-24` — Local privilege escalation by merging user-writable `%USERPROFILE%\.ssh\authorized_keys` into `C:\ProgramData\ssh\administrators_authorized_keys`.
7. `ops/eyes/lib/capture.ts:58-127` & `ops/eyes/lib/judge.ts:101-177` — Redirect/subresource bypass of `isLocalUrl()` and main-world `window.__eyesDom` override feeding `buildPrompt()`.
8. `ops/hooks/secret-scan.mjs:75, 119-145` — Unvalidated `localSha`/`remoteSha` ref tokens in `scanPush()` allowing `git log` option injection and `--not --remotes` scan bypass.
