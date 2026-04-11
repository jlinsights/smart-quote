# Design — test-suite-fixes

**Created**: 2026-04-11
**Parent**: `docs/01-plan/features/test-suite-fixes.plan.md`

---

## 0. Open Questions 확정

| # | 질문 | 결정 |
|---|------|------|
| Q1 | memory_store 격리 hook 위치 | **글로벌** — `rails_helper.rb`의 `RSpec.configure` block에 `before(:each) { Rails.cache.clear }` |
| Q2 | C3 controller fallback 위치 | **`input_attributes` 메서드** (line 183) — 기존 `\|\| nil` fallback 패턴과 일관 (line 169 `\|\| "KR"`) |
| Q3 | 다른 NOT NULL 컬럼 점검 범위 | **발견된 1건만** (`pickup_in_seoul_cost`) — 풀스위트 통과 후 추가 발견 시 별도 처리 |
| Q4 | exchange_rates 5건 동일 패턴? | **확인 완료** — 모두 `Rails.cache.write` (3건) + `Rails.cache.clear` (2건). null_store 단일 원인 |

---

## 1. Critical Discovery

`app/controllers/api/v1/quotes_controller.rb:183`에서 발견:

```ruby
pickup_in_seoul_cost: input["pickupInSeoulCost"] || input[:pickupInSeoulCost],
```

`input["pickupInSeoulCost"]` nil + `input[:pickupInSeoulCost]` nil → 결과 `nil` → DB NOT NULL violation. 다른 라인은 `|| "KR"`, `|| "A"`, `|| 15`, `|| 0` 등 default가 있는데 이 한 줄만 누락. 명백한 버그 (단, 프론트엔드가 항상 0이라도 보내고 있어서 프로덕션에선 미발견).

---

## 2. C1 — `margin_rule_spec.rb` shoulda matcher 정정

### Current
```ruby
# spec/models/margin_rule_spec.rb:10 (현재 추정)
it { is_expected.to validate_numericality_of(:priority).only_integer.is_greater_than_or_equal_to(0).is_less_than_or_equal_to(200) }
```

### Model
```ruby
# app/models/margin_rule.rb:6
validates :priority, presence: true, numericality: { only_integer: true, in: 0..200 }
```

### Problem
shoulda-matchers의 `validate_numericality_of` matcher는 `numericality: { in: 0..200 }` (Range 형식)을 인식하지 못함. 모델의 validator는 "must be in 0..200" 에러를 내지만, shoulda는 "must be greater than or equal to 0" 에러를 기대.

### Fix
shoulda matcher 제거, **직접 invalid record 검증**:

```ruby
# spec/models/margin_rule_spec.rb (수정 후)
describe "validations" do
  subject { build(:margin_rule) }

  it { is_expected.to validate_presence_of(:priority) }

  it "rejects priority below 0" do
    rule = build(:margin_rule, priority: -1)
    expect(rule).not_to be_valid
    expect(rule.errors[:priority]).to be_present
  end

  it "rejects priority above 200" do
    rule = build(:margin_rule, priority: 201)
    expect(rule).not_to be_valid
    expect(rule.errors[:priority]).to be_present
  end

  it "accepts priority at boundaries" do
    expect(build(:margin_rule, priority: 0)).to be_valid
    expect(build(:margin_rule, priority: 200)).to be_valid
  end

  it "rejects non-integer priority" do
    rule = build(:margin_rule, priority: 50.5)
    expect(rule).not_to be_valid
  end
end
```

기존 shoulda 한 줄을 4-5개 명시적 case로 교체. 의도 명확, 빠름.

---

## 3. C2 — `Rails.cache` `:memory_store` 전환

### Current
```ruby
# config/environments/test.rb:27
config.cache_store = :null_store
```

### Fix Step 1 — test.rb
```ruby
# config/environments/test.rb:27
config.cache_store = :memory_store
```

### Fix Step 2 — rails_helper.rb 글로벌 clear hook

```ruby
# spec/rails_helper.rb (RSpec.configure block 안)
RSpec.configure do |config|
  # ... 기존 설정 ...

  # Test 격리를 위해 매 example 전 cache 초기화
  config.before(:each) do
    Rails.cache.clear
  end
end
```

### 영향 분석

