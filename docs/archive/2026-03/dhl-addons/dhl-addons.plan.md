# Carrier Add-on Services Planning Document

> **Summary**: DHL & UPS 부가서비스 요금을 견적 시스템에 통합 (2026 요금표 기준)
>
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Feature**: dhl-addons (carrier-addons 통합)
> **Author**: jaehong
> **Date**: 2026-03-12
> **Status**: In Progress (DHL 완료, UPS 추가 예정)

---

## 1. Overview

### 1.1 Purpose

DHL Express Korea 및 UPS Korea의 부가서비스(Add-on/Surcharge) 요금을 견적 계산에 반영하여 정확한 총 물류비용 산출. 기존 수동 Surge 입력에 더해 자동 감지(OSP, OWT 등) + 사용자 선택형 부가서비스 옵션을 제공.

### 1.2 Background

- 기존: `manualSurgeCost` 필드로 수동 입금만 지원
- Surcharge V1/V2: DB 기반 자동 할증료 시스템 구축 완료 (appliedSurcharges)
- **DHL 부가서비스**: 2026년 DHL Express Korea 공식 요금 13종 → **구현 완료**
- **UPS 부가서비스**: 2026년 UPS Korea 공식 요금 6종 → **신규 계획**

### 1.3 Source Data

#### DHL Express Korea 2026 부가서비스 (13종) — 구현 완료

| Code | 서비스명 | 금액(KRW) | 단위 | FSC적용 | 감지방식 |
|------|---------|-----------|------|---------|---------|
| SAT | 토요일 배송 | 60,000 | 발송건 | O | 선택 |
| ELR | 분쟁지역 | 50,000 | 발송건 | O | 선택 |
| OWT | 과중량(>70kg) | 150,000 | 카톤 | O | 자동 |
| INS | 물품 보험 | max(1%, 17,000) | 발송건 | X | 선택+계산 |
| DOC | 서류 보험 | 8,000 | 발송건 | X | 선택 |
| RES | 주거지역 배송 | 8,000 | 발송건 | O | 선택 |
| SIG | 직접 서명 | 8,000 | 발송건 | X | 선택 |
| NDS | NDS (3자무역) | 8,000 | 발송건 | X | 선택 |
| RMT | 외곽 요금 | max(35,000, kg×750) | 발송건 | O | 선택+계산 |
| ADC | 주소 정정 | 17,000 | 발송건 | X | 선택 |
| IRR | 비정형 화물 | 30,000 | piece | O | 선택 |
| ASR | 성인 서명 | 8,000 | 발송건 | X | 선택 |
| OSP | 대형 화물 | 30,000 | piece | O | 자동 |

#### UPS Korea 2026 부가서비스 (6종) — 신규 계획

| 서비스명 | 2025(KRW) | 2026(KRW) | 단위 | FSC적용 |
|---------|-----------|-----------|------|---------|
| 주거지역(Residential) | 4,500 | 4,600 | 발송건 | O |
| 외곽요금 | 30,700(kg당550) | 31,400(kg당570) | 발송건 | O |
| 원거리지역서비스 | 33,400(kg당620) | 34,200(kg당640) | 발송건 | O |
| 비규격품부가요금(Additional Handling) | 18,700 | 21,400 | 카톤 | O |
| 주소정정 | 14,600 | 15,100 | 카톤 | X |
| DDP 수수료 | 27,000 | 28,500 | 발송건 | X |

---

## 2. Scope

### 2.1 In Scope

- [x] **DHL Config**: `src/config/dhl_addons.ts` — 13종 요금표 + 헬퍼 함수
- [x] **DHL UI**: `DhlAddOnPanel.tsx` — 체크박스 UI + 자동감지 경고 + 보험 입력
- [x] **DHL 계산**: `calculationService.ts` — `calculateDhlAddOnCosts()` 통합
- [x] **DHL Breakdown**: `CostBreakdownCard.tsx` — 부가서비스 상세 표시
- [x] **Types**: `QuoteInput.dhlAddOns/dhlDeclaredValue`, `CostBreakdown.dhlAddOnTotal/dhlAddOnDetails`
- [ ] **UPS Config**: `src/config/ups_addons.ts` — 6종 요금표 + 계산 함수
- [ ] **UPS UI**: `UpsAddOnPanel.tsx` — 체크박스 UI (DHL 패널과 유사 구조)
- [ ] **UPS 계산**: `calculationService.ts` — `calculateUpsAddOnCosts()` 통합
- [ ] **Types 확장**: `QuoteInput.upsAddOns`, `CostBreakdown`에 UPS add-on 필드
- [ ] **통합 UI**: ServiceSection에서 carrier별 패널 조건부 렌더링
- [ ] **PDF**: `pdfService.ts` — DHL/UPS 부가서비스 상세 출력
- [ ] **Backend 동기화**: Rails `quote_calculator.rb` + `quotes_controller.rb`

