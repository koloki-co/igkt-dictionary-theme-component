import { service } from "@ember/service";
import { i18n } from "discourse-i18n";
import DiscourseRoute from "discourse/routes/discourse";

const BODY_CLASS = "dictionary-page";

export default class DictionaryRoute extends DiscourseRoute {
  @service sidebarState;

  titleToken() {
    return i18n(themePrefix("title"));
  }

  activate() {
    document.body.classList.add(BODY_CLASS);
    // Hide the left sidebar when the API is present. CSS in common.scss
    // is the fallback and also hides any right-hand TOC / timeline.
    try {
      this.sidebarState?.setForcedHidden?.(true);
    } catch (e) {
      // Optional API; layout still collapses via the body class.
    }
  }

  deactivate() {
    document.body.classList.remove(BODY_CLASS);
    try {
      this.sidebarState?.setForcedHidden?.(false);
    } catch (e) {
      // Optional API.
    }
  }
}
