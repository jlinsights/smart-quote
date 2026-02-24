# Calculate Quote Improvement Planning Document

> **Summary**: Refactor and enhance the quote calculation pipeline - fix frontend/backend divergence, add DHL/EMAX frontend support, clean up dead code
>
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Version**: 0.0.0
> **Author**: jaehong
> **Date**: 2026-02-24
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Align the frontend calculation service with the backend's multi-carrier architecture, remove dead/stale code paths (domestic cost remnants), and ensure the `calculationService.ts` accurately mirrors `QuoteCalculator` for all three carriers (UPS, DHL, EMAX).

### 1.2 Background

The Smart Quote system has evolved through several iterations:

1. **Initial version**: UPS-only with domestic trucking costs
2. **Carrier expansion**: Backend added DHL (`Calculators::DhlCost`) and EMAX (`Calculators::EmaxCost`) support
3. **Domestic removal**: Domestic trucking was removed from calculation but remnants remain in types, config, and UI

**Current Problems:**
- **Frontend-backend divergence**: `calculationService.ts` only calculates UPS costs, while backend handles UPS/DHL/EMAX. The frontend relies entirely on the API for DHL/EMAX.
- **Dead code**: `QuoteResult.domesticTruckType` and `isFreightMode` are hardcoded to `'N/A'` and `false`. `CostBreakdown.domesticBase`/`domesticSurcharge` always return 0. `DOMESTIC_RATES` in `config/rates.ts` and `TRUCK_TIER_LIMITS` in `config/business-rules.ts` are unused.
- **Type naming**: `CostBreakdown` field names reference "ups" (e.g., `upsBase`, `upsFsc`) but these now represent any overseas carrier. The backend already uses generic names (`intl_base`, `intl_fsc`).
- **Zone mapping inconsistency**: Frontend uses `C3-C11` zone keys, backend uses `Z1-Z10`. Both work but map differently.
- **No DHL/EMAX tariff data on frontend**: `src/config/` has no `dhl_tariff.ts` or `emax_tariff.ts`
- **Test gaps**: Frontend tests don't cover `calculateQuote()` orchestrator or multi-carrier paths

### 1.3 Related Documents

- Quote History Plan: `docs/01-plan/features/quote-history.plan.md`
- Backend README: `smart-quote-api/README.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] Remove dead domestic cost code from types, config, and components
- [ ] Rename UPS-specific breakdown fields to carrier-generic names
- [ ] Add DHL/EMAX tariff data and zone mapping to frontend config
- [ ] Implement DHL/EMAX calculation in frontend `calculationService.ts`
- [ ] Align frontend zone mapping with backend (C3-C11 vs Z1-Z10)
- [ ] Add comprehensive tests for `calculateQuote()` orchestrator
- [ ] Add carrier-specific calculation tests (DHL, EMAX edge cases)
- [ ] Clean up `QuoteResult` type (remove/deprecate unused fields)

### 2.2 Out of Scope

- Rate management UI (admin panel for updating tariffs)
- Additional carrier support beyond UPS/DHL/EMAX
- Domestic trucking cost re-implementation
- PDF generation updates (will be a follow-up)
- Backend changes (backend is already correct)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Frontend calculates correct quotes for DHL carrier (matching backend output within rounding tolerance) | High | Pending |
| FR-02 | Frontend calculates correct quotes for EMAX carrier (CN/VN routes, 6000 volumetric divisor) | High | Pending |
| FR-03 | `CostBreakdown` uses carrier-generic field names (`intlBase`, `intlFsc`, `intlWarRisk`, `intlSurge`) | High | Pending |
| FR-04 | Dead domestic fields removed from `QuoteResult` and `CostBreakdown` | Medium | Pending |
| FR-05 | `domesticTruckType` and `isFreightMode` removed from `QuoteResult` interface | Medium | Pending |
| FR-06 | Unused config removed: `DOMESTIC_RATES`, `TRUCK_TIER_LIMITS` (if confirmed no references) | Medium | Pending |
| FR-07 | Frontend zone keys aligned with backend convention (Z1-Z10 for UPS, DHL zones for DHL) | Medium | Pending |
| FR-08 | `calculateQuote()` integration test: given standard input, output matches backend `QuoteCalculator.call()` | High | Pending |
| FR-09 | DHL zone mapping coverage for all supported countries | Medium | Pending |
| FR-10 | EMAX rate table for CN and VN (per-kg + handling charge) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Accuracy | Frontend calculation within ±1 KRW of backend for same input | Cross-comparison test |
| Performance | `calculateQuote()` completes in <10ms for typical input | Vitest benchmark |
| Maintainability | Single carrier interface so adding future carriers is straightforward | Code review |
| Type Safety | Zero `any` types in calculation service and config | `tsc --noEmit` |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] All FR-01 through FR-10 implemented
- [ ] `tsc --noEmit` passes with zero errors
- [ ] All Vitest tests pass (existing + new)
- [ ] No unused imports or dead code in calculation pipeline
- [ ] CostBreakdownCard renders correctly for all three carriers

### 4.2 Quality Criteria

- [ ] Test coverage for `calculationService.ts` functions ≥80%
- [ ] Zero lint errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Backend RSpec tests still pass after any shared type changes

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking `CostBreakdown` field rename across all consumers (PDF, UI, history) | High | High | Search all references before renaming; update in single coordinated change |
| DHL/EMAX tariff data accuracy (transcription errors from PDF) | High | Medium | Cross-validate with backend constants; add specific test cases with known outputs |
| Zone mapping divergence causing different prices frontend vs backend | High | Medium | Add integration test that calls both and compares outputs |
| Quote History records using old field names in JSONB `breakdown` column | Medium | High | Backend already stores camelCase keys; migration or dual-read for old records |
| Removing `domesticTruckType` breaks `QuoteSummary` and `QuoteDetail` types | Medium | Medium | Check all type references; backend still sends the field, make optional on frontend |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, services layer | Web apps with backend, SaaS MVPs | :white_check_mark: |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Carrier abstraction | Single function per carrier / Unified interface | Unified interface with carrier strategy | Backend already uses this pattern (`intl_base`, `intl_fsc`) |
| Field rename strategy | Gradual deprecation / Big-bang rename | Big-bang rename | Small codebase, can update all references in one pass |
| Tariff data format | Separate files per carrier / Combined | Separate files (`ups_tariff.ts`, `dhl_tariff.ts`, `emax_tariff.ts`) | Matches backend pattern, easier to update independently |
| Zone mapping location | Inside calculator / Separate module | Separate functions (existing pattern) | `determineUpsZone()` already separate; add `determineDhlZone()` |

### 6.3 Target Architecture

```
src/features/quote/services/
  calculationService.ts          # Main orchestrator + carrier routing
    ├── calculateItemCosts()     # Packing, surge, weights (unchanged)
    ├── calculateUpsCosts()      # UPS rate lookup (existing)
    ├── calculateDhlCosts()      # DHL rate lookup (NEW)
    ├── calculateEmaxCosts()     # EMAX rate lookup (NEW)
    └── calculateQuote()         # Orchestrator with carrier switch

