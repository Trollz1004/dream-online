# Leads Requiring Validation (`NEEDS VALIDATION`) — Run 1 (`Trollz1004/dream-online`)

The following 2 source-grounded candidates identify concrete parser or dictionary-lookup flaws in in-scope modules, but their end-to-end exploitability across a security boundary depends on runtime consumer behavior or non-default component mounting. Per the `security-audit` skill rules, they are recorded without severity ratings.

---

## Lead 1: `a98e955187a573ad` — Escaped-Backslash Quote Desynchronization in `splitTopLevelArgs` and Plain-Object Prototype Lookups in `evaluateOpenUiProgram`

### Affected Boundary
Untrusted OpenUI Lang 1.0 script input (`parseOpenUiProgram` / `evaluateOpenUiProgram` in `src/engine/openui/openui-engine.ts`) -> Evaluated `EvaluatedOpenUiProgram` AST consumed by UI renderers.

### Claimed Root Cause
`splitTopLevelArgs` at `src/engine/openui/openui-engine.ts:183` checks only single-character `prev !== '\\'` rather than counting consecutive preceding backslashes, and `resolveStatement` at `src/engine/openui/openui-engine.ts:389` uses `name in valuesByName` on a plain `{}` object instead of `Object.hasOwn(valuesByName, name)` or a `Map`.

### Ordered Source Trace
1. `entrypoint` — `src/engine/openui/openui-engine.ts:223` (`parseOpenUiProgram`): Parses OpenUI Lang source lines into `OpenUiProgramAst` statements.
2. `propagation` — `src/engine/openui/openui-engine.ts:183` (`splitTopLevelArgs`): Checks `if ((ch === '"' || ch === "'") && prev !== '\\')`, which misparses closing quotes preceded by an even number of backslashes (`"a\\"`).
3. `sink` — `src/engine/openui/openui-engine.ts:389` (`resolveStatement`): `if (name in valuesByName) return valuesByName[name];` matches inherited `Object.prototype` properties on the plain `valuesByName` object (initialized at `line 315`).

### Verified Evidence
- `src/engine/openui/openui-engine.ts:183`: Quote toggle checks `prev !== '\\'` instead of tracking whether the backslash itself is escaped.
- `src/engine/openui/openui-engine.ts:315`: `valuesByName` and `nodesByName` are initialized as plain `{}` objects rather than `Object.create(null)` or `Map`.
- `src/engine/openui/openui-engine.ts:389`: `if (name in valuesByName)` returns `true` for every property on `Object.prototype` (`toString`, `valueOf`, `constructor`, etc.).

### Exact Blocker
While `evaluateOpenUiProgram` is exposed via `server.ts` (`/api/openui/evaluate`), the evaluated AST output is returned as JSON data (`EvaluatedOpenUiProgram`) and rendered through React components that escape text nodes by default, so exploiting the parser desynchronization or prototype lookup to cross a security boundary requires a consumer that feeds evaluated args into an unsafe sink.

### Resolution Plans
- **Bounded Local Plan**: Pass `toString = Text("hello")\nroot = Stack([toString])` and `root = Text("a\\\\", "b")` into `parseOpenUiProgram` and `evaluateOpenUiProgram` to verify statement evaluation bypass and argument desynchronization.
- **Owner-Observed Deployment Plan**: Check all callers of `evaluateOpenUiProgram` across `server.ts` and `src/` to verify whether any component prop derived from `node.args` reaches an unvalidated URL or HTML sink.

---

## Lead 2: `fac7679227360845` — Unvalidated Dictionary Lookups on `VIEW_TO_ITEM_ID` and `DESK_DESCRIPTIONS` Without `Object.hasOwn` Guards

### Affected Boundary
URL query string (`window.location.search` `?item=`) and `initialView` prop -> `UnifiedAntigravityWorkspaceShell` (`src/ui/UnifiedAntigravityWorkspaceShell.tsx`) and `ShellDemo` (`src/shell/ShellDemo.tsx`).

### Claimed Root Cause
`VIEW_TO_ITEM_ID[initialView] ?? 'mission-control'` (`src/ui/UnifiedAntigravityWorkspaceShell.tsx:70`) and `DESK_DESCRIPTIONS[activeItemId] ?? DESK_DESCRIPTIONS['mission-control']` (`src/shell/ShellDemo.tsx:396`) rely on nullish coalescing (`??`) over plain objects without `Object.hasOwn()`, which fails to fall back when given `Object.prototype` property names such as `toString` or `constructor`.

### Ordered Source Trace
1. `entrypoint` — `src/ui/UnifiedAntigravityWorkspaceShell.tsx:63` (`UnifiedAntigravityWorkspaceShell`): Accepts `initialView` prop and indexes `VIEW_TO_ITEM_ID[initialView] ?? 'mission-control'` at `line 70` before passing `defaultActiveItemId` to `ShellDemo`.
2. `propagation` — `src/shell/ShellDemo.tsx:381` (`ShellDemo`): Computes `initialItem = defaultActiveItemId ?? params.get('item') ?? DEMO_SIDEBAR_ITEMS[0].id` from `window.location.search`.
3. `sink` — `src/shell/ShellDemo.tsx:396` (`ShellDemo`): `const desk = DESK_DESCRIPTIONS[activeItemId] ?? DESK_DESCRIPTIONS['mission-control'];` returns `Object.prototype[activeItemId]` when `activeItemId` is an inherited property name, leaving `desk.heading` (`line 423`) and `desk.sub` (`line 424`) `undefined`.

### Verified Evidence
- `src/ui/UnifiedAntigravityWorkspaceShell.tsx:53`: `VIEW_TO_ITEM_ID` is a plain object literal indexed via `VIEW_TO_ITEM_ID[initialView] ?? 'mission-control'` at `line 70`.
- `src/shell/ShellDemo.tsx:381`: `params.get('item')` is read from `window.location.search` into `initialItem` / `activeItemId`.
- `src/shell/ShellDemo.tsx:396`: `DESK_DESCRIPTIONS[activeItemId] ?? DESK_DESCRIPTIONS['mission-control']` uses `??` without `Object.hasOwn(DESK_DESCRIPTIONS, activeItemId)`.

### Exact Blocker
When `UnifiedAntigravityWorkspaceShell` is called with its default prop (`initialView = 'repos-models'`), `defaultActiveItemId` is `'mission-control'`, which takes precedence over `params.get('item')` at `src/shell/ShellDemo.tsx:381`; furthermore, when `desk.heading` and `desk.sub` are `undefined`, React renders empty header text rather than throwing a runtime exception or executing script.

### Resolution Plans
- **Bounded Local Plan**: Mount `<ShellDemo />` in a browser with `?item=toString` in the URL query string and verify that `desk` resolves to `Object.prototype.toString` and renders blank `mainTitle`/`mainSubtitle` headers.
- **Owner-Observed Deployment Plan**: Check whether any deployed route mounts `ShellDemo` directly without `defaultActiveItemId` or passes URL query strings into `initialView` on `UnifiedAntigravityWorkspaceShell`.
