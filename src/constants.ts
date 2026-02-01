import { DomesticRegionCode, Incoterm } from "./types";

// UPS Zone Base Rates (Avg. Net Cost per kg)
// This replaces the single static rate.
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

// Default fallbacks if zip matching fails
export const DEFAULT_COUNTRY_ZONES: Record<string, string> = {
  'JP': 'Zone 1',
  'CN': 'Zone 2', // Default to North
  'VN': 'Zone 3',
  'SG': 'Zone 3',
  'US': 'Zone 7', // Default to East (Expensive)
  'DE': 'Zone 7',
  'GB': 'Zone 7',
};

// China South Zip Ranges (Zone 5)
// Includes: Guangdong, Fujian, Hainan, Guangxi, Yunnan (65-67)
export const CN_SOUTH_ZIP_RANGES = [
    { start: 350000, end: 369999 }, // Fujian
    { start: 510000, end: 539999 }, // Guangdong / Guangxi
    { start: 570000, end: 579999 }, // Hainan
    { start: 650000, end: 679999 }, // Yunnan (Requested)
];

// Market Defaults
export const DEFAULT_EXCHANGE_RATE = 1430; // KRW/USD
export const DEFAULT_FSC_PERCENT = 31.5; // 31.5%

export const WAR_RISK_SURCHARGE_RATE = 0.05; // 5% Peak/War risk

// --- UPS SURGE / DEMAND SURCHARGE POLICY ---
// Based on UPS Surge Fee Policy (Physical Characteristics)
export const SURGE_THRESHOLDS = {
    AHS_WEIGHT_KG: 25, // Additional Handling > 25kg
    AHS_DIM_LONG_SIDE_CM: 122, // Longest side > 122cm
    AHS_DIM_SECOND_SIDE_CM: 76, // Second longest > 76cm
    LPS_LENGTH_GIRTH_CM: 300, // Large Package: Length + 2W + 2H > 300cm
    MAX_LIMIT_LENGTH_CM: 274, // Over Max Limits
    MAX_LIMIT_GIRTH_CM: 400
};

// Estimated Surcharge Rates in KRW (reflecting Demand/Peak additions)
export const SURGE_RATES = {
    AHS_WEIGHT: 40000,    // Additional Handling (Weight)
    AHS_DIMENSION: 35000, // Additional Handling (Dimensions)
    LARGE_PACKAGE: 110000,// Large Package Surcharge
    OVER_MAX: 1200000     // Over Maximum Limits (Penalty)
};

// DB_DOMESTIC_REGIONS
// A~T based on the provided table
export const DOMESTIC_REGIONS: { code: DomesticRegionCode; label: string; cities: string }[] = [
    { code: 'A', label: 'Region A', cities: '서인천, 주안, 부평, 연안부두, 남동, 방화, 공항, 등촌, 가양' },
    { code: 'B', label: 'Region B', cities: '김포, 구로, 마포, 합정, 신월, 부천' },
    { code: 'C', label: 'Region C', cities: '서대문, 용산, 광명, 안산, 시흥, 일산, 영등포, 문래' },
    { code: 'D', label: 'Region D', cities: '강남, 역삼, 양재, 동대문, 안양, 군포, 종로, 을지로, 은평, 신림, 통진, 성수' },
    { code: 'E', label: 'Region E', cities: '송파, 잠실, 천호, 면목, 성남, 수원, 의정부, 수유, 상계, 태능, 파주, 분당' },
    { code: 'F', label: 'Region F', cities: '하남, 구리, 양주, 남양주, 문산' },
    { code: 'G', label: 'Region G', cities: '용인, 동두천, 포천, 오산, 화성, 광주, 강화' },
    { code: 'H', label: 'Region H', cities: '송탄, 평택, 이천, 곤지암' },
    { code: 'I', label: 'Region I', cities: '천안, 입장, 장호원, 안성, 일죽' },
    { code: 'J', label: 'Region J', cities: '음성, 진천, 증평, 아산, 여주' },
    { code: 'K', label: 'Region K', cities: '청주, 조치원, 문막, 오창' },
    { code: 'L', label: 'Region L', cities: '양평, 가평, 원주, 당진, 세종' },
    { code: 'M', label: 'Region M', cities: '대전, 신탄진, 공주, 청원, 춘천, 서산' },
    { code: 'N', label: 'Region N', cities: '충주, 제천, 예산, 홍성, 보령, 연천, 철원' },
    { code: 'O', label: 'Region O', cities: '옥천, 대천, 논산, 부여, 홍천, 전주, 익산, 괴산, 금산, 진안, 평창, 군산' },
    { code: 'P', label: 'Region P', cities: '문경, 광주, 무주, 정읍, 고창, 영월, 단양, 영주' },
    { code: 'Q', label: 'Region Q', cities: '장수, 나주, 무안, 영광' },
    { code: 'R', label: 'Region R', cities: '삼척, 양양, 속초, 동해, 강릉' },
    { code: 'S', label: 'Region S', cities: '목포' },
    { code: 'T', label: 'Region T', cities: '거제도, 통영, 해남, 태백, 여수, 울진' },
];

