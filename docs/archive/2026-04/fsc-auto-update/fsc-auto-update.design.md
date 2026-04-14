# Design: fsc-auto-update

**작성일**: 2026-04-14  
**Phase**: Design  
**참조**: [Plan 문서](../../01-plan/features/fsc-auto-update.plan.md)

---

## 1. 설계 목표

Admin UI에서 FSC % 입력 → DB 저장 → 즉시 견적 계산에 반영.  
배포 없이 매주 월요일 업데이트 가능.

---

## 2. 변경 파일 목록

| 파일 | 변경 여부 | 작업 내용 |
|------|----------|---------|
| `smart-quote-api/app/services/quote_calculator.rb` | **변경** | line 83, 109 — 상수 → `FscFetcher.current_rates` |
| `src/features/dashboard/hooks/useFscRates.ts` | **변경** | no-op → 실제 API 호출 |
| `src/features/admin/components/FscRateWidget.tsx` | **변경** | `useMemo` 하드코딩 → `useFscRates()` hook |
| `smart-quote-api/app/services/fsc_fetcher.rb` | 변경 없음 | 이미 완성 (DB read + 상수 fallback) |
| `smart-quote-api/app/controllers/api/v1/fsc_controller.rb` | 변경 없음 | 이미 완성 |
| `smart-quote-api/app/models/fsc_rate.rb` | 변경 없음 | 이미 완성 |
| `src/api/fscApi.ts` | 변경 없음 | 이미 완성 |
| `src/features/quote/services/calculationService.ts` | 변경 없음 | `input.fscPercent`가 이미 주입되는 구조 |

---

## 3. API 계약

### GET /api/v1/fsc/rates

**Response:**
```json
{
  "rates": {
    "UPS": { "international": 48.5, "domestic": 48.5 },
    "DHL": { "international": 46.0, "domestic": 46.0 }
  },
  "updatedAt": "2026-04-14T00:00:00.000Z"
}
```

### POST /api/v1/fsc/update

**Request:**
```json
{
  "carrier": "UPS",
  "international": 50.5,
  "domestic": 50.5
}
```

**Response:** `{ "success": true, "updatedAt": "..." }`

---

## 4. 상세 구현 설계

### 4.1 백엔드: `quote_calculator.rb`

**현재 코드 (변경 전):**

```ruby
# line 83 — UPS Surge Fee용 FSC
fsc_for_surge = @input[:fscPercent].nil? ? DEFAULT_FSC_PERCENT : @input[:fscPercent].to_f

# line 109 — 메인 FSC 계산용
default_fsc = @carrier == 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT
fsc_percent = @input[:fscPercent].nil? ? default_fsc : @input[:fscPercent].to_f
```

**변경 후 코드:**

```ruby
# line 83 — UPS Surge Fee용 FSC (input 없을 때 DB 우선)
if @input[:fscPercent].nil?
  _fsc_rates = FscFetcher.current_rates
  fsc_for_surge = _fsc_rates.dig('UPS', 'international') || DEFAULT_FSC_PERCENT
else
  fsc_for_surge = @input[:fscPercent].to_f
end

# line 109 — 메인 FSC 계산용 (입력값 없을 때 DB 우선)
if @input[:fscPercent].nil?
  fsc_rates = FscFetcher.current_rates
  carrier_key = @carrier  # 'UPS' or 'DHL'
  default_fsc = fsc_rates.dig(carrier_key, 'international') ||
                (@carrier == 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT)
  fsc_percent = default_fsc
else
  fsc_percent = @input[:fscPercent].to_f
end
```

**설계 근거:**
- `FscFetcher.current_rates` 내부에서 이미 `rescue → DEFAULT_RATES` fallback 처리
- `input[:fscPercent]`가 있는 경우(Admin 수동 override) 그대로 우선 적용
- `FscFetcher.current_rates` 호출을 2번 피하기 위해 line 83 부근에서 한 번만 호출 후 인스턴스 변수에 캐싱하는 방식도 가능하나, 코드 가독성 우선으로 각각 호출

**최적화 대안 (단일 호출 버전):**

```ruby
# calculate_overseas_costs 메서드 시작 부분에 한 번만 호출
def calculate_overseas_costs
  @db_fsc_rates = FscFetcher.current_rates  # 캐싱
  # ...

  # line 83
  fsc_for_surge = @input[:fscPercent].nil? ?
    (@db_fsc_rates.dig('UPS', 'international') || DEFAULT_FSC_PERCENT) :
    @input[:fscPercent].to_f

  # ...
end

def calculate_totals
  # line 109
  if @input[:fscPercent].nil?
    default_fsc = @db_fsc_rates.dig(@carrier, 'international') ||
                  (@carrier == 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT)
    fsc_percent = default_fsc
  else
    fsc_percent = @input[:fscPercent].to_f
  end
end
```

