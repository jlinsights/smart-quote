import { 
  QuoteInput, 
  QuoteResult, 
  PackingType, 
  Incoterm,
  CargoItem
} from "@/types";
import { 
  WAR_RISK_SURCHARGE_RATE, 
  HANDLING_FEE, 
  FUMIGATION_FEE,
  SURGE_RATES,
  DEFAULT_EXCHANGE_RATE,
  PACKING_MATERIAL_BASE_COST,
  PACKING_LABOR_UNIT_COST
} from "@/config/rates";
import {
  SURGE_THRESHOLDS,
  PACKING_WEIGHT_BUFFER,
  PACKING_WEIGHT_ADDITION
} from "@/config/business-rules";

// --- Types for Internal Calculations ---
interface ItemCalculationResult {
  totalActualWeight: number;
  totalPackedVolumetricWeight: number;
  totalCBM: number;
  packingMaterialCost: number;
  packingLaborCost: number;
  surgeCost: number;
  warnings: string[];
}

interface CarrierCostResult {
  intlBase: number;
  intlFsc: number;
  intlWarRisk: number;
  appliedZone: string;
  transitTime: string;
}

// --- Helper Functions ---

export const calculateVolumetricWeight = (l: number, w: number, h: number, divisor: number = 5000) => {
  return (Math.ceil(l) * Math.ceil(w) * Math.ceil(h)) / divisor;
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

export const calculateItemCosts = (items: CargoItem[], packingType: PackingType, manualPackingCost?: number, volumetricDivisor: number = 5000): ItemCalculationResult => {
  let totalActualWeight = 0;
  let totalPackedVolumetricWeight = 0;
  let totalCBM = 0;
  let packingMaterialCost = 0;
  let packingLaborCost = 0;
  let surgeCost = 0;
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
        surgeCost += surgeResult.surgeCost;
        if (q === 0) {
            warnings.push(...surgeResult.warnings);
        }
    }

    totalActualWeight += weight * item.quantity;
    totalPackedVolumetricWeight += calculateVolumetricWeight(l, w, h, volumetricDivisor) * item.quantity;
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
    surgeCost,
    warnings
  };
};

import { UPS_EXACT_RATES, UPS_RANGE_RATES } from "@/config/ups_tariff";

export const calculateUpsCosts = (
  billableWeight: number,
  country: string,
  fscPercent: number
): CarrierCostResult => {
    const zoneInfo = determineUpsZone(country);
    const zoneKey = zoneInfo.rateKey;

    let intlBase = 0;

    // Helper to round up to nearest 0.5
    const roundToHalf = (num: number) => Math.ceil(num * 2) / 2;

    // Logic:
    // 1. Check Exact Rates (usually up to 20kg)
    // 2. Check Range Rates (usually > 20kg, e.g. 21-1000kg)

    const lookupWeight = roundToHalf(billableWeight);
    const zoneRates = UPS_EXACT_RATES[zoneKey];

    // Check if exact match exists
    if (zoneRates && zoneRates[lookupWeight]) {
        intlBase = zoneRates[lookupWeight];
    } else {
        // If not in exact rates, check Range Rates.
        const range = UPS_RANGE_RATES.find(r => billableWeight >= r.min && billableWeight <= r.max);

        if (range) {
             const rates = range.rates as Record<string, number>;
             if (rates[zoneKey]) {
                 const perKgRate = rates[zoneKey];
                 const multiplierWeight = Math.ceil(billableWeight);
                 intlBase = multiplierWeight * perKgRate;
             }
        } else {
             // Fallback logic
             if (zoneRates) {
                 const weights = Object.keys(zoneRates).map(Number).sort((a, b) => a - b);
                 const found = weights.find(w => w >= lookupWeight);
                 if (found) {
                     intlBase = zoneRates[found];
                 } else {
                     // Check next range if exact fails
                     const nextRange = UPS_RANGE_RATES.find(r => r.min <= Math.ceil(billableWeight));
                     if (nextRange) {
                         const rates = nextRange.rates as Record<string, number>;
                         if (rates[zoneKey]) {
                             intlBase = Math.ceil(billableWeight) * rates[zoneKey];
                         }
                     }
                 }
             }
        }
    }

    const fscRate = (fscPercent || 0) / 100;
    const intlFsc = intlBase * fscRate;
    const intlWarRisk = intlBase * WAR_RISK_SURCHARGE_RATE;

    return {
      intlBase,
      intlFsc,
      intlWarRisk,
      appliedZone: zoneInfo.label,
      transitTime: '3-5 Business Days'
    };
};


// --- DHL Calculator ---

import { DHL_EXACT_RATES, DHL_RANGE_RATES } from "@/config/dhl_tariff";
import { EMAX_RATES, EMAX_HANDLING_CHARGE } from "@/config/emax_tariff";

export const determineDhlZone = (country: string): { rateKey: string; label: string } => {
  if (['CN', 'HK', 'MO', 'SG', 'TW'].includes(country)) return { rateKey: 'Z1', label: 'CN/HK/SG/TW' };
  if (['JP'].includes(country)) return { rateKey: 'Z2', label: 'Japan' };
  if (['PH', 'TH'].includes(country)) return { rateKey: 'Z3', label: 'PH/TH' };
  if (['VN', 'IN'].includes(country)) return { rateKey: 'Z4', label: 'VN/IN' };
  if (['AU', 'KH'].includes(country)) return { rateKey: 'Z5', label: 'AU/KH' };
  if (['US', 'CA'].includes(country)) return { rateKey: 'Z6', label: 'US/CA' };
  if (['GB', 'FR', 'DE', 'IT', 'ES', 'DK', 'NL', 'BE', 'CH', 'FI', 'SE', 'NO', 'AT', 'PT', 'IE', 'MC', 'CZ', 'PL', 'HU', 'RO', 'BG'].includes(country))
    return { rateKey: 'Z7', label: 'Europe' };
  // Z8 = default
  return { rateKey: 'Z8', label: 'Rest of World' };
};

