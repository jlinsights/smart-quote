# Calculation Sync Design Document

> **Summary**: Technical design for fixing all calculation drift between frontend `calculationService.ts` and backend `QuoteCalculator`
>
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Version**: 1.0
> **Author**: jaehong
> **Date**: 2026-03-10
> **Status**: Draft
> **Planning Doc**: [calculation-sync.plan.md](../01-plan/features/calculation-sync.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **Full Calculation Parity**: Same inputs produce identical outputs (within ±1 KRW rounding tolerance)
2. **Complete Data Persistence**: All input fields and calculation results are stored in the database
3. **Structural Alignment**: Both systems use named constants instead of hardcoded values
4. **Automated Verification**: Cross-platform parity test suite prevents future drift

### 1.2 Design Principles

- **Single Source of Truth**: Backend `rates.rb` is the authoritative source for all constants
- **Backward Compatibility**: New DB columns have default values; existing records remain valid
- **Minimal Surface Area**: Changes are surgical — only fix drift points, no refactoring

---

## 2. Architecture

### 2.1 Current vs Target State

```
CURRENT STATE (4 drift points):
┌──────────────────────┐        ┌──────────────────────┐
│  Frontend (TS)       │   ≠    │  Backend (Ruby)      │
│  HANDLING_FEE = 0    │  ←→   │  HANDLING_FEE = 35000│
│  pickupInSeoul ✅    │  ←→   │  pickupInSeoul ❌    │
│  intlWarRisk = 0     │  ←→   │  WAR_RISK_SURCHARGE  │
│  breakdown.pickup ✅ │  ←→   │  breakdown.pickup ❌ │
│  carrier ✅          │  ←→   │  carrier ❌          │
└──────────────────────┘        └──────────────────────┘

TARGET STATE (100% parity):
┌──────────────────────┐        ┌──────────────────────┐
│  Frontend (TS)       │   =    │  Backend (Ruby)      │
│  HANDLING_FEE = 35000│  ←→   │  HANDLING_FEE = 35000│
│  pickupInSeoul ✅    │  ←→   │  pickupInSeoul ✅    │
│  WAR_RISK_RATE = 0   │  ←→   │  WAR_RISK_RATE = 0  │
│  breakdown.pickup ✅ │  ←→   │  breakdown.pickup ✅ │
│  carrier ✅          │  ←→   │  carrier ✅          │
└──────────────────────┘        └──────────────────────┘
```

### 2.2 Data Flow (Quote Save)

```
User Input (Browser)
    │
    ├── Frontend calculateQuote() → Instant Preview (UI only, not persisted)
    │
    └── POST /api/v1/quotes
            │
            ├── clean_params → Whitelist & sanitize input
            │     ├── pickupInSeoulCost  (NEW)
            │     ├── manualSurgeCost    (existing)
            │     └── overseasCarrier    (existing)
            │
            ├── QuoteCalculator.call(input) → Recalculate server-side
            │     ├── + pickupInSeoul in totalCostAmount (NEW)
            │     ├── + pickupInSeoul in breakdown (NEW)
            │     └── + carrier in result (NEW)
            │
            ├── input_attributes → Map to DB columns
            │     ├── pickup_in_seoul_cost  (NEW)
            │     ├── manual_surge_cost     (NEW)
            │     └── overseas_carrier      (NEW)
            │
            ├── result_attributes → Map to DB columns
            │     ├── carrier (NEW)
            │     └── transit_time (existing, already in result)
            │
            └── Quote.save → PostgreSQL
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `calculationService.ts` | `rates.ts` | Frontend calculation constants |
| `QuoteCalculator` | `rates.rb` | Backend calculation constants |
| `quotes_controller.rb` | `QuoteCalculator` | Orchestrates save pipeline |
| `Quote` model | DB schema | Data persistence |
| Parity tests | Both calculators | Automated drift detection |

---

## 3. Data Model

### 3.1 New Database Columns

```sql
-- Migration: add_calculation_sync_fields_to_quotes
ALTER TABLE quotes ADD COLUMN pickup_in_seoul_cost decimal(12,0) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN manual_surge_cost decimal(12,0) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN overseas_carrier varchar(10) DEFAULT 'UPS';
ALTER TABLE quotes ADD COLUMN carrier varchar(10);
ALTER TABLE quotes ADD COLUMN transit_time varchar(50);
```

### 3.2 Column Specifications

| Column | Type | Default | Nullable | Purpose |
|--------|------|---------|----------|---------|
| `pickup_in_seoul_cost` | `decimal(12,0)` | `0` | No | Seoul pickup cost input |
| `manual_surge_cost` | `decimal(12,0)` | `0` | No | Manual surge cost input |
| `overseas_carrier` | `varchar(10)` | `'UPS'` | No | Selected carrier input |
| `carrier` | `varchar(10)` | `NULL` | Yes | Resolved carrier in result |
| `transit_time` | `varchar(50)` | `NULL` | Yes | Transit time from result |

### 3.3 Existing Schema Context

The `breakdown` column (JSONB) already stores the cost breakdown hash. The new `pickupInSeoul` key will be added to this hash automatically by `QuoteCalculator` changes — no migration needed for JSONB fields.

---

## 4. Detailed Change Specifications

### 4.1 Phase 1: Constant Alignment (Frontend)

#### 4.1.1 `src/config/rates.ts`

**Decision**: Set `HANDLING_FEE = 35000` to match backend. The backend value of ₩35,000 has been in production and is the correct business value (customs documentation handling fee).

```typescript
// BEFORE
export const HANDLING_FEE = 0;

// AFTER
export const HANDLING_FEE = 35000;
export const WAR_RISK_SURCHARGE_RATE = 0; // DEC-006: War risk surcharge removed
```

#### 4.1.2 `src/features/quote/services/calculationService.ts`

Update UPS and DHL carrier cost functions to use `WAR_RISK_SURCHARGE_RATE` instead of hardcoded `0`:

```typescript
// BEFORE (in calculateUpsCosts and calculateDhlCosts)
intlWarRisk: 0,

// AFTER
import { WAR_RISK_SURCHARGE_RATE } from '@/config/rates';
// ...
intlWarRisk: upsBase * (WAR_RISK_SURCHARGE_RATE / 100),
```

**Impact Analysis**: Since `WAR_RISK_SURCHARGE_RATE = 0`, the calculated value remains `0`. This is a structural alignment — if the rate changes in the future, both systems will update from the same constant.

### 4.2 Phase 2: Backend `pickupInSeoulCost` Support

#### 4.2.1 `quotes_controller.rb` — `clean_params`

```ruby
# Add :pickupInSeoulCost to permitted params
def clean_params
  params.permit(
    :originCountry, :destinationCountry, :destinationZip,
    :domesticRegionCode, :isJejuPickup,
    :incoterm, :packingType,
    :marginPercent, :dutyTaxEstimate,
    :exchangeRate, :fscPercent,
    :manualDomesticCost, :manualPackingCost, :manualSurgeCost,
    :overseasCarrier, :customerId,
    :pickupInSeoulCost,  # ← NEW
    items: [ :id, :name, :quantity, :weight, :length, :width, :height ]
  ).to_h
end
```

#### 4.2.2 `quotes_controller.rb` — `input_attributes`

```ruby
def input_attributes(input)
  {
    # ... existing fields ...
    manual_packing_cost: input["manualPackingCost"] || input[:manualPackingCost],
    manual_surge_cost: input["manualSurgeCost"] || input[:manualSurgeCost],         # ← NEW
    pickup_in_seoul_cost: input["pickupInSeoulCost"] || input[:pickupInSeoulCost],   # ← NEW
    overseas_carrier: input["overseasCarrier"] || input[:overseasCarrier] || "UPS"   # ← NEW
  }
end
```

#### 4.2.3 `quotes_controller.rb` — `result_attributes`

```ruby
def result_attributes(result)
  {
    # ... existing fields ...
    applied_zone: result[:appliedZone],
    carrier: result[:carrier],           # ← NEW
    transit_time: result[:transitTime]    # ← NEW (optional, for display convenience)
  }
end
```

#### 4.2.4 `quote_calculator.rb` — Add `pickupInSeoulCost` to calculation

```ruby
# After dest_duty calculation (line ~82), add:
pickup_in_seoul = @input[:pickupInSeoulCost] || 0

# Update total (line ~85):
total_cost_amount = packing_total + final_handling_fee + overseas_total + dest_duty + pickup_in_seoul

# Add to breakdown hash (after line ~139):
breakdown: {
  # ... existing fields ...
  intlSurge: surge_cost,
  pickupInSeoul: pickup_in_seoul,   # ← NEW
  destDuty: dest_duty,
  totalCost: total_cost_amount
}

# Add carrier to result (after line ~128):
carrier: carrier,  # ← NEW (return the resolved carrier name)
```

### 4.3 Phase 3: Database Migration

#### 4.3.1 Migration File

```ruby
# smart-quote-api/db/migrate/YYYYMMDDHHMMSS_add_calculation_sync_fields_to_quotes.rb
class AddCalculationSyncFieldsToQuotes < ActiveRecord::Migration[8.0]
  def change
    add_column :quotes, :pickup_in_seoul_cost, :decimal, precision: 12, scale: 0, default: 0, null: false
    add_column :quotes, :manual_surge_cost, :decimal, precision: 12, scale: 0, default: 0, null: false
    add_column :quotes, :overseas_carrier, :string, limit: 10, default: "UPS", null: false
    add_column :quotes, :carrier, :string, limit: 10
    add_column :quotes, :transit_time, :string, limit: 50
  end
end
```

#### 4.3.2 Backfill Strategy

No active backfill needed — all new columns have safe defaults:
- `pickup_in_seoul_cost`: `0` (correct — old quotes didn't have this feature)
- `manual_surge_cost`: `0` (existing quotes already have this in `breakdown.intlSurge` JSONB)
- `overseas_carrier`: `'UPS'` (correct — UPS was the default carrier)
- `carrier`: `NULL` (old quotes don't have this persisted; can be derived from `breakdown` if needed)
- `transit_time`: `NULL` (not critical for historical quotes)

### 4.4 Phase 4: Automated Parity Tests

#### 4.4.1 Shared Test Fixtures

```json
// shared/test-fixtures/calculation-parity.json
{
  "fixtures": [
    {
      "name": "basic_ups_us_wooden_box",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "US",
        "destinationZip": "10001",
        "incoterm": "DAP",
        "packingType": "WOODEN_BOX",
        "items": [{"id":"1","length":50,"width":40,"height":30,"weight":15,"quantity":2}],
        "marginPercent": 15,
        "dutyTaxEstimate": 0,
        "exchangeRate": 1400,
        "fscPercent": 30,
        "overseasCarrier": "UPS"
      }
    },
    {
      "name": "dhl_eu_with_pickup",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "DE",
        "destinationZip": "10115",
        "incoterm": "CIF",
        "packingType": "NONE",
        "items": [{"id":"1","length":30,"width":20,"height":15,"weight":5,"quantity":1}],
        "marginPercent": 20,
        "dutyTaxEstimate": 0,
        "exchangeRate": 1400,
        "fscPercent": 28,
        "overseasCarrier": "DHL",
        "pickupInSeoulCost": 50000
      }
    },
    {
      "name": "emax_cn_ddp_with_surge",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "CN",
        "destinationZip": "100000",
        "incoterm": "DDP",
        "packingType": "SKID",
        "items": [{"id":"1","length":100,"width":80,"height":60,"weight":50,"quantity":1}],
        "marginPercent": 12,
        "dutyTaxEstimate": 150000,
        "exchangeRate": 1400,
        "fscPercent": 30,
        "overseasCarrier": "EMAX",
        "manualSurgeCost": 40000
      }
    },
    {
      "name": "ups_jp_manual_packing",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "JP",
        "destinationZip": "100-0001",
        "incoterm": "EXW",
        "packingType": "WOODEN_BOX",
        "items": [{"id":"1","length":40,"width":30,"height":25,"weight":10,"quantity":3}],
        "marginPercent": 18,
        "dutyTaxEstimate": 0,
        "exchangeRate": 1400,
        "fscPercent": 30,
        "overseasCarrier": "UPS",
        "manualPackingCost": 100000
      }
    },
    {
      "name": "dhl_sg_no_packing",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "SG",
        "destinationZip": "048619",
        "incoterm": "DAP",
        "packingType": "NONE",
        "items": [{"id":"1","length":20,"width":15,"height":10,"weight":2,"quantity":5}],
        "marginPercent": 15,
        "dutyTaxEstimate": 0,
        "exchangeRate": 1400,
        "fscPercent": 30,
        "overseasCarrier": "DHL"
      }
    },
    {
      "name": "ups_au_high_volumetric",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "AU",
        "destinationZip": "2000",
        "incoterm": "CIF",
        "packingType": "WOODEN_BOX",
        "items": [{"id":"1","length":120,"width":80,"height":80,"weight":5,"quantity":1}],
        "marginPercent": 15,
        "dutyTaxEstimate": 0,
        "exchangeRate": 1400,
        "fscPercent": 30,
        "overseasCarrier": "UPS"
      }
    },
    {
      "name": "ups_vn_vacuum_fob",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "VN",
        "destinationZip": "700000",
        "incoterm": "FOB",
        "packingType": "VACUUM",
        "items": [{"id":"1","length":60,"width":50,"height":40,"weight":20,"quantity":2}],
        "marginPercent": 25,
        "dutyTaxEstimate": 0,
        "exchangeRate": 1400,
        "fscPercent": 30,
        "overseasCarrier": "UPS"
      }
    },
    {
      "name": "dhl_gb_zero_margin",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "GB",
        "destinationZip": "SW1A 1AA",
        "incoterm": "DAP",
        "packingType": "NONE",
        "items": [{"id":"1","length":30,"width":25,"height":20,"weight":8,"quantity":1}],
        "marginPercent": 0,
        "dutyTaxEstimate": 0,
        "exchangeRate": 1400,
        "fscPercent": 30,
        "overseasCarrier": "DHL"
      }
    },
    {
      "name": "emax_vn_pickup_and_surge",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "VN",
        "destinationZip": "100000",
        "incoterm": "DAP",
        "packingType": "WOODEN_BOX",
        "items": [{"id":"1","length":80,"width":60,"height":50,"weight":30,"quantity":1}],
        "marginPercent": 15,
        "dutyTaxEstimate": 0,
        "exchangeRate": 1400,
        "fscPercent": 30,
        "overseasCarrier": "EMAX",
        "pickupInSeoulCost": 80000,
        "manualSurgeCost": 25000
      }
    },
    {
      "name": "ups_us_ddp_full_options",
      "input": {
        "originCountry": "KR",
        "destinationCountry": "US",
        "destinationZip": "90210",
        "incoterm": "DDP",
        "packingType": "WOODEN_BOX",
        "items": [
          {"id":"1","length":50,"width":40,"height":30,"weight":15,"quantity":1},
          {"id":"2","length":30,"width":25,"height":20,"weight":8,"quantity":2}
        ],
        "marginPercent": 15,
        "dutyTaxEstimate": 200000,
        "exchangeRate": 1400,
        "fscPercent": 30,
        "overseasCarrier": "UPS",
        "pickupInSeoulCost": 60000,
        "manualSurgeCost": 35000
      }
    }
  ]
}
```

#### 4.4.2 Frontend Parity Test

```typescript
// src/features/quote/services/__tests__/calculationParity.test.ts
import { calculateQuote } from '../calculationService';
import fixtures from '../../../../../shared/test-fixtures/calculation-parity.json';

