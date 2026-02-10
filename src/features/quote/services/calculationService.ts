import { 
  QuoteInput, 
  QuoteResult, 
  PackingType, 
  Incoterm,
  CargoItem,
  DomesticRegionCode
} from "@/types";
import { 
  WAR_RISK_SURCHARGE_RATE, 
  HANDLING_FEE, 
  FUMIGATION_FEE,
  DOMESTIC_RATES,
  SURGE_RATES,
  DEFAULT_EXCHANGE_RATE,
  PACKING_MATERIAL_BASE_COST,
  PACKING_LABOR_UNIT_COST
} from "@/config/rates";
import {
  SURGE_THRESHOLDS,
  PACKING_WEIGHT_BUFFER,
  PACKING_WEIGHT_ADDITION,
  TRUCK_TIER_LIMITS
} from "@/config/business-rules";

// --- Types for Internal Calculations ---
interface ItemCalculationResult {
  totalActualWeight: number;
  totalPackedVolumetricWeight: number;
  totalCBM: number;
  packingMaterialCost: number;
  packingLaborCost: number;
  upsSurgeCost: number;
  warnings: string[];
}

interface DomesticCalculationResult {
  domesticBase: number;
  domesticSurcharge: number;
  truckType: string;
  warnings: string[];
}

interface UpsCalculationResult {
  upsBase: number;
  upsFsc: number;
  upsWarRisk: number;
  appliedZone: string;
  transitTime: string;
}

// --- Helper Functions ---

export const calculateVolumetricWeight = (l: number, w: number, h: number) => {
  return (Math.ceil(l) * Math.ceil(w) * Math.ceil(h)) / 5000;
};

export const calculateCBM = (l: number, w: number, h: number) => {
  return (l * w * h) / 1000000;
};

export const determineUpsZone = (country: string): { rateKey: string; label: string } => {
   // Mapping based on "수출 EXPRESS SAVER" Tariff (2025)
   
   // C3: China (South Excluded), Macau, Taiwan
   if (['CN', 'MO', 'TW'].includes(country)) return { rateKey: 'C3', label: 'China/Taiwan' };

   // C4: Japan, Vietnam, Singapore, Malaysia, Philippines
   if (['JP', 'VN', 'SG', 'MY', 'PH'].includes(country)) return { rateKey: 'C4', label: 'Japan/SE Asia 1' };

   // C5: Brunei, Indonesia
   if (['BN', 'ID'].includes(country)) return { rateKey: 'C5', label: 'Indonesia/Brunei' };

   // C6: Australia, India, New Zealand
   if (['AU', 'IN', 'NZ'].includes(country)) return { rateKey: 'C6', label: 'Australia/India' };

   // C7: USA, Canada, Mexico, Puerto Rico
   if (['US', 'CA', 'MX', 'PR'].includes(country)) return { rateKey: 'C7', label: 'North America' };

   // C8: Major EU (BE, CZ, GB, FR, DE, IT, MC, NL)
   if (['BE', 'CZ', 'GB', 'FR', 'DE', 'IT', 'MC', 'NL', 'ES'].includes(country)) return { rateKey: 'C8', label: 'Europe (Major)' };

   // C9: Other EU (AT, DK, FI, GR, IE, NO, PT)
   if (['AT', 'DK', 'FI', 'GR', 'IE', 'NO', 'PT', 'SE', 'CH'].includes(country)) return { rateKey: 'C9', label: 'Europe (Other)' };

   // C10: Rest of World Group 1 (Middle East, S.America)
   // Sample: AR, BH, BR, KH, CL, CO, EG, IL, JO, LB...
   if (['AR', 'BH', 'BR', 'KH', 'CL', 'CO', 'EG', 'IL', 'JO', 'LB', 'TR', 'SA', 'ZA', 'AE'].includes(country)) return { rateKey: 'C10', label: 'Middle East/S.America' };

   // C11: Hong Kong, Albania... (Seems mix of Others)
   if (['HK', 'AL'].includes(country)) return { rateKey: 'C11', label: 'Hong Kong/Others' };

   // Default catch-all (Expensive Zone)
   return { rateKey: 'C10', label: 'Rest of World' };
};

