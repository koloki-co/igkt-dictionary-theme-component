# IGKT Knot Dictionary

A Discourse **theme component**, plus a small routing plugin, that shows a multilingual knot, ropework and tools glossary at `/dictionary`. Niclas approves MIT publication of the code. The word list stays on the IGKT forum under separate permissions and is not in this repository. See [review.md](review.md) for the import boundary and [roadmap.md](roadmap.md) for what still needs a live Discourse check.

Private inputs, exports, recovery files and captures belong in the root gitignored `.private/` folder and must not be included in shared archives. New review documentation is CC-BY-SA-4.0; code remains MIT and forum data retains its source-specific terms.

It is meant to be installed by a forum administrator. It does not post. The word list is loaded at runtime from a forum topic. The plugin only serves the Ember application shell for `/dictionary`; it does not read or store the word list.

This is a glossary. It does not look up Ashley Book of Knots numbers.

The page follows the standalone IGKT dictionary's behaviour: English UI, a source-language selector, language column toggles, one accent-insensitive search across all languages, an A–Z bar (with Å Ä Ö after Z when the source language is Swedish), category filters, a hit counter, a table that becomes cards on a narrow screen, expandable notes, and a sources footnote.

Colours, typography and controls come from the active Discourse theme. The component uses only Discourse CSS custom properties (`var(--primary)`, `var(--tertiary)`, `var(--header_background)`, `var(--d-border-radius)` and so on) and Discourse button classes (`btn`, `btn-default`, `btn-primary`, `btn-small`). On discourse.igkt.net that means the IGKT-default / IGKT-light scheme (navy tertiary, gold header). There are no Seaserpent.se colours, and a dark scheme would be picked up automatically if the forum ever enabled one.

Local invented-data tests are available below. The supplied ZIP claims a headless preview; that has not been independently verified here. **V2 has not been installed or tested on a live Discourse site.**

## Licence

The **theme component code** in this repository is released under the [MIT License](LICENSE). Copyright (c) 2026 Niclas Andersson and contributors.

**The word list is not covered by the MIT licence and is not included in this repository.** It stays on the IGKT forum. The data draws on:

- Wikidata (CC0)
- Wiktionary (CC BY-SA, with attribution)
- Finnish Wikipedia (CC BY-SA, with attribution)
- J. Ezelius, used with permission for the IGKT forum
- Virittäjä, used with permission for the IGKT forum (credit this source even before those Finnish terms are added)
- Hjalmar Öhrvall, *Om knutar* (1916)
- Witcomb (1883)
- French review by Jean Bernard de Runz (JeanB)

No machine translation is used.

A tiny, clearly labelled set of **invented** example entries lives under `javascripts/discourse/lib/sample-data.js` for tests and the local harness only. That file is not the IGKT word list.

## Install

Install both pieces. The theme component is the dictionary. The plugin is what makes `/dictionary` survive a direct visit, a bookmark and a refresh. In-app navigation from the header book icon works with the theme alone; a full page load does not.

### 1. Theme component

From git, which is the method that picks up later code updates:

1. **Admin → Customize → Themes → Install → From a git repository**
2. Paste `https://github.com/Seaserpent/igkt-dictionary-theme-component` (branch `main` once this change is merged, or the review branch until then).
3. Open the theme the forum actually uses (on IGKT that is **IGKT-default**) and add **IGKT Knot Dictionary** as a theme component.
4. Set **`data_topic_id`** to the numeric id of the public data topic (see below). Optionally set **`data_url`** as a fallback.

A zip of this repository can be uploaded with **Install → From your device** instead. Do not put generated forum posts or `dictionary.json` in that zip.

To update the **code** later, use the theme’s **Check for updates** button, or upload a new zip. To update the **word list**, edit the data topic. No theme rebuild is required for a word-list edit.

### 2. Routing plugin

The plugin lives in [`plugins/igkt-dictionary-route`](plugins/igkt-dictionary-route). It is not installed by the theme importer. Copy or symlink that folder into the Discourse `plugins` directory so the folder itself contains `plugin.rb`, then rebuild the container.

