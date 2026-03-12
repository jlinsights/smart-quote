# Surcharge Management Planning Document

> **Summary**: DB 기반 동적 Surcharge 관리 시스템 구축 — War Risk, PSS, EBS 등 비정기 부과금을 코드 배포 없이 Admin이 실시간 관리하고, 견적에 자동 반영 + 유효기간/disclaimer 포함
>
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Version**: 0.0.0
> **Author**: jaehong
> **Date**: 2026-03-12
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 SmartQuote의 surcharge 처리는 두 가지 한계가 있다:

1. **War Risk Surcharge**: `WAR_RISK_SURCHARGE_RATE` 상수값(현재 0%)으로 하드코딩 → 변경 시 코드 배포 필요
2. **기타 Surcharge**: `manualSurgeCost` 단일 숫자 입력 → 종류 구분 불가, 이력 추적 불가

외부 Forwarder에게 시스템을 배포할 경우, 비정기 surcharge(War Risk, Peak Season, Emergency Situation 등)가 견적에 자동 반영되지 않으면 **부정확한 견적이 고객에게 전달되는 리스크**가 크다.

### 1.2 Background

**현재 시스템 구조 (As-Is)**:
- `src/config/rates.ts`: `WAR_RISK_SURCHARGE_RATE = 0` (하드코딩)
- `src/types.ts`: `QuoteInput.manualSurgeCost?: number` (단일 값)
- `CostBreakdown.intlWarRisk`: base rate × WAR_RISK_SURCHARGE_RATE% 로 계산
- `CostBreakdown.intlSurge`: manualSurgeCost 그대로 반영
- Backend `quote_calculator.rb`: 동일 로직 미러링
- PDF 출력: 유효기간, disclaimer, rate version 표시 없음

**비즈니스 배경**:
- Carrier(UPS/DHL)가 War Risk, PSS 등을 수시로 부과/해제 (때로는 주 단위)
- 중동/홍해 위기 시 War Risk Surcharge가 갑자기 붙어 건당 수만~수십만원 차이 발생
- 외부 Forwarder는 이런 변경을 실시간으로 파악하기 어려움
- 현재는 "최종 견적 전 본사 확인" 프로세스로 커버하지만 scale 불가

**관련 결정사항**:
- `DEC-006`: War Risk Surcharge 제거 (rates.ts, rates.rb 동기화) — 이 Plan으로 재설계

### 1.3 Related Documents

- `docs/01-plan/features/quote-history.plan.md` — 기존 Plan 참고
- `CLAUDE.md` — 시스템 아키텍처 개요
- `src/config/rates.ts` — 현재 surcharge 상수 정의
- `src/features/admin/components/FscRateWidget.tsx` — FSC 관리 UI 참고 패턴

---

## 2. Scope

### 2.1 In Scope

- [ ] **Surcharge 관리 테이블** (DB) — 종류, 적용 대상(carrier/zone/country), 금액/%, 유효기간, on/off
- [ ] **Admin CRUD UI** — Surcharge 등록/수정/삭제/활성화 토글
- [ ] **견적 자동 반영** — 견적 계산 시 활성 surcharge 자동 합산 (frontend + backend 미러링)
- [ ] **견적서 개선** — 유효기간(validity), 적용된 surcharge 목록, disclaimer 표시
- [ ] **견적 상태 workflow** — Draft → Pending Review → Confirmed → Expired
- [ ] **Surcharge 변경 알림** — surcharge 변경 시 미확정 견적 보유 forwarder에게 "재확인 필요" 표시

### 2.2 Out of Scope

- Rate Table(UPS/DHL tariff)의 DB 전환 — 별도 feature로 분리
- Carrier API 연동을 통한 surcharge 자동 수집 — 현재 carrier들이 API 미제공
- 외부 Forwarder 사용자 관리 / 멀티테넌시 — 별도 feature
- 실시간 Push Notification (이메일/SMS) — Phase 2

### 2.3 Dependencies

