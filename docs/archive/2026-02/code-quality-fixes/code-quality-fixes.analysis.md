# Gap Analysis: code-quality-fixes

> **Feature**: code-quality-fixes
> **Design Doc**: `docs/02-design/features/code-quality-fixes.design.md`
> **Analysis Date**: 2026-02-25
> **Match Rate**: 97%

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Phase 1: Data Accuracy (H-4, H-5) | 100% | PASS |
| Phase 2: FE/BE Consistency (H-1, H-2, H-3) | 100% | PASS |
| Phase 3: Dead Code & Organization (M-1~5, M-7~8, M-11) | 94% | WARN |
| Phase 4: UX Improvements (M-6, M-9, M-12, M-13) | 94% | WARN |
| **Overall** | **97%** | **PASS** |

---

## Item-by-Item Results

| ID | Requirement | Status | Notes |
|----|------------|:------:|-------|
| H-4 | DHL range rates collapse (FE+BE) | PASS | Single tier, matching comment |
| H-5 | UPS range min=20.5, max=99999 (FE+BE) | PASS | Exact match |
| H-1 | DHL Z1 label `China/HK/SG/TW` + Z8 explicit | PASS | FE+BE aligned |
| H-2 | Backend `intl*` fields, legacy removed | PASS | mapBreakdown priority swapped |
| H-3 | API `!= null` for numeric params | PASS | page, perPage fixed |
| M-1 | ZONE_BASE_RATES removed | PASS | 0 grep hits |
| M-2 | zones.ts deleted, DomesticRegionCode removed | PASS | File gone, type removed |
| M-3 | calculateItemSurge retained with comment | PASS | Retention comment present |
| M-4 | INITIAL_MARGIN removed | PASS | 0 grep hits |
| M-5 | calculateCBM + totalCBM removed | PASS | 0 grep hits |
| M-7 | calculationService.ts imports at top | PASS | All imports lines 1-24 |
| M-8 | App.tsx imports at top | PASS | All imports lines 1-12 |
| M-11 | STATUS_COLORS extracted to constants.ts | PASS | Both consumers updated |
| M-6 | Country options expanded to 22 | PASS | 22 entries, region-grouped |
| M-9 | PDF ref fallback = 'DRAFT' | PASS | `referenceNo \|\| 'DRAFT'` |
| M-12 | Modal ESC + ARIA attributes | PASS | useEffect + role/aria attrs |
| M-13 | CSV try/finally for revokeObjectURL | PARTIAL | No DOM append/remove (OK) |

---

## Minor Deviations (Non-blocking)

1. **domesticTruckType in types.ts**: Optional fields retained in `QuoteSummary` and `QuoteDetail` for backward compatibility with saved database records. Design called for full removal but this is a reasonable deviation.

2. **STATUS_COLORS CSS opacity**: Design specified `dark:bg-blue-900/30`, implementation uses `/40`. Cosmetic only.

3. **CSV export simplification**: Design specified `appendChild/removeChild` around `a.click()`. Implementation calls `a.click()` directly (works in all modern browsers). Functionally equivalent.

---

## Validation Criteria

- [x] `npx tsc --noEmit` — 0 errors
- [x] `npm run lint` — 0 warnings
- [x] `npx vitest run` — 68 tests pass
- [x] Dead code grep = 0 results
- [x] All imports at file top
- [x] Country dropdown shows 22 options
- [x] PDF shows "DRAFT" when no referenceNo
- [x] Modal closes on Escape key

---

## Recommendation

Match rate **97%** exceeds 90% threshold. Ready for `/pdca report code-quality-fixes`.