export const calculateItemSurge = (
  l: number, 
  w: number, 
  h: number, 
  weight: number, 
  packingType: PackingType,
  itemIndex: number
): { surgeCost: number; warnings: string[] } => {
    let surgeCost = 0;
    const warnings: string[] = [];
    
    const sortedDims = [l, w, h].sort((a, b) => b - a);
    const longest = sortedDims[0];
    const secondLongest = sortedDims[1];
    const actualGirth = longest + (2 * secondLongest) + (2 * sortedDims[2]);

    let packageSurgeApplied = false;
    let surgeReason = "";

    if (longest > SURGE_THRESHOLDS.MAX_LIMIT_LENGTH_CM || weight > 70 || actualGirth > SURGE_THRESHOLDS.MAX_LIMIT_GIRTH_CM) {
        surgeCost += SURGE_RATES.OVER_MAX;
        warnings.push(`Box #${itemIndex + 1}: Exceeds Max Limits (L>${SURGE_THRESHOLDS.MAX_LIMIT_LENGTH_CM}cm or >70kg). Heavy penalty applied.`);
        packageSurgeApplied = true;
    } 
    else if (actualGirth > SURGE_THRESHOLDS.LPS_LENGTH_GIRTH_CM) {
        surgeCost += SURGE_RATES.LARGE_PACKAGE;
        surgeReason = "Large Package (L+Girth > 300cm)";
        packageSurgeApplied = true;
    }
    
    if (!packageSurgeApplied || surgeReason.includes("Large Package")) {
        if (weight > SURGE_THRESHOLDS.AHS_WEIGHT_KG) {
             surgeCost += SURGE_RATES.AHS_WEIGHT;
             if (!packageSurgeApplied) surgeReason = "AHS Weight (>25kg)";
             else surgeReason += " + AHS Weight";
             packageSurgeApplied = true;
        }
        else if (!surgeReason.includes("Large Package")) {
            if (longest > SURGE_THRESHOLDS.AHS_DIM_LONG_SIDE_CM || secondLongest > SURGE_THRESHOLDS.AHS_DIM_SECOND_SIDE_CM) {
                surgeCost += SURGE_RATES.AHS_DIMENSION;
                surgeReason = "AHS Dim (L>122 or W>76)";
                packageSurgeApplied = true;
            }
            else if ([PackingType.WOODEN_BOX, PackingType.SKID].includes(packingType)) {
                surgeCost += SURGE_RATES.AHS_DIMENSION;
                surgeReason = "AHS Packing (Wood/Skid)";
                packageSurgeApplied = true;
            }
        }
    }

    if (packageSurgeApplied && warnings.length === 0) {
         warnings.push(`Box #${itemIndex + 1}: ${surgeReason} applied.`);
    }

    return { surgeCost, warnings };
};

export const calculateItemCosts = (items: CargoItem[], packingType: PackingType, manualPackingCost?: number): ItemCalculationResult => {
  let totalActualWeight = 0;
  let totalPackedVolumetricWeight = 0;
  let totalCBM = 0;
  let packingMaterialCost = 0;
  let packingLaborCost = 0;
  let upsSurgeCost = 0;
  const warnings: string[] = [];

  items.forEach((item, index) => {
    let l = item.length;
    let w = item.width;
    let h = item.height;
    let weight = item.weight;

    // Packing impact
    if (packingType !== PackingType.NONE) {
      l += 10; 
      w += 10; 
      h += 15;
      weight = weight * PACKING_WEIGHT_BUFFER + PACKING_WEIGHT_ADDITION; 
      
      const surfaceAreaM2 = (2 * (l*w + l*h + w*h)) / 10000;
      packingMaterialCost += surfaceAreaM2 * PACKING_MATERIAL_BASE_COST * item.quantity;
      packingLaborCost += PACKING_LABOR_UNIT_COST * item.quantity;
      
      if (packingType === PackingType.VACUUM) {
         packingLaborCost *= 1.5;
      }
    }
    
    // Surge Logic
    for (let q = 0; q < item.quantity; q++) {
        const surgeResult = calculateItemSurge(l, w, h, weight, packingType, index);
        upsSurgeCost += surgeResult.surgeCost;
        if (q === 0) {
            warnings.push(...surgeResult.warnings);
        }
    }

    totalActualWeight += weight * item.quantity;
    totalPackedVolumetricWeight += calculateVolumetricWeight(l, w, h) * item.quantity;
    totalCBM += calculateCBM(l, w, h) * item.quantity;
  });

  // Manual Override Logic
  if (manualPackingCost !== undefined && manualPackingCost >= 0) {
      packingMaterialCost = manualPackingCost;
      packingLaborCost = 0;
  }

  return {
    totalActualWeight,
    totalPackedVolumetricWeight,
    totalCBM,
    packingMaterialCost,
    packingLaborCost,
    upsSurgeCost,
    warnings
  };
};

