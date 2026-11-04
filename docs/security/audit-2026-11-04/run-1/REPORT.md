# Security Audit Report — Run 1 (`Trollz1004/dream-online`)

## 1. Run Metadata, Scope, and Execution Boundary
- **Run ID**: `run-1` (`run_status: "complete"`)
- **Profile**: `standard`
- **Source Ref**: `b739ce3a81c76cd0ba91a431c5ff2d112018409c` (merge of `origin/ai/v2-skills-vendored`)
- **Execution Policy**: `sandboxed-source-and-local-only` (Antigravity `agy` sandbox mode — no external network access, no target process startup outside bounded local source inspection; writes restricted to the worktree and `ops/security/runs/run-1/`).
- **Budget & Agents**: Uncapped standard run; 4 hunter agents (`hunter-1`..`hunter-4`), 2 coverage critics (`coverage-critic-1`, `coverage-critic-final`), 5 Phase 3 candidate verifiers (`verifier-1`..`verifier-5`), and 2 Phase 5 record verifiers (`record-verifier-1`, `record-verifier-2`) executed.
- **Prior-Run Use**: None (`prior_run_paths: []`; zero carried confirmations or revalidations).
- **In-Scope Paths**: `server.ts`, `ops/router`, `ops/eyes`, `ops/hooks`, `ops/judge-memory` (requested in scope; directory absent at source ref), `sites/dream-online-net`, `apps/`, `src/engine`, `src/ui` (and underlying `src/shell`), and the scheduled-task and boot scripts under `ops/node`.
- **Out-of-Scope / Deferred Paths**: `docs`, `memory`, `docs/standards/backups-full-context`.

## 2. Security Posture Summary
The repository contains **8 confirmed vulnerabilities** (`2 critical`, `4 high`, `2 medium`), **2 leads requiring runtime/deployment validation (`needs_validation`)**, and **2 rejected candidates** across 9 coverage units. The most severe risks stem from:
1. Unauthenticated `0.0.0.0` network listeners (`apps/hermes-leadgen/server.js:1588` on port `8392` and `server.ts:827` on port `9180`) that expose loopback-only agent administration services (`127.0.0.1:8082` and `127.0.0.1:9119`), automated Git/GitHub PR pushes (`node-auto-pr-push.ps1`), and cross-agent Obsidian memory ledgers to any caller on the LAN.
2. Unsanitized task identifier interpolation (`jobId` / `jobClass`) in `ops/router/adapters/hermes.ts:64-106`, enabling remote SSH shell command injection on Sabretooth and local staging path traversal.
3. Local Windows privilege escalation in `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:15-19`, which promotes keys from the user-writable `%USERPROFILE%\.ssh\authorized_keys` file into `C:\ProgramData\ssh\administrators_authorized_keys`.

## 3. Confirmed Findings Summary

