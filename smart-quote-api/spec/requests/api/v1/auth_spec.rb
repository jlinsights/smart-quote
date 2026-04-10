require "rails_helper"

RSpec.describe "Api::V1::Auth", type: :request do
  describe "POST /api/v1/auth/register" do
    let(:valid_params) do
      {
        email: "newuser@example.com",
        password: "password123",
        password_confirmation: "password123",
        name: "New User",
        company: "Test Corp",
        nationality: "KR"
      }
    end

    it "creates a user and returns token" do
      post "/api/v1/auth/register", params: valid_params, as: :json

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["token"]).to be_present
      expect(body["user"]["email"]).to eq("newuser@example.com")
      expect(body["user"]["role"]).to eq("user")
      expect(body["user"]["name"]).to eq("New User")
    end

    it "rejects duplicate email" do
      create(:user, email: "newuser@example.com")
      post "/api/v1/auth/register", params: valid_params, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body)
      expect(body["error"]["message"]).to include("Email has already been taken")
    end

    it "rejects short password" do
      post "/api/v1/auth/register", params: valid_params.merge(password: "short", password_confirmation: "short"), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects mismatched password confirmation" do
      post "/api/v1/auth/register", params: valid_params.merge(password_confirmation: "different"), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /api/v1/auth/login" do
    let!(:user) { create(:user, email: "test@example.com", password: "password123") }

    it "returns token for valid credentials" do
      post "/api/v1/auth/login", params: { email: "test@example.com", password: "password123" }, as: :json

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["token"]).to be_present
      expect(body["user"]["email"]).to eq("test@example.com")
    end

    it "rejects wrong password" do
      post "/api/v1/auth/login", params: { email: "test@example.com", password: "wrong" }, as: :json

      expect(response).to have_http_status(:unauthorized)
      body = JSON.parse(response.body)
      expect(body["error"]["message"]).to eq("Invalid email or password")
    end

    it "rejects nonexistent email" do
      post "/api/v1/auth/login", params: { email: "nobody@example.com", password: "password123" }, as: :json

      expect(response).to have_http_status(:unauthorized)
    end

    it "handles case-insensitive email" do
      post "/api/v1/auth/login", params: { email: "TEST@example.com", password: "password123" }, as: :json

      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /api/v1/auth/me" do
    let(:user) { create(:user) }

    it "returns current user with valid token" do
      token = jwt_token_for(user)
      get "/api/v1/auth/me", headers: auth_headers(token)

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["email"]).to eq(user.email)
      expect(body["role"]).to eq(user.role)
    end

    it "returns 401 without token" do
      get "/api/v1/auth/me"

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 with invalid token" do
      get "/api/v1/auth/me", headers: { "Authorization" => "Bearer invalid.token.here" }

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 with expired token" do
      token = jwt_token_for(user, exp: 1.hour.ago.to_i)
      get "/api/v1/auth/me", headers: auth_headers(token)

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/auth/magic_link" do
    let!(:user) { create(:user, email: "magic@example.com") }

    before { ActionMailer::Base.deliveries.clear }

    it "returns 200 and enqueues a magic link email for an existing user" do
      expect {
        post "/api/v1/auth/magic_link", params: { email: user.email }
      }.to have_enqueued_mail(AuthMailer, :magic_link)
      expect(response).to have_http_status(:ok)
    end

    it "returns 200 for a non-existing user without enqueueing email (enumeration prevention)" do
      expect {
        post "/api/v1/auth/magic_link", params: { email: "nobody@example.com" }
      }.not_to have_enqueued_mail
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["message"]).to include("login link")
    end

    it "stores only the digest of the generated token" do
      post "/api/v1/auth/magic_link", params: { email: user.email }
      user.reload
      expect(user.magic_link_token_digest).to be_present
      expect(user.magic_link_token_digest.length).to eq(64) # SHA256 hex
      expect(user.magic_link_token).to be_nil
    end
  end

  describe "GET /api/v1/auth/magic_link/verify" do
    let(:user) { create(:user, email: "verify@example.com") }

    it "returns a JWT for a valid raw token" do
      raw = user.generate_magic_link_token!
      get "/api/v1/auth/magic_link/verify", params: { token: raw }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["token"]).to be_present
      expect(body["refresh_token"]).to be_present
      expect(body["user"]["email"]).to eq(user.email)
    end

    it "consumes the token after successful verification" do
      raw = user.generate_magic_link_token!
      get "/api/v1/auth/magic_link/verify", params: { token: raw }
      expect(user.reload.magic_link_token_digest).to be_nil
    end

    it "returns 401 for an already-consumed token" do
      raw = user.generate_magic_link_token!
      get "/api/v1/auth/magic_link/verify", params: { token: raw }
      get "/api/v1/auth/magic_link/verify", params: { token: raw }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for an expired token" do
      raw = user.generate_magic_link_token!
      user.update_columns(magic_link_token_expires_at: 1.minute.ago)
      get "/api/v1/auth/magic_link/verify", params: { token: raw }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for an invalid token" do
      get "/api/v1/auth/magic_link/verify", params: { token: "bogus-token" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for an empty token without crashing" do
      get "/api/v1/auth/magic_link/verify", params: { token: "" }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
