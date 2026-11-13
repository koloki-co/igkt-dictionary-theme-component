/**
 * Display names for source ids used in ordbok.json (`sources[lang][term]`).
 *
 * Keep this map as the single place that turns a source id into a label.
 * When Finnish terms from Virittäjä are added under the id `virittaja`,
 * they pick up the existing label automatically — no other code change.
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
  jeanb: "Jean Bernard de Runz (JeanB)",
  virittaja: "Virittäjä",
  niclas: "IGKT",
  egen: "IGKT",
};

export function sourceLabel(id) {
  return SOURCE_LABELS[id] || id;
}
