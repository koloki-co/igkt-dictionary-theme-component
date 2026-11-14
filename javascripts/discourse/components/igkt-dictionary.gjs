import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { on } from "@ember/modifier";
import { fn } from "@ember/helper";
import { htmlSafe } from "@ember/template";
import { i18n } from "discourse-i18n";
import {
  LANGUAGE_NAMES,
  LANGUAGE_ORDER,
  buildTableModel,
  adjustToLanguages,
  categoryCounts,
  defaultToLanguages,
  firstTerm,
  formatTerms,
  notesElementId,
  prepareEntries,
} from "../lib/dictionary-logic";
import {
  defaultFetchJson,
  defaultFetchText,
  loadDictionary,
} from "../lib/dictionary-data";
import { sanitizeSourcesHtml } from "../lib/sources-html";

export default class IgktDictionary extends Component {
  @tracked from;
  @tracked to;
  @tracked cat = "";
  @tracked q = "";
  @tracked letter = "";
  @tracked openIds = {};
  @tracked entries = [];
  @tracked loadState = "loading";
  @tracked loadError = "";
  @tracked loadWarning = "";

  languageOrder = LANGUAGE_ORDER;
  languageNames = LANGUAGE_NAMES;

  constructor() {
    super(...arguments);
    const from =
      (typeof settings !== "undefined" && settings.default_from_language) ||
      "en";
    this.from = LANGUAGE_ORDER.includes(from) ? from : "en";
    this.to = defaultToLanguages(this.from);
    this.#load();
  }