export const calculateDhlCosts = (
  billableWeight: number,
  country: string,
  fscPercent: number
): CarrierCostResult => {
  const zoneInfo = determineDhlZone(country);
  const zoneKey = zoneInfo.rateKey;
  let intlBase = 0;

  const roundToHalf = (num: number) => Math.ceil(num * 2) / 2;
  const lookupWeight = roundToHalf(billableWeight);
  const zoneRates = DHL_EXACT_RATES[zoneKey];

  if (zoneRates && zoneRates[lookupWeight]) {
    intlBase = zoneRates[lookupWeight];
  } else {
    const range = DHL_RANGE_RATES.find(r => billableWeight >= r.min && billableWeight <= r.max);
    if (range) {
      const rates = range.rates as Record<string, number>;
      if (rates[zoneKey]) {
        intlBase = Math.ceil(billableWeight) * rates[zoneKey];
      }
    } else if (zoneRates) {
      const weights = Object.keys(zoneRates).map(Number).sort((a, b) => a - b);
      const found = weights.find(w => w >= lookupWeight);
      if (found) {
        intlBase = zoneRates[found];
      } else {
        const nextRange = DHL_RANGE_RATES.find(r => r.min <= Math.ceil(billableWeight));
        if (nextRange) {
          const rates = nextRange.rates as Record<string, number>;
          if (rates[zoneKey]) {
            intlBase = Math.ceil(billableWeight) * rates[zoneKey];
          }
        }
      }
    }
  }

  const fscRate = (fscPercent || 0) / 100;
  const intlFsc = intlBase * fscRate;
  const intlWarRisk = intlBase * WAR_RISK_SURCHARGE_RATE;

  return {
    intlBase,
    intlFsc,
    intlWarRisk,
    appliedZone: zoneInfo.label,
    transitTime: '3-7 Business Days (DHL)',
  };
};

// --- EMAX Calculator ---

export const calculateEmaxCosts = (
  billableWeight: number,
  country: string
): CarrierCostResult => {
  const countryKey = country === 'CN' ? 'CN' : 'VN';
  const perKgRate = EMAX_RATES[countryKey] ?? EMAX_RATES['VN'];
  const intlBase = Math.ceil(billableWeight) * perKgRate + EMAX_HANDLING_CHARGE;

  return {
    intlBase,
    intlFsc: 0,
    intlWarRisk: 0,
    appliedZone: `E-MAX ${countryKey}`,
    transitTime: '5-10 Business Days (E-MAX)',
  };
};

// --- Main Orchestrator ---

export const calculateQuote = (input: QuoteInput): QuoteResult => {
  const carrier = input.overseasCarrier || 'UPS';
  const isEmax = carrier === 'EMAX';
  const volumetricDivisor = isEmax ? 6000 : 5000;

  // 1. Calculate Item Costs (Packing, Surge, Weights)
  const itemResult = calculateItemCosts(input.items, input.packingType, input.manualPackingCost, volumetricDivisor);

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

  // 3. Carrier Costs (routing by carrier)
  let carrierResult: CarrierCostResult;
  switch (carrier) {
    case 'DHL':
      carrierResult = calculateDhlCosts(billableWeight, input.destinationCountry, input.fscPercent);
      break;
    case 'EMAX':
      carrierResult = calculateEmaxCosts(billableWeight, input.destinationCountry);
      break;
    default:
      carrierResult = calculateUpsCosts(billableWeight, input.destinationCountry, input.fscPercent);
      break;
  }

  const intlTotal = carrierResult.intlBase + carrierResult.intlFsc + carrierResult.intlWarRisk + itemResult.surgeCost;

  // 4. Duty
  let destDuty = 0;
  if (input.incoterm === Incoterm.DDP) {
    destDuty = input.dutyTaxEstimate;
  }

  // 5. Totals
  const totalCostAmount = packingTotal + finalHandlingFee + intlTotal + destDuty;

  let quoteBasisCost = 0;
  if ([Incoterm.EXW, Incoterm.FOB].includes(input.incoterm)) {
     quoteBasisCost = packingTotal + finalHandlingFee;
     userWarnings.push("Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner.");
  } else {
     quoteBasisCost = totalCostAmount;
  }

  // 6. Margin & Revenue
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
    appliedZone: carrierResult.appliedZone,
    transitTime: carrierResult.transitTime,
    carrier,
    warnings: userWarnings,
    breakdown: {
      packingMaterial: itemResult.packingMaterialCost,
      packingLabor: itemResult.packingLaborCost,
      packingFumigation: packingFumigationCost,
      handlingFees: finalHandlingFee,
      intlBase: carrierResult.intlBase,
      intlFsc: carrierResult.intlFsc,
      intlWarRisk: carrierResult.intlWarRisk,
      intlSurge: itemResult.surgeCost,
      destDuty,
      totalCost: totalCostAmount
    }
  };
};