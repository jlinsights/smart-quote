require "net/http"
require "json"

class FscFetcher
  FSC_CACHE_KEY = "fsc_rates_cache"

  # Known FSC rates - updated manually or via scraping
  # UPS: https://www.ups.com/us/en/support/shipping-support/shipping-costs-rates/fuel-surcharges.page
  # DHL: https://www.dhl.com/kr-en/home/our-divisions/express/customer-service/fuel-surcharge.html
  DEFAULT_RATES = {
    "UPS" => { "international" => 30.0, "domestic" => 28.0 },
    "DHL" => { "international" => 29.5, "domestic" => 27.5 }
  }.freeze

  class << self
    def fetch_all
      rates = {}

      rates["UPS"] = fetch_ups_fsc
      rates["DHL"] = fetch_dhl_fsc

      cache_rates(rates)
      rates
    rescue StandardError => e
      Rails.logger.warn("FSC fetch failed: #{e.message}")
      cached_rates || DEFAULT_RATES
    end

    def current_rates
      cached_rates || DEFAULT_RATES
    end

    private

    def fetch_ups_fsc
      # UPS publishes FSC rates on their website
      # In production, this would scrape or use UPS API
      # For now, return cached or default rates
      cached = cached_rates
      cached&.dig("UPS") || DEFAULT_RATES["UPS"]
    end

    def fetch_dhl_fsc
      # DHL publishes FSC rates monthly
      # In production, this would scrape or use DHL API
      cached = cached_rates
      cached&.dig("DHL") || DEFAULT_RATES["DHL"]
    end

    def cache_rates(rates)
      data = {
        rates: rates,
        fetched_at: Time.current.iso8601,
        source: "auto"
      }
      Rails.cache.write(FSC_CACHE_KEY, data.to_json, expires_in: 24.hours)
    end

    def cached_rates
      raw = Rails.cache.read(FSC_CACHE_KEY)
      return nil unless raw

      parsed = JSON.parse(raw)
      parsed["rates"]
    rescue JSON::ParserError
      nil
    end
  end
end
