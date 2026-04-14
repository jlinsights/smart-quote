class ApplicationController < ActionController::API
  before_action :set_sentry_user

  def set_sentry_user
    return unless respond_to?(:current_user) && current_user
    Sentry.set_user(id: current_user.id, email: current_user.email)
  end

  def intercom_user_hash
    return nil unless respond_to?(:current_user) && current_user

    OpenSSL::HMAC.hexdigest(
      "SHA256",
      ENV["INTERCOM_SECRET_KEY"],
      current_user.id.to_s
    )
  end
  rescue_from ActiveRecord::RecordNotFound do |e|
    render json: { error: { code: "NOT_FOUND", message: e.message } }, status: :not_found
  end

  rescue_from ActionController::ParameterMissing do |e|
    render json: { error: { code: "PARAMETER_MISSING", message: e.message } }, status: :bad_request
  end
end
