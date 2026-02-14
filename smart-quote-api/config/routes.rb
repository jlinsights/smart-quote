Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post "quotes/calculate", to: "quotes#calculate"
      get "quotes/export", to: "quotes#export"
      resources :quotes, only: [ :index, :show, :create, :destroy ]
    end
  end
end
