import { service } from "@ember/service";
import Component from "@glimmer/component";
import DButton from "discourse/components/d-button";
import { i18n } from "discourse-i18n";

export default class DictionaryHeaderIcon extends Component {
  @service router;

  get onDictionary() {
    return this.router.currentRouteName === "dictionary";
  }

  get destination() {
    return this.onDictionary ? "discovery.index" : "dictionary";
  }

  get icon() {
    return this.onDictionary ? "arrow-left" : "book";
  }

  get title() {
    if (this.onDictionary) {
      return i18n(themePrefix("back_to_forum"));
    }

    const configured =
      typeof settings !== "undefined" ? settings.header_link_title : "";
    const text = configured == null ? "" : String(configured).trim();
    return text || i18n(themePrefix("header_link_title"));
  }

  <template>
    <li class="igkt-dictionary-header-icon">
      <DButton
        class="btn-flat icon"
        @icon={{this.icon}}
        @route={{this.destination}}
        @translatedAriaLabel={{this.title}}
        @translatedTitle={{this.title}}
      />
    </li>
  </template>
}
