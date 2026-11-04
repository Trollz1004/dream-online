# Confirmed Findings Detail — Run 1 (`Trollz1004/dream-online`)

## 1. `9f0f101aab9a0db8` — Unauthenticated LAN Reverse Proxy (`/proxy/fcc/*` and `/proxy/hermes/*`) Exposes Loopback-Only Agent Admin Services and Strips Framing Protections (`Critical`)

### Ordered Trace and Evidence
- **Trace**:
  1. `entrypoint` — `apps/hermes-leadgen/server.js:904` (`http.createServer`): Unauthenticated request handler on `0.0.0.0:8392` matches `pathname.startsWith('/proxy/fcc')` or `pathname.startsWith('/proxy/hermes')` (lines `904-909`).
  2. `propagation` — `apps/hermes-leadgen/server.js:802` (`proxyHttpRequest`): Strips `/proxy/fcc` or `/proxy/hermes` prefix, sets `host: 127.0.0.1:${targetPort}`, and deletes `x-forwarded-for` and `x-real-ip` headers so the request appears loopback-originated to the upstream service.
  3. `propagation` — `apps/hermes-leadgen/server.js:818` (`proxyHttpRequest`): Deletes `resHeaders['x-frame-options']` and `resHeaders['content-security-policy']` from upstream responses.
  4. `sink` — `apps/hermes-leadgen/server.js:830` (`proxyHttpRequest`): `req.pipe(proxyReq)` streams arbitrary caller HTTP methods and bodies to `127.0.0.1:8082` or `127.0.0.1:9119` (`http.request` at `line 808`).
- **Evidence**:
  - `apps/hermes-leadgen/server.js:808`: `proxyHttpRequest` forwards requests to `hostname: '127.0.0.1'` on `targetPort` (`8082` or `9119`) with rewritten `Host` header and stripped client IP headers.
  - `apps/hermes-leadgen/server.js:818`: Deletes `x-frame-options` and `content-security-policy` headers from upstream responses.
  - `apps/hermes-leadgen/server.js:896`: Checks `isAllowedOrigin(req)` only when `req.method === 'POST'`, ignoring `PUT`, `DELETE`, `PATCH`, and `GET`.
  - `apps/hermes-leadgen/server.js:904`: Dispatches `/proxy/fcc` to port `8082` and `/proxy/hermes` to port `9119` without authentication.

### Dummy Principal and Affected Resource
- **Dummy Principal**: Unauthenticated peer host on the local network (`dummy-lan-client`).
- **Affected Resource**: Loopback-bound Free Claude Code administration service (`127.0.0.1:8082/admin`) and Hermes Agent Portal (`127.0.0.1:9119`).

### Native Input and Bounded Instructions
- **Native Input**:
  ```http
  GET /proxy/fcc/admin HTTP/1.1
  Host: localhost:8392
  ```
- **Instructions**:
  1. Inspect `apps/hermes-leadgen/server.js:1588` to verify the server binds to `0.0.0.0:8392` and `lines 859-880` to verify all local LAN IPv4 addresses are added to `ALLOWED_HOSTS`.
  2. Inspect `apps/hermes-leadgen/server.js:904-909` and `802-831` to confirm that requests to `/proxy/fcc` and `/proxy/hermes` are piped directly to `127.0.0.1:8082` and `127.0.0.1:9119` without authentication.

### Observed Output and Violated Invariant
- **Observed Result**: Any unauthenticated LAN caller can reach the loopback-only agent administration interfaces on `127.0.0.1:8082` and `127.0.0.1:9119` with `x-forwarded-for`, `x-real-ip`, `x-frame-options`, and `content-security-policy` stripped.
- **Security Invariant Violated**: Services bound exclusively to `127.0.0.1` for local-only administration must not be bridged onto `0.0.0.0` without authentication and framing isolation.

### Conditions and Containment
- **Conditions**: Network reachability to `0.0.0.0:8392` and an active listener on `127.0.0.1:8082` or `127.0.0.1:9119`.
- **Containment**: `isAllowedHost(req)` (`line 893`) blocks DNS rebinding from external domain names, and `isAllowedOrigin(req)` (`line 896`) blocks cross-origin browser `POST` requests when an `Origin` header is present, but neither stops direct LAN HTTP clients or non-`POST` methods.

