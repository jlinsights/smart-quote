# Save-Quote Planning Document

> **Summary**: Save Quote UX 개선 - 저장 후 피드백 강화, 중복 방지, 유효성 검증
>
> **Project**: Smart Quote System (Goodman GLS & J-Ways)
> **Version**: 2.1
> **Author**: Claude Code
> **Date**: 2026-02-24
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Save Quote 기능의 사용자 경험을 개선하여, 저장 후 reference number 피드백, 입력값 유효성 검증, 중복 저장 방지, 그리고 저장된 견적으로의 네비게이션을 지원한다.

### 1.2 Background

현재 Save Quote는 기본적인 저장 기능만 제공:
- **SaveQuoteButton**: 클릭 → notes 입력 → API 호출 → "Saved!" 2초 표시 → idle 복귀
- **문제점**:
  1. 저장 후 reference number(SQ-YYYY-NNNN)가 사용자에게 보이지 않음
  2. 저장 후 History 탭으로 이동하거나 상세 보기가 불가능
  3. 동일 입력값으로 중복 저장 가능 (실수로 여러 번 클릭)
  4. 필수 입력값(목적지 국가, items 등) 없이도 저장 시도 가능
  5. `onSaved` callback이 App.tsx에서 연결되지 않음
  6. 저장된 견적의 carrier 정보가 SaveQuoteButton에 전달되지 않음

### 1.3 Related Documents

