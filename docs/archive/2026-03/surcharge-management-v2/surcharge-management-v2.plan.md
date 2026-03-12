# Surcharge Management V2 Planning Document

> **Summary**: 견적서(PDF) Surcharge 상세 표시 + 유효기간/Disclaimer + 견적 상태 Workflow + Surcharge 변경 알림 배지 — V1에서 defer된 Phase 2 기능 일괄 구현
>
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Version**: 2.0.0
> **Author**: jaehong
> **Date**: 2026-03-12
> **Status**: Draft
> **Predecessor**: surcharge-management (V1) — archived 2026-03-12, 100% match rate

---

## 1. Overview

### 1.1 Purpose

V1에서 DB 기반 Surcharge CRUD + 자동 반영 + Admin 관리 UI를 완료했다. V2는 V1에서 명시적으로 defer한 4가지 기능을 구현한다:

1. **견적서(PDF) 개선**: 개별 surcharge 항목, 유효기간, disclaimer 표시
2. **견적 상태 Workflow**: draft → confirmed → expired 상태 전환
3. **Surcharge 변경 알림**: draft 견적에 "재확인 필요" 배지
4. **Dashboard 알림**: surcharge 변경 시 자동 공지

### 1.2 Background

**V1 완료 상태 (As-Is)**:
- `surcharges` 테이블 + `SurchargeResolver` + 5분 캐시 ✅
- Admin `SurchargeManagementWidget` (CRUD) ✅
- `CostBreakdownCard`에 개별 surcharge 표시 ✅
- `SurchargePanel` dashboard 컴포넌트 ✅
- `appliedSurcharges` 배열이 `CostBreakdown` 타입에 포함 ✅

**V2에서 해결할 문제**:
- PDF 견적서에는 여전히 단일 "할증료 (Surge)" 행만 표시 → 고객이 어떤 surcharge가 적용됐는지 모름
- 견적 유효기간이 없어 오래된 견적으로 주문 시 가격 차이 발생
- surcharge 변경 후 기존 draft 견적이 무효화됐는지 확인 불가
- "Subject to surcharge changes" disclaimer 부재 → 가격 분쟁 리스크

### 1.3 Related Documents

- `docs/archive/2026-03/surcharge-management/` — V1 전체 PDCA 문서
- `src/lib/pdfService.ts` — 현재 PDF 생성 로직
- `smart-quote-api/db/schema.rb` — quotes 테이블 (status: 'draft' 이미 존재)

---

## 2. Scope

### 2.1 In Scope

- [ ] **PDF Surcharge 상세 표시** — 적용된 surcharge를 항목별로 PDF Cost Breakdown에 표시
- [ ] **PDF Validity Period** — 견적 유효기간 표시 (기본 7일, Admin 설정 가능)
- [ ] **PDF Disclaimer** — "Subject to surcharge changes at time of booking" 자동 삽입
- [ ] **견적 상태 Workflow** — draft → confirmed → expired 상태 전환 + UI
- [ ] **Validity 만료 자동 처리** — 유효기간 경과 시 expired 전환 (백엔드 Job 또는 조회 시 체크)
- [ ] **Surcharge 변경 알림 배지** — draft 견적에 "재확인 필요" 표시
- [ ] **Dashboard 변경 공지** — surcharge 변경 시 자동 공지 생성

### 2.2 Out of Scope

- 이메일/SMS Push Notification — Phase 3
- Forwarder별 surcharge override (멀티테넌시) — 별도 feature
- Rate Table DB 전환 — 별도 feature
- Carrier API 자동 연동 — API 미제공으로 불가

### 2.3 Dependencies

- V1 surcharge-management 완료 (✅ archived)
- `quotes.status` 컬럼 이미 존재 (`default: 'draft'`)
- `quotes.breakdown` JSONB에 `appliedSurcharges` 이미 저장

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-1: PDF Surcharge 상세 (from V1 FR-3.x)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-1.1 | PDF Cost Breakdown 테이블에 적용된 surcharge를 항목별 행으로 표시 | P0 |
| FR-1.2 | 각 surcharge 행: 이름(Ko) + 유형(rate/fixed) + 금액(KRW) | P0 |
| FR-1.3 | Manual Surge가 있으면 별도 행으로 표시 | P0 |
| FR-1.4 | Surcharge 없으면 기존과 동일하게 단일 행 또는 생략 | P0 |

