# Calculation Sync - Frontend/Backend Parity Fix

> **Summary**: Fix all calculation drift between frontend `calculationService.ts` and backend `QuoteCalculator` to ensure saved quotes match live previews
>
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Author**: jaehong
> **Date**: 2026-03-10
> **Status**: Draft
> **Priority**: Critical

---

## 1. Overview

### 1.1 Purpose

The Smart Quote System runs **mirrored calculation logic** in both frontend (instant preview) and backend (saved quotes). Several fields have drifted out of sync, causing saved quotes to differ from what users see on screen. This plan addresses all identified drift points to restore full calculation parity.

### 1.2 Background

Code analysis revealed 4 confirmed drift points between `src/features/quote/services/calculationService.ts` and `smart-quote-api/app/services/quote_calculator.rb`. The most impactful is `pickupInSeoulCost` being included in frontend totals but completely missing from the backend.

### 1.3 Related Documents

- Code Analysis: `/code_analysis` (2026-03-10, Score: 82/100)
- Architecture: `CLAUDE.md` → Mirrored Calculation Logic section

---

## 2. Drift Analysis

### 2.1 Confirmed Drift Points

| # | Field | Frontend | Backend | Impact | Severity |
|---|-------|----------|---------|--------|----------|
| 1 | `pickupInSeoulCost` | Included in `totalCostAmount` (line 388) | **Missing entirely** - not in `clean_params`, `input_attributes`, or `QuoteCalculator` | Saved quotes exclude Seoul pickup cost → cost/margin mismatch | **Critical** |
| 2 | `HANDLING_FEE` | `0` (`src/config/rates.ts:8`) | `35000` (`lib/constants/rates.rb:47`) | Backend adds ₩35,000 handling fee that frontend doesn't show | **Critical** |
| 3 | `WAR_RISK_SURCHARGE_RATE` | Hardcoded `intlWarRisk: 0` in carrier cost functions | `ups_base * WAR_RISK_SURCHARGE_RATE` (currently 0, but dynamic) | If rate changes to non-zero, backend will diverge silently | **Warning** |
| 4 | `breakdown.pickupInSeoul` | Present in frontend output (line 444) | **Missing** from backend `breakdown` hash (line 130-141) | Saved quote breakdown incomplete | **Critical** |

### 2.2 Params/Persistence Gaps

| Field | `clean_params` | `input_attributes` | `result_attributes` | DB Column |
|-------|---------------|--------------------|--------------------|-----------|
| `pickupInSeoulCost` | ❌ Missing | ❌ Missing | N/A | ❌ Missing |
| `manualSurgeCost` | ✅ Present | ❌ Missing | N/A | ❌ Missing |
| `overseasCarrier` | ✅ Present | ❌ Missing | N/A | Check needed |

### 2.3 Constants Comparison

| Constant | Frontend (`src/config/rates.ts`) | Backend (`lib/constants/rates.rb`) | Match? |
|----------|--------------------------------|-----------------------------------|--------|
| `HANDLING_FEE` | `0` | `35,000` | ❌ **MISMATCH** |
| `FUMIGATION_FEE` | `30,000` | `30,000` | ✅ |
| `PACKING_MATERIAL_BASE_COST` | `15,000` | `15,000` | ✅ |
| `PACKING_LABOR_UNIT_COST` | `50,000` | `50,000` | ✅ |
| `DEFAULT_EXCHANGE_RATE` | `1,400` | `1,400` | ✅ |
| `DEFAULT_FSC_PERCENT` | `30` | `30` | ✅ |
| `WAR_RISK_SURCHARGE_RATE` | (hardcoded 0) | `0` (constant) | ⚠️ Structural |

---

## 3. Scope

### 3.1 In Scope

