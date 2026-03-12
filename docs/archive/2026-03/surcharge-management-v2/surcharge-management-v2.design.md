# Surcharge Management V2 — Design Document

> **Feature**: PDF Surcharge 상세 + 유효기간/Disclaimer + 견적 상태 Workflow + 변경 알림
>
> **Project**: Smart Quote System
> **Version**: 2.0.0
> **Author**: jaehong
> **Date**: 2026-03-12
> **Plan Reference**: `docs/01-plan/features/surcharge-management-v2.plan.md`
> **V1 Reference**: `docs/archive/2026-03/surcharge-management/`

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (React 19)                    │
│                                                                │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ pdfService.ts    │  │ QuoteHistory   │  │ QuoteDetail  │  │
│  │ ├ drawCostTable  │  │ Table          │  │ Modal        │  │
│  │ │ (surcharge     │  │ ├ status badge │  │ ├ status     │  │
│  │ │  detail rows)  │  │ ├ stale badge  │  │ │ buttons    │  │
│  │ ├ drawValidity   │  │ └ validity     │  │ ├ validity   │  │
│  │ └ drawDisclaimer │  │                │  │ └ stale warn │  │
│  └──────────────────┘  └────────────────┘  └──────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  types.ts:  QuoteStatus += 'confirmed' | 'expired'      │  │
│  │  constants: STATUS_COLORS += confirmed, expired          │  │
│  │  quoteApi:  validityDate in summary/detail responses     │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     Backend (Rails 8 API)                      │
│                                                                │
│  ┌──────────────────┐  ┌────────────────────────────────────┐ │
│  │ Migration        │  │ quotes_controller.rb               │ │
│  │ add_validity_date│  │ ├ create: auto validity_date       │ │
│  │ to quotes        │  │ ├ update: + 'confirmed','expired'  │ │
│  │                  │  │ ├ index: auto-expire stale drafts  │ │
│  │                  │  │ └ summary/detail: + validityDate   │ │
│  └──────────────────┘  └────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ surcharges_controller.rb                                  │ │
│  │ └ on update/create: set surcharges_updated_at cache key   │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Data Model Changes

### 2.1 Migration: Add validity_date to quotes

```ruby
# db/migrate/TIMESTAMP_add_validity_date_to_quotes.rb
class AddValidityDateToQuotes < ActiveRecord::Migration[8.0]
  def change
    add_column :quotes, :validity_date, :date
    # Backfill existing quotes: created_at + 7 days
    reversible do |dir|
      dir.up do
        execute "UPDATE quotes SET validity_date = created_at::date + 7 WHERE validity_date IS NULL"
      end
    end
  end
end
```

### 2.2 Quote Model Changes

```ruby
# app/models/quote.rb additions
VALID_STATUSES = %w[draft sent accepted rejected confirmed expired].freeze
DEFAULT_VALIDITY_DAYS = 7

validates :status, inclusion: { in: VALID_STATUSES }

before_create :set_validity_date

scope :stale_drafts, -> {
  where(status: %w[draft sent])
    .where("validity_date < ?", Date.current)
}

def expired?
  validity_date.present? && validity_date < Date.current && %w[draft sent].include?(status)
end

private

def set_validity_date
  self.validity_date ||= (created_at || Time.current).to_date + DEFAULT_VALIDITY_DAYS
end
```

### 2.3 Frontend Type Changes

```typescript
// src/types.ts changes

// QuoteStatus: add 'confirmed' | 'expired'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'confirmed' | 'expired';

// QuoteSummary: add validityDate, surchargeStale
export interface QuoteSummary {
  // ... existing fields ...
  validityDate: string | null;
  surchargeStale?: boolean;  // true if appliedSurcharges differ from current
}

// QuoteDetail: add validityDate
export interface QuoteDetail {
  // ... existing fields ...
  validityDate: string | null;
}
```

---

## 3. API Design

### 3.1 Quotes Controller Changes

#### create: Auto-set validity_date

```ruby
# In quotes_controller.rb > create
# After quote.save:
# validity_date auto-set by model callback (created_at + 7 days)
```

