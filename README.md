# IGKT Knot Dictionary

**Code-only v2 development import, not production-ready.** Niclas approves MIT publication of the code; the word list stays on the IGKT forum under separate permissions. See [review.md](review.md), [roadmap.md](roadmap.md) and [contributor notes](feedback.md) for verified scope and remaining work. The maintainer requested a new root history so the earlier bundled list is not reachable from the replacement branch. Existing collaborators should re-clone, not merge old history.

Private inputs, exports, recovery files and captures belong in the root gitignored `.private/` folder and must not be included in shared archives. New review documentation is CC-BY-SA-4.0; code remains MIT and forum data retains its source-specific terms.

A Discourse **theme component** that adds a multilingual knot, ropework and tools dictionary at `/dictionary` on [discourse.igkt.net](https://discourse.igkt.net).

It is meant to be installed by a forum administrator. It does not post and does not need a custom server route for the word list. Direct `/dictionary` navigation remains a separate unresolved server-route issue.

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

## Install from the zip

1. In Discourse go to **Admin → Customize → Themes → Install → From your device** and upload `igkt-dictionary-theme-component.zip`.
2. Open the theme that the forum actually uses (on IGKT that is **IGKT-default**) and add **IGKT Knot Dictionary** as a theme component.
3. Set **`data_topic_id`** to the numeric id of the public data topic (see below). Optionally also set **`data_url`** as a fallback.
4. Visit `/dictionary` from the new header book icon, or by clicking an in-app link to the `dictionary` route.

The dictionary will show a clear message for administrators if neither data setting is configured.

### Install from a git repository (once published)

1. **Admin → Customize → Themes → Install → From a git repository**
2. Paste `https://github.com/koloki-co/igkt-dictionary-theme-component`.
3. Add the component to **IGKT-default** and set `data_topic_id`, as above.

To update the **code** later, use the theme’s **Check for updates** button, or upload a new zip. To update the **word list**, edit the data topic (no theme rebuild is required).

## How the word list is hosted on the forum

The component does not bundle the dictionary. It loads the list at runtime, without a custom server route.

**Preferred method:** put the compact word list in **two wiki posts of one publicly readable topic**, and set `data_topic_id` to that topic’s id. The component reads `/t/{id}.json` and then `/raw/{id}/1`, `/raw/{id}/2`, … (same origin, so there is no CORS issue). Only posts that contain an `igkt-dictionary` fenced code block are parsed; ordinary replies are ignored.

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
| `header_link_title` | Dictionary | Tooltip for that icon. |
| `default_from_language` | en | Initial value of the **From** selector (`en`, `sv`, `de`, `fi`, `fr`, `es`). |
| `sources_note` | (see below) | Footer credit on the dictionary page. HTML is allowed, so an admin can edit the wording without a code change. Keep the Virittäjä credit. |

If you prefer the existing **Custom Header Links** component instead of the built-in icon, turn `show_header_link` off and add a link with URL `/dictionary`. Note that a plain `href` triggers a full page load; see “Direct visits to /dictionary” below.

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

## Direct visits to /dictionary (important)

The component registers a client-side Ember route at `/dictionary`. A theme component **cannot** add a Rails route.

- Clicking the header icon (in-app navigation) should open the page.
- Opening `https://discourse.igkt.net/dictionary` in a new tab, refreshing it, or sharing the URL may return Discourse’s **“Oops! That page doesn’t exist”** page, because the server does not know the path.

Workaround on official Discourse hosting, where a custom plugin is not an option: ask Discourse hosting to add a pass-through that serves the Ember app shell, equivalent to:

```ruby
get "/dictionary" => "list#latest"
```

Until that exists, in-app links still work. This is the main install risk.

## Other install risks

These follow current Discourse theme patterns (api-initializer, Glimmer `.gjs`, `*-route-map.js`, `headerIcons`). They may still need a small adjustment on a live 2026.10 site:

- **Route map discovery.** The file is `javascripts/discourse/dictionary-route-map.js`, the same `*-route-map.js` convention plugins use. If the route is not registered, the file may need to live at `javascripts/dictionary-route-map.js`.
- **Route template.** The template uses `ember-route-template` (`RouteTemplate`). Current Discourse core also allows a plain `<template>` in a `.gjs` route template. If the page is blank, try switching to a bare `<template>`.
- **Sidebar hiding.** The route adds a `dictionary-page` body class and SCSS collapses the left sidebar (and any right TOC / timeline). It also calls `sidebarState.setForcedHidden(true)` when that method exists. If the sidebar is still visible, the layout CSS variables on this Discourse version may need a tweak.
- **`themePrefix` / `settings`.** These are injected into theme JavaScript by Discourse’s theme compiler. They are used for translations and settings.
- **Permissions.** Everyone who should see the dictionary must be able to read the data topic. If the topic is in a restricted category, those users will get a load error.
- **`max_post_length`.** If a site has lowered this below about 30,000 characters, regenerate the export with a smaller `--max-chars` so more posts are produced, then paste every part. If a part is missing, the page reports an incomplete word list.
- **CORS on `data_url`.** Only a concern if you use the URL fallback with a file on another origin (S3/CDN). Prefer `data_topic_id`.

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