### Source-Level Remediation and Regression Case
- **Remediation (`apps/hermes-leadgen/server.js`)**:
  ```javascript
  if (pathname.startsWith('/proxy/fcc') || pathname.startsWith('/proxy/hermes')) {
    if (!requireApiAuth(req, res)) return;
    if (req.method !== 'GET' && req.method !== 'HEAD' && !isAllowedOrigin(req)) {
      return sendJson(res, 403, { ok: false, error: 'Forbidden origin' });
    }
  }
  ```
- **Regression Test Case**: Assert that an unauthenticated request to `GET /proxy/fcc/admin` and `POST /proxy/hermes/chat` returns HTTP `401 Unauthorized`.

---

## 2. `af479afc5e54901c` — Remote SSH Shell Command Injection and Local Staging Path Traversal in `HermesDispatchAdapter` (`Critical`)

### Ordered Trace and Evidence
- **Trace**:
  1. `entrypoint` — `ops/router/adapters/hermes.ts:55` (`HermesDispatchAdapter.dispatch`): Receives `input: DispatchJobInput` containing `input.jobId` and `input.jobClass`.
  2. `propagation` — `ops/router/adapters/hermes.ts:64` (`HermesDispatchAdapter.dispatch`): Computes `jobId` from `input.jobId` (or `input.jobClass`) without character validation, then builds `promptPath`, `logPath`, and `remotePromptPath` at `lines 68-70`.
  3. `propagation` — `ops/router/adapters/hermes.ts:79` (`HermesDispatchAdapter.dispatch`): Builds `sshArgs = [this.sshHost, 'hermes -z --query-file ' + remotePromptPath]` without shell quoting.
  4. `sink` — `ops/router/adapters/hermes.ts:106` (`HermesDispatchAdapter.dispatch`): `this.runner({ command: 'ssh', args: sshArgs, cwd: input.cwd ?? process.cwd() })` executes the unquoted `sshArgs` command string via the remote login shell on `this.sshHost`, after `fs.writeFileSync(promptPath, ...)` at `line 73`.
- **Evidence**:
  - `ops/router/adapters/hermes.ts:64`: `jobId` is taken directly from `input.jobId` or interpolated from `input.jobClass` with no regex validation.
  - `ops/router/adapters/hermes.ts:68`: `promptPath`, `logPath`, and `remotePromptPath` concatenate `jobId` directly and are written via `fs.writeFileSync` at `lines 73` and `76`.
  - `ops/router/adapters/hermes.ts:79`: `sshArgs` interpolates `${remotePromptPath}` into `hermes -z --query-file ${remotePromptPath}` without shell escaping.
  - `ops/router/adapters/hermes.ts:106`: `this.runner` spawns `ssh` with `sshArgs`.

### Dummy Principal and Affected Resource
- **Dummy Principal**: Upstream task producer or compromised agent supplying a `DispatchJobInput` object (`dummy-job-producer`).
- **Affected Resource**: Local staging directory (`this.stagingDir`) and remote SSH target (`sabretooth`).

### Native Input and Bounded Instructions
- **Native Input**:
  ```json
  {
    "jobId": "job_1; id",
    "jobClass": "leadgen",
    "lane": "hermes",
    "prompt": "status"
  }
  ```
- **Instructions**:
  1. Inspect `ops/router/adapters/hermes.ts:64-76` to observe unvalidated `jobId` used in `path.join(this.stagingDir, `${jobId}.txt`)` and `fs.writeFileSync`.
  2. Inspect `ops/router/adapters/hermes.ts:78-110` to observe unquoted `remotePromptPath` interpolated into `sshArgs` and passed to `this.runner({ command: 'ssh', args: sshArgs })`.

### Observed Output and Violated Invariant
- **Observed Result**: Shell metacharacters in `jobId` or `jobClass` are interpreted by the remote SSH shell on `this.sshHost`, and `../` sequences in `jobId` traverse outside `this.stagingDir`.
- **Security Invariant Violated**: Identifiers crossing into filesystem paths and remote SSH command strings must be restricted to a strict alphanumeric allowlist and path-contained.