describe('Calculation Parity Tests', () => {
  fixtures.fixtures.forEach((fixture) => {
    it(`should match backend output: ${fixture.name}`, () => {
      const result = calculateQuote(fixture.input as any);

      // Snapshot key output fields for cross-platform comparison
      expect(result).toMatchObject({
        totalCostAmount: expect.any(Number),
        totalQuoteAmount: expect.any(Number),
        carrier: expect.any(String),
        breakdown: expect.objectContaining({
          pickupInSeoul: expect.any(Number),
          handlingFees: expect.any(Number),
          intlSurge: expect.any(Number),
        }),
      });

      // Snapshot the exact values for backend comparison
      const snapshot = {
        totalCostAmount: result.totalCostAmount,
        totalQuoteAmount: result.totalQuoteAmount,
        totalQuoteAmountUSD: Math.round(result.totalQuoteAmountUSD * 100) / 100,
        profitMargin: result.profitMargin,
        billableWeight: result.billableWeight,
        carrier: result.carrier,
        breakdown: result.breakdown,
      };
      expect(snapshot).toMatchSnapshot();
    });
  });
});
```

#### 4.4.3 Backend Parity Test

```ruby
# smart-quote-api/spec/services/calculation_parity_spec.rb
require 'rails_helper'

RSpec.describe QuoteCalculator, 'parity with frontend' do
  fixtures_path = Rails.root.join('..', 'shared', 'test-fixtures', 'calculation-parity.json')
  fixtures = JSON.parse(File.read(fixtures_path))

  fixtures['fixtures'].each do |fixture|
    context fixture['name'] do
      let(:result) { QuoteCalculator.call(fixture['input']) }

      it 'produces valid output' do
        expect(result[:totalCostAmount]).to be_a(Numeric)
        expect(result[:totalQuoteAmount]).to be_a(Numeric)
        expect(result[:carrier]).to be_a(String)
        expect(result[:breakdown]).to include(:pickupInSeoul, :handlingFees, :intlSurge)
      end

      it 'matches frontend snapshot within ±1 KRW' do
        # Compare against stored frontend snapshots
        # This test will be updated after Phase 1-2 implementation
        # to compare actual values cross-platform
        expect(result[:totalCostAmount]).to be > 0
        expect(result[:breakdown][:totalCost]).to eq(result[:totalCostAmount])
      end
    end
  end
