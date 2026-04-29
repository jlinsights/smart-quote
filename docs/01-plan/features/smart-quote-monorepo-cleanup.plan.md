---
template: plan
version: 1.2
description: smart-quote-main 내부의 smart-quote-api/ 사본 디렉토리 제거 및 standalone smart-quote-api 와의 drift 정리
feature: smart-quote-monorepo-cleanup
date: 2026-04-29
author: jhlim725
project: j-ways-smart-quote-system
version_value: 0.0.0
---

# smart-quote-monorepo-cleanup Planning Document

> **Summary**: smart-quote-main 안에 체크인된 smart-quote-api/ 사본 디렉토리를 제거하고, 양방향으로 누적된 drift 를 standalone smart-quote-api 로 일원화한다.
>
> **Project**: j-ways-smart-quote-system (smart-quote-main)
> **Version**: 0.0.0
> **Author**: jhlim725
> **Date**: 2026-04-29
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

매주 FSC 업데이트 시 `src/config/rates.ts` + `smart-quote-main/smart-quote-api/lib/constants/rates.rb` + standalone `smart-quote-api/lib/constants/rates.rb` 3곳을 동기화하느라 drift 가 누적되고 있다. SSoT 인프라(`FscRate` DB + `/api/v1/fsc/rates` + `useFscRates` 훅 + `FscRateWidget` admin UI)는 이미 완비되어 있으므로, 중복 사본 자체가 drift 의 원천이다. 이를 제거하여 운영 작업을 단일화한다.

### 1.2 Background

- 2026-04-27 FSC 업데이트 (a7ae894) 가 smart-quote-main 안의 사본 rates.rb 만 수정하고 standalone 에는 반영되지 않아 운영 환경 backend 가 stale (47.50/47.75) 상태로 1주일 노출됨.
- 2026-04-29 점검 결과 rates.rb 이외에도 `db/migrate/20260423061200_fix_interblue_margin_to_zero.rb`, controllers, tariffs, specs, storage/tariffs 등 다수 파일이 monorepo 사본에만 존재하고, 반대로 `chat_prompts_service.rb`, `lib/prompts/`, `fedex_tariff.rb`, `config/data/` 등은 standalone 에만 존재한다.
- Memory `project_smart_quote_backend_sync_pending` (2026-04-27) 에 "sync 대기" 항목이 명시되어 있으나 실 sync 가 진행되지 않은 채 새 drift 가 추가됨.
- 매주 월요일 정기 작업의 risk 를 영구히 제거하려면 인프라 정리가 필요.

### 1.3 Related Documents

- 직전 commit: `1dd4527` (smart-quote-api/main, FSC fallback sync), `3c23a7c` (smart-quote-main/main, doc sync)
- Memory: `project_smart_quote_backend_sync_pending`
- 운영 가이드: `smart-quote-main/CLAUDE.md` § "FSC 업데이트 주기"

---

## 2. Scope

### 2.1 In Scope

- [ ] smart-quote-main 과 standalone smart-quote-api 간 drift 전수 inventory (file-level + content-level)
- [ ] 각 drift 에 대해 행동 결정: **push-forward** (사본 → standalone), **pull-back** (standalone → 사본 폐기 전 보존 불필요), **discard** (양쪽 다 폐기)
- [ ] 결정에 따라 standalone 에 commit + push (Render 자동 배포 트리거)
- [ ] `smart-quote-main/smart-quote-api/` 디렉토리 git rm 으로 제거
- [ ] smart-quote-main `.gitignore` 에 `smart-quote-api/` 추가하여 재체크인 방지
- [ ] smart-quote-main `CLAUDE.md` 의 "FSC 업데이트 주기" 섹션을 Admin UI 워크플로우로 재작성
- [ ] smart-quote-main `CLAUDE.md` § Deployment 의 `git subtree push` 가이드 제거 (사본이 사라지므로 불필요)
- [ ] standalone smart-quote-api `CLAUDE.md` 가 있다면 동일 갱신
- [ ] `docs/USER_GUIDE_ADMIN.md` § FSC Rate 섹션이 Admin Widget 사용을 명시하는지 확인 후 보완
- [ ] CI 양쪽 green 확인 (smart-quote-main: vitest 1316 + tsc + lint, standalone: rubocop + rspec)

### 2.2 Out of Scope