### Conditions and Containment
- **Conditions**: `HermesDispatchAdapter.dispatch()` is invoked with a `DispatchJobInput` whose `jobId` or `jobClass` is controlled by an external caller or upstream agent.
- **Containment**: `input.prompt` is written to a file (`line 73`) rather than passed on the command line, but `jobId` and `jobClass` are interpolated directly into the filename and remote SSH command string.

### Source-Level Remediation and Regression Case
- **Remediation (`ops/router/adapters/hermes.ts`)**:
  ```typescript
  const SAFE_JOB_ID_RE = /^[a-zA-Z0-9_-]{1,80}$/;
  if (!SAFE_JOB_ID_RE.test(jobId)) {
    throw new Error('Invalid jobId format');
  }
  ```
- **Regression Test Case**: Pass `jobId: "../escape"` and `jobId: "test;id"` to `adapter.dispatch()` with a mock `runner` and assert that both throw `Invalid jobId format` before writing files or invoking `scp`/`ssh`.

---

## 3. `361a54ac1b5dfdc2` — Unauthenticated `0.0.0.0:9180` Express API Allows State Mutation, Unredacted NPC Dialogue Secret Storage, and Unbounded Memory Growth (`High`)

### Ordered Trace and Evidence
- **Trace**:
  1. `entrypoint` — `server.ts:300` (`app.post('/api/gm/npc/dialogue')`): Unauthenticated Express POST handler on `0.0.0.0:9180` accepts caller-supplied JSON `{ npcId, message, zone }`.
  2. `propagation` — `server.ts:302` (`app.post('/api/gm/npc/dialogue')`): Extracts `String(req.body?.message || 'Status report').trim()` without passing it through `redactSecretsWithXXXX()`.
  3. `propagation` — `server.ts:340` (`app.post('/api/gm/npc/dialogue')`): Interpolates unredacted `message` into `memEntry.l1Overview` and `memEntry.l2Markdown`.
  4. `sink` — `server.ts:348` (`app.post('/api/gm/npc/dialogue')`): `serverState.memoryEntries.unshift(memEntry)` stores the unredacted entry in an unbounded array served unauthenticated by `GET /api/memory/status` (`line 427`).
- **Evidence**:
  - `server.ts:248`: `POST /api/gm/economy/mint` allows unauthenticated callers to mint arbitrary `NEEDs` currency into `serverState.economy`.
  - `server.ts:267`: `POST /api/gm/hotfix/propose` calls `redactSecretsWithXXXX(rawProposal)`, establishing the secret-redaction invariant.
  - `server.ts:302`: `POST /api/gm/npc/dialogue` omits `redactSecretsWithXXXX()` on `message` before storing `memEntry` in `serverState.memoryEntries` at `line 348`.
  - `server.ts:827`: `app.listen(PORT, '0.0.0.0')` exposes the unauthenticated Express server on all network interfaces.

### Dummy Principal and Affected Resource
- **Dummy Principal**: Unauthenticated LAN client (`dummy-lan-caller`).
- **Affected Resource**: `serverState` (`economy`, `memoryEntries`, `checkpoints`) on the DREAM Engine `:9180` service.

### Native Input and Bounded Instructions
- **Native Input**:
  ```json
  {
    "npcId": "sup-guide",
    "zone": "first-gate",
    "message": "example dialogue payload"
  }
  ```
- **Instructions**:
  1. Inspect `server.ts:827` to verify `0.0.0.0` binding and `lines 216-500` to verify that no authentication middleware protects any `/api/*` route.
  2. Compare `POST /api/gm/hotfix/propose` (`line 267`) and `POST /api/memory/store` (`lines 452-453`), which call `redactSecretsWithXXXX()`, against `POST /api/gm/npc/dialogue` (`lines 300-348`), which stores unredacted `message` strings into `serverState.memoryEntries`.

### Observed Output and Violated Invariant
- **Observed Result**: Unauthenticated LAN callers can mutate economy and world state, persist unredacted strings in `serverState.memoryEntries` (readable via `GET /api/memory/status`), and grow in-memory state arrays without bound.
- **Security Invariant Violated**: All stored memory entries must pass through `redactSecretsWithXXXX()`, state-mutating GM routes must require authentication, and in-memory collections must have bounded capacity.

