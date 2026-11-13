// SPDX-FileCopyrightText: 2026 Koloki Ltd
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMockForumServer } from "../harness/mock-forum.mjs";

const root = new URL("../", import.meta.url);
const load = async (file) => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(file, root), "utf8")).toString("base64")}`);
const data = await load("javascripts/discourse/lib/dictionary-data.js");
const { SAMPLE_ENTRIES } = await load("javascripts/discourse/lib/sample-data.js");

test("normalization accepts editorial and normalized formats using invented terms", () => {
  const entry = data.normalizeEntry({
    id: "example-editorial",
    sources: { en: { "paper moon knot (example)": ["example-source"] } },
    notes: ["removed: obsolete example", "borttaget: obsolete example", "Public example note."],
  });
  assert.deepEqual(entry.terms, { en: ["paper moon knot (example)"] });
  assert.deepEqual(entry.notes, ["Public example note."]);
  assert.deepEqual(data.normalizeEntry(entry), entry);
  assert.equal(data.normalizeEntry({ id: "example-empty" }), null);
});

test("fenced multipart examples load in part order and reject missing parts", () => {
  const fence = (part, entry) => data.parsePayload(`Example intro\n\n\`\`\`igkt-dictionary\n${JSON.stringify({ v: 1, part, parts: 2 })}\n${JSON.stringify(entry)}\n\`\`\``);
  const first = fence(1, SAMPLE_ENTRIES[0]);
  const second = fence(2, SAMPLE_ENTRIES[1]);
  assert.deepEqual(data.entriesFromPayloads([second, first]), SAMPLE_ENTRIES.slice(0, 2));
  assert.throws(() => data.entriesFromPayloads([first]), (error) => error.code === "incomplete");
  assert.equal(data.parsePayload("An ordinary reply without data."), null);
});

test("unconfigured and unreadable topics report errors; URL fallback is supported", async () => {
  const fetchJson = async () => { throw Object.assign(new Error("HTTP 403"), { status: 403 }); };
  const fetchText = async () => JSON.stringify(SAMPLE_ENTRIES);
  await assert.rejects(data.loadDictionary({ topicId: "", url: "", fetchJson, fetchText }), (error) => error.code === "unconfigured");
  await assert.rejects(data.loadDictionary({ topicId: "123", url: "", fetchJson, fetchText }), (error) => error.code === "unavailable");
  const loaded = await data.loadDictionary({ topicId: "123", url: "/example.json", fetchJson, fetchText });
  assert.deepEqual(loaded, SAMPLE_ENTRIES);
});

test("export and HTTP topic/URL loading round-trip invented fixtures without private files", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "igkt-example-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = join(dir, "example-source.json");
  const original = JSON.stringify(SAMPLE_ENTRIES);
  await writeFile(source, original);
  execFileSync("python3", [fileURLToPath(new URL("tools/export_data.py", root)), source, "--outdir", join(dir, "posts"), "--max-chars", "1800"]);
  assert.equal(await readFile(source, "utf8"), original, "export must not modify its input");
  const manifest = JSON.parse(await readFile(join(dir, "posts", "manifest.json"), "utf8"));
  assert.equal(manifest.entries, SAMPLE_ENTRIES.length);
  assert.ok(manifest.posts.length > 1);
  for (const post of manifest.posts) {
    assert.ok((await readFile(join(dir, "posts", post.file), "utf8")).length <= 1800);
  }
  const server = await createMockForumServer({ forumDir: join(dir, "posts"), topicId: "123" });
  t.after(() => server.close());
  const fetchImpl = (path, options) => fetch(new URL(path, server.base), options);
  const loaders = {
    fetchJson: (path) => data.defaultFetchJson(path, fetchImpl),
    fetchText: (path) => data.defaultFetchText(path, fetchImpl),
  };
  assert.deepEqual(await data.loadDictionary({ topicId: "123", url: "", ...loaders }), SAMPLE_ENTRIES);
  assert.deepEqual(await data.loadDictionary({ topicId: "", url: "/forum-data/dictionary.json", ...loaders }), SAMPLE_ENTRIES);
});

test("preview server does not expose Git, private workspace, or sibling paths", async (t) => {
  const server = await createMockForumServer({ forumDir: null });
  t.after(() => server.close());
  for (const path of ["/.git/config", "/.private/history-rewrite/original-head.txt", "/%2eprivate%2fhistory-rewrite%2foriginal-head.txt", "/%2e%2e%2fsibling/file", "/forum-data/dictionary.json"]) {
    const response = await fetch(server.base + path);
    assert.equal(response.status, 404, path);
    await response.text();
  }
  const response = await fetch(server.base + "/harness/index.html");
  assert.equal(response.status, 200);
  await response.text();
});
