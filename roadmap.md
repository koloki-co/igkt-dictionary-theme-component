# Roadmap

Code-only v2 development copy. Niclas approves public MIT code; the word list stays on the IGKT forum and must not enter this repository or its history. The maintainer authorised replacing the old history and force-pushing the clean tree, not deployment or a visibility change. Codes are stable.

- [ ] **R1 - Durable dictionary navigation:** choose the hosting/route approach and test client navigation, direct loads, refresh, login, Back/Forward and themes without the component. Add compiler and browser CI before release.
- [~] **R2 - Editorial data and permissions:** v2 separates the code from the forum-hosted word list and accepts normalized export input. Keep restricted data and exports out of Git/history, retain per-term provenance, and verify forum publication/attribution conditions and anonymous access before deployment.
- [ ] **R3 - Search:** implement and test promised ligature folding, notably `œ`/`oe`.
- [ ] **R4 - Accessible interaction:** keyboard-operable note expansion, correct semantics, mobile/zoom/light/dark and screen-reader checks.
- [ ] **R5 - Footer trust:** sanitize or structure source attribution HTML and retain admin-only control.
- [~] **R6 - Integration polish:** v2 metadata now points to this repository. Wire the header title setting, verify sidebar behaviour and make screenshot tooling portable. Local tests now use invented data without private file dependencies; Discourse compile/browser checks remain outstanding.
- [ ] **R7 - ABOK scope:** decide whether ABOK indexing is required and, if so, obtain a properly attributed mapping and add number lookup rather than implying it already exists.
- [ ] **R8 - Trial layout obstruction:** inspect the sidebar-width overlay containing "Powered by Discourse" reported in Marcus's screenshot; fix dictionary-scoped sidebar/footer layout without globally hiding credits or breaking navigation elsewhere. Verify desktop/mobile, sidebar states and navigation away.
- [ ] **R9 - Runtime data validation:** validate record and multipart schemas/version, handle deleted/gapped topic posts, reject invalid/incomplete data clearly, bound fetch sizes/counts/timeouts, and align accepted formats with the README. Test with invented fixtures.

Evidence and limitations: [review.md](review.md).
