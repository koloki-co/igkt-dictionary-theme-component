# Updating the dictionary

For a bulk update, make a new topic and switch the theme setting when it is ready. Editing several live posts in place can show readers a mixture of the old and new dictionary.

1. Write down the current `data_topic_id` and `data_url`. Export into a fresh directory and use the files listed in `manifest.json`.
2. Create a new data topic with the same reader and editor permissions as the old one. Paste one part per post. Check the numbering, permissions and credits before you switch. If the topic is public, open it signed out and check that all parts are visible.
3. If you have a staging forum, load the new data there first using a copy you have permission to make. On the live theme component, switch `data_topic_id` in one edit. Check search, record count and attribution in `/dictionary` as an intended reader.
4. If something is wrong, restore the old topic ID and fallback URL. Keep the old topic readable until the new one is confirmed. Don't leave an old `data_url` as a fallback unless serving the old dictionary on error is intentional.

For a URL-based dictionary, upload the new file to a new URL, check it, then switch `data_url`. Keep the previous file for rollback.

## Credits for individual terms

Use `sources_note` for the overall credits and licence terms. If readers need to see which source a term came from, include the IDs in the entry, keyed by language and the exact spelling of the term:

```json
{"id":"demo-1","terms":{"en":["star"],"ar":["نجمة"]},"sources":{"en":{"star":["catalogue"]}}}
```

Turn on `show_term_sources`. In `source_credits`, give the IDs readable labels and, where appropriate, links:

```json
{"catalogue":{"label":"Example illustration catalogue (CC BY 4.0)","url":"https://example.com/catalogue"}}
```

An ID without a matching label is shown as written. Use the label to include any author or licence the source requires. Before publishing, check the actual source terms: a footer or a link by itself may not meet their requirements.
