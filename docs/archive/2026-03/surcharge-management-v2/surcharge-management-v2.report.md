# PDCA Completion Report: surcharge-management-v2

> **Feature**: Surcharge Management V2 — PDF 상세 표시 + 견적 상태 Workflow + Stale 배지 + i18n
>
> **Project**: Smart Quote System
> **Date**: 2026-03-12
> **Author**: jaehong
> **Match Rate**: 100% (27/27)
> **Status**: COMPLETED

---

## 1. Executive Summary

V1 Surcharge Management에서 defer된 4가지 핵심 기능을 단일 PDCA 사이클로 구현 완료. 27개 체크리스트 항목 전체 100% 매칭, iterate 없이 1회 통과.

**구현 범위**:
1. PDF 견적서에 개별 surcharge 항목별 표시 + 유효기간 + Disclaimer
2. 견적 상태 Workflow 확장 (confirmed/expired 추가, 자동 만료)
3. Surcharge 변경 시 draft 견적에 "재확인 필요" stale 배지
4. 4개 언어 i18n 지원 (9개 신규 키)

---

## 2. PDCA Cycle Summary

| Phase | Status | Key Output |
|-------|--------|------------|
| **Plan** | ✅ | `docs/01-plan/features/surcharge-management-v2.plan.md` |
| **Design** | ✅ | `docs/02-design/features/surcharge-management-v2.design.md` (27-item checklist) |
| **Do** | ✅ | 5 phases, 13 files modified/created |
| **Check** | ✅ | 100% match rate, 0 gaps |
| **Act** | N/A | Not required (>=90%) |

---

## 3. Implementation Details

### 3.1 Files Modified/Created

| File | Type | Changes |
|------|------|---------|
| `src/lib/pdfService.ts` | Modified | drawCostTable (surcharge detail), drawHeader (validityDate), new drawDisclaimer, generatePDF/ComparisonPDF integration |
| `smart-quote-api/db/migrate/20260312100001_add_validity_date_to_quotes.rb` | Created | `validity_date` date column + backfill |
| `smart-quote-api/app/models/quote.rb` | Modified | VALID_STATUSES extended, DEFAULT_VALIDITY_DAYS, stale_drafts scope, expired?, set_validity_date callback |
| `smart-quote-api/app/controllers/api/v1/quotes_controller.rb` | Modified | Auto-expire in index, extended status validation, validityDate/surchargeStale in responses, surcharge_stale? helper |
| `smart-quote-api/app/controllers/api/v1/surcharges_controller.rb` | Modified | track_surcharges_updated! on CUD operations |
| `src/types.ts` | Modified | QuoteStatus += confirmed/expired, validityDate + surchargeStale fields |
| `src/features/history/constants.ts` | Modified | STATUS_COLORS += confirmed (emerald), expired (orange) |
| `src/api/quoteApi.ts` | Modified | updateQuoteStatus uses QuoteStatus type |
| `src/features/history/components/QuoteHistoryTable.tsx` | Modified | Server validityDate, stale badge (mobile + desktop) |
| `src/features/history/components/QuoteDetailModal.tsx` | Modified | STATUS_FLOW extended, Validity field, individual surcharge breakdown |
| `src/i18n/translations.ts` | Modified | 9 new keys in ko/en/cn/ja |
| `src/features/history/components/__tests__/QuoteHistoryTable.test.tsx` | Modified | Test fixture updated for validityDate |

### 3.2 Phase Breakdown

#### Phase 1: PDF Enhancement (Items 1-7)
- `drawCostTable`: 개별 `appliedSurcharges` 반복 렌더링 + Manual Surge 분리 + 레거시 fallback
- `drawHeader`: `validityDate` 파라미터 추가, "Valid until: YYYY-MM-DD" 표시
- `drawDisclaimer`: 한/영 이중 disclaimer + rate effective date
- `generatePDF` / `generateComparisonPDF`: disclaimer 통합

#### Phase 2: Backend - Validity & Status (Items 8-15)
- Migration: `validity_date` DATE 컬럼 + 기존 데이터 backfill (created_at + 7일)
- Quote 모델: `VALID_STATUSES` 6개 상태, `stale_drafts` scope, `expired?` 메서드
- Controller: `create` 시 자동 validity_date, `index` 시 stale drafts auto-expire, `surcharge_stale?` 비교 로직

