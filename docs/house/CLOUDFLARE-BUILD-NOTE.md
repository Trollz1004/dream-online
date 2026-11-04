# Cloudflare Workers Build Diagnosis & Dashboard Settings

**Document**: `docs/house/CLOUDFLARE-BUILD-NOTE.md`  
**Target Repository**: `Trollz1004/dream-online`  
**Failing GitHub Check**: `Workers Builds: dream-online` (Cloudflare Workers and Pages)

---

## 1. Executive Diagnosis

- **Status**: The repository builds and tests cleanly locally with zero errors (`npm ci` -> `npm run build` -> `npm test` passing 124/124 tests; `sites/dream-online-net` Vite build passing 8/8 tests).
- **Failure Mode**: The GitHub check `Workers Builds: dream-online` fails instantly in **0 seconds** on every commit and PR.
- **Root Cause**: Cloudflare Workers CI/CD has a Worker service named `dream-online` attached to this GitHub repository with root directory `/`. Because the repository root has no `wrangler.toml` or `wrangler.json`, Cloudflare Workers Builds aborts immediately at the configuration validation step.
- **Wrangler Audit Across All Branches**: Exhaustive search across all remote branches (`git log --all -- '*wrangler*'` and `git grep -i wrangler $(git branch -r)`) confirms only one Wrangler configuration exists in the entire repository: `workers/claudes-house/wrangler.toml` (the read-only MCP connector). No `wrangler.toml`, `wrangler.json`, or `.cloudflare` folder exists at repo root or under `sites/dream-online-net`.

---

## 2. What the House Architecture Demands

1. **Public Front (`sites/dream-online-net`)**: The public marketing showcase for `dream-online.net` lives under `sites/dream-online-net`. It is a Vite + React static application (`npm run build` -> `sites/dream-online-net/dist`).
2. **Game Client (Repo Root)**: The 3D MMORPG client builds from the repository root using Vite (`npm run build` -> `dist/`).
3. **Server (`server.ts`)**: `server.ts` is an Express + Node.js/tsx server running on Alienware :9180. It is **NOT** a Cloudflare Worker.
4. **Claude's House Connector (`workers/claudes-house/`)**: The only Cloudflare Worker in this repo is `workers/claudes-house/`, configured via `workers/claudes-house/wrangler.toml`.

---

## 3. Exact Cloudflare Dashboard Settings (Short List for Josh / Judge)

To resolve the failing GitHub check, apply one of the following configurations in the Cloudflare Dashboard (`dash.cloudflare.com` -> Account `dfc784699f3fe397f3ff59a6f47b2255` -> Workers & Pages):

### Choice A: If `dream-online` should host the public front (`dream-online.net`)
Configure `dream-online` as Cloudflare Pages (or Worker with Static Assets):
- **Root directory**: `sites/dream-online-net`
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Environment variables**: `NODE_VERSION = 22`

### Choice B: If `dream-online` should host the game client SPA
Configure `dream-online` as Cloudflare Pages (or Worker with Static Assets):
- **Root directory**: `/`
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Environment variables**: `NODE_VERSION = 22`

### Choice C: If `dream-online` should build the Claude's House Worker
In Cloudflare Workers Dashboard -> `dream-online` -> Settings -> Builds:
- **Build configuration**:
  - **Root directory**: `workers/claudes-house`
  - **Build command**: `npm install` (or none)
  - **Deploy command**: `wrangler deploy`

### Choice D: Disconnect / Disable Check (If deployment is handled elsewhere)
If production hosting is managed via Alienware :9180 / Vercel:
- In Cloudflare Dashboard -> Workers & Pages -> `dream-online` -> Settings -> Builds:
  - Select **Disconnect repository** or disable **Automatic deployments**.
  - This immediately removes the failing GitHub check from all future PRs and pushes.