### Conditions and Containment
- **Conditions**: Network reachability to `0.0.0.0:9180` (and Gemini lane enabled for `/api/gm/npc/dialogue` past line 309; `/api/gm/economy/mint`, `/api/gm/hotfix/propose`, and `/api/memory/store` require no key).
- **Containment**: `express.json()` limits single request body size to its default (100 KB), and `serverState.auditLog` is capped at 80 entries (`lines 183-185`).

### Source-Level Remediation and Regression Case
- **Remediation (`server.ts`)**:
  ```typescript
  const rawMessage = String(req.body?.message || 'Status report').trim().slice(0, 500);
  const message = redactSecretsWithXXXX(rawMessage).sanitized;
  // After serverState.memoryEntries.unshift(memEntry):
  if (serverState.memoryEntries.length > 200) {
    serverState.memoryEntries.length = 200;
  }
  ```
- **Regression Test Case**: Send a `POST /api/gm/npc/dialogue` request containing a synthetic credential-shaped token and assert that `memEntry.l1Overview` and `memEntry.l2Markdown` replace the token with `XXXX` and `serverState.memoryEntries.length` never exceeds 200.

---

## 4. `7a9413f900fa3d49` — Unauthenticated Persistent Agent Memory Poisoning (`POST /api/memory/sync`) and Cross-Agent Session Ledger Disclosure (`GET /api/memory/ledger`) (`High`)

### Ordered Trace and Evidence
- **Trace**:
  1. `entrypoint` — `apps/hermes-leadgen/server.js:1430` (`http.createServer`): Unauthenticated `POST /api/memory/sync` route on `0.0.0.0:8392` accepts JSON body from any network client.
  2. `propagation` — `apps/hermes-leadgen/server.js:1432` (`POST /api/memory/sync`): Reads JSON body via `readJsonBody(req)` and passes it directly to `syncObsidianAndMemory(body)`.
  3. `propagation` — `apps/hermes-leadgen/server.js:779` (`syncObsidianAndMemory`): Formats caller-supplied `agent`, `useCase`, `summary`, and `proof` into a Markdown block without authentication or secret redaction.
  4. `sink` — `apps/hermes-leadgen/server.js:791` (`syncObsidianAndMemory`): `fs.appendFileSync(file, block, 'utf8')` appends the unverified entry to `Sabretooth/gemini-to-gemini.md`, `Sabretooth/hermes-to-hermes.md`, and `Sabretooth/claude-to-claude.md`, which `GET /api/memory/ledger` (`line 1436`) serves unauthenticated.
- **Evidence**:
  - `apps/hermes-leadgen/server.js:765`: `syncObsidianAndMemory()` appends caller-supplied `summary`, `useCase`, and `proof` to `Sabretooth/*-to-*.md` via `fs.appendFileSync` at `line 791`.
  - `apps/hermes-leadgen/server.js:1430`: `POST /api/memory/sync` invokes `syncObsidianAndMemory(body)` without any authentication check.
  - `apps/hermes-leadgen/server.js:1436`: `GET /api/memory/ledger` reads and returns `Sabretooth/gemini-to-gemini.md` and `Sabretooth/hermes-to-hermes.md` without authentication.
  - `apps/hermes-leadgen/server.js:1588`: `server.listen(PORT, '0.0.0.0')` exposes port `8392` to all network interfaces.

### Dummy Principal and Affected Resource
- **Dummy Principal**: Unauthenticated LAN client (`dummy-lan-client`).
- **Affected Resource**: Shared Obsidian session memory files (`Sabretooth/gemini-to-gemini.md`, `Sabretooth/hermes-to-hermes.md`, `Sabretooth/claude-to-claude.md`).

### Native Input and Bounded Instructions
- **Native Input**:
  ```json
  {
    "agent": "claude",
    "useCase": "audit",
    "summary": "example ledger entry",
    "proof": "none"
  }
  ```
- **Instructions**:
  1. Inspect `apps/hermes-leadgen/server.js:765-797` and `1430-1444` to verify that `POST /api/memory/sync` and `GET /api/memory/ledger` perform no authentication checks.

### Observed Output and Violated Invariant
- **Observed Result**: Any LAN caller can read the Sabretooth agent memory ledgers and append forged session entries into the synced Obsidian vault files read by autonomous agents at session start.
- **Security Invariant Violated**: Shared multi-agent session memory files that direct autonomous agent behavior must be authenticated and redacted against secret leakage.