#### Phase 3: Frontend - Types, Status & Stale (Items 16-25)
- `QuoteStatus` 타입 확장 (confirmed, expired)
- `QuoteSummary` / `QuoteDetail`에 validityDate, surchargeStale 필드 추가
- STATUS_COLORS에 emerald(confirmed), orange(expired) 추가
- QuoteHistoryTable: 서버 제공 validityDate 사용, stale 배지 (AlertTriangle + amber)
- QuoteDetailModal: 6-state STATUS_FLOW, Validity 필드, 개별 surcharge breakdown

#### Phase 4: i18n (Item 26)
- 9개 신규 번역 키: status.confirmed, status.expired, validity, validity.expired, surcharge.stale, surcharge.stale.short, pdf.disclaimer.ko, pdf.disclaimer.en, pdf.rateDate
- 4개 언어 (ko, en, cn, ja) 완전 지원

#### Phase 5: Surcharge Cache Tracking (Item 27)
- `surcharges_controller.rb`: CUD 시 `surcharges_updated_at` 캐시 키 기록 (30일 TTL)

---

## 4. Quality Metrics

| Metric | Result |
|--------|--------|
| Design Match Rate | 100% (27/27) |
| Gaps Found | 0 |
| Iterations Required | 0 |
| TypeScript | PASS (`npx tsc --noEmit`) |
| Tests | PASS (1153 tests, 25 files) |
| Lint | PASS (`npm run lint`) |

### Acceptable Deviations

| Item | Deviation | Impact |
|------|-----------|--------|
| #15 surcharge_stale? | 방어적 `rescue => e` 블록 추가 (Design에 미명시) | 없음 - 안정성 향상 |

---

## 5. Architecture Decisions

### 5.1 Server-Side Validity Date
- **결정**: 클라이언트 계산(`QUOTE_VALIDITY_DAYS` 상수) → 서버 제공(`validity_date` DB 컬럼)
- **이유**: 단일 진실 소스(SSOT), 향후 Admin 설정 가능한 유효기간 지원, 일관된 만료 처리

### 5.2 Query-Time Auto-Expire
- **결정**: Background job 대신 `index` 조회 시 `stale_drafts.update_all(status: "expired")`
- **이유**: 현재 트래픽 규모에서 충분, 추가 인프라(sidekiq 등) 불필요, 즉각적 UI 반영

### 5.3 Surcharge Stale Detection
- **결정**: 코드 + 금액 비교 (이름 변경만으로는 stale 판정 안 함)
- **이유**: false positive 최소화, 실제 비용 영향이 있는 변경만 감지

### 5.4 Backward Compatibility
- **결정**: `appliedSurcharges` 배열 없는 레거시 견적 → 기존 `intlWarRisk`/`intlSurge` 단일 행 fallback
- **이유**: V1 이전 저장된 견적도 정상 표시, breaking change 없음

---

## 6. Predecessor Relationship

| | V1 (surcharge-management) | V2 (surcharge-management-v2) |
|---|---|---|
| Scope | DB + CRUD + Admin UI + CostBreakdownCard | PDF + Status Workflow + Stale Badge + i18n |
| Status | Archived (2026-03-12, 100%) | Completed (2026-03-12, 100%) |
| Key Output | surcharges 테이블, SurchargeResolver, Admin Widget | PDF 상세, validity_date, auto-expire, stale detection |
| Deferred Items | PDF detail, validity, status workflow, stale badge | Admin-configurable validity, email notification, background job |

---

## 7. Known Limitations & Future Work

### Current Limitations
1. **Stale detection performance**: `surcharge_stale?`가 quote별로 SurchargeResolver 호출 (5분 캐시로 완화, 100+ 견적 시 배치 최적화 고려)
2. **PDF disclaimer 하드코딩**: jsPDF가 React i18n 시스템을 사용하지 않아 한/영 고정 (비즈니스 맥락상 충분)
3. **Auto-expire는 조회 시에만**: Background job 아님 (현재 사용 패턴에 충분)

### Deferred to Future Phases
- Admin 설정 가능한 validity_days (system_settings 테이블)
- 이메일/SMS surcharge 변경 알림
- Background job auto-expire (query-time 체크 대체)
- Expired 견적 "재견적" 버튼 (이전 입력 자동 채우기)

---

## 8. Conclusion

Surcharge Management V2는 V1에서 defer한 4가지 핵심 기능을 Design 문서 100% 일치로 구현 완료. Plan → Design → Do → Check 전 과정을 단일 세션에서 완수했으며, iterate 없이 1회 통과. 기존 시스템과의 하위 호환성을 유지하면서 PDF 가독성, 견적 관리 워크플로우, 가격 변동 감지 기능을 크게 향상시켰다.

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ → [Report] ✅
```
