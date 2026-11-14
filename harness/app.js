import SAMPLE_ENTRIES, { SAMPLE_NOTICE } from "../javascripts/discourse/lib/sample-data.js";
import {
  LANGUAGE_NAMES,
  LANGUAGE_ORDER,
  adjustToLanguages,
  buildTableModel,
  categoryCounts,
  defaultToLanguages,
  firstTerm,
  formatTerms,
  notesElementId,
  prepareEntries,
} from "../javascripts/discourse/lib/dictionary-logic.js";
import {
  defaultFetchJson,
  defaultFetchText,
  loadDictionary,
} from "../javascripts/discourse/lib/dictionary-data.js";
import { sanitizeSourcesHtml } from "../javascripts/discourse/lib/sources-html.js";

const SOURCES_NOTE = `
  <p><strong>Sources.</strong>
  <a href="https://www.wikidata.org/" rel="noopener">Wikidata</a> (CC0);
  <a href="https://en.wiktionary.org/" rel="noopener">Wiktionary</a> (CC BY-SA, with attribution);
  <a href="https://fi.wikipedia.org/" rel="noopener">Finnish Wikipedia</a> (CC BY-SA, with attribution);
  Hjalmar Öhrvall, <em>Om knutar</em> (1916);
  J. Ezelius, “Knopnamn på olika språk” (used with permission for the IGKT forum);
  Witcomb (1883);
  French review by Jean Bernard de Runz (JeanB);
  Virittäjä (used with permission for the IGKT forum).</p>
  <p>No machine translation is used. Corrections and additions are welcome in the IGKT forum.</p>
`;

const state = {
  from: "en",
  to: defaultToLanguages("en"),
  cat: "",
  q: "",
  letter: "",
  openIds: {},
};

let entries = [];
let prepared = [];
let categories = [];
let banner = "";
let loadWarning = "";
let loadState = "loading";
let loadError = "";

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[c]);
}

function dashOrTerms(entry, lang) {
  if (!firstTerm(entry, lang)) {
    return '<span class="igkt-dictionary__dash">–</span>';
  }
  return esc(formatTerms(entry, lang));
}