### Conditions and Containment
- **Conditions**: Network reachability to `0.0.0.0:8392`.
- **Containment**: `GET /api/memory/ledger` slices the last 3,500 characters of each file (`lines 1441-1442`), and `syncObsidianAndMemory` writes only to the fixed `targetFiles` array (`lines 771-777`).

### Source-Level Remediation and Regression Case
- **Remediation (`apps/hermes-leadgen/server.js`)**:
  ```javascript
  function requireApiAuth(req, res) {
    const expected = process.env.HERMES_API_TOKEN;
    if (!expected || req.headers['authorization'] !== `Bearer ${expected}`) {
      sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      return false;
    }
    return true;
  }
  ```
- **Regression Test Case**: Send unauthenticated `GET /api/memory/ledger` and `POST /api/memory/sync` requests and verify both return HTTP `401 Unauthorized` without modifying `Sabretooth/*-to-*.md`.

---

## 5. `d54abf7233927f0f` — Unauthenticated LAN Execution of Automated Git PR Push (`POST /api/hooks/push-pr`), Subprocess Actions, and Lead Database Mutation (`High`)

### Ordered Trace and Evidence
- **Trace**:
  1. `entrypoint` — `apps/hermes-leadgen/server.js:1414` (`POST /api/hooks/push-pr`): Unauthenticated HTTP POST handler on `0.0.0.0:8392` accepts `{ runGitPushPr, agent, profile, summary }` from any LAN caller.
  2. `propagation` — `apps/hermes-leadgen/server.js:1418` (`POST /api/hooks/push-pr`): When `body.runGitPushPr` is truthy, calls `executeNodeAutoPrPush({ agent: body.agent || 'gemini', profile: body.profile || 'default', message: summary })`.
  3. `sink` — `apps/hermes-leadgen/server.js:299` (`executeNodeAutoPrPush`): `execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Agent', agent, '-Profile', profile, '-Message', message])` runs the Git auto-commit/push/PR script using host credentials.
- **Evidence**:
  - `apps/hermes-leadgen/server.js:299`: `executeNodeAutoPrPush` spawns `powershell.exe` with `-ExecutionPolicy Bypass -File scripts/node-auto-pr-push.ps1` and caller-supplied `-Agent`, `-Profile`, and `-Message`.
  - `apps/hermes-leadgen/server.js:1172`: `POST /api/leads/approve` sets `target.approved = true` and `target.status = 'APPROVED_BY_FOUNDER'` without authentication.
  - `apps/hermes-leadgen/server.js:1190`: `POST /api/terminal/exec` executes CLI commands (`cmd.exe`, `node`, `python`, `git`) without authentication.
  - `apps/hermes-leadgen/server.js:1414`: `POST /api/hooks/trigger` and `POST /api/hooks/push-pr` invoke `executeNodeAutoPrPush` without authentication.

### Dummy Principal and Affected Resource
- **Dummy Principal**: Unauthenticated LAN client (`dummy-lan-client`).
- **Affected Resource**: Host Git/GitHub CLI credentials (`scripts/node-auto-pr-push.ps1`), lead approval state (`leads.json`), and local CLI subprocesses.

### Native Input and Bounded Instructions
- **Native Input**:
  ```json
  {
    "runGitPushPr": true,
    "agent": "gemini",
    "profile": "default",
    "summary": "test"
  }
  ```
- **Instructions**:
  1. Inspect `apps/hermes-leadgen/server.js:288-339`, `1082-1212`, and `1414-1427` to verify that none of these POST routes enforce authentication.

### Observed Output and Violated Invariant
- **Observed Result**: Unauthenticated LAN callers can trigger `node-auto-pr-push.ps1`, mark leads as `APPROVED_BY_FOUNDER`, and invoke local subprocess actions.
- **Security Invariant Violated**: Endpoints that execute Git/GitHub pushes under host credentials, approve leads on behalf of the Founder, or spawn local subprocesses must require authentication.

### Conditions and Containment
- **Conditions**: Network reachability to `0.0.0.0:8392`.
- **Containment**: `POST /api/terminal/exec` uses a 5-entry `allowedCommands` lookup table (`lines 1193-1205`), and `executeNodeAutoPrPush` uses `execFile('powershell.exe', ...)` rather than `exec`.

