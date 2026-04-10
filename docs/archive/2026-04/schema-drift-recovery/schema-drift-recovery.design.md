# Design — schema-drift-recovery

**Created**: 2026-04-11
**Parent**: `docs/01-plan/features/schema-drift-recovery.plan.md`

---

## 0. Open Questions 확정

| # | 질문 | 결정 | 근거 |
|---|------|------|------|
| Q1 | Dev DB 데이터 보존? | 폐기 | Users 2명 (jhlim725, ken.jeon), Quotes 0건. Disposable. |
| Q2 | 5 phantom migrations 처리 | 본 사이클에서 자동 해결 | `db:drop` 후 schema_migrations도 초기화되며 디렉토리에 있는 20개만 재적용됨 |
| Q3 | CI 영향 | 무관 | `.github/workflows/ci.yml`에 backend rspec 단계 없음 (frontend only) |
| Q4 | `calculation_parity_spec.rb` | 본 사이클 scope 밖 | 외부 fixture 경로 누락은 별개 이슈, 다음 cycle에서 처리 |
| Q5 | 재발 방지 가드 | TODO.md에만 기록 | 정식 가드 추가는 별도 chore (CONTRIBUTING.md 추가 등) |

---

## 1. Critical Discovery — schema.rb가 schema:load로 적용되고 있었음

`db:drop && db:create && db:migrate` 실행 시 Rails가 **마이그레이션 대신 schema.rb를 load**하는 현상 확인:

```
-- create_table("addon_rates", {force: :cascade})    ← schema.rb 형식
-- create_table("discount_rules", {force: :cascade}) ← 잘못된 이름
-- add_foreign_key("quotes", "users")                ← schema.rb 마지막 줄
```

**원인**: Rails 8에서 `db:create` 후 빈 DB에 대해 `db:migrate`가 schema.rb 존재 여부를 우선 확인하고, 있으면 schema:load로 fallback하는 동작 (또는 db:setup chain). 정확한 트리거는 추가 조사 필요.

**해결**: schema.rb를 일시 제거 → migrations만 존재하는 상태에서 `db:create db:migrate` → 정상적으로 마이그레이션 실행 → 새 schema.rb dump.

---

## 2. Recovery Procedure (실행 순서)

### Step 1 — Backup broken schema (참고용)
```bash
cd smart-quote-api
cp db/schema.rb /tmp/schema.rb.broken-backup
```

### Step 2 — Remove broken schema
```bash
rm db/schema.rb
```

### Step 3 — Drop and recreate databases
```bash
bin/rails db:drop db:create
```

### Step 4 — Run migrations from scratch
```bash
bin/rails db:migrate
```
**기대 출력**: `== 20260214000001 CreateQuotes: migrating ==` 형식 (schema.rb 형식 NOT)

### Step 5 — Dump fresh schema
```bash
bin/rails db:schema:dump
```

### Step 6 — Verify
```bash
bin/rails runner '
  raise "wrong" unless ActiveRecord::Base.connection.table_exists?(:margin_rules)
  raise "wrong" if ActiveRecord::Base.connection.table_exists?(:discount_rules)
  raise "missing" unless Quote.column_names.include?("margin_percent")
  raise "missing" unless User.column_names.include?("networks")
  puts "OK"
'
```

### Step 7 — Test DB sync
```bash
RAILS_ENV=test bin/rails db:schema:load
```

### Step 8 — Run rspec
```bash
bundle exec rspec --exclude-pattern "spec/services/calculation_parity_spec.rb"
```

### Step 9 — Commit
schema.rb 변경 + 본 사이클 PDCA 문서 + 아카이브 인덱스 업데이트.

---

## 3. Expected Schema Diff

### Tables renamed
- `discount_rules` → `margin_rules`

### Columns restored
- `quotes.margin_percent` (decimal 5,2)
- `quotes.profit_amount` (decimal 15,0)
- `quotes.profit_margin` (decimal 5,2)
- `users.networks` (jsonb default `[]`)

### Schema version
- 유지: `2026_04_10_203543`

---

## 4. Test Results Forecast

| Before recovery | After recovery |
|----------------|----------------|
| 163 examples, 114 failures | 163 examples, **~10 failures** |
| margin_percent / networks 관련 NoMethodError 다수 | 위 에러 모두 해결 |

남은 ~10건 failures는 schema와 무관한 pre-existing test bugs:
- `margin_rule_spec.rb:10` — shoulda matcher 형식 vs `inclusion` validator mismatch
- `exchange_rates_spec.rb` (5건) — `Rails.cache` test env null_store 이슈
- `quotes_spec.rb` (3건) — POST quote mock 이슈
- `margin_rule_resolver_spec.rb:107` — caching test (cache null_store)

이들은 **별도 사이클 `test-suite-fixes`**에서 처리.

---

## 5. Rollback Plan

문제 발생 시:
```bash
cp /tmp/schema.rb.broken-backup smart-quote-api/db/schema.rb
git checkout smart-quote-api/db/schema.rb  # 또는
```
프로덕션 DB는 변경되지 않으므로 rollback 영향 없음.

---

## 6. Production Impact

- **Render 백엔드**: 영향 없음. 마이그레이션 파일 변경 없음, schema.rb dump만 변경.
- **자동 재배포**: schema.rb 푸시로 트리거되지만 코드 변경 없으므로 동일 코드 재실행.
- **마이그레이션 실행**: pre-deploy `bundle exec rails db:migrate` 단계는 이미 두 마이그레이션 모두 적용됨 (no-op).
- **DB 데이터**: 변경 없음.

---

## 7. Next Phase

```bash
/pdca analyze schema-drift-recovery
```

(또는 Plan/Design/Do/Check/Report 통합 실행으로 빠르게 종결)
