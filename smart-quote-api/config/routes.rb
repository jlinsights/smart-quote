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
      resources :quotes, only: [ :index, :show, :create, :update, :destroy ] do
        member do
          post :send_email
        end
      end

      # Customers
      resources :customers, only: [ :index, :show, :create, :update, :destroy ]

      # Users (admin only)
      resources :users, only: [ :index, :update, :destroy ]

      # Margin Rules (CRUD: admin, resolve: authenticated)
      resources :margin_rules, only: [ :index, :create, :update, :destroy ] do
        collection do
          get :resolve
        end
      end

      # Audit Logs (admin only)
      resources :audit_logs, only: [ :index ]

      # Logistics News (public)
      get "notices/news", to: "notices#news"

      # FSC Rates
      get "fsc/rates", to: "fsc#rates"
      post "fsc/update", to: "fsc#update_rates"
    end
  end
end
