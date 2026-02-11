module Calculators
  class UpsZone
    def self.call(country)
      new(country).call
    end

    def initialize(country)
      @country = country
    end

    def call
      # C3: China (South Excluded), Macau, Taiwan
      return result('C3', 'China/Taiwan') if ['CN', 'MO', 'TW'].include?(@country)

      # C4: Japan, Vietnam, Singapore, Malaysia, Philippines
      return result('C4', 'Japan/SE Asia 1') if ['JP', 'VN', 'SG', 'MY', 'PH'].include?(@country)

      # C5: Brunei, Indonesia
      return result('C5', 'Indonesia/Brunei') if ['BN', 'ID'].include?(@country)

      # C6: Australia, India, New Zealand
      return result('C6', 'Australia/India') if ['AU', 'IN', 'NZ'].include?(@country)

      # C7: USA, Canada, Mexico, Puerto Rico
      return result('C7', 'North America') if ['US', 'CA', 'MX', 'PR'].include?(@country)

      # C8: Major EU (BE, CZ, GB, FR, DE, IT, MC, NL, ES)
      return result('C8', 'Europe (Major)') if ['BE', 'CZ', 'GB', 'FR', 'DE', 'IT', 'MC', 'NL', 'ES'].include?(@country)

      # C9: Other EU (AT, DK, FI, GR, IE, NO, PT, SE, CH)
      return result('C9', 'Europe (Other)') if ['AT', 'DK', 'FI', 'GR', 'IE', 'NO', 'PT', 'SE', 'CH'].include?(@country)

      # C10: Rest of World Group 1 (Middle East, S.America)
      if ['AR', 'BH', 'BR', 'KH', 'CL', 'CO', 'EG', 'IL', 'JO', 'LB', 'TR', 'SA', 'ZA', 'AE'].include?(@country)
        return result('C10', 'Middle East/S.America')
      end

      # C11: Hong Kong, Albania... (Seems mix of Others)
      return result('C11', 'Hong Kong/Others') if ['HK', 'AL'].include?(@country)

      # Default catch-all (Expensive Zone)
      result('C10', 'Rest of World')
    end

    private

    def result(rate_key, label)
      { rate_key: rate_key, label: label }
    end
  end
end
