// SPDX-FileCopyrightText: 2026 Niclas Andersson and contributors
// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const exporter = fileURLToPath(new URL("../tools/export_data.py", import.meta.url));

test("export refuses excess parts and never overwrites a previous export", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "dictionary-export-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, "entries.json");
  const out = join(dir, "posts");
  const entries = Array.from({ length: 32 }, (_, index) => ({
    id: `demo-${index}`,
    terms: { en: ["invented ".repeat(20)] },
  }));
  const run = (...args) => spawnSync("python3", [exporter, source, "--outdir", out, "--max-chars", "600", ...args], { encoding: "utf8" });
  writeFileSync(source, JSON.stringify(entries));
  const oversized = run();
  assert.notEqual(oversized.status, 0);
  assert.match(oversized.stderr, /allows 30/);
  assert.equal(existsSync(out), false);

  assert.equal(run("--json-only").status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(out, "manifest.json"))).posts, []);
  const before = readFileSync(join(out, "dictionary.json"), "utf8");
  writeFileSync(source, JSON.stringify(entries.slice(0, 1)));
  const repeated = run();
  assert.notEqual(repeated.status, 0);
  assert.match(repeated.stderr, /not empty/);
  assert.equal(readFileSync(join(out, "dictionary.json"), "utf8"), before);

  const oldPart = join(out, "post-3.md");
  writeFileSync(oldPart, "previous export");
  assert.notEqual(run().status, 0);
  assert.equal(readFileSync(oldPart, "utf8"), "previous export");
});
