# IGKT dictionary v2 review

Scope: code-only v2 archive and local invented-data checks. This is not approval for production deployment or evidence of a Discourse compile or rendered accessibility test.

## Provenance and distribution boundary

Niclas / Seaserpent supplied `igkt-dictionary-theme-component-v2.zip` in [topic 10321](https://discourse.igkt.net/t/10321), following the design discussion in [topic 10292](https://discourse.igkt.net/t/10292/2). Archive SHA-256: `5f5bcdf9ea861d43743fa36bc5fb7da2d69b0ebf2059c305aa8009feb73fc8c2`. Extraction checked paths, symlinks, duplicate names, size limits and CRCs. The supplied v2 MIT licence and author attribution are retained.

The author approves public distribution of the code under MIT. **The actual word list is not licensed for redistribution in this repository.** Ezelius and Virittäjä permissions cover use on the IGKT forum, not free release of their words. A publicly readable forum topic is not permission to copy its contents into Git, test fixtures, screenshots or release archives.

The first import bundled that word list. At the maintainer's explicit request, this code-only tree is the root of a replacement history, not a descendant of that import. Recovery material and source ZIPs are local-only under the ignored `.private/`. Never push a recovery branch/tag or merge old history back into this repository. Existing collaborators should re-clone rather than merge old checkouts. Replacing branch history does not guarantee deletion of cached or otherwise retained objects by the hosting provider.

## What v2 changes

The component now fetches a configured topic (`data_topic_id`) through same-origin `/t/{id}.json` and `/raw/{id}/{post_number}` requests. It parses multipart fenced JSONL and also accepts JSON arrays. An optional `data_url` is tried when topic loading fails. No data source is configured by default. Loading, missing configuration and failure states are shown in the UI. This does not add the server-side `/dictionary` route.

The only bundled entries are explicitly invented examples in `sample-data.js`; the production component does not import them. The exporter accepts both normalized `terms` and editorial `sources` input, unlike the removed v1 build script. The restricted word list and old data-dependent tests are not part of this tree.

## Import adjustments

- Replaced the supplied harness tests' real-word-list assertions and machine-specific private input requirements with invented fixtures, including an exporter-to-HTTP-loader round trip.
- Preserved stronger ignore rules for `.private/`, secrets, generated forum data, archives and captures. README export examples write into `.private/`.
- Blocked hidden/private and out-of-root static paths in the local preview server. External forum exports now require explicit `IGKT_FORUM_DATA` configuration; the server binds to loopback. Do not expose this development server to the network.
- Retained the supplied production loader/UI without claiming their integration defects have been fixed.

## Remaining findings

- **R1 - Durable navigation:** a theme-only client route does not establish a working server entry point. Direct visits, bookmarks and refresh still need a tested hosting/plugin solution. The README's Rails example and alternate route-map location are not validated fixes.
- **R2 - Editorial data and permissions:** keep the word list forum-side and all local exports ignored. Neither normalization path preserves per-term source IDs in its output, and general footer credits do not establish full attribution compliance. Review editorial-note publication and wiki edit permissions separately. Test anonymous access to the eventual data topic without copying it into the repo.
- **R3 - Search:** the search fold still uses NFD accent removal without explicit ligature expansion. Tests characterize this, rather than claiming it is fixed.
- **R4 - Accessibility:** expandable notes still rely on clickable table rows without a focusable button, keyboard handling or expansion relationships. Verify labels, table semantics, selected-letter announcements, contrast, zoom and responsive states in a real browser.
- **R5 - Footer trust:** the admin `sources_note` setting is still passed to `htmlSafe`. This is a trusted HTML boundary, not ordinary escaped text.
- **R6 - Integration polish:** the header title setting is still not wired to the rendered tooltip, and the optional sidebar API remains unverified against the target Discourse version. Metadata URLs now point to this repository. The supplied screenshot script still depends on an unavailable machine-specific Puppeteer installation; no browser test is claimed.
- **R7 - ABOK scope:** no ABOK-number mapping or lookup has been added. Describe this as a glossary.
- **R8 - Trial layout:** the earlier v1 trial reported a sidebar-width obstruction. It has not been independently reproduced or shown fixed by v2; preserve scoped layout and forum credits when investigating.
- **R9 - Runtime data validation:** the loader accepts more formats than the README's fence-only description suggests, does not enforce format versions or strict record/part schemas, can silently omit invalid entries, and lacks response-size, post-count and timeout bounds. Deleted/gapped post numbers need explicit testing; `posts_count` is not a reliable last post number. Review these before relying on editable topic data in production.

## Validation

Run `node --test tests/*.test.mjs`, `node harness/test.mjs` and `git diff --check`. Tests use invented examples only and cover search/filter characterization, normalization, missing parts, load errors, URL fallback, Python export, HTTP topic/URL loading and preview-server privacy boundaries. They require Node.js and Python 3, not the real word list or external package dependencies.

No live Discourse install, forum/wiki edit, theme setting change, server routing change or repository visibility change is part of this import. Full integration testing on an isolated current Discourse instance remains a release gate.
