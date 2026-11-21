import RouteTemplate from "ember-route-template";
import bodyClass from "discourse/helpers/body-class";
import hideApplicationSidebar from "discourse/helpers/hide-application-sidebar";
import IgktDictionary from "../components/igkt-dictionary";

export default RouteTemplate(
  <template>
    {{bodyClass "dictionary-page"}}
    {{hideApplicationSidebar}}
    <IgktDictionary />
  </template>
);
