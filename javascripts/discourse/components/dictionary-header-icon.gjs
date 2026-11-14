import Component from "@glimmer/component";
import DButton from "discourse/components/d-button";
import { i18n } from "discourse-i18n";

/**
 * Header icon that opens the dictionary route in-app.
 * The tooltip and accessible name come from the header_link_title setting.
 */
export default class DictionaryHeaderIcon extends Component {
  get title() {
    const configured =
      typeof settings !== "undefined" ? settings.header_link_title : "";
    const text = configured == null ? "" : String(configured).trim();
    return text || i18n(themePrefix("header_link_title"));
  }

  <template>
    <li class="igkt-dictionary-header-icon">
      <DButton
        @route="dictionary"
        @icon="book"
        @translatedTitle={{this.title}}
        class="btn-flat icon"
      />
    </li>
  </template>
}
