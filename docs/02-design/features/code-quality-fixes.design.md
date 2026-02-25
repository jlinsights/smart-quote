# Code Quality Fixes Design Document

> **Feature**: code-quality-fixes
> **Plan Reference**: `docs/01-plan/features/code-quality-fixes.plan.md`
> **Author**: jaehong
> **Date**: 2026-02-25
> **Status**: Draft

---

## 1. Implementation Phases

### Phase 1: Data Accuracy (H-4, H-5)
### Phase 2: Frontend/Backend Consistency (H-1, H-2, H-3)
### Phase 3: Dead Code & Organization (M-1~5, M-7~8, M-11)
### Phase 4: UX Improvements (M-6, M-9, M-12, M-13)

---

## 2. Phase 1: Data Accuracy

### 2.1 H-4: DHL Range Rates — Collapse to Single Entry

**Current State** (identical in frontend `dhl_tariff.ts:119-123` and backend `dhl_tariff.rb:502-505`):
```typescript
// 3 tiers with IDENTICAL values
{ min: 30.1, max: 70,    rates: { Z1: 7752, Z2: 8398, ... Z8: 27208 } },
{ min: 70.1, max: 300,   rates: { Z1: 7752, Z2: 8398, ... Z8: 27208 } },
{ min: 300.1, max: 99999, rates: { Z1: 7752, Z2: 8398, ... Z8: 27208 } },
```

**Design Decision**: Collapse to single entry. The 3 tiers exist in the actual DHL tariff structure but currently share the same per-kg rates. Keep the structure ready for future differentiation.

**Target State**:
```typescript
// Frontend: src/config/dhl_tariff.ts
export const DHL_RANGE_RATES = [
  // All tiers share same per-kg rate as of 2026-02 tariff.
  // Split into tiers if DHL updates with differentiated rates.
  { min: 30.1, max: 99999, rates: { 'Z1': 7752, 'Z2': 8398, 'Z3': 10526, 'Z4': 12122, 'Z5': 12502, 'Z6': 18810, 'Z7': 21242, 'Z8': 27208 } },
];
```

**Backend Mirror**: Same collapse in `smart-quote-api/lib/constants/dhl_tariff.rb`.

### 2.2 H-5: UPS Range Rate Gap (20.0-20.99kg)

**Current State**:
- Frontend: `UPS_RANGE_RATES = [{ min: 21, max: 9999, rates: {...} }]`
- Backend: `UPS_RANGE_RATES = [{ min: 0, max: 0, rates: {...} }]`
- Both rely on fallback logic for 20.5-20.99kg weights

**Design Decision**: Frontend range min changes from `21` to `20.5`. Backend `min: 0, max: 0` changes to `min: 20.5, max: 99999` for clarity (currently works by accident via fallback).

**Target State**:
```typescript
// Frontend: src/config/ups_tariff.ts
export const UPS_RANGE_RATES = [
  { min: 20.5, max: 99999, rates: { 'Z1': 6232, ... 'Z10': 6270 } },
];
```

```ruby
# Backend: smart-quote-api/lib/constants/ups_tariff.rb
UPS_RANGE_RATES = [
  { min: 20.5, max: 99999, rates: { 'Z1' => 6232, ... 'Z10' => 6270 } },
]
```

**New Test Case**:
```typescript
it('correctly prices 20.3kg weight (boundary between exact and range)', () => {
  const result = calculateUpsCosts(20.3, 'US', 30);
  // 20.3 -> ceil to 21kg -> 21 * Z5 per-kg rate
  expect(result.intlBase).toBe(21 * 11096);
});
```

---

## 3. Phase 2: Frontend/Backend Consistency

### 3.1 H-1: DHL Zone Labels Alignment

**Current Mismatches**:

| Zone | Frontend Label | Backend Label | Action |
|------|---------------|---------------|--------|
| Z1 | `CN/HK/SG/TW` | `China/HK/SG` | Frontend → `China/HK/SG/TW` |
| Z8 (explicit) | _(missing — falls to default)_ | `S.Am/Africa/ME` | Add explicit country list + label |
| Z8 (default) | `Rest of World` | `Rest of World` | OK |

**Target State** (`calculationService.ts` `determineDhlZone`):
```typescript
if (['CN', 'HK', 'MO', 'SG', 'TW'].includes(country))
  return { rateKey: 'Z1', label: 'China/HK/SG/TW' };
// ...existing Z2-Z7...
if (['BR', 'AR', 'CL', 'CO', 'ZA', 'EG', 'AE', 'TR', 'BH', 'IL', 'JO', 'LB', 'SA', 'PK'].includes(country))
  return { rateKey: 'Z8', label: 'S.Am/Africa/ME' };
return { rateKey: 'Z8', label: 'Rest of World' };
```

