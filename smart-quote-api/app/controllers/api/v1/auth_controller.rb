module Api
  module V1
    class AuthController < ApplicationController
      include JwtAuthenticatable

      # POST /api/v1/auth/register
      def register
        user = User.new(register_params)

        if user.save
          token = encode_token(user)
          render json: { token: token, user: user_json(user) }, status: :created
        else
          render json: {
            error: { code: "VALIDATION_ERROR", message: user.errors.full_messages.join(", ") }
          }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/auth/login
      def login
        user = User.find_by(email: params[:email]&.downcase&.strip)

        if user&.authenticate(params[:password])
          token = encode_token(user)
          render json: { token: token, user: user_json(user) }
        else
          render json: {
            error: { code: "UNAUTHORIZED", message: "Invalid email or password" }
          }, status: :unauthorized
        end
      end

      # GET /api/v1/auth/me
      def me
        authenticate_user!
        return if performed?
        render json: user_json(current_user)
      end

      private

      def register_params
        params.permit(:email, :password, :password_confirmation,
                      :name, :company, :nationality)
      end
    end
  end
end