#### update: Add 'confirmed' and 'expired' to allowed statuses

```ruby
# Change line 79:
# FROM: unless %w[draft sent accepted rejected].include?(permitted[:status])
# TO:   unless Quote::VALID_STATUSES.include?(permitted[:status])
```

#### index: Auto-expire stale drafts on query

```ruby
# Before pagination query, run:
# Quote.stale_drafts.update_all(status: 'expired')
# This ensures expired quotes show correct status on list load
```

#### summary/detail responses: Add validityDate + surchargeStale

```ruby
# quote_summary additions:
#   validityDate: quote.validity_date&.iso8601,
#   surchargeStale: surcharge_stale?(quote)

# quote_detail additions:
#   validityDate: quote.validity_date&.iso8601

# Private helper:
# def surcharge_stale?(quote)
#   return false unless quote.status.in?(%w[draft sent])
#   return false unless quote.breakdown.is_a?(Hash)
#   stored = quote.breakdown["appliedSurcharges"] || []
#   return false if stored.empty?
#   carrier = quote.breakdown.dig("carrier") || quote.overseas_carrier
#   country = quote.destination_country
#   zone = quote.applied_zone
#   current = SurchargeResolver.resolve(carrier:, country_code: country, zone:)
#   stored_codes = stored.map { |s| s["code"] }.sort
#   current_codes = current.map { |s| s[:code] }.sort
#   stored_codes != current_codes ||
#     stored.sum { |s| s["appliedAmount"].to_f } != current.sum { |s| s[:applied_amount].to_f }
# end
```

### 3.2 Surcharges Controller: Track update timestamp

```ruby
# In surcharges_controller.rb > create, update, destroy:
# After successful operation:
# Rails.cache.write("surcharges_updated_at", Time.current.iso8601, expires_in: 30.days)
```

---

## 4. PDF Service Changes

### 4.1 drawCostTable Enhancement

**Current** (line 139-142 of pdfService.ts):
```typescript
// Single row for all surcharges
if (bd.intlWarRisk > 0) rows.push(['전쟁위험할증', formatKRW(bd.intlWarRisk)]);
if (bd.intlSurge > 0) rows.push(['할증료 (Surge)', formatKRW(bd.intlSurge)]);
```

**New**: Replace with individual surcharge rows from `appliedSurcharges`:
```typescript
// Individual surcharge rows from appliedSurcharges
if (bd.appliedSurcharges && bd.appliedSurcharges.length > 0) {
  bd.appliedSurcharges.forEach((s) => {
    const label = s.nameKo || s.name;
    const suffix = s.chargeType === 'rate' ? ` (${s.amount}%)` : '';
    rows.push([`  ${label}${suffix}`, formatKRW(s.appliedAmount)]);
  });
  // Manual surge (if any)
  if ((bd.intlManualSurge ?? 0) > 0) {
    rows.push(['  수동 할증 (Manual Surge)', formatKRW(bd.intlManualSurge!)]);
  }
} else {
  // Backward compat: single row
  if (bd.intlWarRisk > 0) rows.push(['전쟁위험할증', formatKRW(bd.intlWarRisk)]);
  if (bd.intlSurge > 0) rows.push(['할증료 (Surge)', formatKRW(bd.intlSurge)]);
}
```

### 4.2 drawHeader Enhancement: Validity Date

**Current** (line 40-43): Shows Date and Ref only.

**New**: Add validity date line:
```typescript
// After existing meta row (line 43):
if (validityDate) {
  yPos = nextLine(yPos, 5);
  doc.text(`Valid until: ${validityDate}`, MARGIN_X, yPos);
}
```

**Function signature change**:
```typescript
// FROM: const drawHeader = (doc, yPos, referenceNo?)
// TO:   const drawHeader = (doc, yPos, referenceNo?, validityDate?)
```

### 4.3 drawDisclaimer: New Function