**Backend**: Change Z1 label from `China/HK/SG` to `China/HK/SG/TW` for consistency (includes TW and MO in the check).

### 3.2 H-2: Backend Breakdown Field Naming

**Current**: Backend `quote_calculator.rb:127-140` uses `upsBase`, `upsFsc`, `upsWarRisk`, `upsSurge` for ALL carriers.

**Target** (`quote_calculator.rb`):
```ruby
breakdown: {
  packingMaterial: item_result[:packing_material_cost],
  packingLabor: item_result[:packing_labor_cost],
  packingFumigation: packing_fumigation_cost,
  handlingFees: final_handling_fee,
  intlBase: overseas_result[:intl_base],     # was upsBase
  intlFsc: overseas_result[:intl_fsc],       # was upsFsc
  intlWarRisk: overseas_result[:intl_war_risk], # was upsWarRisk
  intlSurge: surge_cost,                     # was upsSurge
  destDuty: dest_duty,
  totalCost: total_cost_amount
}
```

Also remove legacy fields: `domesticBase: 0`, `domesticSurcharge: 0`, `domesticTruckType: "N/A"`, `isFreightMode: false`.

**Frontend `mapBreakdown`**: Already handles both `raw.upsBase ?? raw.intlBase`. After backend migration, swap priority:
```typescript
intlBase: raw.intlBase ?? raw.upsBase ?? 0,  // prefer new name
```

### 3.3 H-3: API Query Param Null Check

**Current** (`quoteApi.ts:75-81`):
```typescript
if (params.page) searchParams.set('page', String(params.page));
```

**Target**:
```typescript
if (params.page != null) searchParams.set('page', String(params.page));
if (params.perPage != null) searchParams.set('per_page', String(params.perPage));
if (params.q) searchParams.set('q', params.q);  // string: empty = falsy is fine
if (params.destinationCountry) searchParams.set('destination_country', params.destinationCountry);
if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
if (params.dateTo) searchParams.set('date_to', params.dateTo);
if (params.status) searchParams.set('status', params.status);
```

Only `page` and `perPage` (numeric) need `!= null`. String params are fine with truthy check.

---

## 4. Phase 3: Dead Code & Organization

### 4.1 Dead Code Removal

| ID | File | Export to Remove | Verification |
|----|------|-----------------|--------------|
| M-1 | `src/config/rates.ts` | `ZONE_BASE_RATES` | `grep -r "ZONE_BASE_RATES" src/` = 0 hits |
| M-2 | `src/config/zones.ts` | `DEFAULT_COUNTRY_ZONES`, `CN_SOUTH_ZIP_RANGES` | Not imported outside `zones.ts` |
| M-4 | `src/config/business-rules.ts` | `INITIAL_MARGIN` | Not imported anywhere |
| M-5 | `calculationService.ts` | `calculateCBM` function, `totalCBM` in `ItemCalculationResult` | Not used in `calculateQuote` or consumers |

**M-3 Exception**: Keep `calculateItemSurge` with explicit comment:
```typescript
// Retained for future reactivation of carrier surge auto-calculation.
// Currently tested but not called in production code path.
```

**M-2 Partial**: Keep `DOMESTIC_REGIONS` (used by `zones.ts` internal export, potentially used by RouteSection). Remove only `DEFAULT_COUNTRY_ZONES` and `CN_SOUTH_ZIP_RANGES`. If `DOMESTIC_REGIONS` is also unused after grep check, remove `DomesticRegionCode` from `types.ts` too.

### 4.2 Import Organization

**`calculationService.ts`**: Move lines 214, 287-288 to top of file:
```typescript
// All imports at top
import { UPS_EXACT_RATES, UPS_RANGE_RATES } from "@/config/ups_tariff";
import { DHL_EXACT_RATES, DHL_RANGE_RATES } from "@/config/dhl_tariff";
import { EMAX_RATES, EMAX_HANDLING_CHARGE } from "@/config/emax_tariff";
```

**`App.tsx`**: Move lines 249-250 to top of file:
```typescript
import { InputSection } from '@/features/quote/components/InputSection';
import { ResultSection } from '@/features/quote/components/ResultSection';
```

### 4.3 Duplicate Constants Extraction

**Create** `src/features/history/constants.ts`:
```typescript
import { QuoteStatus } from '@/types';

export const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
```

