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

test("search folds o with stroke to o", () => {
  assert.equal(logic.fold("ø"), "o");
  assert.equal(logic.fold("Ø"), "o");
  const invented = logic.prepareEntries([{
    id: "example-stroke",
    category: "term",
    terms: { en: ["øpaper moon knot (example)"] },
  }]);
  const model = logic.buildTableModel({
    entries: invented,
    from: "en",
    to: ["sv"],
    cat: "",
    query: "opaper moon",
    letter: "",
  });
  assert.deepEqual(model.rows.map((entry) => entry.id), ["example-stroke"]);
});

test("letter bar keeps one character when German ß uppercases to SS", () => {
  const entry = {
    id: "example-sharp-s",
    category: "term",
    terms: { de: ["ßpaper (Beispiel)"] },
  };
  assert.equal(logic.letterOf(entry, "de"), "S");
  const model = logic.buildTableModel({
    entries: logic.prepareEntries([entry]),
    from: "de",
    to: ["en"],
    cat: "",
    query: "",
    letter: "",
  });
  assert.deepEqual(model.letters, ["S"]);
  const anchor = model.items.find((item) => item.type === "anchor");
  assert.equal(anchor.letter, "S");
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

test("rebuilt table rows keep a stable key for the same entry", () => {
  const args = { entries: prepared, from: "en", to: ["sv"], cat: "", query: "", letter: "" };
  const first = logic.buildTableModel(args);
  const second = logic.buildTableModel(args);
  const entryItem = (model) =>
    model.items.find((item) => item.type === "entry" && item.entry.id === "example-0001");
  const firstEntry = entryItem(first);
  const secondEntry = entryItem(second);
  assert.notEqual(firstEntry, secondEntry);
  assert.equal(firstEntry.rowKey, "entry:example-0001");
  assert.equal(secondEntry.rowKey, firstEntry.rowKey);
  const anchors = first.items.filter((item) => item.type === "anchor");
  assert.ok(anchors.length > 0);
  assert.ok(anchors.every((item) => item.rowKey === `anchor:${item.letter}`));
  const doubled = logic.buildTableModel({ ...args, entries: prepared.concat([prepared[0]]) });
  const keys = doubled.items.map((item) => item.rowKey);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys.filter((key) => key === "entry:example-0001" || key === "entry:example-0001#2").length, 2);
});

test("category, missing-language and column-selection behaviour is preserved", () => {
  const filtered = logic.filterAndSort({ entries: prepared, from: "en", cat: "bend", query: "", letter: "" });
  assert.ok(filtered.rows.length > 0);
  assert.ok(filtered.rows.every((entry) => entry.category === "bend"));
  const finnish = logic.buildTableModel({ entries: prepared, from: "fi", to: ["en"], cat: "", query: "", letter: "" });
  assert.equal(finnish.rows.length, 2);
  assert.equal(finnish.missing, 9);
  const languages = ["en", "sv", "fr"];
  assert.deepEqual(logic.adjustToLanguages("en", "sv", ["sv", "fr"], languages), ["en", "fr"]);
  assert.deepEqual(logic.defaultToLanguages("en", languages), ["sv", "fr"]);
});

test("languages come from data and can be ordered, limited and renamed", () => {
  const entry = { terms: { ja: ["星"], en: ["star"], "pt-BR": ["estrela"] } };
  assert.deepEqual(logic.dictionaryLanguages([entry]).codes, ["ja", "en", "pt-BR"]);
  const { codes, names } = logic.dictionaryLanguages([entry], "pt-BR, ja", "ja=Japanese");
  assert.deepEqual(codes, ["pt-BR", "ja"]);
  assert.equal(names.ja, "Japanese");
  assert.equal(logic.prepareEntries([entry], codes)[0]._fold.includes("star"), false);
  assert.throws(() => logic.dictionaryLanguages([entry], "de"), /language_order/);
});

test("the no-term count follows the letter filter as well as search and category", () => {
  const invented = logic.prepareEntries([
    {
      id: "example-o-loop",
      category: "knot",
      terms: {
        en: ["island loop (example)"],
        sv: ["ö-ögla (exempel)"],
      },
    },
    {
      id: "example-b-loop",
      category: "knot",
      terms: {
        en: ["blue loop (example)"],
        sv: ["blå ögla (exempel)"],
      },
    },
    {
      id: "example-no-sv-knot",
      category: "knot",
      terms: {
        en: ["orphan loop (example)"],
        de: ["Waisenögla (Beispiel)"],
      },
    },
    {
      id: "example-no-sv-bend",
      category: "bend",
      terms: {
        en: ["orphan bend (example)"],
      },
    },
    {
      id: "example-no-sv-zebra",
      category: "hitch",
      terms: {
        en: ["zebra orphan hitch (example)"],
        fi: ["seeprakiinnitys (esimerkki)"],
      },
    },
  ]);
  const countText = (model) =>
    model.missing
      ? `${model.rows.length} of ${invented.length} entries · ${model.missing} more match but have no Svenska term`
      : `${model.rows.length} of ${invented.length} entries`;
  const view = (overrides) =>
    logic.buildTableModel({
      entries: invented,
      from: "sv",
      to: ["en"],
      cat: "",
      query: "",
      letter: "",
      ...overrides,
    });

  const all = view({});
  assert.deepEqual(
    all.rows.map((entry) => entry.id),
    ["example-b-loop", "example-o-loop"]
  );
  assert.equal(all.missing, 3);
  assert.equal(countText(all), "2 of 5 entries · 3 more match but have no Svenska term");

  const letterO = view({ letter: "Ö" });
  assert.equal(letterO.letter, "Ö");
  assert.deepEqual(letterO.rows.map((entry) => entry.id), ["example-o-loop"]);
  assert.equal(letterO.missing, 0);
  assert.equal(countText(letterO), "1 of 5 entries");

  const letterB = view({ letter: "B" });
  assert.equal(letterB.missing, 0);
  assert.deepEqual(letterB.rows.map((entry) => entry.id), ["example-b-loop"]);

  const bend = view({ cat: "bend" });
  assert.equal(bend.rows.length, 0);
  assert.equal(bend.missing, 1);
  assert.equal(countText(bend), "0 of 5 entries · 1 more match but have no Svenska term");

  const knotAndO = view({ cat: "knot", letter: "Ö" });
  assert.deepEqual(knotAndO.rows.map((entry) => entry.id), ["example-o-loop"]);
  assert.equal(knotAndO.missing, 0);

  const zebra = view({ query: "zebra" });
  assert.equal(zebra.rows.length, 0);
  assert.equal(zebra.missing, 1);

  const orphan = view({ query: "orphan" });
  assert.equal(orphan.rows.length, 0);
  assert.equal(orphan.missing, 3);

  const ogla = view({ query: "ögla" });
  assert.deepEqual(
    ogla.rows.map((entry) => entry.id),
    ["example-b-loop", "example-o-loop"]
  );
  assert.equal(ogla.missing, 1);

  const oglaAndO = view({ query: "ögla", letter: "Ö" });
  assert.equal(oglaAndO.letter, "Ö");
  assert.deepEqual(oglaAndO.rows.map((entry) => entry.id), ["example-o-loop"]);
  assert.equal(oglaAndO.missing, 0);
  assert.equal(countText(oglaAndO), "1 of 5 entries");

  // A letter that the current search removes from the bar is not active.
  const orphanAndO = view({ query: "orphan", letter: "Ö" });
  assert.equal(orphanAndO.letter, "");
  assert.equal(orphanAndO.rows.length, 0);
  assert.equal(orphanAndO.missing, 3);

  const unusedLetter = view({ letter: "Q" });
  assert.equal(unusedLetter.letter, "");
  assert.equal(unusedLetter.rows.length, 2);
  assert.equal(unusedLetter.missing, 3);
});
