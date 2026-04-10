require "rails_helper"

RSpec.describe AuthMailer, type: :mailer do
  describe "#magic_link" do
    let(:user) { create(:user, email: "test@example.com", name: "Alice") }
    let(:token) { "raw-sample-token-xyz" }

    around do |example|
      original = ENV["FRONTEND_URL"]
      ENV["FRONTEND_URL"] = "https://smart-quote.test"
      example.run
      ENV["FRONTEND_URL"] = original
    end

    it "sends to the user's email with an English subject" do
      mail = described_class.magic_link(user, token)
      expect(mail.to).to eq([ user.email ])
      expect(mail.subject).to eq("[Goodman GLS] Your sign-in link")
    end

    it "embeds the magic link URL with the raw token" do
      mail = described_class.magic_link(user, token)
      expect(mail.body.encoded).to include(
        "https://smart-quote.test/auth/verify?token=#{token}"
      )
    end

    it "raises KeyError when FRONTEND_URL is unset" do
      ENV.delete("FRONTEND_URL")
      # ActionMailer lazily evaluates the action body; force it by touching .message
      expect {
        described_class.magic_link(user, token).message
      }.to raise_error(KeyError)
    end
  end
end
