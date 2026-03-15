export const SURGE_RATES = {
    AHS_WEIGHT: 40000,    // Additional Handling (Weight)
    AHS_DIMENSION: 35000, // Additional Handling (Dimensions)
    LARGE_PACKAGE: 110000,// Large Package Surcharge
    OVER_MAX: 1200000     // Over Maximum Limits (Penalty)
};

export const HANDLING_FEE = 35000;
export const FUMIGATION_FEE = 30000;
export const WAR_RISK_SURCHARGE_RATE = 0; // DEC-006: War risk surcharge removed (synced with backend rates.rb)
export const PACKING_MATERIAL_BASE_COST = 15000; // per m2
export const PACKING_LABOR_UNIT_COST = 50000; // per item

// Market Defaults
export const DEFAULT_EXCHANGE_RATE = 1400;
export const DEFAULT_FSC_PERCENT = 38.5; // UPS default, verified 2026-03-15
export const UPS_FSC_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page";
export const UPS_RATES_HUB_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates";
export const DHL_FSC_URL = "https://mydhl.express.dhl/kr/ko/ship/surcharges.html#/fuel_surcharge";
