# exchange-rate-proxy Design Document

> **Summary**: Rails 백엔드 캐싱 프록시로 환율 API 전환 — 무료 플랜 한도 내 안정 운영
>
> **Project**: Smart Quote System
> **Author**: Claude Code
> **Date**: 2026-03-13
> **Status**: Draft
> **Planning Doc**: [exchange-rate-proxy.plan.md](../../01-plan/features/exchange-rate-proxy.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 외부 환율 API 호출을 서버 측으로 집중하여 무료 플랜(월 1,000건) 내 운영
2. 프론트엔드 변경 최소화 (ExchangeRate 타입 유지)
3. API 키를 서버 측으로 이동하여 보안 강화
4. 기존 FscFetcher 패턴과 동일한 구조로 일관성 유지

### 1.2 Design Principles

- **기존 패턴 재사용**: `FscFetcher` 서비스 + Controller 패턴 답습
- **Stale-While-Revalidate**: 외부 API 실패 시 이전 캐시값 반환
- **프론트엔드 최소 변경**: API 엔드포인트만 교체, 데이터 구조 동일

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Frontend   │────▶│  Rails API       │────▶│ OpenExchangeRates   │
│  (Browser)  │     │  /exchange_rates │     │ (External API)      │
│             │     │  + Rails.cache   │     │                     │
└─────────────┘     └──────────────────┘     └─────────────────────┘
     30분 폴링         1시간 캐시 TTL          월 ~720건 호출
```

### 2.2 Data Flow

```
[Frontend 요청]
  → GET /api/v1/exchange_rates
  → ExchangeRatesController#index
  → ExchangeRateFetcher.current_rates
    ├─ [캐시 히트] → 즉시 반환 (<10ms)
    └─ [캐시 미스] → OpenExchangeRates API 호출
                   → USD base → KRW base 변환
                   → Rails.cache 저장 (1시간 TTL)
                   → 응답 반환
  → JSON 응답 → 프론트엔드 ExchangeRate[] 매핑
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| ExchangeRatesController | ExchangeRateFetcher | 환율 데이터 조회 |
| ExchangeRateFetcher | Rails.cache | 1시간 메모리 캐시 |
| ExchangeRateFetcher | Net::HTTP | OpenExchangeRates API 호출 |
| Frontend exchangeRateApi | Rails API (VITE_API_URL) | 프록시 경유 환율 조회 |

---

## 3. Data Model

### 3.1 API Response Format

```typescript
// Rails → Frontend 응답 (기존 ExchangeRate 타입과 호환)
interface ExchangeRateResponse {
  rates: {
    currency: string;    // 'USD', 'EUR', etc.
    code: string;        // 'USA', 'EUR', etc.
    flag: string;        // '🇺🇸', etc.
    rate: number;        // KRW 환산 (예: 1428.50)
    previousClose: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'flat';
  }[];
  fetchedAt: string;     // ISO 8601
  cached: boolean;       // 캐시 응답 여부
}
```

### 3.2 Cache Structure (Rails.cache)

```ruby
# Key: "exchange_rates_cache"
# Value: JSON string
{
  "rates" => {
    "USD" => 1428.50,
    "EUR" => 1552.30,
    "JPY" => 9.45,
    "CNY" => 196.80,
    "GBP" => 1812.40,
    "SGD" => 1068.20
  },
  "fetched_at" => "2026-03-13T09:00:00+09:00",
  "source" => "openexchangerates"
}
# TTL: 1 hour (expires_in: 1.hour)
```

---

## 4. API Specification

### 4.1 Endpoint

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/exchange_rates` | 환율 조회 (KRW 베이스) | Not Required |

### 4.2 Detailed Specification

#### `GET /api/v1/exchange_rates`

**Request**: No parameters

**Response (200 OK):**
```json
{
  "rates": [
    {
      "currency": "USD",
      "code": "USA",
      "flag": "🇺🇸",
      "rate": 1428.50,
      "previousClose": 1425.00,
      "change": 3.50,
      "changePercent": 0.25,
      "trend": "up"
    },
    {
      "currency": "EUR",
      "code": "EUR",
      "flag": "🇪🇺",
      "rate": 1552.30,
      "previousClose": 1550.00,
      "change": 2.30,
      "changePercent": 0.15,
      "trend": "up"
    }
  ],
  "fetchedAt": "2026-03-13T09:00:00+09:00",
  "cached": true
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "error": {
    "code": "EXCHANGE_RATE_UNAVAILABLE",
    "message": "Exchange rate service temporarily unavailable"
  }
}
```

**Notes**:
- 인증 불필요 (공개 엔드포인트 — 대시보드 위젯에서 비로그인 상태에서도 사용)
- `previousClose`는 Rails가 이전 캐시값에서 계산
- API 실패 + 캐시 없음 → 503 반환 → 프론트엔드 fallback (DEFAULT_EXCHANGE_RATE)

---

## 5. Backend Implementation

### 5.1 ExchangeRateFetcher Service

```ruby
# smart-quote-api/app/services/exchange_rate_fetcher.rb
class ExchangeRateFetcher
  CACHE_KEY = "exchange_rates_cache"
  PREV_CACHE_KEY = "exchange_rates_prev"
  CACHE_TTL = 1.hour

  TARGET_CURRENCIES = [
    { currency: "USD", code: "USA", flag: "🇺🇸" },
    { currency: "EUR", code: "EUR", flag: "🇪🇺" },
    { currency: "JPY", code: "JPN", flag: "🇯🇵" },
    { currency: "CNY", code: "CHN", flag: "🇨🇳" },
    { currency: "GBP", code: "GBR", flag: "🇬🇧" },
    { currency: "SGD", code: "SGP", flag: "🇸🇬" }
  ].freeze

  class << self
    def current_rates
      cached = read_cache
      if cached
        build_response(cached, true)
      else
        fetch_and_cache
      end
    end

    private

    def fetch_and_cache
      app_id = ENV["OPEN_EXCHANGE_APP_ID"]
      raise "OPEN_EXCHANGE_APP_ID not set" unless app_id

      uri = URI("https://openexchangerates.org/api/latest.json?app_id=#{app_id}")
      response = Net::HTTP.get_response(uri)
      raise "API error: #{response.code}" unless response.is_a?(Net::HTTPSuccess)

      data = JSON.parse(response.body)
      raw_rates = data["rates"]
      krw_rate = raw_rates["KRW"]
      raise "Missing KRW rate" unless krw_rate

      # Convert USD base → KRW base
      inverted = {}
      TARGET_CURRENCIES.each do |tc|
        currency_rate = raw_rates[tc[:currency]]
        inverted[tc[:currency]] = (krw_rate.to_f / currency_rate.to_f).round(2) if currency_rate&.positive?
      end

      # Save previous rates before overwriting
      prev = read_cache
      write_prev_cache(prev["rates"]) if prev

      # Write new cache
      cache_data = {
        "rates" => inverted,
        "fetched_at" => Time.current.iso8601,
        "source" => "openexchangerates"
      }
      Rails.cache.write(CACHE_KEY, cache_data.to_json, expires_in: CACHE_TTL)

      build_response(cache_data, false)
    rescue StandardError => e
      Rails.logger.warn("ExchangeRateFetcher failed: #{e.message}")
      # Fallback: return stale cache if available
      stale = read_cache(force: true)
      return build_response(stale, true) if stale
      nil
    end

    def build_response(cache_data, cached)
      prev_rates = read_prev_cache || {}
      rates = TARGET_CURRENCIES.map do |tc|
        rate = cache_data["rates"][tc[:currency]] || 0
        prev = prev_rates[tc[:currency]] || rate
        change = (rate - prev).round(2)
        change_pct = prev.positive? ? ((change / prev) * 100).round(2) : 0
        trend = change.positive? ? "up" : change.negative? ? "down" : "flat"

        {
          currency: tc[:currency],
          code: tc[:code],
          flag: tc[:flag],
          rate: rate,
          previousClose: prev,
          change: change,
          changePercent: change_pct,
          trend: trend
        }
      end

      { rates: rates, fetchedAt: cache_data["fetched_at"], cached: cached }
    end

    def read_cache(force: false)
      raw = Rails.cache.read(CACHE_KEY)
      return nil unless raw
      JSON.parse(raw)
    rescue JSON::ParserError
      nil
    end

    def write_prev_cache(rates)
      Rails.cache.write(PREV_CACHE_KEY, rates.to_json, expires_in: 24.hours)
    end

    def read_prev_cache
      raw = Rails.cache.read(PREV_CACHE_KEY)
      return nil unless raw
      JSON.parse(raw)
    rescue JSON::ParserError
      nil
    end
  end
end
```

### 5.2 Controller

```ruby
# smart-quote-api/app/controllers/api/v1/exchange_rates_controller.rb
module Api
  module V1
    class ExchangeRatesController < ApplicationController
      # No authentication required (public endpoint)

      # GET /api/v1/exchange_rates
      def index
        result = ExchangeRateFetcher.current_rates

        if result
          render json: result
        else
          render json: {
            error: { code: "EXCHANGE_RATE_UNAVAILABLE", message: "Exchange rate service temporarily unavailable" }
          }, status: :service_unavailable
        end
      end
    end
  end
end
```

### 5.3 Route Addition

```ruby
# config/routes.rb (api/v1 namespace 내부에 추가)
get "exchange_rates", to: "exchange_rates#index"
```

---

## 6. Frontend Changes

### 6.1 exchangeRateApi.ts (수정)

```typescript
// Before: 직접 OpenExchangeRates API 호출
// After: Rails 프록시 경유

import { fetchWithRetry } from '@/lib/fetchWithRetry';
import type { ExchangeRate } from '@/types/dashboard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  return fetchWithRetry(async () => {
    const res = await fetch(`${API_URL}/api/v1/exchange_rates`);
    if (!res.ok) throw new Error(`Exchange rate proxy error: ${res.status}`);

    const data = await res.json();
    return data.rates as ExchangeRate[];
  });
}
```

**변경 사항**:
- OpenExchangeRates 직접 호출 제거
- `VITE_OPEN_EXCHANGE_APP_ID` 참조 제거
- localStorage 캐싱 로직 제거 (서버에서 처리)
- `TARGET_CURRENCIES` 상수 제거 (서버에서 관리)

### 6.2 useExchangeRates.ts (수정)

```typescript
// 폴링 간격만 변경
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes (was 5 minutes)
const STALE_THRESHOLD = 35 * 60 * 1000;  // 35 minutes (was 6 minutes)
```

### 6.3 환경 변수 정리

- `.env` / `.env.production`: `VITE_OPEN_EXCHANGE_APP_ID` 행 제거
- `.env.example`: `VITE_OPEN_EXCHANGE_APP_ID` 행 제거
- `src/vite-env.d.ts`: 타입 선언 제거 (해당 시)
- Vercel: `VITE_OPEN_EXCHANGE_APP_ID` 환경변수 삭제 가능 (선택)
- Render: `OPEN_EXCHANGE_APP_ID` 환경변수 추가

---

## 7. Error Handling

### 7.1 에러 시나리오

| Scenario | Backend | Frontend |
|----------|---------|----------|
| 캐시 히트 | 즉시 반환 | 정상 표시 |
| 캐시 미스 + API 성공 | fetch → 캐시 저장 → 반환 | 정상 표시 |
| 캐시 미스 + API 실패 | stale 캐시 반환 (있으면) | 정상 표시 |
| 캐시 없음 + API 실패 | 503 반환 | DEFAULT_EXCHANGE_RATE(1400) 사용 |
| ENV 미설정 | 로그 경고 + 503 | DEFAULT_EXCHANGE_RATE 사용 |

---

## 8. Security Considerations

- [x] API 키 서버 측 ENV 보관 (프론트 노출 제거)
- [x] 환율 엔드포인트 인증 불필요 (공개 데이터)
- [x] Rate limiting 불필요 (서버 캐시로 외부 API 보호)
- [x] HTTPS 강제 (Render 기본)

---

## 9. Test Plan

### 9.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | ExchangeRateFetcher service | RSpec |
| Request Test | GET /api/v1/exchange_rates | RSpec (request spec) |
| Frontend Test | exchangeRateApi.ts | Vitest (기존 테스트 수정) |

### 9.2 Test Cases

- [x] 캐시 히트 시 API 미호출 확인
- [x] 캐시 미스 시 외부 API 호출 + 캐시 저장
- [x] 외부 API 실패 시 stale 캐시 반환
- [x] ENV 미설정 시 에러 로그 + nil 반환
- [x] 응답 포맷이 ExchangeRate 타입과 일치
- [x] 프론트엔드 테스트 통과 (mock API 경로 변경)

---

## 10. Implementation Order

1. [x] `exchange_rate_fetcher.rb` 서비스 생성
2. [x] `exchange_rates_controller.rb` 컨트롤러 생성
3. [x] `routes.rb` 라우트 추가
4. [x] RSpec 테스트 작성 (service + request)
5. [x] 프론트엔드 `exchangeRateApi.ts` 수정
6. [x] 프론트엔드 `useExchangeRates.ts` 폴링 간격 변경
7. [x] 환경 변수 정리 (.env, .env.example)
8. [x] Render 환경변수 설정 (`OPEN_EXCHANGE_APP_ID`)
9. [x] 기존 테스트 통과 확인
10. [x] 배포 및 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-13 | Initial draft | Claude Code |
