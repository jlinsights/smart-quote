# Surcharge Management Design Document

> **Feature**: DB 기반 동적 Surcharge 관리 시스템
> **Plan Reference**: `docs/01-plan/features/surcharge-management.plan.md`
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Author**: jaehong
> **Date**: 2026-03-12
> **Status**: Implemented (Phase 1)

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ SurchargePanel│  │SurchargeMgmt │  │CostBreakdownCard  │  │
│  │ (Dashboard)   │  │Widget (Admin)│  │(개별 항목 표시)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────────┘  │
│         │                  │                  │               │
│  ┌──────┴──────────────────┴──────────────────┘              │
│  │            useSurcharges Hook (5min cache)                │
│  └──────────────────┬────────────────────────────────────┐   │
│                     │                                    │   │
│  ┌──────────────────┴──────┐    ┌────────────────────────┴┐  │
│  │ surchargeApi.ts         │    │ calculationService.ts   │  │
│  │ (CRUD + resolve)        │    │ (manualSurgeCost flow)  │  │
│  └──────────────────┬──────┘    └─────────────────────────┘  │
└─────────────────────┼────────────────────────────────────────┘
                      │ HTTP (JWT Auth)
┌─────────────────────┼────────────────────────────────────────┐
│                 Backend (Rails 8 API)                         │
│                     │                                        │
│  ┌──────────────────┴──────┐    ┌─────────────────────────┐  │
│  │ SurchargesController    │    │ QuoteCalculator         │  │
│  │ (CRUD + resolve)        │    │ (SurchargeResolver 통합)│  │
│  └──────────────────┬──────┘    └──────────┬──────────────┘  │
│                     │                       │                │
│  ┌──────────────────┴───────────────────────┴──────────────┐ │
│  │              SurchargeResolver Service                   │ │
│  │  - resolve(carrier, country, zone)                       │ │
│  │  - calculate_total(carrier, country, zone, intl_base)    │ │
│  │  - 5min Rails.cache                                      │ │
│  └──────────────────┬──────────────────────────────────────┘ │
│                     │                                        │
│  ┌──────────────────┴──────────────────────────────────────┐ │
│  │            PostgreSQL: surcharges table                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 실시간 API vs Admin 수동 | Admin 수동 관리 | UPS/DHL surcharge API 미제공. 기존 FSC 패턴 답습 |
| DB vs Config 파일 | PostgreSQL DB | 코드 배포 없이 변경, 유효기간/이력 관리 가능 |
| Frontend 계산 방식 | API resolve + hook cache | 프론트엔드 pure calc는 manualSurgeCost만 처리, system surcharge는 별도 패널 표시 |
| Cache 전략 | 5분 TTL (FE + BE) | MarginRule/FSC 동일 패턴. 빈번하지 않은 변경에 적합 |
| Soft delete | is_active=false | 감사 추적 + 이력 보존 |
| country_codes 저장 | Comma-separated string | Rails migration에서 TEXT[] 호환성 이슈 회피 |

---

## 2. Data Model

### 2.1 surcharges Table

```sql
CREATE TABLE surcharges (
  id              BIGSERIAL PRIMARY KEY,
  code            VARCHAR(50)   NOT NULL,        -- 'WAR_RISK', 'PSS', 'EBS'
  name            VARCHAR(100)  NOT NULL,         -- English name
  name_ko         VARCHAR(100),                   -- Korean name
  description     TEXT,

  -- Matching conditions (NULL = applies to all)
  carrier         VARCHAR(10),                    -- 'UPS'/'DHL'/'EMAX' or NULL
  zone            VARCHAR(10),                    -- 'Z1'-'Z10' or NULL
  country_codes   TEXT DEFAULT '',                 -- 'IL,JO,LB,SA' or empty

  -- Charge calculation
  charge_type     VARCHAR(10)   NOT NULL DEFAULT 'fixed',  -- 'fixed' or 'rate'
  amount          DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Validity
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE,                           -- NULL = indefinite
  is_active       BOOLEAN NOT NULL DEFAULT true,

  -- Tracking
  source_url      TEXT,                           -- Carrier official page URL
  created_by      VARCHAR(255),

  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_surcharges_code ON surcharges (code);
CREATE INDEX idx_surcharges_active_dates ON surcharges (is_active, effective_from, effective_to);
CREATE INDEX idx_surcharges_carrier ON surcharges (carrier);
```

### 2.2 Matching Logic

```
resolve(carrier: "UPS", country: "IL", zone: "Z9")
  → WHERE is_active = true
    AND effective_from <= today
    AND (effective_to IS NULL OR effective_to >= today)
    AND (carrier IS NULL OR carrier = "UPS")
    AND (country_codes IS EMPTY OR "IL" IN country_codes)
    AND (zone IS NULL OR zone = "Z9")
```