```typescript
const drawDisclaimer = (doc: jsPDF, yPos: number): number => {
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.setTextColor(...COLORS.TEXT_LIGHT);

  const disclaimerKo = '본 견적서는 유효기간 내 확인 기준이며, 할증료 변동 시 재산정될 수 있습니다.';
  const disclaimerEn = 'This quotation is valid within the stated period. Surcharges are subject to change at time of booking.';
  const rateDate = `Rates as of: ${new Date().toLocaleDateString('ko-KR')}`;

  doc.text(disclaimerKo, MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);
  doc.text(disclaimerEn, MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);
  doc.text(rateDate, MARGIN_X, yPos);

  return nextLine(yPos, 6);
};
```

### 4.4 generatePDF Flow Change

```typescript
// FROM:
//   drawWarnings → drawFooter
// TO:
//   drawWarnings → drawDisclaimer → drawFooter

// Also pass validityDate to drawHeader:
const validityDate = referenceNo
  ? new Date(Date.now() + 7 * 86400000).toLocaleDateString('ko-KR')
  : undefined;
yPos = drawHeader(doc, yPos, referenceNo, validityDate);
```

### 4.5 generateComparisonPDF: Same disclaimer

```typescript
// Add drawDisclaimer before drawFooter in comparison PDF
```

---

## 5. Frontend Component Changes

### 5.1 STATUS_COLORS Extension

```typescript
// src/features/history/constants.ts
export const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};
```

### 5.2 QuoteHistoryTable: Stale Badge

```typescript
// In QuoteHistoryTable, after status badge:
// If q.surchargeStale is true, show amber warning badge:
{q.surchargeStale && (
  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
    <AlertTriangle className="w-2.5 h-2.5" />
    재확인
  </span>
)}
```

### 5.3 QuoteHistoryTable: Validity from Server

```typescript
// Replace client-side QUOTE_VALIDITY_DAYS calculation with server-provided validityDate:
// FROM: const expiry = getExpiryInfo(q.createdAt)  (client-calculated)
// TO:   const expiry = q.validityDate ? getExpiryFromDate(q.validityDate) : null

function getExpiryFromDate(validityDate: string) {
  const expiry = new Date(validityDate);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { daysLeft, expired: daysLeft <= 0 };
}
```

### 5.4 QuoteDetailModal: Status Flow Update

```typescript
// Update STATUS_FLOW to include new statuses:
const STATUS_FLOW: QuoteStatus[] = ['draft', 'sent', 'confirmed', 'accepted', 'rejected', 'expired'];

// Add validity_date display in Route & Service section:
<Field label="Validity" value={quote.validityDate
  ? new Date(quote.validityDate).toLocaleDateString('ko-KR')
  : '-'
} />

// Add stale surcharge warning (if applicable):
// Check by comparing quote.breakdown.appliedSurcharges snapshot
// This is computed server-side and returned as surchargeStale in the detail
```

### 5.5 QuoteDetailModal: Cost Breakdown Enhancement

```typescript
// Replace single "Intl. Surge" row with individual surcharge rows:
// FROM:
//   <BreakdownRow label="Intl. Surge" value={quote.breakdown.intlSurge} />
// TO:
{quote.breakdown.appliedSurcharges && quote.breakdown.appliedSurcharges.length > 0 ? (
  <>
    {quote.breakdown.appliedSurcharges.map((s: any, i: number) => (
      <BreakdownRow
        key={i}
        label={`  ${s.nameKo || s.name}${s.chargeType === 'rate' ? ` (${s.amount}%)` : ''}`}
        value={s.appliedAmount}
      />
    ))}
    {(quote.breakdown.intlManualSurge ?? 0) > 0 && (
      <BreakdownRow label="  Manual Surge" value={quote.breakdown.intlManualSurge} />
    )}
  </>
) : (
  <>
    <BreakdownRow label="Intl. War Risk" value={quote.breakdown.intlWarRisk} />
    <BreakdownRow label="Intl. Surge" value={quote.breakdown.intlSurge} />
  </>
)}
```

---

## 6. quoteApi.ts Changes

### 6.1 updateQuoteStatus: Add new statuses

