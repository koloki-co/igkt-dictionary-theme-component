export function dictionaryLanguages(entries, order = "", labels = "") {
  const available = new Set(entries.flatMap((entry) => Object.keys(entry.terms)));
  const codes = [
    ...new Set(order.split(/[\s,|]+/).filter((code) => available.has(code))),
  ];
  if (!codes.length) {
    if (order.trim()) {
      throw new Error("None of the languages in language_order were found in the dictionary data.");
    }
    codes.push(...available);
  }
  const overrides = new Map();
  for (const item of labels.split("|")) {
    const separator = item.indexOf("=");
    if (separator > 0) {
      const label = item.slice(separator + 1).trim();
      if (label) {
        overrides.set(item.slice(0, separator).trim(), label);
      }
    }
  }
  const names = Object.fromEntries(
    codes.map((code) => {
      const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
      return [code, overrides.get(code) || name];
    })
  );
  return { codes, names };
}

const LIGATURE_FOLDS = [
  [/œ/g, "oe"],
  [/Œ/g, "oe"],
  [/æ/g, "ae"],
  [/Æ/g, "ae"],
  [/ß/g, "ss"],
  [/ﬀ/g, "ff"],
  [/ﬁ/g, "fi"],
  [/ﬂ/g, "fl"],
  [/ﬃ/g, "ffi"],
  [/ﬄ/g, "ffl"],
];

/**
 * Accent-insensitive, case-insensitive fold used for search.
 * Expands the ligatures above, folds ø/Ø to o (the stroke does not
 * decompose), then removes NFD accents.
 */
