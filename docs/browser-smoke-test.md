# Browser smoke test

Multilingual Dictionary `v0.4.0` and [Discourse Custom Route `v0.2.0`](https://github.com/koloki-co/discourse-custom-route/tree/v0.2.0) were tested on Discourse `2026.11.0-latest` (`9c72f9d3e93`). That is the build we checked, not a minimum version.

1. On a loopback Discourse development instance, install both projects and configure `/dictionary` for direct visits. Attach the component to the default theme, enable the header button with the label `Dictionary`, and set `data_topic_id` to a numeric ID. The test intercepts the data requests; it doesn't need a real word list or write any posts.
2. Set `language_order` to `en, ar` and `default_from_language` to `en`. Enable `show_term_sources` and set `source_credits` to `{"demo":{"label":"Invented catalogue","url":"https://example.test/catalogue"}}`.
3. With Playwright available, run:

   ```sh
   DICTIONARY_TOPIC_ID=123 node tests/browser-smoke.mjs
   ```

   Use your configured ID instead of `123`. The default URL is `http://localhost:3000/`; set `DISCOURSE_URL` for another loopback address. If Playwright is installed in the Discourse checkout, point `PLAYWRIGHT_ENTRY` at that package. `CHROMIUM_PATH` can select an existing Chromium binary.

The check uses Chromium at phone and desktop widths. It covers direct load, refresh, term credits, Arabic text direction and cross-language search, plus accessible table roles, keyboard focus and navigation. It checks what the browser exposes to assistive technology; it is not a manual screen-reader listening test. For that pass, move through the table by rows and columns, confirm the language headers are announced, and open and close notes with the keyboard.
