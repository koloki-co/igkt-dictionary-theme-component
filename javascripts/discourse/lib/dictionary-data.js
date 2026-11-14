/**
 * Load and parse the Knot Dictionary word list from a Discourse topic
 * or a URL. The theme does not bundle the word list.
 *
 * Topic format: one or more posts containing a fenced
 * ```igkt-dictionary
 * {"v":1,"part":1,"parts":2}
 * {"id":"...","category":"...","terms":{...}}
 * ```
 * block (JSONL). A raw JSON array is also accepted, including the
 * compact dictionary.json produced by tools/export_data.py, and a
 * legacy ordbok.json object list is normalised the same way.
 */

export const FORMAT_VERSION = 1;
export const FENCE_LANG = "igkt-dictionary";
export const LANGS = ["en", "sv", "de", "fi", "fr", "es"];
/** Closed data topics are a handful of posts. Replies beyond this are refused. */
export const MAX_TOPIC_POSTS = 30;
export const MAX_BODY_CHARS = 1_000_000;
export const FETCH_TIMEOUT_MS = 20_000;

const REMOVED_NOTE_RE = /\b(borttaget|borttagna|removed)\b/i;
const FENCE_RE = /```(?:([A-Za-z0-9_+-]+)\r?\n)?([\s\S]*?)```/g;

export class DictionaryLoadError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DictionaryLoadError";
    this.code = code;
  }
}

export function isRemovalNote(note) {
  return typeof note === "string" && REMOVED_NOTE_RE.test(note);
}

export function publicNotes(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }
  return notes.filter((n) => typeof n === "string" && n && !isRemovalNote(n));
}

function cleanSources(sources) {
  if (!sources || typeof sources !== "object" || Array.isArray(sources)) {
    return null;
  }
  const out = {};
  for (const [lang, langMap] of Object.entries(sources)) {
    if (!langMap || typeof langMap !== "object" || Array.isArray(langMap)) {
      continue;
    }
    const terms = {};
    for (const [term, ids] of Object.entries(langMap)) {
      if (!term || !Array.isArray(ids)) {
        continue;
      }
      const clean = ids.filter((id) => typeof id === "string" && id);
      if (clean.length) {
        terms[term] = clean;
      }
    }
    if (Object.keys(terms).length) {
      out[lang] = terms;
    }
  }
  return Object.keys(out).length ? out : null;
}

function assertFormatVersion(version) {
  if (version == null || version === "") {
    return;
  }
  if (Number(version) !== FORMAT_VERSION) {
    throw new DictionaryLoadError(
      "malformed",
      `This dictionary data uses format version ${version}. This page reads version ${FORMAT_VERSION}.`
    );
  }
}

export function normalizeEntry(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const sources = raw.sources && typeof raw.sources === "object" ? raw.sources : {};
  let terms = raw.terms;
  if (!terms || typeof terms !== "object") {
    terms = {};
    for (const lang of LANGS) {
      const langMap = sources[lang];
      if (langMap && typeof langMap === "object" && !Array.isArray(langMap)) {
        const keys = Object.keys(langMap).filter(Boolean);
        if (keys.length) {
          terms[lang] = keys;
        }
      } else if (typeof raw[lang] === "string" && raw[lang].trim()) {
        terms[lang] = raw[lang]
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      } else if (Array.isArray(raw[lang]) && raw[lang].length) {
        terms[lang] = raw[lang].filter(Boolean);
      }
    }
  }
  const cleanTerms = {};
  for (const [lang, val] of Object.entries(terms)) {
    if (Array.isArray(val) && val.length) {
      cleanTerms[lang] = val.slice();
    }
  }
  if (!Object.keys(cleanTerms).length) {
    return null;
  }
  const entry = {
    id: raw.id || "",
    category: raw.category || "term",
    terms: cleanTerms,
  };
  if (raw.wikidata) {
    entry.wikidata = raw.wikidata;
  }
  const notes = publicNotes(raw.notes);
  if (notes.length) {
    entry.notes = notes;
  }
  const cleanedSources = cleanSources(sources);
  if (cleanedSources) {
    entry.sources = cleanedSources;
  }
  return entry;
}

