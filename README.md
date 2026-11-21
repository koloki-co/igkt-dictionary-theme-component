# Multilingual Dictionary for Discourse

A theme component that turns a Discourse topic into a searchable multilingual dictionary at `/dictionary`. You supply the word list; the component includes no dictionary data.

## 1. Prepare the data

**Discourse defaults to 32,000 characters per post.** Check `max_post_length` in **Admin → Settings** before preparing your data. The limit applies to the whole post, including the JSON header, code fence and any introductory text. Split a longer dictionary across posts rather than raising the forum-wide limit.

For a short list, prepare a single `dictionary` code block. Put the header on the first line inside the fence, then one JSON record per line. Give each entry a stable `id` and a `terms` object with language tags as keys and arrays of terms as values. `category` and `notes` are optional. Category names come from the entries, not Discourse categories.

````markdown
```dictionary
{"v":1,"part":1,"parts":1}
{"id":"example-1","category":"Illustration","terms":{"ja":["星"],"en":["star"],"pt-BR":["estrela"]}}
```
````

For a longer list, save your entries as a JSON array in `entries.json`. From a checkout of this repository, run:

```sh
python3 tools/export_data.py entries.json --outdir .private/forum-data
```

The exporter budgets **30,000 characters per post**, including its own wrapper. If your site has a lower limit, add `--max-chars` with a value below that limit (for example, `--max-chars 18000` on a site capped at 20,000). Leave room for any text you add after exporting.

1. Pick a category that everyone who should see the dictionary can read. If the dictionary is public, that includes signed-out visitors.
2. Start a new topic. Paste your single code block or the full contents of `post-1.md` into the first post. If the exporter made more files, paste each remaining `post-N.md` as a separate reply in order. If you split the data by hand, number the parts from 1 and put the same total in every header. Four posts means `part` runs from 1 to 4 and `parts` is 4 in every post.
3. Keep the topic for data only. The component reads at most **30 topic posts**, including ordinary replies it has to check, and rejects a header that declares more than 30 parts. Close the topic to ordinary replies and check who can edit each data post, especially if you make it a wiki.
4. Copy the topic ID from its URL. For `/t/my-dictionary-data/123`, the ID is `123`.

The old `igkt-dictionary` fence still works. If the data won't fit in one topic, host the exported `dictionary.json` at a URL your visitors can read. Set `data_url` to that URL and leave `data_topic_id` blank. Prefer a same-origin URL; a different origin must allow browser requests from your forum. The loader rejects responses over 1,000,000 characters and times out after 20 seconds per request, including the body read. Publish only the notes and entries you intend readers to see.

## 2. Install the theme component

1. In Discourse admin, open the **Themes and components** area. Install a theme component **From a git repository** using `https://github.com/koloki-co/igkt-dictionary-theme-component`.
2. Attach **Multilingual Dictionary** to the theme your visitors use. In the component settings, set `data_topic_id` to the number you copied (or use `data_url` as described above). Add any required credits to `sources_note`.
3. Open the dictionary from the book icon in the header. Try a search and check the credits. On the dictionary page, the icon becomes a **Back to forum** arrow.

## 3. Make direct visits work

Follow the [Discourse Custom Route installation instructions](https://github.com/koloki-co/discourse-custom-route#install-and-configure). In **Admin → Settings**, add `/dictionary` to **Custom route paths** and turn on **Custom route enabled**. The component's Ember route is fixed at `/dictionary`; the plugin setting does not rename it. If your host doesn't allow custom plugins, ask whether it can provide the server route.

Open `/dictionary` in a new tab and refresh. If the dictionary is public, repeat the check signed out. If the page opens from the book icon but a fresh tab shows a 404, check the server route. If the page opens but can't load the data, check the topic ID, post permissions and part headers.

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