### Source-Level Remediation and Regression Case
- **Remediation (`apps/hermes-leadgen/server.js`)**:
  ```javascript
  const SAFE_TOKEN_RE = /^[a-z0-9_-]{1,32}$/i;
  if (!SAFE_TOKEN_RE.test(agent) || !SAFE_TOKEN_RE.test(profile)) {
    return resolve({ ok: false, error: 'Invalid agent or profile identifier' });
  }
  ```
- **Regression Test Case**: Verify that unauthenticated requests to `POST /api/hooks/push-pr`, `POST /api/leads/approve`, and `POST /api/terminal/exec` are rejected with HTTP `401 Unauthorized`.

---

## 6. `e6955bcc4c57b492` — Local Privilege Escalation via Unprivileged `authorized_keys` Merged into `administrators_authorized_keys` in `FIX-ALIENWARE-SSH-FOR-T5500.bat` (`High`)

### Ordered Trace and Evidence
- **Trace**:
  1. `entrypoint` — `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:9` (`PowerShell inline command`): Auto-elevates the batch script to Windows `Administrator` via `Start-Process -FilePath '%~f0' -Verb RunAs`.
  2. `propagation` — `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:16` (`PowerShell inline command`): Reads all lines from `$userKeyFile` (`%USERPROFILE%\.ssh\authorized_keys`, defined at `line 15`) and appends them to `$keys` without key fingerprint validation.
  3. `sink` — `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:19` (`PowerShell inline command`): `$keys | Set-Content -Path $adminKeyFile -Encoding UTF8` writes the merged keys into `C:\ProgramData\ssh\administrators_authorized_keys` and restarts `sshd` (`line 24`).
- **Evidence**:
  - `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:9`: Auto-elevates via `-Verb RunAs` when not already running as Administrator.
  - `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:15`: Defines `$userKeyFile` pointing to the user-writable `.ssh\authorized_keys` file (and hardcodes the Windows username path).
  - `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:16`: Appends all lines from `$userKeyFile` into `$keys`.
  - `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:19`: Writes `$keys` to `C:\ProgramData\ssh\administrators_authorized_keys`.

### Dummy Principal and Affected Resource
- **Dummy Principal**: Unprivileged local process running under the standard Windows user account (`dummy-local-user-proc`).
- **Affected Resource**: `C:\ProgramData\ssh\administrators_authorized_keys` and the Windows OpenSSH `sshd` service.

### Native Input and Bounded Instructions
- **Native Input**:
  ```text
  ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExamplePublicKeyOnly local-test
  ```
- **Instructions**:
  1. Inspect `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:15-24` to verify that all lines in `$userKeyFile` (`%USERPROFILE%\.ssh\authorized_keys`) are merged into `$keys` and written to `C:\ProgramData\ssh\administrators_authorized_keys`.

### Observed Output and Violated Invariant
- **Observed Result**: Any SSH public key present in the user-writable `%USERPROFILE%\.ssh\authorized_keys` file is promoted into `C:\ProgramData\ssh\administrators_authorized_keys`, granting elevated Administrator SSH access.
- **Security Invariant Violated**: Administrator-only trust stores (`C:\ProgramData\ssh\administrators_authorized_keys`) must never ingest unverified keys from files writable by non-elevated user processes.

### Conditions and Containment
- **Conditions**: Unprivileged code execution under the standard user account prior to an administrator running `FIX-ALIENWARE-SSH-FOR-T5500.bat`.
- **Containment**: Requires an interactive UAC elevation prompt (`-Verb RunAs`) when `FIX-ALIENWARE-SSH-FOR-T5500.bat` is launched by the operator.

### Source-Level Remediation and Regression Case
- **Remediation (`ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat`)**:
  ```bat
    "$userKeyFile = Join-Path $env:USERPROFILE '.ssh\authorized_keys'; " ^
    "$adminKeyFile = 'C:\ProgramData\ssh\administrators_authorized_keys'; " ^
    "$keys | Set-Content -Path $adminKeyFile -Encoding UTF8; " ^
  ```