export function extractFencedBodies(text) {
  const bodies = [];
  if (!text) {
    return bodies;
  }
  const re = new RegExp(FENCE_RE.source, "g");
  let match;
  while ((match = re.exec(text))) {
    const lang = (match[1] || "").trim().toLowerCase();
    if (!lang || lang === FENCE_LANG || lang === "json" || lang === "jsonl") {
      bodies.push(match[2].trim());
    }
  }
  return bodies;
}

function parseJsonl(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("#"));
  if (!lines.length) {
    return null;
  }
  const objects = [];
  for (const line of lines) {
    try {
      objects.push(JSON.parse(line));
    } catch {
      return null;
    }
  }
  let header = null;
  let start = 0;
  if (
    objects[0] &&
    typeof objects[0] === "object" &&
    !Array.isArray(objects[0]) &&
    (objects[0].v != null || objects[0].part != null || objects[0].parts != null) &&
    !objects[0].id &&
    !objects[0].terms &&
    !objects[0].sources
  ) {
    header = objects[0];
    start = 1;
  }
  assertFormatVersion(header && header.v != null ? header.v : null);
  const entries = objects.slice(start);
  return {
    part: header && header.part != null ? Number(header.part) : null,
    parts: header && header.parts != null ? Number(header.parts) : null,
    version: header && header.v != null ? header.v : null,
    entries,
  };
}

function parseOnePayload(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return null;
  }
  // Prefer a fenced block when the text is a whole post (intro + fence).
  const bodies = extractFencedBodies(trimmed);
  if (bodies.length) {
    const parsed = bodies.map(parseOnePayload).filter(Boolean);
    if (!parsed.length) {
      return null;
    }
    if (parsed.length === 1) {
      return parsed[0];
    }
    return mergePartResults(parsed);
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed);
      if (Array.isArray(data)) {
        return { part: null, parts: null, entries: data };
      }
      if (data && Array.isArray(data.entries)) {
        assertFormatVersion(data.v);
        return {
          part: data.part != null ? Number(data.part) : null,
          parts: data.parts != null ? Number(data.parts) : null,
          version: data.v,
          entries: data.entries,
        };
      }
    } catch {
      // Fall through to JSONL (one object per line).
    }
  }
  return parseJsonl(trimmed);
}

/**
 * Parse a post body, a raw JSON array, or a JSONL fence into a part result.
 * Returns null when the text has no dictionary payload (for example a stray reply).
 */
export function parsePayload(text) {
  return parseOnePayload(text);
}

function mergePartResults(parts) {
  const entries = [];
  let part = null;
  let partsCount = null;
  for (const p of parts) {
    if (p.entries) {
      entries.push(...p.entries);
    }
    if (p.part != null) {
      part = p.part;
    }
    if (p.parts != null) {
      partsCount = p.parts;
    }
  }
  return { part, parts: partsCount, entries };
}

export function assembleParts(partResults) {
  const usable = (partResults || []).filter(
    (p) => p && Array.isArray(p.entries) && p.entries.length
  );
  if (!usable.length) {
    throw new DictionaryLoadError(
      "parse",
      "No dictionary data was found in the topic or URL. Check that the posts contain an igkt-dictionary code block."
    );
  }
  const numbered = usable.filter((p) => p.part != null && p.parts != null);
  if (numbered.length) {
    const expected = numbered[0].parts;
    const byPart = new Map();
    for (const p of numbered) {
      if (p.parts !== expected) {
        throw new DictionaryLoadError(
          "incomplete",
          `The data posts disagree about how many parts there are (${p.parts} vs ${expected}).`
        );
      }
      if (!byPart.has(p.part)) {
        byPart.set(p.part, p);
      } else {
        byPart.get(p.part).entries.push(...p.entries);
      }
    }
    const missing = [];
    for (let i = 1; i <= expected; i++) {
      if (!byPart.has(i)) {
        missing.push(i);
      }
    }
    if (missing.length) {
      throw new DictionaryLoadError(
        "incomplete",
        `The word list is missing part${missing.length > 1 ? "s" : ""} ${missing.join(", ")} of ${expected}. All ${expected} data posts must be readable.`
      );
    }
    const entries = [];
    for (let i = 1; i <= expected; i++) {
      entries.push(...byPart.get(i).entries);
    }
    // Also include any un-numbered payloads (for example a later full JSON paste).
    for (const p of usable) {
      if (p.part == null) {
        entries.push(...p.entries);
      }
    }
    return entries;
  }
  const entries = [];
  for (const p of usable) {
    entries.push(...p.entries);
  }
  return entries;
}