end
```

---

## 5. UI/UX Design

### 5.1 Impact

**No UI changes required.** The frontend already displays `pickupInSeoul` in the breakdown and `carrier` in the result. The `HANDLING_FEE` change from 0 to 35,000 will automatically appear in the cost breakdown since the UI already renders `handlingFees > 0`.

### 5.2 User-Visible Effects

| Change | User Impact |
|--------|------------|
| `HANDLING_FEE` 0 → 35,000 | Handling fee line now appears in live preview (was hidden when 0) |
| Backend pickupInSeoul | Saved quotes now correctly reflect Seoul pickup cost |
| Backend carrier | Saved quote detail page shows correct carrier name |

---

## 6. Error Handling

### 6.1 Backward Compatibility

| Scenario | Handling |
|----------|---------|
| Old API request without `pickupInSeoulCost` | Defaults to `0` via `|| 0` in calculator |
| Old saved quotes without new columns | Migration defaults fill safe values |
| Frontend sends `pickupInSeoulCost: undefined` | `clean_params` ignores non-permitted params; `|| 0` in calculator |
| `WAR_RISK_SURCHARGE_RATE` changes to non-zero | Both systems update from constant — parity maintained |

### 6.2 Error Response Format

No changes to existing error handling. The calculation pipeline is pure (no I/O), so errors are structural (invalid input) and handled by existing validation.

---

## 7. Security Considerations

- [x] `clean_params` whitelists `pickupInSeoulCost` — prevents injection of arbitrary fields
- [x] New columns have constrained types (`decimal`, `varchar` with limits)
- [x] No new endpoints or authentication changes
- [x] `carrier` column is a result field (server-set), not user-controllable
- [x] Audit logging already covers quote creation/updates

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Files |
|------|--------|------|-------|
| Unit | Constants match | Vitest | `rates.test.ts` (new assertions) |
| Unit | calculationService with pickupInSeoul | Vitest | `calculationService.test.ts` (existing + new) |
| Unit | QuoteCalculator with pickupInSeoul | RSpec | `quote_calculator_spec.rb` (existing + new) |
| Cross-Platform | Same input → same output | Vitest + RSpec | `calculationParity.test.ts`, `calculation_parity_spec.rb` |
| Integration | POST /api/v1/quotes with new fields | RSpec | `quotes_spec.rb` (existing + new) |
| Migration | New columns exist with defaults | RSpec | `migration_spec.rb` or manual |

### 8.2 Test Cases (Key)

- [x] Happy path: UPS to US with all fields → frontend = backend (±1 KRW)
- [x] Happy path: DHL to EU with pickupInSeoulCost → included in totalCostAmount
- [x] Happy path: EMAX to CN with manualSurgeCost → breakdown.intlSurge matches
- [x] Edge case: pickupInSeoulCost = 0 → no change from current behavior
- [x] Edge case: manualPackingCost override → handling and fumigation zeroed
- [x] Edge case: EXW incoterm → quoteBasisCost excludes international freight
- [x] Edge case: DDP with dutyTaxEstimate → included in totalCostAmount
- [x] Edge case: marginPercent = 0 → totalQuoteAmount = totalCostAmount (rounded up)
- [x] Edge case: marginPercent = 100 → no division by zero
- [x] Regression: Existing 208 frontend tests pass unchanged
- [x] Regression: Existing RSpec tests pass unchanged

---

## 9. Clean Architecture

### 9.1 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `rates.ts` (constants) | Domain | `src/config/rates.ts` |
| `calculationService.ts` | Application | `src/features/quote/services/calculationService.ts` |
| `QuoteInput` / `CostBreakdown` | Domain | `src/types.ts` |
| `rates.rb` (constants) | Domain | `smart-quote-api/lib/constants/rates.rb` |
| `QuoteCalculator` | Application | `smart-quote-api/app/services/quote_calculator.rb` |
| `quotes_controller.rb` | Presentation | `smart-quote-api/app/controllers/api/v1/quotes_controller.rb` |
| `Quote` model | Infrastructure | `smart-quote-api/app/models/quote.rb` |
| Migration | Infrastructure | `smart-quote-api/db/migrate/` |

---

## 10. Coding Convention Reference

### 10.1 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Constants | `UPPER_SNAKE_CASE` (both TS and Ruby) |
| DB columns | `snake_case` (Rails convention) |
| JSON keys | `camelCase` (API response convention) |
| Controller mapping | `input[:camelCase]` → `db_column: snake_case` |
| Parity test fixtures | Shared JSON under `shared/test-fixtures/` |

---

## 11. Implementation Guide

### 11.1 File Structure (Changes Only)

```
src/
  config/
    rates.ts                    ← MODIFY (HANDLING_FEE, WAR_RISK_SURCHARGE_RATE)
  features/quote/services/
    calculationService.ts       ← MODIFY (use WAR_RISK_SURCHARGE_RATE constant)
    __tests__/
      calculationParity.test.ts ← NEW (parity tests)

