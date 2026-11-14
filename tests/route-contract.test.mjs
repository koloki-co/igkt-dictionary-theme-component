// SPDX-FileCopyrightText: 2026 Koloki Ltd
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("the Ember route and the Rails plugin serve the same /dictionary path", async () => {
  const plugin = await read("plugins/igkt-dictionary-route/plugin.rb");
  const controller = await read("plugins/igkt-dictionary-route/app/controllers/igkt_dictionary_route/page_controller.rb");
  const map = await read("javascripts/discourse/dictionary-route-map.js");
  const template = await read("javascripts/discourse/templates/dictionary.gjs");
  const route = await read("javascripts/discourse/routes/dictionary.js");
  const scss = await read("common/common.scss");
  const page = await read("javascripts/discourse/components/igkt-dictionary.gjs");
  const icon = await read("javascripts/discourse/components/dictionary-header-icon.gjs");

  assert.match(plugin, /PATH = "\/dictionary"/);
  assert.match(plugin, /get ::IgktDictionaryRoute::PATH => "igkt_dictionary_route\/page#show"/);
  assert.match(plugin, /get "#\{::IgktDictionaryRoute::PATH\}\/" => "igkt_dictionary_route\/page#show"/);
  assert.match(controller, /render "default\/empty"/);
  assert.match(controller, /skip_before_action :check_xhr/);
  assert.match(map, /path: "\/dictionary"/);
  assert.doesNotMatch(route, /setForcedHidden/);
  assert.match(template, /hideApplicationSidebar/);
  assert.match(template, /dictionary-page/);
  assert.match(scss, /body\.dictionary-page/);
  assert.match(scss, /\.sidebar-wrapper/);
  assert.match(scss, /--d-sidebar-width:\s*0px/);
  assert.doesNotMatch(scss, /powered-by-discourse/);
  assert.doesNotMatch(scss, /sidebar-footer-wrapper/);
  assert.doesNotMatch(scss, /grid-template-areas:\s*"main"/);
  assert.match(page, /aria-expanded/);
  assert.match(page, /aria-controls/);
  assert.match(page, /aria-pressed/);
  assert.match(page, /sanitizeSourcesHtml/);
  assert.doesNotMatch(page, /role=\{\{if @entry\.notes "button"\}\}/);
  assert.match(icon, /header_link_title/);
});