| Fingerprint | Severity | Title | Affected Boundary | Observed Result |
|---|---|---|---|---|
| `9f0f101aab9a0db8` | **Critical** | Unauthenticated LAN Reverse Proxy (`/proxy/fcc/*` and `/proxy/hermes/*`) Exposes Loopback-Only Agent Admin Services and Strips Framing Protections | `0.0.0.0:8392` LAN -> `127.0.0.1:8082` & `127.0.0.1:9119` (`apps/hermes-leadgen/server.js:802-831, 904-909`) | Any LAN caller can invoke Free Claude Code (`:8082/admin`) and Hermes (`:9119`) via `/proxy/fcc/*` and `/proxy/hermes/*` with `x-frame-options` and `content-security-policy` stripped. |
| `af479afc5e54901c` | **Critical** | Remote SSH Shell Command Injection and Local Staging Path Traversal in `HermesDispatchAdapter` | `DispatchJobInput` -> `fs.writeFileSync` & `ssh` remote shell (`ops/router/adapters/hermes.ts:55-110`) | Unvalidated `input.jobId` / `input.jobClass` writes `.txt`/`.log` files outside `stagingDir` via `../` and injects arbitrary commands into `ssh <sshHost> "hermes -z --query-file ..."`. |
| `361a54ac1b5dfdc2` | **High** | Unauthenticated `0.0.0.0:9180` Express API Allows State Mutation, Unredacted NPC Dialogue Secret Storage, and Unbounded Memory Growth | `0.0.0.0:9180` LAN -> `serverState` (`server.ts:248-364, 427-498, 827`) | Unauthenticated callers can mint NEEDs currency, store unredacted `message` strings via `POST /api/gm/npc/dialogue` (readable via `GET /api/memory/status`), and grow `memoryEntries`/`checkpoints` unboundedly. |
| `7a9413f900fa3d49` | **High** | Unauthenticated Persistent Agent Memory Poisoning (`POST /api/memory/sync`) and Cross-Agent Session Ledger Disclosure (`GET /api/memory/ledger`) | `0.0.0.0:8392` LAN -> `Sabretooth/*-to-*.md` (`apps/hermes-leadgen/server.js:765-797, 1430-1444`) | Unauthenticated LAN callers can read cross-agent handoff notes and append forged Markdown blocks into `Sabretooth/{gemini,hermes,claude}-to-*.md`. |
| `d54abf7233927f0f` | **High** | Unauthenticated LAN Execution of Automated Git PR Push (`POST /api/hooks/push-pr`), Subprocess Actions, and Lead Database Mutation | `0.0.0.0:8392` LAN -> `powershell.exe` / `execFile` / `leads` (`apps/hermes-leadgen/server.js:288-339, 1082-1212, 1414-1427`) | Unauthenticated LAN callers can trigger `scripts/node-auto-pr-push.ps1`, mark leads `APPROVED_BY_FOUNDER`, and invoke local CLI subprocesses. |
| `e6955bcc4c57b492` | **High** | Local Privilege Escalation via Unprivileged `authorized_keys` Merged into `administrators_authorized_keys` in `FIX-ALIENWARE-SSH-FOR-T5500.bat` | Standard OS User (`%USERPROFILE%`) -> Windows `Administrators` (`ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:8-24`) | Elevated script merges all lines from user-writable `%USERPROFILE%\.ssh\authorized_keys` into `C:\ProgramData\ssh\administrators_authorized_keys` and restarts `sshd`. |
| `2559ecaa7c2d7288` | **Medium** | Headless Browser Redirect/Subresource Bypass of `isLocalUrl()` and Main-World `window.__eyesDom` Prompt/Verdict Injection | Inspected Preview Page -> Playwright Chromium & Vision Judge Prompt (`ops/eyes/lib/capture.ts:58-127`, `ops/eyes/lib/judge.ts:167`) | `isLocalUrl(target)` checks only the initial URL string without `ctx.route()`, and main-world `window.__eyesDom.collect(800)` can be overridden by page scripts to spoof DOM telemetry and inject into `buildPrompt()`. |
| `440a9060e3e6617f` | **Medium** | Unvalidated Git Ref Tokens in `scanPush` Allow `git log` Option Injection and `--not --remotes` Pre-Push Scan Bypass | Pre-push stdin -> `git log` (`ops/hooks/secret-scan.mjs:75, 119-145, 169-170`) | `scanPush()` passes unvalidated `localSha` into `git log` without a `/^[0-9a-f]{40}$/i` check (allowing leading `-` flags like `--max-count=0` to suppress output) and excludes commits reachable from `--remotes`. |

---

## 4. Confirmed Findings (Summary Details)

