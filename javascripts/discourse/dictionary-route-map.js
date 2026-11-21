/**
 * Client route for /dictionary.
 *
 * Discourse compiles this file like a plugin route map and registers it
 * with the Ember router, so in-app navigation works. A theme component
 * cannot add the matching Rails route. Direct visits, bookmarks and
 * refresh need a server route, such as Discourse Custom Route configured
 * with custom_route_path set to the same literal path.
 */
export default function () {
  this.route("dictionary", { path: "/dictionary" });
}
