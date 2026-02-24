module Calculators
  class UpsZone
    def self.call(country)
      new(country).call
    end

    def initialize(country)
      @country = country
    end

    def call
      # Zone 1: 싱가포르, 대만, 마카오, 중국
      return result('Z1', 'SG/TW/MO/CN') if %w[SG TW MO CN].include?(@country)

      # Zone 2: 일본, 베트남
      return result('Z2', 'JP/VN') if %w[JP VN].include?(@country)

      # Zone 3: 태국, 필리핀
      return result('Z3', 'TH/PH') if %w[TH PH].include?(@country)

      # Zone 4: 호주, 인도
      return result('Z4', 'AU/IN') if %w[AU IN].include?(@country)

      # Zone 5: 캐나다, 미국
      return result('Z5', 'CA/US') if %w[CA US].include?(@country)

      # Zone 6: 스페인, 이태리, 영국, 프랑스
      return result('Z6', 'ES/IT/GB/FR') if %w[ES IT GB FR].include?(@country)

      # Zone 7: 동유럽, 덴마크, 노르웨이 (그리고 나머지 주요 서유럽도 여기에 편입)
      if %w[DK NO SE FI DE NL BE IE CH AT PT CZ PL HU RO BG].include?(@country)
        return result('Z7', 'EEU/DK/NO')
      end

      # Zone 8: 남미, AE, TR
      return result('Z8', 'S.Am/AE/TR') if %w[AR BR CL CO AE TR].include?(@country)

      # Zone 9: 아프리카, 중동, 파키스탄
      return result('Z9', 'Africa/ME/PK') if %w[ZA EG BH IL JO LB SA PK].include?(@country)

      # Zone 10: 홍콩
      return result('Z10', 'HK') if %w[HK].include?(@country)

      # Default catch-all
      result('Z10', 'Rest of World')
    end

    private

    def result(rate_key, label)
      { rate_key: rate_key, label: label }
    end
  end
end
