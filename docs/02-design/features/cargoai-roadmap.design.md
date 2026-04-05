# CargoAI-Inspired Roadmap — Design Document

> **Summary**: 로드맵 확장 Phase의 기술 설계 — CO2 추적, AI 어시스턴트 강화, 멀티캐리어 비교 UX, API Suite 확장
>
> **Project**: Smart Quote System (j-ways-smart-quote-system)
> **Version**: 0.0.0
> **Author**: jaehong
> **Date**: 2026-04-05
> **Status**: Draft
> **Planning Doc**: [cargoai-inspired-roadmap.plan.md](../../01-plan/features/cargoai-inspired-roadmap.plan.md)

---

## 1. Overview

### 1.1 Design Goals

본 설계는 CargoAI 벤치마킹으로 도출된 **5개 신규/확장 Phase**의 기술 아키텍처를 정의한다. 기존 Phase 1~5 로드맵과 정합성을 유지하면서 **중소 물류사 특송 플랫폼** 포지셔닝을 강화한다.

**Scope (본 설계가 다루는 범위)**
- Phase 1.5: 멀티캐리어 비교 UX 강화
- Phase 3.5: CO2 배출량 추적 대시보드 🆕
- Phase 4.5: AI 어시스턴트 강화 🆕
- Phase 5+: 디지털 결제/정산 🆕
- Phase 6: API Suite 3-tier 확장 🆕

**Out of Scope**
- Phase 1 캐리어 실시간 API 연동 (별도 설계 필요)
- Phase 2 예약/운송장 발급 (별도 설계 필요)
- Phase 3 실시간 추적 (별도 설계 필요)

### 1.2 Design Principles

- **점진적 통합**: 기존 `calculationService.ts` / `QuoteCalculator` 로직 유지하며 부가 기능 레이어 추가
- **Frontend 우선 + Backend 점진 확장**: UI/UX 먼저 검증 후 백엔드 확장 (MVP 전략)
- **공통 인프라 재사용**: Sentry, Slack, Claude API, Drizzle 등 기존 스택 활용
- **캐리어 중립성**: 특정 캐리어에 종속되지 않는 데이터 모델 (UPS/DHL/FedEx/SF Express 확장 대비)
- **한국어 우선 + 다국어 지원**: i18n 4개 언어(en/ko/cn/ja) 모든 신규 기능 적용

---

## 2. Architecture

### 2.1 전체 컴포넌트 다이어그램

```
┌────────────────────────────────────────────────────────────────┐
│                        Frontend (React 19)                      │
│                                                                  │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │ Multi-Carrier │  │ CO2 Dashboard   │  │ AI Assistant     │ │
│  │ Comparison    │  │ Widget          │  │ (Agentic Panel)  │ │
│  │ (1.5)         │  │ (3.5)           │  │ (4.5)            │ │
│  └───────┬───────┘  └────────┬────────┘  └────────┬─────────┘ │
│          │                   │                    │             │
│  ┌───────▼───────────────────▼────────────────────▼─────────┐  │
│  │          Enhanced calculationService.ts                   │  │
│  │  (기존 로직 + CO2 계산기 + AI 컨텍스트 추출)              │  │
│  └───────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────────┘
                               │
                 ┌─────────────▼─────────────┐
                 │  Rails 8 API + Claude     │
                 │  /api/v1/co2/*            │
                 │  /api/v1/ai-agent/*       │
                 │  /api/v1/wallet/*         │
                 │  /api/v1/public/*  (API Suite)│
                 └─────────────┬─────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    PostgreSQL       │
                    │  + co2_rates        │
                    │  + ai_recommendations│
                    │  + customer_wallets │
                    │  + api_keys         │
                    └─────────────────────┘
```

### 2.2 Phase별 컴포넌트 배치

| Phase | 주요 위치 | 기존 인프라 재사용 |
|-------|----------|------------------|
| 1.5 Multi-Carrier | `features/quote/components/CarrierComparisonCard.tsx` | calculationService |
| 3.5 CO2 Dashboard | `features/dashboard/components/Co2Dashboard.tsx` | Drizzle, Sentry |
| 4.5 AI Assistant | `features/ai-agent/` (신규 모듈) | chat_controller.rb, Claude API |
| 5+ Wallet | `features/wallet/` (신규 모듈) | AuthContext, audit_log |
| 6 API Suite | `app/controllers/api/public/` (신규) | JWT, rate limiting |

