import { apiInitializer } from "discourse/lib/api";
import DictionaryHeaderIcon from "../components/dictionary-header-icon";

export default apiInitializer((api) => {
  if (typeof settings !== "undefined" && settings.show_header_link === false) {
    return;
  }

  api.headerIcons.add("igkt-dictionary", DictionaryHeaderIcon, {
    before: "search",
  });
});