**Stacking Rule**: 매칭되는 모든 surcharge가 합산(stacking) 적용.

### 2.3 Charge Calculation

| Type | Formula | Example |
|------|---------|---------|
| `fixed` | `appliedAmount = amount` | WAR_RISK fixed 45,000 KRW |
| `rate` | `appliedAmount = intlBase * (amount / 100)` | PSS 3.5% of base rate |

### 2.4 Frontend Type Extensions

```typescript
// src/types.ts - CostBreakdown 확장
interface CostBreakdown {
  // ... existing fields ...
  intlSurge: number;              // Combined total (system + manual)
  intlSystemSurcharge?: number;   // DB-driven surcharges
  intlManualSurge?: number;       // User manual input
  appliedSurcharges?: Array<{
    code: string;
    name: string;
    nameKo?: string;
    chargeType: 'fixed' | 'rate';
    amount: number;
    appliedAmount: number;
    sourceUrl?: string;
  }>;
}
```

---

## 3. API Design

### 3.1 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/surcharges` | Admin | List active surcharges |
| `POST` | `/api/v1/surcharges` | Admin | Create surcharge |
| `PUT` | `/api/v1/surcharges/:id` | Admin | Update surcharge |
| `DELETE` | `/api/v1/surcharges/:id` | Admin | Soft delete (is_active=false) |
| `GET` | `/api/v1/surcharges/resolve` | Auth | Resolve applicable surcharges |

### 3.2 Resolve Request/Response

```
GET /api/v1/surcharges/resolve?carrier=UPS&country=IL&zone=Z9

Response 200:
{
  "surcharges": [
    {
      "id": 1,
      "code": "WAR_RISK",
      "name": "War Risk Surcharge",
      "name_ko": "전쟁 위험 할증료",
      "charge_type": "rate",
      "amount": 3.5,
      "carrier": "UPS",
      "source_url": "https://...",
      "effective_from": "2026-01-15",
      "effective_to": null
    }
  ]
}
```

### 3.3 CRUD Request (Create)

```
POST /api/v1/surcharges
Authorization: Bearer <admin-jwt>

{
  "code": "WAR_RISK",
  "name": "War Risk Surcharge",
  "nameKo": "전쟁 위험 할증료",
  "carrier": "UPS",
  "zone": null,
  "countryCodes": ["IL", "JO", "LB"],
  "chargeType": "rate",
  "amount": 3.5,
  "effectiveFrom": "2026-01-15",
  "effectiveTo": null,
  "isActive": true,
  "sourceUrl": "https://www.ups.com/..."
}
```

### 3.4 Serialization (camelCase)

Backend serializes with camelCase keys for frontend compatibility:
`name_ko → nameKo`, `charge_type → chargeType`, `country_codes → countryCodes` (as array), etc.

---

## 4. Component Design

### 4.1 Component Hierarchy

```
QuoteCalculator (page)
├── InputSection
│   └── ServiceSection
│       ├── SurchargePanel          ← NEW (Dashboard view)
│       │   ├── Active surcharges table
│       │   ├── Manual surge input
│       │   ├── Grand total display
│       │   ├── Carrier official links
│       │   └── Real-time notice (disclaimer)
│       └── (existing fields)
├── ResultSection
│   └── CostBreakdownCard           ← MODIFIED
│       └── Individual surcharge line items (when appliedSurcharges present)
└── Admin Widgets (when isAdmin)
    ├── SurchargeManagementWidget   ← NEW (Admin CRUD)
    │   ├── Add/Edit form
    │   ├── Surcharge list table
    │   ├── Carrier links
    │   └── Non-realtime notice
    ├── FscRateWidget (existing)
    └── TargetMarginRulesWidget (existing)
```

### 4.2 SurchargePanel (`src/features/quote/components/SurchargePanel.tsx`)

**Purpose**: Dashboard/Quote 페이지에서 현재 적용되는 surcharge 표시 + 수동 추가 입력

**Props**:
```typescript
interface Props {
  carrier: string;
  surcharges: ResolvedSurcharge[];
  appliedSurcharges: AppliedSurcharge[];
  systemTotal: number;
  manualSurgeCost: number | undefined;
  onManualSurgeChange: (value: number | undefined) => void;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onRetry: () => void;
  isMobileView: boolean;
}
```

**Layout**:
1. Header: Shield icon + title + loading spinner
2. Active surcharges table (item / type / amount)
3. System surcharge subtotal (amber highlight)
4. Manual additional surge input
5. Grand total (system + manual)
6. Carrier official page links (UPS, DHL)
7. Real-time notice (AlertTriangle + disclaimer text)

### 4.3 SurchargeManagementWidget (`src/features/admin/components/SurchargeManagementWidget.tsx`)

**Purpose**: Admin CRUD for surcharge rules

