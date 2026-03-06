Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      # Auth (public)
      post "auth/register", to: "auth#register"
      post "auth/login",    to: "auth#login"
      get  "auth/me",       to: "auth#me"
      post "auth/promote",  to: "auth#promote"

      # Quotes (protected, except calculate)
      post "quotes/calculate", to: "quotes#calculate"
      get "quotes/export", to: "quotes#export"
      resources :quotes, only: [ :index, :show, :create, :destroy ]
    end
  end
end
