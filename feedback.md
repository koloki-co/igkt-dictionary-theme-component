# Contributor implementation notes

Work from the code-only v2 tree and read [review.md](review.md) and [roadmap.md](roadmap.md) first. Preserve Niclas's MIT code and source credits. Do not merge the old bundled-data history, retrieve the real word list for committed fixtures, or deploy/change forum settings without approval.

1. **R1/R8:** agree a durable route strategy and reproduce the reported layout obstruction on an isolated Discourse instance. Do not assume that changing a route-map filename or hiding the Discourse credit fixes either issue.
2. **R2/R9:** keep data on the forum, retain provenance, validate multipart headers and entry schemas, reject incomplete/invalid payloads clearly, and bound runtime fetches. Exercise these paths using invented fixtures only.
3. **R3/R4:** implement explicit supported ligature folding and keyboard-operable note expansion, with regression coverage and rendered accessibility checks.
4. **R5/R6:** structure or sanitize footer attribution HTML, wire the title setting, verify the supported sidebar API and replace machine-specific screenshot tooling if needed.
5. **R7:** do not invent ABOK mappings or advertise indexing that does not exist.

Report what was actually tested. A standalone harness is not evidence that Discourse compiles the theme, serves direct `/dictionary` requests or renders accessible controls.