**State**:
```typescript
surcharges: SurchargeRule[]      // Fetched list
showAddForm: boolean              // Toggle add form
editingId: number | null          // Editing mode
form: Partial<SurchargeRule>      // Form state
saving: boolean
confirmDeleteId: number | null
```

**Form Fields**: code, carrier (select), name (EN), name (KO), chargeType (select), amount, zone, countryCodes (comma-separated), sourceUrl, effectiveFrom (date), effectiveTo (date), isActive (checkbox)

**Table Columns**: Code/Name | Carrier | Type | Amount | Status | Actions (Edit, Delete)

### 4.4 CostBreakdownCard Enhancement

**변경 사항**: Intl. Freight 하위 표시에서 surcharge 표시 로직 개선

```
When appliedSurcharges present:
  - Each surcharge as individual line (Shield icon, amber color)
  - Manual surge as separate "Manual Surge" line
When appliedSurcharges absent (backward compat):
  - Single "Demand/Surge/War Risk" line (existing behavior)
```

---

## 5. Hook & API Layer Design

### 5.1 useSurcharges Hook (`src/features/dashboard/hooks/useSurcharges.ts`)

```typescript
function useSurcharges(carrier: string, country?: string) {
  // 5-minute client-side cache (Map<string, CacheEntry>)
  // Key: `${carrier}:${country}`

  Returns:
    surcharges: ResolvedSurcharge[]   // Raw resolved list
    loading: boolean
    error: string | null
    lastUpdated: Date | null
    calculateApplied(intlBase: number): AppliedSurcharge[]  // Compute amounts
    totalAmount(intlBase: number): number                    // System total
    retry(): void                                            // Manual refresh
}
```

**Cache Strategy**: Map-based with 5min TTL per carrier:country key. No stale-while-revalidate.

### 5.2 surchargeApi.ts (`src/api/surchargeApi.ts`)

```typescript
// Admin CRUD
getSurcharges(): Promise<{ surcharges: SurchargeRule[] }>
createSurcharge(data): Promise<SurchargeRule>
updateSurcharge(id, data): Promise<SurchargeRule>
deleteSurcharge(id): Promise<{ success: boolean }>

// Resolve (authenticated)
resolveSurcharges(carrier, country?, zone?): Promise<{ surcharges: ResolvedSurcharge[] }>
```

---

## 6. Backend Service Design

### 6.1 SurchargeResolver (`smart-quote-api/app/services/surcharge_resolver.rb`)

```ruby
class SurchargeResolver
  CACHE_KEY = "surcharge_resolver_active"
  CACHE_TTL = 5.minutes

  # resolve(carrier:, country:, zone:) → Array<Hash>
  # calculate_total(carrier:, country:, zone:, intl_base:) → { total:, applied: }
  # invalidate_cache! → void
end
```

**Matching Algorithm**:
1. Load all active + currently_effective surcharges (cached 5min)
2. Filter: carrier match (NULL = all), country match (empty = all), zone match (NULL = all)
3. Return matching surcharges with metadata

**Cache Invalidation**: Called on every create/update/delete in SurchargesController.

### 6.2 QuoteCalculator Integration

```ruby
# Before (single manual surge):
surge_cost = @input[:manualSurgeCost] || 0

# After (system + manual):
surcharge_result = SurchargeResolver.calculate_total(
  carrier: carrier,
  country: @input[:destinationCountry],
  zone: overseas_result[:applied_zone],
  intl_base: overseas_result[:intl_base]
)
system_surcharge_total = surcharge_result[:total]
manual_surge_cost = @input[:manualSurgeCost] || 0
surge_cost = system_surcharge_total + manual_surge_cost
```

Breakdown extension:
```ruby
intlManualSurge: manual_surge_cost,
intlSystemSurcharge: system_surcharge_total,
appliedSurcharges: surcharge_result[:applied]
```

---

## 7. i18n Design

### 7.1 Translation Keys

16 keys added across 4 languages (ko, en, cn, ja):

| Key | Korean | English |
|-----|--------|---------|
| `calc.service.surcharge.title` | 할증료 (Surcharges) | Surcharges |
| `calc.service.surcharge.item` | 항목 | Item |
| `calc.service.surcharge.type` | 유형 | Type |
| `calc.service.surcharge.amount` | 금액 | Amount |
| `calc.service.surcharge.systemTotal` | 시스템 할증 소계 | System Surcharge Subtotal |
| `calc.service.surcharge.loading` | 할증료 정보 로딩 중... | Loading surcharge data... |
| `calc.service.surcharge.errorLoad` | 할증료 정보를 불러올 수 없습니다. | Failed to load surcharge data. |
| `calc.service.surcharge.none` | 현재 적용 중인 할증료가 없습니다. | No active surcharges at this time. |
| `calc.service.surcharge.manualLabel` | 추가 할증료 수동 입력 (KRW) | Additional Surcharge Override (KRW) |
| `calc.service.surcharge.manualHint` | 시스템 자동 계산 외... | Enter any additional surcharges... |
| `calc.service.surcharge.grandTotal` | 할증료 합계 | Total Surcharges |
| `calc.service.surcharge.verifyLink` | 공식 페이지에서 확인 | Verify on official page |
| `calc.service.surcharge.retry` | 재시도 | Retry |
| `calc.service.surcharge.updated` | 마지막 업데이트 | Last updated |
| `calc.service.surcharge.notice.title` | 실시간 반영 안내 | Real-time Data Notice |
| `calc.service.surcharge.notice.body` | 할증료는 UPS/DHL 공식 공지를 기반으로... | Surcharges are manually updated... |

