// SPDX-FileCopyrightText: 2026 Koloki Ltd
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("the dictionary declares its client route and scopes its page layout", async () => {
  const map = await read("javascripts/discourse/dictionary-route-map.js");
  const template = await read("javascripts/discourse/templates/dictionary.gjs");
  const route = await read("javascripts/discourse/routes/dictionary.js");
  const scss = await read("common/common.scss");
  const page = await read("javascripts/discourse/components/igkt-dictionary.gjs");
  const icon = await read("javascripts/discourse/components/dictionary-header-icon.gjs");

  assert.match(map, /path: "\/dictionary"/);
  assert.doesNotMatch(route, /setForcedHidden/);
  assert.match(template, /hideApplicationSidebar/);
  assert.match(template, /dictionary-page/);
  assert.match(scss, /body\.dictionary-page/);
  assert.match(scss, /\.sidebar-wrapper/);
  assert.match(scss, /--d-sidebar-width:\s*0px/);
  assert.doesNotMatch(scss, /powered-by-discourse/);
  assert.doesNotMatch(scss, /sidebar-footer-wrapper/);
  assert.doesNotMatch(scss, /grid-template-areas\s*:/);
  assert.doesNotMatch(scss, /grid-template-columns\s*:\s*0/);
  assert.match(scss, /width < 48rem/);
  assert.match(scss, /&\.has-sidebar-page #main-outlet-wrapper[\s\S]*minmax\(0,\s*1fr\)/);
  assert.match(page, /aria-expanded/);
  assert.match(page, /aria-controls/);
  assert.match(page, /aria-pressed/);
  assert.match(page, /sanitizeSourcesHtml/);
  assert.doesNotMatch(page, /role=\{\{if @entry\.notes "button"\}\}/);
  assert.match(icon, /header_link_title/);
  assert.match(page, /applyDictionaryLoad/);
  assert.match(page, /willDestroy/);
  assert.match(page, /#loadAbort/);
  assert.match(page, /@cached/);
  assert.match(page, /key="rowKey"/);
});

test("term cells carry lang and a real narrow-screen language label", async () => {
  const page = await read("javascripts/discourse/components/igkt-dictionary.gjs");
  const scss = await read("common/common.scss");
  const harness = await read("harness/app.js");
  const preview = await read("harness/styles.css");

  assert.match(page, /<td class="igkt-dictionary__src" lang=\{\{@from\}\}>/);
  assert.match(page, /<td lang=\{\{lang\}\}>/);
  assert.match(page, /class="igkt-dictionary__lang" lang="en"/);
  assert.doesNotMatch(page, /data-l=/);
  assert.match(scss, /&__lang\s*\{[^}]*display:\s*none/);
  assert.match(scss, /&__lang\s*\{[^}]*display:\s*inline-block/);
  assert.doesNotMatch(scss, /content:\s*attr\(data-l\)/);
  assert.match(harness, /lang="\$\{esc\(state\.from\)\}"/);
  assert.match(harness, /lang="\$\{esc\(l\)\}"/);
  assert.match(harness, /igkt-dictionary__lang/);
  assert.doesNotMatch(preview, /content:\s*attr\(data-l\)/);
  assert.match(preview, /\.igkt-dictionary__lang \{ display: none; \}/);
});
