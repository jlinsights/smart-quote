# Gap Analysis: calculate-quote

**Date**: 2026-02-24
**Match Rate**: 100% (iteration 1: 84% -> iteration 2: 100%)
**Status**: PASS (>= 90% threshold)

## Summary

| Category | Count |
|----------|-------|
| Matched | 31 |
| Partial | 0 |
| Gap | 0 |

## Iteration History

| Iteration | Match Rate | Gaps Fixed |
|-----------|-----------|------------|
| 1 (initial) | 84% | - |
| 2 (auto-fix) | 100% | GAP-1, GAP-2, GAP-3 |

## Resolved Gaps (from Iteration 1)

### GAP-1: UPS Zone Key Rename (HIGH) - RESOLVED
- **Fix**: Replaced `ups_tariff.ts` entirely with backend Z1-Z10 rates (10 zones, was 9)
- **Fix**: Rewrote `determineUpsZone()` with Z1-Z10 keys matching backend `ups_zone.rb`
- **Fix**: Updated UPS zone tests to assert Z1-Z10 keys

### GAP-2: UPS Country Grouping Alignment (MEDIUM) - RESOLVED
- **Fix**: SG moved to Z1 (was C4), TH to Z3 (was default), PH to Z3 (was C4)
- **Fix**: All 10 zone country groups now match backend exactly

### GAP-3: mapBreakdown() Unit Tests (MEDIUM) - RESOLVED
- **Fix**: Created `src/api/__tests__/quoteApi.test.ts` with 4 tests
- Tests: old->new mapping, passthrough, priority, missing field defaults

## All Matched Items (31)

1. CostBreakdown field rename: upsBase -> intlBase, upsFsc -> intlFsc, upsWarRisk -> intlWarRisk, upsSurge -> intlSurge
2. domesticBase, domesticSurcharge removed from CostBreakdown
3. QuoteResult: domesticTruckType, isFreightMode removed; carrier added
4. QuoteSummary/QuoteDetail: domesticTruckType made optional
5. mapBreakdown() added in quoteApi.ts for backend compatibility
6. CostBreakdownCard.tsx updated to intl* fields
7. pdfService.ts updated to intl* fields
8. pdfService.test.ts mock data updated
9. QuoteDetailModal.tsx: domestic rows removed, labels changed to "Intl."
10. QuoteHistoryTable.test.tsx mock updated
11. DOMESTIC_RATES removed from rates.ts
12. TRUCK_TIER_LIMITS removed from business-rules.ts
13. No remaining domestic references (verified by grep)
14. DHL tariff ported to src/config/dhl_tariff.ts (8 zones, exact + range rates)
15. EMAX tariff created at src/config/emax_tariff.ts
16. determineDhlZone() function implemented (Z1-Z8)
17. calculateDhlCosts() with exact/range rate lookup, FSC, war risk
18. calculateEmaxCosts() with ceil(weight)*perKgRate + handling
19. calculateUpsCosts() refactored to return CarrierCostResult
20. calculateQuote() carrier switch routing (UPS/DHL/EMAX)
21. ItemCalculationResult.upsSurgeCost renamed to surgeCost
22. UpsCalculationResult renamed to CarrierCostResult
23. EMAX uses 6000 volumetric divisor
24. DHL zone tests (5 tests)
25. DHL cost tests (5 tests)
26. EMAX cost tests (4 tests)
27. UPS zone keys Z1-Z10 aligned with backend
28. UPS country groupings match backend exactly
29. UPS tariff rates match backend (10 zones)
30. mapBreakdown() unit tests (4 tests)
31. UPS zone tests assert Z1-Z10 keys (7 tests)

## Verification

- TypeScript: `tsc --noEmit` - 0 errors
- Tests: 63 tests pass (7 files)
- Surge logic: carrier-aware (UPS only, linter-applied enhancement)

## Recommendation

Match rate 100% >= 90% threshold. Ready for `/pdca report calculate-quote`.
