# Gap Analysis: surcharge-management-v2

## Overview

| Field | Value |
|-------|-------|
| Feature | Surcharge Management V2 |
| Analysis Date | 2026-03-12 |
| Design Document | `docs/02-design/features/surcharge-management-v2.design.md` |
| Total Checklist Items | 27 |
| Match Rate | **100%** |
| Status | **PASS** |

---

## Item-by-Item Verification

### Phase 1: PDF Enhancement (Items 1-7)

| # | Item | File | Match | Notes |
|---|------|------|:-----:|-------|
| 1 | `drawCostTable` - individual `appliedSurcharges` iteration | `src/lib/pdfService.ts` | FULL | Iterates `bd.appliedSurcharges`, renders `nameKo \|\| name` with rate suffix |
| 2 | `drawCostTable` - Manual Surge separate row | `src/lib/pdfService.ts` | FULL | `intlManualSurge` rendered inside appliedSurcharges block |
| 3 | `drawCostTable` - backward compat fallback | `src/lib/pdfService.ts` | FULL | `else` branch falls back to `intlWarRisk` + `intlSurge` |
| 4 | `drawHeader` - `validityDate` parameter + display | `src/lib/pdfService.ts` | FULL | Signature includes `validityDate?: string`, displays "Valid until:" |
| 5 | `drawDisclaimer` - new function (Ko/En dual text) | `src/lib/pdfService.ts` | FULL | Ko/En disclaimer text and rate date line |
| 6 | `generatePDF` - integrates drawDisclaimer | `src/lib/pdfService.ts` | FULL | Calculates validityDate, passes to drawHeader, calls drawDisclaimer |
| 7 | `generateComparisonPDF` - validityDate + drawDisclaimer | `src/lib/pdfService.ts` | FULL | comparisonValidityDate calculated and passed through |

### Phase 2: Backend - Validity & Status (Items 8-15)

| # | Item | File | Match | Notes |
|---|------|------|:-----:|-------|
| 8 | Migration: `add_validity_date` to quotes | `smart-quote-api/db/migrate/20260312100001_*.rb` | FULL | `add_column` with backfill SQL |
| 9 | Quote model: statuses, scope, callbacks | `smart-quote-api/app/models/quote.rb` | FULL | VALID_STATUSES, stale_drafts, expired?, set_validity_date |
| 10 | Create action: validity_date auto-set | model callback | FULL | `before_create :set_validity_date` |
| 11 | Update action: extended allowed statuses | `quotes_controller.rb` | FULL | Uses `Quote::VALID_STATUSES.include?` |
| 12 | Index action: auto-expire stale drafts | `quotes_controller.rb` | FULL | `stale_drafts.update_all(status: "expired")` before query |
| 13 | `quote_summary`: validityDate + surchargeStale | `quotes_controller.rb` | FULL | Both fields added to summary serialization |
| 14 | `quote_detail`: validityDate | `quotes_controller.rb` | FULL | Added to detail serialization |
| 15 | `surcharge_stale?` helper | `quotes_controller.rb` | FULL | Compares stored vs current surcharges (codes + amounts) |

### Phase 3: Frontend - Types, Status & Stale (Items 16-25)

| # | Item | File | Match | Notes |
|---|------|------|:-----:|-------|
| 16 | `QuoteStatus` extended | `src/types.ts` | FULL | Added `confirmed \| expired` |
| 17 | `validityDate` on QuoteSummary/QuoteDetail | `src/types.ts` | FULL | `string \| null` on both types |
| 18 | `surchargeStale` on QuoteSummary | `src/types.ts` | FULL | `surchargeStale?: boolean` |
| 19 | STATUS_COLORS for confirmed/expired | `src/features/history/constants.ts` | FULL | Emerald + orange colors |
| 20 | `updateQuoteStatus` uses QuoteStatus type | `src/api/quoteApi.ts` | FULL | Imported and applied |
| 21 | Server-provided validityDate in table | `QuoteHistoryTable.tsx` | FULL | `getExpiryFromDate(validityDate)` replaces client calc |
| 22 | Surcharge stale badge | `QuoteHistoryTable.tsx` | FULL | Amber badge with AlertTriangle in mobile + desktop |
| 23 | STATUS_FLOW extended | `QuoteDetailModal.tsx` | FULL | 6 statuses including confirmed/expired |
| 24 | Validity field in Route & Service | `QuoteDetailModal.tsx` | FULL | Displays `quote.validityDate` |
| 25 | Individual surcharge rows in modal | `QuoteDetailModal.tsx` | FULL | Maps appliedSurcharges + backward compat fallback |

### Phase 4: i18n (Item 26)

| # | Item | File | Match | Notes |
|---|------|------|:-----:|-------|
| 26 | 9 new keys in 4 languages | `src/i18n/translations.ts` | FULL | ko, en, cn, ja all present |

### Phase 5: Surcharge Cache Tracking (Item 27)

| # | Item | File | Match | Notes |
|---|------|------|:-----:|-------|
| 27 | `track_surcharges_updated!` on CUD | `surcharges_controller.rb` | FULL | Cache write on create/update/destroy |

---

## Acceptable Deviations

| # | Item | Deviation | Impact |
|---|------|-----------|--------|
| 15 | `surcharge_stale?` | Adds `rescue => e` block with logging (not in design) | None - defensive improvement |

## Gaps Found

None.

## Validation Results

- TypeScript: `npx tsc --noEmit` PASS
- Tests: `npx vitest run` 1153 tests PASS (25 files)
- Lint: `npm run lint` PASS

## Recommendation

**PASS** - Match rate 100%. Proceed to `/pdca report surcharge-management-v2`.