export const calculateDomesticCosts = (
  totalActualWeight: number, 
  totalCBM: number, 
  regionCode: DomesticRegionCode, 
  isJejuPickup: boolean, 
  manualDomesticCost?: number,
  itemCount: number = 1
): DomesticCalculationResult => {
    let domesticBase = 0;
    let domesticSurcharge = 0;
    let truckType = "Parcel/Small";
    const warnings: string[] = [];
    
    const rates = DOMESTIC_RATES[regionCode] || DOMESTIC_RATES['A'];
    
    let tierIndex = TRUCK_TIER_LIMITS.findIndex(limit => 
        totalActualWeight <= limit.maxWeight && totalCBM <= limit.maxCBM
    );

    if (tierIndex === -1) {
        tierIndex = TRUCK_TIER_LIMITS.length - 1;
        truckType = "11t Truck (Overweight)";
        warnings.push("Cargo exceeds 11t. Multiple trucks may be required. Quoted at max single truck rate.");
    } else {
        truckType = TRUCK_TIER_LIMITS[tierIndex].label;
    }

    let selectedRate = rates[tierIndex];

    if (manualDomesticCost !== undefined && manualDomesticCost > 0) {
        domesticBase = manualDomesticCost;
        truckType = `${truckType} (Manual Rate)`;
    } else {
        if (selectedRate === 0) {
            let upgradedIndex = -1;
            for (let i = tierIndex + 1; i < rates.length; i++) {
                if (rates[i] > 0) {
                    selectedRate = rates[i];
                    upgradedIndex = i;
                    break;
                }
            }

            if (upgradedIndex !== -1) {
                domesticBase = selectedRate;
                truckType = `${TRUCK_TIER_LIMITS[upgradedIndex].label} (Auto-Upgrade)`;
                warnings.push(`Standard rate unavailable for Region ${regionCode}. Defaulted to ${TRUCK_TIER_LIMITS[upgradedIndex].label}. Please negotiate and enter 'Domestic Cost' manually.`);
                tierIndex = upgradedIndex; 
            } else {
                warnings.push(`No valid domestic rate found for Region ${regionCode}.`);
            }
        } else {
            domesticBase = selectedRate;
        }
    }

    if (isJejuPickup) {
        if (tierIndex >= 2) {
             domesticSurcharge = domesticBase * 1.0; 
             warnings.push("Jeju/Island Pickup: 100% Surcharge applied for ferry and remote trucking.");
        } else {
             domesticSurcharge = 3000 * itemCount;
             if (domesticSurcharge === 0) domesticSurcharge = 50000; 
             warnings.push("Jeju/Island Pickup: Parcel surcharge applied.");
        }
    }

    return { domesticBase, domesticSurcharge, truckType, warnings };
};


import { UPS_EXACT_RATES, UPS_RANGE_RATES } from "@/config/ups_tariff";

export const calculateUpsCosts = (
  billableWeight: number, 
  country: string, 
  fscPercent: number
): UpsCalculationResult => {
    const zoneInfo = determineUpsZone(country);
    const zoneKey = zoneInfo.rateKey; 

    let upsBase = 0;

    // Helper to round up to nearest 0.5
    const roundToHalf = (num: number) => Math.ceil(num * 2) / 2;
    
    // Logic: 
    // 1. Check Exact Rates (usually up to 20kg)
    // 2. Check Range Rates (usually > 20kg, e.g. 21-1000kg)

    const lookupWeight = roundToHalf(billableWeight);
    const zoneRates = UPS_EXACT_RATES[zoneKey];
    
    // Check if exact match exists
    if (zoneRates && zoneRates[lookupWeight]) {
        upsBase = zoneRates[lookupWeight];
    } else {
        // If not in exact rates, check Range Rates.
        const range = UPS_RANGE_RATES.find(r => billableWeight >= r.min && billableWeight <= r.max);
        
        if (range) {
             // Cast to any to avoid generic key indexing issues or use specific type if available
             const rates = range.rates as Record<string, number>;
             if (rates[zoneKey]) {
                 const perKgRate = rates[zoneKey];
                 const multiplierWeight = Math.ceil(billableWeight); 
                 upsBase = multiplierWeight * perKgRate;
             }
        } else {
             // Fallback logic
             if (zoneRates) {
                 const weights = Object.keys(zoneRates).map(Number).sort((a, b) => a - b);
                 const found = weights.find(w => w >= lookupWeight);
                 if (found) {
                     upsBase = zoneRates[found];
                 } else {
                     // Check next range if exact fails
                     const nextRange = UPS_RANGE_RATES.find(r => r.min <= Math.ceil(billableWeight));
                     if (nextRange) {
                         const rates = nextRange.rates as Record<string, number>;
                         if (rates[zoneKey]) {
                             upsBase = Math.ceil(billableWeight) * rates[zoneKey];
                         }
                     }
                 }
             }
        }
    }
    
    const fscRate = (fscPercent || 0) / 100;
    const upsFsc = upsBase * fscRate;
    const upsWarRisk = upsBase * WAR_RISK_SURCHARGE_RATE;

    return {
      upsBase,
      upsFsc,
      upsWarRisk,
      appliedZone: zoneInfo.label,
      transitTime: '3-5 Business Days'
    };
};


// --- Main Orchestrator ---