```typescript
// FROM:
export const updateQuoteStatus = async (
  id: number,
  status: 'draft' | 'sent' | 'accepted' | 'rejected',
// TO:
export const updateQuoteStatus = async (
  id: number,
  status: QuoteStatus,
```

---

## 7. i18n Additions

### 7.1 New Translation Keys (4 languages)

| Key | en | ko | cn | ja |
|-----|----|----|----|----|
| `quote.status.confirmed` | Confirmed | 확정 | 已确认 | 確認済み |
| `quote.status.expired` | Expired | 만료 | 已过期 | 期限切れ |
| `quote.validity` | Valid until | 유효기한 | 有效期至 | 有効期限 |
| `quote.validity.expired` | This quote has expired | 이 견적은 만료되었습니다 | 此报价已过期 | この見積もりは期限切れです |
| `quote.surcharge.stale` | Surcharge changed - re-quote needed | 할증료 변경 - 재견적 필요 | 附加费已变更 - 需要重新报价 | サーチャージ変更 - 再見積もり必要 |
| `quote.surcharge.stale.short` | Re-check needed | 재확인 필요 | 需重新确认 | 要再確認 |
| `pdf.disclaimer.ko` | 본 견적서는 유효기간 내 확인 기준이며, 할증료 변동 시 재산정될 수 있습니다. | (same) | - | - |
| `pdf.disclaimer.en` | This quotation is valid within the stated period. Surcharges are subject to change at time of booking. | - | (same) | (same) |
| `pdf.rateDate` | Rates as of | 기준일 | 费率日期 | レート基準日 |

---

## 8. Data Flow Diagrams

### 8.1 PDF Generation with Surcharge Detail

```
User clicks "Download PDF"
  │
  ▼
generatePDF(input, result, referenceNo)
  │
  ├─ drawHeader(doc, y, ref, validityDate)  ← NEW: validity date
  ├─ drawShipmentDetails(doc, input, y)
  ├─ drawCargoTable(doc, items, result, y)
  ├─ drawCostTable(doc, result, y)           ← MODIFIED: individual surcharge rows
  │    └─ result.breakdown.appliedSurcharges?.forEach(row)
  ├─ drawQuoteSummary(doc, input, result, y)
  ├─ drawWarnings(doc, warnings, y)
  ├─ drawDisclaimer(doc, y)                  ← NEW: surcharge disclaimer
  └─ drawFooter(doc)
```

### 8.2 Quote Status Workflow

```
                    ┌─────────┐
        create() ──▶│  draft  │
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌─────────┐
         │  sent  │ │confirm │ │ expired │◀── auto (validity_date < today)
         └───┬────┘ │  -ed   │ └─────────┘
             │      └────────┘
             ▼
     ┌──────────────┐
     │accepted/     │
     │rejected      │
     └──────────────┘
```

### 8.3 Surcharge Stale Detection

```
Admin updates surcharge
  │
  ▼
Rails.cache.write("surcharges_updated_at", now)
  │
  ▼
GET /api/v1/quotes (index)
  │
  ├─ For each quote with status=draft/sent:
  │    ├─ Read quote.breakdown["appliedSurcharges"]
  │    ├─ SurchargeResolver.resolve(carrier, country, zone)
  │    ├─ Compare codes + amounts
  │    └─ Set surchargeStale = true if mismatch
  │
  └─ Return quotes[] with surchargeStale flags
```

---

## 9. Implementation Checklist

### Phase 1: PDF Enhancement
- [ ] 1. `pdfService.ts` > `drawCostTable`: individual surcharge rows from `appliedSurcharges`
- [ ] 2. `pdfService.ts` > `drawCostTable`: Manual Surge separate row
- [ ] 3. `pdfService.ts` > `drawCostTable`: backward compat (no appliedSurcharges)
- [ ] 4. `pdfService.ts` > `drawHeader`: add `validityDate` parameter and display
- [ ] 5. `pdfService.ts` > new `drawDisclaimer` function (Ko/En dual text + rate date)
- [ ] 6. `pdfService.ts` > `generatePDF`: integrate drawDisclaimer before drawFooter
- [ ] 7. `pdfService.ts` > `generateComparisonPDF`: add drawDisclaimer before drawFooter

