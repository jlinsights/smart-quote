class AuthMailer < ApplicationMailer
  def magic_link(user, token)
    @user = user
    @magic_link_url = "#{ENV.fetch('FRONTEND_URL', 'http://localhost:5173')}/auth/verify?token=#{token}"
    @expires_in = "15분"
    mail(to: user.email, subject: "[Goodman GLS] 로그인 링크입니다")
  end
end
