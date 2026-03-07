module Api
  module V1
    class FscController < ApplicationController
      include JwtAuthenticatable

      before_action :authenticate_user!

      # GET /api/v1/fsc/rates
      def rates
        data = FscFetcher.current_rates

        render json: {
          rates: data,
          updatedAt: Time.current.iso8601
        }
      end

      # POST /api/v1/fsc/update (admin only - manual rate update)
      def update_rates
        unless current_user.role == "admin"
          return render json: { error: { code: "FORBIDDEN", message: "Admin only" } }, status: :forbidden
        end

        carrier = params[:carrier]&.upcase
        international = params[:international]&.to_f
        domestic = params[:domestic]&.to_f

        unless %w[UPS DHL].include?(carrier)
          return render json: { error: { code: "INVALID_CARRIER", message: "Carrier must be UPS or DHL" } }, status: :unprocessable_entity
        end

        current = FscFetcher.current_rates
        current[carrier] = {
          "international" => international || current.dig(carrier, "international") || 30.0,
          "domestic" => domestic || current.dig(carrier, "domestic") || 28.0
        }

        Rails.cache.write(FscFetcher::FSC_CACHE_KEY, {
          rates: current,
          fetched_at: Time.current.iso8601,
          source: "manual"
        }.to_json, expires_in: 24.hours)

        render json: { success: true, rates: current }
      end
    end
  end
end
