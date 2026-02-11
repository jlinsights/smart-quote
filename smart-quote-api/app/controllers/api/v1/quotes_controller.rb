module Api
  module V1
    class QuotesController < ApplicationController
      def calculate
        # Parse input from parameters
        # Rails parameters are distinct from JSON hash, but to_unsafe_h or permit helps.
        # For simplicity in this port, taking params directly.
        input = params.permit!.to_h.except(:controller, :action, :format)
        
        result = QuoteCalculator.call(input)
        
        render json: result
      end
    end
  end
end