### 4.1 `9f0f101aab9a0db8` — Unauthenticated LAN Reverse Proxy (`/proxy/fcc/*` and `/proxy/hermes/*`) Exposes Loopback-Only Agent Admin Services and Strips Framing Protections (`Critical`)
- **Source Location**: `apps/hermes-leadgen/server.js:802-831, 896-909, 1588`
- **Lower-Trust Principal**: Unauthenticated LAN client reaching `0.0.0.0:8392`.
- **Bounded Reproduction**: Inspect `apps/hermes-leadgen/server.js:904-909` and `proxyHttpRequest()` at `lines 802-831`. Sending `GET /proxy/fcc/admin` or `GET /proxy/hermes/chat?profile=default&resume=local-profile` to port `8392` forwards the request to `127.0.0.1:8082` or `127.0.0.1:9119` with `host: 127.0.0.1:<port>` and `x-forwarded-for` / `x-real-ip` deleted.
- **Conditions**: Network reachability to `0.0.0.0:8392` and active loopback services on `:8082` or `:9119`.
- **Actual Result & Impact**: Loopback-only agent control planes (`Free Claude Code :8082` and `Hermes :9119`) become directly accessible over the LAN without authentication, with `x-frame-options` and `content-security-policy` stripped (`lines 818-819`) and `Origin` unchecked on non-`POST` requests (`line 896`).
- **Priority Rationale**: Direct network exposure of privileged local agent execution services (`Critical` impact, `High` likelihood).
- **Smallest Source Fix**: Bind `server.js` to `127.0.0.1` by default, enforce bearer-token authentication (`requireApiAuth`) before calling `proxyHttpRequest`, and check `isAllowedOrigin(req)` on all state-changing HTTP methods.

### 4.2 `af479afc5e54901c` — Remote SSH Shell Command Injection and Local Staging Path Traversal in `HermesDispatchAdapter` (`Critical`)
- **Source Location**: `ops/router/adapters/hermes.ts:55-110`
- **Lower-Trust Principal**: Upstream task producer or agent supplying `DispatchJobInput` (`jobId` / `jobClass`).
- **Bounded Reproduction**: Inspect `ops/router/adapters/hermes.ts:64-79`. A `DispatchJobInput` with `jobId: "job_1; id"` produces `remotePromptPath = "~/.fable-kitchen/job_1; id.txt"` and `sshArgs = ["sabretooth", "hermes -z --query-file ~/.fable-kitchen/job_1; id.txt"]`, which `ssh` executes via the remote login shell at `line 106`. A `jobId` containing `../` writes outside `this.stagingDir` at `lines 68-76`.
- **Conditions**: `HermesDispatchAdapter.dispatch()` receives caller-influenced `jobId` or `jobClass`.
- **Actual Result & Impact**: Arbitrary remote command execution on the `sabretooth` SSH host and arbitrary `.txt`/`.log` file write on the local filesystem.
- **Priority Rationale**: Direct command injection across a node boundary (`Critical` impact, `Medium` likelihood).
- **Smallest Source Fix**: Validate `jobId` against `/^[a-zA-Z0-9_-]{1,80}$/` immediately after `line 66` and verify `path.resolve(promptPath)` stays within `path.resolve(this.stagingDir)`.

### 4.3 `361a54ac1b5dfdc2` — Unauthenticated `0.0.0.0:9180` Express API Allows State Mutation, Unredacted NPC Dialogue Secret Storage, and Unbounded Memory Growth (`High`)
- **Source Location**: `server.ts:248-364, 427-498, 827`
- **Lower-Trust Principal**: Unauthenticated LAN client reaching `0.0.0.0:9180`.
- **Bounded Reproduction**: Inspect `server.ts:827` (`app.listen(PORT, '0.0.0.0')`) and compare `POST /api/gm/hotfix/propose` (`line 267`, calling `redactSecretsWithXXXX`) with `POST /api/gm/npc/dialogue` (`lines 300-348`), which stores raw `message` into `serverState.memoryEntries` without redaction and without array size bounds.
- **Conditions**: Network reachability to `0.0.0.0:9180` (and Gemini lane enabled for `POST /api/gm/npc/dialogue` beyond line 309; `POST /api/gm/economy/mint`, `POST /api/gm/hotfix/propose`, and `POST /api/memory/store` require no API key).
- **Actual Result & Impact**: Unauthenticated state tampering (`NEEDs` minting, Dream Shift toggling), storage and disclosure (`GET /api/memory/status`) of unredacted dialogue prompts, and unbounded memory growth in `serverState.memoryEntries` and `serverState.checkpoints`.
- **Priority Rationale**: Unauthenticated LAN control over engine state and memory (`High` impact, `High` likelihood).
- **Smallest Source Fix**: Bind `server.ts` to `127.0.0.1` by default (or require bearer auth), apply `redactSecretsWithXXXX()` to `message` in `POST /api/gm/npc/dialogue`, and cap `serverState.memoryEntries` and `serverState.checkpoints` at 200 items.

