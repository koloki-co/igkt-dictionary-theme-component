// SPDX-FileCopyrightText: 2026 Niclas Andersson and contributors
// SPDX-License-Identifier: MIT

export function parseSourceCredits(value) {
  const credits = new Map();
  try {
    const records = JSON.parse(value);
    if (!records || typeof records !== "object" || Array.isArray(records)) {
      return credits;
    }
    for (const [id, record] of Object.entries(records)) {
      if (typeof record?.label !== "string" || !record.label.trim()) {
        continue;
      }
      let url;
      if (typeof record.url === "string" && /^https?:\/\//i.test(record.url)) {
        try {
          url = new URL(record.url).href;
        } catch {
          // Keep the credit label if the link is invalid.
        }
      }
      credits.set(id, { label: record.label.trim(), url });
    }
  } catch {
    // An empty or invalid setting leaves source IDs visible as plain text.
  }
  return credits;
}

export function termsWithCredits(entry, lang, registry) {
  const sources = entry.sources?.[lang];
  return (entry.terms[lang] ?? []).map((term) => ({
    term,
    credits: registry && sources && Object.hasOwn(sources, term)
      ? [...new Set(sources[term])].map((id) => registry.get(id) ?? { label: id })
      : [],
  }));
}