- PostgreSQL (기존 Rails backend DB)
- 기존 MarginRule 관리 패턴 (Admin CRUD + resolve) 참고
- FSC 관리 패턴 (`FscRateWidget`, `fsc_controller.rb`) 참고

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-1: Surcharge Type 관리

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-1.1 | Admin이 surcharge 종류를 등록할 수 있다 (name, code, description) | P0 |
| FR-1.2 | 각 surcharge에 적용 조건을 설정할 수 있다 (carrier, zone, country, weight range) | P0 |
| FR-1.3 | 금액 방식을 선택할 수 있다: 고정금액(KRW) 또는 기본운임 대비 %(rate-based) | P0 |
| FR-1.4 | 유효기간(effective_from ~ effective_to)을 설정할 수 있다 | P0 |
| FR-1.5 | 개별 surcharge를 활성/비활성 토글할 수 있다 | P0 |
| FR-1.6 | Soft delete로 이력 보존 | P1 |

#### FR-2: 견적 자동 반영

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-2.1 | 견적 계산 시 해당 carrier/zone/country에 매칭되는 활성 surcharge를 자동 합산 | P0 |
| FR-2.2 | 고정금액 surcharge: 건당 고정 KRW 추가 | P0 |
| FR-2.3 | Rate-based surcharge: intlBase × surcharge% 추가 | P0 |
| FR-2.4 | CostBreakdown에 적용된 surcharge 목록(이름+금액) 표시 | P0 |
| FR-2.5 | Frontend(calculationService.ts)와 Backend(quote_calculator.rb) 동일 로직 미러링 | P0 |
| FR-2.6 | 기존 `manualSurgeCost` 필드는 유지 — 시스템 surcharge 위에 추가 수동 입력 가능 | P1 |

#### FR-3: 견적서(PDF) 개선

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-3.1 | Validity Period 표시 (기본 7일, Admin 설정 가능) | P0 |
| FR-3.2 | 적용된 surcharge 항목별 표시 (e.g., "War Risk Surcharge: ₩45,000") | P0 |
| FR-3.3 | Disclaimer 자동 삽입: "Subject to surcharge changes at time of booking" | P0 |
| FR-3.4 | Rate effective date 표시 (어떤 시점의 rate 기준인지) | P1 |

#### FR-4: 견적 상태 관리

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-4.1 | 견적 상태: `draft` → `pending_review` → `confirmed` → `expired` | P1 |
| FR-4.2 | Forwarder가 견적 생성 시 `draft` 상태 | P1 |
| FR-4.3 | "확인 요청" 버튼으로 본사에 `pending_review` 전환 | P1 |
| FR-4.4 | Admin이 검토 후 `confirmed` 처리 | P1 |
| FR-4.5 | Validity 만료 시 자동 `expired` 전환 | P1 |

#### FR-5: 변경 알림

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-5.1 | Surcharge 변경 시 `draft`/`pending_review` 상태 견적에 "재확인 필요" 배지 표시 | P1 |
| FR-5.2 | Dashboard에 "Surcharge가 변경되었습니다" 공지 자동 생성 | P2 |

### 3.2 Non-Functional Requirements

| ID | 요구사항 | 목표값 |
|----|---------|-------|
| NFR-1 | Surcharge resolve API 응답시간 | < 200ms |
| NFR-2 | Frontend 견적 계산 (surcharge 포함) | < 50ms (useMemo 유지) |
| NFR-3 | Surcharge 데이터 캐싱 | Frontend: 5분, Backend: 5분 (MarginRule 동일) |
| NFR-4 | Frontend/Backend 계산 결과 차이 | 0원 (parity 유지) |
| NFR-5 | 이전 surcharge 조합 감사 추적 | AuditLog 테이블 기록 |

### 3.3 Technical Constraints

