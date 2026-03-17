import {
  QuoteInput,
  QuoteResult,
  PackingType,
  Incoterm,
  CargoItem
} from "@/types";
import {
  FUMIGATION_FEE,
  DEFAULT_EXCHANGE_RATE,
  PACKING_MATERIAL_BASE_COST,
  PACKING_LABOR_UNIT_COST,
  WAR_RISK_SURCHARGE_RATE
} from "@/config/rates";
import { UPS_EXACT_RATES, UPS_RANGE_RATES } from "@/config/ups_tariff";
import { DHL_EXACT_RATES, DHL_RANGE_RATES } from "@/config/dhl_tariff";
import { EMAX_RATES, EMAX_HANDLING_CHARGE } from "@/config/emax_tariff";
import {
  DHL_ADDON_RATES,
  isDhlOversizePiece,
  isDhlOverWeight,
  calculateRemoteAreaFee,
  calculateInsuranceFee,
} from "@/config/dhl_addons";
import {
  UPS_ADDON_RATES,
  isUpsAdditionalHandling,
  calculateUpsRemoteAreaFee,
  calculateUpsExtendedAreaFee,
  getUpsSurgeFeePerKg,
} from "@/config/ups_addons";
import { calcAddonFee, findRate } from "@/config/addon-utils";
import type { AddonRateLike } from "@/config/addon-utils";
import { applyPackingDimensions } from "@/lib/packing-utils";

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

// --- Zone Mappings (extracted to config files) ---
import { determineUpsZone } from '@/config/ups_zones';
import { determineDhlZone } from '@/config/dhl_zones';
export { determineUpsZone, determineDhlZone };

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
    const packed = applyPackingDimensions(item.length, item.width, item.height, item.weight, packingType);
    const { l, w, h, weight } = packed;

    // Packing impact
    if (packingType !== PackingType.NONE) {
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
    const intlWarRisk = intlBase * (WAR_RISK_SURCHARGE_RATE / 100);
    return {
      intlBase,
      intlFsc,
      intlWarRisk,
      appliedZone: zoneInfo.label,
      transitTime: '2-4 Business Days'
    };
};


// --- DHL Calculator ---

