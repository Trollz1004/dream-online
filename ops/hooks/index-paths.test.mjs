import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const INDEX_PATH = join(REPO_ROOT, "docs", "house", "INDEX.md");

/**
 * Extracts every token enclosed in backticks from markdown text.
 * The House Index documentation specifies that backticks mark a path
 * in this repository and nothing else.
 */
export function extractBacktickTokens(text) {
  const matches = [...text.matchAll(/`([^`\r\n]+)`/g)];
  return matches.map((m) => m[1]);
}

/**
 * Asserts that the given path string points to a file or folder tracked in git.
 * Uses `git ls-files` so that files existing only at run time fail.
 */
export function assertPathTracked(pathStr, cwd = REPO_ROOT) {
  const normalized = pathStr.trim().replace(/\\/g, "/");
  const stdout = execFileSync("git", ["ls-files", "--", normalized], {
    cwd,
    encoding: "utf8",
  }).trim();

  const lines = stdout ? stdout.split(/\r?\n/) : [];
  const isTracked = lines.some(
    (line) => line === normalized || line.startsWith(normalized + "/"),
  );

  assert.ok(
    isTracked,
    `Path "${pathStr}" is not tracked in this repository (git ls-files returned no match)`,
  );
}

// Case proving that a made-up path fails:
test("assertPathTracked fails when fed a made-up path", () => {
  const madeUpPath = "docs/house/non-existent-made-up-path-12345.md";
  assert.throws(
    () => {
      assertPathTracked(madeUpPath);
    },
    (err) => {
      assert.match(err.message, /is not tracked in this repository/);
      return true;
    },
  );
});

test("every path backticked in docs/house/INDEX.md is tracked in this repository", () => {
  const content = readFileSync(INDEX_PATH, "utf8");
  const tokens = extractBacktickTokens(content);
  assert.ok(
    tokens.length > 0,
    "Expected to find backticked paths in docs/house/INDEX.md",
  );

  const missing = [];
  for (const token of tokens) {
    try {
      assertPathTracked(token);
    } catch {
      missing.push(token);
    }
  }

  assert.deepEqual(
    missing,
    [],
    `docs/house/INDEX.md references missing or untracked paths:\n${missing.map((p) => `  - ${p}`).join("\n")}`,
  );
});
