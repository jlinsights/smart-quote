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
import { UPS_EXACT_RATES, UPS_RANGE_RATES } from "@/config/ups_tariff";
import { DHL_EXACT_RATES, DHL_RANGE_RATES } from "@/config/dhl_tariff";
import { EMAX_RATES, EMAX_HANDLING_CHARGE } from "@/config/emax_tariff";

// --- Types for Internal Calculations ---
interface ItemCalculationResult {
  totalActualWeight: number;
  totalPackedVolumetricWeight: number;
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

export const determineUpsZone = (country: string): { rateKey: string; label: string } => {
   // Aligned with backend Calculators::UpsZone (Z1-Z10)

   // Z1: SG, TW, MO, CN
   if (['SG', 'TW', 'MO', 'CN'].includes(country)) return { rateKey: 'Z1', label: 'SG/TW/MO/CN' };

   // Z2: JP, VN
   if (['JP', 'VN'].includes(country)) return { rateKey: 'Z2', label: 'JP/VN' };

   // Z3: TH, PH
   if (['TH', 'PH'].includes(country)) return { rateKey: 'Z3', label: 'TH/PH' };

   // Z4: AU, IN
   if (['AU', 'IN'].includes(country)) return { rateKey: 'Z4', label: 'AU/IN' };

   // Z5: CA, US
   if (['CA', 'US'].includes(country)) return { rateKey: 'Z5', label: 'CA/US' };

   // Z6: ES, IT, GB, FR
   if (['ES', 'IT', 'GB', 'FR'].includes(country)) return { rateKey: 'Z6', label: 'ES/IT/GB/FR' };

   // Z7: DK, NO, SE, FI, DE, NL, BE, IE, CH, AT, PT, CZ, PL, HU, RO, BG
   if (['DK', 'NO', 'SE', 'FI', 'DE', 'NL', 'BE', 'IE', 'CH', 'AT', 'PT', 'CZ', 'PL', 'HU', 'RO', 'BG'].includes(country))
     return { rateKey: 'Z7', label: 'EEU/DK/NO' };

   // Z8: AR, BR, CL, CO, AE, TR
   if (['AR', 'BR', 'CL', 'CO', 'AE', 'TR'].includes(country)) return { rateKey: 'Z8', label: 'S.Am/AE/TR' };

   // Z9: ZA, EG, BH, IL, JO, LB, SA, PK
   if (['ZA', 'EG', 'BH', 'IL', 'JO', 'LB', 'SA', 'PK'].includes(country)) return { rateKey: 'Z9', label: 'Africa/ME/PK' };

   // Z10: HK (+ default)
   if (['HK'].includes(country)) return { rateKey: 'Z10', label: 'HK' };

   // Default catch-all
   return { rateKey: 'Z10', label: 'Rest of World' };
};

// Retained for future reactivation of carrier surge auto-calculation.
// Currently tested but not called in production code path.
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

// --- Common Rate Lookup for UPS/DHL ---
const roundToHalf = (num: number) => Math.ceil(num * 2) / 2;

type ExactRateTable = Record<string, Record<number, number>>;
type RangeRateEntry = { min: number; max: number; rates: Record<string, number> };

const lookupCarrierRate = (
  billableWeight: number,
  zoneKey: string,
  exactRates: ExactRateTable,
  rangeRates: RangeRateEntry[]
): number => {
  const lookupWeight = roundToHalf(billableWeight);
  const zoneRates = exactRates[zoneKey];

  if (zoneRates && zoneRates[lookupWeight]) {
    return zoneRates[lookupWeight];
  }

  const range = rangeRates.find(r => billableWeight >= r.min && billableWeight <= r.max);
  if (range && range.rates[zoneKey]) {
    return Math.ceil(billableWeight) * range.rates[zoneKey];
  }

  if (zoneRates) {
    const weights = Object.keys(zoneRates).map(Number).sort((a, b) => a - b);
    const found = weights.find(w => w >= lookupWeight);
    if (found) return zoneRates[found];

    const nextRange = rangeRates.find(r => r.min <= Math.ceil(billableWeight));
    if (nextRange && nextRange.rates[zoneKey]) {
      return Math.ceil(billableWeight) * nextRange.rates[zoneKey];
    }
  }

  return 0;
};

// Surge auto-calc disabled; manual surge input applies to all carriers via calculateQuote().
export const calculateItemCosts = (items: CargoItem[], packingType: PackingType, manualPackingCost?: number, volumetricDivisor: number = 5000): ItemCalculationResult => {
  let totalActualWeight = 0;
  let totalPackedVolumetricWeight = 0;
  let packingMaterialCost = 0;
  let packingLaborCost = 0;
  const surgeCost = 0;
  const warnings: string[] = [];

  items.forEach((item) => {
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

    // Surge/AHS auto-calculation disabled — manual input via QuoteInput.manualSurgeCost.
    // Applies to all carriers (UPS, DHL, EMAX). See calculateQuote() for integration.

    totalActualWeight += weight * item.quantity;
    totalPackedVolumetricWeight += calculateVolumetricWeight(l, w, h, volumetricDivisor) * item.quantity;
  });

  // Manual Override Logic
  if (manualPackingCost !== undefined && manualPackingCost >= 0) {
      packingMaterialCost = manualPackingCost;
      packingLaborCost = 0;
  }

  return {
    totalActualWeight,
    totalPackedVolumetricWeight,
    packingMaterialCost,
    packingLaborCost,
    surgeCost,
    warnings
  };
};

export const calculateUpsCosts = (
  billableWeight: number,
  country: string,
  fscPercent: number
): CarrierCostResult => {
    const zoneInfo = determineUpsZone(country);
    const intlBase = lookupCarrierRate(billableWeight, zoneInfo.rateKey, UPS_EXACT_RATES, UPS_RANGE_RATES as RangeRateEntry[]);

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

export const determineDhlZone = (country: string): { rateKey: string; label: string } => {
  if (['CN', 'HK', 'MO', 'SG', 'TW'].includes(country)) return { rateKey: 'Z1', label: 'China/HK/SG/TW' };
  if (['JP'].includes(country)) return { rateKey: 'Z2', label: 'Japan' };
  if (['PH', 'TH'].includes(country)) return { rateKey: 'Z3', label: 'PH/TH' };
  if (['VN', 'IN'].includes(country)) return { rateKey: 'Z4', label: 'VN/IN' };
  if (['AU', 'KH'].includes(country)) return { rateKey: 'Z5', label: 'AU/KH' };
  if (['US', 'CA'].includes(country)) return { rateKey: 'Z6', label: 'US/CA' };
  if (['GB', 'FR', 'DE', 'IT', 'ES', 'DK', 'NL', 'BE', 'CH', 'FI', 'SE', 'NO', 'AT', 'PT', 'IE', 'MC', 'CZ', 'PL', 'HU', 'RO', 'BG'].includes(country))
    return { rateKey: 'Z7', label: 'Europe' };
  if (['BR', 'AR', 'CL', 'CO', 'ZA', 'EG', 'AE', 'TR', 'BH', 'IL', 'JO', 'LB', 'SA', 'PK'].includes(country))
    return { rateKey: 'Z8', label: 'S.Am/Africa/ME' };
  return { rateKey: 'Z8', label: 'Rest of World' };
};

export const calculateDhlCosts = (
  billableWeight: number,
  country: string,
  fscPercent: number
): CarrierCostResult => {
  const zoneInfo = determineDhlZone(country);
  const intlBase = lookupCarrierRate(billableWeight, zoneInfo.rateKey, DHL_EXACT_RATES, DHL_RANGE_RATES as RangeRateEntry[]);

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

  // EMAX only services CN/VN routes from Korea
  if (carrier === 'EMAX' && !['CN', 'VN'].includes(input.destinationCountry)) {
    userWarnings.push("EMAX only services China (CN) and Vietnam (VN). Using VN fallback rate — verify with carrier.");
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

  // Surge: manual input for all carriers (UPS, DHL, EMAX)
  const surgeCost = input.manualSurgeCost ?? 0;
  const intlTotal = carrierResult.intlBase + carrierResult.intlFsc + carrierResult.intlWarRisk + surgeCost;

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

  // 6. Margin & Revenue (USD-based)
  const exchangeRate = input.exchangeRate || DEFAULT_EXCHANGE_RATE;
  const safeMarginUSD = Math.max(input.marginUSD ?? 50, 0);
  const marginKRW = safeMarginUSD * exchangeRate;

  const targetRevenue = quoteBasisCost + marginKRW;
  const marginAmount = marginKRW;
  const totalQuoteAmount = Math.ceil(targetRevenue / 100) * 100;
  const totalQuoteAmountUSD = totalQuoteAmount / exchangeRate;

  // Derive effective margin % for display
  const effectiveMarginPercent = targetRevenue > 0
    ? (marginKRW / targetRevenue) * 100
    : 0;

  if (effectiveMarginPercent < 10) {
    userWarnings.push("Low Margin Alert: Profit margin is below 10%. Approval required.");
  }

  return {
    totalQuoteAmount,
    totalQuoteAmountUSD,
    totalCostAmount,
    profitAmount: marginAmount,
    profitMargin: Math.round(effectiveMarginPercent * 100) / 100,
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
      intlSurge: surgeCost,
      destDuty,
      totalCost: totalCostAmount
    }
  };
};