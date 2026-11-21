// SPDX-FileCopyrightText: 2026 Koloki Ltd
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");
const load = async (file) =>
  import(
    `data:text/javascript;base64,${Buffer.from(await readFile(new URL(file, root), "utf8")).toString("base64")}`
  );
const logic = await load("javascripts/discourse/lib/dictionary-logic.js");

function withSelection(selection, run) {
  const previous = globalThis.getSelection;
  globalThis.getSelection = () => selection;
  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete globalThis.getSelection;
    } else {
      globalThis.getSelection = previous;
    }
  }
}

test("selecting text does not toggle notes, and a plain click still does", () => {
  const text = { closest: () => null };
  const button = { closest: (selector) => (selector.includes("button") ? button : null) };
  withSelection({ isCollapsed: false }, () => {
    assert.equal(logic.rowClickTogglesNotes({ target: text }), false);
  });
  withSelection({ isCollapsed: true }, () => {
    assert.equal(logic.rowClickTogglesNotes({ target: text }), true);
    assert.equal(logic.rowClickTogglesNotes({ target: button }), false);
  });
  withSelection(null, () => {
    assert.equal(logic.rowClickTogglesNotes({ target: text }), true);
  });
});

test("the To control is not a label, and the header icon has an accessible name", async () => {
  const page = await read("javascripts/discourse/components/igkt-dictionary.gjs");
  const icon = await read("javascripts/discourse/components/dictionary-header-icon.gjs");
  const scss = await read("common/common.scss");
  const fieldStart = page.indexOf('<div class="igkt-dictionary__field">');
  const toBlock = page.slice(fieldStart, page.indexOf("</div>", fieldStart));

  assert.match(page, /rowClickTogglesNotes/);
  assert.match(toBlock, /to_label/);
  assert.match(toBlock, /role="group"/);
  assert.match(toBlock, /aria-labelledby="igkt-dictionary-to-label"/);
  assert.doesNotMatch(toBlock, /<label/);
  assert.match(scss, /\.igkt-dictionary__field/);
  assert.match(icon, /@translatedTitle=\{\{this\.title\}\}/);
  assert.match(icon, /@translatedAriaLabel=\{\{this\.title\}\}/);
});
