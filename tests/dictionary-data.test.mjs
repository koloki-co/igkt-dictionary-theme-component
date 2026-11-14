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
import { sanitizeSourcesHtml } from "../javascripts/discourse/lib/sources-html.js";

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
  assert.deepEqual(entry.sources, { en: { "paper moon knot (example)": ["example-source"] } });
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

test("exporter keeps invented per-term source ids", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "igkt-sources-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = join(dir, "example-source.json");
  await writeFile(source, JSON.stringify([{
    id: "example-src",
    category: "term",
    sources: { en: { "paper moon knot (example)": ["example-source"] } },
    notes: ["Public example note."],
  }]));
  execFileSync("python3", [fileURLToPath(new URL("tools/export_data.py", root)), source, "--outdir", join(dir, "posts"), "--max-chars", "4000"]);
  const post = await readFile(join(dir, "posts", "post-1.md"), "utf8");
  assert.match(post, /example-source/);
  const loaded = data.entriesFromPayloads([data.parsePayload(post)]);
  assert.deepEqual(loaded[0].sources, { en: { "paper moon knot (example)": ["example-source"] } });
  assert.deepEqual(loaded[0].terms, { en: ["paper moon knot (example)"] });
});

test("malformed, gapped and oversized dictionary payloads are reported", async () => {
  assert.throws(
    () => data.parsePayload("```igkt-dictionary\n{\"v\":9,\"part\":1,\"parts\":1}\n{\"id\":\"example-x\",\"terms\":{\"en\":[\"paper moon knot (example)\"]}}\n```"),
    (error) => error.code === "malformed"
  );
  const broken = "```igkt-dictionary\n{not json\n```";
  assert.equal(data.parsePayload(broken), null);
  assert.equal(data.hasDictionaryFence(broken), true);

  const usable = data.entriesFromPayloads([
    { entries: [SAMPLE_ENTRIES[0], { id: "example-blank", category: "term" }] },
  ]);
  assert.deepEqual(usable.map((entry) => entry.id), ["example-0001"]);
  assert.match(usable.warnings[0], /1 record was skipped/);
  assert.throws(
    () => data.entriesFromPayloads([{ entries: [{ id: "example-blank" }] }]),
    (error) => error.code === "malformed"
  );

  assert.deepEqual(
    data.postNumbersToFetch({
      posts_count: 2,
      highest_post_number: 3,
      post_stream: { posts: [{ post_number: 1 }, { post_number: 3 }] },
    }),
    [1, 3]
  );
  assert.throws(
    () => data.postNumbersToFetch({
      posts_count: 40,
      highest_post_number: 40,
      post_stream: { posts: [{ post_number: 1 }] },
    }),
    (error) => error.code === "incomplete"
  );

  const part = (n, entry) =>
    "```igkt-dictionary\n" +
    JSON.stringify({ v: 1, part: n, parts: 2 }) +
    "\n" +
    JSON.stringify(entry) +
    "\n```";
  const bodies = {
    1: part(1, SAMPLE_ENTRIES[0]),
    3: part(2, SAMPLE_ENTRIES[1]),
  };
  const loaded = await data.loadFromTopic("123", {
    fetchJson: async () => ({
      posts_count: 2,
      highest_post_number: 3,
      post_stream: { posts: [{ post_number: 1 }, { post_number: 3 }] },
    }),
    fetchText: async (path) => {
      const number = Number(path.split("/").pop());
      if (!bodies[number]) {
        throw Object.assign(new Error("missing"), { status: 404 });
      }
      return bodies[number];
    },
  });
  assert.deepEqual(loaded.map((entry) => entry.id), ["example-0001", "example-0002"]);

  await assert.rejects(
    data.loadFromTopic("123", {
      fetchJson: async () => ({
        posts_count: 1,
        highest_post_number: 1,
        post_stream: { posts: [{ post_number: 1 }] },
      }),
      fetchText: async () => broken,
    }),
    (error) => error.code === "malformed"
  );

  const hanging = (_path, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });
  await assert.rejects(
    data.defaultFetchText("/slow", hanging, { timeoutMs: 20 }),
    (error) => error.code === "unavailable" && /timed out/.test(error.message)
  );
  const huge = async () => ({
    ok: true,
    status: 200,
    text: async () => "x".repeat(data.MAX_BODY_CHARS + 1),
  });
  await assert.rejects(data.defaultFetchText("/big", huge), (error) => error.code === "malformed");
});

test("sources footnote keeps credits and drops active markup", async () => {
  const note = sanitizeSourcesHtml(
    '<p><strong>Sources.</strong> <a href="https://www.wikidata.org/" onclick="alert(1)">Wikidata</a> <em>example</em></p><script>alert(1)</script><a href="javascript:alert(1)">click</a><a href="&#106;avascript:alert(1)">also</a>'
  );
  assert.match(note, /Wikidata/);
  assert.match(note, /href="https:\/\/www.wikidata.org\/"/);
  assert.match(note, /rel="noopener noreferrer"/);
  assert.match(note, /<em>example<\/em>/);
  assert.doesNotMatch(note, /script|onclick|javascript/i);

  const settings = await readFile(new URL("../settings.yml", import.meta.url), "utf8");
  const defaultNote = settings.slice(settings.indexOf("sources_note:"));
  const kept = sanitizeSourcesHtml(defaultNote);
  assert.match(kept, /Virittäjä/);
  assert.match(kept, /Ezelius/);
  assert.match(kept, /Wikidata/);
  assert.match(kept, /href="https:\/\/www.wikidata.org\/"/);
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