- 실제 monorepo 통합 (smart-quote-main + smart-quote-api 단일 repo 화) — 별도 사이클로 분리
- 새로운 FSC API 기능 추가 (cron 자동 fetch, 외부 source 연동 등)
- backend 기능 변경 (refactoring 두 commit 자체는 standalone 에 이미 반영됨, 수정 불필요)
- 프론트 `rates.ts` fallback 값 정책 변경 (분기 단위 갱신 정책 유지)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | smart-quote-main 의 사본 디렉토리 (`smart-quote-api/`) 가 git tracked 상태에서 완전히 제거된다 | High | Pending |
| FR-02 | 사본에만 존재하던 변경사항 중 운영에 필요한 것은 standalone smart-quote-api main 에 commit + push 된다 | High | Pending |
| FR-03 | 매주 FSC 업데이트는 Admin UI (`/admin` → FscRateWidget) 1-click 으로 끝난다 | High | Pending |
| FR-04 | smart-quote-main `CLAUDE.md` 의 운영 가이드가 새 워크플로우와 일치한다 | High | Pending |
| FR-05 | smart-quote-main `.gitignore` 가 `smart-quote-api/` 를 ignore 처리하여 실수로 재체크인되지 않는다 | Medium | Pending |
| FR-06 | smart-quote-main vitest/tsc/lint CI 가 green 으로 유지된다 | High | Pending |
| FR-07 | standalone smart-quote-api rubocop/rspec CI 가 green 으로 유지된다 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Operational risk | 매주 FSC 업데이트 미스 sync 0 건 | 1개월 후 retro |
| Repository hygiene | smart-quote-main 의 binary/log/cache 추적 0 건 | `git ls-files smart-quote-api/` empty 확인 |
| Reversibility | 모든 변경이 git history 에 보존되어 revert 가능 | `git log --follow` 로 검증 |
| Documentation accuracy | CLAUDE.md FSC 워크플로우와 실제 운영 절차가 1:1 일치 | Manual review |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `find smart-quote-main -name "smart-quote-api" -type d` → 결과 없음
- [ ] `git ls-files smart-quote-api/` (smart-quote-main 안에서) → empty
- [ ] standalone smart-quote-api 가 사본 단독으로 가지고 있던 운영 필요 변경분을 모두 보유
- [ ] smart-quote-main `CLAUDE.md` 의 "FSC 업데이트 주기" 섹션이 Admin UI 워크플로우만 명시
- [ ] smart-quote-main npm run build / lint / test 모두 통과
- [ ] standalone bundle exec rspec / rubocop 모두 통과
- [ ] 다음 주 월요일(2026-05-04) FSC 업데이트가 Admin UI 만으로 완료되는 dry-run 기록

### 4.2 Quality Criteria

- [ ] 양쪽 CI green
- [ ] PR review 1건 이상 (single-author 환경이므로 self-review 체크리스트 통과)
- [ ] commit history 가 변경 의도(push-forward / discard / cleanup) 별로 분리되어 추적 가능

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 사본 단독 변경분이 standalone 에 반영되지 않은 채 디렉토리가 삭제되어 운영 중 재현되지 않는 버그 발생 | High | Medium | Step 1 의 drift inventory 표를 사용자가 1건씩 검토 + 결정 후 진행. 사본 디렉토리 삭제는 inventory 100% 처리 후로 미룸. |
| standalone 에만 존재하는 파일(`chat_prompts_service.rb`, `lib/prompts/`, `fedex_tariff.rb`)이 사본 환경에서 이미 사용되고 있어 사본 삭제 시 누락 발생 | Medium | Low | 사본은 `smart-quote-main` 의 frontend 빌드/테스트와 무관(별도 Rails app). 삭제 영향은 `git subtree push` 워크플로우 한정. 단, `bin/rails server` 로컬 실행을 사본 디렉토리에서 하던 습관이 있다면 사용자가 standalone 으로 전환 필요. |
| `git rm -r smart-quote-api/` 가 의도하지 않은 .git 메타파일이나 외부 reference 를 끊음 | Medium | Low | 사본 디렉토리 자체에 .git 이 없는지 사전 확인 (`ls -la smart-quote-main/smart-quote-api/.git` empty 검증). submodule 등록 여부도 `.gitmodules` 확인. |
| Render 자동 배포가 standalone push 와 동시에 트리거되어 운영 중 일시 5xx | Low | Low | push 는 평일 업무 시간 외에. 또는 Render 의 manual deploy 옵션 활용. |
| Memory 의 "리팩토링 2 commit sync 대기" 라는 기록이 실제 standalone 에 이미 push 된 것을 가리키는데(818d7fb, 7f95fd5) 사용자가 이를 미인지하고 추가 작업을 지시할 위험 | Low | Medium | inventory 단계에서 standalone HEAD vs origin/main 비교 + 사본 main vs standalone main 의 비-FSC 차이 표를 명시. |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation | High-traffic systems | ☐ |