---

## 3. Phase 1.5 — 멀티캐리어 비교 UX 강화

### 3.1 현재 상태 (As-Is)

```typescript
// src/features/quote/components/CarrierComparisonCard.tsx (현재)
// UPS/DHL 결과를 단순 나열, 사용자가 직접 판단
```

### 3.2 목표 상태 (To-Be)

**정렬 기준 추가** (4가지):
1. 가격 (revenueKrw) — 기본
2. 소요시간 (transitDaysMin) — 신규 필드
3. CO2 배출량 (co2Kg) — Phase 3.5 연동
4. 서비스 품질 점수 (qualityScore) — 신규

**추천 배지** (3종):
- 💰 `최저가` — 가격 1위
- ⚡ `최단` — 소요시간 1위
- 🌱 `친환경` — CO2 배출 최저

### 3.3 데이터 모델 변경

```typescript
// src/types.ts (QuoteResult 확장)
export interface QuoteResult {
  // 기존 필드...
  carriers: CarrierResult[];
}

export interface CarrierResult {
  carrier: 'UPS' | 'DHL' | 'FEDEX';
  revenueKrw: number;
  costKrw: number;
  marginPct: number;
  // 신규 추가
  transitDaysMin: number;    // 최소 소요일
  transitDaysMax: number;    // 최대 소요일
  co2Kg: number | null;      // CO2 배출량 (kg)
  qualityScore: number;      // 1-5 (추후 past booking 데이터로 산출)
  badges: CarrierBadge[];    // ['cheapest', 'fastest', 'greenest']
}

export type CarrierBadge = 'cheapest' | 'fastest' | 'greenest' | null;
```

### 3.4 UI 컴포넌트 변경

```
CarrierComparisonCard (기존)
  ├── [ADD] SortSelector (가격/시간/CO2/품질)
  ├── CarrierCard (각 캐리어)
  │     ├── [ADD] BadgeRow (최저가/최단/친환경)
  │     ├── [ADD] TransitDaysRow
  │     └── [ADD] Co2Row (Phase 3.5 후)
  └── [ADD] ComparisonMatrix (표 형태 비교)
```

### 3.5 정렬 로직

```typescript
// src/features/quote/services/carrierRanker.ts (신규)
export function rankCarriers(
  carriers: CarrierResult[],
  sortBy: 'price' | 'transit' | 'co2' | 'quality'
): CarrierResult[] {
  const withBadges = assignBadges(carriers);
  return withBadges.sort((a, b) => {
    switch (sortBy) {
      case 'price': return a.revenueKrw - b.revenueKrw;
      case 'transit': return a.transitDaysMin - b.transitDaysMin;
      case 'co2': return (a.co2Kg ?? Infinity) - (b.co2Kg ?? Infinity);
      case 'quality': return b.qualityScore - a.qualityScore;
    }
  });
}
```

---

## 4. Phase 3.5 — CO2 배출량 추적 대시보드

### 4.1 CO2 계산 공식 (IATA RP1678)

```
CO2(kg) = DistanceKm × ChargeableWeightKg × EmissionFactor × LoadFactor

EmissionFactor (캐리어/항공기별):
  - UPS International Air: 0.602 kg CO2 / tonne-km
  - DHL Express Worldwide: 0.520 kg CO2 / tonne-km
  - FedEx International Priority: 0.645 kg CO2 / tonne-km
  (실제 값은 IATA RP1678 표준 참조)
```

### 4.2 데이터 모델

