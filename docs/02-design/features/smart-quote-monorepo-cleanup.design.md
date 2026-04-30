---
template: design
version: 1.2
description: smart-quote-main 안의 smart-quote-api/ 사본 디렉토리 제거 및 양방향 drift 정리 설계
feature: smart-quote-monorepo-cleanup
date: 2026-04-30
author: jhlim725
project: j-ways-smart-quote-system (smart-quote-main)
version_value: 0.2.0
---

# smart-quote-monorepo-cleanup Design Document

> **Summary**: drift 전수 inventory 표 + 각 항목별 행동 결정(push-forward / discard / cleanup) 매트릭스를 확정하고, 실행 순서·검증 절차·rollback 절차를 정의한다.
>
> **Project**: j-ways-smart-quote-system (smart-quote-main) + smart-quote-api (standalone)
> **Version**: 0.0.0
> **Author**: jhlim725
> **Date**: 2026-04-29
> **Status**: Draft
> **Planning Doc**: [smart-quote-monorepo-cleanup.plan.md](../../01-plan/features/smart-quote-monorepo-cleanup.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 사본 디렉토리에만 존재하는 **운영 가치가 있는 변경**(보안 강화·migration·validation)을 standalone smart-quote-api 로 손실 없이 이전한다.
2. standalone 에서 진행된 **LLM context refactor**(7f95fd5, 818d7fb) 결과를 canonical 로 인정하고, 사본의 구버전을 폐기한다.
3. 사본 디렉토리에 잘못 추적되어 온 **빌드 산출물**(vendor/bundle 1000+ 파일, log) 을 git history 에서 분리하고, 재발을 방지한다.
4. 매주 FSC 운영 작업이 **Admin UI 1-click** 만으로 끝나도록 문서·인프라를 정착시킨다.

### 1.2 Design Principles

- **Reversibility first**: 사본 디렉토리 삭제 commit 은 단일 commit + 명확한 message 로 분리. 필요 시 revert 1회로 복구.
- **Stage before destroy**: standalone 에 모든 push-forward 변경이 commit + push + Render 배포 + smoke test 통과한 뒤에야 사본 삭제.
- **Single concern per commit**: refresh-token-rotation, fsc-validation, migration, 사본-제거 각각 별도 commit.
- **Audit before delete**: 빌드 산출물 (vendor/bundle 등) 도 git log 에 보존되어 archeology 가능.

---

## 2. Architecture (Operational Layout)

### 2.1 Current State

```
smart-quote-main/  (git: jlinsights/smart-quote)
├── src/                              # Frontend (canonical)
└── smart-quote-api/                  # 9245 tracked files — REMOVAL TARGET
    ├── lib/constants/rates.rb        # 사본 rates (이미 standalone 에 sync 완료)
    ├── app/controllers/.../auth_controller.rb  # 사본 = refresh rotation 포함
    ├── db/migrate/20260423061200_*.rb          # 사본 only
    ├── vendor/bundle/                # ❌ 1000+ gem files 추적 중
    ├── log/test.log                  # ❌ 추적 중
    └── ...

smart-quote-api/  (git: jlinsights/smart-quote-api, separate repo)
├── lib/constants/rates.rb            # FSC 1dd4527 sync 완료
├── app/controllers/.../auth_controller.rb  # ❌ refresh rotation 누락
├── app/services/chat_prompts_service.rb    # standalone only (canonical)
├── lib/prompts/                      # standalone only (canonical)
└── ...
```

### 2.2 Target State

```
smart-quote-main/
├── src/                              # Frontend (canonical)
├── .gitignore                        # smart-quote-api/ 추가됨
└── (no smart-quote-api/ directory)

smart-quote-api/
├── (모든 운영 가치 변경 흡수 완료)
├── app/controllers/.../auth_controller.rb  # ✅ refresh rotation 통합
├── app/controllers/.../fsc_controller.rb   # ✅ parse_rate validation 통합
├── db/migrate/20260423061200_*.rb          # ✅ 통합
└── ...
```

### 2.3 FSC Operational Flow (Target)

```
매주 월요일:
  Admin → /admin → FscRateWidget → 새 FSC 입력 (1-click)
                          ↓
                  POST /api/v1/fsc/update
                          ↓
                  FscRate DB 갱신
                          ↓
   useFscRates 훅이 다음 fetch 부터 새 값 표시 (자동)

분기 1회 (또는 큰 변동 시):
  jaehong (개발자) → src/config/rates.ts + smart-quote-api/lib/constants/rates.rb
                    의 fallback default 값 갱신 → 양쪽 commit + push
```

---

## 3. Drift Inventory & Decision Matrix

> **읽는 법**: 각 항목은 (1) 사본의 상태, (2) standalone 의 상태, (3) 추천 행동, (4) 행동 시 위험·검증 절차로 구성. 사용자가 "행동" 컬럼을 한 번 검토 후 confirm 하면 Do 단계로 진행.

### 3.1 Push-Forward (사본 → standalone) — 운영 가치 있는 변경

| ID | 파일 | 사본 상태 | standalone 상태 | 추천 행동 | 검증 |
|----|------|---------|----------------|----------|------|
| **PF-1** | `app/controllers/api/v1/auth_controller.rb` | `POST /auth/refresh` 가 새 access + 회전된 refresh token 반환 (RFC 9700 BCP) | refresh token 회전 없음, access token 만 반환 | **PUSH** — 사본 내용으로 standalone 갱신 | rspec auth_spec.rb 5개 신규 케이스 통과, login + refresh 수동 dry-run |
| **PF-2** | `spec/requests/api/v1/auth_spec.rb` | refresh token rotation describe 블록 (5 케이스, 55줄) | 해당 describe 없음 | **PUSH** — 사본 내용으로 standalone 갱신 | 위 PF-1 과 함께 commit |
| **PF-3** | `app/controllers/api/v1/fsc_controller.rb` | `parse_rate()` private method 로 explicit numeric validation, nil 허용 안 함, ActiveRecord 예외 narrow rescue | `params[:international]&.to_f` 로 silent nil → 0.0 coercion 가능 + StandardError broad rescue | **PUSH** — 사본 내용으로 standalone 갱신 | rspec fsc spec 추가/통과, POST /fsc/update 로 invalid rate (`"abc"`, `-1`, `101`, 빈 문자열) 4xx 응답 확인 |
| **PF-4** | `db/migrate/20260423061200_fix_interblue_margin_to_zero.rb` | 존재 (Interblue margin 0 수정 migration) | 없음 | **PUSH** — 파일 복사 후 commit. Render 배포 시 `bin/rails db:migrate` 자동 실행 | migration 후 `MarginRule.find_by(...)` 값 검증, 운영 DB 백업 후 적용 |

**소계**: 4건 push-forward, 모두 보안 또는 데이터 정합성 개선. 단일 PR 묶음 권장.

### 3.2 Discard Copy (standalone 우월 — 사본은 단순 폐기)

| ID | 파일 / 디렉토리 | 사본 상태 | standalone 상태 | 추천 행동 | 위험 |
|----|---------------|---------|----------------|----------|------|
| **DC-1** | `app/controllers/api/v1/chat_controller.rb` | system_prompt 를 controller 내 inline 정의 (191 줄 영문 prompt) | `ChatPromptsService.build_system_prompt(current_user)` 호출로 외부화 | **DISCARD copy** — standalone 채택 | 단, 사본의 영문 prompt 내용 (incoterms, EAS/RAS, surcharge 등) 이 standalone `ChatPromptsService` / `lib/prompts/` 에 누락 없이 옮겨졌는지 **Do 단계 spot-check** 필요 |
| **DC-2** | `app/services/chat_prompts_service.rb` | 없음 | 존재 (DC-1 의 외부화 결과) | **standalone 유지** — 행동 없음 | — |
| **DC-3** | `lib/prompts/` | 없음 | 존재 (chat prompt YAML/text) | **standalone 유지** — 행동 없음 | — |
| **DC-4** | `lib/constants/dhl_tariff.rb` | inline `DHL_EXACT_RATES` Hash (~500줄) | `require 'yaml'` + YAML load (8줄 본체) | **DISCARD copy** — standalone 채택 | YAML 파일에 사본 hash 와 동일한 rate 값이 들어있는지 **Do 단계 spot-check** (랜덤 5개 zone × weight) |
| **DC-5** | `lib/constants/ups_tariff.rb` | inline `UPS_EXACT_RATES` Hash (~430줄) | `require 'yaml'` + YAML load | **DISCARD copy** — standalone 채택 | DC-4 와 동일 검증 |
| **DC-6** | `lib/constants/fedex_tariff.rb` | 없음 | 존재 (standalone 신규 추가, FedEx 대비?) | **standalone 유지** — 행동 없음 | smart-quote-main frontend 에 FedEx 호출 코드 없음. 미래 활성화용 dormant code. |
| **DC-7** | `config/data/` | 없음 | 존재 (DC-4·DC-5 의 YAML 데이터) | **standalone 유지** — 행동 없음 | — |
| **DC-8** | `db/seeds/margin_rules.rb` | 비-idempotent (`return if MarginRule.exists?` + `MarginRule.create!`), `created_by` 누락 | idempotent (`rules = [...]` + per-rule upsert), 모든 rule 에 `created_by: "system"` | **DISCARD copy** — standalone 채택 | seed re-run 시 중복 발생 여부 staging 에서 확인 |

**소계**: 8건 discard, 모두 standalone 의 LLM context refactor (7f95fd5, 818d7fb) 결과. 별도 commit 불필요 — 사본 디렉토리 삭제 시 자연스럽게 정리됨.

### 3.3 Cleanup (빌드 산출물 / 메타)

| ID | 경로 | 추적 상태 | 추천 행동 | 비고 |
|----|------|---------|----------|------|
| **CL-1** | `smart-quote-api/vendor/bundle/` | 1000+ gem 파일 tracked | **DELETE** | smart-quote-api/.gitignore 에 `/vendor/bundle` 있으나 monorepo 의 git 이 그 .gitignore 를 무시하고 추적 중. 디렉토리 삭제로 자동 해결. |
| **CL-2** | `smart-quote-api/log/test.log` | tracked | **DELETE** | 빌드 산출물. 사본 디렉토리와 함께 정리. |
| **CL-3** | `smart-quote-api/storage/tariffs/` | tracked (디렉토리만 사본, **운영 데이터 / Active Storage 업로드**) | **MIGRATE → DELETE** | 사용자 확인 결과 **운영 데이터**. Step C 진입 전 별도 마이그레이션 단계 필요: (1) standalone Render persistent disk 또는 S3 로 동일 파일 set 복제 (2) Active Storage attachment 무결성 검증 (3) 그 후에야 사본 디렉토리 삭제 가능. 마이그레이션 절차는 Step C 시작 전 별도 design addendum 으로 확정. |
| **CL-4** | `smart-quote-api/.commit_message.txt` | meta-only | **DELETE** | 사본 디렉토리와 함께 정리. |
| **CL-5** | `smart-quote-api/` 디렉토리 자체 | tracked | **DELETE (`git rm -r`)** | 모든 PF + DC + CL 처리 완료 후 단일 commit. |
| **CL-6** | `smart-quote-main/.gitignore` | — | **ADD** `smart-quote-api/` | 향후 실수 재체크인 방지. CL-5 와 동일 commit 또는 직후 commit. |

**소계**: 6건 cleanup, 디렉토리 삭제 1회 + .gitignore 추가 1회로 일괄 처리.

### 3.4 Documentation Update

| ID | 파일 | 변경 내용 |
|----|------|---------|
| **DOC-1** | `smart-quote-main/CLAUDE.md` § "FSC 업데이트 주기" | "매주 월요일. rates.ts + rates.rb 동시 수정 후 Vercel+Render 배포" → "매주 월요일. **/admin → FscRateWidget 에서 1-click 갱신** (DB 즉시 반영). rates.ts/rates.rb fallback 은 분기 1회 또는 큰 변동 시만 갱신." |
| **DOC-2** | `smart-quote-main/CLAUDE.md` § "Deployment" | `git subtree push --prefix=smart-quote-api api-deploy main` 가이드 제거 (사본 없음 → subtree 불가) |
| **DOC-3** | `smart-quote-main/CLAUDE.md` § "Backend (Rails 8 API-only - from smart-quote-api/)" | 경로 표기 수정: standalone repo (`~/Developer/Projects/smart-quote-api`) 로 cd 해야 함을 명시 |
| **DOC-4** | `smart-quote-main/docs/USER_GUIDE_ADMIN.md` § FSC | (있다면) Admin Widget 사용 절차 명시 — 캡쳐 + 절차 |
| **DOC-5** | (선택) `smart-quote-api/README.md` | standalone repo 임을 명확히, 매주 FSC 운영 절차를 문서화 |

---

## 4. Execution Plan (Do Phase Preview)

### 4.1 Sequenced Steps

```
Step A — standalone smart-quote-api 보강 (PF-1 ~ PF-4)
   A1. PF-1 + PF-2: auth_controller refresh rotation + spec 파일 복사 → commit "feat(auth): refresh token rotation (RFC 9700 BCP)"
   A2. PF-3: fsc_controller parse_rate validation 파일 복사 → commit "fix(fsc): explicit rate validation prevents silent nil→0 coercion"
   A3. PF-4: migration 파일 복사 → commit "fix(db): migration to zero out interblue margin"
   A4. bundle exec rspec → green 확인
   A5. bin/rubocop → green 확인
   A6. git push origin main → Render 자동 배포
   A7. 운영 smoke test: /api/v1/auth/login + /auth/refresh + /api/v1/fsc/update with invalid rate

Step B — standalone DC 검증 (Do 단계 spot-check)
   B1. DC-1: 사본의 chat_controller inline prompt 와 standalone ChatPromptsService 의 system prompt 를 diff. 누락 항목 있으면 ChatPromptsService 에 추가 commit.
   B2. DC-4: 사본 dhl_tariff.rb 의 Z1×0.5kg = 53466, Z3×5kg, Z5×10kg, Z7×15kg, Z8×20kg 값과 standalone YAML load 결과 비교. 불일치 시 YAML 갱신.
   B3. DC-5: 사본 ups_tariff.rb 의 Z1×0.5kg = 50996, Z3×5kg, Z5×10kg, Z6×15kg, Z10×20kg 값과 standalone YAML load 결과 비교. 불일치 시 YAML 갱신.
   B4. DC-8: staging 에서 seed re-run, 중복 없음 확인.
   B5. (B1 또는 B2/B3 갱신 발생 시) Step A6 재push.

Step C — smart-quote-main 사본 디렉토리 제거 (CL-1 ~ CL-6)
   C1. cd smart-quote-main && git rm -r smart-quote-api/
   C2. echo "smart-quote-api/" >> .gitignore
   C3. commit "chore: remove smart-quote-api/ subdirectory copy (monorepo cleanup)"
   C4. npm run lint && npm run test -- --run && npx tsc --noEmit (smart-quote-main 자체 영향 없음 확인 — 사본 import 없을 것)

Step D — 문서 갱신 (DOC-1 ~ DOC-3)
   D1. CLAUDE.md FSC 워크플로우 + Deployment + Backend 경로 갱신
   D2. (있다면) USER_GUIDE_ADMIN.md 갱신
   D3. commit "docs: update FSC workflow to admin UI + remove subtree push guide"

Step E — 검증 + 배포
   E1. smart-quote-main: git push origin main → Vercel 자동 배포
   E2. 운영 dashboard 진입 → Admin 으로 로그인 → FscRateWidget 표시 확인
   E3. FscRateWidget 에서 dummy rate 입력 → 다른 브라우저 탭에서 useFscRates 갱신 확인 → 원래 값 복구
   E4. 다음 월요일(2026-05-04) 실제 FSC 업데이트 dry-run

Step F — Memory 갱신
   F1. project_smart_quote_backend_sync_pending 메모리 삭제 또는 "resolved" 표시
   F2. 신규 메모리: Admin UI FSC workflow / 사본 제거 완료 기록
```

### 4.2 Rollback Procedure

| 단계 실패 | Rollback |
|----------|---------|
| Step A6 push 후 운영 5xx | `git revert <auth/fsc/migration commits>` → push → Render 재배포 |
| Step A7 smoke test 실패 | revert 후 issue 재현 환경 만들고 디버그 |
| Step C3 후 frontend build 실패 | `git revert HEAD` (사본 복구), 의존 import 디버그 |
| Step E3 FscRateWidget 미표시 | DOC 갱신만 revert, 사본 제거 commit 유지 (별도 frontend 디버그) |

### 4.3 Risk-Adjusted Sequence

- Step A 와 Step C 는 **물리적으로 분리**되어야 한다. Step A 의 운영 검증이 24시간 이상 안정 후 Step C 진행 권장. 단일 세션에서 모두 처리하지 않음.
- Step B (spot-check) 가 누락 발견하면 Step C 를 보류. spot-check 가 가장 큰 잠재 risk 회피 지점.

---

## 5. Verification Checklist (Pre-Do)

사용자가 아래 모든 항목에 OK 한 뒤에야 Do 단계 진입:

- [ ] **3.1 Push-Forward 4건** 모두 standalone 으로 이전 동의
- [ ] **3.2 Discard 8건** 모두 standalone 우선 동의 (특히 chat_controller·tariff·seeds)
- [ ] **3.3 Cleanup 6건** 모두 삭제 동의 (특히 `storage/tariffs/` 가 운영 데이터인지 사용자 확인)
- [ ] **3.4 DOC** 5건 갱신 동의
- [ ] **4.1 Sequenced Steps** A → B → C → D → E → F 순서 동의
- [ ] **Step A 와 Step C 사이 24시간 검증 간격** 동의 (또는 같은 세션 진행 명시 동의)
- [ ] standalone smart-quote-api 의 origin remote (`https://github.com/jlinsights/smart-quote-api`) 와 사용자가 push 권한을 가진 것 확인
- [ ] Render 배포 일정 (업무 시간 외 권장) 합의

---

## 6. Open Questions — RESOLVED (2026-04-30)

| # | 질문 | 사용자 답변 (2026-04-30) | 영향 |
|---|------|--------------------------|------|
| 1 | CL-3 `storage/tariffs/` 의 정체 | **운영 데이터** (Active Storage 업로드) | CL-3 처리 변경: DELETE → **MIGRATE then DELETE**. Step C 시작 전 별도 마이그레이션 단계 필요 (3.3 CL-3 갱신 반영) |
| 2 | PF-4 migration 운영 적용 시점 | **Render 자동 적용 OK** | Step A6 push 시 Render 가 `bin/rails db:migrate` 자동 실행. 별도 maintenance window 불필요 |
| 3 | Step A↔C 24시간 간격 | **분리 진행** (24h 간격) | Step A 오늘 진행, Step B(spot-check) + C(사본 제거) 는 24h 후 별도 세션 |
| 4 | DOC-5 standalone README 갱신 범위 | **전부 갱신** | DOC-5 적용 범위: standalone README.md 전체 + 매주 FSC 운영 절차 + monorepo cleanup 결과 반영 |

### 6.1 CL-3 마이그레이션 절차 (Step C 시작 전 확정 필요)

운영 데이터 결정에 따라 단순 git rm 불가. Step C 시작 전 다음 옵션 중 하나로 마이그레이션 계획 확정:

- **옵션 A — Render persistent disk**: standalone Render 인스턴스에 persistent disk 마운트 후 `storage/tariffs/` 동기화. 가장 간단하지만 Render disk 비용·재배포 시 보존 정책 확인 필요.
- **옵션 B — S3 (또는 Cloudflare R2)**: Active Storage service 를 `:amazon` 으로 전환, 기존 파일을 `bin/rails active_storage:migrate` 같은 절차로 이전. 장기 운영에 가장 안정적이지만 설정·비용 증가.
- **옵션 C — git LFS**: 파일이 정적·소량이면 standalone repo 자체에 LFS 로 옮겨도 가능. 단, git 이력에 운영 데이터 영구 추적되는 단점.

→ Step C 24h 후 세션 시작 시 사용자에게 옵션 제시 + 결정 받은 뒤 마이그레이션 절차를 design addendum 으로 추가 확정한 뒤 Step C 진행.

---

## 7. Definition of Done (Design Phase)

- [x] drift inventory 표 작성 (3.1 + 3.2 + 3.3)
- [x] 각 항목 추천 행동 명시
- [x] 실행 순서 (4.1 Sequenced Steps) 명시
- [x] Rollback 절차 (4.2) 명시
- [x] 사용자 검증 checklist (5)
- [x] Open Questions 정리 (6) — **RESOLVED 2026-04-30**
- [x] 사용자 confirm — Open Questions 답변 완료 + Pre-Do checklist 동의 → Do 진입 (Step A 시작)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-29 | Initial draft — drift inventory 18건 (PF 4 + DC 8 + CL 6) + 6-step 실행 계획 + rollback + 4개 open question | jhlim725 |
| 0.2 | 2026-04-30 | Open Questions 4건 RESOLVED — Q1 운영데이터 → CL-3 MIGRATE then DELETE 로 처리방식 변경 (3.3 갱신 + 6.1 마이그레이션 옵션 추가). Q2 Render 자동 OK. Q3 24h 분리. Q4 README 전부. Step A 오늘 진입. | jhlim725 |
