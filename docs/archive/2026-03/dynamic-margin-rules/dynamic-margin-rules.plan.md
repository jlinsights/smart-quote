# Plan: Dynamic Margin Rules

> PDCA Phase: **Plan** | Created: 2026-03-08 | Level: Dynamic

---

## 1. Feature Overview

### Problem Statement

현재 Target Margin 규칙이 `QuoteCalculator.tsx` 소스코드에 **하드코딩**되어 있어:
- 마진 규칙 변경 시 **코드 배포**가 필요
- 관리자가 직접 수정 불가 (개발자 의존)
- 고객별 커스텀 마진 추가/수정이 번거로움
- 규칙 이력 관리 불가

### Goal

마진 규칙을 **DB 기반 동적 관리 시스템**으로 전환하여 관리자가 실시간으로 CRUD 할 수 있도록 함.

### Success Criteria

- [ ] Admin UI에서 마진 규칙 CRUD 가능
- [ ] 규칙 변경 시 즉시 반영 (코드 배포 불필요)
- [ ] 규칙 우선순위 체계 (Per-user > Nationality > Default)
- [ ] 변경 이력 추적 (Audit log 연동)
- [ ] 기존 하드코딩 로직과 동일한 결과 보장 (마이그레이션 무결성)
- [ ] 기존 테스트 모두 통과

---

## 2. Current State Analysis

### 현재 마진 결정 로직 (`QuoteCalculator.tsx:100-127`)

```
Priority 1: FLAT_MARGIN_OVERRIDES (email → fixed %)
  - admin@yslogic.co.kr → 19% (all weights)

Priority 2: Korean Nationality Rules (email match OR nationality)
  - ibas@inter-airsea.co.kr OR nationality='South Korea' OR !nationality
  - ≥ 20kg → 19%
  - < 20kg → 24%

Priority 3: Non-Korean Default
  - ≥ 20kg → 24%
  - < 20kg → 32%
```

### Visibility Rules
- `hideMargin = isPublic || user.role === 'member'`
- Manual override: `hasManuallyChangedMargin` ref blocks auto-recalculation

### 관련 파일
| File | Role |
|------|------|
| `src/pages/QuoteCalculator.tsx:100-127` | Frontend margin logic |
| `src/features/admin/components/TargetMarginRulesWidget.tsx` | Static display widget (신규) |
| `smart-quote-api/app/services/quote_calculator.rb` | Backend calculation |

---

## 3. Proposed Architecture

### 3.1 Data Model

```sql
CREATE TABLE margin_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- 규칙 이름 (ex: "용성종합물류 고정")
  rule_type VARCHAR(20) NOT NULL,       -- 'flat' | 'weight_based'
  priority INTEGER NOT NULL DEFAULT 0,  -- 높을수록 우선 (Per-user: 100, Nationality: 50, Default: 0)

  -- Matching conditions
  match_email VARCHAR(255),             -- 특정 이메일 매칭 (NULL = all)
  match_nationality VARCHAR(100),       -- 국적 매칭 (NULL = all)

  -- Weight-based conditions
  weight_min DECIMAL(10,2),             -- NULL = no lower bound
  weight_max DECIMAL(10,2),             -- NULL = no upper bound

  -- Result
  margin_percent DECIMAL(5,2) NOT NULL, -- 적용 마진 %

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Seed Data (현재 하드코딩 규칙 마이그레이션)

| name | rule_type | priority | match_email | match_nationality | weight_min | weight_max | margin_percent |
|------|-----------|----------|-------------|-------------------|------------|------------|----------------|
| 용성종합물류 고정 | flat | 100 | admin@yslogic.co.kr | NULL | NULL | NULL | 19 |
| 인터블루 고정매칭 | weight_based | 90 | ibas@inter-airsea.co.kr | NULL | 20 | NULL | 19 |
| 인터블루 고정매칭 | weight_based | 90 | ibas@inter-airsea.co.kr | NULL | 0 | 19.99 | 24 |
| 한국 국적 (≥20kg) | weight_based | 50 | NULL | South Korea | 20 | NULL | 19 |
| 한국 국적 (<20kg) | weight_based | 50 | NULL | South Korea | 0 | 19.99 | 24 |
| 기본 (≥20kg) | weight_based | 0 | NULL | NULL | 20 | NULL | 24 |
| 기본 (<20kg) | weight_based | 0 | NULL | NULL | 0 | 19.99 | 32 |

### 3.3 API Endpoints

```
GET    /api/v1/margin_rules          # List all rules (admin only)
POST   /api/v1/margin_rules          # Create rule
PUT    /api/v1/margin_rules/:id      # Update rule
DELETE /api/v1/margin_rules/:id      # Delete rule (soft delete)
GET    /api/v1/margin_rules/resolve  # Resolve margin for given email/nationality/weight
```

### 3.4 Resolution Algorithm

```
1. Fetch all active rules, ordered by priority DESC
2. For each rule (highest priority first):
   a. If match_email set → check user email matches
   b. If match_nationality set → check user nationality matches
   c. If weight_min/max set → check billable weight in range
   d. If ALL conditions match → return margin_percent (first match wins)
3. Fallback: return default margin (24%)
```

### 3.5 Frontend Changes

| Component | Change |
|-----------|--------|
| `TargetMarginRulesWidget` | Static → Dynamic (API fetch + CRUD UI) |
| `QuoteCalculator.tsx` | 하드코딩 제거 → `/margin_rules/resolve` API call |
| `useMarginRules` hook | 신규: margin rules fetch/cache |

### 3.6 Caching Strategy

- Backend: `Rails.cache` with 5min TTL (margin rules rarely change)
- Frontend: React Query / useSWR with 5min stale time
- Cache invalidation: on any CRUD operation

---

## 4. Implementation Phases

### Phase 1: Backend (Rails API)
1. DB migration: `margin_rules` table
2. Model: `MarginRule` with validations
3. Service: `MarginRuleResolver` (resolution algorithm)
4. Controller: `Api::V1::MarginRulesController` (CRUD + resolve)
5. Seed data migration
6. RSpec tests

### Phase 2: Frontend Widget Upgrade
1. API client: `marginRuleApi.ts`
2. Hook: `useMarginRules`
3. `TargetMarginRulesWidget` → dynamic CRUD UI
4. Inline edit/add/delete with confirmation dialogs

### Phase 3: QuoteCalculator Integration
1. Replace hardcoded logic with `/resolve` API call
2. Fallback to current hardcoded logic if API fails
3. Update existing tests

### Phase 4: Audit & Validation
1. AuditLog integration for margin rule changes
2. Migration validation: compare old vs new results for all existing users
3. E2E test coverage

---

## 5. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| API 실패 시 마진 계산 불가 | High | Frontend fallback to hardcoded defaults |
| 잘못된 규칙 설정으로 마진 손실 | High | Validation (min 5%, max 50%), confirmation dialog |
| 규칙 우선순위 충돌 | Medium | Priority 숫자 + first-match-wins 명확화 |
| DB 마이그레이션 중 서비스 중단 | Low | Non-breaking additive migration |

---

## 6. Out of Scope

- Customer self-service margin negotiation
- Time-based margin rules (seasonal/promotional)
- Carrier-specific margin differentiation
- Margin approval workflow

---

## 7. Estimated Effort

| Phase | Estimate |
|-------|----------|
| Phase 1: Backend | 2-3 hours |
| Phase 2: Frontend Widget | 1-2 hours |
| Phase 3: Integration | 1 hour |
| Phase 4: Validation | 1 hour |
| **Total** | **5-7 hours** |
