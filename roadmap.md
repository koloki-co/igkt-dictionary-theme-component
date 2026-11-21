# Roadmap

Code-only v2 development copy. Niclas approves public MIT code; the word list stays on the IGKT forum and must not enter this repository or its history. The maintainer authorised replacing the old history and force-pushing the clean tree, not deployment or a visibility change. Codes are stable.

- [~] **R1 - Durable dictionary navigation:** the theme owns the Ember route. The standalone Discourse Custom Route plugin and the theme passed local Discourse browser checks for direct loads, refresh, and in-app navigation. Verify on the target host and add compiler and browser CI.
- [~] **R2 - Editorial data and permissions:** the word list stays on the forum. Normalization and the exporter keep per-term `sources` ids when the payload has them. The footer credit remains the visitor-facing acknowledgement. Anonymous access to the real data topic is still a deployment check, and restricted exports stay out of Git.
- [x] **R3 - Search:** search folds œ/oe, æ/ae, ß/ss and the common ﬁ/ﬂ ligatures, covered by the invented-data tests.
- [~] **R4 - Accessible interaction:** note rows use a button with `aria-expanded` and `aria-controls`; letter and language toggles use `aria-pressed`. Narrow-screen language codes are text in the cell, and each term cell sets `lang`. Keyboard behaviour was checked in the local harness. Screen-reader, zoom, and light/dark checks on Discourse remain open.
- [x] **R5 - Footer trust:** `sources_note` is passed through an allowlist (`p`, `a`, `strong`, `em`, `br`; http(s) and same-site links) before `htmlSafe`. The setting stays admin-edited.
- [~] **R6 - Integration polish:** the dictionary compiles on the local Discourse checkout. Metadata points to Koloki; the local screenshot script only uses invented data. Test supported Discourse versions before advertising a minimum.
- [ ] **R7 - ABOK scope:** decide whether ABOK indexing is required and, if so, obtain a properly attributed mapping and add number lookup. The README describes a glossary and does not advertise an index.
- [~] **R8 - Trial layout obstruction:** the dictionary route uses `hideApplicationSidebar`, zeroes the sidebar column, and does not rename Discourse's grid areas or force a second column below the `md` breakpoint. The Powered by Discourse credit is not hidden. Desktop, mobile, sidebar state and navigation away still need a live Discourse check.
- [~] **R9 - Runtime data validation:** version, missing parts, gapped post numbers, broken fences, empty records, a 30-post cap, a 1,000,000-character cap and a 20-second timeout are covered with invented fixtures. A live topic with real (forum-side) data is still a deployment check.
- [x] **R10 - Reusable theme defaults:** titles, credits, displayed languages, labels and note prefixes are configurable. The component still accepts IGKT's original data fences. Local Chromium checks covered the imported IGKT topic and a separate invented Japanese, Brazilian Portuguese and Arabic example. See [IGKT setup](docs/igkt-setup.md) for the site-specific settings.

Evidence and limitations: [review.md](review.md).
