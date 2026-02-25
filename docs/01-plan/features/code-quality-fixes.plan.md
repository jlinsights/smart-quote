# Code Quality Fixes Planning Document

> **Summary**: Address HIGH/MEDIUM code review findings — data accuracy, dead code cleanup, UX improvements, and frontend/backend consistency
>
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Author**: jaehong
> **Date**: 2026-02-25
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Resolve 5 HIGH and 13 MEDIUM severity issues identified during the comprehensive code review. These issues affect calculation accuracy (tariff gaps, zone mismatches), code maintainability (dead code, scattered imports), and user experience (limited country options, accessibility gaps).

### 1.2 Background

A full code review was performed on 2026-02-25 covering the entire Smart Quote codebase (frontend + backend). 3 CRITICAL issues were fixed immediately:
- C-1: `.env` added to `.gitignore`
- C-2: `GEMINI_API_KEY` removed from client bundle (`vite.config.ts`)
- C-3: `result!` non-null assertion replaced with proper null-safe typing

The remaining HIGH/MEDIUM issues are grouped into actionable work items below.

### 1.3 Scope

**In Scope**:
- Tariff data corrections (UPS gap, DHL range verification)
- Frontend/backend zone label alignment (DHL Z1/Z8)
- Backend breakdown field naming (ups → intl prefix)
- Dead code removal (unused constants, functions, imports)
- Import organization
- Country options expansion
- Accessibility: modal ESC/focus trap
- PDF reference number alignment with saved quotes

**Out of Scope**:
- LOW/INFO findings (tracked separately, non-blocking)
- New feature development
- Backend API redesign

---

## 2. Work Items

### 2.1 [HIGH] Data Accuracy

#### H-4: DHL Range Rate Verification
- **File**: `src/config/dhl_tariff.ts`
- **Issue**: 3 DHL range rate tiers (30.1-70, 70.1-300, 300.1+) have identical per-kg values
- **Action**: Verify against DHL tariff source document. If intentional, collapse to single range with comment. If data error, correct rates.
- **Backend Mirror**: `smart-quote-api/lib/constants/dhl_tariff.rb`

#### H-5: UPS Weight Gap (20.0-20.99kg)
- **File**: `src/config/ups_tariff.ts`, `calculationService.ts`
- **Issue**: UPS exact rates end at 20.0kg, range rates start at 21kg. Weights 20.0-20.99 hit fragile fallback.
- **Action**: Change UPS range rate min from 21 to 20.5, or add 20.5 to exact rates.
- **Backend Mirror**: `smart-quote-api/lib/constants/ups_tariff.rb`

### 2.2 [HIGH] Frontend/Backend Consistency

#### H-1: DHL Zone Label Mismatch
- **Files**: `calculationService.ts` (determineDhlZone), `dhl_zone.rb`
- **Issue**: DHL Z1 label differs (frontend: `CN/HK/SG/TW`, backend: `China/HK/SG`). Z8 explicit country list missing on frontend.
- **Action**: Align frontend labels to match backend exactly. Add explicit Z8 country list.

#### H-2: Backend Breakdown Field Naming
- **File**: `smart-quote-api/app/services/quote_calculator.rb`
- **Issue**: Backend returns `upsBase/upsFsc/upsWarRisk/upsSurge` for ALL carriers
- **Action**: Change to `intlBase/intlFsc/intlWarRisk/intlSurge`. Keep `mapBreakdown` backward compat layer in frontend.

#### H-3: API Query Param Falsy Check
- **File**: `src/api/quoteApi.ts`
- **Issue**: `if (params.page)` fails for `page=0`
- **Action**: Change to `if (params.page != null)` for all query params.

### 2.3 [MEDIUM] Dead Code Removal

| ID | File | Dead Code |
|----|------|-----------|
| M-1 | `src/config/rates.ts` | `ZONE_BASE_RATES` — legacy zone pricing |
| M-2 | `src/config/zones.ts` | `DEFAULT_COUNTRY_ZONES`, `CN_SOUTH_ZIP_RANGES` |
| M-3 | `calculationService.ts` | `calculateItemSurge` — keep with reactivation comment |
| M-4 | `src/config/business-rules.ts` | `INITIAL_MARGIN` |
| M-5 | `calculationService.ts` | `calculateCBM` / `totalCBM` |

### 2.4 [MEDIUM] Code Organization

#### M-7/M-8: Import Organization
- Move mid-file imports to top in `calculationService.ts` and `App.tsx`

#### M-11: Duplicate Constants
- Extract `STATUS_COLORS` from `QuoteHistoryTable.tsx` and `QuoteSearchBar.tsx` to shared `src/features/history/constants.ts`

### 2.5 [MEDIUM] UX Improvements

#### M-6: Expand Country Options
- **File**: `src/config/options.ts`
- **Action**: Add commonly shipped countries supported by zone tables (TH, PH, AU, IN, CA, ES, IT, FR, HK, TW, BR, AE, DE already present)

#### M-9: PDF Reference Number
- **File**: `src/lib/pdfService.ts`
- **Action**: Accept optional `referenceNo` param. Show saved ref or "DRAFT" if not saved.

#### M-10: DHL Z1 Label (MO missing)
- Already covered in H-1 alignment.

#### M-12: Modal Accessibility
- **File**: `src/features/history/components/QuoteDetailModal.tsx`
- **Action**: Add `Escape` key handler, `role="dialog"`, `aria-modal="true"`

#### M-13: CSV Export Cleanup
- **File**: `src/api/quoteApi.ts`
- **Action**: Wrap in try/finally for `URL.revokeObjectURL`

---

## 3. Implementation Order

```
Phase 1: Data Accuracy (H-4, H-5)
  └─ Verify DHL tariff source, fix UPS weight gap
  └─ Mirror changes to backend

Phase 2: Frontend/Backend Consistency (H-1, H-2, H-3)
  └─ Align zone labels, fix backend field names, fix API params

Phase 3: Dead Code & Organization (M-1~5, M-7~8, M-11)
  └─ Remove unused exports, move imports, extract shared constants

Phase 4: UX Improvements (M-6, M-9, M-12, M-13)
  └─ Country options, PDF ref, modal a11y, CSV cleanup
```

---

## 4. Acceptance Criteria

- [ ] All tariff data verified against source documents (UPS/DHL)
- [ ] Frontend/backend zone labels match exactly
- [ ] Backend returns carrier-agnostic field names
- [ ] No dead code exports (verified by grep)
- [ ] All imports at file top
- [ ] Country dropdown covers 15+ commonly shipped countries
- [ ] PDF shows saved reference number or "DRAFT"
- [ ] Modal closes on Escape key, has ARIA attributes
- [ ] `tsc --noEmit` + `eslint` + `vitest run` all pass
- [ ] No regressions in existing 70 tests

---

## 5. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| DHL tariff data correction | Rate accuracy for live quotes | Verify with actual DHL rate card before changing |
| Backend field rename (H-2) | API breaking change | Frontend `mapBreakdown` already handles both old/new names |
| Dead code removal | Accidental removal of used code | Grep verification before each removal |
| UPS weight gap fix | Rate accuracy at boundary | Add specific test case for 20.3kg weight |
