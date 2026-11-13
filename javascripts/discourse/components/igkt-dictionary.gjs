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
  prepareEntries,
} from "../lib/dictionary-logic";
import {
  defaultFetchJson,
  defaultFetchText,
  loadDictionary,
} from "../lib/dictionary-data";

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

  get sourcesNote() {
    const html =
      typeof settings !== "undefined" ? settings.sources_note || "" : "";
    return html ? htmlSafe(html) : "";
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
        <h1>{{i18n (themePrefix "title")}}</h1>
        <p>{{i18n (themePrefix "subtitle")}}</p>
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
                    disabled={{eq lang this.from}}
                    aria-pressed={{includes this.to lang}}
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

          <div class="igkt-dictionary__letters">
            <button
              type="button"
              class="btn btn-small {{if (eq this.model.letter '') 'btn-primary' 'btn-default'}}"
              {{on "click" (fn this.setLetter "")}}
            >
              {{i18n (themePrefix "letter_all")}}
            </button>
            {{#each this.model.letters as |letter|}}
              <button
                type="button"
                class="btn btn-small {{if (eq this.model.letter letter) 'btn-primary' 'btn-default'}}"
                {{on "click" (fn this.setLetter letter)}}
              >
                {{letter}}
              </button>
            {{/each}}
          </div>

          <div class="igkt-dictionary__count" aria-live="polite">
            {{this.countText}}
          </div>

          <table class="igkt-dictionary__table">
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

const IgktDictionaryRow = <template>
  <tr
    class="igkt-dictionary__row{{if @entry.notes ' has'}}{{if @open ' is-open'}}"
    role={{if @entry.notes "button"}}
    {{on "click" (rowClick @entry.notes @toggle)}}
  >
    <td class="igkt-dictionary__src" data-l={{uppercase @from}}>
      {{#if (firstTerm @entry @from)}}
        {{formatTerms @entry @from}}
      {{else}}
        <span class="igkt-dictionary__dash">–</span>
      {{/if}}
      <span class="igkt-dictionary__cat">{{@entry.category}}</span>
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
  {{#if (and @open @entry.notes)}}
    <tr class="igkt-dictionary__det">
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

function and(a, b) {
  return a && b;
}

function rowClick(hasNotes, toggle) {
  return hasNotes ? toggle : () => {};
}