export const calculateDhlCosts = (
  billableWeight: number,
  country: string,
  fscPercent: number
): CarrierCostResult => {
  const zoneInfo = determineDhlZone(country);
  const intlBase = lookupCarrierRate(billableWeight, zoneInfo.rateKey, DHL_EXACT_RATES, DHL_RANGE_RATES as RangeRateEntry[]);

  const fscRate = (fscPercent || 0) / 100;
  const intlFsc = intlBase * fscRate;
  const intlWarRisk = intlBase * (WAR_RISK_SURCHARGE_RATE / 100);
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

// --- DHL Add-on Cost Calculator ---

const calculateDhlAddOnCosts = (
  input: QuoteInput,
  billableWeight: number,
  fscPercent: number
): { total: number; details: NonNullable<import("@/types").CostBreakdown["carrierAddOnDetails"]> } => {
  const fscRate = (fscPercent || 0) / 100;
  const details: NonNullable<import("@/types").CostBreakdown["carrierAddOnDetails"]> = [];
  let total = 0;

  // Use DB rates if available, otherwise hardcoded
  const dbRates = input.resolvedAddonRates?.filter(r => r.carrier === 'DHL');
  const useDb = dbRates && dbRates.length > 0;

  const findDhlRate = (code: string): AddonRateLike | null =>
    findRate(code, useDb ? dbRates : undefined, DHL_ADDON_RATES);

  // 1. Auto-detected: OSP and OWT
  let ospCount = 0;
  let owtCount = 0;
  const ospDef = findDhlRate("OSP");
  const owtDef = findDhlRate("OWT");

  input.items.forEach((item) => {
    const packed = applyPackingDimensions(item.length, item.width, item.height, item.weight, input.packingType);
    const { l, w, h, weight } = packed;

    // OSP detection using DB detectRules or hardcoded
    if (useDb && ospDef?.detectRules) {
      const rules = ospDef.detectRules;
      const maxL = (rules.max_longest as number) ?? 100;
      const maxS = (rules.max_second as number) ?? 80;
      const sorted = [l, w, h].sort((a, b) => b - a);
      if (sorted[0] > maxL || sorted[1] > maxS) ospCount += item.quantity;
    } else {
      if (isDhlOversizePiece(l, w, h)) ospCount += item.quantity;
    }

    // OWT detection
    if (useDb && owtDef?.detectRules) {
      const threshold = (owtDef.detectRules.weight_threshold as number) ?? 70;
      if (weight > threshold) owtCount += item.quantity;
    } else {
      if (isDhlOverWeight(weight)) owtCount += item.quantity;
    }
  });

  if (ospCount > 0 && ospDef) {
    const amount = ospDef.amount * ospCount;
    const fsc = ospDef.fscApplicable ? amount * fscRate : 0;
    details.push({ code: "OSP", nameKo: ospDef.nameKo, nameEn: ospDef.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  }
  if (owtCount > 0 && owtDef) {
    const amount = owtDef.amount * owtCount;
    const fsc = owtDef.fscApplicable ? amount * fscRate : 0;
    details.push({ code: "OWT", nameKo: owtDef.nameKo, nameEn: owtDef.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  }

  // 2. User-selected add-ons
  const selectedCodes = input.dhlAddOns || [];
  selectedCodes.forEach((code) => {
    const addon = findDhlRate(code);
    if (!addon) return;

    let amount: number;
    if (useDb) {
      amount = calcAddonFee(addon as Parameters<typeof calcAddonFee>[0], billableWeight, input.dhlDeclaredValue || 0);
      if (code === "IRR" && addon.chargeType === 'per_piece') {
        const totalPieces = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalPieces;
      }
    } else {
      amount = addon.amount;
      if (code === "RMT") amount = calculateRemoteAreaFee(billableWeight);
      if (code === "INS") amount = calculateInsuranceFee(input.dhlDeclaredValue || 0);
      if (code === "IRR") {
        const totalPieces = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalPieces;
      }
    }

    const fsc = addon.fscApplicable ? amount * fscRate : 0;
    details.push({ code, nameKo: addon.nameKo, nameEn: addon.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  });

  return { total, details };
};

// --- UPS Add-on Cost Calculator ---

const calculateUpsAddOnCosts = (
  input: QuoteInput,
  billableWeight: number,
  fscPercent: number
): { total: number; details: NonNullable<import("@/types").CostBreakdown["carrierAddOnDetails"]> } => {
  const fscRate = (fscPercent || 0) / 100;
  const details: NonNullable<import("@/types").CostBreakdown["carrierAddOnDetails"]> = [];
  let total = 0;

  // Use DB rates if available, otherwise hardcoded
  const dbRates = input.resolvedAddonRates?.filter(r => r.carrier === 'UPS');
  const useDb = dbRates && dbRates.length > 0;

  const findUpsRate = (code: string): AddonRateLike | null =>
    findRate(code, useDb ? dbRates : undefined, UPS_ADDON_RATES);

  // 1. Auto-detected: AHS (Additional Handling)
  let ahsCount = 0;
  const ahsDef = findUpsRate("AHS");

  input.items.forEach((item) => {
    const packed = applyPackingDimensions(item.length, item.width, item.height, item.weight, input.packingType);
    const { l, w, h, weight } = packed;

    if (useDb && ahsDef?.detectRules) {
      const rules = ahsDef.detectRules;
      const wt = (rules.weight_threshold as number) ?? 25;
      const ml = (rules.max_longest as number) ?? 122;
      const ms = (rules.max_second as number) ?? 76;
      const pt = (rules.packing_types as string[]) ?? ['WOODEN_BOX', 'SKID'];
      const sorted = [l, w, h].sort((a, b) => b - a);
      if (weight > wt || sorted[0] > ml || sorted[1] > ms || pt.includes(input.packingType)) {
        ahsCount += item.quantity;
      }
    } else {
      if (isUpsAdditionalHandling(l, w, h, weight, input.packingType)) ahsCount += item.quantity;
    }
  });

  if (ahsCount > 0 && ahsDef) {
    const amount = ahsDef.amount * ahsCount;
    const fsc = ahsDef.fscApplicable ? amount * fscRate : 0;
    details.push({ code: "AHS", nameKo: ahsDef.nameKo, nameEn: ahsDef.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  }

  // 2. Auto-detected: DDP Service Fee
  if (input.incoterm === Incoterm.DDP) {
    const ddpDef = findUpsRate("DDP");
    if (ddpDef) {
      details.push({ code: "DDP", nameKo: ddpDef.nameKo, nameEn: ddpDef.nameEn, amount: ddpDef.amount, fscAmount: 0 });
      total += ddpDef.amount;
    }
  }

  // 3. Auto-detected: UPS Surge Fee — Middle East / Israel destinations
  const surgeFeeInfo = getUpsSurgeFeePerKg(input.destinationCountry);
  if (surgeFeeInfo) {
    const surgeAmount = Math.ceil(billableWeight) * surgeFeeInfo.rate;
    const surgeFsc = surgeAmount * fscRate;
    details.push({
      code: "SGF",
      nameKo: `급증수수료 (${surgeFeeInfo.region})`,
      nameEn: `Surge Fee (${surgeFeeInfo.region})`,
      amount: surgeAmount,
      fscAmount: surgeFsc,
    });
    total += surgeAmount + surgeFsc;
  }

  // 4. User-selected add-ons
  const selectedCodes = input.upsAddOns || [];
  selectedCodes.forEach((code) => {
    const addon = findUpsRate(code);
    if (!addon) return;

    let amount: number;
    if (useDb) {
      amount = calcAddonFee(addon as Parameters<typeof calcAddonFee>[0], billableWeight, 0);
      if (code === "ADC" && addon.chargeType === 'per_carton') {
        const totalCartons = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalCartons;
      }
    } else {
      amount = addon.amount;
      if (code === "RMT") amount = calculateUpsRemoteAreaFee(billableWeight);
      if (code === "EXT") amount = calculateUpsExtendedAreaFee(billableWeight);
      if (code === "ADC") {
        const totalCartons = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalCartons;
      }
    }

    const fsc = addon.fscApplicable ? amount * fscRate : 0;
    details.push({ code, nameKo: addon.nameKo, nameEn: addon.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  });

  return { total, details };
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

  // Packing & Docs = user-entered manualPackingCost only. No auto handling fee.
  // When manualPackingCost is set: material=override, labor=0, fumigation=0, handling=0
  // When manualPackingCost is empty: material=auto, labor=auto, fumigation=auto, handling=0
  if (input.manualPackingCost !== undefined && input.manualPackingCost >= 0) {
      packingFumigationCost = 0;
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

  // System surcharges from DB (War Risk, PSS, EBS, etc.)
  const manualSurgeCost = input.manualSurgeCost ?? 0;
  let systemSurchargeTotal = 0;
  let appliedSurcharges: NonNullable<import("@/types").CostBreakdown["appliedSurcharges"]> | undefined;

  if (input.resolvedSurcharges && input.resolvedSurcharges.length > 0) {
    const applied = input.resolvedSurcharges.map(s => {
      const appliedAmount = s.chargeType === 'rate'
        ? Math.round(carrierResult.intlBase * s.amount / 100)
        : Math.round(s.amount);
      return {
        code: s.code,
        name: s.name,
        nameKo: s.nameKo ?? undefined,
        chargeType: s.chargeType,
        amount: s.amount,
        appliedAmount,
        sourceUrl: s.sourceUrl ?? undefined,
      };
    });
    systemSurchargeTotal = applied.reduce((sum, s) => sum + s.appliedAmount, 0);
    appliedSurcharges = applied;
  }

  const surgeCost = systemSurchargeTotal + manualSurgeCost;
  const intlTotal = carrierResult.intlBase + carrierResult.intlFsc + carrierResult.intlWarRisk + surgeCost;

  // 3a. Carrier Add-on Services (DHL or UPS)
  let carrierAddOnTotal = 0;
  let carrierAddOnDetails: NonNullable<import("@/types").CostBreakdown["carrierAddOnDetails"]> | undefined;
  if (carrier === 'DHL') {
    const dhlAddOns = calculateDhlAddOnCosts(input, billableWeight, input.fscPercent);
    carrierAddOnTotal = dhlAddOns.total;
    carrierAddOnDetails = dhlAddOns.details.length > 0 ? dhlAddOns.details : undefined;
  } else if (carrier === 'UPS') {
    const upsAddOns = calculateUpsAddOnCosts(input, billableWeight, input.fscPercent);
    carrierAddOnTotal = upsAddOns.total;
    carrierAddOnDetails = upsAddOns.details.length > 0 ? upsAddOns.details : undefined;
  }

  // 4. Duty
  let destDuty = 0;
  if (input.incoterm === Incoterm.DDP) {
    destDuty = input.dutyTaxEstimate;
  }

  // 4a. Extra Pick-up in Seoul cost
  const pickupInSeoul = input.pickupInSeoulCost ?? 0;

  // 5. Totals (WARNING 2: finalHandlingFee removed — was always 0)
  const totalCostAmount = packingTotal + intlTotal + carrierAddOnTotal + destDuty + pickupInSeoul;

  let quoteBasisCost = 0;
  if ([Incoterm.EXW, Incoterm.FOB].includes(input.incoterm)) {
     quoteBasisCost = packingTotal;
     userWarnings.push("Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner.");
  } else {
     quoteBasisCost = totalCostAmount;
  }

  // 6. Margin & Revenue (% based)
  const exchangeRate = input.exchangeRate || DEFAULT_EXCHANGE_RATE;

  // Calculate target revenue based on margin percentage
  // Target Revenue = Cost / (1 - Margin/100)
  // e.g. 15% margin -> Revenue = Cost / 0.85
  const safeMarginPercent = Math.max(input.marginPercent ?? 15, 0);

  let targetRevenue = quoteBasisCost;
  // Prevent division by zero if margin is set to 100% or higher
  if (safeMarginPercent < 100) {
     targetRevenue = quoteBasisCost / (1 - (safeMarginPercent / 100));
  }

  const marginAmount = targetRevenue - quoteBasisCost;
  const totalQuoteAmount = Math.ceil(targetRevenue / 100) * 100; // Round up to nearest 100 KRW
  const totalQuoteAmountUSD = totalQuoteAmount / exchangeRate;

  // Derive effective margin % for display (recalculated after rounding)
  const effectiveMarginPercent = totalQuoteAmount > 0
    ? ((totalQuoteAmount - quoteBasisCost) / totalQuoteAmount) * 100
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
      handlingFees: 0,
      pickupInSeoul,
      intlBase: carrierResult.intlBase,
      intlFsc: carrierResult.intlFsc,
      intlWarRisk: carrierResult.intlWarRisk,
      intlSurge: surgeCost,
      intlSystemSurcharge: systemSurchargeTotal || undefined,
      intlManualSurge: manualSurgeCost || undefined,
      appliedSurcharges,
      carrierAddOnTotal: carrierAddOnTotal || undefined,
      carrierAddOnDetails: carrierAddOnDetails,
      destDuty,
      totalCost: totalCostAmount
    }
  };
};