Chinese (cn) and Japanese (ja) translations also provided.

---

## 8. Data Flow

### 8.1 Dashboard/Quote View (SurchargePanel)

```
User selects carrier/country
  → useSurcharges(carrier, country) fires
  → surchargeApi.resolveSurcharges(carrier, country) → GET /api/v1/surcharges/resolve
  → SurchargeResolver.resolve() [5min cached]
  → Returns ResolvedSurcharge[]
  → SurchargePanel displays table
  → calculateApplied(intlBase) computes KRW amounts client-side
  → User sees system surcharges + manual input + grand total
```

### 8.2 Quote Save Flow (Backend)

```
User clicks "Save Quote"
  → POST /api/v1/quotes { ...input }
  → QuoteCalculator.call(params)
     → SurchargeResolver.calculate_total(carrier, country, zone, intl_base)
     → system_surcharge_total + manual_surge_cost = surge_cost
     → breakdown includes appliedSurcharges array
  → Quote saved to DB with applied_surcharges snapshot
```

### 8.3 Admin Management Flow

```
Admin opens /admin
  → SurchargeManagementWidget loads
  → getSurcharges() → GET /api/v1/surcharges
  → Displays CRUD table
  → Admin creates/edits/deletes
  → SurchargeResolver.invalidate_cache!
  → Frontend 5min cache expires on next request
  → Dashboard users see updated surcharges within 5 minutes
```

---

## 9. Implementation Checklist (Phase 1 - Completed)

### Backend
- [x] DB migration: `create_surcharges` table
- [x] `Surcharge` model with validations and scopes
- [x] `SurchargeResolver` service (resolve + calculate_total + 5min cache)
- [x] `SurchargesController` (CRUD + resolve, JWT auth, admin guard, audit log)
- [x] Routes: `resources :surcharges` with `collection { get :resolve }`
- [x] `QuoteCalculator` integration (system + manual surge)

### Frontend
- [x] `surchargeApi.ts` (CRUD + resolve API client)
- [x] `useSurcharges` hook (5min client cache, calculateApplied, totalAmount)
- [x] `SurchargePanel` component (active table, manual input, grand total, notice)
- [x] `SurchargeManagementWidget` (Admin CRUD)
- [x] `ServiceSection` integration (intlBase prop drilling)
- [x] `InputSection` → `ServiceSection` prop chain for intlBase
- [x] `MobileLayout` intlBase prop
- [x] `CostBreakdownCard` individual surcharge display
- [x] `types.ts` CostBreakdown extension
- [x] i18n: 16 keys × 4 languages (ko/en/cn/ja)
- [x] Admin page: SurchargeManagementWidget lazy-loaded

### Quality
- [x] TypeScript: 0 errors
- [x] ESLint: 0 warnings
- [x] Vitest: 1153/1153 tests pass

---

## 10. Phase 2 Scope (Not Yet Implemented)

| Item | Plan Ref | Status |
|------|----------|--------|
| PDF validity period + surcharge detail + disclaimer | FR-3.x | Pending |
| Quote status workflow (draft → confirmed → expired) | FR-4.x | Pending |
| Surcharge change alert badge on draft quotes | FR-5.1 | Pending |
| Dashboard auto-notice on surcharge change | FR-5.2 | Pending |
| Frontend calculationService.ts surcharge integration | FR-2.5 | Deferred* |

*Frontend calculationService.ts는 pure function으로 API 호출 불가. System surcharge는 SurchargePanel에서 별도 표시하고, backend QuoteCalculator에서 통합 계산하는 아키텍처로 결정.

---

## 11. Known Limitations

1. **실시간 자동 반영 불가**: UPS/DHL surcharge API 미제공 → Admin 수동 업데이트 필요
2. **Frontend-Backend 계산 분리**: Frontend calculationService는 manualSurgeCost만 반영, system surcharge는 backend에서만 통합 계산
3. **Cache lag**: Admin 변경 후 최대 5분까지 이전 데이터 표시 가능
4. **Country matching**: comma-separated string 방식으로 정확한 배열 검색보다 약간 느림 (현재 규모에서는 무시 가능)
