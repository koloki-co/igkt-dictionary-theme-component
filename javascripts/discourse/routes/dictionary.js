import { i18n } from "discourse-i18n";
import DiscourseRoute from "discourse/routes/discourse";

export default class DictionaryRoute extends DiscourseRoute {
  titleToken() {
    const configured =
      typeof settings !== "undefined" ? settings.page_title : "";
    const text = configured == null ? "" : String(configured).trim();
    return text || i18n(themePrefix("title"));
  }
}
