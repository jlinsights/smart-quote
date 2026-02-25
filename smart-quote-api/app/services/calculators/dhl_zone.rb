module Calculators
  class DhlZone
    def self.call(country)
      new(country).call
    end

    def initialize(country)
      @country = country
    end

    def call
      # Zone 1: 중국, 홍콩, 싱가포르
      return result('Z1', 'China/HK/SG/TW') if %w[CN HK MO SG TW].include?(@country)

      # Zone 2: 일본
      return result('Z2', 'Japan') if %w[JP].include?(@country)

      # Zone 3: 필리핀, 태국
      return result('Z3', 'PH/TH') if %w[PH TH].include?(@country)

      # Zone 4: 베트남, 인도
      return result('Z4', 'VN/IN') if %w[VN IN].include?(@country)

      # Zone 5: 호주, 캄보디아
      return result('Z5', 'AU/KH') if %w[AU KH].include?(@country)

      # Zone 6: 미국, 캐나다
      return result('Z6', 'US/CA') if %w[US CA].include?(@country)

      # Zone 7: 유럽 (영국/프랑스/독일 등 Major EU + Others)
      if %w[GB FR DE IT ES DK NL BE CH FI SE NO AT PT IE MC CZ PL HU RO BG].include?(@country)
        return result('Z7', 'Europe')
      end

      # Zone 8: 남미, 아프리카, 중동, 동유럽 일부
      if %w[BR AR CL CO ZA EG AE TR BH IL JO LB SA PK].include?(@country)
        return result('Z8', 'S.Am/Africa/ME')
      end

      # Default catch-all
      result('Z8', 'Rest of World')
    end

    private

    def result(rate_key, label)
      { rate_key: rate_key, label: label }
    end
  end
end