export function entriesFromPayloads(partResults) {
  const raw = assembleParts(partResults);
  const out = [];
  let skipped = 0;
  for (const item of raw) {
    const entry = normalizeEntry(item);
    if (entry) {
      out.push(entry);
    } else if (item && typeof item === "object") {
      skipped += 1;
    }
  }
  if (!out.length) {
    throw new DictionaryLoadError(
      "malformed",
      "The dictionary data did not contain any usable entries. Each record needs at least one term."
    );
  }
  if (skipped) {
    out.warnings = [
      skipped === 1
        ? "1 record was skipped because it had no usable terms."
        : `${skipped} records were skipped because they had no usable terms.`,
    ];
  }
  return out;
}

export function hasDictionaryFence(text) {
  return /```[ \t]*igkt-dictionary\b/i.test(text || "");
}

/**
 * Post numbers to read. Prefer the numbers Discourse lists when that list
 * covers the topic, so a deleted post number is a gap rather than a fetch.
 * Otherwise read 1..highest, which is what posts_count alone cannot express.
 */
export function postNumbersToFetch(topic) {
  const listed = [];
  const posts = topic && topic.post_stream && topic.post_stream.posts;
  if (Array.isArray(posts)) {
    for (const post of posts) {
      const n = Number(post && post.post_number);
      if (Number.isInteger(n) && n > 0) {
        listed.push(n);
      }
    }
  }
  const highest = Number(topic && topic.highest_post_number);
  const count = Number(topic && topic.posts_count) || 0;
  const listedMax = listed.reduce((max, n) => Math.max(max, n), 0);
  const last = Math.max(
    listedMax,
    Number.isInteger(highest) && highest > 0 ? highest : 0,
    count
  );
  if (!last) {
    return [];
  }
  const uniqueListed = [...new Set(listed)].sort((a, b) => a - b);
  if (uniqueListed.length && count && uniqueListed.length >= count && listedMax === last) {
    return uniqueListed;
  }
  if (last > MAX_TOPIC_POSTS) {
    throw new DictionaryLoadError(
      "incomplete",
      `The data topic has ${last} posts, and this page only reads ${MAX_TOPIC_POSTS}. Use a closed topic that contains the data posts and little else.`
    );
  }
  return Array.from({ length: last }, (_, i) => i + 1);
}

function httpError(status, kind) {
  if (status === 403 || status === 404) {
    return new DictionaryLoadError(
      "unavailable",
      kind === "topic"
        ? "The dictionary data topic could not be read (HTTP " +
            status +
            "). The topic must be visible to everyone who should see the dictionary, including anonymous visitors if the dictionary is public."
        : "The dictionary data URL could not be read (HTTP " +
            status +
            "). If it is a file on a CDN or S3, the origin must allow CORS from this forum."
    );
  }
  return new DictionaryLoadError(
    "unavailable",
    `The dictionary data could not be loaded (HTTP ${status}).`
  );
}

export async function loadFromTopic(topicId, { fetchJson, fetchText }) {
  const id = String(topicId == null ? "" : topicId).trim();
  if (!/^\d+$/.test(id)) {
    throw new DictionaryLoadError(
      "unconfigured",
      "data_topic_id must be a numeric topic id."
    );
  }
  let topic;
  try {
    topic = await fetchJson(`/t/${id}.json`);
  } catch (err) {
    if (err instanceof DictionaryLoadError) {
      throw err;
    }
    if (err && err.status) {
      throw httpError(err.status, "topic");
    }
    throw new DictionaryLoadError(
      "unavailable",
      "The dictionary data topic could not be read. The topic must be visible to everyone who should see the dictionary."
    );
  }
  const numbers = postNumbersToFetch(topic);
  if (!numbers.length) {
    throw new DictionaryLoadError(
      "parse",
      "The dictionary data topic has no posts."
    );
  }
  const results = [];
  for (const n of numbers) {
    try {
      const text = await fetchText(`/raw/${id}/${n}`);
      const parsed = parsePayload(text);
      if (parsed) {
        results.push(parsed);
      } else if (hasDictionaryFence(text)) {
        throw new DictionaryLoadError(
          "malformed",
          `Post ${n} contains an igkt-dictionary block that is not valid JSON or JSONL.`
        );
      }
    } catch (err) {
      if (err instanceof DictionaryLoadError) {
        throw err;
      }
      if (err && err.status === 404) {
        continue;
      }
      if (err && err.status) {
        throw httpError(err.status, "topic");
      }
      throw new DictionaryLoadError(
        "unavailable",
        "The dictionary data topic could not be read. The topic must be visible to everyone who should see the dictionary."
      );
    }
  }
  return entriesFromPayloads(results);
}

export async function loadFromUrl(url, { fetchText }) {
  const href = String(url == null ? "" : url).trim();
  if (!href) {
    throw new DictionaryLoadError("unconfigured", "data_url is empty.");
  }
  let text;
  try {
    text = await fetchText(href);
  } catch (err) {
    if (err instanceof DictionaryLoadError) {
      throw err;
    }
    if (err && err.status) {
      throw httpError(err.status, "url");
    }
    throw new DictionaryLoadError(
      "unavailable",
      "The dictionary data URL could not be read. If it is a file on a CDN or S3, the origin must allow CORS from this forum."
    );
  }
  const parsed = parsePayload(text);
  if (!parsed) {
    if (hasDictionaryFence(text)) {
      throw new DictionaryLoadError(
        "malformed",
        "The dictionary data URL contains an igkt-dictionary block that is not valid JSON or JSONL."
      );
    }
    throw new DictionaryLoadError(
      "parse",
      "The dictionary data URL did not contain a JSON array or an igkt-dictionary code block."
    );
  }
  return entriesFromPayloads([parsed]);
}

/**
 * Load entries from a topic and/or a URL. The topic is tried first when
 * both are set; the URL is the fallback.
 */
export async function loadDictionary({ topicId, url, fetchJson, fetchText }) {
  const hasTopic = String(topicId == null ? "" : topicId).trim() !== "";
  const hasUrl = String(url == null ? "" : url).trim() !== "";
  if (!hasTopic && !hasUrl) {
    throw new DictionaryLoadError(
      "unconfigured",
      "The Knot Dictionary has no data source yet. An administrator must set data_topic_id (preferred) or data_url in the theme component settings."
    );
  }
  let topicError = null;
  if (hasTopic) {
    try {
      return await loadFromTopic(topicId, { fetchJson, fetchText });
    } catch (err) {
      if (!hasUrl) {
        throw err;
      }
      topicError = err;
    }
  }
  try {
    return await loadFromUrl(url, { fetchText });
  } catch (err) {
    if (topicError) {
      throw new DictionaryLoadError(
        err.code || "unavailable",
        `Could not load the word list from the topic (${topicError.message}) or from the fallback URL (${err.message}).`
      );
    }
    throw err;
  }
}

/**
 * fetchJson / fetchText helpers for the browser (same-origin or CORS).
 * A non-OK response becomes an error with a .status property.
 */
function assertBodySize(text) {
  if (text && text.length > MAX_BODY_CHARS) {
    throw new DictionaryLoadError(
      "malformed",
      "The dictionary data response is too large to load in the browser."
    );
  }
}

async function fetchResponse(path, fetchImpl, timeoutMs) {
  const fetchFn = fetchImpl || fetch;
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs ?? FETCH_TIMEOUT_MS)
    : null;
  try {
    const options = { credentials: "same-origin" };
    if (controller) {
      options.signal = controller.signal;
    }
    return await fetchFn(path, options);
  } catch (err) {
    if (err instanceof DictionaryLoadError) {
      throw err;
    }
    if (err && (err.name === "AbortError" || err.name === "TimeoutError")) {
      throw new DictionaryLoadError(
        "unavailable",
        "The dictionary data request timed out. Try again, or ask an administrator to check the data topic."
      );
    }
    throw err;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function defaultFetchJson(path, fetchImpl, options = {}) {
  const res = await fetchResponse(path, fetchImpl, options.timeoutMs);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  assertBodySize(text);
  try {
    return JSON.parse(text);
  } catch {
    throw new DictionaryLoadError(
      "malformed",
      "The dictionary data topic response was not valid JSON."
    );
  }
}

export async function defaultFetchText(path, fetchImpl, options = {}) {
  const res = await fetchResponse(path, fetchImpl, options.timeoutMs);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  assertBodySize(text);
  return text;
}
