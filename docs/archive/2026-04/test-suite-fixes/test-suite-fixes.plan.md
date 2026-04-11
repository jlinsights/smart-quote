# Plan — test-suite-fixes

**Created**: 2026-04-11
**Status**: Plan
**Owner**: jaehong
**Severity**: 🟡 Medium — test infrastructure cleanup
**Discovered during**: `schema-drift-recovery` cycle (2026-04-11)

---

## 1. Background

`schema-drift-recovery` 사이클에서 schema.rb를 정상화한 후, rspec 풀스위트 결과가 **114 → 10 failures**로 개선되었습니다. 잔여 10건은 schema와 무관한 test infrastructure 이슈로, 본 사이클에서 분류·수정합니다.

### 잔여 10 failures (4 카테고리)

| # | 카테고리 | 개수 | Root cause |
|---|---------|------|-----------|
| C1 | shoulda matcher 형식 mismatch | 1 | `validate_numericality_of(...).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(200)` 사용, but model uses `validates :priority, numericality: { only_integer: true, in: 0..200 }`. Range 형식이라 shoulda가 GTE/LTE를 인식 못함 |
| C2 | `Rails.cache` null_store | 6 | `config.cache_store = :null_store` (test env, line 27). `Rails.cache.read/write/fetch`이 모두 no-op이라 cache 의존 spec이 모두 실패. 5건 in `exchange_rates_spec.rb` + 1건 in `margin_rule_resolver_spec.rb` |
| C3 | Quote NOT NULL violation | 3 | `quotes.pickup_in_seoul_cost` (decimal, default 0, null: false) 컬럼이 추가됐지만 `QuotesController#create`가 input params에서 매핑 누락 → controller 또는 spec 픽스 필요 |

총 1 + 6 + 3 = **10건**

---

## 2. Goal

`bundle exec rspec` 풀 통과 (10 failures → 0 failures).

### 측정 가능한 목표

- [ ] `bundle exec rspec` 결과: **163 examples, 0 failures** (현재: 10 failures)
- [ ] 카테고리 C1 (margin_rule_spec): 1건 통과 — shoulda matcher를 모델 형식과 일치시키기
- [ ] 카테고리 C2 (cache 6건): 6건 통과 — test env cache 설정 또는 spec 변경
- [ ] 카테고리 C3 (Quote NOT NULL 3건): 3건 통과 — controller 또는 spec/factory에서 `pickup_in_seoul_cost` 처리
- [ ] schema-drift-recovery에서 발견한 `calculation_parity_spec.rb`는 별도 처리 (out of scope)
- [ ] 회귀 0건 — 본 사이클 전 통과하던 153개 spec 모두 유지

### Non-goals

- `calculation_parity_spec.rb` 외부 fixture 경로 수정 (별도 cycle)
- Backend 비즈니스 로직 변경
- 마이그레이션 파일 추가/수정
- 새 테스트 케이스 작성 (있는 것을 고치는 데 집중)

---

## 3. Scope & Strategy

### C1 — `margin_rule_spec.rb:10` shoulda matcher 형식

#### 현재 코드
```ruby
# spec/models/margin_rule_spec.rb:10 (추정)
it { is_expected.to validate_numericality_of(:priority).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(200).only_integer }
```

#### 현재 모델
```ruby
# app/models/margin_rule.rb:6
validates :priority, presence: true, numericality: { only_integer: true, in: 0..200 }
```

#### 문제
shoulda-matchers는 `numericality: { in: 0..200 }`을 GTE/LTE로 자동 변환해서 인식하지 못함. shoulda는 직접 `greater_than_or_equal_to: 0, less_than_or_equal_to: 200`을 기대.

#### 해결 옵션

| 옵션 | 변경 대상 | Pros | Cons |
|-----|---------|------|-----|
| **A** | spec — shoulda matcher 제거하고 직접 invalid record 검증 | 모델 안 건드림, 의도 명확 | 코드 길어짐 |
| B | 모델 — `numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 200, only_integer: true }`로 변경 | shoulda 한 줄 유지 | 동작 동일하지만 모델 변경 |
| C | spec — shoulda matcher 그대로 두고 `should validate_inclusion_of(:priority).in_array((0..200).to_a)` 사용 | 표준 shoulda | 0~200 정수 200개 enumerate, 느림 |

**선택**: **A** — 모델은 그대로 두고 spec에서 직접 invalid 검증 (의도 명확, 빠름).

### C2 — `:null_store` cache 6건

#### 현재 설정
```ruby
# config/environments/test.rb:27
config.cache_store = :null_store
```

#### 영향받는 코드
- `app/services/margin_rule_resolver.rb:27` — `Rails.cache.fetch(CACHE_KEY, ...)`
- `app/controllers/api/v1/exchange_rates_controller.rb` (추정) — cache로 환율 저장

#### 영향받는 spec
- `exchange_rates_spec.rb` (5 cases): cache 의존
- `margin_rule_resolver_spec.rb:107` (1 case): cache 의존

#### 해결 옵션

