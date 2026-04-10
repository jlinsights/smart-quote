# Plan — schema-drift-recovery

**Created**: 2026-04-11
**Status**: Plan
**Owner**: jaehong
**Severity**: 🔴 High — pre-existing test infra corruption
**Discovered during**: `magic-link-hardening` cycle (2026-04-10)

---

## 1. Background

`magic-link-hardening` 사이클 중 backend 테스트를 실행했을 때, 매직링크 관련 40개 spec은 모두 통과했지만 **나머지 114개 pre-existing spec이 실패**했습니다. 원인 추적 결과, **`db/schema.rb`가 실제 DB와 심각하게 어긋나 있는 상태**임이 확인되었습니다.

### Root Cause

커밋 `bb93c45` (✅ chore: auth-passwordless PDCA 아카이브 완료, 2026-04-09)에서 `db/schema.rb`가 잘못 재생성되었습니다. 이 dump는 실제 DB에서 추출된 것이 아니라 **AI가 환각으로 생성한 추정 스키마**로 보입니다.

| 항목 | 실제 DB / 마이그레이션 | schema.rb (HEAD) |
|------|-------------------|------------------|
| **테이블 이름** | `margin_rules` | `discount_rules` ❌ |
| **컬럼** | `quotes.margin_percent` (decimal) | `quotes.discount_percent` ❌ |
| **컬럼** | `users.networks` (jsonb) | 누락 ❌ |
| **컬럼** | `quotes.profit_amount` | 누락 ❌ |
| **컬럼** | `quotes.profit_margin` | 누락 ❌ |

### Symptoms

1. **로컬 rspec 실패 114건** (`audit_log_spec`, `quote_spec`, `margin_rule_resolver_spec` 등)
   - `NoMethodError: undefined method 'margin_percent=' for an instance of Quote`
   - `NameError: undefined local variable or method 'networks' for an instance of User`
2. **테스트 DB 재생성 시 잘못된 테이블 생성** (`db:schema:load` → `discount_rules` 생성)
3. **프로덕션은 정상** — 마이그레이션 기반으로 누적 적용되어 실제 DB는 올바른 상태
4. **임시 우회** (magic-link-hardening 중): `ALTER TABLE users ADD COLUMN networks jsonb`로 수동 패치

### Why it wasn't caught earlier

- 프로덕션 배포는 `db:migrate` 실행 (마이그레이션 기반) → 정상
- CI가 schema.rb를 사용하지 않는지, 아니면 CI도 같이 망가졌는지 확인 필요
- 사용자가 로컬 rspec 풀스위트를 자주 실행하지 않아 발견 지연

---

## 2. Goal

`db/schema.rb`를 **실제 마이그레이션 결과와 일치하는 정확한 dump**로 복원하고, 향후 재발 방지 가드를 마련한다.

### 측정 가능한 목표

- [ ] `bin/rails db:drop && bin/rails db:create && bin/rails db:migrate && bin/rails db:schema:dump` 정상 완료
- [ ] 새 schema.rb에 다음이 모두 포함:
  - [ ] `create_table "margin_rules"` (NOT `discount_rules`)
  - [ ] `t.decimal "margin_percent"` in `quotes` table
  - [ ] `t.jsonb "networks", default: []` in `users` table
  - [ ] `t.decimal "profit_amount"` (있는 경우)
  - [ ] `t.decimal "profit_margin"` (있는 경우)
- [ ] `bundle exec rspec` 전체 통과 (114 failures → 0)
- [ ] `RAILS_ENV=test bin/rails db:test:prepare` 정상 동작
- [ ] 손상 commit `bb93c45` 이후 phantom schema 변경사항 모두 정정
- [ ] CI가 schema.rb를 사용한다면 CI도 통과 확인

### Non-goals

- **마이그레이션 파일 추가/수정** — 마이그레이션 자체는 정상이므로 건드리지 않음
- **프로덕션 DB 변경** — 프로덕션은 이미 정상
- **레일즈 8.0 schema format 변경** — `:ruby` 유지

---

## 3. Scope

### In scope

#### Backend (Rails)
- `smart-quote-api/db/schema.rb` — 완전 재생성
- `spec/services/calculation_parity_spec.rb` — 외부 fixture 경로 깨짐 확인 및 처리
- 기타 spec 파일 — schema.rb 수정 후 풀 rspec 실행하여 잔여 실패 확인

#### Documentation
- `docs/01-plan/features/schema-drift-recovery.plan.md` (이 문서)
- `docs/02-design/features/schema-drift-recovery.design.md` — 복원 절차 상세 설계
- `docs/03-analysis/schema-drift-recovery.analysis.md` — Gap 분석
- `docs/04-report/features/schema-drift-recovery.report.md` — 완료 보고서

### Out of scope

- 새로운 데이터베이스 컬럼/테이블 추가
- 비즈니스 로직 변경
- Frontend 변경
- 프로덕션 DB 직접 조작 (이미 정상이므로)

---

## 4. Strategy

### A. Approach 평가