### 2.2 Out of Scope

- EMAX 부가서비스 (EMAX는 CN/VN 전용, 부가서비스 체계 없음)
- DB 기반 동적 요금 관리 (현재 config 파일 기반, 향후 admin UI 확장 가능)
- 부가서비스 이력 추적 (quote 저장 시 breakdown에 포함되므로 별도 불필요)

---

## 3. Technical Approach

### 3.1 Architecture Pattern

```
src/config/
  dhl_addons.ts          ✅ DHL 부가서비스 요금표 + 헬퍼
  ups_addons.ts          🆕 UPS 부가서비스 요금표 + 헬퍼

src/features/quote/components/
  DhlAddOnPanel.tsx      ✅ DHL 부가서비스 UI
  UpsAddOnPanel.tsx      🆕 UPS 부가서비스 UI (DHL 패턴 재사용)
  ServiceSection.tsx     ✅ carrier별 조건부 렌더링

src/features/quote/services/
  calculationService.ts  ✅ DHL 통합 완료, UPS 추가 필요

src/types.ts             ✅ DHL 필드 추가 완료, UPS 필드 추가 필요
```

### 3.2 UPS Add-on 계산 로직

| 서비스 | 계산 방식 |
|--------|----------|
| Residential | 고정 4,600 + FSC |
| 외곽요금 | max(31,400, kg×570) + FSC |
| 원거리지역 | max(34,200, kg×640) + FSC |
| Additional Handling | 21,400 × 카톤수 + FSC |
| 주소정정 | 15,100 × 카톤수 |
| DDP 수수료 | 28,500 (DDP incoterm일 때만) |

### 3.3 자동감지 대상

- **DHL**: OSP(longest>100cm OR 2nd>80cm), OWT(>70kg/carton) ✅
- **UPS**: Additional Handling은 기존 `SURGE_THRESHOLDS`의 AHS 로직과 연관 — 자동감지 고려

---

## 4. Implementation Priority

| Phase | 작업 | 상태 |
|-------|------|------|
| **Phase 1** | DHL 부가서비스 전체 구현 | ✅ 완료 |
| **Phase 2** | UPS 부가서비스 Config + UI + 계산 | 🔲 진행 예정 |
| **Phase 3** | PDF 출력 통합 (DHL + UPS) | 🔲 |
| **Phase 4** | Backend 동기화 (Rails) | 🔲 |
| **Phase 5** | 테스트 추가 + 검증 | 🔲 |

---

## 5. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| UPS 요금표 변동 | 부정확한 견적 | config 파일 분리, admin 확인 가능 |
| DHL/UPS 패널 UI 중복 | 코드 중복 | 공통 AddOnPanel 컴포넌트 추출 가능 |
| 기존 surge 시스템과 충돌 | 이중 계산 | add-on은 별도 필드, surge와 독립 |
| Backend 미동기화 | 저장 시 불일치 | Phase 4에서 Rails 동기화 필수 |

---

## 6. Success Criteria

- [ ] DHL 선택 시 부가서비스 패널 표시 + 비용 반영 ✅
- [ ] UPS 선택 시 부가서비스 패널 표시 + 비용 반영
- [ ] 자동감지(OSP/OWT/AHS) 정확도 100%
- [ ] CostBreakdown에 부가서비스 상세 표시
- [ ] PDF에 부가서비스 항목 포함
- [ ] 모든 기존 테스트 통과 + 부가서비스 테스트 추가
- [ ] Frontend-Backend 계산 일치율 100%
