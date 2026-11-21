// SPDX-FileCopyrightText: 2026 Koloki Ltd
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const load = async (file) => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(file, root), "utf8")).toString("base64")}`);
const data = await load("javascripts/discourse/lib/dictionary-data.js");
const { SAMPLE_ENTRIES } = await load("javascripts/discourse/lib/sample-data.js");

const topicOf = (count) => ({
  posts_count: count,
  highest_post_number: count,
  post_stream: { posts: Array.from({ length: count }, (_, i) => ({ post_number: i + 1 })) },
});

test("three backticks inside a note do not end the dictionary block", async () => {
  const noted = {
    id: "example-fence",
    category: "term",
    terms: { en: ["paper moon knot (example)"] },
    notes: ["Invented note that mentions a ``` marker in the sentence."],
  };
  const post =
    "Example intro\n\n```igkt-dictionary\n" +
    JSON.stringify({ v: 1, part: 1, parts: 1 }) +
    "\n" +
    JSON.stringify(noted) +
    "\n" +
    JSON.stringify(SAMPLE_ENTRIES[1]) +
    "\n```\n";

  const bodies = data.extractFencedBodies(post);
  assert.equal(bodies.length, 1);
  assert.match(bodies[0], /``` marker/);

  const parsed = data.parsePayload(post);
  assert.ok(parsed);
  assert.deepEqual(
    parsed.entries.map((entry) => entry.id),
    ["example-fence", "example-0002"]
  );

  const loaded = await data.loadFromTopic("12", {
    fetchJson: async () => topicOf(1),
    fetchText: async () => post,
  });
  assert.deepEqual(loaded.map((entry) => entry.id), ["example-fence", "example-0002"]);
  assert.deepEqual(loaded[0].notes, noted.notes);
});

test("a dictionary block that is not valid JSON is still rejected", async () => {
  const broken = "```igkt-dictionary\n{not json\n```";
  assert.equal(data.parsePayload(broken), null);
  assert.equal(data.hasDictionaryFence(broken), true);
  await assert.rejects(
    data.loadFromTopic("12", {
      fetchJson: async () => topicOf(1),
      fetchText: async () => broken,
    }),
    (error) => error.code === "malformed"
  );
});
