require "net/http"
require "rss"

class LogisticsNewsFetcher
  FEEDS = [
    { url: "https://www.hellenicshippingnews.com/feed/", source: "Hellenic Shipping News" },
    { url: "https://theloadstar.com/feed/", source: "The Loadstar" },
    { url: "https://www.aircargonews.net/feed/", source: "Air Cargo News" },
    { url: "https://www.joc.com/rss/all", source: "JOC" },
    { url: "https://gcaptain.com/feed/", source: "gCaptain" }
  ].freeze

  FETCH_TIMEOUT = 5 # seconds per feed
  MAX_ITEMS = 30     # total items to return
  CACHE_TTL = 600    # 10 minutes

  def self.call
    new.call
  end

  def call
    cached = read_cache
    return cached if cached

    items = fetch_all_feeds
    write_cache(items)
    items
  end

  private

  def fetch_all_feeds
    items = []

    threads = FEEDS.map do |feed_config|
      Thread.new(feed_config) do |fc|
        fetch_single_feed(fc[:url], fc[:source])
      rescue StandardError => e
        Rails.logger.warn "[NEWS] Failed to fetch #{fc[:source]}: #{e.message}"
        []
      end
    end

    threads.each do |t|
      result = t.value
      items.concat(result) if result.is_a?(Array)
    end

    items
      .sort_by { |item| item[:pubDate] ? Time.parse(item[:pubDate]) : Time.at(0) rescue Time.at(0) }
      .reverse
      .first(MAX_ITEMS)
  end

  def fetch_single_feed(url, source)
    uri = URI(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = FETCH_TIMEOUT
    http.read_timeout = FETCH_TIMEOUT

    request = Net::HTTP::Get.new(uri)
    request["User-Agent"] = "SmartQuote/1.0 (Logistics News Aggregator)"
    request["Accept"] = "application/rss+xml, application/xml, text/xml"

    response = http.request(request)
    return [] unless response.is_a?(Net::HTTPSuccess)

    feed = RSS::Parser.parse(response.body, false)
    return [] unless feed

    feed.items.first(10).map do |item|
      {
        title: sanitize_text(item.title),
        link: item.link.is_a?(String) ? item.link : item.link&.href.to_s,
        pubDate: (item.pubDate || item.date)&.iso8601,
        source: source
      }
    end
  end

  def sanitize_text(text)
    return "" unless text
    text = text.content if text.respond_to?(:content)
    text.to_s.gsub(/<[^>]+>/, "").strip.slice(0, 200)
  end

  # Simple in-memory cache using Rails.cache
  def cache_key
    "logistics_news_items"
  end

  def read_cache
    Rails.cache.read(cache_key)
  end

  def write_cache(items)
    Rails.cache.write(cache_key, items, expires_in: CACHE_TTL.seconds)
  end
end
