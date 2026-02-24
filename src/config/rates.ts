export const ZONE_BASE_RATES: Record<string, number> = {
  'Zone 1': 4500,  // JP
  'Zone 2': 5500,  // CN (North/East)
  'Zone 3': 6000,  // SG, VN, HK
  'Zone 4': 8500,  // AU, NZ
  'Zone 5': 5800,  // CN (South)
  'Zone 6': 9200,  // US (West)
  'Zone 7': 10500, // US (East/Central), EU (DE, GB, FR)
  'Zone 8': 12000, // Middle East, Africa
  'Zone 9': 13500, // South America, Others
};

export const SURGE_RATES = {
    AHS_WEIGHT: 40000,    // Additional Handling (Weight)
    AHS_DIMENSION: 35000, // Additional Handling (Dimensions)
    LARGE_PACKAGE: 110000,// Large Package Surcharge
    OVER_MAX: 1200000     // Over Maximum Limits (Penalty)
};

export const HANDLING_FEE = 35000; 
export const FUMIGATION_FEE = 30000;
export const WAR_RISK_SURCHARGE_RATE = 0.05; // 5%
export const PACKING_MATERIAL_BASE_COST = 15000; // per m2
export const PACKING_LABOR_UNIT_COST = 50000; // per item

// Market Defaults
export const DEFAULT_EXCHANGE_RATE = 1430; 
export const DEFAULT_FSC_PERCENT = 30.25; 
export const UPS_FSC_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page";
export const NAVER_EXCHANGE_RATE_URL = "https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW";
export const UPS_RATES_HUB_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates";