### 4.4 `7a9413f900fa3d49` — Unauthenticated Persistent Agent Memory Poisoning (`POST /api/memory/sync`) and Cross-Agent Session Ledger Disclosure (`GET /api/memory/ledger`) (`High`)
- **Source Location**: `apps/hermes-leadgen/server.js:765-797, 859-880, 1430-1444, 1588`
- **Lower-Trust Principal**: Unauthenticated LAN client reaching `0.0.0.0:8392`.
- **Bounded Reproduction**: Inspect `apps/hermes-leadgen/server.js:1430-1444` and `syncObsidianAndMemory()` at `lines 765-797`. Sending `POST /api/memory/sync` with `{"agent":"claude","summary":"..."}` appends directly to `Sabretooth/gemini-to-gemini.md`, `Sabretooth/hermes-to-hermes.md`, and `Sabretooth/claude-to-claude.md`.
- **Conditions**: Network reachability to `0.0.0.0:8392`.
- **Actual Result & Impact**: Persistent cross-agent memory poisoning (injecting instructions into Obsidian session files read by autonomous agents at startup) and disclosure of the last 3,500 characters of agent handoff ledgers.
- **Priority Rationale**: Persistent integrity violation of shared multi-agent memory (`High` impact, `High` likelihood).
- **Smallest Source Fix**: Require bearer-token authentication on `/api/memory/sync` and `/api/memory/ledger` and bind `server.js` to `127.0.0.1` by default.

### 4.5 `d54abf7233927f0f` — Unauthenticated LAN Execution of Automated Git PR Push (`POST /api/hooks/push-pr`), Subprocess Actions, and Lead Database Mutation (`High`)
- **Source Location**: `apps/hermes-leadgen/server.js:288-339, 917-948, 1082-1212, 1414-1427, 1588`
- **Lower-Trust Principal**: Unauthenticated LAN client reaching `0.0.0.0:8392`.
- **Bounded Reproduction**: Inspect `apps/hermes-leadgen/server.js:1414-1427` and `executeNodeAutoPrPush()` at `lines 288-339`. Sending `POST /api/hooks/push-pr` with `{"runGitPushPr":true,"agent":"gemini","profile":"default","summary":"test"}` spawns `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/node-auto-pr-push.ps1`.
- **Conditions**: Network reachability to `0.0.0.0:8392`.
- **Actual Result & Impact**: Unauthenticated callers can trigger Git commits, branch pushes, and GitHub PR creation under host credentials, forge `APPROVED_BY_FOUNDER` status on leads (`line 1178`), and spawn local CLI subprocesses (`lines 942, 1206`).
- **Priority Rationale**: Unauthenticated trigger of authenticated Git/GitHub workflows and lead approval forgery (`High` impact, `High` likelihood).
- **Smallest Source Fix**: Require bearer-token authentication on all `POST` endpoints in `apps/hermes-leadgen/server.js` and validate `agent` and `profile` against `/^[a-z0-9_-]{1,32}$/i`.

### 4.6 `e6955bcc4c57b492` — Local Privilege Escalation via Unprivileged `authorized_keys` Merged into `administrators_authorized_keys` in `FIX-ALIENWARE-SSH-FOR-T5500.bat` (`High`)
- **Source Location**: `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:8-24`
- **Lower-Trust Principal**: Unprivileged local process running under the standard Windows user account (`%USERPROFILE%`).
- **Bounded Reproduction**: Inspect `ops/node/FIX-ALIENWARE-SSH-FOR-T5500.bat:15-20`. Line 16 reads all lines from `%USERPROFILE%\.ssh\authorized_keys` into `$keys`, and line 19 writes `$keys` into `C:\ProgramData\ssh\administrators_authorized_keys` with Administrator privileges before restarting `sshd`.
- **Conditions**: Unprivileged user-context write to `%USERPROFILE%\.ssh\authorized_keys` prior to execution of `FIX-ALIENWARE-SSH-FOR-T5500.bat`.
- **Actual Result & Impact**: Any SSH key placed in the user-writable `.ssh\authorized_keys` file is promoted to `C:\ProgramData\ssh\administrators_authorized_keys`, granting Windows `Administrators` SSH access.
- **Priority Rationale**: Local privilege boundary crossing from standard user to Windows `Administrators` (`High` impact, `Medium` likelihood).
- **Smallest Source Fix**: Remove line 16 so `$userKeyFile` is never merged into `$adminKeyFile`, write only the pinned `$keys` array to `C:\ProgramData\ssh\administrators_authorized_keys`, and replace the hardcoded user profile path on line 15 with `$env:USERPROFILE`.