- **Regression Test Case**: Verify that `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat` contains no `Get-Content $userKeyFile` merge before `Set-Content -Path $adminKeyFile` and uses `$env:USERPROFILE` instead of a literal username.

---

## 7. `2559ecaa7c2d7288` — Headless Browser Redirect/Subresource Bypass of `isLocalUrl()` and Main-World `window.__eyesDom` Prompt/Verdict Injection (`Medium`)

### Ordered Trace and Evidence
- **Trace**:
  1. `entrypoint` — `ops/eyes/eyes.ts:109` (`main`): CLI entrypoint checks `isLocalUrl(target)` on the initial `--target` string and calls `captureShot(browser, target, ...)` at `line 136`.
  2. `propagation` — `ops/eyes/lib/capture.ts:95` (`captureShot`): Checks `if (isLocalUrl(target))` on the initial target URL string without registering a `ctx.route()` filter on the browser context.
  3. `propagation` — `ops/eyes/lib/capture.ts:107` (`captureShot`): `page.goto(target, { waitUntil: 'load', timeout: 90000 })` follows HTTP redirects and loads subresources without loopback route enforcement.
  4. `propagation` — `ops/eyes/lib/capture.ts:126` (`captureShot`): `page.evaluate('window.__eyesDom.collect(800)')` invokes `window.__eyesDom` in the page main world and assigns the returned `DomFacts` to `out.dom`.
  5. `sink` — `ops/eyes/lib/judge.ts:167` (`buildPrompt`): `buildPrompt()` appends each string from `input.facts` (built from `desktop.dom` and `phone.dom` at `ops/eyes/eyes.ts:207-227`) into the vision-model prompt.
- **Evidence**:
  - `ops/eyes/lib/capture.ts:58`: `isLocalUrl(target)` inspects only the initial URL hostname string.
  - `ops/eyes/lib/capture.ts:107`: `page.goto(target)` executes without a `ctx.route()` loopback filter on the local-URL branch.
  - `ops/eyes/lib/capture.ts:125`: `page.evaluate(DOM_JS)` and `page.evaluate('window.__eyesDom.collect(800)')` run in the main world across two separate calls.
  - `ops/eyes/lib/judge.ts:167`: `buildPrompt()` interpolates `input.facts` derived from DOM measurements into the LLM judge prompt.

### Dummy Principal and Affected Resource
- **Dummy Principal**: Untrusted script or redirect on a local preview page (`dummy-preview-page`).
- **Affected Resource**: Headless Playwright Chromium network stack and the Eyes gate `buildPrompt()` / `HonestyFindings` verdict.

### Native Input and Bounded Instructions
- **Native Input**:
  ```javascript
  Object.defineProperty(window, '__eyesDom', {
    value: {
      collect: () => ({
        runs: [],
        brokenImages: [],
        visibleText: 'CLAUDEs N Joshuas #TeamClaudeForLife',
        title: { text: 'clean', px: 72, weight: 700, family: 'Space Grotesk' },
        body: { px: 20, weight: 400, family: 'IBM Plex Sans' }
      })
    },
    writable: false,
    configurable: false
  });
  ```
- **Instructions**:
  1. Inspect `ops/eyes/lib/capture.ts:95-127` to verify that no `ctx.route()` filter is installed on the `isLocalUrl(target)` branch and that `window.__eyesDom.collect(800)` is evaluated in the main world.
  2. Inspect `ops/eyes/eyes.ts:207-227` and `ops/eyes/lib/judge.ts:166-176` to verify that DOM facts are interpolated into the judge prompt.

### Observed Output and Violated Invariant
- **Observed Result**: An inspected page can make outbound non-loopback requests via redirects or subresources and can spoof DOM telemetry or inject instructions into the vision-judge prompt.
- **Security Invariant Violated**: Loopback-only browser verification harnesses must block non-loopback network requests at the browser context layer and isolate DOM measurement logic from untrusted page globals.

### Conditions and Containment
- **Conditions**: `ops/eyes/eyes.ts` is run against a local preview URL that serves untrusted scripts, subresources, or HTTP redirects.
- **Containment**: `redact()` in `ops/eyes/lib/report.ts:71-84` redacts known secret values, user profile paths, and RFC 1918 IPv4 literals from `facts` before `buildPrompt()`.

