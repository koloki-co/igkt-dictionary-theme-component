export const LANGUAGE_ORDER = ["en", "sv", "de", "fi", "fr", "es"];

export const LANGUAGE_NAMES = {
  en: "English",
  sv: "Svenska",
  de: "Deutsch",
  fi: "Suomi",
  fr: "Français",
  es: "Español",
};

export const LANGUAGE_LOCALES = {
  en: "en",
  sv: "sv",
  de: "de",
  fi: "fi",
  fr: "fr",
  es: "es",
};

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
 * Expands the ligatures above, then removes NFD accents.
 */
export function fold(s) {
  let text = s || "";
  for (const [pattern, replacement] of LIGATURE_FOLDS) {
    text = text.replace(pattern, replacement);
  }
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** DOM id for the notes region of one entry. */
export function notesElementId(id) {
  const safe = String(id || "entry").replace(/[^A-Za-z0-9_-]/g, "");
  return `igkt-dictionary-notes-${safe || "entry"}`;
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
 */
export function letterOf(entry, lang) {
  const first = firstTerm(entry, lang);
  const stripped = first.replace(/^[^\p{L}]+/u, "");
  const locale = LANGUAGE_LOCALES[lang] || lang;
  return stripped ? stripped.charAt(0).toLocaleUpperCase(locale) : "";
}

/** Term used for sorting: leading non-letters (digits, punctuation) stripped. */
export function sortTerm(entry, lang) {
  return firstTerm(entry, lang).replace(/^[^\p{L}]+/u, "") || firstTerm(entry, lang);
}

export function prepareEntries(entries) {
  return entries.map((entry) => {
    const parts = LANGUAGE_ORDER.map((lang) => termsOf(entry, lang).join(" | "));
    return Object.assign({}, entry, { _fold: fold(parts.join(" | ")) });
  });
}

export function categoryCounts(entries) {
  const counts = {};
  for (const entry of entries) {
    const cat = entry.category || "term";
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return Object.keys(counts)
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((id) => ({ id, count: counts[id] }));
}

export function defaultToLanguages(from) {
  const rest = LANGUAGE_ORDER.filter((lang) => lang !== from);
  return rest.length ? rest : [from === "en" ? "sv" : "en"];
}

/**
 * When the source language changes, drop it from the To columns and
 * keep the previous source language visible as a translation column.
 */
export function adjustToLanguages(previousFrom, nextFrom, currentTo) {
  let next = (currentTo || []).filter((lang) => lang !== nextFrom);
  if (previousFrom && previousFrom !== nextFrom && !next.includes(previousFrom)) {
    next = [...next, previousFrom];
  }
  next = LANGUAGE_ORDER.filter((lang) => next.includes(lang));
  return next.length ? next : defaultToLanguages(nextFrom);
}

/**
 * Filter, sort and group entries for the current UI state.
 * Sorting and the A–Z bar use the source-language locale, so when
 * From is Swedish the letters Å, Ä and Ö come after Z.
 */
export function filterAndSort({ entries, from, cat, query, letter }) {
  const q = fold((query || "").trim());
  const locale = LANGUAGE_LOCALES[from] || from;

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

  const missing = entries.filter((entry) => matchesFilters(entry, false)).length;

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
  let current = "";
  for (const entry of result.rows) {
    const c = letterOf(entry, from);
    if (showAnchors && c && c !== current) {
      current = c;
      items.push({ type: "anchor", letter: c });
    }
    items.push({ type: "entry", entry });
  }
  return Object.assign({}, result, { items, to, from });
}