### 4.7 `2559ecaa7c2d7288` — Headless Browser Redirect/Subresource Bypass of `isLocalUrl()` and Main-World `window.__eyesDom` Prompt/Verdict Injection (`Medium`)
- **Source Location**: `ops/eyes/eyes.ts:109, 207-227`, `ops/eyes/lib/capture.ts:58-65, 95-127`, `ops/eyes/lib/judge.ts:101-177`
- **Lower-Trust Principal**: Local preview web page inspected by `ops/eyes/eyes.ts`.
- **Bounded Reproduction**: Inspect `ops/eyes/lib/capture.ts:95-127`. `isLocalUrl(target)` checks only the initial URL string before `page.goto(target)` at line 107 without a `ctx.route()` filter, and lines 125-126 evaluate `DOM_JS` and `window.__eyesDom.collect(800)` in the main world where page scripts can pre-define a non-configurable `window.__eyesDom`.
- **Conditions**: `ops/eyes/eyes.ts` is executed against a local preview server serving untrusted redirects, subresources, or scripts.
- **Actual Result & Impact**: Outbound SSRF from headless Chromium via HTTP redirects/subresources and falsification of DOM telemetry / prompt injection into `buildPrompt()` (`ops/eyes/lib/judge.ts:167`).
- **Priority Rationale**: Verification-gate tampering and local headless browser SSRF (`Medium` impact, `Medium` likelihood).
- **Smallest Source Fix**: Install `ctx.route('**/*', ...)` enforcing `isLocalUrl(route.request().url())` on the local-URL capture branch and return the DOM probe result directly from a single self-contained IIFE evaluation.

### 4.8 `440a9060e3e6617f` — Unvalidated Git Ref Tokens in `scanPush` Allow `git log` Option Injection and `--not --remotes` Pre-Push Scan Bypass (`Medium`)
- **Source Location**: `ops/hooks/secret-scan.mjs:75, 119-145, 169-170`
- **Lower-Trust Principal**: Caller or hook invocation supplying pre-push ref lines to `secret-scan.mjs --pre-push` or pushing a new branch whose commits are already tracked under `refs/remotes/*`.
- **Bounded Reproduction**: Inspect `ops/hooks/secret-scan.mjs:123-135` and `addedLines()` at `line 75`. When `remoteSha` is 40 zeroes, `range` is `[localSha, '--not', '--remotes']` and is spread into `git(['log', '--no-color', '--no-ext-diff', '--no-textconv', '-U0', '--format=%x01%H', ...revArgs])`. A `localSha` starting with `-` (e.g. `--max-count=0`) is parsed by `git log` as a flag and produces empty output.
- **Conditions**: Crafted `--pre-push` stdin or new-branch push of commits already reachable from any remote-tracking ref.
- **Actual Result & Impact**: Bypasses pre-push secret, private-IP, and user-path scanning.
- **Priority Rationale**: Security gate bypass (`Medium` impact, `Medium` likelihood).
- **Smallest Source Fix**: Validate `localSha` and `remoteSha` against `/^[0-9a-f]{40}$/i` in `scanPush()` before invoking `git`.

---

## 5. Leads Requiring Validation (`NEEDS VALIDATION`)

