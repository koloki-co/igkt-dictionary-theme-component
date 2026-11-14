# Roadmap

Code-only v2 development copy. Niclas approves public MIT code; the word list stays on the IGKT forum and must not enter this repository or its history. The maintainer authorised replacing the old history and force-pushing the clean tree, not deployment or a visibility change. Codes are stable.

- [~] **R1 - Durable dictionary navigation:** the theme keeps the Ember route and `plugins/igkt-dictionary-route` serves `default/empty` for `GET /dictionary`. Still to test on an isolated Discourse: client navigation, direct load, refresh, login, Back/Forward, and a theme without the component. Compiler and browser CI remain open.
- [~] **R2 - Editorial data and permissions:** the word list stays on the forum. Normalization and the exporter keep per-term `sources` ids when the payload has them. The footer credit remains the visitor-facing acknowledgement. Anonymous access to the real data topic is still a deployment check, and restricted exports stay out of Git.
- [x] **R3 - Search:** search folds œ/oe, æ/ae, ß/ss and the common ﬁ/ﬂ ligatures, covered by the invented-data tests.
- [~] **R4 - Accessible interaction:** note rows use a button with `aria-expanded` and `aria-controls`; letter and language toggles use `aria-pressed`. Keyboard behaviour was checked in the local harness. Screen-reader, zoom, and light/dark checks on Discourse remain open.
- [x] **R5 - Footer trust:** `sources_note` is passed through an allowlist (`p`, `a`, `strong`, `em`, `br`; http(s) and same-site links) before `htmlSafe`. The setting stays admin-edited.
- [~] **R6 - Integration polish:** `header_link_title`, `page_title` and `page_subtitle` are wired. Metadata URLs point at the Seaserpent fork until Marcus republishes. Screenshot tooling is still the supplied script. Discourse compile checks remain outstanding.
- [ ] **R7 - ABOK scope:** decide whether ABOK indexing is required and, if so, obtain a properly attributed mapping and add number lookup. The README describes a glossary and does not advertise an index.
- [~] **R8 - Trial layout obstruction:** the dictionary route uses `hideApplicationSidebar` and a dictionary-only column collapse. The Powered by Discourse credit is not hidden. Desktop, mobile, sidebar state and navigation away still need a live Discourse check.
- [~] **R9 - Runtime data validation:** version, missing parts, gapped post numbers, broken fences, empty records, a 30-post cap, a 1,000,000-character cap and a 20-second timeout are covered with invented fixtures. A live topic with real (forum-side) data is still a deployment check.

Evidence and limitations: [review.md](review.md).
