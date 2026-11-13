/**
 * Register a top-level Ember route at /dictionary.
 *
 * Theme JS is compiled with the same resolver layout as plugins, so a
 * `*-route-map.js` file here is picked up automatically. This is a
 * client-side route only: a theme component cannot add a Rails route.
 * In-app navigation (header icon, LinkTo) works. A full page load of
 * /dictionary may 404 on official hosting until a server pass-through
 * is added. See the README.
 */
export default function () {
  this.route("dictionary", { path: "/dictionary" });
}