### Phase 2: Backend — Validity & Status
- [ ] 8. Migration: `add_validity_date` to quotes table
- [ ] 9. Quote model: `VALID_STATUSES` constant, `set_validity_date` callback, `stale_drafts` scope
- [ ] 10. `quotes_controller.rb` > `create`: validity_date auto-set via model callback
- [ ] 11. `quotes_controller.rb` > `update`: extend allowed statuses to include `confirmed`, `expired`
- [ ] 12. `quotes_controller.rb` > `index`: auto-expire stale drafts before query
- [ ] 13. `quotes_controller.rb` > `quote_summary`: add `validityDate`, `surchargeStale`
- [ ] 14. `quotes_controller.rb` > `quote_detail`: add `validityDate`
- [ ] 15. `quotes_controller.rb` > private `surcharge_stale?` helper method

### Phase 3: Frontend — Types, Status & Stale
- [ ] 16. `types.ts`: extend `QuoteStatus` with `'confirmed' | 'expired'`
- [ ] 17. `types.ts`: add `validityDate` to `QuoteSummary` and `QuoteDetail`
- [ ] 18. `types.ts`: add `surchargeStale` to `QuoteSummary`
- [ ] 19. `constants.ts`: add `confirmed` and `expired` to `STATUS_COLORS`
- [ ] 20. `quoteApi.ts`: update `updateQuoteStatus` type to use `QuoteStatus`
- [ ] 21. `QuoteHistoryTable.tsx`: replace client-side validity calc with server `validityDate`
- [ ] 22. `QuoteHistoryTable.tsx`: add surcharge stale badge (amber, AlertTriangle icon)
- [ ] 23. `QuoteDetailModal.tsx`: update `STATUS_FLOW` with `confirmed`, `expired`
- [ ] 24. `QuoteDetailModal.tsx`: add `validityDate` field in Route & Service section
- [ ] 25. `QuoteDetailModal.tsx`: replace single Surge row with individual surcharge rows

### Phase 4: i18n
- [ ] 26. `translations.ts`: add 9 new keys in all 4 languages (en/ko/cn/ja)

### Phase 5: Backend — Surcharge Change Tracking
- [ ] 27. `surcharges_controller.rb`: write `surcharges_updated_at` cache key on create/update/destroy

---

## 10. Testing Strategy

### 10.1 PDF Tests
- Verify surcharge detail rows appear in generated PDF when `appliedSurcharges` present
- Verify backward compat (no `appliedSurcharges` = single surge row)
- Verify validity date in header
- Verify disclaimer section presence

### 10.2 Backend Tests
- Migration: validity_date column exists, backfill works
- Quote model: set_validity_date callback, expired? method, stale_drafts scope
- Controller: create sets validity_date, update accepts confirmed/expired, index auto-expires
- surcharge_stale? helper: returns true on mismatch, false on match

### 10.3 Frontend Tests
- QuoteHistoryTable: renders server-provided validity, shows stale badge
- QuoteDetailModal: renders new statuses, shows validity field, individual surcharge rows
- STATUS_COLORS: includes confirmed and expired

---

## 11. Known Limitations

1. **Stale detection performance**: `surcharge_stale?` calls `SurchargeResolver.resolve` per quote in list — mitigated by 5min cache but could be slow for 100+ quotes. Consider batch resolution if needed.
2. **PDF disclaimers are hardcoded Korean/English**: Not dynamically i18n'd since jsPDF doesn't use React's i18n system. Acceptable for business context.
3. **Auto-expire runs on index query**: Not a background job. Stale drafts only expire when someone loads the list. Sufficient for current usage patterns.
4. **Comparison PDF validity**: Uses same 7-day default but comparisons don't have a saved quote record — validity is calculated from generation date.

---

## 12. Phase 2+ Deferred (Future)

- Admin-configurable validity_days (system_settings table)
- Email/SMS notification on surcharge change
- Background job for auto-expire (replace query-time check)
- Re-quote button on expired quotes (auto-fill from previous input)
