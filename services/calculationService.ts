import { 
    QuoteInput, 
    QuoteResult, 
    PackingType, 
    Incoterm 
  } from "../types";
  import { 
    WAR_RISK_SURCHARGE_RATE, 
    HANDLING_FEE, 
    FUMIGATION_FEE,
    DEFAULT_COUNTRY_ZONES,
    CN_SOUTH_ZIP_RANGES,
    ZONE_BASE_RATES,
    DOMESTIC_RATES,
    SURGE_THRESHOLDS,
    SURGE_RATES
  } from "../constants";
  
  // Helper: Calculate Volume Weight
  const calculateVolumetricWeight = (l: number, w: number, h: number) => {
    // UPS Formula: (L x W x H) / 5000, Round Up
    return (Math.ceil(l) * Math.ceil(w) * Math.ceil(h)) / 5000;
  };

  // Helper: Calculate CBM (Cubic Meter)
  const calculateCBM = (l: number, w: number, h: number) => {
    return (l * w * h) / 1000000;
  };

  // Helper: Determine UPS Zone intelligently based on Zip Code
  const determineUpsZone = (country: string, zip: string): { zone: string; label: string } => {
     // Clean Zip: remove non-numeric characters to handle formats like "90210-1234"
     const cleanZip = zip.replace(/[^0-9]/g, '');
     
     if (country === 'CN') {
         // China Zip Codes are typically 6 digits.
         // We parse the first 6 digits to match range logic safely.
         const zipNum = parseInt(cleanZip.substring(0, 6), 10);
         
         // China Logic: Check South China Ranges (Zone 5)
         // Prioritize checking the specific South ranges. If match, return Zone 5.
         if (!isNaN(zipNum)) {
            for (const range of CN_SOUTH_ZIP_RANGES) {
                if (zipNum >= range.start && zipNum <= range.end) {
                    return { zone: 'Zone 5', label: 'Zone 5 (South China)' };
                }
            }
         }
         // Default for China if no range matched
         return { zone: 'Zone 2', label: 'Zone 2 (North/Rest of China)' };
     }

     if (country === 'US') {
         // USA Logic: West Coast (Zone 6) Zip codes start with 8 or 9.
         // (e.g., 8xxxx, 9xxxx cover CA, WA, OR, NV, AZ, UT, ID, etc.)
         if (cleanZip.startsWith('8') || cleanZip.startsWith('9')) {
             return { zone: 'Zone 6', label: 'Zone 6 (US West)' };
         }

         // Midwest/Central (Zone 7): Zip codes start with 4, 5, 6, 7.
         // (e.g., IL, TX, MO, MN, etc.)
         if (['4', '5', '6', '7'].some(prefix => cleanZip.startsWith(prefix))) {
             return { zone: 'Zone 7', label: 'Zone 7 (US Midwest/Central)' };
         }

         // East Coast (Zone 7): Zip codes start with 0, 1, 2, 3.
         // (e.g., NY, NJ, FL, MA, etc.) or fallback if zip is invalid/empty
         return { zone: 'Zone 7', label: 'Zone 7 (US East)' };
     }

     // Default Fallback for other countries
     const defaultZone = DEFAULT_COUNTRY_ZONES[country] || 'Zone 9';
     return { zone: defaultZone, label: defaultZone };
  };
  
  export const calculateQuote = (input: QuoteInput): QuoteResult => {
    const warnings: string[] = [];
    
    // 1. PACKING CALCULATION
    let totalActualWeight = 0;
    let totalPackedVolumetricWeight = 0;
    let totalCBM = 0;
    let packingMaterialCost = 0;
    let packingLaborCost = 0;
    let packingFumigationCost = 0;
    let upsSurgeCost = 0; // Accumulator for Surge Fees
  
    // Calculate totals per item
    input.items.forEach((item, index) => {
      let l = item.length;
      let w = item.width;
      let h = item.height;
      let weight = item.weight;
  
      // Packing impact
      if (input.packingType !== PackingType.NONE) {
        // Dimensions increase due to crating
        l += 10; 
        w += 10; 
        h += 15; // pallet height included
        
        // Weight increase (Mock logic)
        weight = weight * 1.1 + 10; 
        
        // Costs
        const surfaceAreaM2 = (2 * (l*w + l*h + w*h)) / 10000; // cm2 to m2
        packingMaterialCost += surfaceAreaM2 * 15000 * item.quantity; // 15,000 KRW per m2
        packingLaborCost += 50000 * item.quantity; // Basic labor
        
        if (input.packingType === PackingType.VACUUM) {
           packingLaborCost *= 1.5; // Difficulty factor
        }
      }
      
      // --- SURGE FEE / DEMAND SURCHARGE LOGIC (Post-Packing Dimensions) ---
      // Check each package individually. Multiplied by quantity.
      for (let q = 0; q < item.quantity; q++) {
          const sortedDims = [l, w, h].sort((a, b) => b - a);
          const longest = sortedDims[0];
          const secondLongest = sortedDims[1];
          const girth = (2 * w) + (2 * h); // Assuming L is longest? No, standard formula: Length + 2*(Width + Height) where Length is longest side.
          // Correct Girth Calculation: Length + 2*(Remaining sides)
          const actualGirth = longest + (2 * sortedDims[1]) + (2 * sortedDims[2]);

          let packageSurgeApplied = false;
          let surgeReason = "";

          // 1. Check Over Max Limits (Penalty)
          if (longest > SURGE_THRESHOLDS.MAX_LIMIT_LENGTH_CM || weight > 70 || actualGirth > SURGE_THRESHOLDS.MAX_LIMIT_GIRTH_CM) {
              upsSurgeCost += SURGE_RATES.OVER_MAX;
              warnings.push(`Box #${index+1}: Exceeds Max Limits (L>${SURGE_THRESHOLDS.MAX_LIMIT_LENGTH_CM}cm or >70kg). Heavy penalty applied.`);
              packageSurgeApplied = true;
          } 
          // 2. Check Large Package Surcharge (LPS)
          // Length + Girth > 300cm
          else if (actualGirth > SURGE_THRESHOLDS.LPS_LENGTH_GIRTH_CM) {
              upsSurgeCost += SURGE_RATES.LARGE_PACKAGE;
              surgeReason = "Large Package (L+Girth > 300cm)";
              packageSurgeApplied = true;
          }
          // 3. Check Additional Handling (AHS)
          // AHS applies if NOT Large Package (usually LPS supersedes AHS-Dim, but AHS-Weight might still apply? 
          // Simplified: If LPS is applied, ignore AHS-Dim, but check AHS-Weight.
          
          if (!packageSurgeApplied || surgeReason.includes("Large Package")) {
              // AHS - Weight
              if (weight > SURGE_THRESHOLDS.AHS_WEIGHT_KG) {
                  upsSurgeCost += SURGE_RATES.AHS_WEIGHT;
                   if (!packageSurgeApplied) surgeReason = "AHS Weight (>25kg)";
                   else surgeReason += " + AHS Weight";
                   packageSurgeApplied = true;
              }
              // AHS - Dimensions (Only if NOT Large Package, as LPS covers size handling)
              else if (!surgeReason.includes("Large Package")) {
                  if (longest > SURGE_THRESHOLDS.AHS_DIM_LONG_SIDE_CM || secondLongest > SURGE_THRESHOLDS.AHS_DIM_SECOND_SIDE_CM) {
                      upsSurgeCost += SURGE_RATES.AHS_DIMENSION;
                      surgeReason = "AHS Dim (L>122 or W>76)";
                      packageSurgeApplied = true;
                  }
                  // AHS - Packing (Wood/Metal)
                  else if ([PackingType.WOODEN_BOX, PackingType.SKID].includes(input.packingType)) {
                      upsSurgeCost += SURGE_RATES.AHS_DIMENSION; // Use Dim rate for packaging AHS
                      surgeReason = "AHS Packing (Wood/Skid)";
                      packageSurgeApplied = true;
                  }
              }
          }

          if (q === 0 && packageSurgeApplied) {
              warnings.push(`Box #${index+1}: ${surgeReason} applied.`);
          }
      }

  
      totalActualWeight += weight * item.quantity;
      totalPackedVolumetricWeight += calculateVolumetricWeight(l, w, h) * item.quantity;
      totalCBM += calculateCBM(l, w, h) * item.quantity;
    });
  
    if (input.packingType !== PackingType.NONE) {
      packingFumigationCost = FUMIGATION_FEE;
    }
    
    let finalHandlingFee = HANDLING_FEE;

    // Manual Packing Cost Override Logic
    // If user inputs manual cost, we lump sum everything into 'packingMaterialCost' for calculation simplicity
    // and zero out the specific components to match the total.
    if (input.manualPackingCost !== undefined && input.manualPackingCost >= 0) {
        packingMaterialCost = input.manualPackingCost;
        packingLaborCost = 0;
        packingFumigationCost = 0;
        finalHandlingFee = 0;
    }
  
    // 2. BILLABLE WEIGHT (International)
    const billableWeight = Math.max(totalActualWeight, totalPackedVolumetricWeight);
    
    if (totalPackedVolumetricWeight > totalActualWeight * 1.2) {
      warnings.push("High Volumetric Weight Detected (>20% over actual). Consider Repacking.");
    }
  
    // 3. DOMESTIC LEG (C_ez) - DETAILED LOGIC
    let domesticBase = 0;
    let domesticSurcharge = 0;
    let truckType = "Parcel/Small";
    
    // Rate Table Indices: 0: ~100kg/1CBM, 1: ~500kg/3CBM, 2: 1t, 3: 3.5t, 4: 5t, 5: 11t
    const TRUCK_TIERS = ["~100kg Pickup", "~500kg Pickup", "1t Truck", "3.5t Truck", "5t Truck", "11t Truck"];
    const rates = DOMESTIC_RATES[input.domesticRegionCode] || DOMESTIC_RATES['A'];
    let tierIndex = 0;

    // Determine Tier based on weight/volume
    if (totalActualWeight <= 100 && totalCBM <= 1) {
        tierIndex = 0;
    } else if (totalActualWeight <= 500 && totalCBM <= 3) {
        tierIndex = 1;
    } else if (totalActualWeight <= 1100) { // Slight buffer for 1t
        tierIndex = 2;
    } else if (totalActualWeight <= 3500) {
        tierIndex = 3;
    } else if (totalActualWeight <= 5000) {
        tierIndex = 4;
    } else if (totalActualWeight <= 11000) {
        tierIndex = 5;
    } else {
        tierIndex = 5;
        truckType = "11t Truck (Overweight)";
        warnings.push("Cargo exceeds 11t. Multiple trucks may be required. Quoted at max single truck rate.");
    }
    
    // Set initial truck type based on tier (if not overwritten by overweight)
    if (!truckType.includes("Overweight")) {
        truckType = TRUCK_TIERS[tierIndex];
    }

    // Logic for Negotiated Rates / Manual Override
    let selectedRate = rates[tierIndex];

    // Priority 1: User Manual Override
    if (input.manualDomesticCost !== undefined && input.manualDomesticCost > 0) {
        domesticBase = input.manualDomesticCost;
        truckType = `${truckType} (Manual Rate)`;
    } 
    // Priority 2: Standard Rate Logic
    else {
        // If rate is 0 (Negotiated required), find next available tier but warn user
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
                // We default to the upgrade for safety, but warn strongly for manual input
                domesticBase = selectedRate;
                truckType = `${TRUCK_TIERS[upgradedIndex]} (Auto-Upgrade)`;
                warnings.push(`Standard rate unavailable for Region ${input.domesticRegionCode}. Defaulted to ${TRUCK_TIERS[upgradedIndex]}. Please negotiate and enter 'Domestic Cost' manually.`);
                tierIndex = upgradedIndex; 
            } else {
                warnings.push(`No valid domestic rate found for Region ${input.domesticRegionCode}.`);
            }
        } else {
            domesticBase = selectedRate;
        }
    }

    // JEJU & REMOTE SURCHARGE LOGIC
    if (input.isJejuPickup) {
        if (tierIndex >= 2) {
             domesticSurcharge = domesticBase * 1.0; 
             warnings.push("Jeju/Island Pickup: 100% Surcharge applied for ferry and remote trucking.");
        } else {
             domesticSurcharge = 3000 * input.items.reduce((acc, i) => acc + i.quantity, 0);
             if (domesticSurcharge === 0) domesticSurcharge = 50000; // Minimum surcharge fallback
             warnings.push("Jeju/Island Pickup: Parcel surcharge applied.");
        }
    }

    // 4. UPS INTERNATIONAL LEG (C_ups)
    // Intelligent Zone Detection
    const zoneInfo = determineUpsZone(input.destinationCountry, input.destinationZip);
    const zoneKey = zoneInfo.zone;
    
    // Base Rate Lookup based on Zone (Dynamic)
    const baseRatePerKg = ZONE_BASE_RATES[zoneKey] || 13500; 

    let upsBase = billableWeight * baseRatePerKg;
    
    // Volume Discounts (Simulated)
    if (billableWeight > 100) upsBase *= 0.85;
    else if (billableWeight > 45) upsBase *= 0.90;
  
    // Use Input FSC
    const fscRate = (input.fscPercent || 0) / 100;
    const upsFsc = upsBase * fscRate;
    const upsWarRisk = upsBase * WAR_RISK_SURCHARGE_RATE;
    const upsTotal = upsBase + upsFsc + upsWarRisk + upsSurgeCost;
  
    // 5. DESTINATION & DUTY
    let destDuty = 0;
    if (input.incoterm === Incoterm.DDP) {
      destDuty = input.dutyTaxEstimate;
    }
  
    // 6. TOTAL CALCULATION
    let totalCostAmount = 0;
    let quoteBasisCost = 0;
  
    const domesticTotal = domesticBase + domesticSurcharge;
    const packingTotal = packingMaterialCost + packingLaborCost + packingFumigationCost;
    
    totalCostAmount = domesticTotal + packingTotal + finalHandlingFee + upsTotal + destDuty;
  
    if ([Incoterm.EXW, Incoterm.FOB].includes(input.incoterm)) {
       quoteBasisCost = domesticTotal + packingTotal + finalHandlingFee;
       warnings.push("Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner.");
    } else {
       quoteBasisCost = totalCostAmount;
    }
  
    // Gross Margin Logic (Profit-Driven)
    const safeMarginPercent = Math.min(Math.max(input.marginPercent, 0), 99);
    const marginRate = safeMarginPercent / 100;
    
    let targetRevenue = 0;
    if (marginRate < 1) {
        targetRevenue = quoteBasisCost / (1 - marginRate);
    } else {
        targetRevenue = quoteBasisCost * 2; // Fallback safeguard
        warnings.push("Invalid margin rate. Defaulted to markup.");
    }
    
    const marginAmount = targetRevenue - quoteBasisCost;
    const totalQuoteAmount = Math.ceil(targetRevenue / 100) * 100; // Round to nearest 100 KRW
  
    // Calculate USD Estimate
    const exchangeRate = input.exchangeRate || 1450;
    const totalQuoteAmountUSD = totalQuoteAmount / exchangeRate;

    if (input.marginPercent < 10) {
      warnings.push("Low Margin Alert: Profit margin is below 10%. Approval required.");
    }
  
    return {
      totalQuoteAmount,
      totalQuoteAmountUSD,
      totalCostAmount,
      profitAmount: marginAmount,
      profitMargin: input.marginPercent,
      currency: 'KRW',
      totalActualWeight,
      totalVolumetricWeight: totalPackedVolumetricWeight,
      billableWeight,
      appliedZone: zoneInfo.label, // Show full label (e.g. Zone 5 (South China))
      transitTime: '3-5 Business Days',
      domesticTruckType: truckType,
      isFreightMode: tierIndex >= 2, // 1t or above
      warnings,
      breakdown: {
        domesticBase,
        domesticSurcharge,
        packingMaterial: packingMaterialCost,
        packingLabor: packingLaborCost,
        packingFumigation: packingFumigationCost,
        handlingFees: finalHandlingFee,
        upsBase,
        upsFsc,
        upsWarRisk,
        upsSurge: upsSurgeCost,
        destDuty,
        totalCost: totalCostAmount
      }
    };
  };