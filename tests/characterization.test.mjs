// SPDX-FileCopyrightText: 2026 Koloki Ltd
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const load = async (file) => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(file, root), "utf8")).toString("base64")}`);
const logic = await load("javascripts/discourse/lib/dictionary-logic.js");
const { SAMPLE_ENTRIES: entries, SAMPLE_NOTICE } = await load("javascripts/discourse/lib/sample-data.js");
const prepared = logic.prepareEntries(entries);

test("fixtures are explicitly invented examples, not the forum word list", () => {
  assert.match(SAMPLE_NOTICE, /not the IGKT word list/);
  assert.equal(entries.length, 11);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
  assert.ok(entries.every((entry) => entry.id.startsWith("example-")));
  assert.ok(entries.every((entry) => Object.values(entry.terms).flat().every((term) => /\((example|exempel|Beispiel|esimerkki|exemple|ejemplo)\)/.test(term))));
});

test("search folds accents, case and the supported ligatures", () => {
  assert.equal(logic.fold("ÅÄÖ"), "aao");
  assert.equal(logic.fold("Œuvre"), logic.fold("oeuvre"));
  assert.equal(logic.fold("æ"), logic.fold("ae"));
  assert.equal(logic.fold("ß"), logic.fold("ss"));
  assert.equal(logic.fold("ﬁ"), logic.fold("fi"));
  assert.equal(logic.notesElementId("example-0001"), "igkt-dictionary-notes-example-0001");
  assert.equal(logic.notesElementId("bad id"), "igkt-dictionary-notes-badid");
});

test("search finds an invented term in another language", () => {
  const model = logic.buildTableModel({ entries: prepared, from: "en", to: ["sv"], cat: "", query: "bla sillknop", letter: "" });
  assert.deepEqual(model.rows.map((entry) => entry.id), ["example-0001"]);
});

test("Swedish letter anchors are unique, ordered, and include Å Ä Ö after Z", () => {
  const model = logic.buildTableModel({ entries: prepared, from: "sv", to: ["en"], cat: "", query: "", letter: "" });
  const anchors = model.items.filter((item) => item.type === "anchor").map((item) => item.letter);
  assert.equal(new Set(anchors).size, anchors.length);
  assert.deepEqual(anchors, [...anchors].sort((a, b) => a.localeCompare(b, "sv")));
  assert.deepEqual(anchors.slice(-4), ["Z", "Å", "Ä", "Ö"]);
});

test("category, missing-language and column-selection behaviour is preserved", () => {
  const filtered = logic.filterAndSort({ entries: prepared, from: "en", cat: "bend", query: "", letter: "" });
  assert.ok(filtered.rows.length > 0);
  assert.ok(filtered.rows.every((entry) => entry.category === "bend"));
  const finnish = logic.buildTableModel({ entries: prepared, from: "fi", to: ["en"], cat: "", query: "", letter: "" });
  assert.equal(finnish.rows.length, 2);
  assert.equal(finnish.missing, 9);
  assert.deepEqual(logic.adjustToLanguages("en", "sv", ["sv", "fr"]), ["en", "fr"]);
  assert.equal(logic.defaultToLanguages("en").length, 5);
});