export function fold(s) {
  let text = s || "";
  for (const [pattern, replacement] of LIGATURE_FOLDS) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(/[øØ]/g, "o");
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * DOM id for the notes region of one row.
 * occurrence is 0 for the first use of an id. A later copy gets its own id
 * so two rows do not share one notes toggle.
 */
export function notesElementId(id, occurrence = 0) {
  const safe = String(id || "entry").replace(/[^A-Za-z0-9_-]/g, "");
  const base = `igkt-dictionary-notes-${safe || "entry"}`;
  const n = Number(occurrence);
  if (!Number.isInteger(n) || n <= 0) {
    return base;
  }
  return `${base}-dup-${n}`;
}

/**
 * A row click toggles notes unless it lands on a button or link,
 * or the visitor is selecting a term to copy it.
 */
export function rowClickTogglesNotes(event) {
  const target = event && event.target;
  if (
    target &&
    typeof target.closest === "function" &&
    target.closest("button, a")
  ) {
    return false;
  }
  if (typeof getSelection === "function") {
    const selection = getSelection();
    if (selection && selection.isCollapsed === false) {
      return false;
    }
  }
  return true;
}

export function termsOf(entry, lang) {
  const terms = entry?.terms?.[lang];
  return Array.isArray(terms) ? terms : [];
}

export function firstTerm(entry, lang) {
  return termsOf(entry, lang)[0] || "";
}

export function hasTerms(entry, lang) {
  return termsOf(entry, lang).length > 0;
}

export function formatTerms(entry, lang) {
  return termsOf(entry, lang).join(", ");
}

/**
 * First letter of the first term in the source language.
 * Leading non-letters (quotes, punctuation) are skipped.
 * Uses the language locale so Swedish å/ä/ö become Å/Ä/Ö.
 * Locale uppercasing can expand one letter (German ß becomes SS);
 * the letter bar keeps the first character only.
 */
export function letterOf(entry, lang) {
  const first = firstTerm(entry, lang).normalize("NFC");
  const stripped = first.replace(/^[^\p{L}]+/u, "");
  const firstLetter = [...stripped][0];
  return firstLetter ? [...firstLetter.toLocaleUpperCase(lang)][0] : "";
}

/** Term used for sorting: leading non-letters (digits, punctuation) stripped. */
export function sortTerm(entry, lang) {
  return firstTerm(entry, lang).replace(/^[^\p{L}]+/u, "") || firstTerm(entry, lang);
}

export function prepareEntries(entries, languages) {
  const seen = new Map();
  const used = new Set();
  return entries.map((entry) => {
    const parts = (languages ?? Object.keys(entry.terms)).map((lang) =>
      termsOf(entry, lang).join(" | ")
    );
    const id = entry && entry.id;
    let occurrence = seen.get(id) || 0;
    seen.set(id, occurrence + 1);
    let notesId = notesElementId(id, occurrence);
    while (used.has(notesId)) {
      occurrence += 1;
      notesId = notesElementId(id, occurrence);
    }
    used.add(notesId);
    return Object.assign({}, entry, {
      _fold: fold(parts.join(" | ")),
      _notesId: notesId,
    });
  });
}

export function categoryCounts(entries) {
  const counts = Object.create(null);
  for (const entry of entries) {
    const cat = entry.category || "term";
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return Object.keys(counts)
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((id) => ({ id, count: counts[id] }));
}

export function defaultToLanguages(from, languages) {
  return languages.filter((lang) => lang !== from);
}

/**
 * When the source language changes, drop it from the To columns and
 * keep the previous source language visible as a translation column.
 */
export function adjustToLanguages(previousFrom, nextFrom, currentTo, languages) {
  let next = (currentTo || []).filter((lang) => lang !== nextFrom);
  if (previousFrom && previousFrom !== nextFrom && !next.includes(previousFrom)) {
    next = [...next, previousFrom];
  }
  next = languages.filter((lang) => next.includes(lang));
  return next.length ? next : defaultToLanguages(nextFrom, languages);
}

/**
 * Filter, sort and group entries for the current UI state.
 * Sorting and the A–Z bar use the source-language locale, so when
 * From is Swedish the letters Å, Ä and Ö come after Z.
 * `missing` counts entries with no source-language term that still
 * match the category, search and letter filters.
 */
export function filterAndSort({ entries, from, cat, query, letter }) {
  const q = fold((query || "").trim());
  const locale = from;

  const matchesFilters = (entry, requireSourceTerm) => {
    if (requireSourceTerm && !hasTerms(entry, from)) {
      return false;
    }
    if (!requireSourceTerm && hasTerms(entry, from)) {
      return false;
    }
    if (cat && entry.category !== cat) {
      return false;
    }
    if (q && !entry._fold.includes(q)) {
      return false;
    }
    return true;
  };

  const base = entries
    .filter((entry) => matchesFilters(entry, true))
    .slice()
    .sort((a, b) => {
      // Sort by letter first so A–Z (and Å Ä Ö) groups stay contiguous,
      // even when a term starts with a digit or parenthesis.
      const letterCmp = letterOf(a, from).localeCompare(letterOf(b, from), locale);
      if (letterCmp !== 0) {
        return letterCmp;
      }
      return sortTerm(a, from).localeCompare(sortTerm(b, from), locale, {
        sensitivity: "base",
      });
    });

  const letters = [];
  for (const entry of base) {
    const c = letterOf(entry, from);
    if (c && !letters.includes(c)) {
      letters.push(c);
    }
  }
  letters.sort((a, b) => a.localeCompare(b, locale));

  const activeLetter = letter && letters.includes(letter) ? letter : "";
  const rows = activeLetter
    ? base.filter((entry) => letterOf(entry, from) === activeLetter)
    : base;

  // No source-language term means no letter, so a selected letter excludes them.
  const missing = entries.filter((entry) => {
    if (!matchesFilters(entry, false)) {
      return false;
    }
    return !activeLetter || letterOf(entry, from) === activeLetter;
  }).length;

  return {
    rows,
    letters,
    letter: activeLetter,
    missing,
    matchedWithSource: base.length,
  };
}

/**
 * Build the visible table model, including letter-anchor rows when
 * neither a letter nor a search query is active.
 */
export function buildTableModel({ entries, from, to, cat, query, letter }) {
  const result = filterAndSort({ entries, from, cat, query, letter });
  const showAnchors = !result.letter && !fold((query || "").trim());
  const items = [];
  const usedKeys = new Set();
  // The same entry must keep the same key when the model is rebuilt, so the
  // table can reuse that row. A repeated id still gets its own row.
  const claimKey = (base) => {
    let key = base;
    let n = 2;
    while (usedKeys.has(key)) {
      key = `${base}#${n}`;
      n += 1;
    }
    usedKeys.add(key);
    return key;
  };
  let current = "";
  for (const entry of result.rows) {
    const c = letterOf(entry, from);
    if (showAnchors && c && c !== current) {
      current = c;
      items.push({ type: "anchor", letter: c, rowKey: claimKey(`anchor:${c}`) });
    }
    const id = entry && entry.id ? String(entry.id) : "";
    items.push({
      type: "entry",
      entry,
      rowKey: claimKey(id ? `entry:${id}` : "entry"),
    });
  }
  return Object.assign({}, result, { items, to, from });
}
