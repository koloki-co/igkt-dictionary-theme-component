/**
 * Editor reference: display names for source ids in ordbok.json
 * (`sources[lang][term]`).
 *
 * The dictionary page does not import this file. Visitors see the footer
 * credit from the sources_note setting, not a label looked up here.
 * Keep this list aligned with the table in README.md.
 *
 * `niclas` and `egen` are IGKT's own additions (not a published source).
 */
export const SOURCE_LABELS = {
  wikidata: "Wikidata",
  "wiktionary-en": "Wiktionary",
  "fi.wikipedia": "Finnish Wikipedia",
  ohrvall: "Öhrvall (1916)",
  ezelius: "Ezelius",
  witcomb1883: "Witcomb (1883)",
  svensson1941: "Svensson (1941)",
  jeanb: "Jean Bernard de Runz (JeanB)",
  virittaja: "Virittäjä",
  niclas: "IGKT",
  egen: "IGKT",
};

export function sourceLabel(id) {
  return SOURCE_LABELS[id] || id;
}