```sql
-- smart-quote-api/db/migrate/XXXX_create_co2_rates.rb
CREATE TABLE co2_emission_rates (
  id BIGSERIAL PRIMARY KEY,
  carrier VARCHAR(20) NOT NULL,           -- 'UPS', 'DHL', 'FEDEX'
  service_type VARCHAR(50) NOT NULL,      -- 'Express', 'Worldwide'
  emission_factor DECIMAL(6,4) NOT NULL,  -- kg CO2 / tonne-km
  effective_from DATE NOT NULL,
  source VARCHAR(100),                    -- 'IATA RP1678 2026'
  created_at TIMESTAMP NOT NULL
);

-- Origin-Destination distance cache
CREATE TABLE od_distances (
  id BIGSERIAL PRIMARY KEY,
  origin_country VARCHAR(2) NOT NULL,     -- ISO 3166-1 alpha-2
  destination_country VARCHAR(2) NOT NULL,
  distance_km INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE(origin_country, destination_country)
);
```

### 4.3 CO2 Dashboard Widget

```
features/dashboard/components/Co2Dashboard.tsx (신규)
├── Co2SummaryCard           # 이번 달 누적 CO2 (kg) + 전월 대비 %
├── Co2ByCarrierChart        # 캐리어별 배출량 막대그래프
├── Co2TrendChart            # 월별 추이 (6개월)
└── TopEmittingRoutes        # CO2 Top 10 경로
```

### 4.4 API 엔드포인트

```
GET  /api/v1/co2/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
     → { totalKg, byCarrier: [...], byMonth: [...] }

GET  /api/v1/co2/calculate?carrier=UPS&weight=5&origin=KR&dest=US
     → { co2Kg: 12.34, formula: "..." }

GET  /api/v1/co2/rates  (Admin)
POST /api/v1/co2/rates  (Admin)
```

### 4.5 기존 견적 통합

- `POST /api/v1/quotes` 저장 시 `co2_kg` 컬럼에 자동 저장
- PDF 견적서에 `CO2 배출량: XX kg (IATA RP1678 기준)` 섹션 추가
- 견적서 하단에 "친환경 옵션 안내" 문구 추가

---

## 5. Phase 4.5 — AI 어시스턴트 강화 (AgenticAI)

### 5.1 현재 상태 → 확장 방향

| 항목 | 현재 (Q&A봇) | 확장 후 (에이전트) |
|------|-------------|-------------------|
| 역할 | 사용자 질문 답변 | 워크플로우 자동 실행 |
| 컨텍스트 | 단일 대화 | 사용자 과거 견적 + 고객 데이터 |
| Tool Use | 없음 | `search_quotes`, `create_quote_draft`, `recommend_carrier` |
| Proactive | 수동 호출 | 조건 감지 → 자동 알림 |

### 5.2 신규 기능 (4가지)

#### 5.2.1 자동 견적 추천
```
Input: 고객사명 + 목적지
Process:
  1. 해당 고객의 과거 견적 조회 (최근 6개월)
  2. 가장 자주 선택한 캐리어/서비스 추출
  3. 최근 운임 변동 반영하여 최적 캐리어 제안
Output: "이 고객은 최근 DHL Express를 80% 선택. 현재 UPS가 18% 저렴하지만 DHL 추천 유지."
```

#### 5.2.2 반복 견적 자동화
```
Setting: cronjob 기반 (매주 월요일 09시)
Process:
  1. 정기 고객 목록 조회 (quote_frequency >= 4/month)
  2. 자동 견적 생성 (지난 견적 파라미터 재사용)
  3. Slack 알림: "이번 주 예상 발송 3건 견적 준비 완료"
```

#### 5.2.3 운임 이상 탐지
```
Process:
  1. 매일 FSC/환율 업데이트 시 주요 경로 견적 재계산
  2. 전주 대비 ±15% 변동 감지
  3. Admin Slack 알림 + 대시보드 배지 표시
```

#### 5.2.4 자연어 검색
```
User: "지난달 일본 발송 중 DHL이 저렴했던 견적 보여줘"
Agent:
  1. Claude로 NL → SQL 조건 변환
     { dest: 'JP', carrier: 'DHL', date: '2026-03', lowest: true }
  2. quotes 테이블 조회
  3. 결과 카드 5건 반환
```

### 5.3 Backend 아키텍처

