import DButton from "discourse/components/d-button";
import { i18n } from "discourse-i18n";

/**
 * Header icon that transitions to the dictionary route in-app
 * (does not trigger a full page load of /dictionary).
 */
const DictionaryHeaderIcon = <template>
  <li class="igkt-dictionary-header-icon">
    <DButton
      @route="dictionary"
      @icon="book"
      @translatedTitle={{i18n (themePrefix "header_link_title")}}
      class="btn-flat icon"
    />
  </li>
</template>;

export default DictionaryHeaderIcon;
