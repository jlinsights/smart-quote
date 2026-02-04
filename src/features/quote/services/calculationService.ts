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
  ZONE_BASE_RATES,
  DOMESTIC_RATES,
  SURGE_RATES,
  DEFAULT_EXCHANGE_RATE,
  PACKING_MATERIAL_BASE_COST,
  PACKING_LABOR_UNIT_COST
} from "@/config/rates";
import {
  DEFAULT_COUNTRY_ZONES,
  CN_SOUTH_ZIP_RANGES
} from "@/config/zones";
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

export const determineUpsZone = (country: string, zip: string): { zone: string; label: string } => {
   const cleanZip = zip.replace(/[^0-9]/g, '');
   
   if (country === 'CN') {
       const zipNum = parseInt(cleanZip.substring(0, 6), 10);
       if (!isNaN(zipNum)) {
          for (const range of CN_SOUTH_ZIP_RANGES) {
              if (zipNum >= range.start && zipNum <= range.end) {
                  return { zone: 'Zone 5', label: 'Zone 5 (South China)' };
              }
          }
       }
       return { zone: 'Zone 2', label: 'Zone 2 (North/Rest of China)' };
   }

   if (country === 'US') {
       if (cleanZip.startsWith('8') || cleanZip.startsWith('9')) {
           return { zone: 'Zone 6', label: 'Zone 6 (US West)' };
       }
       if (['4', '5', '6', '7'].some(prefix => cleanZip.startsWith(prefix))) {
           return { zone: 'Zone 7', label: 'Zone 7 (US Midwest/Central)' };
       }
       return { zone: 'Zone 7', label: 'Zone 7 (US East)' };
   }

   const defaultZone = DEFAULT_COUNTRY_ZONES[country] || 'Zone 9';
   return { zone: defaultZone, label: defaultZone };
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

export const calculateUpsCosts = (
  billableWeight: number, 
  country: string, 
  zip: string, 
  fscPercent: number
): UpsCalculationResult => {
    const zoneInfo = determineUpsZone(country, zip);
    const baseRatePerKg = ZONE_BASE_RATES[zoneInfo.zone] || 13500; 

    let upsBase = billableWeight * baseRatePerKg;
    
    if (billableWeight > 100) upsBase *= 0.85;
    else if (billableWeight > 45) upsBase *= 0.90;
  
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
  const upsResult = calculateUpsCosts(billableWeight, input.destinationCountry, input.destinationZip, input.fscPercent);
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