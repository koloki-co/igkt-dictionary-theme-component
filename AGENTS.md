# Agent instructions

## Read first

Read `review.md`, `roadmap.md`, then `README.md`. Apply the relevant [house-style standards](https://github.com/pacharanero/house-style/blob/main/AGENTS.md).

## Invariants

- The root commit imports the code-only v2 ZIP with documented privacy/test adjustments. Retain its MIT licence and Niclas's attribution; Koloki hosting does not transfer ownership of the code or dictionary sources.
- Niclas approves public distribution of the code under MIT, not the real word list. Ezelius and Virittäjä permissions cover forum use only. Never commit actual entries, editorial sources, forum-data exports or data-bearing captures, even if they are anonymously readable. Use explicitly invented examples for tests.
- The maintainer explicitly authorised the one-time clean-history replacement and force-push for v2. Never merge the old bundled-data commits back, push recovery refs, or add a data-bearing archive. Future history rewrites still need approval.
- The first ZIP had a reported trial installation on IGKT; v2 is not live-tested. Do not deploy, attach to other themes, edit wiki topics, change server routing or change repository visibility without explicit approval.
- Data is fetched at runtime from the configured forum topic/URL. This is not a mechanism for protecting confidential editorial notes. Keep local inputs/exports in `.private/`; do not recreate bundled `assets/ordbok.json` or `ordbok-data.js`.
- Do not commit forum thread exports, correspondence drafts, credentials, or browser captures. Record minimal provenance links instead. Retain useful private drafts and review records only under the root gitignored `.private/`; never include it in shared archives. A fresh clone must remain usable without those local files.

## Validation and Git workflow

Run `node --test tests/*.test.mjs`, `node harness/test.mjs` and `git diff --check` before commits. Tests require Node.js and Python 3 and use invented data only. They are not a Discourse compiler, browser, accessibility, or deployment test. Full integration testing on an isolated current Discourse instance is a release gate.

Commit coherent validated changes. The maintainer authorised the v2 root commit and force-push to `main`; subsequent pushes require a user request. Deployment and repository visibility changes require separate approval. Roadmap codes are stable and must not be renumbered. This imported theme has no Cargo project, package manager dependencies, or release pipeline: Rust checks, dependency automation, and production branch protection are deferred until relevant; full theme CI remains a roadmap item.
