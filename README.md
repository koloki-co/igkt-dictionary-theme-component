# Multilingual Dictionary for Discourse

A theme component that turns a Discourse topic into a searchable multilingual dictionary at `/dictionary`. You supply the word list; the component includes no dictionary data.

## Install

1. In Discourse admin, install this repository as a theme component from `https://github.com/koloki-co/igkt-dictionary-theme-component` and attach it to the theme your visitors use.
2. Create a topic with the entries in a `dictionary` code block (see below). Set `data_topic_id` in the component settings. Visitors need permission to read the topic and its data posts.
3. Open the dictionary from the book icon in the header. On the dictionary page the icon becomes a **Back to forum** arrow.

For bookmarks, refreshes and direct visits, install [Discourse Custom Route](https://github.com/koloki-co/discourse-custom-route) separately. In **Admin → Settings**, add `/dictionary` to `custom_route_paths` and turn on `custom_route_enabled`. The component's Ember route is fixed at `/dictionary`; the plugin setting does not rename it. A host that doesn't allow custom plugins must supply the server route separately.

## Data format

Use one JSON record per line. Give each entry a stable `id` and a `terms` object with language tags as keys and arrays of terms as values. `category` and `notes` are optional. Category names come from the entries, not Discourse categories.

````markdown
```dictionary
{"v":1,"part":1,"parts":1}
{"id":"example-1","category":"Illustration","terms":{"ja":["星"],"en":["star"],"pt-BR":["estrela"]}}
```
````

For a larger list, split the data across consecutive posts, number the parts from 1 and use the same total in every header. The exporter reads a JSON array and writes paste-ready `post-N.md` files and a `dictionary.json` file:

```sh
python3 tools/export_data.py entries.json --outdir .private/forum-data
```

The old `igkt-dictionary` fence still works. An optional `data_url` can serve a JSON array or dictionary document instead. Keep the data topic closed to ordinary replies and limit editing to the people responsible for the dictionary. Publish only the content you intend readers to see, including notes.

## Theme component settings

| Setting | Purpose |
| --- | --- |
| `data_topic_id` | Topic containing the data. |
| `data_url` | Optional fallback if the topic is unset or cannot be loaded. Prefer a same-origin URL. |
| `page_title`, `page_subtitle` | Title and subtitle. Defaults to “Dictionary” with no subtitle. |
| `language_order` | Language tags to display, in order, such as `ja, en, pt-BR`. Blank uses the languages in the data. Use the same spelling and case as the data. |
| `language_labels` | Overrides for the built-in language names, such as `ja=日本語\|en=English`. |
| `default_from_language` | Initial source language. Blank uses the first displayed language. |
| `sources_note` | Footer for source credits and licence terms. Blank by default. Supports links and limited formatting. |
| `hidden_note_prefixes` | Optional case-insensitive note prefixes separated by a pipe (`\|`). This only hides matching notes in the dictionary display. It doesn't remove them from the data topic. |
| `show_header_link`, `header_link_title` | Show the header control and set its opening label. |

## Development

```sh
node --test tests/*.test.mjs
node harness/test.mjs
node harness/serve.mjs
```

Tests and the loopback preview use invented data by default. Do not add real word lists or data-bearing screenshots to Git. See [the roadmap](roadmap.md) for integration checks and [IGKT setup](docs/igkt-setup.md) for the original deployment's settings.

## Licence

Code: [MIT](LICENSE), Niclas Andersson and contributors. New documentation: CC BY-SA 4.0. Dictionaries loaded by the component retain their own terms.