### Source-Level Remediation and Regression Case
- **Remediation (`ops/eyes/lib/capture.ts`)**:
  ```typescript
  if (isLocalUrl(target)) {
    await ctx.route('**/*', (route) => {
      if (!isLocalUrl(route.request().url())) {
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
  ```
- **Regression Test Case**: Verify that `captureShot()` aborts subresource or redirect requests targeting non-loopback hosts when inspecting a `localhost` target.

---

## 8. `440a9060e3e6617f` — Unvalidated Git Ref Tokens in `scanPush` Allow `git log` Option Injection and `--not --remotes` Pre-Push Scan Bypass (`Medium`)

### Ordered Trace and Evidence
- **Trace**:
  1. `entrypoint` — `ops/hooks/secret-scan.mjs:169` (`main`): When invoked with `--pre-push` by `.githooks/pre-push`, reads stdin and calls `scanPush(readStdin())` at `line 170`.
  2. `propagation` — `ops/hooks/secret-scan.mjs:123` (`scanPush`): Splits each stdin line via `const [, localSha, , remoteSha] = ref.trim().split(/\s+/);` without SHA format validation.
  3. `propagation` — `ops/hooks/secret-scan.mjs:134` (`scanPush`): Sets `range = [localSha, '--not', '--remotes']` when `remoteSha` is all zeros or unknown, and passes `range` to `addedLines(range)` at `line 135`.
  4. `sink` — `ops/hooks/secret-scan.mjs:75` (`addedLines`): `git(['log', '--no-color', '--no-ext-diff', '--no-textconv', '-U0', '--format=%x01%H', ...revArgs])` passes unvalidated `revArgs` to `git log`.
- **Evidence**:
  - `ops/hooks/secret-scan.mjs:75`: `addedLines(revArgs)` spreads `...revArgs` directly into `git(['log', ...])`.
  - `ops/hooks/secret-scan.mjs:123`: `localSha` and `remoteSha` are extracted via `split(/\s+/)` with only `ZERO_SHA` checked.
  - `ops/hooks/secret-scan.mjs:134`: `if (!range) range = [localSha, '--not', '--remotes'];` places unvalidated `localSha` into `revArgs` and excludes all remote-tracking refs.

### Dummy Principal and Affected Resource
- **Dummy Principal**: Caller supplying pre-push hook stdin or pushing a branch whose commits are already tracked under `refs/remotes/*` (`dummy-hook-caller`).
- **Affected Resource**: Pre-push secret and privacy gate (`ops/hooks/secret-scan.mjs`).

### Native Input and Bounded Instructions
- **Native Input**:
  ```text
  refs/heads/test --max-count=0 refs/heads/test 0000000000000000000000000000000000000000
  ```
- **Instructions**:
  1. Inspect `ops/hooks/secret-scan.mjs:74-76` and `119-145` to verify that `localSha` and `remoteSha` are not validated against `/^[0-9a-f]{40}$/i` before being spread into `git(['log', ...revArgs])`.

### Observed Output and Violated Invariant
- **Observed Result**: `git log` interprets a leading-dash `localSha` token as an option and returns empty diff output, causing `scanPush()` to report clean (`[]`) without scanning commits.
- **Security Invariant Violated**: Pre-push hook parsers must validate SHA-1 tokens before passing them as positional revision arguments to `git`.

### Conditions and Containment
- **Conditions**: Crafted `--pre-push` stdin or pushing a new branch whose commits are already reachable from another remote-tracking ref.
- **Containment**: Uses `execFileSync('git', ...)` (`line 64`), preventing shell command execution; impact is limited to `git log` option injection and secret-scan bypass.

### Source-Level Remediation and Regression Case
- **Remediation (`ops/hooks/secret-scan.mjs`)**:
  ```javascript
  const SHA_RE = /^[0-9a-f]{40}$/i;
  if (!SHA_RE.test(localSha) || !SHA_RE.test(remoteSha ?? '')) {
    throw new Error('secret-scan: invalid SHA in pre-push input');
  }
  ```
- **Regression Test Case**: Call `scanPush('refs/heads/main --max-count=0 refs/heads/main 0000000000000000000000000000000000000000\n')` and assert that it throws an invalid-SHA error instead of returning `[]`.
