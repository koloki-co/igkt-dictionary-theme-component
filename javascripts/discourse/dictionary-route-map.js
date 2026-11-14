/**
 * Client route for /dictionary.
 *
 * Discourse compiles this file like a plugin route map and registers it
 * with the Ember router, so in-app navigation works. A theme component
 * cannot add the matching Rails route. Direct visits, bookmarks and
 * refresh need the companion plugin in plugins/igkt-dictionary-route,
 * which serves the Ember application for the same path.
 *
 * The path is a literal on purpose. Theme route maps are parsed
 * statically and cannot read a theme setting. Keep it identical to
 * IgktDictionaryRoute::PATH in the plugin.
 */
export default function () {
  this.route("dictionary", { path: "/dictionary" });
}
