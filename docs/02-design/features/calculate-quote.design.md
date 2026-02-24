# Calculate Quote Improvement Design Document

> **Summary**: Technical design for multi-carrier calculation alignment, dead code removal, and type system refactoring
>
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Version**: 0.0.0
> **Author**: jaehong
> **Date**: 2026-02-24
> **Status**: Draft
> **Planning Doc**: [calculate-quote.plan.md](../01-plan/features/calculate-quote.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. Frontend `calculationService.ts` produces identical results to backend `QuoteCalculator` for all three carriers
2. Type system uses carrier-generic names matching backend convention (`intl_base` -> `intlBase`)
3. Zero dead code related to removed domestic cost feature
4. New carrier calculators follow the same pattern as existing UPS calculator

### 1.2 Design Principles

- **Mirror-first**: Frontend calculation must match backend logic 1:1 (same rounding, same fallback order)
- **Single responsibility**: Each carrier calculator is an independent function with a common return interface
- **Backward compatibility**: Backend API response format is unchanged; frontend adapts its internal types

---

## 2. Architecture

### 2.1 Carrier Calculator Pattern

```
                    calculateQuote(input)
                           │
                    ┌──────┴──────┐
                    │ carrier?    │
                    └──────┬──────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     calculateUpsCosts  calculateDhlCosts  calculateEmaxCosts
              │            │            │
              ▼            ▼            ▼
     ┌────────────────────────────────────────┐
     │  CarrierCostResult (common interface)  │
     │  { intlBase, intlFsc, intlWarRisk,     │
     │    appliedZone, transitTime }           │
     └────────────────────────────────────────┘
```

### 2.2 Data Flow (Unchanged)

```
User Input → 500ms debounce → POST /api/v1/quotes/calculate
                                      │
                             QuoteCalculator.call(input)
                                      │
                             QuoteResult JSON → Frontend display
```

The frontend `calculationService.ts` exists as a **reference implementation** for offline/fallback use. The backend remains the source of truth.

### 2.3 File Change Map

| File | Action | FR |
|------|--------|-----|
| `src/types.ts` | Rename CostBreakdown fields, remove domestic fields from QuoteResult | FR-03, FR-04, FR-05 |
| `src/config/rates.ts` | Remove `DOMESTIC_RATES` | FR-06 |
| `src/config/business-rules.ts` | Remove `TRUCK_TIER_LIMITS` | FR-06 |
| `src/config/dhl_tariff.ts` | **NEW** - DHL exact + range rates (Z1-Z8) | FR-01, FR-09 |
| `src/config/emax_tariff.ts` | **NEW** - EMAX per-kg rates (CN/VN) | FR-02, FR-10 |
| `src/features/quote/services/calculationService.ts` | Add DHL/EMAX calculators, carrier routing, align zone keys | FR-01, FR-02, FR-07 |
| `src/features/quote/components/CostBreakdownCard.tsx` | Update field references | FR-03 |
| `src/lib/pdfService.ts` | Update field references | FR-03 |
| `src/lib/pdfService.test.ts` | Update mock data field names | FR-03 |
| `src/features/history/components/QuoteDetailModal.tsx` | Update field references, make domesticTruckType optional | FR-03, FR-04 |
| `src/features/history/components/__tests__/QuoteHistoryTable.test.tsx` | Update mock data | FR-05 |
| `src/features/quote/services/calculationService.test.ts` | **ADD** orchestrator + multi-carrier tests | FR-08 |

---

## 3. Data Model

### 3.1 CostBreakdown (Refactored)

```typescript
// BEFORE (current)
export interface CostBreakdown {
  domesticBase: number;        // REMOVE - always 0
  domesticSurcharge: number;   // REMOVE - always 0
  packingMaterial: number;
  packingLabor: number;
  packingFumigation: number;
  handlingFees: number;
  upsBase: number;             // RENAME → intlBase
  upsFsc: number;              // RENAME → intlFsc
  upsWarRisk: number;          // RENAME → intlWarRisk
  upsSurge: number;            // RENAME → intlSurge
  destDuty: number;
  totalCost: number;
}

// AFTER
export interface CostBreakdown {
  packingMaterial: number;
  packingLabor: number;
  packingFumigation: number;
  handlingFees: number;
  intlBase: number;            // Carrier base rate (UPS/DHL/EMAX)
  intlFsc: number;             // Fuel surcharge (0 for EMAX)
  intlWarRisk: number;         // War risk surcharge (0 for EMAX)
  intlSurge: number;           // AHS/Large Package surcharge
  destDuty: number;
  totalCost: number;
}
```

### 3.2 QuoteResult (Refactored)

```typescript
// BEFORE
export interface QuoteResult {
  // ...existing fields...
  domesticTruckType: string;  // REMOVE - always 'N/A'
  isFreightMode: boolean;     // REMOVE - always false
  // ...
}

// AFTER
export interface QuoteResult {
  totalQuoteAmount: number;
  totalQuoteAmountUSD: number;
  totalCostAmount: number;
  profitAmount: number;
  profitMargin: number;
  currency: string;
  totalActualWeight: number;
  totalVolumetricWeight: number;
  billableWeight: number;
  appliedZone: string;
  transitTime: string;
  carrier: string;             // NEW - 'UPS' | 'DHL' | 'EMAX'
  warnings: string[];
  breakdown: CostBreakdown;
}
```

**Note on QuoteSummary/QuoteDetail**: These types are for API responses and the backend still sends `domesticTruckType`. Keep `domesticTruckType` in `QuoteSummary` and `QuoteDetail` as optional (`domesticTruckType?: string`) for backward compatibility with existing saved quotes.

### 3.3 Internal Carrier Cost Interface

```typescript
// New shared return type for all carrier calculators
interface CarrierCostResult {
  intlBase: number;
  intlFsc: number;
  intlWarRisk: number;
  appliedZone: string;
  transitTime: string;
}
```

This maps directly to the backend pattern:
```ruby
# Backend already returns this shape:
{ intl_base:, intl_fsc:, intl_war_risk:, applied_zone:, transit_time: }
```

---

## 4. Carrier Calculator Specifications

### 4.1 UPS Calculator (Refactor existing)

**Zone Mapping** - Align frontend to backend `Z1-Z10`:

| Zone | Countries | Current Frontend Key | New Key |
|------|-----------|---------------------|---------|
| Z1 | SG, TW, MO, CN | C3 | Z1 |
| Z2 | JP, VN | C4 | Z2 |
| Z3 | TH, PH | (partial in C4/C5) | Z3 |
| Z4 | AU, IN | C6 | Z4 |
| Z5 | CA, US | C7 | Z5 |
| Z6 | ES, IT, GB, FR | C8 | Z6 |
| Z7 | DK, NO, SE, FI, DE, NL, BE, IE, CH, AT, PT, CZ, PL, HU, RO, BG | C9 | Z7 |
| Z8 | AR, BR, CL, CO, AE, TR | C10 | Z8 |
| Z9 | ZA, EG, BH, IL, JO, LB, SA, PK | (in C10) | Z9 |
| Z10 | HK | C11 | Z10 |

**Changes required**:
- Rename `determineUpsZone()` return keys from `C3-C11` to `Z1-Z10`
- Update country groupings to match backend exactly
- Update `UPS_EXACT_RATES` and `UPS_RANGE_RATES` key references in `ups_tariff.ts`
- Rename internal variables: `upsBase` -> `intlBase`, etc.
- Return type: `CarrierCostResult`

### 4.2 DHL Calculator (New)

**Zone Mapping** (from `Calculators::DhlZone`):

| Zone | Countries |
|------|-----------|
| Z1 | CN, HK, MO, SG, TW |
| Z2 | JP |
| Z3 | PH, TH |
| Z4 | VN, IN |
| Z5 | AU, KH |
| Z6 | US, CA |
| Z7 | GB, FR, DE, IT, ES, DK, NL, BE, CH, FI, SE, NO, AT, PT, IE, MC, CZ, PL, HU, RO, BG |
| Z8 | BR, AR, CL, CO, ZA, EG, AE, TR, BH, IL, JO, LB, SA, PK (+ default) |

**Rate Lookup Logic** (identical to UPS pattern):
1. Round weight to nearest 0.5kg
2. Check `DHL_EXACT_RATES[zone][weight]` (0.5-30kg in 0.5kg steps)
3. If not found, check `DHL_RANGE_RATES` (>30kg, per-kg rate)
4. Fallback: find nearest weight in exact rates, then try range rates
5. Apply FSC%: `intlFsc = intlBase * (fscPercent / 100)`
6. Apply war risk: `intlWarRisk = intlBase * WAR_RISK_SURCHARGE_RATE`

**Function signature**:
```typescript
export const determineDhlZone = (country: string): { rateKey: string; label: string }
export const calculateDhlCosts = (billableWeight: number, country: string, fscPercent: number): CarrierCostResult
```

### 4.3 EMAX Calculator (New)

**Rate Structure** (from `Constants::EmaxTariff`):

| Country | Per-kg Rate (KRW) |
|---------|-------------------|
| CN | 13,500 |
| VN | 10,000 |
| Default | 10,000 |

**Handling Charge**: 15,000 KRW (flat, added to base)

**Calculation Logic**:
1. Determine country key: `CN` if China, else `VN` (default)
2. `intlBase = ceil(billableWeight) * perKgRate + EMAX_HANDLING_CHARGE`
3. `intlFsc = 0` (EMAX is all-in pricing)
4. `intlWarRisk = 0`
5. Volumetric divisor: **6000** (not 5000 like UPS/DHL) - already handled in `calculateQuote()`

**Function signature**:
```typescript
export const calculateEmaxCosts = (billableWeight: number, country: string): CarrierCostResult
```

---

## 5. UI Impact

### 5.1 CostBreakdownCard.tsx Changes

| Current Code | New Code |
|-------------|----------|
| `result.breakdown.upsBase + result.breakdown.upsFsc + result.breakdown.upsWarRisk + result.breakdown.upsSurge` | `result.breakdown.intlBase + result.breakdown.intlFsc + result.breakdown.intlWarRisk + result.breakdown.intlSurge` |
| `result.breakdown.upsSurge > 0` | `result.breakdown.intlSurge > 0` |
| `formatCurrency(result.breakdown.upsSurge)` | `formatCurrency(result.breakdown.intlSurge)` |

The carrier name detection logic (line 93) already works correctly by checking `result.appliedZone` content - no change needed.

### 5.2 pdfService.ts Changes

Same field renames as CostBreakdownCard. The carrier detection logic (lines 110-112) already works.

### 5.3 QuoteDetailModal.tsx Changes

| Current | New |
|---------|-----|
| `quote.domesticTruckType \|\| '-'` | Remove this row entirely |
| `quote.breakdown.domesticBase` | Remove this row |
| `quote.breakdown.domesticSurcharge` | Remove this row |
| `"UPS Base"` label | `"Intl. Base"` |
| `"UPS FSC"` label | `"Intl. FSC"` |
| `"UPS War Risk"` label | `"Intl. War Risk"` |
| `"UPS Surge"` label | `"Intl. Surge"` |
| `quote.breakdown.upsBase` | `quote.breakdown.intlBase` |

---

## 6. Config File Specifications

### 6.1 dhl_tariff.ts (New)

```typescript
// Port from smart-quote-api/lib/constants/dhl_tariff.rb
export const DHL_EXACT_RATES: Record<string, Record<number, number>> = {
  'Z1': { 0.5: 53466, 1: 60914, /* ... */ 30: 239514 },
  'Z2': { 0.5: 55974, /* ... */ 30: 259692 },
  'Z3': { 0.5: 56240, /* ... */ 30: 323950 },
  'Z4': { 0.5: 58368, /* ... */ 30: 363166 },
  'Z5': { 0.5: 59014, /* ... */ 30: 371678 },
  'Z6': { 0.5: 63384, /* ... */ 30: 563882 },
  'Z7': { 0.5: 66538, /* ... */ 30: 655690 },
  'Z8': { 0.5: 86222, /* ... */ 30: 840788 },
};

export const DHL_RANGE_RATES = [
  { min: 30.1, max: 70, rates: { Z1: 7752, Z2: 8398, Z3: 10526, Z4: 12122, Z5: 12502, Z6: 18810, Z7: 21242, Z8: 27208 } },
  { min: 70.1, max: 300, rates: { Z1: 7752, Z2: 8398, Z3: 10526, Z4: 12122, Z5: 12502, Z6: 18810, Z7: 21242, Z8: 27208 } },
  { min: 300.1, max: 99999, rates: { Z1: 7752, Z2: 8398, Z3: 10526, Z4: 12122, Z5: 12502, Z6: 18810, Z7: 21242, Z8: 27208 } },
];
```

### 6.2 emax_tariff.ts (New)

```typescript
// Port from smart-quote-api/lib/constants/emax_tariff.rb
export const EMAX_RATES: Record<string, number> = {
  'CN': 13500,
  'VN': 10000,
};

export const EMAX_HANDLING_CHARGE = 15000;
```

### 6.3 rates.ts Removals

```diff
- export const DOMESTIC_RATES: Record<string, number[]> = { ... };
  // 20 lines of unused domestic rate data
```

### 6.4 business-rules.ts Removals

```diff
- export const TRUCK_TIER_LIMITS = [ ... ];
  // 8 lines of unused truck tier data
```

---

## 7. Backend API Compatibility

The backend `QuoteCalculator` returns breakdown fields in camelCase:
```ruby
{ upsBase:, upsFsc:, upsWarRisk:, upsSurge:, domesticBase:, domesticSurcharge: }
```

**Critical decision**: The backend still sends `upsBase` etc. in API responses and in JSONB `breakdown` column. Two options:

**Option A (Selected)**: Frontend maps API response fields on receipt
```typescript
// In quoteApi.ts or a transform layer:
function mapBreakdown(raw: any): CostBreakdown {
  return {
    packingMaterial: raw.packingMaterial,
    packingLabor: raw.packingLabor,
    packingFumigation: raw.packingFumigation,
    handlingFees: raw.handlingFees,
    intlBase: raw.upsBase ?? raw.intlBase ?? 0,
    intlFsc: raw.upsFsc ?? raw.intlFsc ?? 0,
    intlWarRisk: raw.upsWarRisk ?? raw.intlWarRisk ?? 0,
    intlSurge: raw.upsSurge ?? raw.intlSurge ?? 0,
    destDuty: raw.destDuty,
    totalCost: raw.totalCost,
  };
}
```

This approach:
- No backend changes needed
- Handles both old saved quotes (`upsBase`) and future field names
- Single mapping point in `quoteApi.ts`

**Option B (Rejected)**: Rename backend fields too
- Would require database migration for JSONB column
- Would break existing saved quotes

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | File |
|------|--------|------|------|
| Unit | Zone mapping (UPS, DHL) | Vitest | `calculationService.test.ts` |
| Unit | EMAX cost calculation | Vitest | `calculationService.test.ts` |
| Unit | DHL cost calculation | Vitest | `calculationService.test.ts` |
| Integration | `calculateQuote()` for each carrier | Vitest | `calculationService.test.ts` |
| Unit | API response field mapping | Vitest | `quoteApi.test.ts` (new) |

### 8.2 Test Cases

**Zone Mapping Tests**:
- [ ] `determineUpsZone('US')` returns `{ rateKey: 'Z5', label: 'CA/US' }`
- [ ] `determineUpsZone('CN')` returns `{ rateKey: 'Z1', label: 'SG/TW/MO/CN' }`
- [ ] `determineDhlZone('JP')` returns `{ rateKey: 'Z2', label: 'Japan' }`
- [ ] `determineDhlZone('XX')` falls back to Z8

**DHL Cost Tests**:
- [ ] DHL Z1 at 1kg exact rate = 60,914 KRW
- [ ] DHL Z6 at 5kg exact rate = 153,482 KRW
- [ ] DHL Z1 at 50kg uses range rate: `ceil(50) * 7752 = 387,600` KRW
- [ ] FSC 30% applied correctly: `base * 0.30`
- [ ] War risk 5% applied correctly: `base * 0.05`

**EMAX Cost Tests**:
- [ ] EMAX CN at 10kg: `ceil(10) * 13500 + 15000 = 150,000` KRW
- [ ] EMAX VN at 5.3kg: `ceil(5.3) * 10000 + 15000 = 75,000` KRW
- [ ] EMAX intlFsc = 0, intlWarRisk = 0
- [ ] EMAX unknown country defaults to VN rate

**calculateQuote() Integration Tests**:
- [ ] UPS quote for 10kg to US: verify all breakdown fields populated
- [ ] DHL quote for 5kg to JP: verify DHL zone and rates used
- [ ] EMAX quote for 3kg to CN: verify 6000 volumetric divisor and EMAX rates
- [ ] Margin calculation: 15% margin on 100,000 KRW cost = ceil(117,647/100)*100 = 117,700 KRW
- [ ] EXW incoterm: quoteBasisCost excludes international freight

**API Mapping Tests**:
- [ ] `mapBreakdown()` maps `upsBase` -> `intlBase` for old records
- [ ] `mapBreakdown()` passes through `intlBase` for new records
- [ ] Missing fields default to 0

---

## 9. Implementation Order

### Phase 1: Type System + API Mapping (Foundation)

```
Step 1: Update CostBreakdown interface in types.ts
        - Remove domesticBase, domesticSurcharge
        - Rename upsBase→intlBase, upsFsc→intlFsc, upsWarRisk→intlWarRisk, upsSurge→intlSurge

Step 2: Update QuoteResult interface in types.ts
        - Remove domesticTruckType, isFreightMode
        - Add carrier: string
        - Make domesticTruckType optional in QuoteSummary, QuoteDetail

Step 3: Add mapBreakdown() transform in quoteApi.ts
        - Maps backend upsBase→intlBase etc.
        - Apply to fetchQuote() and getQuote() responses

Step 4: Update all UI consumers (will cause TS errors until done)
        - CostBreakdownCard.tsx: 3 field references
        - pdfService.ts: 4 field references
        - pdfService.test.ts: mock data
        - QuoteDetailModal.tsx: 7 field references + remove domestic rows
        - QuoteHistoryTable.test.tsx: mock data
```

### Phase 2: Config Cleanup

```
Step 5: Remove DOMESTIC_RATES from rates.ts
Step 6: Remove TRUCK_TIER_LIMITS from business-rules.ts
Step 7: Verify no remaining references (grep)
```

### Phase 3: Multi-Carrier Calculators

```
Step 8:  Create src/config/dhl_tariff.ts (port all 8 zones from backend)
Step 9:  Create src/config/emax_tariff.ts (2 rates + handling charge)
Step 10: Refactor determineUpsZone() - change keys from C3-C11 to Z1-Z10
Step 11: Update UPS_EXACT_RATES/UPS_RANGE_RATES keys in ups_tariff.ts (C3→Z1, etc.)
Step 12: Add determineDhlZone() function
Step 13: Add calculateDhlCosts() function (returns CarrierCostResult)
Step 14: Add calculateEmaxCosts() function (returns CarrierCostResult)
Step 15: Refactor calculateUpsCosts() to return CarrierCostResult
Step 16: Update calculateQuote() with carrier switch + generic field names
```

### Phase 4: Testing

```
Step 17: Add UPS zone mapping tests (new keys)
Step 18: Add DHL zone mapping + cost calculation tests
Step 19: Add EMAX cost calculation tests
Step 20: Add calculateQuote() integration tests (all 3 carriers)
Step 21: Add mapBreakdown() unit tests
Step 22: Run full suite: tsc --noEmit && npx vitest run && npm run build
```

---

## 10. Coding Convention Reference

### 10.1 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Carrier calculator naming | `calculate{Carrier}Costs()` - matches existing `calculateUpsCosts()` |
| Zone function naming | `determine{Carrier}Zone()` - matches existing `determineUpsZone()` |
| Tariff file naming | `{carrier}_tariff.ts` - snake_case, matches existing `ups_tariff.ts` |
| Config constants | `UPPER_SNAKE_CASE` - matches existing `UPS_EXACT_RATES` |
| Return types | `CarrierCostResult` interface for all carrier calculators |
| Field names | camelCase matching backend API response keys |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-24 | Initial draft | jaehong |