- [x] Fix `HANDLING_FEE` mismatch (align frontend ↔ backend to single source of truth)
- [ ] Add `pickupInSeoulCost` to backend pipeline (`clean_params` → `QuoteCalculator` → `breakdown` → DB)
- [ ] Add `manualSurgeCost` to `input_attributes` for persistence
- [ ] Add `WAR_RISK_SURCHARGE_RATE` constant to frontend config
- [ ] Add `pickupInSeoul` to backend `breakdown` output
- [ ] Add `carrier` field to backend result output (frontend returns it, backend doesn't)
- [ ] Create automated parity test suite (same inputs → same outputs)
- [ ] Database migration for new columns (`pickup_in_seoul_cost`, `manual_surge_cost`, `overseas_carrier`)

### 3.2 Out of Scope

- Tariff table sync (UPS/DHL/EMAX rate tables) - separate effort
- Zone mapping verification - separate effort
- UI changes - calculation-only focus
- New carrier support

---

## 4. Implementation Plan

### Phase 1: Constant Alignment (Frontend)
**Effort**: Small | **Risk**: Low

1. Determine correct `HANDLING_FEE` value (confirm with business: is it 0 or 35,000?)
2. Align `src/config/rates.ts` with `lib/constants/rates.rb`
3. Add `WAR_RISK_SURCHARGE_RATE = 0` to `src/config/rates.ts`
4. Update frontend carrier cost functions to use `WAR_RISK_SURCHARGE_RATE` instead of hardcoded 0

**Files**:
- `src/config/rates.ts`
- `src/features/quote/services/calculationService.ts` (UPS/DHL war risk lines)

### Phase 2: Backend `pickupInSeoulCost` Support
**Effort**: Medium | **Risk**: Medium

1. Add `pickupInSeoulCost` to `clean_params` in `quotes_controller.rb`
2. Add `pickup_in_seoul_cost` to `input_attributes` mapping
3. Update `QuoteCalculator#call` to include `pickupInSeoul` in `total_cost_amount`
4. Add `pickupInSeoul` to backend `breakdown` hash
5. Add `carrier` to result output

**Files**:
- `smart-quote-api/app/controllers/api/v1/quotes_controller.rb`
- `smart-quote-api/app/services/quote_calculator.rb`

### Phase 3: Database Migration
**Effort**: Small | **Risk**: Low

1. Add columns: `pickup_in_seoul_cost`, `manual_surge_cost`, `overseas_carrier`
2. Add `result_attributes` mapping for new fields
3. Backfill existing records if needed (default 0 for costs)

**Files**:
- New migration file
- `smart-quote-api/app/models/quote.rb` (if validations needed)
- `smart-quote-api/app/controllers/api/v1/quotes_controller.rb` (`input_attributes`, `result_attributes`)

### Phase 4: Automated Parity Tests
**Effort**: Medium | **Risk**: Low

1. Create shared test fixtures (JSON) with known inputs
2. Frontend test: run `calculateQuote()` on fixtures, snapshot outputs
3. Backend test: run `QuoteCalculator.call()` on same fixtures, compare
4. CI integration: fail build if outputs diverge beyond rounding tolerance (±1 KRW)

**Files**:
- `src/features/quote/services/__tests__/calculationParity.test.ts` (new)
- `smart-quote-api/spec/services/calculation_parity_spec.rb` (new)
- `shared/test-fixtures/calculation-parity.json` (new, shared fixtures)

---

## 5. Success Criteria

| Metric | Target |
|--------|--------|
| Constants match (frontend ↔ backend) | 100% (all values identical) |
| Calculation output match (same input → same output) | ≤ ±1 KRW difference (rounding) |
| All `breakdown` fields present in both | 100% |
| All input params persisted to DB | 100% |
| Automated parity tests | ≥ 10 fixture scenarios passing |
| Existing tests pass | 1138 frontend + all RSpec |

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `HANDLING_FEE` change affects existing saved quotes | Medium | High | Verify business intent before changing; document decision |
| Migration breaks existing quote records | Low | High | Default values for new columns; backward-compatible |
| Parity test false positives from rounding | Low | Low | Allow ±1 KRW tolerance |
| Tariff table drift not covered | Medium | Medium | Out of scope; plan separate tariff sync effort |

---

## 7. Timeline Estimate

| Phase | Duration | Dependency |
|-------|----------|------------|
| Phase 1: Constants | 1 hour | Business confirmation on HANDLING_FEE |
| Phase 2: Backend pickup | 2 hours | Phase 1 |
| Phase 3: Migration | 1 hour | Phase 2 |
| Phase 4: Parity tests | 3 hours | Phase 2 |
| **Total** | **~7 hours** | |
