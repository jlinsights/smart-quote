export const SURGE_THRESHOLDS = {
    AHS_WEIGHT_KG: 25, // Additional Handling > 25kg
    AHS_DIM_LONG_SIDE_CM: 122, // Longest side > 122cm
    AHS_DIM_SECOND_SIDE_CM: 76, // Second longest > 76cm
    LPS_LENGTH_GIRTH_CM: 300, // Large Package: Length + 2W + 2H > 300cm
    MAX_LIMIT_LENGTH_CM: 274, // Over Max Limits
    MAX_LIMIT_GIRTH_CM: 400
};

export const TRUCK_TIER_LIMITS = [
    { maxWeight: 100, maxCBM: 1, label: "~100kg Pickup" },
    { maxWeight: 500, maxCBM: 3, label: "~500kg Pickup" },
    { maxWeight: 1100, maxCBM: Infinity, label: "1t Truck" },
    { maxWeight: 3500, maxCBM: Infinity, label: "3.5t Truck" },
    { maxWeight: 5000, maxCBM: Infinity, label: "5t Truck" },
    { maxWeight: 11000, maxCBM: Infinity, label: "11t Truck" }
];

export const PACKING_WEIGHT_BUFFER = 1.1; // 10% weight increase
export const PACKING_WEIGHT_ADDITION = 10; // 10kg addition per item
export const INITIAL_MARGIN = 15; // Target 15%
