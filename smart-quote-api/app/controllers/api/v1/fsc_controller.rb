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
          updatedAt: FscRate.maximum(:updated_at)&.iso8601 || Time.current.iso8601
        }
      end

      # POST /api/v1/fsc/update (admin only)
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

        FscFetcher.update!(
          carrier: carrier,
          international: international,
          domestic: domestic,
          updated_by: current_user.email
        )

        AuditLog.track!(
          user: current_user,
          action: "fsc.updated",
          resource: FscRate.find_by(carrier: carrier),
          metadata: { carrier: carrier, international: international, domestic: domestic },
          ip_address: request.remote_ip
        )

        render json: { success: true, rates: FscFetcher.current_rates }
      rescue StandardError => e
        Rails.logger.error "[FSC] #{e.class}: #{e.message}"
        render json: { error: { code: "UPDATE_FAILED", message: "FSC rate update failed" } }, status: :unprocessable_entity
      end
    end
  end
end