#### FR-2: PDF Validity & Disclaimer (from V1 FR-3.x)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-2.1 | 견적 유효기간 표시: "Valid until: YYYY-MM-DD" (Header 영역) | P0 |
| FR-2.2 | 기본 유효기간: 견적 생성일 + 7일 | P0 |
| FR-2.3 | Admin이 유효기간 일수를 설정할 수 있는 config (system_settings 또는 환경변수) | P1 |
| FR-2.4 | Disclaimer: "본 견적서는 유효기간 내 확인 기준이며, 할증료 변동 시 재산정될 수 있습니다." (한/영 이중) | P0 |
| FR-2.5 | Rate effective date 표시: "Rates as of: YYYY-MM-DD" | P1 |

#### FR-3: 견적 상태 Workflow (from V1 FR-4.x)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-3.1 | 견적 상태: `draft` → `confirmed` → `expired` (3-state 간소화) | P0 |
| FR-3.2 | Admin이 draft 견적을 `confirmed` 처리 가능 | P0 |
| FR-3.3 | 유효기간 경과 시 자동 `expired` 전환 | P0 |
| FR-3.4 | expired 견적은 수정 불가, "재견적" 버튼으로 신규 생성 유도 | P1 |
| FR-3.5 | Quote History 테이블에 상태 배지 컬러 표시 | P0 |
| FR-3.6 | Quote Detail Modal에 상태 전환 버튼 표시 (Admin only) | P0 |

#### FR-4: Surcharge 변경 알림 (from V1 FR-5.x)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-4.1 | Surcharge 변경 시 해당 carrier의 `draft` 견적에 "재확인 필요" 배지 표시 | P0 |
| FR-4.2 | 배지 판단 로직: 견적의 `breakdown.appliedSurcharges` 스냅샷 vs 현재 활성 surcharge 비교 | P0 |
| FR-4.3 | Dashboard "공지" 위젯에 "Surcharge가 변경되었습니다" 자동 생성 | P1 |
| FR-4.4 | 알림 배지는 견적을 재저장(re-quote)하면 해소 | P0 |

### 3.2 Non-Functional Requirements

| ID | 요구사항 | 목표값 |
|----|---------|-------|
| NFR-1 | PDF 생성 시간 (surcharge 상세 포함) | < 2초 |
| NFR-2 | 상태 전환 API 응답시간 | < 200ms |
| NFR-3 | 만료 체크 (조회 시) | < 50ms (날짜 비교) |
| NFR-4 | 변경 알림 배지 판단 | < 100ms |
| NFR-5 | i18n 지원 | 4개 언어 (en/ko/cn/ja) |

### 3.3 Technical Constraints

- PDF 라이브러리: `jsPDF` + `jspdf-autotable` (기존 유지)
- `quotes.status` 컬럼 이미 존재 → migration은 `validity_date` 추가만 필요
- `breakdown` JSONB에 `appliedSurcharges` 이미 저장 → PDF에서 직접 참조 가능
- Frontend `QuoteStatus` 타입 이미 존재: `'draft' | 'sent' | 'accepted' | 'rejected'` → `'confirmed' | 'expired'` 추가 필요

---

## 4. Data Model Changes

### 4.1 Quotes Table Migration

```sql
-- validity_date 추가 (status 컬럼은 이미 존재)
ALTER TABLE quotes ADD COLUMN validity_date DATE;
-- 기본값은 application level에서 created_at + 7일로 설정
```

### 4.2 Frontend Type Changes

```typescript
// QuoteStatus 확장
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'confirmed' | 'expired';

// QuoteDetail에 validityDate 추가
export interface QuoteDetail {
  // ... 기존 필드
  validityDate: string | null;
}

// QuoteSummary에 validityDate 추가
export interface QuoteSummary {
  // ... 기존 필드
  validityDate: string | null;
}
```

### 4.3 System Settings (Optional P1)

```typescript
// Admin 설정 가능한 견적 유효기간 일수
// 초기에는 DEFAULT_VALIDITY_DAYS = 7 상수로 구현
// P1에서 system_settings 테이블 도입 시 DB 전환
```

---

## 5. API Design

### 5.1 견적 상태 변경 (신규)

```
PATCH /api/v1/quotes/:id/status
Body: { status: 'confirmed' | 'expired' }
Response: { id, status, updated_at }
Auth: Admin only (confirmed), System (expired)
```

### 5.2 견적 생성 변경 (기존 수정)

```
POST /api/v1/quotes
# 기존 + validity_date 자동 계산 (created_at + 7일)
# Response에 validity_date 포함
```

### 5.3 견적 목록 변경 (기존 수정)

```
GET /api/v1/quotes
# 조회 시 validity_date 경과한 draft → 자동 expired 전환
# Response에 validity_date, surcharge_stale (boolean) 포함
```

---

## 6. Implementation Strategy

### 6.1 Phase 1 — PDF 개선 (P0, 독립적)

