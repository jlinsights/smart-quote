# Design: code-quality-main-v2

> Plan: `docs/01-plan/features/code-quality-main-v2.plan.md`

## Feature Overview

| 항목 | 내용 |
|------|------|
| Feature | `code-quality-main-v2` |
| 목표 | 코드 분석 점수 72/100 → 87+ 달성 |
| Phase 1 | Critical 4건 (보안/PII/console) |
| Phase 2 | High 5건 (구조/성능/검증) |

---

## Phase 1 — Critical 이슈 설계

### C1. EIA API Key 헤더 방식 전환

**파일**: `src/api/eiaApi.ts`

```typescript
// Before: API key in URL query param (INSECURE)
const url = `...&api_key=${apiKey}`;

// After: API key in header (SECURE)
const url = `https://api.eia.gov/v2/petroleum/...`; // no api_key param
const res = await fetch(url, {
  headers: { 'X-Api-Key': apiKey }
});
```

**검증 기준**: URL에 `api_key=` 문자열 없음, `X-Api-Key` 헤더 전송 확인

---

### C2. application_controller.rb PII 로그 제거

**파일**: `smart-quote-api/app/controllers/application_controller.rb`

```ruby
# Before (REMOVE):
Rails.logger.info "=== current_user: #{current_user.inspect}"

# After: 라인 완전 제거 또는 ID만 로깅
Rails.logger.info "=== current_user_id: #{current_user.id}"
```

**검증 기준**: `current_user.inspect` 문자열 없음

---

### C3. console.* 프로덕션 제거

**파일 목록**:
- `src/components/ErrorBoundary.tsx` — `console.error` 제거 또는 Sentry 전용
- `src/features/quote/components/SaveQuoteButton.tsx` — `console.error` 제거

**설계**:
```typescript
// Before:
console.error('[ErrorBoundary]', error, info.componentStack);

// After: Sentry 이미 통합되어 있으므로 제거 or 주석
// Sentry.captureException(error) 으로 대체 가능
```

**검증 기준**: `grep -r "console\." src/ --include="*.ts" --include="*.tsx" | grep -v test` → 0건

---

### C4. 이메일 유효성 검사 강화

**파일**: `smart-quote-api/app/controllers/api/v1/quotes_controller.rb`

```ruby
# Before (too permissive):
URI::MailTo::EMAIL_REGEXP