For a [discourse_docker](https://github.com/discourse/discourse_docker) `app.yml` hook, the plugins directory is empty at image build time:

```yaml
hooks:
  after_code:
    - exec:
        cd: $home/plugins
        cmd:
          - git clone https://github.com/Seaserpent/igkt-dictionary-theme-component.git igkt-dictionary-theme-component
          - ln -sfn igkt-dictionary-theme-component/plugins/igkt-dictionary-route igkt-dictionary-route
```

The plugin adds `GET /dictionary` and `GET /dictionary/` and renders Discourse’s `default/empty` template, which is the Ember application shell. Ember then follows the theme’s client route. A site setting, **`igkt_dictionary_route_enabled`** (default on), turns that route off without removing the plugin.

Standard Discourse.org hosting does not install arbitrary plugins. On that hosting the same pass-through has to be added by the host. Self-hosted IGKT, or a plan that accepts this plugin, can install the folder above.

The dictionary shows a clear message if neither data setting is configured, and a clear error if the topic cannot be read, the format is wrong, a part is missing, or the topic is too large to load.

## How the word list is hosted on the forum

The component does not bundle the dictionary. It loads the list at runtime from the forum. The routing plugin is not involved in that fetch.

**Preferred method:** put the compact word list in **two wiki posts of one publicly readable topic**, and set `data_topic_id` to that topic’s id. The component reads `/t/{id}.json` and then `/raw/{id}/{post_number}` for the post numbers in that topic (same origin, so there is no CORS issue). Only posts that contain an `igkt-dictionary` fenced code block are parsed; ordinary replies are ignored.

**Why not an attachment or a theme upload?** Official Discourse hosting often serves uploads from an S3/CDN origin that does not send CORS headers. A browser `fetch` of that file from the forum can fail. A JSON attachment also needs `json` in `authorized_extensions`. A post body fetched same-origin avoids both problems, and a moderator can edit a wiki post without admin rights.

**Fallback:** `data_url` may point at a same-origin path (or any URL that returns a JSON array or an `igkt-dictionary` document). If both settings are filled, the topic is tried first and the URL is used if the topic cannot be read.

### What to create

1. Choose a **publicly readable** category (Docs, or another category that every dictionary user can see, including anonymous visitors if `/dictionary` is public).
2. Create **one topic**, for example titled “IGKT Knot Dictionary data”. Make the first post, and the second post, **wiki** posts so moderators can edit them. Close the topic to ordinary replies if the forum allows it (staff can still add or edit the data posts).
3. Paste the generated files:
   - first post: `post-1.md` (intro plus part 1 of 2)
   - second post: `post-2.md` (part 2 of 2)
4. Confirm that an anonymous window can open the topic. If the topic is staff-only, regular users will see a load error on `/dictionary`.
5. An administrator sets **`data_topic_id`** to the topic id (the number in `/t/…/12345`).

The list currently needs **two posts** because the compact JSON is about 55,000 characters and Discourse’s default `max_post_length` is 32,000. Do not raise `max_post_length` just for this if two posts already work.

### Generating the paste-ready files

From a checkout of this component, with a current `ordbok.json` (the master file, treated as read-only):

```bash
python3 tools/export_data.py /path/to/ordbok.json --outdir .private/forum-data
```

This writes `post-1.md`, `post-2.md`, `dictionary.json` (the full list, for an optional `data_url`) and `manifest.json` (sizes). Each `post-N.md` is kept under 30,000 characters, leaving headroom under the 32,000 default.

These exports are forum data, not MIT code. Never commit them, use them as public test fixtures, or package them with a code release. Publicly readable does not mean freely redistributable.

Treat `/workspace/ordbok-igkt/files/ordbok.json` as **read-only**. Do **not** run `enrich.py` or `build.py` inside `/workspace/ordbok-igkt` or `/workspace/igkt-ordbok` — those scripts overwrite `ordbok.json`.

To publish an update, regenerate the files and edit the wiki posts in place, keeping the same topic id.

Each data fence looks like this (JSONL):

````markdown
```igkt-dictionary
{"v":1,"part":1,"parts":2}
{"id":"example-0001","category":"term","terms":{...}}
```
````

Live terms are taken from `sources[lang][term]` when you export from `ordbok.json`. Notes that record a removed term (for example `borttaget` / `borttagna` / `removed`) are dropped so they cannot be mistaken for current terms. The component also applies that filter if someone pastes a raw `ordbok.json`.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `data_topic_id` | (empty) | Numeric id of the public topic that holds the word list. Preferred data source. |
| `data_url` | (empty) | Optional fallback URL to a JSON array or an `igkt-dictionary` document. |
| `show_header_link` | true | Adds a book icon in the site header that opens the dictionary **in-app** (no full page reload). |
| `header_link_title` | Dictionary | Tooltip and accessible name for that icon. |
| `page_title` | (empty) | Optional title. Blank uses the built-in “IGKT Multilingual Knot Dictionary”. |
| `page_subtitle` | (empty) | Optional subtitle. Blank uses the built-in subtitle. |
| `default_from_language` | en | Initial value of the **From** selector (`en`, `sv`, `de`, `fi`, `fr`, `es`). |
| `sources_note` | (see below) | Footer credit. A small set of HTML tags is kept (`p`, `a`, `strong`, `em`, `br`); other markup is removed. Keep the Virittäjä credit. |

If you prefer the existing **Custom Header Links** component instead of the built-in icon, turn `show_header_link` off and add a link with URL `/dictionary`. A plain `href` does a full page load, which works once the routing plugin is installed.

## Sources

Source ids in `ordbok.json` (`sources[lang][term] = [ids]`) are mapped to display names in one place:

`javascripts/discourse/lib/ordbok-sources.js`

| Id | Label |
| --- | --- |
| `wikidata` | Wikidata |
| `wiktionary-en` | Wiktionary |
| `fi.wikipedia` | Finnish Wikipedia |
| `ohrvall` | Öhrvall (1916) |
| `ezelius` | Ezelius |
| `witcomb1883` | Witcomb (1883) |
| `jeanb` | Jean Bernard de Runz (JeanB) |
| `virittaja` | Virittäjä |
| `niclas`, `egen` | IGKT (own additions) |

`virittaja` is already in the map. When Finnish terms from Virittäjä are added under that id, they pick up the label with no other code change.

The default **sources note** (editable in settings) credits the sources listed under Licence, including Virittäjä — a condition of their written permission, covering incoming Finnish terms.

## Why a plugin sits next to the theme

Discourse treats theme JavaScript like plugin JavaScript, so `javascripts/discourse/dictionary-route-map.js` registers an Ember route at `/dictionary`. That route runs after the Ember app has booted. A fresh tab, a bookmark and a refresh are answered by Rails before Ember starts. Theme components cannot add Rails routes. The page, its settings and the topic loader stay in the theme component. The plugin only adds the server route.

The smaller fix is the plugin in `plugins/igkt-dictionary-route`. It prepends `GET /dictionary` and renders `default/empty`, the same application shell Discourse uses for other client-rendered pages (`skip_before_action :check_xhr` is required, because a normal browser GET would otherwise be turned into an empty response before the action runs). Ember then enters the theme route. Pointing the path at `list#latest` would also boot Ember, and it would also run a topic-list query and is a poorer fit. The path is a literal in both the plugin and the route map. Route maps are parsed statically and cannot read a theme setting, so another community that wants a different URL changes those two files together.

Login-required forums still redirect anonymous visitors to login, because the controller inherits Discourse’s normal login filter. The dictionary does not bypass it.

## Layout, keyboard and bad data

On `/dictionary` the template calls Discourse’s `hideApplicationSidebar` helper, which removes the sidebar while the page is shown and puts it back on the way out. The header, the rest of the forum, and the “Powered by Discourse” credit stay. A `dictionary-page` body class is a fallback for the column width: it zeroes `--d-sidebar-width` and hides `.sidebar-wrapper` only while that class is present. It does not restyle other pages and it does not hide the credit.

Language toggles, the letter bar and note disclosure are buttons. Notes use `aria-expanded` and `aria-controls`, and Enter or Space activates the focused control. The selected letter and the selected translation columns use `aria-pressed`.

The loader accepts format version 1 (`{"v":1,"part":1,"parts":2}` as JSONL, or a JSON array). A different version, a broken `igkt-dictionary` fence, a missing part, an unreadable topic (including HTTP 403 and 404), a response over 1,000,000 characters, or a request that exceeds 20 seconds is shown on the page. A deleted post number is skipped when Discourse’s topic JSON already lists the surviving post numbers; `posts_count` alone is not treated as the last post number. Topics longer than 30 posts are refused, so a data topic should be closed to ordinary replies. Records with no usable terms are skipped and counted in a notice; if nothing usable remains, the page shows an error instead of an empty table. Per-term `sources` ids are kept on each entry when the topic includes them. The footer credit is the visitor-facing acknowledgement.

## Other install notes

- **Permissions.** Everyone who should see the dictionary must be able to read the data topic, including anonymous visitors when `/dictionary` is public. A staff-only topic produces a load error for everyone else.
- **`max_post_length`.** If a site has lowered this below about 30,000 characters, regenerate the export with a smaller `--max-chars` so more posts are produced, then paste every part. A missing part is reported on the page.
- **CORS on `data_url`.** Only a concern for a file on another origin (S3/CDN). Prefer `data_topic_id`.
- **`themePrefix` / `settings`.** Discourse’s theme compiler injects these. They supply translations and the settings above.
- **Search.** Matching folds case, accents, and the ligatures œ/oe, æ/ae, ß/ss and the common ﬁ/ﬂ forms.

## Local tests and preview

```bash
node --test tests/*.test.mjs
node harness/test.mjs
```

Tests require Node.js and Python 3. They use invented sample data only. The HTTP round-trip test generates temporary synthetic forum posts with the exporter and loads them through `/t/{id}.json` and `/raw/{id}/{n}`, with no private source files or real forum access. These tests do not compile or render a Discourse theme.

To preview the page in a browser:

```bash
node harness/serve.mjs
```

The default preview uses the invented sample entries and binds only to `127.0.0.1`. To deliberately preview local forum exports, run `IGKT_FORUM_DATA="$PWD/.private/forum-data" node harness/serve.mjs` and append `?topic=99999` to the preview URL. This makes that configured directory available through the mock server; do not expose the server publicly or commit data-bearing captures. Hidden paths such as `.git/` and `.private/` are blocked by the static file handler.