- Architecture: `CLAUDE.md` (project root)
- API: `smart-quote-api/app/controllers/api/v1/quotes_controller.rb`
- History Feature: `docs/01-plan/features/quote-history.plan.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] 저장 후 reference number를 사용자에게 표시 (toast/inline)
- [ ] 저장 후 History 탭으로 이동 옵션 제공
- [ ] 중복 저장 방지 (동일 입력값 연속 저장 차단)
- [ ] 저장 전 필수 입력값 유효성 검증
- [ ] `onSaved` callback 활용하여 App 상태 업데이트
- [ ] carrier 정보 포함하여 저장 context 풍부화

### 2.2 Out of Scope

- Quote 편집/업데이트 기능 (현재 create-only)
- 다중 carrier 비교 결과 동시 저장
- 오프라인 저장 / 로컬 캐시
- 이메일/공유 기능

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 저장 성공 시 reference number(SQ-YYYY-NNNN) 표시 | High | Pending |
| FR-02 | 저장 성공 후 "View in History" 버튼 제공 | High | Pending |
| FR-03 | 필수 입력값 미입력 시 Save 버튼 비활성화 | High | Pending |
| FR-04 | 동일 입력값 연속 저장 시 확인 다이얼로그 | Medium | Pending |
| FR-05 | SaveQuoteButton에 result 정보 전달 (carrier 등) | Medium | Pending |
| FR-06 | 저장 성공 시 onSaved callback으로 History 탭 전환 지원 | Medium | Pending |
| FR-07 | Notes 입력 시 Enter 키 저장 + Escape 키 취소 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | Save API 응답 < 500ms | Network tab 측정 |
| UX | 저장 피드백 3초 이내 표시 | Manual testing |
| Accessibility | 키보드 네비게이션 완전 지원 | Tab/Enter/Escape 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 Functional Requirements 구현 완료
- [ ] 저장 후 reference number가 화면에 표시됨
- [ ] 중복 저장 방지 로직 동작 확인
- [ ] 유효성 검증으로 빈 견적 저장 차단 확인
- [ ] Unit 테스트 작성 및 통과
- [ ] tsc, ESLint, Vitest 모두 통과

### 4.2 Quality Criteria

- [ ] 기존 66개 테스트 유지 + 신규 테스트 추가
- [ ] Zero lint errors
- [ ] Build 성공 (`npm run build`)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API 응답에서 referenceNo 누락 | High | Low | Backend quote_detail() 이미 referenceNo 포함 확인됨 |
| 중복 방지 로직이 정상 입력도 차단 | Medium | Medium | 입력값 변경 시 중복 플래그 리셋 |
| onSaved callback이 History 전환에 영향 | Medium | Low | 선택적 전환 (버튼 클릭 시만) |
| Notes 입력 UX가 헤더 공간 부족 | Low | Medium | 모달 또는 드롭다운 방식으로 전환 가능 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, services layer | Web apps with backend | **X** |
| **Enterprise** | Strict layer separation, DI | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | React 19 + Vite 6 | React 19 | 기존 스택 유지 |
| State Management | useState + useMemo | useState | 단순한 로컬 상태로 충분 |
| API Client | fetch (quoteApi.ts) | fetch | 기존 패턴 유지 |
| Form Handling | Native | Native | notes 단일 필드만 존재 |
| Styling | Tailwind + jways palette | Tailwind | 기존 디자인 시스템 |
| Testing | Vitest + @testing-library/react | Vitest | 기존 테스트 인프라 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

주요 변경 파일:
┌─────────────────────────────────────────────────────┐
│ src/features/quote/components/SaveQuoteButton.tsx    │ ← 주요 개선 대상
│ src/App.tsx                                          │ ← onSaved callback 연결
│ src/api/quoteApi.ts                                  │ ← 반환값 활용 (이미 완비)
│ src/types.ts                                         │ ← 필요 시 validation 타입 추가
└─────────────────────────────────────────────────────┘

데이터 흐름:
SaveQuoteButton → saveQuote(input, notes)
                → POST /api/v1/quotes
                → QuoteDetail { referenceNo, id, ... }
                → UI 피드백 (ref no 표시)
                → onSaved(referenceNo) → App → History 탭 전환 (선택)
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists
- [ ] `CONVENTIONS.md` exists at project root
- [x] ESLint configuration (`.eslintrc.*`)
- [x] Prettier configuration (implicit via Vite)
- [x] TypeScript configuration (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | exists (camelCase TS, snake_case Rails) | 유지 | High |
| **Folder structure** | exists (features/quote/components/) | 유지 | High |
| **Import order** | exists (@/ alias) | 유지 | Medium |
| **Environment variables** | exists (VITE_API_URL) | 추가 없음 | Medium |
| **Error handling** | exists (QuoteApiError class) | 유지 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `VITE_API_URL` | API endpoint | Client | 기존 |

추가 환경변수 불필요.

### 7.4 Pipeline Integration

해당 없음 (기존 프로젝트에 기능 추가).

---

## 8. Implementation Strategy

### 8.1 Phase 1: SaveQuoteButton 개선 (Core)

1. **Props 확장**: `result?: QuoteResult` 추가하여 carrier 정보 접근
2. **유효성 검증**: `input.items.length > 0 && input.destinationCountry` 체크
3. **저장 후 피드백**: `QuoteDetail.referenceNo` 를 "Saved! SQ-2026-0001" 형태로 표시
4. **onSaved callback**: `onSaved(referenceNo)` 형태로 확장

### 8.2 Phase 2: App.tsx 통합

1. **onSaved handler**: 저장 성공 시 History 탭 전환 옵션 제공
2. **result prop 전달**: `<SaveQuoteButton input={input} result={result} />`

### 8.3 Phase 3: 중복 방지

1. **lastSavedInput**: 마지막 저장된 입력값의 해시/JSON 비교
2. **연속 저장 시**: "Already saved. Save again?" 확인

### 8.4 Phase 4: UX 폴리시

1. **Escape 키**: notes 입력 취소
2. **Toast 스타일**: reference number 강조 표시
3. **"View in History" 링크**: 저장 후 3초 동안 표시

---

## 9. Next Steps

1. [ ] Write design document (`Save-Quote.design.md`)
2. [ ] Review and approval
3. [ ] Start implementation

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-24 | Initial draft | Claude Code |
