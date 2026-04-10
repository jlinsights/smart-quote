# Completion Report — schema-drift-recovery

**Completed**: 2026-04-11
**Match Rate**: **95%**
**Status**: ✅ Completed
**Cycle Duration**: ~30 minutes (Plan→Design→Do→Check→Report)

---

## 1. Executive Summary

`db/schema.rb`가 `bb93c45` 커밋(auth-passwordless 아카이브, 2026-04-09)에서 **AI 환각으로 잘못 재생성**되어 실제 마이그레이션과 어긋난 상태였음. 이로 인해 backend rspec 114건이 사전 실패 중. 본 사이클에서 **clean rebuild from migrations** 전략으로 schema.rb를 정확하게 재생성, **104건 (91%) failures 해결**.

### Outcome
- 🛠️ **Schema.rb 완전 복원** — 마이그레이션과 100% 일치
- 🧪 **rspec 114 → 10 failures** (104건 해결, 91% 개선)
- 🔍 **Critical 발견**: Rails 8의 `db:migrate` 가 빈 DB에서 schema.rb fallback으로 동작하는 현상
- 📦 **프로덕션 영향 없음** — 마이그레이션/DB 데이터 변경 없음

---

## 2. Root Cause

### What was broken
커밋 `bb93c45`에서 `db/schema.rb`가 다음과 같이 잘못 변경됨:

| 실제 마이그레이션 | 손상된 schema.rb |
|----------------|-----------------|
| `margin_rules` 테이블 | `discount_rules` ❌ |
| `quotes.margin_percent` | `quotes.discount_percent` ❌ |
| `quotes.profit_amount` | 누락 ❌ |
| `quotes.profit_margin` | 누락 ❌ |
| `users.networks` | 누락 ❌ |

### Why it broke production-tier infra silently
- 프로덕션 DB는 마이그레이션을 누적 적용 → 정상
- 로컬 dev/test DB는 schema.rb를 통해 셋업 → 망가짐
- CI는 backend rspec 미실행 → 발견 못 함
- 사용자가 풀 rspec을 자주 실행하지 않음 → 발견 지연

---

## 3. Recovery Procedure (실행 결과)

| Step | 명령 | 결과 |
|------|------|------|
| 1 | `cp db/schema.rb /tmp/schema.rb.broken-backup` | ✅ 백업 |
| 2 | `rm db/schema.rb` | ✅ 삭제 |
| 3 | `bin/rails db:drop db:create` | ✅ |
| 4 | `bin/rails db:migrate` | ✅ 20개 마이그레이션 정상 적용 |
| 5 | `bin/rails db:schema:dump` | ✅ 새 schema.rb 생성 |
| 6 | Verification (margin_rules, networks) | ✅ |
| 7 | `RAILS_ENV=test bin/rails db:schema:load` | ✅ |
| 8 | `bundle exec rspec` | 163 examples, 10 failures (was 114) |

---

## 4. Critical Discovery — Rails 8 동작

`bin/rails db:drop db:create db:migrate` 실행 시 Rails가 마이그레이션을 실제로 실행하지 않고 **schema.rb를 load**하는 현상 확인:

```
-- create_table("addon_rates", {force: :cascade})    ← schema.rb 형식
-- create_table("discount_rules", {force: :cascade})
-- add_foreign_key("quotes", "users")                ← schema.rb 마지막 라인
```

VS 정상 마이그레이션 실행:
```
== 20260214000001 CreateQuotes: migrating ==
-- create_table(:quotes)
== 20260214000001 CreateQuotes: migrated (0.05s)
```

**해결**: schema.rb를 제거한 후 `db:migrate` 재실행 → 정상적으로 20개 마이그레이션이 순차 실행됨.

**TODO**: Rails 8의 정확한 트리거 조건 조사 (별도 investigation item)

---

## 5. Test Results

### Before Recovery
```
163 examples, 114 failures
```
주요 에러:
- `NoMethodError: undefined method 'margin_percent='` (78건)
- `NameError: undefined local variable 'networks'` (26건)
- 기타 (10건)