기존 smart-quote-main 은 Dynamic level (features/, services/, contexts/ 분리). 본 작업은 인프라 정리이므로 level 변경 없음.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Repo 토폴로지 | (a) 현재 분리 유지 + 사본 제거 / (b) 진짜 monorepo 통합 | **(a)** | 통합은 별도 사이클. 본 작업은 즉시 효과 + 최소 risk. |
| FSC SSoT | (a) FscRate DB / (b) rates.rb / (c) rates.ts | **(a)** | 이미 인프라 완비. fallback 만 코드 상수. |
| 사본 제거 방식 | (a) `git rm -r` / (b) `git mv` 후 추적 끊기 / (c) `.gitignore` + history 보존 | **(a) + .gitignore 추가** | 단순, 명확. history 는 git log 로 영구 보존. |
| 미반영 변경 처리 | (a) 사본의 변경 standalone 에 cherry-pick / (b) 단순 파일 복사 후 신규 commit | **결정 보류 — Design 단계에서 inventory 기반 결정** | 변경량 따라 다름. |

### 6.3 Clean Architecture Approach

본 작업은 코드 구조 변경 없음. 단, 운영 인프라 측면에서:

```
변경 전:
┌─────────────────┐         ┌──────────────────┐
│ smart-quote-main│         │ smart-quote-api  │
│  src/           │   ←→    │  lib/constants/  │
│  smart-quote-api│ (drift) │  app/            │
│  └── lib/...    │         │  ...             │
└─────────────────┘         └──────────────────┘

변경 후:
┌─────────────────┐         ┌──────────────────┐
│ smart-quote-main│  fetch  │ smart-quote-api  │
│  src/           │  ────→  │  (sole canonical) │
│  (no copy)      │  /api/v1│                  │
└─────────────────┘  /fsc   └──────────────────┘
                              ▲
                              │ Admin UI POST
                       ┌──────┴───────┐
                       │ FscRateWidget │
                       └───────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section (smart-quote-main, standalone 양쪽)
- [ ] `docs/01-plan/conventions.md` exists — N/A (Pipeline phase 2 미사용)
- [ ] `CONVENTIONS.md` exists at project root — 없음
- [x] ESLint configuration (`.eslintrc.*`) — smart-quote-main: package.json eslintConfig
- [x] Prettier configuration — `.prettierrc`
- [x] TypeScript configuration — `tsconfig.json`

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **FSC 운영 워크플로우** | 코드 수정 → git push → 배포 (drift 위험) | Admin UI → DB 갱신 (1-click) | High |
| **Cross-repo sync** | manual git subtree push (a7ae894 같은 누락 발생) | 사본 제거로 sync 자체가 불필요 | High |
| **rates.ts/rates.rb fallback 정책** | 매주 갱신 (불필요) | 분기 1회 또는 큰 변동 시 | Medium |

### 7.3 Environment Variables Needed

본 작업은 환경 변수 추가 없음. 기존 `VITE_API_URL` 만으로 SSoT 동작.

### 7.4 Pipeline Integration

9-phase Pipeline 미사용 프로젝트. Pipeline phase 점검 항목 N/A.

---

## 8. Next Steps

1. [ ] 사용자 승인 후 `/pdca design smart-quote-monorepo-cleanup` 실행
2. [ ] Design 단계에서 drift inventory 표 작성 (file-by-file 결정)
3. [ ] inventory 사용자 검토 + 행동 결정 confirm
4. [ ] `/pdca do smart-quote-monorepo-cleanup` 으로 실행: standalone push-forward → 사본 git rm → .gitignore 갱신 → CLAUDE.md 갱신
5. [ ] `/pdca analyze smart-quote-monorepo-cleanup` 으로 DoD 검증
6. [ ] 다음 주 월요일 FSC 업데이트 dry-run 으로 워크플로우 확정

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-29 | Initial draft — drift inventory + 사본 제거 + Admin UI 워크플로우 정착 계획 | jhlim725 |