```ruby
# smart-quote-api/app/services/ai_agent/
├── agent_service.rb              # 메인 오케스트레이터
├── tools/
│   ├── search_quotes_tool.rb
│   ├── recommend_carrier_tool.rb
│   ├── create_quote_draft_tool.rb
│   └── detect_anomaly_tool.rb
├── context_builder.rb            # 사용자 히스토리 추출
└── recommendations_persister.rb   # ai_recommendations 테이블 저장
```

### 5.4 데이터 모델

```sql
CREATE TABLE ai_recommendations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  customer_id BIGINT REFERENCES customers(id),
  recommendation_type VARCHAR(50),  -- 'carrier', 'schedule', 'anomaly'
  payload JSONB NOT NULL,           -- {carrier: 'DHL', reason: '...', confidence: 0.82}
  status VARCHAR(20) DEFAULT 'pending',  -- pending/accepted/rejected/expired
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP
);

CREATE INDEX idx_ai_rec_user_status ON ai_recommendations(user_id, status);
```

### 5.5 API 엔드포인트

```
POST /api/v1/ai-agent/recommend       # 실시간 추천 요청
GET  /api/v1/ai-agent/recommendations # 저장된 추천 조회
POST /api/v1/ai-agent/nl-search       # 자연어 검색
POST /api/v1/ai-agent/feedback        # 추천 수락/거부
```

### 5.6 보안 & 비용

- Claude API 호출량 제한: **user당 50회/day** (rate limiting)
- 민감 데이터 마스킹: 고객사명/이메일 요약 시 익명화 옵션
- 프롬프트 인젝션 방어: 시스템 프롬프트 + 사용자 입력 분리

---

## 6. Phase 5+ — 디지털 결제/정산

### 6.1 Wallet 시스템

```sql
CREATE TABLE customer_wallets (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  balance_krw INTEGER NOT NULL DEFAULT 0,    -- 선불 잔액
  credit_limit_krw INTEGER NOT NULL DEFAULT 0, -- 크레딧 한도
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  wallet_id BIGINT NOT NULL,
  quote_id BIGINT REFERENCES quotes(id),
  amount_krw INTEGER NOT NULL,              -- 양수=입금, 음수=출금
  transaction_type VARCHAR(20),             -- 'topup', 'booking', 'refund'
  balance_after_krw INTEGER NOT NULL,
  audit_log_id BIGINT REFERENCES audit_logs(id),
  created_at TIMESTAMP NOT NULL
);
```

### 6.2 정산서 자동 생성

- 매월 1일 00:00 cronjob: 전월 wallet_transactions 집계 → PDF 생성
- 고객사별 이메일 발송 (SES/SendGrid)
- Admin 정산 현황 대시보드 (CustomerManagement 확장)

---

## 7. Phase 6 — API Suite 3-tier 확장

### 7.1 3-Tier 구조

| Tier | 이름 | 엔드포인트 | 과금 |
|------|------|-----------|------|
| 1 | Schedule API | `GET /api/public/v1/schedules` | 구독 (무제한) |
| 2 | Rate & Book API | `POST /api/public/v1/quotes`, `POST /api/public/v1/bookings` | 구독 + 건당 |
| 3 | Tracking API | `GET /api/public/v1/tracking/:awb` + Webhook | 건당 |

### 7.2 인증 (API Key + OAuth 2.0)

```sql
CREATE TABLE api_keys (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  key_hash VARCHAR(128) NOT NULL UNIQUE,    -- SHA-256
  tier VARCHAR(20),                          -- 'free', 'pro', 'ultra'
  rate_limit_per_min INTEGER DEFAULT 60,
  enabled BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);
```

### 7.3 Webhook 지원

```
POST {customer_webhook_url}
Headers:
  X-SmartQuote-Signature: sha256=...  (HMAC)
  X-SmartQuote-Event: quote.booked
Body:
  { event: 'quote.booked', data: {...}, timestamp: ... }
```

### 7.4 OpenAPI 문서

- `/api/public/docs` → Swagger UI
- `/api/public/openapi.json` → 스키마
- 샌드박스: `sandbox.smartquote.com` (별도 DB)

---

## 8. 구현 순서 (Implementation Order)

### 8.1 우선순위 및 의존성