Update `QuoteHistoryTable.tsx` and `QuoteSearchBar.tsx` to import from `constants.ts`.

---

## 5. Phase 4: UX Improvements

### 5.1 M-6: Expand Country Options

**Target** (`src/config/options.ts`):
```typescript
export const COUNTRY_OPTIONS = [
  // Asia-Pacific
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  // Americas
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'BR', name: 'Brazil' },
  // Europe
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  // Middle East
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'TR', name: 'Turkey' },
];
```

22 countries covering all major UPS/DHL zone groups. Sorted by region for UI clarity.

### 5.2 M-9: PDF Reference Number

**Current**: `pdfService.ts:26` generates random `JW-XXXXXX`.

**Target**: Accept optional `referenceNo` parameter.

```typescript
// Updated function signature
export const generatePDF = (input: QuoteInput, result: QuoteResult, referenceNo?: string) => { ... }

// Updated drawMetaData
const drawMetaData = (doc: jsPDF, yPos: number, referenceNo?: string): number => {
  doc.text(`Date: ${new Date().toLocaleDateString()}`, MARGIN_X, yPos);
  const ref = referenceNo || 'DRAFT';
  doc.text(`Quote Ref: ${ref}`, 150, yPos);
  return nextLine(yPos, 10);
};
```

**Callers**: `App.tsx` `handleDownloadPdf` — no `referenceNo` available (unsaved), shows "DRAFT". `QuoteDetailModal` could add a download button in the future with actual ref.

### 5.3 M-12: Modal Accessibility

**Target changes** (`QuoteDetailModal.tsx`):

```typescript
// 1. Add Escape key handler
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', handleEsc);
  return () => document.removeEventListener('keydown', handleEsc);
}, [onClose]);

// 2. Add ARIA attributes to modal container
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  className="relative w-full max-w-2xl ..."
>

// 3. Add id to title
<h3 id="modal-title" className="...">{quote.referenceNo}</h3>
```

### 5.4 M-13: CSV Export Cleanup

**Target** (`quoteApi.ts` `exportQuotesCsv`):
```typescript
const blob = await response.blob();
const url = URL.createObjectURL(blob);
try {
  const a = document.createElement('a');
  a.href = url;
  a.download = `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
} finally {
  URL.revokeObjectURL(url);
}
```

---

## 6. Files Changed Summary

| Phase | Files Modified |
|-------|---------------|
| 1 | `src/config/dhl_tariff.ts`, `src/config/ups_tariff.ts`, `smart-quote-api/lib/constants/dhl_tariff.rb`, `smart-quote-api/lib/constants/ups_tariff.rb`, `calculationService.test.ts` |
| 2 | `calculationService.ts` (determineDhlZone), `smart-quote-api/app/services/quote_calculator.rb`, `smart-quote-api/app/services/calculators/dhl_zone.rb`, `src/api/quoteApi.ts` |
| 3 | `src/config/rates.ts`, `src/config/zones.ts`, `src/config/business-rules.ts`, `calculationService.ts`, `App.tsx`, `QuoteHistoryTable.tsx`, `QuoteSearchBar.tsx`, **NEW**: `src/features/history/constants.ts`, `src/types.ts` (if removing DomesticRegionCode) |
| 4 | `src/config/options.ts`, `src/lib/pdfService.ts`, `QuoteDetailModal.tsx`, `src/api/quoteApi.ts` |

**Total**: ~18 files modified, 1 new file created.

---

## 7. Test Strategy

| Phase | Test Changes |
|-------|-------------|
| 1 | Add `20.3kg UPS boundary` test; verify DHL range collapse doesn't change results |
| 2 | Add `DHL Z8 explicit country` zone test; update `mapBreakdown` tests to prioritize new field names |
| 3 | No new tests; verify existing 70 tests still pass after dead code removal |
| 4 | No new tests; manual verification of PDF ref, modal ESC, CSV download |

---

## 8. Validation Criteria

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run lint` — 0 warnings
- [ ] `npx vitest run` — all tests pass (target: 72+ tests)
- [ ] Frontend/backend zone labels match for all carriers
- [ ] `grep -r "ZONE_BASE_RATES\|CN_SOUTH_ZIP_RANGES\|DEFAULT_COUNTRY_ZONES\|INITIAL_MARGIN" src/` — 0 results
- [ ] All imports at file top (no mid-file imports)
- [ ] Country dropdown shows 22 options
- [ ] PDF shows "DRAFT" when no referenceNo
- [ ] Modal closes on Escape key press