function render() {
  const root = document.getElementById("root");
  if (loadState === "loading") {
    root.innerHTML = `
      <div class="igkt-dictionary" id="igkt-dictionary-root">
        <header class="igkt-dictionary__header">
          <h1 id="igkt-dictionary-title">IGKT Multilingual Knot Dictionary</h1>
          <p>Knots, ropework terms and tools in English, Swedish, German, Finnish, French and Spanish. Beta, manually curated.</p>
        </header>
        <p class="igkt-dictionary__status" role="status">Loading the dictionary…</p>
      </div>`;
    return;
  }
  if (loadState === "unconfigured" || loadState === "error") {
    root.innerHTML = `
      <div class="igkt-dictionary" id="igkt-dictionary-root">
        <header class="igkt-dictionary__header">
          <h1 id="igkt-dictionary-title">IGKT Multilingual Knot Dictionary</h1>
          <p>Knots, ropework terms and tools in English, Swedish, German, Finnish, French and Spanish. Beta, manually curated.</p>
        </header>
        <div class="igkt-dictionary__status is-error" role="alert"><p>${esc(loadError)}</p></div>
      </div>`;
    return;
  }

  const model = buildTableModel({
    entries: prepared,
    from: state.from,
    to: state.to,
    cat: state.cat,
    query: state.q,
    letter: state.letter,
  });

  let count;
  if (model.missing) {
    count = `${model.rows.length} of ${entries.length} entries · ${model.missing} more match but have no ${LANGUAGE_NAMES[state.from]} term`;
  } else {
    count = `${model.rows.length} of ${entries.length} entries`;
  }

  const toButtons = LANGUAGE_ORDER.map((lang) => {
    const pressed = state.to.includes(lang);
    const cls = "btn btn-small " + (pressed ? "btn-primary" : "btn-default");
    const disabled = lang === state.from ? " disabled" : "";
    return `<button type="button" data-to="${lang}" class="${cls}" aria-pressed="${pressed}" aria-label="${esc(LANGUAGE_NAMES[lang])}"${disabled} title="${esc(LANGUAGE_NAMES[lang])}">${lang.toUpperCase()}</button>`;
  }).join("");

  const catOptions = [`<option value="">All</option>`]
    .concat(
      categories.map(
        (c) =>
          `<option value="${esc(c.id)}"${c.id === state.cat ? " selected" : ""}>${esc(c.id)} (${c.count})</option>`
      )
    )
    .join("");

  const fromOptions = LANGUAGE_ORDER.map(
    (lang) =>
      `<option value="${lang}"${lang === state.from ? " selected" : ""}>${esc(LANGUAGE_NAMES[lang])}</option>`
  ).join("");

  const letterBtn = (value, label, active, aria) =>
    `<button type="button" data-letter="${esc(value)}" class="btn btn-small ${active ? "btn-primary" : "btn-default"}" aria-pressed="${active ? "true" : "false"}" aria-label="${esc(aria)}">${esc(label)}</button>`;
  const letters = [letterBtn("", "All", model.letter === "", "Show every letter")]
    .concat(model.letters.map((c) => letterBtn(c, c, model.letter === c, `Show entries starting with ${c}`)))
    .join("");

  const head = `<tr><th>${esc(LANGUAGE_NAMES[state.from])}</th>${state.to
    .map((l) => `<th>${esc(LANGUAGE_NAMES[l])}</th>`)
    .join("")}</tr>`;

  const body = model.items
    .map((item) => {
      if (item.type === "anchor") {
        return `<tr class="igkt-dictionary__anchor"><td colspan="${state.to.length + 1}">${esc(item.letter)}</td></tr>`;
      }
      const e = item.entry;
      const open = !!state.openIds[e.id];
      const has = e.notes && e.notes.length;
      const notesId = notesElementId(e.id);
      const term = firstTerm(e, state.from) || "this entry";
      let html = `<tr class="igkt-dictionary__row${has ? " has" : ""}${open ? " is-open" : ""}" data-id="${esc(e.id)}">`;
      html += `<td class="igkt-dictionary__src" data-l="${state.from.toUpperCase()}">${dashOrTerms(e, state.from)}<span class="igkt-dictionary__cat">${esc(e.category)}</span>`;
      if (has) {
        html += `<button type="button" class="btn btn-small btn-default igkt-dictionary__notes-toggle" data-notes="${esc(e.id)}" aria-expanded="${open ? "true" : "false"}" aria-controls="${esc(notesId)}" aria-label="${esc((open ? "Hide notes for " : "Show notes for ") + term)}">${open ? "Hide notes" : "Notes"}</button>`;
      }
      html += `</td>`;
      html += state.to
        .map((l) => `<td data-l="${l.toUpperCase()}">${dashOrTerms(e, l)}</td>`)
        .join("");
      html += `</tr>`;
      if (has) {
        html += `<tr id="${esc(notesId)}" class="igkt-dictionary__det"${open ? "" : " hidden"}><td colspan="${state.to.length + 1}"><ul>${e.notes
          .map((n) => `<li>${esc(n)}</li>`)
          .join("")}</ul></td></tr>`;
      }
      return html;
    })
    .join("");

  const notice = banner
    ? `<p class="igkt-dictionary__status">${esc(banner)}</p>`
    : "";
  const warning = loadWarning
    ? `<p class="igkt-dictionary__status" role="status">${esc(loadWarning)}</p>`
    : "";

  root.innerHTML = `
    <div class="igkt-dictionary" id="igkt-dictionary-root">
      <header class="igkt-dictionary__header">
        <h1 id="igkt-dictionary-title">IGKT Multilingual Knot Dictionary</h1>
        <p>Knots, ropework terms and tools in English, Swedish, German, Finnish, French and Spanish. Beta, manually curated.</p>
      </header>
      ${notice}
      <div class="igkt-dictionary__main">
        ${warning}
        <div class="igkt-dictionary__ctl">
          <label>From<select id="from">${fromOptions}</select></label>
          <label>To<span class="igkt-dictionary__to" id="to">${toButtons}</span></label>
          <label>Category<select id="cat">${catOptions}</select></label>
          <label class="igkt-dictionary__grow">Search (all languages)
            <input id="q" type="search" placeholder="Search in any language…" aria-label="Search the dictionary" value="${esc(state.q)}">
          </label>
        </div>
        <div class="igkt-dictionary__letters" id="letters" role="group" aria-label="First letter">${letters}</div>
        <div class="igkt-dictionary__count" aria-live="polite">${esc(count)}</div>
        <table class="igkt-dictionary__table" aria-labelledby="igkt-dictionary-title"><thead>${head}</thead><tbody id="tb">${body}</tbody></table>
      </div>
      <footer class="igkt-dictionary__footer">${sanitizeSourcesHtml(SOURCES_NOTE)}</footer>
    </div>
  `;

  document.getElementById("from").onchange = (ev) => {
    const next = ev.target.value;
    state.to = adjustToLanguages(state.from, next, state.to);
    state.from = next;
    state.letter = "";
    render();
  };
  document.getElementById("cat").onchange = (ev) => {
    state.cat = ev.target.value;
    state.letter = "";
    render();
  };
  document.getElementById("q").oninput = (ev) => {
    state.q = ev.target.value;
    render();
    const input = document.getElementById("q");
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  };
  document.getElementById("to").onclick = (ev) => {
    const btn = ev.target.closest("button[data-to]");
    if (!btn || btn.disabled) return;
    const lang = btn.getAttribute("data-to");
    if (state.to.includes(lang)) {
      if (state.to.length > 1) state.to = state.to.filter((l) => l !== lang);
    } else {
      state.to = LANGUAGE_ORDER.filter((l) => l === lang || state.to.includes(l));
    }
    render();
  };
  document.getElementById("letters").onclick = (ev) => {
    const btn = ev.target.closest("button[data-letter]");
    if (!btn) return;
    state.letter = btn.getAttribute("data-letter") || "";
    render();
  };
  document.getElementById("tb").onclick = (ev) => {
    const button = ev.target.closest("button[data-notes]");
    const row = ev.target.closest("tr.igkt-dictionary__row.has");
    const id = button
      ? button.getAttribute("data-notes")
      : row && !ev.target.closest("button, a")
        ? row.getAttribute("data-id")
        : "";
    if (!id) return;
    state.openIds[id] = !state.openIds[id];
    render();
    const next = document.querySelector(`button[data-notes="${CSS.escape(id)}"]`);
    if (next) next.focus();
  };
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const topicId = params.get("topic") || params.get("data_topic_id") || "";
  const url = params.get("data_url") || params.get("url") || "";
  try {
    if (topicId || url) {
      entries = await loadDictionary({
        topicId,
        url,
        fetchJson: (path) => defaultFetchJson(path),
        fetchText: (path) => defaultFetchText(path),
      });
      banner = "";
    } else {
      entries = SAMPLE_ENTRIES;
      banner = SAMPLE_NOTICE;
    }
    prepared = prepareEntries(entries);
    categories = categoryCounts(entries);
    loadWarning = Array.isArray(entries.warnings) ? entries.warnings.join(" ") : "";
    loadState = "ready";
  } catch (err) {
    loadState = err && err.code === "unconfigured" ? "unconfigured" : "error";
    loadError = (err && err.message) || String(err);
  }
  render();
  window.__IGKT_HARNESS__ = { state, entries, prepared, render, loadState, loadError };
}

boot();