# After (RFC 5322-compliant):
valid_email_regex = /\A[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\z/
unless email.present? && email.match?(valid_email_regex)
  return render json: { error: 'Invalid email format' }, status: :unprocessable_entity
end
```

**검증 기준**: `"notanemail"` → 422, `"test@example.com"` → 통과

---

## Phase 2 — High Priority 이슈 설계

### H1. calculationService.ts 분리 (Thin Orchestrator)

**대상 파일**:
- `src/features/quote/services/calculationService.ts` — orchestrator (~155줄)
- `src/features/quote/services/itemCalculation.ts` — 신규
- `src/features/quote/services/upsCalculation.ts` — 신규
- `src/features/quote/services/dhlCalculation.ts` — 신규
- `src/features/quote/services/carrierRateEngine.ts` — 신규 (공유 인터페이스)

**설계 원칙**:
```
calculationService.ts (orchestrator, <200줄)
  ├── itemCalculation.ts       # 아이템 비용, 포장, 부피 무게
  ├── upsCalculation.ts        # UPS 운임 계산, 존 결정
  ├── dhlCalculation.ts        # DHL 운임 계산, 존 결정
  └── carrierRateEngine.ts     # 공유 인터페이스 CarrierCostResult
```

**하위호환성**: 기존 import 경로 유지를 위한 re-export
```typescript
// calculationService.ts에서 re-export
export { calculateVolumetricWeight, calculateItemCosts } from './itemCalculation';
export { calculateUpsCosts, determineUpsZone } from './upsCalculation';
export { calculateDhlCosts, determineDhlZone } from './dhlCalculation';
```

**검증 기준**: 
- `calculationService.ts` ≤ 200줄
- 기존 테스트 전체 통과 (1241건+)
- TypeScript 빌드 에러 0건

---

### H2. N+1 쿼리 방지

**파일**: `smart-quote-api/app/controllers/api/v1/quotes_controller.rb`

```ruby
# Before: lazy-load
@quotes = Quote.where(...)

# After: eager load with includes
@quotes = Quote.includes(:customer, :user).where(...)
```

**검증 기준**: Rails log에서 N+1 패턴(`Quote Load`) 제거

---

### H3. fetch 타임아웃 처리

**파일**: `src/api/apiClient.ts`

```typescript
const REQUEST_TIMEOUT_MS = 30_000;

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

try {
  const res = await fetch(url, { signal: controller.signal, ...opts });
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

**검증 기준**: 30초 타임아웃 후 `AbortError` 발생, UI에 에러 표시

---

### H4. 백엔드 입력 유효성 검사

**파일**: `smart-quote-api/app/controllers/api/v1/quotes_controller.rb`

```ruby
def validate_quote_input!(input)
  destination = input[:destinationCountry] || input['destinationCountry']
  raise InvalidInputError, "destinationCountry is required" if destination.blank?

  items = input[:items] || input['items'] || []
  items.each_with_index do |item, idx|
    weight = item[:weight]&.to_f || item['weight']&.to_f || 0
    raise InvalidInputError, "Item #{idx + 1}: weight must be greater than 0" unless weight > 0
  end
end
```

**검증 기준**: 음수 무게 → 422, 목적지 없음 → 422

---

### H5. pdfService.ts 중첩 리팩터링

**파일**: `src/lib/pdfService.ts` (~500줄, 4단계+ 중첩)

**설계**:
```typescript
// Before: 중첩된 단일 함수
function generatePdf(...) {
  // 500줄 monolith
  if (breakdown) {
    if (carrier === 'DHL') {
      dhlAddOns.forEach(addon => {
        // 4단계 이상 중첩
      });
    }
  }
}

// After: 서브 함수 추출
function renderPackingSection(doc: jsPDF, data: PackingData): void { ... }
function renderCarrierSection(doc: jsPDF, carrier: string, breakdown: CostBreakdown): void { ... }
function renderSurchargeSection(doc: jsPDF, surcharges: AppliedSurcharge[]): void { ... }
```

**검증 기준**: 최대 중첩 깊이 ≤ 3, 주 함수 ≤ 100줄

---

## 검증 체크리스트

| # | 항목 | 검증 방법 | 기준 |
|---|------|-----------|------|
| C1 | EIA API key 헤더 방식 | 소스 grep | URL에 `api_key=` 없음 |
| C2 | PII 로그 제거 | 소스 grep | `current_user.inspect` 없음 |
| C3 | console.* 제거 | `grep -r console. src/` | 0건 (테스트 제외) |
| C4 | 이메일 검증 강화 | RSpec 테스트 | RFC regex 적용 확인 |
| H1 | calculationService 분리 | 파일 구조 + 줄수 | ≤200줄 + 4 서브모듈 |
| H2 | N+1 방지 | Rails log 또는 소스 | `.includes()` 적용 |
| H3 | fetch 타임아웃 | 소스 확인 | AbortController 30s |
| H4 | 백엔드 입력 검증 | 소스 + RSpec | weight>0, country 필수 |
| H5 | pdfService 리팩터링 | 줄수 + 중첩 깊이 | 주함수 ≤100줄, 깊이≤3 |

---

## 파일 변경 목록

| 파일 | 변경 유형 | Phase |
|------|----------|-------|
| `src/api/eiaApi.ts` | 수정 (헤더 방식) | C1 |
| `smart-quote-api/app/controllers/application_controller.rb` | 수정 (로그 제거) | C2 |
| `src/components/ErrorBoundary.tsx` | 수정 (console 제거) | C3 |
| `src/features/quote/components/SaveQuoteButton.tsx` | 수정 (console 제거) | C3 |
| `smart-quote-api/app/controllers/api/v1/quotes_controller.rb` | 수정 (이메일 regex) | C4 |
| `src/features/quote/services/calculationService.ts` | 수정 (orchestrator) | H1 |
| `src/features/quote/services/itemCalculation.ts` | 신규 | H1 |
| `src/features/quote/services/upsCalculation.ts` | 신규 | H1 |
| `src/features/quote/services/dhlCalculation.ts` | 신규 | H1 |
| `src/features/quote/services/carrierRateEngine.ts` | 신규 | H1 |
| `smart-quote-api/app/controllers/api/v1/quotes_controller.rb` | 수정 (N+1, 검증) | H2, H4 |
| `src/api/apiClient.ts` | 수정 (타임아웃) | H3 |
| `src/lib/pdfService.ts` | 수정 (리팩터링) | H5 |
