# frozen_string_literal: true

module ::IgktDictionaryRoute
  class PageController < ::ApplicationController
    requires_plugin PLUGIN_NAME
    skip_before_action :check_xhr

    def show
      # default/empty is the Ember application shell. The theme component's
      # client route then renders /dictionary. No dictionary entries are read here.
      render "default/empty"
    end
  end
end
