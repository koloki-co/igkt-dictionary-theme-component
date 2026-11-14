# frozen_string_literal: true

# name: igkt-dictionary-route
# about: Serves the Discourse Ember application at /dictionary so the knot dictionary theme component survives a direct visit, bookmark or refresh.
# version: 0.1.0
# authors: Niclas Andersson and contributors
# url: https://github.com/Seaserpent/igkt-dictionary-theme-component
# required_version: 3.3.0

enabled_site_setting :igkt_dictionary_route_enabled

module ::IgktDictionaryRoute
  PLUGIN_NAME = "igkt-dictionary-route"
  # Keep this identical to the path in javascripts/discourse/dictionary-route-map.js.
  # Theme route maps are literal strings, so a site setting cannot retarget the Ember route.
  PATH = "/dictionary"
end

after_initialize do
  # Load the controller explicitly. A theme component cannot add this route,
  # and an engine mount at "/dictionary" only sees the path after the mount
  # point, so a request for exactly /dictionary can miss it.
  require_relative "app/controllers/igkt_dictionary_route/page_controller"

  Discourse::Application.routes.prepend do
    get ::IgktDictionaryRoute::PATH => "igkt_dictionary_route/page#show"
    get "#{::IgktDictionaryRoute::PATH}/" => "igkt_dictionary_route/page#show"
  end
end
