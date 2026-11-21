// SPDX-FileCopyrightText: 2026 Koloki Ltd
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const load = async (file) => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(file, root), "utf8")).toString("base64")}`);
const data = await load("javascripts/discourse/lib/dictionary-data.js");
const logic = await load("javascripts/discourse/lib/dictionary-logic.js");
const { SAMPLE_ENTRIES } = await load("javascripts/discourse/lib/sample-data.js");

function partPost(part, entry) {
  return (
    "```igkt-dictionary\n" +
    JSON.stringify({ v: 1, part, parts: 2 }) +
    "\n" +
    JSON.stringify(entry) +
    "\n```"
  );
}

test("a complete set of numbered parts ignores an extra unnumbered paste", async () => {
  const extra = {
    id: "example-extra",
    category: "term",
    terms: { en: ["velvet turn (example)"] },
  };
  const loaded = data.entriesFromPayloads([
    { part: 2, parts: 2, entries: [SAMPLE_ENTRIES[1]] },
    { entries: [SAMPLE_ENTRIES[0], SAMPLE_ENTRIES[1], extra] },
    { part: 1, parts: 2, entries: [SAMPLE_ENTRIES[0]] },
  ]);
  assert.deepEqual(loaded.map((entry) => entry.id), ["example-0001", "example-0002"]);

  const pasted = JSON.stringify([SAMPLE_ENTRIES[0], SAMPLE_ENTRIES[1], extra]);
  const fromTopic = await data.loadFromTopic("77", {
    fetchJson: async () => ({
      posts_count: 3,
      highest_post_number: 3,
      post_stream: {
        posts: [{ post_number: 1 }, { post_number: 2 }, { post_number: 3 }],
      },
    }),
    fetchText: async (path) => {
      const number = Number(path.split("/").pop());
      if (number === 1) return partPost(1, SAMPLE_ENTRIES[0]);
      if (number === 2) return partPost(2, SAMPLE_ENTRIES[1]);
      return pasted;
    },
  });
  assert.deepEqual(fromTopic.map((entry) => entry.id), ["example-0001", "example-0002"]);
});

test("posts with no part numbers are still combined", () => {
  const loaded = data.entriesFromPayloads([
    { entries: [SAMPLE_ENTRIES[0]] },
    { entries: [SAMPLE_ENTRIES[1]] },
  ]);
  assert.deepEqual(loaded.map((entry) => entry.id), ["example-0001", "example-0002"]);
});

test("an incomplete numbered set is still an error when an extra paste is present", () => {
  assert.throws(
    () =>
      data.entriesFromPayloads([
        { part: 1, parts: 2, entries: [SAMPLE_ENTRIES[0]] },
        { entries: [SAMPLE_ENTRIES[0], SAMPLE_ENTRIES[1]] },
      ]),
    (error) => error.code === "incomplete"
  );
});

test("repeated ids get distinct notes controls and keep the usual id for the first row", () => {
  const copy = {
    ...SAMPLE_ENTRIES[0],
    notes: ["Invented second copy so its notes control must be its own."],
  };
  const colliding = {
    id: "example-0001-dup-1",
    category: "term",
    terms: { en: ["velvet turn (example)"] },
    notes: ["Invented id that uses the duplicate suffix."],
  };
  const prepared = logic.prepareEntries([colliding, SAMPLE_ENTRIES[0], copy]);
  const notesIds = prepared.map((entry) => entry._notesId);
  assert.equal(new Set(notesIds).size, notesIds.length);
  assert.equal(notesIds[1], logic.notesElementId("example-0001"));
  assert.equal(notesIds[1], "igkt-dictionary-notes-example-0001");
  assert.notEqual(notesIds[2], notesIds[1]);
  assert.notEqual(notesIds[2], notesIds[0]);

  const model = logic.buildTableModel({
    entries: prepared,
    from: "en",
    to: ["sv"],
    cat: "",
    query: "",
    letter: "",
  });
  const rowIds = model.items
    .filter((item) => item.type === "entry")
    .map((item) => item.entry._notesId);
  assert.equal(new Set(rowIds).size, rowIds.length);

  const open = { [notesIds[2]]: true };
  assert.equal(open[notesIds[1]], undefined);
});

test("unique entries keep one notes id, and the page uses that id", async () => {
  const prepared = logic.prepareEntries(SAMPLE_ENTRIES);
  assert.equal(prepared[0]._notesId, logic.notesElementId(SAMPLE_ENTRIES[0].id));
  assert.equal(new Set(prepared.map((entry) => entry._notesId)).size, prepared.length);

  const page = await readFile(
    new URL("../javascripts/discourse/components/igkt-dictionary.gjs", import.meta.url),
    "utf8"
  );
  const harness = await readFile(new URL("../harness/app.js", import.meta.url), "utf8");
  assert.match(page, /_notesId/);
  assert.doesNotMatch(page, /notesElementId @entry\.id/);
  assert.match(harness, /_notesId/);
});