- **미러링 필수**: Frontend `calculationService.ts` ↔ Backend `quote_calculator.rb` 동일 로직
- **기존 API 호환**: 현재 `POST /api/v1/quotes` 등 기존 endpoint 파라미터 유지
- **하위 호환**: `manualSurgeCost` 필드 제거하지 않음 (기존 저장된 견적 호환)
- **i18n**: surcharge명은 `en|ko|cn|ja` 4개 언어 지원 (translations.ts 확장)

---

## 4. Data Model

### 4.1 Surcharge Table (신규)

```sql
CREATE TABLE surcharges (
  id            BIGSERIAL PRIMARY KEY,
  code          VARCHAR(50)  NOT NULL UNIQUE,  -- e.g., 'WAR_RISK', 'PSS', 'EBS'
  name          VARCHAR(100) NOT NULL,          -- 영문명
  name_ko       VARCHAR(100),                   -- 한국어명
  description   TEXT,

  -- 적용 조건
  carrier       VARCHAR(10),                    -- NULL=전체, 'UPS'/'DHL'/'EMAX'
  zone          VARCHAR(10),                    -- NULL=전체, 'Z1'-'Z10'
  country_codes TEXT[],                          -- NULL=전체, ['IL','JO','LB','SA']

  -- 금액
  charge_type   VARCHAR(10)  NOT NULL DEFAULT 'fixed',  -- 'fixed' or 'rate'
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0,        -- fixed: KRW금액, rate: %값

  -- 유효기간
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to   DATE,                           -- NULL=무기한
  is_active      BOOLEAN NOT NULL DEFAULT true,

  -- 감사
  created_by    BIGINT REFERENCES users(id),
  deleted_at    TIMESTAMP,                       -- soft delete
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_surcharges_active ON surcharges (is_active, deleted_at, effective_from, effective_to);
CREATE INDEX idx_surcharges_carrier ON surcharges (carrier) WHERE deleted_at IS NULL;
```

### 4.2 Quote Table 변경

```sql
-- 기존 quotes 테이블에 추가
ALTER TABLE quotes ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE quotes ADD COLUMN validity_date DATE;
ALTER TABLE quotes ADD COLUMN applied_surcharges JSONB DEFAULT '[]';
-- applied_surcharges 예시: [{"code":"WAR_RISK","name":"War Risk","amount":45000}]
```

### 4.3 기존 타입 확장 (Frontend)

```typescript
// src/types.ts 확장
interface SurchargeRule {
  id: number;
  code: string;
  name: string;
  nameKo: string;
  carrier: string | null;     // null = 전체 carrier
  zone: string | null;        // null = 전체 zone
  countryCodes: string[];     // [] = 전체 국가
  chargeType: 'fixed' | 'rate';
  amount: number;             // fixed: KRW, rate: %
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

interface AppliedSurcharge {
  code: string;
  name: string;
  amount: number;  // 실제 적용된 KRW 금액
}

// CostBreakdown 확장
interface CostBreakdown {
  // ... 기존 필드 유지
  intlWarRisk: number;        // 기존 유지 (시스템 surcharge 합계로 재활용)
  intlSurge: number;          // 기존 유지 (manual surge)
  appliedSurcharges: AppliedSurcharge[];  // 신규: 개별 surcharge 내역
}

// QuoteResult 확장
interface QuoteResult {
  // ... 기존 필드 유지
  validityDate: string;       // 견적 유효일
  quoteStatus: 'draft' | 'pending_review' | 'confirmed' | 'expired';
}
```

---

## 5. API Design

### 5.1 Surcharge CRUD (Admin)

```
GET    /api/v1/surcharges              # 전체 목록 (admin)
POST   /api/v1/surcharges              # 등록 (admin)
PUT    /api/v1/surcharges/:id          # 수정 (admin)
DELETE /api/v1/surcharges/:id          # Soft delete (admin)
```

### 5.2 Surcharge Resolve (견적 계산용)

```
GET /api/v1/surcharges/resolve?carrier=UPS&country=IL&zone=Z9
# Response: 현재 활성 + 유효기간 내 + 조건 매칭되는 surcharge 목록
# [{ code: "WAR_RISK", name: "War Risk Surcharge", chargeType: "rate", amount: 3.5 }, ...]
```