→ **단일 호출 버전으로 구현** (DB 호출 최소화)

---

### 4.2 프론트엔드: `useFscRates.ts`

**현재 코드 (변경 전):**

```typescript
export function useFscRates() {
  const data = useMemo<FscRates>(() => ({
    rates: {
      UPS: { international: DEFAULT_FSC_PERCENT, domestic: DEFAULT_FSC_PERCENT },
      DHL: { international: DEFAULT_FSC_PERCENT_DHL, domestic: DEFAULT_FSC_PERCENT_DHL },
    },
    updatedAt: new Date().toISOString(),
  }), []);
  const retry = useCallback(() => {}, []);
  return { data, loading: false, error: null as string | null, retry };
}
```

**변경 후 코드:**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getFscRates, type FscRates } from '@/api/fscApi';
import { DEFAULT_FSC_PERCENT, DEFAULT_FSC_PERCENT_DHL } from '@/config/rates';

const DEFAULT_FSC_RATES: FscRates = {
  rates: {
    UPS: { international: DEFAULT_FSC_PERCENT, domestic: DEFAULT_FSC_PERCENT },
    DHL: { international: DEFAULT_FSC_PERCENT_DHL, domestic: DEFAULT_FSC_PERCENT_DHL },
  },
  updatedAt: new Date().toISOString(),
};