export const TRUCK_TIER_LIMITS = [
    { maxWeight: 100, maxCBM: 1, label: "~100kg Pickup" },
    { maxWeight: 500, maxCBM: 3, label: "~500kg Pickup" },
    { maxWeight: 1100, maxCBM: Infinity, label: "1t Truck" },
    { maxWeight: 3500, maxCBM: Infinity, label: "3.5t Truck" },
    { maxWeight: 5000, maxCBM: Infinity, label: "5t Truck" },
    { maxWeight: 11000, maxCBM: Infinity, label: "11t Truck" }
];

// DB_DOMESTIC_RATES (Unit: KRW)
// Format: [100kg, 500kg, 1t, 3.5t, 5t, 11t]
// 0 indicates "Negotiated" or "Not Available" for that tier (usually upgrades to next tier)
export const DOMESTIC_RATES: Record<DomesticRegionCode, number[]> = {
    'A': [30000, 40000, 55000, 110000, 120000, 170000],
    'B': [35000, 45000, 60000, 120000, 130000, 180000],
    'C': [40000, 50000, 65000, 130000, 140000, 190000],
    'D': [45000, 55000, 70000, 140000, 150000, 200000],
    'E': [55000, 65000, 80000, 150000, 160000, 210000],
    'F': [60000, 70000, 90000, 160000, 160000, 220000],
    'G': [65000, 75000, 90000, 160000, 170000, 230000],
    'H': [70000, 80000, 100000, 180000, 180000, 240000],
    'I': [75000, 85000, 110000, 190000, 200000, 250000],
    'J': [80000, 95000, 120000, 200000, 210000, 260000],
    'K': [85000, 100000, 130000, 210000, 220000, 270000],
    'L': [90000, 110000, 140000, 230000, 230000, 280000],
    'M': [100000, 120000, 150000, 240000, 250000, 290000],
    'N': [130000, 150000, 180000, 260000, 280000, 330000],
    'O': [0, 0, 190000, 280000, 300000, 370000],
    'P': [0, 0, 210000, 310000, 320000, 400000],
    'Q': [0, 0, 240000, 340000, 400000, 480000],
    'R': [0, 0, 250000, 360000, 420000, 470000],
    'S': [0, 0, 260000, 380000, 440000, 480000],
    'T': [0, 0, 320000, 420000, 460000, 530000],
};

// Cost Constants
export const HANDLING_FEE = 35000; // Export Custom Clearance + Doc
export const FUMIGATION_FEE = 30000; // Heat treatment per shipment (simplified)

// Packing Logic Constants
export const PACKING_WEIGHT_BUFFER = 1.1; // 10% weight increase
export const PACKING_WEIGHT_ADDITION = 10; // 10kg addition per item
export const PACKING_MATERIAL_BASE_COST = 15000; // per m2
export const PACKING_LABOR_UNIT_COST = 50000; // per item

// Initial State
export const INITIAL_MARGIN = 15; // Target 15%

export const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'SG', name: 'Singapore' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
];

export const ORIGIN_COUNTRY_OPTIONS = [
    { code: 'KR', name: 'South Korea' },
    { code: 'CN', name: 'China' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'US', name: 'United States' },
];

export const INCOTERM_OPTIONS = Object.values(Incoterm);

// PDF Layout Configuration
export const PDF_LAYOUT = {
    MARGIN_X: 20,
    LINE_HEIGHT: 7,
    COLORS: {
      PRIMARY: [2, 132, 199] as [number, number, number], // J-Ways Blue
      TEXT: [0, 0, 0] as [number, number, number],
      TEXT_LIGHT: [100, 100, 100] as [number, number, number],
      WARNING: [180, 83, 9] as [number, number, number],
      BG_HEADER: [240, 249, 255] as [number, number, number],
      BG_TABLE: [245, 245, 245] as [number, number, number]
    },
    FONTS: {
      SIZE_HEADER: 22,
      SIZE_SUBHEADER: 12,
      SIZE_NORMAL: 10,
      SIZE_SMALL: 8
    }
};