```
[1단계] P1 기능 (Q2 2026)
  └── Phase 1.5 Multi-Carrier UX  ← Phase 1 API 완료 후
      └── Phase 3.5 CO2 Dashboard ← Phase 1.5 완료 후 통합

[2단계] P1 기능 (Q3~Q4 2026)
  └── Phase 4.5 AI Assistant
      ├── Step 1: 자연어 검색 (기존 chat_controller 확장)
      ├── Step 2: 자동 견적 추천
      ├── Step 3: 반복 견적 자동화
      └── Step 4: 이상 탐지

[3단계] P2 기능 (2027)
  ├── Phase 6 API Suite (Tier 1 → 2 → 3 순)
  └── Phase 5+ Wallet/정산 (Phase 2 예약 완료 후)
```

### 8.2 마일스톤 체크리스트

- [ ] **M1** (Q2 2026): Phase 1.5 완료 — 정렬/배지 UX 배포
- [ ] **M2** (Q3 2026): Phase 3.5 완료 — CO2 대시보드 배포
- [ ] **M3** (Q3 2026): Phase 4.5 Step 1~2 — NL 검색 + 캐리어 추천
- [ ] **M4** (Q4 2026): Phase 4.5 Step 3~4 — 자동화 + 이상 탐지
- [ ] **M5** (Q1 2027): Phase 6 API Suite Tier 1 공개 (Schedule API)
- [ ] **M6** (Q2 2027): Phase 5+ Wallet MVP

---

## 9. Non-Functional Requirements

### 9.1 Performance
- CO2 계산: p95 < 50ms (거리 캐시 활용)
- AI 추천 생성: p95 < 3s (Claude API)
- API Suite: p95 < 200ms (Rate & Book 제외)

### 9.2 Security
- API Key: SHA-256 hash 저장, rate limiting per key
- Wallet 거래: 모든 operation audit_log 필수
- AI Agent: 시스템 프롬프트 격리 (injection 방지)

### 9.3 Observability
- Sentry: AI 응답 실패, Wallet 불일치 오류
- 커스텀 메트릭: AI 호출량/비용, CO2 계산 적중률, API Suite 사용량

### 9.4 i18n
- 모든 신규 UI 문자열 4개 언어 대응 (en/ko/cn/ja)
- AI 응답 언어 자동 감지 (기존 chat_controller 로직 재사용)

---

## 10. Risks & Mitigations

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| IATA RP1678 emission factor 변동 | CO2 계산 부정확 | `co2_emission_rates.effective_from` 기반 버전 관리 |
| Claude API 비용 폭증 | 운영비 증가 | User별 일일 호출 제한 + 캐싱 + cost monitoring |
| API Key 유출 | 보안 사고 | Hash 저장, rate limiting, IP whitelist 옵션 |
| Wallet 잔액 불일치 | 회계 사고 | Double-entry bookkeeping + 매일 reconciliation cronjob |
| 배지 로직 조작 우려 | 사용자 불신 | 배지 기준 투명 공개 ("도움말" 링크) |

---

## 11. Open Questions

- [ ] CO2 emission factor: IATA RP1678 최신본 구매 필요? (또는 IATA CO2 Calculator API 사용?)
- [ ] AI Agent: 프론트 스트리밍(SSE) vs 일괄 응답?
- [ ] API Suite: 별도 서브도메인(`api.smartquote.com`) vs 경로 분기?
- [ ] Wallet: Stripe/PortOne 연동 여부 및 수수료 정책?

---

## 12. References

- [Plan Doc](../../01-plan/features/cargoai-inspired-roadmap.plan.md)
- [Existing Roadmap Memory](~/.claude/projects/-Users-jaehong/memory/project_smart_quote_roadmap.md)
- [CargoAI — CargoMART](https://www.cargoai.co/products/cargomart/)
- [CargoAI — CargoCONNECT API](https://www.cargoai.co/products/cargoconnect/)
- [CargoAI — Cargo2ZERO CO2](https://www.cargoai.co/press/cargo2zero-helps-airlines-freight-forwarders-reports-co2-emissions/)
- IATA RP1678 (CO2 Emissions Standard for Air Cargo)