| spec | 동작 변화 |
|------|---------|
| `exchange_rates_spec.rb` "when cache is available" 3건 | `Rails.cache.write` 후 controller에서 read → 정상 hit |
| `exchange_rates_spec.rb` "when cache is empty" 2건 | `Rails.cache.clear` (이미 hook으로 자동 적용) → API stub로 동작 |
| `margin_rule_resolver_spec.rb:107` | `MarginRuleResolver.fetch` 후 `Rails.cache.read(CACHE_KEY)` 검증 → 정상 |
| 기타 spec | 영향 없음 (cache 사용 안 함) |

### 잠재 회귀 리스크
- 다른 spec이 우연히 cache leak에 의존하는 경우 깨질 수 있음
- 완화: `before(:each) { Rails.cache.clear }` hook이 매 example마다 격리 보장

---

## 4. C3 — `quotes_controller.rb` `pickup_in_seoul_cost` fallback

### Current
```ruby
# app/controllers/api/v1/quotes_controller.rb:183
pickup_in_seoul_cost: input["pickupInSeoulCost"] || input[:pickupInSeoulCost],
```

### Fix
```ruby
# app/controllers/api/v1/quotes_controller.rb:183
pickup_in_seoul_cost: input["pickupInSeoulCost"] || input[:pickupInSeoulCost] || 0,
```

`|| 0` 한 토큰 추가. 다른 라인들과 일관된 default 패턴 (line 169 `|| "KR"`, line 172 `|| "A"`, line 173 `|| false`, line 176 `|| 15`, line 177 `|| 0`).

### Production 영향 분석

- **Before**: 프론트엔드가 `pickupInSeoulCost`을 안 보내면 NOT NULL violation → 500
- **After**: 안 보내면 0 fallback → 정상 저장
- **결론**: 안전성 향상. 프론트엔드 변경 불필요.

---

## 5. Implementation Order

| # | 파일 | 변경 종류 | 라인 수 |
|---|------|---------|--------|
| 1 | `app/controllers/api/v1/quotes_controller.rb` | line 183 `\|\| 0` 추가 | 1 |
| 2 | `config/environments/test.rb` | line 27 `:null_store` → `:memory_store` | 1 |
| 3 | `spec/rails_helper.rb` | RSpec.configure에 before hook 추가 | 3 |
| 4 | `spec/models/margin_rule_spec.rb` | shoulda matcher 4-5 case로 교체 | ~20 |
| 5 | `bundle exec rspec` | 풀 검증 | (실행) |
| 6 | `bin/rubocop` | 변경 파일 lint | (실행) |
| 7 | 회귀 확인 | 기존 153 통과 spec 영향 없음 확인 | (실행) |

**총 변경 라인**: ~25 (코드 5 + spec 20)

---

## 6. Test Strategy

### Pre-fix baseline
```
163 examples, 10 failures
```

### Post-fix expected
```
163 examples, 0 failures  ← 목표
```

### 카테고리별 검증
```bash
# C1
bundle exec rspec spec/models/margin_rule_spec.rb

# C2 — exchange_rates
bundle exec rspec spec/requests/api/v1/exchange_rates_spec.rb

# C2 — margin_rule_resolver
bundle exec rspec spec/services/margin_rule_resolver_spec.rb

# C3
bundle exec rspec spec/requests/api/v1/quotes_spec.rb

# 풀 검증
bundle exec rspec --exclude-pattern "spec/services/calculation_parity_spec.rb"
```

---

## 7. Rollback Plan

각 변경이 독립적이라 개별 revert 가능:

1. **C1 spec 변경 rollback** — `git checkout spec/models/margin_rule_spec.rb`
2. **C2 cache_store rollback** — `git checkout config/environments/test.rb spec/rails_helper.rb`
3. **C3 controller rollback** — `git checkout app/controllers/api/v1/quotes_controller.rb`

프로덕션 영향:
- C1, C2는 test only (production 영향 0)
- C3는 production safety 향상 (degradation 아님)

---

## 8. Success Criteria

- [ ] `bundle exec rspec --exclude-pattern "spec/services/calculation_parity_spec.rb"` → **163 examples, 0 failures**
- [ ] 변경 파일 정확히 4개 (controller, test.rb, rails_helper.rb, margin_rule_spec.rb)
- [ ] `bin/rubocop` 변경 파일 신규 위반 0
- [ ] 기존 통과 153건 모두 유지 (회귀 0)
- [ ] Production 안전성 검토:
  - controller `|| 0` fallback → 안전
  - test.rb / rails_helper → test only

---

## 9. Next Phase

```bash
/pdca do test-suite-fixes
```

Implementation Order 1-7 순차 실행.
