module Constants
  module Rates
    ZONE_BASE_RATES = {
      'Zone 1' => 4500,  # JP
      'Zone 2' => 5500,  # CN (North/East)
      'Zone 3' => 6000,  # SG, VN, HK
      'Zone 4' => 8500,  # AU, NZ
      'Zone 5' => 5800,  # CN (South)
      'Zone 6' => 9200,  # US (West)
      'Zone 7' => 10500, # US (East/Central), EU (DE, GB, FR)
      'Zone 8' => 12000, # Middle East, Africa
      'Zone 9' => 13500, # South America, Others
    }

    SURGE_RATES = {
        AHS_WEIGHT: 40000,    # Additional Handling (Weight)
        AHS_DIMENSION: 35000, # Additional Handling (Dimensions)
        LARGE_PACKAGE: 110000,# Large Package Surcharge
        OVER_MAX: 1200000     # Over Maximum Limits (Penalty)
    }

    # Unit: KRW
    # Format: [100kg, 500kg, 1t, 3.5t, 5t, 11t]
    DOMESTIC_RATES = {
        'A' => [30000, 40000, 55000, 110000, 120000, 170000],
        'B' => [35000, 45000, 60000, 120000, 130000, 180000],
        'C' => [40000, 50000, 65000, 130000, 140000, 190000],
        'D' => [45000, 55000, 70000, 140000, 150000, 200000],
        'E' => [55000, 65000, 80000, 150000, 160000, 210000],
        'F' => [60000, 70000, 90000, 160000, 160000, 220000],
        'G' => [65000, 75000, 90000, 160000, 170000, 230000],
        'H' => [70000, 80000, 100000, 180000, 180000, 240000],
        'I' => [75000, 85000, 110000, 190000, 200000, 250000],
        'J' => [80000, 95000, 120000, 200000, 210000, 260000],
        'K' => [85000, 100000, 130000, 210000, 220000, 270000],
        'L' => [90000, 110000, 140000, 230000, 230000, 280000],
        'M' => [100000, 120000, 150000, 240000, 250000, 290000],
        'N' => [130000, 150000, 180000, 260000, 280000, 330000],
        'O' => [0, 0, 190000, 280000, 300000, 370000],
        'P' => [0, 0, 210000, 310000, 320000, 400000],
        'Q' => [0, 0, 240000, 340000, 400000, 480000],
        'R' => [0, 0, 250000, 360000, 420000, 470000],
        'S' => [0, 0, 260000, 380000, 440000, 480000],
        'T' => [0, 0, 320000, 420000, 460000, 530000],
    }

    HANDLING_FEE = 35000
    FUMIGATION_FEE = 30000
    WAR_RISK_SURCHARGE_RATE = 0.05
    PACKING_MATERIAL_BASE_COST = 15000
    PACKING_LABOR_UNIT_COST = 50000
    DEFAULT_EXCHANGE_RATE = 1430
    DEFAULT_FSC_PERCENT = 30.25
    UPS_FSC_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page"
    NAVER_EXCHANGE_RATE_URL = "https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW"
    UPS_RATES_HUB_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates"
  end
end
