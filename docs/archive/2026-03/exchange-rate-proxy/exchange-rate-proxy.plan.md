# exchange-rate-proxy Planning Document

> **Summary**: 환율 API 호출을 백엔드 캐싱 프록시로 전환하여 무료 플랜 한도 내 안정적 운영
>
> **Project**: Smart Quote System
> **Author**: Claude Code
> **Date**: 2026-03-13
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

프론트엔드에서 직접 OpenExchangeRates API를 호출하는 현재 구조를 Rails 백엔드 캐싱 프록시로 전환한다. 이를 통해 사용자 수와 무관하게 API 호출 건수를 일정하게 유지하고, 무료 플랜(월 1,000건) 내에서 안정적으로 운영한다.

### 1.2 Background

- **현재 문제**: 프론트엔드에서 5분 간격 폴링 → 사용자 1명 기준 월 2,880건 (무료 한도 1,000건 초과)
- **증상**: 환율 실시간 적용 실패 (API 한도 소진)
- **영향**: 견적서의 USD 환산 금액이 기본값(1,400원)으로 고정됨

### 1.3 Related Documents

- API: [OpenExchangeRates](https://openexchangerates.org/)
- 기존 코드: `src/api/exchangeRateApi.ts`, `src/features/dashboard/hooks/useExchangeRates.ts`

---

## 2. Scope

### 2.1 In Scope

- [x] Rails API에 환율 캐싱 프록시 엔드포인트 추가 (`GET /api/v1/exchange_rates`)
- [x] Rails에서 OpenExchangeRates API 호출 + 1시간 메모리 캐시
- [x] 프론트엔드 `exchangeRateApi.ts`를 Rails 프록시로 전환
- [x] 프론트엔드 폴링 간격 조정 (5분 → 30분)
- [x] 기존 대시보드 위젯 호환성 유지

### 2.2 Out of Scope

- 유료 플랜 업그레이드
- 다른 환율 API로 전환 (open.er-api.com 등)
- 환율 DB 저장 (히스토리 추적)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Rails API가 OpenExchangeRates에서 환율 fetch + 1시간 캐시 | High | Pending |
| FR-02 | `GET /api/v1/exchange_rates` 엔드포인트 제공 (USD, EUR, JPY, CNY, GBP, SGD) | High | Pending |
| FR-03 | 프론트엔드가 Rails 프록시에서 환율 데이터 수신 | High | Pending |
| FR-04 | API 키를 서버 측 환경 변수로 이동 (OPEN_EXCHANGE_APP_ID) | High | Pending |
| FR-05 | 대시보드 ExchangeRateWidget 동일 UX 유지 | Medium | Pending |
| FR-06 | FinancialSection 실시간 환율 버튼 정상 동작 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 프록시 응답 < 100ms (캐시 히트 시) | API 응답 시간 |
| Reliability | API 실패 시 이전 캐시값 반환 | 에러 시나리오 테스트 |
| Cost | 월 API 호출 < 1,000건 (무료 플랜) | 서버 로그 |
| Security | API 키 서버 측 보관, 프론트 노출 제거 | 코드 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] Rails 프록시 엔드포인트 구현 및 테스트
- [x] 프론트엔드 API 호출 경로 전환
- [x] 대시보드 위젯 + 견적 계산기 환율 정상 동작
- [x] API 키 서버 측으로 이동 완료
- [x] 기존 테스트 통과

### 4.2 Quality Criteria

- [x] RSpec 테스트 추가 (프록시 엔드포인트)
- [x] 프론트엔드 환율 관련 테스트 통과
- [x] 빌드 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Render 서버 다운 시 환율 불가 | Medium | Low | 프론트엔드 fallback (DEFAULT_EXCHANGE_RATE=1400) 유지 |
| 캐시 만료 + API 실패 동시 발생 | Medium | Low | 이전 캐시값 반환 (stale-while-revalidate) |
| API 키 Render 환경변수 미설정 | High | Low | 배포 체크리스트에 포함 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 캐시 방식 | Redis / Rails.cache (메모리) | Rails.cache | Render 무료 티어에 Redis 없음, 메모리 캐시로 충분 |
| 캐시 TTL | 30분 / 1시간 / 2시간 | 1시간 | 월 720건 → 무료 한도 여유 |
| 응답 포맷 | 기존 프론트 구조 유지 | KRW 베이스 변환 후 전달 | 프론트엔드 변경 최소화 |
| API 키 위치 | 프론트(VITE_) / 백엔드(ENV) | 백엔드 ENV | 보안 향상 |

### 6.3 Data Flow (변경 후)

```
[Rails Server]
  ├─ 1시간마다 OpenExchangeRates API 호출 (서버 1건)
  ├─ Rails.cache에 저장
  └─ GET /api/v1/exchange_rates → 캐시된 응답 반환

[Frontend]
  ├─ 30분 간격으로 Rails API 호출 (무제한)
  ├─ localStorage에 이전값 저장 (변동률 계산용)
  └─ ExchangeRateWidget + FinancialSection에 반영
```

---

## 7. Implementation Files

### Backend (신규/수정)
- `smart-quote-api/app/controllers/api/v1/exchange_rates_controller.rb` (신규)
- `smart-quote-api/app/services/exchange_rate_fetcher.rb` (신규)
- `smart-quote-api/config/routes.rb` (수정 - 라우트 추가)
- `smart-quote-api/spec/requests/api/v1/exchange_rates_spec.rb` (신규)

### Frontend (수정)
- `src/api/exchangeRateApi.ts` (수정 - Rails 프록시로 전환)
- `src/features/dashboard/hooks/useExchangeRates.ts` (수정 - 폴링 간격 30분)
- `.env`, `.env.production` (수정 - VITE_OPEN_EXCHANGE_APP_ID 제거)

### Environment
- Render: `OPEN_EXCHANGE_APP_ID` 환경변수 추가

---

## 8. Next Steps

1. [ ] Write design document (`exchange-rate-proxy.design.md`)
2. [ ] Implementation
3. [ ] Testing & deployment

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-13 | Initial draft | Claude Code |