| Fingerprint | Title | Repository Trace | Exact Blocker | Bounded Local Next Step | Safe Owner-Observed Deployment Check |
|---|---|---|---|---|---|
| `a98e955187a573ad` | Escaped-Backslash Quote Desynchronization in `splitTopLevelArgs` and Plain-Object Prototype Lookups in `evaluateOpenUiProgram` | `src/engine/openui/openui-engine.ts:223` -> `src/engine/openui/openui-engine.ts:183` -> `src/engine/openui/openui-engine.ts:389` | Evaluated OpenUI AST output is serialized as JSON (`EvaluatedOpenUiProgram`) and rendered via React text escaping; no unsafe DOM or code-execution sink consuming `node.args` is present in source. | Pass `toString = Text("hello")\nroot = Stack([toString])` and `root = Text("a\\\\", "b")` into `parseOpenUiProgram` and `evaluateOpenUiProgram` to confirm prototype resolution and argument desynchronization. | Check whether any deployed consumer passes `EvaluatedOpenUiNode.args` into an unvalidated URL (`href`/`src`) or raw HTML sink. |
| `fac7679227360845` | Unvalidated Dictionary Lookups on `VIEW_TO_ITEM_ID` and `DESK_DESCRIPTIONS` Without `Object.hasOwn` Guards | `src/ui/UnifiedAntigravityWorkspaceShell.tsx:63` -> `src/shell/ShellDemo.tsx:381` -> `src/shell/ShellDemo.tsx:396` | `UnifiedAntigravityWorkspaceShell` defaults `initialView` to `'repos-models'`, overriding `params.get('item')`, and when `desk` resolves to `Object.prototype.toString`, React renders empty `mainTitle`/`mainSubtitle` strings without throwing. | Mount `<ShellDemo />` locally with `?item=toString` in the URL query string and verify that `desk` resolves to `Object.prototype.toString` with `undefined` `heading`/`sub`. | Check whether any deployed route mounts `ShellDemo` directly without `defaultActiveItemId` or passes untrusted query parameters into `initialView`. |

*(Rejected candidate fingerprints retained in `findings.json` to prevent repeat reporting: `b514bd0d6d97cd16` and `f790e77cc873eb3c`.)*

---

## 6. Hardening Notes and Positive Source Patterns
- **Positive Patterns Observed**:
  - `apps/hermes-leadgen/server.js:1547-1578`: `/api/souls/*` strips all characters outside `[a-z0-9-_]` (`line 1548`), and the static file handler enforces `!relFromRoot.startsWith('..')` (`line 1569`) alongside an explicit `isAllowedStatic` allowlist (`lines 1561-1566`).
  - `ops/eyes/lib/report.ts:53-84`: `slugify()` restricts report folder slugs to `[a-z0-9-]`, and `redact()` masks secrets, `%USERPROFILE%`, and RFC 1918 IPv4 literals before writing `judge.md` and `judge.json`.
  - `ops/node/register-health-task.ps1:37` and `ops/node/register-drift-logon.ps1:41`: Both scheduled tasks explicitly register with `-RunLevel Limited` rather than elevated privileges.
- **Additional Hardening Recommendations**:
  - Replace plain object maps (`VIEW_TO_ITEM_ID`, `DESK_DESCRIPTIONS`, `valuesByName`, `nodesByName`) with `Map` or guard lookups with `Object.hasOwn()`.
  - Enforce `127.0.0.1` loopback binding by default on both `server.ts` and `apps/hermes-leadgen/server.js` unless an explicit opt-in environment variable and bearer token are configured.

---

## 7. Coverage Summary (`coverage-ledger.json`)
- **Total Coverage Units**: `9`
  - `candidate` (with verified/recorded findings): `8`
  - `covered` (clean with zero findings): `1` (`static_marketing_site::public_web_visitor::sites_dream_online_net::client_side_dom_and_asset_exposure`)
  - `blocked`: `0`
  - `deferred`: `0`
  - `unresolved`: `0`
- **Important Exclusions**: SQL injection blocks were excluded across units that use flat JSON/Markdown files or in-memory state with zero SQL database drivers; XSS/DOM blocks were excluded on pure CLI/SSH backend modules (`ops/hooks`, `ops/router`, `ops/node`).
- **Final Coverage Critic Result**: `coverage-critic-final` confirmed all 9 in-scope units achieved complete source coverage with zero remaining high-priority gaps.