1. `pdfService.ts` > `drawCostTable()`: `appliedSurcharges` 배열 활용하여 항목별 행 추가
2. `pdfService.ts` > `drawHeader()`: "Valid until: YYYY-MM-DD" 추가
3. `pdfService.ts` > `drawFooter()`: Surcharge disclaimer 추가
4. Comparison PDF도 동일 적용
5. i18n: PDF 관련 번역키 추가 (4개 언어)

### 6.2 Phase 2 — 견적 상태 Workflow (P0)

1. DB migration: `validity_date` 컬럼 추가
2. Backend: `quotes_controller.rb` > create 시 `validity_date` 자동 설정
3. Backend: `PATCH /api/v1/quotes/:id/status` 엔드포인트 추가
4. Backend: 목록 조회 시 만료 체크 로직 (`where validity_date < today AND status = 'draft'` → expired)
5. Frontend: `QuoteStatus` 타입 확장 (`confirmed`, `expired` 추가)
6. Frontend: `QuoteHistoryTable` 상태 배지 컬러 추가
7. Frontend: `QuoteDetailModal` 상태 전환 버튼 (Admin only)

### 6.3 Phase 3 — Surcharge 변경 알림 (P0)

1. Backend: surcharges_controller > update/create 시 `surcharges_updated_at` 타임스탬프 기록
2. Frontend: 견적 목록에서 `appliedSurcharges` 스냅샷 vs 현재 surcharge 비교
3. 불일치 시 "재확인 필요" 배지 표시 (amber warning)
4. Re-quote(재저장) 시 최신 surcharge로 갱신 → 배지 해소

### 6.4 Phase 4 — Dashboard 알림 (P1)

1. surcharge 변경 시 notices 자동 생성 (Backend hook)
2. NoticeWidget에 자동 노출

---

## 7. Risks & Mitigations

| 리스크 | 영향 | 확률 | 대응 |
|-------|------|------|------|
| PDF 레이아웃 깨짐 (surcharge 행 추가로 페이지 넘침) | 견적서 가독성 하락 | 중 | jspdf-autotable 자동 페이지 분할 활용 + 최대 10개 surcharge 행 제한 |
| 만료 체크 조회 시 성능 | 목록 API 지연 | 저 | DB index on (status, validity_date) + 일괄 UPDATE 배치 방식 병행 |
| Surcharge 변경 알림 오탐 | 불필요한 재확인 요청 | 중 | 스냅샷 비교는 금액 기준 (이름 변경만으로는 트리거 안됨) |
| QuoteStatus 하위 호환 | 기존 'sent'/'accepted'/'rejected' 상태 | 저 | 기존 상태 유지, 새 상태 추가만 (breaking change 없음) |
| 유효기간 기본값 변경 요청 | Admin 혼란 | 저 | 초기 7일 상수, P1에서 Admin 설정 UI 제공 |

---

## 8. Success Criteria

| 지표 | 목표 |
|------|------|
| PDF에 개별 surcharge 항목 표시 | 100% (appliedSurcharges 있는 견적) |
| PDF에 유효기간 + disclaimer 표시 | 100% (모든 PDF) |
| 견적 상태 전환 정상 동작 | draft → confirmed → expired 경로 검증 |
| 만료 견적 자동 expired 전환 | validity_date 경과 후 조회 시 100% |
| Surcharge 변경 시 stale 배지 표시 | carrier 매칭 draft 견적 100% |
| i18n 4개 언어 지원 | PDF + UI 모든 신규 텍스트 |

---

## 9. Open Questions

1. ~~**Surcharge 조합 규칙**: 합산 vs 최대값~~ → V1에서 **합산(stacking)** 확정
2. **유효기간 기본값 7일**: 업계 관행 확인 완료? → 7일 채택 (변경 시 Admin 설정으로 대응)
3. **`pending_review` 상태 필요 여부**: V1 Plan에서는 4-state였으나, 현재 운영 규모에서 3-state(draft/confirmed/expired)로 간소화 → 추후 필요 시 추가
4. **Comparison PDF 유효기간**: 단일 견적 PDF와 동일하게 적용? → Yes, 동일 유효기간

---

## 10. Estimation

| Phase | 항목 | 예상 규모 |
|-------|------|----------|
| Phase 1 | PDF 개선 (surcharge 상세 + validity + disclaimer) | 중 (pdfService.ts 수정) |
| Phase 2 | 견적 상태 Workflow (migration + API + UI) | 대 (Backend + Frontend) |
| Phase 3 | Surcharge 변경 알림 배지 | 중 (비교 로직 + UI) |
| Phase 4 | Dashboard 자동 공지 | 소 (Backend hook + 기존 위젯) |