  async #load() {
    const topicId =
      typeof settings !== "undefined" ? settings.data_topic_id || "" : "";
    const url = typeof settings !== "undefined" ? settings.data_url || "" : "";
    try {
      const entries = await loadDictionary({
        topicId,
        url,
        fetchJson: (path) => defaultFetchJson(path),
        fetchText: (path) => defaultFetchText(path),
      });
      this.entries = entries;
      this.loadWarning =
        entries && Array.isArray(entries.warnings) ? entries.warnings.join(" ") : "";
      this.loadState = "ready";
    } catch (err) {
      const code = err && err.code;
      this.loadError = (err && err.message) || String(err);
      this.loadState = code === "unconfigured" ? "unconfigured" : "error";
    }
  }

  get prepared() {
    return prepareEntries(this.entries);
  }

  get categories() {
    return categoryCounts(this.entries);
  }

  get total() {
    return this.entries.length;
  }

  get model() {
    return buildTableModel({
      entries: this.prepared,
      from: this.from,
      to: this.to,
      cat: this.cat,
      query: this.q,
      letter: this.letter,
    });
  }

  get countText() {
    const { rows, missing } = this.model;
    if (missing) {
      return i18n(themePrefix("count_missing"), {
        shown: rows.length,
        total: this.total,
        missing,
        language: LANGUAGE_NAMES[this.from],
      });
    }
    return i18n(themePrefix("count"), {
      shown: rows.length,
      total: this.total,
    });
  }

  get pageTitle() {
    return configuredText("page_title") || i18n(themePrefix("title"));
  }

  get pageSubtitle() {
    return configuredText("page_subtitle") || i18n(themePrefix("subtitle"));
  }

  get sourcesNote() {
    const html = configuredText("sources_note");
    const clean = sanitizeSourcesHtml(html);
    return clean ? htmlSafe(clean) : "";
  }

  get loadErrorText() {
    return i18n(themePrefix("load_error"), { message: this.loadError });
  }

  @action
  changeFrom(event) {
    const from = event.target.value;
    this.to = adjustToLanguages(this.from, from, this.to);
    this.from = from;
    this.letter = "";
  }

  @action
  toggleTo(lang) {
    if (lang === this.from) {
      return;
    }
    if (this.to.includes(lang)) {
      if (this.to.length === 1) {
        return;
      }
      this.to = this.to.filter((item) => item !== lang);
    } else {
      this.to = LANGUAGE_ORDER.filter(
        (item) => item === lang || this.to.includes(item)
      );
    }
  }

  @action
  changeCategory(event) {
    this.cat = event.target.value;
    this.letter = "";
  }

  @action
  changeQuery(event) {
    this.q = event.target.value;
  }

  @action
  setLetter(value) {
    this.letter = value || "";
  }

  @action
  toggleNotes(id) {
    this.openIds = Object.assign({}, this.openIds, {
      [id]: !this.openIds[id],
    });
  }

  <template>
    <div class="igkt-dictionary" id="igkt-dictionary-root">
      <header class="igkt-dictionary__header">
        <h1 id="igkt-dictionary-title">{{this.pageTitle}}</h1>
        <p>{{this.pageSubtitle}}</p>
      </header>

      {{#if (eq this.loadState "loading")}}
        <p class="igkt-dictionary__status" role="status">
          {{i18n (themePrefix "loading")}}
        </p>
      {{else if (eq this.loadState "unconfigured")}}
        <div class="igkt-dictionary__status is-error" role="alert">
          <p>{{i18n (themePrefix "unconfigured")}}</p>
        </div>
      {{else if (eq this.loadState "error")}}
        <div class="igkt-dictionary__status is-error" role="alert">
          <p>{{this.loadErrorText}}</p>
        </div>
      {{else}}
        <div class="igkt-dictionary__main">
          <div class="igkt-dictionary__ctl">
            <label>
              {{i18n (themePrefix "from_label")}}
              <select
                value={{this.from}}
                {{on "change" this.changeFrom}}
              >
                {{#each this.languageOrder as |lang|}}
                  <option
                    value={{lang}}
                    selected={{if (eq lang this.from) "selected"}}
                  >
                    {{get this.languageNames lang}}
                  </option>
                {{/each}}
              </select>
            </label>

            <label>
              {{i18n (themePrefix "to_label")}}
              <span class="igkt-dictionary__to">
                {{#each this.languageOrder as |lang|}}
                  <button
                    type="button"
                    title={{get this.languageNames lang}}
                    aria-label={{get this.languageNames lang}}
                    disabled={{eq lang this.from}}
                    aria-pressed={{if (includes this.to lang) "true" "false"}}
                    class="btn btn-small {{if (includes this.to lang) 'btn-primary' 'btn-default'}}"
                    {{on "click" (fn this.toggleTo lang)}}
                  >
                    {{uppercase lang}}
                  </button>
                {{/each}}
              </span>
            </label>

            <label>
              {{i18n (themePrefix "category_label")}}
              <select {{on "change" this.changeCategory}}>
                <option value="">{{i18n (themePrefix "category_all")}}</option>
                {{#each this.categories as |cat|}}
                  <option value={{cat.id}}>
                    {{cat.id}} ({{cat.count}})
                  </option>
                {{/each}}
              </select>
            </label>

            <label class="igkt-dictionary__grow">
              {{i18n (themePrefix "search_label")}}
              <input
                type="search"
                value={{this.q}}
                placeholder={{i18n (themePrefix "search_placeholder")}}
                aria-label={{i18n (themePrefix "search_aria")}}
                {{on "input" this.changeQuery}}
              />
            </label>
          </div>

          {{#if this.loadWarning}}
            <p class="igkt-dictionary__status" role="status">{{this.loadWarning}}</p>
          {{/if}}

          <div
            class="igkt-dictionary__letters"
            role="group"
            aria-label={{i18n (themePrefix "letters_label")}}
          >
            <button
              type="button"
              class="btn btn-small {{if (eq this.model.letter '') 'btn-primary' 'btn-default'}}"
              aria-pressed={{if (eq this.model.letter "") "true" "false"}}
              aria-label={{i18n (themePrefix "letter_all_aria")}}
              {{on "click" (fn this.setLetter "")}}
            >
              {{i18n (themePrefix "letter_all")}}
            </button>
            {{#each this.model.letters as |letter|}}
              <button
                type="button"
                class="btn btn-small {{if (eq this.model.letter letter) 'btn-primary' 'btn-default'}}"
                aria-pressed={{if (eq this.model.letter letter) "true" "false"}}
                aria-label={{letterLabel letter}}
                {{on "click" (fn this.setLetter letter)}}
              >
                {{letter}}
              </button>
            {{/each}}
          </div>

          <div class="igkt-dictionary__count" aria-live="polite">
            {{this.countText}}
          </div>

          <table class="igkt-dictionary__table" aria-labelledby="igkt-dictionary-title">
            <thead>
              <tr>
                <th>{{get this.languageNames this.from}}</th>
                {{#each this.to as |lang|}}
                  <th>{{get this.languageNames lang}}</th>
                {{/each}}
              </tr>
            </thead>
            <tbody>
              {{#each this.model.items as |item|}}
                {{#if (eq item.type "anchor")}}
                  <tr class="igkt-dictionary__anchor">
                    <td colspan={{add this.to.length 1}}>{{item.letter}}</td>
                  </tr>
                {{else}}
                  <IgktDictionaryRow
                    @entry={{item.entry}}
                    @from={{this.from}}
                    @to={{this.to}}
                    @open={{get this.openIds item.entry.id}}
                    @toggle={{fn this.toggleNotes item.entry.id}}
                  />
                {{/if}}
              {{/each}}
            </tbody>
          </table>
        </div>

        {{#if this.sourcesNote}}
          <footer class="igkt-dictionary__footer">
            {{this.sourcesNote}}
          </footer>
        {{/if}}
      {{/if}}
    </div>
  </template>
}

function eq(a, b) {
  return a === b;
}

function add(a, b) {
  return a + b;
}

function includes(list, value) {
  return Array.isArray(list) && list.includes(value);
}

function get(obj, key) {
  return obj && obj[key];
}

function uppercase(value) {
  return String(value).toUpperCase();
}

function letterLabel(letter) {
  return i18n(themePrefix("letter_aria"), { letter });
}

function configuredText(name) {
  if (typeof settings === "undefined" || !settings) {
    return "";
  }
  const value = settings[name];
  return value == null ? "" : String(value).trim();
}

function notesLabel(entry, from, open) {
  const term = firstTerm(entry, from) || "this entry";
  return i18n(themePrefix(open ? "notes_hide_for" : "notes_show_for"), { term });
}

function notesButtonText(open) {
  return i18n(themePrefix(open ? "notes_hide" : "notes_show"));
}

function toggleFromButton(toggle) {
  return (event) => {
    event.stopPropagation();
    toggle(event);
  };
}

function toggleFromRow(hasNotes, toggle) {
  if (!hasNotes) {
    return () => {};
  }
  return (event) => {
    const target = event.target;
    if (target && target.closest && target.closest("button, a")) {
      return;
    }
    toggle(event);
  };
}

const IgktDictionaryRow = <template>
  <tr
    class="igkt-dictionary__row{{if @entry.notes ' has'}}{{if @open ' is-open'}}"
    {{on "click" (toggleFromRow @entry.notes @toggle)}}
  >
    <td class="igkt-dictionary__src" data-l={{uppercase @from}}>
      {{#if (firstTerm @entry @from)}}
        {{formatTerms @entry @from}}
      {{else}}
        <span class="igkt-dictionary__dash">–</span>
      {{/if}}
      <span class="igkt-dictionary__cat">{{@entry.category}}</span>
      {{#if @entry.notes}}
        <button
          type="button"
          class="btn btn-small btn-default igkt-dictionary__notes-toggle"
          aria-expanded={{if @open "true" "false"}}
          aria-controls={{notesElementId @entry.id}}
          aria-label={{notesLabel @entry @from @open}}
          {{on "click" (toggleFromButton @toggle)}}
        >
          {{notesButtonText @open}}
        </button>
      {{/if}}
    </td>
    {{#each @to as |lang|}}
      <td data-l={{uppercase lang}}>
        {{#if (firstTerm @entry lang)}}
          {{formatTerms @entry lang}}
        {{else}}
          <span class="igkt-dictionary__dash">–</span>
        {{/if}}
      </td>
    {{/each}}
  </tr>
  {{#if @entry.notes}}
    <tr
      id={{notesElementId @entry.id}}
      class="igkt-dictionary__det"
      hidden={{not @open}}
    >
      <td colspan={{add @to.length 1}}>
        <ul>
          {{#each @entry.notes as |note|}}
            <li>{{note}}</li>
          {{/each}}
        </ul>
      </td>
    </tr>
  {{/if}}
</template>;

function not(value) {
  return !value;
}