export function useFscRates() {
  const [data, setData] = useState<FscRates>(DEFAULT_FSC_RATES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFscRates();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FSC 요율 조회 실패');
      // error 시 기존 data(상수 초기값 또는 이전 성공값) 유지
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return { data, loading, error, retry: fetchRates };
}
```

**설계 근거:**
- 초기값을 상수로 설정 → 첫 렌더링 시 `loading=true`이지만 UI는 상수값으로 표시 (UX 개선)
- API 실패 시 이전 `data` 유지 → fallback 자동 동작
- `retry` = `fetchRates` 함수 직접 반환 → "새로고침" 버튼에 연결 가능

---

### 4.3 프론트엔드: `FscRateWidget.tsx`

**현재 비활성화 코드 (lines 31-51):**

```typescript
// 현재: useMemo로 하드코딩, fetchRates no-op, loading 고정
const data: FscRates = useMemo(() => ({
  rates: {
    UPS: { international: DEFAULT_FSC_PERCENT, domestic: DEFAULT_FSC_PERCENT },
    DHL: { international: DEFAULT_FSC_PERCENT_DHL, domestic: DEFAULT_FSC_PERCENT_DHL },
  },
  updatedAt: new Date().toISOString(),
}), []);
const loading = false;
const fetchRates = useCallback(() => {}, []);
```

**변경 후 코드:**

```typescript
// 변경: useFscRates hook 실제 사용
const { data, loading, error, retry: fetchRates } = useFscRates();
```

**추가 변경사항:**
- import에서 `useMemo` 제거 (더 이상 불필요)
- `DEFAULT_FSC_PERCENT`, `DEFAULT_FSC_PERCENT_DHL` import 제거 (hook 내부로 이동)
- `error` prop 활용 — 기존 UI에 에러 표시 로직 추가 (옵션)
- POST 업데이트(`handleSave`) 성공 후 `fetchRates()` 호출로 자동 refresh

**handleSave 수정 (기존 코드에 fetchRates 추가):**

```typescript
const handleSave = async () => {
  // ... 기존 저장 로직 ...
  try {
    await updateFscRate(carrier, international, domestic);
    // 저장 성공 후 최신값으로 새로고침
    fetchRates();
    // ... 성공 피드백 ...
  } catch (err) {
    // ... 에러 처리 ...
  }
};
```

---

## 5. 데이터 흐름

```
[매주 월요일 프로세스]

Admin → FscRateWidget (입력)
      → POST /api/v1/fsc/update
      → FscFetcher.update!
      → FscRate DB 저장 (carrier, international, domestic, source="manual", updated_by=admin_id)
      → AuditLog 기록
      → fetchRates() 자동 호출 (위젯 새로고침)

[견적 계산 시]

Frontend calculationService.ts
  └─ input.fscPercent = data.rates[carrier].international  (useFscRates에서 가져온 DB 값)
  └─ calculateQuote(input) 실행

Backend quote_calculator.rb (저장 시)
  └─ input[:fscPercent] 없으면 FscFetcher.current_rates 조회
  └─ DB 값 우선, 실패 시 상수 fallback
```

---

## 6. Fallback 전략

| 상황 | 동작 |
|------|------|
| DB에 FscRate 레코드 없음 | `FscRate.ensure_defaults!` → 상수값으로 초기 레코드 생성 |
| DB 연결 실패 | `FscFetcher.current_rates` rescue → `DEFAULT_RATES` 상수 반환 |
| API 응답 실패 (프론트) | `useFscRates` error 상태 → 기존 data 유지 (상수 초기값) |
| `input.fscPercent` 전달됨 | DB 조회 생략, 전달값 그대로 사용 (Admin 수동 override 지원) |

---

## 7. 테스트 계획

### 백엔드 RSpec

```ruby
# spec/services/quote_calculator_spec.rb
describe 'FSC from DB' do
  context 'fscPercent not in input' do
    it 'uses FscFetcher.current_rates value' do
      allow(FscFetcher).to receive(:current_rates).and_return(
        { 'UPS' => { 'international' => 50.0 } }
      )
      result = QuoteCalculator.call(build_input(carrier: 'UPS', fscPercent: nil))
      expect(result[:fsc_percent]).to eq(50.0)
    end

    it 'falls back to constant when DB unavailable' do
      allow(FscFetcher).to receive(:current_rates).and_return(
        { 'UPS' => { 'international' => DEFAULT_FSC_PERCENT } }
      )
      result = QuoteCalculator.call(build_input(carrier: 'UPS', fscPercent: nil))
      expect(result[:fsc_percent]).to eq(DEFAULT_FSC_PERCENT)
    end
  end

  context 'fscPercent in input' do
    it 'uses input value regardless of DB' do
      result = QuoteCalculator.call(build_input(carrier: 'UPS', fscPercent: 55.0))
      expect(result[:fsc_percent]).to eq(55.0)
    end
  end
end
```

### 프론트엔드 Vitest

```typescript
// useFscRates.test.ts
describe('useFscRates', () => {
  it('초기값은 상수값으로 설정', () => {
    // loading=true, data=DEFAULT_FSC_RATES
  });

  it('API 성공 시 DB 값으로 업데이트', async () => {
    // getFscRates mock → DB 값 반환 확인
  });

  it('API 실패 시 error 설정, data 유지', async () => {
    // getFscRates mock throw → error 설정, data 변경 없음
  });

  it('retry 호출 시 재요청', async () => {
    // retry() 호출 후 getFscRates 재호출 확인
  });
});
```

---

## 8. 구현 순서 (Do Phase)

### Phase 1: 백엔드 (우선)

1. `quote_calculator.rb` — `@db_fsc_rates` 인스턴스 변수 도입, line 83/109 수정
2. `bundle exec rspec` — 기존 테스트 통과 확인
3. 새 RSpec 테스트 추가

### Phase 2: 프론트엔드 훅

4. `useFscRates.ts` — 실제 API 호출로 교체
5. Vitest — 새 hook 테스트 추가

### Phase 3: Admin 위젯

6. `FscRateWidget.tsx` — `useFscRates()` hook 연결, handleSave에 fetchRates 추가
7. `npx vitest run` — 전체 테스트 통과 확인

### Phase 4: 통합 검증

8. 로컬 환경: FscRateWidget에서 UPS 50.5% 입력 → 저장 → 위젯 자동 refresh 확인
9. 견적 계산: 새 FSC 값이 계산 결과에 반영 확인
10. DB 장애 시뮬레이션: `FscFetcher.current_rates` mock → 상수 fallback 동작 확인

---

## 9. 성공 기준

Plan 문서와 동일:

| 기준 | 측정 방법 |
|------|---------|
| Admin에서 FSC % 변경 → 즉시 새 값 반영 | FscRateWidget UI 검증 |
| 변경된 FSC가 견적 계산에 즉시 반영 | 견적 결과 검증 |
| DB 장애 시 상수 fallback (무중단) | FscFetcher mock 테스트 |
| 배포 없이 FSC 업데이트 완료 | 코드 변경 없는 운영 프로세스 |
| 기존 1188개 테스트 통과 | `npx vitest run` + `bundle exec rspec` |