| # | 옵션 | Pros | Cons |
|---|-----|-----|-----|
| **A1** | `db:drop` → `db:create` → `db:migrate` → `db:schema:dump` (로컬 dev DB) | 재현 가능, 마이그레이션 기반 (single source of truth) | dev DB 데이터 손실, 테스트 시드 필요 |
| **A2** | `db:schema:dump` (현재 dev DB) | 빠름 | 현재 DB가 이미 패치된 상태 (수동 ALTER) — 정확하지 않을 수 있음 |
| **A3** | 프로덕션 DB에서 dump | 가장 정확 | 프로덕션 접근 권한, 보안 위험 |
| **A4** | git revert `bb93c45` 부분 + 매직링크 변경 재적용 | 깔끔 | 매직링크 schema.rb 변경 분리 어려움 |

**선택**: **A1 (clean rebuild from migrations)** — 가장 안전하고 재현 가능. 데이터 손실은 dev DB만이라 무관.

### B. 실행 단계

1. **백업**: 현재 dev DB의 사용자 데이터가 필요하면 export (예상: 불필요)
2. **clean rebuild**:
   ```bash
   cd smart-quote-api
   bin/rails db:drop
   bin/rails db:create
   bin/rails db:migrate
   ```
3. **schema dump 검증**: 새 `db/schema.rb`에 위 측정 가능한 목표의 모든 항목 포함 확인
4. **테스트 DB 재생성**: `RAILS_ENV=test bin/rails db:test:prepare`
5. **풀 rspec 실행**: `bundle exec rspec --exclude-pattern "spec/services/calculation_parity_spec.rb"`
6. **잔여 실패 분석**: 0이 아니면 개별 수정
7. **`calculation_parity_spec.rb` 처리**: 외부 fixture 경로 — fix or skip
8. **최종 verify**: 전체 spec 통과
9. **schema.rb 커밋**: clean dump로 프로덕션에 푸시 (DB는 변경 없음, 단지 dump 파일만)

### C. 위험 관리

| 리스크 | 영향 | 완화책 |
|------|-----|------|
| Dev DB 데이터 손실 | 개발자 로컬 데이터 사라짐 | 실행 전 백업 권유 (이번 case는 무관) |
| 새 schema.rb가 또 잘못됨 | 작업 무한 루프 | 각 컬럼을 측정 가능한 체크리스트로 검증 |
| 프로덕션 schema.rb 푸시 영향 | Render 자동 재배포 | 마이그레이션 변경 없으므로 schema dump만으로는 DB 변경 없음, Puma 재시작만 발생 |
| Phantom 마이그레이션 (5건) | 추적 안 됨 | 본 사이클 후 별도 task — 5개 누락 마이그레이션 파일 복원 또는 schema_migrations에서 제거 |

### D. 재발 방지 가드 (선택)

- [ ] CI에 `db:schema:load` → `bundle exec rspec` 단계 추가 (있다면)
- [ ] schema.rb 커밋 시 pre-commit hook으로 마이그레이션과 일치 검증
- [ ] 또는 docs/CONTRIBUTING.md에 "schema.rb는 항상 `bin/rails db:migrate`로 생성, 수동 편집 금지" 명시

---

## 5. Dependencies

- PostgreSQL dev/test 인스턴스 (이미 있음)
- 모든 마이그레이션 파일 정상 (이미 있음)
- 사용자 dev DB의 데이터 보존 필요성 확인 ← **사전 결정 필요**

---

## 6. Success Criteria

- [ ] `bundle exec rspec` 풀 통과 (현재 114 failures → 0 failures)
- [ ] `db/schema.rb` 검증:
  - [ ] `margin_rules` 테이블 존재 (NOT `discount_rules`)
  - [ ] `quotes` 테이블에 `margin_percent`, `profit_amount`, `profit_margin` 존재
  - [ ] `users` 테이블에 `networks jsonb` 존재
  - [ ] schema version: 최신 (2026_04_10_203543 또는 그 이후)
- [ ] `bin/rails db:schema:load` 정상 동작
- [ ] `bin/rubocop` 통과 (변경 없거나 신규 위반 0)
- [ ] 프로덕션 영향 없음 (마이그레이션 변경 없으므로)

---

## 7. Open Questions

1. **Dev DB 데이터 보존?** — 현재 로컬 DB의 데이터가 중요한가? 일반적으로 dev DB는 disposable.
2. **5개 phantom 마이그레이션 처리** — `20260309204856`, `20260403061820`, `20260403062214`, `20260406000001`, `20260406000002` 가 schema_migrations 테이블에 있지만 파일은 없음. 본 사이클에서 처리 vs 별도 cycle?
3. **CI 영향 확인** — GitHub Actions가 schema.rb를 사용하는지? `.github/workflows/` 점검 필요
4. **`calculation_parity_spec.rb` 외부 fixture** — 경로 수정 vs spec 자체 비활성화 vs skip annotation?
5. **재발 방지 가드** — 본 사이클에 포함 vs 별도 chore?

---

## 8. Next Phase

```bash
/pdca design schema-drift-recovery
```

design 단계에서:
- Open Questions 1-5 확정
- 정확한 명령 sequence 작성
- 잔여 실패 spec 케이스별 처리 방안
- CI 검증 단계 포함 여부 결정
