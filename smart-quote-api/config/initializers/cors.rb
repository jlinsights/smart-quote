Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    allowed = ENV.fetch("CORS_ORIGINS", "https://smart-quote-main.vercel.app").split(",")
    allowed += [ "http://localhost:5173", "http://localhost:3000" ] if Rails.env.development?

    origins(*allowed)

    resource "*",
      headers: :any,
      expose: [ "Authorization" ],
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ]
  end
end