### 5.3 견적 상태 변경

```
PATCH /api/v1/quotes/:id/status    # { status: 'pending_review' | 'confirmed' | 'expired' }
```

---

## 6. Implementation Strategy

### 6.1 Phase 1 — Surcharge CRUD + 견적 반영 (P0, 핵심)

1. DB migration: `surcharges` 테이블 생성
2. Backend: `Surcharge` model + `SurchargeResolver` service + controller
3. Frontend: `surchargeApi.ts` + `useSurcharges` hook
4. **계산 로직 변경**: `calculationService.ts` + `quote_calculator.rb`에 surcharge resolve 통합
5. Admin UI: `SurchargeManagementWidget` (FscRateWidget 패턴 참고)
6. 테스트: calculation parity test 확장

### 6.2 Phase 2 — 견적서 개선 + 상태 관리 (P1)

1. PDF: validity, surcharge 상세, disclaimer 추가
2. DB migration: quotes 테이블에 status, validity_date, applied_surcharges 추가
3. 견적 상태 workflow UI
4. Surcharge 변경 시 "재확인 필요" 배지

### 6.3 Phase 3 — 알림 + 고도화 (P2)

1. Dashboard 공지 자동 생성
2. 이메일 알림 (Phase 2 이후)
3. Surcharge 이력 조회 UI

### 6.4 Migration Path

기존 `WAR_RISK_SURCHARGE_RATE` 상수(현재 0)를 DB surcharge로 전환:
1. DB에 `WAR_RISK` surcharge rule 등록 (is_active=false, amount=0)
2. 계산 로직에서 DB resolve 결과를 사용하도록 변경
3. 기존 상수 `WAR_RISK_SURCHARGE_RATE` 참조 제거
4. `intlWarRisk` 필드는 유지하되, DB에서 resolve된 surcharge 합계를 할당

---

## 7. Risks & Mitigations

| 리스크 | 영향 | 확률 | 대응 |
|-------|------|------|------|
| Frontend/Backend 계산 불일치 | 고객 신뢰 하락 | 중 | calculationParity.test.ts 확장, CI에서 자동 검증 |
| Surcharge resolve API 지연 | 견적 UX 저하 | 저 | 5분 캐시 + fallback (빈 배열 = 추가 surcharge 없음) |
| Admin이 surcharge 업데이트 누락 | 부정확한 견적 | 중 | 유효기간 자동 만료 + "활성 surcharge 없음" 경고 표시 |
| 기존 견적 호환성 | 데이터 무결성 | 저 | applied_surcharges JSONB로 스냅샷 보존, 기존 필드 유지 |
| Forwarder가 확인 없이 견적 전달 | 가격 클레임 | 고 | PDF에 mandatory disclaimer + validity 표시 |

---

## 8. Success Criteria

| 지표 | 목표 |
|------|------|
| Surcharge 변경 → 견적 반영 시간 | < 5분 (Admin 입력 후 캐시 갱신) |
| Frontend/Backend 계산 parity | 100% (0원 차이) |
| 견적서에 유효기간 표시 | 100% (모든 PDF) |
| 부정확한 견적 발생률 | < 1% (surcharge 누락 건) |
| Admin surcharge 관리 소요시간 | < 2분/건 (등록/수정) |

---

## 9. Open Questions

1. **Surcharge 조합 규칙**: 동일 carrier에 여러 surcharge가 동시 적용될 때 합산인가, 최대값인가? → **합산 (stacking)** 으로 가정
2. **EMAX surcharge**: EMAX도 동일한 surcharge 체계를 적용하는가, 별도인가? → 확인 필요
3. **Validity 기본값**: 7일이 적절한가? → 업계 관행 확인 필요
4. **Forwarder별 surcharge override**: 특정 forwarder에게만 다른 surcharge를 적용하는 케이스가 있는가? → Phase 2에서 고려
