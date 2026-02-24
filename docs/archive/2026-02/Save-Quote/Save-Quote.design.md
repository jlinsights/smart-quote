# Save-Quote Design Document

> **Summary**: Save Quote UX 개선 - 저장 후 ref no 피드백, 유효성 검증, 중복 방지, History 이동
>
> **Project**: Smart Quote System (Goodman GLS & J-Ways)
> **Version**: 2.1
> **Author**: Claude Code
> **Date**: 2026-02-24
> **Status**: Draft
> **Planning Doc**: [Save-Quote.plan.md](../../01-plan/features/Save-Quote.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A (기존 프로젝트) |
| Phase 2 | Coding Conventions | N/A (CLAUDE.md 참조) |
| Phase 3 | Mockup | N/A |
| Phase 4 | API Spec | N/A (기존 API 유지) |

---

## 1. Overview

### 1.1 Design Goals

1. 저장 성공 시 reference number(SQ-YYYY-NNNN) 즉시 피드백
2. 저장 후 History 탭으로 원클릭 이동 지원
3. 필수 입력값 없이 저장 시도 차단
4. 동일 입력값 연속 중복 저장 방지
5. 기존 API/백엔드 변경 없이 프론트엔드만 개선

### 1.2 Design Principles

- **최소 변경**: SaveQuoteButton.tsx 중심 수정, App.tsx 최소 연결
- **기존 패턴 유지**: QuoteApiError, useState 상태 패턴 그대로 활용
- **점진적 피드백**: idle → notes → saving → saved(ref no) → idle

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────┐
│  App.tsx                                         │
│  ┌───────────────────────────────────────────┐  │
│  │  <SaveQuoteButton                         │  │
│  │    input={input}                          │  │
│  │    result={result}           ← NEW prop   │  │
│  │    onSaved={(refNo) => {     ← ENHANCED   │  │
│  │      setCurrentView('history')            │  │
│  │    }}                                     │  │
│  │  />                                       │  │
│  └───────────────────────────────────────────┘  │
│                        │                         │
│                        ▼                         │
│  ┌───────────────────────────────────────────┐  │
│  │  quoteApi.saveQuote(input, notes)         │  │
│  │  → POST /api/v1/quotes                    │  │
│  │  → QuoteDetail { referenceNo, id, ... }   │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
[Save 클릭]
  → showNotes = true (notes 입력 UI 표시)
  → [Save 확인 클릭]
    → validateInput(input) — 실패 시 에러 표시
    → isDuplicate(input) — 중복 시 confirm 다이얼로그
    → setState('saving')
    → saveQuote(input, notes) → QuoteDetail
    → setState('saved'), savedRefNo = referenceNo
    → 3초 동안 "Saved! SQ-2026-0042" + "View →" 버튼 표시
    → [View 클릭] → onSaved(refNo) → History 탭 전환
    → 3초 후 자동으로 setState('idle')
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| SaveQuoteButton | quoteApi.saveQuote | API 호출 |
| SaveQuoteButton | types.QuoteInput | 입력 데이터 타입 |
| SaveQuoteButton | types.QuoteResult | carrier 등 결과 정보 |
| SaveQuoteButton | types.QuoteDetail | 저장 응답 (referenceNo) |
| App.tsx | SaveQuoteButton | 컴포넌트 렌더링 |
| App.tsx | NavigationTabs | History 탭 전환 |

---

## 3. Data Model

### 3.1 기존 타입 활용 (변경 없음)

```typescript
// 이미 존재하는 types.ts — 변경 불필요
interface QuoteDetail {
  id: number;
  referenceNo: string;  // ← 이 필드를 피드백에 사용
  status: QuoteStatus;
  notes: string | null;
  // ... (기존 필드 유지)
}
```

### 3.2 SaveQuoteButton Props 인터페이스 변경

```typescript
// 변경 전
interface Props {
  input: QuoteInput;
  onSaved?: () => void;
}

// 변경 후
interface Props {
  input: QuoteInput;
  result?: QuoteResult | null;   // NEW: carrier 등 결과 정보
  onSaved?: (referenceNo: string) => void;  // ENHANCED: ref no 전달
}
```

### 3.3 컴포넌트 내부 상태

```typescript
// 기존 상태 유지 + 확장
const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
const [showNotes, setShowNotes] = useState(false);
const [notes, setNotes] = useState('');

// NEW: 추가 상태
const [savedRefNo, setSavedRefNo] = useState<string | null>(null);
const [lastSavedHash, setLastSavedHash] = useState<string | null>(null);
```

---

## 4. API Specification

### 4.1 기존 API 유지 (백엔드 변경 없음)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/quotes | Calculate + Save | None |

### 4.2 Request/Response (기존 그대로)

**Request:**
```json
{
  "originCountry": "KR",
  "destinationCountry": "US",
  "destinationZip": "90001",
  "incoterm": "DAP",
  "packingType": "NONE",
  "items": [{ "id": "1", "width": 10, "length": 10, "height": 10, "weight": 1, "quantity": 1 }],
  "marginUSD": 50,
  "exchangeRate": 1300,
  "fscPercent": 10,
  "notes": "Customer: ABC Corp"
}
```

**Response (201 Created):**
```json
{
  "id": 42,
  "referenceNo": "SQ-2026-0042",
  "status": "draft",
  "notes": "Customer: ABC Corp",
  "createdAt": "2026-02-24T09:00:00Z",
  "totalQuoteAmount": 185000,
  "totalQuoteAmountUSD": 142.31,
  "breakdown": { ... }
}
```

**Error Responses:**
- `422 Unprocessable Entity`: Validation error (빈 items 등)

---

## 5. UI/UX Design

### 5.1 상태별 UI 레이아웃

#### State: idle (기본)
```
┌─────────────────────────┐
│ [💾 Save Quote]         │  ← 버튼 (회색 테두리)
└─────────────────────────┘
  * result 없거나 입력값 부족 시 disabled + tooltip
```

#### State: showNotes (notes 입력)
```
┌────────────────────────────────────────────────────┐
│ [📝 Add notes...     ] [Save] [Cancel]             │
└────────────────────────────────────────────────────┘
  * Enter → Save, Escape → Cancel
```

#### State: saving (로딩)
```
┌─────────────────────────┐
│ [⏳ Saving...]          │  ← disabled, 스피너
└─────────────────────────┘
```

#### State: saved (성공 — 3초 표시)
```
┌──────────────────────────────────────────────────┐
│ ✅ Saved! SQ-2026-0042  [View →]                 │
└──────────────────────────────────────────────────┘
  * 초록색 배경, ref no 강조
  * "View →" 클릭 시 History 탭 전환
  * 3초 후 idle로 복귀
```

#### State: error (실패)
```
┌─────────────────────────┐
│ ❌ Failed to save       │  ← 빨간색, 3초 후 idle
└─────────────────────────┘
```

### 5.2 유효성 검증 UI

```
Save 버튼 disabled 조건:
  - input.items.length === 0
  - input.destinationCountry === '' (빈 문자열)
  - result === null (계산 결과 없음)
  - state === 'saving'

Disabled 시 커서: not-allowed, opacity: 50%
Tooltip: "Enter cargo and destination first"
```

### 5.3 중복 저장 방지 UI

```
동일 입력값으로 재저장 시도 시:
  → window.confirm("This quote was already saved. Save again?")
  → OK → 저장 진행
  → Cancel → 취소

중복 판단 기준:
  JSON.stringify(input) 의 해시값 비교
  (input 변경 시 해시 리셋)
```

### 5.4 컴포넌트 목록

| Component | Location | Responsibility |
|-----------|----------|----------------|
| SaveQuoteButton | src/features/quote/components/SaveQuoteButton.tsx | 저장 버튼 + notes 입력 + 피드백 UI |
| App.tsx | src/App.tsx | onSaved 핸들러 + result prop 전달 |

---

## 6. Error Handling

### 6.1 에러 코드 정의

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 422 | Validation error | 필수 입력 누락 | "Failed to save" 표시 후 idle |
| 500 | Server error | 백엔드 오류 | "Failed to save" 표시 후 idle |
| Network | Fetch failed | 네트워크 끊김 | "Failed to save" 표시 후 idle |

### 6.2 에러 처리 패턴

```typescript
// 기존 패턴 유지
try {
  const detail = await saveQuote(input, notes || undefined);
  setSavedRefNo(detail.referenceNo);
  setState('saved');
  // ...
} catch {
  setState('error');
  setTimeout(() => setState('idle'), 3000);
}
```

---

## 7. Security Considerations

- [x] Input validation — 프론트엔드 유효성 검증 추가 (빈 items, 목적지 없음)
- [x] 백엔드 중복 검증 — 기존 Rails model validation 유지
- [x] XSS — notes 입력은 백엔드에서 sanitize
- [ ] Rate limiting — 현재 미적용 (내부 도구, 저위험)
- [x] HTTPS — 배포 환경에서 적용

---

## 8. Test Plan

### 8.1 테스트 범위

| Type | Target | Tool |
|------|--------|------|
| Unit Test | SaveQuoteButton 상태 전환 | Vitest + @testing-library/react |
| Unit Test | 유효성 검증 함수 | Vitest |
| Unit Test | 중복 해시 비교 | Vitest |

### 8.2 핵심 테스트 케이스

- [ ] Happy path: Save 클릭 → notes 입력 → 저장 성공 → ref no 표시
- [ ] Validation: items 빈 배열 → Save 버튼 disabled
- [ ] Validation: destinationCountry 빈 문자열 → Save 버튼 disabled
- [ ] Duplicate: 동일 input 연속 저장 → confirm 다이얼로그
- [ ] Error: API 실패 → "Failed to save" → 3초 후 idle
- [ ] Keyboard: notes 입력 중 Enter → 저장, Escape → 취소
- [ ] View link: "View →" 클릭 → onSaved(refNo) 호출

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | SaveQuoteButton UI | `src/features/quote/components/SaveQuoteButton.tsx` |
| **Application** | App.tsx 상태 관리 | `src/App.tsx` |
| **Domain** | Types (QuoteInput, QuoteDetail) | `src/types.ts` |
| **Infrastructure** | API client (saveQuote) | `src/api/quoteApi.ts` |

### 9.2 This Feature's Layer Assignment

| Component | Layer | Location | Changes |
|-----------|-------|----------|---------|
| SaveQuoteButton | Presentation | `src/features/quote/components/SaveQuoteButton.tsx` | Props 확장 + 상태 추가 + UI 개선 |
| App | Application | `src/App.tsx` | onSaved handler + result prop 전달 |
| types | Domain | `src/types.ts` | 변경 없음 |
| quoteApi | Infrastructure | `src/api/quoteApi.ts` | 변경 없음 |

---

## 10. Coding Convention Reference

### 10.1 프로젝트 컨벤션 적용

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `SaveQuoteButton` |
| Functions | camelCase | `handleSave`, `validateInput` |
| Constants | UPPER_SNAKE_CASE | N/A (이번 기능에서 없음) |
| Types | PascalCase | `QuoteDetail`, `Props` |
| Files | PascalCase.tsx | `SaveQuoteButton.tsx` |

### 10.2 Import Order (기존 패턴 유지)

```typescript
// 1. External libraries
import React, { useState } from 'react';
import { Save, Check, Loader2, ExternalLink } from 'lucide-react';

// 2. Internal imports
import { QuoteInput, QuoteResult, QuoteDetail } from '@/types';
import { saveQuote } from '@/api/quoteApi';
```

### 10.3 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase (SaveQuoteButton) |
| File organization | features/quote/components/ |
| State management | useState (로컬 상태) |
| Error handling | try/catch + setTimeout idle 복귀 |

---

## 11. Implementation Guide

### 11.1 File Structure (변경 대상)

```
src/
├── features/quote/components/
│   └── SaveQuoteButton.tsx    ← 주요 수정 대상
├── App.tsx                    ← onSaved + result prop 연결
├── api/
│   └── quoteApi.ts            ← 변경 없음
└── types.ts                   ← 변경 없음
```

### 11.2 Implementation Order

1. [ ] **SaveQuoteButton Props 확장**: `result` prop 추가, `onSaved` 시그니처 변경
2. [ ] **유효성 검증 로직**: `isValid` 계산 (items.length > 0, destinationCountry 등)
3. [ ] **저장 후 ref no 피드백**: `savedRefNo` 상태, saved 상태 UI 개선
4. [ ] **중복 방지 로직**: `lastSavedHash` 상태 + JSON.stringify 비교
5. [ ] **"View →" 버튼**: saved 상태에서 onSaved(refNo) 호출 링크
6. [ ] **App.tsx 통합**: result prop 전달 + onSaved → History 탭 전환
7. [ ] **키보드 지원**: Escape 키 → notes 취소
8. [ ] **테스트 작성**: 핵심 시나리오 테스트

### 11.3 코드 변경 상세

#### SaveQuoteButton.tsx 핵심 변경

```typescript
// Props 확장
interface Props {
  input: QuoteInput;
  result?: QuoteResult | null;
  onSaved?: (referenceNo: string) => void;
}

// 유효성 검증
const isValid = useMemo(() => {
  return input.items.length > 0
    && input.destinationCountry.trim() !== ''
    && result != null;
}, [input.items.length, input.destinationCountry, result]);

// 중복 방지
const inputHash = useMemo(() => JSON.stringify(input), [input]);

const handleSave = async () => {
  if (lastSavedHash === inputHash) {
    if (!confirm('This quote was already saved. Save again?')) return;
  }
  setState('saving');
  try {
    const detail = await saveQuote(input, notes || undefined);
    setSavedRefNo(detail.referenceNo);
    setLastSavedHash(inputHash);
    setState('saved');
    setShowNotes(false);
    setNotes('');
    setTimeout(() => { setState('idle'); setSavedRefNo(null); }, 4000);
  } catch {
    setState('error');
    setTimeout(() => setState('idle'), 3000);
  }
};
```

#### App.tsx 핵심 변경

```tsx
// onSaved 핸들러
const handleQuoteSaved = (referenceNo: string) => {
  setCurrentView('history');
};

// 기존 SaveQuoteButton 호출 변경
<SaveQuoteButton
  input={input}
  result={result}           // NEW
  onSaved={handleQuoteSaved} // ENHANCED
/>
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-24 | Initial draft | Claude Code |