export const calculateQuote = (input: QuoteInput): QuoteResult => {
  // 1. Calculate Item Costs (Packing, Surge, Weights)
  const itemResult = calculateItemCosts(input.items, input.packingType, input.manualPackingCost);
  
  let packingFumigationCost = 0;
  if (input.packingType !== PackingType.NONE) {
    packingFumigationCost = FUMIGATION_FEE;
  }
  
  let finalHandlingFee = HANDLING_FEE;
  // Manual override zeroes out specific components if applied
  if (input.manualPackingCost !== undefined && input.manualPackingCost >= 0) {
      packingFumigationCost = 0;
      finalHandlingFee = 0;
  }

  const packingTotal = itemResult.packingMaterialCost + itemResult.packingLaborCost + packingFumigationCost;

  // 2. Billable Weight
  const billableWeight = Math.max(itemResult.totalActualWeight, itemResult.totalPackedVolumetricWeight);
  const userWarnings = [...itemResult.warnings];

  if (itemResult.totalPackedVolumetricWeight > itemResult.totalActualWeight * 1.2) {
    userWarnings.push("High Volumetric Weight Detected (>20% over actual). Consider Repacking.");
  }

  // 3. Domestic Costs
  const totalItemsCount = input.items.reduce((acc, i) => acc + i.quantity, 0);
  const domesticResult = calculateDomesticCosts(
    itemResult.totalActualWeight, 
    itemResult.totalCBM, 
    input.domesticRegionCode, 
    input.isJejuPickup, 
    input.manualDomesticCost,
    totalItemsCount
  );
  userWarnings.push(...domesticResult.warnings);

  // 4. UPS Costs
  const upsResult = calculateUpsCosts(billableWeight, input.destinationCountry, input.fscPercent);
  const upsTotal = upsResult.upsBase + upsResult.upsFsc + upsResult.upsWarRisk + itemResult.upsSurgeCost;

  // 5. Duty
  let destDuty = 0;
  if (input.incoterm === Incoterm.DDP) {
    destDuty = input.dutyTaxEstimate;
  }

  // 6. Totals
  const domesticTotal = domesticResult.domesticBase + domesticResult.domesticSurcharge;
  const totalCostAmount = domesticTotal + packingTotal + finalHandlingFee + upsTotal + destDuty;
  
  let quoteBasisCost = 0;
  if ([Incoterm.EXW, Incoterm.FOB].includes(input.incoterm)) {
     quoteBasisCost = domesticTotal + packingTotal + finalHandlingFee;
     userWarnings.push("Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner.");
  } else {
     quoteBasisCost = totalCostAmount;
  }

  // 7. Margin & Revenue
  const safeMarginPercent = Math.min(Math.max(input.marginPercent, 0), 99);
  const marginRate = safeMarginPercent / 100;
  
  let targetRevenue = 0;
  if (marginRate < 1) {
      targetRevenue = quoteBasisCost / (1 - marginRate);
  } else {
      targetRevenue = quoteBasisCost * 2; 
      userWarnings.push("Invalid margin rate. Defaulted to markup.");
  }
  
  const marginAmount = targetRevenue - quoteBasisCost;
  const totalQuoteAmount = Math.ceil(targetRevenue / 100) * 100; 

  const exchangeRate = input.exchangeRate || DEFAULT_EXCHANGE_RATE;
  const totalQuoteAmountUSD = totalQuoteAmount / exchangeRate;

  if (input.marginPercent < 10) {
    userWarnings.push("Low Margin Alert: Profit margin is below 10%. Approval required.");
  }

  return {
    totalQuoteAmount,
    totalQuoteAmountUSD,
    totalCostAmount,
    profitAmount: marginAmount,
    profitMargin: input.marginPercent,
    currency: 'KRW',
    totalActualWeight: itemResult.totalActualWeight,
    totalVolumetricWeight: itemResult.totalPackedVolumetricWeight,
    billableWeight,
    appliedZone: upsResult.appliedZone,
    transitTime: upsResult.transitTime,
    domesticTruckType: domesticResult.truckType,
    isFreightMode: domesticResult.truckType.includes("Truck"),
    warnings: userWarnings,
    breakdown: {
      domesticBase: domesticResult.domesticBase,
      domesticSurcharge: domesticResult.domesticSurcharge,
      packingMaterial: itemResult.packingMaterialCost,
      packingLabor: itemResult.packingLaborCost,
      packingFumigation: packingFumigationCost,
      handlingFees: finalHandlingFee,
      upsBase: upsResult.upsBase,
      upsFsc: upsResult.upsFsc,
      upsWarRisk: upsResult.upsWarRisk,
      upsSurge: itemResult.upsSurgeCost,
      destDuty,
      totalCost: totalCostAmount
    }
  };
};