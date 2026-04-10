class AuthMailer < ApplicationMailer
  def magic_link(user, token)
    @user = user
    frontend_url = ENV.fetch("FRONTEND_URL")
    @magic_link_url = "#{frontend_url}/auth/verify?token=#{token}"
    @expires_in_minutes = 15
    mail(to: user.email, subject: "[Goodman GLS] Your sign-in link")
  end
end