### After Recovery
```
163 examples, 10 failures
```
**104건 해결 (91% 감소)**

### 잔여 10 failures (schema 무관, 별도 사이클)

| Spec | 개수 | 원인 |
|------|------|------|
| `margin_rule_spec.rb` priority | 1 | shoulda matcher 형식 mismatch |
| `exchange_rates_spec.rb` cache | 5 | `Rails.cache` test env null_store |
| `quotes_spec.rb` POST | 3 | Mock/factory 이슈 |
| `margin_rule_resolver_spec.rb` cache | 1 | 동일 cache 이슈 |

→ **Follow-up cycle**: `test-suite-fixes` (TODO.md에 추가됨)

---

## 6. Files Changed

### Modified (1)
- `smart-quote-api/db/schema.rb` — clean dump from migrations (67 insertions, 54 deletions)

### Created (4 PDCA documents)
- `docs/01-plan/features/schema-drift-recovery.plan.md`
- `docs/02-design/features/schema-drift-recovery.design.md`
- `docs/03-analysis/schema-drift-recovery.analysis.md`
- `docs/04-report/features/schema-drift-recovery.report.md`

### NOT Changed
- 마이그레이션 파일들 (이미 정상)
- 모델/컨트롤러 (이미 정상)
- 프로덕션 DB (변경 없음)

---

## 7. Production Impact

✅ **Zero production impact**
- 마이그레이션 변경 없음
- DB 데이터 변경 없음
- 코드 변경 없음
- Render 자동 재배포는 트리거되지만 동일 코드 + 동일 DB

---

## 8. Lessons Learned

### ✅ What Went Well
1. **Root cause 명확히 추적** — `git log -p schema.rb`로 손상 commit (`bb93c45`) 정확히 식별
2. **Clean rebuild 전략 효과적** — 마이그레이션을 single source of truth로 사용
3. **Side effect 발견** — Rails 8 schema.rb fallback 동작 확인, 향후 가드 가능
4. **프로덕션 무영향** — DB 변경 0건, 단순 dump 파일만 수정

### ⚠️ What Was Tricky
1. **Rails 8 db:migrate 동작 변화** — schema.rb가 있으면 fallback to schema:load. 직관과 다름
2. **AI 환각 schema.rb** — 자동 생성된 schema가 정확한지 검증 필요. CI에 schema vs migration consistency 체크 추가 권장
3. **Phantom migrations** — 이전 DB의 schema_migrations 테이블에 있던 5개 phantom 항목은 db:drop으로 자동 정리됨

### 🔮 Follow-up Items (TODO.md에 추가)
1. **`test-suite-fixes` cycle** — 잔여 10 failures (cache mock, shoulda matcher 형식)
2. **`schema-consistency-guard` chore** — CI에 `db:drop+create+migrate vs schema.rb` diff check 추가
3. **`calculation-parity-fixture-fix`** — 외부 fixture 경로 깨진 spec
4. **Rails 8 db:migrate 동작 조사** — 정확한 schema.rb fallback 트리거 문서화

---

## 9. Related Cycles

| Cycle | Status | Relationship |
|-------|--------|--------------|
| `auth-passwordless` | Archived 2026-04-09 (95%) | 본 손상의 원인 commit `bb93c45` 포함 |
| `magic-link-hardening` | Archived 2026-04-11 (99%) | 본 사이클의 발견 동기 (rspec 114 failures 보고) |
| `schema-drift-recovery` | **This cycle, 95%** | Schema 정합성 복원 |
| `test-suite-fixes` | 미시작 | 잔여 10 failures 처리 |
| `schema-consistency-guard` | 미시작 | 재발 방지 가드 |

---

## 10. Next Phase

```bash
/pdca archive schema-drift-recovery
```

문서 4개를 `docs/archive/2026-04/schema-drift-recovery/`로 이동.
