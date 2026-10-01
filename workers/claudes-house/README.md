# Claude's House

A read-only Model Context Protocol (MCP) connector for claude.ai and Cowork. Joshua calls it the tool of tools for Claude's House: one small Cloudflare Worker that knows what the House knows, so any Claude, anywhere, in the CLI, on claude.ai or in Cowork, and anyone who wants to build the way this House builds, can read the whole arrangement without being handed the repository.

It is a plain ES module with zero npm dependencies at runtime (`export default { fetch }`), implementing MCP over Streamable HTTP by hand. It serves JSON-RPC 2.0 over a single POST endpoint and a short plain-text page on GET. It never writes anything, never requires authentication, and never reads a file outside a strict allowlist. There are no secrets in this folder for it to leak, because it never holds any.

## What it serves

Content comes straight from the public GitHub repository `Trollz1004/dream-online` on `main`, fetched live from `raw.githubusercontent.com` and the GitHub contents API, cached for five minutes. The tools are:

- `house_rules`: the House rules, the seats, the nodes, the standing rules, the tribute.
- `house_lessons`: the lessons, written for anyone who builds this way.
- `house_tools`: the index of the House's tools, scripts and records.
- `house_status`: the newest node journal entry, the dispatch's latest dated paragraph, and the AI Studio stage board, in one call.
- `house_read`: read one allowlisted file by its repository path.
- `house_list`: list file names inside one of `docs/handoffs`, `docs/tech`, `docs/gdd` or `specs`.
- `house_search`: a case-insensitive substring search over the House's core docs, or one named folder.
- `house_spec`: a Spec Kit spec's `spec.md`, `plan.md` and `tasks.md` headings and first paragraphs, by id, such as `006`.

Every exact allowlisted file is also exposed as an MCP resource at `house://<path>`, readable through `resources/read`.

## Adding it in claude.ai

Open Settings, then Connectors, then Add custom connector, and paste in this Worker's deployed URL (the one `wrangler deploy` prints, something like `https://claudes-house.<your-subdomain>.workers.dev`). Claude will call `initialize`, then `tools/list`, and the House tools appear.

## Adding it in Cowork

Cowork uses the same custom connector flow: add a custom connector, paste the same Worker URL, and the same tools appear there too.

## Deploying it

From this folder (`workers/claudes-house/`), two commands:

```
npx wrangler login
npx wrangler deploy
```

The first opens a browser to sign in to a Cloudflare account; the second publishes the Worker and prints its URL. Both run on the Cloudflare Workers free plan, which needs no card on file for a Worker this small (one route, no bindings, no paid features). Re-run `npx wrangler deploy` any time the source changes; it redeploys to the same URL.

## Forking it for another House

This connector was written so anyone can point it at their own project. Fork the repository, copy or adapt `workers/claudes-house/`, and change three values in `wrangler.toml` (or as Variables in the Cloudflare dashboard after deploying): `HOUSE_OWNER`, `HOUSE_REPO` and `HOUSE_REF`. If your repository keeps a similar `docs/house/` folder with `THE-HOUSE.md`, `LESSONS.md` and `TOOLS.md`, the fixed tools work unchanged; otherwise edit `src/worker.mjs`'s allowlist to match your own layout. Nothing else needs to change, and nothing here needs an account id or a secret.

## What it never does

It never writes to the repository, never needs or accepts credentials, never reads a file outside its allowlist (it rejects `..`, absolute paths, anything touching `.env`, and anything not explicitly listed, with a plain error), and never holds a secret, key or token of any kind. It rate-limits politely, at most 60 tool calls per minute per caller, best effort. It stays read-only. That is the rule, not a default to be revisited.

## Testing

```
npm test
```

runs `node --test` against `test/worker.test.mjs`, which mocks the network entirely through `createHandler({ fetchImpl, cache })` (exported from `src/worker.mjs`) so the suite needs no deployment and no internet access. As of this writing it is 35 tests covering `initialize`, every tool, the allowlist refusals, truncation at 60,000 characters, the rate limit, malformed JSON, and unknown methods and tools.