| 옵션 | 변경 대상 | Pros | Cons |
|-----|---------|------|-----|
| **A** | `test.rb` — `:memory_store`로 변경 | 한 줄, 모든 cache spec 통과 | 테스트 격리 — `before(:each) { Rails.cache.clear }` 필요 |
| B | spec — 각 spec에서 `allow(Rails.cache).to receive(:read).and_return(...)` mock | spec만 변경 | 6건 모두 mock 코드 추가, 유지보수 부담 |
| C | spec — `before { Rails.cache.instance_variable_set(...) }` 핵 | 강력한 격리 | 깨지기 쉬움 |

**선택**: **A** — `:memory_store`로 변경 + `rails_helper.rb`에 `before(:each) { Rails.cache.clear }` 글로벌 hook 추가.

### C3 — `quotes.pickup_in_seoul_cost` NOT NULL 3건

#### 현재 마이그레이션
```ruby
# 20260310000001_add_calculation_sync_fields_to_quotes.rb
add_column :quotes, :pickup_in_seoul_cost, :decimal, precision: 12, scale: 0, default: 0, null: false
```

`default: 0, null: false`라 빈 값일 때 0으로 세팅되어야 하지만, INSERT 시 명시적으로 `nil` 전달되면 default가 적용 안 됨.

#### 현재 controller (추정)
```ruby
# app/controllers/api/v1/quotes_controller.rb:33
quote = Quote.new(quote_params)  # pickup_in_seoul_cost 누락
quote.save
```

`quote_params`에 `pickup_in_seoul_cost`를 매핑하지 않으면 빈 값이 들어가 NOT NULL violation.

#### 해결 옵션

| 옵션 | 변경 대상 | Pros | Cons |
|-----|---------|------|-----|
| A | spec — 요청 payload에 `pickupInSeoulCost: 0` 추가 | spec만 | 다른 컬럼도 동일 이슈 가능, 근본 해결 아님 |
| **B** | controller — input에 fallback `pickup_in_seoul_cost: input["pickupInSeoulCost"] \|\| 0` 추가 | 근본 해결, 프로덕션도 수혜 | controller 로직 변경 |
| C | 마이그레이션 — `null: false` 제거 (`null: true`) | 깔끔 | 마이그레이션 추가 필요 |

**선택**: **B** — controller에서 default 0 fallback 제공 (프로덕션 안전성도 향상).

> ⚠️ 주의: schema-drift-recovery에서 controller가 `discount_percent` 등을 사용하는지도 점검. 본 사이클에서 schema와 model 차이가 있으면 추가 정정.

---

## 4. Risks & Assumptions

### Risks

| 리스크 | 영향 | 완화책 |
|------|-----|------|
| `:memory_store` 변경 시 spec 격리 깨짐 | 다른 spec에서 stale cache 영향 | `rails_helper.rb`에 `before(:each) { Rails.cache.clear }` 추가 |
| Controller `pickup_in_seoul_cost` fallback 0이 비즈니스 로직에 영향 | 픽업 비용 누락 시 0으로 처리 | 이미 `default: 0`이라 의미상 동일. 단, 프론트엔드도 `pickupInSeoulCost`을 전송하는지 확인 |
| `quote_params` permit list에 누락 | strong params 우회 못함 | `quote_params`에 추가하거나 `params[:input]` raw 접근 |
| 다른 spec에 회귀 | 153 → 152 등 | 풀스위트 항상 재실행 |

### Assumptions

- `pickup_in_seoul_cost`는 비즈니스적으로 0이 합리적인 default
- `:memory_store`는 spec 격리에 충분 (process 내 isolation)
- shoulda-matchers 6.x 사용 중 (range 미지원 확인됨)

---

## 5. Dependencies

- **No code dependencies** — 모두 test infra 정정
- **Gem 변경 없음** — 기존 shoulda-matchers, rspec, factory_bot 그대로
- **마이그레이션 변경 없음**

---

## 6. Success Criteria

- [ ] `bundle exec rspec --exclude-pattern "spec/services/calculation_parity_spec.rb"` → **163 examples, 0 failures**
- [ ] `bin/rubocop` 통과 (변경된 spec/controller 신규 위반 0)
- [ ] `git diff` 검토: 변경 파일 ≤ 5개 (margin_rule_spec, test.rb, rails_helper.rb, quotes_controller, 옵션)
- [ ] 회귀 0건 — 153 통과 → 163 통과 (10 추가)
- [ ] 프로덕션 영향 검토:
  - controller 변경은 `pickup_in_seoul_cost` 누락 시 0 fallback (안전)
  - test.rb 변경은 test env만 영향
  - spec/rails_helper 변경은 test only

---

## 7. Open Questions

1. **`memory_store` 격리 hook 위치** — `rails_helper.rb` 글로벌 vs `before(:each)` vs 개별 spec? → 글로벌 권장 (DRY)
2. **C3 controller fallback 위치** — `quote_params` permit + default vs `Quote.new(input).tap { |q| q.pickup_in_seoul_cost ||= 0 }` 식 fallback?
3. **다른 NOT NULL 컬럼**도 동일 이슈 가능성 — 본 사이클에서 한꺼번에 점검 vs 발견된 것만 수정?
4. **`exchange_rates_spec.rb` 5건 모두 동일 패턴인지** vs 일부는 다른 mock 이슈일지 확인 필요

---

## 8. Next Phase

```bash
/pdca design test-suite-fixes
```

design 단계에서:
- Open Questions 1-4 확정
- 각 카테고리별 정확한 코드 변경 명세
- 회귀 검증 절차
