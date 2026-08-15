import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("the patched Nano ID generator safely handles the zero-size denial-of-service case", () => {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const { customAlphabet } = require('nanoid'); process.stdout.write(JSON.stringify(customAlphabet('abc', 0)()));",
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      timeout: 1_000,
    },
  );

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '""');
});

test("Nano ID still generates legitimate identifiers", () => {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const { customAlphabet } = require('nanoid'); process.stdout.write(customAlphabet('abc', 12)());",
    ],
    { cwd: repositoryRoot, encoding: "utf8", timeout: 1_000 },
  );

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^[abc]{12}$/);
});

test("the lock is registry-only and keeps Nano ID on the patched floor", async () => {
  const lock = JSON.parse(
    await readFile(resolve(repositoryRoot, "package-lock.json"), "utf8"),
  );
  const nanoid = lock.packages["node_modules/nanoid"];
  const [major, minor, patch] = nanoid.version.split(".").map(Number);

  assert.ok(
    major > 3 || (major === 3 && (minor > 3 || (minor === 3 && patch >= 18))),
    `expected Nano ID >=3.3.18, received ${nanoid.version}`,
  );

  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!entry.resolved) continue;
    assert.match(
      entry.resolved,
      /^https:\/\/registry\.npmjs\.org\//,
      `${path || "root"} uses a non-registry source: ${entry.resolved}`,
    );
  }
});