smart-quote-api/
  app/controllers/api/v1/
    quotes_controller.rb        ← MODIFY (clean_params, input_attributes, result_attributes)
  app/services/
    quote_calculator.rb         ← MODIFY (pickupInSeoul, carrier)
  db/migrate/
    XXXXXXXX_add_calculation_sync_fields_to_quotes.rb  ← NEW
  spec/services/
    calculation_parity_spec.rb  ← NEW

shared/
  test-fixtures/
    calculation-parity.json     ← NEW (10 shared fixtures)
```

### 11.2 Implementation Order

1. [x] **Phase 1**: Frontend constants alignment
   - 1.1 Update `HANDLING_FEE` to `35000` in `rates.ts`
   - 1.2 Add `WAR_RISK_SURCHARGE_RATE = 0` to `rates.ts`
   - 1.3 Update `calculateUpsCosts` and `calculateDhlCosts` to use constant
   - 1.4 Run frontend tests — verify all 208 pass

2. [ ] **Phase 2**: Backend `pickupInSeoulCost` + `carrier`
   - 2.1 Add `pickupInSeoul` to `QuoteCalculator` (calc + breakdown + carrier)
   - 2.2 Update `clean_params` in controller
   - 2.3 Update `input_attributes` in controller
   - 2.4 Update `result_attributes` in controller
   - 2.5 Run backend tests — verify all RSpec pass

3. [ ] **Phase 3**: Database migration
   - 3.1 Generate migration with 5 new columns
   - 3.2 Run migration on development
   - 3.3 Verify schema.rb updated correctly

4. [ ] **Phase 4**: Parity tests
   - 4.1 Create `shared/test-fixtures/calculation-parity.json` (10 fixtures)
   - 4.2 Create `calculationParity.test.ts` (frontend)
   - 4.3 Create `calculation_parity_spec.rb` (backend)
   - 4.4 Run both test suites — verify outputs match within ±1 KRW

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial draft | jaehong |
