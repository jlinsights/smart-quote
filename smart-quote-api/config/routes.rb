Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post 'quotes/calculate', to: 'quotes_controller#calculate'
    end
  end
end