src/config/
  ups_tariff.ts                  # UPS exact + range rates (existing)
  dhl_tariff.ts                  # DHL exact + range rates (NEW - from backend)
  emax_tariff.ts                 # EMAX per-kg rates (NEW - from backend)
  rates.ts                       # Shared constants (remove DOMESTIC_RATES)
  business-rules.ts              # Thresholds (remove TRUCK_TIER_LIMITS)

src/types.ts
  CostBreakdown                  # Renamed: upsBase→intlBase, upsFsc→intlFsc, etc.
  QuoteResult                    # Remove: domesticTruckType, isFreightMode
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] ESLint configuration (`.eslintrc.cjs`)
- [x] Prettier configuration (`.prettierrc`)
- [x] TypeScript configuration (`tsconfig.json`)
- [x] `CLAUDE.md` with project guide
- [x] Feature-based folder structure (`src/features/quote/`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Carrier interface** | UPS-only, no abstraction | Common return type for all carrier calculators | High |
| **Config naming** | `ups_tariff.ts` (snake_case file) | Keep snake_case for tariff files | Medium |
| **Breakdown field names** | `upsBase`, `upsFsc` (carrier-specific) | `intlBase`, `intlFsc` (carrier-generic) | High |
| **Zone key format** | Frontend: C3-C11, Backend: Z1-Z10 | Align to backend Z-prefix convention | Medium |

### 7.3 Implementation Order

```
Phase 1: Type System Changes (Breaking Change Foundation)
  1. Update CostBreakdown fields (upsBase→intlBase, etc.)
  2. Update QuoteResult (remove domesticTruckType, isFreightMode or make optional)
  3. Fix all consumer references (CostBreakdownCard, pdfService, quoteApi)

Phase 2: Config Cleanup
  4. Remove DOMESTIC_RATES from rates.ts
  5. Remove TRUCK_TIER_LIMITS from business-rules.ts
  6. Remove domestic breakdown fields from CostBreakdown (domesticBase, domesticSurcharge)

Phase 3: Multi-Carrier Frontend Calculators
  7. Create dhl_tariff.ts (port from backend constants)
  8. Create emax_tariff.ts (port from backend constants)
  9. Add determineDhlZone() function
  10. Add calculateDhlCosts() function
  11. Add calculateEmaxCosts() function
  12. Update calculateQuote() with carrier routing

Phase 4: Testing
  13. Integration test: calculateQuote() for UPS
  14. Integration test: calculateQuote() for DHL
  15. Integration test: calculateQuote() for EMAX
  16. Edge case tests: zone fallback, weight rounding, EMAX volumetric divisor
```

---

## 8. Next Steps

1. [ ] Write design document (`calculate-quote.design.md`) - `/pdca design calculate-quote`
2. [ ] Review and approval
3. [ ] Phase 1: Type system changes
4. [ ] Phase 2: Config cleanup
5. [ ] Phase 3: Multi-carrier calculators
6. [ ] Phase 4: Testing
7. [ ] Gap analysis - `/pdca analyze calculate-quote`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-24 | Initial draft | jaehong |
